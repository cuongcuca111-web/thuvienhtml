# SPEC.md — Tái Thiết Kế Icon Độc Bản & Bố Cục Công Thái Học Cho Dual-Mode AI Generator (v5.8.75)

## 1. MỤC TIÊU & PHÂN TÍCH THỰC TRẠNG (UX/UI AUDIT)
Người dùng yêu cầu: *"thiết kế lại icon và sắp xếp khoa học và đẹp nhất có thể"*, đính kèm 2 ảnh chụp thực tế giao diện hiện tại:
- **Ảnh 1 (Tab Chế độ AI - Mục tiêu):**
  * Emojis hệ thống thô (`🎯`, `📊`, `⚡`, `🧠`, `🏆`, `💡`) hiển thị nhạt và không đồng nhất giữa các hệ điều hành (Windows/macOS/iOS/Android).
  * Nút radio tròn chỉ là chấm nhỏ `w-2 h-2` nằm lệch góc phải trên.
  * Nhãn "Khuyên dùng" bị dính chùm vào dòng tiêu đề `"Học để hiểu Khuyên dùng"`.
  * Badge số lượng (`~5 câu`, `~8 câu`, `~12 câu`) nằm lẻ loi ở góc trái dưới, nửa bên phải để trống lãng phí không gian.
- **Ảnh 2 (Tab Theo số chữ bài học):**
  * Thanh thông số dung lượng chữ nhìn đơn điệu, các con số quan trọng (492 từ, 2 phút, 6 câu) chưa được đóng khung nổi bật.
  * 3 thẻ số lượng (`4 câu`, `6 câu`, `8 câu`) phẳng lì, thiếu icon phân loại theo tốc độ/chi tiết, typography thiếu điểm nhấn.

---

## 2. THIẾT KẾ BỐ CỤC & HỆ THỐNG ICON SVG ĐỘC BẢN

### 2.1. Bộ Icon Vector SVG Độc Bản (Zero-Emoji, 100% Vector)
1. **Tab Switcher:**
   - Tab 1: Icon **Target Compass** SVG tinh xảo (`<svg>` tâm ngắm mục tiêu).
   - Tab 2: Icon **Bar Analytics & FileText** SVG tinh xảo.
2. **Tab 1 — 3 Thẻ Mục Tiêu AI:**
   - **Thẻ 1 (Học sơ qua để thi):** Squircle Icon Box nền `bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80` chứa Icon **Tia Sét Tốc Độ (Speed Lightning)**.
   - **Thẻ 2 (Học để hiểu):** Squircle Icon Box nền `bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80` chứa Icon **Khám Phá Tri Thức (Brain Spark Insight)**.
   - **Thẻ 3 (Học để đạt điểm A+):** Squircle Icon Box nền `bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80` chứa Icon **Huy Chương Vinh Danh & Ngôi Sao A+ (Award Badge & Star)**.
3. **Tab 2 — 3 Thẻ Số Lượng Theo Số Chữ:**
   - Mốc 1 (Nhanh): Icon SVG **Đồng hồ / Tên lửa (Rocket Speed)**.
   - Mốc 2 (Chuẩn - Đề xuất): Icon SVG **Ngôi sao lấp lánh (Sparkles / Crown)**.
   - Mốc 3 (Chi tiết): Icon SVG **Quyển sách mở / Lớp tri thức (Book Layers)**.
4. **Hint Box:**
   - Icon SVG **Bóng đèn phát sáng 3D** với vòng tỏa hào quang tinh tế.

---

### 2.2. Tái Cấu Trúc Bố Cục Thẻ Công Thái Học (Card Anatomy)

#### A. Cấu trúc mỗi Thẻ Mục Tiêu AI (Tab 1):
```
┌────────────────────────────────────────────────────────┐
│  [ [Icon Box 36px] ]             [ (o) Radio Ring 20px ]│
│                                                        │
│  Tiêu đề in đậm (VD: Học để hiểu)                      │
│  [✨ Khuyên dùng (Pill riêng biệt, trang nhã)]          │
│                                                        │
│  Mô tả: Hiểu sâu bản chất, nguyên lý & mối liên hệ     │
│                                                        │
│  ────────────────────────────────────────────────────  │
│  [ Badge Đáy: ⚡ ~8 câu hỏi • Độ phủ cốt lõi ]         │
└────────────────────────────────────────────────────────┘
```
- Khi thẻ được chọn (Active): Viền đổi sang `border-2 border-indigo-600 dark:border-indigo-500`, nền `bg-indigo-50/70 dark:bg-indigo-950/40`, đổ bóng êm `shadow-sm`, Radio Ring bên phải chuyển sang màu indigo có chấm tròn hoặc dấu tích SVG.

#### B. Cấu trúc Thanh Chỉ Số & 3 Thẻ Số Chữ (Tab 2):
- **Thanh Chỉ Số (Stats Bar):** Thiết kế dạng các chip thông tin:
  `[ 📄 492 từ ] • [ ⏱️ ~2 phút đọc ] ──> [ ✨ Đề xuất: 6 câu ]`
- **3 Thẻ Số Chữ:**
  - Có con số chính in to rõ nét (`text-base font-extrabold`).
  - Đi kèm icon nhận diện và nhãn phân cấp tốc độ:
    * Thẻ 1: `⚡ 4 câu • Nhanh`
    * Thẻ 2: `✨ 6 câu • Chuẩn (Khuyên dùng)`
    * Thẻ 3: `📖 8 câu • Chi tiết`

---

## 3. KẾ HOẠCH TRIỂN KHAI (BUILDER CHECKLIST)
1. Cập nhật mã HTML trong `index.html` (thay thế khối `selfTestAiGoalPanel`, `selfTestWordCountPanel`, `btnSelfTestTabAiGoal`, `btnSelfTestTabWordCount`).
2. Cập nhật mã JavaScript trong `index.html`:
   - Hàm `updateSelfTestExpectedCountUI()`: Render giao diện thẻ Tab 2 với các icon SVG và cấu trúc thẻ mới.
   - Cập nhật hiệu ứng active/inactive của Radio Ring và viền thẻ.
3. Kiểm thử cú pháp Node.js qua `scripts/check_syntax.py`.
4. Cập nhật `changelog.js`, chạy `sync_version.py` lên `v5.8.75`, commit Git và sao lưu Google Drive.
