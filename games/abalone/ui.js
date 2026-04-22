window.UI_VERSION = "v3.4.1";

document.addEventListener("DOMContentLoaded", () => {
    // --- 手術刀：初始化鎖定偵測 (v3.4.1) ---
    const app = document.getElementById('game-app');
    if (window.innerWidth > window.innerHeight) {
        app.classList.add('mode-h');
    }
    // --- 手術刀結束 ---

    const versionTag = document.getElementById('global-version-tag');
    if (versionTag) versionTag.innerText = `HTML:${window.HTML_VERSION} | ENG:${window.ENGINE_VERSION} | UI:${window.UI_VERSION}`;

    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const btnExit = document.getElementById('btn-exit');
    const btnReset = document.getElementById('btn-reset');
    const btnOkTop = document.getElementById('btn-execute-top');
    const btnOkBottom = document.getElementById('btn-execute-bottom');
    const pathCtrlsTop = document.getElementById('path-controls-top');
    const pathCtrlsBottom = document.getElementById('path-controls-bottom');
    const indTop = document.getElementById('path-indicator-top');
    const indBottom = document.getElementById('path-indicator-bottom');
    const turnEl = document.getElementById('turn-display');
    
    let CENTER = { x: 0, y: 0 }, HEX_SIZE = 0, isTracing = false;

    const resize = () => {
        const wrapper = document.getElementById('board-wrapper');
        const size = Math.min(wrapper.clientWidth, wrapper.clientHeight) - 60;
        canvas.width = size * window.devicePixelRatio;
        canvas.height = size * window.devicePixelRatio;
        canvas.style.width = `${size}px`; 
        canvas.style.height = `${size}px`;
        
        ctx.resetTransform();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        CENTER = { x: size / 2, y: size / 2 };
        HEX_SIZE = size / 16;
        render();
    };

    // ... (其餘 resizeObserver 綁定與遊戲邏輯皆與 v3.4.0 逐字相同，以維護 Checksum) ...
