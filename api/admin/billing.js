// api/admin/billing.js
// Quản trị thanh toán VietQR: Cấu hình, thử nghiệm mã QR, quản lý danh sách đơn hàng và duyệt thủ công
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');
const { encryptKey, decryptKey, maskApiKey } = require('../../lib/crypto');

// Bộ nhớ đệm danh sách ngân hàng VietQR (24 giờ TTL)
let _cachedBanks = null;
let _cachedBanksExpires = 0;

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

function normalizeAccountName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'D')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 0. DANH SÁCH NGÂN HÀNG CHÍNH THỨC TỪ VIETQR (GET /api/admin/billing/banks)
  if (action === 'banks' && req.method === 'GET') {
    try {
      const now = Date.now();
      if (_cachedBanks && now < _cachedBanksExpires) {
        return res.status(200).json({ success: true, banks: _cachedBanks, cached: true });
      }

      const response = await fetch('https://api.vietqr.io/v2/banks');
      if (!response.ok) {
        throw new Error(`VietQR API trả về mã lỗi HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const banks = data.data.map(b => ({
          id: b.id,
          name: b.name,
          code: b.code,
          bin: b.bin,
          shortName: b.shortName,
          logo: b.logo
        }));
        _cachedBanks = banks;
        _cachedBanksExpires = now + 24 * 60 * 60 * 1000; // Lưu cache 24h
        return res.status(200).json({ success: true, banks, cached: false });
      } else {
        throw new Error('Dữ liệu ngân hàng từ VietQR không đúng định dạng');
      }
    } catch (err) {
      console.warn('[Admin Billing] Lỗi tải danh sách ngân hàng VietQR:', err.message);
      // Nếu có cache cũ thì dùng tạm
      if (_cachedBanks) {
        return res.status(200).json({ success: true, banks: _cachedBanks, cached: true, fallback: true });
      }
      return res.status(500).json({ error: 'Không thể tải danh sách ngân hàng từ VietQR: ' + err.message });
    }
  }

  // 1. LẤY CẤU HÌNH THANH TOÁN (GET /api/admin/billing/config)
  if (action === 'config' && req.method === 'GET') {
    try {
      let bankTransfer = null;

      // Đọc từ payment_config/main (Single Source of Truth)
      const payCfgDoc = await db.doc('payment_config/main').get();
      if (payCfgDoc.exists) {
        const pData = payCfgDoc.data();
        bankTransfer = {
          bankId: pData.bankId || (pData.bank && pData.bank.bin) || '',
          bankName: pData.bankName || (pData.bank && (pData.bank.shortName || pData.bank.name)) || '',
          accountNo: pData.accountNo || '',
          accountName: pData.accountName || '',
          template: pData.template || 'compact',
          orderTimeoutMinutes: pData.orderTimeoutMinutes || pData.expireMinutes || 15,
          qrMode: pData.qrMode || pData.mode || 'quick',
          bank: pData.bank || null
        };
      }

      // Tương thích ngược nếu payment_config/main chưa có nhưng config/plans có
      if (!bankTransfer) {
        const plansDoc = await db.doc('config/plans').get();
        if (plansDoc.exists && plansDoc.data().bankTransfer) {
          bankTransfer = plansDoc.data().bankTransfer;
        }
      }

      // Nếu chưa hề cấu hình thì nạp giá trị khởi tạo chuẩn Sacombank (theo chỉ định thực tế)
      if (!bankTransfer || !bankTransfer.accountNo) {
        bankTransfer = {
          bankId: '970403',
          bankName: 'Sacombank',
          accountNo: '100071864927',
          accountName: 'LE BUI MINH CUONG',
          template: 'compact',
          orderTimeoutMinutes: 15,
          qrMode: 'quick',
          bank: {
            bin: '970403',
            shortName: 'Sacombank',
            name: 'Ngân hàng TMCP Sài Gòn Thương Tín'
          }
        };
      }

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
    const { bankTransfer, bank, vietqrClientId, vietqrApiKey } = req.body || {};
    const inputTransfer = bankTransfer || {};

    // Chuẩn bị dữ liệu tài khoản
    const bankId = String(inputTransfer.bankId || (bank && bank.bin) || '').trim();
    const bankName = String(inputTransfer.bankName || (bank && (bank.shortName || bank.name)) || '').trim();
    const accountNo = String(inputTransfer.accountNo || '').trim();
    const rawAccountName = String(inputTransfer.accountName || '').trim();
    const accountName = normalizeAccountName(rawAccountName);

    if (!bankId) {
      return res.status(400).json({ error: 'Vui lòng chọn ngân hàng nhận tiền' });
    }
    if (!accountNo || !/^\d{6,19}$/.test(accountNo)) {
      return res.status(400).json({ error: 'Số tài khoản không hợp lệ (phải gồm 6 đến 19 chữ số)' });
    }
    if (!accountName) {
      return res.status(400).json({ error: 'Tên chủ tài khoản không hợp lệ (viết hoa không dấu)' });
    }

    const template = ['compact', 'compact2', 'qr_only', 'print'].includes(inputTransfer.template) ? inputTransfer.template : 'compact';
    const orderTimeoutMinutes = Math.max(5, Math.min(60, parseInt(inputTransfer.orderTimeoutMinutes || inputTransfer.expireMinutes, 10) || 15));
    const qrMode = (inputTransfer.qrMode === 'api' || inputTransfer.mode === 'api') ? 'api' : 'quick';

    try {
      const sanitizedBankTransfer = {
        bankId,
        bankName,
        accountNo,
        accountName,
        template,
        orderTimeoutMinutes,
        qrMode,
        bank: bank || inputTransfer.bank || null
      };

      const paymentMainData = {
        mode: qrMode,
        bank: bank || inputTransfer.bank || {
          bin: bankId,
          shortName: bankName,
          name: bankName
        },
        bankId,
        bankName,
        accountNo,
        accountName,
        template,
        expireMinutes: orderTimeoutMinutes,
        orderTimeoutMinutes,
        qrMode,
        updatedAt: new Date().toISOString(),
        updatedBy: uid
      };

      // 1. Lưu vào payment_config/main (Single Source of Truth)
      await db.doc('payment_config/main').set(paymentMainData, { merge: true });

      // 2. Đồng thời cập nhật config/plans.bankTransfer để tương thích hoàn toàn
      const plansRef = db.doc('config/plans');
      const snap = await plansRef.get();
      const oldPlans = snap.exists ? snap.data() : {};
      await plansRef.set({
        ...oldPlans,
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
        details: `Cập nhật cấu hình nhận tiền VietQR: ${bankName} - ${accountNo} - ${accountName}`
      });

      return res.status(200).json({ success: true, message: 'Đã lưu cấu hình thanh toán thành công', bankTransfer: sanitizedBankTransfer });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi lưu cấu hình: ' + err.message });
    }
  }

  // 3. THỬ NGHIỆM TẠO MÃ QR (POST /api/admin/billing/test-qr)
  if (action === 'test-qr') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { bankId, accountNo, accountName, template, amount, mode } = req.body || {};

    let testBankId = bankId;
    let testAccountNo = accountNo;
    let testAccountName = accountName ? normalizeAccountName(accountName) : '';
    let testTemplate = template || 'compact';
    let testMode = mode || 'quick';

    // Nếu không truyền tham số, đọc từ payment_config/main
    if (!testBankId || !testAccountNo || !testAccountName) {
      const payCfgDoc = await db.doc('payment_config/main').get();
      if (payCfgDoc.exists) {
        const pData = payCfgDoc.data();
        testBankId = testBankId || pData.bankId || (pData.bank && pData.bank.bin);
        testAccountNo = testAccountNo || pData.accountNo;
        testAccountName = testAccountName || pData.accountName;
        testTemplate = testTemplate || pData.template || 'compact';
        testMode = testMode || pData.qrMode || pData.mode || 'quick';
      }
    }

    if (!testBankId || !testAccountNo || !testAccountName) {
      return res.status(400).json({ error: 'Chưa cấu hình tài khoản nhận tiền hoặc thiếu thông tin ngân hàng' });
    }

    const testAmount = parseInt(amount, 10) || 50000;
    const testCode = 'TVHTEST123';
    const safeAccName = encodeURIComponent(testAccountName);
    const safeContent = encodeURIComponent(testCode);

    const quickUrl = `https://img.vietqr.io/image/${testBankId}-${testAccountNo}-${testTemplate}.png?amount=${testAmount}&addInfo=${safeContent}&accountName=${safeAccName}`;

    if (testMode === 'api') {
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
            accountNo: testAccountNo,
            accountName: testAccountName,
            acqId: parseInt(testBankId, 10),
            amount: testAmount,
            addInfo: testCode,
            format: 'text',
            template: testTemplate
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
          userConfirmedAt: data.userConfirmedAt || null,
          proofUrl: data.proofUrl || null
        });
      });

      // Sắp xếp ưu tiên: Đơn chờ xử lý lên trên, đơn đã duyệt / đã hủy / hết hạn tự xuống dưới
      const STATUS_PRIORITY = {
        'user_confirmed': 1, // Khách báo đã chuyển (ưu tiên cao nhất)
        'pending': 2,        // Chờ thanh toán
        'paid': 3,           // Đã kích hoạt
        'cancelled': 4,      // Đã hủy
        'expired': 5         // Hết hạn
      };

      orders.sort((a, b) => {
        const pA = STATUS_PRIORITY[a.status] || 99;
        const pB = STATUS_PRIORITY[b.status] || 99;
        if (pA !== pB) return pA - pB;
        // Cùng nhóm ưu tiên thì sắp theo thời gian tạo mới nhất lên trước
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
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
