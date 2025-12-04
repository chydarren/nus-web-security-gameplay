# 🎮 Game Theory Platform v7: Modular Architecture with React Frontend

## 🌟 Overview

This is a redesigned game theory platform with a modular architecture that separates concerns into distinct modules. The system supports pluggable game logic, AI agents, and a modern React frontend. The platform is designed for security gameplay scenarios where players can have different roles like "attacker" and "defender".

### Key Improvements from v4
- **Modular Game Logic**: Games are stored in a separate `games/` submodule
- **React Frontend**: Modern, maintainable React application
- **Player Roles**: Support for role-based gameplay (attacker, defender, etc.)
- **AI Agents**: Dedicated module for LLM-based agents
- **Complete History**: Full game event history tracking
- **Flexible Player Management**: Rich player objects instead of simple IDs
- **Enhanced Game Logic**: Support for turn-based actions and role-specific visibility

---

## 📁 Project Structure

```
game-theory-platform/
├── backend/
│   ├── src/
│   │   ├── main.py                 # FastAPI server entry point
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── core.py             # Core data models
│   │   │   ├── game.py             # Game-specific models
│   │   │   └── player.py           # Player models
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── game_session.py     # Game session management
│   │   │   └── websocket_manager.py # WebSocket connection management
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── game.py             # Game API endpoints
│   │   │   └── websocket.py        # WebSocket endpoints
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── config.py           # Configuration management
│   ├── games/                      # Game logic submodule
│   │   ├── __init__.py
│   │   ├── base.py                 # Abstract game logic base
│   │   ├── prisoners_dilemma.py    # Prisoner's Dilemma implementation
│   │   ├── security_game.py        # Security attack/defense game
│   │   └── public_goods.py         # Public goods game
│   ├── agents/                     # AI agent implementations
│   │   ├── __init__.py
│   │   ├── base.py                 # Abstract agent base
│   │   ├── openai_agent.py         # OpenAI-based agent
│   │   └── claude_agent.py         # Anthropic Claude agent
│   ├── config/
│   │   ├── game_configs/
│   │   │   ├── prisoners_dilemma.json
│   │   │   ├── security_game.json
│   │   │   └── public_goods.json
│   │   └── default.json
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── Game/
│   │   │   │   ├── GameBoard.tsx
│   │   │   │   ├── PlayerList.tsx
│   │   │   │   ├── ActionPanel.tsx
│   │   │   │   └── GameHistory.tsx
│   │   │   ├── UI/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   └── Common/
│   │   │       ├── Header.tsx
│   │   │       └── Footer.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useGameState.ts
│   │   │   └── usePlayer.ts
│   │   ├── services/
│   │   │   ├── api.ts              # HTTP API client
│   │   │   └── websocket.ts        # WebSocket client
│   │   ├── types/
│   │   │   ├── game.ts
│   │   │   ├── player.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── README.md
```

---

## 📋 Core Data Models

```python
# backend/src/models/core.py

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from datetime import datetime
import uuid

class GamePhase(Enum):
    WAITING_FOR_PLAYERS = "waiting_for_players"
    ROUND_START = "round_start"
    AWAITING_ACTIONS = "awaiting_actions"
    PROCESSING_ACTIONS = "processing_actions"
    ROUND_END = "round_end"
    GAME_END = "game_end"

# PlayerRole is now defined in each GameLogic class
# Different games have different roles

class EventType(Enum):
    GAME_STARTED = "game_started"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    ROUND_STARTED = "round_started"
    ACTION_SUBMITTED = "action_submitted"
    ROUND_COMPLETED = "round_completed"
    GAME_ENDED = "game_ended"
    PLAYER_ROLE_ASSIGNED = "player_role_assigned"

class GameEvent(BaseModel):
    """Individual game event for complete history tracking"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    player_id: Optional[str] = None
    round_number: Optional[int] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    visible_to_roles: List[str] = Field(default_factory=list)  # List of role names

class GameConfig(BaseModel):
    """Game configuration loaded from config file"""
    game_type: str
    game_module: str  # e.g., "games.security_game"
    total_rounds: int = Field(ge=1, le=100)
    required_players: int = Field(ge=1, le=20)  # Fixed number of players (configurable)
    round_timeout_seconds: int = Field(ge=10, le=300, default=60)
    available_roles: List[str] = Field(default_factory=list)  # Available roles for this game
    turn_based: bool = False  # Whether roles take turns in order
    game_specific_config: Dict[str, Any] = Field(default_factory=dict)

class GameHistory(BaseModel):
    """Complete game history"""
    events: List[GameEvent] = Field(default_factory=list)
    
    def add_event(self, event: GameEvent) -> None:
        """Add event to history"""
        self.events.append(event)
    
    def get_events_for_player(self, player: 'Player') -> List[GameEvent]:
        """Get events visible to a specific player based on their role"""
        return [
            event for event in self.events 
            if not event.visible_to_roles or player.role in event.visible_to_roles
        ]
    
    def get_events_by_type(self, event_type: EventType) -> List[GameEvent]:
        """Get all events of a specific type"""
        return [event for event in self.events if event.event_type == event_type]

class GameState(BaseModel):
    """Current game state with complete history"""
    game_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_round: int = 0
    max_rounds: int
    phase: GamePhase = GamePhase.WAITING_FOR_PLAYERS
    current_turn_role: Optional[str] = None  # For turn-based games (role name)
    round_data: Dict[str, Any] = Field(default_factory=dict)
    game_specific_state: Dict[str, Any] = Field(default_factory=dict)
    history: GameHistory = Field(default_factory=GameHistory)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
```

