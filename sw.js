// Service Worker cho Ứng dụng Sách HTML (PWA v4.9.3)
// FIX-1: Khắc phục lỗi tự tải lại liên tục (infinite reload loop).
// - Nguồn phiên bản duy nhất APP_VERSION đồng bộ với index.html.
// - KHÔNG gọi skipWaiting() tự động trong install. Chỉ skipWaiting khi client gửi tin nhắn SKIP_WAITING có kiểm soát.
// - Dùng chiến lược Mạng trước - Cache sau (fetch với cache: 'no-cache') cho HTML để luôn lấy bản mới nhất khi online.

const APP_VERSION = 'v4.9.3';
const CACHE_NAME = 'thuvienhtml-cache-' + APP_VERSION;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Cài đặt Service Worker (Precache tài nguyên ban đầu)
// // FIX-1: Tuyệt đối không gọi self.skipWaiting() tại đây. Worker mới phải ở trạng thái waiting cho đến khi người dùng xác nhận.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Lỗi precache tài nguyên ban đầu:", err);
      });
    })
  );
});

// 2. Kích hoạt và dọn dẹp triệt để TẤT CẢ các phiên bản cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("[SW] Dọn dẹp cache cũ:", name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý yêu cầu tài nguyên (Fetch)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bỏ qua các request không phải GET hoặc yêu cầu từ Firebase Firestore / Google APIs / Auth / Vercel API
  if (req.method !== 'GET' || 
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('googleapis.com') || 
      url.hostname.includes('identitytoolkit')) {
    return;
  }

  // Đối với điều hướng HTML hoặc tải trang chính: LUÔN ƯU TIÊN MẠNG TRƯỚC (Network-First với cache: 'no-cache')
  const isHtmlPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '';
  if (isHtmlPage) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Chỉ khi mất mạng hoàn toàn mới dùng bản trong cache
          return caches.match(req).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // Đối với tài nguyên tĩnh khác (hình ảnh, manifest...): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Nhận tin nhắn từ app (khi người dùng chủ động bấm "Cập nhật ngay" hoặc "Xóa cache")
// // FIX-1: Chỉ kích hoạt skipWaiting khi có sự kiện chỉ định từ client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
