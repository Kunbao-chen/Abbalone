/**
 * File: ui.js | Version: v2.1.3
 * 穩定性：加入安全變數檢查，防止黑屏
 */
const UI_VERSION = "v2.1.3";

const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;

// 1. 介面更新：安全聚合版號，回歸右下角
function updateUI() { 
    const typeStr = (typeof getCurrentType === 'function') ? (getCurrentType() === 'B' ? " (Robot)" : " (Player)") : "";
    const statusEl = document.getElementById('status');
    const scoreEl = document.getElementById('score');
    if(statusEl) statusEl.innerText = (turn === 1 ? "黑棋" : "白棋") + "回合" + typeStr; 
    if(scoreEl) scoreEl.innerText = `黑 ${score[1]} : ${score[2]} 白`; 
    
    // 安全取得其他模組版號，避免 ReferenceError 導致黑屏
    const engV = window.ENGINE_VERSION || "v2.1.2-Legacy";
    const aiV = window.AI_VERSION || "v2.1.2-Legacy";

    const vt = document.getElementById('version-tag');
    if (vt) {
        vt.style.cssText = "position:fixed; bottom:10px; right:10px; left:auto; text-align:right; font-size:10px; color:rgba(255,255,255,0.4); pointer-events:none; line-height:1.4; z-index:1000; font-family:monospace;";
        vt.innerHTML = `Frame: v2.1.3-Folder<br>ENG: ${engV} | UI: ${UI_VERSION} | AI: ${aiV}`;
    }

    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    if(t && b) {
        t.disabled = b.disabled = true;
        t.classList.remove('active-ready', 'turn-glow'); b.classList.remove('active-ready', 'turn-glow');
        const activeBtn = (turn === 1 ? b : t); 
        activeBtn.classList.add('turn-glow'); 
        if (previewTarget) { activeBtn.disabled = false; activeBtn.classList.add('active-ready'); } 
    }
}

// 2. 視覺核心：恢復白棋黑邊、統一紅圈、棋子發光
function draw() { 
    if (!ctx) return;
    ctx.clearRect(0,0,550,550); 
    const movingAllies = currentMoveInfo ? currentMoveInfo.allies : [];
    for (let key in board) { 
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r); 
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill(); 
        let v = board[key]; 
        if(v > 0){
            // 棋子移動提示發光 (v2.1.2 特色)
            if (movingAllies.some(p => p.q === q && p.r === r)) {
                ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#00d2ff";
                ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2);
                ctx.strokeStyle = "rgba(0, 210, 255, 0.9)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            }
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle = v === 1 ? "#333" : "#fff"; ctx.fill(); 
            // 關鍵修正：所有棋子帶黑邊，白子清晰可見
            let isSelected = (selectedTail && selectedTail.q === q && selectedTail.r === r);
            ctx.strokeStyle = isSelected ? "#f1c40f" : "#222"; 
            ctx.lineWidth = isSelected ? 4 : 1.5; ctx.stroke();
        } 
        // 修正紅圈樣式
        if(legalTargets.some(t=>t.q===q&&t.r===r)){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.4,0,Math.PI*2); 
            ctx.strokeStyle="#e74c3c"; ctx.lineWidth = 4; ctx.stroke();
        } 
        // 修正預選綠圈樣式
        if(previewTarget && previewTarget.q===q && previewTarget.r===r){
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); 
            ctx.strokeStyle="#2ecc71"; ctx.lineWidth=5; ctx.stroke();
        } 
    } 
}

// 3. 認輸爆炸與 Reset 長按 (恢復 v2.1.2 動畫感)
function setupResetLogic() {
    const btn = document.getElementById('resetBtn');
    const circle = document.getElementById('progressCircle');
    if(!btn) return;
    let timer, progress = 0;
    const start = (e) => {
        if (e.cancelable) e.preventDefault();
        timer = setInterval(() => {
            progress += 5;
            if (circle) circle.style.strokeDashoffset = 126 - (126 * progress / 100);
            if (progress >= 100) { clearInterval(timer); location.reload(); }
        }, 50);
    };
    const end = () => { clearInterval(timer); progress = 0; if (circle) circle.style.strokeDashoffset = 126; };
    btn.onmousedown = btn.ontouchstart = start;
    btn.onmouseup = btn.onmouseleave = btn.ontouchend = end;
}

