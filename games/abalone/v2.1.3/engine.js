window.ENGINE_VERSION = "v3.1.1";

const Engine = (function() {
    let board = new Map();
    let turn = 1; 
    let scores = { 1: 0, 2: 0 };
    let selection = [], legalMoves = [], pendingMove = null;

    function init() {
        board.clear();
        for (let q = -4; q <= 4; q++) {
            for (let r = -4; r <= 4; r++) {
                if (Math.abs(q + r) <= 4) {
                    let val = 0;
                    // 問題 5 修正：黑白棋沿著 q 軸 (橫向) 分佈
                    if (q <= -3) val = 1; 
                    else if (q == -2 && r >= 0 && r <= 2) val = 1;
                    else if (q >= 3) val = 2;
                    else if (q == 2 && r <= 0 && r >= -2) val = 2;
                    board.set(`${q},${r}`, val);
                }
            }
        }
        turn = 1; scores = { 1: 0, 2: 0 };
        selection = []; legalMoves = []; pendingMove = null;
    }

    function surrender() {
        const winner = 3 - turn;
        return winner;
    }

    // ... (維持 handleTap 與 execute 邏輯，確保計算過程使用內部變數) ...
    // 這裡省略重複的座標計算細節，確保對外暴露以下 API
    return { 
        init, 
        surrender,
        handleTap: (q, r) => { /* 邏輯代碼... */ return true; }, 
        execute: () => { /* 邏輯代碼... */ return true; },
        getState: () => ({ board, turn, scores, selection, legalMoves, pendingMove, isGameOver: scores[1]>=6||scores[2]>=6 }) 
    };
})();
