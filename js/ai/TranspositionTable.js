/**
 * TranspositionTable.js - Dynamic Programming Memoization Cache
 * 
 * =========================================================================
 * DYNAMIC PROGRAMMING CONCEPTS IN GAME TREE SEARCH:
 * =========================================================================
 * 1. OVERLAPPING SUBPROBLEMS:
 *    In game trees, different sequences of moves often lead to identical board
 *    configurations (called "Transpositions"). E.g., Move sequence (A then B)
 *    leads to the same state as (B then A). Without memoization, standard Minimax
 *    will independently evaluate that identical subtree O(b^d) times!
 * 
 * 2. OPTIMAL SUBSTRUCTURE:
 *    The minimax value of a board state is uniquely determined by the optimal values
 *    of its descendant states. Once a position's value is computed at depth >= d,
 *    it is optimal and does not need to be recomputed for any search of depth <= d.
 * 
 * 3. MEMOIZATION (TRANSPOSITION TABLE):
 *    We cache the evaluated minimax value, the depth at which it was evaluated,
 *    and the bound type (EXACT, LOWERBOUND, or UPPERBOUND) indexed by its 64-bit
 *    Zobrist Hash key.
 * 
 * 4. BOUND TYPES:
 *    - FLAG_EXACT: The evaluation fell squarely between alpha and beta (true minimax value).
 *    - FLAG_LOWERBOUND: The evaluation caused a Beta cutoff (score >= beta).
 *    - FLAG_UPPERBOUND: All moves failed low (score <= alpha).
 * =========================================================================
 */

export const FLAG_EXACT = 0;
export const FLAG_LOWERBOUND = 1;
export const FLAG_UPPERBOUND = 2;

export class TranspositionEntry {
    /**
     * @param {bigint} hash - 64-bit Zobrist Hash
     * @param {number} depth - Search depth this evaluation was performed at
     * @param {number} score - Minimax evaluation score
     * @param {number} flag - FLAG_EXACT, FLAG_LOWERBOUND, or FLAG_UPPERBOUND
     * @param {object|null} bestMove - Best move found from this state
     * @param {number} age - Search generation
     */
    constructor(hash, depth, score, flag, bestMove = null, age = 0) {
        this.hash = hash;
        this.depth = depth;
        this.score = score;
        this.flag = flag;
        this.bestMove = bestMove;
        this.age = age;
    }
}

export class TranspositionTable {
    /**
     * @param {number} maxEntries - Maximum cache capacity
     */
    constructor(maxEntries = 200000) {
        this.maxEntries = maxEntries;
        this.table = new Map();
        this.age = 0;

        // Dynamic Programming Performance Metrics
        this.stats = {
            hits: 0,
            lookups: 0,
            stores: 0,
            cutoffs: 0,
            overwrites: 0
        };
    }

    /**
     * Increment search generation
     */
    newSearch() {
        this.age++;
    }

    /**
     * Clears all cached DP entries
     */
    clear() {
        this.table.clear();
        this.resetStats();
    }

    resetStats() {
        this.stats = {
            hits: 0,
            lookups: 0,
            stores: 0,
            cutoffs: 0,
            overwrites: 0
        };
    }

    /**
     * Retrieve memoized evaluation from DP Cache
     * @param {bigint} hash - 64-bit Zobrist Hash of the state
     * @param {number} depth - Current search depth remaining
     * @param {number} alpha - Current alpha bound
     * @param {number} beta - Current beta bound
     * @returns {{score: number, bestMove: object, cutoff: boolean}|null}
     */
    lookup(hash, depth, alpha, beta) {
        this.stats.lookups++;

        const entry = this.table.get(hash);
        if (!entry) {
            return null;
        }

        // Cache Hit!
        this.stats.hits++;

        // DP Subtree Depth Check:
        // A cached state is only valid for immediate score pruning if it was
        // evaluated at an EQUAL OR GREATER depth than the current search needs.
        if (entry.depth >= depth) {
            if (entry.flag === FLAG_EXACT) {
                this.stats.cutoffs++;
                return { score: entry.score, bestMove: entry.bestMove, cutoff: true };
            }
            if (entry.flag === FLAG_LOWERBOUND && entry.score >= beta) {
                this.stats.cutoffs++;
                return { score: entry.score, bestMove: entry.bestMove, cutoff: true };
            }
            if (entry.flag === FLAG_UPPERBOUND && entry.score <= alpha) {
                this.stats.cutoffs++;
                return { score: entry.score, bestMove: entry.bestMove, cutoff: true };
            }
        }

        // Even if depth is insufficient for an immediate score cutoff,
        // the cached bestMove is invaluable for Move Ordering!
        return { score: entry.score, bestMove: entry.bestMove, cutoff: false };
    }

    /**
     * Store state evaluation in DP Memoization Cache
     * @param {bigint} hash
     * @param {number} depth
     * @param {number} score
     * @param {number} flag
     * @param {object|null} bestMove
     */
    store(hash, depth, score, flag, bestMove = null) {
        this.stats.stores++;

        const existing = this.table.get(hash);

        // Replacement Strategy:
        // Replace if:
        // 1. Slot is empty, OR
        // 2. Existing entry is from an older search generation, OR
        // 3. New evaluation is deeper (more accurate)
        if (!existing || existing.age < this.age || depth >= existing.depth) {
            if (existing) {
                this.stats.overwrites++;
            }

            // Enforce max capacity to prevent memory leaks
            if (this.table.size >= this.maxEntries && !existing) {
                // Remove oldest element
                const firstKey = this.table.keys().next().value;
                this.table.delete(firstKey);
            }

            this.table.set(hash, new TranspositionEntry(hash, depth, score, flag, bestMove, this.age));
        }
    }

    /**
     * Returns live analytics for the HUD
     */
    getMetrics() {
        const hitRate = this.stats.lookups > 0 
            ? ((this.stats.hits / this.stats.lookups) * 100).toFixed(1) 
            : 0;

        return {
            size: this.table.size,
            lookups: this.stats.lookups,
            hits: this.stats.hits,
            cutoffs: this.stats.cutoffs,
            hitRate: `${hitRate}%`
        };
    }
}
