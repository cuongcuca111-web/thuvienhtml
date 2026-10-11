const { verifyAdmin, recordAuditLog, invalidatePlansCache } = require('../_auth');
const { validatePlansConfig } = require('../_plansValidator');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { plans, version } = req.body || {};

  const validation = validatePlansConfig(plans);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: validation.errors });
  }

  try {
    const plansRef = db.doc('config/plans');
    const docSnap = await plansRef.get();
    let currentVersion = 0;
    let oldData = null;

    if (docSnap.exists) {
      oldData = docSnap.data();
      currentVersion = oldData.version || 0;
      // Kiểm tra xung đột phiên bản (Optimistic locking)
      if (typeof version === 'number' && version !== currentVersion) {
        return res.status(409).json({
          error: 'Xung đột phiên bản: Cấu hình đã được người khác cập nhật trước đó.',
          currentVersion
        });
      }
    }

    const newVersion = currentVersion + 1;
    const updatePayload = {
      version: newVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
      plans: validation.sanitizedPlans
    };

    // Giữ lại pricing cũ nếu đã có trong doc
    if (oldData && oldData.pricing) {
      updatePayload.pricing = oldData.pricing;
    }

    await plansRef.set(updatePayload, { merge: true });

    // Lưu vào lịch sử phiên bản để cho phép khôi phục
    await plansRef.collection('history').add({
      version: newVersion,
      timestamp: new Date().toISOString(),
      updatedBy: uid,
      plans: validation.sanitizedPlans
    });

    // Xóa cache bộ nhớ trên server
    invalidatePlansCache();

    // Ghi audit log
    await recordAuditLog(db, {
      uid,
      action: 'plans_update',
      oldVal: oldData ? oldData.plans : null,
      newVal: validation.sanitizedPlans,
      details: `Cập nhật hạn mức các gói lên phiên bản v${newVersion}`
    });

    return res.status(200).json({
      success: true,
      version: newVersion,
      updatedAt: updatePayload.updatedAt
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật cấu hình plans:', err);
    return res.status(500).json({ error: 'Không thể lưu cấu hình. Vui lòng thử lại sau.' });
  }
};
