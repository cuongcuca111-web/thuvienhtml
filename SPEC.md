# SPEC.md — Hệ Thống Dual-Mode AI Flashcard & Quiz Generator (v5.8.74)

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH
Người dùng yêu cầu phân tách bộ chọn số lượng câu hỏi hiện tại thành **2 Chế độ (Dual-Mode)** rõ ràng:
1. **Tab 1: 🎯 Chế độ AI (Theo mục tiêu học tập)**:
   - ⚡ **Học sơ qua để thi** (Cramming / Skim for Exam): Trích xuất ý chính, định nghĩa đóng khung, công thức cốt lõi. Câu hỏi ngắn, trực diện.
   - 🧠 **Học để hiểu** (Deep Understanding): Phủ đều các phần lớn của bài, tập trung câu hỏi bản chất, cơ chế, nguyên lý, so sánh A vs B.
   - 🏆 **Học để đạt điểm A+** (Mastery / A+ Grade): Quét vét cạn 100% ngóc ngách, chi tiết phụ, ngoại lệ, tình huống thực tế và bẫy đề (distractors sát sao).
2. **Tab 2: 📊 Theo số chữ bài học**:
   - Tự động đo số chữ thực tế của các bài học được chọn và hiển thị thanh trạng thái trực quan.
   - Tự động co giãn 3 mốc số lượng đề xuất động (Nhanh • Chuẩn [Khuyên dùng] • Chi tiết) khớp chính xác với dung lượng của bài học.

---

## 2. THIẾT KẾ KIẾN TRÚC & GIAO DIỆN

### 2.1. Cấu trúc Giao diện (UI) trong Modal Tạo Tự Kiểm Tra
Khu vực cấu hình câu hỏi được chia làm 2 phần:
```html
<!-- Bộ chuyển đổi 2 Tab chế độ -->
<div class="flex items-center p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl">
  <button id="btnTabModeAiGoal" class="...">🎯 Chế độ AI (Theo mục tiêu)</button>
  <button id="btnTabModeWordCount" class="...">📊 Theo số chữ bài học</button>
</div>

<!-- Nội dung Tab 1: 3 Thẻ Mục Tiêu AI -->
<div id="selfTestAiGoalPanel" class="grid grid-cols-3 gap-2">
  - Nút 1: ⚡ Học sơ qua để thi (Badge ước tính câu)
  - Nút 2: 🧠 Học để hiểu (Badge ước tính câu)
  - Nút 3: 🏆 Học để đạt điểm A+ (Badge ước tính câu)
</div>

<!-- Nội dung Tab 2: Đo Dung Lượng & 3 Mốc Co Giãn -->
<div id="selfTestWordCountPanel" class="hidden flex flex-col gap-2">
  - Badge dung lượng: 📄 Bài học gồm W từ (~M phút đọc) • Khuyên dùng: K câu
  - 3 Mốc động: [Nhanh] • [✨ Chuẩn - Đề xuất] • [Chi tiết]
</div>

<!-- Hint Box động giải thích trực quan thời gian thực -->
<div id="selfTestCountHintBox">...</div>
```

### 2.2. Thuật toán Tính toán & Co giãn Số lượng (`calculateSelfTestExpectedCounts`)
* Nhận đầu vào: `totalWords` ($W$), `lessonCount` ($n$), `testType` (mixed/quiz/flashcard), `mode` (ai_goal/word_count), `goal` (cram/understand/mastery).
* **Mốc chuẩn cơ sở ($N_{base}$):**
  - Flashcard: $N_{base} = \text{clamp}(5, 3 + \text{round}(W / 110), 25)$
  - Quiz: $N_{base} = \text{clamp}(5, 3 + \text{round}(W / 125), 25)$
  - Mixed: $N_{base} = \text{clamp}(6, 4 + \text{round}(W / 135), 30)$
* **Hệ số Mục tiêu AI:**
  - `cram`: Hệ số $\times 0.6$ (tối thiểu 4-5 câu, tối đa 10 câu).
  - `understand`: Hệ số $\times 1.0$ (tối thiểu 6-8 câu, tối đa 16 câu).
  - `mastery`: Hệ số $\times 1.5$ (tối thiểu 10-14 câu, tối đa 26 câu).
* **3 Mốc Tab Số Chữ:**
  - Phân tích theo dung lượng $W < 500$, $500 \le W < 1500$, $1500 \le W < 3000$, $W \ge 3000$ để tự động điền nhãn nút.

### 2.3. Tối ưu Prompt & Token cho AI (Client & Server)
* Truyền `goal` và `countMode` vào payload request (`index.html` direct call & `/api/ai/explain`).
* Bổ sung quy tắc sư phạm phân tầng theo thang nhận thức Bloom vào System Prompt:
  - `cram`: "Chỉ nhặt định nghĩa đóng khung, ý chính cốt lõi nhất. Câu hỏi ngắn gọn trực diện."
  - `understand`: "Phủ đều các mục lớn của bài. Hỏi về cơ chế, bản chất, nguyên nhân - kết quả."
  - `mastery`: "Quét vét cạn 100% ngóc ngách, chi tiết phụ, ngoại lệ và bẫy đề."
* Tự động nâng `maxOutputTokens` lên `8192` khi chọn `mastery` hoặc $N > 15$ để tránh cắt cụt JSON.

---

## 3. KẾ HOẠCH TRIỂN KHAI (BUILDER CHECKLIST)
1. Cập nhật HTML Modal Tạo Bộ Đề trong `index.html`: Thêm 2 Tab chuyển đổi và 2 panel tương ứng.
2. Nâng cấp JavaScript điều khiển trong `index.html`:
   - State `selfTestCountMode` ('ai_goal' | 'word_count'), `selfTestAiGoal` ('cram' | 'understand' | 'mastery').
   - Mở rộng hàm `calculateSelfTestExpectedCounts`.
   - Cập nhật hàm `updateSelfTestExpectedCountUI` phản hồi realtime theo từ và bài học được chọn.
   - Đồng bộ trong hàm `generateSelfTestDeck` (truyền `goal`, `countMode`, phân phối section).
3. Nâng cấp `api/ai/explain.js`: Xử lý `goal` (`cram`, `understand`, `mastery`), phân phối số câu và cấu hình token tối ưu.
4. Kiểm thử cú pháp Node.js 100% PASS qua `scripts/check_syntax.py`.
5. Cập nhật `changelog.js`, chạy `sync_version.py` nâng lên `v5.8.74`, commit Git & backup Google Drive.
