function toast(msg) { if (adminContext && typeof adminContext.showToast === 'function') adminContext.showToast(msg); }
/**
 * Quản trị Hệ thống Thư viện Sách HTML (Admin Management Module)
 * Thiết kế theo phong cách Editorial, Indigo Accent, Responsive Mobile-first, Dark/Light Mode.
 * Tự vẽ toàn bộ SVG Icons nét 1.8px bo tròn, bảo mật tuyệt đối không lưu credentials.
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword, 
  signOut,
  browserSessionPersistence,
  inMemoryPersistence,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const ADMIN_LOGIN_DOMAIN = window.__ADMIN_LOGIN_DOMAIN || 'admin.thuvienhtml.app';

// Trạng thái cục bộ của bảng Quản trị (Cô lập hoàn toàn khỏi tài khoản độc giả chính)
let adminContext = null;
let adminApp = null;
let adminAuth = null;
let adminDb = null;
let currentAdminUser = null; // Phiên quản trị viên độc lập trong bộ nhớ
let currentAdminTab = 'plans';
let pendingPlansChanges = null; // Bản sao đang chỉnh sửa
let originalPlansConfig = null; // Bản gốc từ server
let plansVersion = 1;
let adminSessionTimer = null;
let lastAdminActivity = Date.now();
let adminLastAuthTime = Date.now();
const ADMIN_MAX_IDLE_MS = 60 * 60 * 1000; // 60 phút tự đăng xuất nếu không hoạt động
const ADMIN_REAUTH_MS = 15 * 60 * 1000;  // 15 phút cho thao tác nhạy cảm

// Khởi tạo LƯỜI Firebase App thứ 2 ('admin-session') và Firebase Auth riêng biệt cho khu vực Quản trị
export async function getAdminAuth() {
  if (adminAuth) return adminAuth;
  const config = (adminContext && adminContext.firebaseConfig) || window.__firebaseConfig || {
    apiKey: "AIzaSyAUBpYV3-03LxqFffabtEqIUzQ7JFn4-fo",
    authDomain: "thuvienhtml.firebaseapp.com",
    projectId: "thuvienhtml",
    storageBucket: "thuvienhtml.firebasestorage.app",
    messagingSenderId: "1053872012788",
    appId: "1:1053872012788:web:5bc528ab7f5c5f57bf8da1"
  };

  const existingApp = getApps().find(a => a.name === 'admin-session');
  adminApp = existingApp || initializeApp(config, 'admin-session');

  try {
    adminAuth = initializeAuth(adminApp, {
      persistence: [browserSessionPersistence, inMemoryPersistence]
    });
  } catch (err) {
    // Nếu initializeAuth đã được gọi trước đó trên instance này, dùng getAuth
    try {
      adminAuth = getAuth(adminApp);
    } catch (e2) {
      console.warn('[Admin] Không thể khởi tạo adminAuth:', e2);
    }
  }
  return adminAuth;
}

// Helper lấy Firestore riêng của adminApp (nếu cần truy cập Firestore trực tiếp)
export function getAdminDb() {
  if (adminDb) return adminDb;
  if (!adminApp) {
    const existingApp = getApps().find(a => a.name === 'admin-session');
    if (existingApp) adminApp = existingApp;
  }
  if (!adminApp) return null;
  try {
    adminDb = getFirestore(adminApp);
  } catch (e) {
    console.warn('[Admin] Lỗi getFirestore(adminApp):', e);
  }
  return adminDb;
}

// Kiểm tra phiên còn tươi (<15 phút) cho các thao tác nhạy cảm, yêu cầu nhập lại mật khẩu nếu quá hạn
async function ensureFreshAdminSession() {
  const now = Date.now();
  if (now - adminLastAuthTime <= ADMIN_REAUTH_MS) {
    return true;
  }
  if (!currentAdminUser || !currentAdminUser.email) return false;

  const pw = prompt("Phiên quản trị đã quá 15 phút. Vui lòng nhập lại mật khẩu quản trị để xác nhận thao tác:");
  if (!pw) return false;
  try {
    const cred = EmailAuthProvider.credential(currentAdminUser.email, pw);
    await reauthenticateWithCredential(currentAdminUser, cred);
    adminLastAuthTime = Date.now();
    lastAdminActivity = Date.now();
    return true;
  } catch (err) {
    alert("Xác thực lại thất bại: Mật khẩu không chính xác.");
    return false;
  }
}

// Biến đếm đăng nhập sai phía client
let clientFailedLogins = 0;
let clientLockUntil = 0;

// Escape HTML an toàn
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 1. KHỞI TẠO VÀ ĐIỀU PHỐI MÔ-ĐUN QUẢN TRỊ
export function initAdminSystem(ctx) {
  adminContext = ctx;
  ensureAdminModalsInDOM();
  bindGlobalAdminEvents();

  // Kiểm tra phiên Quản trị cô lập hiện tại
  if (currentAdminUser) {
    lastAdminActivity = Date.now();
    startSessionTimer();
    openAdminPanel();
  } else {
    openAdminLogin();
  }
}

// 2. TẠO HTML CÁC MODAL QUẢN TRỊ NẾU CHƯA CÓ TRONG DOM
function ensureAdminModalsInDOM() {
  if (document.getElementById('adminPanelModal')) return;

  const container = document.createElement('div');
  container.id = 'adminModalsContainer';
  container.innerHTML = `
    <!-- MODAL ĐĂNG NHẬP QUẢN TRỊ VIÊN -->
    <div id="adminLoginModal" class="modal-animated fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] hidden flex items-center justify-center p-4">
      <div class="bg-white dark:bg-[#181B20] border border-[#E7E5DF] dark:border-[#262C36] rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden">
        <div class="flex items-center justify-between pb-3 border-b border-[#E7E5DF] dark:border-[#262C36] mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Đăng nhập Quản trị</h3>
              <p class="text-[11px] text-[#6B6B66] dark:text-[#9AA3B2]">Khu vực dành cho chủ trang web Thư viện Sách</p>
            </div>
          </div>
          <button id="btnCloseAdminLogin" class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="adminLoginErrorBanner" class="hidden mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
        </div>

        <form id="adminLoginForm" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-[#4A4843] dark:text-[#A8A49C] mb-1.5">Tên đăng nhập quản trị</label>
            <input type="text" id="adminUsernameInput" autocomplete="username" required placeholder="minhcuong111" class="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D2CA] dark:border-[#38352F] bg-[#FAF8F5] dark:bg-[#1F2228] text-sm text-[#1C1B18] dark:text-[#E8E6E1] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#4A4843] dark:text-[#A8A49C] mb-1.5">Mật khẩu</label>
            <div class="relative">
              <input type="password" id="adminPasswordInput" autocomplete="current-password" required placeholder="••••••••" class="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#D5D2CA] dark:border-[#38352F] bg-[#FAF8F5] dark:bg-[#1F2228] text-sm text-[#1C1B18] dark:text-[#E8E6E1] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium" />
              <button type="button" id="btnToggleAdminPassword" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Hiện/ẩn mật khẩu">
                <svg id="iconEyeOpen" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg id="iconEyeClosed" class="w-4 h-4 hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button type="button" id="btnCancelAdminLogin" class="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Quay về thư viện
            </button>
            <button type="submit" id="btnSubmitAdminLogin" class="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5">
              <span>Đăng nhập</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL KHU VỰC QUẢN TRỊ CHÍNH (EDITORIAL DASHBOARD) -->
    <div id="adminPanelModal" class="modal-animated fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] hidden flex items-center justify-center p-0 sm:p-4">
      <div class="bg-[#F8F7F4] dark:bg-[#14171C] border-none sm:border border-[#E0DED7] dark:border-[#262C36] sm:rounded-2xl shadow-2xl w-full max-w-6xl h-full sm:h-[92vh] max-h-[100dvh] flex flex-col overflow-hidden">
        
        <!-- HEADER THANH ĐIỀU HƯỚNG QUẢN TRỊ -->
        <header class="px-4 sm:px-6 py-3 bg-white dark:bg-[#1A1D23] border-b border-[#E0DED7] dark:border-[#262C36] flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 id="adminHeaderTitle" class="font-serif text-base sm:text-lg font-bold text-[#1C1B18] dark:text-[#E8E6E1] leading-tight">Phiên quản trị (minhcuong111)</h2>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Admin Session</span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-[#78756D] dark:text-[#9AA3B2] flex-wrap">
                <span id="adminMainUserIndicator" class="font-medium text-emerald-600 dark:text-emerald-400">Bạn vẫn đang dùng tài khoản Khách</span>
                <span>•</span>
                <span class="inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Phiên: <strong id="adminSessionCountdown">60:00</strong></span>
                <span>•</span>
                <span id="adminCurrentVersionBadge">v1</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button id="btnAdminRefresh" class="p-2 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition" title="Làm mới dữ liệu">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            <button id="btnCloseAdminPanel" class="px-3.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              Về Thư viện
            </button>
            <button id="btnAdminLogout" class="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition">
              Đăng xuất
            </button>
          </div>
        </header>

        <!-- THANH TABBAR ĐIỀU HƯỚNG 5 MỤC (CUỘN NGANG MOBILE, DỌC HOẶC THANH GỌN TRÊN DESKTOP) -->
        <nav class="bg-white/80 dark:bg-[#1A1D23]/80 backdrop-blur-md px-4 sm:px-6 py-2 border-b border-[#E0DED7] dark:border-[#262C36] flex items-center gap-1.5 overflow-x-auto shrink-0 select-none no-scrollbar">
          <button data-tab="plans" class="admin-tab-btn active px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
            <span>Hạn mức các gói</span>
          </button>
          <button data-tab="pricing" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span>Giá &amp; gói</span>
          </button>
          <button data-tab="users" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Người dùng</span>
          </button>
          <button data-tab="codes" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L14 9l-3 3-3-3-4.5 4.5a3.5 3.5 0 1 0 5 5L13 14l1.5-1.5 2 2 2-2-1.5-1.5 4-4z"/></svg>
            <span>Mã kích hoạt</span>
          </button>
          <button data-tab="audit" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Nhật ký (Audit)</span>
          </button>
          <button data-tab="billing" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            <span>Thanh toán VietQR</span>
            <span id="adminPendingOrdersDot" class="w-2 h-2 rounded-full bg-rose-500 hidden animate-pulse"></span>
          </button>
          <button data-tab="ai" class="admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>
            <span>AI &amp; API key</span>
          </button>
        </nav>

        <!-- VÙNG NỘI DUNG CUỘN TRANG CỦA TAB HIỆN TẠI -->
        <main id="adminTabContentContainer" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <!-- Nội dung render động qua JavaScript -->
        </main>
      </div>
    </div>
  `;

  document.body.appendChild(container);
}

// 3. GẮN SỰ KIỆN TOÀN CỤC CHO KHU VỰC QUẢN TRỊ
function bindGlobalAdminEvents() {
  // Đóng modal đăng nhập
  const btnCloseLogin = document.getElementById('btnCloseAdminLogin');
  if (btnCloseLogin) btnCloseLogin.onclick = closeAdminLogin;
  const btnCancelLogin = document.getElementById('btnCancelAdminLogin');
  if (btnCancelLogin) btnCancelLogin.onclick = closeAdminLogin;

  // Toggle hiện mật khẩu
  const btnTogglePw = document.getElementById('btnToggleAdminPassword');
  if (btnTogglePw) {
    btnTogglePw.onclick = () => {
      const pwInput = document.getElementById('adminPasswordInput');
      const eyeOpen = document.getElementById('iconEyeOpen');
      const eyeClosed = document.getElementById('iconEyeClosed');
      if (pwInput.type === 'password') {
        pwInput.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
      } else {
        pwInput.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
      }
    };
  }

  // Submit đăng nhập
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.onsubmit = handleAdminLoginSubmit;
  }

  // Đóng bảng quản trị
  const btnClosePanel = document.getElementById('btnCloseAdminPanel');
  if (btnClosePanel) btnClosePanel.onclick = closeAdminPanel;

  // Đăng xuất quản trị
  const btnLogout = document.getElementById('btnAdminLogout');
  if (btnLogout) btnLogout.onclick = handleAdminLogout;

  // Làm mới dữ liệu
  const btnRefresh = document.getElementById('btnAdminRefresh');
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      loadTabData(currentAdminTab);
      toast("Đã làm mới dữ liệu");
    };
  }

  // Chuyển Tab
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    };
  });

  // Ghi nhận hoạt động người dùng để duy trì phiên
  ['mousedown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (currentAdminUser) {
        lastAdminActivity = Date.now();
      }
    }, { passive: true });
  });

  // Đóng modal khi bấm nền mờ bên ngoài (backdrop click)
  const panelModal = document.getElementById('adminPanelModal');
  if (panelModal) {
    panelModal.onclick = (e) => {
      if (e.target === panelModal) {
        closeAdminPanel();
      }
    };
  }
  const loginModal = document.getElementById('adminLoginModal');
  if (loginModal) {
    loginModal.onclick = (e) => {
      if (e.target === loginModal) {
        closeAdminLogin();
      }
    };
  }

  // Đóng modal quản trị khi bấm phím Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const loginModal = document.getElementById('adminLoginModal');
      if (loginModal && !loginModal.classList.contains('hidden')) {
        closeAdminLogin();
        return;
      }
      const panelModal = document.getElementById('adminPanelModal');
      if (panelModal && !panelModal.classList.contains('hidden')) {
        closeAdminPanel();
      }
    }
  });
}

// 4. MỞ VÀ ĐÓNG MODAL
export function openAdminLogin() {
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    if (modal._closeTimer) {
      clearTimeout(modal._closeTimer);
      modal._closeTimer = null;
    }
    modal.classList.remove('hidden', 'modal-closing');
    void modal.offsetWidth; // Force reflow
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';

    const input = document.getElementById('adminUsernameInput');
    if (input) {
      if (!input.value) input.value = 'minhcuong111';
      input.focus();
    }
  }
}

export function closeAdminLogin() {
  const pwInput = document.getElementById('adminPasswordInput');
  if (pwInput) pwInput.value = '';
  const modal = document.getElementById('adminLoginModal');
  if (modal) {
    modal.classList.remove('modal-active');
    modal.classList.add('modal-closing');
    if (modal._closeTimer) clearTimeout(modal._closeTimer);
    modal._closeTimer = setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('modal-closing');
      modal._closeTimer = null;
      const anyActive = document.querySelector('.modal-animated.modal-active');
      if (!anyActive) document.body.style.overflow = '';
    }, 220);
  }
  if (window.location.hash === '#/admin') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export function openAdminPanel() {
  closeAdminLogin();
  const panel = document.getElementById('adminPanelModal');
  if (panel) {
    if (panel._closeTimer) {
      clearTimeout(panel._closeTimer);
      panel._closeTimer = null;
    }

    // Cập nhật thông tin Header lớp phủ
    const adminUsername = (currentAdminUser && currentAdminUser.email) 
      ? currentAdminUser.email.split('@')[0] 
      : 'minhcuong111';
    const headerTitleEl = document.getElementById('adminHeaderTitle');
    if (headerTitleEl) {
      headerTitleEl.innerText = `Phiên quản trị (${adminUsername})`;
    }

    const mainUserIndicator = document.getElementById('adminMainUserIndicator');
    if (mainUserIndicator) {
      const mainUser = adminContext && adminContext.state && adminContext.state.user;
      let mainName = 'Khách';
      if (mainUser && !mainUser.isAnonymous) {
        mainName = mainUser.displayName || (mainUser.email ? mainUser.email.split('@')[0] : 'đã đăng nhập');
      }
      mainUserIndicator.innerText = `Bạn vẫn đang dùng tài khoản ${mainName}`;
    }

    panel.classList.remove('hidden', 'modal-closing');
    void panel.offsetWidth;
    panel.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    switchTab('plans');

    // Tự động tải trước danh sách người dùng đã đăng ký để sẵn sàng tức thì
    try {
      if (typeof preloadRecentUsers === 'function') preloadRecentUsers(true);
    } catch (_) {}

    // Bắt đầu chu kỳ tự động cập nhật ngầm mỗi 5 phút một lần
    if (usersAutoRefreshTimer) clearInterval(usersAutoRefreshTimer);
    usersAutoRefreshTimer = setInterval(() => {
      try {
        if (typeof preloadRecentUsers === 'function') preloadRecentUsers(true);
      } catch (_) {}
    }, 5 * 60 * 1000);
  }
}

// Xóa sạch phiên quản trị, thu hồi credentials và làm sạch bộ nhớ
export async function endAdminSession() {
  currentAdminUser = null;
  if (adminSessionTimer) {
    clearInterval(adminSessionTimer);
    adminSessionTimer = null;
  }
  if (usersAutoRefreshTimer) {
    clearInterval(usersAutoRefreshTimer);
    usersAutoRefreshTimer = null;
  }
  if (adminAuth) {
    try {
      await signOut(adminAuth);
    } catch (e) {
      console.warn("[Admin] Lỗi signOut adminAuth:", e);
    }
  }
  const pwInput = document.getElementById('adminPasswordInput');
  if (pwInput) pwInput.value = '';
}

export async function closeAdminPanel() {
  await endAdminSession();
  const panel = document.getElementById('adminPanelModal');
  if (panel) {
    panel.classList.remove('modal-active');
    panel.classList.add('modal-closing');
    if (panel._closeTimer) clearTimeout(panel._closeTimer);
    panel._closeTimer = setTimeout(() => {
      panel.classList.add('hidden');
      panel.classList.remove('modal-closing');
      panel._closeTimer = null;
      const anyActive = document.querySelector('.modal-animated.modal-active');
      if (!anyActive) document.body.style.overflow = '';
    }, 220);
  }
  if (window.location.hash === '#/admin') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// 5. XỬ LÝ ĐĂNG NHẬP ADMIN VỚI RATE LIMIT VÀ CUSTOM CLAIM VERIFICATION
async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const errBanner = document.getElementById('adminLoginErrorBanner');
  errBanner.classList.add('hidden');

  // Kiểm tra khóa tạm client-side
  const now = Date.now();
  if (now < clientLockUntil) {
    const minsLeft = Math.ceil((clientLockUntil - now) / 60000);
    errBanner.innerText = `Tạm thời bị khóa do thử sai quá nhiều lần. Vui lòng đợi ${minsLeft} phút.`;
    errBanner.classList.remove('hidden');
    return;
  }

  // // FIX: Chuẩn hóa tên đăng nhập (bỏ khoảng trắng đầu/cuối, không phân biệt hoa thường); KHÔNG cắt mật khẩu
  const usernameInput = document.getElementById('adminUsernameInput').value.trim().toLowerCase();
  const password = document.getElementById('adminPasswordInput').value;
  const submitBtn = document.getElementById('btnSubmitAdminLogin');

  if (!usernameInput || !password) return;

  submitBtn.disabled = true;
  submitBtn.innerText = 'Đang xác thực...';

  try {
    const authInstance = await getAdminAuth();
    const email = usernameInput.includes('@') ? usernameInput : `${usernameInput}@${ADMIN_LOGIN_DOMAIN}`;
    const userCred = await signInWithEmailAndPassword(authInstance, email, password);
    const user = userCred.user;

    // Buộc lấy lại token mới nhất từ server để kiểm tra claim admin
    const idTokenResult = await user.getIdTokenResult(true);

    if (idTokenResult.claims && idTokenResult.claims.admin === true) {
      // ĐĂNG NHẬP THÀNH CÔNG VỚI QUYỀN ADMIN TRONG PHIÊN CÔ LẬP
      // TUYỆT ĐỐI KHÔNG ghi đè tài khoản người dùng đang đọc sách (state.user/state.userId)
      clientFailedLogins = 0;
      currentAdminUser = user;
      lastAdminActivity = Date.now();
      adminLastAuthTime = Date.now();

      startSessionTimer();
      openAdminPanel();
      toast("Đăng nhập quản trị thành công!");
    } else {
      // Tài khoản không có claim admin -> Lập tức đăng xuất phiên admin cô lập
      if (authInstance) await signOut(authInstance);
      currentAdminUser = null;
      recordClientFailedLogin();
      errBanner.innerText = "Sai thông tin đăng nhập";
      errBanner.classList.remove('hidden');
      return;
    }
  } catch (err) {
    // // FIX: Ghi mã lỗi Firebase thật ra console để dễ gỡ lỗi; giao diện vẫn chỉ hiện thông báo chung
    console.error('[Admin] Đăng nhập thất bại:', (err && err.code) || (err && err.message) || err);
    recordClientFailedLogin();
    errBanner.innerText = "Sai thông tin đăng nhập";
    errBanner.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Đăng nhập';
  }
}

function recordClientFailedLogin() {
  clientFailedLogins += 1;
  if (clientFailedLogins >= 5) {
    clientLockUntil = Date.now() + 15 * 60 * 1000;
  }
}

async function handleAdminLogout() {
  if (confirm("Bạn có chắc chắn muốn kết thúc phiên Quản trị?")) {
    await endAdminSession();
    closeAdminPanel();
    toast("Đã kết thúc phiên quản trị");
  }
}

function startSessionTimer() {
  clearInterval(adminSessionTimer);
  adminSessionTimer = setInterval(() => {
    const elapsed = Date.now() - lastAdminActivity;
    const remaining = ADMIN_MAX_IDLE_MS - elapsed;

    if (remaining <= 0) {
      clearInterval(adminSessionTimer);
      currentAdminUser = null;
      if (adminAuth) {
        signOut(adminAuth).catch(() => {});
      }
      closeAdminPanel();
      const btnAdminInMenu = document.getElementById('btnOpenAdminPanel');
      if (btnAdminInMenu) btnAdminInMenu.classList.add('hidden');
      alert("Phiên quản trị đã hết hạn do không hoạt động trong 60 phút. Vui lòng đăng nhập lại.");
      return;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const el = document.getElementById('adminSessionCountdown');
    if (el) el.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

// 6. CHUYỂN TAB VÀ RENDER DỮ LIỆU TỪNG MỤC
function switchTab(tabName) {
  currentAdminTab = tabName;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-tab') === tabName;
    if (isTarget) {
      btn.className = "admin-tab-btn active px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300";
    } else {
      btn.className = "admin-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800";
    }
  });

  loadTabData(tabName);
}

function loadTabData(tabName) {
  const container = document.getElementById('adminTabContentContainer');
  if (!container) return;

  switch (tabName) {
    case 'plans':
      renderPlansTab(container);
      break;
    case 'pricing':
      renderPricingTab(container);
      break;
    case 'users':
      renderUsersTab(container);
      break;
    case 'codes':
      renderCodesTab(container);
      break;
    case 'audit':
      renderAuditTab(container);
      break;
    case 'ai':
      renderAiTab(container);
      break;
    case 'billing':
      renderBillingTab(container);
      break;
  }
}

// HELPER GỌI API ADMIN BẰNG TOKEN TỪ PHIÊN ADMINAUTH ĐỘC LẬP
export async function adminFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const isSensitive = !path.includes('/test-qr') && !path.includes('/ai/test');
    if (isSensitive) {
      const isFresh = await ensureFreshAdminSession();
      if (!isFresh) {
        throw new Error('Thao tác bị hủy: Phiên quản trị cần xác thực lại mật khẩu.');
      }
    }
  }

  const adminUser = currentAdminUser || (adminAuth && adminAuth.currentUser);
  if (!adminUser) {
    throw new Error('Chưa đăng nhập quyền quản trị hoặc phiên đã kết thúc.');
  }
  const token = await adminUser.getIdToken(false);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const res = await fetch(path, { ...options, headers });
  if (res.status === 403 || res.status === 401) {
    throw new Error('Phiên quản trị không hợp lệ hoặc đã hết hạn.');
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}
const callAdminApi = adminFetch;

// =========================================================================
// 3.1 MỤC 1: HẠN MỨC CÁC GÓI (PLANS LIMITS MANAGEMENT)
// =========================================================================
const TIERS = ['guest', 'free', 'plus', 'pro'];
const TIER_NAMES = { guest: 'Khách', free: 'Thường', plus: 'Plus', pro: 'Pro' };

const PARAM_DEFS = [
  { key: 'maxLessons', label: 'Số bài học tối đa', desc: 'Giới hạn số lượng file/bài học trong thư viện', type: 'number', min: 0, max: 100000, step: 5, allowUnlimited: true },
  { key: 'maxSections', label: 'Số mục / folder', desc: 'Số lượng danh mục bài học tối đa', type: 'number', min: 0, max: 1000, step: 1, allowUnlimited: true },
  { key: 'maxFileKB', label: 'Dung lượng mỗi bài (KB)', desc: 'Kích thước tối đa của mỗi file HTML', type: 'number', min: 64, max: 2048, step: 64, allowUnlimited: false },
  { key: 'maxActiveShares', label: 'Số link chia sẻ đang chạy', desc: 'Số liên kết chia sẻ công khai cùng lúc', type: 'number', min: 0, max: 500, step: 1, allowUnlimited: true },
  { key: 'shareDays', label: 'Thời hạn link được chọn', desc: 'Các mức ngày cho phép khi tạo link chia sẻ', type: 'chips', options: [1, 7, 30, 90] },
  { key: 'canExtendShare', label: 'Cho phép gia hạn link', desc: 'Gia hạn thêm ngày cho link sắp hết hạn', type: 'boolean' },
  { key: 'sharePassword', label: 'Mật khẩu bảo vệ link', desc: 'Khóa link chia sẻ bằng mật khẩu riêng', type: 'boolean' },
  { key: 'frameColors', label: 'Chọn màu khung', desc: 'Cho phép chọn các màu viền khung khác ngoài màu cam (Xanh, Hồng, Tím)', type: 'boolean' },
  { key: 'customColor', label: 'Tùy biến màu khung & note', desc: 'Chọn màu khung và đánh dấu theo ý muốn', type: 'boolean' },
  { key: 'exportNotesMd', label: 'Xuất ghi chú sang .md', desc: 'Xuất tất cả ghi chú ra định dạng Markdown', type: 'boolean' },
  { key: 'trashDays', label: 'Số ngày lưu thùng rác', desc: 'Tự động dọn dẹp sau số ngày quy định', type: 'number', min: 0, max: 365, step: 1, allowUnlimited: false },
  { key: 'statsDays', label: 'Số ngày lưu thống kê', desc: 'Phạm vi lưu trữ biểu đồ và lịch sử học tập', type: 'number', min: 1, max: 3650, step: 7, allowUnlimited: true },
  { key: 'fullTextSearch', label: 'Tìm kiếm văn bản (Search)', desc: 'Mở khóa tính năng tìm kiếm bài học & tra cứu từ khóa trong văn bản', type: 'boolean' },
  { key: 'monthlyAiRequests', label: 'Lượt AI mỗi tháng', desc: 'Số lượt gọi AI tối đa hàng tháng (-1 = Vô hạn)', type: 'number', min: 0, max: 100000, step: 10, allowUnlimited: true },
  { key: 'maxFlashcardsPerFile', label: 'Flashcard tối đa / bài', desc: 'Số lượng thẻ tối đa tự sinh cho mỗi file HTML', type: 'number', min: 1, max: 200, step: 5, allowUnlimited: true },
  { key: 'aiScheduleEnabled', label: 'Bật Lịch thông minh (AI)', desc: 'Cho phép AI ước tính độ khó và chia lịch học', type: 'boolean' },
  { key: 'aiFlashcardsEnabled', label: 'Bật Tự sinh Flashcard (AI)', desc: 'Cho phép AI tạo câu hỏi ôn tập theo bài', type: 'boolean' }
];

let isPlansInitializedFromServer = false;

function renderShortParamValue(param, val) {
  if (param.type === 'boolean') {
    return val ? '✓ Bật' : '✗ Tắt';
  }
  if (param.type === 'chips') {
    return Array.isArray(val) ? `${Math.max(...val, 0)}d` : `${val}d`;
  }
  if (val === -1 || val === null || val === 'unlimited') return '∞';
  if (param.key === 'maxFileKB') return val >= 1024 ? `${val / 1024}MB` : `${val}KB`;
  return String(val ?? 0);
}

const DEFAULT_PINNED_MAP = {
  guest: ['maxLessons', 'maxSections', 'maxActiveShares'],
  free: ['maxLessons', 'maxSections', 'maxActiveShares'],
  plus: ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword'],
  pro: ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword', 'monthlyAiRequests', 'fullTextSearch']
};
const DEFAULT_DESC_MAP = {
  guest: 'Dành cho khách vãng lai trải nghiệm nhanh.',
  free: 'Dành cho người mới bắt đầu trải nghiệm thư viện bài học.',
  plus: 'Tối ưu cho cá nhân học tập chuyên cần và thường xuyên.',
  pro: 'Đầy đủ quyền lợi cao cấp nhất cùng AI mở rộng.'
};

async function renderPlansTab(container) {
  // Lần đầu mở tab: tự động tải cấu hình thực tế từ Firestore về để đảm bảo dữ liệu mới nhất
  if (!isPlansInitializedFromServer) {
    try {
      const currentRes = await callAdminApi('/api/admin/plans/current').catch(() => null);
      if (currentRes && currentRes.plans && Object.keys(currentRes.plans).length > 0) {
        if (!adminContext.effectivePlans) adminContext.effectivePlans = {};
        adminContext.effectivePlans.plans = currentRes.plans;
        adminContext.effectivePlans.version = currentRes.version || 1;
        plansVersion = currentRes.version || 1;
        originalPlansConfig = JSON.parse(JSON.stringify(currentRes.plans));
        pendingPlansChanges = JSON.parse(JSON.stringify(currentRes.plans));
        isPlansInitializedFromServer = true;
      }
    } catch (e) {}
  }

  const currentConfig = adminContext.effectivePlans || {};
  plansVersion = plansVersion || currentConfig.version || 1;
  if (!originalPlansConfig) {
    originalPlansConfig = JSON.parse(JSON.stringify(currentConfig.plans || {}));
  }
  if (!pendingPlansChanges) {
    pendingPlansChanges = JSON.parse(JSON.stringify(originalPlansConfig));
  }

  TIERS.forEach(t => {
    if (originalPlansConfig[t]) {
      if (!Array.isArray(originalPlansConfig[t].pinnedFeatures)) originalPlansConfig[t].pinnedFeatures = [...(DEFAULT_PINNED_MAP[t] || [])];
      if (originalPlansConfig[t].description === undefined) originalPlansConfig[t].description = DEFAULT_DESC_MAP[t] || '';
      if (!Array.isArray(originalPlansConfig[t].customFeatures)) originalPlansConfig[t].customFeatures = [];
    }
    if (pendingPlansChanges[t]) {
      if (!Array.isArray(pendingPlansChanges[t].pinnedFeatures)) pendingPlansChanges[t].pinnedFeatures = [...(DEFAULT_PINNED_MAP[t] || [])];
      if (pendingPlansChanges[t].description === undefined) pendingPlansChanges[t].description = DEFAULT_DESC_MAP[t] || '';
      if (!Array.isArray(pendingPlansChanges[t].customFeatures)) pendingPlansChanges[t].customFeatures = [];
    }
  });

  const verBadge = document.getElementById('adminCurrentVersionBadge');
  if (verBadge) verBadge.innerText = `Cấu hình: v${plansVersion}`;

  container.innerHTML = `
    <!-- THANH CÔNG CỤ THAO TÁC TRÊN ĐỈNH -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1A1D23] p-4 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs">
      <div>
        <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Bảng thông số &amp; Hạn mức 4 gói</h3>
        <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Thay đổi có hiệu lực tức thì trên toàn bộ ứng dụng người dùng thông qua Firestore Realtime.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button id="btnResetAllPlans" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1 cursor-pointer">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Đặt lại mặc định</span>
        </button>
        <button id="btnUndoPlans" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer" disabled>
          Hoàn tác
        </button>
        <button id="btnSavePlans" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer">
          <span>Lưu thay đổi</span>
        </button>
      </div>
    </div>

    <!-- KHUNG XEM TRƯỚC TÁC ĐỘNG & CẢNH BÁO XUNG ĐỘT -->
    <div id="plansImpactBox" class="hidden p-4 rounded-xl border text-xs"></div>

    <!-- BẢNG MA TRẬN 4 CỘT -->
    <div class="bg-white dark:bg-[#1A1D23] rounded-xl border border-[#E0DED7] dark:border-[#262C36] overflow-x-auto shadow-2xs">
      <table class="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr class="border-b border-[#E0DED7] dark:border-[#262C36] bg-[#FAF8F5] dark:bg-[#171A20]">
            <th class="py-3 px-4 text-xs font-bold text-[#4A4843] dark:text-[#A8A49C] w-[260px]">Thông số / Tính năng</th>
            ${TIERS.map(t => `
              <th class="py-3 px-3 text-xs font-bold text-center border-l border-[#E0DED7] dark:border-[#262C36]">
                <div class="flex items-center justify-center gap-1.5">
                  <span class="text-indigo-600 dark:text-indigo-400 font-serif text-sm">${TIER_NAMES[t]}</span>
                  <button class="btn-reset-col text-[10px] text-gray-400 hover:text-indigo-600" data-tier="${t}" title="Đặt lại cột ${TIER_NAMES[t]} về mặc định">↺</button>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-[#E0DED7] dark:divide-[#262C36] text-xs">
          ${PARAM_DEFS.map(p => `
            <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition">
              <td class="py-3 px-4">
                <div class="font-semibold text-[#1C1B18] dark:text-[#E8E6E1]">${esc(p.label)}</div>
                <div class="text-[11px] text-[#78756D] dark:text-[#9AA3B2]">${esc(p.desc)}</div>
              </td>
              ${TIERS.map(t => `
                <td class="py-2.5 px-3 border-l border-[#E0DED7] dark:border-[#262C36] text-center align-middle">
                  ${renderParamCell(p, t, (pendingPlansChanges[t] ? pendingPlansChanges[t][p.key] : undefined))}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- MỤC TÙY CHỈNH GHIM TÍNH NĂNG NỔI BẬT & MÔ TẢ HIỂN THỊ TRÊN THẺ GÓI -->
    <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">📌</span>
          <h4 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Tùy chỉnh Ghim tính năng nổi bật &amp; Mô tả hiển thị trên thẻ gói</h4>
        </div>
        <p class="text-xs text-[#78756D] dark:text-[#9AA3B2] mt-1">
          Tùy chọn thông số hoặc quyền lợi nào sẽ xuất hiện trên từng thẻ gói ở màn hình Chọn gói của người dùng. Bạn có thể ghim ít tính năng cho gói Thường, ghim nhiều hơn cho gói Pro, và thêm các dòng quyền lợi riêng biệt.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        ${['free', 'plus', 'pro'].map(tier => {
          const tierPlan = (pendingPlansChanges && pendingPlansChanges[tier]) || {};
          const currentDesc = tierPlan.description !== undefined ? tierPlan.description : (
            tier === 'free' ? 'Dành cho người mới bắt đầu trải nghiệm thư viện bài học.' :
            (tier === 'plus' ? 'Tối ưu cho cá nhân học tập chuyên cần và thường xuyên.' : 'Đầy đủ quyền lợi cao cấp nhất cùng AI mở rộng.')
          );
          const currentPins = Array.isArray(tierPlan.pinnedFeatures) && tierPlan.pinnedFeatures.length > 0 ? tierPlan.pinnedFeatures : (
            tier === 'free' ? ['maxLessons', 'maxSections', 'maxActiveShares'] :
            (tier === 'plus' ? ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword'] :
            ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword', 'monthlyAiRequests', 'fullTextSearch'])
          );
          const customLines = Array.isArray(tierPlan.customFeatures) ? tierPlan.customFeatures.join('\n') : '';

          const tierTheme = tier === 'free' ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#161920]' :
                            (tier === 'plus' ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20' :
                            'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/20');
          const tierBadgeColor = tier === 'free' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                                 (tier === 'plus' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' :
                                 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300');

          return `
            <div class="p-4 rounded-xl border ${tierTheme} flex flex-col gap-3.5">
              <div class="flex items-center justify-between">
                <span class="font-serif font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1] flex items-center gap-1.5">
                  Gói ${TIER_NAMES[tier]}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${tierBadgeColor}" id="pinnedCountBadge_${tier}">
                  ${currentPins.length} tính năng ghim
                </span>
              </div>

              <!-- Mô tả gói -->
              <div>
                <label class="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mô tả ngắn thẻ gói:
                </label>
                <textarea rows="2" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D23] text-[#1C1B18] dark:text-[#E8E6E1] focus:ring-1 focus:ring-indigo-500 plan-desc-input" data-tier="${tier}" placeholder="Nhập câu mô tả ngắn...">${esc(currentDesc)}</textarea>
              </div>

              <!-- Chọn tính năng ghim từ 16 thông số -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                    Chọn thông số ghim lên thẻ:
                  </label>
                  <span class="text-[10px] text-gray-400">Tích để hiện</span>
                </div>
                <div class="max-h-56 overflow-y-auto space-y-1 pr-1 border border-gray-200 dark:border-gray-800 rounded-lg p-2 bg-white dark:bg-[#1A1D23]">
                  ${PARAM_DEFS.map(p => {
                    const isPinned = currentPins.includes(p.key);
                    return `
                      <label class="flex items-center justify-between p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-[11px]">
                        <span class="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                          <input type="checkbox" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 plan-pin-cb" data-tier="${tier}" data-key="${p.key}" ${isPinned ? 'checked' : ''}>
                          <span>${esc(p.label)}</span>
                        </span>
                        <span class="text-[10px] font-mono text-gray-400">
                          ${renderShortParamValue(p, tierPlan[p.key])}
                        </span>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Thêm các dòng tùy chỉnh bổ sung -->
              <div>
                <label class="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Thêm dòng quyền lợi riêng (mỗi dòng 1 gạch đầu dòng):
                </label>
                <textarea rows="2" class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D23] text-[#1C1B18] dark:text-[#E8E6E1] focus:ring-1 focus:ring-indigo-500 plan-custom-features-input" data-tier="${tier}" placeholder="Ví dụ:&#10;Hỗ trợ kỹ thuật 24/7&#10;Huy hiệu VIP">${esc(customLines)}</textarea>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- MỤC LỊCH SỬ THAY ĐỔI 10 BẢN GẦN NHẤT -->
    <div class="bg-white dark:bg-[#1A1D23] p-4 rounded-xl border border-[#E0DED7] dark:border-[#262C36]">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Lịch sử thay đổi gần đây</h4>
        <button id="btnLoadPlansHistory" class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Tải lịch sử</button>
      </div>
      <div id="plansHistoryList" class="text-xs text-gray-500">Nhấn "Tải lịch sử" để xem 10 bản lưu trước đó.</div>
    </div>
  `;

  bindPlansTableEvents(container);
  updatePlansImpact();
}

function renderParamCell(param, tier, val) {
  if (param.type === 'boolean') {
    const checked = Boolean(val);
    return `
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" class="sr-only peer plan-bool-input" data-tier="${tier}" data-key="${param.key}" ${checked ? 'checked' : ''}>
        <div class="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
      </label>
    `;
  }

  if (param.type === 'chips') {
    const arr = Array.isArray(val) ? val : [];
    return `
      <div class="flex flex-wrap items-center justify-center gap-1">
        ${param.options.map(opt => `
          <button type="button" class="plan-chip-btn px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${arr.includes(opt) ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' : 'bg-transparent text-gray-400 border-gray-200 dark:border-gray-700'}" data-tier="${tier}" data-key="${param.key}" data-val="${opt}">
            ${opt}d
          </button>
        `).join('')}
      </div>
    `;
  }

  if (param.type === 'number') {
    const isUnlimited = (val === -1 || val === null || val === 'unlimited');
    const displayNum = isUnlimited ? 0 : (parseInt(val, 10) || 0);

    return `
      <div class="flex flex-col items-center gap-1">
        <div class="flex items-center justify-center gap-1 ${isUnlimited ? 'opacity-40 pointer-events-none' : ''}">
          <button type="button" class="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 plan-num-step" data-tier="${tier}" data-key="${param.key}" data-dir="-1" data-step="${param.step}">−</button>
          <input type="number" class="w-14 text-center py-0.5 px-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D23] font-mono text-xs plan-num-input" data-tier="${tier}" data-key="${param.key}" min="${param.min}" max="${param.max}" value="${displayNum}" />
          <button type="button" class="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 plan-num-step" data-tier="${tier}" data-key="${param.key}" data-dir="1" data-step="${param.step}">+</button>
        </div>
        ${param.allowUnlimited ? `
          <label class="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
            <input type="checkbox" class="plan-unlimited-checkbox rounded border-gray-300" data-tier="${tier}" data-key="${param.key}" ${isUnlimited ? 'checked' : ''} />
            <span>Vô hạn (∞)</span>
          </label>
        ` : ''}
      </div>
    `;
  }

  return '';
}

function bindPlansTableEvents(container) {
  // Thay đổi số (lắng nghe cả oninput và onchange)
  container.querySelectorAll('.plan-num-input').forEach(input => {
    const handleNumChange = (e) => {
      const { tier, key } = e.target.dataset;
      pendingPlansChanges[tier][key] = parseInt(e.target.value, 10) || 0;
      updatePlansImpact();
    };
    input.oninput = handleNumChange;
    input.onchange = handleNumChange;
  });

  // Nút tăng giảm +/-
  container.querySelectorAll('.plan-num-step').forEach(btn => {
    btn.onclick = (e) => {
      const { tier, key, dir, step } = btn.dataset;
      const input = container.querySelector(`.plan-num-input[data-tier="${tier}"][data-key="${key}"]`);
      if (input) {
        let v = (parseInt(input.value, 10) || 0) + (parseInt(dir, 10) * parseInt(step, 10));
        const min = parseInt(input.min, 10);
        const max = parseInt(input.max, 10);
        if (v < min) v = min;
        if (v > max) v = max;
        input.value = v;
        pendingPlansChanges[tier][key] = v;
        updatePlansImpact();
      }
    };
  });

  // Checkbox Vô hạn (∞)
  container.querySelectorAll('.plan-unlimited-checkbox').forEach(cb => {
    cb.onchange = (e) => {
      const { tier, key } = e.target.dataset;
      const isUnlimited = e.target.checked;
      const input = container.querySelector(`.plan-num-input[data-tier="${tier}"][data-key="${key}"]`);
      if (isUnlimited) {
        pendingPlansChanges[tier][key] = -1;
      } else {
        pendingPlansChanges[tier][key] = parseInt(input.value, 10) || 10;
      }
      renderPlansTab(container);
    };
  });

  // Boolean switch
  container.querySelectorAll('.plan-bool-input').forEach(cb => {
    cb.onchange = (e) => {
      const { tier, key } = e.target.dataset;
      pendingPlansChanges[tier][key] = e.target.checked;
      updatePlansImpact();
    };
  });

  // Chips thời hạn
  container.querySelectorAll('.plan-chip-btn').forEach(btn => {
    btn.onclick = () => {
      const { tier, key, val } = btn.dataset;
      const numVal = parseInt(val, 10);
      let list = pendingPlansChanges[tier][key] || [];
      if (list.includes(numVal)) {
        list = list.filter(x => x !== numVal);
      } else {
        list.push(numVal);
        list.sort((a, b) => a - b);
      }
      if (list.length === 0) list = [1, 7];
      pendingPlansChanges[tier][key] = list;
      renderPlansTab(container);
    };
  });

  // Lắng nghe thay đổi mô tả gói
  container.querySelectorAll('.plan-desc-input').forEach(textarea => {
    const handleDescChange = (e) => {
      const { tier } = e.target.dataset;
      if (!pendingPlansChanges[tier]) pendingPlansChanges[tier] = {};
      pendingPlansChanges[tier].description = e.target.value.trim();
      updatePlansImpact();
    };
    textarea.oninput = handleDescChange;
    textarea.onchange = handleDescChange;
  });

  // Lắng nghe thay đổi checkbox ghim tính năng
  container.querySelectorAll('.plan-pin-cb').forEach(cb => {
    cb.onchange = (e) => {
      const { tier, key } = e.target.dataset;
      if (!pendingPlansChanges[tier]) pendingPlansChanges[tier] = {};
      let pins = pendingPlansChanges[tier].pinnedFeatures;
      if (!Array.isArray(pins)) {
        pins = tier === 'free' ? ['maxLessons', 'maxSections', 'maxActiveShares'] :
               (tier === 'plus' ? ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword'] :
               ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword', 'monthlyAiRequests', 'fullTextSearch']);
      }
      pins = [...pins];
      if (e.target.checked) {
        if (!pins.includes(key)) pins.push(key);
      } else {
        pins = pins.filter(k => k !== key);
      }
      pendingPlansChanges[tier].pinnedFeatures = pins;
      const countBadge = document.getElementById(`pinnedCountBadge_${tier}`);
      if (countBadge) countBadge.innerText = `${pins.length} tính năng ghim`;
      updatePlansImpact();
    };
  });

  // Lắng nghe thay đổi dòng tính năng tùy chỉnh thêm
  container.querySelectorAll('.plan-custom-features-input').forEach(textarea => {
    const handleCustomChange = (e) => {
      const { tier } = e.target.dataset;
      if (!pendingPlansChanges[tier]) pendingPlansChanges[tier] = {};
      const lines = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      pendingPlansChanges[tier].customFeatures = lines;
      updatePlansImpact();
    };
    textarea.oninput = handleCustomChange;
    textarea.onchange = handleCustomChange;
  });

  // Đặt lại cột
  container.querySelectorAll('.btn-reset-col').forEach(btn => {
    btn.onclick = () => {
      const tier = btn.dataset.tier;
      if (confirm(`Đặt lại thông số gói ${TIER_NAMES[tier]} về mặc định?`)) {
        const defaults = (adminContext && adminContext.PLANS_DEFAULT && adminContext.PLANS_DEFAULT.plans ? adminContext.PLANS_DEFAULT.plans[tier] : null);
        if (defaults) {
          pendingPlansChanges[tier] = JSON.parse(JSON.stringify(defaults));
          renderPlansTab(container);
        }
      }
    };
  });

  // Đặt lại toàn bộ
  const btnResetAll = container.querySelector('#btnResetAllPlans');
  if (btnResetAll) {
    btnResetAll.onclick = () => {
      if (confirm("Đặt lại TẤT CẢ các gói về giá trị mặc định hệ thống?")) {
        const defaults = (adminContext && adminContext.PLANS_DEFAULT ? adminContext.PLANS_DEFAULT.plans : null);
        if (defaults) {
          pendingPlansChanges = JSON.parse(JSON.stringify(defaults));
          renderPlansTab(container);
        }
      }
    };
  }

  // Hoàn tác
  const btnUndo = container.querySelector('#btnUndoPlans');
  if (btnUndo) {
    btnUndo.onclick = () => {
      pendingPlansChanges = JSON.parse(JSON.stringify(originalPlansConfig));
      renderPlansTab(container);
    };
  }

  // Lưu thay đổi
  const btnSave = container.querySelector('#btnSavePlans');
  if (btnSave) {
    btnSave.onclick = savePlansChanges;
  }

  // Tải lịch sử
  const btnHist = container.querySelector('#btnLoadPlansHistory');
  if (btnHist) {
    btnHist.onclick = loadPlansHistory;
  }
}

function updatePlansImpact() {
  const box = document.getElementById('plansImpactBox');
  const btnSave = document.getElementById('btnSavePlans');
  const btnUndo = document.getElementById('btnUndoPlans');
  if (!box || !btnSave) return;

  const diffs = [];
  const warnings = [];

  for (const tier of TIERS) {
    for (const def of PARAM_DEFS) {
      const oldV = (originalPlansConfig && originalPlansConfig[tier] ? originalPlansConfig[tier][def.key] : undefined);
      const newV = (pendingPlansChanges && pendingPlansChanges[tier] ? pendingPlansChanges[tier][def.key] : undefined);
      if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
        const formatVal = (v) => (v === -1 || v === null ? 'Vô hạn' : JSON.stringify(v));
        diffs.push(`<strong>${TIER_NAMES[tier]}</strong>: ${def.label} (${formatVal(oldV)} → <span class="text-indigo-600 font-bold">${formatVal(newV)}</span>)`);
      }
    }

    // So sánh mô tả, ghim tính năng và dòng tùy chỉnh
    const oldDesc = (originalPlansConfig && originalPlansConfig[tier] ? originalPlansConfig[tier].description : '') || '';
    const newDesc = (pendingPlansChanges && pendingPlansChanges[tier] ? pendingPlansChanges[tier].description : '') || '';
    if (oldDesc !== newDesc) {
      diffs.push(`<strong>${TIER_NAMES[tier]}</strong>: Cập nhật mô tả thẻ gói`);
    }

    const oldPins = JSON.stringify((originalPlansConfig && originalPlansConfig[tier] ? originalPlansConfig[tier].pinnedFeatures : null) || []);
    const newPins = JSON.stringify((pendingPlansChanges && pendingPlansChanges[tier] ? pendingPlansChanges[tier].pinnedFeatures : null) || []);
    if (oldPins !== newPins) {
      diffs.push(`<strong>${TIER_NAMES[tier]}</strong>: Thay đổi danh sách tính năng ghim`);
    }

    const oldCustom = JSON.stringify((originalPlansConfig && originalPlansConfig[tier] ? originalPlansConfig[tier].customFeatures : null) || []);
    const newCustom = JSON.stringify((pendingPlansChanges && pendingPlansChanges[tier] ? pendingPlansChanges[tier].customFeatures : null) || []);
    if (oldCustom !== newCustom) {
      diffs.push(`<strong>${TIER_NAMES[tier]}</strong>: Thay đổi dòng quyền lợi tùy chỉnh`);
    }
  }

  // Kiểm tra thứ tự hợp lý: guest <= free <= plus <= pro
  function compareLimits(a, b) {
    if (a === -1) return b === -1;
    if (b === -1) return true;
    return a <= b;
  }

  if (pendingPlansChanges && pendingPlansChanges.guest && pendingPlansChanges.free && pendingPlansChanges.plus && pendingPlansChanges.pro) {
    ['maxLessons', 'maxSections', 'maxActiveShares'].forEach(key => {
      const keyName = key === 'maxLessons' ? 'Số bài học tối đa' : (key === 'maxSections' ? 'Số mục folder' : 'Số link chia sẻ đang chạy');
      if (!compareLimits(pendingPlansChanges.guest[key], pendingPlansChanges.free[key])) {
        warnings.push(`Cảnh báo: Gói Khách có ${keyName} lớn hơn gói Thường!`);
      }
      if (!compareLimits(pendingPlansChanges.free[key], pendingPlansChanges.plus[key])) {
        warnings.push(`Cảnh báo: Gói Thường có ${keyName} lớn hơn gói Plus!`);
      }
      if (!compareLimits(pendingPlansChanges.plus[key], pendingPlansChanges.pro[key])) {
        warnings.push(`Cảnh báo: Gói Plus có ${keyName} lớn hơn gói Pro!`);
      }
    });
  }

  const hasChanges = diffs.length > 0;
  if (btnUndo) btnUndo.disabled = !hasChanges;
  btnSave.disabled = false;
  if (hasChanges) {
    btnSave.classList.add('ring-2', 'ring-indigo-400', 'shadow-md');
  } else {
    btnSave.classList.remove('ring-2', 'ring-indigo-400', 'shadow-md');
  }

  if (hasChanges || warnings.length > 0) {
    box.className = `p-4 rounded-xl border text-xs ${warnings.length > 0 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200' : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200'}`;
    box.innerHTML = `
      <div class="font-bold mb-1.5">${warnings.length > 0 ? 'Lưu ý kiểm tra trước khi lưu:' : 'Tóm tắt các thay đổi:'}</div>
      ${warnings.map(w => `<div class="text-rose-600 font-semibold mb-1">• ${esc(w)}</div>`).join('')}
      <ul class="list-disc pl-4 space-y-0.5">
        ${diffs.map(d => `<li>${d}</li>`).join('')}
      </ul>
    `;
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

async function savePlansChanges() {
  if (!await ensureFreshAdminSession()) return;
  const btn = document.getElementById('btnSavePlans');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg> <span>Đang lưu...</span>';
  }

  // Thu thập trực tiếp giá trị mới nhất từ toàn bộ DOM trước khi gửi máy chủ
  const container = document.getElementById('adminTabContentContainer');
  if (container) {
    container.querySelectorAll('.plan-num-input').forEach(input => {
      const { tier, key } = input.dataset;
      const isUnlimitedCb = container.querySelector(`.plan-unlimited-checkbox[data-tier="${tier}"][data-key="${key}"]`);
      if (isUnlimitedCb && isUnlimitedCb.checked) {
        pendingPlansChanges[tier][key] = -1;
      } else {
        pendingPlansChanges[tier][key] = parseInt(input.value, 10) || 0;
      }
    });

    container.querySelectorAll('.plan-bool-input').forEach(cb => {
      const { tier, key } = cb.dataset;
      pendingPlansChanges[tier][key] = cb.checked;
    });

    container.querySelectorAll('.plan-desc-input').forEach(textarea => {
      const { tier } = textarea.dataset;
      if (pendingPlansChanges[tier]) {
        pendingPlansChanges[tier].description = textarea.value.trim();
      }
    });

    container.querySelectorAll('.plan-custom-features-input').forEach(textarea => {
      const { tier } = textarea.dataset;
      if (pendingPlansChanges[tier]) {
        pendingPlansChanges[tier].customFeatures = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
      }
    });

    const tierPinsMap = {};
    container.querySelectorAll('.plan-pin-cb').forEach(cb => {
      const { tier, key } = cb.dataset;
      if (!tierPinsMap[tier]) tierPinsMap[tier] = [];
      if (cb.checked) tierPinsMap[tier].push(key);
    });
    Object.keys(tierPinsMap).forEach(t => {
      if (pendingPlansChanges[t]) {
        pendingPlansChanges[t].pinnedFeatures = tierPinsMap[t];
      }
    });
  }

  try {
    const res = await callAdminApi('/api/admin/plans/update', {
      method: 'POST',
      body: JSON.stringify({
        plans: pendingPlansChanges,
        version: plansVersion
      })
    });

    plansVersion = res.version;
    const savedPlans = res.plans || pendingPlansChanges;
    originalPlansConfig = JSON.parse(JSON.stringify(savedPlans));
    pendingPlansChanges = JSON.parse(JSON.stringify(savedPlans));

    // Đồng bộ trực tiếp vào adminContext, window.effectivePlans và localStorage
    if (adminContext.effectivePlans) {
      adminContext.effectivePlans.plans = savedPlans;
      adminContext.effectivePlans.version = res.version;
    }
    if (window.effectivePlans) {
      window.effectivePlans.plans = savedPlans;
      window.effectivePlans.version = res.version;
    }
    try {
      localStorage.setItem('thuvienhtml_plans_config', JSON.stringify({
        plans: savedPlans,
        version: res.version,
        pricing: (adminContext.effectivePlans && adminContext.effectivePlans.pricing) || {}
      }));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('plans_updated', { detail: { plans: savedPlans, version: res.version } }));
    if (typeof window.updateUpgradePricingDisplay === 'function') {
      try { window.updateUpgradePricingDisplay(); } catch(e){}
    }

    const verBadge = document.getElementById('adminCurrentVersionBadge');
    if (verBadge) verBadge.innerText = `Cấu hình: v${res.version}`;

    toast(`Đã lưu thay đổi hạn mức các gói thành công (Phiên bản v${res.version})!`);
    renderPlansTab(document.getElementById('adminTabContentContainer'));
  } catch (err) {
    alert("Lỗi khi lưu hạn mức: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Lưu thay đổi</span>';
    }
  }
}

async function loadPlansHistory() {
  const listEl = document.getElementById('plansHistoryList');
  listEl.innerHTML = 'Đang tải lịch sử...';
  try {
    const data = await callAdminApi('/api/admin/plans/history');
    if (!data.history || data.history.length === 0) {
      listEl.innerHTML = 'Chưa có bản ghi lịch sử nào.';
      return;
    }
    listEl.innerHTML = `
      <div class="space-y-2">
        ${data.history.map(item => `
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <div>
              <span class="font-bold text-indigo-600">v${item.version || '?'}</span>
              <span class="text-gray-400 mx-1.5">•</span>
              <span>${new Date(item.timestamp).toLocaleString('vi-VN')}</span>
              <span class="text-gray-400 text-[10px] ml-1">(bởi UID: ${(item.updatedBy || '').slice(0, 8)}...)</span>
            </div>
            <button class="btn-restore-plan px-2.5 py-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs font-semibold hover:text-indigo-600" data-id="${item.id}">
              Khôi phục
            </button>
          </div>
        `).join('')}
      </div>
    `;

    listEl.querySelectorAll('.btn-restore-plan').forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Khôi phục cấu hình hạn mức về phiên bản này?")) {
          btn.disabled = true;
          try {
            const res = await callAdminApi('/api/admin/plans/restore', {
              method: 'POST',
              body: JSON.stringify({ historyId: btn.dataset.id })
            });
            toast(`Đã khôi phục về phiên bản v${res.version}!`);
            if (res.plans) {
              if (adminContext.effectivePlans) adminContext.effectivePlans.plans = res.plans;
              if (window.effectivePlans) window.effectivePlans.plans = res.plans;
              try {
                localStorage.setItem('thuvienhtml_plans_config', JSON.stringify({
                  plans: res.plans,
                  version: res.version,
                  pricing: (adminContext.effectivePlans && adminContext.effectivePlans.pricing) || {}
                }));
              } catch (e) {}
              window.dispatchEvent(new CustomEvent('plans_updated', { detail: { plans: res.plans, version: res.version } }));
              if (typeof window.updateUpgradePricingDisplay === 'function') {
                try { window.updateUpgradePricingDisplay(); } catch(e){}
              }
            }
            renderPlansTab(document.getElementById('adminTabContentContainer'));
          } catch (e) {
            alert("Lỗi khôi phục: " + e.message);
          }
        }
      };
    });
  } catch (err) {
    listEl.innerHTML = `<span class="text-rose-500">Lỗi: ${esc(err.message)}</span>`;
  }
}

// =========================================================================
// 3.2 MỤC 2: GIÁ & GÓI (PRICING & LIVE PREVIEW)
// =========================================================================
function renderPricingTab(container) {
  const currentPricing = (adminContext && adminContext.effectivePlans ? adminContext.effectivePlans.pricing : null) || {};
  const initPlusMonthly = currentPricing.plusMonthly || 29000;
  const initProMonthly = currentPricing.proMonthly || 59000;
  const initDiscount = currentPricing.yearlyDiscount !== undefined ? currentPricing.yearlyDiscount : 20;
  const initPlusYearly = currentPricing.plusYearly || Math.round(initPlusMonthly * 12 * (1 - initDiscount / 100));
  const initProYearly = currentPricing.proYearly || Math.round(initProMonthly * 12 * (1 - initDiscount / 100));

  let previewPeriod = 'monthly';

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- CỘT FORM CHỈNH SỬA (5 CỘT) -->
      <div class="lg:col-span-5 bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Cấu hình bảng giá dịch vụ</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Tùy chỉnh giá theo tháng &amp; theo năm cho các gói. Giá áp dụng ngay khi lưu.</p>
        </div>

        <form id="pricingForm" class="space-y-4 text-xs">
          
          <!-- KHỐI GÓI PLUS -->
          <div class="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-indigo-700 dark:text-indigo-400 font-serif text-sm">Gói PLUS</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-semibold">Khuyên dùng</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá theo tháng (₫)</label>
                <input type="number" id="pricingPlusInput" step="1000" min="0" value="${initPlusMonthly}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-mono font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1]" />
              </div>
              <div>
                <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá theo năm (₫)</label>
                <input type="number" id="pricingPlusYearlyInput" step="1000" min="0" value="${initPlusYearly}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-mono font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1]" />
              </div>
            </div>

            <div class="text-[11px] text-indigo-800 dark:text-indigo-300/80 flex items-center justify-between pt-0.5">
              <span>Theo năm: <strong id="calcPlusEquiv" class="font-mono">—</strong> ₫/tháng</span>
              <span>Tiết kiệm: <strong id="calcPlusSavings" class="font-mono text-emerald-600 dark:text-emerald-400">—</strong></span>
            </div>
          </div>

          <!-- KHỐI GÓI PRO -->
          <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-900 dark:text-gray-100 font-serif text-sm">Gói PRO</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold">Cao cấp nhất</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá theo tháng (₫)</label>
                <input type="number" id="pricingProInput" step="1000" min="0" value="${initProMonthly}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-mono font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1]" />
              </div>
              <div>
                <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá theo năm (₫)</label>
                <input type="number" id="pricingProYearlyInput" step="1000" min="0" value="${initProYearly}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-mono font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1]" />
              </div>
            </div>

            <div class="text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between pt-0.5">
              <span>Theo năm: <strong id="calcProEquiv" class="font-mono">—</strong> ₫/tháng</span>
              <span>Tiết kiệm: <strong id="calcProSavings" class="font-mono text-emerald-600 dark:text-emerald-400">—</strong></span>
            </div>
          </div>

          <!-- CÔNG CỤ TÍNH NHANH % GIẢM GIÁ -->
          <div class="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-semibold text-gray-700 dark:text-gray-300">Tỷ lệ giảm giá thanh toán năm (%)</label>
              <input type="number" id="pricingDiscountInput" min="0" max="100" value="${initDiscount}" class="w-20 px-2 py-1 text-center rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-mono font-bold text-xs" />
            </div>
            <button type="button" id="btnAutoCalcYearly" class="w-full py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 transition flex items-center justify-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Tính lại giá năm theo % giảm giá</span>
            </button>
          </div>

          <button type="submit" id="btnSavePricing" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
            <span>Lưu bảng giá &amp; Áp dụng</span>
          </button>
        </form>
      </div>

      <!-- CỘT XEM TRƯỚC TRỰC QUAN (7 CỘT) -->
      <div class="lg:col-span-7 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#1A1D23] p-3 rounded-xl border border-[#E0DED7] dark:border-[#262C36]">
          <div class="flex items-center gap-2">
            <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Xem trước giao diện người dùng</h4>
            <span class="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">Live Preview</span>
          </div>

          <!-- Segmented Toggle chu kỳ -->
          <div class="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
            <button type="button" id="btnPreviewMonthly" class="px-3 py-1 rounded-md transition font-medium cursor-pointer">
              Theo tháng
            </button>
            <button type="button" id="btnPreviewYearly" class="px-3 py-1 rounded-md transition font-medium cursor-pointer">
              Theo năm
            </button>
          </div>
        </div>

        <div id="pricingLivePreviewCards" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Render card mô phỏng -->
        </div>
      </div>
    </div>
  `;

  function getNumVal(id, fallback) {
    const el = document.getElementById(id);
    const n = parseInt(el ? el.value : '', 10);
    return (!isNaN(n) && n >= 0) ? n : fallback;
  }

  function updatePricingPreview() {
    const pPlusM = getNumVal('pricingPlusInput', 29000);
    const pPlusY = getNumVal('pricingPlusYearlyInput', Math.round(pPlusM * 12 * 0.8));
    const pProM = getNumVal('pricingProInput', 59000);
    const pProY = getNumVal('pricingProYearlyInput', Math.round(pProM * 12 * 0.8));

    // Tính toán phụ trợ
    const plusEquiv = Math.round(pPlusY / 12);
    const plusSavings = Math.max(0, (pPlusM * 12) - pPlusY);
    const proEquiv = Math.round(pProY / 12);
    const proSavings = Math.max(0, (pProM * 12) - pProY);

    const calcPlusEquivEl = document.getElementById('calcPlusEquiv');
    const calcPlusSavingsEl = document.getElementById('calcPlusSavings');
    const calcProEquivEl = document.getElementById('calcProEquiv');
    const calcProSavingsEl = document.getElementById('calcProSavings');

    if (calcPlusEquivEl) calcPlusEquivEl.innerText = `${plusEquiv.toLocaleString('vi-VN')}`;
    if (calcPlusSavingsEl) calcPlusSavingsEl.innerText = `${plusSavings.toLocaleString('vi-VN')} ₫`;
    if (calcProEquivEl) calcProEquivEl.innerText = `${proEquiv.toLocaleString('vi-VN')}`;
    if (calcProSavingsEl) calcProSavingsEl.innerText = `${proSavings.toLocaleString('vi-VN')} ₫`;

    // Cập nhật nút chu kỳ
    const btnM = document.getElementById('btnPreviewMonthly');
    const btnY = document.getElementById('btnPreviewYearly');
    if (btnM && btnY) {
      if (previewPeriod === 'monthly') {
        btnM.className = 'px-3 py-1 rounded-md bg-white dark:bg-[#161920] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold cursor-pointer';
        btnY.className = 'px-3 py-1 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer';
      } else {
        btnY.className = 'px-3 py-1 rounded-md bg-white dark:bg-[#161920] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold cursor-pointer';
        btnM.className = 'px-3 py-1 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer';
      }
    }

    const cardsContainer = document.getElementById('pricingLivePreviewCards');
    if (!cardsContainer) return;

    const plans = (adminContext && adminContext.effectivePlans && adminContext.effectivePlans.plans) || {};
    const plusPlans = plans.plus || {};
    const proPlans = plans.pro || {};
    const plusLessons = plusPlans.maxLessons || 100;
    const plusSections = plusPlans.maxSections || 20;
    const plusFileKB = plusPlans.maxFileKB || 1024;
    const proLessons = proPlans.maxLessons === -1 ? 'Không giới hạn' : (proPlans.maxLessons || 'Không giới hạn');
    const proSections = proPlans.maxSections === -1 ? 'Không giới hạn' : (proPlans.maxSections || 'Không giới hạn');
    const proFileKB = proPlans.maxFileKB || 2048;

    const isYearly = previewPeriod === 'yearly';

    function renderPreviewTierList(tierObj, defaultPins) {
      const pins = (Array.isArray(tierObj.pinnedFeatures) && tierObj.pinnedFeatures.length > 0)
        ? tierObj.pinnedFeatures
        : defaultPins;
      let items = [];
      pins.forEach(k => {
        const pDef = PARAM_DEFS.find(p => p.key === k);
        if (!pDef) return;
        const v = tierObj[k];
        let valStr = '';
        if (pDef.type === 'boolean') {
          valStr = v ? '✓ Bật' : '—';
        } else if (v === -1 || v === null || v === 'unlimited') {
          valStr = 'Không giới hạn';
        } else if (k === 'maxFileKB') {
          valStr = v >= 1024 ? `${v/1024} MB` : `${v} KB`;
        } else if (k === 'monthlyAiRequests') {
          valStr = `${v.toLocaleString('vi-VN')} lượt`;
        } else {
          valStr = `${v}`;
        }
        items.push(`<li class="flex items-center justify-between"><span>${esc(pDef.label)}:</span> <strong class="text-gray-900 dark:text-gray-100">${esc(valStr)}</strong></li>`);
      });
      if (Array.isArray(tierObj.customFeatures)) {
        tierObj.customFeatures.forEach(c => {
          if (c && c.trim()) {
            items.push(`<li class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"><span>✓</span> <span>${esc(c.trim())}</span></li>`);
          }
        });
      }
      return items.join('');
    }

    const defaultPinsPlus = ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword'];
    const defaultPinsPro = ['maxLessons', 'maxSections', 'maxFileKB', 'maxActiveShares', 'trashDays', 'sharePassword', 'monthlyAiRequests', 'fullTextSearch'];

    cardsContainer.innerHTML = `
      <!-- THẺ PLUS -->
      <div class="p-5 rounded-2xl border-2 border-indigo-600 bg-white dark:bg-[#181B20] shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-serif text-base font-bold text-indigo-600 dark:text-indigo-400">Gói Plus</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 uppercase">Khuyên dùng</span>
          </div>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2] min-h-[30px] mb-2 leading-relaxed">
            ${esc(plusPlans.description || 'Tối ưu cho cá nhân học tập chuyên cần và thường xuyên.')}
          </p>
          <div class="text-2xl font-bold font-serif text-[#1C1B18] dark:text-[#E8E6E1] mb-1 tabular-nums">
            ${isYearly ? `${plusEquiv.toLocaleString('vi-VN')} ₫` : `${pPlusM.toLocaleString('vi-VN')} ₫`}
            <span class="text-xs font-normal text-gray-500">/ tháng</span>
          </div>
          <div class="text-xs text-[#78756D] dark:text-[#9AA3B2] mb-3">
            ${isYearly ? `Thanh toán ${pPlusY.toLocaleString('vi-VN')} ₫ mỗi năm` : 'Thanh toán linh hoạt theo từng tháng'}
          </div>
          <div class="border-t border-gray-100 dark:border-gray-800/80 my-3"></div>
          <ul class="text-xs space-y-2 text-gray-600 dark:text-gray-300 mb-4">
            ${renderPreviewTierList(plusPlans, defaultPinsPlus)}
          </ul>
        </div>
        <button type="button" class="w-full py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs pointer-events-none">Chọn gói Plus</button>
      </div>

      <!-- THẺ PRO -->
      <div class="p-5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181B20] shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Gói Pro</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">Cao cấp</span>
          </div>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2] min-h-[30px] mb-2 leading-relaxed">
            ${esc(proPlans.description || 'Đầy đủ quyền lợi cao cấp nhất cùng AI mở rộng.')}
          </p>
          <div class="text-2xl font-bold font-serif text-[#1C1B18] dark:text-[#E8E6E1] mb-1 tabular-nums">
            ${isYearly ? `${proEquiv.toLocaleString('vi-VN')} ₫` : `${pProM.toLocaleString('vi-VN')} ₫`}
            <span class="text-xs font-normal text-gray-500">/ tháng</span>
          </div>
          <div class="text-xs text-[#78756D] dark:text-[#9AA3B2] mb-3">
            ${isYearly ? `Thanh toán ${pProY.toLocaleString('vi-VN')} ₫ mỗi năm` : 'Thanh toán linh hoạt theo từng tháng'}
          </div>
          <div class="border-t border-gray-100 dark:border-gray-800/80 my-3"></div>
          <ul class="text-xs space-y-2 text-gray-600 dark:text-gray-300 mb-4">
            ${renderPreviewTierList(proPlans, defaultPinsPro)}
          </ul>
        </div>
        <button type="button" class="w-full py-2 rounded-xl border border-gray-400 dark:border-gray-600 font-semibold text-xs pointer-events-none">Chọn gói Pro</button>
      </div>
    `;
  }

  updatePricingPreview();
  ['pricingPlusInput', 'pricingPlusYearlyInput', 'pricingProInput', 'pricingProYearlyInput', 'pricingDiscountInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updatePricingPreview;
  });

  const btnAutoCalc = document.getElementById('btnAutoCalcYearly');
  if (btnAutoCalc) {
    btnAutoCalc.onclick = () => {
      const pPlusM = getNumVal('pricingPlusInput', 29000);
      const pProM = getNumVal('pricingProInput', 59000);
      const disc = Math.min(100, Math.max(0, getNumVal('pricingDiscountInput', 20)));
      const newPlusY = Math.round(pPlusM * 12 * (1 - disc / 100));
      const newProY = Math.round(pProM * 12 * (1 - disc / 100));
      const plusYInput = document.getElementById('pricingPlusYearlyInput');
      const proYInput = document.getElementById('pricingProYearlyInput');
      if (plusYInput) plusYInput.value = newPlusY;
      if (proYInput) proYInput.value = newProY;
      updatePricingPreview();
      toast(`Đã tính lại giá năm theo mức giảm ${disc}%!`);
    };
  }

  const btnPreviewM = document.getElementById('btnPreviewMonthly');
  if (btnPreviewM) {
    btnPreviewM.onclick = () => {
      previewPeriod = 'monthly';
      updatePricingPreview();
    };
  }

  const btnPreviewY = document.getElementById('btnPreviewYearly');
  if (btnPreviewY) {
    btnPreviewY.onclick = () => {
      previewPeriod = 'yearly';
      updatePricingPreview();
    };
  }

  const form = document.getElementById('pricingForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSavePricing');
      btn.disabled = true;
      btn.innerText = 'Đang lưu...';

      try {
        const plusMonthly = getNumVal('pricingPlusInput', 29000);
        const plusYearly = getNumVal('pricingPlusYearlyInput', Math.round(plusMonthly * 12 * 0.8));
        const proMonthly = getNumVal('pricingProInput', 59000);
        const proYearly = getNumVal('pricingProYearlyInput', Math.round(proMonthly * 12 * 0.8));
        const yearlyDiscount = getNumVal('pricingDiscountInput', 20);

        const newPricing = {
          plusMonthly,
          plusYearly,
          proMonthly,
          proYearly,
          yearlyDiscount
        };

        await callAdminApi('/api/admin/pricing/update', {
          method: 'POST',
          body: JSON.stringify({ pricing: newPricing })
        });

        if (adminContext.effectivePlans) {
          adminContext.effectivePlans.pricing = newPricing;
        }
        if (window.effectivePlans) {
          window.effectivePlans.pricing = newPricing;
        }
        if (typeof updateUpgradePricingDisplay === 'function') {
          try { updateUpgradePricingDisplay(); } catch(e){}
        }

        toast("Đã cập nhật bảng giá dịch vụ theo tháng và theo năm thành công!");
      } catch (err) {
        alert("Lỗi khi lưu bảng giá: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Lưu bảng giá & Áp dụng';
      }
    };
  }
}

// =========================================================================
// 3.3 MỤC 3: NGƯỜI DÙNG (USER MANAGEMENT - TỐI ƯU CACHE & TỰ ĐỘNG CẬP NHẬT 5P)
// =========================================================================
let cachedRecentUsersList = null;
let lastUsersFetchTimestamp = 0;
let isFetchingRecentUsers = false;
let usersAutoRefreshTimer = null;

try {
  const storedUsersCache = sessionStorage.getItem('thuvienhtml_cached_recent_users');
  if (storedUsersCache) {
    const parsed = JSON.parse(storedUsersCache);
    if (parsed && Array.isArray(parsed.users)) {
      cachedRecentUsersList = parsed.users;
      lastUsersFetchTimestamp = parsed.time || 0;
    }
  }
} catch (_) {}

function formatUserRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const time = new Date(dateStr).getTime();
  const diff = Date.now() - time;
  if (diff < 60000) return 'Vừa xong';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(diff / 60000);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function updateUsersSyncTimeText() {
  const syncEl = document.getElementById('recentUsersSyncInfo');
  if (!syncEl) return;
  if (!lastUsersFetchTimestamp) {
    syncEl.textContent = 'Đang đồng bộ...';
    return;
  }
  const d = new Date(lastUsersFetchTimestamp);
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  syncEl.textContent = `Cập nhật: ${timeStr} · Tự động 5p/lần`;
}

async function preloadRecentUsers(isBackground = false, forceRefresh = false) {
  if (isFetchingRecentUsers) return;
  const now = Date.now();
  if (isBackground && !forceRefresh && cachedRecentUsersList && (now - lastUsersFetchTimestamp < 5 * 60 * 1000)) {
    return;
  }

  isFetchingRecentUsers = true;
  try {
    const url = `/api/admin/users/recent?limit=50${forceRefresh ? '&refresh=1' : ''}`;
    const data = await callAdminApi(url);
    if (data && Array.isArray(data.users)) {
      cachedRecentUsersList = data.users;
      lastUsersFetchTimestamp = Date.now();
      try {
        sessionStorage.setItem('thuvienhtml_cached_recent_users', JSON.stringify({
          users: cachedRecentUsersList,
          time: lastUsersFetchTimestamp
        }));
      } catch (_) {}

      // Nếu đang mở tab Người dùng thì cập nhật bảng giao diện ngay
      const tableBox = document.getElementById('recentUsersTableContainer');
      if (tableBox && currentAdminTab === 'users') {
        renderRecentUsersTable(tableBox, cachedRecentUsersList);
        updateUsersSyncTimeText();
      }
    }
  } catch (err) {
    console.warn("[Admin Users] Lỗi tải dữ liệu người dùng:", err);
  } finally {
    isFetchingRecentUsers = false;
  }
}

function renderRecentUsersTable(tableBox, users) {
  if (!tableBox) return;
  if (!users || users.length === 0) {
    tableBox.innerHTML = '<div class="py-6 text-center text-gray-400">Chưa có tài khoản đăng ký nào.</div>';
    return;
  }

  tableBox.innerHTML = `
    <table class="w-full text-left border-collapse min-w-[750px]">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700 text-gray-400 font-semibold text-[11px]">
          <th class="py-2.5 px-3">Tài khoản &amp; Username</th>
          <th class="py-2.5 px-3">UID (Bấm để tra cứu)</th>
          <th class="py-2.5 px-3">Gói đang dùng</th>
          <th class="py-2.5 px-3">Thời gian tạo</th>
          <th class="py-2.5 px-3 text-right">Thao tác</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
        ${users.map(u => {
          const tierBadge = u.tier === 'pro' 
            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">PRO</span>'
            : (u.tier === 'plus'
              ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">PLUS</span>'
              : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">FREE</span>');
          
          const expText = u.expiresAt ? `Hạn: ${new Date(u.expiresAt).toLocaleDateString('vi-VN')}` : (u.tier === 'free' ? 'Trọn đời' : 'Vĩnh viễn');
          const createdText = formatUserRelativeTime(u.createdAt);
          const fullCreatedDate = u.createdAt ? new Date(u.createdAt).toLocaleString('vi-VN') : '';
          const initialChar = ((u.username || u.displayName || 'U').replace(/^@+/, '')[0] || 'U').toUpperCase();

          return `
            <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    ${esc(initialChar)}
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 dark:text-gray-100 leading-tight flex items-center gap-1.5">
                      <span class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">${esc(u.formattedUsername || ('@' + u.username))}</span>
                      ${u.isVirtualInternalEmail ? '<span class="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-semibold">Tài khoản Web</span>' : ''}
                    </div>
                    <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">${esc(u.displayEmail || u.email || 'Tài khoản đăng ký web')}</div>
                  </div>
                </div>
              </td>
              <td class="py-2.5 px-3 font-mono text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline font-semibold btn-click-uid" data-uid="${esc(u.uid)}" title="Bấm để tra cứu gói của UID này">
                    ${esc(u.uid)}
                  </span>
                  <button class="btn-copy-user-uid text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded cursor-pointer" data-uid="${esc(u.uid)}" title="Sao chép UID">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </td>
              <td class="py-2.5 px-3">
                <div class="flex flex-col gap-0.5">
                  <div>${tierBadge}</div>
                  <span class="text-[10px] text-gray-400">${esc(expText)}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 text-[11px] text-gray-500" title="${esc(fullCreatedDate)}">
                ${esc(createdText)}
              </td>
              <td class="py-2.5 px-3 text-right whitespace-nowrap">
                <button class="btn-inspect-uid px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition mr-1.5 cursor-pointer" data-uid="${esc(u.uid)}">
                  Tra cứu gói
                </button>
                <button class="btn-quick-grant px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs transition cursor-pointer" data-uid="${esc(u.uid)}">
                  Cấp gói
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Gán sự kiện click UID & copy UID
  tableBox.querySelectorAll('.btn-copy-user-uid').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.uid);
      toast("Đã sao chép UID!");
    };
  });

  tableBox.querySelectorAll('.btn-click-uid, .btn-inspect-uid').forEach(el => {
    el.onclick = () => {
      const uid = el.dataset.uid;
      const inputSearch = document.getElementById('adminUserSearchInput');
      if (inputSearch) inputSearch.value = uid;
      const btnSearch = document.getElementById('btnSearchUser');
      if (btnSearch) btnSearch.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  tableBox.querySelectorAll('.btn-quick-grant').forEach(btn => {
    btn.onclick = async () => {
      const targetUid = btn.dataset.uid;
      const tier = prompt("Chọn gói cấp (plus hoặc pro):", "plus");
      if (!tier || !['plus', 'pro'].includes(tier.toLowerCase())) return;
      if (!await ensureFreshAdminSession()) return;
      const days = prompt("Số ngày sử dụng (nhập 0 để vĩnh viễn):", "30");
      if (days === null) return;
      const reason = prompt("Lý do cấp gói:", "Cấp từ danh sách người dùng mới");

      try {
        await callAdminApi('/api/admin/users/grant', {
          method: 'POST',
          body: JSON.stringify({
            uid: targetUid,
            tier: tier.toLowerCase(),
            days: parseInt(days, 10),
            reason
          })
        });
        toast("Đã cấp gói thành công!");
        preloadRecentUsers(false, true);
      } catch (e) {
        alert("Lỗi cấp gói: " + e.message);
      }
    };
  });
}

function renderUsersTab(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- KHỐI 1: TRA CỨU NGƯỜI DÙNG & GÓI THEO UID / EMAIL -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Tra cứu &amp; Quản lý tài khoản người dùng</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Tra cứu thông tin gói đang dùng, số bài học và thời hạn tài khoản bằng UID hoặc Email.</p>
        </div>

        <div class="flex items-center gap-2">
          <input type="text" id="adminUserSearchInput" placeholder="Nhập UID hoặc Email người dùng cần tra cứu gói..." class="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] text-xs font-mono" />
          <button id="btnSearchUser" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Tra cứu</span>
          </button>
        </div>

        <div id="adminUserSearchResults" class="text-xs text-gray-500 pt-1">
          <!-- Kết quả tra cứu chi tiết sẽ hiển thị ở đây -->
        </div>
      </div>

      <!-- KHỐI 2: THEO DÕI NGƯỜI DÙNG MỚI TẠO TÀI KHOẢN (REALTIME TRACKING) -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Theo dõi người dùng mới tạo tài khoản</h3>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Đã đăng ký
              </span>
            </div>
            <p class="text-xs text-[#78756D] dark:text-[#9AA3B2] mt-0.5">Chỉ hiển thị các tài khoản đã đăng ký (loại trừ tài khoản khách). Tự động cập nhật mỗi 5 phút.</p>
          </div>

          <div class="flex items-center gap-2.5 self-start sm:self-auto">
            <span id="recentUsersSyncInfo" class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Đang đồng bộ...</span>
            <button id="btnRefreshRecentUsers" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer text-gray-700 dark:text-gray-300" title="Cập nhật danh sách mới nhất ngay bây giờ">
              <svg id="iconRefreshRecentUsers" class="w-3.5 h-3.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div id="recentUsersTableContainer" class="overflow-x-auto text-xs text-gray-500">
          <div class="py-6 text-center text-gray-400">Đang đồng bộ danh sách tài khoản mới...</div>
        </div>
      </div>
    </div>
  `;

  const btnSearch = container.querySelector('#btnSearchUser');
  const inputSearch = container.querySelector('#adminUserSearchInput');
  const btnRefreshRecent = container.querySelector('#btnRefreshRecentUsers');
  const tableBox = container.querySelector('#recentUsersTableContainer');

  // HIỂN THỊ TỨC THÌ TỪ BỘ NHỚ ĐỆM (0ms delay) NẾU ĐÃ CÓ DỮ LIỆU
  if (cachedRecentUsersList && cachedRecentUsersList.length > 0) {
    renderRecentUsersTable(tableBox, cachedRecentUsersList);
    updateUsersSyncTimeText();
    // Nếu dữ liệu đệm đã cũ quá 5 phút, cập nhật ngầm mà không làm phiền người dùng
    if (Date.now() - lastUsersFetchTimestamp > 5 * 60 * 1000) {
      preloadRecentUsers(true);
    }
  } else {
    preloadRecentUsers(false);
  }

  // Nút Làm mới thủ công
  if (btnRefreshRecent) {
    btnRefreshRecent.onclick = async () => {
      const icon = btnRefreshRecent.querySelector('#iconRefreshRecentUsers');
      if (icon) icon.classList.add('animate-spin');
      btnRefreshRecent.disabled = true;
      try {
        await preloadRecentUsers(false, true);
        toast("Đã cập nhật danh sách người dùng mới nhất!");
      } catch (err) {
        alert("Lỗi khi cập nhật danh sách người dùng: " + err.message);
      } finally {
        if (icon) icon.classList.remove('animate-spin');
        btnRefreshRecent.disabled = false;
      }
    };
  }

  async function doSearch() {
    const q = inputSearch.value.trim();
    if (!q) return;
    const resBox = container.querySelector('#adminUserSearchResults');
    resBox.innerHTML = '<div class="py-3 text-indigo-600 font-semibold">Đang tra cứu thông tin gói tài khoản...</div>';

    try {
      const data = await callAdminApi(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
      if (!data.users || data.users.length === 0) {
        resBox.innerHTML = '<div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">Không tìm thấy tài khoản người dùng với UID hoặc Email này.</div>';
        return;
      }

      resBox.innerHTML = `
        <div class="space-y-4 pt-2">
          ${data.users.map(u => `
            <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5">
                <div>
                  <div class="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>${esc(u.displayName || u.email || 'Thành viên')}</span>
                    ${u.email ? `<span class="text-xs font-normal text-gray-400">(${esc(u.email)})</span>` : ''}
                  </div>
                  <div class="font-mono text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <span>UID: <strong class="text-indigo-600 dark:text-indigo-400 select-all">${esc(u.uid)}</strong></span>
                    <button class="btn-copy-user-uid text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" data-uid="${esc(u.uid)}" title="Sao chép UID">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.tier === 'pro' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700' : (u.tier === 'plus' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300')}">
                    Gói: ${esc(u.tier || 'free')}
                  </span>
                  ${u.expiresAt ? `<span class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">Hạn dùng: ${new Date(u.expiresAt).toLocaleDateString('vi-VN')}</span>` : '<span class="text-xs text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">Vĩnh viễn</span>'}
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Số bài đã tạo</div>
                  <div class="font-bold text-sm text-gray-900 dark:text-gray-100">${(u.usage ? u.usage.lessons : 0) || 0}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Số mục / folder</div>
                  <div class="font-bold text-sm text-gray-900 dark:text-gray-100">${(u.usage ? u.usage.sections : 0) || 0}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Ngày tạo tài khoản</div>
                  <div class="font-semibold text-gray-800 dark:text-gray-200">${u.createdAt ? new Date(u.createdAt).toLocaleString('vi-VN') : 'N/A'}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Lần đăng nhập cuối</div>
                  <div class="font-semibold text-gray-800 dark:text-gray-200">${u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleString('vi-VN') : 'N/A'}</div>
                </div>
              </div>

              <!-- NÚT THAO TÁC CẤP / THU HỒI GÓI -->
              <div class="flex items-center gap-2 pt-1 flex-wrap">
                <button class="btn-grant-user px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 cursor-pointer shadow-2xs" data-uid="${u.uid}">
                  Tặng / Đổi gói
                </button>
                <button class="btn-extend-user px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950 cursor-pointer" data-uid="${u.uid}">
                  + Gia hạn 30 ngày
                </button>
                <button class="btn-revoke-user px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 cursor-pointer" data-uid="${u.uid}">
                  Thu hồi về Thường
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      resBox.querySelectorAll('.btn-copy-user-uid').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(btn.dataset.uid);
          toast("Đã sao chép UID!");
        };
      });

      bindUserActions(resBox, doSearch);
    } catch (err) {
      resBox.innerHTML = `<div class="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs">Lỗi: ${esc(err.message)}</div>`;
    }
  }

  btnSearch.onclick = doSearch;
  inputSearch.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
}

// Hàm tương thích nếu có thành phần nào gọi loadRecentUsers
const loadRecentUsers = (force = false) => preloadRecentUsers(false, force);
window.loadRecentUsers = loadRecentUsers;


function bindUserActions(container, refreshFn) {
  container.querySelectorAll('.btn-grant-user').forEach(btn => {
    btn.onclick = async () => {
      const tier = prompt("Chọn gói cấp (plus hoặc pro):", "plus");
      if (!tier || !['plus', 'pro'].includes(tier.toLowerCase())) return;
      if (!await ensureFreshAdminSession()) return;
      const days = prompt("Số ngày sử dụng (nhập 0 để vĩnh viễn):", "30");
      if (days === null) return;
      const reason = prompt("Lý do cấp gói:", "Tặng sự kiện");

      try {
        await callAdminApi('/api/admin/users/grant', {
          method: 'POST',
          body: JSON.stringify({
            uid: btn.dataset.uid,
            tier: tier.toLowerCase(),
            days: parseInt(days, 10),
            reason
          })
        });
        toast("Đã cấp gói thành công!");
        refreshFn();
      } catch (e) {
        alert("Lỗi cấp gói: " + e.message);
      }
    };
  });

  container.querySelectorAll('.btn-extend-user').forEach(btn => {
    btn.onclick = async () => {
      if (!await ensureFreshAdminSession()) return;
      try {
        await callAdminApi('/api/admin/users/grant', {
          method: 'POST',
          body: JSON.stringify({
            uid: btn.dataset.uid,
            tier: 'plus',
            days: 30,
            reason: 'Gia hạn thêm 30 ngày'
          })
        });
        toast("Đã gia hạn thêm 30 ngày!");
        refreshFn();
      } catch (e) {
        alert("Lỗi gia hạn: " + e.message);
      }
    };
  });

  container.querySelectorAll('.btn-revoke-user').forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Thu hồi gói của người dùng này về tài khoản Thường?")) {
        if (!await ensureFreshAdminSession()) return;
        try {
          await callAdminApi('/api/admin/users/revoke', {
            method: 'POST',
            body: JSON.stringify({
              uid: btn.dataset.uid,
              reason: 'Admin thu hồi'
            })
          });
          toast("Đã thu hồi gói thành công!");
          refreshFn();
        } catch (e) {
          alert("Lỗi thu hồi: " + e.message);
        }
      }
    };
  });
}

// =========================================================================
// 3.4 MỤC 4: MÃ KÍCH HOẠT (ACTIVATION CODES)
// =========================================================================
function renderCodesTab(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- FORM TẠO HÀNG LOẠT MÃ -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Tạo mã kích hoạt hàng loạt</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Sinh mã ngẫu nhiên cho người dùng tự kích hoạt nâng cấp gói.</p>
        </div>

        <form id="createCodesForm" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="block text-xs font-semibold mb-1">Gói dịch vụ</label>
            <select id="codeTierSelect" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs">
              <option value="plus">Gói PLUS</option>
              <option value="pro">Gói PRO</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Thời hạn (ngày)</label>
            <select id="codeDaysSelect" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs">
              <option value="30">30 ngày</option>
              <option value="90">90 ngày</option>
              <option value="180">180 ngày</option>
              <option value="365">365 ngày (1 năm)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Số lượng mã (1–100)</label>
            <input type="number" id="codeQtyInput" min="1" max="100" value="5" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-bold" />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Ghi chú lô mã</label>
            <input type="text" id="codeNoteInput" placeholder="Ví dụ: Tặng quà tháng 10" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs" />
          </div>
          <div class="sm:col-span-4 flex justify-end">
            <button type="submit" id="btnSubmitCreateCodes" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition">
              Tạo lô mã ngay
            </button>
          </div>
        </form>
      </div>

      <!-- BẢNG DANH SÁCH MÃ -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Danh sách mã kích hoạt</h3>
            <span class="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">Mã chưa dùng lên đầu · Tự xóa mã vô hiệu quá 7 ngày</span>
            <select id="codeFilterStatus" class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#161A20] ml-1">
              <option value="all">Tất cả trạng thái</option>
              <option value="unused">Chưa dùng</option>
              <option value="used">Đã dùng</option>
              <option value="disabled">Đã vô hiệu</option>
            </select>
          </div>
          <button id="btnExportCodesCsv" class="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Xuất CSV</span>
          </button>
        </div>

        <div id="codesTableContainer" class="overflow-x-auto text-xs text-gray-500">
          Đang tải danh sách mã...
        </div>
      </div>
    </div>
  `;

  let currentLoadedCodes = [];

  async function loadCodes() {
    const tableBox = document.getElementById('codesTableContainer');
    if (!tableBox) return;
    const filter = (document.getElementById('codeFilterStatus') ? document.getElementById('codeFilterStatus').value : null) || 'all';
    tableBox.innerHTML = 'Đang tải...';

    try {
      const data = await callAdminApi(`/api/admin/codes/list?status=${filter}`);
      currentLoadedCodes = data.codes || [];

      // SẮP XẾP ƯU TIÊN: Chưa dùng lên đầu, Đã dùng ở giữa, Đã vô hiệu xuống dưới cùng
      currentLoadedCodes.sort((a, b) => {
        const getPriority = (item) => {
          if (item.isDisabled) return 2; // Vô hiệu -> xuống dưới
          if (item.isUsed) return 1;     // Đã dùng -> ở giữa
          return 0;                      // Chưa dùng -> lên đầu
        };
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      if (data.autoDeletedCount && data.autoDeletedCount > 0) {
        toast(`Đã tự động xóa ${data.autoDeletedCount} mã vô hiệu quá 7 ngày`);
      }

      if (currentLoadedCodes.length === 0) {
        tableBox.innerHTML = 'Chưa có mã kích hoạt nào theo điều kiện lọc này.';
        return;
      }

      tableBox.innerHTML = `
        <table class="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-gray-400 font-semibold">
              <th class="py-2 px-3">Mã kích hoạt</th>
              <th class="py-2 px-3">Gói</th>
              <th class="py-2 px-3">Thời hạn</th>
              <th class="py-2 px-3">Trạng thái</th>
              <th class="py-2 px-3">Người kích hoạt</th>
              <th class="py-2 px-3">Ghi chú</th>
              <th class="py-2 px-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
            ${currentLoadedCodes.map(c => `
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all">${esc(c.code)}</td>
                <td class="py-2.5 px-3 uppercase font-bold">${esc(c.tier)}</td>
                <td class="py-2.5 px-3">${c.days} ngày</td>
                <td class="py-2.5 px-3">
                  ${c.isDisabled ? '<span class="text-rose-500">Đã vô hiệu</span>' : (c.isUsed ? '<span class="text-gray-400">Đã dùng</span>' : '<span class="text-emerald-600 font-bold">Chưa dùng</span>')}
                </td>
                <td class="py-2.5 px-3">
                  ${c.isUsed ? `
                    <div class="flex flex-col">
                      <span class="font-semibold text-gray-900 dark:text-gray-100">${esc(c.usedByUserName || c.usedByUserEmail || 'Người dùng')}</span>
                      <span class="text-[10px] text-gray-400 font-mono">${esc(c.usedByUserEmail || c.usedBy || '')}</span>
                      ${c.usedAt ? `<span class="text-[9px] text-gray-400">${new Date(c.usedAt).toLocaleString('vi-VN')}</span>` : ''}
                    </div>
                  ` : '<span class="text-gray-400">—</span>'}
                </td>
                <td class="py-2.5 px-3 text-gray-400">${esc(c.note || '—')}</td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                  ${(!c.isUsed && !c.isDisabled) ? `
                    <button class="btn-disable-code text-amber-600 hover:underline mr-2.5 text-xs font-semibold cursor-pointer" data-code="${c.code}">Vô hiệu</button>
                  ` : ''}
                  <button class="btn-delete-code text-rose-600 hover:underline text-xs font-semibold cursor-pointer" data-code="${c.code}">Xóa</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      tableBox.querySelectorAll('.btn-disable-code').forEach(btn => {
        btn.onclick = async () => {
          if (confirm(`Vô hiệu hóa mã ${btn.dataset.code}?`)) {
            try {
              await callAdminApi('/api/admin/codes/disable', {
                method: 'POST',
                body: JSON.stringify({ code: btn.dataset.code, reason: 'Admin vô hiệu hóa' })
              });
              toast("Đã vô hiệu hóa mã!");
              loadCodes();
            } catch (e) {
              alert("Lỗi: " + e.message);
            }
          }
        };
      });

      tableBox.querySelectorAll('.btn-delete-code').forEach(btn => {
        btn.onclick = async () => {
          const codeToDelete = btn.dataset.code;
          btn.disabled = true;
          btn.innerText = 'Đang xóa...';
          try {
            await callAdminApi('/api/admin/codes/delete', {
              method: 'POST',
              body: JSON.stringify({ code: codeToDelete })
            });
            toast(`Đã xóa mã kích hoạt ${codeToDelete}`);
            loadCodes();
          } catch (e) {
            alert("Lỗi xóa mã: " + e.message);
            btn.disabled = false;
            btn.innerText = 'Xóa';
          }
        };
      });
    } catch (err) {
      tableBox.innerHTML = `<span class="text-rose-500">Lỗi: ${esc(err.message)}</span>`;
    }
  }

  loadCodes();
  document.getElementById('codeFilterStatus').onchange = loadCodes;

  // Submit tạo mã
  const form = document.getElementById('createCodesForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitCreateCodes');
      btn.disabled = true;
      btn.innerText = 'Đang tạo...';

      try {
        await callAdminApi('/api/admin/codes/create', {
          method: 'POST',
          body: JSON.stringify({
            tier: document.getElementById('codeTierSelect').value,
            days: parseInt(document.getElementById('codeDaysSelect').value, 10),
            quantity: parseInt(document.getElementById('codeQtyInput').value, 10),
            note: document.getElementById('codeNoteInput').value
          })
        });
        toast("Đã tạo thành công lô mã kích hoạt!");
        loadCodes();
      } catch (err) {
        alert("Lỗi tạo mã: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Tạo lô mã ngay';
      }
    };
  }

  // Xuất CSV
  document.getElementById('btnExportCodesCsv').onclick = () => {
    if (!currentLoadedCodes.length) {
      alert("Không có dữ liệu mã để xuất.");
      return;
    }
    const headers = ["Ma_Kich_Hoat", "Goi", "So_Ngay", "Trang_Thai", "Nguoi_Kich_Hoat", "Email", "Ghi_Chu", "Ngay_Tao", "Ngay_Kich_Hoat"];
    const rows = currentLoadedCodes.map(c => [
      c.code,
      c.tier,
      c.days,
      c.isDisabled ? 'Disabled' : (c.isUsed ? 'Used' : 'Available'),
      `"${(c.usedByUserName || '').replace(/"/g, '""')}"`,
      `"${(c.usedByUserEmail || c.usedBy || '').replace(/"/g, '""')}"`,
      `"${(c.note || '').replace(/"/g, '""')}"`,
      c.createdAt || '',
      c.usedAt || ''
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_kich_hoat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}

// =========================================================================
// 3.5 MỤC 5: NHẬT KÝ QUẢN TRỊ (AUDIT LOGS - READ-ONLY)
// =========================================================================
function renderAuditTab(container) {
  container.innerHTML = `
    <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Nhật ký thao tác quản trị (Audit Logs)</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Ghi nhận tự động từ máy chủ. Chỉ xem (Read-only), không thể chỉnh sửa hay xóa.</p>
        </div>

        <select id="auditActionFilter" class="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#161A20]">
          <option value="all">Tất cả hành động</option>
          <option value="plans_update">Đổi hạn mức các gói</option>
          <option value="plans_restore">Khôi phục hạn mức</option>
          <option value="pricing_update">Đổi bảng giá</option>
          <option value="user_grant">Cấp / gia hạn gói</option>
          <option value="user_revoke">Thu hồi gói</option>
          <option value="codes_create">Tạo mã kích hoạt</option>
          <option value="code_disable">Vô hiệu mã</option>
        </select>
      </div>

      <div id="auditLogListContainer" class="overflow-x-auto text-xs text-gray-500">
        Đang tải nhật ký...
      </div>
    </div>
  `;

  async function loadAudit() {
    const box = document.getElementById('auditLogListContainer');
    if (!box) return;
    const filter = (document.getElementById('auditActionFilter') ? document.getElementById('auditActionFilter').value : null) || 'all';
    box.innerHTML = 'Đang tải dữ liệu...';

    try {
      const data = await callAdminApi(`/api/admin/audit?action=${filter}`);
      const logs = data.logs || [];
      if (logs.length === 0) {
        box.innerHTML = 'Chưa có bản ghi nhật ký nào.';
        return;
      }

      box.innerHTML = `
        <div class="space-y-2.5">
          ${logs.map(log => `
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-indigo-600 uppercase text-[11px]">${esc(log.action)}</span>
                <span class="text-gray-400 font-mono text-[11px]">${log.isoTime ? new Date(log.isoTime).toLocaleString('vi-VN') : 'N/A'}</span>
              </div>
              <div class="text-gray-800 dark:text-gray-200 font-medium">${esc(log.details || '—')}</div>
              <div class="text-[10px] text-gray-400 font-mono">Admin UID: ${esc(log.uid || 'system')}</div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      box.innerHTML = `<span class="text-rose-500">Lỗi: ${esc(err.message)}</span>`;
    }
  }

  loadAudit();
  document.getElementById('auditActionFilter').onchange = loadAudit;
}


// =========================================================================
// 3.6 MỤC 6: AI & API KEY (QUẢN LÝ KHÓA, MODEL, HẠN MỨC & GIÁM SÁT CHI PHÍ)
// =========================================================================
async function renderAiTab(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center p-8 text-xs text-gray-500">
      <div class="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></div>
      Đang tải cấu hình AI và thông số nhà cung cấp...
    </div>
  `;

  let aiSettings = {};
  let aiUsageData = {};

  try {
    const [settingsRes, usageRes] = await Promise.all([
      callAdminApi('/api/admin/ai/settings'),
      callAdminApi('/api/admin/ai/usage')
    ]);
    aiSettings = settingsRes.settings || {};
    aiUsageData = usageRes || {};
  } catch (err) {
    container.innerHTML = `<div class="p-4 rounded-xl bg-rose-50 text-rose-600 text-xs">Lỗi tải dữ liệu: ${esc(err.message)}</div>`;
    return;
  }

  const providersConfig = aiSettings.providers || {};
  const currentPriority = Array.isArray(aiSettings.priority) && aiSettings.priority.length > 0
    ? aiSettings.priority
    : ['gemini', 'openai', 'claude'];
  const dailyCap = aiSettings.dailyRequestCap || 0;
  const isCapped = aiUsageData.isCapped || false;

  const PROVIDER_INFO = {
    gemini: {
      name: 'Google Gemini',
      tagline: 'Mô hình đa phương thức thế hệ mới của Google, tốc độ cao & chi phí tối ưu.',
      defaultFast: 'gemini-2.5-flash',
      defaultStrong: 'gemini-1.5-pro',
      availableModels: [
        { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (Siêu nhanh, khuyên dùng)' },
        { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (Ổn định, phản hồi nhanh)' },
        { id: 'gemini-1.5-flash-8b', name: 'gemini-1.5-flash-8b (Siêu nhẹ, tiết kiệm)' },
        { id: 'gemini-2.5-pro', name: 'gemini-2.5-pro (Cực mạnh, thế hệ mới)' },
        { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (Phân tích sâu, chi tiết)' },
        { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Flash 2.0)' }
      ]
    },
    claude: {
      name: 'Anthropic Claude',
      tagline: 'Dòng mô hình Claude 3.5 với năng lực đọc hiểu văn bản & ngữ nghĩa sâu.',
      defaultFast: 'claude-3-5-haiku-20241022',
      defaultStrong: 'claude-3-5-sonnet-20241022',
      availableModels: [
        { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku-20241022 (Rất nhanh & rẻ)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022 (Thông minh nhất)' },
        { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229 (Phân tích phức tạp)' },
        { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307' }
      ]
    },
    openai: {
      name: 'OpenAI (GPT)',
      tagline: 'Các mô hình GPT-4o và GPT-4o Mini chuẩn mực cho sinh dữ liệu có cấu trúc.',
      defaultFast: 'gpt-4o-mini',
      defaultStrong: 'gpt-4o',
      availableModels: [
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini (Nhanh & rẻ, tối ưu)' },
        { id: 'gpt-4o', name: 'gpt-4o (Toàn diện, mạnh mẽ)' },
        { id: 'o3-mini', name: 'o3-mini (Lý luận nhanh)' },
        { id: 'o1-mini', name: 'o1-mini (Lý luận nhẹ)' },
        { id: 'o1', name: 'o1 (Lý luận chuyên sâu)' },
        { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
        { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }
      ]
    }
  };

  container.innerHTML = `
    <div class="space-y-6">
      <!-- CẢNH BÁO NẾU CHẠM TRẦN CHI TIÊU HÀNG NGÀY -->
      ${isCapped ? `
        <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong>CẢNH BÁO: ĐÃ CHẠM TRẦN CHI TIÊU HÀNG NGÀY (${aiUsageData.todayRequests}/${dailyCap} lượt)!</strong>
              <div>Hệ thống đã tự động tạm dừng các yêu cầu AI mới của người dùng để bảo vệ ngân sách. Bạn có thể tăng trần bên dưới nếu muốn tiếp tục.</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TIÊU ĐỀ KHU VỰC -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Cấu hình Khóa API &amp; Nhà cung cấp Trí tuệ Nhân tạo</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Toàn bộ API key được mã hóa AES-256-GCM tại máy chủ. Client không bao giờ lưu hay đọc được key gốc.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Hôm nay: ${aiUsageData.todayRequests || 0} lượt
          </span>
        </div>
      </div>

      <!-- DANH SÁCH 3 THẺ NHÀ CUNG CẤP -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        ${['gemini', 'claude', 'openai'].map(prov => {
          const info = PROVIDER_INFO[prov];
          const pConf = providersConfig[prov] || {};
          const isConfigured = Boolean(pConf.isConfigured);
          const maskedKey = pConf.maskedKey || '';
          const status = pConf.status || 'not_configured';

          let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">Chưa có key</span>';
          if (status === 'ready') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Sẵn sàng hoạt động</span>';
          } else if (status === 'saved') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Đã lưu key</span>';
          } else if (status === 'error') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Key lỗi / hết hạn</span>';
          }

          const currentFastModel = (aiSettings.models && aiSettings.models[prov] && aiSettings.models[prov].fast) || info.defaultFast;
          const currentStrongModel = (aiSettings.models && aiSettings.models[prov] && aiSettings.models[prov].strong) || info.defaultStrong;

          const renderModelOptions = (modelsList, selectedValue) => {
            let hasSelected = false;
            let optionsHtml = (modelsList || []).map(m => {
              const isSel = m.id === selectedValue;
              if (isSel) hasSelected = true;
              return `<option value="${esc(m.id)}" ${isSel ? 'selected' : ''}>${esc(m.name || m.id)}</option>`;
            }).join('');

            if (selectedValue && !hasSelected) {
              optionsHtml = `<option value="${esc(selectedValue)}" selected>${esc(selectedValue)} (Hiện tại)</option>` + optionsHtml;
            }
            return optionsHtml;
          };

          return `
            <div class="bg-white dark:bg-[#1A1D23] rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs p-5 flex flex-col justify-between space-y-4" data-provider-card="${prov}">
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">${esc(info.name)}</h4>
                    <p class="text-[11px] text-gray-500 line-clamp-1">${esc(info.tagline)}</p>
                  </div>
                  <div>${statusBadge}</div>
                </div>

                <!-- Ô NHẬP API KEY -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    API Key ${isConfigured ? `<span class="text-indigo-600 font-mono text-[11px]">(${esc(maskedKey)})</span>` : ''}
                  </label>
                  <div class="relative">
                    <input type="password" id="inputKey_${prov}" autocomplete="off" placeholder="${isConfigured ? 'Nhập key mới để đè...' : 'Dán API key...'}" class="w-full px-3 py-2 pr-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] text-xs font-mono" />
                    <button type="button" class="btn-toggle-key-eye absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" data-target="inputKey_${prov}">
                      👁
                    </button>
                  </div>
                </div>

                <!-- CÁC NÚT THAO TÁC KEY -->
                <div class="flex items-center gap-2">
                  <button type="button" class="btn-save-key flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition" data-provider="${prov}">
                    Lưu key
                  </button>
                  <button type="button" class="btn-test-key px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-semibold text-xs transition ${!isConfigured ? 'opacity-50 pointer-events-none' : ''}" data-provider="${prov}">
                    Kiểm tra
                  </button>
                  ${isConfigured ? `
                    <button type="button" class="btn-delete-key px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold" data-provider="${prov}" title="Xóa key">
                      ✕
                    </button>
                  ` : ''}
                </div>

                <div id="testResultBox_${prov}" class="text-[11px] hidden p-2 rounded-lg"></div>

                <!-- CHỌN MODEL NHANH & MẠNH (DẠNG DROPDOWN) -->
                <div class="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Model nhanh / rẻ (Độ khó &amp; Flashcard):</label>
                    <div class="relative">
                      <select id="modelFast_${prov}" class="model-select-dropdown w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-mono font-medium text-[#1C1B18] dark:text-[#E8E6E1] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs">
                        ${renderModelOptions(info.availableModels, currentFastModel)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Model mạnh (Phân tích nâng cao):</label>
                    <div class="relative">
                      <select id="modelStrong_${prov}" class="model-select-dropdown w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-mono font-medium text-[#1C1B18] dark:text-[#E8E6E1] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs">
                        ${renderModelOptions(info.availableModels, currentStrongModel)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              ${pConf.lastTested ? `
                <div class="text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                  Kiểm tra lần cuối: ${new Date(pConf.lastTested).toLocaleString('vi-VN')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- PHẦN 2: THỨ TỰ ƯU TIÊN VÀ TRẦN CHI TIÊU HÀNG NGÀY -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- CHỌN THỨ TỰ ƯU TIÊN NHÀ CUNG CẤP -->
        <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
          <div>
            <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Thứ tự ưu tiên nhà cung cấp &amp; Dự phòng</h4>
            <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Nếu nhà cung cấp đầu tiên bị lỗi hoặc hết hạn mức, hệ thống sẽ tự động chuyển sang nhà cung cấp tiếp theo (Failover).</p>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Thứ tự ưu tiên xử lý:</label>
            <select id="aiPrioritySelect" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-medium">
              <option value="gemini,openai,claude" ${currentPriority.join(',') === 'gemini,openai,claude' ? 'selected' : ''}>1. Gemini → 2. OpenAI → 3. Claude (Tối ưu chi phí nhất)</option>
              <option value="openai,gemini,claude" ${currentPriority.join(',') === 'openai,gemini,claude' ? 'selected' : ''}>1. OpenAI → 2. Gemini → 3. Claude</option>
              <option value="claude,gemini,openai" ${currentPriority.join(',') === 'claude,gemini,openai' ? 'selected' : ''}>1. Claude → 2. Gemini → 3. OpenAI (Chất lượng phân tích cao)</option>
              <option value="gemini,claude,openai" ${currentPriority.join(',') === 'gemini,claude,openai' ? 'selected' : ''}>1. Gemini → 2. Claude → 3. OpenAI</option>
            </select>
          </div>

          <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300">Trần chi tiêu ngày (Số lượt request tối đa/ngày):</label>
            <div class="flex items-center gap-2">
              <input type="number" id="aiDailyCapInput" min="0" max="100000" step="50" value="${dailyCap}" class="w-36 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-bold font-mono" />
              <span class="text-xs text-gray-500">(0 = không giới hạn trần)</span>
            </div>
            <p class="text-[11px] text-gray-400">Khi đạt tới số lượt này trong ngày, AI sẽ tự động ngưng để tránh phát sinh chi phí ngoài ý muốn.</p>
          </div>

          <button type="button" id="btnSaveAiSettings" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs">
            Lưu thứ tự ưu tiên &amp; Cài đặt AI
          </button>
        </div>

        <!-- BẢNG GIÁM SÁT SỬ DỤNG GẦN ĐÂY -->
        <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Giám sát sử dụng 14 ngày qua</h4>
            <span class="text-xs text-indigo-600 font-bold">${aiUsageData.grandRequests || 0} lượt gọi</span>
          </div>

          <div class="overflow-x-auto max-h-[220px] overflow-y-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 text-gray-400 font-semibold">
                  <th class="py-1.5 px-2">Ngày</th>
                  <th class="py-1.5 px-2 text-center">Lượt gọi</th>
                  <th class="py-1.5 px-2 text-right">Ước tính Tokens</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                ${(aiUsageData.dailyUsage || []).length > 0 ? (aiUsageData.dailyUsage || []).map(u => `
                  <tr>
                    <td class="py-2 px-2 font-mono">${u.date}</td>
                    <td class="py-2 px-2 text-center font-bold text-indigo-600">${u.totalRequests}</td>
                    <td class="py-2 px-2 text-right font-mono text-gray-500">${(u.totalTokens || 0).toLocaleString()}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="3" class="py-4 text-center text-gray-400">Chưa có phát sinh lượt gọi AI nào.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
            Hạn mức theo từng gói thành viên (Khách / Thường / Plus / Pro) có thể điều chỉnh linh hoạt tại thẻ <strong>Hạn mức các gói</strong>.
          </div>
        </div>
      </div>
    </div>
  `;

  bindAiTabEvents(container);
}

function bindAiTabEvents(container) {
  // Hiện/ẩn mật khẩu cho ô đang gõ
  container.querySelectorAll('.btn-toggle-key-eye').forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    };
  });

  // Lưu key
  container.querySelectorAll('.btn-save-key').forEach(btn => {
    btn.onclick = async () => {
      const prov = btn.dataset.provider;
      const input = document.getElementById(`inputKey_${prov}`);
      const keyVal = input ? input.value.trim() : '';

      if (!keyVal) {
        alert("Vui lòng nhập API key cần lưu.");
        return;
      }

      btn.disabled = true;
      btn.innerText = 'Đang lưu...';
      try {
        const res = await callAdminApi('/api/admin/ai/save-key', {
          method: 'POST',
          body: JSON.stringify({ provider: prov, apiKey: keyVal })
        });
        toast(`Đã lưu API key cho ${prov.toUpperCase()} (${res.maskedKey}) thành công!`);
        input.value = '';
        renderAiTab(container);
      } catch (err) {
        alert("Lỗi khi lưu key: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Lưu key';
      }
    };
  });

  // Kiểm tra key
  container.querySelectorAll('.btn-test-key').forEach(btn => {
    btn.onclick = async () => {
      const prov = btn.dataset.provider;
      const box = document.getElementById(`testResultBox_${prov}`);
      if (box) {
        box.classList.remove('hidden');
        box.className = "text-[11px] p-2 rounded-lg bg-gray-100 text-gray-600";
        box.innerText = "Đang gửi yêu cầu kiểm tra tới máy chủ...";
      }

      btn.disabled = true;
      try {
        const res = await callAdminApi('/api/admin/ai/test', {
          method: 'POST',
          body: JSON.stringify({ provider: prov })
        });

        if (box) {
          box.className = `text-[11px] p-2 rounded-lg ${res.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`;
          box.innerText = res.message;
        }
        toast(res.success ? "Kết nối AI thành công!" : "Kiểm tra kết nối thất bại.");
      } catch (err) {
        if (box) {
          box.className = "text-[11px] p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200";
          box.innerText = "Lỗi kiểm tra: " + err.message;
        }
      } finally {
        btn.disabled = false;
      }
    };
  });

  // Xóa key
  container.querySelectorAll('.btn-delete-key').forEach(btn => {
    btn.onclick = async () => {
      const prov = btn.dataset.provider;
      if (confirm(`Bạn có chắc chắn muốn XÓA hoàn toàn API key của ${prov.toUpperCase()}?`)) {
        btn.disabled = true;
        try {
          await callAdminApi('/api/admin/ai/delete-key', {
            method: 'POST',
            body: JSON.stringify({ provider: prov })
          });
          toast(`Đã xóa API key của ${prov.toUpperCase()}!`);
          renderAiTab(container);
        } catch (err) {
          alert("Lỗi xóa key: " + err.message);
        } finally {
          btn.disabled = false;
        }
      }
    };
  });

  // Lắng nghe thay đổi dropdown model để tự động lưu và cập nhật
  container.querySelectorAll('.model-select-dropdown').forEach(sel => {
    sel.onchange = async () => {
      const btnSaveSettings = container.querySelector('#btnSaveAiSettings');
      if (btnSaveSettings) {
        btnSaveSettings.classList.add('ring-2', 'ring-indigo-400');
      }

      // Tự động đồng bộ cài đặt model ngay khi người dùng chọn trong dropdown
      const prioStr = document.getElementById('aiPrioritySelect') ? document.getElementById('aiPrioritySelect').value : 'gemini,openai,claude';
      const dailyCap = document.getElementById('aiDailyCapInput') ? (parseInt(document.getElementById('aiDailyCapInput').value, 10) || 0) : 0;
      const modelsPayload = {};
      ['gemini', 'claude', 'openai'].forEach(p => {
        const fastEl = document.getElementById(`modelFast_${p}`);
        const strongEl = document.getElementById(`modelStrong_${p}`);
        modelsPayload[p] = {
          fast: fastEl ? fastEl.value.trim() : '',
          strong: strongEl ? strongEl.value.trim() : ''
        };
      });

      try {
        await callAdminApi('/api/admin/ai/settings', {
          method: 'POST',
          body: JSON.stringify({
            priority: prioStr.split(','),
            dailyRequestCap: dailyCap,
            models: modelsPayload
          })
        });
        toast(`Đã chọn và cập nhật model: ${sel.value}`);
      } catch (err) {
        console.warn("Lỗi auto-save model:", err);
        toast(`Đã chọn model: ${sel.value}. Hãy bấm "Lưu thứ tự ưu tiên" để áp dụng.`);
      }
    };
  });

  // Lưu cài đặt AI
  const btnSaveSettings = container.querySelector('#btnSaveAiSettings');
  if (btnSaveSettings) {
    btnSaveSettings.onclick = async () => {
      btnSaveSettings.disabled = true;
      btnSaveSettings.innerText = 'Đang lưu...';

      const prioStr = document.getElementById('aiPrioritySelect').value;
      const dailyCap = parseInt(document.getElementById('aiDailyCapInput').value, 10) || 0;

      const modelsPayload = {};
      ['gemini', 'claude', 'openai'].forEach(p => {
        const fastEl = document.getElementById(`modelFast_${p}`);
        const strongEl = document.getElementById(`modelStrong_${p}`);
        modelsPayload[p] = {
          fast: fastEl ? fastEl.value.trim() : '',
          strong: strongEl ? strongEl.value.trim() : ''
        };
      });

      try {
        await callAdminApi('/api/admin/ai/settings', {
          method: 'POST',
          body: JSON.stringify({
            priority: prioStr.split(','),
            dailyRequestCap: dailyCap,
            models: modelsPayload
          })
        });
        toast("Đã lưu cấu hình AI & Thứ tự ưu tiên thành công!");
      } catch (err) {
        alert("Lỗi lưu cấu hình: " + err.message);
      } finally {
        btnSaveSettings.disabled = false;
        btnSaveSettings.innerText = 'Lưu thứ tự ưu tiên & Cài đặt AI';
      }
    };
  }
}


// =========================================================================
// 3.7 MỤC 7: QUẢN TRỊ THANH TOÁN VIETQR & ĐƠN HÀNG NÂNG CẤP (BILLING)
// =========================================================================
let currentBillingSubTab = 'orders'; // 'orders' hoặc 'config'

function normalizeAccountName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'D')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function renderBillingTab(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-16 text-gray-400 text-xs gap-2">
      <svg class="w-5 h-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="10" r="10" stroke-width="2" stroke-dasharray="32" stroke-linecap="round"/></svg>
      <span>Đang tải dữ liệu thanh toán VietQR & Đơn hàng...</span>
    </div>
  `;

  try {
    const [cfgRes, ordersRes, banksRes] = await Promise.all([
      callAdminApi('/api/admin/billing/config').catch(() => ({ bankTransfer: {}, vietqrSecrets: {} })),
      callAdminApi('/api/admin/billing/orders?status=all&limit=250').catch(() => ({ orders: [], counts: {} })),
      callAdminApi('/api/admin/billing/banks').catch(() => ({ banks: [] }))
    ]);

    const bankTransfer = cfgRes.bankTransfer || {};
    const secrets = cfgRes.vietqrSecrets || {};
    const orders = sortOrdersByPriority(ordersRes.orders || []);
    const counts = ordersRes.counts || {};

    // Danh sách ngân hàng VietQR chính thức
    let banksList = (banksRes && Array.isArray(banksRes.banks) && banksRes.banks.length > 0) ? banksRes.banks : [
      { bin: '970403', code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
      { bin: '970422', code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân Đội' },
      { bin: '970436', code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam' },
      { bin: '970415', code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
      { bin: '970418', code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam' },
      { bin: '970407', code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
      { bin: '970416', code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
      { bin: '970432', code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
      { bin: '970423', code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' }
    ];

    // Seed khởi tạo mặc định nếu Firestore chưa từng được cấu hình: Sacombank
    const activeBankId = bankTransfer.bankId || '970403';
    const activeAccountNo = bankTransfer.accountNo || '100071864927';
    const activeAccountName = bankTransfer.accountName || 'LE BUI MINH CUONG';
    const activeTemplate = bankTransfer.template || 'compact';
    const activeTimeout = bankTransfer.orderTimeoutMinutes || 15;
    const activeQrMode = bankTransfer.qrMode || 'quick';

    const userConfirmedCount = counts.userConfirmed || 0;
    const pendingDot = document.getElementById('adminPendingOrdersDot');
    if (pendingDot) {
      if (userConfirmedCount > 0) pendingDot.classList.remove('hidden');
      else pendingDot.classList.add('hidden');
    }

    // Tạo các option cho dropdown ngân hàng
    const bankOptionsHtml = banksList.map(b => {
      const isSelected = String(b.bin) === String(activeBankId) || String(b.code).toUpperCase() === String(bankTransfer.bankName || '').toUpperCase();
      return `<option value="${esc(b.bin)}" data-code="${esc(b.code)}" data-short="${esc(b.shortName)}" data-name="${esc(b.name)}" ${isSelected ? 'selected' : ''}>${esc(b.shortName)} - ${esc(b.name)} (${esc(b.bin)})</option>`;
    }).join('');

    const safeAccName = encodeURIComponent(activeAccountName);
    const initialPreviewUrl = `https://img.vietqr.io/image/${activeBankId}-${activeAccountNo}-${activeTemplate}.png?amount=50000&addInfo=TVHTEST123&accountName=${safeAccName}`;

    container.innerHTML = `
      <div class="space-y-5">
        <!-- TIÊU ĐỀ KHU VỰC VÀ THANH ĐIỀU HƯỚNG TAB CON -->
        <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-2xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Quản lý Thanh toán VietQR &amp; Đơn hàng</h3>
            <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Cấu hình nhận tiền chuyển khoản, kiểm tra tạo mã QR và duyệt kích hoạt gói thủ công.</p>
          </div>
          <div class="flex items-center gap-2 bg-[#F8F7F4] dark:bg-[#14171C] p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold">
            <button type="button" id="btnSubTabOrders" class="px-3.5 py-1.5 rounded-lg transition ${currentBillingSubTab === 'orders' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}">
              <span>Đơn hàng (${orders.length})</span>
              ${userConfirmedCount > 0 ? `<span class="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">${userConfirmedCount}</span>` : ''}
            </button>
            <button type="button" id="btnSubTabConfig" class="px-3.5 py-1.5 rounded-lg transition ${currentBillingSubTab === 'config' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'}">
              Cấu hình VietQR
            </button>
          </div>
        </div>

        <!-- NỘI DUNG TAB CON 1: DANH SÁCH ĐƠN HÀNG -->
        <div id="billingSubTabOrdersContainer" class="${currentBillingSubTab === 'orders' ? '' : 'hidden'} space-y-4">
          <div class="bg-white dark:bg-[#1A1D23] p-4 rounded-2xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <input type="text" id="billingSearchOrderInput" placeholder="Tìm theo mã TVH, email, UID..." class="w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] text-xs font-medium" />
              <select id="billingStatusFilter" class="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-semibold">
                <option value="all">Tất cả trạng thái</option>
                <option value="user_confirmed">Khách báo đã chuyển</option>
                <option value="pending">Chờ thanh toán</option>
                <option value="paid">Đã kích hoạt (Paid)</option>
                <option value="expired">Hết hạn</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div class="text-xs text-gray-500">
              Có <strong>${userConfirmedCount}</strong> đơn khách báo đã chuyển cần duyệt.
            </div>
          </div>

          <!-- THANH THAO TÁC HÀNG LOẠT (BULK ACTIONS) -->
          <div id="bulkOrdersActionsBar" class="hidden p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between flex-wrap gap-2 text-xs shadow-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span class="font-bold text-indigo-950 dark:text-indigo-200">
                Đã chọn <span id="selectedOrdersCount" class="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">0</span> đơn hàng
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="btnBulkConfirmOrders" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Xác nhận hàng loạt</span>
              </button>
              <button type="button" id="btnBulkCancelOrders" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Hủy hàng loạt</span>
              </button>
              <button type="button" id="btnDeselectAllOrders" class="px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-xs transition cursor-pointer">
                Bỏ chọn
              </button>
            </div>
          </div>

          <div class="bg-white dark:bg-[#1A1D23] rounded-2xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 dark:border-gray-800 bg-[#F8F7F4]/60 dark:bg-[#14171C]/60 text-gray-500 font-semibold">
                    <th class="py-3 px-3 text-center w-10">
                      <input type="checkbox" id="selectAllOrdersCheckbox" class="rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" title="Chọn tất cả">
                    </th>
                    <th class="py-3 px-3.5">Mã đơn / Nội dung CK</th>
                    <th class="py-3 px-3.5">Người dùng</th>
                    <th class="py-3 px-3.5">Gói / Chu kỳ</th>
                    <th class="py-3 px-3.5 text-right">Số tiền</th>
                    <th class="py-3 px-3.5 text-center">Biên lai</th>
                    <th class="py-3 px-3.5 text-center">Trạng thái</th>
                    <th class="py-3 px-3.5">Thời gian</th>
                    <th class="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800" id="billingOrdersTableBody">
                  ${renderOrdersTableRows(orders)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- NỘI DUNG TAB CON 2: CẤU HÌNH VIETQR -->
        <div id="billingSubTabConfigContainer" class="${currentBillingSubTab === 'config' ? '' : 'hidden'} space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- KHỐI 1: THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN -->
            <div class="lg:col-span-2 bg-white dark:bg-[#1A1D23] p-5 rounded-2xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
              <div class="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Thông tin tài khoản nhận tiền (VietQR)</h4>
                  <p class="text-xs text-gray-500">Mã QR tạo ra sẽ chứa thông tin tài khoản này cùng nội dung chuyển khoản tự động.</p>
                </div>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">VietQR v2</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="sm:col-span-2">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block font-semibold text-gray-700 dark:text-gray-300">Ngân hàng nhận:</label>
                    <span class="text-[11px] text-gray-400">${banksList.length} ngân hàng được hỗ trợ</span>
                  </div>
                  <select id="cfgBankId" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-medium text-xs">
                    ${bankOptionsHtml}
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Số tài khoản nhận:</label>
                  <input type="text" id="cfgAccountNo" value="${esc(activeAccountNo)}" placeholder="100071864927" maxlength="19" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] font-mono font-bold" />
                  <p class="text-[10px] text-gray-400 mt-1">Chỉ gồm chữ số (từ 6 đến 19 số)</p>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Tên chủ tài khoản (Viết hoa không dấu):</label>
                  <input type="text" id="cfgAccountName" value="${esc(activeAccountName)}" placeholder="LE BUI MINH CUONG" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] uppercase font-bold" />
                  <p class="text-[10px] text-gray-400 mt-1">Tự động viết hoa và chuyển tiếng Việt không dấu</p>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Mẫu mã QR (Template):</label>
                  <select id="cfgTemplate" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-medium">
                    <option value="compact" ${activeTemplate === 'compact' ? 'selected' : ''}>compact (Gọn, kèm STK và tên - Đề xuất)</option>
                    <option value="compact2" ${activeTemplate === 'compact2' ? 'selected' : ''}>compact2 (Hiện đại bo tròn)</option>
                    <option value="qr_only" ${activeTemplate === 'qr_only' ? 'selected' : ''}>qr_only (Chỉ mã QR)</option>
                    <option value="print" ${activeTemplate === 'print' ? 'selected' : ''}>print (Mẫu in thẻ lớn)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Thời hạn đơn hàng (Phút):</label>
                  <input type="number" id="cfgTimeoutMinutes" min="5" max="60" value="${activeTimeout}" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] font-bold" />
                </div>

                <div class="sm:col-span-2">
                  <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Chế độ sinh QR:</label>
                  <select id="cfgQrMode" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] font-medium">
                    <option value="quick" ${activeQrMode !== 'api' ? 'selected' : ''}>Ảnh QR nhanh (img.vietqr.io - Miễn phí, ổn định, không cần key)</option>
                    <option value="api" ${activeQrMode === 'api' ? 'selected' : ''}>VietQR Open API v2 (Dùng Client ID & API Key)</option>
                  </select>
                </div>
              </div>

              <!-- KHÓA BÍ MẬT VIETQR API (NẾU DÙNG CHẾ ĐỘ API) -->
              <div id="cfgApiSecretsGroup" class="p-4 rounded-xl bg-gray-50 dark:bg-[#161A20] border border-gray-200 dark:border-gray-800 space-y-3 ${activeQrMode === 'api' ? '' : 'hidden'}">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-indigo-600">Khóa bí mật VietQR Open API v2 (Lưu mã hóa AES-256)</span>
                  <span>${secrets.isConfigured ? '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">Đã lưu khóa</span>' : '<span class="px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-600">Chưa có khóa</span>'}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label class="block text-gray-500 mb-1">Client ID ${secrets.maskedClientId ? `(${esc(secrets.maskedClientId)})` : ''}</label>
                    <input type="password" id="cfgVietqrClientId" placeholder="Nhập Client ID mới..." class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D23] font-mono text-xs" />
                  </div>
                  <div>
                    <label class="block text-gray-500 mb-1">API Key ${secrets.maskedApiKey ? `(${esc(secrets.maskedApiKey)})` : ''}</label>
                    <input type="password" id="cfgVietqrApiKey" placeholder="Nhập API Key mới..." class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1D23] font-mono text-xs" />
                  </div>
                </div>
              </div>

              <div class="pt-2 flex items-center justify-end gap-2.5">
                <button type="button" id="btnTestQr" class="px-4 py-2.5 rounded-xl border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-50 transition">
                  Kiểm tra tạo QR mẫu
                </button>
                <button type="button" id="btnSaveBillingConfig" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition">
                  Lưu cấu hình thanh toán
                </button>
              </div>
            </div>

            <!-- KHỐI 2: XEM TRƯỚC MÃ QR VÀ THÔNG TIN CHUYỂN KHOẢN -->
            <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-2xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1] mb-1">Xem trước như khách thấy</h4>
                <p class="text-xs text-gray-500 mb-3">Mã QR mẫu với số tiền thử nghiệm 50.000 ₫.</p>

                <div class="p-3 bg-gray-50 dark:bg-[#14171C] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col items-center">
                  <div class="bg-white p-2 rounded-xl shadow-xs border border-gray-200">
                    <img id="previewQrImg" src="${initialPreviewUrl}" alt="QR Preview" class="w-48 h-48 object-contain rounded" />
                  </div>
                  <div class="mt-3 text-center text-xs space-y-1">
                    <div class="font-bold font-mono text-indigo-600">TVHTEST123</div>
                    <div id="previewAccountName" class="font-bold uppercase text-[11px]">${esc(activeAccountName)}</div>
                    <div id="previewAccountNo" class="text-[11px] text-gray-500">${esc(activeAccountNo)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindBillingTabEvents(container, orders);
  } catch (err) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
        Lỗi tải bảng thanh toán: ${esc(err.message)}
      </div>
    `;
  }
}

function sortOrdersByPriority(orders) {
  if (!Array.isArray(orders)) return [];
  const STATUS_PRIORITY = {
    'user_confirmed': 1, // Khách báo đã chuyển (ưu tiên số 1 - cần duyệt ngay)
    'pending': 2,        // Chờ thanh toán
    'paid': 3,           // Đã kích hoạt
    'cancelled': 4,      // Đã hủy
    'expired': 5         // Hết hạn
  };

  return orders.slice().sort((a, b) => {
    const pA = STATUS_PRIORITY[a.status] || 99;
    const pB = STATUS_PRIORITY[b.status] || 99;
    if (pA !== pB) return pA - pB;
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });
}

function renderSingleOrderRow(ord) {
  let statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">Chờ thanh toán</span>`;
  if (ord.status === 'paid') {
    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">Đã kích hoạt</span>`;
  } else if (ord.status === 'user_confirmed') {
    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 animate-pulse">Khách báo đã chuyển</span>`;
  } else if (ord.status === 'expired') {
    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">Hết hạn</span>`;
  } else if (ord.status === 'cancelled') {
    statusBadge = `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">Đã hủy</span>`;
  }

  const createdDate = ord.createdAt ? new Date(ord.createdAt).toLocaleString('vi-VN') : '—';
  const amountStr = (ord.amount || 0).toLocaleString('vi-VN') + ' ₫';
  const planText = `${(ord.planId || '').toUpperCase()} (${ord.period === 'yearly' ? 'Năm' : 'Tháng'})`;
  const isPending = ord.status === 'user_confirmed' || ord.status === 'pending';

  return `
    <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition ${ord.status === 'user_confirmed' ? 'bg-amber-50/25 dark:bg-amber-950/15' : ''} ${!isPending ? 'opacity-85' : ''}">
      <td class="py-3 px-3 text-center">
        <input type="checkbox" class="order-select-checkbox rounded border-gray-300 dark:border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" data-id="${esc(ord.id)}" data-code="${esc(ord.code)}" data-status="${esc(ord.status)}">
      </td>
      <td class="py-3 px-3.5">
        <div class="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">${esc(ord.code)}</div>
        <div class="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
          <span>Nội dung CK:</span>
          <span class="font-mono font-bold text-gray-800 dark:text-gray-200 select-all">${esc(ord.code)}</span>
          <button type="button" class="btn-admin-copy-code p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 transition cursor-pointer" data-code="${esc(ord.code)}" title="Sao chép nội dung chuyển khoản">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </td>
      <td class="py-3 px-3.5">
        <div class="font-medium text-[#1C1B18] dark:text-[#E8E6E1]">${esc(ord.userEmail || 'Ẩn danh')}</div>
        <div class="text-[10px] text-gray-400 font-mono">${esc((ord.uid || '').substring(0, 10))}...</div>
      </td>
      <td class="py-3 px-3.5 font-semibold text-gray-700 dark:text-gray-300">${esc(planText)}</td>
      <td class="py-3 px-3.5 text-right font-mono font-bold text-[#1C1B18] dark:text-[#E8E6E1]">${esc(amountStr)}</td>
      <td class="py-3 px-3.5 text-center">
        ${ord.proofUrl ? `
          <button type="button" class="btn-admin-view-proof inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800 transition cursor-pointer active:scale-95 shadow-2xs" data-img="${esc(ord.proofUrl)}" data-code="${esc(ord.code)}" data-amount="${esc(amountStr)}" data-email="${esc(ord.userEmail || 'Ẩn danh')}" data-id="${esc(ord.id)}" data-status="${esc(ord.status)}" title="Bấm để xem ảnh biên lai chuyển khoản">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Xem bill</span>
          </button>
        ` : `
          <span class="text-[11px] text-gray-400 italic">Chưa có</span>
        `}
      </td>
      <td class="py-3 px-3.5 text-center">${statusBadge}</td>
      <td class="py-3 px-3.5 text-gray-500 text-[11px]">${esc(createdDate)}</td>
      <td class="py-3 px-3.5 text-right space-x-1 whitespace-nowrap">
        ${isPending ? `
          <button type="button" class="btn-admin-confirm-order px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition active:scale-95 cursor-pointer" data-id="${esc(ord.id)}" data-code="${esc(ord.code)}" title="Duyệt đơn ngay">
            Duyệt
          </button>
          <button type="button" class="btn-admin-cancel-order px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-gray-600 dark:text-gray-300 font-semibold text-[11px] transition active:scale-95 cursor-pointer" data-id="${esc(ord.id)}" data-code="${esc(ord.code)}" title="Hủy đơn ngay">
            Hủy
          </button>
        ` : ord.status === 'paid' ? `
          <span class="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Đã duyệt</span>
          </span>
        ` : ord.status === 'cancelled' ? `
          <span class="inline-flex items-center gap-1 text-[11px] text-rose-500 dark:text-rose-400 font-medium">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Đã hủy</span>
          </span>
        ` : `
          <span class="text-[11px] text-gray-400 font-medium">Hết hạn</span>
        `}
      </td>
    </tr>
  `;
}

function renderOrdersTableRows(orders) {
  const sorted = sortOrdersByPriority(orders);
  if (!sorted || sorted.length === 0) {
    return `<tr><td colspan="9" class="py-8 text-center text-gray-400">Chưa có đơn hàng nào được tạo.</td></tr>`;
  }

  // Tách biệt: Đơn chờ lên trên, Đơn đã duyệt hoặc đã hủy xuống dưới
  const waitingOrders = sorted.filter(o => o.status === 'user_confirmed' || o.status === 'pending');
  const finishedOrders = sorted.filter(o => o.status !== 'user_confirmed' && o.status !== 'pending');

  let html = '';

  // 1. CÁC ĐƠN CHỜ LÊN TRÊN (Ưu tiên cao nhất)
  if (waitingOrders.length > 0) {
    html += `
      <tr class="bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/80">
        <td colspan="9" class="py-2.5 px-3.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 uppercase tracking-wider">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Đơn chờ xử lý (${waitingOrders.length} đơn cần duyệt / chờ chuyển khoản)</span>
            </span>
            <span class="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">▲ Ưu tiên lên trên</span>
          </div>
        </td>
      </tr>
    `;
    html += waitingOrders.map(renderSingleOrderRow).join('');
  } else if (finishedOrders.length > 0) {
    // Nếu không có đơn chờ nào, hiển thị thông báo trạng thái
    html += `
      <tr class="bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-900/40">
        <td colspan="9" class="py-2.5 px-3.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Tất cả đơn hàng đã được xử lý (không có đơn chờ duyệt)</span>
            </span>
            <span class="text-[10px] text-gray-500 font-mono">${finishedOrders.length} đơn đã hoàn tất</span>
          </div>
        </td>
      </tr>
    `;
  }

  // 2. DẢI PHÂN CÁCH VÀ CÁC ĐƠN ĐÃ XỬ LÝ (ĐÃ DUYỆT HOẶC ĐÃ HỦY) XUỐNG DƯỚI
  if (finishedOrders.length > 0) {
    if (waitingOrders.length > 0) {
      html += `
        <tr class="bg-[#F4F3EF] dark:bg-[#12141A] border-y-2 border-gray-200 dark:border-gray-800">
          <td colspan="9" class="py-2.5 px-3.5 text-[11px] font-bold text-gray-600 dark:text-gray-300">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                <svg class="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                <span>Đơn đã xử lý (${finishedOrders.length} đơn đã duyệt hoặc đã hủy)</span>
              </span>
              <span class="text-[10px] text-gray-500 font-medium bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">▼ Tự động chuyển xuống dưới</span>
            </div>
          </td>
        </tr>
      `;
    }
    html += finishedOrders.map(renderSingleOrderRow).join('');
  }

  return html;
}

function bindBillingTabEvents(container, initialOrders) {
  // Chuyển tab con: Đơn hàng vs Cấu hình
  const btnOrders = container.querySelector('#btnSubTabOrders');
  const btnConfig = container.querySelector('#btnSubTabConfig');
  const boxOrders = container.querySelector('#billingSubTabOrdersContainer');
  const boxConfig = container.querySelector('#billingSubTabConfigContainer');

  if (btnOrders && btnConfig) {
    btnOrders.onclick = () => {
      currentBillingSubTab = 'orders';
      boxOrders.classList.remove('hidden');
      boxConfig.classList.add('hidden');
      btnOrders.className = 'px-3.5 py-1.5 rounded-lg transition bg-indigo-600 text-white shadow-2xs';
      btnConfig.className = 'px-3.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-indigo-600';
    };
    btnConfig.onclick = () => {
      currentBillingSubTab = 'config';
      boxConfig.classList.remove('hidden');
      boxOrders.classList.add('hidden');
      btnConfig.className = 'px-3.5 py-1.5 rounded-lg transition bg-indigo-600 text-white shadow-2xs';
      btnOrders.className = 'px-3.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-indigo-600';
    };
  }

  // Chuyển chế độ QR -> Hiện/ẩn nhóm khóa API
  const qrModeSelect = container.querySelector('#cfgQrMode');
  const secretsGroup = container.querySelector('#cfgApiSecretsGroup');
  if (qrModeSelect && secretsGroup) {
    qrModeSelect.onchange = () => {
      if (qrModeSelect.value === 'api') secretsGroup.classList.remove('hidden');
      else secretsGroup.classList.add('hidden');
    };
  }

  // Tự động cập nhật ảnh xem trước thời gian thực
  const bankSelect = container.querySelector('#cfgBankId');
  const accNoInput = container.querySelector('#cfgAccountNo');
  const accNameInput = container.querySelector('#cfgAccountName');
  const templateSelect = container.querySelector('#cfgTemplate');
  const previewImg = container.querySelector('#previewQrImg');
  const previewAccName = container.querySelector('#previewAccountName');
  const previewAccNo = container.querySelector('#previewAccountNo');

  function updatePreview() {
    if (!previewImg) return;
    const bId = bankSelect ? bankSelect.value : '970403';
    const aNo = accNoInput ? accNoInput.value.trim() : '';
    const rawName = accNameInput ? accNameInput.value.trim() : '';
    const normName = normalizeAccountName(rawName);
    const tmpl = templateSelect ? templateSelect.value : 'compact';

    if (previewAccName) previewAccName.textContent = normName || 'CHỦ TÀI KHOẢN';
    if (previewAccNo) previewAccNo.textContent = aNo || 'SỐ TÀI KHOẢN';

    if (bId && aNo && normName) {
      previewImg.src = `https://img.vietqr.io/image/${bId}-${aNo}-${tmpl}.png?amount=50000&addInfo=TVHTEST123&accountName=${encodeURIComponent(normName)}`;
    }
  }

  if (accNoInput) {
    accNoInput.oninput = () => {
      // Chỉ cho phép nhập số
      accNoInput.value = accNoInput.value.replace(/\D/g, '').slice(0, 19);
      updatePreview();
    };
  }

  if (accNameInput) {
    accNameInput.oninput = () => {
      // Tự động viết hoa
      accNameInput.value = accNameInput.value.toUpperCase();
      updatePreview();
    };
    accNameInput.onblur = () => {
      accNameInput.value = normalizeAccountName(accNameInput.value);
      updatePreview();
    };
  }

  if (bankSelect) bankSelect.onchange = updatePreview;
  if (templateSelect) templateSelect.onchange = updatePreview;

  // Thử nghiệm tạo mã QR mẫu
  const btnTestQr = container.querySelector('#btnTestQr');
  if (btnTestQr) {
    btnTestQr.onclick = async () => {
      btnTestQr.disabled = true;
      btnTestQr.innerText = 'Đang tạo QR...';
      try {
        const bId = document.getElementById('cfgBankId').value;
        const aNo = document.getElementById('cfgAccountNo').value.trim();
        const aName = normalizeAccountName(document.getElementById('cfgAccountName').value.trim());
        const tmpl = document.getElementById('cfgTemplate').value;
        const mode = document.getElementById('cfgQrMode').value;

        if (!aNo || !/^\d{6,19}$/.test(aNo)) {
          throw new Error('Vui lòng nhập số tài khoản hợp lệ (từ 6 đến 19 chữ số)');
        }
        if (!aName) {
          throw new Error('Vui lòng nhập tên chủ tài khoản (viết hoa không dấu)');
        }

        const res = await callAdminApi('/api/admin/billing/test-qr', {
          method: 'POST',
          body: JSON.stringify({
            bankId: bId,
            accountNo: aNo,
            accountName: aName,
            template: tmpl,
            amount: 50000,
            mode: mode
          })
        });
        if (previewImg && res.qrUrl) {
          previewImg.src = res.qrUrl;
        }
        toast('Tạo mã QR mẫu thành công! Bạn có thể quét thử bằng app ngân hàng.');
      } catch (err) {
        alert('Lỗi tạo mã QR: ' + err.message);
      } finally {
        btnTestQr.disabled = false;
        btnTestQr.innerText = 'Kiểm tra tạo QR mẫu';
      }
    };
  }

  // Lưu cấu hình thanh toán
  const btnSaveConfig = container.querySelector('#btnSaveBillingConfig');
  if (btnSaveConfig) {
    btnSaveConfig.onclick = async () => {
      const bSelect = document.getElementById('cfgBankId');
      const selectedOption = bSelect.selectedOptions[0];
      const bankId = bSelect.value;
      const bankCode = selectedOption ? (selectedOption.dataset.code || '') : '';
      const bankShortName = selectedOption ? (selectedOption.dataset.short || '') : '';
      const bankName = selectedOption ? (selectedOption.dataset.name || selectedOption.text.split('-')[0].trim()) : '';
      const accountNo = document.getElementById('cfgAccountNo').value.trim();
      const rawAccountName = document.getElementById('cfgAccountName').value.trim();
      const accountName = normalizeAccountName(rawAccountName);

      if (!bankId) {
        alert('Vui lòng chọn ngân hàng nhận tiền.');
        return;
      }
      if (!accountNo || !/^\d{6,19}$/.test(accountNo)) {
        alert('Số tài khoản không hợp lệ. Vui lòng nhập từ 6 đến 19 chữ số.');
        document.getElementById('cfgAccountNo').focus();
        return;
      }
      if (!accountName) {
        alert('Vui lòng nhập tên chủ tài khoản (viết hoa không dấu).');
        document.getElementById('cfgAccountName').focus();
        return;
      }

      const confirmMsg = `Bạn có chắc chắn muốn LƯU cấu hình thanh toán VietQR với thông tin:\n` +
        `- Ngân hàng: ${bankShortName || bankName} (BIN: ${bankId})\n` +
        `- Số tài khoản: ${accountNo}\n` +
        `- Tên chủ tài khoản: ${accountName}\n\n` +
        `Mã QR thanh toán cho tất cả đơn hàng mới sẽ tự động cập nhật theo tài khoản này.`;

      if (!confirm(confirmMsg)) {
        return;
      }

      btnSaveConfig.disabled = true;
      btnSaveConfig.innerText = 'Đang lưu...';
      try {
        const payload = {
          bank: {
            bin: bankId,
            code: bankCode,
            shortName: bankShortName,
            name: bankName
          },
          bankTransfer: {
            bankId: bankId,
            bankName: bankShortName || bankName,
            accountNo: accountNo,
            accountName: accountName,
            template: document.getElementById('cfgTemplate').value,
            orderTimeoutMinutes: parseInt(document.getElementById('cfgTimeoutMinutes').value, 10) || 15,
            qrMode: document.getElementById('cfgQrMode').value
          },
          vietqrClientId: document.getElementById('cfgVietqrClientId') ? document.getElementById('cfgVietqrClientId').value.trim() : '',
          vietqrApiKey: document.getElementById('cfgVietqrApiKey') ? document.getElementById('cfgVietqrApiKey').value.trim() : ''
        };

        await callAdminApi('/api/admin/billing/config', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast('Đã lưu cấu hình tài khoản nhận tiền VietQR thành công!');
        renderBillingTab(container);
      } catch (err) {
        alert('Lỗi lưu cấu hình: ' + err.message);
      } finally {
        btnSaveConfig.disabled = false;
        btnSaveConfig.innerText = 'Lưu cấu hình thanh toán';
      }
    };
  }

  // Khai báo các phần tử bộ lọc và thao tác hàng loạt
  const searchInput = container.querySelector('#billingSearchOrderInput');
  const statusFilter = container.querySelector('#billingStatusFilter');
  const selectAllCheckbox = container.querySelector('#selectAllOrdersCheckbox');
  const bulkBar = container.querySelector('#bulkOrdersActionsBar');
  const selectedCountEl = container.querySelector('#selectedOrdersCount');
  const btnBulkConfirm = container.querySelector('#btnBulkConfirmOrders');
  const btnBulkCancel = container.querySelector('#btnBulkCancelOrders');
  const btnDeselectAll = container.querySelector('#btnDeselectAllOrders');

  function updateBulkBar() {
    const checkboxes = container.querySelectorAll('.order-select-checkbox:checked');
    const count = checkboxes.length;
    if (selectedCountEl) selectedCountEl.innerText = String(count);
    if (bulkBar) {
      if (count > 0) {
        bulkBar.classList.remove('hidden');
      } else {
        bulkBar.classList.add('hidden');
      }
    }
    if (selectAllCheckbox) {
      const allCheckboxes = container.querySelectorAll('.order-select-checkbox');
      selectAllCheckbox.checked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;
      selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
  }

  function bindOrderRowEvents() {
    // Checkbox từng hàng đơn
    container.querySelectorAll('.order-select-checkbox').forEach(cb => {
      cb.onchange = updateBulkBar;
    });

    // Duyệt đơn hàng thủ công (Bấm 1 lần là duyệt ngay, không popup confirm)
    container.querySelectorAll('.btn-admin-confirm-order').forEach(btn => {
      btn.onclick = async () => {
        const orderId = btn.dataset.id;
        const orderCode = btn.dataset.code || '';
        btn.disabled = true;
        btn.innerText = 'Đang duyệt...';
        try {
          const res = await callAdminApi('/api/admin/billing/orders-confirm', {
            method: 'POST',
            body: JSON.stringify({ orderId, reason: 'Admin duyệt thủ công từ bảng quản trị' })
          });
          toast(res.message || `Đã kích hoạt thành công đơn ${orderCode}!`);
          await reloadOrdersList();
        } catch (err) {
          alert('Lỗi duyệt đơn: ' + err.message);
          btn.disabled = false;
          btn.innerText = 'Duyệt';
        }
      };
    });

    // Hủy đơn hàng thủ công (Bấm 1 lần là hủy ngay, không popup confirm)
    container.querySelectorAll('.btn-admin-cancel-order').forEach(btn => {
      btn.onclick = async () => {
        const orderId = btn.dataset.id;
        const orderCode = btn.dataset.code || '';
        btn.disabled = true;
        btn.innerText = 'Đang hủy...';
        try {
          await callAdminApi('/api/admin/billing/orders-cancel', {
            method: 'POST',
            body: JSON.stringify({ orderId, reason: 'Hủy bởi quản trị viên' })
          });
          toast(`Đã hủy đơn ${orderCode}`);
          await reloadOrdersList();
        } catch (err) {
          alert('Lỗi hủy đơn: ' + err.message);
          btn.disabled = false;
          btn.innerText = 'Hủy';
        }
      };
    });

    // Sao chép nhanh nội dung chuyển khoản
    container.querySelectorAll('.btn-admin-copy-code').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const code = btn.dataset.code || '';
        if (!code) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(() => {
            toast(`Đã sao chép nội dung CK: ${code}`);
          }).catch(() => {});
        } else {
          toast(`Nội dung CK: ${code}`);
        }
      };
    });

    // Xem ảnh bill chuyển khoản (Lightbox)
    container.querySelectorAll('.btn-admin-view-proof').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const imgUrl = btn.dataset.img;
        const code = btn.dataset.code || '';
        const amount = btn.dataset.amount || '';
        const email = btn.dataset.email || '';
        const orderId = btn.dataset.id || '';
        const status = btn.dataset.status || '';
        if (!imgUrl) return;
        showAdminProofLightbox({
          imgUrl,
          code,
          amount,
          email,
          orderId,
          status,
          container,
          onApproved: reloadOrdersList
        });
      };
    });
  }

  // Tải lại danh sách đơn hàng in-place, bảo toàn ô tìm kiếm & sắp xếp lại đơn
  const reloadOrdersList = async () => {
    const s = searchInput ? searchInput.value.trim() : '';
    const st = statusFilter ? statusFilter.value : 'all';
    try {
      const res = await callAdminApi(`/api/admin/billing/orders?status=${st}&search=${encodeURIComponent(s)}&limit=250`);
      const sorted = sortOrdersByPriority(res.orders || []);
      const tbody = container.querySelector('#billingOrdersTableBody');
      if (tbody) tbody.innerHTML = renderOrdersTableRows(sorted);

      // Cập nhật số đếm ở nút tab con và badge
      const counts = res.counts || {};
      const uCount = counts.userConfirmed || 0;
      const btnOrdersEl = container.querySelector('#btnSubTabOrders');
      if (btnOrdersEl) {
        btnOrdersEl.innerHTML = `<span>Đơn hàng (${sorted.length})</span>${uCount > 0 ? `<span class="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">${uCount}</span>` : ''}`;
      }
      const pendingDot = document.getElementById('adminPendingOrdersDot');
      if (pendingDot) {
        if (uCount > 0) pendingDot.classList.remove('hidden');
        else pendingDot.classList.add('hidden');
      }

      // Reset thanh chọn hàng loạt
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      updateBulkBar();

      // Gán lại sự kiện hàng đơn
      bindOrderRowEvents();
    } catch (err) {
      console.error('Lỗi tải lại danh sách đơn hàng:', err);
    }
  };

  // Checkbox chọn tất cả
  if (selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
      const allCheckboxes = container.querySelectorAll('.order-select-checkbox');
      allCheckboxes.forEach(cb => { cb.checked = selectAllCheckbox.checked; });
      updateBulkBar();
    };
  }

  // Nút bỏ chọn tất cả
  if (btnDeselectAll) {
    btnDeselectAll.onclick = () => {
      container.querySelectorAll('.order-select-checkbox').forEach(cb => { cb.checked = false; });
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }
      updateBulkBar();
    };
  }

  // Nút duyệt hàng loạt
  if (btnBulkConfirm) {
    btnBulkConfirm.onclick = async () => {
      const checkedBoxes = Array.from(container.querySelectorAll('.order-select-checkbox:checked'));
      const orderIds = checkedBoxes.map(cb => cb.dataset.id).filter(Boolean);
      if (orderIds.length === 0) return;

      btnBulkConfirm.disabled = true;
      btnBulkConfirm.innerHTML = '<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg> <span>Đang duyệt...</span>';

      try {
        const res = await callAdminApi('/api/admin/billing/orders-confirm', {
          method: 'POST',
          body: JSON.stringify({ orderIds, reason: 'Admin duyệt hàng loạt' })
        });
        toast(res.message || `Đã duyệt thành công ${orderIds.length} đơn!`);
        await reloadOrdersList();
      } catch (err) {
        alert('Lỗi duyệt hàng loạt: ' + err.message);
      } finally {
        btnBulkConfirm.disabled = false;
        btnBulkConfirm.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Xác nhận hàng loạt</span>';
      }
    };
  }

  // Nút hủy hàng loạt
  if (btnBulkCancel) {
    btnBulkCancel.onclick = async () => {
      const checkedBoxes = Array.from(container.querySelectorAll('.order-select-checkbox:checked'));
      const orderIds = checkedBoxes.map(cb => cb.dataset.id).filter(Boolean);
      if (orderIds.length === 0) return;

      btnBulkCancel.disabled = true;
      btnBulkCancel.innerHTML = '<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle></svg> <span>Đang hủy...</span>';

      try {
        const res = await callAdminApi('/api/admin/billing/orders-cancel', {
          method: 'POST',
          body: JSON.stringify({ orderIds, reason: 'Admin hủy hàng loạt' })
        });
        toast(res.message || `Đã hủy thành công ${orderIds.length} đơn!`);
        await reloadOrdersList();
      } catch (err) {
        alert('Lỗi hủy hàng loạt: ' + err.message);
      } finally {
        btnBulkCancel.disabled = false;
        btnBulkCancel.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> <span>Hủy hàng loạt</span>';
      }
    };
  }

  // Tìm kiếm & Lọc trạng thái đơn hàng
  if (searchInput) searchInput.oninput = debounce(reloadOrdersList, 300);
  if (statusFilter) statusFilter.onchange = reloadOrdersList;

  // Gán sự kiện hàng ban đầu
  bindOrderRowEvents();
  updateBulkBar();
}

function showAdminProofLightbox(opts) {
  const { imgUrl, code, amount, email, orderId, status, container, onApproved } = opts || {};
  let modal = document.getElementById('adminProofLightboxModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'adminProofLightboxModal';
    modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity';
    document.body.appendChild(modal);
  } else {
    modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity';
  }

  const isPendingOrConfirmed = status === 'user_confirmed' || status === 'pending';

  modal.innerHTML = `
    <div class="bg-white dark:bg-[#1A1D23] rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h4 class="font-serif font-bold text-sm text-[#1C1B18] dark:text-[#E8E6E1]">Biên lai chuyển khoản của khách</h4>
          <p class="text-[11px] text-gray-500 font-mono mt-0.5">Mã đơn: <strong class="text-indigo-600 dark:text-indigo-400 font-bold">${esc(code)}</strong> · Số tiền: <strong>${esc(amount)}</strong> · ${esc(email)}</p>
        </div>
        <button type="button" id="btnCloseProofLightbox" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="flex-1 p-4 bg-gray-50 dark:bg-[#14171C] overflow-auto flex items-center justify-center min-h-[300px]">
        <img src="${esc(imgUrl)}" alt="Biên lai chuyển khoản" class="max-w-full max-h-[62vh] object-contain rounded-xl shadow-md border border-gray-200 dark:border-gray-800" />
      </div>
      <div class="px-5 py-3.5 bg-white dark:bg-[#1A1D23] border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
        <a href="${esc(imgUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          <span>Mở ảnh tab mới</span>
        </a>
        <div class="flex items-center gap-2">
          ${isPendingOrConfirmed ? `
            <button type="button" id="btnProofLightboxApprove" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Duyệt đơn này</span>
            </button>
          ` : ''}
          <button type="button" id="btnProofLightboxClose" class="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const onKeydown = (e) => {
    if (e.key === 'Escape') closeMe();
  };
  window.addEventListener('keydown', onKeydown);

  const closeMe = () => {
    modal.classList.add('hidden');
    window.removeEventListener('keydown', onKeydown);
  };
  modal.querySelector('#btnCloseProofLightbox').onclick = closeMe;
  modal.querySelector('#btnProofLightboxClose').onclick = closeMe;
  modal.onclick = (e) => {
    if (e.target === modal) closeMe();
  };

  const btnApprove = modal.querySelector('#btnProofLightboxApprove');
  if (btnApprove) {
    btnApprove.onclick = async () => {
      btnApprove.disabled = true;
      btnApprove.innerText = 'Đang duyệt...';
      try {
        await callAdminApi('/api/admin/billing/orders-confirm', {
          method: 'POST',
          body: JSON.stringify({ orderId, reason: 'Admin duyệt sau khi xem bill' })
        });
        toast(`Đã kích hoạt thành công đơn ${code}!`);
        closeMe();
        if (typeof onApproved === 'function') {
          await onApproved();
        } else if (container) {
          renderBillingTab(container);
        }
      } catch (err) {
        alert('Lỗi duyệt đơn: ' + err.message);
        btnApprove.disabled = false;
        btnApprove.innerText = 'Duyệt đơn này';
      }
    };
  }
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
