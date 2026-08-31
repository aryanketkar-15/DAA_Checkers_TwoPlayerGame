#include "../include/TranspositionTable.hpp"

TranspositionTable::TranspositionTable(size_t numEntriesPowerOf2)
    : currentAge(0) {
    // Ensure size is power of 2 for ultra-fast bitwise AND masking
    size_t size = 1;
    while (size < numEntriesPowerOf2) {
        size <<= 1;
    }
    table.resize(size);
    sizeMask = size - 1;
    metrics.capacity = size;
}

void TranspositionTable::newSearch() {
    currentAge++;
}

void TranspositionTable::clear() {
    std::fill(table.begin(), table.end(), TTEntry());
    resetMetrics();
}

void TranspositionTable::resetMetrics() {
    metrics.lookups = 0;
    metrics.hits = 0;
    metrics.stores = 0;
    metrics.cutoffs = 0;
    metrics.overwrites = 0;
}

bool TranspositionTable::lookup(uint64_t hash, int depth, int alpha, int beta,
                                int& outScore, Move* outBestMove, bool& outCutoff) {
    metrics.lookups++;
    outCutoff = false;

    size_t index = hash & sizeMask;
    const TTEntry& entry = table[index];

    // Check if the slot matches this exact board hash
    if (entry.hash != hash) {
        return false;
    }

    metrics.hits++;

    if (entry.hasMove && outBestMove) {
        outBestMove->fromRow = entry.fromRow;
        outBestMove->fromCol = entry.fromCol;
        outBestMove->toRow = entry.toRow;
        outBestMove->toCol = entry.toCol;
    }

    // Dynamic Programming Memoization Depth Check:
    // If this subproblem was previously solved to at least the required depth,
    // we can use its memoized bound or exact value directly!
    if (entry.depth >= depth) {
        if (entry.flag == TT_EXACT) {
            outScore = entry.score;
            outCutoff = true;
            metrics.cutoffs++;
            return true;
        }
        if (entry.flag == TT_LOWERBOUND && entry.score >= beta) {
            outScore = entry.score;
            outCutoff = true;
            metrics.cutoffs++;
            return true;
        }
        if (entry.flag == TT_UPPERBOUND && entry.score <= alpha) {
            outScore = entry.score;
            outCutoff = true;
            metrics.cutoffs++;
            return true;
        }
    }

    outScore = entry.score;
    return true;
}

void TranspositionTable::store(uint64_t hash, int depth, int score, TTFlag flag, const Move* bestMove) {
    metrics.stores++;

    size_t index = hash & sizeMask;
    TTEntry& entry = table[index];

    // Replacement Policy:
    // Replace if:
    // 1. Slot has different hash / empty, OR
    // 2. Existing entry is from an older generation, OR
    // 3. New evaluation is deeper (higher quality minimax bound)
    if (entry.hash != hash || entry.age != currentAge || depth >= entry.depth) {
        if (entry.hash != 0) {
            metrics.overwrites++;
        }

        entry.hash = hash;
        entry.score = static_cast<int16_t>(score);
        entry.depth = static_cast<int8_t>(depth);
        entry.flag = flag;
        entry.age = currentAge;

        if (bestMove) {
            entry.fromRow = static_cast<int8_t>(bestMove->fromRow);
            entry.fromCol = static_cast<int8_t>(bestMove->fromCol);
            entry.toRow = static_cast<int8_t>(bestMove->toRow);
            entry.toCol = static_cast<int8_t>(bestMove->toCol);
            entry.hasMove = true;
        } else {
            entry.hasMove = false;
        }
    }
}

TTMetrics TranspositionTable::getMetrics() const {
    return metrics;
}
