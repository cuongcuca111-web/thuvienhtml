# SPEC.md — Đặc Tả Kỹ Thuật: Mobile Bottom Nav, Swipe Gestures & Spaced Repetition SM-2 (v5.8.64)

## 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI
Hiện đại hóa trải nghiệm người dùng trên thiết bị di động và tối ưu hóa hiệu quả ghi nhớ dài hạn của Thư Viện Sách HTML PWA thông qua 3 trụ cột nâng cấp:
1. **Thanh Điều Hướng Đáy Công Thái Học (Ergonomic Mobile Bottom Navigation Bar)**: Cung cấp 5 tab thao tác nhanh một chạm ở ngón tay cái (Bài học, Bài trước, Ôn tập SM-2 với badge số lượng, Tìm kiếm, Bài tiếp), hỗ trợ chuẩn `safe-area-inset-bottom` và hiệu ứng tương tác 60 FPS.
2. **Hệ Thống Thao Tác Cử Chỉ Vuốt Đa Tầng (Multi-Layer Swipe Gestures)**:
   - Vuốt trái/phải trên khung đọc bài (`readingArea` & `lessonIframe` qua `bridge.js`) để lật bài học trước/sau mượt mà.
   - Vuốt từ mép trái màn hình (`startX < 35px`) để mở menu danh mục bài học mobile sidebar; vuốt sang trái để đóng sidebar.
   - Vuốt thẻ Flashcard (Swipe Card Physics): Kéo thẻ sang phải để đánh dấu "Đã nhớ", kéo sang trái để đánh dấu "Chưa nhớ" với góc xoay 3D và độ mờ tự nhiên.
3. **Thuật Toán Lặp Lại Ngắt Quãng Chuẩn SuperMemo-2 (Spaced Repetition System - SM-2)**:
   - Triển khai thuật toán SM-2 chuẩn xác với các hệ số: Repetition ($n$), Interval ($I$), Easiness Factor ($EF \ge 1.3$).
   - Đánh giá 4 cấp độ ghi nhớ: Lại (Again, $q=1$), Khó (Hard, $q=3$), Tốt (Good, $q=4$), Dễ (Easy, $q=5$).
   - Tự động tính toán ngày đến hạn ôn tập (`dueDate`), tích hợp đếm số thẻ đến hạn vào Mobile Bottom Bar và thanh Sidebar.

---

## 2. DESIGN TOKENS & GIAO DIỆN
- **Màu sắc Bottom Nav**:
  - Light mode: `bg-white/95 text-[#57534E] border-[#E7E5DF]`, Active: `text-indigo-600 font-semibold`.
  - Dark mode: `bg-[#14171C]/95 text-[#9AA3B2] border-[#262C36]`, Active: `text-indigo-400 font-semibold`.
  - Badge Ôn tập: `bg-rose-500 text-white rounded-full text-[10px] font-bold px-1.5`.
- **Icon SVG Độc bản chuẩn 24x24**: Nét vẽ 1.5px - 2px tròn trịa, cân bằng thị giác (optical balance).
- **Animation Easing**: `cubic-bezier(0.16, 1, 0.3, 1)`, thời gian chuyển động `180ms - 240ms`.

---

## 3. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)
- [x] 1. Mobile Bottom Bar hiển thị 5 tab cân đối, có badge số lượng bài/thẻ đến hạn ôn tập hôm nay.
- [x] 2. Bấm các tab trên Mobile Bottom Bar hoạt động chính xác (Mở bài học, bài trước, ôn tập SM-2, tìm kiếm, bài sau).
- [x] 3. Vuốt trái/phải trên bài đọc chuyển bài mượt mà, không bị xung đột với hành vi cuộn dọc bài viết.
- [x] 4. Vuốt thẻ flashcard trái/phải phản hồi chuyển động 3D tự nhiên và tự động ghi nhận kết quả.
- [x] 5. Hỗ trợ đầy đủ các nút đánh giá SM-2 (Lại, Khó, Tốt, Dễ) với số ngày dự kiến hiển thị trực quan.
- [x] 6. Thuật toán SM-2 cập nhật chuẩn xác `repetition`, `interval`, `ef`, `dueDate` và lưu bền vững vào `localStorage`.
- [x] 7. Cú pháp Node.js trên tất cả file (`scripts/check_syntax.py`) đạt 100% OK.
