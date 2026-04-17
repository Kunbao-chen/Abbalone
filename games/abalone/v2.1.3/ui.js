/**
 * File: ui.js | Version: v2.1.3
 * 功能：自動聚合模組版號、修復紅圈與白棋視覺、修復導航與特效
 */
const UI_VERSION = "v2.1.3"; // UI 模組自己的版號

const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;

// 1. 介面更新：聚合所有模組版號
function updateUI() { 
    const typeStr = getCurrentType() === 'B' ? " (Robot)" : " (Player)";
    document.getElementById('status').innerText = (turn === 1 ? "黑棋" : "白棋") + "回合" + typeStr; 
    document.getElementById('score').innerText = `黑 ${score[1]} : ${score[2]} 白`; 
    
    // 實時讀取全域變數，若模組未載入則顯示 Unknown
    const engV = typeof ENGINE_VERSION !== 'undefined' ? ENGINE_VERSION : "Unknown";
    const aiV = typeof AI_VERSION !== 'undefined' ? AI_VERSION : "Unknown";

    const vt = document.getElementById('version-tag');
    if (vt) {
        vt.style.cssText = "position:fixed; bottom:12px; right:12px; left:auto; text-align:right; font-size:10px; color:rgba(255,255,255,0.4); pointer-events:none; line-height:1.4; z-index:100;";
        vt.innerHTML = `Frame: v2.1.3-Folder<br>ENG: ${engV} | UI: ${UI_VERSION} | AI: ${aiV}`;
    }

    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = true;
    t.classList.remove('active-ready', 'turn-glow'); b.classList.remove('active-ready', 'turn-glow');
    
    const activeBtn = (turn === 1 ? b : t); 
    activeBtn.classList.add('turn-glow'); 
    if (previewTarget) { 
        activeBtn.disabled = false; 
        activeBtn.classList.add('active-ready'); 
    } 
}

// 2. 特效修正：Reset 與 脹大爆炸
function setupResetLogic() {
    const btn = document.getElementById('resetBtn');
    const circle = document.getElementById('progressCircle');
    let timer, progress = 0;
    btn.onmousedown = btn.ontouchstart = (e) => {
        if (e.cancelable) e.preventDefault();
        timer = setInterval(() => {
            progress += 5;
            if (circle) circle.style.strokeDashoffset = 126 - (126 * progress / 100);
            if (progress >= 100) { clearInterval(timer); location.reload(); }
        }, 50);
    };
    const cancel = () => { clearInterval(timer); progress = 0; if (circle) circle.style.strokeDashoffset = 126; };
    btn.onmouseup = btn.onmouseleave = btn.ontouchend = cancel;
}

function setupSurrenderLogic() {
    const btns = [document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')];
    btns.forEach(btn => {
        btn.onclick = () => {
            btn.style.transition = "transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s";
            btn.style.transform = "scale(10) rotate(15deg)"; 
            btn.style.opacity = "0";
            setTimeout(() => {
                alert(turn === 1 ? "黑棋認輸，白棋獲勝！" : "白棋認輸，黑棋獲勝！");
                location.reload();
            }, 400);
        };
    });
}

// 3. 視覺修正：白棋黑邊、紅圈一致性
function draw() { 
    ctx.clearRect(0,0,550,550); 
    const movingAllies = currentMoveInfo ? currentMoveInfo.allies : [];
    for (let key in board) { 
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r); 
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill(); 
        let v = board[key]; 
        if(v>0){
            if (movingAllies.some(p => p.q === q && p.r === r)) {
                ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#00d2ff";
                ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2);
                ctx.strokeStyle = "rgba(0, 210, 255, 0.8)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            }
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle=v===1?"#333":"#fff"; ctx.fill(); 
            // 強化邊框
            let isSelected = (selectedTail && selectedTail.q===q && selectedTail.r===r);
            ctx.strokeStyle = isSelected ? "#f1c40f" : "#000"; 
            ctx.lineWidth = isSelected ? 4 : 1.5; ctx.stroke();
        } 
        if(legalTargets.some(t=>t.q===q&&t.r===r)){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.4,0,Math.PI*2); 
            ctx.strokeStyle="#e74c3c"; ctx.lineWidth = 4; ctx.stroke();
        } 
        if(previewTarget && previewTarget.q===q && previewTarget.r===r){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); 
            ctx.strokeStyle="#2ecc71"; ctx.lineWidth=5; ctx.stroke();
        } 
    } 
}

// 4. 路由與導航修正
function showModeSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div class="setup-title">智推棋 Abalone</div>
        <button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button>
        <button class="flow-btn" onclick="showPVBSideSelect()">電腦對抗 (PVB)</button>
        <button class="flow-btn" style="background:#8e44ad" onclick="startGame('PIR', 1, 'B', 'B')">神仙打架 (PIR)</button>`;
}

function showPVBSideSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div class="setup-title">選擇您的順序</div>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家執黑先行</button>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家執白後行</button>
        <button class="flow-btn btn-back" onclick="exitGame()">Back</button>`;
}

function exitGame() { 
    if (window.location.search.includes('mode=')) {
        window.location.href = "../../index.html"; 
    } else {
        location.reload(); 
    }
}

function startGame(mode, side, bType, wType) { 
    BLACK_TYPE=bType; WHITE_TYPE=wType; isGameStarted = true; 
    document.getElementById('setup-overlay').style.display='none'; 
    updateLayout(); initBoard(); setupResetLogic(); setupSurrenderLogic();
    updateUI(); 
    if(getCurrentType()==='B') triggerBotMove(); 
}

function autoRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'pvp') startGame('PVP', 1, 'P', 'P');
    else if (mode === 'pvb' || mode === 'pvr') showPVBSideSelect();
    else if (mode === 'pir') startGame('PIR', 1, 'B', 'B');
    else showModeSelect();
}

// 輔助與事件
function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX, cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX-rect.left)*(550/rect.width), y: (cY-rect.top)*(550/rect.height) }; }
function handleInput(q, r) {
    if (board[`${q},${r}`] === turn) { selectedTail = {q, r}; calculateLegalMoves(q, r); previewTarget = null; }
    else if (legalTargets.some(t => t.q === q && t.r === r)) { currentMoveInfo = legalTargets.find(t => t.q === q && t.r === r); previewTarget = {q, r}; }
    updateUI(); draw();
}
canvas.addEventListener('mousedown', (e) => { if(!isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q, r); } });
window.addEventListener('resize', updateLayout);
window.onload = autoRoute;
