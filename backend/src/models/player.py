from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

def generate_short_id() -> str:
    """Generate a shorter player ID (8 characters)"""
    return str(uuid.uuid4())[:8]

class Player(BaseModel):
    """Rich player object with role and metadata"""
    player_id: str = Field(default_factory=generate_short_id)
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
        from .core import GamePhase  # Import here to avoid circular import
        
        if not self.is_connected:
            return False
        
        if current_turn_role is not None:
            return self.role == current_turn_role
        
        return True

class ActionData(BaseModel):
    """Player action with rich context"""
    action_id: str = Field(default_factory=generate_short_id)
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
    final_scores: Dict[str, float]
    players: Dict[str, Player]
    total_duration_seconds: Optional[int] = None
    winner: Optional[str] = None
    game_statistics: Dict[str, Any] = Field(default_factory=dict)