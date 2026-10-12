// api/admin/prompts.js
// API Quản trị Thư viện Prompt AI: Lưu kho prompt lên Firestore (config/prompts) và nạp dữ liệu
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị Thư viện Prompt bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. ACTION: GET (Lấy danh sách prompt hiện tại trên hệ thống đám mây)
  if (req.method === 'GET' || action === 'get' || action === 'list') {
    try {
      const docSnap = await db.doc('config/prompts').get();
      if (!docSnap.exists) {
        return res.status(200).json({ success: true, items: [], version: 0 });
      }
      const data = docSnap.data() || {};
      return res.status(200).json({
        success: true,
        items: Array.isArray(data.items) ? data.items : [],
        version: data.version || 1,
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null
      });
    } catch (err) {
      console.error('[API Admin Prompts] Lỗi nạp prompts:', err);
      return res.status(500).json({ error: 'Lỗi nạp danh sách prompt từ cơ sở dữ liệu: ' + err.message });
    }
  }

  // 2. ACTION: SAVE / UPDATE (POST - Lưu toàn bộ kho prompt lên Firestore để mọi người dùng đều thấy)
  if (req.method === 'POST' || action === 'save' || action === 'update') {
    const { prompts } = req.body || {};
    if (!Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ: prompts phải là một mảng danh sách.' });
    }

    try {
      // Chuẩn hóa và làm sạch dữ liệu từng prompt
      const sanitized = prompts.map((p, idx) => ({
        id: String(p.id || ('p_' + Date.now() + '_' + idx)),
        title: String(p.title || 'Prompt không tiêu đề').trim(),
        category: String(p.category || 'study').trim(),
        categoryName: String(p.categoryName || 'Học tập & Ôn thi').trim(),
        requiredTier: String(p.requiredTier || 'free').toLowerCase().trim(),
        displayImage: String(p.displayImage || '').trim(),
        description: String(p.description || '').trim(),
        tags: Array.isArray(p.tags) ? p.tags.map(t => String(t).trim()).filter(Boolean) : ['Prompt'],
        promptText: String(p.promptText || '').trim(),
        updatedAt: new Date().toISOString()
      }));

      const docRef = db.doc('config/prompts');
      const oldSnap = await docRef.get();
      let currentVersion = 0;
      let oldCount = 0;
      if (oldSnap.exists) {
        const oldData = oldSnap.data() || {};
        currentVersion = oldData.version || 0;
        oldCount = Array.isArray(oldData.items) ? oldData.items.length : 0;
      }

      const newVersion = currentVersion + 1;
      const payload = {
        version: newVersion,
        items: sanitized,
        updatedAt: new Date().toISOString(),
        updatedBy: uid
      };

      await docRef.set(payload, { merge: false });

      // Ghi nhật ký quản trị (admin_audit)
      await recordAuditLog(db, {
        uid,
        action: 'PROMPT_LIBRARY_SAVE',
        oldVal: { count: oldCount },
        newVal: { count: sanitized.length, version: newVersion },
        details: `Lưu ${sanitized.length} câu lệnh Prompt AI lên máy chủ đám mây bởi Admin ${uid}`
      });

      return res.status(200).json({
        success: true,
        count: sanitized.length,
        version: newVersion,
        updatedAt: payload.updatedAt,
        message: `Đã lưu thành công ${sanitized.length} prompt lên hệ thống! Mọi người dùng sẽ thấy ngay lập tức.`
      });
    } catch (err) {
      console.error('[API Admin Prompts] Lỗi lưu prompts:', err);
      return res.status(500).json({ error: 'Không thể lưu danh sách prompt: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
