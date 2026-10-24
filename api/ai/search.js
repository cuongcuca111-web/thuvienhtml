// api/ai/search.js
// Tìm kiếm ngữ nghĩa thông minh bằng AI (Semantic AI Search)
// Chỉ kích hoạt khi tìm kiếm thông thường không thấy từ khóa gốc
const crypto = require('crypto');
const { initAdmin } = require('../../lib/admin-auth');
const { callAI } = require('../../lib/call-ai');

// Rate limiting trong bộ nhớ: tối đa 10 yêu cầu / phút / user
const rateLimitMap = new Map();

function checkUserRateLimit(key) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  let timestamps = rateLimitMap.get(key) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  if (timestamps.length >= 10) {
    rateLimitMap.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

function sanitizeText(str, maxLen = 300) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '').trim().substring(0, maxLen);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const app = initAdmin();

    const authHeader = req.headers.authorization || '';
    let userId = null;
    let isGuest = true;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const decoded = await app.auth().verifyIdToken(token);
          userId = decoded.uid;
          isGuest = false;
        } catch (_) {}
      }
    }

    const rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                  req.headers['x-real-ip'] ||
                  req.socket?.remoteAddress ||
                  'unknown_ip';
    const guestId = 'guest_' + crypto.createHash('sha256').update(`thuvienhtml_guest_ip:${rawIp}`).digest('hex').substring(0, 32);
    const rateLimitKey = isGuest ? guestId : `user_${userId}`;

    if (!checkUserRateLimit(rateLimitKey)) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        error: 'Bạn đang thao tác quá nhanh. Vui lòng đợi 1 phút trước khi tìm kiếm tiếp bằng AI.'
      });
    }

    const body = req.body || {};
    const query = sanitizeText(body.query, 300);
    const rawLessons = Array.isArray(body.lessons) ? body.lessons : [];

    if (!query || query.length < 2 || rawLessons.length === 0) {
      return res.status(200).json({ results: [] });
    }

    // Giới hạn tối đa 35 bài học để tối ưu tốc độ và token
    const candidateLessons = rawLessons.slice(0, 35).map(l => ({
      id: String(l.id || ''),
      title: sanitizeText(l.title || '', 150),
      categoryTitle: sanitizeText(l.categoryTitle || 'Chung', 80),
      excerpt: sanitizeText(l.excerpt || l.plainText || '', 600)
    })).filter(l => l.id && (l.title || l.excerpt));

    if (candidateLessons.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const systemPrompt = `Bạn là chuyên gia phân tích ngữ nghĩa và tìm kiếm thông tin chuyên sâu của Thư viện Sách HTML & Ôn tập.
Người dùng đang tìm kiếm một từ khóa hoặc câu hỏi nhưng không tìm thấy kết quả khớp chính xác theo từng chữ.
Nhiệm vụ của bạn:
1. Phân tích ngữ nghĩa, khái niệm cốt lõi, từ đồng nghĩa hoặc chủ đề liên quan chặt chẽ nhất của từ khóa.
2. Đối chiếu với danh sách các bài học và đoạn văn trích dẫn.
3. Tìm ra những bài học và đoạn văn CÓ NỘI DUNG SÁT NHẤT / TƯƠNG ĐỒNG NHẤT về mặt ý nghĩa, giải thích hoặc ngữ cảnh.
4. Trả về tối đa 5 kết quả sát nhất (xếp theo độ tương đồng giảm dần).
5. QUAN TRỌNG:
   - "targetSnippet" PHẢI là một câu hoặc cụm từ có thật (từ 15 đến 120 ký tự) xuất hiện trong trích đoạn của bài học đó, để hệ thống có thể cuộn tới và đóng khung làm nổi bật cho người dùng.
   - "reason" là 1 câu giải thích ngắn gọn (dưới 80 ký tự) vì sao đoạn này sát với từ khóa tìm kiếm.
   - "similarityScore" là điểm số từ 65 đến 98.`;

    const userPrompt = `TỪ KHÓA TÌM KIẾM CỦA NGƯỜI DÙNG: "${query}"

DANH SÁCH BÀI HỌC VÀ TRÍCH ĐOẠN ĐỂ TÌM KIẾM:
${candidateLessons.map((l, i) => `[Bài ${i + 1}] ID: ${l.id} | Tiêu đề: ${l.title} | Mục: ${l.categoryTitle}\nNội dung: ${l.excerpt}`).join('\n\n')}

Hãy phân tích và trả về JSON danh sách các kết quả sát nghĩa nhất.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lessonId: { type: 'string' },
              targetSnippet: { type: 'string' },
              reason: { type: 'string' },
              similarityScore: { type: 'integer' }
            },
            required: ['lessonId', 'targetSnippet', 'reason', 'similarityScore']
          }
        }
      },
      required: ['results']
    };

    let aiResponse = null;
    try {
      aiResponse = await callAI({
        system: systemPrompt,
        prompt: userPrompt,
        schema: jsonSchema,
        modelType: 'fast',
        taskType: 'fast',
        maxTokens: 1000,
        purpose: 'search'
      });
    } catch (aiErr) {
      console.warn('[AI Search] Lỗi gọi callAI:', aiErr.message);
      return res.status(200).json({ results: [] });
    }

    let parsedResults = [];
    if (aiResponse && aiResponse.data && Array.isArray(aiResponse.data.results)) {
      parsedResults = aiResponse.data.results;
    } else if (aiResponse && (aiResponse.rawText || aiResponse.text)) {
      try {
        const raw = (aiResponse.rawText || aiResponse.text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const obj = JSON.parse(raw);
        if (obj && Array.isArray(obj.results)) {
          parsedResults = obj.results;
        }
      } catch (_) {}
    }

    // Lọc lại kết quả để đảm bảo lessonId tồn tại trong danh sách đề cử
    const validCandidateIds = new Set(candidateLessons.map(l => l.id));
    const cleanResults = parsedResults
      .filter(r => r && r.lessonId && validCandidateIds.has(r.lessonId) && r.targetSnippet)
      .map(r => ({
        lessonId: r.lessonId,
        targetSnippet: sanitizeText(r.targetSnippet, 200),
        reason: sanitizeText(r.reason, 120),
        similarityScore: Math.min(99, Math.max(60, Number(r.similarityScore) || 75))
      }))
      .slice(0, 5);

    return res.status(200).json({ results: cleanResults });

  } catch (err) {
    console.error('[AI Search] Lỗi hệ thống:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ xử lý tìm kiếm AI', results: [] });
  }
};
