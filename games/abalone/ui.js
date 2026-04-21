window.UI_VERSION = "v3.2.0";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('global-version-tag').innerText = 
        `HTML:${window.HTML_VERSION} | ENG:${window.ENGINE_VERSION} | UI:${window.UI_VERSION}`;

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnOk = document.getElementById('btn-execute-top');
    let CENTER = { x: 0, y: 0 }, HEX_SIZE = 0, isTracing = false;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const size = Math.min(entry.contentRect.width, entry.contentRect.height) - 60;
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            CENTER = { x: size / 2, y: size / 2 };
            HEX_SIZE = size / 15.5;
            render();
        }
    });
    resizeObserver.observe(document.getElementById('board-wrapper'));

    function hexToPixel(q, r) {
        return { x: CENTER.x + HEX_SIZE * 1.5 * q, y: CENTER.y + HEX_SIZE * Math.sqrt(3) * (r + q / 2) };
    }

    function pixelToHex(px, py) {
        let x = (px - CENTER.x) / HEX_SIZE, y = (py - CENTER.y) / HEX_SIZE;
        let q = (2/3 * x), r = (-1/3 * x + Math.sqrt(3)/3 * y);
        let s = -q - r, rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
        if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-s)) rq = -rr-rs;
        else if (Math.abs(rr-r) > Math.abs(rs-s)) rr = -rq-rs;
        return { q: rq, r: rr };
    }

    function render() {
        const state = Engine.getState();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        state.board.forEach((piece, key) => {
            const [q, r] = key.split(',').map(Number);
            const { x, y } = hexToPixel(q, r);
            
            // 棋孔
            ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = "#ecf0f1"; ctx.fill();

            // 棋子
            if (piece !== 0) {
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = piece === 1 ? "#2c3e50" : "#ffffff"; ctx.fill();
                if (piece === 2) { ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke(); }
            }

            // 劃線選取高亮
            if (state.selection.some(s => s.q === q && s.r === r)) {
                ctx.strokeStyle = "#3498db"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); ctx.stroke();
            }
        });

        // 繪製路徑箭頭
        if (state.pathIndex !== -1) {
            const path = state.legalPaths[state.pathIndex];
            const color = path.type === 'in-line' ? "#2ecc71" : "#f1c40f";
            path.sel.forEach(s => {
                const start = hexToPixel(s.q, s.r);
                const end = hexToPixel(s.q + path.dir.q, s.r + path.dir.r);
                drawArrow(start.x, start.y, end.x, end.y, color);
                // 虛影預覽
                ctx.beginPath(); ctx.arc(end.x, end.y, HEX_SIZE * 0.5, 0, Math.PI*2);
                ctx.fillStyle = color + "66"; ctx.fill();
            });
        }

        updateUI(state);
    }

    function drawArrow(fx, fy, tx, ty, color) {
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
    }

    function updateUI(state) {
        const hasPaths = state.legalPaths.length > 0;
        btnPrev.disabled = !hasPaths; btnNext.disabled = !hasPaths;
        btnOk.disabled = state.pathIndex === -1;
        btnPrev.style.opacity = btnNext.style.opacity = hasPaths ? "1" : "0.3";
        document.getElementById('turn-display').innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";
    }

    canvas.addEventListener('pointerdown', (e) => {
        isTracing = true; Engine.init(); // 重新開始劃線
        const p = pixelToHex(e.offsetX, e.offsetY);
        if (Engine.traceSelection(p.q, p.r)) render();
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isTracing) return;
        const p = pixelToHex(e.offsetX, e.offsetY);
        if (Engine.traceSelection(p.q, p.r)) render();
    });

    window.addEventListener('pointerup', () => {
        if (isTracing) { isTracing = false; Engine.finalizeSelection(); render(); }
    });

    btnPrev.onclick = () => { Engine.cyclePath(-1); render(); };
    btnNext.onclick = () => { Engine.cyclePath(1); render(); };
    btnOk.onclick = () => { if (Engine.execute()) render(); };

    Engine.init();
});
