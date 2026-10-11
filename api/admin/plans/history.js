const { verifyAdmin } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;

  try {
    const historyRef = db.doc('config/plans').collection('history');
    const snap = await historyRef.orderBy('timestamp', 'desc').limit(10).get();

    const history = [];
    snap.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return res.status(200).json({ history });
  } catch (err) {
    console.error('Lỗi khi lấy lịch sử thay đổi plans:', err);
    return res.status(500).json({ error: 'Không thể tải lịch sử thay đổi.' });
  }
};
