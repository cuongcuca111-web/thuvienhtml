// api/admin/billing.js
// Quản trị thanh toán VietQR: Cấu hình, thử nghiệm mã QR, quản lý danh sách đơn hàng và duyệt thủ công
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');
const { encryptKey, decryptKey, maskApiKey } = require('../../lib/crypto');

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. LẤY CẤU HÌNH THANH TOÁN (GET /api/admin/billing/config)
  if (action === 'config' && req.method === 'GET') {
    try {
      const plansDoc = await db.doc('config/plans').get();
      const plansData = plansDoc.exists ? plansDoc.data() : {};
      const bankTransfer = plansData.bankTransfer || {
        bankId: '970422',
        bankName: 'MBBank (Napas)',
        accountNo: '0987654321',
        accountName: 'VU MINH CUONG',
        template: 'compact',
        orderTimeoutMinutes: 15,
        qrMode: 'quick'
      };

      const secDoc = await db.doc('admin_secrets/payment').get();
      let maskedClientId = '';
      let maskedApiKey = '';
      let isConfigured = false;

      if (secDoc.exists) {
        const sec = secDoc.data();
        if (sec.vietqrClientId) {
          try { maskedClientId = maskApiKey(decryptKey(sec.vietqrClientId)); } catch(e){}
        }
        if (sec.vietqrApiKey) {
          try {
            maskedApiKey = maskApiKey(decryptKey(sec.vietqrApiKey));
            isConfigured = true;
          } catch(e){}
        }
      }

      return res.status(200).json({
        bankTransfer,
        vietqrSecrets: {
          isConfigured,
          maskedClientId,
          maskedApiKey
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi tải cấu hình: ' + err.message });
    }
  }

  // 2. LƯU CẤU HÌNH THANH TOÁN (POST /api/admin/billing/config)
  if (action === 'config' && req.method === 'POST') {
    const { bankTransfer, vietqrClientId, vietqrApiKey } = req.body || {};
    if (!bankTransfer || typeof bankTransfer !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu chuyển khoản không hợp lệ' });
    }

    try {
      const plansRef = db.doc('config/plans');
      const snap = await plansRef.get();
      const oldData = snap.exists ? snap.data() : {};

      const sanitizedBankTransfer = {
        bankId: String(bankTransfer.bankId || '970422').trim(),
        bankName: String(bankTransfer.bankName || 'MBBank').trim(),
        accountNo: String(bankTransfer.accountNo || '').trim(),
        accountName: String(bankTransfer.accountName || '').toUpperCase().trim(),
        template: ['compact', 'compact2', 'qr_only', 'print'].includes(bankTransfer.template) ? bankTransfer.template : 'compact',
        orderTimeoutMinutes: Math.max(5, Math.min(60, parseInt(bankTransfer.orderTimeoutMinutes, 10) || 15)),
        qrMode: bankTransfer.qrMode === 'api' ? 'api' : 'quick'
      };

      await plansRef.set({
        ...oldData,
        bankTransfer: sanitizedBankTransfer,
        updatedAt: new Date().toISOString(),
        updatedBy: uid
      }, { merge: true });

      // Lưu khóa bí mật VietQR vào admin_secrets/payment nếu được cung cấp
      if (vietqrClientId || vietqrApiKey) {
        const secRef = db.doc('admin_secrets/payment');
        const secSnap = await secRef.get();
        const oldSec = secSnap.exists ? secSnap.data() : {};
        const updateSec = { ...oldSec };

        if (vietqrClientId && vietqrClientId.trim()) {
          updateSec.vietqrClientId = encryptKey(vietqrClientId.trim());
        }
        if (vietqrApiKey && vietqrApiKey.trim()) {
          updateSec.vietqrApiKey = encryptKey(vietqrApiKey.trim());
        }
        updateSec.updatedAt = new Date().toISOString();
        await secRef.set(updateSec, { merge: true });
      }

      await recordAuditLog(db, {
        uid,
        action: 'UPDATE_PAYMENT_CONFIG',
        newVal: sanitizedBankTransfer,
        details: 'Cập nhật tài khoản ngân hàng và cấu hình tạo mã QR VietQR'
      });

      return res.status(200).json({ success: true, message: 'Đã lưu cấu hình thanh toán thành công' });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi lưu cấu hình: ' + err.message });
    }
  }

  // 3. THỬ NGHIỆM TẠO MÃ QR (POST /api/admin/billing/test-qr)
  if (action === 'test-qr') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { bankId, accountNo, accountName, template, amount, mode } = req.body || {};

    const testAmount = parseInt(amount, 10) || 50000;
    const testCode = 'TVHTEST123';
    const safeAccName = encodeURIComponent((accountName || 'VU MINH CUONG').toUpperCase());
    const safeContent = encodeURIComponent(testCode);

    const quickUrl = `https://img.vietqr.io/image/${bankId || '970422'}-${accountNo || '0987654321'}-${template || 'compact'}.png?amount=${testAmount}&addInfo=${safeContent}&accountName=${safeAccName}`;

    if (mode === 'api') {
      try {
        const secDoc = await db.doc('admin_secrets/payment').get();
        if (!secDoc.exists || !secDoc.data().vietqrClientId || !secDoc.data().vietqrApiKey) {
          return res.status(400).json({ error: 'Chưa cấu hình Client ID và API Key cho VietQR API. Hãy nhập khóa và lưu lại.' });
        }
        const clientId = decryptKey(secDoc.data().vietqrClientId);
        const apiKey = decryptKey(secDoc.data().vietqrApiKey);

        const resp = await fetch('https://api.vietqr.io/v2/generate', {
          method: 'POST',
          headers: {
            'x-client-id': clientId,
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accountNo: accountNo || '0987654321',
            accountName: (accountName || 'VU MINH CUONG').toUpperCase(),
            acqId: parseInt(bankId || '970422', 10),
            amount: testAmount,
            addInfo: testCode,
            format: 'text',
            template: template || 'compact'
          })
        });

        const json = await resp.json();
        if (!resp.ok || json.code !== '00') {
          return res.status(400).json({
            error: `Lỗi VietQR API (${json.code || resp.status}): ${json.desc || 'Không thể tạo QR'}`
          });
        }
        return res.status(200).json({
          success: true,
          qrUrl: json.data.qrDataURL || json.data.qrCode,
          mode: 'api'
        });
      } catch (err) {
        return res.status(500).json({ error: 'Lỗi kiểm tra API VietQR: ' + err.message });
      }
    }

    return res.status(200).json({
      success: true,
      qrUrl: quickUrl,
      mode: 'quick'
    });
  }

  // 4. DANH SÁCH ĐƠN HÀNG (GET /api/admin/billing/orders)
  if (action === 'orders' && req.method === 'GET') {
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const search = String(req.query.search || '').trim().toLowerCase();
    const limitNum = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50));

    try {
      // Dùng 1 trường orderBy('createdAt', 'desc') an toàn 100% không cần composite index,
      // sau đó lọc statusFilter và search ngay trong bộ nhớ.
      const fetchLimit = statusFilter === 'all' && !search ? limitNum : 150;
      let snap;
      try {
        if (statusFilter !== 'all') {
          // Thử truy vấn có điều kiện nếu index đã tồn tại
          snap = await db.collection('billing_orders')
            .where('status', '==', statusFilter)
            .orderBy('createdAt', 'desc')
            .limit(limitNum)
            .get();
        } else {
          snap = await db.collection('billing_orders')
            .orderBy('createdAt', 'desc')
            .limit(fetchLimit)
            .get();
        }
      } catch (queryErr) {
        // Fallback tự động khi chưa có composite index: Lấy theo createdAt rồi lọc trong RAM
        const isIndexErr = queryErr.message && (queryErr.message.includes('FAILED_PRECONDITION') || queryErr.message.includes('requires an index'));
        if (isIndexErr) {
          console.warn('[Admin Billing Orders] Chưa có composite index status+createdAt, tự động chuyển sang lọc trong bộ nhớ:', queryErr.message);
          snap = await db.collection('billing_orders')
            .orderBy('createdAt', 'desc')
            .limit(150)
            .get();
        } else {
          throw queryErr;
        }
      }

      let orders = [];
      let pendingCount = 0;
      let userConfirmedCount = 0;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status === 'user_confirmed') userConfirmedCount++;
        if (data.status === 'pending') pendingCount++;

        // Lọc trạng thái trong bộ nhớ nếu chạy chế độ fallback
        if (statusFilter !== 'all' && data.status !== statusFilter) return;

        if (search) {
          const matchCode = (data.code || '').toLowerCase().includes(search);
          const matchEmail = (data.userEmail || '').toLowerCase().includes(search);
          const matchUid = (data.uid || '').toLowerCase().includes(search);
          if (!matchCode && !matchEmail && !matchUid) return;
        }

        orders.push({
          id: data.id,
          code: data.code,
          uid: data.uid,
          userEmail: data.userEmail || '',
          planId: data.planId,
          period: data.period,
          amount: data.amount,
          status: data.status,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          paidAt: data.paidAt || null,
          userConfirmedAt: data.userConfirmedAt || null
        });
      });

      if (orders.length > limitNum) {
        orders = orders.slice(0, limitNum);
      }

      return res.status(200).json({
        orders,
        counts: {
          totalReturned: orders.length,
          userConfirmed: userConfirmedCount,
          pending: pendingCount
        }
      });
    } catch (err) {
      console.error('[Admin Billing Orders] Lỗi tải đơn:', err);
      const isIndexError = err.message && (err.message.includes('FAILED_PRECONDITION') || err.message.includes('requires an index'));
      if (isIndexError) {
        return res.status(500).json({
          error: 'Cần khởi tạo Composite Index trên Firestore Console cho billing_orders: ' + err.message
        });
      }
      return res.status(500).json({ error: 'Lỗi tải danh sách đơn: ' + err.message });
    }
  }

  // 5. DUYỆT ĐƠN THỦ CÔNG (POST /api/admin/billing/orders-confirm)
  if (action === 'orders-confirm' && req.method === 'POST') {
    const { orderId, reason } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const orderRef = db.collection('billing_orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
      const order = orderSnap.data();

      if (order.status === 'paid') {
        return res.status(400).json({ error: 'Đơn hàng này đã được xác nhận thanh toán trước đó' });
      }

      const targetUid = order.uid;
      const planId = order.planId;
      const period = order.period;
      const now = Date.now();

      // Đọc gói hiện tại của người dùng để tính cộng dồn ngày
      const userPlanRef = db.doc(`users/${targetUid}/billing/plan`);
      const userPlanSnap = await userPlanRef.get();
      let currentExpires = now;

      if (userPlanSnap.exists) {
        const upData = userPlanSnap.data();
        if (upData.tier === planId && upData.expiresAt) {
          const expMs = new Date(upData.expiresAt).getTime();
          if (expMs > now) currentExpires = expMs;
        }
      }

      const addedDays = period === 'yearly' ? 365 : 30;
      const newExpiresAt = new Date(currentExpires + addedDays * 24 * 60 * 60 * 1000).toISOString();

      const batch = db.batch();

      // Cập nhật đơn hàng thành paid
      batch.update(orderRef, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        confirmedBy: uid,
        confirmReason: reason || 'Admin duyệt thủ công',
        updatedAt: new Date().toISOString()
      });

      // Cập nhật quyền của người dùng trong Firestore
      batch.set(userPlanRef, {
        tier: planId,
        period: period,
        active: true,
        activatedAt: new Date().toISOString(),
        expiresAt: newExpiresAt,
        updatedBy: uid,
        lastOrderId: order.id
      }, { merge: true });

      await batch.commit();

      // Cập nhật Custom Claims trên Firebase Auth nếu có thể
      try {
        const app = ctx.admin;
        const currentClaims = (await app.auth().getUser(targetUid)).customClaims || {};
        await app.auth().setCustomUserClaims(targetUid, {
          ...currentClaims,
          tier: planId
        });
      } catch (claimErr) {
        console.warn('[Billing] Không thể set custom claims trực tiếp:', claimErr.message);
      }

      await recordAuditLog(db, {
        uid,
        action: 'CONFIRM_ORDER_MANUAL',
        details: `Duyệt đơn ${order.code} (${planId.toUpperCase()} ${period}) cho người dùng UID: ${targetUid}`
      });

      return res.status(200).json({
        success: true,
        message: `Đã kích hoạt thành công gói ${planId.toUpperCase()} tới ngày ${new Date(newExpiresAt).toLocaleDateString('vi-VN')}`
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi duyệt đơn: ' + err.message });
    }
  }

  // 6. HỦY ĐƠN HÀNG (POST /api/admin/billing/orders-cancel)
  if (action === 'orders-cancel' && req.method === 'POST') {
    const { orderId, reason } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const orderRef = db.collection('billing_orders').doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

      await orderRef.update({
        status: 'cancelled',
        cancelledReason: reason || 'Admin hủy đơn',
        cancelledBy: uid,
        updatedAt: new Date().toISOString()
      });

      await recordAuditLog(db, {
        uid,
        action: 'CANCEL_ORDER_ADMIN',
        details: `Hủy đơn ${orderSnap.data().code}. Lý do: ${reason || 'Không có'}`
      });

      return res.status(200).json({ success: true, message: 'Đã hủy đơn hàng' });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi hủy đơn: ' + err.message });
    }
  }

  return res.status(400).json({ error: 'Hành động không hợp lệ' });
};
