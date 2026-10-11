const { verifyAdmin } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;
  const actionFilter = req.query.action || 'all';
  const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

  try {
    let query = db.collection('admin_audit');

    if (actionFilter !== 'all') {
      query = query.where('action', '==', actionFilter);
    }

    const snap = await query.orderBy('timestamp', 'desc').limit(limitNum).get();
    const logs = [];
    snap.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return res.status(200).json({ logs });
  } catch (err) {
    console.error('Lỗi khi lấy audit logs:', err);
    return res.status(500).json({ error: 'Không thể tải nhật ký hoạt động.' });
  }
};
