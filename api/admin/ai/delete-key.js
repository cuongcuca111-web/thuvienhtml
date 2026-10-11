// api/admin/ai/delete-key.js
const { verifyAdmin, recordAuditLog } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { provider } = req.body || {};

  const validProviders = ['gemini', 'claude', 'openai'];
  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
  }

  try {
    // 1. Xóa bí mật khỏi admin_secrets/{provider}
    await db.doc(`admin_secrets/${provider}`).delete();

    // 2. Cập nhật config/ai_settings
    await db.doc('config/ai_settings').set({
      providers: {
        [provider]: {
          isConfigured: false,
          maskedKey: '',
          status: 'not_configured',
          lastTested: null,
          updatedAt: new Date().toISOString()
        }
      }
    }, { merge: true });

    // 3. Ghi audit log
    await recordAuditLog(db, {
      uid,
      action: 'ai_key_delete',
      details: `Xóa API key của nhà cung cấp ${provider.toUpperCase()}`
    });

    return res.status(200).json({
      success: true,
      provider
    });
  } catch (err) {
    console.error('Lỗi xóa API key:', err.message);
    return res.status(500).json({ error: 'Không thể xóa khóa: ' + err.message });
  }
};
