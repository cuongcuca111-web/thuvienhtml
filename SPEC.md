# SPEC.md — Đặc tả Kỹ thuật: Phân bổ Số lượng Câu hỏi AI theo Số Bài học & Hiển thị Số lượng Dự kiến

## 1. Mục tiêu Cốt lõi
- **Mục tiêu 1 (Fix bug số lượng câu quá ít khi chọn nhiều bài):** Khi người dùng chọn nhiều bài học (ví dụ: 4, 6, 8 bài), số lượng câu hỏi trắc nghiệm và thẻ nhớ tự động do AI đề xuất hiện tại chỉ có 6 câu (quá ít, trung bình mỗi bài chỉ có 1 câu). Cần nâng cấp thuật toán phân bổ thông minh theo số lượng bài học $N$: Mỗi bài học phải được phân bổ ít nhất 2 đến 4 câu hỏi trắc nghiệm và 2 đến 4 thẻ nhớ (với 6 bài học, tổng số lượng sẽ đạt khoảng 20 - 30 câu/thẻ), đảm bảo ôn tập toàn diện kiến thức cho tất cả các bài đã chọn mà không bài nào bị bỏ sót.
- **Mục tiêu 2 (Thêm hiển thị số lượng dự kiến trực quan):** Trên giao diện modal Tạo bài kiểm tra AI (`selfTestConfigModal`), tại tùy chọn "Tự động (AI đề xuất)", hiển thị rõ ràng số lượng câu hỏi và thẻ nhớ dự kiến theo thời gian thực (Real-time Dynamic Reactivity). Số lượng này tự động nhảy số theo số bài học đang chọn và dạng bài đang chọn (Trắc nghiệm + Thẻ nhớ / Chỉ Trắc nghiệm / Chỉ Flashcards).
- **Mục tiêu 3 (Mở rộng Token trần an toàn):** Nâng `optimalMaxTokens` trên máy chủ và `maxOutputTokens` khi gọi API trực tiếp từ 2500 lên 6000 tokens, đảm bảo JSON sinh ra cho 20 - 35 câu hỏi luôn trọn vẹn 100% không bao giờ bị cắt ngắn.

---

## 2. Công thức Tính toán Số lượng Câu hỏi & Thẻ nhớ Thông minh

Gọi $N$ là số lượng bài học được người dùng chọn ($N \ge 1$).

### 2.1. Dạng bài kết hợp: Trắc nghiệm + Thẻ nhớ (`mixed`)
- Số câu trắc nghiệm: $Q = \min(20, \max(5, \text{round}(N \times 2.5)))$
- Số thẻ flashcard: $F = \min(20, \max(5, \text{round}(N \times 2.5)))$
- Tổng số lượng: $T = Q + F$
  - Ví dụ $N = 1$ bài: $Q = 5$, $F = 5 \implies$ Tổng 10 câu/thẻ.
  - Ví dụ $N = 2$ bài: $Q = 6$, $F = 6 \implies$ Tổng 12 câu/thẻ.
  - Ví dụ $N = 4$ bài: $Q = 10$, $F = 10 \implies$ Tổng 20 câu/thẻ.
  - Ví dụ $N = 6$ bài: $Q = 15$, $F = 15 \implies$ Tổng 30 câu/thẻ (mỗi bài ~2.5 câu trắc nghiệm + 2.5 thẻ flashcard!).
  - Ví dụ $N \ge 8$ bài: $Q = 18 - 20$, $F = 18 - 20 \implies$ Tổng 36 - 40 câu/thẻ.

### 2.2. Dạng bài đơn lẻ: Chỉ Trắc nghiệm (`quiz`) hoặc Chỉ Flashcards (`flashcard`)
- Số lượng: $C = \min(35, \max(8, \text{round}(N \times 4.2)))$
  - Ví dụ $N = 1$ bài: 8 - 10 câu/thẻ.
  - Ví dụ $N = 4$ bài: 16 - 18 câu/thẻ.
  - Ví dụ $N = 6$ bài: 24 - 26 câu/thẻ.
  - Ví dụ $N \ge 8$ bài: 30 - 35 câu/thẻ.

---

## 3. Kiến trúc File & Logic Triển khai

### 3.1. File `api/ai/explain.js`
- Đọc `lessonCount` từ client truyền lên hoặc đếm qua `body.lessonTitles.length` / `lessonCount`:
  - `const lessonCount = Math.max(1, parseInt(body.lessonCount, 10) || (Array.isArray(body.lessonTitles) ? body.lessonTitles.length : 1));`
