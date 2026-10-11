// api/admin/plans.js
// Gộp toàn bộ API quản trị Hạn mức các gói & Bảng giá: update, history, restore, pricing
const { verifyAdmin, recordAuditLog, invalidatePlansCache } = require('../../lib/admin-auth');
const { validatePlansConfig } = require('../../lib/plans-validator');

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  if (pathname.includes('pricing')) return 'pricing-update';
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị Hạn mức & Bảng giá bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. ACTION: UPDATE (POST) - Cập nhật hạn mức các gói
  if (action === 'update') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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

      invalidatePlansCache();

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
  }

  // 2. ACTION: HISTORY (GET) - Lịch sử thay đổi các gói
  if (action === 'history') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
      const historyRef = db.doc('config/plans').collection('history');
      const snap = await historyRef.orderBy('timestamp', 'desc').limit(10).get();

      const history = [];
      snap.forEach(doc => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return res.status(200).json({ history });
    } catch (err) {
      console.error('Lỗi khi lấy lịch sử thay đổi plans:', err);
      return res.status(500).json({ error: 'Không thể tải lịch sử thay đổi.' });
    }
  }

  // 3. ACTION: RESTORE (POST) - Khôi phục phiên bản cũ
  if (action === 'restore') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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
  }

  // 4. ACTION: PRICING-UPDATE (POST) - Cập nhật bảng giá
  if (action === 'pricing-update' || action === 'pricing') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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
  }

  return res.status(404).json({ error: `Không tìm thấy hành động plans: ${action}` });
};
