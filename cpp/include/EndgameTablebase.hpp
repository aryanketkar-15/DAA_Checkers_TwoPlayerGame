#pragma once

#include "Board.hpp"

/**
 * EndgameTablebase.hpp - Retrograde Analysis & Endgame Engine (C++)
 * 
 * Provides game-theoretic evaluations and edge-forcing mating algorithms
 * when total pieces <= 4 on the board.
 */

class EndgameTablebase {
public:
    static bool isEndgame(const Board& board);
    static bool probe(const Board& board, Player player, int& outScore);
};