- Áp dụng công thức tính toán $Q, F, C$ tương ứng cho `isAutoCount`.
- Chỉ thị prompt bắt buộc:
  `"TÀI LIỆU GỒM ${lessonCount} BÀI HỌC KHÁC NHAU. BẠN PHẢI BIÊN SOẠN CÂU HỎI VÀ THẺ NHỚ PHÂN BỔ ĐỒNG ĐỀU CHO TẤT CẢ ${lessonCount} BÀI HỌC (mỗi bài học tối thiểu 2-3 câu). TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT BÀI NÀO!"`
- Nâng `optimalMaxTokens = 6000` cho chế độ `self_test`.

### 3.2. File `index.html`
- **Giao diện Modal cấu hình (`selfTestConfigModal`):**
  - Cập nhật nút số lượng "Tự động (AI đề xuất)":
    - Thêm nhãn phụ số lượng dự kiến: `<span id="selfTestAutoCountBadge" class="text-[10px] opacity-80 font-mono">(~... câu)</span>`.
  - Thêm dòng thông tin hỗ trợ trực quan ngay dưới hàng chọn số lượng:
    - `<div id="selfTestCountHint" class="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all">...</div>`
- **Hàm tính toán & cập nhật hiển thị (`updateSelfTestExpectedCountUI`):**
  - Được gọi bất cứ khi nào:
    + Người dùng chọn thêm/bỏ bớt bài học (`selfTestSelectedLessonIds`).
    + Người dùng nhấn "Chỉ bài này", "Chọn tất cả", "Bỏ chọn".
    + Người dùng đổi dạng bài ("Trắc nghiệm + Thẻ nhớ", "Chỉ Trắc nghiệm", "Chỉ Flashcards").
    + Người dùng đổi số lượng (Tự động vs 5 vs 10 vs 15).
  - Tự động hiển thị chi tiết số lượng dự kiến (VD: *"💡 AI đề xuất: ~30 câu (gồm 15 trắc nghiệm + 15 thẻ nhớ, phân bổ đều cho 6 bài học đã chọn)"*).
- **Hàm gọi tạo đề AI (`generateSelfTestAiDeck`):**
  - Truyền `lessonCount: selectedLessons.length` và `expectedCount` tương ứng lên API máy chủ.
  - Khi người dùng có Custom Gemini API Key, prompt trực tiếp cũng được áp dụng công thức số lượng tương tự với `maxOutputTokens = 6000`.

---

## 4. Acceptance Criteria (Tiêu chuẩn Nghiệm thu QA)
- [ ] 1. Khi chọn 6 bài học ở chế độ AI tự động, số lượng câu hỏi/thẻ nhớ dự kiến tăng tương ứng (khoảng 24 - 30 câu/thẻ), không còn bị kẹt ở mức 6 câu ít ỏi.
- [ ] 2. Mỗi bài học trong số các bài đã chọn đều có nội dung câu hỏi/thẻ nhớ tương ứng, không bị AI bỏ sót.
- [ ] 3. Trên modal tạo bài kiểm tra, nút "Tự động (AI đề xuất)" hiển thị số lượng dự kiến tức thì và phản hồi ngay lập tức khi người dùng click chọn thêm/bớt bài học hoặc đổi dạng bài.
- [ ] 4. Dòng ghi chú dự kiến bên dưới giải thích rõ ràng cơ cấu phân bổ (số lượng câu trắc nghiệm, số lượng thẻ flashcard, số bài học).
- [ ] 5. Token trần được nâng lên 6000 tokens, đảm bảo không bao giờ bị cắt cụt JSON khi tạo nhiều câu.
- [ ] 6. Cả 2 luồng gọi AI (Máy chủ `/api/ai/explain` và Trực tiếp bằng Gemini API Key cá nhân) đều được đồng bộ logic số lượng theo số bài học.
- [ ] 7. Toàn bộ mã nguồn vượt qua kiểm tra cú pháp Node.js & HTML (`check_syntax.py`).
- [ ] 8. Đồng bộ số phiên bản `v5.8.59` trên toàn bộ hệ thống.

---

## 5. Bug Report (Dành cho QA vòng lặp kiểm thử)
*(Chưa có lỗi ghi nhận)*
