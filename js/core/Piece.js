/**
 * Piece.js - Antigravity Checkers Piece Model
 * Represents a single checker piece on the 8x8 grid.
 */

export const PLAYER_1 = 1; // Neon Cyan (Standard: Starts at bottom, moves upward)
export const PLAYER_2 = 2; // Neon Magenta (Standard: Starts at top, moves downward)

export const PIECE_REGULAR = 1;
export const PIECE_KING = 2;

export class Piece {
    /**
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @param {number} type - PIECE_REGULAR or PIECE_KING
     * @param {number} row - Board row (0-7)
     * @param {number} col - Board col (0-7)
     */
    constructor(player, type = PIECE_REGULAR, row = 0, col = 0) {
        this.player = player;
        this.type = type;
        this.row = row;
        this.col = col;

        // Visual animation interpolation coordinates
        this.renderX = col;
        this.renderY = row;
        this.isPromoting = false;
        this.pulse = Math.random() * Math.PI * 2;
    }

    /**
     * Check if piece is a King
     */
    isKing() {
        return this.type === PIECE_KING;
    }

    /**
     * Promote piece to King
     */
    makeKing() {
        this.type = PIECE_KING;
        this.isPromoting = true;
    }

    /**
     * Create deep copy of piece
     */
    clone() {
        const copy = new Piece(this.player, this.type, this.row, this.col);
        copy.renderX = this.renderX;
        copy.renderY = this.renderY;
        return copy;
    }
}
