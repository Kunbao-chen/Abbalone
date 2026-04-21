window.ENGINE_VERSION = "v3.2.0";

const Engine = (function() {
    let board = new Map();
    let turn = 1; 
    let scores = { 1: 0, 2: 0 };
    let selection = []; // 存儲劃線選中的 1-3 顆棋子
    let legalPaths = []; // 存儲所有合法路徑物件 {type: 'in-line'|'broadside', dir, shift, impactedPieces}
    let pathIndex = -1;

    const DIRS = [
        {q:1, r:0}, {q:1, r:-1}, {q:0, r:-1},
        {q:-1, r:0}, {q:-1, r:1}, {q:0, r:1}
    ];

    function init() {
        board.clear();
        for (let q = -4; q <= 4; q++) {
            for (let r = -4; r <= 4; r++) {
                if (Math.abs(q + r) <= 4) {
                    let val = 0;
                    if (q <= -3) val = 1; 
                    else if (q == -2 && r >= 0 && r <= 2) val = 1;
                    else if (q >= 3) val = 2;
                    else if (q == 2 && r <= 0 && r >= -2) val = 2;
                    board.set(`${q},${r}`, val);
                }
            }
        }
        resetInteraction();
    }

    function resetInteraction() {
        selection = []; legalPaths = []; pathIndex = -1;
    }

    // 劃線選取核心：處理滑動選棋
    function traceSelection(q, r) {
        if (!board.has(`${q},${r}`) || board.get(`${q},${r}`) !== turn) return false;
        
        if (selection.length === 0) {
            selection.push({q, r});
            return true;
        }

        const last = selection[selection.length - 1];
        if (last.q === q && last.r === r) return false;

        // 檢查是否鄰接
        const dq = q - last.q, dr = r - last.r;
        if (Math.abs(dq) > 1 || Math.abs(dr) > 1 || Math.abs(dq + dr) > 1) return false;

        if (selection.length >= 2) {
            const prev = selection[selection.length - 2];
            const v1 = {q: last.q - prev.q, r: last.r - prev.r};
            const v2 = {q: q - last.q, r: r - last.r};
            
            if (v1.q !== v2.q || v1.r !== v2.r) {
                // 轉彎重算：只認最後這兩顆
                selection = [{q: last.q, r: last.r}, {q, r}];
            } else {
                selection.push({q, r});
                if (selection.length > 3) selection.shift(); // 只認後三顆
            }
        } else {
            selection.push({q, r});
        }
        return true;
    }

    // 當手指放開，計算所有可行路徑
    function finalizeSelection() {
        if (selection.length === 0) return;
        legalPaths = [];
        
        // 1. 搜尋 In-line (火車推擠) - 沿著連線兩端
        // 2. 搜尋 Broadside (平移) - 往側面 4 個方向
        // (此處簡化實作邏輯，僅供架構展示)
        DIRS.forEach(dir => {
            const path = validatePath(selection, dir);
            if (path) legalPaths.push(path);
        });

        if (legalPaths.length > 0) pathIndex = 0;
    }

    function validatePath(sel, dir) {
        // 核心：判斷移動類型與力量對比 (Sumito)
        // 回傳路徑物件或 null
        return null; // 具體邏輯由引擎完整計算後填入
    }

    function cyclePath(delta) {
        if (legalPaths.length === 0) return;
        pathIndex = (pathIndex + delta + legalPaths.length) % legalPaths.length;
    }

    function execute() {
        if (pathIndex === -1) return false;
        const p = legalPaths[pathIndex];
        // 根據路徑更新 board...
        turn = 3 - turn;
        resetInteraction();
        return true;
    }

    return { 
        init, traceSelection, finalizeSelection, cyclePath, execute, 
        getState: () => ({ board, turn, scores, selection, legalPaths, pathIndex }) 
    };
})();
