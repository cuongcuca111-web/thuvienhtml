// api/admin/ai.js
// Gộp toàn bộ API quản trị AI: save-key, delete-key, settings, usage, test, models
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');
const { encryptKey, decryptKey, maskApiKey } = require('../../lib/crypto');
const { DEFAULT_MODELS } = require('../../lib/call-ai');

const FALLBACK_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Siêu nhanh, thế hệ mới)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Nhanh & Rẻ - Khuyên dùng)' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B (Siêu nhẹ)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Cực mạnh, thế hệ mới)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Mạnh mẽ, phân tích sâu)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Thế hệ mới)' }
  ],
  claude: [
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Rất nhanh & Tiết kiệm)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Thông minh & Chuẩn xác)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Tư duy phức tạp)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Nhanh & Rẻ - Khuyên dùng)' },
    { id: 'gpt-4o', name: 'GPT-4o (Đa phương thức mạnh nhất)' },
    { id: 'o3-mini', name: 'OpenAI o3-mini (Lý luận nhanh)' },
    { id: 'o1-mini', name: 'OpenAI o1-mini (Lý luận nhẹ)' },
    { id: 'o1', name: 'OpenAI o1 (Lý luận chuyên sâu)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cũ)' }
  ]
};

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị AI bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. ACTION: SAVE-KEY
  if (action === 'save-key') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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

      await db.doc(`admin_secrets/${provider}`).set({
        ...encrypted,
        provider,
        updatedAt: nowIso,
        updatedBy: uid
      });

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
  }

  // 2. ACTION: DELETE-KEY
  if (action === 'delete-key') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { provider } = req.body || {};
    const validProviders = ['gemini', 'claude', 'openai'];
    if (!provider || !validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
    }

    try {
      await db.doc(`admin_secrets/${provider}`).delete();
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

      await recordAuditLog(db, {
        uid,
        action: 'ai_key_delete',
        details: `Xóa API key của nhà cung cấp ${provider.toUpperCase()}`
      });

      return res.status(200).json({ success: true, provider });
    } catch (err) {
      console.error('Lỗi xóa API key:', err.message);
      return res.status(500).json({ error: 'Không thể xóa khóa: ' + err.message });
    }
  }

  // 3. ACTION: SETTINGS (GET & POST)
  if (action === 'settings') {
    if (req.method === 'GET') {
      try {
        const snap = await db.doc('config/ai_settings').get();
        return res.status(200).json({ settings: snap.exists ? snap.data() : {} });
      } catch (err) {
        return res.status(500).json({ error: 'Không thể tải cài đặt: ' + err.message });
      }
    }

    if (req.method === 'POST') {
      const { priority, models, dailyRequestCap, featureToggles } = req.body || {};
      try {
        const sanitizedPriority = Array.isArray(priority) && priority.length > 0
          ? priority.filter(p => ['gemini', 'claude', 'openai'].includes(p))
          : ['gemini', 'openai', 'claude'];

        const sanitizedCap = Math.max(0, parseInt(dailyRequestCap, 10) || 0);

        const updateData = {
          priority: sanitizedPriority,
          models: models && typeof models === 'object' ? models : {},
          dailyRequestCap: sanitizedCap,
          featureToggles: featureToggles && typeof featureToggles === 'object' ? featureToggles : {
            smartSchedule: true,
            flashcards: true
          },
          updatedAt: new Date().toISOString(),
          updatedBy: uid
        };

        await db.doc('config/ai_settings').set(updateData, { merge: true });

        await recordAuditLog(db, {
          uid,
          action: 'ai_settings_update',
          newVal: updateData,
          details: `Cập nhật cấu hình AI (Ưu tiên: ${sanitizedPriority.join(' → ')}, Trần ngày: ${sanitizedCap || 'Vô hạn'})`
        });

        return res.status(200).json({ success: true, settings: updateData });
      } catch (err) {
        console.error('Lỗi lưu cài đặt AI:', err.message);
        return res.status(500).json({ error: 'Không thể lưu cài đặt: ' + err.message });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 4. ACTION: USAGE (GET)
  if (action === 'usage') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
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
  }

  // 5. ACTION: TEST (POST)
  if (action === 'test') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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
      let model = (settings.models && settings.models[provider] && settings.models[provider].fast) ||
                  (DEFAULT_MODELS[provider] && DEFAULT_MODELS[provider].fast);

      let testResponse = '';
      let success = false;
      let errorMsg = '';

      if (provider === 'gemini') {
        const testModels = [
          'gemini-1.5-flash',
          'gemini-2.0-flash',
          'gemini-2.5-flash',
          'gemini-1.5-flash-8b',
          'gemini-1.5-pro'
        ];

        let geminiOk = false;
        let testLog = [];

        for (const m of testModels) {
          try {
            const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m) + ':generateContent?key=' + encodeURIComponent(apiKey);
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Trả lời: OK' }] }],
                generationConfig: { maxOutputTokens: 10 }
              })
            });

            if (resp.ok) {
              const d = await resp.json();
              testResponse = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text && d.candidates[0].content.parts[0].text.trim()) || 'OK';
              success = true;
              geminiOk = true;
              model = m;
              break;
            } else {
              const d = await resp.json().catch(() => ({}));
              const msg = (d && d.error && d.error.message) || ('HTTP ' + resp.status);
              testLog.push(m + ': ' + msg);
            }
          } catch (netErr) {
            testLog.push(m + ': ' + netErr.message);
          }
        }

        if (!geminiOk) {
          errorMsg = 'Chi tiết: ' + testLog.join(' | ');
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

      return res.status(200).json({
        success,
        message: success ? `Kết nối thành công tới ${provider.toUpperCase()}! Model ${model} phản hồi: "${testResponse}"` : `Kiểm tra thất bại: ${errorMsg}`,
        testedAt: nowIso
      });
    } catch (err) {
      console.error('Lỗi kiểm tra AI API:', err.message);
      return res.status(500).json({ success: false, message: 'Không thể kết nối tới máy chủ nhà cung cấp: ' + err.message });
    }
  }

  // 6. ACTION: MODELS (GET)
  if (action === 'models') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const provider = String(req.query.provider || '').toLowerCase();
    const validProviders = ['gemini', 'claude', 'openai'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Nhà cung cấp không hợp lệ.' });
    }

    try {
      let fetchedModels = [];
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
          console.warn(`Không thể lấy danh sách model trực tiếp từ ${provider}, dùng fallback:`, fetchErr.message);
        }
      }

      if (fetchedModels.length === 0) {
        fetchedModels = FALLBACK_MODELS[provider] || [];
      }

      return res.status(200).json({ provider, models: fetchedModels });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi tải danh sách model: ' + err.message });
    }
  }

  return res.status(404).json({ error: `Không tìm thấy hành động AI: ${action}` });
};
