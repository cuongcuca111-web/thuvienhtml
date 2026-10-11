// scripts/seed-payment-config.js
// Script thiết lập thông tin nhận tiền thật cho VietQR vào Firestore payment_config/main
// Chạy bằng: node scripts/seed-payment-config.js
const { initAdmin } = require('../lib/admin-auth');

async function seedPaymentConfig() {
  console.log('[Seed] Đang khởi tạo kết nối Firebase Admin...');
  const admin = initAdmin();
  const db = admin.firestore();

  const sacombankConfig = {
    mode: 'quick',
    bank: {
      bin: '970403',
      code: 'STB',
      shortName: 'Sacombank',
      name: 'Ngân hàng TMCP Sài Gòn Thương Tín',
      logo: 'https://cdn.vietqr.io/img/STB.png'
    },
    bankId: '970403',
    bankName: 'Sacombank',
    accountNo: '100071864927',
    accountName: 'LE BUI MINH CUONG',
    template: 'compact',
    expireMinutes: 15,
    orderTimeoutMinutes: 15,
    qrMode: 'quick',
    updatedAt: new Date().toISOString(),
    updatedBy: 'seed-script'
  };

  console.log('[Seed] Đang ghi cấu hình vào payment_config/main...');
  await db.doc('payment_config/main').set(sacombankConfig, { merge: true });

  console.log('[Seed] Đang đồng bộ cấu hình vào config/plans.bankTransfer...');
  const plansRef = db.doc('config/plans');
  const plansSnap = await plansRef.get();
  const oldPlans = plansSnap.exists ? plansSnap.data() : {};
  await plansRef.set({
    ...oldPlans,
    bankTransfer: {
      bankId: '970403',
      bankName: 'Sacombank',
      accountNo: '100071864927',
      accountName: 'LE BUI MINH CUONG',
      template: 'compact',
      orderTimeoutMinutes: 15,
      qrMode: 'quick',
      bank: sacombankConfig.bank
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'seed-script'
  }, { merge: true });

  console.log('✅ THÀNH CÔNG: Đã thiết lập thông tin tài khoản Sacombank (100071864927 - LE BUI MINH CUONG) vào Firestore!');
  process.exit(0);
}

seedPaymentConfig().catch(err => {
  console.error('❌ LỖI:', err.message);
  process.exit(1);
});
