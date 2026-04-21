// 手術刀：加註修改問題 - v3.1.3: 修正棋盤旋轉對齊長軸、解決棋位溢出邊界、優化棋孔配色與白棋黑邊辨識度。
// 手術刀：加註修改問題 - v3.1.4: 回滾至原始尖頂佈局(Pointy Top)作為基準、還原棋孔為淺灰色(#ecf0f1)、保留白棋黑邊。
window.UI_VERSION = "v3.1.4";

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
            // 保留安全邊距避免溢出
            const size = Math.min(width, height) - 60; 
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            CENTER = { x: size / 2, y: size / 2 };
            // 維持 15.5 確保棋盤比例在大螢幕上適中
            HEX_SIZE = size / 15.5; 
            render();
        }
    });
    resizeObserver.observe(wrapper);

    // 手術刀：還原為原始尖頂 (Pointy Top) 投影公式
    function hexToPixel(q, r) {
        const x = CENTER.x + HEX_SIZE * Math.sqrt(3) * (q + r / 2);
        const y = CENTER.y + HEX_SIZE * (3 / 2) * r;
        return { x, y };
    }

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
            const [q, r] = key.split(',').map(Number);
            const { x, y } = hexToPixel(q, r);
            
            // 手術刀：還原棋孔顏色為原本的淺灰色
            drawCircle(x, y, HEX_SIZE * 0.8, "#ecf0f1");

            if (piece !== 0) {
                drawCircle(x, y, HEX_SIZE * 0.7, piece === 1 ? "#2c3e50" : "#f1f2f6");
                
                // 手術刀：保留白棋 (piece 2) 描黑邊邏輯，確保在淺灰孔位上可辨識
                if (piece === 2) {
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (state.selection.some(s => s.q === q && s.r === r)) {
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
        const { q, r } = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        if(Engine.handleTap(q, r)) render();
    });

    Engine.init();
});
