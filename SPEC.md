# SPEC.md — Đặc tả Kỹ thuật: Mục Lục Tự Động (Auto Table of Contents / Outline) & Tối Ưu Hiệu Năng (P0)

## 1. Mục tiêu Cốt lõi
1. **Mục Lục Tự Động (Auto Table of Contents / Outline Sidebar):**
   - Tự động trích xuất các tiêu đề (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `[role="heading"]`, v.v.) từ nội dung bài học trong iframe `lessonIframe`.
   - Xây dựng Cây mục lục phân cấp chuẩn Editorial (H1 $\to$ H2 $\to$ H3 $\to$ H4) có thụt lề, phân cấp thị giác rõ ràng và đếm số lượng phân đoạn.
   - **Scroll Spy 60 FPS:** Tự động theo dõi vị trí cuộn của người đọc trong iframe để phát sáng phân đoạn hiện tại trên mục lục trong thời gian thực.
   - **Smooth Jump & Pulse Highlight:** Khi nhấp vào bất kỳ mục nào trên mục lục, iframe cuộn mượt (smooth scroll) đến chính xác vị trí đó, kèm hiệu ứng phát quang nhẹ (Spring Highlight Pulse) giúp mắt người đọc bắt nhịp tức thì.
   - **Tích hợp linh hoạt:** Bổ sung nút "Mục lục" trên thanh công cụ đọc bài (`stickyReaderHeader`), nút nổi nhanh (`btnFloatingTOC`), và phím tắt `T` để đóng/mở tiện lợi.
   - **Tìm kiếm lọc nhanh trong mục lục:** Cho phép gõ tìm nhanh các phần trong bài học dài hàng chục trang.
   - **Empty State thông minh:** Nếu bài học không có thẻ tiêu đề, hiển thị hướng dẫn tinh tế và cung cấp 2 nút nhảy nhanh "Lên đầu bài" / "Xuống cuối bài".

2. **Tối ưu Hóa Hiệu Năng P0 (Performance & Asset Caching):**
   - Cấu hình `vercel.json` bổ sung chính sách bộ đệm tối ưu cho các tài nguyên tĩnh (`styles.css`, `bridge.js`, `changelog.js`, webfonts, SVGs) với `stale-while-revalidate` và `max-age=86400`, giúp tải lại trang tức thì từ disk cache.
   - Tối ưu tài nguyên trong `<head>`: Bổ sung `dns-prefetch` cho Google Fonts và CDN.
   - Tinh gọn các vòng lặp DOM và khởi tạo trễ (Lazy init / `requestIdleCallback`) cho các subsystem không trọng yếu lúc tải trang đầu tiên.

---

## 2. Design Tokens & Visual Hierarchy (Chuẩn /thietkeweb)
- **Bảng màu Mục Lục:**
  * Light Mode:
    - Nền panel: `#FAF9F5` / `rgba(255, 255, 255, 0.96)` kết hợp `backdrop-blur-md`
    - Viền: `#E7E5DF` / `rgba(0, 0, 0, 0.08)`
    - Chữ chính: `#1C1917` (Font Editorial/Inter)
    - Phân đoạn Active: Nền `#EEF2FF` (`indigo-50`), Chữ `#4338CA` (`indigo-700`), Viền trái 3px `#4F46E5` (`indigo-600`)
  * Dark Mode:
    - Nền panel: `#15181E` / `rgba(21, 24, 30, 0.96)` kết hợp `backdrop-blur-md`
    - Viền: `#262C36`
    - Chữ chính: `#EDECE8`
    - Phân đoạn Active: Nền `rgba(79, 70, 229, 0.15)` (`indigo-950/60`), Chữ `#A5B4FC` (`indigo-300`), Viền trái 3px `#818CF8`
- **Icon SVG Độc Bản:**
  * Icon Mục lục: `viewBox="0 0 24 24"`, nét vẽ đồng bộ `1.8px`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `currentColor`.
