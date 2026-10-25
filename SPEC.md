# SPEC.md — Đặc tả Kỹ thuật: Hiệu ứng Hoàn thành Bài kiểm tra & Chặn Autofill Form Rác

## 1. Mục tiêu Cốt lõi
- **Mục tiêu 1:** Nâng cấp hiệu ứng chuyển cảnh (transition) và animation khi hoàn thành bài kiểm tra (Quiz) và phiên ôn thẻ nhớ (Flashcards) theo chuẩn `/thietkeweb` (Trụ cột 3 & Trụ cột 5): Mượt mà 60 FPS GPU Compositor, chuyển đổi dịu mắt từ câu hỏi sang màn hình kết quả, icon Checkmark nảy nhẹ (Subtle Spring Pop-in) kèm hào quang pulse ring, các khối text và nút xuất hiện tuần tự (Staggered Fade-in-up), và bắn chùm hạt ngọc thanh lịch (Micro-confetti).
- **Mục tiêu 2:** Khắc phục triệt để lỗi trình duyệt tự động điền (autofill) tên tài khoản vào ô "Tìm nhanh bài học theo tên..." và mật khẩu vào ô "Tùy chọn: Nhập Google Gemini API Key cá nhân" trong modal `selfTestConfigModal` (Ảnh 2 & 3).

---

## 2. Design Tokens
- **Bảng màu (Colors):**
  - Indigo Brand: `#4F46E5` (light), `#6366F1` (hover), `#312E81` (dark bg).
  - Emerald Success: `#10B981` (light), `#059669` (dark text), `rgba(16, 185, 129, 0.12)` (glow / ring).
  - Surface Background: Light `#FAF9F5` / `#FFFFFF`, Dark `#12151B` / `#161A20`.
  - Border Lines: Light `#E7E5DF`, Dark `#262C36`.
  - Text: Light `#1C1917`, Subtle `#57534E`, Dark `#EDECE8`, Subtle `#9AA3B2`.
- **Typography:**
  - Font-serif cho tiêu đề ("Hoàn thành bài kiểm tra!").
  - Font-sans cho điểm số, huy hiệu và nhãn nút bấm.
  - Font-mono cho khóa API Key.
- **Timing & Curves (Trụ cột 3):**
  - Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out tự nhiên).
  - Duration: `260ms` cho view crossfade, `400ms` cho checkmark spring bounce, stagger step `60ms`.
  - Hỗ trợ đầy đủ `@media (prefers-reduced-motion: reduce)`.

---

## 3. Kiến trúc File & Logic Triển khai

### 3.1. File `styles.css`
- Thêm keyframes và CSS classes:
  - `@keyframes quizSummaryViewEnter`: Fade-in và scale nhẹ nhàng `translateY(12px) scale(0.98) -> translateY(0) scale(1)`.
  - `@keyframes quizSummaryIconPop`: Pop-in nhẹ nhàng cho icon hoàn thành từ `scale(0.6)` lên `scale(1.08)` về `scale(1)`.
  - `@keyframes quizSummaryPulseRing`: Vòng hào quang xanh/indigo lan tỏa nhẹ quanh icon checkmark.
  - `@keyframes quizSummaryStaggerIn`: Hiệu ứng trượt lên nhẹ `translateY(8px) -> translateY(0)` kết hợp `opacity: 0 -> 1`.
  - `.quiz-summary-stagger-1`, `.quiz-summary-stagger-2`, `.quiz-summary-stagger-3`, `.quiz-summary-stagger-4` với delay so le 60ms, 120ms, 180ms, 240ms.
  - Nút bấm với Subtle Hover Lift (`.quiz-summary-btn-lift`, `.quiz-summary-btn-lift-subtle`).