```python
# backend/src/models/player.py

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
from .core import GameConfig  # Remove PlayerRole import

class Player(BaseModel):
    """Rich player object with role and metadata"""
    player_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str
    role: str  # Role is now a string defined by the game
    is_connected: bool = True
    is_ai_agent: bool = False
    total_score: float = 0.0
    round_scores: List[float] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Role-specific data
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    last_action_at: Optional[datetime] = None
    
    def can_act_in_phase(self, phase: 'GamePhase', current_turn_role: Optional[str] = None) -> bool:
        """Check if player can act in current phase/turn"""
        if not self.is_connected:
            return False
        
        if current_turn_role is not None:
            return self.role == current_turn_role
        
        return True

class ActionData(BaseModel):
    """Player action with rich context"""
    action_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player: Player
    action: str
    action_data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    round_number: int
    visible_to_roles: List[str] = Field(default_factory=list)  # List of role names

class RoundResult(BaseModel):
    """Round results with role-based visibility"""
    round_number: int
    actions: List[ActionData]
    payoffs: Dict[str, float]  # player_id -> payoff
    round_summary: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    visible_to_roles: List[str] = Field(default_factory=list)  # List of role names

class GameSummary(BaseModel):
    """Complete game summary"""
    game_config: 'GameConfig'
    final_game_state: 'GameState'
    final_scores: Dict[str, float]
    players: Dict[str, Player]
    total_duration_seconds: Optional[int] = None
    winner: Optional[str] = None
    game_statistics: Dict[str, Any] = Field(default_factory=dict)
```

---

## 🎯 Enhanced Game Logic System