- **Transitions (60 FPS GPU Compositor):**
  * Drawer trượt vào: `transform: translateX(0); opacity: 1;` (`duration-220 ease-[cubic-bezier(0.16,1,0.3,1)]`).
  * Drawer trượt ra: `transform: translateX(18px); opacity: 0;` (`duration-180 ease-in`).
  * Hover item: `transform: translateX(3px);` nhẹ nhàng, `duration-150`.
  * Highlight trong iframe: Viền sáng nhẹ và nền `#4F46E5/10`, tự nhạt dần sau 1.5 giây.

---

## 3. Kiến Trúc Dữ Liệu & Luồng Tương Tác (Architecture)
1. **Phía Iframe (`bridge.js`):**
   - Hàm `extractHeadingsTOC()`: Quét `h1, h2, h3, h4, h5, h6, [role="heading"]`.
   - Tự động gán `id = 'heading-anchor-' + idx` nếu phần tử chưa có id.
   - Gửi gói tin `TOC_DATA` sang parent khi `BRIDGE_READY` hoặc khi nhận lệnh `GET_TOC`.
   - Lắng nghe `IntersectionObserver` / scroll để gửi `ACTIVE_HEADING_CHANGED` với `id` và `% tiến độ cuộn`.
   - Lắng nghe `SCROLL_TO_HEADING`: Gọi `el.scrollIntoView({ behavior: 'smooth', block: 'start' })` và chèn class `.heading-jump-highlight`.
2. **Phía Parent (`index.html`):**
   - Lắng nghe sự kiện `TOC_DATA` và `ACTIVE_HEADING_CHANGED` trong `handleBridgeMessageFromIframe`.
   - Fallback: Nếu iframe cùng nguồn (same-origin), tự động trích xuất trực tiếp từ DOM của iframe nếu cần.
   - Render cây phân cấp vào `#tableOfContentsDrawer` và cập nhật huy hiệu số lượng phân đoạn `#tocCountBadge`.
   - Lưu trạng thái mở/đóng vào `localStorage` nếu người dùng muốn ghim.

---

## 4. Acceptance Criteria (Tiêu chuẩn Nghiệm thu cho QA)
- [ ] `[ ]` Nút "Mục lục" hiển thị sắc nét trên thanh công cụ bài đọc (`stickyReaderHeader`) và có phím tắt `T`.
- [ ] `[ ]` Bấm nút "Mục lục" mở ra bảng Mục Lục Tự Động (Auto TOC Drawer) với animation trượt mượt mà 60 FPS.
- [ ] `[ ]` Các tiêu đề H1, H2, H3 được trích xuất đầy đủ, có thụt lề phân cấp trực quan và hiển thị số lượng phân đoạn chính xác.
- [ ] `[ ]` Nhấp vào bất kỳ tiêu đề nào: iframe cuộn mượt (smooth scroll) đến đúng vị trí và có hiệu ứng phát quang nhẹ vị trí đáp.
- [ ] `[ ]` Scroll Spy hoạt động chuẩn xác: Khi người dùng cuộn nội dung bài đọc, tiêu đề tương ứng trên mục lục tự động sáng đèn nổi bật.
- [ ] `[ ]` Có ô tìm kiếm lọc nhanh tiêu đề mục lục khi bài học dài.
- [ ] `[ ]` Có nút nổi nhanh (Floating Quick TOC button) ở góc màn hình để mở mục lục mà không cần cuộn lên đầu trang.
- [ ] `[ ]` Có empty state tao nhã cho các bài học không có tiêu đề, kèm 2 nút nhảy nhanh lên đầu trang và xuống cuối bài.
- [ ] `[ ]` `vercel.json` được cập nhật header cache tối ưu cho static assets (`bridge.js`, `styles.css`, `changelog.js`, v.v.).
- [ ] `[ ]` Chạy `scripts/check_syntax.py` thành công 100% không có lỗi cú pháp.
