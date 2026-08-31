/**
 * Renderer.js - Antigravity Checkers Canvas Visualizer
 * Renders glowing neon board, floating pieces, holographic crowns,
 * and valid move rings.
 */

import { PLAYER_1, PLAYER_2, PIECE_KING } from '../core/Piece.js';

export class Renderer {
    constructor(canvas, particleEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = particleEngine;
        this.tileSize = canvas.width / 8;

        this.selectedSquare = null; // {row, col}
        this.validMovesForSelected = [];
        this.lastMove = null;
        this.hoverSquare = null;
    }

    render(board, isGravityInverted) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Render Background grid & board tiles
        this.renderBoardTiles();

        // 2. Render Last Move trail
        if (this.lastMove) {
            this.renderLastMoveIndicator(this.lastMove);
        }

        // 3. Render Pieces
        this.renderPieces(board);

        // 4. Render Selection & Valid Move Highlights
        // Pass board so renderSelection can look up piece ownership for dynamic color
        if (this.selectedSquare) {
            this.renderSelection(this.selectedSquare, board);
            this.renderValidMoves(this.validMovesForSelected);
        }

        // 5. Update and render particles
        if (this.particles) {
            this.particles.updateAndRender();
        }
    }

    renderBoardTiles() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                const isPlayable = (r + c) % 2 === 1;

                if (isPlayable) {
                    this.ctx.fillStyle = '#111827';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

                    // Inner border for futuristic dark tile
                    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
                } else {
                    this.ctx.fillStyle = '#0a0d18';
                    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
                }
            }
        }
    }

    renderPieces(board) {
        const radius = this.tileSize * 0.38;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board.grid[r][c];
                if (!piece) continue;

                const centerX = c * this.tileSize + this.tileSize / 2;
                const centerY = r * this.tileSize + this.tileSize / 2;

                const isP1 = piece.player === PLAYER_1;
                const glowColor = isP1 ? '#00f0ff' : '#ff007f';
                const baseColor = isP1 ? '#083344' : '#4a042e';

                this.ctx.save();

                // Drop shadow / antigravity levitation glow
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = piece.isKing() ? 22 : 12;

                // Outer Piece Shell
                const grad = this.ctx.createRadialGradient(
                    centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1,
                    centerX, centerY, radius
                );
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.2, glowColor);
                grad.addColorStop(0.8, baseColor);
                grad.addColorStop(1, '#020617');

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();

                // Outer Ring
                this.ctx.strokeStyle = glowColor;
                this.ctx.lineWidth = piece.isKing() ? 3 : 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();

                // Inner Holographic Ring
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius * 0.65, 0, Math.PI * 2);
                this.ctx.stroke();

                // King Crown / Insignia
                if (piece.isKing()) {
                    this.ctx.fillStyle = '#fbbf24';
                    this.ctx.shadowColor = '#fbbf24';
                    this.ctx.shadowBlur = 14;
                    this.renderCrown(centerX, centerY, radius * 0.45);
                }

                this.ctx.restore();
            }
        }
    }

    renderCrown(cx, cy, size) {
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.beginPath();
        this.ctx.moveTo(-size, size * 0.6);
        this.ctx.lineTo(-size, -size * 0.3);
        this.ctx.lineTo(-size * 0.5, size * 0.1);
        this.ctx.lineTo(0, -size * 0.6);
        this.ctx.lineTo(size * 0.5, size * 0.1);
        this.ctx.lineTo(size, -size * 0.3);
        this.ctx.lineTo(size, size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Renders the selection ring around the chosen piece.
     * BUG FIX: Color is now dynamically derived from the selected piece's player,
     * not hardcoded to cyan. P1 = cyan (#00f0ff), P2 = magenta (#ff007f).
     * @param {{row: number, col: number}} selected
     * @param {Board} board - needed to look up the piece's player
     */
    renderSelection(selected, board) {
        const x = selected.col * this.tileSize;
        const y = selected.row * this.tileSize;

        // Determine the correct highlight color based on which player owns the piece
        let selectionColor = '#00f0ff'; // default cyan (Player 1)
        if (board) {
            const piece = board.grid[selected.row][selected.col];
            if (piece) {
                // PLAYER_1 = 1 (cyan), PLAYER_2 = 2 (magenta)
                selectionColor = piece.player === 1 ? '#00f0ff' : '#ff007f';
            }
        }

        this.ctx.save();
        this.ctx.strokeStyle = selectionColor;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = selectionColor;
        this.ctx.shadowBlur = 18;
        this.ctx.strokeRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);

        // Corner accent marks for a more premium selection indicator
        const cornerSize = this.tileSize * 0.18;
        this.ctx.lineWidth = 4;
        const corners = [
            [x + 4, y + 4, cornerSize, 0, cornerSize, 0],          // TL
            [x + this.tileSize - 4, y + 4, -cornerSize, 0, 0, cornerSize], // TR
            [x + 4, y + this.tileSize - 4, 0, -cornerSize, cornerSize, 0], // BL
            [x + this.tileSize - 4, y + this.tileSize - 4, -cornerSize, 0, 0, -cornerSize] // BR
        ];
        for (const [cx, cy, dx1, dy1, dx2, dy2] of corners) {
            this.ctx.beginPath();
            this.ctx.moveTo(cx + dx1, cy + dy1);
            this.ctx.lineTo(cx, cy);
            this.ctx.lineTo(cx + dx2, cy + dy2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    renderValidMoves(moves) {
        for (const move of moves) {
            const cx = move.toCol * this.tileSize + this.tileSize / 2;
            const cy = move.toRow * this.tileSize + this.tileSize / 2;
            const isJump = move.isJump();

            this.ctx.save();
            if (isJump) {
                // Target capture crosshair ring
                this.ctx.strokeStyle = '#ff007f';
                this.ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
                this.ctx.lineWidth = 2.5;
                this.ctx.shadowColor = '#ff007f';
                this.ctx.shadowBlur = 14;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, this.tileSize * 0.32, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Inner cross
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ff007f';
                this.ctx.fill();
            } else {
                // Standard move ring
                this.ctx.strokeStyle = '#00f0ff';
                this.ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#00f0ff';
                this.ctx.shadowBlur = 10;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, this.tileSize * 0.22, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
            this.ctx.restore();
        }
    }

    renderLastMoveIndicator(move) {
        const fromX = move.fromCol * this.tileSize + this.tileSize / 2;
        const fromY = move.fromRow * this.tileSize + this.tileSize / 2;
        const toX = move.toCol * this.tileSize + this.tileSize / 2;
        const toY = move.toRow * this.tileSize + this.tileSize / 2;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([6, 6]);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        // From square subtle box
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
        this.ctx.fillRect(move.fromCol * this.tileSize, move.fromRow * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.restore();
    }
}
