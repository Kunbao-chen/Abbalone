// File: ui.js
// Version: v2.1.3 (Surgical Recovery)
// Protocol: Scalpel_v2
// Status: Restore effects & module version manifest

const canvas = document.getElementById('gameBoard'); const ctx = canvas.getContext('2d');
const HEX_SIZE = 32; const OFFSET = { x: 275, y: 275 };
let selectedTail = null; let legalTargets = []; let previewTarget = null; let currentMoveInfo = null;
let isBotThinking = false;

// 1. 介面更新與特效控制
function updateUI() { 
    const statusText = (turn === 1 ? "黑棋" : "白棋") + "回合" + (getCurrentType()==='B'?" (Robot)":" (Player)");
    document.getElementById('status').innerText = statusText; 
    document.getElementById('score').innerText = `黑 ${score[1]} : ${score[2]} 白`; 
    
    const t = document.getElementById('okBtnTop'), b = document.getElementById('okBtnBottom'); 
    t.disabled = b.disabled = true;
    t.classList.remove('active-ready', 'turn-glow'); 
    b.classList.remove('active-ready', 'turn-glow');
    
    const activeBtn = (turn === 1 ? b : t); 
    if (previewTarget) { 
        activeBtn.disabled = false; 
        activeBtn.classList.add('active-ready', 'turn-glow'); 
    } 
}

// 2. 轉向與佈局控制
function updateLayout() { 
    const wrapper = document.getElementById('app-viewport'); 
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

// 3. Reset 鍵長按進度環邏輯
function setupResetLogic() {
    const btn = document.getElementById('resetBtn');
    const circle = document.getElementById('progressCircle');
    let timer, progress = 0;
    const trigger = (e) => {
        if (e.cancelable) e.preventDefault();
        timer = setInterval(() => {
            progress += 5;
            if (circle) circle.style.strokeDashoffset = 126 - (126 * progress / 100);
            if (progress >= 100) { clearInterval(timer); location.reload(); }
        }, 50);
    };
    const cancel = () => {
        clearInterval(timer);
        progress = 0;
        if (circle) circle.style.strokeDashoffset = 126;
    };
    btn.addEventListener('mousedown', trigger); btn.addEventListener('touchstart', trigger);
    btn.addEventListener('mouseup', cancel); btn.addEventListener('mouseleave', cancel); btn.addEventListener('touchend', cancel);
}

// 4. 認輸鍵特效與功能
function setupSurrenderLogic() {
    const btns = [document.getElementById('surBtnTop'), document.getElementById('surBtnBottom')];
    btns.forEach(btn => {
        if (!btn) return;
        btn.onclick = () => {
            btn.style.transform = "scale(5)";
            btn.style.opacity = "0";
            setTimeout(() => {
                alert(turn === 1 ? "黑棋認輸，白棋獲勝！" : "白棋認輸，黑棋獲勝！");
                location.reload();
            }, 300);
        };
    });
}

// 5. 繪圖核心與輸入處理
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

// 6. 遊戲流程與版本清單呈現
function startGame(mode, side, bType, wType) { 
    BLACK_TYPE=bType; WHITE_TYPE=wType; isGameStarted = true; 
    document.getElementById('setup-overlay').style.display='none'; 
    updateLayout(); initBoard(); setupResetLogic(); setupSurrenderLogic();
    
    // 版本清單併同呈現
    const versionTag = document.getElementById('version-tag');
    if (versionTag) {
        versionTag.innerHTML = `
            <div><b>Frame:</b> v2.1.3</div>
            <div><b>Modules:</b> HTML:v2.1.3 | CSS:v2.1.2 | ENG:v2.1.2 | UI:v2.1.3 | AI:v2.1.3</div>
        `;
        versionTag.style.fontSize = "10px";
        versionTag.style.lineHeight = "1.2";
        versionTag.style.textAlign = "right";
    }
    
    if(getCurrentType()==='B') triggerBotMove(); 
}

function exitGame() { location.reload(); }
function getCurrentType() { return turn===1 ? BLACK_TYPE : WHITE_TYPE; }

function autoRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'pvp') startGame('PVP', 1, 'P', 'P');
    else if (mode === 'pvr' || mode === 'pvb') showPVBSideSelect();
    else showModeSelect();
}

function showModeSelect() { document.getElementById('overlay-content').innerHTML = `<div class=\"setup-title\">智推棋 Abalone</div><button class=\"flow-btn\" onclick=\"startGame('PVP', 1, 'P', 'P')\">雙人對抗 (PVP)</button><button class=\"flow-btn\" onclick=\"showPVBSideSelect()\">電腦對抗 (PVB)</button>`; }
function showPVBSideSelect() { document.getElementById('overlay-content').innerHTML = `<div class=\"setup-title\">選擇您的順序</div><button class=\"flow-btn\" onclick=\"startGame('PVB', 1, 'P', 'B')\">玩家執黑先行</button><button class=\"flow-btn\" onclick=\"startGame('PVB', 1, 'B', 'P')\">玩家執白後行</button><button class=\"flow-btn btn-back\" onclick=\"showModeSelect()\">Back</button>`; }

window.onload = autoRoute;
window.addEventListener('resize', updateLayout);
