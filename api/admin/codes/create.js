const crypto = require('crypto');
const { verifyAdmin, recordAuditLog } = require('../_auth');

function generateCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function segment(len) {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  }
  return `${prefix.toUpperCase()}-${segment(4)}-${segment(4)}-${segment(4)}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { tier, days, quantity, note } = req.body || {};

  if (!tier || !['plus', 'pro'].includes(tier)) {
    return res.status(400).json({ error: 'Gói phải là plus hoặc pro' });
  }

  const numDays = Math.max(1, parseInt(days, 10) || 30);
  const qty = Math.min(100, Math.max(1, parseInt(quantity, 10) || 1));
  const batchNote = String(note || '').slice(0, 100);

  try {
    const batch = db.batch();
    const createdCodes = [];
    const nowIso = new Date().toISOString();

    for (let i = 0; i < qty; i++) {
      const code = generateCode(tier);
      const codeRef = db.doc(`activation_codes/${code}`);
      const codeData = {
        code,
        tier,
        days: numDays,
        note: batchNote,
        isUsed: false,
        isDisabled: false,
        usedBy: null,
        usedAt: null,
        createdBy: uid,
        createdAt: nowIso
      };
      batch.set(codeRef, codeData);
      createdCodes.push(codeData);
    }

    await batch.commit();

    await recordAuditLog(db, {
      uid,
      action: 'codes_create',
      newVal: { tier, days: numDays, quantity: qty, note: batchNote },
      details: `Tạo ${qty} mã kích hoạt gói ${tier.toUpperCase()} (${numDays} ngày). Ghi chú: ${batchNote || 'Không có'}`
    });

    return res.status(200).json({
      success: true,
      createdCount: qty,
      codes: createdCodes
    });
  } catch (err) {
    console.error('Lỗi khi tạo mã kích hoạt:', err);
    return res.status(500).json({ error: 'Không thể tạo mã kích hoạt: ' + err.message });
  }
};
