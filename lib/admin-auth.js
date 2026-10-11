const admin = require('firebase-admin');

// Khởi tạo Firebase Admin SDK Singleton
function initAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saEnv) {
    console.error('LỖI CẤU HÌNH: Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT trên máy chủ');
    throw new Error('Chưa cấu hình FIREBASE_SERVICE_ACCOUNT');
  }

  let serviceAccount;
  try {
    if (typeof saEnv === 'object') {
      serviceAccount = saEnv;
    } else if (saEnv.trim().startsWith('{')) {
      serviceAccount = JSON.parse(saEnv.trim());
    } else {
      // Thử giải mã nếu là base64
      const decoded = Buffer.from(saEnv, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }
  } catch (err) {
    console.error('Lỗi phân tích cú pháp FIREBASE_SERVICE_ACCOUNT:', err.message);
    throw new Error('Định dạng FIREBASE_SERVICE_ACCOUNT không hợp lệ');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return admin;
}

// Bộ nhớ đệm Plans trong 60 giây ở máy chủ
let _cachedPlansConfig = null;
let _cachedPlansTime = 0;

async function getCachedPlansConfig() {
  const now = Date.now();
  if (_cachedPlansConfig && (now - _cachedPlansTime < 60000)) {
    return _cachedPlansConfig;
  }

  const app = initAdmin();
  const db = app.firestore();
  try {
    const snap = await db.doc('config/plans').get();
    if (snap.exists) {
      _cachedPlansConfig = snap.data();
      _cachedPlansTime = now;
      return _cachedPlansConfig;
    }
  } catch (e) {
    console.warn('Lỗi đọc config/plans từ Firestore, dùng bản đệm nếu có:', e.message);
  }
  return _cachedPlansConfig;
}

function invalidatePlansCache() {
  _cachedPlansConfig = null;
  _cachedPlansTime = 0;
}

// Rate limiting đơn giản trong bộ nhớ cho các lượt thử đăng nhập thất bại
const failedAttempts = new Map(); // key: ip, value: { count, resetAt }

function checkRateLimit(ip) {
  return true; // Đã vô hiệu hóa giới hạn chặn 15 phút cho admin
}

function recordFailedAttempt(ip) {
  // Không ghi nhận chặn IP
}

// Hàm xác thực token Admin ở máy chủ
async function verifyAdmin(req, res) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'Quá nhiều yêu cầu không hợp lệ. Vui lòng thử lại sau 15 phút.' });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    recordFailedAttempt(clientIp);
    res.status(401).json({ error: 'Yêu cầu xác thực' });
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    recordFailedAttempt(clientIp);
    res.status(401).json({ error: 'Token không hợp lệ' });
    return null;
  }

  try {
    const app = initAdmin();
    const decoded = await app.auth().verifyIdToken(token);

    // BẮT BUỘC có claim admin === true
    if (decoded.admin !== true) {
      recordFailedAttempt(clientIp);
      res.status(403).json({ error: 'Quyền truy cập bị từ chối' });
      return null;
    }

    // Lớp phòng thủ thứ 2: ADMIN_UIDS nếu được thiết lập
    const adminUidsEnv = process.env.ADMIN_UIDS;
    if (adminUidsEnv) {
      const allowedUids = adminUidsEnv.split(',').map(s => s.trim()).filter(Boolean);
      if (allowedUids.length > 0 && !allowedUids.includes(decoded.uid)) {
        recordFailedAttempt(clientIp);
        res.status(403).json({ error: 'Tài khoản không nằm trong danh sách quản trị viên' });
        return null;
      }
    }

    return {
      admin: app,
      db: app.firestore(),
      decodedToken: decoded,
      uid: decoded.uid
    };
  } catch (err) {
    recordFailedAttempt(clientIp);
    res.status(403).json({ error: 'Xác thực thất bại hoặc phiên đã hết hạn' });
    return null;
  }
}

// Ghi audit log trên máy chủ (chỉ server mới ghi được vào admin_audit)
async function recordAuditLog(db, { uid, action, oldVal = null, newVal = null, details = '' }) {
  try {
    await db.collection('admin_audit').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isoTime: new Date().toISOString(),
      uid: uid || 'system',
      action: String(action),
      oldVal: oldVal !== null ? JSON.parse(JSON.stringify(oldVal)) : null,
      newVal: newVal !== null ? JSON.parse(JSON.stringify(newVal)) : null,
      details: String(details || '')
    });
  } catch (err) {
    console.error('Không thể ghi audit log:', err.message);
  }
}

module.exports = {
  admin,
  initAdmin,
  verifyAdmin,
  recordAuditLog,
  getCachedPlansConfig,
  invalidatePlansCache
};
