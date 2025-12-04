import sys
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from src.models.core import GameState
from src.models.player import Player

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