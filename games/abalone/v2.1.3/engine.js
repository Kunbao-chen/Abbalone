// Abalone Engine v2.1.4
window.board = {}; 
window.turn = 1; 
window.score = { 1: 0, 2: 0 };
window.BLACK_TYPE = 'P'; 
window.WHITE_TYPE = 'P';
window.isGameStarted = false;
window.selectedTail = null; 
window.legalTargets = []; 
window.previewTarget = null; 
window.currentMoveInfo = null;

const DIRS = [{q:1,r:-1},{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1}];

function initBoard() { 
    for (let q = -4; q <= 4; q++) { 
        for (let r = -4; r <= 4; r++) { 
            if (Math.abs(q + r) <= 4) { 
                let val = 0; 
                if (r <= -3) val = 2; 
                if (r == -2 && (q == 0 || q == 1 || q == 2)) val = 2; // 嚴格遵守 v2.1.2 條件
                if (r >= 3) val = 1; 
                if (r == 2 && (q == 0 || q == -1 || q == -2)) val = 1;
                window.board[`${q},${r}`] = val; 
            } 
        } 
    } 
    updateUI(); draw(); 
}

function calculateLegalMoves(q, r) { 
    window.legalTargets = []; 
    const c = window.board[`${q},${r}`]; 
    DIRS.forEach(dir => { 
        let allies = [{q, r}]; 
        for (let i = 1; i < 3; i++) { 
            if (window.board[`${q+dir.q*i},${r+dir.r*i}`] === c) allies.push({q: q+dir.q*i, r: r+dir.r*i}); 
            else break; 
        } 
        let myP = allies.length, head = allies[allies.length - 1], oppC = 0, canM = true, sP = { q: head.q + dir.q, r: head.r + dir.r }; 
        if (window.board[`${sP.q},${sP.r}`] === undefined) canM = false;
        while (canM && window.board[`${sP.q},${sP.r}`] !== undefined && window.board[`${sP.q},${sP.r}`] !== 0) { 
            if (window.board[`${sP.q},${sP.r}`] === c) { canM = false; break; } 
            oppC++; sP.q += dir.q; sP.r += dir.r; 
        } 
        if (canM && myP > oppC) window.legalTargets.push({ q: head.q + dir.q, r: head.r + dir.r, dir, allies, oppCount: oppC }); 
    }); 
}

function executeMove() {
    if (!window.currentMoveInfo) return; 
    let nextBoard = {...window.board}; const moveInfo = window.currentMoveInfo;
    moveInfo.allies.forEach(s => nextBoard[`${s.q},${s.r}`] = 0);
    moveInfo.allies.forEach(s => nextBoard[`${s.q + moveInfo.dir.q},${s.r + moveInfo.dir.r}`] = window.turn);
    if (moveInfo.oppCount > 0) {
        for (let i = moveInfo.oppCount; i >= 1; i--) {
            let oQ = moveInfo.q + moveInfo.dir.q * (i-1), oR = moveInfo.r + moveInfo.dir.r * (i-1), next = { q: oQ + moveInfo.dir.q, r: oR + moveInfo.dir.r };
            if (window.board[`${next.q},${next.r}`] !== undefined) nextBoard[`${next.q},${next.r}`] = (window.turn === 1 ? 2 : 1); 
            else window.score[window.turn]++;
        }
    }
    window.board = nextBoard; window.selectedTail = null; window.legalTargets = []; window.previewTarget = null; window.currentMoveInfo = null;
    if (window.score[window.turn] >= 6) { concludeGame(window.turn); return; }
    window.turn = (window.turn === 1) ? 2 : 1; 
    updateUI(); draw();
    if (window.isGameStarted && getCurrentType() === 'B') triggerBotMove();
}

function getCurrentType() { return window.turn === 1 ? window.BLACK_TYPE : window.WHITE_TYPE; }
