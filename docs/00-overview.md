# Overview — What the system can and cannot do

## What the system can do

- Host turn-based or simultaneous-action multiplayer games with a FastAPI backend and a React frontend.
- Run configurable games defined by pluggable `GameLogic` modules under `backend/games/`.
- Support human players and AI agents (rule-based and LLM-based agents) under `backend/agents/`.
- Provide WebSocket-based real-time updates and personalized views for players.
- Manage game state, round timing, action validation, action processing, scoring, and end-of-game summaries.
- Dynamically load game logic and agents at runtime via configuration files (JSON).
- Provide REST endpoints for game management and a WebSocket endpoint for real-time communication.

## What the system cannot (yet) do

- Persist games and player data to a database (game state lives in memory). If the server restarts, running games are lost.
- Provide advanced matchmaking, authentication, or authorization out-of-the-box (only minimal player identification is present).
- Guarantee hard real-time strictness — the system uses asyncio tasks and Python timers with best-effort semantics.
- Scale automatically across multiple server instances (no distributed state coordinator implemented).
- Offer production-grade security for WebSocket tokens, CORS origins, or secrets management. Review and harden before production deployment.

## Recommended uses

- Research and prototyping of game theory and security-game scenarios.
- Teaching and demonstration of multi-agent interactions and reward mechanics.
- Rapid experimentation where in-memory state and simple AI agents are acceptable.

## Not recommended for production without modification

- Persistent multiplayer experiences across server restarts.
- High-throughput, low-latency competitive gaming requiring horizontal scaling and strict anti-cheat guarantees.

