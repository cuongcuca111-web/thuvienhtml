// api/prompts.js
// API công khai phục vụ lấy danh sách Prompt AI mới nhất cho tất cả người dùng
const { initAdmin } = require('../lib/admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Giảm thời gian đệm CDN xuống 10 giây và yêu cầu revalidate để tránh người dùng bị kẹt dữ liệu prompt cũ/đã xóa
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, must-revalidate');

  try {
    const admin = initAdmin();
    const db = admin.firestore();
    const docSnap = await db.doc('config/prompts').get();

    if (!docSnap.exists) {
      return res.status(200).json({ success: true, items: [], version: 0 });
    }

    const data = docSnap.data() || {};
    return res.status(200).json({
      success: true,
      items: Array.isArray(data.items) ? data.items : [],
      version: data.version || 1,
      updatedAt: data.updatedAt || null
    });
  } catch (err) {
    console.warn('[API Public Prompts] Lỗi đọc Firestore:', err.message);
    return res.status(200).json({ success: false, items: [], error: err.message });
  }
};
