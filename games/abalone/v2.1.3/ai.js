window.AI_VERSION = "v2.1.4";
window.SOUL_KEY = "Gamy_Abalone_Soul_v2";
window.aiSoul = { totalLearned: 1 }; 
window.net = new brain.NeuralNetwork({ hiddenLayers: [12, 8] });
window.isBotThinking = false;

// 靈魂加載
try {
    const localData = JSON.parse(localStorage.getItem(window.SOUL_KEY));
    if (localData) { window.aiSoul = localData; if (window.aiSoul.networkData) window.net.fromJSON(window.aiSoul.networkData); }
} catch (e) { console.log("AI Init failed"); }

function triggerBotMove() {
    if (window.isBotThinking || !window.isGameStarted) return;
    window.isBotThinking = true;
    setTimeout(() => {
        let moves = [];
        for (let key in window.board) {
            if (window.board[key] === window.turn) {
                let [q, r] = key.split(',').map(Number);
                calculateLegalMoves(q, r);
                window.legalTargets.forEach(t => moves.push({ ...t, tailQ: q, tailR: r }));
            }
        }
        if (moves.length === 0) { window.isBotThinking = false; return; }
        moves.forEach(m => {
            const res = window.net.run(Object.values(window.board).map(v => v/2))[0] || Math.random();
            m.finalScore = (window.turn === 1) ? (1 - res) : res;
        });
        moves.sort((a, b) => b.finalScore - a.finalScore);
        const best = moves[0];
        window.selectedTail = { q: best.tailQ, r: best.tailR }; calculateLegalMoves(best.tailQ, best.tailR); draw();
        setTimeout(() => {
            window.currentMoveInfo = best; window.previewTarget = { q: best.q, r: best.r }; draw();
            setTimeout(() => { executeMove(); window.isBotThinking = false; }, 800);
        }, 700);
    }, 1500);
}

function recordLearning() {
    const trainingData = [{ input: Object.values(window.board).map(v => v/2), output: [window.turn === 1 ? 0 : 1] }];
    window.net.train(trainingData, { iterations: 1, learningRate: 0.3 });
    window.aiSoul.networkData = window.net.toJSON();
    window.aiSoul.totalLearned++;
    localStorage.setItem(window.SOUL_KEY, JSON.stringify(window.aiSoul));
}

function concludeGame(winner) {
    recordLearning(); updateUI();
    setTimeout(() => { alert((winner === 1 ? "黑棋" : "白棋") + " 獲勝！\nAI 功力：" + window.aiSoul.totalLearned); location.reload(); }, 100);
}
