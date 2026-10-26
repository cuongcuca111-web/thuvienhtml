# SPEC.md — Gói Tối Ưu Hiệu Năng & Bộ Nhớ Cốt Lõi P0 (v5.8.72)

## 1. MỤC TIÊU & BỐI CẢNH
Gói **P0 (Tối ưu Hiệu năng & Bộ nhớ Cốt lõi)** giải quyết 3 điểm nghẽn quan trọng nhất của dự án:
1. **Chống tràn hạn mức 5MB LocalStorage (QuotaExceededError)**:
   - Hiện tại: Bộ đề Flashcard & Trắc nghiệm (`thuvienhtml_study_decks`), câu sai (`thuvienhtml_wrong_items`), câu gắn sao (`thuvienhtml_starred_items`) và lịch sử câu trả lời AI (`thuvienhtml_ai_history_*`) đang lưu trực tiếp vào `localStorage`.
   - Vấn đề: Trình duyệt áp trần 5MB cho toàn bộ domain. Khi người dùng sinh nhiều bài học và bộ đề AI, `localStorage` bị đầy sẽ dẫn đến lỗi không lưu được dữ liệu mới.
   - Giải pháp: Nâng cấp IndexedDB `thuvienhtml_db` lên version 2, bổ sung Object Store `app_data` để lưu trữ bộ đề và lịch sử AI với dung lượng hàng Gigabytes, kèm cơ chế tự động chuyển đổi (Auto-migration) và fallback an toàn 2 chiều.
2. **Dọn dẹp mã nguồn thư mục `scripts/`**:
   - Hiện tại: Hơn 150 kịch bản `.py` tạm (`inspect_*.py`, `patch_*.py`, `find_*.py`...) từ các phiên debug trước đó đang nằm trong thư mục `scripts/`.
   - Giải pháp: Dọn dẹp sạch sẽ các kịch bản dùng một lần, chỉ giữ lại các công cụ hệ thống chuẩn (`check_syntax.py`, `sync_version.py`, `analyze_health.py`, `backup_to_gdrive.py`, `create_project_zip.py`, các script admin).
3. **Bảo toàn và Tối ưu hóa Bộ nhớ đệm (Cache/SW)**:
   - Đồng bộ version `v5.8.72`, cập nhật changelog và xác thực 100% cú pháp script.

---

## 2. THIẾT KẾ KIẾN TRÚC & TRIỂN KHAI KỸ THUẬT

### 2.1. Nâng cấp IndexedDB `thuvienhtml_db` (Version 2)
* Tăng `IDB_VERSION = 2`.
* Tại sự kiện `onupgradeneeded`:
  ```javascript
  if (!idb.objectStoreNames.contains('app_data')) {
    idb.createObjectStore('app_data', { keyPath: 'key' });
  }
  ```
* Bổ sung bộ 3 hàm thao tác bất đồng bộ:
  - `putAppDataIDB(key, value)`: Lưu trữ đối tượng vào IndexedDB không giới hạn dung lượng.
  - `getAppDataIDB(key)`: Đọc đối tượng từ IndexedDB.
  - `deleteAppDataIDB(key)`: Xóa đối tượng khỏi IndexedDB.

### 2.2. Cơ chế Tự động Di trú Dữ liệu (Auto-Migration)
* Khi khởi động ứng dụng:
  - Kiểm tra và tự động sao chép `thuvienhtml_study_decks`, `thuvienhtml_starred_items`, `thuvienhtml_wrong_items` từ `localStorage` sang `app_data` trong IndexedDB.
  - Quét tất cả các khóa `thuvienhtml_ai_history_*` để đồng bộ sang IndexedDB.
  - Khi lưu dữ liệu (`saveStudyDecksAndItems`, `recordLessonAiResponse`):
    * Ghi bất đồng bộ vào IndexedDB `app_data`.
    * Vẫn duy trì ghi `localStorage` có bọc khối `try-catch QuotaExceededError`. Nếu `localStorage` bị đầy, dữ liệu trong IndexedDB vẫn bảo toàn 100% và không làm gián đoạn trải nghiệm người dùng.

### 2.3. Dọn dẹp thư mục `scripts/`
* Giữ lại danh sách file cần thiết:
  - `analyze_health.py`
  - `backup_to_gdrive.py`
  - `check_syntax.py`
  - `create_project_zip.py`
  - `sync_version.py`
  - `verify.py`
  - `create-admin.js`
  - `seed-payment-config.js`
  - `set-admin.js`
* Di chuyển/xóa các file tạm khác.

---

## 3. TIÊU CHUẨN KIỂM THỬ (QA CHECKLIST)
1. Cú pháp JavaScript của `index.html` và toàn bộ script phải đạt 100% PASS khi chạy `check_syntax.py`.
2. Kiểm tra IndexedDB trên trình duyệt: Object store `app_data` được khởi tạo thành công khi tải trang.
3. Tạo bộ đề AI, gắn sao, làm sai câu hỏi: Dữ liệu được ghi thành công vào IndexedDB.
4. Lịch sử câu trả lời AI: Được lưu và nạp mượt mà từ IndexedDB.
5. Thư mục `scripts/` gọn gàng, sạch sẽ.
6. Đồng bộ phiên bản `v5.8.72`, commit và đẩy Git thành công.
