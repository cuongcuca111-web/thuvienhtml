const { verifyAdmin, recordAuditLog } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { admin, db, uid: adminUid } = ctx;
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
};
