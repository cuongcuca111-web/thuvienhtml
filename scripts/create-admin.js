// FIX: Tạo/cập nhật tài khoản quản trị và gán custom claim { admin: true }.
// Email và mật khẩu lấy từ biến môi trường ADMIN_EMAIL, ADMIN_PASSWORD (không ghi cứng).
// Khởi tạo bằng FIREBASE_SERVICE_ACCOUNT (JSON) nếu có, nếu không dùng thông tin mặc định của Google Cloud Shell.
const admin = require('firebase-admin');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    console.error('Thiếu biến môi trường ADMIN_EMAIL hoặc ADMIN_PASSWORD.');
    process.exit(1);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      projectId: 'thuvienhtml'
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'thuvienhtml'
    });
  }

  const auth = admin.auth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, { password, emailVerified: true, disabled: false });
    console.log('Tài khoản đã tồn tại -> đã cập nhật mật khẩu.');
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') {
      user = await auth.createUser({ email, password, emailVerified: true });
      console.log('Tài khoản chưa có -> đã tạo mới.');
    } else {
      throw err;
    }
  }

  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log('Đã gán claim admin: true');
  console.log('UID  :', user.uid);
  console.log('Email:', user.email);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Lỗi:', (err && err.code) || '', (err && err.message) || err);
  process.exit(1);
});
