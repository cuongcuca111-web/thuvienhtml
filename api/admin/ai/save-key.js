// api/admin/ai/save-key.js
const { verifyAdmin, recordAuditLog } = require('../_auth');
const { encryptKey, maskApiKey } = require('../../ai/_crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { provider, apiKey } = req.body || {};

  const validProviders = ['gemini', 'claude', 'openai'];
  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ. Chọn gemini, claude hoặc openai.' });
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return res.status(400).json({ error: 'Khóa API không hợp lệ hoặc quá ngắn.' });
  }

  try {
    const trimmedKey = apiKey.trim();
    const encrypted = encryptKey(trimmedKey);
    const maskedKey = maskApiKey(trimmedKey);
    const nowIso = new Date().toISOString();

    // 1. Lưu bản mã hóa AES-256-GCM vào admin_secrets/{provider}
    await db.doc(`admin_secrets/${provider}`).set({
      ...encrypted,
      provider,
      updatedAt: nowIso,
      updatedBy: uid
    });

    // 2. Lưu trạng thái công khai và bản che vào config/ai_settings
    await db.doc('config/ai_settings').set({
      providers: {
        [provider]: {
          isConfigured: true,
          maskedKey: maskedKey,
          status: 'saved',
          lastTested: null,
          updatedAt: nowIso
        }
      }
    }, { merge: true });

    // 3. Ghi audit log (tuyệt đối không ghi key thực tế)
    await recordAuditLog(db, {
      uid,
      action: 'ai_key_save',
      newVal: { provider, maskedKey },
      details: `Lưu API key nhà cung cấp ${provider.toUpperCase()} (${maskedKey})`
    });

    return res.status(200).json({
      success: true,
      provider,
      maskedKey,
      updatedAt: nowIso
    });
  } catch (err) {
    console.error('Lỗi lưu API key:', err.message);
    return res.status(500).json({ error: 'Không thể lưu khóa: ' + err.message });
  }
};
