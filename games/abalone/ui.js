window.UI_VERSION = "v3.2.2";

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnOk = document.getElementById('btn-execute-top');
    const turnEl = document.getElementById('turn-display');
    
    let CENTER = { x: 0, y: 0 }, HEX_SIZE = 0, isTracing = false;

    const resize = () => {
        const wrapper = document.getElementById('board-wrapper');
        const size = Math.min(wrapper.clientWidth, wrapper.clientHeight) - 60;
        canvas.width = size * window.devicePixelRatio;
        canvas.height = size * window.devicePixelRatio;
        canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
        ctx.resetTransform();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        CENTER = { x: size / 2, y: size / 2 };
        HEX_SIZE = size / 15.5;
        render();
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 100);

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
            // 選取標記
            if (state.selection.some(s => s.q === q && s.r === r)) {
                ctx.strokeStyle = "#3498db"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); ctx.stroke();
            }
        });

        // 路徑導引與虛影
        if (state.pathIndex !== -1) {
            const path = state.legalPaths[state.pathIndex];
            const color = path.type === 'in-line' ? "#2ecc71" : "#f1c40f"; // 綠色推擠，黃色平移
            path.sel.forEach(s => {
                const start = hexToPixel(s.q, s.r);
                const end = hexToPixel(s.q + path.dir.q, s.r + path.dir.r);
                
                // 1. 繪製路徑線
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
                ctx.setLineDash([]);
                
                // 2. 繪製虛影棋子 (關鍵反饋)
                ctx.beginPath(); ctx.arc(end.x, end.y, HEX_SIZE * 0.65, 0, Math.PI*2);
                ctx.fillStyle = color + "44"; // 半透明虛影
                ctx.fill();
                ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
            });
        }
        updateUI(state);
    }

    function updateUI(state) {
        const hasPaths = state.legalPaths.length > 0;
        if (btnPrev) { btnPrev.disabled = !hasPaths; btnPrev.style.opacity = hasPaths ? "1" : "0.3"; }
        if (btnNext) { btnNext.disabled = !hasPaths; btnNext.style.opacity = hasPaths ? "1" : "0.3"; }
        if (btnOk) { btnOk.disabled = state.pathIndex === -1; }
        if (turnEl) turnEl.innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";
    }

    canvas.addEventListener('pointerdown', (e) => {
        isTracing = true;
        const rect = canvas.getBoundingClientRect();
        const p = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        
        // 關鍵：點擊己方棋子，若目前沒在選取中，則重置狀態
        const state = Engine.getState();
        if (state.board.get(`${p.q},${p.r}`) === state.turn) {
            Engine.resetInteraction();
        }
        
        if (Engine.traceSelection(p.q, p.r)) render();
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isTracing) return;
        const rect = canvas.getBoundingClientRect();
        const p = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        if (Engine.traceSelection(p.q, p.r)) render();
    });

    window.addEventListener('pointerup', () => {
        if (isTracing) {
            isTracing = false;
            Engine.finalizeSelection();
            render();
        }
    });

    if (btnPrev) btnPrev.onclick = () => { Engine.cyclePath(-1); render(); };
    if (btnNext) btnNext.onclick = () => { Engine.cyclePath(1); render(); };
    if (btnOk) btnOk.onclick = () => { if (Engine.execute()) render(); };

    Engine.init();
});
