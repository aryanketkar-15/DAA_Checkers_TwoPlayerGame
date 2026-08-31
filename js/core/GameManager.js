/**
 * GameManager.js - Primary Game State Manager (JavaScript Web Engine)
 * Coordinates turns, mandatory jumps, AI decision loops, Gravity Shifts,
 * move history, and audio-visual events.
 */

import { Board } from './Board.js';
import { PLAYER_1, PLAYER_2 } from './Piece.js';
import { AIAgent } from '../ai/AIAgent.js';

export const MODE_PVP = 'pvp';
export const MODE_PVC = 'pvc';
export const MODE_CVC = 'cvc';

/**
 * BUG 3 FIX: Delay (ms) between AI finishing its search and visually executing the move.
 * Minimax/Alpha-Beta/TT still runs at full speed — only the final move application is delayed.
 * Adjust this constant to change the AI "thinking" pause (600–1000ms recommended).
 */
export const AI_MOVE_DELAY_MS = 700;

export class GameManager {
    /**
     * @param {object} soundSynth
     * @param {object} particleEngine
     */
    constructor(soundSynth, particleEngine) {
        this.sound = soundSynth;
        this.particles = particleEngine;

        this.board = new Board();
        this.mode = MODE_PVC;
        this.currentTurn = PLAYER_1;
        this.aiAgent = new AIAgent(PLAYER_2, 6);

        this.p1GravityUsed = false;
        this.p2GravityUsed = false;

        this.isGameOver = false;
        this.winner = null; // null, PLAYER_1, PLAYER_2, 'draw'
        this.winReason = null; // Human-readable reason string for the win banner
        this.moveHistory = [];
        this.isAIThinking = false;
    }

    resetGame() {
        this.board.initializeBoard();
        this.currentTurn = PLAYER_1;
        this.p1GravityUsed = false;
        this.p2GravityUsed = false;
        this.isGameOver = false;
        this.winner = null;
        this.winReason = null;
        this.moveHistory = [];
        this.isAIThinking = false;
        this.aiAgent.transpositionTable.clear();
    }

    setMode(mode) {
        this.mode = mode;
        this.resetGame();
    }

    setAIDifficulty(depth) {
        this.aiAgent.setDifficulty(depth);
    }

    canPlayerShiftGravity(player) {
        if (this.isGameOver || this.isAIThinking) return false;
        if (player !== this.currentTurn) return false;
        if (player === PLAYER_1 && this.p1GravityUsed) return false;
        if (player === PLAYER_2 && this.p2GravityUsed) return false;
        return true;
    }

    triggerGravityShift(player) {
        if (!this.canPlayerShiftGravity(player)) return false;

        this.board.toggleGravity();

        if (player === PLAYER_1) this.p1GravityUsed = true;
        else this.p2GravityUsed = true;

        if (this.sound) this.sound.playGravityShift();
        if (this.particles) this.particles.createGravityWarpBurst();

        this.checkGameOver();
        return true;
    }

    /**
     * Attempts to execute a move from human player interaction
     */
    handlePlayerMove(fromRow, fromCol, toRow, toCol) {
        if (this.isGameOver || this.isAIThinking) return null;

        const legalMoves = this.board.getLegalMoves(this.currentTurn);
        const selectedMove = legalMoves.find(
            m => m.fromRow === fromRow && m.fromCol === fromCol && m.toRow === toRow && m.toCol === toCol
        );

        if (!selectedMove) return null;

        this.executeMove(selectedMove);
        return selectedMove;
    }

    /**
     * Executes a valid move on the board
     */
    executeMove(move) {
        // Trigger particle effects for captures
        if (move.isJump() && this.particles) {
            for (const cap of move.captured) {
                const tileSize = 600 / 8; // standard canvas dimension
                const capX = cap.col * tileSize + tileSize / 2;
                const capY = cap.row * tileSize + tileSize / 2;
                const capColor = cap.piece.player === PLAYER_1 ? '#00f0ff' : '#ff007f';
                this.particles.createCaptureBurst(capX, capY, capColor);
            }
        }

        // Sound triggers
        if (this.sound) {
            if (move.becameKing) {
                this.sound.playPromotion();
            } else if (move.isJump()) {
                this.sound.playCapture();
            } else {
                this.sound.playMove();
            }
        }

        this.board.applyMove(move);
        this.moveHistory.push({
            player: this.currentTurn,
            move,
            timestamp: new Date().toLocaleTimeString()
        });

        // Switch turn
        this.currentTurn = this.currentTurn === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        this.checkGameOver();
    }

    /**
     * Checks for terminal game states after every turn switch.
     * BUG 1 FIX: Runs after every move (PvP + PvC + CvC) to detect no-legal-moves loss.
     * Sets winReason for use by the win banner (missing feature fix).
     */
    checkGameOver() {
        const legalMoves = this.board.getLegalMoves(this.currentTurn);
        if (legalMoves.length === 0) {
            this.isGameOver = true;
            this.winner = this.currentTurn === PLAYER_1 ? PLAYER_2 : PLAYER_1;

            // Determine WHY there are no legal moves: no pieces, or just fully blocked
            let hasPieces = false;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = this.board.grid[r][c];
                    if (p && p.player === this.currentTurn) {
                        hasPieces = true;
                        break;
                    }
                }
                if (hasPieces) break;
            }
            this.winReason = hasPieces
                ? 'Opponent has no legal moves left'
                : 'All opponent pieces captured';
        } else if (this.moveHistory.length > 200) {
            this.isGameOver = true;
            this.winner = 'draw';
            this.winReason = 'Move limit reached (200 moves)';
        }
    }

    isCurrentTurnAI() {
        if (this.isGameOver) return false;
        if (this.mode === MODE_PVP) return false;
        if (this.mode === MODE_PVC) return this.currentTurn === PLAYER_2;
        if (this.mode === MODE_CVC) return true;
        return false;
    }

    /**
     * Triggers AI search step.
     * BUG 3 FIX: AI_MOVE_DELAY_MS pause is inserted AFTER search completes but BEFORE
     * the move is applied to the board — making AI moves visually trackable.
     * The Minimax/Alpha-Beta/TT computation still runs at full speed.
     */
    async executeAIMove() {
        if (!this.isCurrentTurnAI() || this.isAIThinking) return;

        this.isAIThinking = true;
        this.aiAgent.player = this.currentTurn;

        const canShift = this.canPlayerShiftGravity(this.currentTurn);

        // Small timeout so UI renders the "AI Thinking" status before intense computation
        await new Promise(r => setTimeout(r, 80));

        // --- FULL SPEED MINIMAX/ALPHA-BETA/TT COMPUTATION ---
        const decision = await this.aiAgent.findBestMove(this.board, canShift);

        // BUG 3 FIX: Wait AI_MOVE_DELAY_MS after computation before applying move visually.
        // This makes the move watchable without slowing down the search itself.
        await new Promise(r => setTimeout(r, AI_MOVE_DELAY_MS));

        if (decision.shiftGravity) {
            this.triggerGravityShift(this.currentTurn);
            // Re-search move after gravity shift (also full speed)
            const postShiftDecision = await this.aiAgent.findBestMove(this.board, false);
            // Brief pause before post-shift move too
            await new Promise(r => setTimeout(r, AI_MOVE_DELAY_MS));
            if (postShiftDecision.bestMove) {
                this.executeMove(postShiftDecision.bestMove);
            }
        } else if (decision.bestMove) {
            this.executeMove(decision.bestMove);
        }

        this.isAIThinking = false;
    }
}