```python
# backend/games/base.py

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from ..src.models.core import GameState, GameConfig, GameEvent, EventType
from ..src.models.player import Player, ActionData, RoundResult

class GameLogic(ABC):
    """Enhanced abstract base class for game-specific logic"""
    
    def __init__(self, config: GameConfig):
        self.config = config
    
    @abstractmethod
    def get_available_roles(self) -> List[str]:
        """Get list of available roles for this game"""
        pass
    
    @abstractmethod
    def initialize_game_state(self, game_state: GameState, 
                            players: Dict[str, Player]) -> GameState:
        """Initialize game-specific state"""
        pass
    
    @abstractmethod
    def validate_action(self, action: str, action_data: Dict[str, Any],
                       player: Player, game_state: GameState) -> bool:
        """Validate if an action is legal for a player in current state"""
        pass
    
    @abstractmethod
    def get_available_actions(self, player: Player, game_state: GameState) -> List[str]:
        """Get list of available actions for a player"""
        pass
    
    @abstractmethod
    def process_round(self, actions: List[ActionData], 
                     game_state: GameState, 
                     players: Dict[str, Player]) -> RoundResult:
        """Process all actions and calculate payoffs"""
        pass
    
    @abstractmethod
    def update_game_state(self, game_state: GameState, 
                         round_result: RoundResult,
                         players: Dict[str, Player]) -> GameState:
        """Update game state after round"""
        pass
    
    @abstractmethod
    def get_next_turn_role(self, game_state: GameState) -> Optional[str]:
        """Get the next role that should act (for turn-based games)"""
        pass
    
    @abstractmethod
    def get_visible_state(self, game_state: GameState, 
                         player: Player) -> Dict[str, Any]:
        """Get game state visible to a specific player"""
        pass
    
    @abstractmethod
    def is_game_finished(self, game_state: GameState, 
                        players: Dict[str, Player]) -> bool:
        """Check if game is finished"""
        pass
    
    @abstractmethod
    def calculate_final_scores(self, game_state: GameState,
                             players: Dict[str, Player]) -> Dict[str, float]:
        """Calculate final scores and determine winner"""
        pass

# Example implementation
class SecurityGameLogic(GameLogic):
    """Simplified security game implementation"""
    
    def get_available_roles(self) -> List[str]:
        """Security game has defender role only"""
        return ["defender"]
    
    def initialize_game_state(self, game_state: GameState, 
                            players: Dict[str, Player]) -> GameState:
        """Initialize security game state"""
        # All players are defenders in the same network
        for player in players.values():
            if not player.role:  # If role not set during join
                player.role = "defender"
        
        # Initialize simple game state
        game_state.game_specific_state = {
            "network_security_level": 100,  # Overall network security
            "attack_probability": 0.3,      # Base probability of attack each round
            "player_defenses": {pid: 0 for pid in players.keys()},  # Individual defense levels
            "successful_attacks": 0,
            "total_attacks": 0
        }
        
        return game_state
    
    def get_next_turn_role(self, game_state: GameState) -> Optional[str]:
        """All players act simultaneously"""
        return None  # Not turn-based
    
    def validate_action(self, action: str, action_data: Dict[str, Any],
                       player: Player, game_state: GameState) -> bool:
        """Validate security game actions"""
        return action in ["reinforce", "do_nothing"]
    
    def get_available_actions(self, player: Player, game_state: GameState) -> List[str]:
        """Get available actions for defenders"""
        return ["reinforce", "do_nothing"]
    
    def process_round(self, actions: List[ActionData], 
                     game_state: GameState, 
                     players: Dict[str, Player]) -> RoundResult:
        """Process defender actions and simulate attack"""
        payoffs = {}
        
        # Process defender actions
        total_reinforcement = 0
        for action in actions:
            if action.action == "reinforce":
                # Increase individual defense
                player_id = action.player.player_id
                game_state.game_specific_state["player_defenses"][player_id] += 10
                total_reinforcement += 10
                # Cost of reinforcement
                payoffs[player_id] = -5  # Cost to reinforce
            else:  # do_nothing
                payoffs[action.player.player_id] = 0
        
        # Update network security based on total reinforcement
        game_state.game_specific_state["network_security_level"] = min(100, 
            game_state.game_specific_state["network_security_level"] + total_reinforcement)
        
        # Simulate attack
        import random
        attack_occurs = random.random() < game_state.game_specific_state["attack_probability"]
        
        if attack_occurs:
            game_state.game_specific_state["total_attacks"] += 1
            
            # Attack success depends on network security level
            attack_success_probability = max(0.1, 1.0 - game_state.game_specific_state["network_security_level"] / 100)
            attack_successful = random.random() < attack_success_probability
            
            if attack_successful:
                game_state.game_specific_state["successful_attacks"] += 1
                # All players lose score based on their individual defense level
                for player_id, defense_level in game_state.game_specific_state["player_defenses"].items():
                    damage = max(10, 50 - defense_level)  # Less damage with higher defense
                    payoffs[player_id] = payoffs.get(player_id, 0) - damage
                
                # Reduce network security after successful attack
                game_state.game_specific_state["network_security_level"] = max(0,
                    game_state.game_specific_state["network_security_level"] - 30)
        
        round_summary = {
            "attack_occurred": attack_occurs,
            "attack_successful": attack_successful if attack_occurs else False,
            "total_reinforcement": total_reinforcement,
            "network_security_level": game_state.game_specific_state["network_security_level"]
        }
        
        return RoundResult(
            round_number=game_state.current_round,
            actions=actions,
            payoffs=payoffs,
            round_summary=round_summary
        )
    
    def update_game_state(self, game_state: GameState, 
                         round_result: RoundResult,
                         players: Dict[str, Player]) -> GameState:
        """Update game state after round"""
        # Network security naturally degrades over time
        game_state.game_specific_state["network_security_level"] = max(0,
            game_state.game_specific_state["network_security_level"] - 5)
        
        # Increase attack probability slightly each round
        game_state.game_specific_state["attack_probability"] = min(0.8,
            game_state.game_specific_state["attack_probability"] + 0.05)
        
        return game_state
    
    def get_visible_state(self, game_state: GameState, 
                         player: Player) -> Dict[str, Any]:
        """All defenders see the same information"""
        return {
            "current_round": game_state.current_round,
            "max_rounds": game_state.max_rounds,
            "phase": game_state.phase.value,
            "network_security_level": game_state.game_specific_state.get("network_security_level", 0),
            "attack_probability": game_state.game_specific_state.get("attack_probability", 0),
            "my_defense_level": game_state.game_specific_state.get("player_defenses", {}).get(player.player_id, 0),
            "successful_attacks": game_state.game_specific_state.get("successful_attacks", 0),
            "total_attacks": game_state.game_specific_state.get("total_attacks", 0)
        }
    
    def is_game_finished(self, game_state: GameState, 
                        players: Dict[str, Player]) -> bool:
        """Game ends after max rounds or if network is completely compromised"""
        if game_state.current_round >= game_state.max_rounds:
            return True
        
        # Game ends early if network security drops to 0
        return game_state.game_specific_state.get("network_security_level", 100) <= 0
    
    def calculate_final_scores(self, game_state: GameState,
                             players: Dict[str, Player]) -> Dict[str, float]:
        """Calculate final scores based on total scores"""
        return {pid: player.total_score for pid, player in players.items()}
```

