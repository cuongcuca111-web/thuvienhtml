# SPEC.md — Đặc Tả Kỹ Thuật: Đồng Bộ Số Lượng AI Dự Đoán & Nâng Cấp Thanh Điều Khiển Flashcard Toàn Diện (v5.8.67)

## 1. TỔNG QUAN YÊU CẦU & NGUYÊN NHÂN GỐC RỄ
1. **Lỗi lệch số lượng dự đoán vs số lượng thực tế AI tạo ra**:
   - *Triệu chứng*: Trong modal "Tạo bài Tự kiểm tra bằng AI", hệ thống hiển thị: `💡 AI đề xuất dự kiến: ~10 thẻ flashcard (~668 từ...)`. Nhưng khi AI tạo xong chỉ có **7 thẻ nhớ**.
   - *Nguyên nhân kỹ thuật*:
     * Giao diện modal tính số từ dựa trên toàn văn bài học ban đầu (`getLessonWordCount(les)` $\to$ 668 từ $\to$ tính ra 10 thẻ).
     * Khi bắt đầu tạo (`generateSelfTestAiDeck`), nội dung bài học được chắt lọc qua hàm `extractDistilledLessonText` để tối ưu token, khiến văn bản gửi đi chỉ còn ~350 từ.
     * Code hàm tạo deck lại lấy độ dài của văn bản chắt lọc (`rawWordsFromSnippet` ~380 từ) để tính lại `expected` và truyền vào prompt/server proxy (`expected.flashcards = 7` thay vì 10).
     * Do đó, AI nhận lệnh tạo 7 thẻ và trả về đúng 7 thẻ, dẫn đến lệch so với con số 10 thẻ mà modal đã hứa với người dùng.
   - *Yêu cầu bổ sung*: "Thêm cơ chế đợi để AI dự đoán chính xác" — Khi nạp bài học chưa có trong cache, phải có trạng thái chờ (Loading state / Spinner / Disabled button) để tính toán chính xác 100% dung lượng thực tế trước khi cho phép bấm tạo, không đưa ra con số ước lượng tạm bợ.

2. **Khôi phục nút "Chưa nhớ", "Đã nhớ" & Bổ sung các nút quan trọng trên Desktop (Ảnh 3)**:
   - *Triệu chứng*: Khi xem thẻ Flashcard ở mặt trước (Câu hỏi), trên desktop chỉ có duy nhất 1 nút `[🔄 Lật xem đáp án (Phím cách)]`. Hai nút quen thuộc "Chưa nhớ" và "Đã nhớ" trước đây đã bị ẩn vào `class="hidden"`.
   - *Giải pháp*:
     * Khôi phục ngay ở mặt trước 3 nút điều khiển chính:
       - `[❌ Chưa nhớ (Phím 1)]`: Đánh dấu chưa nhớ ngay lập tức, xếp vào hàng đợi ôn lại.
       - `[🔄 Lật đáp án (Phím Space)]`: Nút to ở giữa để lật xem mặt sau.
       - `[✅ Đã nhớ (Phím 3)]`: Đánh dấu đã nhớ ngay lập tức, chuyển sang thẻ tiếp theo.
     * Bổ sung thanh công cụ chuyên nghiệp (Secondary Action Toolbar) gồm các tính năng tối quan trọng:
       - 🔊 **Phát âm / Đọc to (TTS - Text to Speech)**: Đọc to câu hỏi/đáp án qua Web Speech API (hỗ trợ phím tắt `A`).
       - ⭐ **Đánh dấu sao (Star / Thẻ trọng tâm)**: Gắn sao trực tiếp ngay trên thẻ (hỗ trợ phím tắt `S`).
       - ◀ **Thẻ trước (Prev)** & **Thẻ sau ▶ (Next)**: Điều hướng tới/lùi giữa các thẻ bằng chuột không cần nộp điểm.
       - 🔀 **Xáo trộn thẻ (Shuffle)**: Đảo lộn ngẫu nhiên thứ tự ôn tập.
       - 🔄 **Đảo 2 mặt (Swap Front/Back)**: Học ngược từ đáp án $\to$ câu hỏi.
       - ⌨️ **Trợ giúp phím tắt**: Modal / Tooltip hiển thị bảng phím tắt tiện lợi.

