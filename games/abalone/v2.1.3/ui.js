const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;

function updateUI() { 
    document.getElementById('status').innerText = (turn === 1 ? "黑棋" : "白棋") + "回合"; 
    document.getElementById('score').innerText = `黑 ${score[1]} : ${score[2]} 白`; 
    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = !previewTarget; 
}

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX, cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX-rect.left)*(550/rect.width), y: (cY-rect.top)*(550/rect.height) }; }

function draw() { 
    ctx.clearRect(0,0,550,550); 
    for (let key in board) { 
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r); 
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill(); 
        let v = board[key]; 
        if(v>0){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle=v===1?"#333":"#fff"; ctx.fill(); 
            if(selectedTail && selectedTail.q===q && selectedTail.r===r){ctx.strokeStyle="#f1c40f"; ctx.lineWidth=4; ctx.stroke();}
        } 
        if(legalTargets.some(t=>t.q===q&&t.r===r)){ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.4,0,Math.PI*2); ctx.strokeStyle="#e74c3c"; ctx.stroke();} 
        if(previewTarget && previewTarget.q===q && previewTarget.r===r){ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); ctx.strokeStyle="#2ecc71"; ctx.lineWidth=4; ctx.stroke();} 
    } 
}

function handleInput(q, r) {
    if (board[`${q},${r}`] === turn) {
        selectedTail = {q, r};
        calculateLegalMoves(q, r);
        previewTarget = null;
    } else if (legalTargets.some(t => t.q === q && t.r === r)) {
        currentMoveInfo = legalTargets.find(t => t.q === q && t.r === r);
        previewTarget = {q, r};
    }
    updateUI(); draw();
}

canvas.addEventListener('mousedown', (e) => { 
    if(!isBotThinking) { 
        const {x,y} = getMousePos(e); 
        const {q,r} = pixelToHex(x,y); 
        handleInput(q, r);
    } 
});

function showModeSelect() { document.getElementById('overlay-content').innerHTML = `<div class="setup-title">智推棋 Abalone</div><button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button><button class="flow-btn" onclick="showPVBSideSelect()">電腦對抗 (PVB)</button>`; }
function showPVBSideSelect() { document.getElementById('overlay-content').innerHTML = `<div class="setup-title">選擇您的順序</div><button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家執黑先行</button><button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家執白後行</button><button class="flow-btn btn-back" onclick="showModeSelect()">Back</button>`; }
function startGame(mode, side, bType, wType) { BLACK_TYPE=bType; WHITE_TYPE=wType; initBoard(); isGameStarted = true; document.getElementById('setup-overlay').style.display='none'; if(getCurrentType()==='B') triggerBotMove(); }
function getCurrentType() { return turn===1 ? BLACK_TYPE : WHITE_TYPE; }
function exitGame() { location.reload(); }
window.onload = showModeSelect;