---

## 🤖 AI Agent System

```python
# backend/agents/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from ..src.models.core import GameState
from ..src.models.player import Player

class AIAgent(ABC):
    """Abstract base class for AI agents"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        self.config = agent_config
        self.player: Optional[Player] = None
    
    @abstractmethod
    async def get_action(self, game_state: GameState, 
                        available_actions: List[str],
                        visible_state: Dict[str, Any]) -> str:
        """Get action from AI agent"""
        pass
    
    @abstractmethod
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        pass

# backend/agents/openai_agent.py

import openai
from typing import Dict, Any, List
from .base import AIAgent
from ..src.models.core import GameState
from ..src.models.player import Player

class OpenAIAgent(AIAgent):
    """OpenAI GPT-based agent"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        self.client = openai.OpenAI(api_key=agent_config.get("api_key"))
        self.model = agent_config.get("model", "gpt-4")
        self.personality = agent_config.get("personality", "strategic")
    
    async def get_action(self, game_state: GameState, 
                        available_actions: List[str],
                        visible_state: Dict[str, Any]) -> str:
        """Get action from OpenAI model"""
        
        prompt = self._build_prompt(game_state, available_actions, visible_state)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        action = response.choices[0].message.content.strip()
        
        # Validate action is in available actions
        if action in available_actions:
            return action
        else:
            # Fallback to first available action
            return available_actions[0] if available_actions else "wait"
    
    def set_player(self, player: Player) -> None:
        """Associate agent with player"""
        self.player = player
        player.is_ai_agent = True
    
    def _get_system_prompt(self) -> str:
        """Get system prompt based on player role and personality"""
        role_prompts = {
            "defender": "You are a cybersecurity defender in a security game. Your goal is to protect the network from attacks.",
        }
        
        base_prompt = role_prompts.get(self.player.role, "You are a player in a game theory scenario.")
        
        personality_traits = {
            "aggressive": "You prefer bold, high-risk strategies.",
            "conservative": "You prefer safe, low-risk strategies.",
            "strategic": "You carefully analyze the situation before acting."
        }
        
        personality_prompt = personality_traits.get(self.personality, "")
        
        return f"{base_prompt} {personality_prompt} Always respond with only the action name from the available options."
    
    def _build_prompt(self, game_state: GameState, available_actions: List[str], 
                     visible_state: Dict[str, Any]) -> str:
        """Build prompt for the AI agent"""
        return f"""
        Current game state:
        Round: {game_state.current_round}/{game_state.max_rounds}
        Phase: {game_state.phase.value}
        
        Visible state: {visible_state}
        
        Available actions: {available_actions}
        
        Choose the best action for your role as {self.player.role}.
        Respond with only the action name.
        """
```

---

## 🎮 Game Session Service

