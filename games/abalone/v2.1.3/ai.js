/** File: ai.js | Version: v2.1.3 */
window.AI_VERSION = "v2.1.3";
const SOUL_KEY = "Gamy_Abalone_Soul_v2";
let aiSoul = { totalLearned: 1 }; let net; let isBotThinking = false;

try {
    net = new brain.NeuralNetwork({ hiddenLayers: [12, 8] });
    const localData = JSON.parse(localStorage.getItem(SOUL_KEY));
    if (localData) { aiSoul = localData; if (aiSoul.networkData) net.fromJSON(aiSoul.networkData); }
} catch (e) { net = { run: () => [Math.random()] }; }

function triggerBotMove() {
    if (isBotThinking || !window.isGameStarted) return;
    isBotThinking = true;
    setTimeout(() => {
        let moves = [];
        for (let key in window.board) {
            if (window.board[key] === window.turn) {
                let [q, r] = key.split(',').map(Number);
                calculateLegalMoves(q, r);
                legalTargets.forEach(t => moves.push({ ...t, tailQ: q, tailR: r }));
            }
        }
        if (moves.length === 0) { isBotThinking = false; return; }
        moves.forEach(m => {
            const res = net.run(Object.values(window.board).map(v => v/2))[0] || Math.random();
            m.finalScore = (window.turn === 1) ? (1 - res) : res;
        });
        moves.sort((a,b) => b.finalScore - a.finalScore);
        const best = moves[0];
        handleInput(best.tailQ, best.tailR);
        setTimeout(() => {
            handleInput(best.q, best.r);
            setTimeout(() => { executeMove(); isBotThinking = false; }, 400);
        }, 500);
    }, 600);
}
