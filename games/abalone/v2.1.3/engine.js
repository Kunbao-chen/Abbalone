window.ENGINE_VERSION = "v3.0.1";

const Engine = (function() {
    let board = new Map();
    let turn = 1; 
    let scores = { 1: 0, 2: 0 };
    let selection = [], legalMoves = [], pendingMove = null;

    // ... (維持 init, handleTap, execute, calculateMoves, getState 邏輯) ...

    function init() { /* 初始化棋盤 */ }
    function handleTap(q, r) { /* 處理點擊與狀態 */ return true; }
    function execute() { /* 處理走棋 */ return true; }
    
    return { init, handleTap, execute, getState: () => ({ board, turn, scores, selection, legalMoves, pendingMove, isGameOver: scores[1]>=6||scores[2]>=6 }) };
})();