### 3.2. File `index.html` (Markup & Logic)
- **Hiệu ứng Hoàn thành (Ảnh 1):**
  - Nâng cấp cấu trúc `#quizSummaryView` và `#fcSessionSummaryView`:
    + Thêm wrapper `#quizSummaryIconBox` và `#fcSummaryIconBox` với pulse ring.
    + Thêm các animation classes khi hiển thị.
  - Cập nhật hàm `showQuizSummary()` & `showFlashcardSummary()`:
    + Kích hoạt animation khi chuyển sang summary view bằng reflow reset.
    + Tự động kích hoạt `shootMicroConfetti(iconBox)` sau 160ms.
- **Chặn Autofill Tài khoản & Mật khẩu (Ảnh 2 & 3):**
  - Thêm thẻ mồi nhử ẩn (Decoy inputs) ngay sau header của `#selfTestConfigModal`.
  - Cập nhật `#searchLessonForTestInput`:
    + Chuyển sang `type="search"`.
    + Bổ sung `name="search_lesson_query_no_autofill"`, `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`, `data-lpignore="true"`, `data-1p-ignore="true"`, `data-form-type="other"`.
  - Cập nhật `#customGeminiApiKeyInput`:
    + Bổ sung `name="google_gemini_api_key_field"`, `autocomplete="new-password"`, `data-lpignore="true"`, `data-1p-ignore="true"`, `data-form-type="other"`.
    + Thêm nút Toggle Con mắt `#btnToggleCustomApiKeyVisibility` (Show/Hide API Key) với icon SVG độc bản chuẩn Trụ cột 2.
  - Cập nhật hàm `openSelfTestConfigModal()`:
    + Reset `searchLessonForTestInput.value = ''`.
    + Đọc `savedCustomApiKey = localStorage.getItem('thuvienhtml_custom_gemini_api_key') || ''`.
    + Hàm `purgeAutofillArtifacts` dọn sạch sau 50ms & 180ms để loại trừ hành vi autofill ép buộc từ trình duyệt.

---

## 4. Acceptance Criteria (Tiêu chuẩn Nghiệm thu QA)
- [x] 1. Màn hình hoàn thành bài kiểm tra (`#quizSummaryView`) có transition mượt mà, icon checkmark nảy nhẹ (spring pop-in), các dòng chữ trượt lên nhẹ nhàng so le, không bị giật lag hay snap đột ngột.
- [x] 2. Màn hình hoàn thành bài kiểm tra có hiệu ứng pháo giấy hạt ngọc tinh tế (Micro-confetti) bắn nhẹ nhàng và tự dọn sạch sau 2 giây.
- [x] 3. Nút bấm trong màn hình hoàn thành có hiệu ứng hover nâng nhẹ (Subtle Hover Lift) chuẩn Trụ cột 4.
- [x] 4. Màn hình tổng kết Flashcard (`#fcSessionSummaryView`) cũng được đồng bộ hiệu ứng chuyển cảnh mượt mà.
- [x] 5. Ô "Tìm nhanh bài học theo tên..." trong modal Tạo bài kiểm tra AI KHÔNG CÒN bị trình duyệt tự động điền tên tài khoản / email.
- [x] 6. Ô "Tùy chọn: Nhập Google Gemini API Key cá nhân" KHÔNG CÒN bị trình duyệt tự động điền mật khẩu đăng nhập.
- [x] 7. Ô API Key có nút bấm xem/ẩn (Eye icon) trực quan, chuyển đổi mượt mà giữa dạng ẩn chấm tròn và ký tự thực.
- [x] 8. Toàn bộ mã nguồn vượt qua kiểm tra cú pháp Node.js & HTML (`check_syntax.py`), không có lỗi Console hay biến rác.
- [x] 9. Đã đồng bộ số phiên bản `v5.8.58` trong changelog và các tệp liên quan.

---

## 5. Bug Report (Dành cho QA vòng lặp kiểm thử)
- Không có lỗi nào được ghi nhận. Hệ thống đạt 100% tiêu chí nghiệm thu.
