#pragma once

#include <vector>
#include <iostream>
#include "Piece.hpp"
#include "Zobrist.hpp"

struct CapturedPiece {
    int row;
    int col;
    Player player;
    PieceType type;
};

struct Move {
    int fromRow;
    int fromCol;
    int toRow;
    int toCol;
    std::vector<CapturedPiece> captured;
    bool becameKing;
    std::vector<std::pair<int, int>> path;

    Move(int fr = 0, int fc = 0, int tr = 0, int tc = 0, bool bk = false)
        : fromRow(fr), fromCol(fc), toRow(tr), toCol(tc), becameKing(bk) {
        path.push_back({fr, fc});
        path.push_back({tr, tc});
    }

    inline bool isJump() const {
        return !captured.empty();
    }
};

struct BoardStats {
    int p1Count = 0;
    int p2Count = 0;
    int p1Kings = 0;
    int p2Kings = 0;
    int p1BackRow = 0;
    int p2BackRow = 0;
    int p1Center = 0;
    int p2Center = 0;
    int totalPieces = 0;
};

class Board {
public:
    Piece grid[8][8];
    bool isGravityInverted;
    uint64_t zobristHash;
    static Zobrist zobristEngine;

    Board();
    void reset();

    // Antigravity Mechanics
    void toggleGravity();
    int getForwardDirection(Player player) const;
    int getPromotionRow(Player player) const;

    // Movement & Validation
    bool isValidCoord(int r, int c) const;
    const Piece& getPiece(int r, int c) const;
    std::vector<Move> getLegalMoves(Player player) const;
    std::vector<Move> getSimpleMovesForPiece(int r, int c, const Piece& piece) const;
    void getJumpsForPiece(int startR, int startC, const Piece& piece, std::vector<Move>& outJumps) const;

    // State Application
    void applyMove(const Move& move);

    // Diagnostics & Metrics
    BoardStats getStats() const;
    void displayBoard() const;

private:
    void exploreJumps(int curR, int curC, int startR, int startC, Player player, PieceType curType,
                      std::vector<CapturedPiece>& capturedList,
                      std::vector<std::pair<int, int>>& pathCoords,
                      std::vector<Move>& outJumps) const;
};
