import sys
import os
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from src.models.core import GameState, GameConfig, GameEvent, EventType
from src.models.player import Player, ActionData, RoundResult

class GameLogic(ABC):
    """Enhanced abstract base class for game-specific logic"""
    
    def __init__(self, config: GameConfig):
        self.config = config
    
    @abstractmethod
    def get_available_roles(self) -> List[str]:
        """Get list of available roles for this game"""
        pass
    
    @abstractmethod
    def validate_join(self, player_name: str, role: str, 
                     current_players: Dict[str, Player],
                     game_state: GameState) -> Tuple[bool, str]:
        """Validate if a player can join with the specified role
        
        Args:
            player_name: Name of the player trying to join
            role: Role the player wants to join as
            current_players: Currently joined players
            game_state: Current game state
            
        Returns:
            Tuple of (is_valid, error_message)
            If is_valid is True, error_message should be empty
            If is_valid is False, error_message should explain why joining failed
        """
        pass
    
    @abstractmethod
    def initialize_game_state(self, game_state: GameState, 
                            players: Dict[str, Player]) -> GameState:
        """Initialize game-specific state"""
        pass
    
    def create_player(self, player_name, role):
        return Player(player_name=player_name, role=role)

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
    
    def get_global_game_info(self) -> Dict[str, Any]:
        """Get global game information for display (no player-specific data)
        
        Override this method to provide game-specific global information.
        Default implementation returns basic game configuration.
        """
        return {
            "game_type": getattr(self.config, 'game_type', 'Unknown'),
            "total_rounds": self.config.total_rounds,
            "required_players": self.config.required_players,
            "available_roles": self.get_available_roles(),
            "turn_based": getattr(self.config, 'turn_based', False)
        }
    
    @abstractmethod
    def is_game_finished(self, game_state: GameState, 
                        players: Dict[str, Player]) -> bool:
        """Check if game is finished"""
        pass
    
    def calculate_final_scores(self, game_state: GameState,
                             players: Dict[str, Player]) -> Dict[str, float]:
        """Calculate final scores and determine winner"""
        return game_state.scores
    
    @abstractmethod
    def is_turn_finished(self, current_round_actions: List[ActionData], 
                        game_state: GameState, 
                        players: Dict[str, Player]) -> bool:
        """Check if the current turn is finished (for turn-based games)
        
        For role-based games where a role may have multiple players,
        this method should determine if enough players from the current
        role have acted to complete the turn.
        """
        pass
    
    @abstractmethod
    def is_round_finished(self, current_round_actions: List[ActionData], 
                         game_state: GameState, 
                         players: Dict[str, Player]) -> bool:
        """Check if the current round is finished
        
        For role-based games where roles may have multiple players,
        this method should determine if enough players from all roles
        have acted to complete the entire round.
        """
        pass