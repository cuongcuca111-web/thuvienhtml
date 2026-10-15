// lib/call-ai.js
// Lớp trừu tượng gọi AI đa nhà cung cấp (Gemini, Claude, OpenAI) phía máy chủ
const { initAdmin } = require('./admin-auth');
const { decryptKey } = require('./crypto');

// Cấu hình timeout mặc định 12 giây cho mỗi request AI
const TIMEOUT_MS = 12000;

// Model dự phòng mặc định khi chưa có cấu hình: ưu tiên các model tốc độ cao thế hệ mới
const DEFAULT_MODELS = {
  gemini: { fast: 'gemini-2.0-flash', strong: 'gemini-2.5-flash' },
  claude: { fast: 'claude-3-5-haiku-20241022', strong: 'claude-3-5-sonnet-20241022' },
  openai: { fast: 'gpt-4o-mini', strong: 'gpt-4o' }
};

// Bộ nhớ đệm In-Memory cho Cài đặt & Khóa bí mật (120 giây) để giảm 4-5 lượt truy vấn DB mỗi lần gọi
let _cachedAiSettings = null;
let _cachedAiSettingsTime = 0;

function invalidateAiSettingsCache() {
  _cachedAiSettings = null;
  _cachedAiSettingsTime = 0;
}

/**
 * Trợ giúp gửi request với Timeout an toàn
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Yêu cầu AI vượt quá thời gian chờ (30 giây)');
    }
    throw err;
  }
}

/**
 * Đọc cấu hình cài đặt AI và danh sách key đã mã hóa từ Firestore
 */
async function getAISettingsAndSecrets(db) {
  const now = Date.now();
  if (_cachedAiSettings && (now - _cachedAiSettingsTime < 120000)) {
    return _cachedAiSettings;
  }

  const [settingsSnap, secGemini, secClaude, secOpenai] = await Promise.all([
    db.doc('config/ai_settings').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/gemini').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/claude').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/openai').get().catch(() => ({ exists: false }))
  ]);

  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const priority = Array.isArray(settings.priority) && settings.priority.length > 0
    ? settings.priority
    : ['gemini', 'openai', 'claude'];

  const secrets = {
    gemini: secGemini.exists ? secGemini.data() : null,
    claude: secClaude.exists ? secClaude.data() : null,
    openai: secOpenai.exists ? secOpenai.data() : null
  };

  _cachedAiSettings = { settings, priority, secrets };
  _cachedAiSettingsTime = now;
  return _cachedAiSettings;
}

/**
 * Kiểm tra trần chi tiêu / giới hạn hàng ngày
 */
async function checkDailySpendingCap(db, settings) {
  const dailyCap = parseInt(settings.dailyRequestCap, 10) || 0;
  if (dailyCap <= 0) return true; // Không giới hạn

  const todayStr = new Date().toISOString().slice(0, 10);
  const usageDoc = await db.doc(`ai_usage/${todayStr}`).get();
  if (usageDoc.exists) {
    const data = usageDoc.data();
    const todayRequests = data.totalRequests || 0;
    if (todayRequests >= dailyCap) {
      throw new Error(`Đã chạm trần chi tiêu AI trong ngày (${todayRequests}/${dailyCap} lượt). Hệ thống tạm ngưng để kiểm soát chi phí.`);
    }
  }
  return true;
}

/**
 * Ghi nhận số lượt và token sử dụng vào ai_usage/{YYYY-MM-DD}
 */
