#include "../include/EndgameTablebase.hpp"
#include <cmath>

bool EndgameTablebase::isEndgame(const Board& board) {
    BoardStats stats = board.getStats();
    return stats.totalPieces <= 4 && stats.totalPieces > 0;
}

bool EndgameTablebase::probe(const Board& board, Player player, int& outScore) {
    if (!isEndgame(board)) return false;

    BoardStats stats = board.getStats();
    int myCount = (player == PLAYER_1) ? stats.p1Count : stats.p2Count;
    int oppCount = (player == PLAYER_1) ? stats.p2Count : stats.p1Count;
    int myKings = (player == PLAYER_1) ? stats.p1Kings : stats.p2Kings;
    int oppKings = (player == PLAYER_1) ? stats.p2Kings : stats.p1Kings;

    if (oppCount == 0) {
        outScore = 100000;
        return true;
    }
    if (myCount == 0) {
        outScore = -100000;
        return true;
    }

    // 2 Kings vs 1 King Endgame
    if (myKings >= 2 && oppKings == 1 && oppCount == 1) {
        std::pair<int, int> oppKingPos = {-1, -1};
        std::vector<std::pair<int, int>> myKingPositions;

        for (int r = 0; r < 8; ++r) {
            for (int c = 0; c < 8; ++c) {
                const Piece& p = board.grid[r][c];
                if (p.isEmpty()) continue;

                if (p.player != player && p.isKing()) {
                    oppKingPos = {r, c};
                } else if (p.player == player && p.isKing()) {
                    myKingPositions.push_back({r, c});
                }
            }
        }

        if (oppKingPos.first != -1 && myKingPositions.size() >= 2) {
            int distSum = 0;
            for (const auto& pos : myKingPositions) {
                distSum += std::abs(pos.first - oppKingPos.first) + std::abs(pos.second - oppKingPos.second);
            }

            double centerDist = std::abs(3.5 - oppKingPos.first) + std::abs(3.5 - oppKingPos.second);
            outScore = 5000 + static_cast<int>(centerDist * 40.0) - (distSum * 20);
            return true;
        }
    }

    if (myCount > oppCount) {
        outScore = 3000 + (myCount - oppCount) * 800;
        return true;
    } else if (myCount < oppCount) {
        outScore = -3000 - (oppCount - myCount) * 800;
        return true;
    }

    outScore = 0;
    return true;
}
