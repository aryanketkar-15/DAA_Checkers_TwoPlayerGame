#include "../include/GameManager.hpp"
#include <iostream>

GameManager::GameManager(GameMode m, int aiDifficulty)
    : mode(m), currentTurn(PLAYER_1), status(IN_PROGRESS),
      aiAgent(PLAYER_2, aiDifficulty), p1GravityUsed(false), p2GravityUsed(false), moveCount(0) {
    board.reset();
}

void GameManager::resetGame() {
    board.reset();
    currentTurn = PLAYER_1;
    status = IN_PROGRESS;
    p1GravityUsed = false;
    p2GravityUsed = false;
    moveCount = 0;
    moveHistory.clear();
    aiAgent.transpositionTable.clear();
}

bool GameManager::triggerGravityShift(Player player) {
    if (player != currentTurn || status != IN_PROGRESS) {
        return false;
    }

    if (player == PLAYER_1 && p1GravityUsed) return false;
    if (player == PLAYER_2 && p2GravityUsed) return false;

    board.toggleGravity();

    if (player == PLAYER_1) p1GravityUsed = true;
    else p2GravityUsed = true;

    // After gravity shift, check if current player still has legal moves
    checkGameOver();
    return true;
}

bool GameManager::makeHumanMove(int fromR, int fromC, int toR, int toC) {
    if (status != IN_PROGRESS) return false;
    if (isCurrentPlayerAI()) return false;

    auto legalMoves = board.getLegalMoves(currentTurn);
    for (const auto& m : legalMoves) {
        if (m.fromRow == fromR && m.fromCol == fromC && m.toRow == toR && m.toCol == toC) {
            board.applyMove(m);
            moveHistory.push_back(m);
            moveCount++;

            currentTurn = (currentTurn == PLAYER_1) ? PLAYER_2 : PLAYER_1;
            checkGameOver();
            return true;
        }
    }

    return false;
}

bool GameManager::stepAIMove() {
    if (status != IN_PROGRESS || !isCurrentPlayerAI()) return false;

    bool canShift = (currentTurn == PLAYER_1 && !p1GravityUsed) || (currentTurn == PLAYER_2 && !p2GravityUsed);
    aiAgent.player = currentTurn;

    AIResult res = aiAgent.findBestMove(board, canShift);

    if (res.shouldShiftGravity) {
        std::cout << "\n>>> [AI TRIGGERED GRAVITY SHIFT! 180 DEG INVERSION] <<<\n";
        triggerGravityShift(currentTurn);
        // Re-evaluate move after shift
        res = aiAgent.findBestMove(board, false);
    }

    if (!res.hasMove) {
        checkGameOver();
        return false;
    }

    board.applyMove(res.bestMove);
    moveHistory.push_back(res.bestMove);
    moveCount++;

    currentTurn = (currentTurn == PLAYER_1) ? PLAYER_2 : PLAYER_1;
    checkGameOver();
    return true;
}

void GameManager::checkGameOver() {
    auto legalMoves = board.getLegalMoves(currentTurn);
    if (legalMoves.empty()) {
        status = (currentTurn == PLAYER_1) ? PLAYER_2_WON : PLAYER_1_WON;
    } else if (moveCount > 200) {
        status = DRAW;
    }
}

bool GameManager::isCurrentPlayerAI() const {
    if (mode == PVP) return false;
    if (mode == PVC) return currentTurn == PLAYER_2;
    if (mode == CVC) return true;
    return false;
}
