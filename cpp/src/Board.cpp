#include "../include/Board.hpp"
#include <iomanip>

Zobrist Board::zobristEngine;

Board::Board() {
    reset();
}

void Board::reset() {
    isGravityInverted = false;
    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            if ((r + c) % 2 == 1) {
                if (r < 3) {
                    grid[r][c] = Piece(PLAYER_2, REGULAR, r, c);
                } else if (r > 4) {
                    grid[r][c] = Piece(PLAYER_1, REGULAR, r, c);
                } else {
                    grid[r][c] = Piece(NONE, EMPTY, r, c);
                }
            } else {
                grid[r][c] = Piece(NONE, EMPTY, r, c);
            }
        }
    }

    zobristHash = zobristEngine.computeFullHash(grid, PLAYER_1, isGravityInverted);
}

void Board::toggleGravity() {
    isGravityInverted = !isGravityInverted;
    zobristHash = zobristEngine.toggleGravity(zobristHash);
}

int Board::getForwardDirection(Player player) const {
    if (!isGravityInverted) {
        return (player == PLAYER_1) ? -1 : 1;
    } else {
        return (player == PLAYER_1) ? 1 : -1;
    }
}

int Board::getPromotionRow(Player player) const {
    return (getForwardDirection(player) == -1) ? 0 : 7;
}

bool Board::isValidCoord(int r, int c) const {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

const Piece& Board::getPiece(int r, int c) const {
    return grid[r][c];
}

std::vector<Move> Board::getLegalMoves(Player player) const {
    std::vector<Move> jumps;
    std::vector<Move> simpleMoves;

    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            const Piece& p = grid[r][c];
            if (!p.isEmpty() && p.player == player) {
                getJumpsForPiece(r, c, p, jumps);
                if (jumps.empty()) {
                    auto pieceSimple = getSimpleMovesForPiece(r, c, p);
                    simpleMoves.insert(simpleMoves.end(), pieceSimple.begin(), pieceSimple.end());
                }
            }
        }
    }

    // Mandatory Jump Rule: If captures exist, only jumps are valid
    if (!jumps.empty()) {
        return jumps;
    }
    return simpleMoves;
}

std::vector<Move> Board::getSimpleMovesForPiece(int r, int c, const Piece& piece) const {
    std::vector<Move> moves;
    std::vector<std::pair<int, int>> dirs;

    if (piece.isKing()) {
        dirs = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
    } else {
        int fwd = getForwardDirection(piece.player);
        dirs = {{fwd, -1}, {fwd, 1}};
    }

    int promoRow = getPromotionRow(piece.player);

    for (const auto& [dr, dc] : dirs) {
        int nr = r + dr;
        int nc = c + dc;
        if (isValidCoord(nr, nc) && grid[nr][nc].isEmpty()) {
            bool becameKing = !piece.isKing() && (nr == promoRow);
            moves.emplace_back(r, c, nr, nc, becameKing);
        }
    }

    return moves;
}

void Board::getJumpsForPiece(int startR, int startC, const Piece& piece, std::vector<Move>& outJumps) const {
    std::vector<CapturedPiece> capturedList;
    std::vector<std::pair<int, int>> pathCoords = {{startR, startC}};
    exploreJumps(startR, startC, startR, startC, piece.player, piece.type, capturedList, pathCoords, outJumps);
}

void Board::exploreJumps(int curR, int curC, int startR, int startC, Player player, PieceType curType,
                         std::vector<CapturedPiece>& capturedList,
                         std::vector<std::pair<int, int>>& pathCoords,
                         std::vector<Move>& outJumps) const {
    std::vector<std::pair<int, int>> dirs;
    if (curType == KING) {
        dirs = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
    } else {
        int fwd = getForwardDirection(player);
        dirs = {{fwd, -1}, {fwd, 1}};
    }

    bool foundFurtherJump = false;

    for (const auto& [dr, dc] : dirs) {
        int midR = curR + dr;
        int midC = curC + dc;
        int landR = curR + dr * 2;
        int landC = curC + dc * 2;

        if (isValidCoord(landR, landC)) {
            const Piece& midPiece = grid[midR][midC];
            const Piece& landPiece = grid[landR][landC];

            bool isLandEmpty = landPiece.isEmpty() || (landR == startR && landC == startC);

            bool notAlreadyCaptured = true;
            for (const auto& cap : capturedList) {
                if (cap.row == midR && cap.col == midC) {
                    notAlreadyCaptured = false;
                    break;
                }
            }

            if (isLandEmpty && !midPiece.isEmpty() && midPiece.player != player && notAlreadyCaptured) {
                foundFurtherJump = true;

                int promoRow = getPromotionRow(player);
                bool promotesHere = (curType != KING && landR == promoRow);
                PieceType nextType = promotesHere ? KING : curType;

                capturedList.push_back({midR, midC, midPiece.player, midPiece.type});
                pathCoords.push_back({landR, landC});

                exploreJumps(landR, landC, startR, startC, player, nextType, capturedList, pathCoords, outJumps);

                pathCoords.pop_back();
                capturedList.pop_back();
            }
        }
    }

    if (!foundFurtherJump && !capturedList.empty()) {
        int promoRow = getPromotionRow(player);
        bool becameKing = (curType != KING && curR == promoRow);
        Move m(startR, startC, curR, curC, becameKing);
        m.captured = capturedList;
        m.path = pathCoords;
        outJumps.push_back(m);
    }
}

