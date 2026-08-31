/**
 * Zobrist.js - Dynamic Programming State Hashing
 * 
 * Implements Zobrist Hashing (a randomized transposition table key generator)
 * for the 8x8 Checkers board.
 * 
 * In Dynamic Programming for game trees, we encounter the exact same board positions
 * reached via different move orderings (transpositions). Re-evaluating these subtrees
 * causes exponential overhead O(b^d).
 * 
 * Zobrist Hashing computes an initial 64-bit integer hash in O(N) and allows
 * O(1) INCREMENTAL updates via bitwise XOR operations whenever a piece moves,
 * is captured, promotes to King, or when gravity shifts.
 */

import { PLAYER_1, PLAYER_2, PIECE_REGULAR, PIECE_KING } from './Piece.js';

export class Zobrist {
    constructor() {
        // 8x8 squares, 4 piece types: [0: P1_Reg, 1: P1_King, 2: P2_Reg, 3: P2_King]
        this.pieceTable = Array.from({ length: 8 }, () =>
            Array.from({ length: 8 }, () =>
                Array.from({ length: 4 }, () => this.generateRandom64Bit())
            )
        );

        // Turn keys: 0 for Player 1, 1 for Player 2
        this.turnKeys = [this.generateRandom64Bit(), this.generateRandom64Bit()];

        // Gravity state keys: 0 for Normal, 1 for Inverted
        this.gravityKeys = [this.generateRandom64Bit(), this.generateRandom64Bit()];
    }

    /**
     * Generate a pseudo-random 64-bit unsigned BigInt using crypto or Math.random
     */
    generateRandom64Bit() {
        const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
        const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
        return (high << 32n) | low;
    }

    /**
     * Maps piece properties to table index [0..3]
     */
    getPieceIndex(player, type) {
        if (player === PLAYER_1) {
            return type === PIECE_REGULAR ? 0 : 1;
        } else {
            return type === PIECE_REGULAR ? 2 : 3;
        }
    }

    /**
     * Computes full 64-bit Zobrist Hash of a given board from scratch - O(N)
     * @param {Array<Array<Piece|null>>} grid - 8x8 board
     * @param {number} currentTurn - PLAYER_1 or PLAYER_2
     * @param {boolean} isGravityInverted - Gravity Shift state
     * @returns {bigint} 64-bit hash
     */
    computeFullHash(grid, currentTurn, isGravityInverted) {
        let hash = 0n;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = grid[r][c];
                if (piece) {
                    const pieceIdx = this.getPieceIndex(piece.player, piece.type);
                    hash ^= this.pieceTable[r][c][pieceIdx];
                }
            }
        }

        const turnIdx = currentTurn === PLAYER_1 ? 0 : 1;
        hash ^= this.turnKeys[turnIdx];

        const gravIdx = isGravityInverted ? 1 : 0;
        hash ^= this.gravityKeys[gravIdx];

        return hash;
    }

    /**
     * Toggle a piece at (row, col) in O(1) via XOR
     */
    togglePiece(hash, row, col, player, type) {
        const pieceIdx = this.getPieceIndex(player, type);
        return hash ^ this.pieceTable[row][col][pieceIdx];
    }

    /**
     * Toggle the active player turn in O(1) via XOR
     */
    toggleTurn(hash) {
        return hash ^ this.turnKeys[0] ^ this.turnKeys[1];
    }

    /**
     * Toggle gravity state in O(1) via XOR
     */
    toggleGravity(hash) {
        return hash ^ this.gravityKeys[0] ^ this.gravityKeys[1];
    }
}
