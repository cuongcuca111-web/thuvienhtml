const { verifyAdmin, recordAuditLog } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;
  const { code, reason } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: 'Thiếu mã kích hoạt' });
  }

  try {
    const codeRef = db.doc(`activation_codes/${code.trim()}`);
    const snap = await codeRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Mã kích hoạt không tồn tại' });
    }

    const data = snap.data();
    if (data.isUsed) {
      return res.status(400).json({ error: 'Mã đã được sử dụng, không thể vô hiệu hóa' });
    }

    await codeRef.update({
      isDisabled: true,
      disabledAt: new Date().toISOString(),
      disabledBy: uid,
      disableReason: String(reason || '')
    });

    await recordAuditLog(db, {
      uid,
      action: 'code_disable',
      oldVal: { code, isDisabled: false },
      newVal: { code, isDisabled: true },
      details: `Vô hiệu hóa mã ${code}. Lý do: ${reason || 'Không có'}`
    });

    return res.status(200).json({ success: true, code });
  } catch (err) {
    console.error('Lỗi khi vô hiệu hóa mã:', err);
    return res.status(500).json({ error: 'Không thể vô hiệu hóa mã: ' + err.message });
  }
};
