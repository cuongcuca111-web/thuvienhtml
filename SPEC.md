# SPEC.md — Đặc Tả Kỹ Thuật: Sửa Nút Tạm Ẩn AI (-) & Tự Động Lưu Lịch Sử AI Bài Học (v5.8.65)

## 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI
1. **Sửa dứt điểm tính năng bấm vào dấu "-" để tạm ẩn Popup AI**:
   - Khắc phục hiện tượng khi bấm nút `-` (`btnMinimizeAiPopover`), hàm `positionAiPopover()` lập tức gỡ bỏ class `is-minimized` vì đoạn văn bản bôi đen vẫn nằm trong viewport.
   - Thêm biến cờ trạng thái `isAiPopoverUserMinimized = true/false` độc lập.
   - Khi người dùng bấm `-`: popup lập tức thu nhỏ êm ái thành thanh Mini Pill Bar nổi ở góc đáy màn hình (`bottom-6` hoặc giữa đáy), không bị logic cuộn trang tự động mở lại.
   - Khi nhấp vào Mini Pill Bar (hoặc icon mở rộng): mở to lại popup về kích thước đầy đủ (`isAiPopoverUserMinimized = false`).
2. **Tính năng Tự Động Lưu & Xem Lại Lịch Sử Câu Trả Lời AI Theo Từng Bài Học**:
   - Tự động lưu tất cả câu trả lời AI (Giải thích, Ví dụ, Dịch...) gắn liền với ID bài học hiện tại (`state.activeLessonId`).
   - Lưu trữ bền vững trong `state.learningData.aiHistory[lessonId]` và backup độc lập `localStorage`.
   - Cung cấp giao diện Modal Lịch Sử AI (`#lessonAiHistoryModal`):
     * Mở từ nút Lịch sử trên Header của AI Popover (`#btnAiOpenHistory`).
     * Mở từ nút Lịch sử AI trên thanh công cụ đọc bài (`#btnStickyLessonAiHistory`).
     * Hiển thị danh sách câu trả lời theo thứ tự mới nhất: đoạn trích dẫn, câu trả lời đầy đủ, thuật ngữ, ví dụ, thời gian.
     * Nút tiện ích trên từng câu: "Sao chép", "Lưu thành ghi chú", "Xóa câu này".

---

## 2. DESIGN TOKENS & GIAO DIỆN
- **Mini Pill Bar khi thu nhỏ**:
  - Chiều cao `44px`, bo tròn viên thuốc `rounded-full`, viền sáng tinh tế, hiệu ứng glassmorphism `backdrop-blur-md`.
  - Icon chỉ báo trạng thái đang xử lý (xoay tròn) hoặc đã hoàn tất (dấu tích xanh).
- **Modal Lịch Sử AI (`#lessonAiHistoryModal`)**:
  - Chuẩn Dark Glassmorphism, chiều rộng `max-w-2xl`, hỗ trợ scroll mượt mà `overscroll-contain`.
  - Thẻ câu trả lời: bo góc `rounded-xl`, nền `#FAF9F5` / `#161A20`, viền sáng nhẹ.

---

## 3. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)
- [x] 1. Bấm vào nút `-` trên Popup AI thì popup thu nhỏ tạm ẩn thành Mini Pill Bar ngay lập tức, không bị nảy lại chế độ to.
- [x] 2. Bấm vào Mini Pill Bar thì popup mở to trở lại đầy đủ kích thước.
- [x] 3. Khi AI sinh xong câu trả lời, hệ thống tự động lưu câu trả lời vào lịch sử của bài học đó.
- [x] 4. Mở bài học lên, bấm vào nút "Lịch sử AI" trên thanh công cụ hoặc trong popup AI là thấy toàn bộ các câu trả lời trước đó của bài học.
- [x] 5. Có thể sao chép, lưu thành ghi chú, hoặc xóa từng câu trả lời trong lịch sử.
- [x] 6. Cú pháp Node.js trên toàn bộ script (`scripts/check_syntax.py`) đạt 100% OK.
