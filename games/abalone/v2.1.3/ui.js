window.UI_VERSION = "v3.1.1";

document.addEventListener("DOMContentLoaded", () => {
    // 1. 顯示聚合版號
    document.getElementById('global-version-tag').innerText = 
        `HTML:${window.HTML_VERSION} | ENG:${window.ENGINE_VERSION} | UI:${window.UI_VERSION}`;

    const wrapper = document.getElementById('board-wrapper');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    let CENTER = { x: 0, y: 0 }, HEX_SIZE = 0;

    // 2. 修正棋盤溢出：調整 HEX_SIZE 比例
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const size = Math.min(width, height) - 40; 
            canvas.width = size * window.devicePixelRatio;
            canvas.height = size * window.devicePixelRatio;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            CENTER = { x: size / 2, y: size / 2 };
            // 問題 1 修正：Abalone 棋盤最寬處約為 11 個單位，除以 12.5 留出安全邊距
            HEX_SIZE = size / 12.5; 
            render();
        }
    });
    resizeObserver.observe(wrapper);

    // 3. 事件綁定 (問題 2, 3, 4：雙側聯動與 Exit)
    const bindEvents = () => {
        // Exit 鍵
        document.getElementById('btn-exit').onclick = () => {
            if(confirm("確定要離開遊戲回到大廳嗎？")) window.location.href = "../index.html";
        };

        // 重置
        document.getElementById('btn-reset').onclick = () => {
            if(confirm("重置棋盤？")) { Engine.init(); render(); }
        };

        // 雙側 OK 鍵
        const onExecute = () => { if(Engine.execute()) render(); };
        document.getElementById('btn-execute-top').onclick = onExecute;
        document.getElementById('btn-execute-bottom').onclick = onExecute;

        // 雙側認輸鍵
        const onSurrender = () => {
            if(confirm("確定要認輸嗎？")) {
                const winner = Engine.surrender();
                alert(`${winner === 1 ? '黑棋' : '白棋'} 獲勝！`);
                Engine.init(); render();
            }
        };
        document.getElementById('btn-surrender-top').onclick = onSurrender;
        document.getElementById('btn-surrender-bottom').onclick = onSurrender;

        // 畫布點擊
        canvas.addEventListener('pointerdown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const { q, r } = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
            if(Engine.handleTap(q, r)) render();
        });
    };

    function render() {
        const state = Engine.getState();
        // 更新雙側按鈕狀態
        const isReady = !!state.pendingMove;
        document.getElementById('btn-execute-top').disabled = !isReady;
        document.getElementById('btn-execute-bottom').disabled = !isReady;
        document.getElementById('turn-display').innerText = state.turn === 1 ? "黑棋回合" : "白棋回合";

        // 繪圖邏輯 (略，使用 HEX_SIZE 與 CENTER 繪製)
        // ... (包含原本的 drawCircle, drawRing 等輔助函數) ...
    }

    // 座標轉換邏輯 (pixelToHex, hexToPixel)
    // ...

    Engine.init();
    bindEvents();
});
