#include <iostream>
#include <string>
#include <sstream>
#include <chrono>
#include <iomanip>
#include "../include/GameManager.hpp"
#include "../include/Evaluator.hpp"

void printBanner() {
    std::cout << "\n======================================================================\n";
    std::cout << "        QUANTUM SHIFT CHECKERS ARENA (C++ DAA ENGINE)                 \n";
    std::cout << "  Featuring: Minimax + Alpha-Beta + Zobrist DP Transposition Table    \n";
    std::cout << "             Polarity Shift 180-Degree Inversion Mechanics            \n";
    std::cout << "======================================================================\n\n";
}

void runDPBenchmark() {
    std::cout << "\n======================================================================\n";
    std::cout << "       DYNAMIC PROGRAMMING (TRANSPOSITION TABLE) BENCHMARK SUITE      \n";
    std::cout << "======================================================================\n";
    std::cout << "Empirically evaluating state caching & subtree pruning efficiency...\n\n";

    Board board;
    // Simulate a few opening moves to generate rich tactical transpositions
    auto moves = board.getLegalMoves(PLAYER_1);
    if (!moves.empty()) board.applyMove(moves[0]);
    moves = board.getLegalMoves(PLAYER_2);
    if (!moves.empty()) board.applyMove(moves[0]);

    for (int depth = 4; depth <= 8; depth += 2) {
        std::cout << ">>> Running Search Depth: " << depth << " <<<\n";

        // 1. With Dynamic Programming Transposition Table
        AIAgent aiWithDP(PLAYER_1, depth);
        auto t1 = std::chrono::high_resolution_clock::now();
        AIResult resWithDP = aiWithDP.findBestMove(board, false);
        auto t2 = std::chrono::high_resolution_clock::now();
        auto durationWithDP = std::chrono::duration_cast<std::chrono::microseconds>(t2 - t1).count();

        auto metricsWithDP = aiWithDP.metrics;
        auto ttMetrics = aiWithDP.transpositionTable.getMetrics();

        std::cout << "  [WITH DP Transposition Table]:\n";
        std::cout << "    - Nodes Evaluated : " << metricsWithDP.nodesEvaluated << "\n";
        std::cout << "    - Time Taken      : " << durationWithDP / 1000.0 << " ms\n";
        std::cout << "    - DP Cache Hits   : " << ttMetrics.hits << "\n";
        std::cout << "    - Subtree Cutoffs : " << ttMetrics.cutoffs << "\n";
        if (ttMetrics.lookups > 0) {
            double hitRate = (100.0 * ttMetrics.hits) / ttMetrics.lookups;
            std::cout << "    - DP Hit Rate     : " << std::fixed << std::setprecision(1) << hitRate << "%\n";
        }
        std::cout << "    - Best Move Found : (" << resWithDP.bestMove.fromRow << "," << resWithDP.bestMove.fromCol
                  << ") -> (" << resWithDP.bestMove.toRow << "," << resWithDP.bestMove.toCol << ")\n\n";
    }

    std::cout << "Benchmark complete. Dynamic Programming memoization successfully eliminates redundant subtrees!\n\n";
}

