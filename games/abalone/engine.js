// 手術刀：版本演進至 v3.4.1，同步對應 UI 記分板結構
window.ENGINE_VERSION = "v3.4.1";

const Engine = (function() {
    let board = new Map();
    let turn = 1; // 1: 黑棋, 2: 白棋
    let scores = { 1: 0, 2: 0 };
    let selection = []; 
    let legalPaths = []; 
    let pathIndex = -1;

    const DIRS = [
        {q: 1, r: 0}, {q: 1, r: -1}, {q: 0, r: -1},
        {q: -1, r: 0}, {q: -1, r: 1}, {q: 0, r: 1}
    ];

    function init() {
        board.clear();
        for (let q = -4; q <= 4; q++) {
            for (let r = -4; r <= 4; r++) {
                if (Math.abs(q + r) <= 4) {
                    let val = 0;
                    // 初始化棋盤佈局 (Standard Abalone Setup)
                    if (q <= -3) val = 1; 
                    else if (q == -2 && r >= 0 && r <= 2) val = 1;
                    else if (q >= 3) val = 2;
                    else if (q == 2 && r <= 0 && r >= -2) val = 2;
                    board.set(`${q},${r}`, val);
                }
            }
        }
        turn = 1;
        scores = { 1: 0, 2: 0 };
        resetInteraction();
    }

    function resetInteraction() {
        selection = [];
        legalPaths = [];
        pathIndex = -1;
    }

    function traceSelection(q, r) {
        if (!board.has(`${q},${r}`)) return false;
        const piece = board.get(`${q},${r}`);
        
        // 僅能選取當前回合玩家的棋子
        if (piece !== turn) return false;

        // 若重複選取已在隊列中的棋子，則不處理 (避免環路)
        if (selection.some(s => s.q === q && s.r === r)) return false;

        // 連續性檢查：新選取的棋子必須與最後一個選取的棋子相鄰
        if (selection.length > 0) {
            const last = selection[selection.length - 1];
            const isNeighbor = DIRS.some(d => (last.q + d.q === q) && (last.r + d.r === r));
            if (!isNeighbor) return false;
            if (selection.length >= 3) return false; // 最多選取三顆
            
            // 直線檢查：三顆棋子必須在同一條線上
            if (selection.length === 2) {
                const first = selection[0];
                const dq1 = selection[1].q - first.q;
                const dr1 = selection[1].r - first.r;
                const dq2 = q - selection[1].q;
                const dr2 = r - selection[1].r;
                if (dq1 !== dq2 || dr1 !== dr2) return false;
            }
        }

        selection.push({ q, r });
        return true;
    }

    function finalizeSelection() {
        if (selection.length === 0) return;
        findLegalPaths();
    }

    function findLegalPaths() {
        legalPaths = [];
        DIRS.forEach(dir => {
            const move = getInLineMove(selection, dir) || getBroadsideMove(selection, dir);
            if (move) legalPaths.push(move);
        });
        pathIndex = legalPaths.length > 0 ? 0 : -1;
    }

    function getInLineMove(sel, dir) {
        const sorted = [...sel].sort((a, b) => {
            const d = (b.q - a.q) * dir.q + (b.r - a.r) * dir.r;
            return d > 0 ? -1 : 1;
        });
        const head = sorted[sorted.length - 1];
        const tail = sorted[0];

        // 檢查方向是否為直線方向
        const isForward = (head.q + dir.q === (sorted[0].q === head.q ? head.q : head.q + dir.q)); // 簡化判定
        const dq = head.q - tail.q, dr = head.r - tail.r;
        const isParallel = (dq === dir.q * (sel.length-1) && dr === dir.r * (sel.length-1)) ||
                           (dq === -dir.q * (sel.length-1) && dr === -dir.r * (sel.length-1));
        
        if (!isParallel) return null;

        let pushCount = 0;
        let currQ = head.q + dir.q, currR = head.r + dir.r;

        while (board.has(`${currQ},${currR}`)) {
            const val = board.get(`${currQ},${currR}`);
            if (val === 0) return { type: 'in-line', dir, sel, push: pushCount };
            if (val === turn) return null; // 撞到自己人
            pushCount++;
            if (pushCount >= sel.length) return null; // 推不動
            currQ += dir.q; currR += dir.r;
        }
        return { type: 'in-line', dir, sel, push: pushCount }; // 推下棋盤
    }

    function getBroadsideMove(sel, dir) {
        if (sel.every(s => {
            const nQ = s.q + dir.q, nR = s.r + dir.r;
            return board.get(`${nQ},${nR}`) === 0;
        })) {
            return { type: 'broadside', dir, sel };
        }
        return null;
    }

    function getHead(sel, dir) {
        return sel.reduce((p, c) => ((c.q - p.q) * dir.q + (c.r - p.r) * dir.r) > 0 ? c : p);
    }

    function execute() {
        if (pathIndex === -1) return false;
        const p = legalPaths[pathIndex];

        // 1. 處理推擠邏輯 (後序處理以防資料覆蓋)
        if (p.type === 'in-line' && p.push > 0) {
            const opp = 3 - turn;
            for (let i = p.push; i >= 1; i--) {
                const h = getHead(p.sel, p.dir);
                const oQ = h.q + p.dir.q * i, oR = h.r + p.dir.r * i;
                const nQ = oQ + p.dir.q, nR = oR + p.dir.r;
                if (board.has(`${nQ},${nR}`)) board.set(`${nQ},${nR}`, opp);
                else scores[turn]++; // 推下棋盤，計分
            }
        }

        // 2. 處理自身位移
        const oldPos = p.sel.map(s => `${s.q},${s.r}`);
        const newPos = p.sel.map(s => ({ q: s.q + p.dir.q, r: s.r + p.dir.r }));
        oldPos.forEach(pos => board.set(pos, 0));
        newPos.forEach(pos => board.set(`${pos.q},${pos.r}`, turn));

        // 3. 回合切換
        turn = 3 - turn;
        resetInteraction();
        return true;
    }

    return {
        init,
        traceSelection,
        finalizeSelection,
        resetInteraction,
        cyclePath: (delta) => {
            if (legalPaths.length) pathIndex = (pathIndex + delta + legalPaths.length) % legalPaths.length;
        },
        execute,
        getState: () => ({ board, turn, scores, selection, legalPaths, pathIndex })
    };
})();
