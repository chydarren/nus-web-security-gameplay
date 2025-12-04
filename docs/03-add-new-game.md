# Adding a New Game — Developer Guide

Follow these steps to add a new game to the platform. The process is intentionally lightweight: implement the `GameLogic` interface and provide a config.

Quick checklist

1. Create a new Python module under `backend/games/`, e.g. `my_new_game.py`.
2. Implement a class that extends `GameLogic` (from `backend/games/base.py`).
3. Implement all abstract methods (see below). Run unit tests or a quick smoke test.
4. Add a new JSON config under `backend/config/` (or `backend/config/game_configs/`) and point `game_module` to your module.
5. Start the server and create a GameSession pointing at your config.

## Step 0 — Understand the contract

`GameLogic` methods you must implement (required contract):

- get_available_roles() -> List[str]
- initialize_game_state(game_state: GameState, players: Dict[str, Player]) -> GameState
- validate_action(action: str, action_data: Dict[str, Any], player: Player, game_state: GameState) -> bool
- get_available_actions(player: Player, game_state: GameState) -> List[str]
- process_round(actions: List[ActionData], game_state: GameState, players: Dict[str, Player]) -> RoundResult
- update_game_state(game_state: GameState, round_result: RoundResult, players: Dict[str, Player]) -> GameState
- get_next_turn_role(game_state: GameState) -> Optional[str]
- get_visible_state(game_state: GameState, player: Player) -> Dict[str, Any]
- is_game_finished(game_state: GameState, players: Dict[str, Player]) -> bool
- calculate_final_scores(game_state: GameState, players: Dict[str, Player]) -> Dict[str, float]

Key notes:
- `process_round` must return a `RoundResult` defined in `backend/src/models/player.py`.
- Use `get_visible_state` to enforce per-player visibility.
- If your game is simultaneous (all players act each round), set `turn_based` to `false` in the config.
- For turn-based games, implement `get_next_turn_role` to return which role should act next. Return `None` when a round's sub-turns are complete.

## Example: Skeleton file for a new game

Create `backend/games/my_new_game.py` and start with the following skeleton:

```python
from .base import GameLogic
from src.models.core import GameState, GameConfig
from src.models.player import Player, ActionData, RoundResult
from typing import Dict, List, Any, Optional

class MyNewGameLogic(GameLogic):
    def get_available_roles(self) -> List[str]:
        return ["role_a", "role_b"]

    def initialize_game_state(self, game_state: GameState, players: Dict[str, Player]) -> GameState:
        game_state.game_specific_state = {"some_key": 0}
        return game_state

    def validate_action(self, action: str, action_data: Dict[str, Any], player: Player, game_state: GameState) -> bool:
        return action in ["move", "pass"]

    def get_available_actions(self, player: Player, game_state: GameState) -> List[str]:
        return ["move", "pass"]

    def process_round(self, actions: List[ActionData], game_state: GameState, players: Dict[str, Player]) -> RoundResult:
        # compute payoffs and return RoundResult
        pass

    def update_game_state(self, game_state: GameState, round_result: RoundResult, players: Dict[str, Player]) -> GameState:
        return game_state

    def get_next_turn_role(self, game_state: GameState) -> Optional[str]:
        return None

    def get_visible_state(self, game_state: GameState, player: Player) -> Dict[str, Any]:
        return {"round": game_state.current_round}

    def is_game_finished(self, game_state: GameState, players: Dict[str, Player]) -> bool:
        return game_state.current_round >= game_state.max_rounds

    def calculate_final_scores(self, game_state: GameState, players: Dict[str, Player]) -> Dict[str, float]:
        return {pid: p.total_score for pid, p in players.items()}
```

## Step 1 — Add configuration

Create `backend/config/my_new_game.json` or add a file in `backend/config/game_configs/`.
A minimal config example:

```json
{
  "game_type": "my_new_game",
  "game_module": "my_new_game",
  "total_rounds": 6,
  "required_players": 2,
  "round_timeout_seconds": 60,
  "available_roles": ["role_a", "role_b"],
  "turn_based": false,
  "game_specific_config": {}
}
```

## Step 2 — Wiring and runtime

- Point `GameSession` at your config file when constructing (e.g., `GameSession(config_file="config/my_new_game.json")`) or change `default.json` to reference your game module.
- Start the backend with `python -m src.main`.
- Use the REST APIs (`/api/create_game`, `/api/join`, `/api/start`) to create and start a session (or use the frontend).

## Step 3 — Debugging tips

- Insert logs in `process_round` and `update_game_state` to inspect actions and payoffs.
- Use `test_game.py` included in the repo as a quick script to run a headless simulation.
- If you see import errors, ensure module name matches the `game_module` in the config and that the file is placed in `backend/games/`.

## Recommended extras

- Add unit tests for your `GameLogic` implementation covering:
  - Action validation
  - Round processing with edge cases
  - Final score calculation
- Document your game-specific configuration parameters in `backend/config/game_configs/`.

