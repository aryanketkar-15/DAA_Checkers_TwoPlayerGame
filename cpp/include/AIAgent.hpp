#pragma once

#include <chrono>
#include "Board.hpp"
#include "TranspositionTable.hpp"

/**
 * AIAgent.hpp - Minimax Engine with Alpha-Beta & Dynamic Programming (C++)
 * 
 * Implements tournament-grade search engine:
 * - Alpha-Beta Pruned Minimax with Negamax formulation
 * - Transposition Table Memoization with Zobrist Hashing
 * - Move Ordering for optimal Alpha-Beta cutoffs
 * - Iterative Deepening
 * - Strategic Gravity Shift evaluation
 */

struct AIMetrics {
    uint64_t nodesEvaluated = 0;
    int searchTimeMs = 0;
    int depthReached = 0;
    uint64_t ttHits = 0;
    uint64_t ttCutoffs = 0;
    uint64_t branchesPruned = 0;
};

struct AIResult {
    Move bestMove;
    bool shouldShiftGravity = false;
    bool hasMove = false;
    int evalScore = 0;
};

class AIAgent {
public:
    Player player;
    int targetDepth;
    TranspositionTable transpositionTable;
    AIMetrics metrics;

    AIAgent(Player p = PLAYER_2, int defaultDepth = 8);

    void setDifficulty(int depth);
    void resetMetrics();

    AIResult findBestMove(Board& board, bool canShiftGravity = false);

private:
    int minimax(Board& board, int depth, int alpha, int beta, Player currentPlayer);
    void orderMoves(const Board& board, std::vector<Move>& moves, Player currentPlayer, const Move* ttBestMove = nullptr);
};