async function recordUsageMetrics(db, provider, model, usage = {}) {
  try {
    const admin = initAdmin();
    const todayStr = new Date().toISOString().slice(0, 10);
    const usageRef = db.doc(`ai_usage/${todayStr}`);

    const promptTokens = usage.promptTokens || 0;
    const completionTokens = usage.completionTokens || 0;
    const totalTokens = usage.totalTokens || (promptTokens + completionTokens);

    await usageRef.set({
      date: todayStr,
      totalRequests: admin.firestore.FieldValue.increment(1),
      totalTokens: admin.firestore.FieldValue.increment(totalTokens),
      [`providers.${provider}.requests`]: admin.firestore.FieldValue.increment(1),
      [`providers.${provider}.tokens`]: admin.firestore.FieldValue.increment(totalTokens),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Không thể ghi nhận ai_usage:', err.message);
  }
}

/**
 * ADAPTER 1: Google Gemini API
 */
async function callGeminiAdapter({ apiKey, model, system, prompt, schema, maxTokens }) {
  const requested = model ? [model] : [];
  const modelsToTry = [
    ...requested,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ].filter(Boolean);
  const uniqueModels = [...new Set(modelsToTry)];

  let lastErr = null;

  for (const m of uniqueModels) {
    // Luôn sử dụng v1beta vì hỗ trợ 100% các tính năng hiện đại (systemInstruction, responseMimeType, responseSchema)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const bodyPayload = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens || 600,
        temperature: 0.2
      }
    };

    if (system) {
      bodyPayload.systemInstruction = {
        parts: [{ text: system }]
      };
    }

    if (schema) {
      bodyPayload.generationConfig.responseMimeType = 'application/json';
      if (typeof schema === 'object') {
        bodyPayload.generationConfig.responseSchema = schema;
      }
    }

    // CHỈ áp dụng thinkingConfig cho các model hybrid reasoning (Gemini 2.5 hoặc model có chữ 'thinking')
    // TUYỆT ĐỐI không gửi cho gemini-2.0-flash hoặc gemini-1.5 vì sẽ gây lỗi 400 Bad Request
    if (m.includes('2.5') || m.includes('thinking')) {
      bodyPayload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
      let res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      }, 10000); // 10s timeout cho mỗi model

      // Nếu gửi kèm responseSchema bị lỗi 400 (do cú pháp schema OpenAPI), tự động thử lại mà chỉ giữ responseMimeType
      if (res.status === 400 && bodyPayload.generationConfig && bodyPayload.generationConfig.responseSchema) {
        console.warn(`[Gemini Adapter] Model ${m} từ chối responseSchema (400). Đang thử lại với responseMimeType...`);
        delete bodyPayload.generationConfig.responseSchema;
        res = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        }, 10000);
      }

      if (!res.ok) {
        const errText = await res.text();
        let parsedMsg = 'Gemini HTTP ' + res.status;
        try {
          const errObj = JSON.parse(errText);
          parsedMsg = (errObj.error && errObj.error.message) || parsedMsg;
        } catch (e) {}
        console.warn(`[Gemini Adapter] Model ${m} thất bại [HTTP ${res.status}]: ${parsedMsg}`);
        const err = new Error(parsedMsg);
        err.status = res.status;
        lastErr = err;

        // Nếu API key sai, dừng ngay lập tức
        if (res.status === 400 && /API_KEY_INVALID|key not valid/i.test(parsedMsg)) {
          throw err;
        }

        // Với các lỗi khác (404, 429, 500, lỗi format): tiếp tục thử model tiếp theo
        continue;
      }

      const data = await res.json();
      const textOut = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
      const usageMeta = data.usageMetadata || {};

      return {
        rawText: textOut,
        usage: {
          promptTokens: usageMeta.promptTokenCount || 0,
          completionTokens: usageMeta.candidatesTokenCount || 0,
          totalTokens: usageMeta.totalTokenCount || 0
        }
      };
    } catch (e) {
      lastErr = e;
      if (e.status === 400 && /API_KEY_INVALID|key not valid/i.test(e.message || '')) {
        throw e;
      }
      continue;
    }
  }

  throw lastErr || new Error('Không thể kết nối với bất kỳ model Gemini nào.');
}

/**
 * ADAPTER 2: Anthropic Claude Messages API
 */
