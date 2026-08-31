#include "../include/Evaluator.hpp"
#include <cmath>
#include <cstdlib>

static const int POSITION_WEIGHTS[8][8] = {
    {0, 4, 0, 4, 0, 4, 0, 4},
    {4, 0, 3, 0, 3, 0, 3, 0},
    {0, 3, 0, 4, 0, 4, 0, 3},
    {3, 0, 5, 0, 6, 0, 4, 0},
    {0, 4, 0, 6, 0, 5, 0, 3},
    {3, 0, 4, 0, 4, 0, 3, 0},
    {0, 3, 0, 3, 0, 3, 0, 4},
    {4, 0, 4, 0, 4, 0, 4, 0}
};

int Evaluator::evaluate(const Board& board, Player player) {
    int p1Score = 0;
    int p2Score = 0;

    int promoRowP1 = board.getPromotionRow(PLAYER_1);
    int promoRowP2 = board.getPromotionRow(PLAYER_2);

    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            const Piece& p = board.grid[r][c];
            if (p.isEmpty()) continue;

            int pieceScore = 0;

            if (p.isKing()) {
                pieceScore += KING_VAL;
                pieceScore += POSITION_WEIGHTS[r][c] * 3;
            } else {
                pieceScore += PIECE_VAL;
                pieceScore += POSITION_WEIGHTS[r][c] * CENTER_WEIGHT_MULT;

                int distToPromotion = std::abs(r - (p.player == PLAYER_1 ? promoRowP1 : promoRowP2));
                pieceScore += (7 - distToPromotion) * ADVANCEMENT_MULT;

                if (p.player == PLAYER_1 && r == 7 && promoRowP1 == 0) {
                    pieceScore += BACK_ROW_DEFENSE_VAL;
                } else if (p.player == PLAYER_2 && r == 0 && promoRowP2 == 7) {
                    pieceScore += BACK_ROW_DEFENSE_VAL;
                }
            }

            if (p.player == PLAYER_1) {
                p1Score += pieceScore;
            } else {
                p2Score += pieceScore;
            }
        }
    }

    return (player == PLAYER_1) ? (p1Score - p2Score) : (p2Score - p1Score);
}
