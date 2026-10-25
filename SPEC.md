# SPEC.md — Đặc Tả Kỹ Thuật: Thiết Kế Lại Bố Cục Flashcard Công Thái Học, Transition 60fps & Sửa Lỗi Phím Space / Toolbar (v5.8.68)

## 1. NGUYÊN NHÂN GỐC RỄ & PHÂN TÍCH LỖI
1. **Lỗi phím Space không hoạt động hoặc bị giật lật qua lật lại**:
   - Trong `index.html` có 2 `keydown` event listener đồng thời cùng bắt `e.code === 'Space'` hoặc `e.key === ' '`:
     * Listener cũ (dòng 38981) gọi `flipCurrentFlashcard()`.
     * Listener mới SM-2 (dòng 46776) cũng gọi `flipCurrentFlashcard()`.
   - Kết quả: Khi người dùng bấm phím cách, hàm bị gọi 2 lần liên tiếp (True $\to$ False), khiến trạng thái bị triệt tiêu ngay lập tức.
2. **Lỗi các tính năng ở Ảnh 2 (Đọc, Trộn, Đảo mặt, Cài đặt phím tắt)**:
   - Các hàm `speakCurrentFlashcard`, `shuffleFlashcards`, `toggleSwapFlashcardFaces`, `toggleFlashcardShortcutsGuide` được định nghĩa trong phạm vi hàm/closure nhưng chưa được export ra `window` và chưa có `addEventListener` trực tiếp trong script.
   - Khi người dùng bấm vào các nút inline HTML `onclick="..."`, trình duyệt ném ra `ReferenceError: [tên hàm] is not defined`.
3. **Bố cục bị co rúm, rớt chữ và rời rạc (Ảnh 1)**:
   - Nút `Lật xem đáp án` ở giữa bị ép chữ rớt thành 3 dòng ("Lật" - "đáp" - "án") do `flex-1` thiếu `whitespace-nowrap` và padding chưa tối ưu.
   - Thanh công cụ điều hướng bên dưới bị phân mảnh thành 2 cụm xa nhau (cụm `< >` bên trái và cụm icon chữ bên phải), thiếu chỉ số vị trí thẻ trung tâm và thiếu thanh tiến trình trực quan.
   - Khi chuyển giữa các thẻ không có hiệu ứng chuyển cảnh (instant text replacement), tạo cảm giác giật cục.

---

## 2. GIẢI PHÁP THIẾT KẾ & TRIỂN KHAI (ARCHITECTURE & DESIGN)

### 2.1. Thiết kế lại Bố cục Công thái học (Ergonomic Layout Redesign):
- **Thanh tiến trình mỏng tinh tế (`#fcProgressBar`)**:
  * Đặt ngay dưới Header modal: thanh gradient `from-indigo-500 to-indigo-600` mượt mà, tự động cập nhật `%` hoàn thành theo từng thẻ.
- **Hàng nút chính (Main Action Trio)**:
  * Nút `[❌ Chưa nhớ]` (🔴 Rose soft, viền nhẹ, icon X, phím tắt 1).
  * Nút `[🔄 Lật đáp án (Space)]` (Indigo gradient nổi bật, `whitespace-nowrap`, không bị rớt dòng).
  * Nút `[✅ Đã nhớ]` (🟢 Emerald soft, viền nhẹ, icon Check, phím tắt 3).
  * Chiều cao `min-h-[50px]`, bo góc `rounded-xl`, cân đối hoàn hảo.
- **Thanh công cụ hợp nhất (Unified Toolbar Capsule)**:
  * Cụm điều hướng trung tâm: `[◀ Trước]` + `[1 / 8]` + `[Tiếp ▶]`.
  * Vạch ngăn dọc tinh tế `w-px h-4 bg-stone-300 dark:bg-stone-700 mx-1.5`.
  * Cụm tính năng thông minh:
    - 🔊 **Đọc (TTS)**: Đọc to phát âm bằng Web Speech API, có hiệu ứng hoạt họa khi đang phát âm.
    - 🔀 **Trộn (Shuffle)**: Xáo trộn ngẫu nhiên thẻ với toast thông báo.
    - 🔄 **Đảo mặt (Reverse Mode)**: Học ngược từ đáp án $\to$ câu hỏi.
    - ⌨️ **Phím tắt**: Mở bảng hướng dẫn phím tắt trực quan.

### 2.2. Hiệu ứng Transition nhẹ nhàng khi chuyển thẻ (60 FPS Card Transition):
- Thêm keyframe `@keyframes fcSlideInNext` và `@keyframes fcSlideInPrev` trong `styles.css`.
- Khi chuyển sang thẻ tiếp theo (`direction = 'next'`): Thẻ lướt nhẹ từ phải sang trái kèm fade-in mượt mà (`translate3d(24px, 0, 0)` $\to$ `0`).
- Khi lùi thẻ trước (`direction = 'prev'`): Thẻ lướt nhẹ từ trái sang phải (`translate3d(-24px, 0, 0)` $\to$ `0`).

### 2.3. Sửa dứt điểm phím Space & Bộ công cụ Ảnh 2:
- Gỡ bỏ hoàn toàn listener phím Space thừa tại dòng 38981.
- Hợp nhất vào 1 listener duy nhất, chống duplicate event.
- Export toàn bộ hàm ra `window` và gắn `addEventListener` tường minh cho tất cả các nút: `btnFcSpeak`, `btnFcShuffle`, `btnFcSwapFaces`, `btnFcShortcutsGuide`, `btnFcPrev`, `btnFcNext`.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] 1. Phím `Space` lật thẻ mượt mà 100%, không bị lật 2 lần hay giật cục.
- [x] 2. Nút "Lật đáp án" ở giữa hiển thị trên 1 dòng duy nhất, không bị rớt chữ.
- [x] 3. Cả 4 nút ở Ảnh 2 (Đọc, Trộn, Đảo mặt, Bảng phím tắt) hoạt động trơn tru 100%.
- [x] 4. Có hiệu ứng transition trượt mượt mà 60fps khi chuyển giữa các thẻ.
- [x] 5. Có thanh tiến trình (Progress Bar) chạy theo từng câu thẻ.
- [x] 6. Kiểm tra cú pháp Node.js đạt 100% OK và đồng bộ phiên bản v5.8.68.
