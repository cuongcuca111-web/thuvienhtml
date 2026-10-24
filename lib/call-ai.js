// lib/call-ai.js
// Quản lý và gọi AI Google Gemini thế hệ mới với Kho dự trữ đa khóa (Key Pool) & Tự động Failover
const { initAdmin } = require('./admin-auth');
const { decryptKey } = require('./crypto');

// Cấu hình timeout mặc định 12 giây cho mỗi request AI
const TIMEOUT_MS = 12000;

// Model dự phòng mặc định khi chưa có cấu hình: ưu tiên các model tốc độ cao thế hệ mới của Google Gemini
const DEFAULT_MODELS = {
  gemini: { fast: 'gemini-3.8-flash', strong: 'gemini-3.8-pro' }
};

// Bộ nhớ đệm In-Memory cho Cài đặt & Kho Khóa bí mật (60 giây) để giảm 4-5 lượt truy vấn DB mỗi lần gọi
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
      throw new Error('Yêu cầu AI vượt quá thời gian chờ (12 giây)');
    }
    throw err;
  }
}

/**
 * Đọc cấu hình cài đặt AI và danh sách kho khóa Gemini đã mã hóa từ Firestore
 */
async function getAISettingsAndSecrets(db) {
  const now = Date.now();
  if (_cachedAiSettings && (now - _cachedAiSettingsTime < 60000)) {
    return _cachedAiSettings;
  }

  const [settingsSnap, secGeminiPool, secGeminiLegacy] = await Promise.all([
    db.doc('config/ai_settings').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/gemini_pool').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/gemini').get().catch(() => ({ exists: false }))
  ]);

  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  let poolKeys = [];

  if (secGeminiPool.exists && Array.isArray(secGeminiPool.data().keys) && secGeminiPool.data().keys.length > 0) {
    poolKeys = secGeminiPool.data().keys;
  } else if (secGeminiLegacy.exists && secGeminiLegacy.data().cipherText) {
    // Tự động chuyển đổi khóa đơn lẻ cũ thành Khóa chính trong pool
    const legacy = secGeminiLegacy.data();
    poolKeys = [{
      id: 'gemini_key_primary',
      label: 'Khóa chính (Google AI Studio)',
      cipherText: legacy.cipherText,
      iv: legacy.iv,
      authTag: legacy.authTag,
      maskedKey: legacy.maskedKey || '••••',
      status: 'active',
      isPrimary: true,
      order: 1,
      createdAt: legacy.updatedAt || new Date().toISOString()
    }];
  }

  _cachedAiSettings = { settings, poolKeys };
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

    const incReq = admin.firestore.FieldValue.increment(1);
    const incPrompt = admin.firestore.FieldValue.increment(usage.promptTokens || 0);
    const incComp = admin.firestore.FieldValue.increment(usage.completionTokens || 0);
    const incTotal = admin.firestore.FieldValue.increment(usage.totalTokens || 0);

    await usageRef.set({
      date: todayStr,
      totalRequests: incReq,
      totalTokens: incTotal,
      [`requestsByProvider.${provider}`]: incReq,
      [`tokensByProvider.${provider}`]: incTotal,
      [`requestsByModel.${model.replace(/\./g, '_')}`]: incReq,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Lỗi ghi nhận usage metrics:', err.message);
  }
}

/**
 * Đánh dấu khóa là "hết hạn" (expired) trong Firestore khi gặp lỗi quota hoặc 400/403
 */
async function markKeyExpired(db, poolKeys, expiredKeyId, reason = '') {
  try {
    const updatedPool = poolKeys.map(k => {
      if (k.id === expiredKeyId) {
        return {
          ...k,
          status: 'expired',
          isPrimary: false,
          lastTested: new Date().toISOString(),
          testMessage: `Hết hạn / Lỗi quota: ${reason}`.slice(0, 300)
        };
      }
      return k;
    });

    const publicPool = updatedPool.map(k => ({
      id: k.id,
      label: k.label,
      maskedKey: k.maskedKey,
      status: k.status,
      isPrimary: k.isPrimary,
      order: k.order,
      lastTested: k.lastTested,
      testMessage: k.testMessage,
      createdAt: k.createdAt
    }));

    await Promise.all([
      db.doc('admin_secrets/gemini_pool').set({ keys: updatedPool, updatedAt: new Date().toISOString() }, { merge: true }),
      db.doc('config/ai_settings').set({ geminiKeyPool: publicPool }, { merge: true })
    ]);
    invalidateAiSettingsCache();
  } catch (err) {
    console.warn('Lỗi markKeyExpired:', err.message);
  }
}

