# SPEC.md — Đặc Tả Kỹ Thuật: Điều Hướng Nút "Hoàn Tất" Flashcard Về Popup Bộ Thẻ & Trắc Nghiệm (v5.8.70)

## 1. YÊU CẦU & BỐI CẢNH
- **Yêu cầu người dùng**:
  * Khi người dùng học xong phiên Flashcard và ở màn hình tổng kết hoàn thành (*"Hoàn thành phiên kiểm tra!" - Ảnh 1*), bấm nút **`[ Hoàn tất ]`** (`#btnFcFinish`) thì hệ thống phải tự động điều hướng quay trở lại popup **"Bộ thẻ & Trắc nghiệm tự kiểm tra"** (*Ảnh 2*).
- **Phân tích hiện trạng**:
  * Tại dòng 39056 của [`index.html`](file:///C:/Users/PV/.gemini/antigravity/scratch/thuvienhtml/index.html), sự kiện click của nút `#btnFcFinish` hiện chỉ gọi `hideModalAnimated(fcModal)`. Do đó sau khi bấm xong, popup đóng lại và màn hình trả về nền bài học, khiến luồng học tập bị đứt quãng.
  * Trong khi đó, ở modal Trắc nghiệm (Quiz), nút `#btnQuizFinishToHub` tại dòng 40859 đã gọi:
    ```javascript
    hideModalAnimated(quizModal);
    openStudyDecksManagerModal();
    ```
    cho phép người dùng quay lại Kho bài kiểm tra để chọn đề khác hoặc xem thống kê.

---

## 2. GIẢI PHÁP THIẾT KẾ & TRIỂN KHAI (ARCHITECTURE & DESIGN)
1. **Sự kiện nút `#btnFcFinish`**:
   - Khi người dùng bấm nút `[ Hoàn tất ]` trên màn hình tổng kết `#fcSessionSummaryView`:
     * Đóng modal Flashcard: `hideModalAnimated(fcModal)`.
     * Mở modal Trung tâm Quản lý Bộ thẻ & Trắc nghiệm:
       ```javascript
       if (typeof openStudyDecksManagerModal === 'function') {
         openStudyDecksManagerModal();
       } else if (typeof window.openStudyDecksManagerModal === 'function') {
         window.openStudyDecksManagerModal();
       }
       ```
     * Modal Bộ thẻ sẽ tự động cập nhật thống kê số lượng thẻ nhớ, điểm số, và làm mới các tab (Tất cả bộ đề, Đã gắn sao, Cần học lại).
2. **Trải nghiệm đóng qua nút 'X' ở màn hình kết thúc**:
   - Nếu người dùng bấm nút đóng `X` (`#btnCloseFcModal`) khi đã ở màn hình hoàn thành (summary view đang hiển thị), cũng hỗ trợ điều hướng quay về `openStudyDecksManagerModal()` để giữ tính nhất quán công thái học.

---

## 3. KẾ HOẠCH KIỂM THỬ & NGHIỆM THU (QA CRITERIA)
1. Mở một bộ thẻ Flashcard bất kỳ và hoàn thành phiên học đến thẻ cuối cùng.
2. Màn hình "Hoàn thành phiên kiểm tra!" xuất hiện (Ảnh 1).
3. Bấm nút **`[ Hoàn tất ]`**: Modal Flashcard đóng lại và modal **"Bộ thẻ & Trắc nghiệm tự kiểm tra"** (Ảnh 2) lập tức hiển thị mượt mà.
4. Cú pháp Node.js trên toàn bộ script và inline tags đạt 100% OK (`check_syntax.py`).
5. Ghi nhận nhật ký cập nhật vào `changelog.js`, đồng bộ phiên bản `v5.8.70` và đẩy Git lên main.
