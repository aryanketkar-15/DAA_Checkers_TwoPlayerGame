/**
 * AIAgent.js - Advanced Minimax Engine with Alpha-Beta Pruning & Transposition Table
 * 
 * Implements a tournament-level AI for Antigravity Checkers utilizing:
 * 1. Minimax Algorithm with Alpha-Beta Pruning
 * 2. Dynamic Programming (Transposition Table Memoization via Zobrist Hashing)
 * 3. Iterative Deepening for time management and optimal move ordering
 * 4. Move Ordering (Captures & TT Best Move First)
 * 5. Gravity Shift strategic assessment
 * 6. Endgame Retrograde Tablebase probing
 */

import { PLAYER_1, PLAYER_2 } from '../core/Piece.js';
import { Evaluator } from './Evaluator.js';
import { TranspositionTable, FLAG_EXACT, FLAG_LOWERBOUND, FLAG_UPPERBOUND } from './TranspositionTable.js';
import { EndgameTablebase } from './EndgameTablebase.js';

export class AIAgent {
    /**
     * @param {number} player - PLAYER_1 or PLAYER_2 (AI player ID)
     * @param {number} defaultDepth - Default search depth (e.g. 6-8)
     */
    constructor(player = PLAYER_2, defaultDepth = 6) {
        this.player = player;
        this.depth = defaultDepth;
        this.transpositionTable = new TranspositionTable(250000);
        this.endgameTablebase = new EndgameTablebase();

        // Search metrics for the live HUD
        this.metrics = {
            nodesEvaluated: 0,
            searchTimeMs: 0,
            depthReached: 0,
            ttHits: 0,
            ttCutoffs: 0,
            branchesPruned: 0
        };
    }

    /**
     * Set AI difficulty level (search depth)
     */
    setDifficulty(depth) {
        this.depth = Math.max(1, Math.min(12, depth));
    }

    /**
     * Reset metrics before a new search
     */
    resetMetrics() {
        this.metrics.nodesEvaluated = 0;
        this.metrics.searchTimeMs = 0;
        this.metrics.depthReached = 0;
        this.metrics.ttHits = 0;
        this.metrics.ttCutoffs = 0;
        this.metrics.branchesPruned = 0;
    }

    /**
     * Primary entry point: Computes the best move for the AI.
     * Uses Iterative Deepening to progressively search depths 1..targetDepth.
     * 
     * @param {Board} board - Current board state
     * @param {boolean} canShiftGravity - Whether AI has gravity shift available
     * @returns {Promise<{bestMove: object, shiftGravity: boolean}>}
     */
    async findBestMove(board, canShiftGravity = false) {
        this.resetMetrics();
        this.transpositionTable.newSearch();
        const startTime = performance.now();

        let globalBestMove = null;
        let globalBestScore = -Infinity;

        const opponent = this.player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        const legalMoves = board.getLegalMoves(this.player);

        if (legalMoves.length === 0) {
            return { bestMove: null, shiftGravity: false };
        }

        // If only 1 legal move (e.g., forced mandatory jump), return immediately
        if (legalMoves.length === 1 && !canShiftGravity) {
            this.metrics.nodesEvaluated = 1;
            this.metrics.searchTimeMs = Math.round(performance.now() - startTime);
            this.metrics.depthReached = 1;
            return { bestMove: legalMoves[0], shiftGravity: false };
        }

        // --- DYNAMIC PROGRAMMING ITERATIVE DEEPENING ---
        // We search depth by depth. Results from depth d-1 populate the Transposition Table,
        // providing near-perfect Move Ordering for depth d, which maximizes Alpha-Beta cutoffs!
        for (let currentDepth = 1; currentDepth <= this.depth; currentDepth++) {
            this.metrics.depthReached = currentDepth;
            let currentBestMove = null;
            let currentBestScore = -Infinity;
            let alpha = -Infinity;
            const beta = Infinity;

            // Sort root moves using previous iterations' TT best move
            const orderedMoves = this.orderMoves(board, legalMoves, this.player);

            for (const move of orderedMoves) {
                const nextBoard = board.clone();
                nextBoard.applyMove(move);

                // Minimax recursion on child state
                const score = -this.minimax(nextBoard, currentDepth - 1, -beta, -alpha, opponent);

                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }

                if (score > alpha) {
                    alpha = score;
                }
            }

            if (currentBestMove) {
                globalBestMove = currentBestMove;
                globalBestScore = currentBestScore;
            }

            // If we found a forced checkmate/win, terminate early
            if (globalBestScore >= 90000) {
                break;
            }
        }

        // --- GRAVITY SHIFT STRATEGIC EVALUATION ---
        // AI tests if shifting gravity yields a superior strategic advantage
        let shouldShiftGravity = false;
        if (canShiftGravity) {
            const flippedBoard = board.clone();
            flippedBoard.toggleGravity();
            const flippedMoves = flippedBoard.getLegalMoves(this.player);

            if (flippedMoves.length > 0) {
                // Quick lookahead with shifted gravity
                const flippedScore = this.minimax(flippedBoard, Math.min(4, this.depth), -Infinity, Infinity, this.player);
                // If gravity shift improves our score by a significant threshold (+250 pts), trigger it!
                if (flippedScore > globalBestScore + 250) {
                    shouldShiftGravity = true;
                }
            }
        }

        this.metrics.searchTimeMs = Math.round(performance.now() - startTime);
        const ttMetrics = this.transpositionTable.getMetrics();
        this.metrics.ttHits = ttMetrics.hits;
        this.metrics.ttCutoffs = ttMetrics.cutoffs;