---

## 2. KIẾN TRÚC TRIỂN KHAI CHI TIẾT (ARCHITECTURE)

### 2.1. Đồng bộ số từ và cơ chế đợi dự đoán:
- **Cơ chế đợi (Async Analyzing State)**:
  * Khi mở modal hoặc đổi bài học: nếu có bài chưa có trong `lessonWordCountCache`:
    - Hiển thị badge: `(Đang tính...)`.
    - Hiển thị hint: `<svg animate-spin ...></svg> Đang đọc nội dung & phân tích dung lượng tối ưu...`.
    - Disable nút: `btnStartGenerateSelfTest.disabled = true` với hiệu ứng `opacity-75 cursor-not-allowed`.
    - Gọi nạp ngầm từ IndexedDB: `await Promise.all(missingLessons.map(l => getLessonWordCount(l)))`.
    - Khi xong: cập nhật số từ chính xác, hiển thị số câu/thẻ chính xác, mở lại nút `disabled = false`.
- **Đồng bộ hóa 100% Word Count**:
  * Trong `generateSelfTestAiDeck`: dùng đúng `totalWords` đã được tính từ toàn bộ bài học (hoặc `lessonWordCountCache`), đảm bảo con số truyền vào prompt (`expected.flashcards = 10`) trùng khớp 100% với con số đã hiển thị cho người dùng.
  * Bổ sung chỉ dẫn nghiêm ngặt trong Prompt (cả Direct Gemini và Server Proxy):
    `BẮT BUỘC biên soạn ĐỦ ĐÚNG ${count} thẻ flashcard (không được ít hơn hoặc nhiều hơn, mảng flashcards phải có đúng ${count} phần tử).`

### 2.2. Giao diện điều khiển Flashcard công thái học:
- **Khối `#fcUnflippedControls`**:
  * Hàng nút chính: `[Chưa nhớ]` + `[Lật đáp án (Space)]` + `[Đã nhớ]`.
  * Hàng công cụ phụ (Toolbar): `[◀ Trước]` | `[🔊 Đọc]` | `[⭐ Gắn sao]` | `[🔀 Xáo]` | `[🔄 Đảo mặt]` | `[Tiếp ▶]` | `[⌨️ Phím tắt]`.
- **Khối `#fcFlippedControls`**:
  * 4 nút SM-2 khoa học: `[🔴 Lại (1d)]`, `[🟡 Khó (3d)]`, `[🟢 Tốt (6d)]`, `[🔵 Dễ (10d+)]`.
  * Nút phụ: `[Lật về mặt câu hỏi]` và cùng thanh công cụ hỗ trợ `[◀] [🔊] [⭐] [🔀] [🔄] [▶]`.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] 1. Khi mở modal tạo tự kiểm tra AI, có cơ chế đợi (spinner + disable nút tạo) nếu bài chưa nạp xong số từ từ IndexedDB.
- [x] 2. Số lượng câu hỏi/thẻ nhớ dự kiến trong hint box và badge trùng khớp 100% với số lượng thực tế AI tạo ra.
- [x] 3. Thẻ Flashcard trên Desktop hiển thị rõ ràng 2 nút "Chưa nhớ" và "Đã nhớ" ngay ở mặt trước.
- [x] 4. Bổ sung đầy đủ các nút quan trọng: Đọc to phát âm (TTS), Đánh dấu sao, Điều hướng Trước/Sau, Xáo trộn thẻ, Đảo mặt thẻ, Hướng dẫn phím tắt.
- [x] 5. Toàn bộ phím tắt (`1`, `2`, `3`, `4`, `Space`, `Enter`, `←`, `→`, `A`, `S`) hoạt động mượt mà.
- [x] 6. Kiểm tra cú pháp Node.js đạt 100% OK và đồng bộ phiên bản v5.8.67.