/**
 * Thăng hạng một khóa dự phòng lên làm Khóa đang hoạt động (Đang hoạt động / Active)
 */
async function promoteKeyToActive(db, poolKeys, newActiveId) {
  try {
    let activeKey = null;
    const updatedPool = poolKeys.map(k => {
      if (k.id === newActiveId) {
        activeKey = k;
        return {
          ...k,
          status: 'active',
          isPrimary: true,
          lastTested: new Date().toISOString(),
          testMessage: 'Đang hoạt động bình thường'
        };
      }
      return {
        ...k,
        isPrimary: false,
        status: (k.status === 'active' ? 'standby' : k.status)
      };
    });

    const publicPool = updatedPool.map(k => ({
      id: k.id,
      label: k.label,
      maskedKey: k.maskedKey,
      status: k.status,
      isPrimary: k.isPrimary,
      order: k.order,
      lastTested: k.lastTested,
      testMessage: k.testMessage,
      createdAt: k.createdAt
    }));

    const promises = [
      db.doc('admin_secrets/gemini_pool').set({ keys: updatedPool, updatedAt: new Date().toISOString() }, { merge: true }),
      db.doc('config/ai_settings').set({
        geminiKeyPool: publicPool,
        providers: {
          gemini: {
            isConfigured: true,
            maskedKey: activeKey ? activeKey.maskedKey : '',
            status: 'ready',
            lastTested: new Date().toISOString()
          }
        }
      }, { merge: true })
    ];

    if (activeKey) {
      promises.push(db.doc('admin_secrets/gemini').set({
        cipherText: activeKey.cipherText,
        iv: activeKey.iv,
        authTag: activeKey.authTag,
        maskedKey: activeKey.maskedKey,
        provider: 'gemini',
        updatedAt: new Date().toISOString()
      }));
    }

    await Promise.all(promises);
    invalidateAiSettingsCache();
  } catch (err) {
    console.warn('Lỗi promoteKeyToActive:', err.message);
  }
}

