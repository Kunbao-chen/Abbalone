window.UI_VERSION = "v3.0.2";

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. 網址列高度修正 (Mobile Viewport Fix) ---
    const setVh = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', () => setTimeout(setVh, 100)); // 旋轉後重算
    setVh();

    // --- 2. 版號聚合與顯示 ---
    const htmlVer = window.HTML_VERSION || "N/A";
    const engVer = window.ENGINE_VERSION || "N/A";
    const uiVer = window.UI_VERSION || "N/A";
    document.getElementById('global-version-tag').innerText = `HTML:${htmlVer} | ENG:${engVer} | UI:${uiVer}`;

    // --- 3. UI 變數與 DOM ---
    const wrapper = document.getElementById('board-wrapper');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d', { alpha: false }); // 優化效能
    const btnExecute = document.getElementById('btn-execute');
    
    let CENTER = { x: 0, y: 0 };
    let HEX_SIZE = 30; // 預設值，將由 observer 動態計算

    // --- 4. 動態空間最大化 (ResizeObserver) ---
    // 監聽容器大小變化，自動調整 Canvas 的真實像素大小
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const size = Math.min(width, height) - 20; // 留 10px 邊距
            
            // 設定高解析度 Canvas
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            
            // 修正清晰度
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            // 重算中心點與棋孔半徑 (Abalone 棋盤最大寬度約為 9 個半徑)
            CENTER = { x: size / 2, y: size / 2 };
            HEX_SIZE = size / 10.5; // 動態計算 HEX_SIZE，確保剛好塞滿
            
            render(); // 大小改變後重繪
        }
    });
    resizeObserver.observe(wrapper);

    Engine.init();

    // --- 5. 渲染系統 ---
    function render() {
        const state = Engine.getState();
        
        // 更新 DOM
        document.getElementById('score-black').innerText = `黑: ${state.scores[1]}`;
        document.getElementById('score-white').innerText = `白: ${state.scores[2]}`;
        document.getElementById('turn-indicator').innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";
        btnExecute.disabled = !state.pendingMove;

        // 繪圖
        const size = parseFloat(canvas.style.width);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size); // 白色底

        state.board.forEach((piece, key) => {
            const [q, r] = key.split(',').map(Number);
            const { x, y } = hexToPixel(q, r);

            // 畫底盤
            drawCircle(x, y, HEX_SIZE * 0.9, "#dcdde1");

            // 畫紅圈 (合法落點)
            if (state.legalMoves.some(m => m.targetQ === q && m.targetR === r)) {
                drawRing(x, y, HEX_SIZE * 0.5, "#e74c3c", 4);
            }

            // 畫棋子
            if (piece !== 0) {
                drawCircle(x, y, HEX_SIZE * 0.75, piece === 1 ? "#333" : "#fff");
                // 畫黃圈 (選取)
                if (state.selection.some(s => s.q === q && s.r === r)) {
                    drawRing(x, y, HEX_SIZE * 0.85, "#f1c40f", 4);
                }
            }

            // 畫綠圈藍光 (預備執行)
            if (state.pendingMove && state.pendingMove.targetQ === q && state.pendingMove.targetR === r) {
                ctx.save();
                ctx.shadowBlur = 15; ctx.shadowColor = "#00d2ff";
                drawRing(x, y, HEX_SIZE * 0.75, "#2ecc71", 5);
                ctx.restore();
            }
        });
    }

    function drawCircle(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
    function drawRing(x, y, r, color, width) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
    function hexToPixel(q, r) { return { x: CENTER.x + HEX_SIZE * Math.sqrt(3) * (q + r / 2), y: CENTER.y + HEX_SIZE * (3 / 2) * r }; }

    // --- 6. 事件監聽 (支援動態縮放後的座標換算) ---
    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        // 反推六角座標
        const x = (px - CENTER.x) / HEX_SIZE;
        const y = (py - CENTER.y) / HEX_SIZE;
        let q = Math.sqrt(3)/3 * x - 1/3 * y;
        let r = 2/3 * y;
        
        // Hex Rounding
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r);
        if (Math.abs(rq - q) > Math.abs(rr - r) && Math.abs(rq - q) > Math.abs(rs - (-q - r))) rq = -rr - rs;
        else if (Math.abs(rr - r) > Math.abs(rs - (-q - r))) rr = -rq - rs;

        if (Engine.handleTap(rq, rr)) render();
    });

    btnExecute.addEventListener('click', () => { if (Engine.execute()) render(); });
    document.getElementById('btn-reset').addEventListener('click', () => { if(confirm("重置？")) { Engine.init(); render(); }});
});
