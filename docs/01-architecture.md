# Architecture & Core Modules

This section outlines the design and the main modules of the platform.

## High-level design

- Frontend: React + TypeScript (folder `frontend/`) handles UI, WebSocket connections, and user interactions.
- Backend: FastAPI application (folder `backend/src/`) exposes REST APIs and WebSocket endpoints, manages game sessions, and runs game logic.
- Games: Each game is implemented as a `GameLogic` subclass under `backend/games/` and must implement a small interface for actions, state updates, and scoring.
- Agents: AI agents live under `backend/agents/` and implement an `AIAgent` interface. Agents can be simple rule-based or wire to an LLM.

## Core backend modules (what to look at first)

- `backend/src/main.py` — App entrypoint. Registers routers and middleware.
- `backend/src/api/` — REST and WebSocket endpoint definitions (game management and real-time messages).
- `backend/src/services/game_session.py` — Central session manager orchestrating players, rounds, timers, action collection, and broadcasting updates.
- `backend/src/services/websocket_manager.py` — Low-level WebSocket connections manager (send/receive and keep track of connected clients).
- `backend/games/base.py` — Abstract `GameLogic` class that games must extend.
- `backend/games/security_game.py` — Example game implementation (the security defense game used by the demo config).
- `backend/agents/base.py` — Abstract `AIAgent` class for building AI players.
- `backend/agents/simple_agent.py` and `backend/agents/openai_agent.py` — Example agents.
- `backend/config/default.json` — Default configuration that controls which game module is loaded and gameplay parameters.

## Key data models

- `backend/src/models/core.py` — GameState, GameConfig, GameEvent, EventType, GamePhase and related core types.
- `backend/src/models/player.py` — Player, ActionData, RoundResult, GameSummary models and player-related utilities.

These models are used frequently by `GameSession`, `GameLogic`, and `AIAgent` implementations.

## How components interact (runtime flow)

1. REST endpoints create a GameSession and accept players (human or AI) joining a session.
2. When game start conditions are met, `GameSession.start_game()` initializes state via the loaded `GameLogic`.
3. Each round: `GameSession` sets a deadline, collects actions via `submit_action`, triggers AI agents, and runs a timer.
4. When a round completes (all actions or timeout), `GameSession._process_round()` calls `GameLogic.process_round()` to compute payoffs and `update_game_state()` to mutate shared state.
5. The session broadcasts events to all connected clients using `websocket_manager`, with `GameLogic.get_visible_state()` providing per-player view.

## Extensibility points

- Add new games under `backend/games/` by implementing `GameLogic` methods.
- Add new AI agents under `backend/agents/` by implementing `AIAgent`.
- Adjust configs in `backend/config/` or create new config files in `backend/config/game_configs/` and point `GameSession` to them.