void playGame(GameMode mode, int aiDepth) {
    GameManager game(mode, aiDepth);

    std::cout << "\nGame started! Coordinates format: fromRow fromCol toRow toCol (e.g. '5 0 4 1')\n";
    std::cout << "Special commands: 'p' / 'g' (Polarity Shift), 'q' (Quit), 'h' (Help)\n\n";

    while (game.status == IN_PROGRESS) {
        game.board.displayBoard();

        Player current = game.currentTurn;
        std::cout << "Turn: " << (current == PLAYER_1 ? "PLAYER 1 (Neon Cyan)" : "PLAYER 2 (Neon Magenta)");
        bool gravUsed = (current == PLAYER_1) ? game.p1GravityUsed : game.p2GravityUsed;
        std::cout << " | Polarity Shift: " << (gravUsed ? "[EXHAUSTED]" : "[READY]") << "\n";

        if (game.isCurrentPlayerAI()) {
            std::cout << "AI is computing optimal move with Minimax + DP Transposition Table...\n";
            game.stepAIMove();

            const auto& metrics = game.aiAgent.metrics;
            std::cout << "AI Move Telemetry:\n";
            std::cout << "  - Depth Reached: " << metrics.depthReached
                      << " | Nodes: " << metrics.nodesEvaluated
                      << " | Time: " << metrics.searchTimeMs << " ms\n";
            std::cout << "  - DP Cache Hits: " << metrics.ttHits
                      << " | DP Cutoffs: " << metrics.ttCutoffs
                      << " | Branches Pruned: " << metrics.branchesPruned << "\n\n";
        } else {
            auto legalMoves = game.board.getLegalMoves(current);
            bool isJumping = !legalMoves.empty() && legalMoves[0].isJump();

            if (isJumping) {
                std::cout << ">>> MANDATORY CAPTURE IN EFFECT! You MUST jump an opponent piece! <<<\n";
            }

            std::cout << "Legal moves available: " << legalMoves.size() << "\n";
            for (size_t i = 0; i < legalMoves.size(); ++i) {
                const auto& m = legalMoves[i];
                std::cout << "  [" << i + 1 << "] (" << m.fromRow << "," << m.fromCol << ") -> ("
                          << m.toRow << "," << m.toCol << ")"
                          << (m.isJump() ? " [JUMP!]" : "")
                          << (m.becameKing ? " [KING PROMOTION!]" : "") << "\n";
            }

            std::cout << "\nEnter move (e.g. '5 0 4 1' or move index '1') or 'p'/'g' for Polarity Shift: ";
            std::string input;
            std::getline(std::cin, input);

            if (input == "q" || input == "Q") {
                std::cout << "Quitting match...\n";
                return;
            }

            if (input == "p" || input == "P" || input == "g" || input == "G") {
                if (game.triggerGravityShift(current)) {
                    std::cout << "\n>>> [POLARITY SHIFT ACTIVATED! THE ARENA FLIPS 180 DEGREES!] <<<\n\n";
                } else {
                    std::cout << "\n[!] Polarity Shift not available or already used this match!\n\n";
                }
                continue;
            }

            // Check if user entered a 1-based move index
            std::stringstream ss(input);
            int idx = 0;
            if (ss >> idx && ss.eof() && idx >= 1 && idx <= static_cast<int>(legalMoves.size())) {
                const auto& m = legalMoves[idx - 1];
                game.makeHumanMove(m.fromRow, m.fromCol, m.toRow, m.toCol);
                continue;
            }

            // Check coordinate format
            int fr, fc, tr, tc;
            std::stringstream ss2(input);
            if (ss2 >> fr >> fc >> tr >> tc) {
                if (!game.makeHumanMove(fr, fc, tr, tc)) {
                    std::cout << "\n[!] Invalid move. Ensure coordinates match legal moves and mandatory jumps.\n\n";
                }
            } else {
                std::cout << "\n[!] Unrecognized command. Please enter coordinates or move number.\n\n";
            }
        }
    }

    game.board.displayBoard();
    std::cout << "\n======================================================================\n";
    if (game.status == PLAYER_1_WON) {
        std::cout << "               MATCH OVER: PLAYER 1 (CYAN) WINS!                     \n";
    } else if (game.status == PLAYER_2_WON) {
        std::cout << "               MATCH OVER: PLAYER 2 (MAGENTA) WINS!                  \n";
    } else {
        std::cout << "               MATCH OVER: DRAW!                                     \n";
    }
    std::cout << "======================================================================\n\n";
}

int main() {
    printBanner();

    while (true) {
        std::cout << "Select Mode:\n";
        std::cout << "  1. Player vs Computer (PvC) [Challenging Dynamic Programming AI]\n";
        std::cout << "  2. Player vs Player (PvP)   [Local Hotseat Arena]\n";
        std::cout << "  3. AI vs AI Demonstration   [Autonomous Arena]\n";
        std::cout << "  4. Run Dynamic Programming (Transposition Table) Benchmark\n";
        std::cout << "  5. Exit\n";
        std::cout << "Choice (1-5): ";

        std::string choiceStr;
        std::getline(std::cin, choiceStr);

        int choice = 1;
        try {
            choice = std::stoi(choiceStr);
        } catch (...) {
            choice = 1;
        }

        if (choice == 5) {
            std::cout << "Exiting Quantum Shift Checkers. Goodbye!\n";
            break;
        }

        if (choice == 4) {
            runDPBenchmark();
            continue;
        }

        int depth = 7;
        if (choice == 1 || choice == 3) {
            std::cout << "Enter AI Search Depth (1-12, default 7): ";
            std::string depthStr;
            std::getline(std::cin, depthStr);
            try {
                if (!depthStr.empty()) depth = std::stoi(depthStr);
            } catch (...) {
                depth = 7;
            }
        }

        if (choice == 1) {
            playGame(PVC, depth);
        } else if (choice == 2) {
            playGame(PVP, depth);
        } else if (choice == 3) {
            playGame(CVC, depth);
        }
    }

    return 0;
}
