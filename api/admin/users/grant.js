const { verifyAdmin, recordAuditLog } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { admin, db, uid: adminUid } = ctx;
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

    // Cập nhật cả trong Firestore settings của người dùng để client đồng bộ ngay
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

    return res.status(200).json({
      success: true,
      tier,
      expiresAt
    });
  } catch (err) {
    console.error('Lỗi khi cấp gói người dùng:', err);
    return res.status(500).json({ error: 'Không thể cấp gói: ' + err.message });
  }
};
