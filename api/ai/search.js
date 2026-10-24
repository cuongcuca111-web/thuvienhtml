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

    // Quét toàn bộ thư viện (lên tới 80 bài học) để đảm bảo không bỏ sót bất kỳ bài học nào
    const candidateLessons = rawLessons.slice(0, 80).map(l => ({
      id: String(l.id || ''),
      title: sanitizeText(l.title || '', 150),
      categoryTitle: sanitizeText(l.categoryTitle || 'Chung', 80),
      excerpt: sanitizeText(l.excerpt || l.plainText || '', 500)
    })).filter(l => l.id && (l.title || l.excerpt));

    if (candidateLessons.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const systemPrompt = `Bạn là chuyên gia phân tích ngữ nghĩa và tìm kiếm thông tin chuyên sâu của Thư viện Sách HTML & Ôn tập.
Người dùng đang tra cứu một từ khóa hoặc khái niệm (có thể là từ đồng nghĩa, ẩn dụ, tiếng Anh hoặc ngôn ngữ đời thường).
Ví dụ điển hình:
- "Mắt máy tính", "Mắt PC", "Computer Vision" -> chính là "Thị giác máy tính" / "thị giác máy tính trong trí tuệ nhân tạo".
- "Não bộ AI", "Bộ óc máy tính" -> chính là "Mạng nơ-ron", "Deep Learning", "Bộ vi xử lý AI", v.v.

Nhiệm vụ của bạn:
1. Phân tích ngữ nghĩa, khái niệm cốt lõi hoặc từ đồng nghĩa tương ứng trong chuyên ngành của từ khóa tìm kiếm.
2. Đối chiếu với danh sách các bài học và đoạn văn trích dẫn.
3. Tìm ra những bài học CÓ NỘI DUNG SÁT NHẤT / ĐỒNG NGHĨA NHẤT (tối đa 5 bài học, xếp theo độ tương đồng giảm dần).
4. QUAN TRỌNG:
   - "matchedTerm": Cụm từ hoặc thuật ngữ tương ứng CÓ THẬT xuất hiện trong bài học đó (từ 2 đến 8 từ, ví dụ: "thị giác máy tính" hoặc "Thị giác Máy tính") để hệ thống định vị và đóng khung chính xác từ khóa này.
   - "targetSnippet": Câu hoặc đoạn trích ngắn (từ 20 đến 140 ký tự) có thật xuất hiện trong bài học chứa matchedTerm.
   - "reason": 1 câu giải thích súc tích (dưới 80 ký tự) vì sao đoạn này tương đồng hoặc là từ đồng nghĩa với từ khóa tìm kiếm.
   - "similarityScore": Điểm tương đồng từ 70 đến 99.`;

    const userPrompt = `TỪ KHÓA TÌM KIẾM CỦA NGƯỜI DÙNG: "${query}"

DANH SÁCH BÀI HỌC VÀ TRÍCH ĐOẠN ĐỂ TÌM KIẾM:
${candidateLessons.map((l, i) => `[Bài ${i + 1}] ID: ${l.id} | Tiêu đề: ${l.title} | Mục: ${l.categoryTitle}\nNội dung: ${l.excerpt}`).join('\n\n')}

Hãy phân tích ngữ nghĩa và trả về JSON danh sách các kết quả sát nghĩa nhất kèm matchedTerm chuẩn xác.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lessonId: { type: 'string' },
              matchedTerm: { type: 'string' },
              targetSnippet: { type: 'string' },
              reason: { type: 'string' },
              similarityScore: { type: 'integer' }
            },
            required: ['lessonId', 'matchedTerm', 'targetSnippet', 'reason', 'similarityScore']
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
      .filter(r => r && r.lessonId && validCandidateIds.has(r.lessonId) && (r.matchedTerm || r.targetSnippet))
      .map(r => ({
        lessonId: r.lessonId,
        matchedTerm: sanitizeText(r.matchedTerm || r.targetSnippet || '', 80),
        targetSnippet: sanitizeText(r.targetSnippet || r.matchedTerm || '', 200),
        reason: sanitizeText(r.reason || 'Nội dung liên quan theo ngữ nghĩa AI', 120),
        similarityScore: Math.min(99, Math.max(65, Number(r.similarityScore) || 80))
      }))
      .slice(0, 5);

    return res.status(200).json({ results: cleanResults });

  } catch (err) {
    console.error('[AI Search] Lỗi hệ thống:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ xử lý tìm kiếm AI', results: [] });
  }
};
