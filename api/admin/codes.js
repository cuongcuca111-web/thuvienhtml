// api/admin/codes.js
// Gộp toàn bộ API quản trị Mã kích hoạt: list, create, disable
const crypto = require('crypto');
const { verifyAdmin, recordAuditLog } = require('../../lib/admin-auth');

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

function resolveAction(req) {
  if (req.query && req.query.action) return String(req.query.action).toLowerCase();
  const pathname = (req.url || '').split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  // Mọi thao tác quản trị Mã kích hoạt bắt buộc phải xác thực quyền Admin ở máy chủ
  const ctx = await verifyAdmin(req, res);
  if (!ctx) return;

  const { db, uid } = ctx;

  // 1. ACTION: LIST (GET) - Lấy danh sách mã
  if (action === 'list') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const statusFilter = req.query.status || 'all';
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    try {
      let query = db.collection('activation_codes');

      if (statusFilter === 'unused') {
        query = query.where('isUsed', '==', false).where('isDisabled', '==', false);
      } else if (statusFilter === 'used') {
        query = query.where('isUsed', '==', true);
      } else if (statusFilter === 'disabled') {
        query = query.where('isDisabled', '==', true);
      }

      const snap = await query.orderBy('createdAt', 'desc').limit(limitNum).get();
      const codes = [];
      snap.forEach(doc => {
        codes.push(doc.data());
      });

      return res.status(200).json({ codes });
    } catch (err) {
      console.error('Lỗi khi lấy danh sách mã:', err);
      return res.status(500).json({ error: 'Không thể tải danh sách mã kích hoạt.' });
    }
  }

  // 2. ACTION: CREATE (POST) - Tạo mã kích hoạt mới
  if (action === 'create') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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
  }

  // 3. ACTION: DISABLE (POST) - Vô hiệu hóa mã
  if (action === 'disable') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
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
  }

  // 4. ACTION: DELETE (POST / DELETE) - Xóa vĩnh viễn mã kích hoạt
  if (action === 'delete') {
    if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method Not Allowed' });
    const { code } = req.body || req.query || {};
    if (!code) {
      return res.status(400).json({ error: 'Thiếu mã kích hoạt' });
    }

    try {
      const cleanCode = String(code).trim().toUpperCase();
      const codeRef = db.doc(`activation_codes/${cleanCode}`);
      const snap = await codeRef.get();

      if (!snap.exists) {
        return res.status(404).json({ error: 'Mã kích hoạt không tồn tại hoặc đã bị xóa' });
      }

      const oldData = snap.data();
      await codeRef.delete();

      await recordAuditLog(db, {
        uid,
        action: 'code_delete',
        oldVal: oldData,
        details: `Xóa vĩnh viễn mã kích hoạt ${cleanCode}`
      });

      return res.status(200).json({ success: true, code: cleanCode, message: 'Đã xóa mã kích hoạt' });
    } catch (err) {
      console.error('Lỗi khi xóa mã:', err);
      return res.status(500).json({ error: 'Không thể xóa mã: ' + err.message });
    }
  }

  return res.status(404).json({ error: `Không tìm thấy hành động codes: ${action}` });
};
