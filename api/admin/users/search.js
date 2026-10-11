const { verifyAdmin } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { admin, db } = ctx;
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({ error: 'Vui lòng nhập Email hoặc UID cần tìm' });
  }

  try {
    let userRecord = null;
    if (q.includes('@')) {
      try {
        userRecord = await admin.auth().getUserByEmail(q);
      } catch (e) {
        // Có thể người dùng tìm theo UID dù có dấu @ hoặc không thấy
      }
    }
    if (!userRecord) {
      try {
        userRecord = await admin.auth().getUser(q);
      } catch (e) {}
    }

    if (!userRecord) {
      return res.status(200).json({ users: [] });
    }

    // Đọc thông tin cài đặt / mức dùng từ Firestore
    let tier = (userRecord.customClaims && userRecord.customClaims.tier) || 'free';
    let expiresAt = (userRecord.customClaims && userRecord.customClaims.tierExpiresAt) || null;

    let lessonCount = 0;
    let sectionCount = 0;

    try {
      const userSettingsRef = db.doc(`artifacts/thuvienhtml/users/${userRecord.uid}/settings/config`);
      const settingsSnap = await userSettingsRef.get();
      if (settingsSnap.exists) {
        const sData = settingsSnap.data();
        if (sData.tier) tier = sData.tier;
        if (sData.tierExpiresAt) expiresAt = sData.tierExpiresAt;
      }

      // Đếm số bài học và mục
      const lessonsSnap = await db.collection(`artifacts/thuvienhtml/users/${userRecord.uid}/lessons`).select().get();
      lessonCount = lessonsSnap.size;

      const catsSnap = await db.collection(`artifacts/thuvienhtml/users/${userRecord.uid}/categories`).select().get();
      sectionCount = catsSnap.size;
    } catch (e) {
      // Bỏ qua lỗi đếm số lượng nếu chưa có dữ liệu
    }

    const userData = {
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || '',
      disabled: userRecord.disabled,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      customClaims: userRecord.customClaims || {},
      tier,
      expiresAt,
      usage: {
        lessons: lessonCount,
        sections: sectionCount
      }
    };

    return res.status(200).json({ users: [userData] });
  } catch (err) {
    console.error('Lỗi tìm kiếm người dùng:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tìm kiếm người dùng.' });
  }
};