```python
# backend/src/services/game_session.py

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Type
from pathlib import Path
import importlib

from ..models.core import GameState, GameConfig, GameEvent, EventType, GamePhase
from ..models.player import Player, ActionData, RoundResult, GameSummary
from ...games.base import GameLogic
from ...agents.base import AIAgent

class GameSession:
    """Enhanced game session with modular architecture"""
    
    def __init__(self, config_file: str = "config/default.json"):
        self.config_file = config_file
        
        # Load configuration
        self.game_config = self._load_config()
        
        # Initialize game state
        self.game_state = GameState(max_rounds=self.game_config.total_rounds)
        self.players: Dict[str, Player] = {}
        self.current_round_actions: List[ActionData] = []
        
        # Load game logic dynamically
        self.game_logic = self._load_game_logic()
        
        # AI agents
        self.ai_agents: Dict[str, AIAgent] = {}
        
        # WebSocket connections
        self.websocket_connections: Dict[str, any] = {}
        
        # Round timing
        self.round_deadline: Optional[datetime] = None
        self.round_timer_task: Optional[asyncio.Task] = None
    
    def _load_config(self) -> GameConfig:
        """Load game configuration from file"""
        try:
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
            return GameConfig(**config_data)
        except FileNotFoundError:
            raise ValueError(f"Configuration file not found: {self.config_file}")
    
    def _load_game_logic(self) -> GameLogic:
        """Dynamically load game logic from games module"""
        try:
            module = importlib.import_module(self.game_config.game_module)
            logic_class = getattr(module, f"{self.game_config.game_type.title()}Logic")
            return logic_class(self.game_config)
        except (ImportError, AttributeError) as e:
            raise ValueError(f"Failed to load game logic: {e}")
    
    async def add_player(self, player_name: str, role: str) -> Player:
        """Add a new player to the game with selected role"""
        if len(self.players) >= self.game_config.required_players:
            raise ValueError("Game is full")
        
        if self.game_state.phase != GamePhase.WAITING_FOR_PLAYERS:
            raise ValueError("Cannot join game in current phase")
        
        # Validate role
        available_roles = self.game_logic.get_available_roles()
        if role not in available_roles:
            raise ValueError(f"Invalid role. Available roles: {available_roles}")
        
        # Create player with selected role
        player = Player(player_name=player_name, role=role)
        self.players[player.player_id] = player
        
        # Add join event
        event = GameEvent(
            event_type=EventType.PLAYER_JOINED,
            player_id=player.player_id,
            data={"player_name": player_name, "role": role}
        )
        self.game_state.history.add_event(event)
        
        # Notify other players
        await self._broadcast_update({
            'type': 'PLAYER_JOINED',
            'player': self._serialize_player(player),
            'total_players': len(self.players)
        })
        
        return player
    
    async def add_ai_agent(self, agent_type: str, agent_config: Dict[str, Any]) -> Player:
        """Add an AI agent to the game"""
        # Create AI agent
        agent_module = importlib.import_module(f"agents.{agent_type}_agent")
        agent_class = getattr(agent_module, f"{agent_type.title()}Agent")
        agent = agent_class(agent_config)
        
        # Create player for the agent
        player = await self.add_player(f"AI-{agent_type}", role=agent_config.get("role"))
        agent.set_player(player)
        
        self.ai_agents[player.player_id] = agent
        
        return player
    
    async def start_game(self) -> None:
        """Start the game when all players have joined"""
        if len(self.players) != self.game_config.required_players:
            raise ValueError(f"Need exactly {self.game_config.required_players} players")
        
        if self.game_state.phase != GamePhase.WAITING_FOR_PLAYERS:
            raise ValueError("Game already started")
        
        # Initialize game
        self.game_state.phase = GamePhase.ROUND_START
        self.game_state.started_at = datetime.utcnow()
        self.game_state.current_round = 1
        
        # Initialize game-specific state and assign roles
        self.game_state = self.game_logic.initialize_game_state(self.game_state, self.players)
        
        # Add game started event
        event = GameEvent(
            event_type=EventType.GAME_STARTED,
            data={"total_rounds": self.game_state.max_rounds}
        )
        self.game_state.history.add_event(event)
        
        # Notify players
        await self._broadcast_update({
            'type': 'GAME_STARTED',
            'game_state': self._get_public_game_state()
        })
        
        # Start first round
        await self._start_round()
    
    async def _start_round(self) -> None:
        """Start a new round"""
        self.game_state.phase = GamePhase.AWAITING_ACTIONS
        self.current_round_actions = []
        
        # Set current turn role for turn-based games
        if self.game_config.turn_based:
            self.game_state.current_turn_role = self.game_logic.get_next_turn_role(self.game_state)
        
        # Set round deadline
        self.round_deadline = datetime.utcnow() + timedelta(
            seconds=self.game_config.round_timeout_seconds
        )
        
        # Start round timer
        if self.round_timer_task:
            self.round_timer_task.cancel()
        self.round_timer_task = asyncio.create_task(self._round_timer())
        
        # Add round started event
        event = GameEvent(
            event_type=EventType.ROUND_STARTED,
            round_number=self.game_state.current_round,
            data={
                "current_turn_role": self.game_state.current_turn_role if self.game_state.current_turn_role else None,
                "deadline": self.round_deadline.isoformat()
            }
        )
        self.game_state.history.add_event(event)
        
        # Notify players
        await self._broadcast_update({
            'type': 'ROUND_STARTED',
            'round_number': self.game_state.current_round,
            'current_turn_role': self.game_state.current_turn_role if self.game_state.current_turn_role else None,
            'deadline': self.round_deadline.isoformat()
        })
        
        # Trigger AI agents to act
        await self._trigger_ai_agents()
    
    async def submit_action(self, player_id: str, action: str, 
                          action_data: Dict[str, Any] = None) -> None:
        """Submit a player action"""
        if player_id not in self.players:
            raise ValueError("Player not in game")
        
        player = self.players[player_id]
        
        if self.game_state.phase != GamePhase.AWAITING_ACTIONS:
            raise ValueError("Not accepting actions in current phase")
        
        # Check if it's the player's turn (for turn-based games)
        if not player.can_act_in_phase(self.game_state.phase, self.game_state.current_turn_role):
            raise ValueError("Not your turn")
        
        # Check if player already submitted action this round
        if any(a.player.player_id == player_id for a in self.current_round_actions):
            raise ValueError("Player already submitted action for this round")
        
        # Validate action with game logic
        if not self.game_logic.validate_action(action, action_data or {}, player, self.game_state):
            raise ValueError("Invalid action")
        
        # Record action
        action_obj = ActionData(
            player=player,
            action=action,
            action_data=action_data or {},
            round_number=self.game_state.current_round
        )
        self.current_round_actions.append(action_obj)
        
        # Update player's last action time
        player.last_action_at = datetime.utcnow()
        
        # Add action event
        event = GameEvent(
            event_type=EventType.ACTION_SUBMITTED,
            player_id=player_id,
            round_number=self.game_state.current_round,
            data={"action": action},
            visible_to_roles=action_obj.visible_to_roles
        )
        self.game_state.history.add_event(event)
        
        # Notify action received
        await self._broadcast_update({
            'type': 'ACTION_SUBMITTED',
            'player_id': player_id,
            'action': action,
            'actions_received': len(self.current_round_actions),
            'actions_needed': self._get_required_actions_count()
        })
        
        # For turn-based games, move to next turn or process round
        if self.game_config.turn_based:
            next_role = self.game_logic.get_next_turn_role(self.game_state)
            if next_role is None:
                # All turns completed, process round
                await self._process_round()
            else:
                self.game_state.current_turn_role = next_role
                await self._trigger_ai_agents()
        else:
            # Check if all players have submitted actions
            if len(self.current_round_actions) >= self._get_required_actions_count():
                await self._process_round()
    
    async def _trigger_ai_agents(self) -> None:
        """Trigger AI agents to take actions if it's their turn"""
        for player_id, agent in self.ai_agents.items():
            player = self.players[player_id]
            
            if player.can_act_in_phase(self.game_state.phase, self.game_state.current_turn_role):
                # Get available actions and visible state
                available_actions = self.game_logic.get_available_actions(player, self.game_state)
                visible_state = self.game_logic.get_visible_state(self.game_state, player)
                
                # Get action from AI
                try:
                    action = await agent.get_action(self.game_state, available_actions, visible_state)
                    await self.submit_action(player_id, action)
                except Exception as e:
                    print(f"AI agent error for {player_id}: {e}")
    
    def _get_required_actions_count(self) -> int:
        """Get number of actions needed to complete the round"""
        if self.game_config.turn_based:
            return 1  # Only one action per turn
        else:
            return len(self.players)  # All players must act
    
    def _serialize_player(self, player: Player) -> Dict[str, Any]:
        """Serialize player for API responses"""
        return {
            "player_id": player.player_id,
            "player_name": player.player_name,
            "role": player.role.value,
            "is_connected": player.is_connected,
            "is_ai_agent": player.is_ai_agent,
            "total_score": player.total_score
        }
    
    def _get_public_game_state(self) -> Dict[str, Any]:
        """Get game state for public API"""
        return {
            "game_id": self.game_state.game_id,
            "phase": self.game_state.phase.value,
            "current_round": self.game_state.current_round,
            "max_rounds": self.game_state.max_rounds,
            "current_turn_role": self.game_state.current_turn_role if self.game_state.current_turn_role else None,
            "players": {pid: self._serialize_player(player) for pid, player in self.players.items()},
            "round_deadline": self.round_deadline.isoformat() if self.round_deadline else None
        }
    
    async def _broadcast_update(self, message: Dict[str, Any]) -> None:
        """Broadcast update to all connected players"""
        # Send personalized messages based on player roles
        for player_id, websocket in self.websocket_connections.items():
            if player_id in self.players:
                player = self.players[player_id]
                personalized_message = self._personalize_message(message, player)
                try:
                    await websocket.send_json(personalized_message)
                except Exception:
                    # Handle disconnection
                    await self.player_disconnected(player_id)
    
    def _personalize_message(self, message: Dict[str, Any], player: Player) -> Dict[str, Any]:
        """Personalize message based on player role and visibility rules"""
        # Add visible game state for the player
        if message.get('type') in ['ROUND_STARTED', 'GAME_STARTED']:
            message['visible_state'] = self.game_logic.get_visible_state(self.game_state, player)
            message['available_actions'] = self.game_logic.get_available_actions(player, self.game_state)
        
        return message
```