async function callGeminiAdapter({ apiKey, model, system, prompt, schema, maxTokens }) {
  const requested = model ? [model] : [];
  const modelsToTry = [
    ...requested,
    'gemini-3.8-flash',
    'gemini-3.8-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
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

        // Nếu Google trả về gợi ý model mới do model cũ đã ngừng hỗ trợ cho user mới
        const deprecationMatch = parsedMsg.match(/(?:models\/|use\s+models\/)([a-zA-Z0-9.\-_]+)/i);
        if (deprecationMatch && deprecationMatch[1]) {
          const suggestedModel = deprecationMatch[1];
          if (!uniqueModels.includes(suggestedModel)) {
            uniqueModels.splice(uniqueModels.indexOf(m) + 1, 0, suggestedModel);
          }
        }

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
 * Tự động chuyển Khóa dự phòng khi Khóa chính hết hạn (Auto-Failover Key Pool)
 */
async function callAI({
  system = '',
  prompt = '',
  schema = true,
  maxTokens = 2048,
  preferredProvider = 'gemini',
  modelType = 'fast', // 'fast' | 'strong'
  taskType = null     // bí danh nếu gọi từ explain.js
}) {
  const actualModelType = taskType || modelType || 'fast';
  const app = initAdmin();
  const db = app.firestore();

  const { settings, poolKeys } = await getAISettingsAndSecrets(db);
  await checkDailySpendingCap(db, settings);

  if (!poolKeys || poolKeys.length === 0) {
    throw new Error('Chưa có API key Google Gemini nào được cấu hình trong mục Quản trị. Vui lòng thêm API key để sử dụng.');
  }

  // Sắp xếp danh sách key theo độ ưu tiên:
  // 1. Key đang hoạt động ('active') hoặc isPrimary lên đầu
  // 2. Key dự phòng sẵn sàng ('standby')
  // 3. Key sắp hết hạn ('expiring')
  // 4. Key đã hết hạn ('expired') thử cuối cùng nếu không còn key nào khác
  const sortedKeys = [...poolKeys].sort((a, b) => {
    const statusScore = (s) => (s === 'active' ? 0 : (s === 'standby' ? 1 : (s === 'expiring' ? 2 : 3)));
    const scoreA = statusScore(a.status);
    const scoreB = statusScore(b.status);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return (a.order || 99) - (b.order || 99);
  });

  const configuredModel = (settings.models && settings.models.gemini && settings.models.gemini[actualModelType]) ||
                          (DEFAULT_MODELS.gemini && DEFAULT_MODELS.gemini[actualModelType]) ||
                          'gemini-3.8-flash';

  let lastError = null;

  for (let keyIdx = 0; keyIdx < sortedKeys.length; keyIdx++) {
    const keyItem = sortedKeys[keyIdx];
    if (!keyItem.cipherText) continue;

    let apiKey = '';
    try {
      apiKey = decryptKey(keyItem);
    } catch (decErr) {
      console.error(`Lỗi giải mã key "${keyItem.label || keyItem.id}":`, decErr.message);
      continue;
    }

    try {
      const result = await callGeminiAdapter({
        apiKey,
        model: configuredModel,
        system,
        prompt,
        schema,
        maxTokens
      });

      if (result && result.rawText) {
        recordUsageMetrics(db, 'gemini', configuredModel, result.usage).catch(() => {});

        // Nếu key dự phòng được kích hoạt thành công (failover), thăng hạng thành active
        if (keyItem.status !== 'active') {
          console.info(`[Gemini Failover] Tự động kích hoạt khóa dự phòng "${keyItem.label || keyItem.maskedKey}" thành Đang hoạt động.`);
          promoteKeyToActive(db, poolKeys, keyItem.id).catch(() => {});
        }

        const finalData = schema ? extractAndParseJSON(result.rawText) : result.rawText;
        return {
          success: true,
          provider: 'gemini',
          model: configuredModel,
          data: finalData,
          usage: result.usage,
          keyLabel: keyItem.label || 'Google Gemini'
        };
      }
    } catch (err) {
      lastError = err;
      const isQuotaOrExpired = (
        (err.status === 400 && /API_KEY_INVALID|key not valid/i.test(err.message)) ||
        err.status === 403 ||
        err.status === 429 ||
        /quota|rate limit|resource has been exhausted|exhausted/i.test(err.message)
      );

      console.warn(`[Gemini API] Khóa "${keyItem.label || keyItem.maskedKey}" thất bại [HTTP ${err.status}]: ${err.message}`);

      if (isQuotaOrExpired) {
        // Tự động đánh dấu hết hạn cho khóa này
        markKeyExpired(db, poolKeys, keyItem.id, err.message).catch(() => {});
        console.info(`[Gemini Auto-Failover] Khóa "${keyItem.label || keyItem.maskedKey}" đã hết hạn/quota. Tự động chuyển sang khóa dự phòng tiếp theo...`);
        // Chuyển sang key dự phòng tiếp theo
        continue;
      }

      // Nếu lỗi 5xx của Google thì thử lại một lần ngắn
      if (err.status >= 500 && err.status < 600) {
        await new Promise(r => setTimeout(r, 600));
        try {
          const retryRes = await callGeminiAdapter({
            apiKey,
            model: configuredModel,
            system,
            prompt,
            schema,
            maxTokens
          });
          if (retryRes && retryRes.rawText) {
            recordUsageMetrics(db, 'gemini', configuredModel, retryRes.usage).catch(() => {});
            const finalData = schema ? extractAndParseJSON(retryRes.rawText) : retryRes.rawText;
            return {
              success: true,
              provider: 'gemini',
              model: configuredModel,
              data: finalData,
              usage: retryRes.usage,
              keyLabel: keyItem.label || 'Google Gemini'
            };
          }
        } catch (_) {}
      }

      // Tiếp tục thử khóa dự phòng tiếp theo
      continue;
    }
  }

  throw new Error(`Toàn bộ khóa API Gemini trong kho dự phòng đều không thể phản hồi: ${lastError ? lastError.message : 'Hết hạn mức hoặc không hợp lệ'}`);
}

module.exports = {
  callAI,
  DEFAULT_MODELS,
  getAISettingsAndSecrets,
  invalidateAiSettingsCache
};
