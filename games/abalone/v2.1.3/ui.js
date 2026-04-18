/** File: ui.js | Version: v2.1.3 */
window.UI_VERSION = "v2.1.3";
const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;

function updateUI() { 
    const curTurn = window.turn || 1; const curScore = window.score || {1:0, 2:0};
    const typeStr = (typeof window.getCurrentType === 'function') ? (window.getCurrentType() === 'B' ? " (Robot)" : " (Player)") : "";
    document.getElementById('status').innerText = (curTurn === 1 ? "黑棋" : "白棋") + "回合" + typeStr; 
    document.getElementById('score').innerText = `黑 ${curScore[1]} : ${curScore[2]} 白`; 
    
    const vt = document.getElementById('version-tag');
    if (vt) vt.innerHTML = `HTML: v2.1.3 | CSS: v2.1.3<br>ENG: ${window.ENGINE_VERSION} | AI: ${window.AI_VERSION} | UI: ${window.UI_VERSION}`;

    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = !previewTarget;
    t.classList.toggle('active-ready', !!previewTarget); b.classList.toggle('active-ready', !!previewTarget);
    t.classList.toggle('turn-glow', curTurn === 2); b.classList.toggle('turn-glow', curTurn === 1);
}

function draw() { 
    if (!ctx || !window.board) return;
    ctx.clearRect(0,0,550,550); const movingAllies = currentMoveInfo ? currentMoveInfo.allies : [];
    for (let key in window.board) { 
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r); 
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill(); 
        let v = window.board[key]; 
        if(v > 0){
            if (movingAllies.some(p => p.q === q && p.r === r)) {
                ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#00d2ff";
                ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); ctx.strokeStyle = "rgba(0, 210, 255, 0.9)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            }
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle = v === 1 ? "#333" : "#fff"; ctx.fill(); 
            let isSelected = (selectedTail && selectedTail.q === q && selectedTail.r === r);
            ctx.strokeStyle = isSelected ? "#f1c40f" : "#222"; ctx.lineWidth = isSelected ? 4 : 1.5; ctx.stroke();
        } 
        if(legalTargets.some(t=>t.q===q&&t.r===r)){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.4,0,Math.PI*2); ctx.strokeStyle="#e74c3c"; ctx.lineWidth = 4; ctx.stroke();
        } 
        if(previewTarget && previewTarget.q===q && previewTarget.r===r){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); ctx.strokeStyle="#2ecc71"; ctx.lineWidth=5; ctx.stroke();
        } 
    } 
}

function handleInput(q, r) {
    if (window.board[`${q},${r}`] === window.turn) { selectedTail = {q, r}; calculateLegalMoves(q, r); previewTarget = null; }
    else if (legalTargets.some(t => t.q === q && t.r === r)) { currentMoveInfo = legalTargets.find(t => t.q === q && t.r === r); previewTarget = {q, r}; }
    updateUI(); draw();
}

function setupSurrenderLogic() {
    [document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')].forEach(btn => {
        if(!btn) return;
        btn.onclick = () => {
            btn.style.transition = "transform 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 0.4s";
            btn.style.transform = "scale(12) rotate(20deg)"; btn.style.opacity = "0";
            setTimeout(() => {
                alert((window.turn === 1 ? "黑棋" : "白棋") + "認輸，對方獲勝！");
                location.reload();
            }, 450);
        };
    });
}

function exitGame() { window.location.href = "index.html"; }

function setupResetLogic() {
    const btn = document.getElementById('resetBtn'); const circle = document.getElementById('progressCircle');
    let timer, progress = 0;
    const start = (e) => { if(e.cancelable) e.preventDefault(); timer = setInterval(() => { progress += 5; circle.style.strokeDashoffset = 126 - (126 * progress / 100); if (progress >= 100) { clearInterval(timer); location.reload(); } }, 50); };
    const end = () => { clearInterval(timer); progress = 0; circle.style.strokeDashoffset = 126; };
    btn.onmousedown = btn.ontouchstart = start; btn.onmouseup = btn.onmouseleave = btn.ontouchend = end;
}

function showModeSelect() { document.getElementById('overlay-content').innerHTML = `<div class="setup-title">智推棋 Abalone</div><button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button><button class="flow-btn" onclick="showPVBSideSelect()">電腦對抗 (PVB)</button><button class="flow-btn" style="background:#8e44ad" onclick="startGame('PIR', 1, 'B', 'B')">神仙打架 (PIR)</button><button class="flow-btn btn-back" onclick="exitGame()">退出遊戲</button>`; }
function showPVBSideSelect() { document.getElementById('overlay-content').innerHTML = `<div class="setup-title">選擇您的順序</div><button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家執黑先行</button><button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家執白後行</button><button class="flow-btn btn-back" onclick="showModeSelect()">Back</button>`; }
function startGame(mode, side, bType, wType) { window.BLACK_TYPE=bType; window.WHITE_TYPE=wType; window.isGameStarted = true; document.getElementById('setup-overlay').style.display='none'; initBoard(); setupResetLogic(); setupSurrenderLogic(); updateLayout(); }

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX, cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX-rect.left)*(550/rect.width), y: (cY-rect.top)*(550/rect.height) }; }
function updateLayout() { const wrapper = document.getElementById('app-viewport'); const w = window.innerWidth, h = window.innerHeight; if (w > h && window.isGameStarted) { wrapper.style.transform = `translate(0, 0) rotate(90deg)`; wrapper.style.width = `${h}px`; wrapper.style.height = `${w}px`; wrapper.style.left = `${(w - h) / 2}px`; wrapper.style.top = `${(h - w) / 2}px`; } else { wrapper.style.transform = `none`; wrapper.style.width = `100%`; wrapper.style.height = `100%`; wrapper.style.left = `0`; wrapper.style.top = `0`; } }

canvas.addEventListener('mousedown', (e) => { if(!isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q, r); } });
window.addEventListener('resize', updateLayout);
window.onload = showModeSelect;
