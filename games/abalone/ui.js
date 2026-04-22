window.UI_VERSION = "v3.5.0";

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const versionTag = document.getElementById('global-version-tag');
    
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

    function hexToPixel(q, r) {
        // 判定長軸：若寬大於高，則旋轉座標軸 90 度
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            return { x: CENTER.x + HEX_SIZE * 1.5 * q, y: CENTER.y + HEX_SIZE * Math.sqrt(3) * (r + q/2) };
        }
        return { x: CENTER.x + HEX_SIZE * Math.sqrt(3) * (r + q/2), y: CENTER.y + HEX_SIZE * 1.5 * q };
    }

    function updateUI(state) {
        const isWhiteTurn = state.turn === 2;
        const isBlackTurn = state.turn === 1;

        // 1. 權限隔離：只有當前回合方顯示切換與確認鍵
        document.getElementById('ctrl-alpha').style.display = isWhiteTurn ? "flex" : "none";
        document.getElementById('ctrl-beta').style.display = isBlackTurn ? "flex" : "none";

        // 2. 指示器更新
        const pText = `${state.pathIndex + 1}/${Math.max(1, state.legalPaths.length)}`;
        document.getElementById('ind-alpha').innerText = pText;
        document.getElementById('ind-beta').innerText = pText;

        // 3. 分數同步 (修正點 5)
        document.getElementById('score-alpha').innerText = `白棋: ${state.scores[2]}`;
        document.getElementById('score-beta').innerText = `黑棋: ${state.scores[1]}`;

        document.getElementById('turn-status').innerText = isBlackTurn ? "黑棋回合" : "白棋回合";
        versionTag.innerText = `v${window.HTML_VERSION} | ${isLandscape()?'橫':'直'}`;
    }

    const isLandscape = () => window.innerWidth > window.innerHeight;

    function render() {
        const state = Engine.getState();
        ctx.clearRect(0,0,canvas.width,canvas.height);
        // ... 繪製邏輯 ...
        updateUI(state);
    }

    // 事件綁定 (紅標區域按鈕)
    document.getElementById('btn-exit').onclick = () => { if(confirm("確定退出？")) location.reload(); };
    document.getElementById('btn-reset').onclick = () => { Engine.init(); render(); };

    // 雙端按鈕綁定 (修正點 2 & 3)
    ['alpha', 'beta'].forEach(side => {
        document.getElementById(`btn-prev-${side}`).onclick = () => { Engine.cyclePath(-1); render(); };
        document.getElementById(`btn-next-${side}`).onclick = () => { Engine.cyclePath(1); render(); };
        document.getElementById(`btn-ok-${side}`).onclick = () => { if(Engine.execute()) render(); };
    });

    window.addEventListener('resize', resize);
    Engine.init();
    resize();
});