        return {
            bestMove: globalBestMove || legalMoves[0],
            shiftGravity: shouldShiftGravity
        };
    }

    /**
     * MINIMAX WITH ALPHA-BETA PRUNING & TRANSPOSITION TABLE MEMOIZATION
     * 
     * @param {Board} board - Board state at this node
     * @param {number} depth - Depth remaining to search
     * @param {number} alpha - Lower bound of score for maximizing player
     * @param {number} beta - Upper bound of score for minimizing player
     * @param {number} currentPlayer - Turn at this node (PLAYER_1 or PLAYER_2)
     * @returns {number} Minimax evaluation score
     */
    minimax(board, depth, alpha, beta, currentPlayer) {
        this.metrics.nodesEvaluated++;
        const originalAlpha = alpha;
        const hash = board.zobristHash;

        // =====================================================================
        // STEP 1: DYNAMIC PROGRAMMING MEMOIZATION LOOKUP
        // Query the Transposition Table to see if this state was already solved.
        // =====================================================================
        const ttEntry = this.transpositionTable.lookup(hash, depth, alpha, beta);
        if (ttEntry && ttEntry.cutoff) {
            // Instant Dynamic Programming Subtree Pruning!
            return ttEntry.score;
        }

        // =====================================================================
        // STEP 2: TERMINAL / BASE CASE EVALUATION
        // =====================================================================
        const legalMoves = board.getLegalMoves(currentPlayer);

        // Check if player has no legal moves -> Loss
        if (legalMoves.length === 0) {
            return -100000 + (this.depth - depth); // Prefer faster wins / slower losses
        }

        // Probe Endgame Retrograde Database if <= 4 pieces remain
        const endgameScore = this.endgameTablebase.probe(board, currentPlayer);
        if (endgameScore !== null) {
            return endgameScore;
        }

        // Leaf Node reached: evaluate static heuristic
        if (depth === 0) {
            return Evaluator.evaluate(board, currentPlayer);
        }

        // =====================================================================
        // STEP 3: MOVE ORDERING (Captures, Promotions & TT Best Move First)
        // Highly critical for Alpha-Beta pruning efficiency!
        // =====================================================================
        const orderedMoves = this.orderMoves(board, legalMoves, currentPlayer, ttEntry ? ttEntry.bestMove : null);

        let bestScore = -Infinity;
        let bestMove = null;
        const opponent = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

        // =====================================================================
        // STEP 4: RECURSIVE SUBPROBLEM EXPLORATION (MINIMAX WITH NEGAMAX FORM)
        // =====================================================================
        for (const move of orderedMoves) {
            const nextBoard = board.clone();
            nextBoard.applyMove(move);

            // Negamax formulation: score = -minimax(child, depth-1, -beta, -alpha)
            const score = -this.minimax(nextBoard, depth - 1, -beta, -alpha, opponent);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            if (score > alpha) {
                alpha = score;
            }

            // Alpha-Beta Pruning (Beta Cutoff)
            if (alpha >= beta) {
                this.metrics.branchesPruned++;
                break; // Opponent has a better alternative; prune remaining branches!
            }
        }

        // =====================================================================
        // STEP 5: DYNAMIC PROGRAMMING MEMOIZATION STORAGE
        // Cache the solved subtree score, depth, and bound flag in Transposition Table.
        // =====================================================================
        let flag = FLAG_EXACT;
        if (bestScore <= originalAlpha) {
            flag = FLAG_UPPERBOUND; // Fail-low (all moves were <= alpha)
        } else if (bestScore >= beta) {
            flag = FLAG_LOWERBOUND; // Fail-high (beta cutoff triggered)
        }

        this.transpositionTable.store(hash, depth, bestScore, flag, bestMove);

        return bestScore;
    }

    /**
     * Orders moves to maximize Alpha-Beta pruning cutoffs.
     * Heuristics applied:
     * 1. Transposition Table best move from previous search (Highest priority)
     * 2. Captures / Multi-jumps (Ordered by number of captured pieces)
     * 3. King Promotions
     * 4. Center-advancing moves
     */
    orderMoves(board, moves, player, ttBestMove = null) {
        return moves.slice().sort((a, b) => {
            // 1. TT Best Move gets top priority
            if (ttBestMove) {
                const aIsTT = a.fromRow === ttBestMove.fromRow && a.fromCol === ttBestMove.fromCol && a.toRow === ttBestMove.toRow && a.toCol === ttBestMove.toCol;
                const bIsTT = b.fromRow === ttBestMove.fromRow && b.fromCol === ttBestMove.fromCol && b.toRow === ttBestMove.toRow && b.toCol === ttBestMove.toCol;
                if (aIsTT) return -1;
                if (bIsTT) return 1;
            }

            // 2. Prioritize multi-jumps and captures
            const aCaps = a.captured ? a.captured.length : 0;
            const bCaps = b.captured ? b.captured.length : 0;
            if (aCaps !== bCaps) {
                return bCaps - aCaps;
            }

            // 3. Prioritize King promotions
            if (a.becameKing && !b.becameKing) return -1;
            if (!a.becameKing && b.becameKing) return 1;

            // 4. Center proximity bonus
            const aCenterDist = Math.abs(3.5 - a.toRow) + Math.abs(3.5 - a.toCol);
            const bCenterDist = Math.abs(3.5 - b.toRow) + Math.abs(3.5 - b.toCol);
            return aCenterDist - bCenterDist;
        });
    }
}
