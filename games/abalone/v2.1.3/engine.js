let board = {}; let turn = 1; let score = { 1: 0, 2: 0 };
let BLACK_TYPE = 'P'; let WHITE_TYPE = 'P';
let isGameStarted = false;
const DIRS = [{q:1,r:-1},{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1}];

function initBoard() { 
    for (let q = -4; q <= 4; q++) { 
        for (let r = -4; r <= 4; r++) { 
            if (Math.abs(q + r) <= 4) { 
                let val = 0; if (r <= -3) val = 2; if (r == -2 && (q >= 0 && q <= 2)) val = 2;
                if (r >= 3) val = 1; if (r == 2 && (q <= 0 && q >= -2)) val = 1;
                board[`${q},${r}`] = val; 
            } 
        } 
    } 
    updateUI(); draw(); 
}

function calculateLegalMoves(q, r) { 
    legalTargets = []; const c = board[`${q},${r}`]; 
    DIRS.forEach(dir => { 
        let allies = [{q, r}]; 
        for (let i = 1; i < 3; i++) { 
            if (board[`${q+dir.q*i},${r+dir.r*i}`] === c) allies.push({q: q+dir.q*i, r: r+dir.r*i}); 
            else break; 
        } 
        let myP = allies.length, head = allies[allies.length - 1], oppC = 0, canM = true, sP = { q: head.q + dir.q, r: head.r + dir.r }; 
        while (canM && board[`${sP.q},${sP.r}`] !== undefined && board[`${sP.q},${sP.r}`] !== 0) { 
            if (board[`${sP.q},${sP.r}`] === c) { canM = false; break; } 
            oppC++; sP.q += dir.q; sP.r += dir.r; 
        } 
        if (canM && myP > oppC) legalTargets.push({ q: head.q + dir.q, r: head.r + dir.r, dir, allies, oppCount: oppC }); 
    }); 
}

function executeMove() {
    if (!currentMoveInfo) return; 
    let nextBoard = {...board}; const moveInfo = currentMoveInfo;
    moveInfo.allies.forEach(s => nextBoard[`${s.q},${s.r}`] = 0);
    moveInfo.allies.forEach(s => nextBoard[`${s.q + moveInfo.dir.q},${s.r + moveInfo.dir.r}`] = turn);
    if (moveInfo.oppCount > 0) {
        for (let i = moveInfo.oppCount; i >= 1; i--) {
            let oQ = moveInfo.q + moveInfo.dir.q * (i-1), oR = moveInfo.r + moveInfo.dir.r * (i-1), next = { q: oQ + moveInfo.dir.q, r: oR + moveInfo.dir.r };
            if (board[`${next.q},${next.r}`] !== undefined) nextBoard[`${next.q},${next.r}`] = (turn === 1 ? 2 : 1); else score[turn]++;
        }
    }
    board = nextBoard; selectedTail = null; legalTargets = []; previewTarget = null; currentMoveInfo = null;
    if (score[turn] >= 6) { alert("Game Over"); location.reload(); return; }
    turn = (turn === 1) ? 2 : 1; 
    updateUI(); draw();
    if (isGameStarted && getCurrentType() === 'B') triggerBotMove();
}