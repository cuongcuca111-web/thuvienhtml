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
      fullTextSearch: Boolean(rawTier.fullTextSearch)
    };
  }

  // Kiểm tra tính nhất quán thứ bậc: guest <= free <= plus <= pro cho các hạn mức số
  // Lưu ý: -1 nghĩa là không giới hạn (lớn hơn bất kỳ số dương nào)
  function isLessThanOrEqualTo(a, b) {
    if (a === -1) return b === -1;
    if (b === -1) return true;
    return a <= b;
  }

  const numericKeys = ['maxLessons', 'maxSections', 'maxActiveShares'];
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
