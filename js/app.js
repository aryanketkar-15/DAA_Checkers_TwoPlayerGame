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

    // Win Banner DOM References (MISSING FEATURE FIX)
    const winBanner = document.getElementById('winBanner');
    const winBannerCard = document.getElementById('winBannerCard');
    const winBannerIcon = document.getElementById('winBannerIcon');
    const winBannerTitle = document.getElementById('winBannerTitle');
    const winBannerReason = document.getElementById('winBannerReason');
    const btnPlayAgain = document.getElementById('btnPlayAgain');

    // Track whether we've already triggered the win banner for the current game-over
    // to prevent updateUI() from re-showing it on every animation frame tick.
    let winBannerShown = false;

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
        hideWinBanner();
        updateUI();
    });

    // Play Again (Win Banner) — resets game and hides banner
    btnPlayAgain.addEventListener('click', () => {
        game.resetGame();
        renderer.selectedSquare = null;
        renderer.validMovesForSelected = [];
        renderer.lastMove = null;
        hideWinBanner();
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

    /**
     * Returns the display label for a given player, driven by the current combat mode.
     * CvC → "AGENT 1" / "AGENT 2"
     * PvP → "PLAYER 1" / "PLAYER 2"
     * PvC → "PLAYER 1" / "AI AGENT"
     *
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @param {boolean} [short=false] - true returns short form ("A1", "P1", "AI") for move log
     * @returns {string}
     */
    function getPlayerLabel(player, short = false) {
        const isCvC = game.mode === MODE_CVC;
        const isPvP = game.mode === MODE_PVP;

        if (player === PLAYER_1) {
            if (short) return isCvC ? 'A1' : 'P1';
            return isCvC ? 'AGENT 1 (Neon Cyan)' : 'PLAYER 1 (Neon Cyan)';
        } else {
            if (short) return isCvC ? 'A2' : (isPvP ? 'P2' : 'AI');
            if (isCvC) return 'AGENT 2 (Neon Magenta)';
            if (isPvP) return 'PLAYER 2 (Neon Magenta)';
            return 'AI AGENT (Neon Magenta)';
        }
    }

    function updateUI() {
        // Visual Board Flip
        if (game.board.isGravityInverted) {
            canvasWrapper.classList.add('gravity-flipped');
        } else {
            canvasWrapper.classList.remove('gravity-flipped');
        }

        // Turn indicator — label driven by getPlayerLabel() so it respects combat mode
        const isP1 = game.currentTurn === PLAYER_1;
        turnNameElem.textContent = getPlayerLabel(game.currentTurn);
        turnDotElem.className = `player-dot ${isP1 ? 'cyan' : 'magenta'}`;

        // Game Status text (small status line — still updated even with banner)
        if (game.isGameOver) {
            if (game.winner === PLAYER_1) {
                gameStatusElem.textContent = `VICTORY: ${getPlayerLabel(PLAYER_1, true)} WINS!`;
            } else if (game.winner === PLAYER_2) {
                gameStatusElem.textContent = `VICTORY: ${getPlayerLabel(PLAYER_2, true)} WINS!`;
            } else {
                gameStatusElem.textContent = 'MATCH DRAWN!';
            }

            // MISSING FEATURE FIX: Show the full win banner on first detection
            if (!winBannerShown) {
                showWinBanner();
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
        const lbl1 = game.mode === MODE_CVC ? 'A1' : 'P1';
        const lbl2 = game.mode === MODE_CVC ? 'A2' : 'P2';
        polarityStatusHint.textContent = `${lbl1} Charge: ${p1Used ? 'EXHAUSTED' : 'READY'} | ${lbl2} Charge: ${p2Used ? 'EXHAUSTED' : 'READY'}`;

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

    /**
     * MISSING FEATURE FIX: Displays the neon win/loss/draw banner overlay.
     * Populates winner name, win reason, and applies the correct color theme
     * (cyan for P1 win, magenta for P2/AI win, gold for draw).
     */
    function showWinBanner() {
        winBannerShown = true;

        const { winner, winReason, mode } = game;

        // Reset theme classes
        winBannerCard.classList.remove('magenta-theme', 'gold-theme');

        if (winner === PLAYER_1) {
            // In CvC: "AGENT 1 WINS!", otherwise "PLAYER 1 WINS!"
            winBannerTitle.textContent = mode === MODE_CVC ? 'AGENT 1 WINS!' : 'PLAYER 1 WINS!';
            winBannerIcon.textContent = '🏆';
            // Card stays default cyan theme
        } else if (winner === PLAYER_2) {
            // CvC → Agent 2, PvP → Player 2, PvC → AI Agent
            const name = mode === MODE_CVC ? 'AGENT 2 WINS!' : (mode === MODE_PVP ? 'PLAYER 2 WINS!' : 'AI AGENT WINS!');
            winBannerTitle.textContent = name;
            winBannerIcon.textContent = mode === MODE_CVC ? '🤖' : (mode === MODE_PVP ? '🏆' : '🤖');
            winBannerCard.classList.add('magenta-theme');
        } else {
            // Draw
            winBannerTitle.textContent = 'MATCH DRAWN!';
            winBannerIcon.textContent = '🤝';
            winBannerCard.classList.add('gold-theme');
        }

        // Populate the reason string (set by GameManager.checkGameOver)
        winBannerReason.textContent = winReason || '';

        // Show overlay
        winBanner.classList.add('active');
    }

    /**
     * Hides the win banner and resets the shown flag so it can fire again next game.
     */
    function hideWinBanner() {
        winBannerShown = false;
        winBanner.classList.remove('active');
    }

    function renderMoveLog() {
        moveLogContainer.innerHTML = '';
        game.moveHistory.slice(-15).reverse().forEach(item => {
            const row = document.createElement('div');
            row.className = `move-log-item ${item.player === PLAYER_1 ? 'cyan' : 'magenta'}`;
            const m = item.move;
            const pName = getPlayerLabel(item.player, true);
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
