/**
 * Board.js - 8x8 Checkers Grid & Move Logic
 * 
 * Implements standard international/American checkers mechanics:
 * - 8x8 Board with dark playable tiles
 * - Mandatory captures (jumps)
 * - Multi-jump chains
 * - King promotion
 * - Antigravity "Gravity Shift" inversion
 * - Integrated Zobrist Hashing for O(1) state hash tracking
 */

import { Piece, PLAYER_1, PLAYER_2, PIECE_REGULAR, PIECE_KING } from './Piece.js';
import { Zobrist } from './Zobrist.js';

export const zobristEngine = new Zobrist();

export class Move {
    /**
     * @param {number} fromRow
     * @param {number} fromCol
     * @param {number} toRow
     * @param {number} toCol
     * @param {Array<{row: number, col: number, piece: Piece}>} captured - captured pieces along the path
     * @param {boolean} becameKing - whether this move resulted in promotion
     * @param {Array<{row: number, col: number}>} path - full multi-step coordinate path
     */
    constructor(fromRow, fromCol, toRow, toCol, captured = [], becameKing = false, path = null) {
        this.fromRow = fromRow;
        this.fromCol = fromCol;
        this.toRow = toRow;
        this.toCol = toCol;
        this.captured = captured; // Array of {row, col, piece}
        this.becameKing = becameKing;
        this.path = path || [{ row: fromRow, col: fromCol }, { row: toRow, col: toCol }];
    }

    isJump() {
        return this.captured && this.captured.length > 0;
    }
}

export class Board {
    constructor() {
        this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
        this.isGravityInverted = false;
        this.zobristHash = 0n;
        this.initializeBoard();
    }

