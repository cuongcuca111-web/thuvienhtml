# SPEC.md — Đặc tả Kỹ thuật: Khắc phục Lỗi Phân quyền Gói Pro/Plus khi Chọn Màu Khung & Modal Ghi chú

## 1. Mục tiêu & Vấn đề Cốt lõi
- **Hiện tượng lỗi:**
  1. **Ảnh 1 (Modal Chi tiết Ghi chú Khung - `highlightDetailModal`):** Người dùng không chọn được màu (bấm vào các chấm màu Vàng, Xanh, Hồng, Tím nhưng không có tác dụng đổi màu).
  2. **Ảnh 2 (Thanh công cụ nổi - `highlightFloatingToolbar`):** Người dùng đang ở phiên bản Pro (`state.userTier === 'pro'` hoặc `thuvienhtml_cached_user_tier === 'pro'`), nhưng khi chọn màu khung (hoặc tùy chọn màu) hệ thống lại hiện thông báo cảnh báo: *"Tính năng chọn màu khung dành cho gói Plus trở lên"*.
- **Nguyên nhân cốt lõi (Root Cause):**
  1. Trong hàm `getUserTier(user)` (dòng ~8992):
     Kiểm tra `const u = user || state.user; if (!u || u.isAnonymous) return 'guest';` được đặt ở đầu hàm, trước cả khi kiểm tra `state.isAdmin`, `state.userTier` hoặc `localStorage.getItem('thuvienhtml_cached_user_tier')`. Khi người dùng ở chế độ khách, ẩn danh (anonymous Firebase), hoặc `state.user` chưa nạp xong, hàm lập tức trả về `'guest'`.
  2. Trong hàm `canUseFrameColors()` (dòng ~26200):
     Kiểm tra `if (typeof can === 'function') return Boolean(can('frameColors'));` được gọi ngay. Do `can('frameColors')` gọi `getPlan()` -> `getUserTier()` và bị trả về `'guest'`, nên `can('frameColors')` trả về `false`. Khối fallback phía sau `currentTier === 'plus' || currentTier === 'pro'` không bao giờ được chạm tới.
  3. Trong hàm `requestFrameColor(color)` (dòng ~26239):
     Khi `canUseFrameColors()` trả về `false`, hàm hiển thị Toast cảnh báo *"Tính năng chọn màu khung dành cho gói Plus trở lên"* và trả về `false`.
  4. Trong Modal Ghi chú (`highlightDetailModal`):
     Sự kiện click vào các chấm màu gọi `requestFrameColor(color, btn)`. Do bị `requestFrameColor` trả về `false`, luồng xử lý bị chặn ngay lập tức, không cập nhật `targetItem.color`, không lưu vào `learningData`, và không gửi thông điệp đổi màu tới iframe. Đồng thời selector `document.querySelectorAll('.hl-color-btn')` được gán dùng chung cho cả toolbar lẫn modal gây tranh chấp logic.

---

## 2. Giải pháp Kỹ thuật Chi tiết

### 2.1. Thống nhất cơ chế xác định Tier trong `getUserTier(user)`
- Nếu người dùng là Admin (`state.isAdmin`), luôn trả về `'pro'`.
- Kiểm tra `state.userTier` và `thuvienhtml_cached_user_tier`: Nếu đang là `'pro'` hoặc `'plus'`, lập tức trả về gói tương ứng mà không bị chặn bởi `u.isAnonymous` hay `!u`.
- Chỉ coi là `'guest'` khi không có cờ Pro/Plus nào và người dùng chưa đăng nhập hoặc là anonymous.
- Hỗ trợ trường hợp truyền tham số `user` cụ thể độc lập với session hiện tại.

### 2.2. Chuẩn hóa `canUseFrameColors()` và `canUseCustomColor()`
- Đồng bộ cơ chế kiểm tra tier:
  1. Nếu `state.isAdmin` $\implies$ `true`.
  2. Nếu `state.userTier === 'plus' || state.userTier === 'pro'` $\implies$ `true`.
  3. Nếu `thuvienhtml_cached_user_tier === 'plus' || 'pro'` $\implies$ `true`.
  4. Nếu `getUserTier() === 'plus' || 'pro'` $\implies$ `true`.
  5. Fallback qua `can('frameColors')` hoặc `can('customColor')`.

### 2.3. Tối ưu bộ cổng `requestFrameColor(color, targetEl)`
- Nhận biết chính xác quyền Pro/Plus/Admin thông qua `canUseFrameColors()`.
- Với màu cam mặc định: Luôn cho phép đối với mọi người dùng.
- Với màu green, pink, purple: Mở khóa tức thì cho Plus, Pro, Admin mà không bao giờ hiện toast cảnh báo hay popup.
- Với màu custom: Mở khóa tức thì cho Plus, Pro, Admin.

### 2.4. Khắc phục chọn màu trong Modal Chi tiết Ghi chú (`#highlightDetailModal`)
- Phạm vi selector rõ ràng: `#highlightDetailModal .hl-color-btn` để không xung đột với toolbar.
- Lấy mục tiêu ghi chú bền bỉ: `targetItem = activeHighlightItem || window._currentEditingFrameItem || (fallback từ hlDetailModal.dataset.frameId)`.
- Cập nhật `targetItem.color`, cập nhật UI viền chấm màu (`updateNoteModalColorUI`), cập nhật chấm màu tiêu đề modal (`#hlModalColorDot`), lưu dữ liệu (`persistCurrentFrameData`), gửi tin nhắn `UPDATE_FRAME_COLOR` tới iframe và cập nhật trực tiếp DOM của iframe nếu cùng origin.
