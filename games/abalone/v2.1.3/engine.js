window.ENGINE_VERSION = "v3.0.1";
// Abalone 核心邏輯引擎 (純資料層)
const Engine = (function() {
    // 私有狀態
    let board = new Map();
    let turn = 1; // 1: 黑, 2: 白
    let scores = { 1: 0, 2: 0 };
    
    // 玩家選取的狀態
    let selection = []; // [{q, r}]
    let legalMoves = []; // [{ targetQ, targetR, type, pushCount }]
    let pendingMove = null;

    const DIRS = [ {q:1, r:0}, {q:1, r:-1}, {q:0, r:-1}, {q:-1, r:0}, {q:-1, r:1}, {q:0, r:1} ];

    // 初始化標準棋盤
    function init() {
        board.clear();
        turn = 1;
        scores = { 1: 0, 2: 0 };
        clearSelection();
        
        const radius = 4;
        for (let q = -radius; q <= radius; q++) {
            let r1 = Math.max(-radius, -q - radius);
            let r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                let piece = 0;
                if (r === -3 || r === -4 || (r === -2 && q >= -1 && q <= 1)) piece = 1; // 黑
                if (r === 3 || r === 4 || (r === 2 && q >= -1 && q <= 1)) piece = 2; // 白
                board.set(`${q},${r}`, piece);
            }
        }
    }

    function clearSelection() {
        selection = []; legalMoves = []; pendingMove = null;
    }

    // 處理輸入：點擊座標
    function handleTap(q, r) {
        const key = `${q},${r}`;
        if (!board.has(key)) return false;

        const piece = board.get(key);

        // 1. 點擊自己的棋子 -> 設定為起點 (為簡化示範，此架構先實作單顆棋子選取)
        if (piece === turn) {
            selection = [{q, r}];
            calculateMoves(q, r);
            pendingMove = null;
            return true; // 狀態有更新
        }
        
        // 2. 點擊合法目標 -> 設定為預備執行
        const move = legalMoves.find(m => m.targetQ === q && m.targetR === r);
        if (move) {
            pendingMove = move;
            return true;
        }

        // 3. 點擊無效區域
        clearSelection();
        return true;
    }

    // 計算合法路徑 (此處以單顆棋子移動與基礎推擠作為架構展示)
    function calculateMoves(q, r) {
        legalMoves = [];
        DIRS.forEach(d => {
            let tQ = q + d.q, tR = r + d.r;
            let tKey = `${tQ},${tR}`;
            
            if (!board.has(tKey)) return; // 撞牆
            
            let tPiece = board.get(tKey);
            if (tPiece === 0) {
                // 空地可走
                legalMoves.push({ targetQ: tQ, targetR: tR, dir: d, type: 'move' });
            } else if (tPiece !== turn) {
                // 遇到敵人，檢查後方是否有空地可推 (簡化的 2打1 邏輯結構)
                let behindQ = tQ + d.q, behindR = tR + d.r;
                let behindKey = `${behindQ},${behindR}`;
                // 若後方無界線(推下懸崖) 或 後方為空地
                if (!board.has(behindKey) || board.get(behindKey) === 0) {
                    // 需要實作真正的數量對比邏輯，此處僅搭建資料結構
                    legalMoves.push({ targetQ: tQ, targetR: tR, dir: d, type: 'push' });
                }
            }
        });
    }

    // 執行走棋
    function execute() {
        if (!pendingMove) return false;

        const start = selection[0];
        const { targetQ, targetR, dir, type } = pendingMove;

        // 物理移動邏輯
        if (type === 'move') {
            board.set(`${targetQ},${targetR}`, turn);
            board.set(`${start.q},${start.r}`, 0);
        } else if (type === 'push') {
            let behindQ = targetQ + dir.q, behindR = targetR + dir.r;
            let behindKey = `${behindQ},${behindR}`;
            
            // 敵人被推走
            if (!board.has(behindKey)) {
                scores[turn]++; // 推出場外得分
            } else {
                board.set(behindKey, 3 - turn); // 敵人退後
            }
            // 自己前進
            board.set(`${targetQ},${targetR}`, turn);
            board.set(`${start.q},${start.r}`, 0);
        }

        // 換局與重置
        turn = 3 - turn;
        clearSelection();
        return true;
    }

    // 暴露 API
    return {
        init,
        handleTap,
        execute,
        getState: () => ({
            board: board,
            turn: turn,
            scores: scores,
            selection: selection,
            legalMoves: legalMoves,
            pendingMove: pendingMove,
            isGameOver: scores[1] >= 6 || scores[2] >= 6
        })
    };
})();
