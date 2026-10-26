# SPEC.md — Cơ Chế Phân Rã Đa Tầng 3 Lớp & Auto Top-Up Bù Câu Thiếu (v5.8.76)

## 1. PHÂN TÍCH NGUYÊN NHÂN THỰC TẾ
Người dùng phản ánh:
- Trên giao diện bài *"Thị Giác Máy Tính"* (492 từ), chế độ **🏆 Học để đạt A+** hiển thị mục tiêu `~11 câu`.
- Khi AI tạo xong, bộ thẻ chỉ có **8 câu**.
- Trong phần `summary`, AI tự viết: *"Bộ thẻ nhớ bao gồm 8 khái niệm cốt lõi về thị giác máy tính..."*.

**Nguyên nhân gốc rễ:**
1. **Autoregressive Bias trong Summary:** LLM sinh chuỗi `summary` trước mảng `flashcards`. Do bài 492 từ có 8 tiêu đề lớn, AI viết *"bao gồm 8 khái niệm cốt lõi"* trong summary, dẫn đến context của chính nó tự ép mảng `flashcards` chỉ được dừng lại ở 8 phần tử để khớp với câu mở đầu.
2. **Thiếu Khung Phân Rã 3 Lớp (Deconstruction Framework):** Prompt trước đây chỉ đưa ra con số định lượng 11 mà không hướng dẫn AI kỹ thuật đào sâu (chia nhỏ quy trình, so sánh, đặt câu hỏi tình huống thực tế). AI không biết lấy đâu ra thêm 3 ý nếu chỉ nhìn bề mặt văn bản.
3. **Thiếu Vòng Lặp Kiểm Đếm & Bù Câu Tự Động (Auto Top-up):** Hệ thống nhận kết quả từ AI xong là lưu thẳng, không có bước hậu kiểm và bù câu nếu AI trả thiếu.

---

## 2. GIẢI PHÁP KỸ THUẬT TRIỂN KHAI

### 2.1. Khung Phân Rã 3 Lớp (3-Layer Deconstruction) trong Prompt
Áp dụng cho cả Client Direct Call (`index.html`) và Server Endpoint (`api/ai/explain.js`):
- **Cấm AI ghi số đếm vào Summary:** Chỉ thị rõ: *"summary chỉ tóm tắt 1 câu phạm vi chủ đề, TUYỆT ĐỐI KHÔNG ghi số lượng thẻ/câu vào summary để tránh mâu thuẫn"*.
- **Phân bổ chỉ tiêu cho 3 lớp kiến thức ở mức Điểm A+ (`mastery`):**
  * **Lớp 1 (3-4 câu):** Khái niệm, vai trò & định nghĩa đóng khung.
  * **Lớp 2 (4-5 câu):** Phân rã chi tiết từng bước quy trình, nguyên lý hoạt động & so sánh.
  * **Lớp 3 (3-4 câu):** Câu hỏi tình huống thực tế, trường hợp ngoại lệ, thách thức kỹ thuật & bẫy đề dễ nhầm lẫn.
- Với chỉ dẫn 3 lớp này, AI luôn có cấu trúc tư duy rõ ràng để khai thác từ 11 đến 15 câu chất lượng cao trên bất kỳ bài học nào.

### 2.2. Cơ Chế Auto Top-Up (Tự Động Bổ Sung Nếu Thiếu)
Trong hàm `generateSelfTestAiDeck`:
1. Sau khi nhận và parse `quizzes` và `flashcards`:
2. Tính số lượng kỳ vọng mục tiêu $N_{target}$.
3. Nếu $N_{actual} < N_{target} - 1$ (thiếu từ 2 câu trở lên):
   - Cập nhật trạng thái tải: `[2.5/3] Đang bóc tách thêm X câu hỏi chuyên sâu & tình huống để đạt 100% chuẩn Điểm A+...`
   - Gọi một lượt bổ sung siêu nhẹ (Top-up shot):
     * Gửi danh sách các câu đã có (để tránh trùng lặp).
     * Yêu cầu AI tạo đúng $N_{target} - N_{actual}$ câu/thẻ còn thiếu thuộc Lớp 3 (tình huống thực tế / bẫy đề nâng cao).
   - Gộp các câu mới vào mảng chính.
4. Đảm bảo người dùng luôn nhận đủ số lượng đã hứa (100% Match).

---

## 3. KẾ HOẠCH TRIỂN KHAI (BUILDER CHECKLIST)
- [ ] Cập nhật Prompt phân rã 3 lớp và chống bias summary trong `index.html`.
- [ ] Xây dựng hàm `topUpMissingSelfTestItems()` tự động bổ sung câu thiếu trong `index.html`.
- [ ] Cập nhật Prompt và chỉ tiêu 3 lớp trong `api/ai/explain.js`.
- [ ] Kiểm thử cú pháp toàn diện qua `scripts/check_syntax.py`.
- [ ] Cập nhật `changelog.js`, chạy `sync_version.py` nâng lên `v5.8.76`, commit Git và sao lưu Google Drive.
