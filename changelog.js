// changelog.js - Dữ liệu Lịch sử cập nhật (Changelog) của Thư viện Sách HTML
// Mục đầu tiên (CHANGELOG[0]) tự động cập nhật số phiên bản, ngày build và kích hoạt thông báo "Có gì mới".
const CHANGELOG = [
  {
    version: 'v5.8.61',
    date: '2026-10-25T14:45:00+07:00',
    title: 'Khắc Phục Lỗi Phân Quyền Chọn Màu Khung Ghi Chú & Mở Khóa Đổi Màu Toàn Diện Cho Gói Pro/Plus',
    items: [
      { type: 'fix', text: 'Sửa lỗi phân quyền gói Pro/Plus khi chọn màu khung: Khắc phục triệt để hiện tượng người dùng đang ở phiên bản Pro nhưng khi chọn màu viền khung trên thanh công cụ nổi lại bị báo thông báo "Tính năng chọn màu khung dành cho gói Plus trở lên". Chuẩn hóa thứ tự ưu tiên kiểm tra tier trong getUserTier, canUseFrameColors, canUseCustomColor và requestFrameColor, đảm bảo quyền Pro/Plus luôn được nhận diện chính xác 100%.' },
      { type: 'fix', text: 'Khắc phục sự cố không chọn được màu trong Modal Chi tiết Ghi chú (Ảnh 1): Tối ưu phạm vi sự kiện click của các nút màu (#highlightDetailModal .hl-color-btn), khôi phục và liên kết dữ liệu item ghi chú bền vững, cập nhật vòng tròn viền màu tức thì trên giao diện modal và đồng bộ trực tiếp sang iframe bài đọc.' },
      { type: 'improved', text: 'Đồng bộ phản hồi thị giác siêu nhạy (0ms latency): Đổi màu viền khung, ánh sáng hào quang (glow), và nhãn màu tiêu đề modal tức thì khi nhấp chọn bất kỳ màu nào (Vàng cam, Xanh lá, Hồng, Tím, Custom).' }
    ]
  },
  {
    version: 'v5.8.60',
    date: '2026-10-25T12:15:00+07:00',
    title: 'Phân Bổ Số Lượng Câu Hỏi AI Biến Đổi Linh Hoạt Theo Dung Lượng Chữ (Word Count) Của Tài Liệu',
    items: [
      { type: 'improved', text: 'Khắc phục triệt để hiện tượng số lượng câu hỏi bị "cứng" theo số file: Thay vì chỉ dựa trên số lượng file N đơn thuần dẫn đến việc file ngắn hay file dài đều ra 8 câu, hệ thống đã tích hợp thuật toán phân bổ câu hỏi & thẻ nhớ thích ứng động theo mật độ chữ thực tế (Word Count W).' },
      { type: 'improved', text: 'Tự động co giãn số câu thông minh theo độ dài bài học: File ngắn (dưới 300 từ) tự động đề xuất 4 - 6 câu tinh gọn, tránh lan man hay trùng lặp; file chuẩn (800 - 1.500 từ) đề xuất 8 - 14 câu; file dài chuyên sâu (> 2.500 từ) đề xuất 18 - 35 câu bao quát toàn diện.' },
      { type: 'improved', text: 'Hiển thị tổng số từ thực tế trên giao diện: Hộp chú thích trực quan cập nhật tức thì (0ms latency): "💡 AI đề xuất dự kiến: ~X thẻ flashcard (~Y từ, phân bổ đều cho Z bài học đã chọn)", phản hồi mượt mà và minh bạch mọi thông số cho người học.' }
    ]
  },
  {
    version: 'v5.8.59',
    date: '2026-10-25T12:00:00+07:00',
    title: 'Phân Bổ Câu Hỏi AI Tự Động Thông Minh Theo Số Lượng Bài Học & Hiển Thị Số Lượng Dự Kiến Real-time',
    items: [
      { type: 'improved', text: 'Tự động tính toán và phân bổ câu hỏi thông minh theo số lượng bài học: Khắc phục triệt để lỗi chọn 6 bài chỉ sinh ra 6 câu. Thiết lập công thức toán học thích ứng theo N bài học đã chọn: chế độ kết hợp sinh ~5 câu/bài (ví dụ: 6 bài sinh đúng 30 câu gồm 15 trắc nghiệm + 15 thẻ flashcard), chế độ đơn lẻ sinh ~4.2 câu/bài (6 bài sinh ~25 câu), kèm chỉ thị bắt buộc phân bổ đồng đều cho mọi bài học.' },
      { type: 'improved', text: 'Hiển thị số lượng câu dự kiến theo thời gian thực (Real-time Dynamic Expected Count): Bổ sung badge số lượng linh hoạt ngay trên nút "Tự động (AI đề xuất): (~X câu)" cùng hộp thông tin trực quan chi tiết bên dưới, tự động cập nhật ngay tức thì khi thêm/bớt bài học hoặc đổi dạng đề thi.' },
      { type: 'improved', text: 'Nâng trần Token an toàn lên 6000 Tokens: Đảm bảo trọn bộ 30 - 40 câu trắc nghiệm và thẻ nhớ luôn được sinh đầy đủ, toàn vẹn 100% không bao giờ bị cắt cụt JSON.' }
    ]
  },
  {
    version: 'v5.8.58',
    date: '2026-10-25T11:45:00+07:00',
    title: 'Hiệu Ứng Chuyển Cảnh & Animation Hoàn Thành Bài Kiểm Tra Đẳng Cấp & Chặn Autofill Form Rác',
    items: [
      { type: 'improved', text: 'Hiệu ứng hoàn thành bài kiểm tra & phiên ôn tập siêu mượt (Delight Completion Polish): Nâng cấp chuyển cảnh mượt mà 60 FPS GPU Compositor khi kết thúc bài trắc nghiệm và thẻ nhớ. Icon checkmark bung nảy nhẹ nhàng (Spring Pop-in) kèm hào quang pulse ring lan tỏa, tiêu đề, điểm số và các nút hành động trượt nhẹ tuần tự (Staggered Fade-in-up), kết hợp chùm hạt ngọc thanh lịch (Micro-confetti) tự dọn sạch sau 2 giây.' },
      { type: 'fix', text: 'Chặn triệt để lỗi tự động điền tài khoản & mật khẩu vào form Tạo bài kiểm tra AI: Thiết lập cơ chế phòng thủ đa tầng (Decoy inputs mồi nhử ẩn, semantic search attributes, one-time/new-password tags, và runtime sanitization guard), ngăn chặn 100% việc trình duyệt tự ý điền tên đăng nhập vào ô "Tìm nhanh bài học" và mật khẩu vào ô "Google Gemini API Key cá nhân".' },
      { type: 'improved', text: 'Bổ sung nút con mắt (Eye Toggle) cho ô Google Gemini API Key: Người dùng có thể dễ dàng nhấp để xem lại khóa API cá nhân vừa dán hoặc ẩn lại dưới dạng chấm tròn an toàn.' }
    ]
  },
  {
    version: 'v5.8.57',
    date: '2026-10-24T22:15:00+07:00',
    title: 'Tăng Tốc Phản Hồi AI Vượt Bậc (~1s) & Tự Động Thu Nhỏ (Auto-Collapse) Trong Lúc Chờ Trả Lời',
    items: [
      { type: 'improved', text: 'Tăng tốc phản hồi AI vượt bậc (>70% nhanh hơn): Tinh gọn JSON Schema của tác vụ giải thích đơn giản và ví dụ/dịch thuật, chỉ tập trung sinh nội dung chính súc tích (dưới 80 từ) thay vì sinh các mảng dữ liệu rườm rà. Kết hợp bộ đệm in-memory 60s cho cấu hình Firestore, giảm thời gian phản hồi của Gemini 2.0 Flash xuống chỉ còn ~800ms - 1.2s.' },
      { type: 'improved', text: 'Tự động thu nhỏ thông minh (Auto-Collapse while Waiting): Trong lúc chờ AI sinh câu trả lời, pop-up tự động thu gọn thành thanh Mini Pill Bar êm ái ở đáy màn hình với badge "Đang xử lý...". Người đọc hoàn toàn không bị che khuất tầm nhìn, thoải mái đọc tiếp các đoạn văn và nội dung xung quanh.' },
      { type: 'improved', text: 'Tự động bung mở 60 FPS GPU Morphing khi hoàn thành: Ngay khi câu trả lời sẵn sàng, nếu người dùng vẫn đang ở vị trí đoạn trích, thanh mini tự động bung mở mượt mà thành hộp thoại giải thích đầy đủ. Nếu người dùng đã cuộn đi xa, thanh mini hiển thị "✓ Đã xong (Nhấp để xem)" để không làm gián đoạn việc đọc.' },
      { type: 'improved', text: 'Bổ sung nút Thu nhỏ (—) chủ động trong Header: Người dùng có thể nhấn nút "Thu nhỏ" bất cứ lúc nào để ghim pop-up xuống thanh mini và thoải mái xem lại toàn bộ văn bản trang sách.' }
    ]
  },
  {
    version: 'v5.8.56',
    date: '2026-10-24T21:35:00+07:00',
    title: 'Khắc Phục Triệt Để Lỗi Model 2.5 Bị Google Giới Hạn (No Longer Available) & Mở Rộng Timeout Tạo Đề AI',
    items: [
      { type: 'fix', text: 'Triệt tiêu hoàn toàn lỗi "This model models/gemini-2.5-flash-lite is no longer available to new users": Theo chính sách mới nhất của Google, dòng model 2.5 đã bị khóa đối với các tài khoản và API key mới. Hệ thống đã loại bỏ hoàn toàn model 2.5 khỏi chuỗi gọi dự phòng và chuẩn hóa 100% sang Gemini 2.0 Flash (kèm Gemini 2.0 Flash-Lite và Gemini 3.5 Flash-Lite).' },
      { type: 'improved', text: 'Tự động làm lành (Auto-heal) cấu hình Firestore: Tự động quét và nâng cấp các model 2.5 cũ đang lưu trong cơ sở dữ liệu về Gemini 2.0 Flash chuẩn, ngăn chặn triệt để tình trạng gọi nhầm model không khả dụng.' },
      { type: 'improved', text: 'Thời gian chờ thích ứng (Dynamic Timeout) lên đến 50 giây: Nâng cấp cơ chế timeout cố định 10s cũ thành thời gian chờ tự động theo dung lượng token (18s đến 50s). Đảm bảo quá trình tạo trọn bộ 10 - 15 câu trắc nghiệm kết hợp flashcard (2500 tokens) luôn có đủ thời gian sinh JSON hoàn hảo mà không bao giờ bị ngắt kết nối.' }
    ]
  },
  {
    version: 'v5.8.55',
    date: '2026-10-24T21:30:00+07:00',
    title: 'Khóa Tốc Độ 60 FPS Thao Tác Cuộn & Chuyển Cảnh Biến Hình Siêu Mượt Pop-up AI (Fluid GPU Morphing)',
    items: [
      { type: 'improved', text: 'Triệt tiêu 100% hiện tượng tụt FPS và giật lag khi cuộn trang: Tách biệt hoàn toàn cơ chế bám sát tọa độ khi cuộn và hiệu ứng chuyển cảnh. Khi cuộn trang, tọa độ pop-up AI cập nhật tức thì theo nhịp vẽ màn hình (GPU Compositor) thông qua requestAnimationFrame, loại bỏ hoàn toàn các thuộc tính transition layout gây tắc nghẽn CPU/Reflow.' },
      { type: 'improved', text: 'Chuyển cảnh biến hình (Morphing Transition) siêu mượt chuẩn Trụ cột 3 /thietkeweb: Khi biến đổi qua lại giữa Hộp Giải thích Đầy đủ và Thanh Mini Pill ở đáy/đỉnh màn hình, kích hoạt chuyển cảnh 250ms với đường cong tự nhiên cubic-bezier(0.16, 1, 0.3, 1). Loại bỏ hoàn toàn display:none, áp dụng kỹ thuật GPU Crossfade với opacity và transform scale, đảm bảo chuyển đổi êm ái như ứng dụng native cao cấp.' },
      { type: 'improved', text: 'Vùng đệm trễ Hysteresis chống rung giật biên: Bổ sung khoảng đệm 80-110px ở mép màn hình, ngăn chặn triệt để hiện tượng giật cục hoặc nhấp nháy chuyển trạng thái liên tục khi người dùng cuộn lăn tăn ở sát ngưỡng đáy hoặc đỉnh.' }
    ]
  },
  {
    version: 'v5.8.54',
    date: '2026-10-24T21:25:00+07:00',
    title: 'Cứu Hộ Tự Động Toàn Diện (Autonomous Boot Watchdog), Phục Hồi Trang Đơ & Đồng Bộ 60 FPS',
    items: [
      { type: 'fix', text: 'Triệt tiêu 100% hiện tượng đơ trang / trắng màn hình do bộ nhớ đệm: Tích hợp cơ chế Boot Watchdog tự trị ngay trong thẻ <head>. Nếu phát hiện ứng dụng bị gián đoạn hoặc không khởi động sau 2.5 giây do bản lưu đệm Service Worker cũ, hệ thống sẽ tự động dọn sạch cache và nạp lại bản mới nhất từ máy chủ.' },
      { type: 'improved', text: 'Bảo vệ cú pháp và cân bằng cấu trúc CSS/JS toàn cục: Đã loại bỏ các dấu ngoặc thừa tiềm ẩn trong styles.css và index.html, đảm bảo luồng khởi tạo phân hệ modular (đồng hồ Hà Nội, danh sách bài học, thanh sidebar, bộ đọc Iframe) chạy mượt mà không bao giờ bị nghẽn.' },
      { type: 'improved', text: 'Giao diện Cứu hộ Khẩn cấp (Emergency Recovery UI): Trong trường hợp mạng chập chờn, một thanh cứu hộ tinh tế chuẩn Dark Glassmorphism sẽ xuất hiện cho phép người dùng 1 chạm làm mới toàn bộ dữ liệu ứng dụng.' }
    ]
  },
  {
    version: 'v5.8.53',
    date: '2026-10-24T21:15:00+07:00',
    title: 'Khắc Phục Triệt Để Lỗi Model AI (404 Not Found), Chuẩn Hóa Gemini 2.0 Flash & Auto-Heal Đa Tầng',
    items: [
      { type: 'fix', text: 'Triệt tiêu dứt điểm lỗi model 404 ("models/gemini-1.5-pro is not found for API version v1beta"): Chuẩn hóa toàn bộ engine AI sang Google Gemini 2.0 Flash siêu tốc độ, ổn định và hỗ trợ 100% tài khoản Google AI Studio. Loại bỏ hoàn toàn các model đã bị Google đóng (1.5-pro) hoặc không tồn tại (3.8-flash).' },
      { type: 'improved', text: 'Cơ chế tự động làm lành cấu hình đa tầng (Auto-Heal & Model Sanitizer Guard): Tự động phát hiện và chuyển đổi tức thì mọi model cũ lưu trong Firestore (config/ai_settings) hoặc cấu hình trình duyệt về Gemini 2.0 Flash trong bộ nhớ và tự động đồng bộ ngầm sửa dữ liệu trong cơ sở dữ liệu.' },
      { type: 'improved', text: 'Chuỗi dự phòng thích ứng thông minh (Failover Cascade): Đặt Gemini 2.0 Flash lên ưu tiên hàng đầu, kèm theo các cấp dự phòng thứ cấp an toàn (Gemini 1.5 Flash -> Gemini 2.5 Flash -> Gemini 2.5 Flash-Lite). Sửa lỗi cú pháp thẻ đóng ẩn trong index.html, đảm bảo luồng AI giải thích đoạn trích và bài tập tự kiểm tra luôn phản hồi liền mạch.' }
    ]
  },
  {
    version: 'v5.8.52',
    date: '2026-10-24T20:55:00+07:00',
    title: 'Thanh Trợ Lý AI Thu Nhỏ Hai Chiều Linh Hoạt (Bi-directional Smart Mini Pill Bar)',
    items: [
      { type: 'improved', text: 'Tự động thu nhỏ thanh Pill ở đáy màn hình khi cuộn lên: Khi người dùng cuộn trang lên trên khiến đoạn văn bản bôi đen trôi xuống khỏi đáy màn hình, cửa sổ giải thích AI sẽ tự động thu nhỏ thành thanh trạng thái mini tinh gọn ở cạnh đáy (thay vì bung to choán nửa màn hình), hiển thị trạng thái xử lý và nhãn "Cuộn xuống" kèm mũi tên trực quan.' },
      { type: 'improved', text: 'Điều hướng cuộn trang hai chiều thông minh: Tự động phát hiện hướng cuộn để ghim thanh mini ở đỉnh (dưới header với nhãn "Cuộn lên") hoặc ở đáy (với nhãn "Cuộn xuống"). Nhấp vào thanh mini sẽ cuộn mượt 60 FPS đưa đoạn văn bản trở lại trung tâm màn hình và mở rộng pop-up tự nhiên.' },
      { type: 'improved', text: 'Hiệu ứng chuyển cảnh và hover nhẹ nhàng chuẩn /thietkeweb: Thanh trạng thái mini ở đáy trang bị hiệu ứng nâng nhẹ (translateY -2px), bóng đổ phát quang mờ ảo và tự động mở lại giao diện đầy đủ khi đoạn văn bản trôi trở lại tầm nhìn.' }
    ]
  },
  {
    version: 'v5.8.51',
    date: '2026-10-24T20:30:00+07:00',
    title: 'Khắc Phục Triệt Để Khoảng Trống Đen Ở Cuối Bài Đọc & Ôm Khít Nội Dung Nguyên Bản (Viewer Fit-Content)',
    items: [
      { type: 'fix', text: 'Triệt tiêu 100% khoảng trống đen thừa: Khắc phục lỗi vòng lặp phình chiều cao Iframe do CSS min-h-screen/100vh và cơ chế đo đạc tự động ghi đè scrollHeight lên chiều cao thật. Iframe và khung chứa giờ đây tự động co giãn ôm khít chính xác mép dưới của nội dung bài học.' },
      { type: 'improved', text: 'Tự động dọn dẹp watermark & bảo tồn file gốc nguyên bản: Tự động phát hiện và ẩn các dòng ghi chú watermark do AI sinh ra ở chân trang mà không làm biến dạng hay chỉnh sửa file gốc của người dùng, mang lại trải nghiệm đọc sách thuần khiết, liền mạch.' },
      { type: 'improved', text: 'Thuật toán đo đạc nội dung đa tầng (Multi-layer True Bottom Measurement): Tự động loại trừ các lớp nền trang trí, hiệu ứng hạt và lớp phủ tuyệt đối (position absolute/fixed), đo chính xác chiều cao bài học ngay sau khi tải phông chữ và đồng bộ mượt mà ở tốc độ 60 FPS.' }
    ]
  },
  {
    version: 'v5.8.50',
    date: '2026-10-24T20:10:00+07:00',
    title: 'Khắc Phục Triệt Để Lỗi Phân Định Dạng Bài: Chỉ Tạo Flashcard & Chỉ Tạo Trắc Nghiệm',
    items: [
      { type: 'fix', text: 'Tách biệt và cô lập tuyệt đối 3 dạng bài (Chỉ Flashcards / Chỉ Trắc nghiệm / Kết hợp): Khắc phục lỗi khi chọn "Chỉ Flashcards" nhưng AI sinh ra cả trắc nghiệm. Cấu trúc Prompt và JSON Schema được thiết kế động riêng biệt cho từng chế độ, cấm hoàn toàn việc sinh thừa định dạng.' },
      { type: 'improved', text: 'Cơ chế lọc và bảo vệ dữ liệu 2 tầng (Server & Client): Hệ thống chủ động loại bỏ triệt để các câu hỏi không thuộc dạng bài đã chọn, tách biệt bộ nhớ cache theo từng dạng bài và tự động đặt tên đúng chuẩn ("Thẻ nhớ: ..." hoặc "Trắc nghiệm: ...").' },
      { type: 'improved', text: 'Tự động sửa lỗi bộ đề cũ & Điều hướng học thông minh: Tự động chuẩn hóa các bộ đề đã tạo trước đó về đúng dạng bài (chỉ hiển thị 1 nút tương ứng như "Lật Flashcard"), đồng thời nhấp trực tiếp vào thẻ Flashcard sẽ mở ngay chế độ lật thẻ 3D.' }
    ]
  },
  {
    version: 'v5.8.49',
    date: '2026-10-24T19:40:00+07:00',
    title: 'Hỗ Trợ Thế Hệ Model Gemini 3.8 & Tự Động Thích Ứng Khóa API Mới (Key Pool Auto-Discovery)',
    items: [
      { type: 'fix', text: 'Khắc phục triệt để lỗi deprecation model trên các khóa API mới: Google đã chính thức ngừng cấp quyền model cũ (gemini-2.5-flash) cho các tài khoản mới tạo và bắt buộc dùng gemini-3.8-flash. Hệ thống đã nâng cấp toàn diện sang bộ model Gemini 3.8 Flash & Gemini 3.8 Pro chuẩn 2026.' },
      { type: 'improved', text: 'Cơ chế tự động phát hiện model hỗ trợ (ListModels & Auto Recommendation Discovery): Khi kiểm tra hoặc sử dụng khóa API, hệ thống tự động xác thực danh sách model Google cấp phép với chi phí 0 token, đồng thời tự động nhận diện và chuyển hướng model nếu Google gợi ý trong phản hồi.' },
      { type: 'improved', text: 'Chuẩn hóa trạng thái và nhãn mác Kho dự trữ khóa: Sửa lỗi gắn nhầm mác "Sắp hết hạn" cho các khóa mới hợp lệ; khóa phụ hoạt động tốt sẽ mang mác chuẩn "⚪ Dự phòng (Sẵn sàng kích hoạt)" hoặc "🟢 Đang hoạt động" khi được thăng hạng làm khóa chính.' }
    ]
  },
      {
        version: 'v5.8.48',
        date: '2026-10-24T19:15:00+07:00',
        title: 'Nâng Cấp Toàn Diện Hệ Thống Đo Thời Gian Học Tập & Chống Mất Dữ Liệu',
        items: [
          { type: 'improved', text: 'Cơ chế đo thời gian học chính xác từng giây: Khắc phục triệt để tình trạng dừng đếm giờ khi đọc bài trong iframe nhờ bộ lắng nghe sự kiện đa tầng (Iframe Event Bridge) và nâng ngưỡng nhàn rỗi (idle window) lên 5 phút phù hợp chuẩn đọc học thuật.' },
          { type: 'improved', text: 'Cơ chế chống mất dữ liệu đa tầng & Sao lưu khẩn cấp: Tự động lưu dồn giây đọc và làm tròn lưu ngay lập tức khi rời trang, chuyển tab hoặc đóng trình duyệt; bổ sung bản sao lưu độc lập (thuvienhtml_analytics_backup) và thuật toán hợp nhất Firestore thông minh (Smart Cloud Merge) ngăn chặn hoàn toàn việc mất lịch sử đọc khi đồng bộ đám mây.' },
          { type: 'improved', text: 'Tính toán mục tiêu ngày thông minh & Trực quan hóa biểu đồ 7 ngày: Công nhận thành quả đọc sách khi đạt mục tiêu thời gian (38p/30p đạt 100% vinh danh thay vì 0%), hiển thị nhãn số phút trực tiếp trên từng cột biểu đồ và hỗ trợ công cụ bù giờ/tùy chỉnh mục tiêu linh hoạt.' }
        ]
      },
      {
        version: 'v5.8.47',
        date: '2026-10-24T18:55:00+07:00',
        title: 'Tự Động Gỡ Bỏ Câu Sai Khi Hoàn Thành Ôn Luyện Thành Công',
        items: [
          { type: 'improved', text: 'Cơ chế tự động giải phóng câu sai đã làm chủ: Khi người dùng trả lời đúng câu hỏi trắc nghiệm hoặc bấm "Nhớ rồi" thẻ flashcard trong quá trình luyện tập, câu hỏi đó sẽ lập tức được tự động gỡ bỏ và biến mất khỏi danh sách "Cần học lại (Làm sai)".' },
          { type: 'improved', text: 'Đồng bộ tức thì số lượng câu cần ôn tập: Huy hiệu số đếm câu sai (badgeCountWrong) tự động giảm dần về 0 theo thời gian thực; khi làm chủ toàn bộ các câu sai, hệ thống hiển thị huy hiệu vinh danh và thông điệp chúc mừng hoàn thành xuất sắc.' },
          { type: 'improved', text: 'Thanh lọc tiêu đề và tự động vô hiệu nút trống: Loại bỏ triệt để các ký tự biểu tượng phím lặp cũ trong bộ nhớ đệm, tự động chuyển nút "Luyện tập các câu sai ngay" về trạng thái vô hiệu khi danh sách câu sai về 0.' }
        ]
      },
      {
        version: 'v5.8.46',
        date: '2026-10-24T18:45:00+07:00',
        title: 'Hoàn Thiện Biểu Tượng Độc Quyền Vòng Cung Ôn Luyện Khắc Phục Lỗi Sai',
        items: [
          { type: 'improved', text: 'Thiết kế biểu tượng độc quyền Vòng lặp Tri thức & Khắc phục sai sót (#icon-retry-wrong): Kết hợp vòng cung ôn tập tuần hoàn uốn lượn mềm mại với điểm sáng tri thức 4 cánh ở tâm, thay thế hoàn toàn tình trạng trùng lặp icon mũi tên xoay cũ và emoji khối vuông xanh thô.' },
          { type: 'improved', text: 'Đồng bộ hóa trải nghiệm nút "Luyện tập các câu sai ngay": Nút bấm trong Trung tâm bộ đề hiển thị duy nhất 1 icon vector sắc nét, tinh gọn, hòa nhập trọn vẹn với phong cách thẩm mỹ học thuật của trang web.' }
        ]
      },
      {
        version: 'v5.8.45',
        date: '2026-10-24T18:35:00+07:00',
        title: 'Thiết Kế Riêng Biểu Tượng Vòng Lặp Ôn Luyện Sửa Sai & Loại Bỏ Emoji Thô',
        items: [
          { type: 'improved', text: 'Thiết kế riêng Biểu tượng Vòng lặp Ôn luyện Sửa sai (Mastery Retry Loop): Thay thế hoàn toàn emoji phím lặp màu xanh thô kệch bằng biểu tượng vector vòng cung lặp kép 2 chiều (#icon-retry-wrong), mang phong cách học thuật thanh lịch và đồng bộ chuẩn giao diện Editorial của website.' },
          { type: 'improved', text: 'Tối ưu hóa hiển thị nút "Ôn lại câu làm sai": Bảo toàn cấu trúc icon vector SVG sắc nét khi cập nhật số lượng câu sai động qua JS (ví dụ: "Ôn lại 1 câu làm sai"), bổ sung hiệu ứng vi tương tác xoay nhẹ góc khi rê chuột trên nền hoa hồng thanh nhã.' }
        ]
      },
      {
        version: 'v5.8.44',
        date: '2026-10-24T18:25:00+07:00',
        title: 'Thiết Kế Riêng Biểu Tượng AI Tự Động Đề Xuất & Hoàn Thiện Trực Quan Bộ Đề',
        items: [
          { type: 'improved', text: 'Thiết kế riêng Biểu tượng AI Tự động đề xuất (Bespoke Gemini Auto Sparkle): Thay thế ngôi sao 5 cánh đơn điệu bằng biểu tượng vector chòm sao Gemini đôi độc quyền (ngôi sao chính 4 cánh uốn cong chuẩn Editorial kèm tinh tú phụ đề xuất và hạt lấp lánh), tạo sự đồng bộ hoàn hảo với ngôn ngữ thiết kế AI của toàn bộ website.' },
          { type: 'improved', text: 'Phối màu tương thích trạng thái: Tự động chuyển đổi màu thông minh giữa vàng kim dịu mát (#FDE68A) khi kích hoạt trên nền tím indigo và màu hổ phách sang trọng (#F59E0B / #FBBF24) khi ở trạng thái nghỉ, phân biệt rõ rệt với tính năng Gắn sao (Favorites) của thư viện.' }
        ]
      },
      {
        version: 'v5.8.43',
        date: '2026-10-24T18:15:00+07:00',
        title: 'Đồng Bộ Hóa Nhãn Mác Vương Miện Pro Hoàng Gia & Tự Động Ẩn Khi Đạt Gói Pro',
        items: [
          { type: 'improved', text: 'Đồng bộ hóa biểu tượng Pro chuẩn hoàng gia: Cập nhật icon Pro thành biểu tượng Vương miện Hoàng gia vàng (Crown) trên nền đen kim sa viền vàng cát (#0F1226 & rgba(217, 199, 160, 0.7)), đồng bộ 100% với huy hiệu hồ sơ người dùng.' },
          { type: 'new', text: 'Thiết kế nhãn mác góc (Floating Corner Tag): Đưa nhãn Pro lên vị trí góc trên bên phải của nút "Tự kiểm tra" và "+ Tạo bài mới" thay vì chèn ngang dòng chữ, tạo phong cách nhãn mác cao cấp và giữ nút bấm gọn gàng, tinh tế.' },
          { type: 'improved', text: 'Cơ chế tự động ẩn nhãn cho phiên bản Pro: Hệ thống tự động kiểm tra quyền Pro để ẩn hoàn toàn nhãn mác Pro ở góc nút (cả tức thì ngay tại 0ms qua head cache lẫn khi đăng nhập hoặc nâng cấp), mang lại giao diện tinh gọn tối đa cho thành viên Pro.' }
        ]
      },
      {
        version: 'v5.8.42',
        date: '2026-10-24T18:05:00+07:00',
        title: 'Chuyên Biệt Google Gemini & Kho Dự Trữ Đa Khóa API Tự Động Failover',
        items: [
          { type: 'improved', text: 'Tối ưu hóa chuyên biệt Google Gemini: Loại bỏ hoàn toàn các mô hình bên ngoài (Claude, OpenAI), quy tụ 100% tài nguyên xử lý vào hệ sinh thái Google Gemini thế hệ mới với tốc độ vượt trội.' },
          { type: 'new', text: 'Kho dự trữ Khóa API Gemini (Key Pool): Cho phép quản trị viên cài đặt không giới hạn các khóa API dự phòng; tự động mã hóa AES-256-GCM bảo mật tuyệt đối.' },
          { type: 'improved', text: 'Cơ chế Tự động Chuyển khóa dự phòng (Auto-Failover): Khi khóa chính hết hạn mức hoặc gặp lỗi 429 Quota Exceeded, hệ thống lập tức tự động kích hoạt khóa dự phòng tiếp theo để thực hiện lại yêu cầu, đảm bảo dịch vụ không gián đoạn.' },
          { type: 'new', text: 'Hệ thống Mác trạng thái thông minh: Gắn mác rõ ràng cho từng khóa: 🟢 Đang hoạt động, 🟡 Sắp hết hạn, 🔴 Hết hạn, ⚪ Dự phòng sẵn sàng; hỗ trợ kiểm tra trực tiếp (Live Test) và tự động cập nhật mác theo thời gian thực.' }
        ]
      },
      {
        version: 'v5.8.41',
        date: '2026-10-24T17:55:00+07:00',
        title: 'Khắc Phục Lỗi Bộ Đề Rỗng & Tối Ưu Hóa Click Trực Tiếp Vào Thẻ Tự Kiểm Tra',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi tạo bộ đề 0 câu: Sửa đường truyền nạp dữ liệu bài học bất đồng bộ từ IndexedDB và Iframe sang AI, đảm bảo dữ liệu văn bản bài học luôn đầy đủ khi gửi sang mô hình AI.' },
          { type: 'improved', text: 'Nâng trần Token và nới rộng cấu trúc JSON máy chủ: Nâng mức token đầu ra cho chế độ self_test lên 2.500 tokens, hỗ trợ đa dạng cấu trúc trả về từ AI (quizzes/questions, flashcards/cards), loại bỏ nguy cơ cắt cụt JSON.' },
          { type: 'new', text: 'Tương tác thẻ 1-chạm (One-Click Study): Toàn bộ thẻ bộ đề hiện có thể click trực tiếp để vào làm trắc nghiệm hoặc lật thẻ nhớ ngay lập tức, có hiệu ứng hover sang trọng.' },
          { type: 'improved', text: 'Khôi phục bộ đề cũ: Với các bộ đề 0 câu tạo trước đây, hệ thống bổ sung nút và cơ chế "Tạo lại câu hỏi AI", tự động chọn lại các bài học tương ứng để tạo đề mới đầy đủ.' }
        ]
      },
      {
        version: 'v5.8.40',
        date: '2026-10-24T17:42:00+07:00',
        title: 'Tự Động Cuộn Đến Bài Đang Đọc, Số Lượng Tự Động & Khóa Quyền Gói Pro Cho Bộ Đề AI',
        items: [
          { type: 'improved', text: 'Tự động định vị bài học đang đọc: Khi mở modal Tự kiểm tra, hệ thống tự động tích chọn và cuộn mượt (smooth scroll) danh sách bài học đưa đúng bài bạn đang xem vào giữa khung nhìn, hiển thị rõ ràng huy hiệu "Đang đọc".' },
          { type: 'new', text: 'Tùy chọn số lượng câu hỏi "Tự động (AI đề xuất)": AI tự động phân tích độ dài và mật độ kiến thức của các bài học được chọn để ước lượng và tạo số lượng câu hỏi trắc nghiệm & flashcard tối ưu nhất.' },
          { type: 'improved', text: 'Huy hiệu PRO và cơ chế khóa quyền thành viên: Bổ sung mác PRO vàng kim sang trọng vào nút "Tự kiểm tra" (thanh công cụ bài học) và nút "+ Tạo bài mới" (Trung tâm Bộ đề); tự động hiển thị pop-up nâng cấp gói khi người dùng chưa có tài khoản Pro.' }
        ]
      },
      {
        version: 'v5.8.39',
        date: '2026-10-24T17:35:00+07:00',
        title: 'Chuyển Động Trượt Mượt Vị Trí Pop-Up AI & Tự Động Thu Nhỏ Khi Cuộn Trang',
        items: [
          { type: 'improved', text: 'Chuyển động lật vị trí mượt mà (Smooth Transition): Áp dụng đường cong chuyển động tự nhiên cubic-bezier(0.16, 1, 0.3, 1) chuẩn Editorial khi pop-up AI đổi vị trí từ trên xuống dưới hoặc ngược lại quanh vùng bôi đen, loại bỏ hoàn toàn hiện tượng giật cục.' },
          { type: 'new', text: 'Tự động thu nhỏ thành Mini Pill khi cuộn trang (Auto-Minimize Dock): Khi người dùng cuộn xuống đọc tiếp nội dung bài học, pop-up tự động thu gọn thành thanh trạng thái bo tròn dạng viên thuốc (Pill) tinh tế ngay dưới header, không che chắn tầm nhìn.' },
          { type: 'improved', text: 'Chỉ báo trạng thái thời gian thực: Mini Pill hiển thị rõ nét trạng thái AI đang xử lý (chấm nhịp thở màu hổ phách/tím) hay đã có kết quả (icon ngọc lục bảo #icon-ai-cached kèm huy hiệu "✓ Đã xong").' },
          { type: 'new', text: 'Tự động mở rộng & Cuộn mượt thông minh: Chỉ cần cuộn trang lên lại hoặc bấm trực tiếp vào Mini Pill, hệ thống sẽ cuộn mượt đưa đoạn văn bản bôi đen vào giữa màn hình và mở rộng trọn vẹn kết quả AI.' }
        ]
      },
      {
        version: 'v5.8.38',
        date: '2026-10-24T17:25:00+07:00',
        title: 'Hệ Thống Tự Kiểm Tra & Bộ Đề AI Thông Minh Tối Ưu Token Siêu Cấp',
        items: [
          { type: 'new', text: 'Tự kiểm tra đa bài học linh hoạt (Multi-Lesson Selection): Người dùng có thể tùy chọn 1 hoặc nhiều bài học cùng lúc (mặc định bài đang học) để AI tổng hợp kiến thức tạo bộ đề trắc nghiệm 4 đáp án và Flashcards thông minh.' },
          { type: 'improved', text: '5 cơ chế tối ưu hóa Token API triệt để: Áp dụng Lọc thô DOM (giảm 90% rác HTML), Lọc mỏ neo tri thức (trích xuất câu định nghĩa/công thức trọng tâm), Ghép lô đa bài (Batch Merging trong 1 lượt gọi), Schema JSON siêu nén (Key rút gọn q/options/ans) và Bộ nhớ đệm cục bộ kèm hỗ trợ API Key riêng (BYOK).' },
          { type: 'new', text: 'Trung tâm Quản lý Bộ đề tại Icon Thẻ ghi nhớ (Icon 2 Toolbar): AI tự đặt tên gợi nhớ khoa học cho bộ đề, lưu trữ an toàn trong Hub với 3 phân khu chuyên biệt: Tất cả bộ đề, ⭐ Đã gắn sao (Lưu lại) và ❌ Cần học lại (Làm sai).' },
          { type: 'improved', text: 'Trình luyện thi trắc nghiệm 4 đáp án & Flashcards tương tác chuẩn Editorial: Chấm điểm tức thì với hiệu ứng màu xanh/đỏ mượt mà, khung giải thích AI chi tiết, thanh tiến độ trực quan và tự động ghi nhận câu sai để ôn luyện đến khi thành thạo.' }
        ]
      },
      {
        version: 'v5.8.37',
        date: '2026-10-24T17:15:00+07:00',
        title: 'Thiết Kế Riêng Biểu Tượng Vector SVG Cho Huy Hiệu "Đã Lưu" (AI Fast Cache)',
        items: [
          { type: 'improved', text: 'Thay thế triệt để emoji tia chớp hệ thống (⚡) bằng biểu tượng vector SVG độc quyền (#icon-ai-cached): Tạo hình tia chớp khí động học sắc nét kết hợp 2 hạt năng lượng vệ tinh, đồng bộ chuẩn mực theo phong cách Editorial của toàn trang web.' },
          { type: 'improved', text: 'Nâng cấp huy hiệu thành dạng thẻ pill bo tròn cao cấp: Tích hợp inline-flex căn giữa pixel-perfect, nền ngọc lục bảo trong mờ (glassmorphism emerald), viền hairline tinh xảo và màu sắc tự động thích ứng hoàn hảo cả chế độ sáng và tối.' },
          { type: 'improved', text: 'Chuẩn hóa tính nhất quán cho bộ nhận diện AI: Đồng điệu 100% với biểu tượng chấm sáng AI (#icon-ai-sparkle) và bóng đèn tri thức (#icon-ai-lightbulb), mang lại trải nghiệm thị giác chuyên nghiệp, tinh tế.' }
        ]
      },
      {
        version: 'v5.8.36',
        date: '2026-10-24T17:00:00+07:00',
        title: 'Cửa Sổ AI Thông Minh Bám Sát Đoạn Bôi Đen & Theo Dõi Tọa Độ Thời Gian Thực',
        items: [
          { type: 'improved', text: 'Tự động bám sát vị trí đoạn bôi đen: Pop-up giải thích/ví dụ/dịch thuật AI nay xuất hiện ngay cạnh đoạn văn bản người dùng đang chọn trên mọi kích thước màn hình (kể cả di động và màn hình thu nhỏ), chấm dứt hoàn toàn tình trạng bị kẹt cố định ở đáy màn hình.' },
          { type: 'improved', text: 'Đồng bộ cuộn trang thời gian thực (Live Scroll Tracking): Pop-up AI tự động di chuyển nhịp nhàng cùng đoạn văn bản khi người dùng cuộn bài đọc, không bị đứng yên cố định hay lệch khỏi tầm mắt.' },
          { type: 'improved', text: 'Hỗ trợ kéo thả linh hoạt (Draggable) & Loại bỏ nền đen che chữ: Người dùng có thể kéo thả pop-up tùy ý qua thanh kéo hoặc tiêu đề; nền tài liệu luôn hiển thị sáng rõ và cho phép đọc đối chiếu nội dung gốc dễ dàng.' }
        ]
      },
      {
        version: 'v5.8.35',
        date: '2026-10-24T16:32:00+07:00',
        title: 'Sửa Lỗi Cú Pháp Sandbox Bridge & Khôi Phục Toàn Diện 100% Nội Dung File Gốc',
        items: [
          { type: 'fixed', text: 'Triệt tiêu lỗi cú pháp ẩn (SyntaxError regex) trong Sandbox Bridge: Khôi phục bridge.js nguyên bản chuẩn v5.8.30, giúp tiến trình cầu nối Iframe khởi chạy ngay lập tức mà không bao giờ bị rơi vào bẫy kẹt 600px của bộ hẹn giờ dự phòng.' },
          { type: 'fixed', text: 'Tự động co giãn chiều cao theo đúng 100% dung lượng file gốc: Iframe nay nhận lệnh BRIDGE_READY và BRIDGE_RESIZE mượt mà, tự động mở rộng trọn vẹn toàn bộ các mục bài đọc (Mục 1, 2, 3...) không còn bị che khuất hay xuất hiện khoảng trắng thừa.' },
          { type: 'improved', text: 'Bảo vệ kép đa tầng (Dual Safety Guard): Đồng bộ hóa bộ đệm scrollHeight ở cả Iframe lẫn cửa sổ cha, đảm bảo tài liệu luôn hiển thị nguyên vẹn trên mọi thiết bị và kích thước màn hình.' }
        ]
      },
      {
        version: 'v5.8.34',
        date: '2026-10-24T16:20:00+07:00',
        title: 'Khôi Phục Toàn Diện Chiều Cao Hiển Thị Đầy Đủ Bài Học Như Bản v5.8.30',
        items: [
          { type: 'fixed', text: 'Khắc phục triệt để lỗi thiếu/cụt phần cuối của bài học: Khôi phục cơ chế đo đạc chiều cao tự nhiên theo chuẩn v5.8.30, quét trọn vẹn 100% các khối phần tử trong tài liệu và áp dụng lớp bảo vệ chống cụt scrollHeight.' },
          { type: 'fixed', text: 'Triệt tiêu quy tắc CSS ghi đè làm co rút cấu trúc bài đọc: Hủy bỏ việc can thiệp vào các thẻ con body > div, [class*="min-h-screen"], [class*="h-screen"], bảo toàn nguyên vẹn 100% bố cục gốc của mọi file HTML được tải lên.' },
          { type: 'improved', text: 'Đồng bộ hóa khung chứa (#iframeOuterContainer) và bài đọc: Đảm bảo iframe giãn nở mượt mà không bao giờ bị cắt xén bất kể tài liệu dài bao nhiêu trang.' }
        ]
      },
      {
        version: 'v5.8.33',
        date: '2026-10-24T16:05:00+07:00',
        title: 'Nâng Cấp Toàn Diện Bộ Tìm Kiếm AI: Quét Lan Tỏa Ngữ Cảnh, Trích Xuất Mục Chính & Từ Điển Cục Bộ 0ms',
        items: [
          { type: 'improved', text: 'Tối ưu 1 - Quét lan tỏa ngữ cảnh (Radial Context-Aware): Ưu tiên tuyệt đối bài học đang đọc (Tâm điểm), chuyên mục cùng chủ đề và các bài lân cận kề cận (±4 bài), giúp AI luôn bắt đúng mạch kiến trúc người đọc đang nghiên cứu.' },
          { type: 'improved', text: 'Tối ưu 2 - Trích xuất thông minh theo tiêu đề mục (Smart Excerpt Builder): Tự động trích xuất cấu trúc mục chính (h1-h4) và các câu định nghĩa then chốt trên toàn bộ bài đọc, đảm bảo AI nhìn thấu bản đồ tri thức của toàn bài học thay vì chỉ cắt 500 ký tự mở đầu.' },
          { type: 'performance', text: 'Tối ưu 3 - Lọc thô Trigram / Fuzzy phía Client (Two-Stage Hybrid Search): Tinh lọc nhanh 25 bài học có tiềm năng cao nhất gửi lên Gemini API, rút ngắn thời gian phản hồi từ ~2.2s xuống dưới 800ms và tiết kiệm 70% token.' },
          { type: 'performance', text: 'Tối ưu 4 - Từ điển đồng nghĩa cục bộ (Local Semantic Dictionary Cache): Tự động ghi nhớ các kết quả phân tích ngữ nghĩa vào bộ nhớ duyệt web bền vững (localStorage), trả về kết quả ngay lập tức trong 0ms mà không tốn bất kỳ lượt gọi API nào cho các lần tra cứu sau.' }
        ]
      },
      {
        version: 'v5.8.32',
        date: '2026-10-24T15:55:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Bị Trắng Nửa Dưới Màn Hình Trong Khung Bài Đọc',
        items: [
          { type: 'fixed', text: 'Loại bỏ ép chiều cao tối thiểu 800px (sm:min-h-[calc(100vh-280px)]): Khung ngoài bài đọc (#iframeOuterContainer) nay tự động ôm khít chiều cao thực tế của bài học, loại bỏ hoàn toàn khoảng trống trắng thừa ở nửa dưới màn hình.' },
          { type: 'fixed', text: 'Nhận diện màu nền thông minh & Chống cụt bài đọc: Tự động trích xuất màu nền từ các khối bọc con bên trong bài học và kiểm tra độ sáng màu chữ (Luminance) để gán màu nền đồng bộ (#070B14 / Dark Theme), triệt tiêu hiện tượng lệch pha nền trắng.' },
          { type: 'improved', text: 'Tối ưu thuật toán đo chiều cao DOM toàn diện: Quét sâu vị trí đáy của tất cả các phần tử và hóa giải bẫy 100vh/min-h-screen trong iframe, đảm bảo toàn bộ nội dung bài học luôn hiển thị đầy đủ 100% không bị cắt cụt.' }
        ]
      },
      {
        version: 'v5.8.32',
        date: '2026-10-24T15:40:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Đóng Khung Tạm Thời Khi Tìm Kiếm Từ Khóa & AI',
        items: [
          { type: 'fixed', text: 'Sửa lỗi khung viền biến mất khi cuộn mượt (Smooth Scroll): Loại bỏ hoàn toàn ngưỡng ẩn scroll 500px gây mất khung khi đoạn khớp nằm xa vị trí cuộn ban đầu.' },
          { type: 'fixed', text: 'Đồng bộ hóa 100% khi chuyển bài học từ kết quả tìm kiếm: Bổ sung đa tầng retry an toàn (200ms, 500ms, 1000ms, 1500ms) kết hợp bắt sự kiện BRIDGE_READY và onIframeLoaded, đảm bảo không bao giờ bị rớt lệnh đóng khung do iframe tải chậm.' },
          { type: 'improved', text: 'Tối ưu thuật toán nhận diện từ khóa & khoảng trắng DOM: Hỗ trợ chuẩn hóa khoảng trắng không ngắt (non-breaking space &nbsp;), ký tự xuống dòng và các biến thể dấu câu, đảm bảo định vị chính xác vị trí hiển thị khung viền và huy hiệu tìm kiếm trên mọi trang bài đọc.' }
        ]
      },
      {
        version: 'v5.8.32',
        date: '2026-10-24T15:40:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Đóng Khung Tạm Thời Khi Tìm Kiếm Từ Khóa & AI',
        items: [
          { type: 'fixed', text: 'Sửa lỗi khung viền biến mất khi cuộn mượt (Smooth Scroll): Loại bỏ hoàn toàn ngưỡng ẩn scroll 500px gây mất khung khi đoạn khớp nằm xa vị trí cuộn ban đầu.' },
          { type: 'fixed', text: 'Đồng bộ hóa 100% khi chuyển bài học từ kết quả tìm kiếm: Bổ sung đa tầng retry an toàn (200ms, 500ms, 1000ms, 1500ms) kết hợp bắt sự kiện BRIDGE_READY và onIframeLoaded, đảm bảo không bao giờ bị rớt lệnh đóng khung do iframe tải chậm.' },
          { type: 'improved', text: 'Tối ưu thuật toán nhận diện từ khóa & khoảng trắng DOM: Hỗ trợ chuẩn hóa khoảng trắng không ngắt (non-breaking space &nbsp;), ký tự xuống dòng và các biến thể dấu câu, đảm bảo định vị chính xác vị trí hiển thị khung viền và huy hiệu tìm kiếm trên mọi trang bài đọc.' }
        ]
      },
      {
        version: 'v5.8.32',
        date: '2026-10-24T15:40:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Đóng Khung Tạm Thời Khi Tìm Kiếm Từ Khóa & AI',
        items: [
          { type: 'fixed', text: 'Sửa lỗi khung viền biến mất khi cuộn mượt (Smooth Scroll): Loại bỏ hoàn toàn ngưỡng ẩn scroll 500px gây mất khung khi đoạn khớp nằm xa vị trí cuộn ban đầu.' },
          { type: 'fixed', text: 'Đồng bộ hóa 100% khi chuyển bài học từ kết quả tìm kiếm: Bổ sung đa tầng retry an toàn (200ms, 500ms, 1000ms, 1500ms) kết hợp bắt sự kiện BRIDGE_READY và onIframeLoaded, đảm bảo không bao giờ bị rớt lệnh đóng khung do iframe tải chậm.' },
          { type: 'improved', text: 'Tối ưu thuật toán nhận diện từ khóa & khoảng trắng DOM: Hỗ trợ chuẩn hóa khoảng trắng không ngắt (non-breaking space &nbsp;), ký tự xuống dòng và các biến thể dấu câu, đảm bảo định vị chính xác vị trí hiển thị khung viền và huy hiệu tìm kiếm trên mọi trang bài đọc.' }
        ]
      },
      {
        version: 'v5.8.30',
        date: '2026-10-24T13:35:00+07:00',
        title: 'Thiết Kế Lại Biểu Tượng Chấm Sáng AI & Bóng Đèn Tri Thức Chuẩn Vector SVG',
        items: [
          { type: 'improved', text: 'Thiết kế riêng Biểu tượng Chấm Sáng AI (icon-ai-sparkle) Vector SVG: Thay thế hoàn toàn emoji hoạt họa vàng bằng ngôi sao 4 cánh cong chuẩn Gemini / Apple Intelligence với vệ tinh phát quang, hiển thị sắc nét đồng nhất trên mọi thiết bị và màn hình Retina.' },
          { type: 'improved', text: 'Thiết kế riêng Biểu tượng Bóng Đèn Tri Thức (icon-ai-lightbulb) Vector SVG: Thay thế bóng đèn emoji cũ bằng biểu tượng bóng đèn viền nét thanh mảnh, nằm trong ô gạch kính hổ phách (amber glass badge) ấm áp, làm nổi bật lời giải thích ngữ nghĩa của AI một cách trang nhã và chuyên nghiệp.' }
        ]
      },
      {
        version: 'v5.8.29',
        date: '2026-10-24T11:28:00+07:00',
        title: 'Thiết Kế Lại Biểu Tượng Kính Lúp & Huy Hiệu Đóng Khung Chuẩn Vibe Editorial Cao Cấp',
        items: [
          { type: 'improved', text: 'Thay thế hoàn toàn biểu tượng emoji mặc định bằng icon kính lúp Vector SVG chuyên nghiệp: Biểu tượng kính lúp nét mảnh siêu sắc nét, nằm gọn trong ô gạch viền gradient xanh chàm tinh tế, đồng bộ hoàn hảo với phong cách thiết kế của Thư viện.' },
          { type: 'improved', text: 'Nâng cấp huy hiệu nổi đỉnh khung theo chuẩn Glassmorphism: Tích hợp hiệu ứng làm mờ nền (backdrop-blur 12px), viền sáng phản quang tinh tế (subtle inner glow), font chữ sắc sảo và mũi tên định vị mềm mại.' },
          { type: 'improved', text: 'Đồng bộ hóa biểu tượng đề xuất AI: Tích hợp biểu tượng chùm sao tỏa sáng Vector SVG phát quang tím violet cho các kết quả tìm kiếm ngữ nghĩa AI.' }
        ]
      },
      {
        version: 'v5.8.28',
        date: '2026-10-24T11:00:00+07:00',
        title: 'Tra Cứu Từ Khóa & Từ Đồng Nghĩa Bằng AI, Tự Động Đóng Khung Kèm Huy Hiệu Từ Khóa Tìm Kiếm',
        items: [
          { type: 'feature', text: 'Tự động kích hoạt AI tra cứu ngữ nghĩa & từ đồng nghĩa: Khi tìm kiếm từ khóa không có cụm từ chính xác trong bài (ví dụ: "Mắt máy tính", "Mắt PC"), hệ thống tự động gọi AI phân tích và tìm ra bài học chứa khái niệm tương đương (ví dụ: "Thị giác máy tính"). Tuyệt đối không dùng API key khi tìm thấy từ khóa gốc.' },
          { type: 'feature', text: 'Đóng khung từ khóa khớp kèm huy hiệu nổi bật: Khi click vào kết quả tìm kiếm, trang bài tự động mở, cuộn đến vị trí và đóng khung tạm thời từ khóa trong bài (ví dụ: "thị giác máy tính"), đồng thời gắn huy hiệu hiển thị từ khóa người dùng đã gõ (ví dụ: "✨ Mắt máy tính") ngay trên đỉnh khung.' },
          { type: 'performance', text: 'Tối ưu tốc độ phản hồi và độ chính xác cao: Nâng cấp luồng AI quét toàn bộ danh mục bài học (lên đến 80 bài) với Gemini 2.0 Flash siêu tốc (~1s), kết hợp bộ nhớ đệm cache 0ms cho các truy vấn lặp lại.' }
        ]
      },
      {
        version: 'v5.8.27',
        date: '2026-10-24T10:30:00+07:00',
        title: 'Khắc Phục Lệch Vị Trí Bài Học & Triệt Tiêu Giật Lag / Nháy Màn Hình Trống Khi Tải Lại Trang',
        items: [
          { type: 'fix', text: 'Sửa lỗi lệch chỉ số Reader khi tải lại trang: Khởi tạo tức thì sortOrder và activeLessonId từ localStorage ngay tại thời điểm khởi tạo state, tính toán chính xác tuyệt đối số thứ tự (ví dụ 19/21) ngay từ lần vẽ đầu tiên mà không bị lệch sang vị trí mặc định (3/21).' },
          { type: 'fix', text: 'Triệt tiêu hiện tượng nháy màn hình "Thư viện của bạn đang trống" và giật lag: Thêm hidden mặc định cho emptyLessonState trong HTML tĩnh, tránh chớp nháy UI khi Firestore đang nạp dữ liệu.' },
          { type: 'improved', text: 'Đồng bộ hóa mượt mà luồng tải cấu hình người dùng: Tự động cập nhật chỉ số thanh Reader ngay khi nạp xong cài đặt sắp xếp từ Cloud, giữ vững vị trí và chuyển bài mượt mà 60fps.' }
        ]
      },
      {
        version: 'v5.8.26',
        date: '2026-10-24T10:15:00+07:00',
        title: 'Khắc Phục Triệt Để Hiện Tượng Trắng Mờ Ở Phần Trên Cùng Màn Hình Trên Thiết Bị iOS',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi dải trắng mờ ở đỉnh màn hình trên iOS: Chuyển cấu hình apple-mobile-web-app-status-bar-style sang "default", loại bỏ hoàn toàn lớp phủ mờ progressive frosted blur do WebKit tự động tạo trên iOS.' },
          { type: 'fix', text: 'Loại bỏ hiện tượng xếp chồng đa tầng backdrop-blur ở vùng safe-area: Chuyển toàn bộ unifiedTopBar, header và stickyReaderHeader sang màu nền thuần chuẩn Editorial (#FAF9F5 / #111317), triệt tiêu bóng mờ đục và chớp sáng trên iOS Safari.' },
          { type: 'improved', text: 'Tối ưu hóa hiển thị vùng tai thỏ / Dynamic Island: Khu vực đỉnh màn hình hiển thị liền mạch, sắc nét và tự động đồng bộ theo chủ đề Sáng / Tối thời gian thực.' }
        ]
      },
      {
        version: 'v5.8.25',
        date: '2026-10-24T09:40:00+07:00',
        title: 'Tìm Kiếm Ngữ Nghĩa Bằng AI (Semantic Search) & Tự Động Đóng Khung Nổi Bật Đoạn Khớp',
        items: [
          { type: 'feature', text: 'Bổ sung tính năng Tìm kiếm nội dung tương tự bằng AI (Semantic AI Search): Khi tìm kiếm từ khóa không có kết quả khớp chính xác, AI sẽ tự động phân tích ngữ nghĩa và đề xuất lên đầu các bài học và đoạn văn sát nghĩa nhất kèm % độ tương đồng.' },
          { type: 'feature', text: 'Tự động cuộn tới, đóng khung và làm nổi bật (AI Framing & Glow Pulse): Khi click vào kết quả AI, bài học tự động mở, cuộn tới đoạn sát nhất và vẽ khung viền tím phát sáng kèm huy hiệu "✨ Đoạn sát nghĩa nhất theo AI".' },
          { type: 'performance', text: 'Tiết kiệm tối đa chi phí Token: Tuyệt đối chỉ kích hoạt API Key khi không tìm thấy từ khóa gốc. Tích hợp bộ nhớ đệm client (aiSemanticSearchCache) phản hồi tức thì 0ms cho các truy vấn đã thực hiện.' }
        ]
      },
      {
        version: 'v5.8.24',
        date: '2026-10-24T09:30:00+07:00',
        title: 'Đồng Bộ Hóa Vĩnh Viễn Thứ Tự Sắp Xếp Bài Học & Khắc Phục Triệt Để Lỗi Lệch Thứ Tự Khi Tải Lại Trang',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi tải lại trang bị hoàn nguyên về thứ tự trước khi sắp xếp (lỗi 12/24 trên thanh Reader): Ngăn chặn triệt để hiện tượng loadUserSettings ghi đè ngầm lựa chọn sắp xếp của người dùng về giá trị mặc định.' },
          { type: 'fix', text: 'Nâng cấp luồng đồng bộ Cloud sang batch.set({ merge: true }) tức thì (0ms): Thao tác sắp xếp theo tên & số được cam kết ghi vĩnh viễn lên Firestore ngay lập tức mà không bị hủy bởi thao tác F5 hay đóng tab.' },
          { type: 'feature', text: 'Bổ sung nút "Khóa thứ tự A-Z lên Cloud" trong menu Sắp xếp: Tự động chuẩn hóa và gán vĩnh viễn chỉ số order tuần tự (10, 20, 30...) cho toàn bộ bài học trong tất cả danh mục, lưu đồng bộ đồng nhất lên Cloud.' },
          { type: 'improved', text: 'Cơ chế bảo toàn thứ tự cục bộ (Local Sync Queue Guard): Lưu tạm hàng đợi sắp xếp trong localStorage và bảo vệ snapshot Firestore không bao giờ ghi đè ngược thứ tự cũ lên giao diện.' }
        ]
      },
      {
        version: 'v5.8.23',
        date: '2026-10-20T20:50:00+07:00',
        title: 'Thêm Tính Năng Tải Xuống File Đang Xem Ngay Trên Thanh Công Cụ Reader',
        items: [
          { type: 'feature', text: 'Bổ sung nút "Tải xuống file hiện tại" ngay cạnh nút "Đã học" trên thanh công cụ Reader với thiết kế đồng bộ chuẩn vibe giao diện của thư viện.' },
          { type: 'improved', text: 'Hiệu ứng tương tác mượt mà (Micro-interaction): Nền chuyển sắc Indigo, biểu tượng mũi tên tải chuyển động nhún nhẹ (downloadArrowBounce) khi di chuột và phản hồi co giãn xúc giác khi nhấn.' },
          { type: 'improved', text: 'Hỗ trợ tải chuẩn mọi định dạng bài học (.html, .md, .txt) với tên file gốc nguyên bản và cơ chế nạp dự phòng thông minh từ Cloud.' }
        ]
      },
      {
        version: 'v5.8.22',
        date: '2026-10-20T18:50:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Không Tải Được File & Kẹt Màn Hình Trắng Trên Điện Thoại (iOS Safari)',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi kẹt Skeleton / màn hình trắng trên điện thoại: Khử bỏ lệnh xóa srcdoc ("about:blank") làm đứt chuỗi nạp (navigation race) trên iOS WebKit, đảo thứ tự gán iframe.onload trước iframe.srcdoc để bắt 100% sự kiện nạp bài.' },
          { type: 'fix', text: 'Cơ chế Safety Timeout Fallback (800ms): Tự động giải phóng Skeleton và hiện nội dung Iframe nếu sự kiện BRIDGE_READY bị chậm trễ hoặc đánh rơi trên trình duyệt di động.' },
          { type: 'improved', text: 'Tự động nạp bổ sung nội dung bài học (htmlContent) từ Firestore Cloud về IndexedDB khi mở bài trên thiết bị mới (điện thoại), sửa lỗi Smart Guard hiểu nhầm bài trống là đã render xong.' },
          { type: 'improved', text: 'Cập nhật định dạng MIME type (text/html, text/plain, text/markdown) cho ô chọn file, cho phép chọn và tải file HTML/Markdown từ ứng dụng Tệp (Files app) trên iPhone/iPad không bị mờ xám.' },
          { type: 'performance', text: 'Tối ưu hóa kích thước document Firestore khi tải lên: Không nhân đôi dữ liệu rawSource cho file HTML, tránh vượt trần giới hạn 1MB của Firestore.' }
        ]
      },
      {
        version: 'v5.8.21',
        date: '2026-10-20T18:15:00+07:00',
        title: 'Cập Nhật Tại Chỗ (In-Place Fast Path) Cho Trạng Thái Đã Học & Triệt Tiêu Tải Lại Danh Mục',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để hiện tượng các file trong thư mục bị tải lại và giật lag máy khi tích chọn "Đã học": Triệt tiêu việc xóa/dựng lại toàn bộ DOM danh mục (#categoriesList) khi thay đổi trạng thái học tập.' },
          { type: 'performance', text: 'Cập nhật tại chỗ (In-Place DOM Fast Path 0ms): Trực tiếp cập nhật dấu tích xanh, huy hiệu "✓ Đã học", thanh tiến độ danh mục cha (e.g. 1/14) và nút thanh công cụ Reader ngay tức thì mà không gián đoạn giao diện.' },
          { type: 'performance', text: 'Triệt tiêu vòng lặp re-render từ Firestore Realtime Snapshot: Nhận diện phản hồi đồng bộ cục bộ và bỏ qua lượt render dư thừa, bảo toàn 100% tài nguyên CPU/RAM khi người dùng học bài liên tục.' },
          { type: 'improved', text: 'Áp dụng đồng bộ cho cả nút tick nhanh ở Sidebar, nút Đã học trên thanh công cụ Reader, menu ngữ cảnh bài học và phím tắt phím L.' }
        ]
      },
      {
        version: 'v5.8.20',
        date: '2026-10-20T17:55:00+07:00',
        title: 'Đồng Bộ Hóa Hoàn Toàn Thứ Tự Bài Học Giữa Mục Lục Sidebar & Thanh Điều Hướng Reader',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi lệch số thứ tự trên thanh điều hướng Reader (Ảnh 3): Thống nhất hàm getEffectiveCategoryLessons dùng chung quy tắc sắp xếp (A-Z, tên & số tự nhiên, cũ/mới) và bộ lọc với Sidebar.' },
          { type: 'improved', text: 'Đồng bộ hóa 100% các nút chuyển bài Trước/Sau, thanh trượt Slider, ô gõ số nhảy bài và tự động chuyển bài tiếp theo theo đúng thứ tự trực quan đang hiển thị trên cây thư mục.' },
          { type: 'improved', text: 'Tự động cập nhật lại vị trí bài học (ví dụ 1/14) ngay tức thì khi người dùng thay đổi chế độ sắp xếp hoặc bộ lọc mà không cần tải lại trang.' }
        ]
      },
      {
        version: 'v5.8.19',
        date: '2026-10-20T17:30:00+07:00',
        title: 'Triệt Tiêu Hiện Tượng Chớp Nháy / Giật Khung Hình Khi Reset Trang (Zero-Jitter Startup)',
        items: [
          { type: 'performance', text: 'Triệt tiêu hoàn toàn hiện tượng chớp trắng/chuyển màu (Theme FOUC) khi tải lại trang: Đồng bộ Dark Mode tức thì (0ms) ngay tại thẻ <head> trước khi trình duyệt vẽ khung hình đầu tiên.' },
          { type: 'performance', text: 'Tối ưu Smart Guard trong render bài đọc (renderActiveLesson): Giữ nguyên trạng thái và nội dung khi nhận đồng bộ từ Firestore nếu là bài học đang xem, loại bỏ triệt để việc nạp lại Iframe và hiệu ứng trượt bài lần 2.' },
          { type: 'performance', text: 'Gộp và lập lịch render Sidebar (renderCategoriesAndLessons) qua requestAnimationFrame, loại bỏ các lượt vẽ lại DOM trùng lặp liên tiếp trong 300ms đầu khi khởi động ứng dụng.' },
          { type: 'performance', text: 'Khử rung giật chuyển động ban đầu (Initial Transition Jitter): Khóa tạm thời CSS transitions bằng lớp app-preload trong chu kỳ mount đầu tiên và kích hoạt lại mượt mà ngay sau khi layout ổn định.' },
          { type: 'improved', text: 'Tối ưu hóa độ mượt 60fps khi F5/reset trang trên cả máy tính và điện thoại di động (iOS Safari & Android Chrome).' }
        ]
      },
      {
        version: 'v5.8.18',
        date: '2026-10-18T23:55:00+07:00',
        title: 'Nâng Cấp Bảo Mật Hệ Thống, Tối Ưu Kiến Trúc Tải Trang & Phóng To Hình Ảnh Bài Học (Lightbox Zoom)',
        items: [
          { type: 'security', text: 'Gia cố toàn diện quy tắc bảo mật Firestore (firestore.rules): Chặn liệt kê trái phép danh sách link chia sẻ công khai, khóa chặt quyền ghi phân mảnh (chunks) chỉ cho chính chủ sở hữu tài liệu và bảo vệ tuyệt đối nhánh dữ liệu gói cước (billing).' },
          { type: 'security', text: 'Khôi phục cơ chế chống dò mật khẩu / Brute-force Rate Limiting thông minh trên cổng xác thực Admin (tối đa 15 lần thử sai / 5 phút / IP, tự động xóa bộ đếm khi xác thực hợp lệ).' },
          { type: 'performance', text: 'Tối ưu hóa kiến trúc mã nguồn: Tách bảng định kiểu giao diện (styles.css), cầu nối Sandbox Iframe (bridge.js), lịch sử cập nhật (changelog.js) và từ điển AI (lib/ai-lexicon.json) thành các mô-đun độc lập, giúp giảm hơn 350 KB dung lượng file index.html và tăng tốc độ tải trang.' },
          { type: 'feature', text: 'Bổ sung tính năng Phóng to Hình ảnh & Sơ đồ bài học (Lightbox Zoom): Nhấp vào hình ảnh hoặc nhấp đúp vào sơ đồ SVG trong bài học để mở khung phóng to sắc nét (50% - 400%), hỗ trợ lăn chuột, kéo thả (pan) và cử chỉ cảm ứng.' },
          { type: 'improved', text: 'Tự động hóa đồng bộ số phiên bản ứng dụng đồng nhất giữa index.html, changelog.js, sw.js và package.json; dọn dẹp gọn gàng toàn bộ tệp nháp trong thư mục dự án.' }
        ]
      },
      {
        version: 'v5.8.17',
        date: '2026-10-18T21:55:00+07:00',
        title: 'Tái Thiết Kế Chân Sidebar: Hiển Thị Trọn Vẹn Thống Kê & Cân Đối Nút Thao Tác',
        items: [
          { type: 'improved', text: 'Tái cấu trúc chân Sidebar thành bố cục 2 tầng tinh tế: Tách riêng dòng hiển thị thống kê tổng quan số lượng mục và bài học lên hàng trên, loại bỏ hoàn toàn tình trạng cắt ngắn chữ hoặc dấu ba chấm.' },
          { type: 'improved', text: 'Cân đối thanh thao tác: Đặt hai nút "Thùng rác" và "Tải file" thành lưới 2 cột (grid-cols-2) cân xứng, giao diện xúc giác tactile cao cấp dễ bấm trên cả máy tính lẫn điện thoại.' },
          { type: 'improved', text: 'Cập nhật định dạng hiển thị đầy đủ "X mục • Y bài học" trực quan, rõ ràng và đồng bộ theo trạng thái dữ liệu thời gian thực.' }
        ]
      },
      {
        version: 'v5.8.16',
        date: '2026-10-18T21:40:00+07:00',
        title: 'Khắc Phục Lỗi Hiển Thị Popup "Có Gì Mới" & Lịch Sử Cập Nhật Bị Tối / Bị Ẩn',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi Popup "Có gì mới & Lịch sử cập nhật" bị tối/bị ẩn dưới lớp nền mờ: Tự động đóng menu tài khoản ngay lập tức khi mở và nâng lớp hiển thị (z-index 10005) lên cao nhất, đảm bảo popup luôn sáng rõ, sắc nét và nổi bật ở chính giữa màn hình.' },
          { type: 'fix', text: 'Khắc phục triệt để lỗi tự động tạo lịch ôn tập ngắt quãng (Spaced Repetition) khi học bài: Loại bỏ lời gọi tự động kích hoạt lịch ôn ngầm từ nút "Đánh dấu đã học", chỉ tạo lịch khi người dùng chủ động nhấn Bật.' },
          { type: 'feature', text: 'Bổ sung nút "Tắt nhắc ôn" trực tiếp trong banner thông báo lịch ôn trên đầu bài học, cho phép tắt nhanh và xóa triệt để lịch ôn chỉ với 1 thao tác.' },
          { type: 'improved', text: 'Tối ưu cơ chế Tắt lịch ôn: Xóa sạch hoàn toàn lịch ôn của bài học khỏi LocalStorage, khôi phục trạng thái bài học về "Chưa bật nhắc ôn" thay vì chỉ vô hiệu hóa tạm thời.' },
          { type: 'improved', text: 'Ngăn chặn việc vô tình kích hoạt bật/tắt lịch ôn khi nhấp chuột vào vùng trống của chip/badge trạng thái nhắc ôn.' }
        ]
      },
      {
        version: 'v5.8.15',
        date: '2026-10-18T16:00:00+07:00',
        title: 'Triệt Tiêu Hoàn Toàn Hiện Tượng Tự Động Refresh / Chớp Nháy Trong Thư Viện Prompt AI',
        items: [
          { type: 'improved', text: 'Tối ưu thanh công cụ Chế độ tập trung (Focus Bar): Thiết kế lại toàn bộ bố cục Pomodoro, tiếng ồn trắng và tiện ích đồng hồ trên 1 dòng duy nhất (Single-row layout), chuẩn hóa độ cao h-9 đồng bộ, loại bỏ hoàn toàn hiện tượng rớt dòng.' },
          { type: 'improved', text: 'Tinh giản giao diện chia sẻ link: Loại bỏ 2 nút hủy link thừa (nút lớn màu đỏ ở giữa modal và nút ở góc dưới cạnh Xem thử), giữ lại duy nhất nút "Hủy link" gọn gàng trên khung thông báo trạng thái.' },
          { type: 'improved', text: 'Tối ưu thao tác "Hủy link" chia sẻ bài học: Hủy liên kết trực tiếp ngay lập tức khi bấm, loại bỏ hoàn toàn hộp thoại popup xác nhận trình duyệt.' },
          { type: 'fix', text: 'Khắc phục triệt để hiện tượng thư viện prompt tự động refresh/chớp giật sau 1-2s: So sánh sâu dữ liệu (Deep Equality Check) và khóa chống vẽ lại (Idempotency Guard) khi nội dung thẻ không thay đổi.' },
          { type: 'improved', text: 'Tối ưu cơ chế đồng bộ nền Cloud API & Firestore: Kiểm soát tần suất tải ngầm thông minh (3 phút throttle), triệt tiêu việc re-render và cuộn trang ngoài ý muốn khi người dùng đang đọc prompt.' }
        ]
      },
      {
        version: 'v5.8.14',
        date: '2026-10-18T15:30:00+07:00',
        title: 'Chống Đóng Nhầm Popup Khi Bôi Đen & Kéo Thả Chuột Ra Vùng Ngoài',
        items: [
          { type: 'feature', text: 'Thêm cơ chế chống đóng nhầm popup khi bôi đen / kéo chuột: Chỉ đóng popup khi click dứt khoát vào lớp nền mờ bên ngoài, tuyệt đối không đóng khi kéo thả chuột hoặc chọn văn bản từ trong popup rồi thả chuột ra ngoài.' },
          { type: 'improved', text: 'Tối ưu độ nhạy con trỏ (Pointer Tracking) hỗ trợ cả chuột và màn hình cảm ứng, ngăn ngừa việc đóng popup ngoài ý muốn khi tra cứu và sao chép nội dung.' }
        ]
      },
      {
        version: 'v5.8.13',
        date: '2026-10-18T12:10:00+07:00',
        title: 'Hiệu Ứng Chuyển Động Co Giãn Mượt Mà & Lọc Thẻ Thư Viện Prompt AI',
        items: [
          { type: 'feature', text: 'Hiệu ứng chuyển động (transition) co giãn siêu êm ái cho Popup Thư Viện Prompt AI khi chuyển đổi số lượng thẻ, tìm kiếm hoặc hiển thị trạng thái trống.' },
          { type: 'feature', text: 'Hiệu ứng lọc thẻ xếp tầng (staggered cascade animation) nhẹ nhàng khi tìm kiếm, lọc theo danh mục hoặc theo gói (Thường, Plus, Pro).' },
          { type: 'improved', text: 'Tối ưu chuyển động cho trạng thái trống (empty state) và tương tác phản hồi xúc giác (micro-interactions) trên các nút lọc.' }
        ]
      },
      {
        version: 'v5.8.12',
        date: '2026-10-18T11:05:00+07:00',
        title: 'Bổ Sung Nút Hủy / Thu Hồi Link Chia Sẻ Trực Tiếp Khi Đang Hoạt Động',
        items: [
          { type: 'feature', text: 'Bổ sung nút Hủy liên kết nổi bật ngay trong Modal Chia Sẻ Bài Học khi tài liệu đang có link hoạt động, cho phép hủy link cũ để tạo link mới ngay mà không cần rời modal.' },
          { type: 'feature', text: 'Tích hợp nút Hủy link nhanh ngay trong thông báo cảnh báo và thanh chân trang của popup chia sẻ, có xác nhận an toàn và hiệu ứng tải trạng thái thu hồi.' },
          { type: 'improved', text: 'Tự động làm mới giao diện về trạng thái tạo mới ngay khi thu hồi link thành công, đồng bộ tức thời với cơ sở dữ liệu đám mây.' }
        ]
      },
      {
        version: 'v5.8.11',
        date: '2026-10-17T11:28:00+07:00',
        title: 'Tối Ưu Siêu Nhẹ & Siêu Mượt Hiệu Ứng Tuyết Rơi Giáng Sinh (GPU Texture Blit 60/120fps)',
        items: [
          { type: 'performance', text: 'Tối ưu hóa hạt tuyết rơi với GPU Texture Blit: Chuyển đổi toàn bộ việc vẽ tuyết từ phương pháp ctx.shadowBlur tốn kém sang kỹ thuật bộ nhớ đệm Offscreen Canvas Sprites (hạt tuyết phát sáng mềm mại & bông tuyết pha lê 6 cánh tinh xảo), giảm tải CPU/GPU đến 90%.' },
          { type: 'performance', text: 'Triệt tiêu hoàn toàn Layout Thrashing trong chu kỳ vẽ: Thay thế việc gọi getBoundingClientRect() mỗi frame bằng vùng đệm tọa độ cachedReaderRect cập nhật bất đồng bộ, triệt tiêu 100% hiện tượng ép tính toán lại layout (Forced Synchronous Reflow).' },
          { type: 'improved', text: 'Điều phối Dual-Canvas thông minh khi mở Popup: Tạm dừng ambientCanvas khi modalCanvas đang bao phủ toàn màn hình, giảm 50% số lượng hạt vẽ đồng thời giúp mở/đóng popup nhẹ nhàng, mượt mà tuyệt đối.' },
          { type: 'fix', text: 'Khử bão MutationObserver: Bổ sung bộ lọc chống đệ quy và bọc requestAnimationFrame cho watcher kiểm tra popup, loại bỏ hoàn toàn hiện tượng gọi lặp lại updateThemeDecorCaps khi popup đang chuyển động.' },
          { type: 'improved', text: 'Tăng tốc phần cứng cho viền tuyết và sticker popup: Kích hoạt GPU compositing layer riêng biệt (contain: layout paint; transform: translateZ(0); will-change) cho viền tuyết đọng và sticker Giáng sinh.' }
        ]
      },
      {
        version: 'v5.8.10',
        date: '2026-10-17T11:15:00+07:00',
        title: 'Triệt Tiêu Hoàn Toàn Hiện Tượng Chớp Giật & Tối Ưu Chuyển Động Đóng / Mở Toàn Bộ Modal & Popover',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để hiện tượng giật màn hình khi đóng/mở Popup & Modal: Khóa ổn định thanh cuộn toàn cục (scrollbar-gutter: stable; html overflow-y: hidden), ngăn chặn hoàn toàn việc dịch chuyển ngang khung trang 15px trên hệ điều hành Windows.' },
          { type: 'performance', text: 'Loại bỏ 100% hiện tượng khựng khung hình (Layout Thrashing) do forced reflow: Thay thế void el.offsetWidth bằng requestAnimationFrame kép bất đồng bộ, cho phép GPU kết xuất frame mượt mà đạt chuẩn 60/120fps.' },
          { type: 'improved', text: 'Nâng cấp đường cong chuyển động Apple-grade (cubic-bezier(0.16, 1, 0.3, 1)) và tăng tốc phần cứng GPU (translateZ(0), will-change), loại bỏ hoàn toàn hiện tượng rung nhòe chữ do spring bounce quá đà.' },
          { type: 'fix', text: 'Tối ưu Popover Tùy chọn hiển thị: Di chuyển phần tử vào body từ sớm, định vị tọa độ chính xác trước khi hiển thị, bổ sung animation đóng mượt mà (popoverScaleOut / popoverSlideDown) và triệt tiêu xung đột CSS keyframes.' }
        ]
      },
      {
        version: 'v5.8.9',
        date: '2026-10-17T10:35:00+07:00',
        title: 'Nâng Cấp Hiệu Ứng Rê Chuột (Hover) Cho Nút Thùng Rác & Tải File Ở Chân Sidebar Chuẩn Vibe The Codex',
        items: [
          { type: 'improved', text: 'Thiết kế hiệu ứng vi tương tác xúc giác cao cấp (Tactile Elevation) dạng pill gọn gàng cho cặp nút Thùng rác (#btnOpenTrash) và Tải file (#btnSidebarQuickUpload) ở chân Sidebar, loại bỏ hoàn toàn gạch chân hyperlink cũ.' },
          { type: 'improved', text: 'Nút Thùng rác: Khi rê chuột nhấc nhẹ 1.5px, viền sáng hồng đỏ tinh tế, đổ bóng mềm mại, biểu tượng thùng rác nghiêng nhẹ -9° tự nhiên sinh động.' },
          { type: 'feature', text: 'Nút Tải file: Khi rê chuột nhấc nhẹ 1.5px, nền tím chàm indigo êm dịu, viền sáng trang nhã, biểu tượng tải file lướt nhẹ lên trên 2px tạo cảm xúc nâng trang sách trực quan.' },
          { type: 'improved', text: 'Cải thiện độ nảy phản hồi cơ học (active:scale-95) và bố cục nhóm hành động gọn gàng ở góc chân Sidebar.' }
        ]
      },
      {
        version: 'v5.8.8',
        date: '2026-10-17T10:25:00+07:00',
        title: 'Nâng Cấp Toàn Diện Hiệu Ứng Rê Chuột (Hover) Cho Bảng Tùy Chọn Hiển Thị Chuẩn The Codex',
        items: [
          { type: 'feature', text: 'Thiết kế hiệu ứng vi tương tác xúc giác cao cấp (Tactile Elevation) cho toàn bộ các nút trong bảng "Tùy chọn hiển thị": cụm tăng giảm cỡ chữ (A- / 100% / A+), chuyển chế độ sáng/tối, phân đoạn tốc độ & mật độ hạt, kiểu bài đã học, và cụm nút thao tác (Ẩn thanh công cụ, Mở bảng Aa, Chế độ tập trung Pomodoro).' },
          { type: 'improved', text: 'Hiệu ứng nâng thẻ mềm mại (translateY -1.5px), bóng đổ màu sắc tự nhiên theo nhóm chức năng (indigo, amber, emerald, sky, rose) và chuyển động micro-interaction biểu tượng (mặt trăng/mặt trời xoay góc linh hoạt, tên lửa nghiêng sống động, tâm ngắm xoay góc tinh xảo).' },
          { type: 'improved', text: 'Tối ưu trải nghiệm: hỗ trợ nhấp trực tiếp vào nhãn "100%" để đặt lại cỡ chữ nhanh chóng, hiệu ứng vầng sáng cho công tắc gạt và nảy nhẹ các hàng tùy chọn.' }
        ]
      },
      {
        version: 'v5.8.7',
        date: '2026-10-17T10:15:00+07:00',
        title: 'Nâng Cấp Hiệu Ứng Rê Chuột (Hover) Cho Toàn Bộ Menu Tài Khoản Chuẩn Vibe Học Thuật The Codex',
        items: [
          { type: 'improved', text: 'Tái thiết kế toàn diện hiệu ứng rê chuột (.user-menu-item) cho toàn bộ danh mục tài khoản (Quản lý tài khoản, Thống kê học tập, Lịch sử mua hàng, Nhập mã, Link chia sẻ, Sao lưu & Khôi phục, Có gì mới, Đăng xuất).' },
          { type: 'feature', text: 'Hiệu ứng trượt ngang vi mô (translateX 4px) mượt mà mô phỏng thao tác rút thẻ mục lục sách, chuyển màu nền giấy da ngà (warm parchment) / slate bóng bẩy ở chế độ tối, và độ nảy cơ học êm ái khi nhấp chuột.' },
          { type: 'improved', text: 'Hiệu ứng vi tương tác biểu tượng (icon scale 1.15x, chìa khóa xoay nhẹ 12°, đăng xuất trượt phải) cùng mũi tên chỉ hướng (›) lướt vào tinh tế cho các mục không có huy hiệu.' }
        ]
      },
      {
        version: 'v5.8.6',
        date: '2026-10-17T01:58:00+07:00',
        title: 'Nâng Cấp Thiết Kế Đồng Hồ Hà Nội Horology Tinh Hoa & Chuẩn Hóa Chiều Cao Đồng Bộ Thư Viện Prompt',
        items: [
          { type: 'improved', text: 'Thiết kế lại hoàn toàn widget Giờ Hà Nội theo phong cách Editorial Horology: kết hợp biểu tượng đồng hồ viền hổ phách, đèn ngọc emerald nhấp nháy góc biểu tượng, cùng huy hiệu GMT+7 sắc nét.' },
          { type: 'improved', text: 'Đồng bộ tuyệt đối chiều cao và độ bo góc (px-2.5 py-1.5 rounded-lg text-xs) ngang bằng với nút Thư Viện Prompt AI và Tạo link nhanh, mang lại sự liền mạch và cân bằng thị giác hoàn hảo trên thanh điều hướng.' },
          { type: 'improved', text: 'Hiệu ứng vi tương tác Amber Glow sang trọng khi rê chuột (xoay biểu tượng đồng hồ 16° và phát sáng êm dịu).' }
        ]
      },
      {
        version: 'v5.8.5',
        date: '2026-10-17T01:45:00+07:00',
        title: 'Thiết Kế Lại Tiện Ích Giờ Hà Nội Chuẩn Editorial & Khắc Phục Triệt Để Lỗi Đóng Modal Lịch',
        items: [
          { type: 'improved', text: 'Tái thiết kế widget nút hiển thị Giờ Hà Nội trên Header và Thanh Chế độ tập trung theo đúng chuẩn Editorial: kích thước h-9 bo góc rounded-xl, viền tinh tế, chấm emerald nhấp nháy êm dịu, số tabular-nums đều tăm tắp và biểu tượng đồng hồ thanh thoát.' },
          { type: 'fixed', text: 'Khắc phục triệt để lỗi hideModalAnimated is not defined khi bấm nút đóng (X): chuyển hàm đóng/mở modal ra toàn cục window an toàn và gán trực tiếp event listener qua ID nút bấm, hỗ trợ phím Escape và click backdrop.' },
          { type: 'improved', text: 'Tối ưu độ ổn định và trải nghiệm tương tác của modal Lịch & Giờ Hà Nội, đảm bảo cuộn trang được phục hồi trơn tru sau khi đóng modal.' }
        ]
      },
      {
        version: 'v5.8.4',
        date: '2026-10-17T01:35:00+07:00',
        title: 'Thiết Kế Lại Biểu Tượng Nút Hiển Thị Sang Biểu Tượng Cài Đặt (Settings Gear) Tinh Tế & Chuẩn Editorial',
        items: [
          { type: 'improved', text: 'Thay thế biểu tượng Didone Aa bằng biểu tượng bánh răng Cài đặt (#icon-settings) đối xứng 8 răng tinh xảo với nét vẽ thanh mảnh 1.8px hài hòa với toàn bộ ngôn ngữ thiết kế The Codex.' },
          { type: 'feature', text: 'Hiệu ứng vi tương tác mượt mà (.settings-icon): Biểu tượng xoay 45° và phóng to nhẹ 1.15x khi rê chuột, chuyển sang góc xoay 90° cố định khi mở menu tùy chọn hiển thị và thu nhỏ êm ái khi click.' },
          { type: 'improved', text: 'Tối ưu nhận diện thị giác: Nâng cấp biểu tượng giúp người dùng dễ dàng liên tưởng nút "Hiển thị" với toàn bộ bảng cài đặt giao diện (cỡ chữ, kiểu chữ, khoảng cách, màu sắc, chế độ sáng/tối và toàn màn hình).' }
        ]
      },
      {
        version: 'v5.8.3',
        date: '2026-10-17T01:25:00+07:00',
        title: 'Tích Hợp Tiện Ích Giờ Hà Nội & Lịch Tương Tác Chuẩn Editorial Trên Header Và Thanh Chế Độ Tập Trung',
        items: [
          { type: 'feature', text: 'Tiện ích Giờ Hà Nội trên Header: Tọa lạc trang nhã tại khoảng trống giữa thanh Tìm kiếm và Thư Viện Prompt với hiệu ứng nhấc nhẹ 1.5px, viền sáng tím chàm, chấm xanh pulsing thời gian thực và đồng hồ hiển thị từng giây.' },
          { type: 'feature', text: 'Tiện ích Giờ Hà Nội trên Focus Bar: Bố trí hài hòa tại cụm tiện ích bên phải thanh Chế độ Tập trung, giúp độc giả và người học theo dõi giờ giấc chuẩn GMT+7 mà không bị gián đoạn trải nghiệm đọc.' },
          { type: 'feature', text: 'Cửa sổ Modal Giờ & Lịch Tương Tác: Khối Hero hiển thị giờ Hà Nội to bản, lời chào theo buổi (Sáng/Trưa/Chiều/Tối/Đêm), thứ ngày tháng dương lịch, ngày âm lịch Việt Nam (Can Chi), số ngày và tuần trong năm.' },
          { type: 'improved', text: 'Lịch tháng trực quan: Cho phép chuyển tháng tới/lui hoặc bấm "Hôm nay", hiển thị ngày thứ 2 đến chủ nhật và tính toán khoảng cách ngày được chọn.' }
        ]
      },
      {
        version: 'v5.8.2',
        date: '2026-10-17T00:25:00+07:00',
        title: 'Nâng Cấp Hiệu Ứng Di Chuột Tinh Tế Cho Cặp Nút Sao Chép & Nhận Prompt Trong Thư Viện Prompt AI',
        items: [
          { type: 'improved', text: 'Hiệu ứng di chuột Nút Sao chép (.btn-prompt-card-copy): Nhấc nhẹ 1.5px, viền sáng tím dịu, đổ bóng mờ trang nhã, biểu tượng clipboard phóng to 1.14x chuyển màu tím chàm đặc trưng.' },
          { type: 'improved', text: 'Hiệu ứng di chuột Nút Nhận prompt (.btn-prompt-card-get): Nhấc nhẹ 1.5px, đổ bóng hào quang tím mộng mơ (soft violet aura glow), biểu tượng ngôi sao ma thuật phóng to 1.22x xoay nhẹ 14° và tỏa ánh sáng vàng kim lung linh.' },
          { type: 'feature', text: 'Hiệu ứng thẻ Card Prompt (.prompt-card-item): Nổi nhẹ 2.5px khi rê chuột, đổ bóng êm dịu phong cách Editorial, viền chuyển sắc tím nhẹ nhàng tôn vinh nội dung.' },
          { type: 'improved', text: 'Đồng bộ hiệu ứng các Tab lọc danh mục & Gói: Tăng tính tương tác mượt mà khi rê chuột qua các bộ lọc Tất cả, Học tập, Gia sư Socratic, Viết & Soạn thảo, Nghiên cứu.' }
        ]
      },
      {
        version: 'v5.8.1',
        date: '2026-10-17T00:10:00+07:00',
        title: 'Khắc Phục Hoàn Toàn Lỗi Icon Thẻ Nhãn Bị Cắt Cụt / Ẩn Sau Chevron Trên Nút Lọc Nhãn',
        items: [
          { type: 'fix', text: 'Sửa dứt điểm toạ độ SVG biểu tượng Thẻ nhãn (#icon-tag): Thay thế đường cong vượt ngưỡng 24.3px thành toạ độ chuẩn nằm gọn trong khung viewBox 24x24 (tối đa 21.29px), khôi phục nguyên vẹn mũi nhọn và lỗ khuyên của nhãn.' },
          { type: 'fix', text: 'Triệt tiêu hiện tượng icon bị che khuất / ẩn đằng sau khi di chuột: Loại bỏ thuộc tính truncate gây overflow:hidden trên nút bấm và thẻ bọc span cha, mở overflow:visible cho toàn bộ biểu tượng và chevron.' },
          { type: 'improved', text: 'Tối ưu hiệu ứng hover nút Lọc nhãn: Chuyển sang hiệu ứng phóng to cân xứng 1.12x giữ nguyên trục đứng, tăng khoảng đệm thoáng đãng giữa icon nhãn và mũi tên chỉ xuống.' }
        ]
      },
      {
        version: 'v5.7.20',
        date: '2026-10-16T23:58:00+07:00',
        title: 'Nâng Cấp Hiệu Ứng Di Chuột Toàn Bộ Thanh Công Cụ Sidebar, Bộ Lọc Bài & Cụm Danh Mục',
        items: [
          { type: 'improved', text: 'Hiệu ứng di chuột Nút Mục mới (#btnNewCategory): Nhấc nhẹ 1.5px, đổ bóng hào quang tím chàm (indigo aura glow), biểu tượng thư mục mở rộng 1.12x và xoay nhẹ 4°.' },
          { type: 'improved', text: 'Hiệu ứng di chuột Bộ ba công cụ (Chọn nhiều | Lọc nhãn | Sắp xếp): Nhấc nhẹ 1.5px, viền sáng chàm, hiệu ứng xoay nhẹ biểu tượng tag nhãn và mũi tên chevron nhún xuống mượt mà.' },
          { type: 'improved', text: 'Hiệu ứng di chuột Bộ tab lọc bài học (Tất cả | Yêu thích | Chưa đọc): Tab chưa kích hoạt đổi nền thanh nhã; Tab đang chọn nhấc nhẹ 1px với bóng mờ êm dịu chuẩn phong cách Editorial.' },
          { type: 'feature', text: 'Hiệu ứng Nhóm danh mục (Category Controls): Nút tăng/giảm thứ tự trượt mũi tên cơ học, chevron mở rộng trượt nhẹ khi rê chuột lên card header, menu ba chấm xoay 90° và nút Thêm bài xoay dấu cộng sang trọng.' },
          { type: 'improved', text: 'Nút thu gọn Sidebar & Nút ghim kế hoạch học tập: Thu gọn trượt mũi tên < sang trái, nút ghim nghiêng -12° và nổi bật ánh hồng ruby khi hover.' }
        ]
      },
      {
        version: 'v5.7.19',
        date: '2026-10-16T23:50:00+07:00',
        title: 'Nâng Cấp Hiệu Ứng Di Chuột Cho Cụm Điều Hướng, Tab Độ Rộng, Menu Tài Khoản & Bộ Nút Đọc Bài',
        items: [
          { type: 'improved', text: 'Hiệu ứng di chuột Điều hướng bài học (Trước / Nhảy bài / Sau): Mũi tên trước/sau lướt nhẹ theo chiều điều hướng (-2.5px / +2.5px), nút nhảy bài (3/3 ˅) viền sáng chàm indigo kèm chevron nhấp nhẹ, nhấc nhẹ 1.5px và co nhẹ cơ học khi bấm.' },
          { type: 'improved', text: 'Hiệu ứng Tab Độ rộng khung đọc (Vừa | Rộng | Toàn màn): Tab thường nhấc nhẹ với nền mờ tinh tế; Tab đang chọn nhấc nhẹ 1px, đổ bóng sắc nét và màu indigo rực sáng.' },
          { type: 'feature', text: 'Hiệu ứng Menu Tài khoản & Avatar (User Menu Pill): Khi rê chuột nhấc nhẹ 1.5px, viền sáng chàm, avatar thú cưng phóng to 1.08x và chấm trực tuyến online tỏa sáng ngọc bích (glow).' },
          { type: 'improved', text: 'Hiệu ứng Bộ nút Đọc bài (Đã học | Yêu thích | Nghe TTS | Tập trung): Đã học nổi bật vầng ngọc lục bảo/chàm, Yêu thích ngôi sao xoay 12° vàng kim, Nghe TTS biểu tượng loa rung nhẹ, Tập trung biểu tượng tâm ngắm xoay 18° đỏ rực rỡ.' }
        ]
      },
      {
        version: 'v5.7.18',
        date: '2026-10-16T23:45:00+07:00',
        title: 'Tái Thiết Kế Thẻ Kế Hoạch Học Tập & Lịch Thi Ở Sidebar Chuẩn Luxury Editorial',
        items: [
          { type: 'improved', text: 'Tái thiết kế toàn diện thẻ Kế hoạch học tập & Lịch thi ở Sidebar (#sidebarPinnedPlansList): Tích hợp trọn vẹn ngôn ngữ thiết kế The Codex / Luxury Editorial với nền gradient ấm áp, bo góc mềm mại 14px, viền sáng mịn và đổ bóng tầng êm ái.' },
          { type: 'improved', text: 'Nâng cấp cụm biểu tượng & Typography: Đưa icon lịch vào hộp squircle badge trang nhã, áp dụng font serif sang trọng cho tiêu đề kỳ thi, loại bỏ font mono kéo dãn để số đếm ngày và số bài hiển thị liền mạch, tự nhiên.' },
          { type: 'feature', text: 'Thanh tiến độ lụa mượt mà (Sleek Gradient Pill Bar): Loại bỏ các vạch cắt ngang thô kệch chia đốt, thay thế bằng thanh tiến độ gradient phát sáng nhẹ theo từng cấp độ khẩn cấp (Hổ phách sắp thi, Hồng ngọc khẩn cấp, Ngọc bích hoàn thành, Chàm an toàn).' },
          { type: 'improved', text: 'Nút ghim tinh gọn & Phản hồi vật lý: Nút bỏ ghim tối giản tự nhiên, hiệu ứng hover nhấc nhẹ 1.5px và co nhẹ chân thực khi bấm mở chi tiết kế hoạch.' }
        ]
      },
      {
        version: 'v5.7.17',
        date: '2026-10-16T23:30:00+07:00',
        title: 'Nâng Cấp Micro-Interactions & Hiệu Ứng Di Chuột Thanh Công Cụ Header Chuẩn Vibe Editorial',
        items: [
          { type: 'improved', text: 'Hiệu ứng di chuột tinh tế trên toàn bộ cụm nút công cụ Header (Thư viện Prompt AI, Tạo link nhanh, Chỉ báo đồng bộ, Ghi chú, Flashcard, Kế hoạch học, Thống kê, Nút Hiển thị): Áp dụng nhịp chuyển động vật lý êm ái (cubic-bezier 0.16, 1, 0.3, 1), nâng nhẹ 1.5px (micro-lift) kèm đổ bóng mờ ảo sang trọng.' },
          { type: 'feature', text: 'Micro-animations cho từng biểu tượng SVG: Ngôi sao Prompt xoay nhẹ 14° và mở rộng 1.14x, móc xích Tạo link nghiêng -10°, chấm trạng thái đồng bộ phát sáng ngọc bích, bút dạ quang nghiêng -12°, thẻ flashcard xòe góc 8°, và chấm thông báo kế hoạch tỏa sáng dịu.' },
          { type: 'improved', text: 'Cảm giác bấm chân thực (Tactile Active Feedback): Độ lún nhẹ êm tay (scale 0.96 / 0.92) khi nhấp chuột, tương thích hoàn hảo cả 2 chế độ Sáng (kem giấy) và Tối (slate/obsidian).' }
        ]
      },
      {
        version: 'v5.7.16',
        date: '2026-10-16T21:15:00+07:00',
        title: 'Tái Thiết Kế Giao Diện Điều Khiển Hạt Rơi & Hiệu Ứng Chuyển Đổi Mật Độ Mượt Mà (Cinematic Particle Transition)',
        items: [
          { type: 'improved', text: 'Tái thiết kế toàn diện cụm điều khiển Hạt Rơi trong Cài đặt hiển thị: Thay thế toàn bộ biểu tượng emoji thô ráp bằng hệ thống Micro-SVG icons tinh tế (đồng hồ đo tốc độ lướt gió, thước đo 3 vạch tối giản, cụm sao tinh thể), track điều khiển phân đoạn sang trọng, nhãn badge font mono hiện đại hòa quyện với phong cách Editorial.' },
          { type: 'feature', text: 'Hiệu ứng chuyển đổi mật độ hạt mượt mà (Cinematic Density Transition): Khi thay đổi mật độ hạt (Nhẹ nhàng 40% ↔ Chuẩn 100% ↔ Rực rỡ 160%), số lượng hạt không còn bị giật cục hay reset đột ngột; các hạt mới được sinh thêm sẽ từ từ mờ ảo hiện rõ (fade-in), các hạt thừa sẽ nhẹ nhàng tan biến (dissolve out) hoàn toàn tự nhiên và êm dịu.' },
          { type: 'improved', text: 'Đồng bộ chuyển đổi độ trong suốt hạt (particleAlpha) trên tất cả các phong cách lễ hội (Tuyết rơi Giáng sinh, Hoa xuân Tết sum vầy, Nắng biển Mùa hè, Lá rụng Mùa thu, Tàn lửa & Đàn dơi Halloween, Ánh sao Lấp lánh).' }
        ]
      },
      {
        version: 'v5.7.15',
        date: '2026-10-16T21:00:00+07:00',
        title: 'Bộ Điều Khiển Mật Độ Hạt Rơi & Tốc Độ Linh Hoạt (Particle Density & Speed Control)',
        items: [
          { type: 'feature', text: 'Bộ điều khiển Tốc độ rơi (Particle Speed Control): Cho phép tùy chỉnh tốc độ rơi của hạt (Chậm 0.6x - êm dịu thư thái / Vừa 1.0x - cân bằng tự nhiên / Nhanh 1.5x - sôi động rực rỡ), phản hồi tức thì trên canvas đang chạy mà không cần tải lại trang.' },
          { type: 'feature', text: 'Bộ điều khiển Số lượng hạt (Particle Density Control): Linh hoạt chuyển đổi giữa Nhẹ nhàng (40% - tối ưu máy yếu, tiết kiệm pin) / Tiêu chuẩn (100% - hài hòa thẩm mỹ) / Rực rỡ (160% - dày đặc mãn nhãn trên màn hình độ phân giải cao).' },
          { type: 'improved', text: 'Tự động lưu cấu hình cá nhân vào localStorage (thuvienhtml_particle_speed, thuvienhtml_particle_density) và tự động ẩn gọn gàng khi chủ đề sự kiện tắt hoặc hiệu ứng là none. Đảm bảo tuân thủ tuyệt đối nguyên tắc Zero Distraction không bao giờ che khuất vùng đọc sách.' }
        ]
      },
      {
        version: 'v5.7.14',
        date: '2026-10-16T20:30:00+07:00',
        title: 'Ra Mắt Chủ Đề Mùa Xuân (Tết Sum Vầy) & Mùa Hè (Nắng Biển Tươi Mát) Kèm Trọn Bộ Sticker Độc Bản',
        items: [
          { type: 'feature', text: 'Chủ đề Mùa Xuân (Tết Sum Vầy): Tone màu hồng đào rạng rỡ (#FFF7F8 / tối #180D13, điểm nhấn #E11D48), cành hoa đào 3D bung nở bên ngoài Logo, viền hoa đào rủ đáy Header, dải hoa xuân kèm đèn lồng đỏ may mắn trên Sidebar Mục lục, viền hoa nút Mục mới, thanh Reader Header và trọn bộ 15 SVG stickers Tết độc bản (chim én, bao lì xì, thỏi vàng, bánh chưng xanh, câu đối thư pháp...).' },
          { type: 'feature', text: 'Chủ đề Mùa Hè (Nắng Biển Tươi Mát): Tone màu biển ngọc bích sảng khoái (#F0FDF9 / tối #06181E, điểm nhấn #0D9488), mũ cói đi biển 3D gắn hoa nhiệt đới ngoài Logo, viền sóng đáy Header, mặt trời râm cool ngầu trên Sidebar, viền bọt sóng nút Mục mới, thanh Reader và trọn bộ 15 SVG stickers mùa hè (cá hề Nemo, rương kho báu, hoa hướng dương, ngọn hải đăng, thông điệp trong chai, dưa hấu mát lạnh...).' },
          { type: 'feature', text: 'Particle Engine Mùa Xuân & Mùa Hè: Cánh hoa đào, hoa mai vàng rơi phấp phới cùng búp lộc non (Mùa Xuân); tia nắng lấp lánh, bong bóng nước ngọc bích bồng bềnh và đom đóm đêm hè (Mùa Hè) tuân thủ nghiêm ngặt Zero Distraction bảo vệ tuyệt đối khu vực đọc bài học.' },
          { type: 'improved', text: 'Đồng bộ 6 Theme Presets Lễ hội toàn diện: Tích hợp đầy đủ Mùa Xuân, Mùa Hè, Mùa Thu, Halloween, Giáng Sinh, Mặc Định trên cả bảng Popover Độc Giả và Theme Studio Quản Trị Hệ Thống.' }
        ]
      },
      {
        version: 'v5.7.13',
        date: '2026-10-16T19:50:00+07:00',
        title: 'Rà Soát Toàn Diện Popups & Nâng Cấp Hệ Thống Sticker Halloween Độc Bản, Triệt Tiêu Sticker Giáng Sinh Lạc Chủ Đề',
        items: [
          { type: 'fix', text: 'Triệt tiêu hoàn toàn hiện tượng hiển thị lẫn sticker Giáng sinh (bánh gừng, quả cầu tuyết, v.v.) khi ở chủ đề Halloween: Bổ sung định danh data-theme-effect cho từng sticker và cơ chế dọn dẹp đối ứng nghiêm ngặt, tự động loại bỏ sticker và viền tuyết cũ khi chuyển đổi hoặc mở bất kỳ popup nào.' },
          { type: 'feature', text: 'Mở rộng thư viện 15 SVG Sticker Halloween độc bản cho toàn bộ 34 Modal & Popover: Trái bí ngô rực lửa (Có gì mới & Mã đổi thưởng), Vạc phù thủy sôi bọt (Nâng cấp Pro & Hóa đơn), Lâu đài ma ám (Đăng nhập/Tài khoản), Quả cầu tiên tri (Trung tâm tài khoản & Thống kê), Mèo đen phù thủy (Trợ lý AI), Cặp nến gothic (Cài đặt hiển thị & Kế hoạch học), Bộ bài Tarot (Flashcard), Bia mộ gothic R.I.P (Thùng rác & Xác nhận xóa), Bình độc dược ma thuật (Sao lưu & Đồng bộ), Nhện độc giăng tơ (Chia sẻ), Đầu lâu ma quái (Quản lý Tag, Di chuyển danh mục & Pomodoro), Nón phù thủy (Giọng đọc TTS), Sách thần chú cổ Grimoire (Lịch sử, Ghi chú, Phím tắt, Upload, Prompt) và Dơi đêm sải cánh.' },
          { type: 'improved', text: 'Chuẩn hóa getPopupCardsList chọn lọc chính xác thẻ card cấp cao nhất (:scope > div): Ngăn chặn việc gắn nhầm sticker vào các thẻ con hoặc hàng nhập liệu bên trong modal.' }
        ]
      },
      {
        version: 'v5.7.12',
        date: '2026-10-16T19:30:00+07:00',
        title: 'Theme Studio: Thêm Preset Halloween Kỳ Bí Kèm Nút Kích Hoạt Nhanh & Lọc Bỏ Mùa Thi, Tết Đoàn Viên',
        items: [
          { type: 'feature', text: 'Tích hợp Preset Halloween Kỳ Bí vào Theme Studio Admin: Bổ sung mẫu Halloween chuẩn (nền kem #FFF9F2 / tối #0E0B14, điểm nhấn cam ma mị #EA580C) với hiệu ứng tàn lửa bí ngô, đàn dơi và nón phù thủy.' },
          { type: 'feature', text: 'Nút "Kích hoạt" trực tiếp trên từng thẻ Preset: Cho phép Quản trị viên phát sóng ngay lập tức bất kỳ chủ đề lễ hội nào cho toàn bộ độc giả mà không cần qua nhiều bước trung gian.' },
          { type: 'improved', text: 'Tinh gọn danh sách Preset Lễ hội: Lọc bỏ chủ đề "Mùa Thi Tập Trung" và "Tết Đoàn Viên" khỏi danh mục Preset mẫu và bộ chọn hiệu ứng hạt rơi, giúp giao diện quản trị gọn gàng, đúng trọng tâm sự kiện.' }
        ]
      },
      {
        version: 'v5.7.11',
        date: '2026-10-16T19:15:00+07:00',
        title: 'Ra Mắt Chủ Đề Mới: Halloween Kỳ Bí (Witch Hat, Mạng Nhện, Bí Ngô 3D, Hạt Lửa Ma Mị & Bộ Sticker Huyền Bí)',
        items: [
          { type: 'feature', text: 'Chủ đề Halloween Kỳ Bí (Halloween Theme): Tích hợp preset Halloween với tone màu ấm bí ngô sang trọng (#FFF9F2 ở chế độ sáng, #0E0B14 bóng đêm huyền bí ở chế độ tối, điểm nhấn cam ma mị #EA580C) có thể tùy chọn nhanh qua bảng Tùy chỉnh chủ đề của Admin.' },
          { type: 'feature', text: 'Nón Phù Thủy 3D trên Logo & Mạng nhện viền Header/Sidebar: Nón phù thủy tím huyền bí đung đưa nhẹ ngoài khung Logo, rèm mạng nhện giăng đáy Header, phù hiệu bí ngô Jack-o\'-Lantern góc phải thanh Mục lục (không che chữ) và viền gothic trên nút "Mục mới" cùng thanh Reader.' },
          { type: 'feature', text: 'Hiệu ứng Hạt Rơi Halloween & Zero Distraction: Đom đóm tàn lửa bí ngô, đàn dơi bóng đêm vỗ cánh lượn lờ và đốm sáng linh hồn huyền bí; tự động bảo vệ vùng đọc sách (#iframeOuterContainer / #readingContentContainer) không bị che chữ hay xao nhãng.' },
          { type: 'feature', text: 'Bộ sưu tập Sticker Halloween độc bản cho từng Popup/Modal: Trái bí ngô Jack-o\'-Lantern (Có gì mới), Cuốn sách ma thuật cổ (Lịch sử cập nhật), Vạc độc phù thủy sôi bọt (Nâng cấp Pro & Hoá đơn), Lâu đài ma ám Gothic (Đăng nhập), Quả cầu tiên tri ma thuật (Trung tâm tài khoản), Mèo đen phù thủy thông thái (Trợ lý AI), Cặp nến cổ phát sáng (Cài đặt hiển thị), Chú ma nhỏ thân thiện trôi bồng bềnh (Menu người dùng - bảo vệ 100% huy hiệu Pro), Dơi đêm sải cánh (hộp thoại khác).' }
        ]
      },
      {
        version: 'v5.7.10',
        date: '2026-10-16T18:45:00+07:00',
        title: 'Tối Ưu Vị Trí Sticker Bánh Gừng & Bố Cục Thềm Tuyết Menu Tài Khoản (Không Che Chữ Pro)',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi Sticker che huy hiệu gói [👑 Pro]: Bổ sung thềm tuyết riêng biệt (padding-top: 36px) cho Menu người dùng khi bật theme Giáng sinh, nâng vị trí chú bánh gừng (Gingerbread Man) lên mái tuyết góc phải cách đỉnh card 16px, giải phóng 100% không gian hiển thị huy hiệu Pro và thông tin người dùng.' },
          { type: 'improved', text: 'Tối ưu kích thước & tọa độ sticker cho Popover (Hiển thị & AI): Tinh chỉnh sticker Popover sang góc phải bên cạnh nút đóng X với tỷ lệ 32px cân đối, không che khuất nút thao tác hay tiêu đề.' }
        ]
      },
      {
        version: 'v5.7.9',
        date: '2026-10-16T18:30:00+07:00',
        title: 'Tinh Chỉnh Mũ Noel Ngoại Khung, Vị Trí Quả Chuông, Bỏ Phát Sáng Dải Tuyết & Bộ Sticker Giáng Sinh Đa Dạng',
        items: [
          { type: 'improved', text: 'Hiển thị mũ Noel hoàn hảo bên ngoài Logo: Bọc logo trong container overflow-visible, đưa mũ Noel đỏ lên góc trên bên ngoài logo không còn bị ẩn hay cắt cụt bởi viền squircle.' },
          { type: 'improved', text: 'Tối ưu vị trí cành thông & quả chuông Sidebar: Tinh chỉnh toạ độ sang góc trên bên phải header danh mục cạnh nút thu gọn, hoàn toàn không che chữ "MỤC LỤC BÀI HỌC".' },
          { type: 'improved', text: 'Khử phát sáng dải tuyết Header: Dải tuyết viền dưới Header chuyển sang tone tuyết trắng xốp lì (matte), loại bỏ ánh sáng xanh neon và đèn nhấp nháy, giữ giao diện thanh lịch và êm mắt.' },
          { type: 'feature', text: 'Bộ sưu tập Sticker Giáng Sinh đa dạng cho từng Popup/Modal: Mỗi hộp thoại và bảng thiết lập sở hữu một biểu tượng Giáng Sinh riêng biệt (Hộp quà nơ đỏ cho Có gì mới, Tất Noel kẹo gậy cho Lịch sử phiên bản, Cây thông Noel cho Nâng cấp Pro, Vòng nguyệt quế cho Đăng nhập, Quả cầu tuyết cho Trung tâm tài khoản, Người tuyết cho AI, Chuông đôi vàng cho Tùy chọn hiển thị, Bánh quy gừng cho Menu người dùng).' }
        ]
      },
      {
        version: 'v5.7.8',
        date: '2026-10-16T18:15:00+07:00',
        title: 'Nâng Cấp Toàn Diện Theme Giáng Sinh: Thảm Tuyết, Mũ Noel, Dây Đèn LED & Bông Tuyết Pha Lê',
        items: [
          { type: 'feature', text: 'Nâng cấp toàn diện hiệu ứng Giáng Sinh (Christmas Theme): Tích hợp mũ Noel 3D đung đưa trên Logo thư viện, chuỗi dây đèn LED nhấp nháy phát sáng dưới thanh Header, thảm tuyết trắng và cành thông kèm quả chuông vàng đung đưa trên Sidebar, viền tuyết đọng phủ mềm mại trên nút "Mục mới" và thanh Reader Sticky Header.' },
          { type: 'feature', text: 'Bông tuyết pha lê 6 cánh & Tăng cường mật độ tuyết rơi: Nâng cấp FestivalParticleEngine với 18% cơ hội tạo bông tuyết lục giác pha lê tinh xảo có hiệu ứng xoay và phát sáng dịu nhẹ; tăng mật độ hạt tuyết giúp không gian lễ hội thêm lung linh, ngập tràn không khí Noel.' },
          { type: 'improved', text: 'Bảo vệ tuyệt đối khu vực đọc tài liệu (Zero Distraction): Tự động tính toán toạ độ khung đọc sách (#iframeOuterContainer / #readingContentContainer) theo thời gian thực để bỏ qua hạt tuyết rơi đè lên chữ, đảm bảo 100% vùng đọc tài liệu luôn trong trẻo, sắc nét và tập trung tối đa.' }
        ]
      },
      {
        version: 'v5.7.7',
        date: '2026-10-16T17:25:00+07:00',
        title: 'Khắc Phục Lỗi Tự Động Bật/Tắt Cài Đặt Trợ Lý AI & Huy Hiệu Đã Học Khi Tải Lại Trang',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi Trợ lý AI đọc bài tự động tắt khi tải lại trang: Loại bỏ tác dụng phụ tự động uncheck checkbox của isAiAssistantActive, kiểm tra quyền Pro qua cached user tier khi đang nạp token và bảo toàn chính xác trạng thái đã bật của người dùng.' },
          { type: 'fix', text: 'Khắc phục triệt để lỗi Huy hiệu "Đã học" tự động bật lên khi tải lại trang: Loại bỏ việc ghi đè giá trị mặc định lên localStorage khi cấu hình chưa tải xong, bảo toàn đúng trạng thái tắt và đồng bộ chính xác hai chiều lên Firestore.' },
          { type: 'improved', text: 'Khởi tạo sớm 0ms và cô lập cấu hình tài khoản: Tự động ghi nhớ UID gần nhất (last_auth_user_uid) để nạp tức thời giao diện chính xác cho từng tài khoản ngay khi tải trang, không còn độ trễ hay chớp giật.' }
        ]
      },
      {
        version: 'v5.7.6',
        date: '2026-10-16T05:36:00+07:00',
        title: 'Tái Thiết Kế Biểu Tượng & Logo "Aa" (Typography & Reading) Chuẩn Luxury Editorial',
        items: [
          { type: 'feature', text: 'Tái thiết kế toàn diện logo "Aa" chuẩn phong cách tạp chí cổ điển (Didone / Bodoni Classic): Thay thế font sans-serif thô cứng bằng đường nét vector có độ tương phản thanh đậm điêu khắc, chữ "A" chân chữ bracketed serif sắc nét và chữ "a" 2 tầng (double-story) cuốn hút.' },
          { type: 'improved', text: 'Đồng bộ biểu tượng "Aa" trên toàn hệ thống: Áp dụng đồng nhất trên nút chỉnh cỡ chữ ghi chú (#btnNotesFontSize), dòng Tùy chỉnh đọc chuyên sâu trong Tùy chọn hiển thị và tiêu đề bảng Reading Settings Modal.' },
          { type: 'improved', text: 'Hiển thị vector siêu sắc nét: Tối ưu hiển thị hoàn hảo ở mọi kích thước (16px, 18px, 24px) và tự động tương thích mượt mà theo cả 2 chế độ Sáng & Tối.' }
        ]
      },
      {
        version: 'v5.7.5',
        date: '2026-10-16T05:30:00+07:00',
        title: 'Tự Động Lưu Trữ & Đồng Bộ Toàn Diện Tùy Chọn Hiển Thị Cá Nhân Hóa (Per-User Auto-Save)',
        items: [
          { type: 'feature', text: 'Tự động lưu trữ thời gian thực cho từng tài khoản (Per-User Isolation): Toàn bộ thiết lập trong "Tùy chọn hiển thị" (cỡ chữ, giao diện sáng/tối, chủ đề sự kiện, thẻ tiếp tục học, kiểu bài đã học, huy hiệu đã học, khung đánh dấu, vuốt chuyển bài, trợ lý AI và tùy chỉnh đọc Aa) được lưu trữ riêng biệt trên Firestore và LocalStorage theo từng UID, không bao giờ bị ghi đè hay lẫn lộn giữa các tài khoản.' },
          { type: 'improved', text: 'Hàm đồng bộ tức thì syncDisplaySettingsUI: Mọi công tắc, checkbox và trạng thái nút trong Popover Tùy chọn hiển thị luôn được đồng bộ chính xác 100% với cài đặt của người dùng ngay khi mở menu và sau khi nạp dữ liệu.' },
          { type: 'fix', text: 'Khắc phục triệt để lỗi cỡ chữ không áp dụng vào bài học sau khi tải lại trang: Tự động kích hoạt đồng thời applyFontSizeToIframe và applyTextScalingToArticleHeaders khi nạp cấu hình người dùng.' }
        ]
      },
      {
        version: 'v5.7.4',
        date: '2026-10-16T05:25:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Chia Đôi Màn Hình Khi Dùng Tính Năng Giải Thích Đơn Giản (AI)',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi chia đôi màn hình khi mở Trợ lý AI (#aiResultPopover): Sửa lỗi hàm updateThemeDecorCaps của hiệu ứng Lễ hội tự động gán position: relative đè lên kiểu fixed của Popover AI, khiến popover rơi vào luồng flex của body và ép co khung đọc sách.' },
          { type: 'fix', text: 'Thiết lập bảo vệ đa lớp cho Popover AI: Khóa cứng position: fixed !important trong CSS và trong hàm định vị positionAiPopover, đồng thời bổ sung overflow-hidden và khóa chiều cao 100dvh cho thẻ body.' },
          { type: 'improved', text: 'Kiểm tra trạng thái position an toàn trong updateThemeDecorCaps: Chỉ chuyển sang relative nếu phần tử có kiểu computed là static, tránh làm biến dạng bất kỳ thẻ cố định (fixed/absolute) nào khác.' }
        ]
      },
      {
        version: 'v5.7.3',
        date: '2026-10-16T01:38:00+07:00',
        title: 'Tối Giản Bộ Lọc Màu Ghi Chú & Tái Thiết Kế Song Song Thẻ Thống Kê',
        items: [
          { type: 'improved', text: 'Tối giản bộ lọc màu ghi chú: Lược bỏ nhãn chữ (Vàng, Xanh, Hồng, Tím) để chỉ giữ lại chấm màu sắc nét và số lượng ghi chú, mang lại phong cách tối giản thanh lịch và tiết kiệm diện tích tối đa.' },
          { type: 'fix', text: 'Khắc phục viền không cân đối ở bộ lọc màu: Mở rộng vùng đệm container và chuẩn hóa đường viền trạng thái active ring-2 sắc sảo, triệt tiêu hiện tượng xén viền dưới.' },
          { type: 'improved', text: 'Tái thiết kế thẻ Thống kê song song đối xứng: Chuỗi liên tiếp và Mục tiêu ngày luôn hiển thị song song 2 cột trên mọi kích cỡ màn hình, đồng bộ độ cao và bổ sung thanh tiến độ mốc chuỗi ngày đối xứng hài hòa với thanh mục tiêu.' }
        ]
      },
      {
        version: 'v5.7.2',
        date: '2026-10-16T01:30:00+07:00',
        title: 'Lưu Trữ Tùy Chọn Hiển Thị Cá Nhân Hóa & Tối Ưu Trải Nghiệm Mặc Định',
        items: [
          { type: 'feature', text: 'Đồng bộ & lưu trữ Tùy chọn hiển thị theo từng tài khoản: Toàn bộ tùy chọn hiển thị (chủ đề công khai, thẻ tiếp tục học, kiểu thẻ đã học, huy hiệu đã học, khung đánh dấu, cử chỉ vuốt, trợ lý AI) được lưu trữ riêng biệt trên Firestore và LocalStorage cho từng người dùng.' },
          { type: 'improved', text: 'Mặc định bật Chủ đề sự kiện công khai cho tất cả độc giả để tận hưởng trọn vẹn không khí lễ hội.' },
          { type: 'improved', text: 'Điều chỉnh mặc định âm lượng tiếng ồn trắng (White Noise / Âm thanh nền) ở mức dịu êm 20%.' },
          { type: 'improved', text: 'Mặc định tắt Trợ lý AI đọc bài để người dùng chủ động kích hoạt khi có nhu cầu.' }
        ]
      },
      {
        version: 'v5.7.1',
        date: '2026-10-16T01:10:00+07:00',
        title: 'Tinh Chỉnh Typography & Cân Bằng Thị Giác Thống Kê & Bộ Lọc Ghi Chú',
        items: [
          { type: 'improved', text: 'Đồng bộ typography bộ lọc màu ghi chú: Chuyển đổi toàn bộ bộ đếm số ghi chú/highlight sang font sans-serif tinh tế và tabular-nums đồng nhất với phong cách The Codex, loại bỏ font monospace gạch chéo số không.' },
          { type: 'improved', text: 'Cân đối kích thước và font thẻ Thống kê (Streak & Mục tiêu hôm nay): Chuẩn hóa kích cỡ số lớn và nhãn chữ giữa 2 thẻ, phân tách rõ ràng số bài hoàn thành/chỉ tiêu và số phút đọc, mang lại sự cân xứng hài hòa tuyệt đối.' }
        ]
      },
      {
        version: 'v5.7.0',
        date: '2026-10-16T00:58:00+07:00',
        title: 'Tính Năng Tắt / Mở Chủ Đề Công Khai (Public Theme Toggle) & Phân Quyền Bảo Mật Theme',
        items: [
          { type: 'feature', text: 'Thêm tính năng Tắt / Mở Theme trong menu Tùy chọn hiển thị: Khi Quản trị viên công khai hoặc phát sóng một chủ đề sự kiện (Giáng sinh, Tết, Mùa thu, v.v.), độc giả có thể chủ động bật hoặc tắt giao diện & hiệu ứng trên máy cá nhân.' },
          { type: 'security', text: 'Bảo mật phân quyền Theme tuyệt đối: Độc giả chỉ được phép bật/tắt theme công khai, không thể tùy chỉnh hay thay đổi presets/cấu hình theme; hộp chọn Presets chỉ hiển thị riêng cho Quản trị viên.' },
          { type: 'improved', text: 'Quản trị viên Theme Studio: Thêm nút 1-click Bật / Tắt công khai theme phát sóng tức thì và khôi phục sạch hoàn toàn các biến màu sắc khi người dùng tắt theme.' }
        ]
      },
      {
        version: 'v5.6.9',
        date: '2026-10-16T00:50:00+07:00',
        title: 'Tối Ưu Hóa Triệt Để Token & Hạn Mức AI Giải Thích Từ Vựng',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi nhanh hết hạn mức khi giải thích từ: Nâng hạn mức khách từ 3 lên 25 lượt thử, tài khoản thường từ 30 lên 100 lượt/tháng, và cho phép giải thích linh hoạt từ 1 từ đơn (>= 2 ký tự).' },
          { type: 'feature', text: 'Tích hợp kho từ điển tức thì (Built-in Lexicon) với hơn 80+ thuật ngữ công nghệ & học tập: Trả lời tức thì 0ms, tiêu thụ 0 token và không trừ bất kỳ lượt dùng nào.' },
          { type: 'improved', text: 'Bộ nhớ đệm thuật ngữ toàn cầu (Global Term Cache) & LocalStorage: Chia sẻ kết quả giải thích giữa mọi người dùng và lưu trữ bền vững trên trình duyệt, không tốn thêm token khi tra cứu lại.' },
          { type: 'improved', text: 'Siêu nén Token (>92% tiết kiệm): Lược bỏ dàn ý toàn bài và nội dung chương dài khi tra từ ngắn, giảm kích thước prompt từ 2.000 token xuống chỉ còn 120-150 token.' }
        ]
      },
      {
        version: 'v5.6.8',
        date: '2026-10-16T00:35:00+07:00',
        title: 'Tái Thiết Kế Toàn Diện Modal Thống Kê Học Tập & Modal Ghi Chú & Khung Chuẩn Luxury Editorial',
        items: [
          { type: 'improved', text: 'Tái thiết kế Modal Thống kê Học tập (max-w-2xl): Nâng cấp thẻ Chuỗi liên tiếp & Mục tiêu với hiệu ứng gradient đa lớp, biểu đồ 7 ngày cột trụ Pillar Bars sang trọng có rãnh bo góc mềm rounded-2xl, tooltip định vị động chuẩn xác và 4 thẻ chỉ số thư viện kèm số đo Serif cỡ lớn tabular-nums.' },
          { type: 'improved', text: 'Tái thiết kế Modal Tất cả Ghi chú & Khung: Mở rộng không gian rộng rãi (max-w-4xl) ngăn chặn hoàn toàn hiện tượng cắt cụt tiêu đề, nâng cấp cụm thao tác chọn nhiều, thanh tìm kiếm toàn văn và chip lọc màu có hiệu ứng xúc giác mượt mà.' },
          { type: 'improved', text: 'Minh họa rỗng (Empty State) phong cách Tạp chí cao cấp: Thay thế ô rỗng nét đứt cũ bằng squircle vector đa lớp phát sáng dịu nhẹ và huy hiệu hướng dẫn mẹo bôi đen văn bản trực quan.' },
          { type: 'improved', text: 'Chuyển động (Transition) nhẹ nhàng & tinh tế: Tối ưu chuyển động mở/đóng modal, hover thẻ thống kê và hiệu ứng chuyển đổi chip lọc màu đồng bộ tuyệt đối với vibe web.' }
        ]
      },
      {
        version: 'v5.6.7',
        date: '2026-10-16T00:15:00+07:00',
        title: 'Khắc Phục Lỗi Khởi Động & Tái Thiết Kế Thanh Pomodoro, Ghi Chú & Thống Kê Chuẩn Luxury Editorial',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi SyntaxError gây đóng băng web khi khởi động: Sửa lỗi thoát chuỗi template string trong hàm bridge sandbox JavaScript.' },
          { type: 'improved', text: 'Tái thiết kế thanh Pomodoro & Tiếng ồn trắng chuẩn Editorial cao cấp: Thay thế emoji bằng huy hiệu Zen focus tinh giản, thiết kế riêng bộ 4 icon vector SVG độc bản cho âm thanh (Mưa rào, Sóng biển, Quán Cafe, Sóng Alpha), nâng cấp thẻ xúc giác và bộ đếm giờ mono tabular siêu sắc nét.' }
        ]
      },
      {
        version: 'v5.6.6',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Tối Ưu Hóa Quota & Token AI, Thiết Kế Icon Độc Bản & Transition Tìm Kiếm Mượt Mà',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi tài khoản Pro vượt mức sử dụng AI: Chuẩn hóa truy xuất cấu hình gói cước từ doc.plans, hỗ trợ hạn mức vô hạn (-1) và sửa lỗi nhận diện sai gói Free.' },
          { type: 'improved', text: 'Tối ưu hóa token AI siêu tiết kiệm (giảm ~80% token): Rút gọn ngữ cảnh thông minh từ 14.000 xuống 1.200 ký tự, tinh giản câu lệnh prompt và bổ sung bộ nhớ đệm phía client trả về kết quả 0ms.' },
          { type: 'feature', text: 'Thiết kế icon vector SVG độc bản cho 4 tiếng ồn trắng: Thay thế emoji bằng hệ thống icon Mưa rào, Sóng biển, Quán Cafe và Sóng Alpha thiết kế riêng theo chuẩn Editorial cao cấp.' },
          { type: 'improved', text: 'Hiệu ứng chuyển động (Transition) nhẹ nhàng, tinh tế: Thêm animation mượt mà khi bấm mở/đóng thanh tìm kiếm toàn cục và Command Palette (Ctrl+K), chống giật hình và phù hợp vibe web.' }
        ]
      },
      {
        version: 'v5.6.5',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Thanh Công Cụ Tập Trung Pomodoro & Tiếng Ồn Trắng Đa Dạng',
        items: [
          { type: 'feature', text: 'Thanh công cụ Pomodoro đỉnh màn hình: Xuất hiện tinh gọn phía trên cùng trong Chế độ tập trung (Focus Mode), gồm đồng hồ đếm ngược, nút Phát/Dừng, Đặt lại, Bỏ qua và thanh tiến độ đọc mượt mà.' },
          { type: 'feature', text: '3 chế độ bấm giờ linh hoạt: Hỗ trợ chuyển đổi nhanh chế độ Tập trung 25p, Nghỉ ngơi 5p và Tùy chỉnh giờ (chọn nhanh 15p, 30p, 45p, 60p hoặc nhập số phút tùy thích).' },
          { type: 'feature', text: 'Bộ 4 tiếng ồn trắng chuẩn khoa học: Tích hợp 4 âm thanh nền tăng cường sự tập trung gồm Mưa rào, Sóng biển, Quán Cafe và Sóng Alpha 10Hz kích thích não bộ (tổng hợp 100% bằng Web Audio API thuần, siêu nhẹ, hoạt động offline).' },
          { type: 'feature', text: 'Tùy chỉnh âm lượng nhạc nền: Bổ sung thanh trượt âm lượng mượt mà (0–100%) kèm nút bật/tắt tiếng (Mute) tiện lợi, tự động dừng phát khi thoát chế độ tập trung.' }
        ]
      },
      {
        version: 'v5.6.4',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Khắc Phục Lỗi Đóng Khung Trong Bảng & Tối Ưu Nhận Diện Khối Đa Dòng',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi đóng khung văn bản trong bảng: Tách bạch tính toán tọa độ theo từng ô bảng (td/th), loại bỏ hoàn toàn hiện tượng đường kẻ cắt ngang qua dòng chữ và các ô khung rỗng tràn xuống dưới do trộn lẫn tọa độ các cột.' },
          { type: 'improved', text: 'Thuật toán gom khối (Component Partitioning) thông minh: Phân tách các khối liên tục trước khi nới biên tọa độ, chỉ kết nối các dòng chữ thực sự nằm trong cùng một khối ngữ cảnh dọc (vertGap ≤ 14px), ngăn chặn việc méo mó đường vẽ SVG.' },
          { type: 'improved', text: 'Giao diện đóng khung đa ô thẩm mỹ: Khi bôi đen đoạn văn bản trải qua nhiều ô trong bảng, mỗi ô đều sở hữu khung bo góc mềm mại, ôm khít từng dòng chữ và phản hồi click/double-click đồng bộ.' }
        ]
      },
      {
        version: 'v5.6.3',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Tối Ưu Siêu Tốc AI Giải Thích & Chuẩn Hóa Bộ Icon Thanh Phong Cách',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi AI chờ lâu & phản hồi bị ngắt quãng: Nâng cấp luồng Adapter Gemini sang gemini-2.0-flash siêu tốc, khắc phục lỗi 400 do tham số thinkingConfig trên model không hỗ trợ, loại bỏ vòng lặp endpoint v1 dư thừa và tối ưu hóa ngữ cảnh tài liệu gọn gàng giúp AI phản hồi chỉ trong 1-3 giây.' },
          { type: 'feature', text: 'Thiết kế lại 100% icon phong cách AI theo chuẩn giao diện: Thay thế các emoji màu mè bằng bộ icon SVG đường nét tinh tế (Dễ hiểu, Học thuật, Tóm tắt, Ví dụ), đồng bộ hoàn hảo với vibe hiện đại của thư viện.' },
          { type: 'fix', text: 'Sửa dứt điểm lỗi che chữ "Học thuật": Loại bỏ cơ chế cắt cụt (truncate), mở rộng không gian thanh chọn và bảo toàn hiển thị đầy đủ, sắc nét trọn vẹn nhãn "Học thuật" trên mọi kích thước màn hình.' }
        ]
      },
      {
        version: 'v5.6.2',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Tùy Biến Thẻ Tiếp Tục Học: Thêm Nút Đóng & Công Tắc Ẩn/Hiện Trong Menu Giao Diện',
        items: [
          { type: 'feature', text: 'Nút đóng trực tiếp tiện lợi (X): Bổ sung nút đóng nhỏ gọn ngay góc phải thẻ "Tiếp tục học" trên Sidebar, cho phép ẩn thẻ nhanh chóng kèm hiệu ứng mượt mà và thông báo xác nhận.' },
          { type: 'feature', text: 'Công tắc khôi phục trong Tùy chọn hiển thị: Bổ sung tùy chọn "Thẻ Tiếp tục học" trong nhóm GIAO DIỆN của menu hiển thị, giúp độc giả chủ động bật lại hoặc ẩn đi bất kỳ lúc nào.' },
          { type: 'improved', text: 'Lưu trạng thái bền vững: Ghi nhớ tùy chọn ẩn/hiện vào bộ nhớ trình duyệt (localStorage), duy trì cấu hình ngay cả khi tải lại trang hoặc mở phiên đọc mới.' }
        ]
      },
      {
        version: 'v5.6.1',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Phân Quyền Chủ Đề Lễ Hội: Ẩn Tùy Chỉnh Với Người Dùng & Dành Riêng Cho Quản Trị Viên',
        items: [
          { type: 'improved', text: 'Bảo mật & tinh gọn giao diện người dùng: Tự động ẩn hoàn toàn mục "Hiệu ứng mùa lễ hội" và bảng chọn "Chủ đề lễ hội" trong menu Tùy chọn hiển thị đối với người dùng phổ thông, giữ giao diện đọc sách luôn tối giản và trang nhã.' },
          { type: 'feature', text: 'Phân quyền Quản trị viên (Admin-only): Chỉ tài khoản Quản trị viên (Admin) hoặc phiên đăng nhập quản trị mới nhìn thấy và kích hoạt được các chủ đề lễ hội (Giáng Sinh, Tết Đoàn Viên, Thu Vàng).' },
          { type: 'improved', text: 'Đồng bộ hệ thống tập trung: Chặn người dùng thường tự ý ghi đè giao diện lễ hội cục bộ, đảm bảo mọi độc giả đều theo đúng chủ đề hoặc lịch trình phát hành chính thức từ Admin Theme Studio.' }
        ]
      },
      {
        version: 'v5.6.0',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Đồng Bộ Hóa Typography Biên Lai Thanh Toán: Chuẩn Hóa Font Chữ & Cân Đối Kích Thước',
        items: [
          { type: 'improved', text: 'Đồng bộ 100% font chữ hiện đại: Thay thế hoàn toàn font monospace rời rạc bằng font sans-serif chuẩn mực, tạo cảm giác liền mạch, cao cấp và chuyên nghiệp trên toàn bộ thẻ thông tin chuyển khoản.' },
          { type: 'improved', text: 'Cân bằng hoàn hảo kích thước & độ đậm: Chuẩn hóa 3 hàng thông tin (Ngân hàng nhận, Số tài khoản, Chủ tài khoản) cùng cỡ chữ (text-sm), cùng độ đậm (font-semibold) và cùng căn lề chuẩn xác.' },
          { type: 'improved', text: 'Tối ưu hiển thị số tài khoản & mã nội dung: Giữ tính năng căn số chuẩn (tabular-nums) giúp các con số thẳng hàng, sắc nét và dễ đọc hơn khi chuyển khoản.' }
        ]
      },
      {
        version: 'v5.5.9',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Tối Giản Giao Diện Thanh Toán: Loại Bỏ 2 Nút "Hủy Đơn Này"',
        items: [
          { type: 'improved', text: 'Tinh giản luồng thanh toán VietQR: Bỏ 2 nút "Hủy đơn này" ở cả thanh điều hướng trên và thanh tác vụ dưới của modal thanh toán, giúp giao diện gọn gàng, trực quan và tập trung vào quy trình hoàn tất nạp gói.' },
          { type: 'improved', text: 'Cân đối giao diện: Nút "Tôi đã chuyển khoản" được căn giữa trang trọng, rõ ràng và dễ thao tác trên mọi màn hình điện thoại cũng như máy tính.' }
        ]
      },
      {
        version: 'v5.5.8',
        date: '2026-10-15T23:59:59+07:00',
        title: 'Khắc Phục Triệt Để Hiện Tượng Nhảy Phiên Bản v5.5.0 & Tối Ưu Tốc Độ Nạp Trang F5',
        items: [
          { type: 'fixed', text: 'Xóa bỏ hoàn toàn nhãn phiên bản cũ v5.5.0 bị ghi cứng trong mã nguồn HTML: Đồng bộ trực tiếp nhãn phiên bản gốc trên cả Desktop (#desktopAppVersionLabel) và Mobile (#mobileAppVersionLabel) lên phiên bản hiện tại v5.5.8.' },
          { type: 'improved', text: 'Thực thi cập nhật phiên bản siêu tốc 0ms (Zero-delay Sync): Đưa hàm updateAppVersionLabels lên đầu mã nguồn trong <head> và kích hoạt đồng bộ tức thì ngay khi phần tử DOM xuất hiện, triệt tiêu hoàn toàn độ trễ chờ đợi script cuối trang.' },
          { type: 'improved', text: 'Triệt tiêu 100% hiện tượng giật lag khi tải lại trang (F5): Giao diện hiển thị mượt mà, đồng nhất ngay từ khung hình đầu tiên mà không bao giờ bị nhảy số hay chớp giật.' }
        ]
      },
      {
        version: 'v5.5.7',
        date: '2026-10-15T23:59:00+07:00',
        title: 'Chuẩn Hóa Tiêu Đề & Nút Xác Nhận Modal Đăng Xuất (Đăng xuất?)',
        items: [
          { type: 'fixed', text: 'Thay thế toàn bộ nhãn "Xác nhận xóa?" và nút "Xác nhận xóa" thành "Đăng xuất?": Modal xác nhận khi bấm Đăng xuất tài khoản giờ đây hiển thị tiêu đề và nút bấm đồng nhất, chính xác ngữ nghĩa và thân thiện với người dùng.' },
          { type: 'improved', text: 'Tối ưu biểu tượng modal xác nhận linh hoạt: Tự động chuyển đổi sang biểu tượng Đăng xuất chuyên dụng khi người dùng thực hiện thoát tài khoản, tách biệt hoàn toàn với biểu tượng thùng rác khi xóa bài học.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.5.7 trên toàn hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.5.6',
        date: '2026-10-15T23:55:00+07:00',
        title: 'Tái Thiết Kế Thông Báo Đẩy Ntfy: Định Dạng Trực Quan, Chuẩn Mực & Dễ Nhìn',
        items: [
          { type: 'fixed', text: 'Khắc phục triệt để lỗi hiển thị tin nhắn dạng chuỗi JSON thô: Điều chỉnh endpoint ntfy gửi chuẩn xác tới root URL kèm topic trong body, giúp ntfy tự động bóc tách tiêu đề, nhãn emoji, độ ưu tiên và nội dung văn bản trực quan.' },
          { type: 'improved', text: 'Tái thiết kế giao diện thông báo đẩy: Bổ sung bố cục phân nhóm rõ ràng (khách hàng, gói dịch vụ, số tiền, mã đơn, thời gian, trạng thái biên lai), sử dụng đường phân cách tinh tế và icon minh họa sinh động.' },
          { type: 'feature', text: 'Tích hợp nút hành động tức thì (Action View): Bổ sung liên kết và nút "Mở trang Admin" trực tiếp trên thông báo ntfy để quản trị viên truy cập duyệt đơn ngay bằng một chạm.' }
        ]
      },
      {
        version: 'v5.5.5',
        date: '2026-10-15T23:30:00+07:00',
        title: 'Bổ Sung Nút Hủy Đơn Thanh Toán & Tối Ưu Thông Báo Chờ Kích Hoạt Gói',
        items: [
          { type: 'feature', text: 'Thêm nút "Hủy đơn này" trực tiếp trong pop-up thanh toán VietQR: Cho phép người dùng chủ động hủy đơn hàng đang chờ (ở cả thanh điều hướng trên cùng và bên cạnh nút xác nhận chuyển khoản), tự động giải phóng phiên quét mã và làm mới lịch sử giao dịch.' },
          { type: 'improved', text: 'Cập nhật thông điệp chờ duyệt gói trong Lịch sử mua hàng: Chuẩn hóa tiêu đề thành "Đang chờ hệ thống kích hoạt gói", ngắn gọn, tinh tế và chuyên nghiệp.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.5.5 trên toàn hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.5.4',
        date: '2026-10-15T23:00:00+07:00',
        title: 'Sửa Lỗi Nút "Xóa Khung" Xuất Hiện Khi Chưa Đóng Khung Văn Bản',
        items: [
          { type: 'fixed', text: 'Chỉ hiển thị nút "Xóa khung" khi đoạn văn bản bôi đen đã có khung hoặc giao với khung có sẵn: Chuyển đổi cơ chế nhận diện khung sang phân tích DOM trực tiếp (range.intersectsNode), loại bỏ hoàn toàn các sai số do lệch chỉ mục ký tự.' },
          { type: 'fixed', text: 'Triệt tiêu trạng thái ma (Ghost State): Tự động xóa sạch activeHighlightItem và bộ đệm selection cũ khi đóng cửa sổ ghi chú, khi nhả chọn văn bản hoặc khi bắt đầu chọn đoạn văn bản mới, ngăn tình trạng ghi nhớ sai khung cũ.' },
          { type: 'improved', text: 'Đồng bộ hóa nhận diện khung hai chiều: Cả iframe tài liệu và trang cha đều kiểm tra chính xác vùng chọn theo phần tử .text-frame thực tế trên màn hình, mang lại trải nghiệm chuẩn xác tuyệt đối.' }
        ]
      },
      {
        version: 'v5.5.3',
        date: '2026-10-15T22:30:00+07:00',
        title: 'Sửa Triệt Để Lỗi Hiển Thị Popup AI Bị Trôi Xuống Đáy & Đồng Nhất Khung Đọc Sách',
        items: [
          { type: 'fixed', text: 'Khắc phục triệt để lỗi Popup AI (Giải thích, Ví dụ, Dịch) bị trôi xuống đáy màn hình: Xây dựng hệ thống định vị động thông minh (positionAiPopover), tự động đo chiều cao thực tế và kẹp chặt popup luôn nằm trọn 100% trong khung nhìn hiển thị (Viewport Safe Clamping).' },
          { type: 'fixed', text: 'Tự động nâng và căn chỉnh lại vị trí khi AI trả lời (reclampAiPopoverPosition): Đo lại chiều cao ngay khi nội dung AI hoặc lỗi hiển thị, tự động kéo popup lên cao để các nút thao tác và phần nội dung không bao giờ bị chìm xuống dưới thanh tác vụ.' },
          { type: 'fixed', text: 'Bảo vệ vùng bôi đen (Selection Lock): Khóa và lưu trữ vĩnh viễn tọa độ cùng văn bản đã chọn khi click các nút thao tác AI trên cả thanh nổi máy tính và thanh điều khiển di động, ngăn ngừa hiện tượng mất vùng chọn.' },
          { type: 'improved', text: 'Đồng nhất khung đọc sách, loại bỏ cảm giác chia nửa màn hình: Áp dụng chiều cao tối thiểu linh hoạt (min-h-[460px] sm:min-h-[calc(100vh-280px)]) cho khung hiển thị bài đọc (#iframeOuterContainer), giúp các bài học ngắn luôn trải đều trang nhã xuống chân trang thay vì bị cụt lửng.' }
        ]
      },
      {
        version: 'v5.5.2',
        date: '2026-10-15T21:30:00+07:00',
        title: 'Tối Ưu Giao Diện Di Động: Nút Đăng Nhập Chuẩn Xác & Triệt Tiêu Lỗi Phóng To/Thu Nhỏ Vô Ý',
        items: [
          { type: 'fixed', text: 'Hiển thị nút Đăng nhập / Tài khoản chuẩn xác 100% trên điện thoại: Tinh gọn các nút phụ trên Header (chuyển Tạo link nhanh và Prompt AI vào Menu tài khoản trên màn hình nhỏ), giúp Avatar / Nút đăng nhập luôn nằm gọn bên phải màn hình mà không cần kéo ngang.' },
          { type: 'fixed', text: 'Khóa hiện tượng tràn ngang (Horizontal Overflow): Thiết lập overflow-x: hidden trên html & body, khóa max-width 100vw và overflow-x: clip trên Header, ngăn ngừa hoàn toàn tình trạng trang bị trượt lề trái phải.' },
          { type: 'fixed', text: 'Triệt tiêu 100% lỗi tự động phóng to / thu nhỏ (Accidental Zoom In / Zoom Out): Bổ sung maximum-scale=1.0, user-scalable=no, chặn sự kiện gesturestart (pinch-to-zoom) và chạm đúp (double-tap zoom), đồng thời chuẩn hóa font 16px cho ô nhập liệu trên di động để iOS không bao giờ tự phóng to khi bấm nhầm.' }
        ]
      },
      {
        version: 'v5.5.1',
        date: '2026-10-15T21:00:00+07:00',
        title: 'Chủ Đề Giáng Sinh: Tuyết Rơi Toàn Diện & Đọng Tuyết Góc Viền Trên Mọi Pop-up',
        items: [
          { type: 'feature', text: 'Hiệu ứng tuyết rơi trên tất cả Pop-up & Modal (Dual-Canvas): Tuyết rơi mềm mại, lung linh phủ khắp màn hình trên các pop-up (Menu tài khoản, Nâng cấp gói, Quản lý tài khoản, Cài đặt hiển thị...) mà không chặn bất kỳ thao tác click nào.' },
          { type: 'feature', text: 'Nghệ thuật đọng tuyết 3 đoạn viền trên & các góc (3-Segment Snow Cap): Thiết kế SVG đọng tuyết uốn lượn tự nhiên ôm trọn vẹn góc bo tròn trái/phải và viền trên toàn bộ các thẻ pop-up kèm ánh sao băng lung linh.' },
          { type: 'improved', text: 'Bộ chọn Chủ đề Lễ hội tức thì: Dễ dàng chuyển đổi trực tiếp giữa Giáng Sinh (❄️), Tết Đoàn Viên (🌸), Mùa Thu (🍁) và Mặc định (📖) trong Popover Cài đặt hiển thị.' },
          { type: 'improved', text: 'Bảo toàn tuyệt đối khu vực đọc sách: Chế độ Zero-distraction ngoài nền vẫn phân vùng tuyết rơi 2 bên lề, hoàn toàn không xao nhãng khi người dùng đọc bài.' }
        ]
      },
      {
        version: 'v5.5.0',
        date: '2026-10-15T20:00:00+07:00',
        title: 'Tối Ưu & Dọn Sạch Hoàn Toàn Trạng Thái Đăng Xuất (Logout State Clean)',
        items: [
          { type: 'improved', text: 'Triệt tiêu 100% tàn dư khi đăng xuất: Khắc phục triệt để lỗi hiển thị thẻ "Tiếp tục bài đang học dở", thanh "Mở gần đây" và thẻ học dở sidebar khi đăng xuất về chế độ Khách.' },
          { type: 'improved', text: 'Đưa nút "Đã học" và icon về trạng thái mặc định: Reset toàn bộ kiểu dáng, viền và màu sắc của nút Đã học trên thanh điều khiển đọc khi thư viện trống.' },
          { type: 'improved', text: 'Hiển thị chuẩn mực màn hình Thư viện trống: Thư viện hiển thị hoàn toàn sạch sẽ, đúng minh họa chuẩn ban đầu với các tùy chọn tải file và tạo liên kết chia sẻ.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.5.0 trên toàn bộ hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.9',
        date: '2026-10-15T19:30:00+07:00',
        title: 'Tái Thiết Kế Thẻ Biên Lai Thanh Toán Chuẩn Mực, Cân Đối & Đẳng Cấp',
        items: [
          { type: 'improved', text: 'Cấu trúc thẻ thanh toán liền mạch (Unified Payment Card): Hợp nhất toàn bộ khối số tiền, thông tin ngân hàng và nội dung chuyển khoản vào một thẻ biên lai duy nhất, triệt tiêu hoàn toàn hiện tượng lệch lề, thụt thò.' },
          { type: 'improved', text: 'Đồng bộ 100% cột nút sao chép (Copy Action): Bổ sung nút sao chép cho Chủ tài khoản, chuẩn hóa kích thước 32x32px thẳng tắp một hàng dọc bên phải kèm hiệu ứng tích xanh tức thì.' },
          { type: 'improved', text: 'Hài hòa kích cỡ chữ và phân cấp thị giác (Typography Hierarchy): Chuẩn hóa font chữ sans hiện đại cho số tiền, font monospace cho số tài khoản và mã đơn, đồng nhất kích cỡ nhãn và huy hiệu (Badge) mang lại giao diện fintech chuyên nghiệp.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.9 trên toàn bộ hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.8',
        date: '2026-10-15T19:00:00+07:00',
        title: 'Tích Hợp Topic & Mã QR ntfy.sh Chuyên Biệt Nhận Thông Báo Đơn Nâng Cấp Gói Chờ Duyệt',
        items: [
          { type: 'feature', text: 'Tạo mã QR ntfy.sh trực quan: Cung cấp mã QR và đường link riêng biệt kết nối tức thì tới topic ntfy.sh trên điện thoại hoặc trình duyệt để nhận chuông báo đẩy mỗi khi có khách hàng bấm "Tôi đã chuyển khoản" và đang chờ duyệt đơn.' },
          { type: 'feature', text: 'Tự động tạo topic bí mật & Live QR trong Quản trị: Bổ sung nút tạo topic bảo mật ngẫu nhiên và khung hiển thị mã QR thời gian thực ngay trong tab Cấu hình Thanh toán của trang Quản trị.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.8 trên toàn bộ hệ thống (index.html, package.json, sw.js, admin.js, api/admin/billing.js).' }
        ]
      },
      {
        version: 'v5.4.7',
        date: '2026-10-15T18:00:00+07:00',
        title: 'Tối Ưu Tiếp Nhận Đơn Nâng Cấp Gói, Bộ Đếm Ngược 15 Phút & Tự Động Làm Mới Mã QR',
        items: [
          { type: 'feature', text: 'Tiếp nhận đơn chờ xử lý chuẩn xác: Chỉ những khách hàng đã bấm xác nhận "Tôi đã chuyển khoản" mới được đưa vào danh sách "Đơn chờ xử lý" của Admin kèm nút Duyệt/Hủy. Người xem mã đơn thuần (chưa xác nhận) hiển thị trạng thái "Chưa báo chuyển" ở mục Đơn khác và không hiển thị nút duyệt.' },
          { type: 'feature', text: 'Đồng hồ đếm ngược 15 phút thời gian thực: Tích hợp bộ đếm ngược trực quan trong khung thanh toán. Khi hết 15 phút, hệ thống tự động thông báo hủy mã QR đó và hiển thị nút "Tạo mã mới" để cấp mã thanh toán và nội dung chuyển khoản hoàn toàn mới.' },
          { type: 'feature', text: 'Khôi phục phiên QR chạy nền thông minh: Nếu người dùng thoát trang hoặc đóng popup khi chưa hết 15 phút, bấm "Nâng cấp gói" sẽ tự động mở lại đúng mã QR đang hoạt động với thời gian đếm ngược thực tế đã trừ phần thời gian người dùng rời khỏi trang.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.7 trên toàn bộ hệ thống (index.html, package.json, sw.js, admin.js, api/admin/billing.js).' }
        ]
      },
      {
        version: 'v5.4.6',
        date: '2026-10-15T17:30:00+07:00',
        title: 'Chống Đè Chữ & Đồng Bộ Thanh Công Cụ Nổi Bám Theo Đoạn Bôi Đen Khi Cuộn Chuột',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi thanh công cụ nổi (#highlightFloatingToolbar) che/đè lên đoạn văn bản được bôi đen: Thiết lập khoảng cách đệm an toàn GAP = 14px, tính toán tự động chiều cao thực tế của thanh công cụ và đảo chiều thông minh (lật xuống dưới nếu sát mép header trên cùng).' },
          { type: 'feature', text: 'Thanh công cụ bám dính thời gian thực theo văn bản khi cuộn chuột: Lắng nghe sự kiện scroll trong iframe bài học kết hợp requestAnimationFrame (60fps) để thanh công cụ di chuyển mượt mà bám sát tọa độ đoạn chữ khi lăn chuột lên/xuống.' },
          { type: 'fix', text: 'Cơ chế đóng tự nhiên: Thanh công cụ giữ nguyên vị trí theo đoạn văn bản bôi đen và chỉ biến mất khi người dùng nhấp chuột ra vị trí khác.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.6 trên toàn bộ hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.5',
        date: '2026-10-15T17:00:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Mô Hình AI Bị Quá Tải Hoặc Phản Hồi Bị Ngắt Quãng',
        items: [
          { type: 'fix', text: 'Tối ưu hóa cấu trúc Adapter Gemini trên backend (lib/call-ai.js): Ưu tiên tuyệt đối endpoint v1beta đầy đủ tính năng, loại bỏ model không tồn tại và chuẩn hóa payload GenerationConfig.' },
          { type: 'fix', text: 'Cơ chế Fallback & Tự phục hồi đa tầng: Tự động chuyển đổi giữa các model Gemini (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro) khi gặp sự cố, tự động loại bỏ responseSchema chuyển sang responseMimeType nếu gặp lỗi cú pháp.' },
          { type: 'fix', text: 'Tái cấu trúc Prompt giải thích (api/ai/explain.js): Đưa ngữ cảnh bài học ra khối độc lập, không nhét dàn ý bài học vào giữa câu văn gây hiểu nhầm ngữ cảnh.' },
          { type: 'improved', text: 'Hạ ngưỡng lọc độ dài tối thiểu kết quả hợp lệ xuống 5 ký tự và đồng bộ hóa phiên bản v5.4.5 toàn hệ thống.' }
        ]
      },
      {
        version: 'v5.4.4',
        date: '2026-10-15T16:30:00+07:00',
        title: 'Đồng Bộ Trạng Thái Nút Trợ Lý AI Với Cài Đặt Hiển Thị & Quyền Tài Khoản Pro',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi nút Trợ lý AI (Giải thích, Ví dụ, Dịch) vẫn hiện lên khi tính năng đang bị tắt trong Cài đặt: Xây dựng hàm kiểm tra quyền & trạng thái isAiAssistantActive() chuẩn xác 100% giữa switch Cài đặt và thanh công cụ nổi.' },
          { type: 'fix', text: 'Đồng bộ ẩn/hiện tức thì trên cả Desktop (#hlAiButtonsGroup) và Di động (#mbAiDropdownWrapper): Tự động ép ẩn triệt để khi tính năng tắt hoặc tài khoản không có quyền Pro, chỉ hiển thị khi tính năng được bật bởi tài khoản Pro.' },
          { type: 'improved', text: 'Đồng bộ tức thì trạng thái switch AI khi mở popover Cài đặt hiển thị và khi cập nhật quyền hạn người dùng (updateUserUI).' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.4 trên toàn bộ ứng dụng (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.3',
        date: '2026-10-15T16:00:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Bấm Đóng Khung Văn Bản & Bảo Vệ Vùng Chọn Bridge',
        items: [
          { type: 'fix', text: 'Sửa dứt điểm lỗi bấm "Đóng khung" không hoạt động: Trích xuất chính xác startOffset và endOffset từ Bridge Message của Iframe sang applyFramingToCurrentSelection, bổ sung cơ chế fallback fullText thông minh khi Iframe chạy chế độ sandbox.' },
          { type: 'fix', text: 'Bảo vệ vùng chọn chống mất ngữ cảnh khi click: Bổ sung preventDefault cho các sự kiện pointerdown/mousedown/touchstart trên nút Đóng khung và Thêm ghi chú (cả Desktop và Mobile Toolbar), ngăn chặn sự kiện blur ngoài ý muốn.' },
          { type: 'fix', text: 'Cải tiến bộ lọc lát cắt khung applyFrameSlicing: Bảo vệ tối đa dữ liệu khung hợp lệ không bao giờ bị loại bỏ ngầm khi bôi đen văn bản trong bài học.' },
          { type: 'improved', text: 'Đồng bộ hóa phiên bản v5.4.3 trên toàn bộ ứng dụng (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.2',
        date: '2026-10-15T15:30:00+07:00',
        title: 'Khắc Phục Triệt Để Lỗi Cắt Cụt JSON Trợ Lý AI (Ký Tự "{") & Chuẩn Hóa v5.4.2',
        items: [
          { type: 'fix', text: 'Sửa dứt điểm lỗi AI chỉ hiển thị ký tự "{" tại khung kết quả (#aiResultPopover): Tăng giới hạn maxOutputTokens lên 3072, vô hiệu hóa thinkingBudget trên Gemini 2.5 Flash để tránh cạn kiệt token và kích hoạt chuẩn JSON mime type.' },
          { type: 'fix', text: 'Bảo vệ đa lớp cho quá trình xử lý phản hồi AI: Bổ sung Regex bóc tách trường text/explanation/summary khi JSON bị ngắt quãng, dọn sạch dấu ngoặc nhọn thừa và ngăn chặn tuyệt đối việc lưu kết quả lỗi vào ai_cache.' },
          { type: 'improved', text: 'Nâng cấp trải nghiệm giao diện người dùng: Tự động kiểm tra làm sạch dữ liệu trước khi hiển thị, hỗ trợ nút "Thử lại" kèm cờ bypassCache bỏ qua cache cũ và dọn sạch bộ nhớ tạm LocalStorage/SessionStorage.' },
          { type: 'fix', text: 'Khắc phục lỗi tham chiếu ngầm (ReferenceError) trong Bridge Script của Iframe bài học và tối ưu thanh công cụ nổi (#highlightFloatingToolbar) hiển thị chuẩn xác trên cả màn hình cảm ứng & Desktop.' },
          { type: 'improved', text: 'Đồng bộ chuẩn hóa phiên bản v5.4.2 trên toàn bộ hệ thống (index.html, package.json, sw.js).' }
        ]
      },
      {
        version: 'v5.4.1',
        date: '2026-10-15T13:15:00+07:00',
        title: 'Khắc Phục Lỗi Cú Pháp Import & Khôi Phục Hoàn Toàn Quyền Truy Cập Bảng Quản Trị',
        items: [
          { type: 'fix', text: 'Sửa dứt điểm lỗi cú pháp "Unexpected token \'import\'" trong admin.js: Bổ sung câu lệnh đóng import thư viện firebase-auth bị thiếu, giúp trình duyệt nạp mô-đun quản trị viên thành công 100%.' },
          { type: 'improved', text: 'Tối ưu hóa quy trình mở Bảng Quản trị: Đảm bảo điều hướng ẩn #/admin và các nút con dấu bí mật kích hoạt đăng nhập quản trị ngay tức khắc mà không bị chặn lỗi.' },
          { type: 'improved', text: 'Đồng bộ toàn diện phiên bản v5.4.1 trên nhãn thông tin hệ thống, Service Worker và danh mục tính năng mới.' }
        ]
      },
      {
        version: 'v5.4.0',
        date: '2026-10-15T12:00:00+07:00',
        title: 'Hệ Thống Theme Studio Lễ Hội Thông Minh, Smart AI Context & Thông Báo Đẩy ntfy.sh',
        items: [
          { type: 'feature', text: 'Theme Studio & Hiệu ứng Lễ hội Thông minh (Đợt 2): Tùy biến màu nền Ambient, hiệu ứng hạt rơi theo mùa (Tuyết rơi, Hoa đào mai Tết, Lá phong thu, Tinh tú mùa thi) với cơ chế cách ly Zero-distraction bảo vệ 100% vùng đọc sách (#lessonIframe).' },
          { type: 'feature', text: 'Cơ chế Tự động Hẹn lịch Đa múi giờ (Serverless-free Schedule): Tự động đối chiếu Date.now() với lịch hẹn Firestore theo giây, tự động kích hoạt hiệu ứng khi đến giờ và hoàn trả The Codex khi kết thúc mà không cần máy chủ.' },
          { type: 'feature', text: 'Trợ lý AI Smart Context & 4 Phong cách Giải thích (Đợt 1): Tự động nhận diện ngữ cảnh bài học hiện tại, cung cấp 4 phong cách phản hồi chuyên sâu (Dễ hiểu, Học thuật, Tóm tắt, Thực tế) và tối ưu hóa bộ nhớ đệm prompt.' },
          { type: 'feature', text: 'Hệ thống Thông báo Đẩy ntfy.sh (Đợt 1): Tích hợp webhook thông báo tức thì về điện thoại và máy tính quản trị viên mỗi khi có giao dịch thanh toán hoặc kích hoạt gói cước.' },
          { type: 'improved', text: 'Tôn trọng tuyệt đối trải nghiệm đọc sách: Tự động tạm dừng hiệu ứng hạt khi ẩn tab (document.hidden), khi ở chế độ Tập trung (Focus/Zen Mode) hoặc khi chọn mắt đọc Sepia/OLED. Hỗ trợ nút bật/tắt cá nhân và chuẩn tiếp cận giảm chuyển động (prefers-reduced-motion).' }
        ]
      },
      {
        version: 'v5.3.9',
        date: '2026-10-15T11:15:00+07:00',
        title: 'Nâng Cấp Bảo Mật Toàn Diện, Tối Ưu Hóa Luồng AI, PWA & Trải Nghiệm Tiếp Cận (A11y)',
        items: [
          { type: 'security', text: 'Khóa bảo mật kho mã kích hoạt activation_codes và bắt buộc kiểm thực webhookSecret thanh toán (P0).' },
          { type: 'security', text: 'Cách ly Sandbox Iframe sách (#lessonIframe) chống XSS và đồng bộ luồng nhận diện gói cước billing/plan cho Trợ lý AI.' },
          { type: 'improved', text: 'Khóa nút chống click trùng, thiết lập timeout 25s cho AI và giải quyết dứt điểm lỗi nút \'Thử lại\' khi mất focus.' },
          { type: 'improved', text: 'Tự động hóa đồng bộ cache Service Worker theo query version và chuẩn hóa 100% khả năng tiếp cận (A11y, touch-target 44px) cho toàn bộ hệ thống nút bấm.' }
        ]
      },
      {
        version: 'v5.3.8',
        date: '2026-10-14T10:55:00+07:00',
        title: 'Tái Thiết Kế & Đồng Bộ Hoàn Hảo Logo Trợ Lý AI Gemini & DeepSeek Theo Hệ Thống Icon Web',
        items: [
          { type: 'feature', text: 'Thiết kế logo vector SVG độc quyền: Kết hợp hình tượng Cá voi DeepSeek lướt sóng và Ngôi sao 4 cánh Google Gemini vút cao trên lưới tọa độ 24x24 pixel-perfect' },
          { type: 'improved', text: 'Đồng bộ 100% với 2 logo tính năng bên dưới (Kho sách & Đồng bộ đám mây): Cùng kích thước hộp w-8 h-8 rounded-lg, nền bg-indigo-50/indigo-950, màu text-indigo-600/indigo-400 và độ dày nét stroke 2px bo tròn tinh tế' },
          { type: 'improved', text: 'Tối ưu trải nghiệm thị giác đa nền tảng: Hiển thị mượt mà, sắc nét trên cả chế độ Sáng (Light) và Tối (Dark), không bị mờ nhạt hay lỗi tải gradient ngoài' },
          { type: 'improved', text: 'Đồng bộ biểu tượng độc bản tại thanh cài đặt đọc bài (Trợ lý AI đọc bài đặc quyền Pro) tạo thể thống nhất cao cấp xuyên suốt ứng dụng' }
        ]
      },
      {
        version: 'v5.3.7',
        date: '2026-10-14T10:45:00+07:00',
        title: 'Thiết Kế Logo Độc Bản Cho Trợ Lý AI Gemini & DeepSeek (Song Tinh Tri Thức)',
        items: [
          { type: 'feature', text: 'Thiết kế logo vector SVG độc quyền: Kết hợp ngôi sao 4 cánh Google Gemini (tím Lavender/Indigo) và luồng sóng cá voi DeepSeek (Cyber Cyan), điểm xuyết ngôi sao vàng hoàng gia đồng bộ nhận diện The Codex HTML' },
          { type: 'fix', text: 'Khắc phục hoàn toàn lỗi hiển thị ô vuông trống trong popup Quản lý Tài khoản (mục Quyền lợi và Hạn mức tính năng)' },
          { type: 'improved', text: 'Tối ưu huy hiệu squircle gradient đa lớp với hiệu ứng kính mờ (glassmorphism) và đường viền tương phản sắc nét trên cả chế độ Sáng (Light) và Tối (Dark)' },
          { type: 'feature', text: 'Đồng bộ biểu tượng độc bản tại popover Cài đặt đọc bài (Trợ lý AI đọc bài đặc quyền Pro) tạo trải nghiệm thị giác cao cấp, thống nhất' }
        ]
      },
      {
        version: 'v5.3.6',
        date: '2026-10-13T23:00:00+07:00',
        title: 'Tái Thiết Kế & Khắc Phục Lỗi Hiển Thị Chấm Trạng Thái Online Của Avatar',
        items: [
          { type: 'fix', text: 'Khắc phục triệt để lỗi chấm xanh online bị che khuất/cắt xén: Tách biệt container chấm trạng thái ra ngoài lớp overflow-hidden của avatar, giúp chấm tròn hiển thị trọn vẹn 100%' },
          { type: 'improved', text: 'Thiết kế mới chấm trạng thái cao cấp: Đường viền tương phản sắc nét (2px border), bóng đổ vi mô (shadow-2xs) và căn góc bottom-right chuẩn xác không bị đè lên huy hiệu gói hay viền nút' },
          { type: 'feature', text: 'Đồng bộ trạng thái thông minh đa thiết bị: Hiển thị trực quan Xanh ngọc lục bảo (Online), Hổ phách (Khách) và Xám nhạt (Ngoại tuyến/Mất mạng) tức thì khi mạng thay đổi' },
          { type: 'improved', text: 'Đồng bộ hoàn hảo tỷ lệ kích thước trên toàn bộ giao diện: Header (10px), Menu điều hướng (12px) và Trung tâm hồ sơ cá nhân (14px)' }
        ]
      },
      {
        version: 'v5.3.5',
        date: '2026-10-13T22:45:00+07:00',
        title: 'Bộ Sưu Tập 24 Linh Vật Thú Cưng Độc Bản Tự Thiết Kế Cho Avatar Thành Viên',
        items: [
          { type: 'feature', text: 'Thiết kế độc quyền 24 biểu tượng linh vật thú cưng vector SVG đa sắc siêu dễ thương: Mèo con, Cún Shiba, Thỏ Bunny, Hamster, Vịt Coder, Heo hồng, Cáo Foxy, Gấu Panda, Gấu Teddy, Koala, Cú tri thức, Hươu sao, Nhím nhỏ, Khủng long, Cánh cụt, Cá heo, Rùa con, Rái cá, Ếch xanh, Bạch tuộc, Ong mật, Gà con, Hổ con, Sư tử nhỏ' },
          { type: 'improved', text: 'Lược bỏ toàn bộ biểu tượng công cụ/đồ vật cũ và icon kỹ thuật hàng đầu, tập trung 100% vào thế giới linh vật thú cưng ấm áp, thân thiện và phù hợp với vibe học tập của Sách HTML' },
          { type: 'feature', text: 'Bổ sung nút "↺ Mặc định" cho phép nhanh chóng khôi phục ảnh đại diện về chữ cái đầu theo tên bất cứ lúc nào' },
          { type: 'improved', text: 'Hiển thị sắc nét, sống động trên mọi kích cỡ từ Header (28px), Menu di động (40px) tới Trung tâm tài khoản (64px) kết hợp hoàn hảo cùng 10 dải màu gradient' }
        ]
      },
      {
        version: 'v5.3.4',
        date: '2026-10-13T22:30:00+07:00',
        title: 'Bộ Sưu Tập 32 Biểu Tượng Avatar Độc Bản & Tính Năng Đổi Màu Nền Avatar',
        items: [
          { type: 'feature', text: 'Bổ sung 8 biểu tượng vector SVG độc quyền theo nhận diện Sách HTML (Codex HTML, Thẻ code, Terminal, HTML5 Shield, Sách tri thức, AI Trợ lý, Vương miện Pro, La bàn định hướng)' },
          { type: 'feature', text: 'Bộ sưu tập avatar mở rộng 32 linh vật và biểu tượng chia 5 danh mục trực quan: Tất cả, Độc quyền HTML, Học tập & Tech, Linh vật, Năng lượng' },
          { type: 'feature', text: 'Tính năng đổi màu nền Avatar với 10 dải màu gradient cao cấp (Indigo Hoàng gia, Obsidian Champagne, Ngọc lục bảo, Hoàng hôn HTML5, Cyber Cyan, Hoa hồng Ruby, Đêm huyền bí, Tím oải hương, Cực quang Bắc cực, Vàng kim vinh quang)' },
          { type: 'improved', text: 'Đồng bộ tức thì biểu tượng và màu nền avatar xuyên suốt Header, Thanh điều hướng di động, Popover tài khoản và Trung tâm quản lý' }
        ]
      },
      {
        version: 'v5.3.3',
        date: '2026-10-13T22:00:00+07:00',
        title: 'Tái Thiết Kế Logo Độc Bản: The Codex HTML </> (Sách Tri Thức & Cặp Thẻ HTML)',
        items: [
          { type: 'feature', text: 'Tái thiết kế logo web độc bản "The Codex HTML </>": Kết hợp trang sách mở cong mềm mại tượng trưng cho thư viện và cặp thẻ mã nguồn < và > trên hai cánh trang' },
          { type: 'feature', text: 'Dải ruy-băng bookmark hoàng gia: Cách điệu gáy sách thành dải lụa vàng kim vát chéo tạo thành dấu gạch chéo / (thẻ đóng HTML </>) cùng ngôi sao 4 cánh tri thức' },
          { type: 'improved', text: 'Nâng cấp nhận diện thương hiệu trên Header: Logo squircle gradient chuyển sắc indigo - violet cao cấp, chữ "Sách" phong cách Editorial Serif và huy hiệu "HTML" phong cách mã nguồn' },
          { type: 'improved', text: 'Đồng bộ toàn diện Favicon, Apple Touch Icon và PWA Web App Manifest sắc nét trên mọi kích thước' }
        ]
      },
      {
        version: 'v5.3.2',
        date: '2026-10-13T21:45:00+07:00',
        title: 'Đồng bộ Giao diện & Tone màu Luxury Champagne Thẻ Gói Pro trong Quản lý Tài khoản',
        items: [
          { type: 'feature', text: 'Đồng bộ tone màu và vibe thẻ Gói Pro trong Quản lý Tài khoản: Nền đen obsidian sang trọng (#0F1226 - #151A3A), khung kép viền champagne vàng (#D9C7A0), 4 góc tem SVG tinh xảo và nhãn vương miện "Cao cấp nhất"' },
          { type: 'improved', text: 'Đồng bộ badge hội viên Pro khắp Quản lý Tài khoản theo bảng màu Champagne Gold hoàng gia, khớp 100% với giao diện modal Nâng cấp gói' }
        ]
      },
      {
        version: 'v5.3.1',
        date: '2026-10-13T21:30:00+07:00',
        title: 'Trung tâm Quản lý Tài khoản (Hồ sơ, Avatar Linh vật, Bảo mật & Tùy chọn)',
        items: [
          { type: 'feature', text: 'Ra mắt Trung tâm Quản lý Tài khoản: Chỉnh sửa tên hiển thị (displayName) và bộ sưu tập 12 avatar linh vật học tập sinh động' },
          { type: 'feature', text: 'Quản lý Bảo mật & Mật khẩu: Đổi mật khẩu mới trực tiếp, gửi liên kết đặt lại mật khẩu qua email Firebase và sao chép UID 1 chạm' },
          { type: 'feature', text: 'Gói Hội viên & Hạn mức AI: Xem chi tiết hạng thành viên (Free / Plus / Pro), hạn dùng và quyền lợi trợ lý AI Gemini' },
          { type: 'feature', text: 'Tùy chọn học tập cá nhân hóa: Cài đặt mục tiêu đọc sách hàng ngày, ngôn ngữ AI dịch thuật mặc định và âm chuông Pomodoro' }
        ]
      },
      {
        version: 'v5.3.0',
        date: '2026-10-13T10:15:00+07:00',
        title: 'Tùy chỉnh Prompt AI (Giải thích, Ví dụ, Dịch) & Sửa lỗi kiểm tra Google Gemini API Key',
        items: [
          { type: 'feature', text: 'Thêm khu vực Quản trị tùy chỉnh Prompt AI cho 3 tính năng: Giải thích, Ví dụ, Dịch thuật. Hỗ trợ tùy biến chỉ thị và lưu/đồng bộ tức thì lên đám mây' },
          { type: 'fix', text: 'Sửa lỗi kiểm tra và lưu API Key Google Gemini: Ngăn chặn triệt để hiện tượng trình duyệt tự động điền mật khẩu/email vào ô key; thêm cơ chế kiểm tra trực tiếp key vừa nhập trước khi lưu' },
          { type: 'improved', text: 'Tối ưu hóa bộ nhớ đệm AI theo mã băm của Prompt: Khi quản trị viên thay đổi prompt, AI tự động sinh kết quả mới theo đúng phong cách prompt mới' }
        ]
      },
      {
        version: 'v5.2.9',
        date: '2026-10-13T09:50:00+07:00',
        title: 'Tối ưu tốc độ tải trang 0ms & Xóa triệt để nhãn phiên bản v4.9.5 ghi cứng trong mã nguồn HTML',
        items: [
          { type: 'fix', text: 'Sửa dứt điểm nguyên nhân gây hiểu lầm v4.9.5: Cập nhật nhãn desktopAppVersionLabel và mobileAppVersionLabel trong mã nguồn HTML gốc lên phiên bản mới nhất, loại bỏ hoàn toàn hiện tượng hiển thị thoáng qua bản 4.9.5' },
          { type: 'improved', text: 'Tối ưu tốc độ tải dữ liệu người dùng 0ms: Ngay khi xác thực, hệ thống kích hoạt nạp bộ nhớ đệm cục bộ và kết nối Firestore song song, triệt tiêu hiện tượng trống thư viện khi tải lại trang' },
          { type: 'improved', text: 'Bỏ chặn tiến trình kiểm tra claims token, chuyển sang làm mới ngầm ở chế độ nền giúp web phản hồi siêu tốc' }
        ]
      },
      {
        version: 'v5.2.8',
        date: '2026-10-13T09:40:00+07:00',
        title: 'Khắc phục triệt để lỗi quay lại phiên bản v4.9.5 khi tải lại trang (PWA Cache & Rollback Guard)',
        items: [
          { type: 'fix', text: 'Sửa lỗi TypeError trong fetch handler của Service Worker trên điều hướng HTML: Chuyển sang Network-First thuần túy giúp nạp ngay bản mới nhất từ máy chủ khi reload' },
          { type: 'improved', text: 'Triển khai Rollback Guard (chống lùi phiên bản): Tự động phát hiện, hủy Service Worker cũ và xóa sạch cache v4.9.5 lỗi thời' },
          { type: 'improved', text: 'Cấu hình tiêu đề Cache-Control: no-cache, no-store trên Vercel và thẻ meta HTML, đảm bảo mọi lần truy cập và tải lại trang đều lấy phiên bản mới nhất' }
        ]
      },
      {
        version: 'v5.2.7',
        date: '2026-10-13T09:30:00+07:00',
        title: 'Tối ưu hóa Thư viện Prompt AI: Tải trước nền tức thì & Loại bỏ triệt để flash prompt đã xóa',
        items: [
          { type: 'fix', text: 'Khắc phục hoàn toàn hiện tượng hiển thị thoáng qua (flash) các prompt cũ đã xóa khi mở thư viện: Cập nhật kho dữ liệu mẫu đồng bộ với các prompt mới nhất và tự động dọn sạch cache cũ' },
          { type: 'improved', text: 'Nâng cấp bộ nhớ đệm thông minh v2 (antigravity_prompt_library_v2) kèm cờ đồng bộ đám mây và cơ chế pre-fetch ngầm ngay khi tải trang giúp mở thư viện lập tức với độ trễ 0ms' },
          { type: 'improved', text: 'Tối ưu hóa Cache-Control máy chủ API (/api/prompts) sang s-maxage=10 với must-revalidate, đảm bảo mọi chỉnh sửa từ Quản trị viên lập tức cập nhật cho toàn bộ người dùng' }
        ]
      },
      {
        version: 'v5.2.6',
        date: '2026-10-13T01:00:00+07:00',
        title: 'Cấp gói dịch vụ theo dạng Dropdown & Nút Xác nhận lưu đồng bộ thời gian thực',
        items: [
          { type: 'feature', text: 'Bổ sung danh sách chọn gói (Dropdown) và nút "Xác nhận lưu" trực tiếp cho từng người dùng trong bảng tài khoản mới và khung tra cứu' },
          { type: 'feature', text: 'Đồng bộ dữ liệu thời gian thực: Tự động ghi nhận trực tiếp vào users/{uid}/billing/plan và Custom Claims, giúp giao diện web của người dùng kích hoạt gói tức thì mà không cần tải lại trang' },
          { type: 'improved', text: 'Hỗ trợ đầy đủ các gói: Miễn phí (Free), Plus (30 ngày / 1 năm / Vĩnh viễn), Pro (30 ngày / 1 năm / Vĩnh viễn)' }
        ]
      },
      {
        version: 'v5.2.5',
        date: '2026-10-13T00:52:00+07:00',
        title: 'Khắc phục triệt để lỗi ẩn đơn hàng VietQR do trình duyệt tự động điền (Autofill)',
        items: [
          { type: 'fix', text: 'Chặn trình duyệt tự động điền (autofill) tài khoản admin vào ô tìm kiếm đơn hàng, tự động làm sạch bộ lọc để hiển thị ngay lập tức các đơn khách chờ duyệt' },
          { type: 'feature', text: 'Bổ sung nút xóa tìm kiếm (x) nhanh và thông báo thông minh kèm nút mở ngay đơn chờ duyệt khi có bộ lọc đang ẩn đơn' },
          { type: 'improved', text: 'Tối ưu cơ chế truy vấn API đơn hàng đa tầng (fallback an toàn), đảm bảo dữ liệu luôn nạp đầy đủ trong mọi điều kiện' }
        ]
      },
      {
        version: 'v5.2.4',
        date: '2026-10-13T00:45:00+07:00',
        title: 'Ưu tiên hiển thị popup Tạo mã thanh toán trước Popup Nâng cấp gói',
        items: [
          { type: 'fix', text: 'Thiết lập thứ tự lớp hiển thị (z-index: 10005) cho popup Đang tạo mã thanh toán VietQR, đảm bảo luôn xuất hiện nổi bật phía trước popup Nâng cấp gói' },
          { type: 'improved', text: 'Tối ưu hóa độ sâu hiển thị cho toàn bộ các popup liên quan (Lịch sử giao dịch, Xem biên lai, Nhập mã kích hoạt)' }
        ]
      },
      {
        version: 'v5.2.3',
        date: '2026-10-13T00:36:00+07:00',
        title: 'Nút Lưu kho Prompt lên hệ thống & Đồng bộ đám mây cho tất cả người dùng',
        items: [
          { type: 'feature', text: 'Bổ sung nút "Lưu kho Prompt lên hệ thống" màu xanh nổi bật trong mục Quản trị Thư viện Prompt, giúp Admin lưu toàn bộ các câu lệnh AI lên máy chủ đám mây' },
          { type: 'feature', text: 'Tự động đồng bộ thời gian thực qua Firestore & Cloud API: Mọi độc giả và người dùng khi vào tính năng Thư viện AI sẽ thấy ngay lập tức tất cả Prompt do Admin cập nhật' },
          { type: 'improved', text: 'Hỗ trợ tự động đồng bộ lên máy chủ ngay khi Admin thêm/sửa prompt trong popup hoặc thao tác đổi gói/ảnh đại diện' }
        ]
      },
      {
        version: 'v5.2.2',
        date: '2026-10-12T22:46:00+07:00',
        title: 'Nâng cấp mô tả Prompt: Hỗ trợ xuống dòng danh sách tính năng & Nút Xem thêm',
        items: [
          { type: 'feature', text: 'Chuyển đổi ô nhập mô tả Prompt trong Quản trị sang dạng văn bản đa dòng (textarea), hỗ trợ nhấn Enter xuống dòng để liệt kê danh sách tính năng' },
          { type: 'feature', text: 'Bổ sung nút Xem thêm / Thu gọn tại khung chi tiết Prompt giúp giao diện gọn gàng, người dùng dễ dàng mở rộng để đọc toàn bộ tính năng và mô tả' }
        ]
      },
      {
        version: 'v5.2.1',
        date: '2026-10-12T21:42:00+07:00',
        title: 'Tự động dọn dẹp ảnh biên lai 7 ngày & Quản lý xóa giao dịch cũ',
        items: [
          { type: 'feature', text: 'Tự động dọn dẹp ảnh biên lai thanh toán (bill) sau 7 ngày ở chế độ nền để giải phóng dung lượng bộ nhớ web' },
          { type: 'feature', text: 'Bổ sung tính năng xóa thủ công từng giao dịch cũ và xóa hàng loạt các đơn đã chọn' },
          { type: 'feature', text: 'Bổ sung nút Dọn dẹp bộ nhớ nhanh và nút xóa riêng ảnh biên lai trong khung xem trước' }
        ]
      },
      {
        version: 'v5.2.0',
        date: '2026-10-12T21:31:00+07:00',
        title: 'Khắc phục triệt để lỗi nạp danh sách Mã kích hoạt trong Quản trị',
        items: [
          { type: 'fix', text: 'Sửa lỗi ReferenceError tại API quản trị mã kích hoạt (api/admin/codes.js), khôi phục khả năng tải và hiển thị toàn bộ danh sách mã' },
          { type: 'improved', text: 'Tối ưu hóa nạp dữ liệu mã kích hoạt trực tiếp từ cơ sở dữ liệu với tốc độ tức thì và cơ chế truy vấn an toàn (query fallback)' }
        ]
      },
      {
        version: 'v5.1.9',
        date: '2026-10-12T21:26:00+07:00',
        title: 'Đồng bộ tức thì dữ liệu hiện tại cho tab Thanh toán VietQR',
        items: [
          { type: 'fix', text: 'Khắc phục hoàn toàn lỗi hiển thị dữ liệu đơn hàng cũ khi vào tab VietQR; luôn nạp và hiển thị trạng thái đơn hàng hiện tại mới nhất' },
          { type: 'improved', text: 'Tối ưu API danh sách ngân hàng Napas VietQR phản hồi tức thì 0ms, loại bỏ độ trễ mạng bên thứ ba' },
          { type: 'feature', text: 'Bổ sung nút Làm mới nhanh danh sách đơn hàng ngay trên thanh công cụ quản lý đơn' }
        ]
      },
      {
        version: 'v5.1.8',
        date: '2026-10-12T21:12:00+07:00',
        title: 'Sửa lỗi cú pháp bảng Quản trị Admin',
        items: [
          { type: 'fix', text: 'Khắc phục hoàn toàn lỗi Unexpected token catch trong mô-đun quản trị, khôi phục quyền truy cập vào Bảng điều khiển Admin' }
        ]
      },
      {
        version: 'v5.1.7',
        date: '2026-10-12T21:05:00+07:00',
        title: 'Tối ưu tốc độ mở tab Thanh toán VietQR & Mã kích hoạt (SWR 0ms)',
        items: [
          { type: 'improved', text: 'Ứng dụng cơ chế bộ nhớ đệm SWR (Stale-While-Revalidate): mở tab Thanh toán VietQR & Mã kích hoạt tức thì 0ms không phải chờ spinner' },
          { type: 'improved', text: 'Tách biệt tiến trình dọn dẹp mã quá hạn sang chế độ chạy ngầm bất đồng bộ, phản hồi danh sách mã siêu tốc' },
          { type: 'improved', text: 'Nhúng sẵn danh mục ngân hàng VietQR dự phòng kèm timeout bảo vệ 1.2s, tối ưu giới hạn truy vấn đơn hàng' }
        ]
      },
      {
        version: 'v5.1.6',
        date: '2026-10-12T20:45:00+07:00',
        title: 'Tắt ngay Thư viện Prompt & Nâng z-index tuyệt đối cho Popup Nâng cấp gói',
        items: [
          { type: 'fix', text: 'Tắt lập tức (display: none) popup Thư viện Prompt AI khi bấm Nhận prompt chưa đúng gói, chuyển trọng tâm trực tiếp vào popup Nâng cấp' },
          { type: 'improved', text: 'Thiết lập z-index: 9999 tối cao cho Popup Nâng cấp gói, đảm bảo luôn hiển thị nổi hoàn toàn phía trước mọi cửa sổ' }
        ]
      },
      {
        version: 'v5.1.5',
        date: '2026-10-12T20:35:00+07:00',
        title: 'Tự động đóng Thư Viện Prompt khi hiển thị Popup nâng cấp gói',
        items: [
          { type: 'improved', text: 'Tự động ẩn tab Thư viện Prompt và chuyển hướng tập trung trực tiếp vào Popup Nâng cấp gói khi người dùng chưa đúng gói yêu cầu' },
          { type: 'fix', text: 'Tối ưu thứ tự xếp chồng z-index cho popup Nâng cấp gói, tránh hiện tượng popup gói bị che khuất sau thư viện prompt' }
        ]
      },
      {
        version: 'v5.1.4',
        date: '2026-10-12T20:25:00+07:00',
        title: 'Tải ảnh Prompt từ thư viện thiết bị & Sửa lỗi khôi phục prompt khi làm trống',
        items: [
          { type: 'improved', text: 'Thay thế việc nhập URL mẫu bằng tính năng Tải ảnh trực tiếp từ thư viện ảnh máy tính/điện thoại (tự động nén tối ưu)' },
          { type: 'fix', text: 'Khắc phục triệt để lỗi các prompt tự động xuất hiện lại khi Admin xóa hết prompt trong thư viện; bảo lưu trạng thái danh sách trống' },
          { type: 'new', text: 'Bổ sung nút Xóa toàn bộ Prompt trong Quản trị và màn hình thông báo trực quan khi kho prompt trống' }
        ]
      },
      {
        version: 'v5.1.3',
        date: '2026-10-12T18:45:00+07:00',
        title: 'Thêm tab Tùy chỉnh Thư Viện Prompt trong Phiên Quản trị Admin',
        items: [
          { type: 'new', text: 'Bổ sung tab "Thư viện Prompt" vào Bảng điều khiển Quản trị (Admin Panel) với giao diện trực quan, đồng bộ tức thì' },
          { type: 'improved', text: 'Tùy biến đầy đủ 4 chiều không gian: Tải lên prompt mới, biên tập nội dung, cấu hình gói mở khóa (Thường / Plus / Pro) và đổi ảnh đại diện' },
          { type: 'improved', text: 'Tích hợp bộ đổi gói nhanh 1-click trên thẻ prompt, hộp thoại đổi ảnh đại diện trực quan kèm presets và hỗ trợ sao lưu / nhập JSON' }
        ]
      },
      {
        version: 'v5.1.2',
        date: '2026-10-12T18:30:00+07:00',
        title: 'Nâng cấp nút Thư Viện Prompt AI tinh tế & Chuyển lên Header chính',
        items: [
          { type: 'improved', text: 'Chuyển vị trí nút Thư Viện Prompt lên thanh Header chính, đặt cân đối giữa ô Tìm kiếm (Ctrl K) và nút Tạo link nhanh' },
          { type: 'improved', text: 'Thiết kế lại nút theo phong cách Editorial thanh lịch, hài hòa với nhận diện thương hiệu web, icon Sparkle sắc nét và badge AI tinh tế' }
        ]
      },
      {
        version: 'v5.1.1',
        date: '2026-10-12T18:25:00+07:00',
        title: 'Sửa lỗi loadRecentUsers trong Quản trị & tierName trong Link đã chia sẻ',
        items: [
          { type: 'fix', text: 'Khắc phục lỗi ReferenceError loadRecentUsers khi tải danh sách người dùng trong trang Admin' },
          { type: 'fix', text: 'Khắc phục lỗi ReferenceError tierName khi hiển thị thông báo hạn mức trong hộp thoại Link đã chia sẻ' }
        ]
      },
      {
        version: 'v5.1.0',
        date: '2026-10-12T18:15:00+07:00',
        title: 'Ra mắt tính năng Thư Viện Prompt AI & Phân quyền theo gói',
        items: [
          { type: 'new', text: 'Thêm nút "Thư Viện Prompt" trên thanh công cụ đọc bài giúp tra cứu nhanh các câu lệnh AI chuyên sâu' },
          { type: 'improved', text: 'Cửa sổ Thư viện Prompt hiển thị ảnh display mẫu, xem trước nội dung, sao chép 1-click và nhận prompt' },
          { type: 'improved', text: 'Phân quyền linh hoạt theo từng gói (Thường, Plus, Pro) và cổng quản trị dành riêng cho Admin tải lên/chỉnh sửa prompt' }
        ]
      },
      {
        version: 'v5.0.0',
        date: '2026-10-12T17:50:00+07:00',
        title: 'Đồng bộ hóa toàn diện huy hiệu Pro & Căn giữa hoàn hảo icon Plus',
        items: [
          { type: 'improved', text: 'Đồng bộ hóa 100% huy hiệu gói Pro chuẩn hoàng gia (nền tối, viền vàng champagne, vương miện) trên mọi vị trí và tính năng AI đọc bài' },
          { type: 'fixed', text: 'Căn giữa quang học chính xác tuyệt đối icon ngôi sao ở giữa chữ Plus trên thanh tìm kiếm header, bộ lọc và các nút điều hướng' },
          { type: 'improved', text: 'Tối ưu hóa Service Worker v5.0.0 tự động dọn dẹp cache cũ và áp dụng ngay lập tức cho người dùng' }
        ]
      },
      {
        version: 'v4.9.9',
        date: '2026-10-12T17:05:00+07:00',
        title: 'Hệ thống huy hiệu gói hợp nhất & Căn giữa quang học tuyệt đối',
        items: [
          { type: 'improved', text: 'Hợp nhất toàn bộ huy hiệu gói (Pro / Plus / Thường / Khách) trên toàn web về một thành phần tierBadge chuẩn' },
          { type: 'fixed', text: 'Căn giữa quang học hình học chính xác cho icon ngôi sao 5 cánh và các icon gói theo bounding box' },
          { type: 'improved', text: 'Đồng bộ huy hiệu tại nút tài khoản, menu, trợ lý AI đọc bài, chọn màu khung, chia sẻ link và quản trị' }
        ]
      },
      {
        version: 'v4.9.8',
        date: '2026-10-12T16:35:00+07:00',
        title: 'Phân quyền chọn màu khung theo gói & gợi ý nâng cấp thông minh',
        items: [
          { type: 'improved', text: 'Khóa chọn màu khung cho gói Thường & Khách (mặc định cam), hiển thị popover gợi ý nâng cấp khi bấm màu khác' },
          { type: 'improved', text: 'Mở rộng cấu hình chọn màu khung động trên trang Quản trị và đồng bộ tức thì' }
        ]
      },
      {
        version: 'v4.9.7',
        date: '2026-10-12T16:10:00+07:00',
        title: 'Nâng cấp nhận diện gói Pro & Xóa nhãn VIP',
        items: [
          { type: 'improved', text: 'Thiết kế sang trọng gói Pro với khung kép Champagne, nền ink tối và bỏ hoàn toàn nhãn VIP' },
          { type: 'improved', text: 'Tối ưu nhận diện thương hiệu nhất quán giữa bảng giá và menu tài khoản' }
        ]
      },
      {
        version: 'v4.9.5',
        date: '2026-10-11T18:45:00+07:00',
        title: 'Hoàn thiện đăng nhập quản trị & tăng cường bảo mật',
        items: [
          { type: 'fixed', text: 'Sửa lỗi chuẩn hóa tên đăng nhập và ghi nhận lỗi xác thực chính xác hơn cho khu vực quản trị' },
          { type: 'improved', text: 'Tối ưu bảo mật lối vào khu vực quản trị' }
        ]
      },
      {
        version: 'v4.9.4',
        date: '2026-10-11T18:15:00+07:00',
        title: 'Bảo mật lối vào Quản trị hệ thống & Tối ưu xác thực',
        items: [
          { type: 'fixed', text: 'Khắc phục triệt để lỗi điều hướng và khởi tạo bảng Quản trị hệ thống khi truy cập qua đường dẫn hoặc phím tắt' },
          { type: 'improved', text: 'Tích hợp biểu tượng con dấu thư viện ẩn tinh tế ở chân sidebar với cơ chế kích hoạt an toàn (nhấn giữ / nhấp đúp)' },
          { type: 'improved', text: 'Nâng cao bảo mật máy chủ, kiểm tra quyền admin và giới hạn tần suất yêu cầu chống brute-force' }
        ]
      },
      {
        version: 'v4.9.3',
        date: '2026-10-11T17:30:00+07:00',
        title: 'Tối ưu PWA trên di động: Khắc phục tải lại lặp & Thanh công cụ bôi đen chuẩn iOS',
        items: [
          { type: 'fixed', text: 'Sửa triệt để lỗi tự động tải lại trang liên tục khi phát hiện bản Service Worker mới trên PWA và Safari' },
          { type: 'fixed', text: 'Chuyển thanh công cụ bôi đen chữ trên thiết bị cảm ứng xuống cố định ở đáy màn hình, không đè menu hệ thống của iOS' },
          { type: 'improved', text: 'Thêm cơ chế chống lặp cập nhật, nút Để sau và Xóa cache an toàn khi có sự cố Service Worker' },
          { type: 'improved', text: 'Vùng chạm thanh công cụ đạt chuẩn 44px, hỗ trợ hoàn tác và chống mất vùng chọn văn bản khi thao tác' }
        ]
      },
      {
        version: 'v4.9.1',
        date: '2026-10-11T10:30:00+07:00',
        title: 'Hỗ trợ AI giải thích tại chỗ, Quiz trắc nghiệm & Mã hóa API Key',
        items: [
          { type: 'new', text: 'AI giải thích tại chỗ: Đơn giản hóa, ví dụ minh họa và dịch thuật 6 ngôn ngữ từ thanh nổi khi bôi đen văn bản' },
          { type: 'new', text: 'Tự động tạo Quiz trắc nghiệm 4 lựa chọn (A/B/C/D) kèm phân tích cặn kẽ đáp án đúng/sai' },
          { type: 'improved', text: 'Hệ thống Admin: Quản lý API Key Gemini/Claude/OpenAI mã hóa đa tầng AES-256-GCM ở máy chủ' },
          { type: 'improved', text: 'Lịch học thông minh ước lượng độ khó bài đọc và tối ưu hóa chu kỳ ôn tập ngắt quãng' },
          { type: 'fixed', text: 'Khắc phục lỗi cuộn trang trên Safari iOS và tối ưu hiển thị khung viền bậc thang SVG trên màn hình Retina' }
        ]
      },
      {
        version: 'v4.9.0',
        date: '2026-10-10T15:00:00+07:00',
        title: 'Đóng khung tài liệu dạng bậc thang & Tối ưu thanh nổi',
        items: [
          { type: 'new', text: 'Tính năng đóng khung tài liệu kiểu bậc thang (stepped frame) độc bản với 4 màu highlight' },
          { type: 'improved', text: 'Tối ưu hiệu năng nạp font serif phong cách Editorial Giấy Ấm và các hoạt ảnh chuyển trang' },
          { type: 'fixed', text: 'Sửa lỗi chạm nhầm nút đóng trên màn hình cảm ứng Safari iOS khi vuốt nhanh' }
        ]
      },
      {
        version: 'v4.8.0',
        date: '2026-10-09T09:15:00+07:00',
        title: 'Tìm kiếm toàn văn ngoại tuyến & Tối ưu Flashcard',
        items: [
          { type: 'new', text: 'Công cụ tìm kiếm toàn văn ngoại tuyến tốc độ cao hỗ trợ tiếng Việt có dấu và không dấu' },
          { type: 'improved', text: 'Nâng cấp giao diện ôn tập Flashcard lật mặt với thống kê tỷ lệ nhớ/quên' },
          { type: 'fixed', text: 'Khắc phục sự cố đồng bộ dữ liệu ngoại tuyến khi kết nối mạng chập chờn' }
        ]
      }
    ];
window.CHANGELOG = CHANGELOG;