---

## ⚛️ React Frontend Structure

```typescript
// frontend/src/types/game.ts

export interface Player {
  player_id: string;
  player_name: string;
  role: 'attacker' | 'defender' | 'observer' | 'neutral';
  is_connected: boolean;
  is_ai_agent: boolean;
  total_score: number;
}

export interface GameState {
  game_id: string;
  phase: 'waiting_for_players' | 'round_start' | 'awaiting_actions' | 'processing_actions' | 'round_end' | 'game_end';
  current_round: number;
  max_rounds: number;
  current_turn_role?: string;
  players: Record<string, Player>;
  round_deadline?: string;
}

export interface GameEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  player_id?: string;
  round_number?: number;
  data: Record<string, any>;
}

export interface VisibleState {
  [key: string]: any;
}

// frontend/src/hooks/useWebSocket.ts

import { useEffect, useRef, useState } from 'react';
import { GameState, GameEvent } from '../types/game';

interface UseWebSocketProps {
  playerId: string | null;
  onGameUpdate: (data: any) => void;
}

export const useWebSocket = ({ playerId, onGameUpdate }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!playerId) return;

    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/ws/${playerId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onGameUpdate(data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [playerId, onGameUpdate]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, sendMessage };
};

// frontend/src/components/Game/ActionPanel.tsx

import React from 'react';
import { Player, GameState, VisibleState } from '../../types/game';
import { Button } from '../UI/Button';

interface ActionPanelProps {
  player: Player;
  gameState: GameState;
  visibleState: VisibleState;
  availableActions: string[];
  onSubmitAction: (action: string, actionData?: Record<string, any>) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  player,
  gameState,
  visibleState,
  availableActions,
  onSubmitAction
}) => {
  const canAct = gameState.phase === 'awaiting_actions' && 
                (!gameState.current_turn_role || gameState.current_turn_role === player.role);

  const renderActionButtons = () => {
    if (!canAct || availableActions.length === 0) {
      return <p>Waiting for your turn...</p>;
    }

    return availableActions.map(action => (
      <Button
        key={action}
        onClick={() => onSubmitAction(action)}
        variant="primary"
        className="mr-2 mb-2"
      >
        {action.replace('_', ' ').toUpperCase()}
      </Button>
    ));
  };

  const renderRoleSpecificUI = () => {
    if player.role === 'defender') {
      return (
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Defender Actions</h3>
          <p className="text-sm text-blue-600 mb-3">
            Network Security: {visibleState.network_security_level || 0}%
          </p>
          <div className="space-y-2">
            <div>My Defense Level: {visibleState.my_defense_level || 0}</div>
            <div>Attack Probability: {((visibleState.attack_probability || 0) * 100).toFixed(1)}%</div>
            <div>Successful Attacks: {visibleState.successful_attacks || 0}/{visibleState.total_attacks || 0}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">
        Actions - {player.role.toUpperCase()} 
        {player.is_ai_agent && <span className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">AI</span>}
      </h2>
      
      {renderRoleSpecificUI()}
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Available Actions</h3>
        <div className="flex flex-wrap">
          {renderActionButtons()}
        </div>
      </div>
      
      {gameState.current_turn_role && (
        <div className="mt-4 p-3 bg-yellow-100 rounded">
          <p className="text-sm">
            Current Turn: <strong>{gameState.current_turn_role.toUpperCase()}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

// frontend/src/components/Game/GameBoard.tsx

import React from 'react';
import { GameState, Player, VisibleState } from '../../types/game';
import { PlayerList } from './PlayerList';
import { ActionPanel } from './ActionPanel';
import { GameHistory } from './GameHistory';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player;
  visibleState: VisibleState;
  availableActions: string[];
  gameHistory: any[];
  onSubmitAction: (action: string, actionData?: Record<string, any>) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayer,
  visibleState,
  availableActions,
  gameHistory,
  onSubmitAction
}) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Status */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-2">Security Game</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>Round: {gameState.current_round}/{gameState.max_rounds}</span>
              <span>Phase: {gameState.phase.replace('_', ' ').toUpperCase()}</span>
              <span className="capitalize">Role: {currentPlayer.role}</span>
              <span>Score: {currentPlayer.total_score}</span>
            </div>
          </div>
        </div>
        
        {/* Players List */}
        <div>
          <PlayerList 
            players={Object.values(gameState.players)} 
            currentPlayerId={currentPlayer.player_id}
          />
        </div>
        
        {/* Action Panel */}
        <div>
          <ActionPanel
            player={currentPlayer}
            gameState={gameState}
            visibleState={visibleState}
            availableActions={availableActions}
            onSubmitAction={onSubmitAction}
          />
        </div>
        
        {/* Game History */}
        <div>
          <GameHistory 
            history={gameHistory}
            currentPlayer={currentPlayer}
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 📋 Configuration Examples

```json
// backend/config/game_configs/security_game.json
{
  "game_type": "security_game",
  "game_module": "games.security_game",
  "total_rounds": 5,
  "required_players": 3,
  "round_timeout_seconds": 120,
  "available_roles": ["defender"],
  "turn_based": false,
  "game_specific_config": {
    "initial_network_security": 100,
    "base_attack_probability": 0.3,
    "reinforcement_cost": 5,
    "reinforcement_benefit": 10,
    "attack_damage_base": 50
  }
}
```

```json
// backend/config/game_configs/prisoners_dilemma.json
{
  "game_type": "prisoners_dilemma",
  "game_module": "games.prisoners_dilemma",
  "total_rounds": 10,
  "required_players": 2,
  "round_timeout_seconds": 60,
  "available_roles": ["player"],
  "turn_based": false,
  "game_specific_config": {
    "cooperation_bonus": 3,
    "defection_bonus": 5,
    "mutual_cooperation": 3,
    "mutual_defection": 1
  }
}
```

---

## 🚀 Setup and Running

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python src/main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Adding AI Agents
```bash
# In your game configuration, add AI players
curl -X POST http://localhost:8000/api/add_ai_agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "openai",
    "agent_config": {
      "api_key": "your-openai-key",
      "model": "gpt-4",
      "personality": "conservative",
      "role": "defender"
    }
  }'
