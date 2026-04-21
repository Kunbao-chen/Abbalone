window.ENGINE_VERSION = "v3.1.2";

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
                    // 初始化：黑棋在一端(q<= -3)，白棋在另一端(q>= 3)
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

    function surrender() { return 3 - turn; }

    function handleTap(q, r) {
        if (!board.has(`${q},${r}`)) return false;
        const piece = board.get(`${q},${r}`);

        // 簡單邏輯：點擊自己的棋子進行選取
        if (piece === turn) {
            selection = [{q, r}];
            pendingMove = null;
            return true;
        } 
        // 點擊空白處嘗試移動 (此處應有 Abalone 複雜移動邏輯，暫以點擊紀錄為示範)
        if (piece === 0 && selection.length > 0) {
            pendingMove = { targetQ: q, targetR: r };
            return true;
        }
        return false;
    }

    function execute() {
        if (!pendingMove) return false;
        // 執行棋位交換
        const {q, r} = selection[0];
        board.set(`${q},${r}`, 0);
        board.set(`${pendingMove.targetQ},${pendingMove.targetR}`, turn);
        turn = 3 - turn;
        selection = []; pendingMove = null;
        return true;
    }

    return { init, surrender, handleTap, execute, getState: () => ({ board, turn, scores, selection, legalMoves, pendingMove }) };
})();
