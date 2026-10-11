// api/admin/users.js
// Gộp toàn bộ API quản trị Người dùng: search, grant, revoke
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị Người dùng bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { admin, db, uid: adminUid } = ctx;

  // 1. ACTION: SEARCH (GET) - Tìm kiếm người dùng theo Email hoặc UID
  if (action === 'search') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.status(400).json({ error: 'Vui lòng nhập Email hoặc UID cần tìm' });
    }

    try {
      let userRecord = null;
      if (q.includes('@')) {
        try {
          userRecord = await admin.auth().getUserByEmail(q);
        } catch (e) {}
      }
      if (!userRecord) {
        try {
          userRecord = await admin.auth().getUser(q);
        } catch (e) {}
      }

      if (!userRecord) {
        return res.status(200).json({ users: [] });
      }

      let tier = (userRecord.customClaims && userRecord.customClaims.tier) || 'free';
      let expiresAt = (userRecord.customClaims && userRecord.customClaims.tierExpiresAt) || null;

      let lessonCount = 0;
      let sectionCount = 0;

      try {
        const userSettingsRef = db.doc(`artifacts/thuvienhtml/users/${userRecord.uid}/settings/config`);
        const settingsSnap = await userSettingsRef.get();
        if (settingsSnap.exists) {
          const sData = settingsSnap.data();
          if (sData.tier) tier = sData.tier;
          if (sData.tierExpiresAt) expiresAt = sData.tierExpiresAt;
        }

        const lessonsSnap = await db.collection(`artifacts/thuvienhtml/users/${userRecord.uid}/lessons`).select().get();
        lessonCount = lessonsSnap.size;

        const catsSnap = await db.collection(`artifacts/thuvienhtml/users/${userRecord.uid}/categories`).select().get();
        sectionCount = catsSnap.size;
      } catch (e) {}

      const userData = {
        uid: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        customClaims: userRecord.customClaims || {},
        tier,
        expiresAt,
        usage: {
          lessons: lessonCount,
          sections: sectionCount
        }
      };

      return res.status(200).json({ users: [userData] });
    } catch (err) {
      console.error('Lỗi tìm kiếm người dùng:', err);
      return res.status(500).json({ error: 'Lỗi máy chủ khi tìm kiếm người dùng.' });
    }
  }

  // 2. ACTION: GRANT (POST) - Cấp hoặc gia hạn gói dịch vụ
  if (action === 'grant') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { uid, tier, days, reason } = req.body || {};

    if (!uid || !tier || !['plus', 'pro', 'free'].includes(tier)) {
      return res.status(400).json({ error: 'Thông tin cấp gói không hợp lệ' });
    }

    const numDays = parseInt(days, 10);
    let expiresAt = null;
    if (numDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + numDays);
      expiresAt = d.toISOString();
    }

    try {
      const user = await admin.auth().getUser(uid);
      const existingClaims = user.customClaims || {};

      const updatedClaims = {
        ...existingClaims,
        tier,
        tierExpiresAt: expiresAt
      };

      await admin.auth().setCustomUserClaims(uid, updatedClaims);

      const userSettingsRef = db.doc(`artifacts/thuvienhtml/users/${uid}/settings/config`);
      await userSettingsRef.set({
        tier,
        tierExpiresAt: expiresAt,
        tierGrantedBy: adminUid,
        tierGrantedAt: new Date().toISOString(),
        tierGrantReason: String(reason || '')
      }, { merge: true });

      await recordAuditLog(db, {
        uid: adminUid,
        action: 'user_grant',
        oldVal: { tier: existingClaims.tier || 'free', expiresAt: existingClaims.tierExpiresAt || null },
        newVal: { tier, expiresAt },
        details: `Cấp gói ${tier.toUpperCase()} cho UID ${uid} (${numDays > 0 ? numDays + ' ngày' : 'Vĩnh viễn'}). Lý do: ${reason || 'Không có'}`
      });

      return res.status(200).json({ success: true, tier, expiresAt });
    } catch (err) {
      console.error('Lỗi khi cấp gói người dùng:', err);
      return res.status(500).json({ error: 'Không thể cấp gói: ' + err.message });
    }
  }

  // 3. ACTION: REVOKE (POST) - Thu hồi gói về gói Thường (free)
  if (action === 'revoke') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { uid, reason } = req.body || {};

    if (!uid) {
      return res.status(400).json({ error: 'Thiếu UID người dùng' });
    }

    try {
      const user = await admin.auth().getUser(uid);
      const existingClaims = user.customClaims || {};

      const updatedClaims = { ...existingClaims };
      delete updatedClaims.tier;
      delete updatedClaims.tierExpiresAt;

      await admin.auth().setCustomUserClaims(uid, updatedClaims);

      const userSettingsRef = db.doc(`artifacts/thuvienhtml/users/${uid}/settings/config`);
      await userSettingsRef.set({
        tier: 'free',
        tierExpiresAt: null,
        tierRevokedBy: adminUid,
        tierRevokedAt: new Date().toISOString(),
        tierRevokeReason: String(reason || '')
      }, { merge: true });

      await recordAuditLog(db, {
        uid: adminUid,
        action: 'user_revoke',
        oldVal: { tier: existingClaims.tier || 'plus/pro', expiresAt: existingClaims.tierExpiresAt || null },
        newVal: { tier: 'free', expiresAt: null },
        details: `Thu hồi gói dịch vụ về Thường cho UID ${uid}. Lý do: ${reason || 'Không có'}`
      });

      return res.status(200).json({ success: true, tier: 'free' });
    } catch (err) {
      console.error('Lỗi khi thu hồi gói người dùng:', err);
      return res.status(500).json({ error: 'Không thể thu hồi gói: ' + err.message });
    }
  }

  return res.status(404).json({ error: `Không tìm thấy hành động users: ${action}` });
};
