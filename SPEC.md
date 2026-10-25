# SPEC.md — Đặc tả Kỹ thuật: Phân bổ Số lượng Câu hỏi AI Linh hoạt theo Số lượng Chữ (Word Count) & Số Bài học

## 1. Mục tiêu Cốt lõi
- **Vấn đề cần giải quyết:** Hiện tại số lượng câu hỏi/thẻ nhớ AI đề xuất đang bị "cứng" theo số lượng file (ví dụ chọn 1 file thì dù bài chỉ có 100 chữ hay bài dài 5,000 chữ thì vẫn chỉ đề xuất cố định 8 câu; chọn 2 file thì dù ngắn hay dài vẫn là 10 câu).
- **Giải pháp:** Xây dựng cơ chế **phân bổ câu hỏi và thẻ nhớ linh hoạt theo số lượng chữ thực tế (Word Count $W$)** của các bài học được chọn, kết hợp với số lượng bài học $N$:
  * File ngắn (ít chữ, ví dụ 100 - 300 từ): Sinh số lượng gọn gàng (4 - 6 câu), tránh sinh lan man, lặp lại hoặc hallucination.
  * File vừa (bài học chuẩn, ví dụ 800 - 1,500 từ): Sinh 8 - 14 câu bao quát trọng tâm.
  * File dài (chương chuyên sâu, ví dụ 2,500 - 5,000 từ): Sinh 18 - 35 câu đào sâu chi tiết.
  * Nhiều bài học: Tính tổng số từ của các bài được chọn, phân bổ câu hỏi vừa bám theo mật độ kiến thức vừa đảm bảo mọi bài học đều có câu hỏi đại diện.
- **Trải nghiệm người dùng (UX):**
  * Giao diện cập nhật thời gian thực (0ms lag): Hiển thị số lượng dự kiến đi kèm tổng số từ thực tế, ví dụ: `💡 AI đề xuất dự kiến: ~14 thẻ flashcard (~1,250 từ, phân bổ đều cho 1 bài học đã chọn).`
  * Nút "Tự động (AI đề xuất)" phản hồi ngay tức thì theo số từ của bài đang đọc hoặc tổ hợp bài được chọn.

---

## 2. Công thức Toán học Phân bổ theo Số lượng Chữ ($W$) và Số Bài ($N$)

Gọi:
- $W$ là tổng số từ (word count) của tất cả các bài học được chọn ($W \ge 50$).
- $N$ là số lượng bài học được chọn ($N = \text{selfTestSelectedLessonIds.size} \ge 1$).

### 2.1. Dạng Thẻ nhớ Flashcard (`testType === 'flashcard'`)
- Mật độ kiến thức: 1 thẻ nhớ tối ưu cho khoảng 95 từ.
- Công thức:
  $$C_{\text{words}} = \text{round}\left(3 + \frac{W}{95}\right)$$
- Ràng buộc sàn tối thiểu theo số bài:
  $$C_{\text{min}} = \max(5, N \times 2)$$
- Số thẻ flashcard cuối cùng:
  $$C = \min(35, \max(C_{\text{min}}, C_{\text{words}}))$$
- *Bảng tham chiếu thực tế:*
  * $N=1, W=150$ từ $\implies C = 5$ thẻ (không còn bị ép 8 thẻ khi bài quá ngắn).
  * $N=1, W=500$ từ $\implies C = 8$ thẻ.
  * $N=1, W=1,000$ từ $\implies C = 14$ thẻ (thay vì 8 thẻ cứng).
  * $N=1, W=2,500$ từ $\implies C = 29$ thẻ (bài dài nhiều kiến thức được khai thác sâu).
  * $N=6, W=3,500$ từ $\implies C = 35$ thẻ (~6 thẻ/bài).

### 2.2. Dạng Trắc nghiệm 4 Đáp án (`testType === 'quiz'`)
- Mật độ kiến thức: 1 câu hỏi trắc nghiệm chất lượng (kèm 4 lựa chọn và giải thích chi tiết) tối ưu cho khoảng 115 từ.
- Công thức:
  $$Q_{\text{words}} = \text{round}\left(3 + \frac{W}{115}\right)$$
- Ràng buộc sàn tối thiểu theo số bài:
  $$Q_{\text{min}} = \max(5, N \times 2)$$
- Số câu trắc nghiệm cuối cùng:
  $$Q = \min(35, \max(Q_{\text{min}}, Q_{\text{words}}))$$
- *Bảng tham chiếu thực tế:*
  * $N=1, W=150$ từ $\implies Q = 5$ câu.
  * $N=1, W=500$ từ $\implies Q = 7$ câu.
  * $N=1, W=1,200$ từ $\implies Q = 13$ câu.
  * $N=1, W=2,500$ từ $\implies Q = 25$ câu.
  * $N=6, W=3,500$ từ $\implies Q = 33$ câu (~5.5 câu/bài).

