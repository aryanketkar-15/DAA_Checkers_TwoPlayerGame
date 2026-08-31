#include "../include/Zobrist.hpp"

Zobrist::Zobrist() {
    // 64-bit Mersenne Twister for high-entropy deterministic / random keys
    std::mt19937_64 rng(0xDAA2026ULL);

    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            for (int i = 0; i < 4; ++i) {
                pieceTable[r][c][i] = rng();
            }
        }
    }

    turnKeys[0] = rng();
    turnKeys[1] = rng();

    gravityKeys[0] = rng();
    gravityKeys[1] = rng();
}

uint64_t Zobrist::computeFullHash(const Piece grid[8][8], Player turn, bool isGravityInverted) const {
    uint64_t hash = 0ULL;

    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            const Piece& p = grid[r][c];
            if (!p.isEmpty()) {
                int pIdx = getPieceIndex(p.player, p.type);
                hash ^= pieceTable[r][c][pIdx];
            }
        }
    }

    hash ^= (turn == PLAYER_1) ? turnKeys[0] : turnKeys[1];
    hash ^= isGravityInverted ? gravityKeys[1] : gravityKeys[0];

    return hash;
}
