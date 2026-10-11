// api/admin/ai/test.js
const { verifyAdmin } = require('../_auth');
const { decryptKey } = require('../../ai/_crypto');
const { DEFAULT_MODELS } = require('../../ai/_callAI');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db } = ctx;
  const { provider } = req.body || {};

  const validProviders = ['gemini', 'claude', 'openai'];
  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
  }

  try {
    const secDoc = await db.doc(`admin_secrets/${provider}`).get();
    if (!secDoc.exists) {
      return res.status(400).json({ error: 'Chưa có API key cho nhà cung cấp này.' });
    }

    const apiKey = decryptKey(secDoc.data());
    const settingsSnap = await db.doc('config/ai_settings').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const model = (settings.models && settings.models[provider] && settings.models[provider].fast) ||
                  (DEFAULT_MODELS[provider] && DEFAULT_MODELS[provider].fast);

    let testResponse = '';
    let success = false;
    let errorMsg = '';

    // Gửi yêu cầu nhỏ nhất để kiểm tra key
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Trả lời: OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
        errorMsg = 'Khóa API không hợp lệ hoặc không có quyền truy cập.';
      } else if (resp.status === 429) {
        errorMsg = 'Hết hạn mức yêu cầu hoặc bị giới hạn tần suất (Quota Exceeded / Rate Limit).';
      } else if (!resp.ok) {
        errorMsg = `Lỗi từ Gemini (HTTP ${resp.status})`;
      } else {
        const d = await resp.json();
        testResponse = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text && d.candidates[0].content.parts[0].text.trim()) || 'OK';
        success = true;
      }
    } else if (provider === 'claude') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Trả lời: OK' }]
        })
      });

      if (resp.status === 401) {
        errorMsg = 'Khóa API Claude không chính xác (x-api-key invalid).';
      } else if (resp.status === 429) {
        errorMsg = 'Hết hạn mức tài khoản Anthropic hoặc bị giới hạn tốc độ.';
      } else if (!resp.ok) {
        errorMsg = `Lỗi từ Anthropic (HTTP ${resp.status})`;
      } else {
        const d = await resp.json();
        testResponse = (d.content && d.content[0] && d.content[0].text && d.content[0].text.trim()) || 'OK';
        success = true;
      }
    } else if (provider === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Trả lời: OK' }],
          max_tokens: 10
        })
      });

      if (resp.status === 401) {
        errorMsg = 'Khóa API OpenAI không chính xác (Incorrect API key).';
      } else if (resp.status === 429) {
        errorMsg = 'Hết hạn mức tín dụng OpenAI (You exceeded your current quota).';
      } else if (!resp.ok) {
        errorMsg = `Lỗi từ OpenAI (HTTP ${resp.status})`;
      } else {
        const d = await resp.json();
        testResponse = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content && d.choices[0].message.content.trim()) || 'OK';
        success = true;
      }
    }

    const nowIso = new Date().toISOString();
    await db.doc('config/ai_settings').set({
      providers: {
        [provider]: {
          status: success ? 'ready' : 'error',
          lastTested: nowIso,
          testMessage: success ? `Thành công (Model: ${model})` : errorMsg
        }
      }
    }, { merge: true });

    if (success) {
      return res.status(200).json({
        success: true,
        message: `Kết nối thành công tới ${provider.toUpperCase()}! Model ${model} phản hồi: "${testResponse}"`,
        testedAt: nowIso
      });
    } else {
      return res.status(200).json({
        success: false,
        message: `Kiểm tra thất bại: ${errorMsg}`,
        testedAt: nowIso
      });
    }
  } catch (err) {
    console.error('Lỗi kiểm tra AI API:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối tới máy chủ nhà cung cấp: ' + err.message
    });
  }
};
