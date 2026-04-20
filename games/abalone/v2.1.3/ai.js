// Abalone AI v2.1.4
window.SOUL_KEY = "Gamy_Abalone_Soul_v2";
window.SYNC_KEY = "abalone_neural_sync"; 
window.aiSoul = { totalLearned: 1 }; 
window.net = null;
window.isBotThinking = false;

try {
    window.net = new brain.NeuralNetwork({ hiddenLayers: [12, 8] });
    const localData = JSON.parse(localStorage.getItem(window.SYNC_KEY)) || JSON.parse(localStorage.getItem(window.SOUL_KEY));
    if (localData) {
        window.aiSoul = localData;
        if (window.aiSoul.networkData && typeof window.net.fromJSON === 'function') window.net.fromJSON(window.aiSoul.networkData);
    }
} catch (e) {
    window.net = { run: () => [Math.random()], fromJSON: () => {}, toJSON: () => ({}) };
}

function triggerBotMove() {
    if (window.isBotThinking || !window.isGameStarted) return;
    window.isBotThinking = true;
    const delay = 1000 + Math.random() * 2000;
    
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
            const res = window.net.run(Object.values(window.board).map(v => v / 2))[0] || Math.random();
            m.finalScore = (window.turn === 1) ? (1 - res) : res;
        });
        moves.sort((a, b) => b.finalScore - a.finalScore);
        const best = moves[0];

        window.selectedTail = { q: best.tailQ, r: best.tailR };
        calculateLegalMoves(best.tailQ, best.tailR);
        draw();

        setTimeout(() => {
            window.currentMoveInfo = best;
            window.previewTarget = { q: best.q, r: best.r };
            draw();
            setTimeout(() => { executeMove(); window.isBotThinking = false; }, 800);
        }, 700);
    }, delay);
}

function recordLearning() {
    const trainingData = [{ input: Object.values(window.board).map(v => v / 2), output: [window.turn === 1 ? 0 : 1] }];
    window.net.train(trainingData, { iterations: 1, learningRate: 0.3 });
    window.aiSoul.networkData = window.net.toJSON();
    window.aiSoul.totalLearned++;
    localStorage.setItem(window.SOUL_KEY, JSON.stringify(window.aiSoul));
    localStorage.setItem(window.SYNC_KEY, JSON.stringify(window.aiSoul)); 
}

function concludeGame(winner) {
    recordLearning(); 
    updateUI();       
    setTimeout(() => {
        const winnerName = (winner === 1 ? "黑棋" : "白棋");
        alert(`${winnerName} 勝利！\n功力提升至：${window.aiSoul.totalLearned}`);
        location.reload();
    }, 100);
}

function syncData() {
    try {
        localStorage.setItem(window.SYNC_KEY, JSON.stringify(window.aiSoul));
        const dataStr = JSON.stringify(window.aiSoul, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Abalone_NeuralBackup.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) { alert("同步失敗: " + e); }
}

function importSoul(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.totalLearned) {
                window.aiSoul = imported;
                localStorage.setItem(window.SYNC_KEY, JSON.stringify(window.aiSoul));
                location.reload();
            }
        } catch (err) { alert("格式錯誤"); }
    };
    reader.readAsText(file);
}
