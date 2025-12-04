import random
import sys
import os
from typing import Dict, Any, List

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from .base import AIAgent
from src.models.core import GameState
from src.models.player import Player

class SimpleAgent(AIAgent):
    """Simple rule-based agent for testing"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        self.personality = agent_config.get("personality", "strategic")
    
    async def get_action(self, game_state: GameState, 
                        available_actions: List[str],
                        visible_state: Dict[str, Any]) -> str:
        """Always select the first action available."""
        
        return available_actions[0]
    
    def set_player(self, player: Player) -> None:
        """Associate agent with player"""
        self.player = player
        player.is_ai_agent = True