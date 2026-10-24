// Service Worker cho Ứng dụng Sách HTML (PWA v5.8.28)
// - Đồng bộ phiên bản APP_VERSION v5.8.28 với index.html & changelog.js
// - Tự động dọn sạch cache cũ và skipWaiting để người dùng luôn nhận bản cập nhật mới nhất
// - Network-First thuần túy cho điều hướng HTML (không truyền options gây lỗi TypeError trên navigate request)

// Tự động nhận diện APP_VERSION trực tiếp từ query param của registration URL (?v=...), triệt tiêu lỗi lệch pha cache
const APP_VERSION = new URL(self.location.href).searchParams.get('v') || 'v5.8.28';
const CACHE_NAME = 'thuvienhtml-cache-' + APP_VERSION;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './changelog.js',
  './bridge.js',
  './manifest.json'
];

// 1. Cài đặt Service Worker (Precache tài nguyên ban đầu & skipWaiting ngay lập tức)
self.addEventListener('install', (event) => {
  self.skipWaiting();
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

  // Bỏ qua các request không phải GET hoặc yêu cầu từ Firebase Firestore / Google Cloud APIs / Auth / Vercel API
  // Cho phép lưu đệm phông chữ Google Fonts (fonts.googleapis.com, fonts.gstatic.com) và Tailwind CDN (cdn.tailwindcss.com)
  const isGoogleApiExcluded = url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com');
  if (req.method !== 'GET' ||
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('firebaseio.com') ||
      isGoogleApiExcluded ||
      url.hostname.includes('identitytoolkit')) {
    return;
  }

  // Đối với điều hướng HTML hoặc tải trang chính: LUÔN ƯU TIÊN MẠNG TRƯỚC (Network-First)
  // Lưu ý: Không truyền tham số tùy chọn vào fetch(req) vì trình duyệt sẽ ném lỗi TypeError với request có mode 'navigate'
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
        .catch(async () => {
          // Chỉ khi mất mạng hoàn toàn mới dùng bản trong cache
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match('./index.html') || await caches.match('./');
          if (fallback) return fallback;
          return new Response("Bạn đang ngoại tuyến. Vui lòng kết nối Internet để tải bản mới nhất.", {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        })
    );
    return;
  }

  // Đối với tài nguyên tĩnh khác (hình ảnh, manifest...): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        // Hỗ trợ lưu đệm cả response 200 và response dạng opaque (cross-origin CDN như Tailwind/Google Fonts)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
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
