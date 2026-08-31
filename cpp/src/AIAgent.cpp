#include "../include/AIAgent.hpp"
#include "../include/Evaluator.hpp"
#include "../include/EndgameTablebase.hpp"
#include <algorithm>
#include <cmath>

static constexpr int INF_SCORE = 1000000;

AIAgent::AIAgent(Player p, int defaultDepth)
    : player(p), targetDepth(defaultDepth), transpositionTable(1 << 20) {
    resetMetrics();
}

void AIAgent::setDifficulty(int depth) {
    targetDepth = std::max(1, std::min(16, depth));
}

void AIAgent::resetMetrics() {
    metrics.nodesEvaluated = 0;
    metrics.searchTimeMs = 0;
    metrics.depthReached = 0;
    metrics.ttHits = 0;
    metrics.ttCutoffs = 0;
    metrics.branchesPruned = 0;
}

AIResult AIAgent::findBestMove(Board& board, bool canShiftGravity) {
    resetMetrics();
    transpositionTable.newSearch();

    auto startTime = std::chrono::high_resolution_clock::now();

    AIResult result;
    auto legalMoves = board.getLegalMoves(player);

    if (legalMoves.empty()) {
        result.hasMove = false;
        return result;
    }

    result.hasMove = true;
    result.bestMove = legalMoves[0];

    // If forced single jump, execute immediately
    if (legalMoves.size() == 1 && !canShiftGravity) {
        metrics.nodesEvaluated = 1;
        metrics.depthReached = 1;
        auto endTime = std::chrono::high_resolution_clock::now();
        metrics.searchTimeMs = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();
        return result;
    }

    Player opponent = (player == PLAYER_1) ? PLAYER_2 : PLAYER_1;
    Move globalBestMove = legalMoves[0];
    int globalBestScore = -INF_SCORE;

    // =========================================================================
    // DYNAMIC PROGRAMMING ITERATIVE DEEPENING LOOP
    // =========================================================================
    for (int d = 1; d <= targetDepth; ++d) {
        metrics.depthReached = d;

        int currentBestScore = -INF_SCORE;
        Move currentBestMove = legalMoves[0];
        int alpha = -INF_SCORE;
        int beta = INF_SCORE;

        orderMoves(board, legalMoves, player, (d > 1) ? &globalBestMove : nullptr);

        for (const auto& move : legalMoves) {
            Board nextBoard = board;
            nextBoard.applyMove(move);

            // Minimax Negamax recursion
            int score = -minimax(nextBoard, d - 1, -beta, -alpha, opponent);

            if (score > currentBestScore) {
                currentBestScore = score;
                currentBestMove = move;
            }

            if (score > alpha) {
                alpha = score;
            }
        }

        globalBestMove = currentBestMove;
        globalBestScore = currentBestScore;

        // Forced win found -> stop early
        if (globalBestScore >= 90000) {
            break;
        }
    }

    result.bestMove = globalBestMove;
    result.evalScore = globalBestScore;

    // =========================================================================
    // GRAVITY SHIFT STRATEGIC EVALUATION
    // =========================================================================
    if (canShiftGravity) {
        Board flippedBoard = board;
        flippedBoard.toggleGravity();
        auto flippedMoves = flippedBoard.getLegalMoves(player);

        if (!flippedMoves.empty()) {
            int flippedScore = minimax(flippedBoard, std::min(4, targetDepth), -INF_SCORE, INF_SCORE, player);
            // Trigger gravity shift if advantage jumps by +250 points
            if (flippedScore > globalBestScore + 250) {
                result.shouldShiftGravity = true;
            }
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    metrics.searchTimeMs = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();

    TTMetrics ttStats = transpositionTable.getMetrics();
    metrics.ttHits = ttStats.hits;
    metrics.ttCutoffs = ttStats.cutoffs;

    return result;
}

int AIAgent::minimax(Board& board, int depth, int alpha, int beta, Player currentPlayer) {
    metrics.nodesEvaluated++;
    int originalAlpha = alpha;
    uint64_t hash = board.zobristHash;

    // =========================================================================
    // 1. DYNAMIC PROGRAMMING TRANSPOSITION TABLE LOOKUP
    // =========================================================================
    int memoScore = 0;
    Move ttBestMove;
    bool ttCutoff = false;

    if (transpositionTable.lookup(hash, depth, alpha, beta, memoScore, &ttBestMove, ttCutoff)) {
        if (ttCutoff) {
            // Instant Dynamic Programming Subtree Pruning!
            return memoScore;
        }
    }

    // =========================================================================
    // 2. TERMINAL CHECKS & BASE CASES
    // =========================================================================
    auto legalMoves = board.getLegalMoves(currentPlayer);
    if (legalMoves.empty()) {
        return -100000 + (targetDepth - depth); // Prefer faster wins
    }

    int endgameScore = 0;
    if (EndgameTablebase::probe(board, currentPlayer, endgameScore)) {
        return endgameScore;
    }

    if (depth == 0) {
        return Evaluator::evaluate(board, currentPlayer);
    }

    // =========================================================================
    // 3. MOVE ORDERING
    // =========================================================================
    orderMoves(board, legalMoves, currentPlayer, ttBestMove.fromRow != ttBestMove.toRow ? &ttBestMove : nullptr);

    int bestScore = -INF_SCORE;
    Move bestMove = legalMoves[0];
    Player opponent = (currentPlayer == PLAYER_1) ? PLAYER_2 : PLAYER_1;

    // =========================================================================
    // 4. NEGAMAX RECURSION
    // =========================================================================
    for (const auto& move : legalMoves) {
        Board nextBoard = board;
        nextBoard.applyMove(move);

        int score = -minimax(nextBoard, depth - 1, -beta, -alpha, opponent);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }

        if (score > alpha) {
            alpha = score;
        }

        // Alpha-Beta Pruning
        if (alpha >= beta) {
            metrics.branchesPruned++;
            break;
        }
    }

    // =========================================================================
    // 5. DYNAMIC PROGRAMMING TRANSPOSITION TABLE STORE
    // =========================================================================
    TTFlag flag = TT_EXACT;
    if (bestScore <= originalAlpha) {
        flag = TT_UPPERBOUND;
    } else if (bestScore >= beta) {
        flag = TT_LOWERBOUND;
    }

    transpositionTable.store(hash, depth, bestScore, flag, &bestMove);

    return bestScore;
}

void AIAgent::orderMoves(const Board& board, std::vector<Move>& moves, Player currentPlayer, const Move* ttBestMove) {
    std::stable_sort(moves.begin(), moves.end(), [ttBestMove](const Move& a, const Move& b) {
        // 1. TT Best Move gets top priority
        if (ttBestMove) {
            bool aIsTT = (a.fromRow == ttBestMove->fromRow && a.fromCol == ttBestMove->fromCol &&
                          a.toRow == ttBestMove->toRow && a.toCol == ttBestMove->toCol);
            bool bIsTT = (b.fromRow == ttBestMove->fromRow && b.fromCol == ttBestMove->fromCol &&
                          b.toRow == ttBestMove->toRow && b.toCol == ttBestMove->toCol);
            if (aIsTT && !bIsTT) return true;
            if (!aIsTT && bIsTT) return false;
        }

        // 2. Multi-jump captures count
        size_t aCaps = a.captured.size();
        size_t bCaps = b.captured.size();
        if (aCaps != bCaps) {
            return aCaps > bCaps;
        }

        // 3. Promotion priority
        if (a.becameKing && !b.becameKing) return true;
        if (!a.becameKing && b.becameKing) return false;

        // 4. Center proximity
        double aDist = std::abs(3.5 - a.toRow) + std::abs(3.5 - a.toCol);
        double bDist = std::abs(3.5 - b.toRow) + std::abs(3.5 - b.toCol);
        return aDist < bDist;
    });
}
