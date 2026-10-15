// lib/ntfy.js
// Quản lý gửi thông báo đẩy qua ntfy.sh an toàn, chống lỗi header UTF-8
const { initAdmin } = require('./admin-auth');
const { decryptKey } = require('./crypto');

/**
 * Lấy cấu hình ntfy từ Firestore admin_secrets/payment
 */
async function getNtfyConfig(db = null) {
  try {
    const firestore = db || initAdmin().firestore();
    const secDoc = await firestore.doc('admin_secrets/payment').get();
    if (!secDoc.exists) return null;

    const data = secDoc.data() || {};
    let ntfyTopic = '';
    let ntfyServerUrl = 'https://ntfy.sh';
    let ntfyToken = '';

    // Giải mã ntfyTopic
    if (data.ntfyTopic) {
      if (typeof data.ntfyTopic === 'object' && data.ntfyTopic.cipherText) {
        try { ntfyTopic = decryptKey(data.ntfyTopic); } catch (_) {}
      } else if (typeof data.ntfyTopic === 'string') {
        ntfyTopic = data.ntfyTopic.trim();
      }
    }

    // Server URL
    if (data.ntfyServerUrl && typeof data.ntfyServerUrl === 'string') {
      ntfyServerUrl = data.ntfyServerUrl.trim().replace(/\/+$/, '') || 'https://ntfy.sh';
    }

    // Giải mã ntfyToken
    if (data.ntfyToken) {
      if (typeof data.ntfyToken === 'object' && data.ntfyToken.cipherText) {
        try { ntfyToken = decryptKey(data.ntfyToken); } catch (_) {}
      } else if (typeof data.ntfyToken === 'string') {
        ntfyToken = data.ntfyToken.trim();
      }
    }

    return {
      topic: ntfyTopic,
      serverUrl: ntfyServerUrl,
      token: ntfyToken
    };
  } catch (err) {
    console.warn('[ntfy] Lỗi đọc cấu hình admin_secrets/payment:', err.message);
    return null;
  }
}

/**
 * Gửi thông báo đẩy về ntfy.sh bằng JSON Body (Chống lỗi ByteString/UTF-8 Header của Node.js)
 * @param {Object} options
 * @param {string} options.title - Tiêu đề tiếng Việt có dấu
 * @param {string} options.message - Nội dung thông báo
 * @param {number} [options.priority=4] - 1 (min) đến 5 (max), mặc định 4 (high)
 * @param {Array<string>} [options.tags=[]] - Mảng emoji hoặc tag (ví dụ: ['tada', 'moneybag'])
 * @param {string} [options.click=null] - URL điều hướng khi bấm vào thông báo
 * @param {string} [options.attach=null] - URL ảnh hoặc tệp đính kèm
 * @param {Array<Object>} [options.actions=[]] - Các nút bấm hành động (ví dụ: [{ action: 'view', label: '...', url: '...' }])
 * @param {boolean} [options.markdown=true] - Bật định dạng Markdown cho tin nhắn
 * @param {Object} [options.config] - Tùy chọn truyền trước cấu hình { topic, serverUrl, token }
 * @param {Object} [options.db] - Firestore instance
 */
async function sendNtfyNotification({
  title,
  message,
  priority = 4,
  tags = [],
  click = null,
  attach = null,
  actions = [],
  markdown = true,
  config = null,
  db = null
}) {
  try {
    const cfg = config || await getNtfyConfig(db);
    if (!cfg || !cfg.topic) {
      // Chưa cấu hình topic thì bỏ qua im lặng
      return { success: false, reason: 'not_configured' };
    }

    const cleanTopic = String(cfg.topic).trim();
    const serverUrl = (cfg.serverUrl || 'https://ntfy.sh').replace(/\/+$/, '');

    // Đảm bảo gửi qua JSON Body tới root URL để ntfy nhận diện đúng các trường title, message, priority, tags thay vì hiển thị raw JSON
    const payload = {
      topic: cleanTopic,
      title: title || 'Thông báo Thư viện Sách HTML',
      message: message || '',
      priority: Math.max(1, Math.min(5, parseInt(priority, 10) || 4)),
      tags: Array.isArray(tags) ? tags : [],
      markdown: Boolean(markdown)
    };

    if (click && typeof click === 'string' && click.startsWith('http')) {
      payload.click = click;
    }
    if (attach && typeof attach === 'string' && attach.startsWith('http')) {
      payload.attach = attach;
    }
    if (Array.isArray(actions) && actions.length > 0) {
      payload.actions = actions;
    }

    const headers = {
      'Content-Type': 'application/json; charset=utf-8'
    };

    if (cfg.token && typeof cfg.token === 'string' && cfg.token.trim()) {
      headers['Authorization'] = `Bearer ${cfg.token.trim()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Gửi POST tới root URL của ntfy server (ví dụ https://ntfy.sh) kèm topic trong body
    // Khi gửi tới https://ntfy.sh/<topic>, ntfy sẽ coi JSON body là chuỗi văn bản thô
    const targetUrl = serverUrl;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[ntfy] Phản hồi lỗi từ máy chủ ntfy (${response.status}):`, errText);
      return { success: false, status: response.status, error: errText };
    }

    return { success: true };
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    console.warn('[ntfy] Lỗi gửi thông báo:', isAbort ? 'Timeout quá 6s' : err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getNtfyConfig,
  sendNtfyNotification
};
