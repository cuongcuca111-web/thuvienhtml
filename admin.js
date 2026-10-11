function toast(msg) { if (adminContext && typeof adminContext.showToast === 'function') adminContext.showToast(msg); }
/**
 * Quản trị Hệ thống Thư viện Sách HTML (Admin Management Module)
 * Thiết kế theo phong cách Editorial, Indigo Accent, Responsive Mobile-first, Dark/Light Mode.
 * Tự vẽ toàn bộ SVG Icons nét 1.8px bo tròn, bảo mật tuyệt đối không lưu credentials.
 */

import { 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const ADMIN_LOGIN_DOMAIN = window.__ADMIN_LOGIN_DOMAIN || 'admin.thuvienhtml.app';

// Trạng thái cục bộ của bảng Quản trị
let adminContext = null;
let currentAdminTab = 'plans';
let pendingPlansChanges = null; // Bản sao đang chỉnh sửa
let originalPlansConfig = null; // Bản gốc từ server
let plansVersion = 1;
let adminSessionTimer = null;
let lastAdminActivity = Date.now();
const ADMIN_MAX_IDLE_MS = 60 * 60 * 1000; // 60 phút
const ADMIN_REAUTH_MS = 15 * 60 * 1000;  // 15 phút cho thao tác nhạy cảm

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

  // Kiểm tra quyền Admin của user hiện tại
  if (ctx.state && ctx.state.isAdmin && ctx.auth && ctx.auth.currentUser) {
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
              <h2 class="font-serif text-base sm:text-lg font-bold text-[#1C1B18] dark:text-[#E8E6E1] leading-tight">Quản trị Hệ thống</h2>
              <div class="flex items-center gap-2 text-[11px] text-[#78756D] dark:text-[#9AA3B2]">
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
      if ((adminContext && adminContext.state && adminContext.state.isAdmin)) {
        lastAdminActivity = Date.now();
      }
    }, { passive: true });
  });

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
    panel.classList.remove('hidden', 'modal-closing');
    void panel.offsetWidth;
    panel.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
    switchTab('plans');
  }
}

export function closeAdminPanel() {
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

  const usernameInput = document.getElementById('adminUsernameInput').value.trim();
  const password = document.getElementById('adminPasswordInput').value;
  const submitBtn = document.getElementById('btnSubmitAdminLogin');

  if (!usernameInput || !password) return;

  submitBtn.disabled = true;
  submitBtn.innerText = 'Đang xác thực...';

  try {
    const email = usernameInput.includes('@') ? usernameInput : `${usernameInput}@${ADMIN_LOGIN_DOMAIN}`;
    const userCred = await signInWithEmailAndPassword(adminContext.auth, email, password);
    const user = userCred.user;

    // Buộc lấy lại token mới nhất từ server để kiểm tra claim admin
    const idTokenResult = await user.getIdTokenResult(true);

    if (idTokenResult.claims && idTokenResult.claims.admin === true) {
      // ĐĂNG NHẬP THÀNH CÔNG VỚI QUYỀN ADMIN
      clientFailedLogins = 0;
      adminContext.state.isAdmin = true;
      adminContext.state.user = user;
      adminContext.state.userId = user.uid;
      lastAdminActivity = Date.now();

      // Cập nhật nút trong menu tài khoản
      const btnAdminInMenu = document.getElementById('btnOpenAdminPanel');
      if (btnAdminInMenu) btnAdminInMenu.classList.remove('hidden');

      startSessionTimer();
      openAdminPanel();
      toast("Đăng nhập quản trị thành công!");
    } else {
      // Tài khoản không có claim admin -> Lập tức đăng xuất, không để lộ bảng quản trị dù chỉ thoáng qua
      await signOut(adminContext.auth);
      recordClientFailedLogin();
      errBanner.innerText = "Không có quyền truy cập";
      errBanner.classList.remove('hidden');
      return;
    }
  } catch (err) {
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
  if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi khu vực Quản trị?")) {
    adminContext.state.isAdmin = false;
    clearInterval(adminSessionTimer);
    closeAdminPanel();
    const btnAdminInMenu = document.getElementById('btnOpenAdminPanel');
    if (btnAdminInMenu) btnAdminInMenu.classList.add('hidden');
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
      adminContext.state.isAdmin = false;
      closeAdminPanel();
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
  }
}

