"""
AI Agents for Interdependent Security (IDS) Games

This module implements various AI strategies for IDS games including:
- Conservative/Cautious investors who invest heavily in protection
- Aggressive/Free-rider investors who minimize investment
- Strategic agents who adapt based on others' behavior
- Stackelberg-specific leaders and followers
"""

import random
import numpy as np
import asyncio
from typing import Dict, Any, Optional, List
from .base import AIAgent
from src.models.core import GameState
from src.models.player import Player


class ConservativeInvestorAgent(AIAgent):
    """Conservative AI that invests heavily in protection"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        config_params = agent_config.get("config", {})
        self.investment_tendency = config_params.get("investment_tendency", 0.7)
        self.risk_aversion = config_params.get("risk_aversion", 0.8)
    
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        self.player = player
    
    async def get_action(self, game_state: GameState, available_actions: List[str], 
                        visible_state: Dict[str, Any]) -> str:
        """Choose action based on conservative investment strategy"""
        
        # Add small delay to simulate thinking
        await asyncio.sleep(0.5)
        
        # Extract investment options
        investment_options = []
        for action in available_actions:
            if action.startswith("invest_"):
                try:
                    investment = float(action.split("_")[1])
                    investment_options.append(investment)
                except (ValueError, IndexError):
                    continue
        
        if not investment_options:
            return available_actions[0] if available_actions else "invest_0"
        
        max_investment = max(investment_options)
        
        # Conservative strategy: invest based on tendency and risk aversion
        base_investment = max_investment * self.investment_tendency
        
        # Adjust based on others' behavior if visible
        if "all_players_investments" in visible_state:
            others_investments = visible_state["all_players_investments"]
            others_recent = []
            for pid, inv_history in others_investments.items():
                if pid != self.player.player_id and inv_history:
                    others_recent.append(inv_history[-1])
            
            if others_recent:
                others_avg = np.mean(others_recent)
                # Increase investment if others are investing less (complement strategy)
                if others_avg < max_investment * 0.5:
                    base_investment *= 1.2  # Invest more to compensate
        elif "average_investment" in visible_state:
            # Partial feedback case
            avg_investment = visible_state.get("average_investment", 0)
            if avg_investment < max_investment * 0.5:
                base_investment *= 1.1
        
        # Add some randomness but stay conservative
        noise = random.gauss(0, max_investment * 0.05)
        target_investment = min(max_investment, max(0, base_investment + noise))
        
        # Find closest available investment option
        closest_option = min(investment_options, key=lambda x: abs(x - target_investment))
        return f"invest_{closest_option}"


class FreeRiderAgent(AIAgent):
    """Free-rider AI that minimizes investment, relies on others"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        config_params = agent_config.get("config", {})
        self.investment_tendency = config_params.get("investment_tendency", 0.1)
        self.risk_aversion = config_params.get("risk_aversion", 0.3)
    
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        self.player = player
    
    async def get_action(self, game_state: GameState, available_actions: List[str], 
                        visible_state: Dict[str, Any]) -> str:
        """Choose action based on free-riding strategy"""
        
        await asyncio.sleep(0.3)
        
        investment_options = []
        for action in available_actions:
            if action.startswith("invest_"):
                try:
                    investment = float(action.split("_")[1])
                    investment_options.append(investment)
                except (ValueError, IndexError):
                    continue
        
        if not investment_options:
            return available_actions[0] if available_actions else "invest_0"
        
        max_investment = max(investment_options)
        
        # Free-rider strategy: invest minimally
        base_investment = max_investment * self.investment_tendency
        
        # If others are investing heavily, invest even less
        if "all_players_investments" in visible_state:
            others_investments = visible_state["all_players_investments"]
            others_recent = []
            for pid, inv_history in others_investments.items():
                if pid != self.player.player_id and inv_history:
                    others_recent.append(inv_history[-1])
            
            if others_recent:
                others_avg = np.mean(others_recent)
                if others_avg > max_investment * 0.3:
                    base_investment *= 0.8  # Reduce investment if others invest heavily
        
        # Add small amount of randomness
        noise = random.gauss(0, max_investment * 0.03)
        target_investment = max(0, base_investment + noise)
        
        closest_option = min(investment_options, key=lambda x: abs(x - target_investment))
        return f"invest_{closest_option}"


