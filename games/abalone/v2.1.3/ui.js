window.UI_VERSION = "v2.1.4";
const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
window.selectedTail = null; window.legalTargets = []; window.previewTarget = null; window.currentMoveInfo = null;

function updateUI() { 
    document.getElementById('status').innerText = (window.turn === 1 ? "黑棋" : "白棋") + "回合" + (getCurrentType()==='B'?" (Robot)":" (Player)");
    document.getElementById('score').innerText = `黑 ${window.score[1]} : ${window.score[2]} 白`; 
    
    // 彙整顯示所有版本號
    const vt = document.getElementById('version-tag');
    if (vt) vt.innerHTML = `Frame: v2.1.4 | ENG: ${window.ENGINE_VERSION} | AI: ${window.AI_VERSION} | UI: ${window.UI_VERSION}<br>Soul: ${window.aiSoul.totalLearned}`;

    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = true; 
    t.classList.remove('active-ready', 'turn-glow'); b.classList.remove('active-ready', 'turn-glow');
    const activeBtn = (window.turn === 1 ? b : t); 
    activeBtn.classList.add('turn-glow'); 
    if (window.previewTarget) { activeBtn.disabled = false; activeBtn.classList.add('active-ready'); } 
}

// 修復 Reset 功能與特效
function setupResetLogic() {
    const btn = document.getElementById('resetBtn');
    const circle = document.getElementById('progressCircle');
    let timer, progress = 0;
    const start = (e) => {
        if(e.cancelable) e.preventDefault();
        timer = setInterval(() => {
            progress += 5; circle.style.strokeDashoffset = 126 - (126 * progress / 100);
            if (progress >= 100) { clearInterval(timer); location.reload(); }
        }, 50);
    };
    const end = () => { clearInterval(timer); progress = 0; circle.style.strokeDashoffset = 126; };
    btn.onmousedown = btn.ontouchstart = start;
    btn.onmouseup = btn.onmouseleave = btn.ontouchend = end;
}

// 修復 認輸功能與特效
function setupSurrenderLogic() {
    [document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')].forEach(btn => {
        btn.onclick = () => {
            btn.style.transform = "scale(12) rotate(20deg)"; btn.style.opacity = "0";
            setTimeout(() => {
                alert(window.turn === 1 ? "黑棋認輸，白棋獲勝！" : "白棋認輸，黑棋獲勝！");
                location.reload();
            }, 450);
        };
    });
}

function draw() {
    ctx.clearRect(0,0,550,550); const moving = window.currentMoveInfo ? window.currentMoveInfo.allies : [];
    for (let key in window.board) {
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r);
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill();
        let val = window.board[key];
        if (val > 0) {
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle = val === 1 ? "#333" : "#fff"; ctx.fill();
            let isTail = window.selectedTail && window.selectedTail.q === q && window.selectedTail.r === r;
            ctx.strokeStyle = isTail ? "#f1c40f" : "#000"; ctx.lineWidth = isTail ? 4 : 1; ctx.stroke();
        }
        if (window.legalTargets.some(t=>t.q===q&&t.r===r)) { ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.4,0,Math.PI*2); ctx.strokeStyle="#e74c3c"; ctx.lineWidth=4; ctx.stroke(); }
        if (window.previewTarget && window.previewTarget.q===q&&window.previewTarget.r===r) { ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); ctx.strokeStyle="#2ecc71"; ctx.lineWidth=5; ctx.stroke(); }
    }
}

function updateLayout() { 
    const wrapper = document.getElementById('app-viewport'); const w = window.innerWidth, h = window.innerHeight; 
    if (w > h && window.isGameStarted) { 
        wrapper.style.transform = `translate(0, 0) rotate(90deg)`; 
        wrapper.style.width = `${h}px`; wrapper.style.height = `${w}px`; 
        wrapper.style.left = `${(w - h) / 2}px`; wrapper.style.top = `${(h - w) / 2}px`; 
    } else { 
        // 修正：清除位移屬性，回歸 CSS Flexbox 居中
        wrapper.style.transform = `none`; wrapper.style.width = `100vw`; wrapper.style.height = `100vh`; 
        wrapper.style.left = ``; wrapper.style.top = ``; 
    } 
}

function startGame(mode, side, bType, wType) { 
    window.BLACK_TYPE=bType; window.WHITE_TYPE=wType; window.isGameStarted = true; 
    document.getElementById('setup-overlay').style.display='none'; 
    initBoard(); setupResetLogic(); setupSurrenderLogic(); updateLayout();
}

function showModeSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div class="setup-title">智推棋 Abalone v2.1.4</div>
        <button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button>
        <button class="flow-btn" onclick="showSideSelect()">電腦對抗 (PVB)</button>
    `;
}

function showSideSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div class="setup-title">選擇您的順序</div>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家先行 (黑)</button>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家後行 (白)</button>
        <button class="flow-btn btn-back" onclick="showModeSelect()">返回</button>
    `;
}

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { 
    const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX; const cY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = cX - rect.left, y = cY - rect.top;
    if (window.innerWidth > window.innerHeight && window.isGameStarted) {
        let oX = x; x = y; y = rect.width - oX;
        return { x: x * (550 / rect.height), y: y * (550 / rect.width) };
    }
    return { x: x * (550 / rect.width), y: y * (550 / rect.height) };
}

canvas.addEventListener('mousedown', (e) => { if(!window.isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q,r); } });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(!window.isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q,r); } });
window.addEventListener('resize', updateLayout);

function handleInput(q, r) {
    if (window.board[`${q},${r}`] === window.turn) { window.selectedTail = {q, r}; calculateLegalMoves(q, r); window.previewTarget = null; }
    else if (window.legalTargets.some(t => t.q === q && t.r === r)) { window.currentMoveInfo = window.legalTargets.find(t => t.q === q && t.r === r); window.previewTarget = {q, r}; }
    updateUI(); draw();
}

showModeSelect();
updateLayout();
