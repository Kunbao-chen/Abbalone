window.UI_VERSION = "v3.4.1";

document.addEventListener("DOMContentLoaded", () => {
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
    
    // v3.4.1 新增：記分板 DOM 引用
    const scoreAlphaEl = document.getElementById('score-alpha');
    const scoreBetaEl = document.getElementById('score-beta');
    
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
        return {
            x: CENTER.x + HEX_SIZE * 1.5 * q,
            y: CENTER.y + HEX_SIZE * Math.sqrt(3) * (r + q/2)
        };
    }

    function pixelToHex(x, y) {
        let q = (2/3 * (x - CENTER.x)) / HEX_SIZE;
        let r = (-1/3 * (x - CENTER.x) + Math.sqrt(3)/3 * (y - CENTER.y)) / HEX_SIZE;
        return axialRound(q, r);
    }

    function axialRound(q, r) {
        let x = q, z = r, y = -x-z;
        let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
        let dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
        if (dx > dy && dx > dz) rx = -ry-rz;
        else if (dy > dz) ry = -rx-rz;
        else rz = -rx-ry;
        return { q: rx, r: rz };
    }

    function render() {
        const state = Engine.getState();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製棋盤格與棋子
        state.board.forEach((val, key) => {
            const [q, r] = key.split(',').map(Number);
            const { x, y } = hexToPixel(q, r);
            
            // 繪製六角格底色
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                ctx.lineTo(x + HEX_SIZE * Math.cos(angle), y + HEX_SIZE * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fillStyle = "#ecf0f1"; ctx.fill();
            ctx.strokeStyle = "#bdc3c7"; ctx.lineWidth = 1; ctx.stroke();

            // 繪製棋子
            if (val !== 0) {
                ctx.beginPath();
                ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI * 2);
                ctx.fillStyle = val === 1 ? "#2c3e50" : "#ffffff";
                ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.3)";
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "#7f8c8d"; ctx.lineWidth = 1; ctx.stroke();
            }

            // 選取高亮
            if (state.selection.some(s => s.q === q && s.r === r)) {
                ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.8, 0, Math.PI * 2); ctx.stroke();
            }
        });

        // 2. 繪製預覽路徑
        if (state.pathIndex !== -1) {
            const p = state.legalPaths[state.pathIndex];
            const color = state.turn === 1 ? "#3498db" : "#e74c3c";
            p.sel.forEach(s => {
                const start = hexToPixel(s.q, s.r);
                const end = hexToPixel(s.q + p.dir.q, s.r + p.dir.r);
                drawArrow(start.x, start.y, end.x, end.y, color);
            });
        }

        updateUI(state);
    }

    function drawArrow(fx, fy, tx, ty, color) {
        const headlen = 10;
        const angle = Math.atan2(ty - fy, tx - fx);
        ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI / 6), ty - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI / 6), ty - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    function updateUI(state) {
        const hasPaths = state.legalPaths.length > 0;
        
        // 更新記分板
        if (scoreAlphaEl) scoreAlphaEl.innerText = state.scores[1];
        if (scoreBetaEl) scoreBetaEl.innerText = state.scores[2];

        // 雙端操作面板控制
        const showTop = state.turn === 1; 
        if (pathCtrlsTop) pathCtrlsTop.style.display = (showTop && hasPaths) ? "flex" : "none";
        if (pathCtrlsBottom) pathCtrlsBottom.style.display = (!showTop && hasPaths) ? "flex" : "none";
        
        if (indTop) indTop.innerText = `${state.pathIndex + 1} / ${state.legalPaths.length}`;
        if (indBottom) indBottom.innerText = `${state.pathIndex + 1} / ${state.legalPaths.length}`;

        if (btnOkTop) { btnOkTop.disabled = !(showTop && state.pathIndex !== -1); }
        if (btnOkBottom) { btnOkBottom.disabled = !(!showTop && state.pathIndex !== -1); }
        
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

    const onExecute = () => { if (Engine.execute()) render(); };
    btnOkTop?.addEventListener('click', onExecute);
    btnOkBottom?.addEventListener('click', onExecute);

    Engine.init();
});
