# Quantum Shift Checkers 🪐⚡
### Dynamic Programming AI Engine & Cyberpunk Arena

A tournament-grade Checkers (Draughts) game engine and visual arena powered by **Dynamic Programming**, **Minimax with Alpha-Beta Pruning**, **64-bit Zobrist Hashing**, **Retrograde Endgame Analysis**, and the custom **Polarity Shift 180° Inversion** mechanic.

---

## 🏗️ 1. Architecture Overview

The system is built with a dual-engine architecture:
1. **High-Performance C++20 DAA Engine** (`cpp/`): Native compiled binary (`quantum_checkers.exe`) for microsecond-speed search tree evaluations and benchmarking.
2. **Interactive Quantum Web Arena** (`index.html`, `js/`, `css/`): Real-time interactive UI with Canvas rendering, particle systems, audio synthesizer, and live Dynamic Programming HUD telemetry.

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                     |
|  - HTML5 Canvas Glowing Board & Particle Physics Engine                               |
|  - Holographic Sci-Fi HUD (Live DP Cache Hit Rate, Search Tree Pruning Telemetry)     |
|  - Mode Selector (PvP, PvC, AI vs AI), Depth Slider, Polarity Shift Button            |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                    GAME MANAGER                                       |
|  - Turn Arbitration & Move Validation (Mandatory captures, Multi-jump chains)         |
|  - Polarity Shift Manager (1x charge per player, reverses piece forward direction)    |
|  - Game Over Detection & State History                                                |
+---------------------+-------------------------------------+---------------------------+
                      |                                     |
                      v                                     v
+---------------------------------------+   +-------------------------------------------+
|             BOARD & PIECES            |   |               AI AGENT (PvC)              |
| - 8x8 Grid with Piece State & Kings   |   | - Iterative Deepening Minimax Search      |
| - Incremental Zobrist Hash Sync       |   | - Alpha-Beta Pruning with Move Ordering   |
| - Bitwise/Vector Move Generators      |   | - Polarity Shift Strategic Utility Check  |
+---------------------------------------+   +---------------------+---------------------+
                                                                  |
                     +--------------------------------------------+---------------------+
                     |                                                                  |
                     v                                                                  v
+-----------------------------------------------+   +-----------------------------------+
|       TRANSPOSITION TABLE (DP MEMOIZATION)    |   |     ENDGAME RETROGRADE SOLVER     |
| - Zobrist Hashing (64-bit XOR keys)           |   | - Exact W/L/D lookup for <= 4     |
| - Depth-aware node caching (EXACT/LOWER/UPPER)|   |   pieces remaining on board       |
| - Dynamic cache hit/pruning statistics        |   +-----------------------------------+
+-----------------------------------------------+
```

---

## 🧠 2. Dynamic Programming & DAA Implementation

### A. The Subproblem Overlap in Game Trees
In standard Checkers game trees, different permutations of moves reach the exact same board state (transpositions):
$$\text{State } S = \text{Move sequence } (A \to B) \equiv (B \to A)$$
Without memoization, Minimax blindly re-evaluates identical subtrees, scaling exponentially at $\mathcal{O}(b^d)$. By caching previously computed positions, we reduce redundant branch calculations to $\mathcal{O}(1)$ lookups.

### B. 64-Bit Zobrist Hashing
Each board state is converted into a 64-bit unsigned integer key using pre-generated pseudo-random bitstrings:
$$\text{Hash}(S) = \left( \bigoplus_{r=0}^7 \bigoplus_{c=0}^7 \text{Key}[r][c][\text{piece}] \right) \oplus \text{Key}[\text{turn}] \oplus \text{Key}[\text{polarity}]$$
When a piece moves or is captured, the hash is updated in $\mathcal{O}(1)$ time via bitwise XOR operations:
$$\text{Hash}_{\text{new}} = \text{Hash}_{\text{old}} \oplus \text{Key}[r_1][c_1][p] \oplus \text{Key}[r_2][c_2][p] \oplus \text{Key}[\text{turn}_1] \oplus \text{Key}[\text{turn}_2]$$

### C. Transposition Table Memoization & Cutoff Flags
The Transposition Table stores:
- **`FLAG_EXACT`**: Score falls strictly within $(\alpha, \beta)$, giving the exact minimax value.
- **`FLAG_LOWERBOUND`**: Score $\ge \beta$ (Beta cutoff / fail-high).
- **`FLAG_UPPERBOUND`**: Score $\le \alpha$ (Alpha cutoff / fail-low).
- **`Depth`**: Ensures a stored score is only used for score pruning if its evaluation depth $\ge$ current search depth.
- **`Best Move`**: Reused in subsequent iterations for Move Ordering, driving Alpha-Beta pruning near optimal $\mathcal{O}(b^{d/2})$ complexity.

---

## ⚡ 3. Tactical Mechanics: "Polarity Shift"

- **Mechanic**: Once per match, each player can trigger a **Polarity Shift**.
- **Effect**: Inverts the directional vector $180^\circ$ for all regular pieces:
  - Pieces that previously marched upwards now march downwards, and vice versa.
  - King promotion ranks dynamically swap ($Row\ 0 \leftrightarrow Row\ 7$).
  - Kings retain their omnidirectional mobility.
- **AI Evaluation**: The AI agent evaluates whether triggering Polarity Shift produces a net tactical gain (e.g. immediate promotions, trapping opposing pieces) before committing the charge.

---

## 🚀 4. How to Run

### Option 1: Native C++ Engine (CLI & Benchmark)
Compile with GCC/G++ or CMake:
```bash
# Compile using G++
g++ -std=c++20 -O3 -I cpp/include cpp/src/*.cpp -o quantum_checkers.exe

# Run interactive CLI & Benchmark
./quantum_checkers.exe
```

### Option 2: Interactive Web Arena (GUI)
Start a local HTTP server or open `index.html` in your browser:
```bash
# Using Python
python -m http.server 8085
# Then open http://localhost:8085 in your browser
```

---

## 🎮 5. Game Features

- **Modes**: Player vs Player (Hotseat), Player vs Computer (AI), AI vs AI demo.
- **Rules**: Standard 8x8 checkers, mandatory captures, consecutive multi-jump chains, king promotion.
- **Visuals**: Neon Cyberpunk glassmorphism, floating canvas board, glowing pieces, particle explosions on capture, holographic HUD.
- **Telemetry**: Real-time stats showing nodes searched, DP cache size, DP hit rate %, subtree cutoffs, and execution time in ms.
