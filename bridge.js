// bridge.js - Bộ tạo mã Bridge Script tiêm vào trong Sandboxed Iframe bài học
    // Bộ tạo mã Bridge Script tiêm vào trong Sandboxed Iframe
    function buildSandboxBridgeCode() {
      const openTag = '<' + 'script>';
      const closeTag = '<' + '/script>';
      const bridgeJs = `
(function() {
  const BRIDGE_VER = '1.0.0';
  let currentScale = 1.0;
  let searchMatches = [];
  let currentMatchIdx = -1;

  // 1. Thẻ Style nội bộ cho Sandbox
  const bridgeStyle = document.createElement('style');
  bridgeStyle.id = '__bridge_sandbox_styles';
  bridgeStyle.textContent = \`
    .custom-highlight { border-radius: 3px; padding: 1px 3px; cursor: pointer; transition: filter 0.15s ease; }
    img:not(a img) { cursor: zoom-in; }
    .custom-highlight:hover { filter: brightness(0.92); }
    .custom-highlight-yellow { background-color: #FEF08A !important; color: #1C1917 !important; }
    .custom-highlight-green { background-color: #BBF7D0 !important; color: #1C1917 !important; }
    .custom-highlight-pink { background-color: #FBCFE8 !important; color: #1C1917 !important; }
    .tts-active-highlight { outline: 2px solid #6366F1 !important; background-color: rgba(99, 102, 241, 0.18) !important; border-radius: 4px; transition: all 0.2s ease; }
    .search-match-highlight { background-color: #FDE047 !important; color: #000 !important; border-radius: 2px; }
    .search-match-active { background-color: #EA580C !important; color: #FFF !important; font-weight: bold; border-radius: 2px; }
    @keyframes searchBoxPulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.65), 0 4px 12px rgba(0,0,0,0.18); }
      50% { transform: scale(1.02); box-shadow: 0 0 0 7px rgba(99, 102, 241, 0.32), 0 6px 18px rgba(0,0,0,0.24); }
      100% { transform: scale(1); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.22), 0 4px 12px rgba(0,0,0,0.18); }
    }
    @keyframes searchBoxPulseAi {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7), 0 4px 14px rgba(139, 92, 246, 0.3); }
      50% { transform: scale(1.025); box-shadow: 0 0 0 10px rgba(139, 92, 246, 0.35), 0 8px 24px rgba(139, 92, 246, 0.4); }
      100% { transform: scale(1); box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.28), 0 6px 18px rgba(139, 92, 246, 0.3); }
    }
    .search-highlight-overlay-box.is-ai-match {
      border: 2.5px solid #8B5CF6 !important;
      border-radius: 8px !important;
      background-color: rgba(139, 92, 246, 0.16) !important;
      box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.28), 0 8px 24px rgba(139, 92, 246, 0.25) !important;
    }
    @media (prefers-reduced-motion: reduce) {
      .search-highlight-overlay-box { animation: none !important; }
    }
    .search-highlight-overlay-box {
      position: absolute;
      border: 2px solid #6366F1 !important;
      border-radius: 6px !important;
      background-color: rgba(99, 102, 241, 0.16) !important;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.22), 0 4px 14px rgba(0, 0, 0, 0.18) !important;
      pointer-events: none !important;
      z-index: 999999 !important;
      box-sizing: border-box !important;
      transition: top 0.15s ease-out, left 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out, opacity 0.3s ease;
    }

    /* Chống vòng lặp phình chiều cao theo viewport iframe */
    html, body {
      min-height: 0 !important;
      height: auto !important;
    }
    body {
      touch-action: manipulation;
    }
    /* Đóng khung văn bản: Phần tử đánh dấu (mark) chỉ dùng để định vị, KHÔNG gắn border/outline/box-shadow lên nó */
    .text-frame {
      display: inline;
      padding: 0;
      margin: 0;
      line-height: inherit !important;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      cursor: text;
    }
    /* Lớp overlay chứa các khung vẽ SVG theo hình bậc thang */
    #ann-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: visible;
    }
    .ann-frame {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }
    .ann-frame path {
      pointer-events: none;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
      transition: stroke 0.15s ease, fill 0.15s ease;
    }
    @keyframes frameFlashPulse {
      0% { filter: drop-shadow(0 0 4px #6366f1) drop-shadow(0 0 12px rgba(99, 102, 241, 0.8)); }
      50% { filter: drop-shadow(0 0 8px #6366f1) drop-shadow(0 0 20px rgba(99, 102, 241, 0.9)); }
      100% { filter: none; }
    }
    .frame-flash-highlight {
      animation: frameFlashPulse 1.8s ease-out 1 !important;
    }
    html.hide-text-frames #ann-layer, body.hide-text-frames #ann-layer {
      display: none !important;
    }
  \`;
  (document.head || document.documentElement).appendChild(bridgeStyle);

  const PALETTE = {
    yellow: { border: '#d97706', glow: 'rgba(217, 119, 6, 0.25)', bg: 'rgba(217, 119, 6, 0.05)', badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#f59e0b' },
    green: { border: '#059669', glow: 'rgba(5, 150, 105, 0.25)', bg: 'rgba(5, 150, 105, 0.05)', badgeBg: '#d1fae5', badgeText: '#065f46', badgeBorder: '#10b981' },
    pink: { border: '#db2777', glow: 'rgba(219, 39, 119, 0.25)', bg: 'rgba(219, 39, 119, 0.05)', badgeBg: '#fce7f3', badgeText: '#9d174d', badgeBorder: '#ec4899' },
    purple: { border: '#7c3aed', glow: 'rgba(124, 58, 237, 0.25)', bg: 'rgba(124, 58, 237, 0.05)', badgeBg: '#ede9fe', badgeText: '#5b21b6', badgeBorder: '#8b5cf6' }
  };

  function getPaletteColors(colorName, customHex) {
    if (customHex && typeof customHex === 'string' && customHex.startsWith('#')) {
      return {
        border: customHex,
        glow: customHex + '40',
        bg: customHex + '0d',
        badgeBg: customHex + '22',
        badgeText: customHex,
        badgeBorder: customHex
      };
    }
    return PALETTE[colorName] || PALETTE.yellow;
  }

  function ensureAnnLayer() {
    let layer = document.getElementById('ann-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'ann-layer';
      const root = document.body || document.documentElement;
      if (root) {
        if (window.getComputedStyle(root).position === 'static') {
          root.style.position = 'relative';
        }
        root.appendChild(layer);
      }
    }
    return layer;
  }

  // Khung duy nhất bao quanh toàn bộ đoạn đã chọn
  let isUpdatingPositions = false;
  let layoutRafId = null;

  function scheduleUpdateFramePositions() {
    if (layoutRafId) cancelAnimationFrame(layoutRafId);
    layoutRafId = requestAnimationFrame(() => {
      layoutRafId = null;
      updateAllFramePositions();
    });
  }

  // 1. Hàm getTextRects(range) CHỈ lấy rect của chữ, bỏ qua rect của phần tử khối
  function getTextRects(range, layerRect, scale = 1.0) {
    if (!range) return [];
    const textNodes = [];
    const root = range.commonAncestorContainer || document.body;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_REJECT;
        }
      },
      false
    );

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    if (textNodes.length === 0) return [];

    const rawRects = [];
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      const val = node.nodeValue;
      let start = (node === range.startContainer) ? range.startOffset : 0;
      let end = (node === range.endContainer) ? range.endOffset : val.length;

      start = Math.max(0, Math.min(start, val.length));
      end = Math.max(0, Math.min(end, val.length));
      if (start >= end) continue;

      let subText = val.substring(start, end);
      if (!subText.trim()) continue; // Bỏ qua nếu đoạn chỉ gồm khoảng trắng/xuống dòng

      // Cắt khoảng trắng đầu/cuối vùng chọn trước khi tính (không tính khoảng trắng cuối dòng cuối)
      while (start < end && /\s/.test(val[start])) {
        start++;
      }
      while (end > start && /\s/.test(val[end - 1])) {
        end--;
      }
      if (start >= end) continue;

      try {
        const sub = document.createRange();
        sub.setStart(node, start);
        sub.setEnd(node, end);
        const rects = sub.getClientRects();
        if (rects && rects.length > 0) {
          for (let j = 0; j < rects.length; j++) {
            const r = rects[j];
            if (r.width >= 1 && r.height >= 1) {
              rawRects.push({
                left: (r.left - layerRect.left) / scale,
                top: (r.top - layerRect.top) / scale,
                right: (r.right - layerRect.left) / scale,
                bottom: (r.bottom - layerRect.top) / scale,
                width: r.width / scale,
                height: r.height / scale
              });
            }
          }
        }
      } catch (_) {}
    }

    return rawRects;
  }

  // 2. Gộp rect theo dòng: cùng dòng khi độ lệch top nhỏ hoặc giao nhau theo chiều dọc, và liền nhau theo chiều ngang
  function mergeRectsByLine(rects) {
    if (!rects || rects.length === 0) return [];
    // Sắp xếp theo top, cùng dòng (chênh <= 3px) thì sắp xếp theo left
    const sorted = [...rects].sort((a, b) => (Math.abs(a.top - b.top) <= 3) ? (a.left - b.left) : (a.top - b.top));
    const lines = [];

    for (const r of sorted) {
      if (r.width < 1 || r.height < 1) continue;
      let foundLine = null;
      for (const line of lines) {
        const vertOverlap = Math.min(line.bottom, r.bottom) - Math.max(line.top, r.top);
        const minHeight = Math.min(line.bottom - line.top, r.height);
        const isSameLineVert = Math.abs(line.top - r.top) <= 4 || (minHeight > 0 && vertOverlap >= minHeight * 0.4);

        if (isSameLineVert) {
          const horizOverlap = Math.min(line.right, r.right) - Math.max(line.left, r.left);
          const horizGap = Math.max(0, Math.max(line.left, r.left) - Math.min(line.right, r.right));
          // Gộp khi hai đoạn từ nằm trên cùng một dòng và khoảng cách chữ <= 60px (chứa được mũi tên ➔, biểu tượng unicode và khoảng cách)
          if (horizOverlap > -4 || horizGap <= 60) {
            foundLine = line;
            break;
          }
        }
      }

      if (foundLine) {
        // Hợp left-right CHỈ trong phạm vi các rect chữ của dòng đó
        foundLine.left = Math.min(foundLine.left, r.left);
        foundLine.right = Math.max(foundLine.right, r.right);
        foundLine.top = Math.min(foundLine.top, r.top);
        foundLine.bottom = Math.max(foundLine.bottom, r.bottom);
      } else {
        lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    }

    lines.sort((a, b) => (Math.abs(a.top - b.top) <= 3) ? (a.left - b.left) : (a.top - b.top));
    return lines;
  }

  function buildSteppedPath(rawLines, radius = 6, pad = 3) {
    if (!rawLines || rawLines.length === 0) return '';
    // Sắp xếp các dòng theo thứ tự từ trên xuống dưới
    const lines = rawLines
      .map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }))
      .sort((a, b) => (Math.abs(a.top - b.top) <= 3) ? (a.left - b.left) : (a.top - b.top));

    // BƯỚC 1: Phân tách thành các khối liên tục (components) TRƯỚC KHI chỉnh sửa toạ độ
    // Hai dòng chỉ thuộc cùng một khối liên tục nếu:
    // 1) Dòng sau nằm ngay dưới dòng trước (vertGap <= 14px, không phải cách đoạn hay cách ô)
    // 2) Có giao nhau hoặc thẳng hàng theo chiều ngang (horizOverlap >= -8px)
    const components = [];
    let curr = [lines[0]];

    for (let i = 1; i < lines.length; i++) {
      const prev = curr[curr.length - 1];
      const next = lines[i];

      const horizOverlap = Math.min(prev.right, next.right) - Math.max(prev.left, next.left);
      const vertGap = next.top - prev.bottom;

      if (horizOverlap >= -8 && vertGap >= -6 && vertGap <= 14) {
        curr.push(next);
      } else {
        components.push(curr);
        curr = [next];
      }
    }
    if (curr.length > 0) {
      components.push(curr);
    }

    // BƯỚC 2: Xử lý và nối toạ độ riêng cho từng khối (component)
    return components.map(comp => {
      if (!comp || comp.length === 0) return '';

      const cLines = comp.map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));

      // Nới top/bottom của các dòng liên tiếp TRONG CÙNG MỘT KHỐI để chạm nhau, triệt tiêu khe hở
      for (let i = 0; i < cLines.length - 1; i++) {
        const mid = (cLines[i].bottom + cLines[i + 1].top) / 2.0;
        cLines[i].bottom = mid + 1;
        cLines[i + 1].top = mid - 1;
      }

      // Thêm padding cho các mép ngoài của khối
      cLines[0].top -= pad;
      cLines[cLines.length - 1].bottom += pad;
      for (let i = 0; i < cLines.length; i++) {
        cLines[i].left -= pad;
        cLines[i].right += pad;
      }

      return buildSingleComponentPath(cLines, radius);
    }).filter(Boolean).join(' ');
  }

  function buildSingleComponentPath(lines, radius) {
    if (!lines || lines.length === 0) return '';
    if (lines.length === 1) {
      const r = lines[0];
      const w = r.right - r.left;
      const h = r.bottom - r.top;
      const rad = Math.min(radius, w / 2.0, h / 2.0);
      const L = r.left, R = r.right, T = r.top, B = r.bottom;
      return 'M ' + (L + rad).toFixed(1) + ' ' + T.toFixed(1) + ' L ' + (R - rad).toFixed(1) + ' ' + T.toFixed(1) + ' Q ' + R.toFixed(1) + ' ' + T.toFixed(1) + ' ' + R.toFixed(1) + ' ' + (T + rad).toFixed(1) + ' L ' + R.toFixed(1) + ' ' + (B - rad).toFixed(1) + ' Q ' + R.toFixed(1) + ' ' + B.toFixed(1) + ' ' + (R - rad).toFixed(1) + ' ' + B.toFixed(1) + ' L ' + (L + rad).toFixed(1) + ' ' + B.toFixed(1) + ' Q ' + L.toFixed(1) + ' ' + B.toFixed(1) + ' ' + L.toFixed(1) + ' ' + (B - rad).toFixed(1) + ' L ' + L.toFixed(1) + ' ' + (T + rad).toFixed(1) + ' Q ' + L.toFixed(1) + ' ' + T.toFixed(1) + ' ' + (L + rad).toFixed(1) + ' ' + T.toFixed(1) + ' Z';
    }

    // Xây dựng danh sách đỉnh theo chiều kim đồng hồ
    const pts = [];
    pts.push({ x: lines[0].left, y: lines[0].top });
    pts.push({ x: lines[0].right, y: lines[0].top });

    // Cạnh phải từ trên xuống
    for (let i = 0; i < lines.length; i++) {
      pts.push({ x: lines[i].right, y: lines[i].bottom });
      if (i < lines.length - 1) {
        const nextR = lines[i + 1].right;
        if (Math.abs(nextR - lines[i].right) > 0.5) {
          pts.push({ x: nextR, y: lines[i].bottom });
        }
      }
    }

    // Cạnh đáy dòng cuối
    pts.push({ x: lines[lines.length - 1].left, y: lines[lines.length - 1].bottom });

    // Cạnh trái từ dưới lên
    for (let i = lines.length - 1; i >= 0; i--) {
      pts.push({ x: lines[i].left, y: lines[i].top });
      if (i > 0) {
        const prevL = lines[i - 1].left;
        if (Math.abs(prevL - lines[i].left) > 0.5) {
          pts.push({ x: prevL, y: lines[i].top });
        }
      }
    }

    // Lọc trùng điểm liên tiếp
    const clean = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (clean.length === 0) {
        clean.push(p);
      } else {
        const last = clean[clean.length - 1];
        if (Math.abs(last.x - p.x) >= 0.5 || Math.abs(last.y - p.y) >= 0.5) {
          clean.push(p);
        }
      }
    }
    if (clean.length > 1) {
      const first = clean[0], last = clean[clean.length - 1];
      if (Math.abs(first.x - last.x) < 0.5 && Math.abs(first.y - last.y) < 0.5) {
        clean.pop();
      }
    }

    // Đơn giản hóa các điểm thẳng hàng
    const simplified = [];
    const n = clean.length;
    for (let i = 0; i < n; i++) {
      const prev = clean[(i - 1 + n) % n];
      const curr = clean[i];
      const next = clean[(i + 1) % n];
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      if ((Math.abs(dy1) < 0.5 && Math.abs(dy2) < 0.5) || (Math.abs(dx1) < 0.5 && Math.abs(dx2) < 0.5)) {
        continue;
      }
      simplified.push(curr);
    }

    const m = simplified.length;
    if (m < 3) {
      let minL = Infinity, maxR = -Infinity, minT = Infinity, maxB = -Infinity;
      for (const line of lines) {
        if (line.left < minL) minL = line.left;
        if (line.right > maxR) maxR = line.right;
        if (line.top < minT) minT = line.top;
        if (line.bottom > maxB) maxB = line.bottom;
      }
      if (minL < maxR && minT < maxB) {
        const w = maxR - minL, h = maxB - minT;
        const rad = Math.min(radius, w / 2.0, h / 2.0);
        return 'M ' + (minL + rad).toFixed(1) + ' ' + minT.toFixed(1) + ' L ' + (maxR - rad).toFixed(1) + ' ' + minT.toFixed(1) + ' Q ' + maxR.toFixed(1) + ' ' + minT.toFixed(1) + ' ' + maxR.toFixed(1) + ' ' + (minT + rad).toFixed(1) + ' L ' + maxR.toFixed(1) + ' ' + (maxB - rad).toFixed(1) + ' Q ' + maxR.toFixed(1) + ' ' + maxB.toFixed(1) + ' ' + (maxR - rad).toFixed(1) + ' ' + maxB.toFixed(1) + ' L ' + (minL + rad).toFixed(1) + ' ' + maxB.toFixed(1) + ' Q ' + minL.toFixed(1) + ' ' + maxB.toFixed(1) + ' ' + minL.toFixed(1) + ' ' + (maxB - rad).toFixed(1) + ' L ' + minL.toFixed(1) + ' ' + (minT + rad).toFixed(1) + ' Q ' + minL.toFixed(1) + ' ' + minT.toFixed(1) + ' ' + (minL + rad).toFixed(1) + ' ' + minT.toFixed(1) + ' Z';
      }
      return '';
    }

    // Bo tròn tất cả các góc bằng cung Q (Quadratic Bezier)
    const rads = [];
    for (let i = 0; i < m; i++) {
      const prev = simplified[(i - 1 + m) % m];
      const curr = simplified[i];
      const next = simplified[(i + 1) % m];
      const lIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const lOut = Math.hypot(next.x - curr.x, next.y - curr.y);
      rads.push(Math.min(radius, lIn / 2.0, lOut / 2.0));
    }

    const cmds = [];
    for (let i = 0; i < m; i++) {
      const prev = simplified[(i - 1 + m) % m];
      const curr = simplified[i];
      const next = simplified[(i + 1) % m];
      const r = rads[i];

      const lIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const uxIn = (curr.x - prev.x) / lIn, uyIn = (curr.y - prev.y) / lIn;
      const startX = curr.x - r * uxIn, startY = curr.y - r * uyIn;

      const lOut = Math.hypot(next.x - curr.x, next.y - curr.y);
      const uxOut = (next.x - curr.x) / lOut, uyOut = (next.y - curr.y) / lOut;
      const endX = curr.x + r * uxOut, endY = curr.y + r * uyOut;

      if (i === 0) {
        cmds.push('M ' + startX.toFixed(1) + ' ' + startY.toFixed(1));
      } else {
        cmds.push('L ' + startX.toFixed(1) + ' ' + startY.toFixed(1));
      }
      cmds.push('Q ' + curr.x.toFixed(1) + ' ' + curr.y.toFixed(1) + ' ' + endX.toFixed(1) + ' ' + endY.toFixed(1));
    }

    cmds.push('Z');
    return cmds.join(' ');
  }

  // Xác định khối phần tử chứa (đặc biệt tách bạch từng ô bảng td/th riêng biệt)
  function getFrameContainerBlock(el) {
    if (!el) return document.body;
    // 1. Ô bảng: td, th hoặc ARIA cell / gridcell - tuyệt đối không ghép chung các ô bảng khác nhau
    const tableCell = el.closest('td, th, [role="cell"], [role="gridcell"]');
    if (tableCell) return tableCell;

    // 2. Mục danh sách li
    const listItem = el.closest('li, [role="listitem"]');
    if (listItem) return listItem;

    // 3. Tiêu đề, trích dẫn, khối code, chú thích
    const blockHead = el.closest('h1, h2, h3, h4, h5, h6, blockquote, pre, caption, figcaption');
    if (blockHead) return blockHead;

    // 4. Đoạn văn p
    const p = el.closest('p');
    if (p) return p;

    // 5. Thẻ khối gần nhất
    return el.closest('div, section, article, tr') || el.parentElement || el;
  }

  function updateAllFramePositions() {
    if (isUpdatingPositions) return;
    isUpdatingPositions = true;
    try {
      const layer = ensureAnnLayer();
      if (!layer) return;

      const scale = (typeof currentScale === 'number' && currentScale > 0) ? currentScale : 1.0;
      const layerRect = layer.getBoundingClientRect();

      const frameElements = Array.from(document.querySelectorAll('.text-frame[data-frame-id]'));
      const idMap = new Map();
      frameElements.forEach(el => {
        const fId = el.getAttribute('data-frame-id');
        if (!fId) return;
        if (!idMap.has(fId)) idMap.set(fId, []);
        idMap.get(fId).push(el);
      });

      // BƯỚC 1: Đọc layout một lượt (Batch layout read)
      const measurements = [];
      idMap.forEach((elements, fId) => {
        try {
          // Nhóm các phần tử .text-frame theo khối cấu trúc chứa chúng (đặc biệt từng ô bảng td/th là một nhóm riêng)
          const containerGroups = new Map();
          elements.forEach(el => {
            const container = getFrameContainerBlock(el);
            if (!containerGroups.has(container)) {
              containerGroups.set(container, []);
            }
            containerGroups.get(container).push(el);
          });

          const allPathSegments = [];
          const allLines = [];

          containerGroups.forEach((groupEls) => {
            const groupRawRects = [];
            groupEls.forEach(el => {
              const elRange = document.createRange();
              elRange.selectNodeContents(el);
              const rects = getTextRects(elRange, layerRect, scale);
              for (let i = 0; i < rects.length; i++) {
                groupRawRects.push(rects[i]);
              }
            });

            if (groupRawRects.length === 0) return;

            const lines = mergeRectsByLine(groupRawRects);
            if (lines.length === 0) return;

            let pathD = buildSteppedPath(lines, 6, 3);
            if (!pathD && lines.length > 0) {
              // Fallback an toàn: tạo khung chữ nhật bo góc cho từng dòng
              pathD = lines.map(line => {
                const w = Math.max(1, line.right - line.left);
                const h = Math.max(1, line.bottom - line.top);
                const rad = Math.min(6, w / 2, h / 2);
                return 'M ' + (L + rad).toFixed(1) + ' ' + T.toFixed(1) +
                  ' L ' + (R - rad).toFixed(1) + ' ' + T.toFixed(1) +
                  ' Q ' + R.toFixed(1) + ' ' + T.toFixed(1) + ' ' + R.toFixed(1) + ' ' + (T + rad).toFixed(1) +
                  ' L ' + R.toFixed(1) + ' ' + (B - rad).toFixed(1) +
                  ' Q ' + R.toFixed(1) + ' ' + B.toFixed(1) + ' ' + (R - rad).toFixed(1) + ' ' + B.toFixed(1) +
                  ' L ' + (L + rad).toFixed(1) + ' ' + B.toFixed(1) +
                  ' Q ' + L.toFixed(1) + ' ' + B.toFixed(1) + ' ' + L.toFixed(1) + ' ' + (B - rad).toFixed(1) +
                  ' L ' + L.toFixed(1) + ' ' + (T + rad).toFixed(1) +
                  ' Q ' + L.toFixed(1) + ' ' + T.toFixed(1) + ' ' + (L + rad).toFixed(1) + ' ' + T.toFixed(1) + ' Z';
              }).join(' ');
            }
            if (pathD) {
              allPathSegments.push(pathD);
              allLines.push(...lines);
            }
          });

          if (allPathSegments.length === 0) {
            console.warn('[updateAllFramePositions] Không có path hợp lệ, bỏ qua khung:', fId);
            return;
          }

          const first = elements[0];
          measurements.push({
            id: fId,
            colorName: first.getAttribute('data-color') || 'yellow',
            customHex: first.getAttribute('data-custom-color') || null,
            noteText: first.getAttribute('data-note') || '',
            pathD: allPathSegments.join(' '),
            lines: allLines
          });
        } catch (err) {
          console.warn('[updateAllFramePositions] Lỗi tính rects cho khung:', fId, err);
        }
      });

      // BƯỚC 2: Ghi style & path một lượt (Batch DOM/SVG write)
      const existingOverlays = new Map();
      layer.querySelectorAll('.ann-frame[data-frame-id]').forEach(el => {
        existingOverlays.set(el.getAttribute('data-frame-id'), el);
      });

      const activeIds = new Set();
      measurements.forEach(m => {
        activeIds.add(m.id);
        let overlay = existingOverlays.get(m.id);
        if (!overlay || overlay.tagName.toLowerCase() !== 'svg') {
          if (overlay) overlay.remove();
          overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          overlay.setAttribute('class', 'ann-frame');
          overlay.setAttribute('data-frame-id', m.id);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          overlay.appendChild(path);
          layer.appendChild(overlay);
        }

        const col = getPaletteColors(m.colorName, m.customHex);
        const path = overlay.querySelector('path');
        if (path) {
          path.setAttribute('d', m.pathD);
          path.setAttribute('fill', col.bg || 'rgba(217, 119, 6, 0.06)');
          path.setAttribute('stroke', col.border || '#d97706');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linejoin', 'round');
          path.setAttribute('vector-effect', 'non-scaling-stroke');
        }
        overlay._lineRects = m.lines;
      });

      // Xóa các overlay của khung không còn tồn tại
      existingOverlays.forEach((el, fId) => {
        if (!activeIds.has(fId)) {
          el.remove();
        }
      });
    } catch (err) {
      console.warn('Lỗi êm trong updateAllFramePositions:', err);
    } finally {
      isUpdatingPositions = false;
    }
  }

  function styleFrameElement(span, badge, colorName, customHex, labelText, noteText) {
    if (noteText && noteText.trim()) {
      span.title = noteText.trim().substring(0, 120);
      span.setAttribute('data-note', noteText.trim());
    } else {
      span.title = 'Nhấp đúp để ghi chú';
      span.removeAttribute('data-note');
    }
    span.setAttribute('data-color', colorName || 'yellow');
    if (customHex) span.setAttribute('data-custom-color', customHex);
    scheduleUpdateFramePositions();
  }

  function wrapRangeInternal(range, frameData, triggerUpdate = true) {
    if (!range) return [];
    const frameId = frameData.id;
    const colorName = frameData.color || 'yellow';
    const customHex = frameData.customColor || null;
    const labelText = frameData.label || '';
    const noteText = frameData.note || '';

    const createFrameSpan = () => {
      const span = document.createElement('span');
      span.className = 'text-frame';
      span.setAttribute('data-frame-id', frameId);
      span.setAttribute('data-color', colorName);
      if (customHex) span.setAttribute('data-custom-color', customHex);
      if (noteText) span.setAttribute('data-note', noteText);
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'group');
      span.setAttribute('aria-label', 'Đoạn đã đóng khung. Nhấn Enter để mở ghi chú');
      return span;
    };

    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    // Trường hợp 1 text node duy nhất
    if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
      let targetNode = startContainer;
      if (endOffset < targetNode.nodeValue.length) {
        targetNode.splitText(endOffset);
      }
      if (startOffset > 0) {
        targetNode = targetNode.splitText(startOffset);
      }
      const span = createFrameSpan();
      styleFrameElement(span, null, colorName, customHex, labelText, noteText);
      targetNode.parentNode.insertBefore(span, targetNode);
      span.appendChild(targetNode);
      if (triggerUpdate) scheduleUpdateFramePositions();
      return [span];
    }

    // Trường hợp trải rộng qua nhiều text nodes
    const textNodes = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
          if (node !== startContainer && node !== endContainer && !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
          try {
            if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
          } catch (_) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      },
      false
    );
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    if (textNodes.length === 0) return [];

    const created = [];
    for (let i = 0; i < textNodes.length; i++) {
      let tNode = textNodes[i];
      let start = (tNode === startContainer) ? startOffset : 0;
      let end = (tNode === endContainer) ? endOffset : tNode.nodeValue.length;
      if (start >= end) continue;
      if (end < tNode.nodeValue.length) tNode.splitText(end);
      if (start > 0) tNode = tNode.splitText(start);

      const span = createFrameSpan();
      styleFrameElement(span, null, colorName, customHex, labelText, noteText);
      tNode.parentNode.insertBefore(span, tNode);
      span.appendChild(tNode);
      created.push(span);
    }
    if (triggerUpdate) scheduleUpdateFramePositions();
    return created;
  }

  function removeFrameInternal(frameId) {
    const elements = document.querySelectorAll('[data-frame-id="' + frameId + '"]');
    elements.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        parent.normalize();
      }
    });
    const overlay = document.querySelector('#ann-layer .ann-frame[data-frame-id="' + frameId + '"]');
    if (overlay) overlay.remove();
    scheduleUpdateFramePositions();
  }

  function unwrapAllTextFrames(root = document.body) {
    if (!root) return;
    const spans = Array.from(root.querySelectorAll('.text-frame'));
    spans.forEach(span => {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
      }
    });
    root.normalize();
  }

  function createRangeFromOffsets(start, end, root = document.body) {
    if (!root || start < 0 || end <= start) return null;
    const range = document.createRange();
    let currentPos = 0;
    let startNode = null, startOff = 0;
    let endNode = null, endOff = 0;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.nodeValue.length;
      if (!startNode && currentPos + len >= start) {
        startNode = node;
        startOff = start - currentPos;
      }
      if (!endNode && currentPos + len >= end) {
        endNode = node;
        endOff = end - currentPos;
        break;
      }
      currentPos += len;
    }

    if (startNode && endNode) {
      range.setStart(startNode, startOff);
      range.setEnd(endNode, endOff);
      return range;
    }
    return null;
  }

  function findRangeByText(textQuote, root = document.body, prefix = '', suffix = '') {
    if (!textQuote || !root) return null;
    const rawQuote = textQuote.trim();
    if (!rawQuote) return null;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let fullDocText = '';
    const nodeOffsets = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const val = node.nodeValue || '';
      if (val) {
        nodeOffsets.push({ node, start: fullDocText.length, end: fullDocText.length + val.length });
        fullDocText += val;
      }
    }

    if (nodeOffsets.length === 0) return null;

    let matchIdx = -1;
    let matchLen = rawQuote.length;

    // 1. Thử tìm với tiền tố prefix
    if (prefix && prefix.trim()) {
      const p = prefix.trim();
      const combined = p + rawQuote;
      const pIdx = fullDocText.indexOf(combined);
      if (pIdx !== -1) {
        matchIdx = pIdx + p.length;
      }
    }

    // 2. Tìm trực tiếp nguyên mẫu
    if (matchIdx === -1) {
      matchIdx = fullDocText.indexOf(rawQuote);
    }

    // 3. Chuẩn hoá khoảng trắng, ký tự xuống dòng và NBSP (\u00a0)
    if (matchIdx === -1) {
      const cleanQuote = rawQuote.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
      let cleanDoc = '';
      const docIndexMap = [];
      for (let i = 0; i < fullDocText.length; i++) {
        const ch = fullDocText[i];
        if (ch === '\u00a0' || /\s/.test(ch)) {
          if (cleanDoc.length === 0 || cleanDoc[cleanDoc.length - 1] !== ' ') {
            docIndexMap.push(i);
            cleanDoc += ' ';
          }
        } else {
          docIndexMap.push(i);
          cleanDoc += ch;
        }
      }

      const cIdx = cleanDoc.indexOf(cleanQuote);
      if (cIdx !== -1) {
        matchIdx = docIndexMap[cIdx];
        const endCleanIdx = cIdx + cleanQuote.length - 1;
        const endOrigIdx = (endCleanIdx < docIndexMap.length) ? docIndexMap[endCleanIdx] + 1 : fullDocText.length;
        matchLen = Math.max(1, endOrigIdx - matchIdx);
      }
    }

    if (matchIdx === -1) return null;

    const matchEnd = matchIdx + matchLen;
    let startNode = null, startOff = 0;
    let endNode = null, endOff = 0;

    for (let i = 0; i < nodeOffsets.length; i++) {
      const info = nodeOffsets[i];
      if (!startNode && info.end > matchIdx) {
        startNode = info.node;
        startOff = Math.max(0, matchIdx - info.start);
      }
      if (!endNode && info.end >= matchEnd) {
        endNode = info.node;
        endOff = Math.min(info.node.nodeValue.length, matchEnd - info.start);
        break;
      }
    }

    if (startNode && endNode) {
      try {
        const r = document.createRange();
        r.setStart(startNode, startOff);
        r.setEnd(endNode, endOff);
        return r;
      } catch (e) {
        console.warn('[findRangeByText] Lỗi setStart/setEnd:', e);
      }
    }
    return null;
  }

  let renderAnnotationsRafId = null;
  function scheduleRenderAnnotations(framesList) {
    if (renderAnnotationsRafId) cancelAnimationFrame(renderAnnotationsRafId);
    renderAnnotationsRafId = requestAnimationFrame(() => {
      renderAnnotationsRafId = null;
      renderAnnotations(framesList);
    });
  }

  function renderAnnotations(framesList) {
    try {
      if (!Array.isArray(framesList)) framesList = [];

      // 1. Gỡ hết các span .text-frame cũ (unwrap) để DOM sạch sẽ, không lồng nhau
      unwrapAllTextFrames(document.body);

      // 2. Xóa sạch lớp khung cũ #ann-layer
      const layer = ensureAnnLayer();
      if (layer) {
        if (typeof layer.replaceChildren === 'function') {
          layer.replaceChildren();
        } else {
          layer.innerHTML = '';
        }
      }

      if (framesList.length === 0) {
        sendHeight();
        return;
      }

      // 3. Với từng annotation không trùng lặp, bọc thẻ đánh dấu
      framesList.forEach(frame => {
        try {
          if (!frame || !frame.id) return;
          let range = null;
          if (typeof frame.startOffset === 'number' && typeof frame.endOffset === 'number' && frame.endOffset > frame.startOffset && frame.startOffset >= 0) {
            range = createRangeFromOffsets(frame.startOffset, frame.endOffset, document.body);
          }
          if (!range) {
            const quote = (frame.anchor?.exact || frame.text || '').trim();
            if (quote) {
              range = findRangeByText(quote, document.body, frame.anchor?.prefix || '', frame.anchor?.suffix || '');
            }
          }
          if (!range) return;

          wrapRangeInternal(range, frame, false);
        } catch (err) {
          console.warn('[renderAnnotations] Lỗi vẽ annotation:', frame && frame.id, err);
        }
      });

      // 4. Đo vị trí và tạo đúng một phần tử overlay cho mỗi annotation
      updateAllFramePositions();
      sendHeight();
    } catch (e) {
      console.warn('Lỗi êm trong renderAnnotations:', e);
    }
  }

  function restoreSingleFrame(frame) {
    if (!frame) return;
    renderAnnotations([frame]);
  }

  function restoreAllFrames(framesList) {
    scheduleRenderAnnotations(framesList);
  }

  function getNativeBg() {
    try {
      const bBg = window.getComputedStyle(document.body).backgroundColor;
      const hBg = window.getComputedStyle(document.documentElement).backgroundColor;
      const isTrans = v => !v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';
      if (!isTrans(bBg)) return bBg;
      if (!isTrans(hBg)) return hBg;
    } catch (_) {}
    return '#FFFFFF';
  }

  // 2. Tự co giãn chiều cao (Auto-height) chuẩn xác & Đồng bộ vị trí khung
  let lastSentBridgeH = 0;
  let rafResizeId = null;

  function measureRealContentHeight() {
    const body = document.body;
    const html = document.documentElement;
    if (!body) return 300;

    // Đo vị trí đáy phần tử con thấp nhất của body (loại trừ overlay và script/style)
    let maxChildBottom = 0;
    const children = body.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.id === 'ann-layer' || el.id === '__bridge_sandbox_styles' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      try {
        const pos = window.getComputedStyle(el).position;
        if (pos === 'fixed') continue;
      } catch (_) {}
      const rect = el.getBoundingClientRect();
      const bottom = (rect.bottom || 0) + (window.scrollY || window.pageYOffset || 0);
      if (bottom > maxChildBottom) {
        maxChildBottom = bottom;
      }
    }

    let h = 0;
    if (maxChildBottom > 50) {
      h = Math.ceil(maxChildBottom);
      try {
        const bStyle = window.getComputedStyle(body);
        const pb = parseFloat(bStyle.paddingBottom) || 0;
        const mb = parseFloat(bStyle.marginBottom) || 0;
        h += Math.ceil(pb + mb);
      } catch (_) {}
    } else {
      h = Math.ceil(Math.max(body.scrollHeight || 0, body.offsetHeight || 0, html ? html.scrollHeight : 0, 300));
    }

    // Bảo hiểm đa tầng: Tuyệt đối không bao giờ cắt ngắn hơn scrollHeight thực tế của tài liệu
    const totalScrollH = Math.max(body.scrollHeight || 0, html ? html.scrollHeight : 0);
    if (totalScrollH > h) {
      h = totalScrollH;
    }

    return Math.max(h, 150);
  }

  function sendHeight() {
    if (rafResizeId) cancelAnimationFrame(rafResizeId);
    rafResizeId = requestAnimationFrame(() => {
      rafResizeId = null;
      try {
        const realH = measureRealContentHeight();
        // CHỈ gửi postMessage khi chiều cao thay đổi > 4px
        if (Math.abs(realH - lastSentBridgeH) > 4) {
          lastSentBridgeH = realH;
          window.parent.postMessage({
            type: 'BRIDGE_RESIZE',
            height: realH,
            bg: getNativeBg()
          }, '*');
        }
      } catch (_) {}
    });
    scheduleUpdateFramePositions();
  }

  window.addEventListener('load', () => {
    sendHeight();
    scheduleUpdateFramePositions();
  });
  window.addEventListener('resize', scheduleUpdateFramePositions);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleUpdateFramePositions).catch(() => {});
  }
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    let lastObsW = 0, lastObsH = 0;
    const bodyObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (Math.abs(cr.width - lastObsW) > 1 || Math.abs(cr.height - lastObsH) > 4) {
          lastObsW = cr.width;
          lastObsH = cr.height;
          sendHeight();
        }
      }
    });
    bodyObserver.observe(document.body);
  }

  // 3. Link handling an toàn
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId) || document.querySelector(\`[name="\${targetId}"]\`);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  }, true);

  // 4. Theo dõi bôi đen văn bản (Selection)
  let isPointerDown = false;
  let lastHintedFrameId = null;
  let lastHintedTime = 0;

  document.addEventListener('mousedown', () => { isPointerDown = true; }, true);
  document.addEventListener('mouseup', () => {
    isPointerDown = false;
    checkSelectionEnd();
    clearTimeout(_iframeSelectionDebounceTimer);
    _iframeSelectionDebounceTimer = setTimeout(emitSelectionMessage, 30);
  }, true);
  document.addEventListener('touchstart', () => { isPointerDown = true; }, true);
  document.addEventListener('touchend', () => {
    isPointerDown = false;
    checkSelectionEnd();
    clearTimeout(_iframeSelectionDebounceTimer);
    _iframeSelectionDebounceTimer = setTimeout(emitSelectionMessage, 30);
  }, true);

  function checkSelectionEnd() {
    setTimeout(() => {
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          lastHintedFrameId = null;
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 2) return;
        const range = sel.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        const parentEl = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement;
        const existingFrame = parentEl ? parentEl.closest('.text-frame') : null;
        if (existingFrame) {
          const fId = existingFrame.getAttribute('data-frame-id') || existingFrame.getAttribute('data-hl-id') || 'frame';
          const now = Date.now();
          if (fId !== lastHintedFrameId || (now - lastHintedTime) > 8000) {
            lastHintedFrameId = fId;
            lastHintedTime = now;
            window.parent.postMessage({ type: 'TEXT_ALREADY_FRAMED', frameId: fId }, '*');
          }
        } else {
          lastHintedFrameId = null;
        }
      } catch (_) {}
    }, 40);
  }

  function emitSelectionMessage() {
    try {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        window.parent.postMessage({ type: 'TEXT_DESELECTED' }, '*');
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) return;
      const range = sel.getRangeAt(0);

      const ancestor = range.commonAncestorContainer;
      const parentEl = ancestor.nodeType === 1 ? ancestor : ancestor.parentElement;

      let quoteFont = '';
      if (parentEl) {
        try {
          quoteFont = (window.getComputedStyle(parentEl).fontFamily || '').substring(0, 200);
        } catch (_) {}
      }

      let startOffset = -1, endOffset = -1;
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let currentPos = 0;
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node === range.startContainer) {
            startOffset = currentPos + range.startOffset;
          }
          if (node === range.endContainer) {
            endOffset = currentPos + range.endOffset;
            break;
          }
          currentPos += (node.nodeValue ? node.nodeValue.length : 0);
        }
        if (startOffset !== -1 && endOffset === -1) {
          endOffset = startOffset + text.length;
        }
      } catch (_) {}

      if (startOffset === -1) {
        try {
          const offsetRange = range.cloneRange();
          offsetRange.selectNodeContents(document.body);
          offsetRange.setEnd(range.startContainer, range.startOffset);
          startOffset = offsetRange.toString().length;
          endOffset = startOffset + text.length;
        } catch (_) {}
      }

      // Kiểm tra chính xác đoạn bôi đen có nằm trong hoặc giao với khung nào không
      let hasIntersectingFrames = false;
      let intersectingFrameId = null;
      try {
        const frameAncestor = parentEl ? parentEl.closest('.text-frame, .custom-highlight') : null;
        if (frameAncestor) {
          hasIntersectingFrames = true;
          intersectingFrameId = frameAncestor.getAttribute('data-frame-id') || frameAncestor.getAttribute('data-hl-id');
        } else {
          const frames = document.querySelectorAll('.text-frame, .custom-highlight');
          for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            try {
              if (range.intersectsNode(f)) {
                const fRange = document.createRange();
                fRange.selectNodeContents(f);
                if (range.compareBoundaryPoints(Range.END_TO_START, fRange) < 0 &&
                    range.compareBoundaryPoints(Range.START_TO_END, fRange) > 0) {
                  hasIntersectingFrames = true;
                  intersectingFrameId = f.getAttribute('data-frame-id') || f.getAttribute('data-hl-id');
                  break;
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {}

      const rect = range.getBoundingClientRect();
      let prefix = '', suffix = '', before = '', after = '', sectionTitle = '';
      try {
        const sNode = range.startContainer;
        if (sNode.nodeType === Node.TEXT_NODE) prefix = sNode.nodeValue.substring(Math.max(0, range.startOffset - 30), range.startOffset).trim();
        const eNode = range.endContainer;
        if (eNode.nodeType === Node.TEXT_NODE) suffix = eNode.nodeValue.substring(range.endOffset, Math.min(eNode.nodeValue.length, range.endOffset + 30)).trim();

        // Lấy ngữ cảnh tối đa 300 ký tự trước và sau cho AI
        const preRange = document.createRange();
        preRange.setStart(document.body, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        before = preRange.toString().slice(-300).trim();

        const postRange = document.createRange();
        postRange.setStart(range.endContainer, range.endOffset);
        postRange.setEnd(document.body, document.body.childNodes.length);
        after = postRange.toString().slice(0, 300).trim();

        // Tiêu đề mục gần nhất
        let pNode = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
        while (pNode && pNode !== document.body) {
          let prev = pNode.previousElementSibling;
          while (prev) {
            if (/^H[1-6]$/i.test(prev.tagName)) {
              sectionTitle = prev.textContent.trim();
              break;
            }
            const hElem = prev.querySelector('h1, h2, h3, h4, h5, h6');
            if (hElem) {
              sectionTitle = hElem.textContent.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }
          if (sectionTitle) break;
          pNode = pNode.parentElement;
        }
      } catch (_) {}

      window.parent.postMessage({
        type: 'TEXT_SELECTED',
        text: text,
        prefix: prefix,
        suffix: suffix,
        before: before,
        after: after,
        sectionTitle: sectionTitle,
        quoteFont: quoteFont,
        startOffset: startOffset,
        endOffset: endOffset,
        hasIntersectingFrames: hasIntersectingFrames,
        intersectingFrameId: intersectingFrameId,
        rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height }
      }, '*');
    } catch (err) {
      console.warn('[Bridge] Lỗi phát sự kiện bôi đen:', err);
    }
  }

  // // FIX: Phát sự kiện bôi đen siêu mượt khi nhả chuột và debounce khi kéo
  let _iframeSelectionDebounceTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(_iframeSelectionDebounceTimer);
    _iframeSelectionDebounceTimer = setTimeout(emitSelectionMessage, 200);
  });

  // Lắng nghe sự kiện scroll bên trong Iframe để đồng bộ vị trí thanh toolbar bám theo vùng chọn
  let _iframeScrollRaf = null;
  const _handleIframeScroll = () => {
    if (_iframeScrollRaf) return;
    _iframeScrollRaf = requestAnimationFrame(() => {
      _iframeScrollRaf = null;
      try {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        window.parent.postMessage({
          type: 'SELECTION_SCROLLED',
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height }
        }, '*');
      } catch (_) {}
    });
  };
  window.addEventListener('scroll', _handleIframeScroll, { passive: true, capture: true });
  document.addEventListener('scroll', _handleIframeScroll, { passive: true, capture: true });

  // VIỆC 1: Click 1 lần KHÔNG làm gì cả
  // Mousedown e.detail >= 2: preventDefault() để chặn trình duyệt tự bôi đen từ khi nhấp đúp
  document.addEventListener('mousedown', (e) => {
    if (e.detail >= 2 && e.target.closest('.text-frame, .custom-highlight')) {
      e.preventDefault();
    }
  });

  // Double click trên chuột: mở cửa sổ ghi chú, xóa selection, không hiện toolbar
  document.addEventListener('dblclick', (e) => {
    const frameEl = e.target.closest('.text-frame, .custom-highlight');
    if (frameEl) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (_) {}
      const fId = frameEl.getAttribute('data-frame-id') || frameEl.getAttribute('data-hl-id');
      const rect = frameEl.getBoundingClientRect();
      window.parent.postMessage({
        type: 'FRAME_DBLCLICKED',
        id: fId,
        rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height }
      }, '*');
    }
  });

  // Double-tap trên Touch (iOS Safari / mobile)
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0, lastTapFrameId = null;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const frameEl = e.target.closest('.text-frame, .custom-highlight');
      if (frameEl) {
        const now = Date.now();
        const touch = e.touches[0];
        const fId = frameEl.getAttribute('data-frame-id') || frameEl.getAttribute('data-hl-id');
        const timeDiff = now - lastTapTime;
        const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);
        if (timeDiff <= 300 && dist <= 10 && lastTapFrameId === fId) {
          e.preventDefault();
          try {
            const sel = window.getSelection();
            if (sel) sel.removeAllRanges();
          } catch (_) {}
          const rect = frameEl.getBoundingClientRect();
          window.parent.postMessage({
            type: 'FRAME_DBLCLICKED',
            id: fId,
            rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height }
          }, '*');
          lastTapTime = 0;
          lastTapFrameId = null;
          return;
        }
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
        lastTapFrameId = fId;
      } else {
        lastTapTime = 0;
        lastTapFrameId = null;
      }
    }
  }, { passive: false });

  // Trợ năng phím Enter trên khung
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList.contains('text-frame')) {
        e.preventDefault();
        const fId = activeEl.getAttribute('data-frame-id') || activeEl.getAttribute('data-hl-id');
        const rect = activeEl.getBoundingClientRect();
        window.parent.postMessage({
          type: 'FRAME_DBLCLICKED',
          id: fId,
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height }
        }, '*');
      }
    }
  });

  // 5. Chuyển tiếp phím tắt & cử chỉ vuốt
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const tag = (activeEl && activeEl.tagName) ? activeEl.tagName.toUpperCase() : '';
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !activeEl?.isContentEditable) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim()) {
          e.preventDefault();
        }
      }
    }
    window.parent.postMessage({
      type: 'FORWARD_KEY',
      key: e.key,
      code: e.code,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey
    }, '*');
  });

  // 6. Trích xuất Readable Chunks cho TTS
  function extractTTSChunks() {
    const chunks = [];
    const blocks = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd');
    blocks.forEach((el, bIdx) => {
      if (el.closest('script, style, button, nav, .hidden')) return;
      const raw = (el.innerText || '').trim();
      if (!raw || raw.length < 2) return;
      const chunkId = 'tts_' + bIdx;
      el.setAttribute('data-tts-id', chunkId);
      chunks.push({ id: chunkId, text: raw });
    });
    return chunks;
  }

  // // FIX-2: BẢO VỆ NGUYÊN BẢN GỐC - KHÔNG CHÈN STYLE GHI ĐÈ MÀU/FONT/LAYOUT VÀO NỘI DUNG BÀI
  function applyNativeScale(scaleFactor) {
    const factor = Math.max(0.7, Math.min(2.5, scaleFactor || 1.0));
    currentScale = factor;
    try {
      document.documentElement.style.zoom = factor;
    } catch (_) {
      try { document.body.style.zoom = factor; } catch (_) {}
    }
    sendHeight();
  }

  // 7. LẮNG NGHE LỆNH TỪ APP CHA
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      // Dọn sạch và giải phóng tài nguyên media, audio, DOM khi chuyển bài (chống tràn RAM iOS/Android)
      case 'RELEASE_RESOURCES': {
        try {
          document.querySelectorAll('audio, video').forEach(media => {
            try {
              media.pause();
              media.removeAttribute('src');
              media.load();
            } catch (_) {}
          });
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          if (document.body) {
            document.body.innerHTML = '';
          }
        } catch (_) {}
        break;
      }
      // // FIX-2: Xóa vùng chọn trong iframe khi hoàn thành thao tác để tắt menu mặc định của iOS
      case 'CLEAR_SELECTION': {
        try {
          const sel = window.getSelection();
          if (sel) sel.removeAllRanges();
        } catch (_) {}
        break;
      }

      case 'INIT_CONFIG': {
        if (msg.zoomFactor) {
          applyNativeScale(msg.zoomFactor);
        } else if (msg.fontSizeOffset !== undefined) {
          applyNativeScale(1 + (msg.fontSizeOffset * 0.1));
        }
        if (msg.highlights && Array.isArray(msg.highlights)) {
          applySavedHighlights(msg.highlights);
        }
        const chunks = extractTTSChunks();
        window.parent.postMessage({
          type: 'BRIDGE_READY',
          height: Math.max(document.body ? document.body.scrollHeight : 350, 350),
          bg: getNativeBg(),
          ttsChunks: chunks
        }, '*');
        sendHeight();
        break;
      }

      case 'APPLY_FONT_SIZE': {
        const factor = typeof msg.zoomFactor === 'number' ? msg.zoomFactor : (1 + ((msg.fontSizeOffset || 0) * 0.1));
        applyNativeScale(factor);
        break;
      }

      case 'APPLY_READING_SETTINGS': {
        // Chỉ nhận zoom/cỡ chữ, tuyệt đối không ghi đè màu/font lên bài
        if (msg.settings && msg.settings.fontScale) {
          applyNativeScale(msg.settings.fontScale / 100);
        }
        sendHeight();
        break;
      }



      case 'APPLY_THEME': {
        // Giao diện ban đêm chỉ áp dụng cho khung ngoài app, không can thiệp vào trong file gốc
        sendHeight();
        scheduleUpdateFramePositions();
        break;
      }

      case 'APPLY_FRAME': {
        const frameData = msg.frame;
        if (msg.frames && Array.isArray(msg.frames)) {
          scheduleRenderAnnotations(msg.frames);
        } else if (frameData) {
          const sel = window.getSelection();
          let range = null;
          if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
            range = sel.getRangeAt(0);
          }
          if (range) {
            wrapRangeInternal(range, frameData);
            try { sel.removeAllRanges(); } catch (_) {}
          } else {
            restoreSingleFrame(frameData);
          }
        }
        window.parent.postMessage({
          type: 'FRAME_APPLIED_SUCCESS',
          id: frameData ? frameData.id : ''
        }, '*');
        sendHeight();
        break;
      }

      case 'APPLY_COLOR':
      case 'UPDATE_FRAME_COLOR': {
        const elements = document.querySelectorAll('[data-frame-id="' + msg.id + '"]');
        elements.forEach(el => {
          el.setAttribute('data-color', msg.color);
          if (msg.customColor) el.setAttribute('data-custom-color', msg.customColor);
          styleFrameElement(el, null, msg.color, msg.customColor, msg.label, msg.note);
        });
        break;
      }

      case 'UPDATE_FRAME_NOTE':
      case 'UPDATE_FRAME_LABEL': {
        const spans = document.querySelectorAll('[data-frame-id="' + msg.id + '"]');
        spans.forEach(span => {
          if (msg.color) span.setAttribute('data-color', msg.color);
          styleFrameElement(span, null, msg.color || span.getAttribute('data-color'), span.getAttribute('data-custom-color'), msg.label, msg.note);
        });
        break;
      }

      case 'REMOVE_FRAME':
      case 'REMOVE_HIGHLIGHT': {
        removeFrameInternal(msg.id);
        const legacyMark = document.querySelector(\`[data-hl-id="\${msg.id}"]\`);
        if (legacyMark) {
          const parent = legacyMark.parentNode;
          while (legacyMark.firstChild) parent.insertBefore(legacyMark.firstChild, legacyMark);
          parent.removeChild(legacyMark);
        }
        sendHeight();
        break;
      }

      case 'RESTORE_FRAMES': {
        if (Array.isArray(msg.frames)) {
          restoreAllFrames(msg.frames);
        }
        if (msg.showFrames !== undefined || msg.showBadges !== undefined) {
          const html = document.documentElement;
          const body = document.body;
          if (msg.showFrames !== undefined) {
            html.classList.toggle('hide-text-frames', !msg.showFrames);
            body.classList.toggle('hide-text-frames', !msg.showFrames);
          }
          if (msg.showBadges !== undefined) {
            html.classList.toggle('hide-frame-badges', !msg.showBadges);
            body.classList.toggle('hide-frame-badges', !msg.showBadges);
          }
        }
        sendHeight();
        break;
      }

      case 'SCROLL_TO_FRAME': {
        const el = document.querySelector(\`[data-frame-id="\${msg.id}"]\`) || document.querySelector(\`[data-hl-id="\${msg.id}"]\`);
        const overlay = document.querySelector(\`#ann-layer .ann-frame[data-frame-id="\${msg.id}"]\`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (overlay) {
          overlay.classList.remove('frame-flash-highlight');
          void overlay.offsetWidth;
          overlay.classList.add('frame-flash-highlight');
          setTimeout(() => overlay.classList.remove('frame-flash-highlight'), 2200);
        } else if (el) {
          el.classList.remove('frame-flash-highlight');
          void el.offsetWidth;
          el.classList.add('frame-flash-highlight');
          setTimeout(() => el.classList.remove('frame-flash-highlight'), 2200);
        }
        break;
      }

      case 'UPDATE_FRAME_SETTINGS': {
        const html = document.documentElement;
        const body = document.body;
        if (msg.showFrames !== undefined) {
          html.classList.toggle('hide-text-frames', !msg.showFrames);
          body.classList.toggle('hide-text-frames', !msg.showFrames);
        }
        if (msg.showBadges !== undefined) {
          html.classList.toggle('hide-frame-badges', !msg.showBadges);
          body.classList.toggle('hide-frame-badges', !msg.showBadges);
        }
        break;
      }

      case 'HIGHLIGHT_BOX_TARGET': {
        handleHighlightBoxTarget(msg);
        break;
      }

      case 'CLEAR_BOX_OVERLAY': {
        clearSearchBoxOverlay();
        break;
      }

      case 'SEARCH_IN_ARTICLE': {
        handleSearchInArticle(msg.keyword);
        break;
      }

      case 'NAVIGATE_SEARCH_MATCH': {
        navigateSearchMatch(msg.direction);
        break;
      }

      case 'TTS_HIGHLIGHT_NODE': {
        document.querySelectorAll('.tts-active-highlight').forEach(el => el.classList.remove('tts-active-highlight'));
        if (msg.chunkId) {
          const target = document.querySelector(\`[data-tts-id="\${msg.chunkId}"]\`);
          if (target) {
            target.classList.add('tts-active-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        break;
      }

      case 'TTS_CLEAR_HIGHLIGHT': {
        document.querySelectorAll('.tts-active-highlight').forEach(el => el.classList.remove('tts-active-highlight'));
        break;
      }
    }
  });

  function applyScale(fontSizeOffset) {
    const factor = 1 + ((fontSizeOffset || 0) * 0.1);
    currentScale = factor;
    document.body.style.zoom = factor;
    document.body.style.webkitTextSizeAdjust = (factor * 100) + '%';
  }

  function applySavedHighlights(hlList) {
    hlList.forEach(hl => {
      if (!hl || !hl.text) return;
      if (document.querySelector(\`[data-hl-id="\${hl.id}"]\`)) return;
      findAndWrapText(hl.text, hl.id, hl.color || 'yellow');
    });
  }

  function findAndWrapText(textToFind, hlId, color) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && (node.parentElement.closest('.custom-highlight') || node.parentElement.closest('script, style'))) continue;
      const idx = node.nodeValue.indexOf(textToFind);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + textToFind.length);
        const mark = document.createElement('mark');
        mark.className = \`custom-highlight custom-highlight-\${color}\`;
        mark.setAttribute('data-hl-id', hlId);
        try {
          range.surroundContents(mark);
          break;
        } catch (_) {}
      }
    }
  }

  function handleSearchInArticle(kw) {
    document.querySelectorAll('.search-match-highlight').forEach(el => {
      const p = el.parentNode;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
    });
    searchMatches = [];
    currentMatchIdx = -1;

    if (!kw || !kw.trim()) {
      window.parent.postMessage({ type: 'SEARCH_RESULT', totalMatches: 0, currentIndex: 0, keyword: '' }, '*');
      return;
    }

    const searchLower = kw.trim().toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement && !n.parentElement.closest('script, style')) {
        textNodes.push(n);
      }
    }

    for (const textNode of textNodes) {
      let val = textNode.nodeValue;
      let valLower = val.toLowerCase();
      let matchIdx = valLower.indexOf(searchLower);
      if (matchIdx !== -1) {
        const range = document.createRange();
        range.setStart(textNode, matchIdx);
        range.setEnd(textNode, matchIdx + searchLower.length);
        const span = document.createElement('span');
        span.className = 'search-match-highlight';
        try {
          range.surroundContents(span);
          searchMatches.push(span);
        } catch (_) {}
      }
    }

    if (searchMatches.length > 0) {
      currentMatchIdx = 0;
      searchMatches[0].classList.add('search-match-active');
      searchMatches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.parent.postMessage({
      type: 'SEARCH_RESULT',
      totalMatches: searchMatches.length,
      currentIndex: searchMatches.length > 0 ? 1 : 0,
      keyword: kw
    }, '*');
  }

  // =========================================================================
  // // FEATURE-BOX-OVERLAY: TỰ NHẢY ĐẾN ĐOẠN KHỚP VÀ VẼ KHUNG NỔI BẬT KHÔNG ĐỤNG DOM
  // =========================================================================
  let currentOccurrences = [];
  let currentOccIndex = -1;
  let searchBoxOverlayEl = null;
  let overlayTimer = null;
  let overlayObserver = null;
  let activeKeyword = '';
  let activeSearchQuery = '';
  let lastScrollY = window.scrollY || 0;

  function normalizeVietnamese1to1(text) {
    if (!text) return '';
    const clean = text.replace(/[\u00A0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\t\r\n\v\f]/g, ' ');
    const nfc = clean.normalize('NFC');
    const res = [];
    for (let i = 0; i < nfc.length; i++) {
      const ch = nfc[i];
      if (ch === 'đ') res.push('d');
      else if (ch === 'Đ') res.push('D');
      else {
        const nfd = ch.normalize('NFD');
        let stripped = '';
        for (let j = 0; j < nfd.length; j++) {
          const code = nfd.charCodeAt(j);
          if (code < 0x0300 || code > 0x036F) stripped += nfd[j];
        }
        res.push(stripped || ch);
      }
    }
    return res.join('');
  }

  function clearSearchBoxOverlay() {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
    if (overlayObserver) {
      overlayObserver.disconnect();
      overlayObserver = null;
    }
    if (searchBoxOverlayEl && searchBoxOverlayEl.parentNode) {
      searchBoxOverlayEl.parentNode.removeChild(searchBoxOverlayEl);
    }
    searchBoxOverlayEl = null;
    currentOccurrences = [];
    currentOccIndex = -1;
    activeKeyword = '';
    activeSearchQuery = '';
    window.removeEventListener('resize', updateOverlayPosition);
    window.removeEventListener('scroll', handleOverlayScroll);
  }

  function updateOverlayPosition() {
    if (!searchBoxOverlayEl || currentOccIndex < 0 || !currentOccurrences[currentOccIndex]) return;
    try {
      const occ = currentOccurrences[currentOccIndex];
      let rect = occ.range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const parent = occ.range.commonAncestorContainer.nodeType === 1
          ? occ.range.commonAncestorContainer
          : occ.range.commonAncestorContainer.parentElement;
        if (parent) {
          rect = parent.getBoundingClientRect();
        }
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const pad = 3;
      searchBoxOverlayEl.style.top = (rect.top + scrollY - pad) + 'px';
      searchBoxOverlayEl.style.left = (rect.left + scrollX - pad) + 'px';
      searchBoxOverlayEl.style.width = Math.max(20, rect.width + pad * 2) + 'px';
      searchBoxOverlayEl.style.height = Math.max(18, rect.height + pad * 2) + 'px';

      // Căn chỉnh vị trí huy hiệu hiển thị từ khóa đã tìm kiếm bên trên hoặc bên dưới nếu sát mép
      const queryBadge = searchBoxOverlayEl.querySelector('.search-query-top-badge');
      if (queryBadge) {
        if (rect.top < 40) {
          queryBadge.style.top = 'auto';
          queryBadge.style.bottom = '-32px';
          const arrow = queryBadge.querySelector('.search-query-badge-arrow');
          if (arrow) {
            arrow.style.bottom = 'auto';
            arrow.style.top = '-5px';
            arrow.style.borderTop = 'none';
            arrow.style.borderBottom = '5px solid ' + (currentIsAiMatch ? '#1E1B4B' : '#0F172A');
          }
        } else {
          queryBadge.style.bottom = 'auto';
          queryBadge.style.top = '-32px';
          const arrow = queryBadge.querySelector('.search-query-badge-arrow');
          if (arrow) {
            arrow.style.top = 'auto';
            arrow.style.bottom = '-5px';
            arrow.style.borderBottom = 'none';
            arrow.style.borderTop = '5px solid ' + (currentIsAiMatch ? '#4C1D95' : '#0F172A');
          }
        }
      }
    } catch (_) {}
  }

  function handleOverlayScroll() {
    updateOverlayPosition();
  }

  function renderOverlayAtIndex(idx, shouldPulse) {
    if (typeof shouldPulse === 'undefined') shouldPulse = true;
    if (idx < 0 || idx >= currentOccurrences.length) return;
    currentOccIndex = idx;
    const occ = currentOccurrences[idx];

    // Cuộn mượt để đoạn khớp nằm ở trung tâm màn hình
    try {
      const scrollTarget = occ.range.commonAncestorContainer.nodeType === 1
        ? occ.range.commonAncestorContainer
        : occ.range.commonAncestorContainer.parentElement;
      if (scrollTarget) {
        scrollTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } catch (_) {}

    // Tạo hoặc tái sử dụng phần tử overlay
    if (!searchBoxOverlayEl) {
      searchBoxOverlayEl = document.createElement('div');
      searchBoxOverlayEl.id = 'searchHighlightBoxOverlay';
      searchBoxOverlayEl.className = 'search-highlight-overlay-box';
      (document.body || document.documentElement).appendChild(searchBoxOverlayEl);

      window.addEventListener('resize', updateOverlayPosition, { passive: true });
      window.addEventListener('scroll', handleOverlayScroll, { passive: true });
      if (typeof ResizeObserver !== 'undefined' && document.body) {
        overlayObserver = new ResizeObserver(updateOverlayPosition);
        overlayObserver.observe(document.body);
      }
    }

    lastScrollY = window.scrollY || 0;
    updateOverlayPosition();
    searchBoxOverlayEl.style.display = 'block';
    searchBoxOverlayEl.style.opacity = '1';

    // Đảm bảo định vị chuẩn xác ngay cả khi layout thay đổi hoặc sau khi cuộn mượt tới vị trí
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(updateOverlayPosition);
    }
    setTimeout(updateOverlayPosition, 100);
    setTimeout(updateOverlayPosition, 300);
    setTimeout(updateOverlayPosition, 600);

    // Cập nhật huy hiệu hiển thị từ khóa người dùng đã tìm kiếm ngay bên trên khung đóng (Icon Vector SVG siêu nét chuẩn Vibe Editorial)
    let queryBadge = searchBoxOverlayEl.querySelector('.search-query-top-badge');
    if (!queryBadge) {
      queryBadge = document.createElement('div');
      queryBadge.className = 'search-query-top-badge';
      searchBoxOverlayEl.appendChild(queryBadge);
    }

    const displayText = (activeSearchQuery || activeKeyword || '').trim();
    if (displayText) {
      const isAi = currentIsAiMatch;
      queryBadge.style.cssText = [
        'position: absolute',
        'top: -32px',
        'left: 0',
        'display: inline-flex',
        'align-items: center',
        'gap: 6px',
        'padding: 3px 10px 3px 4px',
        'border-radius: 8px',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
        'font-size: 11.5px',
        'font-weight: 600',
        'line-height: 1.25',
        'white-space: nowrap',
        'pointer-events: none',
        'z-index: 1000000',
        'backdrop-filter: blur(12px)',
        '-webkit-backdrop-filter: blur(12px)',
        isAi
          ? 'background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(76, 29, 149, 0.95) 100%); color: #FAF5FF; border: 1px solid rgba(192, 132, 252, 0.38); box-shadow: 0 4px 18px -1px rgba(126, 34, 206, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);'
          : 'background: rgba(15, 23, 42, 0.94); color: #F8FAFC; border: 1px solid rgba(255, 255, 255, 0.16); box-shadow: 0 4px 18px -1px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);'
      ].join(';');

      const searchIconSvg = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,rgba(59,130,246,0.22),rgba(37,99,235,0.14));border:1px solid rgba(96,165,250,0.32);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18);flex-shrink:0;">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
          '<circle cx="6.5" cy="6.5" r="4.5" stroke="#93C5FD" stroke-width="1.8" stroke-linecap="round"/>' +
          '<path d="M10 10L13.8 13.8" stroke="#60A5FA" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>' +
      '</span>';

      const aiIconSvg = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,rgba(168,85,247,0.28),rgba(126,34,206,0.18));border:1px solid rgba(192,132,252,0.4);box-shadow:inset 0 1px 0 rgba(255,255,255,0.22);flex-shrink:0;">' +
        '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">' +
          '<path d="M8 1L9.6 5.4L14 7L9.6 8.6L8 13L6.4 8.6L2 7L6.4 5.4L8 1Z" fill="#F0ABFC"/>' +
          '<path d="M13 11L13.7 12.3L15 13L13.7 13.7L13 15L12.3 13.7L11 13L12.3 12.3L13 11Z" fill="#E879F9" opacity="0.9"/>' +
        '</svg>' +
      '</span>';

      const safeDisplay = displayText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      queryBadge.innerHTML = (isAi ? aiIconSvg : searchIconSvg) +
        '<span style="letter-spacing: 0.012em; text-shadow: 0 1px 2px rgba(0,0,0,0.35);">' + safeDisplay + '</span>' +
        '<span class="search-query-badge-arrow" style="position: absolute; bottom: -5px; left: 12px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid ' + (isAi ? '#4C1D95' : '#0F172A') + '; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></span>';
      queryBadge.style.display = 'inline-flex';
    } else {
      queryBadge.style.display = 'none';
    }

    // Hiệu ứng nhịp (pulse) 1.2s nhẹ nhàng tôn trọng prefers-reduced-motion
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldPulse && !prefersReduced) {
      if (currentIsAiMatch) {
        searchBoxOverlayEl.classList.add('is-ai-match');
        searchBoxOverlayEl.style.animation = 'searchBoxPulseAi 0.4s ease-in-out 3';
      } else {
        searchBoxOverlayEl.classList.remove('is-ai-match');
        searchBoxOverlayEl.style.animation = 'searchBoxPulse 0.4s ease-in-out 3';
      }
      setTimeout(() => {
        if (searchBoxOverlayEl) searchBoxOverlayEl.style.animation = 'none';
      }, 1250);
    } else {
      searchBoxOverlayEl.style.animation = 'none';
    }

    // Tự động dịu xuống và mờ sau ~8 giây không tương tác
    if (overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      if (searchBoxOverlayEl) searchBoxOverlayEl.style.opacity = '0';
    }, 8000);

    // Báo cáo số thứ tự kết quả về app cha để hiển thị trên viên thuốc nổi
    window.parent.postMessage({
      type: 'SEARCH_OVERLAY_STATUS',
      currentIndex: idx + 1,
      totalMatches: currentOccurrences.length,
      keyword: activeKeyword
    }, '*');
  }

  let currentIsAiMatch = false;

  function escapeRegex(str) {
    var res = '';
    var specials = '-[]/{}()*+?.\\^$|';
    for (var k = 0; k < str.length; k++) {
      var ch = str[k];
      if (specials.indexOf(ch) !== -1) res += '\\' + ch;
      else res += ch;
    }
    return res;
  }

  function findOccurrencesForTerm(term, normFull, fullText, nodeOffsets) {
    const normTerm = normalizeVietnamese1to1(term).toLowerCase().trim();
    if (!normTerm || normTerm.length < 2) return [];
    const words = normTerm.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const foundOccs = [];
    try {
      const escaped = words.map(function(w) {
        return escapeRegex(w);
      }).join('\\s+');
      const re = new RegExp(escaped, 'g');
      let m;
      while ((m = re.exec(normFull)) !== null) {
        const matchIdx = m.index;
        const matchEnd = m.index + m[0].length;

        let startNodeInfo = null, startOffset = 0;
        for (let i = 0; i < nodeOffsets.length; i++) {
          const no = nodeOffsets[i];
          if (matchIdx >= no.start && matchIdx < no.end) {
            startNodeInfo = no;
            startOffset = matchIdx - no.start;
            break;
          }
        }
        let endNodeInfo = null, endOffset = 0;
        for (let i = 0; i < nodeOffsets.length; i++) {
          const no = nodeOffsets[i];
          if (matchEnd > no.start && matchEnd <= no.end) {
            endNodeInfo = no;
            endOffset = matchEnd - no.start;
            break;
          }
        }

        if (startNodeInfo && endNodeInfo) {
          try {
            const range = document.createRange();
            range.setStart(startNodeInfo.node, Math.min(startOffset, startNodeInfo.node.nodeValue.length));
            range.setEnd(endNodeInfo.node, Math.min(endOffset, endNodeInfo.node.nodeValue.length));
            const prefix = fullText.substring(Math.max(0, matchIdx - 40), matchIdx);
            const suffix = fullText.substring(matchEnd, Math.min(fullText.length, matchEnd + 40));
            foundOccs.push({ range: range, matchIdx: matchIdx, matchEnd: matchEnd, prefix: prefix, suffix: suffix, index: foundOccs.length });
          } catch (_) {}
        }

        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } catch (_) {}
    return foundOccs;
  }

  function handleHighlightBoxTarget(msg) {
    clearSearchBoxOverlay();
    if (!msg || (!msg.keyword && !msg.targetSnippet && !msg.matchedTerm)) return;

    currentIsAiMatch = Boolean(msg.isAiMatch);
    activeSearchQuery = (msg.searchQuery || '').trim();

    // Thu thập tất cả các text node hiển thị
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p || p.closest('script, style, noscript, template')) continue;
      textNodes.push(n);
    }

    let fullText = '';
    const nodeOffsets = [];
    for (let i = 0; i < textNodes.length; i++) {
      const tn = textNodes[i];
      const val = tn.nodeValue || '';
      const start = fullText.length;
      fullText += val;
      nodeOffsets.push({ node: tn, start: start, end: fullText.length, text: val });
    }

    const normFull = normalizeVietnamese1to1(fullText).toLowerCase();

    // Danh sách từ khóa ứng cử viên theo thứ tự ưu tiên:
    const candidateTerms = [];
    const cleanWord = function(t) {
      return (t || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
    };

    if (msg.matchedTerm && msg.matchedTerm.trim()) {
      candidateTerms.push(msg.matchedTerm.trim());
      const c = cleanWord(msg.matchedTerm);
      if (c && c !== msg.matchedTerm.trim() && !candidateTerms.includes(c)) candidateTerms.push(c);
    }
    if (msg.keyword && msg.keyword.trim() && !candidateTerms.includes(msg.keyword.trim())) {
      candidateTerms.push(msg.keyword.trim());
      const c = cleanWord(msg.keyword);
      if (c && c !== msg.keyword.trim() && !candidateTerms.includes(c)) candidateTerms.push(c);
    }
    if (msg.targetSnippet && msg.targetSnippet.trim()) {
      const snip = msg.targetSnippet.trim();
      if (!candidateTerms.includes(snip)) candidateTerms.push(snip);
      const subParts = snip.split(/[.,;?!…\n\r]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length >= 10; });
      for (let i = 0; i < subParts.length; i++) {
        if (!candidateTerms.includes(subParts[i])) candidateTerms.push(subParts[i]);
      }
    }

    let occurrences = [];
    let usedTerm = '';

    for (let i = 0; i < candidateTerms.length; i++) {
      const term = candidateTerms[i];
      const foundOccs = findOccurrencesForTerm(term, normFull, fullText, nodeOffsets);
      if (foundOccs.length > 0) {
        occurrences = foundOccs;
        usedTerm = term;
        break;
      }
    }

    // Dự phòng cấp 2: Nếu chưa tìm thấy và matchedTerm có từ 3 từ trở lên, thử các cụm con 2 từ
    if (occurrences.length === 0 && msg.matchedTerm) {
      const words = cleanWord(msg.matchedTerm).split(/\s+/).filter(Boolean);
      if (words.length >= 3) {
        const head2 = words.slice(0, 2).join(' ');
        const tail2 = words.slice(-2).join(' ');
        if (!candidateTerms.includes(head2)) {
          const occs = findOccurrencesForTerm(head2, normFull, fullText, nodeOffsets);
          if (occs.length > 0) {
            occurrences = occs;
            usedTerm = head2;
          }
        }
        if (occurrences.length === 0 && !candidateTerms.includes(tail2)) {
          const occs = findOccurrencesForTerm(tail2, normFull, fullText, nodeOffsets);
          if (occs.length > 0) {
            occurrences = occs;
            usedTerm = tail2;
          }
        }
      }
    }

    // Dự phòng cấp 3: Nếu targetSnippet dài, thử tìm cụm 4 từ liên tiếp trong snippet
    if (occurrences.length === 0 && msg.targetSnippet) {
      const normSnip = normalizeVietnamese1to1(msg.targetSnippet).toLowerCase().trim();
      const snipWords = normSnip.split(/\s+/).filter(Boolean);
      if (snipWords.length >= 4) {
        for (let i = 0; i <= snipWords.length - 4; i++) {
          const subPhrase = snipWords.slice(i, i + 4).join(' ');
          const occs = findOccurrencesForTerm(subPhrase, normFull, fullText, nodeOffsets);
          if (occs.length > 0) {
            occurrences = occs;
            usedTerm = subPhrase;
            break;
          }
        }
      }
    }

    activeKeyword = usedTerm || candidateTerms[0] || '';
    currentOccurrences = occurrences;

    if (occurrences.length === 0) {
      window.parent.postMessage({
        type: 'SEARCH_OVERLAY_STATUS',
        currentIndex: 0,
        totalMatches: 0,
        keyword: activeKeyword
      }, '*');
      return;
    }

    // Chọn lần xuất hiện thích hợp nhất:
    let targetIdx = 0;
    if (msg.targetSnippet && occurrences.length > 1) {
      const normSnip = normalizeVietnamese1to1(msg.targetSnippet).toLowerCase();
      const snipIdx = normFull.indexOf(normSnip);
      if (snipIdx !== -1) {
        let minDiff = Infinity;
        occurrences.forEach(function(occ, i) {
          const diff = Math.abs(occ.matchIdx - snipIdx);
          if (diff < minDiff) {
            minDiff = diff;
            targetIdx = i;
          }
        });
      }
    } else if (msg.prefix || msg.suffix) {
      let bestScore = -1;
      const targetNormPrefix = normalizeVietnamese1to1(msg.prefix || '').toLowerCase();
      const targetNormSuffix = normalizeVietnamese1to1(msg.suffix || '').toLowerCase();
      occurrences.forEach(function(occ, i) {
        let score = 0;
        const occPrefix = normalizeVietnamese1to1(occ.prefix).toLowerCase();
        const occSuffix = normalizeVietnamese1to1(occ.suffix).toLowerCase();
        if (targetNormPrefix && occPrefix.endsWith(targetNormPrefix.slice(-15))) score += 2;
        if (targetNormSuffix && occSuffix.startsWith(targetNormSuffix.slice(0, 15))) score += 2;
        if (score > bestScore) {
          bestScore = score;
          targetIdx = i;
        }
      });
      if (bestScore === 0 && typeof msg.occurrenceIndex === 'number') {
        targetIdx = Math.min(Math.max(0, msg.occurrenceIndex), occurrences.length - 1);
      }
    } else if (typeof msg.occurrenceIndex === 'number') {
      targetIdx = Math.min(Math.max(0, msg.occurrenceIndex), occurrences.length - 1);
    }

    renderOverlayAtIndex(targetIdx, true);
  }

  function navigateSearchMatch(dir) {
    if (currentOccurrences.length > 0) {
      if (dir === 'next') {
        currentOccIndex = (currentOccIndex + 1) % currentOccurrences.length;
      } else {
        currentOccIndex = (currentOccIndex - 1 + currentOccurrences.length) % currentOccurrences.length;
      }
      renderOverlayAtIndex(currentOccIndex, false);
      return;
    }
    if (searchMatches.length === 0) return;
    searchMatches[currentMatchIdx]?.classList.remove('search-match-active');
    if (dir === 'next') {
      currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length;
    } else {
      currentMatchIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    }
    const activeEl = searchMatches[currentMatchIdx];
    if (activeEl) {
      activeEl.classList.add('search-match-active');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    window.parent.postMessage({
      type: 'SEARCH_RESULT',
      totalMatches: searchMatches.length,
      currentIndex: currentMatchIdx + 1
    }, '*');
  }


  // Hỗ trợ bấm vào hình ảnh hoặc nhấp đúp sơ đồ SVG trong bài học để mở Lightbox Phóng to
  document.addEventListener('click', function(e) {
    const img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!img || img.closest('a, button, [role="button"]')) return;
    const rect = img.getBoundingClientRect();
    if (rect.width < 48 && rect.height < 48) return;
    const src = img.currentSrc || img.src || '';
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({
      type: 'BRIDGE_IMAGE_LIGHTBOX',
      src: src,
      alt: img.alt || img.title || 'Hình ảnh bài học'
    }, '*');
  });

  document.addEventListener('dblclick', function(e) {
    const svg = e.target && e.target.closest ? e.target.closest('svg') : null;
    if (!svg || svg.closest('a, button, [role="button"], #ann-layer')) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 80) return;
    try {
      const clone = svg.cloneNode(true);
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      if (!clone.getAttribute('viewBox') && rect.width && rect.height) {
        clone.setAttribute('viewBox', '0 0 ' + Math.round(rect.width) + ' ' + Math.round(rect.height));
      }
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clone.outerHTML);
      window.parent.postMessage({
        type: 'BRIDGE_IMAGE_LIGHTBOX',
        src: svgDataUrl,
        alt: 'Sơ đồ minh họa bài học'
      }, '*');
    } catch (_) {}
  });

  // Tự động thông báo ngay khi Bridge Script tải xong trong Iframe (chủ động giải phóng skeleton ở app cha)
  function announceReadyImmediate() {
    try {
      const chunks = typeof extractTTSChunks === 'function' ? extractTTSChunks() : [];
      window.parent.postMessage({
        type: 'BRIDGE_READY',
        height: Math.max(document.body ? document.body.scrollHeight : 400, 400),
        bg: typeof getNativeBg === 'function' ? getNativeBg() : '#FFFFFF',
        ttsChunks: chunks
      }, '*');
      if (typeof sendHeight === 'function') sendHeight();
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', announceReadyImmediate);
  } else {
    announceReadyImmediate();
  }
})();
`;
      return openTag + bridgeJs + closeTag;
    }
    window.buildSandboxBridgeCode = buildSandboxBridgeCode;
