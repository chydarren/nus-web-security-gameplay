# Game Lifecycle & Game Logic

This document explains the lifecycle of a game session and the responsibilities of `GameLogic` implementations.

## Game lifecycle overview (states)

The platform uses a small state machine (see `GamePhase` in `backend/src/models/core.py`). Typical phases:

- WAITING_FOR_PLAYERS — The session is open for players to join.
- ROUND_START — A new round is being started (session transitions to AWAITING_ACTIONS).
- AWAITING_ACTIONS — Players (and AI agents) can submit their actions.
- PROCESSING_ACTIONS — The platform is processing submitted actions and computing payoffs.
- GAME_END — The game finished and results are available.

## High-level sequence of events

1. Creation: A GameSession is created (usually via REST API) and configured by a JSON config.
2. Joining: Players (human or AI) join the session via `GameSession.add_player` and `add_ai_agent`.
3. Start: `GameSession.start_game()` validates player counts and invokes the chosen `GameLogic.initialize_game_state()`.
4. Round loop:
   - `_start_round()` sets the phase to `AWAITING_ACTIONS`, sets a deadline, and notifies clients.
   - Players submit actions using `submit_action()` (the session validates actions via `GameLogic.validate_action()`).
   - The session triggers AI agents (`_trigger_ai_agents`) to obtain their actions asynchronously.
   - Once all required actions are collected or the round timer expires, `_process_round()` calls `GameLogic.process_round()` to compute `RoundResult` and updates player scores.
   - `GameLogic.update_game_state()` is invoked to mutate shared state and advance internal variables (like attack probability).
   - The session notifies players of round results and either starts the next round or calls `_end_game()`.
5. Ending: `_end_game()` sets `GAME_END`, computes final scores using `GameLogic.calculate_final_scores()`, records events, and broadcasts final results.

## Responsibilities of GameLogic implementations

Any new game must implement the abstract `GameLogic` methods in `backend/games/base.py`:

- get_available_roles() -> List[str]
- initialize_game_state(game_state, players) -> GameState
- validate_action(action, action_data, player, game_state) -> bool
- get_available_actions(player, game_state) -> List[str]
- process_round(actions, game_state, players) -> RoundResult
- update_game_state(game_state, round_result, players) -> GameState
- get_next_turn_role(game_state) -> Optional[str]
- get_visible_state(game_state, player) -> Dict[str, Any]
- is_game_finished(game_state, players) -> bool
- calculate_final_scores(game_state, players) -> Dict[str, float]

Notes:
- process_round must return a `RoundResult` containing at least `payoffs` and `round_summary`.
- get_visible_state controls per-player observability. Use it to hide private information (e.g., other players' secret resources).

## How visibility and personalization works

`GameSession._broadcast_update()` calls `_personalize_message()` for each player. When building messages for `ROUND_STARTED` and `GAME_STARTED`, the session attaches:

- `visible_state` — returned by `GameLogic.get_visible_state()` and intended for the specific player.
- `available_actions` — returned by `GameLogic.get_available_actions()` for that player.

This pattern keeps the game server responsible for enforcing what each player can see.

## Turn-based vs simultaneous games

- Turn-based games: Set `turn_based` to true in the configuration. `GameSession` will then ask the game logic for `get_next_turn_role()` to determine which role should act, and only one player acts per sub-turn.
- Simultaneous-action games: `turn_based` false (default). The session collects one action per player per round and then processes the round.

## Handling timeouts and disconnected players

- Each round has a timeout (`round_timeout_seconds`) defined in the config. If the timer expires, the session processes the round with whatever actions were submitted.
- Disconnected players are marked in the player object; they do not get removed automatically. Reconnection restores their connection and they receive the latest visible state.