// HELPER GỌI API ADMIN
async function callAdminApi(path, options = {}) {
  const token = await adminContext.auth.currentUser.getIdToken(false);
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
  { key: 'customColor', label: 'Tùy biến màu khung & note', desc: 'Chọn màu khung và đánh dấu theo ý muốn', type: 'boolean' },
  { key: 'exportNotesMd', label: 'Xuất ghi chú sang .md', desc: 'Xuất tất cả ghi chú ra định dạng Markdown', type: 'boolean' },
  { key: 'trashDays', label: 'Số ngày lưu thùng rác', desc: 'Tự động dọn dẹp sau số ngày quy định', type: 'number', min: 0, max: 365, step: 1, allowUnlimited: false },
  { key: 'statsDays', label: 'Số ngày lưu thống kê', desc: 'Phạm vi lưu trữ biểu đồ và lịch sử học tập', type: 'number', min: 1, max: 3650, step: 7, allowUnlimited: true },
  { key: 'fullTextSearch', label: 'Tìm kiếm toàn văn', desc: 'Tìm kiếm sâu bên trong toàn bộ nội dung file', type: 'boolean' },
  { key: 'monthlyAiRequests', label: 'Lượt AI mỗi tháng', desc: 'Số lượt gọi AI tối đa hàng tháng (-1 = Vô hạn)', type: 'number', min: 0, max: 100000, step: 10, allowUnlimited: true },
  { key: 'maxFlashcardsPerFile', label: 'Flashcard tối đa / bài', desc: 'Số lượng thẻ tối đa tự sinh cho mỗi file HTML', type: 'number', min: 1, max: 200, step: 5, allowUnlimited: true },
  { key: 'aiScheduleEnabled', label: 'Bật Lịch thông minh (AI)', desc: 'Cho phép AI ước tính độ khó và chia lịch học', type: 'boolean' },
  { key: 'aiFlashcardsEnabled', label: 'Bật Tự sinh Flashcard (AI)', desc: 'Cho phép AI tạo câu hỏi ôn tập theo bài', type: 'boolean' }
];

