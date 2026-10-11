// api/admin/ai/settings.js
const { verifyAdmin, recordAuditLog } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Cho phép GET để lấy cấu hình hiện tại
    const ctx = await verifyAdmin(req, res);
    if (!ctx) return;
    const snap = await ctx.db.doc('config/ai_settings').get();
    return res.status(200).json({ settings: snap.exists ? snap.data() : {} });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { priority, models, dailyRequestCap, featureToggles } = req.body || {};

  try {
    const sanitizedPriority = Array.isArray(priority) && priority.length > 0
      ? priority.filter(p => ['gemini', 'claude', 'openai'].includes(p))
      : ['gemini', 'openai', 'claude'];

    const sanitizedCap = Math.max(0, parseInt(dailyRequestCap, 10) || 0);

    const updateData = {
      priority: sanitizedPriority,
      models: models && typeof models === 'object' ? models : {},
      dailyRequestCap: sanitizedCap,
      featureToggles: featureToggles && typeof featureToggles === 'object' ? featureToggles : {
        smartSchedule: true,
        flashcards: true
      },
      updatedAt: new Date().toISOString(),
      updatedBy: uid
    };

    await db.doc('config/ai_settings').set(updateData, { merge: true });

    await recordAuditLog(db, {
      uid,
      action: 'ai_settings_update',
      newVal: updateData,
      details: `Cập nhật cấu hình AI (Ưu tiên: ${sanitizedPriority.join(' → ')}, Trần ngày: ${sanitizedCap || 'Vô hạn'})`
    });

    return res.status(200).json({
      success: true,
      settings: updateData
    });
  } catch (err) {
    console.error('Lỗi lưu cài đặt AI:', err.message);
    return res.status(500).json({ error: 'Không thể lưu cài đặt: ' + err.message });
  }
};
