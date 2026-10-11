const { verifyAdmin, recordAuditLog, invalidatePlansCache } = require('../_auth');
const { validatePlansConfig } = require('../_plansValidator');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { historyId } = req.body || {};

  if (!historyId) {
    return res.status(400).json({ error: 'Thiếu mã bản ghi lịch sử historyId' });
  }

  try {
    const plansRef = db.doc('config/plans');
    const historyDoc = await plansRef.collection('history').doc(historyId).get();

    if (!historyDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi lịch sử cần khôi phục' });
    }

    const historyData = historyDoc.data();
    const validation = validatePlansConfig(historyData.plans);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Dữ liệu trong bản ghi lịch sử không tương thích', details: validation.errors });
    }

    const plansSnap = await plansRef.get();
    let currentVersion = 0;
    let oldData = null;
    if (plansSnap.exists) {
      oldData = plansSnap.data();
      currentVersion = oldData.version || 0;
    }

    const newVersion = currentVersion + 1;
    const updatePayload = {
      version: newVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
      plans: validation.sanitizedPlans
    };

    if (oldData && oldData.pricing) {
      updatePayload.pricing = oldData.pricing;
    }

    await plansRef.set(updatePayload, { merge: true });

    // Thêm ghi chú vào history
    await plansRef.collection('history').add({
      version: newVersion,
      timestamp: new Date().toISOString(),
      updatedBy: uid,
      plans: validation.sanitizedPlans,
      restoredFrom: historyId
    });

    invalidatePlansCache();

    await recordAuditLog(db, {
      uid,
      action: 'plans_restore',
      oldVal: oldData ? oldData.plans : null,
      newVal: validation.sanitizedPlans,
      details: `Khôi phục hạn mức các gói từ bản lưu v${historyData.version || historyId}`
    });

    return res.status(200).json({
      success: true,
      version: newVersion,
      updatedAt: updatePayload.updatedAt
    });
  } catch (err) {
    console.error('Lỗi khi khôi phục cấu hình plans:', err);
    return res.status(500).json({ error: 'Không thể khôi phục cấu hình.' });
  }
};
