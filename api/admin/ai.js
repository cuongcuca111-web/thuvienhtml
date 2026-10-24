// api/admin/ai.js
// Gộp toàn bộ API quản trị AI Google Gemini: Kho dự phòng đa khóa (Key Pool), Cài đặt, Giám sát, Kiểm tra & Danh sách Model
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');
const { encryptKey, decryptKey, maskApiKey } = require('../../lib/crypto');
const { DEFAULT_MODELS, sanitizeGeminiModel, invalidateAiSettingsCache } = require('../../lib/call-ai');

const FALLBACK_MODELS = {
  gemini: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Khuyên dùng - Siêu nhanh, Chuẩn xác & Ổn định)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Tối ưu chi phí & Tương thích cao)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Hybrid Reasoning - Tài khoản đủ điều kiện)' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (Tốc độ cao)' }
  ]
};

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

/**
 * Trợ giúp đọc kho khóa bí mật và tự động di chuyển key đơn lẻ cũ nếu có
 */
async function loadSecretKeyPool(db) {
  const [secPool, secLegacy] = await Promise.all([
    db.doc('admin_secrets/gemini_pool').get().catch(() => ({ exists: false })),
    db.doc('admin_secrets/gemini').get().catch(() => ({ exists: false }))
  ]);

  let poolKeys = [];
  if (secPool.exists && Array.isArray(secPool.data().keys)) {
    poolKeys = secPool.data().keys;
  } else if (secLegacy.exists && secLegacy.data().cipherText) {
    const leg = secLegacy.data();
    poolKeys = [{
      id: 'gemini_key_primary',
      label: 'Khóa chính (Google AI Studio)',
      cipherText: leg.cipherText,
      iv: leg.iv,
      authTag: leg.authTag,
      maskedKey: leg.maskedKey || '••••',
      status: 'active',
      isPrimary: true,
      order: 1,
      createdAt: leg.updatedAt || new Date().toISOString()
    }];
  }

  return poolKeys;
}

/**
 * Trợ giúp lưu kho khóa đồng thời vào admin_secrets/gemini_pool và config/ai_settings
 */
