// api/admin/billing.js
// Quản trị thanh toán VietQR: Cấu hình, thử nghiệm mã QR, quản lý danh sách đơn hàng và duyệt thủ công
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');
const { encryptKey, decryptKey, maskApiKey } = require('../../lib/crypto');
const { sendNtfyNotification, getNtfyConfig } = require('../../lib/ntfy');

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
    const OFFICIAL_VIETQR_BANKS = [
      { bin: '970403', code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
      { bin: '970422', code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân Đội' },
      { bin: '970436', code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
      { bin: '970415', code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
      { bin: '970418', code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam' },
      { bin: '970407', code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
      { bin: '970416', code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
      { bin: '970432', code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
      { bin: '970423', code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
      { bin: '970441', code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
      { bin: '970437', code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM' },
      { bin: '970448', code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
      { bin: '970443', code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
      { bin: '970426', code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
      { bin: '970406', code: 'VBA', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
      { bin: '970438', code: 'BVB', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
      { bin: '970412', code: 'PVB', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
      { bin: '970431', code: 'EIB', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
      { bin: '970409', code: 'BAB', shortName: 'BacABank', name: 'Ngân hàng TMCP Bắc Á' },
      { bin: '970433', code: 'VIETBANK', shortName: 'Vietbank', name: 'Ngân hàng TMCP Việt Nam Thương Tín' },
      { bin: '970400', code: 'SAIGONBANK', shortName: 'SaigonBank', name: 'Ngân hàng TMCP Sài Gòn Công Thương' },
      { bin: '970440', code: 'SEAB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
      { bin: '970449', code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
      { bin: '970414', code: 'OJB', shortName: 'OceanBank', name: 'Ngân hàng Thương mại TNHH MTV Đại Dương' },
      { bin: '970428', code: 'NAB', shortName: 'NamABank', name: 'Ngân hàng TMCP Nam Á' },
      { bin: '970425', code: 'ABB', shortName: 'AnBinhBank', name: 'Ngân hàng TMCP An Bình' }
    ];
    return res.status(200).json({ success: true, banks: OFFICIAL_VIETQR_BANKS, cached: true });
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
      let rawNtfyTopic = '';
      let rawNtfyServerUrl = 'https://ntfy.sh';
      let rawNtfyToken = '';

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
        if (sec.ntfyTopic) {
          try {
            rawNtfyTopic = typeof sec.ntfyTopic === 'object' ? decryptKey(sec.ntfyTopic) : sec.ntfyTopic;
          } catch(e){}
        }
        if (sec.ntfyServerUrl && typeof sec.ntfyServerUrl === 'string') {
          rawNtfyServerUrl = sec.ntfyServerUrl.trim();
        }
        if (sec.ntfyToken) {
          try {
            rawNtfyToken = typeof sec.ntfyToken === 'object' ? decryptKey(sec.ntfyToken) : sec.ntfyToken;
          } catch(e){}
        }
      }

      return res.status(200).json({
        bankTransfer,
        vietqrSecrets: {
          isConfigured,
          maskedClientId,
          maskedApiKey
        },
        ntfyConfig: {
          isConfigured: Boolean(rawNtfyTopic),
          serverUrl: rawNtfyServerUrl || 'https://ntfy.sh',
          maskedTopic: rawNtfyTopic ? maskApiKey(rawNtfyTopic) : '',
          rawTopic: rawNtfyTopic || '',
          hasToken: Boolean(rawNtfyToken)
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi tải cấu hình: ' + err.message });
    }
  }

  // 2. LƯU CẤU HÌNH THANH TOÁN (POST /api/admin/billing/config)
  if (action === 'config' && req.method === 'POST') {
    const { bankTransfer, bank, vietqrClientId, vietqrApiKey, ntfyTopic, ntfyServerUrl, ntfyToken } = req.body || {};
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

      // Lưu khóa bí mật VietQR và ntfy.sh vào admin_secrets/payment
      if (vietqrClientId || vietqrApiKey || ntfyTopic !== undefined || ntfyServerUrl !== undefined || ntfyToken !== undefined) {
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
        if (typeof ntfyTopic === 'string') {
          const cleanTopic = ntfyTopic.trim();
          if (cleanTopic && !cleanTopic.startsWith('••••')) {
            updateSec.ntfyTopic = encryptKey(cleanTopic);
          }
        }
        if (typeof ntfyServerUrl === 'string') {
          updateSec.ntfyServerUrl = ntfyServerUrl.trim();
        }
        if (typeof ntfyToken === 'string') {
          const cleanTok = ntfyToken.trim();
          if (cleanTok && !cleanTok.startsWith('••••')) {
            updateSec.ntfyToken = encryptKey(cleanTok);
          }
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

  // 2.5. GỬI THÔNG BÁO THỬ NGHIỆM NTFY.SH (POST /api/admin/billing/test-ntfy)
  if ((action === 'test-ntfy' || action === 'ntfy-test') && req.method === 'POST') {
    const { ntfyTopic, ntfyServerUrl, ntfyToken } = req.body || {};
    try {
      let testConfig = null;
      if (ntfyTopic && typeof ntfyTopic === 'string' && !ntfyTopic.startsWith('••••')) {
        testConfig = {
          topic: ntfyTopic.trim(),
          serverUrl: (ntfyServerUrl || 'https://ntfy.sh').trim(),
          token: (ntfyToken && !ntfyToken.startsWith('••••')) ? ntfyToken.trim() : ''
        };
      }

      const resNtfy = await sendNtfyNotification({
        title: '🎉 Thử nghiệm ntfy.sh thành công!',
        message: `Hệ thống "Thư viện Sách HTML" đã kết nối thành công với ntfy.sh lúc ${new Date().toLocaleTimeString('vi-VN')}!\nBạn sẽ nhận được thông báo đẩy tức thì mỗi khi có người nâng cấp gói Plus/Pro.`,
        priority: 4,
        tags: ['tada', 'white_check_mark', 'moneybag'],
        config: testConfig,
        db
      });

      if (resNtfy.success) {
        await recordAuditLog(db, {
          uid,
          action: 'TEST_NTFY_NOTIFICATION',
          details: 'Gửi thành công thông báo thử nghiệm tới ntfy.sh'
        });
        return res.status(200).json({
          success: true,
          message: 'Đã gửi thông báo thử nghiệm thành công tới ntfy.sh! Vui lòng kiểm tra ứng dụng ntfy trên điện thoại.'
        });
      } else {
        return res.status(400).json({
          error: resNtfy.error || (resNtfy.reason === 'not_configured' ? 'Chưa cấu hình Topic ntfy.sh. Hãy nhập Topic và lưu lại trước.' : 'Không thể gửi thông báo tới ntfy.sh')
        });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi kiểm tra ntfy: ' + err.message });
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
    const limitNum = Math.min(200, Math.max(10, parseInt(req.query.limit, 10) || 100));

    try {
      // Lấy tối đa 150 đơn gần nhất để truy vấn siêu tốc và sắp xếp đơn chờ lên trên
      const fetchLimit = 150;
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
        console.warn('[Admin Billing Orders] Lỗi truy vấn có điều kiện, chuyển sang fallback an toàn:', queryErr.message);
        try {
          snap = await db.collection('billing_orders')
            .orderBy('createdAt', 'desc')
            .limit(150)
            .get();
        } catch (sortErr) {
          console.warn('[Admin Billing Orders] Lỗi truy vấn orderBy createdAt, lấy dữ liệu thô:', sortErr.message);
          snap = await db.collection('billing_orders').limit(150).get();
        }
      }

      let orders = [];
      let pendingCount = 0;
      let userConfirmedCount = 0;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const expiredBillRefs = [];

      snap.forEach(docSnap => {
        const data = docSnap.data();

        // Tự động chuyển pending sang expired nếu đã qua 15 phút mà khách không chuyển
        if (data.status === 'pending' && data.expiresAt && (nowMs > new Date(data.expiresAt).getTime())) {
          data.status = 'expired';
          try { docSnap.ref.update({ status: 'expired', updatedAt: new Date(nowMs).toISOString() }); } catch (_) {}
        }

        if (data.status === 'user_confirmed') userConfirmedCount++;
        if (data.status === 'pending') pendingCount++;

        // Tự động kiểm tra ảnh bill đã quá 7 ngày chưa
        let effectiveProofUrl = data.proofUrl || null;
        let isProofPurged = Boolean(data.proofPurged);

        if (effectiveProofUrl) {
          const proofTime = data.userConfirmedAt || data.paidAt || data.createdAt;
          if (proofTime && (nowMs - new Date(proofTime).getTime() >= SEVEN_DAYS_MS)) {
            expiredBillRefs.push(docSnap.ref);
            effectiveProofUrl = null;
            isProofPurged = true;
          }
        }

        // Lọc trạng thái trong bộ nhớ nếu chạy chế độ fallback
        if (statusFilter !== 'all' && data.status !== statusFilter) return;

        if (search) {
          const matchCode = (data.code || '').toLowerCase().includes(search);
          const matchEmail = (data.userEmail || '').toLowerCase().includes(search);
          const matchUid = (data.uid || '').toLowerCase().includes(search);
          const matchName = (data.userName || data.displayName || '').toLowerCase().includes(search);
          const matchPlan = (data.planId || '').toLowerCase().includes(search);
          if (!matchCode && !matchEmail && !matchUid && !matchName && !matchPlan) return;
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
          proofUrl: effectiveProofUrl,
          proofPurged: isProofPurged
        });
      });

      // Tự động dọn dẹp giải phóng bộ nhớ Firestore ở chế độ ngầm (Background Task)
      if (expiredBillRefs.length > 0) {
        (async () => {
          try {
            const cleanBatch = db.batch();
            expiredBillRefs.forEach(ref => {
              cleanBatch.update(ref, {
                proofUrl: null,
                proofPurged: true,
                proofPurgedAt: new Date().toISOString()
              });
            });
            await cleanBatch.commit();
            console.log(`[Admin Billing] Đã tự động dọn dẹp ${expiredBillRefs.length} ảnh bill quá 7 ngày`);
          } catch (_) {}
        })();
      }

      // Sắp xếp ưu tiên: Đơn chờ xử lý lên trên, đơn đã duyệt / đã hủy / hết hạn tự xuống dưới
      const STATUS_PRIORITY = {
        'user_confirmed': 1, // Khách báo đã chuyển (ưu tiên cao nhất - DUY NHẤT ĐƠN NÀY CẦN DUYỆT)
        'paid': 2,           // Đã kích hoạt
        'pending': 3,        // Chờ thanh toán (khách chưa bấm chuyển)
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

  // 5. DUYỆT ĐƠN (ĐƠN LẺ HOẶC HÀNG LOẠT) (POST /api/admin/billing/orders-confirm)
  if (action === 'orders-confirm' && req.method === 'POST') {
    const { orderId, orderIds, reason } = req.body || {};
    const ids = Array.isArray(orderIds) && orderIds.length > 0 
      ? orderIds.filter(Boolean) 
      : (orderId ? [orderId] : []);

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Thiếu orderId hoặc danh sách orderIds' });
    }

    try {
      const now = Date.now();
      let successCount = 0;
      let lastExpiresAt = null;
      let lastPlanId = 'pro';

      for (const id of ids) {
        try {
          const orderRef = db.collection('billing_orders').doc(id);
          const orderSnap = await orderRef.get();
          if (!orderSnap.exists) continue;
          const order = orderSnap.data();

          if (order.status === 'paid') continue; // Đã thanh toán trước đó

          const targetUid = order.uid;
          const planId = order.planId || 'pro';
          const period = order.period || 'monthly';
          lastPlanId = planId;

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
          lastExpiresAt = newExpiresAt;

          const batch = db.batch();

          // Cập nhật đơn hàng thành paid
          batch.update(orderRef, {
            status: 'paid',
            paidAt: new Date().toISOString(),
            confirmedBy: uid,
            confirmReason: reason || (ids.length > 1 ? 'Admin duyệt hàng loạt' : 'Admin duyệt thủ công'),
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
            console.warn('[Billing] Không thể set custom claims:', claimErr.message);
          }

          successCount++;
        } catch (singleErr) {
          console.warn(`[Batch Confirm] Lỗi duyệt đơn ${id}:`, singleErr.message);
        }
      }

      await recordAuditLog(db, {
        uid,
        action: ids.length > 1 ? 'CONFIRM_ORDERS_BATCH' : 'CONFIRM_ORDER_MANUAL',
        details: `Duyệt thành công ${successCount}/${ids.length} đơn hàng`
      });

      // Gửi thông báo đẩy về ntfy.sh khi Admin duyệt đơn thủ công
      if (successCount > 0) {
        try {
          sendNtfyNotification({
            title: `✅ Admin đã duyệt ${successCount} đơn hàng`,
            message: `Quản trị viên (${uid}) vừa duyệt thành công ${successCount} đơn hàng.\nGói kích hoạt: ${lastPlanId.toUpperCase()}${lastExpiresAt ? ' tới ngày ' + new Date(lastExpiresAt).toLocaleDateString('vi-VN') : ''}.\nHình thức: Admin duyệt thủ công`,
            priority: 4,
            tags: ['white_check_mark', 'moneybag'],
            db
          }).catch(err => console.warn('[Admin Confirm ntfy] Lỗi gửi:', err.message));
        } catch (_) {}
      }

      const message = ids.length > 1
        ? `Đã duyệt thành công ${successCount} đơn hàng!`
        : `Đã kích hoạt thành công gói ${lastPlanId.toUpperCase()} tới ngày ${lastExpiresAt ? new Date(lastExpiresAt).toLocaleDateString('vi-VN') : ''}`;

      return res.status(200).json({
        success: true,
        count: successCount,
        message
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi duyệt đơn: ' + err.message });
    }
  }

  // 6. HỦY ĐƠN HÀNG (ĐƠN LẺ HOẶC HÀNG LOẠT) (POST /api/admin/billing/orders-cancel)
  if (action === 'orders-cancel' && req.method === 'POST') {
    const { orderId, orderIds, reason } = req.body || {};
    const ids = Array.isArray(orderIds) && orderIds.length > 0 
      ? orderIds.filter(Boolean) 
      : (orderId ? [orderId] : []);

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Thiếu orderId hoặc danh sách orderIds' });
    }

    try {
      let successCount = 0;
      const batch = db.batch();

      for (const id of ids) {
        try {
          const orderRef = db.collection('billing_orders').doc(id);
          const orderSnap = await orderRef.get();
          if (!orderSnap.exists) continue;
          const ord = orderSnap.data();
          if (ord.status === 'paid') continue; // Không hủy đơn đã thanh toán

          batch.update(orderRef, {
            status: 'cancelled',
            cancelledReason: reason || (ids.length > 1 ? 'Admin hủy hàng loạt' : 'Admin hủy đơn'),
            cancelledBy: uid,
            updatedAt: new Date().toISOString()
          });
          successCount++;
        } catch (_) {}
      }

      if (successCount > 0) {
        await batch.commit();
      }

      await recordAuditLog(db, {
        uid,
        action: ids.length > 1 ? 'CANCEL_ORDERS_BATCH' : 'CANCEL_ORDER_ADMIN',
        details: `Hủy thành công ${successCount}/${ids.length} đơn hàng. Lý do: ${reason || 'Không có'}`
      });

      return res.status(200).json({
        success: true,
        count: successCount,
        message: ids.length > 1 ? `Đã hủy thành công ${successCount} đơn hàng!` : 'Đã hủy đơn hàng'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi hủy đơn: ' + err.message });
    }
  }

  // 7. XÓA GIAO DỊCH / ĐƠN HÀNG THỦ CÔNG (ĐƠN LẺ HOẶC HÀNG LOẠT) (POST /api/admin/billing/orders-delete)
  if (action === 'orders-delete' && req.method === 'POST') {
    const { orderId, orderIds, reason } = req.body || {};
    const ids = Array.isArray(orderIds) && orderIds.length > 0
      ? orderIds.filter(Boolean)
      : (orderId ? [orderId] : []);

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Thiếu orderId hoặc danh sách orderIds' });
    }

    try {
      const batch = db.batch();
      let successCount = 0;

      for (const id of ids) {
        try {
          const orderRef = db.collection('billing_orders').doc(id);
          batch.delete(orderRef);
          successCount++;
        } catch (_) {}
      }

      if (successCount > 0) {
        await batch.commit();
      }

      await recordAuditLog(db, {
        uid,
        action: ids.length > 1 ? 'DELETE_ORDERS_BATCH' : 'DELETE_ORDER_ADMIN',
        details: `Đã xóa vĩnh viễn ${successCount}/${ids.length} giao dịch. Lý do: ${reason || 'Quản trị viên xóa thủ công'}`
      });

      return res.status(200).json({
        success: true,
        count: successCount,
        message: ids.length > 1 ? `Đã xóa thành công ${successCount} giao dịch!` : 'Đã xóa giao dịch thành công'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi xóa giao dịch: ' + err.message });
    }
  }

  // 8. XÓA THỦ CÔNG ẢNH BILL CỦA 1 ĐƠN (POST /api/admin/billing/delete-proof)
  if (action === 'delete-proof' && req.method === 'POST') {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Thiếu orderId' });

    try {
      const orderRef = db.collection('billing_orders').doc(orderId);
      const snap = await orderRef.get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
      }

      await orderRef.update({
        proofUrl: null,
        proofPurged: true,
        proofPurgedBy: uid,
        proofPurgedAt: new Date().toISOString()
      });

      await recordAuditLog(db, {
        uid,
        action: 'DELETE_ORDER_PROOF',
        details: `Xóa ảnh biên lai của đơn hàng ${orderId}`
      });

      return res.status(200).json({
        success: true,
        message: 'Đã xóa ảnh biên lai thành công để giải phóng bộ nhớ'
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi xóa ảnh bill: ' + err.message });
    }
  }

  // 9. DỌN DẸP GIAO DỊCH CŨ VÀ ẢNH BILL HÀNG LOẠT (POST /api/admin/billing/cleanup)
  if (action === 'cleanup' && req.method === 'POST') {
    const { mode } = req.body || {}; // 'bills_7d' | 'cancelled_7d' | 'all_old_30d'
    const nowMs = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    try {
      const snap = await db.collection('billing_orders').limit(200).get();
      const batch = db.batch();
      let purgedBills = 0;
      let deletedOrders = 0;

      snap.forEach(docSnap => {
        const d = docSnap.data();
        const baseTime = d.createdAt ? new Date(d.createdAt).getTime() : 0;
        const ageMs = nowMs - baseTime;

        if (mode === 'bills_7d' || !mode) {
          if (d.proofUrl) {
            const proofTime = d.userConfirmedAt || d.paidAt || d.createdAt;
            if (proofTime && (nowMs - new Date(proofTime).getTime() >= SEVEN_DAYS_MS)) {
              batch.update(docSnap.ref, {
                proofUrl: null,
                proofPurged: true,
                proofPurgedAt: new Date().toISOString()
              });
              purgedBills++;
            }
          }
        }

        if (mode === 'cancelled_7d') {
          if (['cancelled', 'expired'].includes(d.status) && ageMs >= SEVEN_DAYS_MS) {
            batch.delete(docSnap.ref);
            deletedOrders++;
          }
        }

        if (mode === 'all_old_30d') {
          if (['paid', 'cancelled', 'expired'].includes(d.status) && ageMs >= THIRTY_DAYS_MS) {
            batch.delete(docSnap.ref);
            deletedOrders++;
          }
        }
      });

      if (purgedBills > 0 || deletedOrders > 0) {
        await batch.commit();
      }

      await recordAuditLog(db, {
        uid,
        action: 'CLEANUP_BILLING_DATA',
        details: `Dọn dẹp hệ thống (${mode || 'bills_7d'}): Đã xóa ${purgedBills} ảnh bill, xóa ${deletedOrders} giao dịch cũ`
      });

      return res.status(200).json({
        success: true,
        purgedBills,
        deletedOrders,
        message: `Đã dọn dẹp thành công! Giải phóng ${purgedBills} ảnh biên lai cũ và xóa ${deletedOrders} giao dịch cũ.`
      });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi dọn dẹp: ' + err.message });
    }
  }

  return res.status(400).json({ error: 'Hành động không hợp lệ' });
};
