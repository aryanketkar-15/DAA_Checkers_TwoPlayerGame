#pragma once

#include <cstdint>
#include <random>
#include "Piece.hpp"

/**
 * Zobrist.hpp - Dynamic Programming State Hashing (C++)
 * 
 * Implements Zobrist Hashing for fast, constant-time O(1) state hash updates.
 * In Minimax search trees, thousands of board configurations are visited repeatedly
 * through different transposition paths.
 * 
 * Zobrist Hashing associates a unique 64-bit integer pseudo-random number with
 * every possible (square, piece_type, player) triplet, plus turn and gravity state.
 * Any board state hash is the XOR sum of all present elements.
 */

class Zobrist {
private:
    // [row 0..7][col 0..7][pieceIndex 0..3]
    // pieceIndex: 0: P1_REG, 1: P1_KING, 2: P2_REG, 3: P2_KING
    uint64_t pieceTable[8][8][4];
    uint64_t turnKeys[2];      // 0: P1 turn, 1: P2 turn
    uint64_t gravityKeys[2];   // 0: Normal, 1: Shifted

public:
    Zobrist();

    // Map piece to index [0..3]
    static inline int getPieceIndex(Player p, PieceType t) {
        if (p == PLAYER_1) {
            return (t == REGULAR) ? 0 : 1;
        } else {
            return (t == REGULAR) ? 2 : 3;
        }
    }

    // Incremental O(1) XOR modifications
    inline uint64_t togglePiece(uint64_t hash, int r, int c, Player p, PieceType t) const {
        if (p == NONE || t == EMPTY) return hash;
        return hash ^ pieceTable[r][c][getPieceIndex(p, t)];
    }

    inline uint64_t toggleTurn(uint64_t hash) const {
        return hash ^ turnKeys[0] ^ turnKeys[1];
    }

    inline uint64_t toggleGravity(uint64_t hash) const {
        return hash ^ gravityKeys[0] ^ gravityKeys[1];
    }

    // Compute initial hash from scratch - O(N)
    uint64_t computeFullHash(const Piece grid[8][8], Player turn, bool isGravityInverted) const;
};
