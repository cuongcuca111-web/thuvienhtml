# SPEC.md — Đặc Tả Kiến Trúc & Tối Ưu Hệ Thống (v5.8.63)

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH
- **Dự án**: Thư Viện Sách HTML PWA (`thuvienhtml.vercel.app`)
- **Phiên bản hiện tại**: `v5.8.63`
- **Mục tiêu thay đổi**:
  1. **Tối ưu hóa hiệu năng & bộ đệm tài nguyên tĩnh P0 (Asset Caching & Performance)**: Giữ vững cấu hình Cache-Control tối ưu trên `vercel.json` cho các tài sản tĩnh (`styles.css`, `bridge.js`, `changelog.js`, fonts, icons).
  2. **Gỡ bỏ hoàn toàn tính năng Mục Lục Tự Động (Auto Table of Contents / Outline Drawer)**:
     - Loại bỏ toàn bộ giao diện Drawer mục lục và nút mở trên thanh công cụ đọc sách (`stickyReaderHeader`).
     - Loại bỏ nút tắt nổi (`#btnFloatingTOC`) và lắng nghe phím tắt `T` / `Esc` liên quan đến TOC.
     - Loại bỏ logic trích xuất tiêu đề trong `bridge.js` (`extractHeadingsTOC`) và các thông điệp `GET_TOC`, `TOC_DATA`, `SCROLL_TO_HEADING`.
     - Loại bỏ Scroll Spy và hiệu ứng CSS `.heading-jump-highlight` nhằm trả lại giao diện đọc bài tối giản, thanh thoát và hiệu năng tối đa.

---

## 2. KIẾN TRÚC KỸ THUẬT & TRẠNG THÁI HỆ THỐNG (v5.8.63)

### 2.1. Cấu hình Cache Tài Nguyên Tĩnh P0 (`vercel.json`):
- Giữ nguyên cấu hình header HTTP bộ đệm:
  ```json
  {
    "source": "/(styles\\.css|bridge\\.js|changelog\\.js)",
    "headers": [
      {
        "key": "Cache-Control",
        "value": "public, max-age=86400, stale-while-revalidate=604800"
      }
    ]
  }
  ```
- Kết hợp với phiên bản tự động `?v=5.8.63` để đảm bảo tải lại siêu tốc từ disk cache nhưng tự động nạp mới ngay khi có bản cập nhật.

### 2.2. Trạng Thái Gỡ Bỏ Mục Lục Tự Động:
- **`bridge.js`**: Đã loại bỏ hoàn toàn các hook trích xuất tiêu đề và listener không cần thiết.
- **`styles.css`**: Đã làm sạch các selector liên quan đến Drawer và phím bấm mục lục.
- **`index.html`**: Đã loại bỏ các phần tử DOM mục lục, thanh cuộn theo dõi, và biến trạng thái trong `state`.

---

## 3. CHECKLIST KIỂM THỬ QA & NGHIỆM THU
- [x] Node syntax check toàn bộ script (`scripts/check_syntax.py`) $\to$ PASS 100%.
- [x] Không còn bất kỳ listener hoặc timer rác nào của TOC chạy ngầm trong bộ nhớ.
- [x] Thanh công cụ đọc sách (`stickyReaderHeader`) hiển thị gọn gàng, đầy đủ các nút chức năng cốt lõi (Trước/Sau, Nhảy bài, Độ rộng, Đã học, Tải xuống, Yêu thích, Nghe, Tập trung).
- [x] Phiên bản được đồng bộ chuẩn mực `v5.8.63` trên toàn bộ hệ thống (`package.json`, `sw.js`, `index.html`, `changelog.js`).
