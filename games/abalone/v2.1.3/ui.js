// Abalone UI v2.1.4
const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
const contentBox = document.getElementById('overlay-content');

function updateUI() { 
    document.getElementById('status').innerText = (window.turn === 1 ? "黑棋回合" : "白棋回合") + (getCurrentType()==='B'?" (Robot)":" (Player)");
    document.getElementById('score').innerText = `黑 ${window.score[1]} : ${window.score[2]} 白`; 
    document.getElementById('version-tag').innerText = `Abalone v2.1.4 | 功力: ${window.aiSoul.totalLearned}`; 
    updateOKVisuals(); 
}

function updateOKVisuals() { 
    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = true; 
    t.classList.remove('turn-glow', 'active-ready'); b.classList.remove('turn-glow', 'active-ready'); 
    const activeBtn = (window.turn === 1 ? b : t); 
    activeBtn.classList.add('turn-glow'); 
    if (window.previewTarget) { activeBtn.disabled = false; activeBtn.classList.add('active-ready'); } 
}

function draw() {
    ctx.clearRect(0, 0, 550, 550); const movingAllies = window.currentMoveInfo ? window.currentMoveInfo.allies : [];
    for (let key in window.board) {
        let [q, r] = key.split(',').map(Number); let {x, y} = hexToPixel(q, r);
        ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.85, 0, Math.PI*2); ctx.fillStyle = "#ddd"; ctx.fill();
        let val = window.board[key];
        if (val > 0) {
            if (movingAllies.some(p => p.q === q && p.r === r)) { 
                ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#00d2ff"; 
                ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); 
                ctx.strokeStyle = "rgba(0, 210, 255, 0.9)"; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); 
            }
            ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI*2); ctx.fillStyle = val === 1 ? "#333" : "#fff"; ctx.fill();
            let isTail = window.selectedTail && window.selectedTail.q === q && window.selectedTail.r === r; 
            ctx.strokeStyle = isTail ? "#f1c40f" : "#000"; ctx.lineWidth = isTail ? 4 : 1; ctx.stroke();
        }
        if (window.legalTargets.some(t => t.q === q && t.r === r)) { ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.5, 0, Math.PI*2); ctx.strokeStyle = "#e74c3c"; ctx.lineWidth = 4; ctx.stroke(); }
        if (window.previewTarget && window.previewTarget.q === q && window.previewTarget.r === r) { ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.75, 0, Math.PI*2); ctx.strokeStyle = "#2ecc71"; ctx.lineWidth = 5; ctx.stroke(); }
    }
}

function handleInput(e) { 
    if (window.isBotThinking) return; 
    const {x, y} = getMousePos(e); let {q, r} = pixelToHex(x, y); 
    if (window.board[`${q},${r}`] === undefined) return; 
    if (window.board[`${q},${r}`] === window.turn) { 
        window.previewTarget = null; window.currentMoveInfo = null; window.selectedTail = {q, r}; calculateLegalMoves(q, r); 
    } else if (window.legalTargets.some(t => t.q === q && t.r === r)) { 
        window.currentMoveInfo = window.legalTargets.find(t => t.q === q && t.r === r); window.previewTarget = {q, r}; 
    } 
    updateOKVisuals(); draw(); 
}

function showModeSelect() {
    contentBox.innerHTML = `<div class="setup-title">智推棋 G-Tree Abalone</div>
        <button class="flow-btn" onclick="startGame('PVP', 1, 'P', 'P')">雙人對抗 (PVP)</button>
        <button class="flow-btn" onclick="showPVBSideSelect()">電腦對抗 (PVB)</button>
        <div class="sync-center">
            <button class="sync-btn-small" onclick="syncData()">🔄 導出靈魂</button>
            <button class="sync-btn-small" onclick="document.getElementById('soul-loader').click()">📥 讀取靈魂</button>
            <input type="file" id="soul-loader" style="display:none" onchange="importSoul(event)" accept=".json">
        </div>`;
}

function showPVBSideSelect() { 
    contentBox.innerHTML = `<div class="setup-title">選擇您的順序</div>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'P', 'B')">玩家執黑先行</button>
        <button class="flow-btn" onclick="startGame('PVB', 1, 'B', 'P')">玩家執白後行</button>
        <button class="flow-btn btn-back" onclick="showModeSelect()">Back</button>`; 
}

function startGame(mode, side, bType, wType) { 
    window.BLACK_TYPE=bType; window.WHITE_TYPE=wType; window.isGameStarted = true; 
    document.getElementById('setup-overlay').style.display='none'; 
    updateLayout(); initBoard(); 
    if(getCurrentType()==='B') triggerBotMove(); 
}

function autoRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'pvp') startGame('PVP', 1, 'P', 'P');
    else if (mode === 'pvr') showPVBSideSelect();
    else showModeSelect();
}

function hexToPixel(q, r) { return { x: HEX_SIZE * Math.sqrt(3) * (q + r/2) + OFFSET.x, y: HEX_SIZE * (3/2) * r + OFFSET.y }; }
function pixelToHex(x, y) { x -= OFFSET.x; y -= OFFSET.y; let q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE, r = (2/3 * y) / HEX_SIZE; let s = -q-r, rq = Math.round(q), rr = Math.round(r), rs = Math.round(s); let dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s); if (dq > dr && dq > ds) rq = -rr-rs; else if (dr > ds) rr = -rq-rs; return {q: rq, r: rr}; }
function getMousePos(e) { 
    const rect = canvas.getBoundingClientRect(); const cX = e.touches ? e.touches[0].clientX : e.clientX; const cY = e.touches ? e.touches[0].clientY : e.clientY; 
    let x = cX - rect.left, y = cY - rect.top; 
    if (window.innerWidth > window.innerHeight && window.isGameStarted) { 
        let oX = x; x = y; y = rect.width - oX; 
        return { x: x * (550 / rect.height), y: y * (550 / rect.width) };
    } 
    return { x: x * (550 / rect.width), y: y * (550 / rect.height) }; 
}

function updateLayout() { 
    const wrapper = document.getElementById('app-viewport'); const w = window.innerWidth, h = window.innerHeight; 
    if (w > h && window.isGameStarted) { wrapper.style.transform = `translate(0, 0) rotate(90deg)`; wrapper.style.width = `${h}px`; wrapper.style.height = `${w}px`; wrapper.style.left = `${(w - h) / 2}px`; wrapper.style.top = `${(h - w) / 2}px`; } 
    else { wrapper.style.transform = `none`; wrapper.style.width = `100%`; wrapper.style.height = `100%`; wrapper.style.left = `0`; wrapper.style.top = `0`; } 
}

function exitGame() { if(confirm("離開？")) window.location.href = "../../index.html"; }

window.addEventListener('resize', updateLayout); 
canvas.addEventListener('mousedown', handleInput); 
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(e); });

updateLayout(); 
autoRoute();