function renderPlansTab(container) {
  // Lấy bản sao cấu hình hiện tại để người dùng chỉnh sửa
  const currentConfig = adminContext.effectivePlans || {};
  plansVersion = currentConfig.version || 1;
  originalPlansConfig = JSON.parse(JSON.stringify(currentConfig.plans || {}));
  if (!pendingPlansChanges) {
    pendingPlansChanges = JSON.parse(JSON.stringify(originalPlansConfig));
  }

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
        <button id="btnResetAllPlans" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span>Đặt lại mặc định</span>
        </button>
        <button id="btnUndoPlans" class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition" disabled>
          Hoàn tác
        </button>
        <button id="btnSavePlans" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50" disabled>
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
  // Thay đổi số
  container.querySelectorAll('.plan-num-input').forEach(input => {
    input.onchange = (e) => {
      const { tier, key } = e.target.dataset;
      pendingPlansChanges[tier][key] = parseInt(e.target.value, 10) || 0;
      updatePlansImpact();
    };
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
      const oldV = (originalPlansConfig[tier] ? originalPlansConfig[tier][def.key] : undefined);
      const newV = (pendingPlansChanges[tier] ? pendingPlansChanges[tier][def.key] : undefined);
      if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
        const formatVal = (v) => (v === -1 || v === null ? 'Vô hạn' : JSON.stringify(v));
        diffs.push(`<strong>${TIER_NAMES[tier]}</strong>: ${def.label} (${formatVal(oldV)} → <span class="text-indigo-600 font-bold">${formatVal(newV)}</span>)`);
      }
    }
  }

  // Kiểm tra thứ tự hợp lý: guest <= free <= plus <= pro
  function compareLimits(a, b) {
    if (a === -1) return b === -1;
    if (b === -1) return true;
    return a <= b;
  }

  ['maxLessons', 'maxSections', 'maxActiveShares'].forEach(key => {
    if (!compareLimits(pendingPlansChanges.guest[key], pendingPlansChanges.free[key])) {
      warnings.push(`Cảnh báo: Gói Khách có ${key} lớn hơn gói Thường!`);
    }
    if (!compareLimits(pendingPlansChanges.free[key], pendingPlansChanges.plus[key])) {
      warnings.push(`Cảnh báo: Gói Thường có ${key} lớn hơn gói Plus!`);
    }
    if (!compareLimits(pendingPlansChanges.plus[key], pendingPlansChanges.pro[key])) {
      warnings.push(`Cảnh báo: Gói Plus có ${key} lớn hơn gói Pro!`);
    }
  });

  const hasChanges = diffs.length > 0;
  btnSave.disabled = !hasChanges;
  btnUndo.disabled = !hasChanges;

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
  const btn = document.getElementById('btnSavePlans');
  btn.disabled = true;
  btn.innerText = 'Đang lưu...';

  try {
    const res = await callAdminApi('/api/admin/plans/update', {
      method: 'POST',
      body: JSON.stringify({
        plans: pendingPlansChanges,
        version: plansVersion
      })
    });

    plansVersion = res.version;
    originalPlansConfig = JSON.parse(JSON.stringify(pendingPlansChanges));
    toast(`Đã cập nhật hạn mức các gói lên phiên bản v${res.version}!`);
    renderPlansTab(document.getElementById('adminTabContentContainer'));
  } catch (err) {
    if (err.message && err.message.includes('Xung đột phiên bản')) {
      if (confirm('Cấu hình đã bị thay đổi bởi người khác. Tải lại bản mới nhất từ máy chủ?')) {
        location.reload();
      }
    } else {
      alert("Lỗi khi lưu hạn mức: " + err.message);
    }
  } finally {
    btn.disabled = false;
    btn.innerText = 'Lưu thay đổi';
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
  const currentPricing = (adminContext && adminContext.effectivePlans ? adminContext.effectivePlans.pricing : null) || {
    plusMonthly: 29000,
    proMonthly: 59000,
    yearlyDiscount: 20
  };

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- CỘT FORM CHỈNH SỬA -->
      <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
        <div>
          <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Cấu hình bảng giá dịch vụ</h3>
          <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Giá hiển thị cho người dùng khi nâng cấp gói.</p>
        </div>

        <form id="pricingForm" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá gói PLUS (VNĐ / tháng)</label>
            <input type="number" id="pricingPlusInput" step="1000" min="0" value="${currentPricing.plusMonthly}" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-sm font-mono font-bold" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Giá gói PRO (VNĐ / tháng)</label>
            <input type="number" id="pricingProInput" step="1000" min="0" value="${currentPricing.proMonthly}" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-sm font-mono font-bold" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Giảm giá thanh toán năm (%)</label>
            <input type="number" id="pricingDiscountInput" min="0" max="100" value="${currentPricing.yearlyDiscount}" class="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-sm font-mono font-bold" />
          </div>

          <button type="submit" id="btnSavePricing" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs">
            Lưu bảng giá
          </button>
        </form>
      </div>

      <!-- CỘT XEM TRƯỚC (LIVE PREVIEW) -->
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-serif text-sm font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Xem trước giao diện người dùng nhìn thấy</h4>
          <span class="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">Trực quan (Live Preview)</span>
        </div>

        <div id="pricingLivePreviewCards" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Render card mô phỏng -->
        </div>
      </div>
    </div>
  `;

  function updatePricingPreview() {
    const pPlus = parseInt((document.getElementById('pricingPlusInput') ? document.getElementById('pricingPlusInput').value : null), 10) || 29000;
    const pPro = parseInt((document.getElementById('pricingProInput') ? document.getElementById('pricingProInput').value : null), 10) || 59000;
    const disc = parseInt((document.getElementById('pricingDiscountInput') ? document.getElementById('pricingDiscountInput').value : null), 10) || 20;

    const cardsContainer = document.getElementById('pricingLivePreviewCards');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = `
      <!-- THẺ PLUS -->
      <div class="p-5 rounded-2xl border-2 border-indigo-500 bg-white dark:bg-[#181B20] shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-serif text-base font-bold text-indigo-600">Gói PLUS</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Phổ biến</span>
          </div>
          <div class="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 mb-1">
            ${pPlus.toLocaleString('vi-VN')}đ <span class="text-xs font-normal text-gray-500">/ tháng</span>
          </div>
          <div class="text-xs text-emerald-600 mb-4">Gói năm: giảm ${disc}% chỉ ${(pPlus * 12 * (1 - disc/100)).toLocaleString('vi-VN')}đ/năm</div>
          <ul class="text-xs space-y-1.5 text-gray-600 dark:text-gray-300 mb-4">
            <li>✓ Tối đa ${(adminContext && adminContext.effectivePlans && adminContext.effectivePlans.plans && adminContext.effectivePlans.plans.plus ? adminContext.effectivePlans.plans.plus.maxLessons : null) || 100} bài học</li>
            <li>✓ ${(adminContext && adminContext.effectivePlans && adminContext.effectivePlans.plans && adminContext.effectivePlans.plans.plus ? adminContext.effectivePlans.plans.plus.maxSections : null) || 20} danh mục lưu trữ</li>
            <li>✓ Dung lượng ${(adminContext && adminContext.effectivePlans && adminContext.effectivePlans.plans && adminContext.effectivePlans.plans.plus ? adminContext.effectivePlans.plans.plus.maxFileKB : null) || 1024} KB/bài</li>
            <li>✓ Link chia sẻ có mật khẩu &amp; gia hạn</li>
          </ul>
        </div>
        <button class="w-full py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs pointer-events-none">Nâng cấp Plus</button>
      </div>

      <!-- THẺ PRO -->
      <div class="p-5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181B20] shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-serif text-base font-bold text-amber-600">Gói PRO</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Không giới hạn</span>
          </div>
          <div class="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100 mb-1">
            ${pPro.toLocaleString('vi-VN')}đ <span class="text-xs font-normal text-gray-500">/ tháng</span>
          </div>
          <div class="text-xs text-emerald-600 mb-4">Gói năm: giảm ${disc}% chỉ ${(pPro * 12 * (1 - disc/100)).toLocaleString('vi-VN')}đ/năm</div>
          <ul class="text-xs space-y-1.5 text-gray-600 dark:text-gray-300 mb-4">
            <li>✓ Không giới hạn bài học &amp; thư mục</li>
            <li>✓ Tìm kiếm toàn văn thông minh</li>
            <li>✓ Lưu trữ thùng rác &amp; thống kê 365 ngày</li>
            <li>✓ Hỗ trợ ưu tiên cao nhất</li>
          </ul>
        </div>
        <button class="w-full py-2 rounded-xl border border-gray-400 dark:border-gray-600 font-semibold text-xs pointer-events-none">Nâng cấp Pro</button>
      </div>
    `;
  }

  updatePricingPreview();
  ['pricingPlusInput', 'pricingProInput', 'pricingDiscountInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updatePricingPreview;
  });

  const form = document.getElementById('pricingForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSavePricing');
      btn.disabled = true;
      btn.innerText = 'Đang lưu...';

      try {
        await callAdminApi('/api/admin/pricing/update', {
          method: 'POST',
          body: JSON.stringify({
            pricing: {
              plusMonthly: parseInt(document.getElementById('pricingPlusInput').value, 10),
              proMonthly: parseInt(document.getElementById('pricingProInput').value, 10),
              yearlyDiscount: parseInt(document.getElementById('pricingDiscountInput').value, 10)
            }
          })
        });
        toast("Đã cập nhật bảng giá dịch vụ thành công!");
      } catch (err) {
        alert("Lỗi khi lưu bảng giá: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Lưu bảng giá';
      }
    };
  }
}

// =========================================================================
// 3.3 MỤC 3: NGƯỜI DÙNG (USER MANAGEMENT)
// =========================================================================
function renderUsersTab(container) {
  container.innerHTML = `
    <div class="bg-white dark:bg-[#1A1D23] p-5 rounded-xl border border-[#E0DED7] dark:border-[#262C36] shadow-2xs space-y-4">
      <div>
        <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Tra cứu &amp; Quản lý tài khoản người dùng</h3>
        <p class="text-xs text-[#78756D] dark:text-[#9AA3B2]">Tìm kiếm người dùng theo địa chỉ Email hoặc UID để cấp quyền, gia hạn hoặc thu hồi gói.</p>
      </div>

      <div class="flex items-center gap-2">
        <input type="text" id="adminUserSearchInput" placeholder="Nhập Email hoặc UID người dùng..." class="flex-1 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-[#FAF8F5] dark:bg-[#161A20] text-xs" />
        <button id="btnSearchUser" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition">
          Tìm kiếm
        </button>
      </div>

      <div id="adminUserSearchResults" class="text-xs text-gray-500 pt-2">
        Nhập thông tin và bấm "Tìm kiếm" để hiển thị tài khoản.
      </div>
    </div>
  `;

  const btnSearch = container.querySelector('#btnSearchUser');
  const inputSearch = container.querySelector('#adminUserSearchInput');

  async function doSearch() {
    const q = inputSearch.value.trim();
    if (!q) return;
    const resBox = container.querySelector('#adminUserSearchResults');
    resBox.innerHTML = 'Đang tìm kiếm...';

    try {
      const data = await callAdminApi(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
      if (!data.users || data.users.length === 0) {
        resBox.innerHTML = '<div class="text-amber-600">Không tìm thấy người dùng phù hợp.</div>';
        return;
      }

      resBox.innerHTML = `
        <div class="space-y-4">
          ${data.users.map(u => `
            <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5">
                <div>
                  <div class="font-bold text-sm text-gray-900 dark:text-gray-100">${esc(u.email || u.displayName || 'Không có email')}</div>
                  <div class="font-mono text-[11px] text-gray-400">UID: ${esc(u.uid)}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${u.tier === 'pro' ? 'bg-amber-100 text-amber-800' : (u.tier === 'plus' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700')}">
                    Gói: ${esc(u.tier || 'free')}
                  </span>
                  ${u.expiresAt ? `<span class="text-[11px] text-gray-500">Hết hạn: ${new Date(u.expiresAt).toLocaleDateString('vi-VN')}</span>` : '<span class="text-[11px] text-gray-400">Vĩnh viễn</span>'}
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Số bài đã tạo</div>
                  <div class="font-bold text-sm">${(u.usage ? u.usage.lessons : 0) || 0}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Số mục / folder</div>
                  <div class="font-bold text-sm">${(u.usage ? u.usage.sections : 0) || 0}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Ngày tạo tài khoản</div>
                  <div class="font-semibold">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <div class="text-gray-400">Lần đăng nhập cuối</div>
                  <div class="font-semibold">${u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleDateString('vi-VN') : 'N/A'}</div>
                </div>
              </div>

              <!-- NÚT THAO TÁC CẤP / THU HỒI GÓI -->
              <div class="flex items-center gap-2 pt-1 flex-wrap">
                <button class="btn-grant-user px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700" data-uid="${u.uid}">
                  Tặng / Đổi gói
                </button>
                <button class="btn-extend-user px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950" data-uid="${u.uid}">
                  + Gia hạn 30 ngày
                </button>
                <button class="btn-revoke-user px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-semibold text-xs hover:bg-rose-100" data-uid="${u.uid}">
                  Thu hồi về Thường
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      bindUserActions(resBox, doSearch);
    } catch (err) {
      resBox.innerHTML = `<div class="text-rose-600">Lỗi: ${esc(err.message)}</div>`;
    }
  }

  btnSearch.onclick = doSearch;
  inputSearch.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
}

function bindUserActions(container, refreshFn) {
  container.querySelectorAll('.btn-grant-user').forEach(btn => {
    btn.onclick = async () => {
      const tier = prompt("Chọn gói cấp (plus hoặc pro):", "plus");
      if (!tier || !['plus', 'pro'].includes(tier.toLowerCase())) return;
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
          <div class="flex items-center gap-2">
            <h3 class="font-serif text-base font-bold text-[#1C1B18] dark:text-[#E8E6E1]">Danh sách mã kích hoạt</h3>
            <select id="codeFilterStatus" class="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-[#161A20]">
              <option value="all">Tất cả trạng thái</option>
              <option value="unused">Chưa dùng</option>
              <option value="used">Đã dùng</option>
              <option value="disabled">Đã vô hiệu</option>
            </select>
          </div>
          <button id="btnExportCodesCsv" class="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5">
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
      if (currentLoadedCodes.length === 0) {
        tableBox.innerHTML = 'Chưa có mã kích hoạt nào theo điều kiện lọc này.';
        return;
      }

      tableBox.innerHTML = `
        <table class="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-gray-400 font-semibold">
              <th class="py-2 px-3">Mã kích hoạt</th>
              <th class="py-2 px-3">Gói</th>
              <th class="py-2 px-3">Thời hạn</th>
              <th class="py-2 px-3">Trạng thái</th>
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
                <td class="py-2.5 px-3 text-gray-400">${esc(c.note || '—')}</td>
                <td class="py-2.5 px-3 text-right">
                  ${(!c.isUsed && !c.isDisabled) ? `
                    <button class="btn-disable-code text-rose-600 hover:underline" data-code="${c.code}">Vô hiệu</button>
                  ` : '—'}
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
    const headers = ["Ma_Kich_Hoat", "Goi", "So_Ngay", "Trang_Thai", "Ghi_Chu", "Ngay_Tao"];
    const rows = currentLoadedCodes.map(c => [
      c.code,
      c.tier,
      c.days,
      c.isDisabled ? 'Disabled' : (c.isUsed ? 'Used' : 'Available'),
      `"${(c.note || '').replace(/"/g, '""')}"`,
      c.createdAt || ''
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
      defaultFast: 'gemini-1.5-flash',
      defaultStrong: 'gemini-1.5-pro'
    },
    claude: {
      name: 'Anthropic Claude',
      tagline: 'Dòng mô hình Claude 3.5 với năng lực đọc hiểu văn bản & ngữ nghĩa sâu.',
      defaultFast: 'claude-3-5-haiku-20241022',
      defaultStrong: 'claude-3-5-sonnet-20241022'
    },
    openai: {
      name: 'OpenAI (GPT)',
      tagline: 'Các mô hình GPT-4o và GPT-4o Mini chuẩn mực cho sinh dữ liệu có cấu trúc.',
      defaultFast: 'gpt-4o-mini',
      defaultStrong: 'gpt-4o'
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

                <!-- CHỌN MODEL NHANH & MẠNH -->
                <div class="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Model nhanh / rẻ (Độ khó &amp; Flashcard):</label>
                    <input type="text" id="modelFast_${prov}" value="${esc(currentFastModel)}" class="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-mono" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">Model mạnh (Phân tích nâng cao):</label>
                    <input type="text" id="modelStrong_${prov}" value="${esc(currentStrongModel)}" class="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161A20] text-xs font-mono" />
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
