
import sys
import os
from typing import Dict, Any, List

import openai

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from .base import AIAgent
from src.models.core import GameState
from src.models.player import Player

class OpenAIAgent(AIAgent):
    """OpenAI GPT-based agent"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)

        self.client = openai.OpenAI(api_key=agent_config.get("api_key"))
        self.model = agent_config.get("model", "gpt-5")
        self.personality = agent_config.get("personality", "strategic")
    
    async def get_action(self, game_state: GameState, 
                        available_actions: List[str],
                        visible_state: Dict[str, Any]) -> str:
        """Get action from OpenAI model"""
        
        prompt = self._build_prompt(game_state, available_actions, visible_state)
        
        try:
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
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # Fallback to simple strategy
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
        
        base_prompt = role_prompts.get(self.player.role if self.player else "defender", 
                                     "You are a player in a game theory scenario.")
        
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
        
        Choose the best action for your role as {self.player.role if self.player else 'defender'}.
        Respond with only the action name.
        """