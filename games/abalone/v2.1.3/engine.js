/** File: engine.js | Version: v2.1.3 */
window.ENGINE_VERSION = "v2.1.3";
window.board = {}; 
window.turn = 1; 
window.score = { 1: 0, 2: 0 };
window.BLACK_TYPE = 'P'; 
window.WHITE_TYPE = 'P';
window.isGameStarted = false;

const DIRS = [{q:1,r:-1},{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1}];

function initBoard() { 
    window.board = {};
    for (let q = -4; q <= 4; q++) { 
        for (let r = -4; r <= 4; r++) { 
            if (Math.abs(q + r) <= 4) { 
                let val = 0; if (r <= -3) val = 2; if (r == -2 && (q >= 0 && q <= 2)) val = 2;
                if (r >= 3) val = 1; if (r == 2 && (q <= 0 && q >= -2)) val = 1;
                window.board[`${q},${r}`] = val; 
            } 
        } 
    } 
    if(typeof updateUI === 'function') updateUI(); 
    if(typeof draw === 'function') draw(); 
}

function calculateLegalMoves(q, r) { 
    legalTargets = []; const c = window.board[`${q},${r}`]; 
    DIRS.forEach(dir => { 
        let allies = [{q, r}]; 
        for (let i = 1; i < 3; i++) { 
            let nQ = q + dir.q*i, nR = r + dir.r*i;
            if (window.board[`${nQ},${nR}`] === c) allies.push({q: nQ, r: nR}); else break;
        }
        let myP = allies.length, head = allies[allies.length - 1], oppC = 0, canM = true, sP = { q: head.q + dir.q, r: head.r + dir.r }; 
        while (canM && window.board[`${sP.q},${sP.r}`] !== undefined && window.board[`${sP.q},${sP.r}`] !== 0) { 
            if (window.board[`${sP.q},${sP.r}`] === c) { canM = false; break; } 
            oppC++; sP.q += dir.q; sP.r += dir.r; 
        } 
        if (canM && myP > oppC) legalTargets.push({ q: head.q + dir.q, r: head.r + dir.r, dir, allies, oppCount: oppC }); 
    }); 
}

function executeMove() {
    if (!currentMoveInfo) return; 
    let nextBoard = {...window.board}; const moveInfo = currentMoveInfo;
    moveInfo.allies.forEach(s => nextBoard[`${s.q},${s.r}`] = 0);
    moveInfo.allies.forEach(s => nextBoard[`${s.q + moveInfo.dir.q},${s.r + moveInfo.dir.r}`] = window.turn);
    if (moveInfo.oppCount > 0) {
        for (let i = moveInfo.oppCount; i >= 1; i--) {
            let oQ = moveInfo.q + moveInfo.dir.q * (i-1), oR = moveInfo.r + moveInfo.dir.r * (i-1);
            let nQ = oQ + moveInfo.dir.q, nR = oR + moveInfo.dir.r;
            if (window.board[`${nQ},${nR}`] === undefined) window.score[window.turn]++; else nextBoard[`${nQ},${nR}`] = (window.turn === 1 ? 2 : 1);
        }
    }
    window.board = nextBoard;
    if (window.score[window.turn] >= 6) { alert((window.turn === 1 ? "黑棋" : "白棋") + "獲勝！"); location.reload(); return; }
    window.turn = (window.turn === 1) ? 2 : 1;
    selectedTail = null; legalTargets = []; previewTarget = null; currentMoveInfo = null;
    updateUI(); draw();
    if (window.isGameStarted && window.getCurrentType() === 'B') triggerBotMove();
}

window.getCurrentType = function() { return (window.turn === 1) ? window.BLACK_TYPE : window.WHITE_TYPE; };
