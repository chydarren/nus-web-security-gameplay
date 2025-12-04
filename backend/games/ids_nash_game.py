import numpy as np
import random
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass

from .base import GameLogic
from src.models.core import GameState, GameConfig
from src.models.player import Player, ActionData, RoundResult

@dataclass
class IDSNashConfig:
    """Configuration using readable names mapped to IDS Game parameters"""
    initial_assets: float        # Y
    security_cost: float         # C
    loss_amount: float           # L
    use_dynamic_p_q: bool        # Whether to use dynamic p and q
    direct_loss_prob: Optional[float]      # p (probability of direct loss)
    indirect_loss_prob: Optional[float]    # q (probability of contamination)

class IDSNashGameLogic(GameLogic):
    """
    Implements the 2-Player IDS Game Matrix (Single Round).
    Choices: 'invest' vs 'not_invest'.
    """

    def __init__(self, config: GameConfig):
        super().__init__(config)
        
        # Load readable config
        self.config = config
        spec = config.game_specific_config
        self.ids_config = IDSNashConfig(
            initial_assets=float(spec["initial_assets"]),
            security_cost=float(spec["security_cost"]),
            loss_amount=float(spec["loss_amount"]),
            use_dynamic_p_q=bool(spec["use_dynamic_p_q"]),
            direct_loss_prob=float(spec.get("direct_loss_prob", None)),
            indirect_loss_prob=float(spec.get("indirect_loss_prob", None))
        )
        

    def get_available_roles(self) -> List[str]:
        return ["Player"]

    def validate_join(self, player_name: str, role: str, current_players: Dict[str, Player], game_state: GameState) -> Tuple[bool, str]:
        if len(current_players) >= 2:
            return False, "This game is strictly for 2 players."
        return True, "Player can join"

    def get_available_actions(self, player: Player, game_state: GameState) -> List[str]:
        if game_state.phase.value != "awaiting_actions":
            return []
        return ["invest", "not_invest"]

    def validate_action(self, action: str, action_data: Dict[str, Any], player: Player, game_state: GameState) -> bool:
        return action in ["invest", "not_invest"]

    def process_round(self, actions: List[ActionData], game_state: GameState, players: Dict[str, Player]) -> RoundResult:
        # 1. Map actions to dictionary
        player_actions = {a.player.player_id: a.action for a in actions}
        
        # 2. Calculate Payoffs (Net Change)
        # The payoff dictionary returned here contains the Net Change
        net_changes, details = self._calculate_payoffs(player_actions, list(players.keys()), game_state)
        
        # 3. Apply to Final Scores
        # Final Score = Initial Assets + Net Change
        for pid, net_change in net_changes.items():
            game_state.scores[pid] = game_state.scores[pid] + net_change
            players[pid].total_score = game_state.scores[pid]

        print(game_state.scores)

        # 4. Generate Summary
        invest_count = sum(1 for a in player_actions.values() if a == "invest")
        
        return RoundResult(
            round_number=game_state.current_round,
            actions=actions,
            payoffs=net_changes, # Returning net change as the payoff for this round
            round_summary={
                "total_investors": invest_count,
                "outcome_type": self._get_outcome_description(invest_count, details, players)
            }
        )

    def _calculate_p_q(self, game_state: GameState, actions: Dict[str, str]) -> Tuple[float, float]:
        """
        Calculate dynamic loss probability.
        """
        # Example logic: maybe risk increases if no one invested in previous games?
        # For now, return config defaults.
        if self.ids_config.use_dynamic_p_q:
            raise NotImplementedError("Dynamic p and q calculation not implemented yet.")
        else:
            p = self.ids_config.direct_loss_prob
            q = self.ids_config.indirect_loss_prob
        return p, q

    def _calculate_payoffs(self, actions: Dict[str, str], player_ids: List[str], game_state: GameState) -> Dict[str, float]:
        """
        Calculates Stochastic Net Change.
        1. Determine p and q (static or dynamic).
        2. Simulate Direct Loss for each player.
        3. Simulate Indirect (Contamination) Loss based on neighbor's Direct Loss.
        """
        payoffs = {}
        
        # 1. Get Probabilities
        p, q = self._calculate_p_q(game_state, actions)

        cost = self.ids_config.security_cost
        loss_amt = self.ids_config.loss_amount

        # 2. Determine Direct Loss Events
        # You are only vulnerable to direct loss if you did NOT invest.
        direct_loss_events = {}
        for pid in player_ids:
            action = actions.get(pid, "not_invest")
            if action == "invest":
                direct_loss_events[pid] = False
            else:
                # Roll for direct loss
                direct_loss_events[pid] = random.random() < p

        # 3. Calculate Final Net Change (Cost + Total Loss)
        # Total Loss logic: You lose L if (Direct Loss) OR (Neighbor has Direct Loss AND Contaminates)
        details = {}
        for pid in player_ids:
            action = actions[pid]
            
            # Identify opponent
            opponent_id = next((oid for oid in player_ids if oid != pid), None)
            
            # --- Cost ---
            current_cost = cost if action == "invest" else 0.0
            
            # --- Loss Calculation ---
            has_loss = False
            
            # A. Check Direct Loss
            if direct_loss_events[pid]:
                has_loss = True
                details[pid] = "Direct Loss"
            else:
                details[pid] = "No Loss"
            
            # B. Check Indirect Loss
            # If opponent is attacked, vulnerable to contamination regardless of the player's own investment
            if not has_loss:
                # Did opponent suffer direct loss?
                if direct_loss_events[opponent_id]:
                    # Roll for contamination
                    if random.random() < q:
                        has_loss = True
                        details[pid] = "Indirect Loss"
            
            total_loss = loss_amt if has_loss else 0.0
            
            # Net Change
            payoffs[pid] = -current_cost - total_loss

        return payoffs, details
    
    def _get_outcome_description(self, invest_count: int, details: Dict[str, str], players: Dict[str, Player]) -> str:
        
        if invest_count == 2:
            investment_status =  "Full Cooperation (Both Safe)"
        elif invest_count == 0:
            investment_status =  "System Failure (Both Vulnerable)"
        else:
            investment_status =  "Partial Cooperation (One Vulnerable)"

        loss_status = ", ".join([f"Player {players[pid].player_name}: {desc}" for pid, desc in details.items()])

        return f"{investment_status}; Loss Outcomes: {loss_status}"

    def get_visible_state(self, game_state: GameState, player: Player) -> Dict[str, Any]:
        return {
            "round": game_state.current_round,
            "config": {
                "initial_assets": self.ids_config.initial_assets,
                "security_cost": self.ids_config.security_cost,
                "loss_amount": self.ids_config.loss_amount,
                "direct_loss_prob": self.ids_config.direct_loss_prob,
                "indirect_loss_prob": self.ids_config.indirect_loss_prob
            }
        }

    def is_game_finished(self, game_state: GameState, players: Dict[str, Player]) -> bool:
        # Game finishes after given round
        return game_state.current_round >= self.config.total_rounds

    def get_winner(self, game_state: GameState, players: Dict[str, Player]) -> list[Player]:
        """Determine winner based on final assets (Handles ties)"""
        if not game_state.scores:
            return None

        max_score = max(game_state.scores.values())
        
        winners = [
            players[pid] 
            for pid, score in game_state.scores.items() 
            if score == max_score
        ]
        
        return winners

    def initialize_game_state(self, game_state: GameState, players: Dict[str, Player]) -> GameState:
        # Set initial assets
        for player in players.values():
            player.total_score = self.ids_config.initial_assets
            game_state.scores[player.player_id] = player.total_score
        return game_state

    
    # Required Boilerplate for GameLogic implementation
    def is_turn_finished(self, current_round_actions: List[ActionData], game_state: GameState, players: Dict[str, Player]) -> bool:
        return len(current_round_actions) >= len(players)

    def is_round_finished(self, current_round_actions: List[ActionData], game_state: GameState, players: Dict[str, Player]) -> bool:
        return len(current_round_actions) >= len(players)
    
    def get_next_turn_role(self, game_state: GameState) -> Optional[str]:
        return None
    
    def get_global_game_info(self) -> Dict[str, Any]:
        return {
            "game_type": "IDS Nash 2-Player (One Shot)",
            "params": self.ids_config.__dict__
        }
    
    def get_role_distribution_info(self, current_players: Dict[str, Player]) -> Dict[str, Any]:
        return {"needed": 2 - len(current_players)}
    
    def update_game_state(self, game_state: GameState, round_result: RoundResult, players: Dict[str, Player]) -> GameState:
        return game_state