class CooperatorAgent(AIAgent):
    """Cooperator AI that consistently invests in protection"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        config_params = agent_config.get("config", {})
        self.investment_tendency = config_params.get("investment_tendency", 0.8)
        self.risk_aversion = config_params.get("risk_aversion", 0.9)
    
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        self.player = player
    
    async def get_action(self, game_state: GameState, available_actions: List[str], 
                        visible_state: Dict[str, Any]) -> str:
        """Choose action based on cooperative strategy"""
        
        await asyncio.sleep(0.4)
        
        investment_options = []
        for action in available_actions:
            if action.startswith("invest_"):
                try:
                    investment = float(action.split("_")[1])
                    investment_options.append(investment)
                except (ValueError, IndexError):
                    continue
        
        if not investment_options:
            return available_actions[0] if available_actions else "invest_0"
        
        max_investment = max(investment_options)
        
        # Cooperative strategy: consistently invest high amounts
        base_investment = max_investment * self.investment_tendency
        
        # Maintain cooperation even if others don't cooperate
        # Add small random variation
        noise = random.gauss(0, max_investment * 0.05)
        target_investment = min(max_investment, max(max_investment * 0.5, base_investment + noise))
        
        closest_option = min(investment_options, key=lambda x: abs(x - target_investment))
        return f"invest_{closest_option}"


class StrategicLeaderAgent(AIAgent):
    """Strategic leader for Stackelberg games"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        config_params = agent_config.get("config", {})
        self.investment_tendency = config_params.get("investment_tendency", 0.6)
        self.strategic_thinking = config_params.get("strategic_thinking", 0.8)
    
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        self.player = player
    
    async def get_action(self, game_state: GameState, available_actions: List[str], 
                        visible_state: Dict[str, Any]) -> str:
        """Choose action as a strategic leader"""
        
        await asyncio.sleep(0.6)  # Leaders think more
        
        investment_options = []
        for action in available_actions:
            if action.startswith("invest_"):
                try:
                    investment = float(action.split("_")[1])
                    investment_options.append(investment)
                except (ValueError, IndexError):
                    continue
        
        if not investment_options:
            return available_actions[0] if available_actions else "invest_0"
        
        max_investment = max(investment_options)
        
        # Strategic thinking: anticipate followers' reactions
        base_investment = max_investment * self.investment_tendency
        
        current_round = game_state.current_round
        
        # Early rounds: signal willingness to cooperate
        if current_round <= 2:
            base_investment *= 1.2
        # Later rounds: adjust based on follower responses
        else:
            if "all_players_investments" in visible_state:
                others_investments = visible_state["all_players_investments"]
                follower_cooperation = 0
                follower_count = 0
                
                for pid, inv_history in others_investments.items():
                    if pid != self.player.player_id and inv_history:
                        follower_cooperation += inv_history[-1]
                        follower_count += 1
                
                if follower_count > 0:
                    avg_follower_cooperation = follower_cooperation / follower_count
                    
                    # If followers free-ride, reduce investment
                    if avg_follower_cooperation < max_investment * 0.2:
                        base_investment *= 0.85
                    # If followers cooperate, maintain/increase investment
                    elif avg_follower_cooperation > max_investment * 0.4:
                        base_investment *= 1.1
        
        # Add strategic randomness
        noise = random.gauss(0, max_investment * 0.06)
        target_investment = min(max_investment, max(0, base_investment + noise))
        
        closest_option = min(investment_options, key=lambda x: abs(x - target_investment))
        return f"invest_{closest_option}"


class ReactiveFollowerAgent(AIAgent):
    """Reactive follower for Stackelberg games"""
    
    def __init__(self, agent_config: Dict[str, Any]):
        super().__init__(agent_config)
        config_params = agent_config.get("config", {})
        self.investment_tendency = config_params.get("investment_tendency", 0.4)
        self.reaction_sensitivity = config_params.get("reaction_sensitivity", 0.7)
    
    def set_player(self, player: Player) -> None:
        """Associate agent with a player"""
        self.player = player
    
    async def get_action(self, game_state: GameState, available_actions: List[str], 
                        visible_state: Dict[str, Any]) -> str:
        """Choose action based on leaders' actions"""
        
        await asyncio.sleep(0.4)
        
        investment_options = []
        for action in available_actions:
            if action.startswith("invest_"):
                try:
                    investment = float(action.split("_")[1])
                    investment_options.append(investment)
                except (ValueError, IndexError):
                    continue
        
        if not investment_options:
            return available_actions[0] if available_actions else "invest_0"
        
        max_investment = max(investment_options)
        base_investment = max_investment * self.investment_tendency
        
        # React to leader actions in current round
        if "leader_actions" in visible_state and visible_state["leader_actions"]:
            leader_investments = list(visible_state["leader_actions"].values())
            avg_leader_investment = np.mean(leader_investments)
            
            # Complement leader investment to some degree
            reaction = self.reaction_sensitivity * (avg_leader_investment / max_investment)
            base_investment = max_investment * (self.investment_tendency + reaction * 0.3)
            
        elif "average_leader_investment" in visible_state:
            # Partial feedback case
            avg_leader_investment = visible_state["average_leader_investment"]
            if avg_leader_investment > 0:
                reaction = self.reaction_sensitivity * (avg_leader_investment / max_investment)
                base_investment = max_investment * (self.investment_tendency + reaction * 0.2)
        
        # Add randomness
        noise = random.gauss(0, max_investment * 0.08)
        target_investment = min(max_investment, max(0, base_investment + noise))
        
        closest_option = min(investment_options, key=lambda x: abs(x - target_investment))
        return f"invest_{closest_option}"