async function callClaudeAdapter({ apiKey, model, system, prompt, maxTokens }) {
  const endpoint = 'https://api.anthropic.com/v1/messages';

  const bodyPayload = {
    model: model,
    max_tokens: maxTokens || 600,
    messages: [{
      role: 'user',
      content: prompt
    }]
  };

  if (system) {
    bodyPayload.system = system;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    let parsedMsg = `Claude HTTP ${res.status}`;
    try {
      const errObj = JSON.parse(errText);
      parsedMsg = (errObj.error && errObj.error.message) || parsedMsg;
    } catch (e) {}
    const err = new Error(parsedMsg);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const textOut = (data.content && data.content[0] && data.content[0].text) || '';
  const usageMeta = data.usage || {};

  return {
    rawText: textOut,
    usage: {
      promptTokens: usageMeta.input_tokens || 0,
      completionTokens: usageMeta.output_tokens || 0,
      totalTokens: (usageMeta.input_tokens || 0) + (usageMeta.output_tokens || 0)
    }
  };
}

/**
 * ADAPTER 3: OpenAI Chat Completions API
 */
async function callOpenAIAdapter({ apiKey, model, system, prompt, schema, maxTokens }) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const bodyPayload = {
    model: model,
    messages,
    max_tokens: maxTokens || 600,
    temperature: 0.2
  };

  if (schema) {
    bodyPayload.response_format = { type: 'json_object' };
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errText = await res.text();
    let parsedMsg = `OpenAI HTTP ${res.status}`;
    try {
      const errObj = JSON.parse(errText);
      parsedMsg = (errObj.error && errObj.error.message) || parsedMsg;
    } catch (e) {}
    const err = new Error(parsedMsg);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const textOut = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const usageMeta = data.usage || {};

  return {
    rawText: textOut,
    usage: {
      promptTokens: usageMeta.prompt_tokens || 0,
      completionTokens: usageMeta.completion_tokens || 0,
      totalTokens: usageMeta.total_tokens || 0
    }
  };
}

/**
 * Tiện ích trích xuất và phân tích JSON từ chuỗi kết quả của AI
 */
function extractAndParseJSON(rawText) {
  if (!rawText) return { text: '' };

  const trimmed = rawText.trim();
  // 1. Parse thuần JSON
  try {
    return JSON.parse(trimmed);
  } catch (e) {}

  // 2. Trường hợp AI bọc trong khối ```json ... ```
  const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    try {
      return JSON.parse(markdownMatch[1].trim());
    } catch (e) {}
  }

  // 3. Tìm khối { ... } lớn nhất
  const startBrace = trimmed.indexOf('{');
  const endBrace = trimmed.lastIndexOf('}');
  if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
    try {
      return JSON.parse(trimmed.slice(startBrace, endBrace + 1));
    } catch (e) {}
  }

  // 4. Tìm khối [ ... ] lớn nhất
  const startBracket = trimmed.indexOf('[');
  const endBracket = trimmed.lastIndexOf(']');
  if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
    try {
      return JSON.parse(trimmed.slice(startBracket, endBracket + 1));
    } catch (e) {}
  }

  // 5. Thử dùng Regex bóc tách các trường chính nếu JSON bị cắt cụt giữa chừng
  const fieldRegex = /"(?:text|explanation|summary|content)"\s*:\s*"((?:\\.|[^"\\])*)("|$)/i;
  const match = trimmed.match(fieldRegex);
  if (match && match[1]) {
    try {
      const unescaped = JSON.parse(`"${match[1]}"`);
      if (unescaped.trim().length >= 5) {
        return {
          mode: 'explain',
          text: unescaped.trim(),
          terms: [],
          examples: []
        };
      }
    } catch (_) {
      const clean = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (clean.trim().length >= 5) {
        return {
          mode: 'explain',
          text: clean.trim(),
          terms: [],
          examples: []
        };
      }
    }
  }

  // 6. Dọn sạch các ký tự {, }, `, quotes thừa ở đầu/cuối
  const cleanTrimmed = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^[\s{}"`]+/, '')
    .replace(/[\s{}"`]+$/, '')
    .trim();

  // TUYỆT ĐỐI KHÔNG trả về "{", "{}" hoặc nội dung cụt ngắn dưới 5 ký tự
  if (!cleanTrimmed || cleanTrimmed === '{' || cleanTrimmed === '{}' || cleanTrimmed.length < 5) {
    return {
      mode: 'explain',
      text: '',
      terms: [],
      examples: [],
      truncated: true
    };
  }

  // 7. Nếu AI trả về văn bản thường (plain text giải thích hợp lệ)
  return {
    mode: 'explain',
    text: cleanTrimmed,
    terms: [],
    examples: []
  };
}
/**
 * HÀM CHÍNH callAI DÙNG CHUNG TOÀN HỆ THỐNG
 * Tự động chuyển nhà cung cấp dự phòng khi lỗi (Failover)
 */
async function callAI({
  system = '',
  prompt = '',
  schema = true,
  maxTokens = 2048,
  preferredProvider = null,
  modelType = 'fast', // 'fast' | 'strong'
  taskType = null     // bí danh nếu gọi từ explain.js
}) {
  const actualModelType = taskType || modelType || 'fast';
  const app = initAdmin();
  const db = app.firestore();

  const { settings, priority, secrets } = await getAISettingsAndSecrets(db);
  await checkDailySpendingCap(db, settings);

  // Tạo chuỗi ưu tiên nhà cung cấp
  const activeProviders = [];
  if (preferredProvider && secrets[preferredProvider]) {
    activeProviders.push(preferredProvider);
  }
  for (const p of priority) {
    if (!activeProviders.includes(p) && secrets[p]) {
      activeProviders.push(p);
    }
  }

  if (activeProviders.length === 0) {
    throw new Error('Chưa có API key nào được cấu hình trong mục Quản trị. Vui lòng liên hệ quản trị viên.');
  }

  let lastError = null;

  for (const prov of activeProviders) {
    const secData = secrets[prov];
    if (!secData || !secData.cipherText) continue;

    let apiKey = '';
    try {
      apiKey = decryptKey(secData);
    } catch (decErr) {
      console.error(`Lỗi giải mã key của ${prov}:`, decErr.message);
      continue;
    }

    // Chọn model cấu hình hoặc mặc định
    const configuredModel = (settings.models && settings.models[prov] && settings.models[prov][actualModelType]) ||
                            (DEFAULT_MODELS[prov] && DEFAULT_MODELS[prov][actualModelType]);

    // Thử gọi với tối đa 1 lần thử lại nếu lỗi mạng / 429 tạm thời
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let result = null;

        if (prov === 'gemini') {
          result = await callGeminiAdapter({
            apiKey,
            model: configuredModel,
            system,
            prompt,
            schema,
            maxTokens
          });
        } else if (prov === 'claude') {
          const sysPrompt = schema ? (system + '\nLƯU Ý: Chỉ trả về duy nhất chuỗi JSON hợp lệ, không thêm bất kỳ văn bản giải thích nào trước hoặc sau.') : system;
          result = await callClaudeAdapter({
            apiKey,
            model: configuredModel,
            system: sysPrompt,
            prompt,
            maxTokens
          });
        } else if (prov === 'openai') {
          result = await callOpenAIAdapter({
            apiKey,
            model: configuredModel,
            system,
            prompt,
            schema,
            maxTokens
          });
        }

        if (result && result.rawText) {
          recordUsageMetrics(db, prov, configuredModel, result.usage).catch(() => {});

          const finalData = schema ? extractAndParseJSON(result.rawText) : result.rawText;
          return {
            success: true,
            provider: prov,
            model: configuredModel,
            data: finalData,
            usage: result.usage
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`Lỗi gọi AI (${prov}, lần ${attempt + 1}):`, err.message);

        // Nếu lỗi 5xx và là lần thử đầu thì chờ 800ms rồi thử lại; còn nếu 429 (hết quota) thì failover ngay sang nhà cung cấp dự phòng
        if (err.status >= 500 && err.status < 600 && attempt === 0) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        break; // Chuyển sang nhà cung cấp dự phòng tiếp theo
      }
    }
  }

  throw new Error(`Tất cả nhà cung cấp AI đều không phản hồi: ${lastError ? lastError.message : 'Không rõ nguyên nhân'}`);
}

module.exports = {
  callAI,
  DEFAULT_MODELS,
  getAISettingsAndSecrets,
  invalidateAiSettingsCache
};