```

---

## 🎯 Key Features of v7

### ✅ Enhanced Architecture
1. **Modular Game Logic**: Games define their own roles and are pluggable modules in `games/` directory
2. **React Frontend**: Modern, maintainable UI with TypeScript
3. **AI Agent Support**: Pluggable AI agents that use the same APIs
4. **Role Selection**: Players choose their role when joining (no automatic assignment)
5. **Complete History Tracking**: Full event history with visibility controls
6. **Configurable Player Count**: Fixed number of players set in configuration

### 🎮 Simplified Security Game Features
1. **Defender-Only Roles**: All players are defenders in the same network
2. **Simple Actions**: Players can either "reinforce" defenses or "do nothing"
3. **Probabilistic Attacks**: Random attacks occur with configurable probability
4. **Individual Defense**: Each player's defense level affects their damage from successful attacks
5. **Network-Wide Impact**: All players are affected by attacks, but damage varies by individual defense

### 🤖 AI Integration
1. **Multiple AI Providers**: Support for OpenAI, Claude, and custom agents
2. **Personality-Based Agents**: AI agents with different behavioral patterns
3. **Same API Interface**: AI agents use the same endpoints as human players

This v7 design provides a robust, extensible platform for simple security game scenarios while maintaining clean separation of concerns and ease of development. The simplified security game focuses on collective defense against probabilistic attacks, making it easy to understand while still providing strategic depth through individual risk management.