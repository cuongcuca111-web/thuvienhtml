// Service Worker cho Ứng dụng Sách HTML (PWA v4.8.0)
// FIX: Sử dụng chiến lược Mạng trước - Cache sau (Network-First) cho index.html để tránh bị kẹt bản cũ

const CACHE_NAME = 'thuvienhtml-cache-v4.8.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Cài đặt Service Worker và kích hoạt ngay bản mới
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Lỗi precache:", err);
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
            console.log("Xóa cache cũ:", name);
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

  // Bỏ qua các request không phải GET hoặc yêu cầu từ Firebase Firestore / Google APIs / Auth
  if (req.method !== 'GET' || url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com') || url.hostname.includes('identitytoolkit')) {
    return;
  }

  // Đối với điều hướng HTML hoặc tải trang chính: LUÔN ƯU TIÊN MẠNG TRƯỚC (Network-First)
  const isHtmlPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '';
  if (isHtmlPage) {
    event.respondWith(
      fetch(req)
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

// 4. Nhận tin nhắn từ app (khi người dùng bấm "Tải lại" hoặc "Xóa cache")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
