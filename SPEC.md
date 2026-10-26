# SPEC.md — Khắc Phục Lỗi Bấm Nút "Đã Nhớ" Bị Nhảy Cóc Thẻ Flashcard (v5.8.73)

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)
Người dùng phản ánh: Khi đang ở Thẻ 1/4 (ảnh 1), bấm nút "Đã nhớ" thì thẻ bị nhảy ngay tới Thẻ 3/4 (ảnh 2), bỏ qua hoàn toàn Thẻ 2/4. Người dùng mong muốn khi bấm "Đã nhớ", ứng dụng chuyển tuần tự sang đúng thẻ tiếp theo (Thẻ 2/4).

Qua kiểm tra mã nguồn `index.html`:
1. **Lỗi Double-Firing (Gắn 2 sự kiện cùng lúc cho nút bấm)**:
   - Tại dòng 39035-39036 (`initFlashcardControlsEvents`):
     ```javascript
     const btnRemembered = document.getElementById('btnFcRemembered');
     if (btnRemembered) btnRemembered.onclick = () => { if (typeof answerFlashcardWithSM2 === 'function') answerFlashcardWithSM2(4); };
     ```
   - Đồng thời, tại dòng 39151-39152:
     ```javascript
     const btnFcRemembered = document.getElementById('btnFcRemembered');
     if (btnFcRemembered) btnFcRemembered.addEventListener('click', () => answerFlashcard(true));
     ```
   - Khi người dùng click nút "Đã nhớ", trình duyệt kích hoạt CẢ HAI trình xử lý liên tiếp trong cùng 1 lần nhấn:
     * Trình xử lý 1 (`onclick`): Chạy `answerFlashcardWithSM2(4)` -> Đánh giá Thẻ 1, tăng `flashcardIndex` từ 0 lên 1.
     * Trình xử lý 2 (`addEventListener`): Chạy `answerFlashcard(true)` -> Đánh giá tiếp luôn Thẻ 2, tăng `flashcardIndex` từ 1 lên 2!
     * Kết quả: Thẻ 2 bị lướt qua trong 0 mili-giây, giao diện lập tức hiển thị Thẻ 3 (`Thẻ 3 / 4`), đếm sai số lượng thẻ đã học (`cardsReviewed` bị cộng 2 lần, `fcKnownCount` bị cộng 2 lần).
2. **Lỗi tương tự ở nút "Chưa nhớ" (`btnFcForgot`)**:
   - Vừa có `btnForgot.onclick = () => answerFlashcardWithSM2(1)` vừa có `btnFcForgot.addEventListener('click', () => answerFlashcard(false))`, cũng bị nhảy cóc thẻ khi bấm "Chưa nhớ".
3. **Lỗi dư thừa sự kiện vuốt cảm ứng (Swipe)**:
   - Dòng 39198-39208 có một listener vuốt cảm ứng cũ (`touchstart`/`touchend` gọi `answerFlashcard`), trong khi dòng 46998 (`initFlashcardCardSwipe`) đã có hệ thống vuốt cảm ứng mượt mà 60fps kèm hiệu ứng xoay và SM-2.
4. **4 nút đánh giá SM-2 ở mặt sau (Lại, Khó, Tốt, Dễ) chưa được gán sự kiện click**:
   - `btnSm2Again`, `btnSm2Hard`, `btnSm2Good`, `btnSm2Easy` chưa được bind sự kiện trong `initFlashcardControlsEvents()`.

---

## 2. GIẢI PHÁP TRIỂN KHAI (BUILDER PLAN)
1. **Loại bỏ hoàn toàn trình xử lý trùng lặp**:
   - Xóa bỏ `addEventListener('click')` trùng lặp tại dòng 39151-39156 cho cả `btnFcRemembered` và `btnFcForgot`.
   - Xóa bỏ listener vuốt cảm ứng cũ tại dòng 39198-39208 trên `flippableCard`.
2. **Chuẩn hóa hàm `answerFlashcard`**:
   - Chuyển `answerFlashcard(isKnown)` thành hàm chuyển tiếp (proxy) an toàn gọi tới `answerFlashcardWithSM2(isKnown ? 4 : 1)` để bất kỳ vị trí gọi nào cũng đồng bộ theo chuẩn SM-2 và lưu trữ IndexedDB.
3. **Bổ sung cơ chế chống bấm liên hoàn (Debounce / Transit Lock)**:
   - Đặt cờ `let isAnsweringFlashcard = false;` trong `answerFlashcardWithSM2`.
   - Khóa trong 180ms để ngăn chặn tuyệt đối tình trạng double-click chuột phần cứng hoặc chạm đa điểm trên màn hình cảm ứng điện thoại.
4. **Gán đầy đủ sự kiện cho 4 nút SM-2 khi lật thẻ**:
   - Gán `onclick` cho `btnSm2Again` (1), `btnSm2Hard` (3), `btnSm2Good` (4), `btnSm2Easy` (5) trong `initFlashcardControlsEvents()`.
5. **Cập nhật Changelog & Đồng bộ phiên bản v5.8.73**:
   - Cập nhật `changelog.js`, chạy `sync_version.py`, kiểm thử cú pháp `check_syntax.py`, commit & push GitHub và sao lưu Google Drive.

---

## 3. TIÊU CHUẨN KIỂM THỬ (QA CRITERIA)
- [ ] Bấm "Đã nhớ" ở Thẻ 1/4: Chuyển chính xác sang Thẻ 2/4 (không nhảy cóc sang Thẻ 3/4).
- [ ] Bấm "Chưa nhớ" ở Thẻ 1/4: Chuyển chính xác sang Thẻ 2/4 và thêm thẻ vào hàng đợi ôn lại.
- [ ] Bấm các nút SM-2 (Lại, Khó, Tốt, Dễ) ở mặt sau hoạt động chính xác từng thẻ.
- [ ] Cú pháp Node.js đạt 100% PASS cho toàn bộ file và script inline.
