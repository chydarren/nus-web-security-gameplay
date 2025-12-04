from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from datetime import datetime
import uuid

def generate_short_id() -> str:
    """Generate a shorter ID (8 characters)"""
    return str(uuid.uuid4())[:8]

class GamePhase(Enum):
    WAITING_FOR_PLAYERS = "waiting_for_players"
    ROUND_START = "round_start"
    AWAITING_ACTIONS = "awaiting_actions"
    PROCESSING_ACTIONS = "processing_actions"
    ROUND_END = "round_end"
    GAME_END = "game_end"

class EventType(Enum):
    GAME_STARTED = "game_started"
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    ROUND_STARTED = "round_started"
    ACTION_RECEIVED = "action_received"
    ACTION_SUBMITTED = "action_submitted"
    ROUND_COMPLETED = "round_completed"
    GAME_ENDED = "game_ended"
    PLAYER_ROLE_ASSIGNED = "player_role_assigned"

class GameEvent(BaseModel):
    """Individual game event for complete history tracking"""
    event_id: str = Field(default_factory=generate_short_id)
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    player_id: Optional[str] = None
    round_number: Optional[int] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    visible_to_roles: List[str] = Field(default_factory=list)  # List of role names

class AIAgentConfig(BaseModel):
    """Configuration for an AI agent"""
    agent_type: str
    role: str
    player_name: Optional[str] = None  # Custom name for the AI agent
    config: Dict[str, Any] = Field(default_factory=dict)

class GameConfig(BaseModel):
    """Game configuration loaded from config file"""
    game_type: str
    game_logic_class: str  # e.g., "ids_game.IDSGameLogic" 
    description: str = ""  # Game description for display
    total_rounds: int = Field(ge=1, le=100)
    required_players: int = Field(ge=1, le=100)  # Fixed number of players (configurable)
    round_timeout_seconds: int = Field(ge=10, le=999999, default=600)
    available_roles: List[str] = Field(default_factory=list)  # Available roles for this game
    turn_based: bool = False  # Whether roles take turns in order
    ai_agents: List[AIAgentConfig] = Field(default_factory=list)  # AI agents to auto-add
    game_specific_config: Dict[str, Any] = Field(default_factory=dict)

class GameHistory(BaseModel):
    """Complete game history"""
    events: List[GameEvent] = Field(default_factory=list)
    
    def add_event(self, event: GameEvent) -> None:
        """Add event to history"""
        self.events.append(event)
    
    def get_events_for_player(self, player: Any) -> List[GameEvent]:
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
    game_id: str = Field(default_factory=generate_short_id)
    current_round: int = 0
    max_rounds: int
    phase: GamePhase = GamePhase.WAITING_FOR_PLAYERS
    scores: Optional[dict[str, Any]] = Field(default_factory=dict)
    current_turn_role: Optional[str] = None  # For turn-based games (role name)
    round_data: Dict[str, Any] = Field(default_factory=dict)
    game_specific_state: Dict[str, Any] = Field(default_factory=dict)
    history: GameHistory = Field(default_factory=GameHistory)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None