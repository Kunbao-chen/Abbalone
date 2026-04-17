const SOUL_KEY = "Gamy_Abalone_Soul_v2";
let aiSoul = { totalLearned: 1 }; 
let net;
let isBotThinking = false;

try {
    net = new brain.NeuralNetwork({ hiddenLayers: [12, 8] });
    const localData = JSON.parse(localStorage.getItem(SOUL_KEY));
    if (localData) { aiSoul = localData; if (aiSoul.networkData) net.fromJSON(aiSoul.networkData); }
} catch (e) { net = { run: () => [Math.random()] }; }

function triggerBotMove() {
    if (isBotThinking || !isGameStarted) return;
    isBotThinking = true;
    
    setTimeout(() => {
        let moves = [];
        for (let key in board) {
            if (board[key] === turn) {
                let [q, r] = key.split(',').map(Number);
                calculateLegalMoves(q, r);
                legalTargets.forEach(t => moves.push({ ...t, tailQ: q, tailR: r }));
            }
        }
        if (moves.length === 0) { isBotThinking = false; return; }
        
        moves.forEach(m => {
            const res = net.run(Object.values(board).map(v => v/2))[0] || Math.random();
            m.finalScore = (turn === 1) ? (1 - res) : res;
        });
        moves.sort((a,b) => b.finalScore - a.finalScore);
        const best = moves[0];

        // --- 擬人化操作流啟動 ---
        
        // 1. 選子階段 (呼叫 UI 接口觸發黃圈)
        handleInput(best.tailQ, best.tailR); 
        
        setTimeout(() => {
            // 2. 選位階段 (呼叫 UI 接口從紅圈中擇一觸發綠圈)
            handleInput(best.q, best.r); 
            
            setTimeout(() => {
                // 3. 確認執行 (觸發 OK)
                executeMove(); 
                isBotThinking = false;
            }, 800); // 確認延遲
        }, 700); // 思考延遲
    }, 1000); // 首步思考時間
}