function setupSurrenderLogic() {
    [document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')].forEach(btn => {
        if(!btn) return;
        btn.onclick = () => {
            btn.style.transition = "transform 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 0.4s";
            btn.style.transform = "scale(12) rotate(20deg)"; // 爆炸感
            btn.style.opacity = "0";
            setTimeout(() => {
                alert(turn === 1 ? "黑棋認輸，白棋獲勝！" : "白棋認輸，黑棋獲勝！");
                location.reload();
            }, 450);
        };
    });
}

// 4. 導航與模式控制 (修正共用邏輯)
function showModeSelect() {
    const content = document.getElementById('overlay-content');
    if(!content) return;
    content.innerHTML = `
        <div class="setup-title">智推棋 Abalone</div>
        <button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button>
        <button class="flow-btn" onclick="showPVBSideSelect()">電腦對抗 (PVB)</button>
        <button class="flow-btn" style="background:#8e44ad" onclick="startGame('PIR', 1, 'B', 'B')">神仙打架 (PIR)</button>
        <button class="flow-btn btn-back" onclick="exitGame()">退出遊戲</button>`;
}

function showPVBSideSelect() {
    const content = document.getElementById('overlay-content');
    if(!content) return;
    content.innerHTML = `
        <div class="setup-title">選擇您的順序</div>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家執黑先行</button>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家執白後行</button>
        <button class="flow-btn btn-back" onclick="showModeSelect()">Back</button>`; // 修正：回到模式選擇頁面
}

function exitGame() { 
    if (window.location.search.includes('index.html') || window.location.search.includes('mode=')) {
        window.location.href = "../../index.html"; 
    } else {
        location.reload(); 
    }
}

function startGame(mode, side, bType, wType) { 
    BLACK_TYPE=bType; WHITE_TYPE=wType; isGameStarted = true; 
    const overlay = document.getElementById('setup-overlay');
    if(overlay) overlay.style.display='none'; 
    updateLayout(); initBoard(); setupResetLogic(); setupSurrenderLogic();
    updateUI(); 
    if(typeof triggerBotMove === 'function' && getCurrentType()==='B') triggerBotMove(); 
}

function autoRoute() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'pvp') startGame('PVP', 1, 'P', 'P');
    else if (mode === 'pvb' || mode === 'pvr') showPVBSideSelect();
    else if (mode === 'pir') startGame('PIR', 1, 'B', 'B');
    else showModeSelect();
}

// 5. 轉向與輸入
function updateLayout() { 
    const wrapper = document.getElementById('app-viewport'); 
    if(!wrapper) return;
    const w = window.innerWidth, h = window.innerHeight; 
    if (w > h && isGameStarted) { 
        wrapper.style.transform = `translate(0, 0) rotate(90deg)`; 
        wrapper.style.width = `${h}px`; wrapper.style.height = `${w}px`; 
        wrapper.style.left = `${(w - h) / 2}px`; wrapper.style.top = `${(h - w) / 2}px`; 
    } else { 
        wrapper.style.transform = `none`; 
        wrapper.style.width = `100%`; wrapper.style.height = `100%`; 
        wrapper.style.left = `0`; wrapper.style.top = `0`; 
    } 
}

function handleInput(q, r) {
    if (board[`${q},${r}`] === turn) { selectedTail = {q, r}; calculateLegalMoves(q, r); previewTarget = null; }
    else if (legalTargets.some(t => t.q === q && t.r === r)) { currentMoveInfo = legalTargets.find(t => t.q === q && t.r === r); previewTarget = {q, r}; }
    updateUI(); draw();
}

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX, cY = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cX-rect.left)*(550/rect.width), y: (cY-rect.top)*(550/rect.height) }; }

canvas.addEventListener('mousedown', (e) => { if(typeof isBotThinking !== 'undefined' && !isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q, r); } });
window.addEventListener('resize', updateLayout);
window.onload = autoRoute;
