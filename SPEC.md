# SPEC.md — Đặc Tả Kỹ Thuật: Sửa Lỗi "actualWordCount is not defined" trong Modal Tự Kiểm Tra AI (v5.8.66)

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)
- **Triệu chứng**:
  * Khi người dùng mở Modal "Tạo bài Tự kiểm tra bằng AI" và bấm bắt đầu tạo bài mà không thiết lập `customGeminiApiKey` (sử dụng API máy chủ mặc định của Thư viện HTML trên production `https://thuvienhtml.vercel.app/`), hệ thống báo lỗi toast đỏ:
    - Chrome / Desktop: `actualWordCount is not defined`
    - Safari / iOS: `Can't find variable: actualWordCount`
- **Nguyên nhân kỹ thuật**:
  * Trong hàm [`generateSelfTestAiDeck(lessonIds, config)`](file:///C:/Users/PV/.gemini/antigravity/scratch/thuvienhtml/index.html#L39466), biến `actualWordCount` được khai báo bằng `const actualWordCount = ...` bên trong khối `if (customKey) { ... }` (dành cho người dùng dùng API Key cá nhân).
  * Khi người dùng không có `customKey`, luồng rẽ vào khối `else { ... }` (gọi server proxy `/api/ai/explain`).
  * Trong payload `JSON.stringify`, thuộc tính `wordCount: actualWordCount` cố gắng truy xuất `actualWordCount` vốn chỉ nằm trong block-scope của `if (customKey)`.
  * Trình duyệt lập tức ném ra ngoại lệ `ReferenceError: actualWordCount is not defined` trước khi request mạng được gửi đi, kích hoạt catch block và hiển thị toast đỏ.

---

## 2. PHƯƠNG ÁN XỬ LÝ 3 TẦNG (ARCHITECTURE SOLUTION)
1. **Tầng 1: Đưa khai báo lên Scope hàm chung (Outer Scope Hoisting)**:
   - Di chuyển toàn bộ việc tính toán:
     * `actualWordCount`
     * `lessonN`
     * `isAuto`
     * `expected = calculateSelfTestExpectedCounts(actualWordCount, lessonN, config.testType)`
     * `coverageDirect`
     * `countInstruction`
     lên ngay sau khi trích xuất `fullDistilledText`, trước khối rẽ nhánh `if (customKey)`.
2. **Tầng 2: Phòng vệ đa tầng (Defensive Guarding)**:
   - Trong `body: JSON.stringify`: truyền `wordCount: (typeof actualWordCount === 'number' && actualWordCount > 0) ? actualWordCount : 500`.
   - Đảm bảo `actualWordCount` luôn là một số nguyên dương hợp lệ (`Math.max(50, ...)`).
3. **Tầng 3: Kiểm thử toàn diện & Tính năng đồng bộ**:
   - Kiểm tra cả 2 luồng: Luồng 1 (Custom Gemini API Key) và Luồng 2 (Server Proxy `/api/ai/explain`).
   - Đảm bảo số lượng câu trắc nghiệm / flashcard tự động đề xuất theo số từ hoạt động hoàn hảo và chính xác trên cả 2 luồng.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] 1. Khai báo `actualWordCount` nằm ở phạm vi hàm `generateSelfTestAiDeck`, sẵn sàng cho cả luồng `customKey` và luồng server proxy.
- [x] 2. Không còn bất kỳ lỗi `ReferenceError: actualWordCount is not defined` hay `Can't find variable: actualWordCount` nào xuất hiện.
- [x] 3. Payload gửi đến `/api/ai/explain` có trường `wordCount` chính xác với số từ thực tế của các bài học.
- [x] 4. Bộ kiểm tra cú pháp Node.js (`scripts/check_syntax.py`) vượt qua 100% không có lỗi.
- [x] 5. Đồng bộ phiên bản v5.8.66 trên toàn bộ hệ thống (`scripts/sync_version.py`).