    /**
     * Initializes default 8x8 checkers setup:
     * Player 2 (Top, Rows 0-2)
     * Player 1 (Bottom, Rows 5-7)
     * Playable only on dark squares where (r + c) % 2 === 1
     */
    initializeBoard() {
        this.grid = Array.from({ length: 8 }, () => Array(8).fill(null));
        this.isGravityInverted = false;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) {
                        this.grid[r][c] = new Piece(PLAYER_2, PIECE_REGULAR, r, c);
                    } else if (r > 4) {
                        this.grid[r][c] = new Piece(PLAYER_1, PIECE_REGULAR, r, c);
                    }
                }
            }
        }

        this.zobristHash = zobristEngine.computeFullHash(this.grid, PLAYER_1, this.isGravityInverted);
    }

    /**
     * Deep clone board for search exploration
     */
    clone() {
        const copy = new Board();
        copy.isGravityInverted = this.isGravityInverted;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.grid[r][c]) {
                    copy.grid[r][c] = this.grid[r][c].clone();
                } else {
                    copy.grid[r][c] = null;
                }
            }
        }
        copy.zobristHash = this.zobristHash;
        return copy;
    }

    /**
     * Inverts gravity direction for all non-king pieces.
     * Toggles board gravity and updates Zobrist hash.
     */
    toggleGravity() {
        this.isGravityInverted = !this.isGravityInverted;
        this.zobristHash = zobristEngine.toggleGravity(this.zobristHash);
    }

    /**
     * Returns directional step for a player given current gravity
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @returns {number} -1 for upward, +1 for downward
     */
    getForwardDirection(player) {
        if (!this.isGravityInverted) {
            // Normal: P1 moves up (-1), P2 moves down (+1)
            return player === PLAYER_1 ? -1 : 1;
        } else {
            // Inverted: P1 moves down (+1), P2 moves up (-1)
            return player === PLAYER_1 ? 1 : -1;
        }
    }

    /**
     * Returns the target row for King promotion
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @returns {number} 0 or 7
     */
    getPromotionRow(player) {
        const dir = this.getForwardDirection(player);
        return dir === -1 ? 0 : 7;
    }

    /**
     * Is the coordinate within 8x8 boundaries?
     */
    isValidCoord(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    /**
     * Get piece at (r, c)
     */
    getPiece(r, c) {
        if (!this.isValidCoord(r, c)) return null;
        return this.grid[r][c];
    }

    /**
     * Get all legal moves for the given player.
     * RULE: Mandatory captures (jumps). If any jump exists for the player,
     * only jump moves are valid.
     * @param {number} player - PLAYER_1 or PLAYER_2
     * @returns {Array<Move>} List of legal moves
     */
    getLegalMoves(player) {
        const jumps = [];
        const simpleMoves = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.grid[r][c];
                if (piece && piece.player === player) {
                    const pieceJumps = this.getJumpsForPiece(r, c, piece);
                    if (pieceJumps.length > 0) {
                        jumps.push(...pieceJumps);
                    } else if (jumps.length === 0) {
                        // Only collect simple moves if no jumps discovered so far
                        const pieceSimple = this.getSimpleMovesForPiece(r, c, piece);
                        simpleMoves.push(...pieceSimple);
                    }
                }
            }
        }

        // Mandatory Capture Rule: If jumps exist, only return jumps!
        if (jumps.length > 0) {
            return jumps;
        }
        return simpleMoves;
    }

    /**
     * Get non-capturing single-step diagonal moves for a piece
     */
    getSimpleMovesForPiece(r, c, piece) {
        const moves = [];
        const dirs = [];

        if (piece.isKing()) {
            dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        } else {
            const fwd = this.getForwardDirection(piece.player);
            dirs.push([fwd, -1], [fwd, 1]);
        }

        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidCoord(nr, nc) && this.grid[nr][nc] === null) {
                const promoRow = this.getPromotionRow(piece.player);
                const becameKing = !piece.isKing() && nr === promoRow;
                moves.push(new Move(r, c, nr, nc, [], becameKing));
            }
        }

        return moves;
    }

    /**
     * Recursive search for all multi-jump capture paths for a piece
     */
    getJumpsForPiece(startR, startC, piece) {
        const jumps = [];

        const exploreJumps = (curR, curC, currentType, capturedList, pathCoords) => {
            const dirs = [];
            if (currentType === PIECE_KING) {
                dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
            } else {
                // In standard checkers, regular pieces can jump forward (or in some rules backward).
                // Standard International/American: regular pieces jump in their forward direction,
                // but many modern variants allow backward jumps. We allow standard forward jumps for normal,
                // and 4-way jumps for Kings.
                const fwd = this.getForwardDirection(piece.player);
                dirs.push([fwd, -1], [fwd, 1]);
            }

            let foundFurtherJump = false;

            for (const [dr, dc] of dirs) {
                const midR = curR + dr;
                const midC = curC + dc;
                const landR = curR + dr * 2;
                const landC = curC + dc * 2;

                if (this.isValidCoord(landR, landC)) {
                    const midPiece = this.grid[midR][midC];
                    const landPiece = this.grid[landR][landC];

                    // Can jump if:
                    // 1. Landing square is empty (or is the start square of this chain)
                    // 2. Middle square has enemy piece
                    // 3. Middle square piece not already captured in current chain
                    const isLandEmpty = landPiece === null || (landR === startR && landC === startC);
                    const notAlreadyCaptured = !capturedList.some(cap => cap.row === midR && cap.col === midC);

                    if (isLandEmpty && midPiece && midPiece.player !== piece.player && notAlreadyCaptured) {
                        foundFurtherJump = true;

                        const promoRow = this.getPromotionRow(piece.player);
                        const promotesHere = currentType !== PIECE_KING && landR === promoRow;
                        const nextType = promotesHere ? PIECE_KING : currentType;

                        const nextCaptured = [...capturedList, { row: midR, col: midC, piece: midPiece }];
                        const nextPath = [...pathCoords, { row: landR, col: landC }];

                        // If piece promoted during the jump, standard rules stop the turn,
                        // or allow continuing as a king. We allow continuous king capture!
                        exploreJumps(landR, landC, nextType, nextCaptured, nextPath);
                    }
                }
            }

            // If this was a valid jump step and no further jumps can be made, save this branch
            if (!foundFurtherJump && capturedList.length > 0) {
                const promoRow = this.getPromotionRow(piece.player);
                const becameKing = piece.type !== PIECE_KING && curR === promoRow;
                jumps.push(new Move(startR, startC, curR, curC, capturedList, becameKing, pathCoords));
            }
        };

        exploreJumps(startR, startC, piece.type, [], [{ row: startR, col: startC }]);
        return jumps;
    }

    /**
     * Applies a Move to the board and updates Zobrist Hash in O(1)
     * @param {Move} move
     */
    applyMove(move) {
        const piece = this.grid[move.fromRow][move.fromCol];
        if (!piece) return;

        // Remove piece from start square in Hash & Grid
        this.zobristHash = zobristEngine.togglePiece(this.zobristHash, move.fromRow, move.fromCol, piece.player, piece.type);
        this.grid[move.fromRow][move.fromCol] = null;

        // Remove captured pieces in Hash & Grid
        if (move.captured && move.captured.length > 0) {
            for (const cap of move.captured) {
                this.zobristHash = zobristEngine.togglePiece(this.zobristHash, cap.row, cap.col, cap.piece.player, cap.piece.type);
                this.grid[cap.row][cap.col] = null;
            }
        }

        // Place piece at destination
        piece.row = move.toRow;
        piece.col = move.toCol;
        if (move.becameKing) {
            piece.makeKing();
        }

        // Add piece to destination in Hash & Grid
        this.zobristHash = zobristEngine.togglePiece(this.zobristHash, move.toRow, move.toCol, piece.player, piece.type);
        this.grid[move.toRow][move.toCol] = piece;

        // Toggle player turn in Zobrist Hash
        this.zobristHash = zobristEngine.toggleTurn(this.zobristHash);
    }

    /**
     * Fast piece counts and board stats for heuristics
     */
    getStats() {
        let p1Count = 0, p2Count = 0;
        let p1Kings = 0, p2Kings = 0;
        let p1BackRow = 0, p2BackRow = 0;
        let p1Center = 0, p2Center = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.grid[r][c];
                if (!p) continue;

                if (p.player === PLAYER_1) {
                    p1Count++;
                    if (p.isKing()) p1Kings++;
                    if (r === 7) p1BackRow++;
                    if ((r === 3 || r === 4) && (c >= 2 && c <= 5)) p1Center++;
                } else {
                    p2Count++;
                    if (p.isKing()) p2Kings++;
                    if (r === 0) p2BackRow++;
                    if ((r === 3 || r === 4) && (c >= 2 && c <= 5)) p2Center++;
                }
            }
        }

        return {
            p1Count, p2Count,
            p1Kings, p2Kings,
            p1BackRow, p2BackRow,
            p1Center, p2Center,
            totalPieces: p1Count + p2Count
        };
    }
}
