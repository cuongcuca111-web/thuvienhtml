# SPEC.md — Tối Ưu Hóa Khởi Động Single-Pass, Triệt Tiêu Nạp Kép & Gia Tốc 60/120fps (v5.8.78)

## 1. PHÂN TÍCH NGUYÊN NHÂN THỰC TẾ
Người dùng phản ánh:
1. Khi khởi động web, web bị tải 2 lần liên tiếp gây giật lag và chớp nháy giao diện.
2. Web bị lag khi mở các Popup (Modal) và thực hiện các thao tác chuyển bài, đánh dấu, tương tác thông thường.

### Nguyên nhân gốc rễ:
1. **Nạp kép lúc khởi động (Double Load / Double Render):**
   - Khi khởi động, `onAuthStateChanged` gọi `loadLocalState()` (0ms) vẽ Sidebar & nạp Iframe bài đầu tiên (`state.lessons[0]`).
   - ~300ms sau, Firestore `onSnapshot(lessonCol)` và `loadUserSettings()` trả về `lastActiveLessonId` khác hoặc thay thế `state.lessons` bằng mảng mới (làm mất `htmlContent` trên RAM). Chốt chặn `isSameLessonAlreadyRendered` trả về `false`, xóa sạch Iframe và danh mục, nạp lại từ đầu lần 2.
   - `autoCleanupDuplicateData` và `loadUserSettings` bị gọi lặp 3 lần khi khởi động, chạy `JSON.parse(JSON.stringify(state.lessons))` và ghi IndexedDB làm nghẽn CPU.
   - Watchdog `window.addEventListener('error', ..., true)` bắt cả lỗi tài nguyên tĩnh và reload lại cả trang `?nocache=`.

2. **Nghẽn khung hình khi mở Popup & thao tác bình thường:**
   - Khi chọn bài ở Sidebar (`selectLesson`), code gọi `updateDoc({ lastOpenedAt })` mà không đánh dấu `recentLocalLessonFieldUpdates`. Khi Firestore phản hồi sau 200ms, nó kích hoạt lại `onSnapshot` re-render danh mục và Iframe lần 2.
   - `popupFestivalObserver` quan sát toàn bộ `document.body` (48.000 dòng HTML) với `{ attributes: true, childList: true, subtree: true }`, chạy liên tục mỗi khi có thay đổi class/style nhỏ nhất.
   - Khi mở Popup, `checkPopupState` gọi `updateThemeDecorCaps` duyệt qua 25+ modal ẩn và gọi `getComputedStyle` xen kẽ sửa DOM (Forced Synchronous Reflow).
   - Canvas hạt lễ hội (Xuân, Hè, Halloween, Sparkles) gọi `ctx.shadowBlur = 4..8` liên tục 50-80 hạt/khung hình (hàng nghìn lần/giây).
   - Search Palette animate trực tiếp `backdrop-filter: blur(0px) -> blur(8px)` từng frame ép GPU tính toán lại toàn màn hình.

---

## 2. GIẢI PHÁP KỸ THUẬT TRIỂN KHAI (6 TRỤ CỘT)

### 2.1. Khởi động 1 lượt duy nhất (Single-Pass Boot)
1. Trong `loadLocalState()`: Đọc `cachedCfg.lastActiveLessonId` để chọn đúng bài học ngay từ 0ms, không chọn tạm `lessons[0]` để rồi bị đổi sau 300ms.
2. Trong `onSnapshot(lessonCol)`: Kế thừa thuộc tính `htmlContent` của bài học đang nạp trong RAM (`targetLesson.htmlContent = oldLesson.htmlContent`). Chốt chặn `isSameLessonAlreadyRendered` sẽ trả về `true`, triệt tiêu hoàn toàn lần render Iframe thứ 2!
3. Trong `onSnapshot(lessonCol)` & `onSnapshot(catCol)`: Nếu danh sách ID, thứ tự và bài active không đổi cấu trúc, chỉ cập nhật state ngầm, không xóa và vẽ lại Sidebar.

### 2.2. Triệt tiêu Re-render ngầm khi chọn bài (`selectLesson`)
1. Trong `selectLesson(lessonId)`: Thêm `recentLocalLessonFieldUpdates.set(lessonId, Date.now())` trước khi gọi `updateDoc({ lastOpenedAt })`. Khi Firestore phản hồi, `onSnapshot` nhận diện đây là thay đổi cục bộ vừa thực hiện và bỏ qua re-render.
2. Bỏ `withTransition` bọc toàn màn hình trên `selectLesson`, thay bằng fast DOM class update mượt mà không chớp viewport.

### 2.3. Tối ưu hóa `autoCleanupDuplicateData()`
1. Chuyển sang kiểm tra nhẹ nhàng bằng `Set`/`Map` trên RAM.
2. CHỈ KHI phát hiện có trùng lặp thực tế (`dirty === true`), mới chụp snapshot và ghi sao lưu.
3. Bỏ gọi lặp ở `onSnapshot` và `loadLocalState`, chỉ chạy 1 lần duy nhất khi kết thúc boot.

### 2.4. Mở Popup siêu tốc (Zero Reflow & GPU Composite)
1. Tháo bỏ `popupFestivalObserver` trên toàn bộ `document.body`. Thay bằng hook trực tiếp vào `showModalAnimated()` và `hideModalAnimated()`.
2. Trong `updateThemeDecorCaps`: Chỉ cập nhật cho modal đang mở (`targetModal`), không lặp qua 25 modal ẩn và bỏ toàn bộ `getComputedStyle`.
3. Trong `styles.css`: Giữ nguyên `backdrop-filter: blur(8px)` cố định, chỉ animate `opacity` (từ 0 đến 1) và `transform: translateY/scale`, loại bỏ animate biến thiên giá trị `blur()`.

### 2.5. Tối ưu Canvas Hạt Lễ Hội (Pre-rendered Sprites)
1. Chuyển các hạt của Spring Blossom, Summer Breeze, Halloween, Sparkles sang vẽ bằng Offscreen Sprite hoặc vẽ gradient hình học đơn giản, loại bỏ 100% lệnh `ctx.shadowBlur` trong vòng lặp animation.

### 2.6. Tinh chỉnh Watchdog & Event Listeners
1. Điều chỉnh listener `error` bỏ bắt tài nguyên phụ và nâng ngưỡng timeout khẩn cấp.

---

## 3. KẾ HOẠCH TRIỂN KHAI (BUILDER CHECKLIST)
- [ ] Cập nhật `index.html`: Khắc phục `onSnapshot` kế thừa `htmlContent` và sửa `selectLesson` ghi nhận `recentLocalLessonFieldUpdates`.
- [ ] Cập nhật `index.html`: Tối ưu `autoCleanupDuplicateData` chỉ snapshot khi `dirty === true`.
- [ ] Cập nhật `index.html`: Tháo bỏ `popupFestivalObserver` toàn `document.body`, hook trực tiếp vào `showModalAnimated`/`hideModalAnimated`.
- [ ] Cập nhật `styles.css`: Tối ưu animation của Search Backdrop & Palette bỏ animate `blur()`.
- [ ] Cập nhật `index.html`: Tối ưu Canvas Hạt bỏ `ctx.shadowBlur`.
- [ ] Kiểm thử cú pháp Node.js qua `scripts/check_syntax.py`.
- [ ] Nâng version lên `v5.8.78` trong `changelog.js`, chạy `scripts/sync_version.py`.
- [ ] Commit Git & Push, sao lưu Google Drive.
