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

  // 1. ACTION: RECENT / LIST (GET) - Theo dõi người dùng mới tạo tài khoản gần đây
  if (action === 'recent' || action === 'list') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    try {
      const listResult = await admin.auth().listUsers(100);
      let allUsers = listResult.users || [];

      // Sắp xếp người dùng mới tạo lên đầu tiên theo metadata.creationTime
      allUsers.sort((a, b) => {
        const timeA = a.metadata && a.metadata.creationTime ? new Date(a.metadata.creationTime).getTime() : 0;
        const timeB = b.metadata && b.metadata.creationTime ? new Date(b.metadata.creationTime).getTime() : 0;
        return timeB - timeA;
      });

      const topRecent = allUsers.slice(0, limitNum);

      // Tra cứu thông tin gói chi tiết cho từng người dùng
      const usersData = await Promise.all(topRecent.map(async (u) => {
        let tier = (u.customClaims && u.customClaims.tier) || 'free';
        let expiresAt = (u.customClaims && u.customClaims.tierExpiresAt) || null;

        // Ưu tiên đọc gói từ users/{uid}/billing/plan
        try {
          const planSnap = await db.doc(`users/${u.uid}/billing/plan`).get();
          if (planSnap.exists) {
            const p = planSnap.data();
            if (p.active && p.tier) {
              tier = p.tier;
              if (p.expiresAt) expiresAt = p.expiresAt;
            }
          }
        } catch (_) {}

        // Fallback đọc cấu hình tại settings/config
        if (tier === 'free') {
          try {
            const confSnap = await db.doc(`artifacts/thuvienhtml/users/${u.uid}/settings/config`).get();
            if (confSnap.exists) {
              const cData = confSnap.data();
              if (cData.tier) tier = cData.tier;
              if (cData.tierExpiresAt) expiresAt = cData.tierExpiresAt;
            }
          } catch (_) {}
        }

        return {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Thành viên mới'),
          disabled: Boolean(u.disabled),
          createdAt: u.metadata ? u.metadata.creationTime : null,
          lastSignInTime: u.metadata ? u.metadata.lastSignInTime : null,
          tier,
          expiresAt
        };
      }));

      return res.status(200).json({ success: true, users: usersData });
    } catch (err) {
      console.error('[Admin Users] Lỗi tải người dùng mới:', err);
      return res.status(500).json({ error: 'Không thể tải danh sách người dùng: ' + err.message });
    }
  }

  // 2. ACTION: SEARCH (GET) - Tìm kiếm người dùng theo Email hoặc UID để tra cứu gói
  if (action === 'search') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.status(400).json({ error: 'Vui lòng nhập Email hoặc UID cần tìm' });
    }

    try {
      let matchedUsers = [];

      // 1. Thử tìm chính xác bằng Email hoặc UID
      if (q.includes('@')) {
        try {
          const u = await admin.auth().getUserByEmail(q);
          if (u) matchedUsers.push(u);
        } catch (e) {}
      }
      if (matchedUsers.length === 0) {
        try {
          const u = await admin.auth().getUser(q);
          if (u) matchedUsers.push(u);
        } catch (e) {}
      }

      // 2. Nếu chưa thấy, tìm kiếm tương đối trong danh sách users
      if (matchedUsers.length === 0) {
        try {
          const listRes = await admin.auth().listUsers(100);
          const qLow = q.toLowerCase();
          const filtered = (listRes.users || []).filter(u => 
            u.uid.toLowerCase().includes(qLow) ||
            (u.email && u.email.toLowerCase().includes(qLow)) ||
            (u.displayName && u.displayName.toLowerCase().includes(qLow))
          );
          matchedUsers.push(...filtered.slice(0, 10));
        } catch (e) {}
      }

      if (matchedUsers.length === 0) {
        return res.status(200).json({ users: [] });
      }

      const usersResult = await Promise.all(matchedUsers.map(async (userRecord) => {
        let tier = (userRecord.customClaims && userRecord.customClaims.tier) || 'free';
        let expiresAt = (userRecord.customClaims && userRecord.customClaims.tierExpiresAt) || null;

        // Đọc gói kích hoạt từ users/{uid}/billing/plan
        try {
          const planSnap = await db.doc(`users/${userRecord.uid}/billing/plan`).get();
          if (planSnap.exists) {
            const p = planSnap.data();
            if (p.active && p.tier) {
              tier = p.tier;
              if (p.expiresAt) expiresAt = p.expiresAt;
            }
          }
        } catch (_) {}

        // Đọc cấu hình từ settings/config
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

        return {
          uid: userRecord.uid,
          email: userRecord.email || '',
          displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split('@')[0] : 'Thành viên'),
          disabled: Boolean(userRecord.disabled),
          createdAt: userRecord.metadata ? userRecord.metadata.creationTime : null,
          lastSignInTime: userRecord.metadata ? userRecord.metadata.lastSignInTime : null,
          customClaims: userRecord.customClaims || {},
          tier,
          expiresAt,
          usage: {
            lessons: lessonCount,
            sections: sectionCount
          }
        };
      }));

      return res.status(200).json({ users: usersResult });
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
