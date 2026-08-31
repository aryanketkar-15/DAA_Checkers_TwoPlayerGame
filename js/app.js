/**
 * app.js - Main Application Controller & UI Dispatcher
 * Coordinates canvas events, DOM HUD updates, animations, and game loop.
 */

import { SoundSynth } from './audio/SoundSynth.js';
import { ParticleEngine } from './visual/ParticleEngine.js';
import { Renderer } from './visual/Renderer.js';
import { GameManager, MODE_PVP, MODE_PVC, MODE_CVC } from './core/GameManager.js';
import { PLAYER_1, PLAYER_2 } from './core/Piece.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const canvasWrapper = document.getElementById('canvasWrapper');

    // High DPI Canvas Scaling
    const CANVAS_SIZE = 600;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Subsystems
    const sound = new SoundSynth();
    const particles = new ParticleEngine(canvas);
    const renderer = new Renderer(canvas, particles);
    const game = new GameManager(sound, particles);

    // DOM UI References
    const turnNameElem = document.getElementById('turnPlayerName');
    const turnDotElem = document.getElementById('turnPlayerDot');
    const gameStatusElem = document.getElementById('gameStatusText');
    const mandatoryAlertElem = document.getElementById('mandatoryJumpAlert');
    const btnPolarityShift = document.getElementById('btnPolarityShift');
    const polarityStatusHint = document.getElementById('polarityStatusHint');

    // DP Analytics Elements
    const dpDepthVal = document.getElementById('dpDepthVal');
    const dpNodesVal = document.getElementById('dpNodesVal');
    const dpTimeVal = document.getElementById('dpTimeVal');
    const dpTableSizeVal = document.getElementById('dpTableSizeVal');
    const dpCutoffsVal = document.getElementById('dpCutoffsVal');
    const dpHitRateVal = document.getElementById('dpHitRateVal');
    const moveLogContainer = document.getElementById('moveLogContainer');

    // Controls
    const btnPvC = document.getElementById('btnModePvC');
    const btnPvP = document.getElementById('btnModePvP');
    const btnCvC = document.getElementById('btnModeCvC');
    const depthSlider = document.getElementById('depthSlider');
    const depthSliderVal = document.getElementById('depthSliderVal');
    const btnRestart = document.getElementById('btnRestart');
    const btnAudioToggle = document.getElementById('btnAudioToggle');
    const btnShowDaaModal = document.getElementById('btnShowDaaModal');
    const daaModal = document.getElementById('daaModal');
    const btnCloseModal = document.getElementById('btnCloseModal');

    // --- EVENT HANDLERS ---

    // Game Mode Selection
    btnPvC.addEventListener('click', () => {
        setModeUI(btnPvC);
        game.setMode(MODE_PVC);
        updateUI();
    });

    btnPvP.addEventListener('click', () => {
        setModeUI(btnPvP);
        game.setMode(MODE_PVP);
        updateUI();
    });

    btnCvC.addEventListener('click', () => {
        setModeUI(btnCvC);
        game.setMode(MODE_CVC);
        updateUI();
    });

    function setModeUI(activeBtn) {
        [btnPvC, btnPvP, btnCvC].forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // Depth Slider
    depthSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        depthSliderVal.textContent = val;
        game.setAIDifficulty(val);
    });

    // Polarity Shift Button
    btnPolarityShift.addEventListener('click', () => {
        if (game.triggerGravityShift(game.currentTurn)) {
            updateUI();
        }
    });

    // Restart
    btnRestart.addEventListener('click', () => {
        game.resetGame();
        renderer.selectedSquare = null;
        renderer.validMovesForSelected = [];
        renderer.lastMove = null;
        updateUI();
    });

    // Audio Toggle
    btnAudioToggle.addEventListener('click', () => {
        const enabled = sound.toggleMute();
        btnAudioToggle.textContent = enabled ? '🔊 Audio ON' : '🔇 Audio OFF';
    });

    // DAA Explanation Modal
    btnShowDaaModal.addEventListener('click', () => {
        daaModal.classList.add('active');
    });
    btnCloseModal.addEventListener('click', () => {
        daaModal.classList.remove('active');
    });
    daaModal.addEventListener('click', (e) => {
        if (e.target === daaModal) daaModal.classList.remove('active');
    });

    // --- CANVAS USER INTERACTION ---
    canvas.addEventListener('click', (e) => {
        if (game.isGameOver || game.isCurrentTurnAI()) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clickX = (e.clientX - rect.left) * scaleX;
        let clickY = (e.clientY - rect.top) * scaleY;

        // If gravity is visually flipped, invert click coords
        if (game.board.isGravityInverted) {
            clickX = canvas.width - clickX;
            clickY = canvas.height - clickY;
        }

        const col = Math.floor(clickX / renderer.tileSize);
        const row = Math.floor(clickY / renderer.tileSize);

        if (row < 0 || row >= 8 || col < 0 || col >= 8) return;

        const piece = game.board.getPiece(row, col);
        const allLegalMoves = game.board.getLegalMoves(game.currentTurn);

        // 1. If clicking an existing selected destination -> Attempt Move
        if (renderer.selectedSquare) {
            const moveExecuted = game.handlePlayerMove(
                renderer.selectedSquare.row,
                renderer.selectedSquare.col,
                row,
                col
            );

            if (moveExecuted) {
                renderer.lastMove = moveExecuted;
                renderer.selectedSquare = null;
                renderer.validMovesForSelected = [];
                updateUI();
                return;
            }
        }

        // 2. Select friendly piece if it has legal moves
        if (piece && piece.player === game.currentTurn) {
            const pieceMoves = allLegalMoves.filter(m => m.fromRow === row && m.fromCol === col);
            if (pieceMoves.length > 0) {
                renderer.selectedSquare = { row, col };
                renderer.validMovesForSelected = pieceMoves;
            } else {
                renderer.selectedSquare = null;
                renderer.validMovesForSelected = [];
            }
        } else {
            renderer.selectedSquare = null;
            renderer.validMovesForSelected = [];
        }

        updateUI();
    });

    // --- UI UPDATER ---
    function updateUI() {
        // Visual Board Flip
        if (game.board.isGravityInverted) {
            canvasWrapper.classList.add('gravity-flipped');
        } else {
            canvasWrapper.classList.remove('gravity-flipped');
        }

        // Turn indicator
        const isP1 = game.currentTurn === PLAYER_1;
        turnNameElem.textContent = isP1 ? 'PLAYER 1 (Neon Cyan)' : (game.mode === MODE_PVP ? 'PLAYER 2 (Neon Magenta)' : 'AI AGENT (Neon Magenta)');
        turnDotElem.className = `player-dot ${isP1 ? 'cyan' : 'magenta'}`;

        // Game Status
        if (game.isGameOver) {
            if (game.winner === PLAYER_1) {
                gameStatusElem.textContent = 'VICTORY: PLAYER 1 WINS!';
            } else if (game.winner === PLAYER_2) {
                gameStatusElem.textContent = game.mode === MODE_PVP ? 'VICTORY: PLAYER 2 WINS!' : 'VICTORY: AI AGENT WINS!';
            } else {
                gameStatusElem.textContent = 'MATCH DRAWN!';
            }
        } else if (game.isAIThinking) {
            gameStatusElem.textContent = 'AI Computing Optimal Minimax Branch...';
        } else {
            gameStatusElem.textContent = 'Arena Active';
        }

        // Mandatory Jump Alert
        const legalMoves = game.board.getLegalMoves(game.currentTurn);
        const hasMandatoryJump = legalMoves.length > 0 && legalMoves[0].isJump();
        if (hasMandatoryJump && !game.isGameOver) {
            mandatoryAlertElem.classList.add('active');
        } else {
            mandatoryAlertElem.classList.remove('active');
        }

        // Polarity Button State
        const canShift = game.canPlayerShiftGravity(game.currentTurn);
        btnPolarityShift.disabled = !canShift;
        const p1Used = game.p1GravityUsed;
        const p2Used = game.p2GravityUsed;
        polarityStatusHint.textContent = `P1 Charge: ${p1Used ? 'EXHAUSTED' : 'READY'} | P2 Charge: ${p2Used ? 'EXHAUSTED' : 'READY'}`;

        // DP Telemetry Stats
        const aiMetrics = game.aiAgent.metrics;
        const ttMetrics = game.aiAgent.transpositionTable.getMetrics();
        dpDepthVal.textContent = aiMetrics.depthReached || game.aiAgent.depth;
        dpNodesVal.textContent = aiMetrics.nodesEvaluated.toLocaleString();
        dpTimeVal.textContent = `${aiMetrics.searchTimeMs} ms`;
        dpTableSizeVal.textContent = ttMetrics.size.toLocaleString();
        dpCutoffsVal.textContent = ttMetrics.cutoffs.toLocaleString();
        dpHitRateVal.textContent = ttMetrics.hitRate;

        // Move Log
        renderMoveLog();
    }

    function renderMoveLog() {
        moveLogContainer.innerHTML = '';
        game.moveHistory.slice(-15).reverse().forEach(item => {
            const row = document.createElement('div');
            row.className = `move-log-item ${item.player === PLAYER_1 ? 'cyan' : 'magenta'}`;
            const m = item.move;
            const pName = item.player === PLAYER_1 ? 'P1' : 'P2/AI';
            const action = m.isJump() ? `JUMP (${m.captured.length})` : 'MOVE';
            const promo = m.becameKing ? ' 👑' : '';
            row.innerHTML = `<span>[${item.timestamp}] ${pName} ${action}</span><span>(${m.fromRow},${m.fromCol})➔(${m.toRow},${m.toCol})${promo}</span>`;
            moveLogContainer.appendChild(row);
        });
    }

    // --- MAIN ANIMATION & GAME LOOP ---
    function animationLoop() {
        // Render Canvas Scene
        renderer.render(game.board, game.board.isGravityInverted);

        // Process AI turn if ready
        if (game.isCurrentTurnAI() && !game.isAIThinking && !game.isGameOver) {
            game.executeAIMove().then(() => {
                if (game.moveHistory.length > 0) {
                    renderer.lastMove = game.moveHistory[game.moveHistory.length - 1].move;
                }
                updateUI();
            });
        }

        requestAnimationFrame(animationLoop);
    }

    updateUI();
    requestAnimationFrame(animationLoop);
});