async function saveSecretKeyPool(db, poolKeys, uid = null) {
  const nowIso = new Date().toISOString();

  // Đảm bảo luôn có ít nhất 1 khóa là Primary nếu danh sách không rỗng
  let hasPrimary = poolKeys.some(k => k.isPrimary && k.status !== 'expired');
  if (!hasPrimary && poolKeys.length > 0) {
    const firstNonExpired = poolKeys.find(k => k.status !== 'expired') || poolKeys[0];
    firstNonExpired.isPrimary = true;
    if (firstNonExpired.status === 'standby') firstNonExpired.status = 'active';
  }

  const publicKeys = poolKeys.map(k => ({
    id: k.id,
    label: k.label || 'Khóa Gemini',
    maskedKey: k.maskedKey,
    status: k.status || 'standby',
    isPrimary: Boolean(k.isPrimary),
    order: k.order || 1,
    lastTested: k.lastTested || null,
    testMessage: k.testMessage || '',
    createdAt: k.createdAt || nowIso,
    updatedAt: nowIso
  }));

  const primaryKey = poolKeys.find(k => k.isPrimary) || poolKeys[0] || null;

  const promises = [
    db.doc('admin_secrets/gemini_pool').set({
      keys: poolKeys,
      updatedAt: nowIso,
      updatedBy: uid
    }),
    db.doc('config/ai_settings').set({
      geminiKeyPool: publicKeys,
      providers: {
        gemini: {
          isConfigured: poolKeys.length > 0,
          maskedKey: primaryKey ? primaryKey.maskedKey : '',
          status: primaryKey ? (primaryKey.status === 'active' ? 'ready' : (primaryKey.status === 'expired' ? 'error' : 'saved')) : 'not_configured',
          lastTested: primaryKey ? primaryKey.lastTested : null,
          updatedAt: nowIso
        }
      }
    }, { merge: true })
  ];

  if (primaryKey) {
    promises.push(db.doc('admin_secrets/gemini').set({
      cipherText: primaryKey.cipherText,
      iv: primaryKey.iv,
      authTag: primaryKey.authTag,
      maskedKey: primaryKey.maskedKey,
      provider: 'gemini',
      updatedAt: nowIso,
      updatedBy: uid
    }));
  }

  await Promise.all(promises);
  if (typeof invalidateAiSettingsCache === 'function') {
    invalidateAiSettingsCache();
  }
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị AI bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. ACTION: KEY-POOL (GET danh sách khóa công khai & POST thêm/cập nhật khóa)
  if (action === 'key-pool') {
    if (req.method === 'GET') {
      try {
        const poolKeys = await loadSecretKeyPool(db);
        const publicKeys = poolKeys.map(k => ({
          id: k.id,
          label: k.label || 'Khóa Gemini',
          maskedKey: k.maskedKey,
          status: k.status || 'standby', // 'active' | 'expiring' | 'expired' | 'standby'
          isPrimary: Boolean(k.isPrimary),
          order: k.order || 1,
          lastTested: k.lastTested || null,
          testMessage: k.testMessage || '',
          createdAt: k.createdAt || null
        }));
        return res.status(200).json({ success: true, keys: publicKeys });
      } catch (err) {
        return res.status(500).json({ error: 'Không thể tải danh sách khóa: ' + err.message });
      }
    }

    if (req.method === 'POST') {
      const { id, label, apiKey, status, isPrimary } = req.body || {};

      try {
        let poolKeys = await loadSecretKeyPool(db);
        const nowIso = new Date().toISOString();

        if (id) {
          // CẬP NHẬT KHÓA ĐÃ CÓ
          const targetIndex = poolKeys.findIndex(k => k.id === id);
          if (targetIndex === -1) {
            return res.status(404).json({ error: 'Không tìm thấy khóa có mã: ' + id });
          }

          const existing = poolKeys[targetIndex];
          if (label && typeof label === 'string') existing.label = label.trim().slice(0, 80);
          if (status && ['active', 'expiring', 'expired', 'standby'].includes(status)) {
            existing.status = status;
          }

          if (apiKey && typeof apiKey === 'string' && apiKey.trim().length >= 8) {
            const trimmed = apiKey.trim();
            const encrypted = encryptKey(trimmed);
            existing.cipherText = encrypted.cipherText;
            existing.iv = encrypted.iv;
            existing.authTag = encrypted.authTag;
            existing.maskedKey = maskApiKey(trimmed);
            existing.status = status || 'standby';
          }

          if (isPrimary || existing.status === 'active') {
            poolKeys.forEach(k => {
              if (k.id !== id) {
                k.isPrimary = false;
                if (k.status === 'active') k.status = 'standby';
              }
            });
            existing.isPrimary = true;
            existing.status = 'active';
          }

          existing.updatedAt = nowIso;
        } else {
          // THÊM KHÓA MỚI VÀO KHO DỰ TRỮ
          if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
            return res.status(400).json({ error: 'Vui lòng cung cấp khóa API Google Gemini hợp lệ (tối thiểu 8 ký tự).' });
          }

          const trimmed = apiKey.trim();
          const encrypted = encryptKey(trimmed);
          const maskedKey = maskApiKey(trimmed);
          const newId = 'gemini_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const keyLabel = (label && typeof label === 'string' && label.trim())
            ? label.trim().slice(0, 80)
            : (poolKeys.length === 0 ? 'Khóa chính (Google AI Studio)' : `Khóa dự phòng #${poolKeys.length}`);

          const shouldBePrimary = Boolean(isPrimary) || poolKeys.length === 0 || status === 'active';

          if (shouldBePrimary) {
            poolKeys.forEach(k => {
              k.isPrimary = false;
              if (k.status === 'active') k.status = 'standby';
            });
          }

          const newKeyItem = {
            id: newId,
            label: keyLabel,
            cipherText: encrypted.cipherText,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            maskedKey,
            status: shouldBePrimary ? 'active' : (status || 'standby'),
            isPrimary: shouldBePrimary,
            order: poolKeys.length + 1,
            lastTested: null,
            testMessage: '',
            createdAt: nowIso,
            updatedAt: nowIso
          };

          poolKeys.push(newKeyItem);
        }

        await saveSecretKeyPool(db, poolKeys, uid);

        await recordAuditLog(db, {
          uid,
          action: 'gemini_key_pool_update',
          details: `Cập nhật kho API Gemini (${poolKeys.length} khóa).`
        });

        const publicKeys = poolKeys.map(k => ({
          id: k.id,
          label: k.label,
          maskedKey: k.maskedKey,
          status: k.status,
          isPrimary: Boolean(k.isPrimary),
          order: k.order,
          lastTested: k.lastTested,
          testMessage: k.testMessage,
          createdAt: k.createdAt
        }));

        return res.status(200).json({ success: true, keys: publicKeys });
      } catch (err) {
        console.error('Lỗi cập nhật key pool:', err.message);
        return res.status(500).json({ error: 'Không thể cập nhật khóa: ' + err.message });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. ACTION: DELETE-KEY-POOL (Xóa 1 khóa khỏi kho dự phòng)
  if (action === 'delete-key-pool') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { keyId } = req.body || {};
    if (!keyId) return res.status(400).json({ error: 'Thiếu keyId cần xóa.' });

    try {
      let poolKeys = await loadSecretKeyPool(db);
      const filtered = poolKeys.filter(k => k.id !== keyId);

      if (filtered.length === poolKeys.length) {
        return res.status(404).json({ error: 'Không tìm thấy khóa để xóa.' });
      }

      await saveSecretKeyPool(db, filtered, uid);

      await recordAuditLog(db, {
        uid,
        action: 'gemini_key_pool_delete',
        details: `Xóa khóa ${keyId} khỏi kho dự phòng Gemini`
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Lỗi xóa khóa pool:', err.message);
      return res.status(500).json({ error: 'Không thể xóa khóa: ' + err.message });
    }
  }

  // 3. ACTION: SET-KEY-STATUS (Đổi mác: active, expiring, expired, standby)
  if (action === 'set-key-status') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { keyId, status } = req.body || {};
    const validStatuses = ['active', 'expiring', 'expired', 'standby'];
    if (!keyId || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ. status phải là: active, expiring, expired hoặc standby.' });
    }

    try {
      let poolKeys = await loadSecretKeyPool(db);
      const target = poolKeys.find(k => k.id === keyId);
      if (!target) return res.status(404).json({ error: 'Không tìm thấy khóa.' });

      if (status === 'active') {
        poolKeys.forEach(k => {
          if (k.id !== keyId) {
            k.isPrimary = false;
            if (k.status === 'active') k.status = 'standby';
          }
        });
        target.isPrimary = true;
        target.status = 'active';
      } else {
        target.status = status;
        if (target.isPrimary) {
          target.isPrimary = false;
          // Tìm khóa khác không bị expired làm primary
          const alt = poolKeys.find(k => k.id !== keyId && k.status !== 'expired');
          if (alt) {
            alt.isPrimary = true;
            alt.status = 'active';
          }
        }
      }

      await saveSecretKeyPool(db, poolKeys, uid);
      return res.status(200).json({ success: true, keyId, status });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi cập nhật trạng thái: ' + err.message });
    }
  }

  // 4. ACTION: SET-PRIMARY-KEY (Đặt làm khóa chính đang hoạt động)
  if (action === 'set-primary-key') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { keyId } = req.body || {};
    if (!keyId) return res.status(400).json({ error: 'Thiếu keyId.' });

    try {
      let poolKeys = await loadSecretKeyPool(db);
      const target = poolKeys.find(k => k.id === keyId);
      if (!target) return res.status(404).json({ error: 'Không tìm thấy khóa.' });

      poolKeys.forEach(k => {
        k.isPrimary = (k.id === keyId);
        if (k.id !== keyId && k.status === 'active') {
          k.status = 'standby';
        }
      });
      target.status = 'active';

      await saveSecretKeyPool(db, poolKeys, uid);
      return res.status(200).json({ success: true, keyId });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi thiết lập khóa chính: ' + err.message });
    }
  }

  // 5. ACTION: TEST (Kiểm tra trực tiếp kết nối và trạng thái của khóa Gemini)
  if (action === 'test') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { keyId, apiKey: rawApiKey, model: requestedModel } = req.body || {};

    try {
      let poolKeys = await loadSecretKeyPool(db);
      let targetKeyItem = null;
      let apiKey = '';

      if (rawApiKey) {
        apiKey = String(rawApiKey).trim();
      } else if (keyId) {
        targetKeyItem = poolKeys.find(k => k.id === keyId);
        if (!targetKeyItem) return res.status(404).json({ error: 'Không tìm thấy khóa.' });
        apiKey = decryptKey(targetKeyItem);
      } else {
        targetKeyItem = poolKeys.find(k => k.isPrimary) || poolKeys[0];
        if (!targetKeyItem) {
          return res.status(400).json({ error: 'Chưa có API key Gemini nào trong kho dự trữ để kiểm tra.' });
        }
        apiKey = decryptKey(targetKeyItem);
      }

      apiKey = (apiKey || '').replace(/[\r\n\t ]/g, '').trim();
      if (!apiKey || apiKey.length < 8) {
        return res.status(400).json({ error: 'Khóa API không hợp lệ hoặc quá ngắn.' });
      }

      const settingsSnap = await db.doc('config/ai_settings').get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      let rawModel = (requestedModel && typeof requestedModel === 'string' && requestedModel.trim())
        ? requestedModel.trim()
        : ((settings.models && settings.models.gemini && settings.models.gemini.fast) ||
           (DEFAULT_MODELS.gemini && DEFAULT_MODELS.gemini.fast) ||
           'gemini-2.0-flash');
      let model = (typeof sanitizeGeminiModel === 'function') ? sanitizeGeminiModel(rawModel) : rawModel.replace(/^models\//, '');
      if (model.includes('1.5-pro') || model.includes('2.5') || model.includes('3.8')) model = 'gemini-2.0-flash';

      let geminiOk = false;
      let lastRespMsg = '';
      let testResponse = '';
      let isQuotaError = false;
      let isInvalidError = false;

      // 1. Kiểm tra tính hợp lệ của Key qua ListModels API (Zero-token verification)
      let googleSupportedModels = [];
      try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const listResp = await fetch(listUrl, { method: 'GET' });
        if (listResp.ok) {
          const listData = await listResp.json().catch(() => ({}));
          if (Array.isArray(listData.models)) {
            googleSupportedModels = listData.models
              .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => (m.name || '').replace(/^models\//, ''))
              .filter(Boolean);
          }
        } else {
          const errData = await listResp.json().catch(() => ({}));
          const errMsg = (errData && errData.error && errData.error.message) || ('HTTP ' + listResp.status);
          if (listResp.status === 400 && (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID'))) {
            isInvalidError = true;
            lastRespMsg = errMsg;
          } else if (listResp.status === 429 || errMsg.includes('quota') || errMsg.includes('exhausted')) {
            isQuotaError = true;
            lastRespMsg = errMsg;
          }
        }
      } catch (listErr) {
        console.warn('Lỗi gọi ListModels Gemini:', listErr.message);
      }

      // 2. Thử nghiệm generateContent thực tế
      if (!isInvalidError && !isQuotaError) {
        const preferredPriority = [
          model,
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          'gemini-1.5-flash',
          'gemini-3.5-flash-lite'
        ].filter(Boolean);

        const candidateModels = [
          ...preferredPriority.filter(m => googleSupportedModels.length === 0 || googleSupportedModels.includes(m)),
          ...preferredPriority,
          ...googleSupportedModels
        ];
        const uniqueCandidates = [...new Set(candidateModels)];

        for (let i = 0; i < uniqueCandidates.length; i++) {
          const candModel = uniqueCandidates[i];
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
              geminiOk = true;
              model = candModel;
              break;
            } else {
              const d = await resp.json().catch(() => ({}));
              const msg = (d && d.error && d.error.message) || ('HTTP ' + resp.status);
              lastRespMsg = msg;
              if (resp.status === 400 && (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID'))) {
                isInvalidError = true;
                break;
              }
              if (resp.status === 429 || msg.includes('quota') || msg.includes('exhausted')) {
                isQuotaError = true;
              }

              // Nhận diện gợi ý chuyển đổi model tự động từ Google nếu tài khoản/khóa mới không hỗ trợ model cũ
              // (Ví dụ: "models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash")
              const match = msg.match(/(?:models\/|use\s+models\/)([a-zA-Z0-9.\-_]+)/i);
              if (match && match[1]) {
                const suggestedModel = (typeof sanitizeGeminiModel === 'function') ? sanitizeGeminiModel(match[1]) : match[1];
                if (!uniqueCandidates.includes(suggestedModel)) {
                  uniqueCandidates.splice(i + 1, 0, suggestedModel);
                }
              }
            }
          } catch (netErr) {
            lastRespMsg = netErr.message;
          }
          if (geminiOk) break;
        }
      }

      const nowIso = new Date().toISOString();
      let determinedStatus = 'active';

      if (geminiOk) {
        // Nếu test thành công:
        if (targetKeyItem) {
          determinedStatus = targetKeyItem.isPrimary ? 'active' : 'standby';
          targetKeyItem.status = determinedStatus;
          targetKeyItem.lastTested = nowIso;
          targetKeyItem.testMessage = `Hoạt động tốt (Model: ${model})`;
          await saveSecretKeyPool(db, poolKeys, uid);
        }
        return res.status(200).json({
          success: true,
          status: determinedStatus,
          message: `Kết nối thành công tới Google Gemini! Model ${model} phản hồi: "${testResponse}"`,
          testedAt: nowIso
        });
      } else {
        // Test thất bại:
        determinedStatus = (isQuotaError || isInvalidError) ? 'expired' : 'expiring';
        let friendlyError = lastRespMsg;
        if (isInvalidError) {
          friendlyError = 'Khóa API không hợp lệ hoặc đã bị xóa trên Google AI Studio. Vui lòng kiểm tra lại.';
        } else if (isQuotaError) {
          friendlyError = 'Khóa đã hết hạn mức sử dụng (Quota Exceeded / Rate Limit).';
        }

        if (targetKeyItem) {
          targetKeyItem.status = determinedStatus;
          targetKeyItem.lastTested = nowIso;
          targetKeyItem.testMessage = friendlyError.slice(0, 300);
          await saveSecretKeyPool(db, poolKeys, uid);
        }

        return res.status(200).json({
          success: false,
          status: determinedStatus,
          message: `Kiểm tra thất bại: ${friendlyError}`,
          testedAt: nowIso
        });
      }
    } catch (err) {
      console.error('Lỗi test key:', err.message);
      return res.status(500).json({ success: false, message: 'Lỗi kiểm tra khóa: ' + err.message });
    }
  }

  // 6. ACTION: SETTINGS (GET & POST cài đặt chung)
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
      const { models, dailyRequestCap, autoFailover, featureToggles, prompts } = req.body || {};
      try {
        const sanitizedCap = Math.max(0, parseInt(dailyRequestCap, 10) || 0);

        const updateData = {
          priority: ['gemini'],
          models: {
            gemini: {
              fast: sanitizeGeminiModel(models && models.gemini && models.gemini.fast),
              strong: sanitizeGeminiModel(models && models.gemini && models.gemini.strong)
            }
          },
          autoFailover: typeof autoFailover === 'boolean' ? autoFailover : true,
          dailyRequestCap: sanitizedCap,
          featureToggles: featureToggles && typeof featureToggles === 'object' ? featureToggles : {
            smartSchedule: true,
            flashcards: true
          },
          updatedAt: new Date().toISOString(),
          updatedBy: uid
        };

        if (prompts && typeof prompts === 'object') {
          updateData.prompts = {
            explain: typeof prompts.explain === 'string' ? prompts.explain.trim() : '',
            example: typeof prompts.example === 'string' ? prompts.example.trim() : '',
            translate: typeof prompts.translate === 'string' ? prompts.translate.trim() : ''
          };
        }

        await db.doc('config/ai_settings').set(updateData, { merge: true });

        if (typeof invalidateAiSettingsCache === 'function') {
          invalidateAiSettingsCache();
        }

        await recordAuditLog(db, {
          uid,
          action: 'ai_settings_update',
          newVal: updateData,
          details: `Cập nhật cấu hình Gemini (Trần ngày: ${sanitizedCap || 'Vô hạn'}, Auto-Failover: ${updateData.autoFailover ? 'Bật' : 'Tắt'})`
        });

        return res.status(200).json({ success: true, settings: updateData });
      } catch (err) {
        console.error('Lỗi lưu cài đặt AI:', err.message);
        return res.status(500).json({ error: 'Không thể lưu cài đặt: ' + err.message });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 7. ACTION: USAGE (GET thống kê 14 ngày qua)
  if (action === 'usage') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
      const snap = await db.doc('config/ai_settings').get();
      const settings = snap.exists ? snap.data() : {};
      const dailyCap = parseInt(settings.dailyRequestCap, 10) || 0;

      const dates = [];
      const now = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }

      const refs = dates.map(d => db.doc(`ai_usage/${d}`));
      const snaps = await db.getAll(...refs).catch(() => []);

      const usageHistory = [];
      let todayRequests = 0;
      let todayTokens = 0;
      let grandRequests = 0;
      let grandTokens = 0;

      dates.forEach((dateStr, idx) => {
        const doc = snaps[idx];
        const data = (doc && doc.exists) ? doc.data() : {};
        const reqCount = data.totalRequests || 0;
        const tokCount = data.totalTokens || 0;

        if (idx === 0) {
          todayRequests = reqCount;
          todayTokens = tokCount;
        }

        grandRequests += reqCount;
        grandTokens += tokCount;

        usageHistory.push({
          date: dateStr,
          requests: reqCount,
          tokens: tokCount,
          byProvider: data.requestsByProvider || {},
          byModel: data.requestsByModel || {}
        });
      });

      const isCapped = dailyCap > 0 && todayRequests >= dailyCap;

      return res.status(200).json({
        dailyCap,
        todayRequests,
        todayTokens,
        grandRequests,
        grandTokens,
        isCapped,
        history: usageHistory
      });
    } catch (err) {
      console.error('Lỗi lấy dữ liệu sử dụng AI:', err.message);
      return res.status(500).json({ error: 'Không thể lấy thống kê sử dụng: ' + err.message });
    }
  }

  // 8. ACTION: MODELS (GET danh sách Model Google Gemini)
  if (action === 'models') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
      let fetchedModels = [];
      const poolKeys = await loadSecretKeyPool(db);
      const activeKeyItem = poolKeys.find(k => k.status !== 'expired') || poolKeys[0];

      if (activeKeyItem && activeKeyItem.cipherText) {
        try {
          const apiKey = decryptKey(activeKeyItem);
          const [respV1, respBeta] = await Promise.all([
            fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`).catch(() => null),
            fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`).catch(() => null)
          ]);

          const modelsMap = new Map();
          for (const resp of [respV1, respBeta]) {
            if (resp && resp.ok) {
              const d = await resp.json().catch(() => ({}));
              (d.models || []).forEach(m => {
                if ((m.supportedGenerationMethods || []).includes('generateContent')) {
                  const id = m.name.replace('models/', '');
                  if (!modelsMap.has(id) && id.startsWith('gemini')) {
                    modelsMap.set(id, {
                      id: id,
                      name: `${m.displayName || id} (${id})`
                    });
                  }
                }
              });
            }
          }
          if (modelsMap.size > 0) fetchedModels = Array.from(modelsMap.values());
        } catch (fetchErr) {
          console.warn('Không thể lấy danh sách model trực tiếp từ Google, dùng danh sách dự phòng:', fetchErr.message);
        }
      }

      if (fetchedModels.length === 0) {
        fetchedModels = FALLBACK_MODELS.gemini || [];
      }

      return res.status(200).json({ provider: 'gemini', models: fetchedModels });
    } catch (err) {
      return res.status(500).json({ error: 'Lỗi tải danh sách model: ' + err.message });
    }
  }

  // 9. LEGACY ALIAS: SAVE-KEY & DELETE-KEY (Tương thích ngược)
  if (action === 'save-key') {
    const { apiKey } = req.body || {};
    req.body = { ...req.body, id: 'gemini_key_primary', label: 'Khóa chính (Google AI Studio)', apiKey, status: 'active', isPrimary: true };
    return handler({ ...req, query: { action: 'key-pool' }, method: 'POST' }, res);
  }

  if (action === 'delete-key') {
    return handler({ ...req, query: { action: 'delete-key-pool' }, method: 'POST', body: { keyId: 'gemini_key_primary' } }, res);
  }

  return res.status(404).json({ error: `Không tìm thấy hành động AI: ${action}` });
};
