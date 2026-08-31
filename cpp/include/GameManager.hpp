#pragma once

#include "Board.hpp"
#include "AIAgent.hpp"

enum GameMode {
    PVP = 1, // Player vs Player (Hotseat)
    PVC = 2, // Player vs Computer (AI)
    CVC = 3  // Computer vs Computer
};

enum GameStatus {
    IN_PROGRESS = 0,
    PLAYER_1_WON = 1,
    PLAYER_2_WON = 2,
    DRAW = 3
};

class GameManager {
public:
    Board board;
    GameMode mode;
    Player currentTurn;
    GameStatus status;
    AIAgent aiAgent;

    bool p1GravityUsed;
    bool p2GravityUsed;

    int moveCount;
    std::vector<Move> moveHistory;

    GameManager(GameMode m = PVC, int aiDifficulty = 7);

    void resetGame();
    bool triggerGravityShift(Player player);
    bool makeHumanMove(int fromR, int fromC, int toR, int toC);
    bool stepAIMove();
    void checkGameOver();
    bool isCurrentPlayerAI() const;
};
