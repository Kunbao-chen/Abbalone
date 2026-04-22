window.UI_VERSION = "v3.4.1";

document.addEventListener("DOMContentLoaded", () => {
    // --- 手術刀新增：長軸鎖定邏輯 ---
    const app = document.getElementById('game-app');
    if (window.innerWidth > window.innerHeight) {
        app.classList.add('mode-h');
    }
    // --- 手術刀結束 ---

    const versionTag = document.getElementById('global-version-tag');
    if (versionTag) versionTag.innerText = `HTML:${window.HTML_VERSION} | ENG:${window.ENGINE_VERSION} | UI:${window.UI_VERSION}`;

    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const btnExit = document.getElementById('btn-exit');
    const btnReset = document.getElementById('btn-reset');
    const btnOkTop = document.getElementById('btn-execute-top');
    const btnOkBottom = document.getElementById('btn-execute-bottom');
    const pathCtrlsTop = document.getElementById('path-controls-top');
    const pathCtrlsBottom = document.getElementById('path-controls-bottom');
    const indTop = document.getElementById('path-indicator-top');
    const indBottom = document.getElementById('path-indicator-bottom');
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

    // 座標映射旋轉 90 度，配合螢幕長軸對坐
    function hexToPixel(q, r) {
        return { x: CENTER.x + HEX_SIZE * Math.sqrt(3) * (r + q / 2), y: CENTER.y + HEX_SIZE * 1.5 * q };
    }

    function pixelToHex(px, py) {
        let y = (px - CENTER.x) / HEX_SIZE, x = (py - CENTER.y) / HEX_SIZE;
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
            ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = "#ecf0f1"; ctx.fill();
            if (piece !== 0) {
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = piece === 1 ? "#2c3e50" : "#ffffff"; ctx.fill();
                if (piece === 2) { ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke(); }
            }
            if (state.selection.some(s => s.q === q && s.r === r)) {
                ctx.strokeStyle = "#3498db"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); ctx.stroke();
            }
        });

        if (state.pathIndex !== -1 && state.legalPaths[state.pathIndex]) {
            const path = state.legalPaths[state.pathIndex];
            const color = path.type === 'in-line' ? "#2ecc71" : "#f1c40f";
            path.sel.forEach(s => {
                const start = hexToPixel(s.q, s.r);
                const end = hexToPixel(s.q + path.dir.q, s.r + path.dir.r);
                ctx.setLineDash([5, 5]); ctx.strokeStyle = color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(end.x, end.y, HEX_SIZE * 0.65, 0, Math.PI*2);
                ctx.fillStyle = color + "44"; ctx.fill();
                ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
            });
        }
        updateUI(state);
    }

    function updateUI(state) {
        const hasPaths = state.legalPaths.length > 0;
        
        // 更新雙端控制器顯隱
        [pathCtrlsTop, pathCtrlsBottom].forEach(ctrl => {
            if (ctrl) ctrl.style.display = hasPaths ? "flex" : "none";
        });
        
        // 更新數值顯示（若僅一條路徑顯示 1/1）
        const indText = `${state.pathIndex + 1} / ${Math.max(1, state.legalPaths.length)}`;
        [indTop, indBottom].forEach(ind => { if (ind) ind.innerText = indText; });

        // 獨立權限控制
        const canExecute = state.pathIndex !== -1;
        if (btnOkBottom) {
            const isBlackTurn = state.turn === 1;
            btnOkBottom.disabled = !(isBlackTurn && canExecute);
            btnOkBottom.style.opacity = isBlackTurn ? "1" : "0.3";
        }
        if (btnOkTop) {
            const isWhiteTurn = state.turn === 2;
            btnOkTop.disabled = !(isWhiteTurn && canExecute);
            btnOkTop.style.opacity = isWhiteTurn ? "1" : "0.3";
        }

        if (turnEl) turnEl.innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";
    }

    canvas.addEventListener('pointerdown', (e) => {
        isTracing = true;
        const rect = canvas.getBoundingClientRect();
        const p = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        
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

    // 基礎功能綁定
    if (btnExit) btnExit.onclick = () => { window.location.href = "../../index.html"; };
    if (btnReset) btnReset.onclick = () => { Engine.init(); render(); };
    
    // 雙端路徑切換綁定
    const onPrev = () => { Engine.cyclePath(-1); render(); };
    const onNext = () => { Engine.cyclePath(1); render(); };
    document.getElementById('btn-prev-top')?.addEventListener('click', onPrev);
    document.getElementById('btn-next-top')?.addEventListener('click', onNext);
    document.getElementById('btn-prev-bottom')?.addEventListener('click', onPrev);
    document.getElementById('btn-next-bottom')?.addEventListener('click', onNext);
    
    // 兩側執行按鈕綁定
    const executeMove = () => { if (Engine.execute()) render(); };
    if (btnOkTop) btnOkTop.onclick = executeMove;
    if (btnOkBottom) btnOkBottom.onclick = executeMove;

    Engine.init();
});
