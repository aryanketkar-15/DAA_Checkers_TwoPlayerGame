/**
 * Evaluator.js - Heuristic Board Evaluation Function
 * 
 * Provides position evaluation for midgame and endgame positions:
 * - Material Count (Standard pieces vs Kings)
 * - Positional Heatmap (Central square dominance)
 * - Back-Row Defense (Home row protection against king promotion)
 * - Piece Advancement (Closeness to king promotion row)
 * - Mobility & Trapped Piece analysis
 */

import { PLAYER_1, PLAYER_2, PIECE_REGULAR, PIECE_KING } from '../core/Piece.js';

// Positional weight heatmap for 8x8 checkers board (dark tiles)
// Higher values in center encourage board dominance
const POSITION_WEIGHTS = [
    [0, 4, 0, 4, 0, 4, 0, 4],
    [4, 0, 3, 0, 3, 0, 3, 0],
    [0, 3, 0, 4, 0, 4, 0, 3],
    [3, 0, 5, 0, 6, 0, 4, 0],
    [0, 4, 0, 6, 0, 5, 0, 3],
    [3, 0, 4, 0, 4, 0, 3, 0],
    [0, 3, 0, 3, 0, 3, 0, 4],
    [4, 0, 4, 0, 4, 0, 4, 0]
];

export class Evaluator {
    static PIECE_VALUE = 100;
    static KING_VALUE = 185;
    static BACK_ROW_DEFENSE_VALUE = 25;
    static CENTER_CONTROL_MULTIPLIER = 4;
    static ADVANCEMENT_MULTIPLIER = 5;

    /**
     * Evaluates the board state from the perspective of the maximizing player.
     * @param {Board} board
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @returns {number} Heuristic score
     */
    static evaluate(board, player) {
        let p1Score = 0;
        let p2Score = 0;

        const promoRowP1 = board.getPromotionRow(PLAYER_1);
        const promoRowP2 = board.getPromotionRow(PLAYER_2);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board.grid[r][c];
                if (!piece) continue;

                let pieceScore = 0;

                // 1. Material Valuation
                if (piece.isKing()) {
                    pieceScore += Evaluator.KING_VALUE;
                    // Kings benefit from aggressive central roaming
                    pieceScore += POSITION_WEIGHTS[r][c] * 3;
                } else {
                    pieceScore += Evaluator.PIECE_VALUE;

                    // 2. Positional Center Control
                    pieceScore += POSITION_WEIGHTS[r][c] * Evaluator.CENTER_CONTROL_MULTIPLIER;

                    // 3. Piece Advancement toward Promotion Row
                    const distToPromotion = Math.abs(r - (piece.player === PLAYER_1 ? promoRowP1 : promoRowP2));
                    const advancementScore = (7 - distToPromotion) * Evaluator.ADVANCEMENT_MULTIPLIER;
                    pieceScore += advancementScore;

                    // 4. Back-Row Defense
                    if (piece.player === PLAYER_1 && r === 7 && promoRowP1 === 0) {
                        pieceScore += Evaluator.BACK_ROW_DEFENSE_VALUE;
                    } else if (piece.player === PLAYER_2 && r === 0 && promoRowP2 === 7) {
                        pieceScore += Evaluator.BACK_ROW_DEFENSE_VALUE;
                    }
                }

                if (piece.player === PLAYER_1) {
                    p1Score += pieceScore;
                } else {
                    p2Score += pieceScore;
                }
            }
        }

        // Return score relative to the requesting player
        return player === PLAYER_1 ? (p1Score - p2Score) : (p2Score - p1Score);
    }
}