void Board::applyMove(const Move& move) {
    Piece& p = grid[move.fromRow][move.fromCol];
    if (p.isEmpty()) return;

    Player pPlayer = p.player;
    PieceType pType = p.type;

    // Toggle piece off from old square
    zobristHash = zobristEngine.togglePiece(zobristHash, move.fromRow, move.fromCol, pPlayer, pType);
    grid[move.fromRow][move.fromCol] = Piece(NONE, EMPTY, move.fromRow, move.fromCol);

    // Remove captured pieces from board and hash
    for (const auto& cap : move.captured) {
        zobristHash = zobristEngine.togglePiece(zobristHash, cap.row, cap.col, cap.player, cap.type);
        grid[cap.row][cap.col] = Piece(NONE, EMPTY, cap.row, cap.col);
    }

    // King promotion check
    if (move.becameKing) {
        pType = KING;
    }

    // Place at new square and update hash
    zobristHash = zobristEngine.togglePiece(zobristHash, move.toRow, move.toCol, pPlayer, pType);
    grid[move.toRow][move.toCol] = Piece(pPlayer, pType, move.toRow, move.toCol);

    // Toggle turn in hash
    zobristHash = zobristEngine.toggleTurn(zobristHash);
}

BoardStats Board::getStats() const {
    BoardStats stats;
    for (int r = 0; r < 8; ++r) {
        for (int c = 0; c < 8; ++c) {
            const Piece& p = grid[r][c];
            if (p.isEmpty()) continue;

            if (p.player == PLAYER_1) {
                stats.p1Count++;
                if (p.isKing()) stats.p1Kings++;
                if (r == 7) stats.p1BackRow++;
                if ((r == 3 || r == 4) && (c >= 2 && c <= 5)) stats.p1Center++;
            } else if (p.player == PLAYER_2) {
                stats.p2Count++;
                if (p.isKing()) stats.p2Kings++;
                if (r == 0) stats.p2BackRow++;
                if ((r == 3 || r == 4) && (c >= 2 && c <= 5)) stats.p2Center++;
            }
        }
    }
    stats.totalPieces = stats.p1Count + stats.p2Count;
    return stats;
}

void Board::displayBoard() const {
    std::cout << "\n    0   1   2   3   4   5   6   7\n";
    std::cout << "  +---+---+---+---+---+---+---+---+\n";
    for (int r = 0; r < 8; ++r) {
        std::cout << r << " |";
        for (int c = 0; c < 8; ++c) {
            const Piece& p = grid[r][c];
            if (p.isEmpty()) {
                if ((r + c) % 2 == 1) {
                    std::cout << " . |"; // Dark square
                } else {
                    std::cout << "   |"; // Light square
                }
            } else {
                if (p.player == PLAYER_1) {
                    std::cout << (p.isKing() ? " C*|" : " C |"); // Cyan
                } else {
                    std::cout << (p.isKing() ? " M*|" : " M |"); // Magenta
                }
            }
        }
        std::cout << " " << r << "\n  +---+---+---+---+---+---+---+---+\n";
    }
    std::cout << "    0   1   2   3   4   5   6   7\n";
    std::cout << "Gravity State: " << (isGravityInverted ? "[INVERTED 180 DEG]" : "[NORMAL]") << "\n";
    std::cout << "Zobrist Hash : 0x" << std::hex << zobristHash << std::dec << "\n\n";
}