### 2.3. Dạng Kết hợp: Trắc nghiệm + Thẻ nhớ (`testType === 'mixed'`)
- Mật độ kiến thức tổng hợp:
  $$T_{\text{words}} = \text{round}\left(4 + \frac{W}{130}\right)$$
- Ràng buộc sàn tối thiểu theo số bài:
  $$T_{\text{min}} = \max(6, N \times 3)$$
- Tổng số mục ($T$):
  $$T = \min(40, \max(T_{\text{min}}, T_{\text{words}}))$$
- Phân bổ câu trắc nghiệm và thẻ nhớ:
  $$Q = \text{round}(T / 2)$$
  $$F = T - Q$$
- *Bảng tham chiếu thực tế:*
  * $N=1, W=150$ từ $\implies T = 6$ câu (3 trắc nghiệm + 3 thẻ nhớ).
  * $N=1, W=600$ từ $\implies T = 9 \implies 10$ câu (5 trắc nghiệm + 5 thẻ nhớ).
  * $N=1, W=1,200$ từ $\implies T = 13$ câu (7 trắc nghiệm + 6 thẻ nhớ).
  * $N=1, W=2,500$ từ $\implies T = 23$ câu (12 trắc nghiệm + 11 thẻ nhớ).
  * $N=6, W=3,500$ từ $\implies T = 31$ câu (16 trắc nghiệm + 15 thẻ nhớ).

---

## 3. Kiến trúc File & Logic Triển khai

### 3.1. File `api/ai/explain.js`
- Tiếp nhận tham số `wordCount` (tổng số từ văn bản do client gửi lên hoặc tính từ `rawText`):
  `const totalWords = Math.max(50, parseInt(body.wordCount, 10) || (rawText.trim().split(/\s+/).filter(Boolean).length));`
- Áp dụng các công thức tính toán $C, Q, T$ linh hoạt theo $totalWords$ và $lessonCount$.
- Cung cấp mô tả số lượng câu và số từ cụ thể trong `systemPrompt` và `userPrompt`:
  Ví dụ: `TỰ ĐỘNG THEO DUNG LƯỢNG TÀI LIỆU (${totalWords} từ, ${lessonCount} bài học): ĐÚNG ${autoSingleCount} thẻ flashcard...`

### 3.2. File `index.html`
- **Bộ đệm số từ (`lessonWordCountCache`):**
  Lưu `Map<lessonId, number>` để đếm số từ của từng bài học 1 lần duy nhất từ bộ nhớ `htmlContent`, iframe hoặc `IndexedDB`.
- **Hàm `calculateSelfTestExpectedCounts(wordCount, lessonCount, testType)`:**
  Tính toán thống nhất theo đúng công thức ở Mục 2.
- **Hàm `updateSelfTestExpectedCountUI()`:**
  - Lấy tổng số từ thực tế của các bài học đã chọn.
  - Cập nhật badge trên nút "Tự động": `(~X câu)`.
  - Cập nhật hộp chú thích `#selfTestCountHintText` hiển thị rõ số từ:
    *`💡 AI đề xuất dự kiến: ~X câu (~Y từ, phân bổ đều cho Z bài học đã chọn).`*
- **Hàm `generateSelfTestAiDeck()`:**
  - Tính chính xác `actualWordCount` từ `fullDistilledText`.
  - Truyền `wordCount: actualWordCount` vào payload gọi API `/api/ai/explain` và direct Gemini API.

---

## 4. Acceptance Criteria (Tiêu chuẩn Nghiệm thu QA)
- [ ] 1. Khi chọn 1 file ít chữ (< 300 từ), số lượng câu/thẻ tự động đề xuất giảm xuống (4 - 6 câu), không bị kẹt cứng ở 8 hay 10 câu.
- [ ] 2. Khi chọn 1 file dài (> 1,500 từ), số lượng câu/thẻ tự động tăng lên tương ứng (15 - 30 câu), khai thác sâu và bao quát kiến thức.
- [ ] 3. Hộp chú thích trực quan hiển thị cụ thể số từ của các bài được chọn (~X từ).
- [ ] 4. Khi chọn nhiều bài học, hệ thống tính tổng số từ của các bài được chọn kết hợp phân bổ đồng đều cho từng bài.
- [ ] 5. Logic tính toán giữa Client (`index.html`) và Server (`api/ai/explain.js`) đồng bộ 100%.
- [ ] 6. Vượt qua kiểm tra cú pháp node syntax check (`check_syntax.py`).
- [ ] 7. Đồng bộ phiên bản `v5.8.60`.
