#pragma once

#include <cstdint>
#include <string>

/**
 * Piece.hpp - Antigravity Checkers Piece Model (C++)
 * 
 * Defines player representations, piece types, king promotions,
 * and board coordinates.
 */

enum Player : uint8_t {
    NONE = 0,
    PLAYER_1 = 1, // Neon Cyan (Standard: Starts at bottom row 5-7, moves up)
    PLAYER_2 = 2  // Neon Magenta (Standard: Starts at top row 0-2, moves down)
};

enum PieceType : uint8_t {
    EMPTY = 0,
    REGULAR = 1,
    KING = 2
};

struct Piece {
    Player player;
    PieceType type;
    int row;
    int col;

    Piece(Player p = NONE, PieceType t = EMPTY, int r = 0, int c = 0)
        : player(p), type(t), row(r), col(c) {}

    inline bool isKing() const {
        return type == KING;
    }

    inline bool isRegular() const {
        return type == REGULAR;
    }

    inline void makeKing() {
        type = KING;
    }

    inline bool isEmpty() const {
        return player == NONE || type == EMPTY;
    }
};
