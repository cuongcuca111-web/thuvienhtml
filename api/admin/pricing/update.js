const { verifyAdmin, recordAuditLog, invalidatePlansCache } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { pricing } = req.body || {};

  if (!pricing || typeof pricing !== 'object') {
    return res.status(400).json({ error: 'Dữ liệu bảng giá không hợp lệ' });
  }

  const sanitizedPricing = {
    plusMonthly: Math.max(0, parseInt(pricing.plusMonthly, 10) || 29000),
    proMonthly: Math.max(0, parseInt(pricing.proMonthly, 10) || 59000),
    yearlyDiscount: Math.min(100, Math.max(0, parseInt(pricing.yearlyDiscount, 10) || 20))
  };

  try {
    const plansRef = db.doc('config/plans');
    const snap = await plansRef.get();
    let oldPricing = null;
    if (snap.exists) {
      oldPricing = snap.data().pricing || null;
    }

    await plansRef.set({
      pricing: sanitizedPricing,
      updatedAt: new Date().toISOString(),
      updatedBy: uid
    }, { merge: true });

    invalidatePlansCache();

    await recordAuditLog(db, {
      uid,
      action: 'pricing_update',
      oldVal: oldPricing,
      newVal: sanitizedPricing,
      details: 'Cập nhật bảng giá dịch vụ Plus / Pro'
    });

    return res.status(200).json({ success: true, pricing: sanitizedPricing });
  } catch (err) {
    console.error('Lỗi khi cập nhật bảng giá:', err);
    return res.status(500).json({ error: 'Không thể cập nhật bảng giá.' });
  }
};
