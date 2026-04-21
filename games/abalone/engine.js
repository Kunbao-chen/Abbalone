window.ENGINE_VERSION = "v3.2.0";

const Engine = (function() {
    let board = new Map();
    let turn = 1; 
    let scores = { 1: 0, 2: 0 };
    let selection = []; 
    let legalPaths = []; 
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
        selection = [];
        legalPaths = [];
        pathIndex = -1;
    }

    function traceSelection(q, r) {
        if (!board.has(`${q},${r}`) || board.get(`${q},${r}`) !== turn) return false;
        
        const isAlreadySelected = selection.some(s => s.q === q && s.r === r);
        if (isAlreadySelected && selection.length > 0) return false;

        if (selection.length === 0) {
            selection.push({q, r});
            return true;
        }

        const last = selection[selection.length - 1];
        const dq = q - last.q, dr = r - last.r;
        if (Math.abs(dq) > 1 || Math.abs(dr) > 1 || Math.abs(dq + dr) > 1) return false;

        if (selection.length >= 2) {
            const prev = selection[selection.length - 2];
            if ((q - last.q !== last.q - prev.q) || (r - last.r !== last.r - prev.r)) {
                selection = [{q: last.q, r: last.r}, {q, r}];
            } else {
                selection.push({q, r});
                if (selection.length > 3) selection.shift();
            }
        } else {
            selection.push({q, r});
        }
        return true;
    }

    function finalizeSelection() {
        if (selection.length === 0) return;
        legalPaths = [];
        
        DIRS.forEach(dir => {
            const path = validateMove(selection, dir);
            if (path) legalPaths.push(path);
        });

        if (legalPaths.length > 0) pathIndex = 0;
        else pathIndex = -1;
    }

    function validateMove(sel, dir) {
        // 判斷是 In-line (火車) 還是 Broadside (平移)
        const isInline = sel.length === 1 || 
            (sel[1].q - sel[0].q === dir.q && sel[1].r - sel[0].r === dir.r) ||
            (sel[1].q - sel[0].q === -dir.q && sel[1].r - sel[0].r === -dir.r);

        if (isInline) {
            // 火車推擠邏輯 (簡化判定)
            const head = getHead(sel, dir);
            const targetQ = head.q + dir.q, targetR = head.r + dir.r;
            if (!board.has(`${targetQ},${targetR}`)) return null;
            
            const targetVal = board.get(`${targetQ},${targetR}`);
            if (targetVal === 0) return { type: 'in-line', dir, sel };
            if (targetVal === turn) return null;
            
            // Sumito 力量判定
            let oppCount = 1;
            let nQ = targetQ + dir.q, nR = targetR + dir.r;
            while (board.get(`${nQ},${nR}`) === (3 - turn)) {
                oppCount++; nQ += dir.q; nR += dir.r;
            }
            if (sel.length > oppCount && (board.get(`${nQ},${nR}`) === 0 || !board.has(`${nQ},${nR}`))) {
                return { type: 'in-line', dir, sel, push: oppCount };
            }
        } else {
            // 平移邏輯
            const canMoveAll = sel.every(s => board.get(`${s.q + dir.q},${s.r + dir.r}`) === 0);
            if (canMoveAll) return { type: 'broadside', dir, sel };
        }
        return null;
    }

    function getHead(sel, dir) {
        return sel.reduce((prev, curr) => {
            const d = (curr.q - prev.q) * dir.q + (curr.r - prev.r) * dir.r;
            return d > 0 ? curr : prev;
        });
    }

    function cyclePath(delta) {
        if (legalPaths.length === 0) return;
        pathIndex = (pathIndex + delta + legalPaths.length) % legalPaths.length;
    }

    function execute() {
        if (pathIndex === -1) return false;
        const p = legalPaths[pathIndex];
        
        // 1. 處理推擠位移 (後序處理避免覆蓋)
        if (p.type === 'in-line' && p.push) {
            const oppTurn = 3 - turn;
            for (let i = p.push; i >= 1; i--) {
                const head = getHead(p.sel, p.dir);
                const oldQ = head.q + p.dir.q * i, oldR = head.r + p.dir.r * i;
                const newQ = oldQ + p.dir.q, newR = oldR + p.dir.r;
                if (board.has(`${newQ},${newR}`)) board.set(`${newQ},${newR}`, oppTurn);
                else scores[turn]++; 
            }
        }
        
        // 2. 處理自軍位移
        const newPositions = p.sel.map(s => ({ q: s.q + p.dir.q, r: s.r + p.dir.r, val: turn }));
        p.sel.forEach(s => board.set(`${s.q},${s.r}`, 0));
        newPositions.forEach(p => board.set(`${p.q},${p.r}`, p.val));

        turn = 3 - turn;
        resetInteraction();
        return true;
    }

    return { init, traceSelection, finalizeSelection, cyclePath, execute, 
             getState: () => ({ board, turn, scores, selection, legalPaths, pathIndex }) };
})();
