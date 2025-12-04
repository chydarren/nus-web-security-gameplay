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
        """Get action based on simple rules"""
        
        if "reinforce" in available_actions and "do_nothing" in available_actions:
            # Decision based on personality and game state
            network_security = visible_state.get("network_security_level", 100)
            attack_probability = visible_state.get("attack_probability", 0.3)
            my_defense = visible_state.get("my_defense_level", 0)
            
            if self.personality == "aggressive":
                # Always reinforce when network security is low
                return "reinforce" if network_security < 70 else "do_nothing"
            elif self.personality == "conservative":
                # Reinforce often to be safe
                return "reinforce" if random.random() < 0.7 else "do_nothing"
            else:  # strategic
                # Consider multiple factors
                reinforce_probability = (1.0 - network_security/100) * 0.5 + attack_probability * 0.3
                if my_defense < 20:  # Need personal defense
                    reinforce_probability += 0.3
                return "reinforce" if random.random() < reinforce_probability else "do_nothing"
        
        # Fallback to first available action
        return available_actions[0] if available_actions else "wait"
    
    def set_player(self, player: Player) -> None:
        """Associate agent with player"""
        self.player = player
        player.is_ai_agent = True