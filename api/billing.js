// api/billing.js
// Quản lý đơn hàng người dùng: Tạo đơn (create-order), Tra cứu (order-status), Xác nhận chuyển tiền (confirm-transfer), Hủy đơn (cancel-order)
const crypto = require('crypto');
const { initAdmin } = require('../lib/admin-auth');
const { decryptKey } = require('../lib/crypto');

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

// Sinh mã chuyển khoản an toàn: "TVH" + 8 ký tự ngẫu nhiên (loại bỏ 0, O, 1, I để tránh nhầm lẫn)
function generateOrderCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let code = 'TVH';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Xác thực Firebase Token của người dùng
async function verifyUserAuth(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yêu cầu đăng nhập để thực hiện giao dịch' });
    return null;
  }
  const token = authHeader.substring(7).trim();
  try {
    const app = initAdmin();
    const decoded = await app.auth().verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' });
      return null;
    }
    // Không cho phép tài khoản ẩn danh tạo đơn
    if (decoded.firebase && decoded.firebase.sign_in_provider === 'anonymous') {
      res.status(403).json({ error: 'Vui lòng đăng ký hoặc đăng nhập tài khoản trước khi nâng cấp gói' });
      return null;
    }
    return { adminApp: app, db: app.firestore(), uid: decoded.uid, email: decoded.email || '' };
  } catch (err) {
    res.status(401).json({ error: 'Token đã hết hạn hoặc không hợp lệ: ' + err.message });
    return null;
  }
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // 0. WEBHOOK BIẾN ĐỘNG SỐ DƯ TỰ ĐỘNG (POST /api/billing/webhook)
  // Nhận thông báo giao dịch từ SePay, Casso, hoặc hệ thống VietQR
  if (action === 'webhook') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
      const app = initAdmin();
      const db = app.firestore();

      // Kiểm tra API Key / Token nếu đã cấu hình trong admin_secrets/payment
      let configuredSecret = '';
      try {
        const secSnap = await db.doc('admin_secrets/payment').get();
        if (secSnap.exists && secSnap.data().webhookSecret) {
          configuredSecret = decryptKey(secSnap.data().webhookSecret);
        }
      } catch (_) {}

      if (configuredSecret) {
        const authHeader = req.headers.authorization || '';
        const secureToken = req.headers['secure-token'] || req.headers['x-api-key'] || (req.query && req.query.token) || '';
        const tokenVal = authHeader.replace(/^Bearer\s+|^Apikey\s+/i, '').trim() || secureToken;
        if (tokenVal !== configuredSecret) {
          return res.status(401).json({ error: 'Webhook secret không hợp lệ' });
        }
      }

      // Trích xuất danh sách giao dịch từ nhiều định dạng:
      // - SePay: body là 1 object có content, transferAmount, referenceCode
      // - Casso: body.data là mảng [ { description, amount, tid } ]
      // - VietQR Pro: body là object có content, amount
      const body = req.body || {};
      let transactions = [];

      if (Array.isArray(body.data)) {
        transactions = body.data;
      } else if (Array.isArray(body.transactions)) {
        transactions = body.transactions;
      } else if (typeof body === 'object' && body !== null) {
        transactions = [body];
      }

      const results = [];

      for (let i = 0; i < transactions.length; i++) {
        const txn = transactions[i];
        if (!txn) continue;
        const textContent = `${txn.content || ''} ${txn.description || ''} ${txn.orderCode || ''} ${txn.code || ''} ${txn.memo || ''}`;
        const match = textContent.match(/TVH[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}/i);
        if (!match) continue;

        const orderCode = match[0].toUpperCase();
        const transferAmount = parseInt(txn.transferAmount || txn.amount || 0, 10);

        // Tra cứu nhanh O(1) mã đơn
        const codeDoc = await db.doc(`billing_codes/${orderCode}`).get();
        if (!codeDoc.exists) {
          results.push({ code: orderCode, status: 'code_not_found' });
          continue;
        }

        const codeData = codeDoc.data();
        const orderId = codeData.orderId;
        const orderRef = db.collection('billing_orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
          results.push({ code: orderCode, status: 'order_not_found' });
          continue;
        }

        const order = orderSnap.data();
        if (order.status === 'paid') {
          results.push({ code: orderCode, status: 'already_paid' });
          continue;
        }

        // Kiểm tra số tiền chuyển phải >= số tiền đơn hàng (cho phép chuyển dư)
        if (transferAmount > 0 && transferAmount < order.amount) {
          results.push({ code: orderCode, status: 'amount_insufficient', required: order.amount, received: transferAmount });
          continue;
        }

        // TỰ ĐỘNG KÍCH HOẠT ĐƠN HÀNG VÀ TÀI KHOẢN NGƯỜI DÙNG
        const targetUid = order.uid;
        const planId = order.planId;
        const period = order.period;
        const now = Date.now();

        // Tính ngày hết hạn gói:
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

        batch.update(orderRef, {
          status: 'paid',
          paidAt: new Date().toISOString(),
          confirmedBy: 'webhook_auto',
          confirmReason: `Tự động kích hoạt qua Webhook (Số tiền: ${(transferAmount || order.amount).toLocaleString('vi-VN')} ₫)`,
          bankTransactionId: String(txn.id || txn.tid || txn.referenceCode || txn.transactionId || ''),
          updatedAt: new Date().toISOString()
        });

        batch.set(userPlanRef, {
          tier: planId,
          period: period,
          active: true,
          activatedAt: new Date().toISOString(),
          expiresAt: newExpiresAt,
          updatedBy: 'webhook_auto',
          lastOrderId: order.id
        }, { merge: true });

        await batch.commit();

        // Đồng bộ Custom Claims
        try {
          const currentClaims = (await app.auth().getUser(targetUid)).customClaims || {};
          await app.auth().setCustomUserClaims(targetUid, {
            ...currentClaims,
            tier: planId
          });
        } catch (claimErr) {
          console.warn('[Webhook] Lỗi cập nhật custom claims:', claimErr.message);
        }

        results.push({
          code: orderCode,
          orderId,
          uid: targetUid,
          planId,
          status: 'activated_success',
          expiresAt: newExpiresAt
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed',
        processed: results.length,
        results
      });
    } catch (err) {
      console.error('[Webhook Billing Error]:', err);
      return res.status(500).json({ error: 'Lỗi xử lý webhook: ' + err.message });
    }
  }

  const auth = await verifyUserAuth(req, res);
  if (!auth) return;

  const { db, uid, email } = auth;

  // 1. TẠO ĐƠN HÀNG MỚI (POST /api/billing/create-order)
  if (action === 'create-order') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { planId, period } = req.body || {};

    if (!['plus', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'Gói dịch vụ không hợp lệ. Chỉ áp dụng cho Plus hoặc Pro.' });
    }
    if (!['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Chu kỳ không hợp lệ. Chọn monthly hoặc yearly.' });
    }

    try {
      // 1. Giới hạn tần suất: Tối đa 10 đơn / giờ / người dùng
      // Dùng document bộ đếm riêng users/{uid}/billing/orderRate (0 truy vấn, 0 index, O(1))
      const rateRef = db.doc(`users/${uid}/billing/orderRate`);
      const rateSnap = await rateRef.get();
      const nowMs = Date.now();
      const oneHourAgoMs = nowMs - 60 * 60 * 1000;
      let timestamps = [];
      if (rateSnap.exists && Array.isArray(rateSnap.data().timestamps)) {
        timestamps = rateSnap.data().timestamps.filter(t => typeof t === 'number' && t > oneHourAgoMs);
      }
      if (timestamps.length >= 10) {
        return res.status(429).json({ error: 'Bạn đã tạo quá nhiều đơn trong 1 giờ qua. Vui lòng chờ thêm ít phút.' });
      }
      timestamps.push(nowMs);

      // 2. Đọc bảng giá chuẩn và cấu hình thanh toán từ server (TUYỆT ĐỐI không tin giá client gửi)
      const plansDoc = await db.doc('config/plans').get();
      const plansData = plansDoc.exists ? plansDoc.data() : {};
      const pricing = plansData.pricing || {
        plusMonthly: 59000,
        plusYearly: 590000,
        proMonthly: 129000,
        proYearly: 1290000
      };

      const priceKey = `${planId}${period === 'yearly' ? 'Yearly' : 'Monthly'}`;
      let amount = parseInt(pricing[priceKey], 10);
      if (!amount || isNaN(amount) || amount <= 0) {
        if (period === 'yearly') {
          const mPrice = parseInt(pricing[`${planId}Monthly`], 10) || (planId === 'pro' ? 59000 : 29000);
          const disc = parseInt(pricing.yearlyDiscount, 10) || 20;
          amount = Math.round(mPrice * 12 * (1 - disc / 100));
        } else {
          amount = planId === 'pro' ? 59000 : 29000;
        }
      }
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(500).json({ error: 'Không tìm thấy bảng giá hợp lệ cho gói đã chọn' });
      }

      // Đọc thông tin tài khoản ngân hàng từ cấu hình payment_config/main (Single Source of Truth)
      // Tương thích ngược với config/plans.bankTransfer nếu chưa migrate
      let bankConfig = null;
      try {
        const payCfgDoc = await db.doc('payment_config/main').get();
        if (payCfgDoc.exists) {
          bankConfig = payCfgDoc.data();
        }
      } catch (errCfg) {
        console.warn('[Billing] Lỗi đọc payment_config/main:', errCfg.message);
      }

      if (!bankConfig && plansData.bankTransfer) {
        bankConfig = plansData.bankTransfer;
      }

      // Cấu hình nhận tiền khởi tạo chuẩn Sacombank (Single Source of Truth seed)
      const DEFAULT_PAYMENT_CONFIG = {
        mode: 'quick',
        qrMode: 'quick',
        bank: {
          bin: '970403',
          shortName: 'Sacombank',
          name: 'Ngân hàng TMCP Sài Gòn Thương Tín'
        },
        bankId: '970403',
        bankName: 'Sacombank',
        accountNo: '100071864927',
        accountName: 'LE BUI MINH CUONG',
        template: 'compact',
        expireMinutes: 15,
        orderTimeoutMinutes: 15,
        updatedAt: new Date().toISOString()
      };

      if (!bankConfig || !bankConfig.accountNo || !(bankConfig.bankId || (bankConfig.bank && bankConfig.bank.bin))) {
        bankConfig = DEFAULT_PAYMENT_CONFIG;
        // Tự động seed lưu lại vào Firestore để các lần gọi tiếp theo và admin có thể dùng ngay
        try {
          db.doc('payment_config/main').set(DEFAULT_PAYMENT_CONFIG, { merge: true }).catch(() => {});
        } catch (_) {}
      }

      // Xác thực cấu hình tài khoản nhận tiền
      const rawBankId = (bankConfig && (bankConfig.bankId || (bankConfig.bank && bankConfig.bank.bin))) || '';
      const rawBankName = (bankConfig && (bankConfig.bankName || (bankConfig.bank && (bankConfig.bank.shortName || bankConfig.bank.name)))) || '';
      const rawAccountNo = (bankConfig && bankConfig.accountNo) || '';
      const rawAccountName = (bankConfig && bankConfig.accountName) || '';

      if (!rawBankId || !rawAccountNo || !rawAccountName) {
        return res.status(503).json({
          error: 'payment_not_configured',
          message: 'Thanh toán đang được cấu hình, vui lòng quay lại sau'
        });
      }

      // 3. Tự động hủy các đơn pending cũ của người dùng
      // Chỉ dùng DUY NHẤT 1 điều kiện .where('uid', '==', uid) để KHÔNG BAO GIỜ cần composite index
      const oldOrdersSnap = await db.collection('billing_orders')
        .where('uid', '==', uid)
        .limit(50)
        .get();

      const batch = db.batch();
      oldOrdersSnap.forEach(docSnap => {
        const oData = docSnap.data();
        if (oData.status === 'pending') {
          batch.update(docSnap.ref, {
            status: 'cancelled',
            cancelledReason: 'Thay thế bằng đơn mới',
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Cập nhật bộ đếm giới hạn tần suất
      batch.set(rateRef, { timestamps, updatedAt: new Date(nowMs).toISOString() }, { merge: true });

      const orderCode = generateOrderCode();
      const orderRef = db.collection('billing_orders').doc();
      const orderId = orderRef.id;

      // Lưu document tra cứu nhanh O(1) theo mã đơn cho Webhook
      const codeRef = db.doc(`billing_codes/${orderCode}`);
      batch.set(codeRef, {
        orderId,
        uid,
        code: orderCode,
        createdAt: new Date(nowMs).toISOString()
      });

      const timeoutMins = parseInt(bankConfig.orderTimeoutMinutes, 10) || 15;
      const now = Date.now();
      const expiresAt = new Date(now + timeoutMins * 60 * 1000).toISOString();
      const createdAt = new Date(now).toISOString();

      // Bản chụp thông tin chuyển khoản tại thời điểm tạo đơn
      const bankSnapshot = {
        bankId: rawBankId,
        bankName: rawBankName,
        accountNo: rawAccountNo,
        accountName: rawAccountName.toUpperCase().trim(),
        template: bankConfig.template || 'compact'
      };

      // Tạo QR URL: Chế độ A (Ảnh QR nhanh)
      const safeAccName = encodeURIComponent(bankSnapshot.accountName);
      const safeContent = encodeURIComponent(orderCode);
      const quickQrUrl = `https://img.vietqr.io/image/${bankSnapshot.bankId}-${bankSnapshot.accountNo}-${bankSnapshot.template}.png?amount=${amount}&addInfo=${safeContent}&accountName=${safeAccName}`;

      let finalQr = quickQrUrl;

      // Nếu quản trị viên bật Chế độ B (VietQR API v2)
      if (bankConfig.qrMode === 'api') {
        try {
          const secSnap = await db.doc('admin_secrets/payment').get();
          if (secSnap.exists && secSnap.data().vietqrClientId && secSnap.data().vietqrApiKey) {
            const clientId = decryptKey(secSnap.data().vietqrClientId);
            const apiKey = decryptKey(secSnap.data().vietqrApiKey);
            const apiRes = await fetch('https://api.vietqr.io/v2/generate', {
              method: 'POST',
              headers: {
                'x-client-id': clientId,
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                accountNo: bankSnapshot.accountNo,
                accountName: bankSnapshot.accountName,
                acqId: parseInt(bankSnapshot.bankId, 10),
                amount: amount,
                addInfo: orderCode,
                format: 'text',
                template: bankSnapshot.template
              })
            });
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson && apiJson.data && (apiJson.data.qrDataURL || apiJson.data.qrCode)) {
                finalQr = apiJson.data.qrDataURL || apiJson.data.qrCode;
              }
            }
          }
        } catch (apiErr) {
          console.warn('[Billing] Lỗi tạo QR qua API VietQR, tự động rơi về Chế độ A:', apiErr.message);
        }
      }

      const orderData = {
        id: orderId,
        uid,
        userEmail: email,
        planId,
        period,
        amount,
        currency: 'VND',
        code: orderCode,
        status: 'pending',
        createdAt,
        expiresAt,
        bankSnapshot,
        qr: finalQr,
        qrMode: bankConfig.qrMode || 'quick'
      };

      batch.set(orderRef, orderData);
      await batch.commit();

      return res.status(200).json({
        success: true,
        orderId,
        code: orderCode,
        amount,
        planId,
        period,
        expiresAt,
        bankSnapshot,
        qr: finalQr
      });
    } catch (err) {
      console.error('[Billing] Lỗi tạo đơn hàng:', err);
      const isIndexError = err.message && (err.message.includes('FAILED_PRECONDITION') || err.message.includes('requires an index'));
      if (isIndexError) {
        console.error('[Billing Firestore Index Required]:', err.message);
        return res.status(500).json({ error: 'Hệ thống đang chuẩn bị dữ liệu, thử lại sau vài phút' });
      }
      return res.status(500).json({ error: 'Không thể khởi tạo đơn hàng: ' + (err.message || 'Lỗi hệ thống') });
    }
  }

  // 2. KIỂM TRA TRẠNG THÁI ĐƠN HÀNG (GET /api/billing/order-status?orderId=...)
  if (action === 'order-status') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const orderId = String(req.query.orderId || '').trim();
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const docSnap = await db.collection('billing_orders').doc(orderId).get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
      }
      const order = docSnap.data();
      if (order.uid !== uid) {
        return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng này' });
      }

      // Tự động đánh dấu hết hạn nếu đã qua expiresAt mà chưa trả
      if (order.status === 'pending' && new Date() > new Date(order.expiresAt)) {
        await docSnap.ref.update({ status: 'expired', updatedAt: new Date().toISOString() });
        order.status = 'expired';
      }

      return res.status(200).json({
        orderId: order.id,
        code: order.code,
        status: order.status,
        planId: order.planId,
        period: order.period,
        amount: order.amount,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt || null,
        userConfirmedAt: order.userConfirmedAt || null
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi kiểm tra đơn: ' + err.message });
    }
  }

  // 3. NGƯỜI DÙNG BÁO ĐÃ CHUYỂN KHOẢN (POST /api/billing/confirm-transfer)
  if (action === 'confirm-transfer') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { orderId, proofImage, proofUrl } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const docRef = db.collection('billing_orders').doc(orderId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

      const order = docSnap.data();
      if (order.uid !== uid) return res.status(403).json({ error: 'Không có quyền truy cập đơn' });
      if (order.status === 'paid') return res.status(200).json({ success: true, status: 'paid' });

      const updateData = {
        status: 'user_confirmed',
        userConfirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const finalProof = proofImage || proofUrl;
      if (finalProof && typeof finalProof === 'string') {
        // Giới hạn an toàn tối đa 800KB để không vượt quá giới hạn tài liệu Firestore
        if (finalProof.length < 850000) {
          updateData.proofUrl = finalProof;
        }
      }

      await docRef.update(updateData);

      return res.status(200).json({
        success: true,
        status: 'user_confirmed',
        message: 'Đã ghi nhận thông báo chuyển khoản kèm ảnh biên lai. Hệ thống đang tiến hành kiểm tra.'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật: ' + err.message });
    }
  }

  // 4. LỊCH SỬ ĐƠN HÀNG CỦA NGƯỜI DÙNG (GET /api/billing?action=order-history)
  if (action === 'order-history') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
      // Chỉ dùng .where('uid', '==', uid) để KHÔNG BAO GIỜ cần composite index
      const ordersSnap = await db.collection('billing_orders')
        .where('uid', '==', uid)
        .limit(50)
        .get();

      const orders = [];
      ordersSnap.forEach(docSnap => {
        const o = docSnap.data();
        orders.push({
          id: docSnap.id,
          code: o.code || '',
          planId: o.planId || '',
          period: o.period || 'monthly',
          amount: o.amount || 0,
          currency: o.currency || 'VND',
          status: o.status || 'pending',
          createdAt: o.createdAt || '',
          paidAt: o.paidAt || null,
          userConfirmedAt: o.userConfirmedAt || null,
          proofUrl: o.proofUrl || null
        });
      });

      // Sắp xếp đơn mới nhất lên đầu trong bộ nhớ
      orders.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      return res.status(200).json({ success: true, orders });
    } catch (err) {
      console.error('[Billing] Lỗi tải lịch sử đơn hàng:', err);
      return res.status(500).json({ error: 'Lỗi tải lịch sử đơn hàng: ' + err.message });
    }
  }

  // 4. HỦY ĐƠN HÀNG (POST /api/billing/cancel-order)
  if (action === 'cancel-order') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const docRef = db.collection('billing_orders').doc(orderId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Đơn không tồn tại' });
      const order = docSnap.data();
      if (order.uid !== uid) return res.status(403).json({ error: 'Không có quyền' });
      if (order.status === 'paid') return res.status(400).json({ error: 'Đơn đã thanh toán, không thể hủy' });

      await docRef.update({
        status: 'cancelled',
        cancelledReason: 'Người dùng tự hủy',
        updatedAt: new Date().toISOString()
      });

      return res.status(200).json({ success: true, status: 'cancelled' });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi hủy đơn: ' + err.message });
    }
  }

  // 5. KÍCH HOẠT MÃ (POST /api/billing/redeem-code hoặc ?action=redeem-code)
  if (action === 'redeem-code') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Vui lòng cung cấp mã kích hoạt' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '-');
    if (!cleanCode) {
      return res.status(400).json({ error: 'Mã kích hoạt không hợp lệ' });
    }

    try {
      let codeRef = db.doc(`activation_codes/${cleanCode}`);
      let codeSnap = await codeRef.get();

      // Nếu không tìm thấy bằng ID trực tiếp, thử tìm theo trường 'code'
      if (!codeSnap.exists) {
        const qSnap = await db.collection('activation_codes')
          .where('code', '==', cleanCode)
          .limit(1)
          .get();
        if (!qSnap.empty) {
          codeSnap = qSnap.docs[0];
          codeRef = codeSnap.ref;
        }
      }

      if (!codeSnap.exists) {
        return res.status(404).json({ error: 'Mã kích hoạt không chính xác hoặc không tồn tại trên hệ thống.' });
      }

      const codeData = codeSnap.data();

      if (codeData.isDisabled) {
        return res.status(400).json({ error: 'Mã kích hoạt này đã bị vô hiệu hóa bởi quản trị viên.' });
      }

      if (codeData.isUsed) {
        return res.status(400).json({ error: 'Mã kích hoạt này đã được sử dụng trước đó.' });
      }

      if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Mã kích hoạt này đã hết hạn sử dụng.' });
      }

      const tier = (codeData.tier || 'plus').toLowerCase();
      if (!['plus', 'pro'].includes(tier)) {
        return res.status(400).json({ error: 'Gói dịch vụ gắn liền với mã không hợp lệ.' });
      }

      const days = Math.max(1, parseInt(codeData.days, 10) || 30);
      const nowMs = Date.now();
      let currentExpires = nowMs;

      // Đọc gói hiện tại của người dùng để tính cộng dồn ngày nếu đang cùng gói
      const userPlanRef = db.doc(`users/${uid}/billing/plan`);
      const userPlanSnap = await userPlanRef.get();
      if (userPlanSnap.exists) {
        const up = userPlanSnap.data();
        if (up.tier === tier && up.expiresAt) {
          const expMs = new Date(up.expiresAt).getTime();
          if (expMs > nowMs) currentExpires = expMs;
        }
      }

      const newExpiresAt = new Date(currentExpires + days * 24 * 60 * 60 * 1000).toISOString();

      // Lấy tên hiển thị của người dùng để lưu vào thông tin mã
      let userName = '';
      try {
        const userRecord = await adminApp.auth().getUser(uid);
        userName = userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'Người dùng');
      } catch (_) {
        userName = email ? email.split('@')[0] : 'Người dùng';
      }

      const batch = db.batch();

      // 1. Cập nhật mã kích hoạt: đánh dấu đã dùng, lưu UID, email, tên người dùng và thời điểm
      batch.update(codeRef, {
        isUsed: true,
        usedBy: uid,
        usedByUserEmail: email || '',
        usedByUserName: userName || '',
        usedAt: new Date().toISOString()
      });

      // 2. Nâng cấp gói cho người dùng trong Firestore: users/{uid}/billing/plan
      batch.set(userPlanRef, {
        tier,
        period: days >= 365 ? 'yearly' : 'monthly',
        active: true,
        activatedAt: new Date().toISOString(),
        expiresAt: newExpiresAt,
        updatedBy: 'redeem_code',
        activationCode: cleanCode
      }, { merge: true });

      // 3. Đồng bộ cấu hình người dùng tại artifacts/thuvienhtml/users/{uid}/settings/config
      const userSettingsRef = db.doc(`artifacts/thuvienhtml/users/${uid}/settings/config`);
      batch.set(userSettingsRef, {
        tier,
        tierExpiresAt: newExpiresAt,
        tierGrantedBy: 'redeem_code',
        tierGrantedAt: new Date().toISOString(),
        activationCode: cleanCode
      }, { merge: true });

      // 4. Đồng bộ root document users/{uid}
      batch.set(db.doc(`users/${uid}`), {
        tier,
        tierExpiresAt: newExpiresAt,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();

      // 5. Đồng bộ Firebase Auth Custom Claims (tier & tierExpiresAt)
      try {
        const currentClaims = (await adminApp.auth().getUser(uid)).customClaims || {};
        await adminApp.auth().setCustomUserClaims(uid, {
          ...currentClaims,
          tier: tier,
          tierExpiresAt: newExpiresAt
        });
      } catch (claimErr) {
        console.warn('[Redeem Code] Lỗi cập nhật custom claims:', claimErr.message);
      }

      return res.status(200).json({
        success: true,
        tier,
        days,
        expiresAt: newExpiresAt,
        message: `Chúc mừng bạn! Đã kích hoạt thành công gói ${tier.toUpperCase()} (${days} ngày).`
      });
    } catch (err) {
      console.error('[Billing] Lỗi kích hoạt mã:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống khi kích hoạt mã: ' + err.message });
    }
  }

  return res.status(400).json({ error: 'Hành động không hợp lệ' });
};
