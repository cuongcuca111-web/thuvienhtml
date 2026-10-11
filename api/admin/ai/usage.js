// api/admin/ai/usage.js
const { verifyAdmin } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;

  try {
    const settingsSnap = await db.doc('config/ai_settings').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const dailyCap = parseInt(settings.dailyRequestCap, 10) || 0;

    const snap = await db.collection('ai_usage').orderBy('date', 'desc').limit(14).get();

    const dailyUsage = [];
    let grandRequests = 0;
    let grandTokens = 0;
    let todayRequests = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    snap.forEach(doc => {
      const d = doc.data();
      const reqCount = d.totalRequests || 0;
      const tokCount = d.totalTokens || 0;
      grandRequests += reqCount;
      grandTokens += tokCount;

      if (d.date === todayStr) {
        todayRequests = reqCount;
      }

      dailyUsage.push({
        date: d.date,
        totalRequests: reqCount,
        totalTokens: tokCount,
        providers: d.providers || {}
      });
    });

    const isCapped = dailyCap > 0 && todayRequests >= dailyCap;

    return res.status(200).json({
      dailyUsage,
      grandRequests,
      grandTokens,
      todayRequests,
      dailyCap,
      isCapped
    });
  } catch (err) {
    console.error('Lỗi tải thống kê ai_usage:', err.message);
    return res.status(500).json({ error: 'Không thể tải thống kê chi phí AI.' });
  }
};
