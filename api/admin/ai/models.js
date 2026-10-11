// api/admin/ai/models.js
const { verifyAdmin } = require('../_auth');
const { decryptKey } = require('../../ai/_crypto');

const FALLBACK_MODELS = {
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Nhanh & Rẻ - Khuyên dùng)' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B (Siêu nhẹ)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Mạnh mẽ, phân tích sâu)' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Thử nghiệm mới)' }
  ],
  claude: [
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Rất nhanh & Tiết kiệm)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Thông minh & Chuẩn xác)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Tư duy phức tạp)' }
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Nhanh & Rẻ - Khuyên dùng)' },
    { id: 'gpt-4o', name: 'GPT-4o (Đa phương thức mạnh nhất)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cũ)' }
  ]
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;
  const provider = String(req.query.provider || '').toLowerCase();

  const validProviders = ['gemini', 'claude', 'openai'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
  }

  try {
    let fetchedModels = [];

    // Thử truy vấn API của nhà cung cấp nếu có key đã lưu
    const secDoc = await db.doc(`admin_secrets/${provider}`).get();
    if (secDoc.exists) {
      try {
        const apiKey = decryptKey(secDoc.data());

        if (provider === 'gemini') {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
          if (resp.ok) {
            const d = await resp.json();
            const list = (d.models || [])
              .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
              .map(m => ({
                id: m.name.replace('models/', ''),
                name: `${m.displayName || m.name} (${m.name.replace('models/', '')})`
              }));
            if (list.length > 0) fetchedModels = list;
          }
        } else if (provider === 'openai') {
          const resp = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (resp.ok) {
            const d = await resp.json();
            const list = (d.data || [])
              .filter(m => m.id.startsWith('gpt-'))
              .map(m => ({ id: m.id, name: m.id }))
              .sort((a, b) => a.id.localeCompare(b.id));
            if (list.length > 0) fetchedModels = list;
          }
        }
      } catch (fetchErr) {
        console.warn(`Không thể lấy danh sách model trực tiếp từ ${provider}, dùng danh sách dự phòng:`, fetchErr.message);
      }
    }

    if (fetchedModels.length === 0) {
      fetchedModels = FALLBACK_MODELS[provider] || [];
    }

    return res.status(200).json({
      provider,
      models: fetchedModels
    });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi tải danh sách model: ' + err.message });
  }
};
