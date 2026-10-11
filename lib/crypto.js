// lib/crypto.js
// Tiện ích mã hóa & giải mã API Key phía máy chủ bằng AES-256-GCM
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const secret = process.env.PAYMENT_ENCRYPTION_SECRET || process.env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('Thiếu biến môi trường PAYMENT_ENCRYPTION_SECRET hoặc AI_KEY_ENCRYPTION_SECRET trên máy chủ');
  }

  // Nếu secret đã là 32-byte Base64 thì decode, nếu không thì băm SHA-256 để đảm bảo đúng 32 bytes
  let keyBuffer;
  try {
    const rawBuf = Buffer.from(secret, 'base64');
    if (rawBuf.length === 32) {
      keyBuffer = rawBuf;
    }
  } catch (e) {}

  if (!keyBuffer) {
    keyBuffer = crypto.createHash('sha256').update(secret).digest();
  }
  return keyBuffer;
}

/**
 * Mã hóa chuỗi API key bằng AES-256-GCM với IV ngẫu nhiên
 */
function encryptKey(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Dữ liệu cần mã hóa không hợp lệ');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // 16 bytes ngẫu nhiên
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    cipherText: encrypted
  };
}

/**
 * Giải mã API key từ IV, AuthTag và CipherText
 */
function decryptKey(encryptedObj) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.authTag || !encryptedObj.cipherText) {
    throw new Error('Dữ liệu khóa mã hóa bị thiếu hoặc không đúng định dạng');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const authTag = Buffer.from(encryptedObj.authTag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedObj.cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Tạo bản che của API Key (chỉ hiển thị 4 ký tự cuối)
 * Ví dụ: "AIzaSy...1234" -> "••••1234"
 */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••';
  const last4 = trimmed.slice(-4);
  return '••••' + last4;
}

module.exports = {
  encryptKey,
  decryptKey,
  maskApiKey
};
