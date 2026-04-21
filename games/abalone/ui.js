// 手術刀：加註修改問題 - v3.1.4: 回滾至原始尖頂佈局(Pointy Top)作為基準、還原棋孔為淺灰色(#ecf0f1)。
// 手術刀：加註修改問題 - v3.1.5: 實作棋盤右旋 60 度視覺映射、同步修正點擊判定逆向旋轉、保持白棋黑邊。
window.UI_VERSION = "v3.1.5";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('global-version-tag').innerText = 
        `HTML:${window.HTML_VERSION} | ENG:${window.ENGINE_VERSION} | UI:${window.UI_VERSION}`;

    const wrapper = document.getElementById('board-wrapper');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let CENTER = { x: 0, y: 0 }, HEX_SIZE = 0;

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const size = Math.min(width, height) - 60; 
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            CENTER = { x: size / 2, y: size / 2 };
            HEX_SIZE = size / 15.5; 
            render();
        }
    });
    resizeObserver.observe(wrapper);

    // 原始尖頂投影公式 (不變)
    function hexToPixel(q, r) {
        const x = CENTER.x + HEX_SIZE * Math.sqrt(3) * (q + r / 2);
        const y = CENTER.y + HEX_SIZE * (3 / 2) * r;
        return { x, y };
    }

    // 原始逆向投影公式 (不變)
    function pixelToHex(px, py) {
        let x = (px - CENTER.x) / HEX_SIZE;
        let y = (py - CENTER.y) / HEX_SIZE;
        let q = (Math.sqrt(3)/3 * x - 1/3 * y);
        let r = (2/3 * y);
        return roundHex(q, r);
    }

    function roundHex(q, r) {
        let s = -q - r;
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
        let q_diff = Math.abs(rq - q), r_diff = Math.abs(rr - r), s_diff = Math.abs(rs - s);
        if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
        else if (r_diff > s_diff) rr = -rq - rs;
        return { q: rq, r: rr };
    }

    function drawCircle(x, y, r, color) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
    }

    function render() {
        const state = Engine.getState();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        state.board.forEach((piece, key) => {
            const [origQ, origR] = key.split(',').map(Number);
            
            // 手術刀：右旋 60 度視覺映射邏輯
            const q = -origR;
            const r = origQ + origR;
            
            const { x, y } = hexToPixel(q, r);
            
            // 繪製棋孔 (還原淺灰色)
            drawCircle(x, y, HEX_SIZE * 0.8, "#ecf0f1");

            if (piece !== 0) {
                drawCircle(x, y, HEX_SIZE * 0.7, piece === 1 ? "#2c3e50" : "#f1f2f6");
                
                // 白棋黑邊
                if (piece === 2) {
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // 選取特效判定 (需比對原始座標)
                if (state.selection.some(s => s.q === origQ && s.r === origR)) {
                    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); ctx.stroke();
                }
            }
        });

        document.getElementById('btn-execute-top').disabled = !state.pendingMove;
        document.getElementById('btn-execute-bottom').disabled = !state.pendingMove;
        document.getElementById('turn-display').innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";
    }

    document.getElementById('btn-exit').onclick = () => {
        if(confirm("確定退出回大廳？")) window.location.href = "../../index.html";
    };

    document.getElementById('btn-reset').onclick = () => { Engine.init(); render(); };
    const onExecute = () => { if(Engine.execute()) render(); };
    document.getElementById('btn-execute-top').onclick = onExecute;
    document.getElementById('btn-execute-bottom').onclick = onExecute;

    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        // 取得畫面上點擊的視覺座標 (q, r)
        const visual = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        
        // 手術刀：逆向旋轉映射 (將視覺座標轉回引擎原始座標)
        // 視覺 q = -origR => origR = -visual.q
        // 視覺 r = origQ + origR => origQ = visual.r - origR = visual.r + visual.q
        const origQ = visual.q + visual.r;
        const origR = -visual.q;
        
        if(Engine.handleTap(origQ, origR)) render();
    });

    Engine.init();
});
