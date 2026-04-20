/* --- 手術刀協議：v2.1.4 物理拆分自 v2.1.2 --- */
window.UI_VERSION = "v2.1.4";
const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;

function updateUI() {
    document.getElementById('status').innerText = (turn === 1 ? "黑棋" : "白棋") + "回合";
    document.getElementById('score').innerText = `黑 ${score[1]} : ${score[2]} 白`;
    const vt = document.getElementById('version-tag');
    if (vt) vt.innerHTML = `V2.1.4 | UI:${window.UI_VERSION} | ENG:${window.ENGINE_VERSION} | AI:${window.AI_VERSION}`;
    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom');
    t.disabled = b.disabled = true;
    t.classList.remove('active-ready', 'turn-glow'); b.classList.remove('active-ready', 'turn-glow');
    const activeBtn = (turn === 1 ? b : t);
    activeBtn.classList.add('turn-glow');
    if (previewTarget) { activeBtn.disabled = false; activeBtn.classList.add('active-ready'); }
}

function draw() {
    ctx.clearRect(0,0,550,550);
    for (let key in board) {
        let [q,r] = key.split(',').map(Number); let {x,y} = hexToPixel(q,r);
        ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.85,0,Math.PI*2); ctx.fillStyle="#ddd"; ctx.fill();
        let val = board[key];
        if (val > 0) {
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.7,0,Math.PI*2); ctx.fillStyle = val === 1 ? "#333" : "#fff"; ctx.fill();
            let isTail = selectedTail && selectedTail.q === q && selectedTail.r === r;
            ctx.strokeStyle = isTail ? "#f1c40f" : "#000"; ctx.lineWidth = isTail ? 4 : 1; ctx.stroke();
        }
        // 原文 v2.1.2：紅圈 0.5
        if (legalTargets.some(t=>t.q===q&&t.r===r)) { ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.5,0,Math.PI*2); ctx.strokeStyle="#e74c3c"; ctx.lineWidth=4; ctx.stroke(); }
        // 原文 v2.1.2：藍光 15
        if (previewTarget && previewTarget.q===q&&previewTarget.r===r) {
            ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#00d2ff";
            ctx.beginPath(); ctx.arc(x,y,HEX_SIZE*0.75,0,Math.PI*2); ctx.strokeStyle="#2ecc71"; ctx.lineWidth=5; ctx.stroke();
            ctx.restore();
        }
    }
}

function updateLayout() {
    const wrapper = document.getElementById('app-viewport'); const w = window.innerWidth, h = window.innerHeight;
    if (w > h && isGameStarted) {
        wrapper.style.transform = `translate(0, 0) rotate(90deg)`;
        wrapper.style.width = `${h}px`; wrapper.style.height = `${w}px`;
        wrapper.style.left = `${(w - h) / 2}px`; wrapper.style.top = `${(h - w) / 2}px`;
    } else {
        // 原文 v2.1.2 寫法：不設定 left/top，交由 CSS Flexbox
        wrapper.style.transform = `none`;
        wrapper.style.width = `100vw`;
        wrapper.style.height = `100vh`;
        wrapper.style.left = ``;
        wrapper.style.top = ``;
    }
}

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r); if (Math.abs(rq-q) > Math.abs(rr-r) && Math.abs(rq-q) > Math.abs(rs-(-q-r))) rq = -rr-rs; else if (Math.abs(rr-r) > Math.abs(rs-(-q-r))) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX; const cY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = cX - rect.left, y = cY - rect.top;
    if (window.innerWidth > window.innerHeight && isGameStarted) {
        let oX = x; x = y; y = rect.width - oX;
        return { x: x * (550 / rect.height), y: y * (550 / rect.width) };
    }
    return { x: x * (550 / rect.width), y: y * (550 / rect.height) };
}

canvas.addEventListener('mousedown', (e) => { if(!window.isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q,r); } });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(!window.isBotThinking) { const {x,y} = getMousePos(e); const {q,r} = pixelToHex(x,y); handleInput(q,r); } });
window.addEventListener('resize', updateLayout);

function handleInput(q, r) {
    if (board[`${q},${r}`] === turn) { selectedTail = {q, r}; calculateLegalMoves(q, r); previewTarget = null; }
    else if (legalTargets.some(t => t.q === q && t.r === r)) { currentMoveInfo = legalTargets.find(t => t.q === q && t.r === r); previewTarget = {q, r}; }
    updateUI(); draw();
}

function startGame(mode, side) {
    window.isGameStarted = true;
    document.getElementById('setup-overlay').style.display = 'none';
    initBoard();
    updateLayout();
}

function showModeSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div style="font-size:1.5rem; margin-bottom:30px; color:#fff; font-weight:bold;">Abalone v2.1.4</div>
        <button class="flow-btn" onclick="startGame('PVP')">單人對抗</button>
        <button class="flow-btn" onclick="showSideSelect()">電腦對抗</button>
    `;
}

function showSideSelect() {
    document.getElementById('overlay-content').innerHTML = `
        <div style="font-size:1.5rem; margin-bottom:30px; color:#fff; font-weight:bold;">選擇您的棋色</div>
        <button class="flow-btn" onclick="startGame('PVB', 1)">玩家先行 (黑)</button>
        <button class="flow-btn" onclick="startGame('PVB', 2)">玩家後行 (白)</button>
        <button class="flow-btn" style="background:#7f8c8d" onclick="showModeSelect()">返回</button>
    `;
}

// 原文 v2.1.2：Reset/Surrender 監聽掛載
const resetBtn = document.getElementById('resetBtn');
const circle = document.getElementById('progressCircle');
let timer, progress = 0;
const start = (e) => {
    if(e.cancelable) e.preventDefault();
    timer = setInterval(() => {
        progress += 5;
        circle.style.strokeDashoffset = 126 - (126 * progress / 100);
        if (progress >= 100) { clearInterval(timer); location.reload(); }
    }, 50);
};
const end = () => { clearInterval(timer); progress = 0; circle.style.strokeDashoffset = 126; };
resetBtn.onmousedown = resetBtn.ontouchstart = start;
resetBtn.onmouseup = resetBtn.onmouseleave = resetBtn.ontouchend = end;

[document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')].forEach(btn => {
    btn.onclick = () => {
        btn.style.transform = "scale(12) rotate(20deg)"; btn.style.opacity = "0";
        setTimeout(() => {
            alert(turn === 1 ? "黑棋認輸，白棋獲勝！" : "白棋認輸，黑棋獲勝！");
            location.reload();
        }, 450);
    };
});

// 啟動點還原
showModeSelect();
updateLayout();
