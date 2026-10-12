// lib/plans-validator.js
// Bộ thẩm định cấu hình các gói (Server-side Plans Validator)

const TIERS = ['guest', 'free', 'plus', 'pro'];

function clampInt(val, min, max, allowUnlimited = false) {
  if (val === -1 || val === null || val === 'unlimited' || val === Infinity) {
    if (allowUnlimited) return -1;
  }
  const n = parseInt(val, 10);
  if (isNaN(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function sanitizeShareDays(arr) {
  if (!Array.isArray(arr)) return [1, 7];
  const validAllowed = [1, 7, 14, 30, 60, 90, 180, 365];
  const cleaned = arr
    .map(x => parseInt(x, 10))
    .filter(x => validAllowed.includes(x))
    .sort((a, b) => a - b);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [1, 7];
}

function validatePlansConfig(rawPlans) {
  const errors = [];
  if (!rawPlans || typeof rawPlans !== 'object') {
    return { valid: false, errors: ['Dữ liệu cấu hình các gói không hợp lệ'] };
  }

  const sanitized = {};

  for (const tier of TIERS) {
    const rawTier = rawPlans[tier] || {};
    sanitized[tier] = {
      name: String(rawTier.name || tier.toUpperCase()).slice(0, 30),
      description: String(rawTier.description !== undefined ? rawTier.description : (
        tier === 'free' ? 'Dành cho người mới bắt đầu trải nghiệm thư viện bài học.' :
        tier === 'plus' ? 'Tối ưu cho cá nhân học tập chuyên cần và thường xuyên.' :
        tier === 'pro' ? 'Đầy đủ quyền lợi cao cấp nhất cùng AI mở rộng.' :
        'Dùng thử nhanh chóng không cần tài khoản.'
      )).slice(0, 255),
      pinnedFeatures: Array.isArray(rawTier.pinnedFeatures)
        ? rawTier.pinnedFeatures.filter(k => typeof k === 'string').slice(0, 30)
        : (
          tier === 'free' ? ['maxLessons', 'maxSections', 'maxActiveShares'] :
          tier === 'plus' ? ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword'] :
          ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword', 'customColor', 'exportNotesMd', 'fullTextSearch']
        ),
      customFeatures: Array.isArray(rawTier.customFeatures)
        ? rawTier.customFeatures.map(f => String(f).trim()).filter(Boolean).slice(0, 20)
        : [],
      maxLessons: clampInt(rawTier.maxLessons, 0, 100000, true),
      maxSections: clampInt(rawTier.maxSections, 0, 10000, true),
      maxFileKB: clampInt(rawTier.maxFileKB, 64, process.env.STORAGE_ENABLED === 'true' ? 10240 : 2048, false),
      maxActiveShares: clampInt(rawTier.maxActiveShares, 0, 1000, true),
      shareDays: sanitizeShareDays(rawTier.shareDays),
      canExtendShare: Boolean(rawTier.canExtendShare),
      sharePassword: Boolean(rawTier.sharePassword),
      customColor: Boolean(rawTier.customColor),
      exportNotesMd: Boolean(rawTier.exportNotesMd),
      trashDays: clampInt(rawTier.trashDays, 0, 365, false),
      statsDays: clampInt(rawTier.statsDays, 1, 3650, true),
      fullTextSearch: Boolean(rawTier.fullTextSearch),
      monthlyAiRequests: clampInt(rawTier.monthlyAiRequests !== undefined ? rawTier.monthlyAiRequests : (tier === 'guest' ? 3 : (tier === 'free' ? 30 : (tier === 'plus' ? 300 : 1500))), 0, 100000, true),
      maxFlashcardsPerFile: clampInt(rawTier.maxFlashcardsPerFile !== undefined ? rawTier.maxFlashcardsPerFile : (tier === 'guest' ? 5 : (tier === 'free' ? 15 : (tier === 'plus' ? 50 : 100))), 0, 500, true),
      aiScheduleEnabled: rawTier.aiScheduleEnabled !== undefined ? Boolean(rawTier.aiScheduleEnabled) : (tier !== 'guest'),
      aiFlashcardsEnabled: rawTier.aiFlashcardsEnabled !== undefined ? Boolean(rawTier.aiFlashcardsEnabled) : true
    };
  }

  // Kiểm tra tính nhất quán thứ bậc: guest <= free <= plus <= pro cho các hạn mức số
  function isLessThanOrEqualTo(a, b) {
    if (a === -1) return b === -1;
    if (b === -1) return true;
    return a <= b;
  }

  const numericKeys = ['maxLessons', 'maxSections', 'maxActiveShares', 'monthlyAiRequests', 'maxFlashcardsPerFile'];
  for (const key of numericKeys) {
    if (!isLessThanOrEqualTo(sanitized.guest[key], sanitized.free[key])) {
      errors.push(`Gói Khách không được có ${key} lớn hơn gói Thường.`);
    }
    if (!isLessThanOrEqualTo(sanitized.free[key], sanitized.plus[key])) {
      errors.push(`Gói Thường không được có ${key} lớn hơn gói Plus.`);
    }
    if (!isLessThanOrEqualTo(sanitized.plus[key], sanitized.pro[key])) {
      errors.push(`Gói Plus không được có ${key} lớn hơn gói Pro.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedPlans: sanitized
  };
}

module.exports = {
  validatePlansConfig
};
