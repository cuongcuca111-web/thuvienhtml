// scripts/set-admin.js
/**
 * Script cục bộ để cấp quyền Custom Claim { admin: true } cho tài khoản Admin
 * 
 * Cách chạy:
 *   node scripts/set-admin.js --email minhcuong111@admin.thuvienhtml.app
 *   HOẶC
 *   node scripts/set-admin.js --uid <UID_CỦA_USER>
 * 
 * Tùy chọn:
 *   --key ./service-account.json (Đường dẫn tới file khóa Service Account nếu chưa đặt FIREBASE_SERVICE_ACCOUNT)
 *   --revoke (Thu hồi quyền admin)
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Đọc tham số dòng lệnh
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}
const isRevoke = args.includes('--revoke');
const email = getArg('--email');
const uid = getArg('--uid');
const keyPath = getArg('--key') || path.resolve(__dirname, '../service-account.json');

if (!email && !uid) {
  console.error('\n❌ LỖI: Vui lòng cung cấp --email hoặc --uid.');
  console.log('Ví dụ:');
  console.log('  node scripts/set-admin.js --email minhcuong111@admin.thuvienhtml.app');
  console.log('  node scripts/set-admin.js --uid abc123xyz');
  console.log('  node scripts/set-admin.js --email minhcuong111@admin.thuvienhtml.app --revoke\n');
  process.exit(1);
}

// 2. Khởi tạo Firebase Admin SDK
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    serviceAccount = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8'));
    console.log('✓ Đã nạp Service Account từ biến môi trường FIREBASE_SERVICE_ACCOUNT');
  } catch (e) {
    console.error('❌ Lỗi phân tích cú pháp biến môi trường FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
}

if (!serviceAccount && fs.existsSync(keyPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    console.log(`✓ Đã nạp Service Account từ file: ${keyPath}`);
  } catch (e) {
    console.error(`❌ Lỗi đọc file khóa ${keyPath}:`, e.message);
  }
}

if (!serviceAccount) {
  console.error('\n❌ LỖI: Không tìm thấy khóa Firebase Service Account!');
  console.error('Vui lòng tải Service Account JSON từ Firebase Console > Project Settings > Service accounts');
  console.error('và lưu vào file ./service-account.json hoặc truyền qua --key <đường_dẫn> hoặc biến môi trường FIREBASE_SERVICE_ACCOUNT.\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  try {
    let targetUid = uid;
    let targetUser = null;

    if (!targetUid && email) {
      console.log(`→ Đang tìm người dùng với email: ${email}...`);
      targetUser = await admin.auth().getUserByEmail(email);
      targetUid = targetUser.uid;
    } else {
      targetUser = await admin.auth().getUser(targetUid);
    }

    console.log(`✓ Tìm thấy tài khoản:`);
    console.log(`  - UID: ${targetUser.uid}`);
    console.log(`  - Email: ${targetUser.email || '(không có)'}`);
    console.log(`  - Tên: ${targetUser.displayName || '(chưa đặt)'}`);
    console.log(`  - Claims hiện tại:`, targetUser.customClaims || {});

    const existingClaims = targetUser.customClaims || {};

    if (isRevoke) {
      const newClaims = { ...existingClaims };
      delete newClaims.admin;
      await admin.auth().setCustomUserClaims(targetUid, newClaims);
      console.log(`\n✅ THÀNH CÔNG: Đã THU HỒI quyền Admin cho UID: ${targetUid}`);
    } else {
      const newClaims = { ...existingClaims, admin: true };
      await admin.auth().setCustomUserClaims(targetUid, newClaims);
      console.log(`\n✅ THÀNH CÔNG: Đã GẮN claim { admin: true } cho tài khoản:`);
      console.log(`   UID: ${targetUid} (${targetUser.email || 'N/A'})`);
      console.log(`\nLưu ý: Nếu tài khoản đang đăng nhập, người dùng cần làm mới phiên hoặc đăng nhập lại để nhận claim mới.`);
    }

    // Xác minh lại
    const verifiedUser = await admin.auth().getUser(targetUid);
    console.log(`✓ Claims sau khi cập nhật:`, verifiedUser.customClaims);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ LỖI KHI XỬ LÝ:', err.message);
    if (err.code === 'auth/user-not-found') {
      console.error('Tài khoản chưa tồn tại trong Firebase Authentication.');
      console.error('Vui lòng vào Firebase Console > Authentication > Users > Add user để tạo trước!');
    }
    process.exit(1);
  }
}

main();
