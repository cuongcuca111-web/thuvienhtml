const { verifyAdmin } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;
  const statusFilter = req.query.status || 'all';
  const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  try {
    let query = db.collection('activation_codes');

    if (statusFilter === 'unused') {
      query = query.where('isUsed', '==', false).where('isDisabled', '==', false);
    } else if (statusFilter === 'used') {
      query = query.where('isUsed', '==', true);
    } else if (statusFilter === 'disabled') {
      query = query.where('isDisabled', '==', true);
    }

    const snap = await query.orderBy('createdAt', 'desc').limit(limitNum).get();
    const codes = [];
    snap.forEach(doc => {
      codes.push(doc.data());
    });

    return res.status(200).json({ codes });
  } catch (err) {
    console.error('Lỗi khi lấy danh sách mã:', err);
    return res.status(500).json({ error: 'Không thể tải danh sách mã kích hoạt.' });
  }
};
