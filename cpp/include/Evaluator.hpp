#pragma once

#include "Board.hpp"

/**
 * Evaluator.hpp - Heuristic Evaluation Function (C++)
 * 
 * Scores board positions across:
 * - Material differential (Men: 100, Kings: 185)
 * - Positional heatmaps (Center dominance)
 * - Advancement toward promotion
 * - Back-rank home defenses
 */

class Evaluator {
public:
    static constexpr int PIECE_VAL = 100;
    static constexpr int KING_VAL = 185;
    static constexpr int BACK_ROW_DEFENSE_VAL = 25;
    static constexpr int CENTER_WEIGHT_MULT = 4;
    static constexpr int ADVANCEMENT_MULT = 5;

    static int evaluate(const Board& board, Player player);
};
