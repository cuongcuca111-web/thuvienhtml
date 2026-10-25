# SPEC.md — Đặc Tả Kỹ Thuật: Thiết Lập Vị Trí Tải File Mặc Định Là Ở "Phần Ngoài" (Không Trong Thư Mục Nào) (v5.8.71)

## 1. YÊU CẦU & BỐI CẢNH
- **Yêu cầu người dùng**:
  * Khi mở modal tải file ("Thêm bài học vào thư viện" - Ảnh 1), vị trí lưu mặc định tại ô *"Lưu vào mục:"* phải là ở **phần ngoài (phần không có trong thư mục nào cả)**.
- **Phân tích hiện trạng**:
  * Trong [`index.html`](file:///C:/Users/PV/.gemini/antigravity/scratch/thuvienhtml/index.html) tại hàm `populateUploadCategoriesDropdown()` (dòng 28008), ô chọn `#uploadTargetCategorySelect` hiện chỉ nạp danh sách các thư mục hiện có và tự động chọn thư mục đầu tiên (`categories[0].id`) hoặc `state.activeCategoryId`.
  * Không có tùy chọn riêng cho "Phần ngoài (Không trong thư mục nào)" trong dropdown tải file.
  * Khi lưu bài học trong `btnConfirmUpload` (dòng 29638), nếu `targetCatId` rỗng thì hệ thống tự động gán vào thư mục đầu tiên hoặc tự tạo mục mới "Tài liệu của tôi", thay vì lưu độc lập ở phần ngoài thư mục (`categoryId: null`).

---

## 2. GIẢI PHÁP THIẾT KẾ & TRIỂN KHAI (ARCHITECTURE & DESIGN)
1. **Bổ sung tùy chọn "Phần ngoài (Không trong thư mục nào)" vào dropdown `#uploadTargetCategorySelect`**:
   - Giá trị quy ước: `value="__uncategorized__"`.
   - Vị trí: Đặt ở **đầu tiên** trong danh sách dropdown và được đánh dấu `selected` làm mặc định khi mở modal tải file.
   - Nhãn hiển thị: `Phần ngoài (Không trong thư mục nào)`.
2. **Cập nhật hàm `populateUploadCategoriesDropdown(preferredCatId = '__uncategorized__')`**:
   - Tham số `preferredCatId` mặc định là `'__uncategorized__'`.
   - Nếu người dùng bấm "Tải file" từ chân sidebar (`#btnSidebarQuickUpload`) hoặc header, modal tải file luôn tự động chọn "Phần ngoài".
   - Nếu người dùng chủ động bấm "Thêm bài vào mục này" từ menu của một thư mục cụ thể, hệ thống sẽ chọn đúng thư mục đó.
3. **Cập nhật luồng xử lý lưu bài học (`btnConfirmUpload`)**:
   - Nếu `targetCatId === '__uncategorized__'` hoặc không chọn mục:
     * Đặt `targetCatId = null;`
     * Tiêu đề mục thông báo: `catTitle = 'Phần ngoài'`.
     * Từng bài học mới sẽ được tạo với thuộc tính `categoryId: null`.
     * Không tự động ép tạo thư mục "Tài liệu của tôi" khi người dùng cố ý lưu ở phần ngoài.
   - Khi hoàn tất tải file:
     * Kích hoạt mở tự động nhóm `__uncategorized__` trong sidebar: `setSectionOpen('__uncategorized__', true)`.
     * Thông báo toast: `Đã thêm X bài vào Phần ngoài!`.
     * Bài học mới hiển thị ngay lập tức ở khu vực "Phần ngoài (Chưa phân loại)" trên sidebar và tự động cuộn đến highlight.
4. **Đồng bộ nhãn hiển thị trong Sidebar**:
   - Cập nhật nhãn nhóm chưa phân loại trên thanh mục lục thành: `Phần ngoài (Chưa phân loại)` để người dùng nhận diện ngay lập tức nơi lưu bài.

---

## 3. KẾ HOẠCH KIỂM THỬ & NGHIỆM THU (QA CRITERIA)
1. Bấm nút "Tải file" ở chân sidebar (Ảnh 2) hoặc trên header.
2. Kiểm tra ô *"Lưu vào mục:"* trên modal "Thêm bài học vào thư viện" (Ảnh 1): Mặc định hiển thị và chọn sẵn **"Phần ngoài (Không trong thư mục nào)"**.
3. Thử tải một file HTML/Markdown bất kỳ và bấm "Lưu bài học":
   - Bài học được lưu với `categoryId: null`.
   - Sidebar xuất hiện nhóm "Phần ngoài (Chưa phân loại)" chứa bài vừa tải, không bị rơi vào bất kỳ thư mục nào trong 5 nhóm hiện có.
4. Kiểm thử cú pháp Node.js trên toàn bộ script (`check_syntax.py`).
5. Ghi nhận `changelog.js`, đồng bộ phiên bản `v5.8.71`, commit và đẩy Git.
