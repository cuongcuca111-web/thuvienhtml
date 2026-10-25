# SPEC.md — Đặc Tả Kỹ Thuật: Bỏ Chữ "Space" Trên Nút Lật Thẻ & Thêm Tính Năng Xóa Câu Cần Học Lại (v5.8.69)

## 1. PHÂN TÍCH YÊU CẦU & BỐI CẢNH
1. **Yêu cầu 1: Ở ảnh 1, hãy bỏ chữ "space"**:
   - Trên giao diện modal Flashcard ("Thẻ 1 / 3"), nút chính ở giữa đang hiển thị: `[ 🔄 Lật đáp án  Space ]` với badge `<span class="... font-mono ...">Space</span>`.
   - Người dùng yêu cầu bỏ chữ "space" này để nút bấm tinh gọn, hiện đại và tập trung vào hành động cốt lõi ("Lật đáp án"), tránh rườm rà về thị giác.
   - Thao tác bấm phím cách (Spacebar) trên bàn phím vẫn được giữ nguyên hoạt động trong nền và trong bảng hướng dẫn phím tắt (nút 🎚️).
2. **Yêu cầu 2: Thêm tính năng xóa các câu cần học lại (Ảnh 2)**:
   - Trong modal "Bộ thẻ & Trắc nghiệm tự kiểm tra", tab "Cần học lại (Làm sai)" hiện chỉ có:
     * Nút "Luyện tập các câu sai ngay" trên banner.
     * Nút "Đã hiểu" trên từng câu hỏi làm sai.
   - Hạn chế hiện tại:
     * Người dùng không có nút xóa nhanh toàn bộ danh sách khi muốn làm sạch lịch sử ôn tập.
     * Người dùng chưa thấy rõ hành động "Xóa" trên từng câu (nút "Đã hiểu" nghe giống xác nhận ghi nhớ chứ không mang ý nghĩa xóa/loại bỏ khỏi danh sách ôn lại).
   - Giải pháp:
     * **Cấp độ danh sách (Batch Clear)**: Bổ sung nút `🗑️ Xóa tất cả` trên thanh banner cạnh nút "Luyện tập các câu sai ngay", có hộp thoại xác nhận an toàn (`confirm`).
     * **Cấp độ từng câu (Item Delete)**: Bổ sung nút `🗑️ Xóa` (icon thùng rác tinh tế) trên từng thẻ câu hỏi làm sai bên cạnh nút "Đã hiểu".
     * Cập nhật tức thời số đếm trên tab `Cần học lại (Làm sai) (X)` và trạng thái trống (Empty state) khi danh sách về 0.

---

## 2. GIẢI PHÁP THIẾT KẾ & TRIỂN KHAI (ARCHITECTURE & DESIGN)

### 2.1. Loại bỏ chữ "Space" trên nút Lật đáp án Flashcard
- Trong HTML `#btnFcFlipBig`:
  * Xóa bỏ thẻ `<span class="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono leading-none">Space</span>`.
  * Giữ nguyên cấu trúc icon SVG xoay tròn và nhãn `<span class="whitespace-nowrap">Lật đáp án</span>`.
  * Giữ nguyên xử lý phím tắt Space ở nền JS (`initFlashcardControlsEvents`).

### 2.2. Giao diện & Trải nghiệm Xóa câu cần học lại (UX/UI)
1. **Banner Tab "Cần học lại" (`#paneDecksWrong`)**:
   - Thêm nút `btnClearAllWrong`:
     ```html
     <button id="btnClearAllWrong" type="button" class="touch-target px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C212B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs border border-stone-200 dark:border-stone-700/60 hover:border-rose-300 dark:hover:border-rose-800 transition cursor-pointer flex items-center gap-1.5" title="Xóa tất cả câu khỏi danh sách cần học lại">
       <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
       <span>Xóa tất cả</span>
     </button>
     ```
   - Tự động disabled/opacity-50 khi `wrong.length === 0`.
2. **Thẻ câu hỏi làm sai (`wrongItemsListContainer`)**:
   - Bố trí cụm thao tác góc phải trên:
     * Nút `✓ Đã hiểu` (màu ngọc lục bảo emerald).
     * Nút `🗑️ Xóa` (màu đá xám chuyển sang đỏ rose khi hover).
3. **Logic JavaScript**:
   - `deleteWrongQuestion(id)`: Lọc bỏ item khỏi `state.learningData.wrongItems`, đặt lại `isWrong = false` trên các deck gốc, lưu storage, gọi toast và render lại tab.
   - `clearAllWrongQuestions()`: Kiểm tra số lượng, hiển thị confirm dialog tiếng Việt, dọn sạch `state.learningData.wrongItems = []`, reset flag trên deck, lưu storage và toast chúc mừng/xác nhận thành công.

---

## 3. KẾ HOẠCH KIỂM THỬ & NGHIỆM THU (QA CRITERIA)
1. Giao diện Flashcard (Ảnh 1): Nút "Lật đáp án" hoàn toàn không còn chữ "Space", giao diện thoáng, cân đối.
2. Bấm phím Space trên bàn phím vẫn lật thẻ bình thường 100%.
3. Tab "Cần học lại" (Ảnh 2):
   - Nút "Xóa tất cả" hiển thị rõ ràng trên banner. Khi danh sách có câu sai, nút bấm hoạt động; khi danh sách rỗng, nút tự động vô hiệu hóa.
   - Bấm "Xóa tất cả" hiển thị hộp thoại xác nhận. Khi đồng ý, danh sách câu sai biến mất ngay lập tức và số đếm trên tab chuyển về 0.
   - Mỗi thẻ câu hỏi có nút "Xóa" riêng lẻ; bấm vào câu nào câu đó được gỡ bỏ ngay lập tức.
4. Toàn bộ inline scripts vượt qua kiểm thử `check_syntax.py` của Node.js.
5. Cập nhật `changelog.js`, đồng bộ phiên bản `v5.8.69` và commit/push Git.
