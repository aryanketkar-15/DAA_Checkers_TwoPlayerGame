#pragma once

#include <cstdint>
#include <vector>
#include <string>
#include "Board.hpp"

/**
 * TranspositionTable.hpp - Dynamic Programming Memoization (C++)
 * 
 * ============================================================================
 * DYNAMIC PROGRAMMING FORMULATION:
 * ============================================================================
 * 1. Subproblem Overlap:
 *    Let State S = (Grid, Turn, Gravity). Multiple distinct move permutations
 *    m1, m2, ... lead to identical state S.
 *    Evaluating S repeatedly without caching costs O(b^d).
 * 
 * 2. Optimal Substructure:
 *    The exact value V(S, d) = max_{m} (-V(apply(S, m), d-1)).
 *    Once V(S, d) is computed, any subsequent visit to S at depth <= d
 *    reuses V(S, d) in O(1) time.
 * 
 * 3. Bound Storage:
 *    - EXACT: Alpha < Score < Beta (optimal value determined).
 *    - LOWERBOUND: Score >= Beta (Alpha-Beta Beta cutoff).
 *    - UPPERBOUND: Score <= Alpha (Alpha-Beta Alpha cutoff / fail low).
 * ============================================================================
 */

enum TTFlag : uint8_t {
    TT_EXACT = 0,
    TT_LOWERBOUND = 1,
    TT_UPPERBOUND = 2
};

struct TTEntry {
    uint64_t hash;
    int16_t score;
    int8_t depth;
    TTFlag flag;
    uint8_t age;
    int8_t fromRow, fromCol, toRow, toCol;
    bool hasMove;

    TTEntry() : hash(0), score(0), depth(-1), flag(TT_EXACT), age(0),
                fromRow(0), fromCol(0), toRow(0), toCol(0), hasMove(false) {}
};

struct TTMetrics {
    uint64_t lookups = 0;
    uint64_t hits = 0;
    uint64_t stores = 0;
    uint64_t cutoffs = 0;
    uint64_t overwrites = 0;
    size_t capacity = 0;
};

class TranspositionTable {
private:
    std::vector<TTEntry> table;
    size_t sizeMask;
    uint8_t currentAge;
    TTMetrics metrics;

public:
    explicit TranspositionTable(size_t numEntriesPowerOf2 = (1 << 20)); // ~1 Million entries

    void newSearch();
    void clear();
    void resetMetrics();

    bool lookup(uint64_t hash, int depth, int alpha, int beta, int& outScore, Move* outBestMove, bool& outCutoff);
    void store(uint64_t hash, int depth, int score, TTFlag flag, const Move* bestMove);

    TTMetrics getMetrics() const;
};
