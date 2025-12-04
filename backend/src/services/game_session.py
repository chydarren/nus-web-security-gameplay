import asyncio
import json
import sys
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Type, Any
from pathlib import Path
import importlib

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.models.core import GameState, GameConfig, GameEvent, EventType, GamePhase
from src.models.player import Player, ActionData, RoundResult, GameSummary
from games.base import GameLogic
from agents.base import AIAgent
from src.services.websocket_manager import websocket_manager

class GameSession:
    """Enhanced game session with modular architecture"""
    
    def __init__(self, config_file: str = "config/default.json"):
        self.config_file = config_file
        
        # Load configuration
        self.game_config = self._load_config()
        
        # Create a empty game state (not initialized yet, wait for all players to join)
        self.game_state = GameState(max_rounds=self.game_config.total_rounds)
        self.players: Dict[str, Player] = {}
        self.current_round_actions: List[ActionData] = []
        
        # Load game logic dynamically
        self.game_logic = self._load_game_logic()
        
        # AI agents
        self.ai_agents: Dict[str, AIAgent] = {}
        
        # Round timing
        self.round_deadline: Optional[datetime] = None
        self.round_timer_task: Optional[asyncio.Task] = None
        
    async def initialize():
        # Auto-add AI agents if configured
        await self._auto_add_ai_agents()
    
    def _load_config(self) -> GameConfig:
        """Load game configuration from file"""
        try:
            config_path = Path(__file__).parent.parent.parent / self.config_file
            with open(config_path, 'r') as f:
                config_data = json.load(f)
            return GameConfig(**config_data)
        except FileNotFoundError:
            raise ValueError(f"Configuration file not found: {self.config_file}")
    
    def _load_game_logic(self) -> GameLogic:
        """Dynamically load game logic from explicit class specification"""
        try:
            if not self.game_config.game_logic_class:
                raise ValueError(f"game_logic_class must be specified in configuration. Example: 'ids_game.IDSGameLogic'")
            
            # Use explicit class specification (e.g., "ids_game.IDSGameLogic")
            if '.' not in self.game_config.game_logic_class:
                raise ValueError(f"game_logic_class must use format 'module.ClassName', got: '{self.game_config.game_logic_class}'")
            
            # Format: "module.ClassName" - split and import
            module_path, class_name = self.game_config.game_logic_class.rsplit('.', 1)
            full_module_name = f"games.{module_path}"
            
            # Dynamically import the module
            module = importlib.import_module(full_module_name)
            
            # Get the class from the module
            logic_class = getattr(module, class_name)
            
            # Instantiate and return
            return logic_class(self.game_config)
                
        except (ImportError, AttributeError) as e:
            raise ValueError(f"Failed to load game logic class '{self.game_config.game_logic_class}': {e}. Make sure the module exists and the class name is correct.")
    
    async def _auto_add_ai_agents(self) -> None:
        """Automatically add AI agents based on game configuration"""
        
        if not self.game_config.ai_agents:
            return
        
        # Add AI agents using asyncio.run to handle the async calls
        for ai_config in self.game_config.ai_agents:
            try:
                player = await self.add_ai_player(ai_config.agent_type, ai_config)
                
                print(f"Auto-added AI agent: {player.player_name} as {player.role}")
                
            except Exception as e:
                print(f"Warning: Failed to create AI agent: {e}")
    
    async def add_player(self, player_name: str, role: str) -> Player:
        """Add a new player to the game with selected role"""
        if len(self.players) >= self.game_config.required_players:
            raise ValueError("Game is full")
        
        if self.game_state.phase != GamePhase.WAITING_FOR_PLAYERS:
            raise ValueError("Cannot join game in current phase")
        
        # Use game logic to validate if player can join with this role
        is_valid, error_message = self.game_logic.validate_join(
            player_name, role, self.players, self.game_state
        )
        if not is_valid:
            raise ValueError(error_message)
        
        # Create player with selected role
        player = self.game_logic.create_player(player_name=player_name, role=role)
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
        
        # Auto-start game if we have enough players
        if len(self.players) == self.game_config.required_players:
            print(f"Game is full ({len(self.players)}/{self.game_config.required_players}), starting game automatically...")
            await self.start_game()
        
        return player
    
    async def add_ai_agent(self, agent_type: str, agent_config: Dict[str, Any]) -> Player:
        """Add an AI agent to the game"""
        # Create AI agent using explicit class specification
        if '.' not in agent_config.agent_type:
            raise ValueError(f"agent_type must use format 'module.ClassName', got: '{agent_config.agent_type}'")
        
        module_path, agent_class_name = agent_config.agent_type.rsplit('.', 1)
        agent_module_name = f"agents.{module_path}"
        
        try:
            module = importlib.import_module(agent_module_name)
            agent_class = getattr(module, agent_class_name)
            agent = agent_class(agent_config.config)
        except (ImportError, AttributeError) as e:
            print(f"Warning: Failed to load AI agent '{agent_config.agent_type}': {e}")
            raise
        
        # Create player for the agent
        if agent_config.player_name:
            player_name = agent_config.player_name
        else:
            # Extract class name from agent_type for cleaner default names
            class_name = agent_config.agent_type.split('.')[-1] if '.' in agent_config.agent_type else agent_config.agent_type
            player_name = f"AI-{class_name}-{len(self.ai_agents) + 1}"
        player = await self.add_player(f"AI-{class_name}", role=agent_config.get("role", "player"))
        self.players[player.player_id] = player
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
        self.game_state.started_at = datetime.now(timezone.utc)
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
        self.round_deadline = datetime.now(timezone.utc) + timedelta(
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
                "message": f"Round {self.game_state.current_round} Started",
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
        player.last_action_at = datetime.now(timezone.utc)
        
        # Track action progress without broadcasting individual ACTION_RECEIVED events
        actions_received = len(self.current_round_actions)
        actions_needed = self._get_required_actions_count()

        print(f"DEBUG: Action submitted by {player.player_name} ({player_id})")
        print(f"DEBUG: Actions received: {actions_received}/{actions_needed}")
        print(f"DEBUG: Connected players: {[p.player_name for p in self.players.values() if p.is_connected]}")

        # Only broadcast action count updates, not individual events
        await self._broadcast_update({
            'type': 'ACTION_COUNT_UPDATE',
            'player_id': player_id,
            'round_number': self.game_state.current_round,
            'actions_received': actions_received,
            'actions_needed': actions_needed
        })        # For turn-based games, move to next turn or process round
        if self.game_config.turn_based:
            # Check if current turn is finished using game logic
            if self.game_logic.is_turn_finished(self.current_round_actions, self.game_state, self.players):
                next_role = self.game_logic.get_next_turn_role(self.game_state)
                if next_role is None:
                    # All turns completed, process round
                    await self._process_round()
                else:
                    self.game_state.current_turn_role = next_role
                    await self._trigger_ai_agents()
        else:
            # Check if round is finished using game logic
            if self.game_logic.is_round_finished(self.current_round_actions, self.game_state, self.players):
                await self._process_round()
    
    async def _process_round(self) -> None:
        """Process the current round"""
        if self.round_timer_task:
            self.round_timer_task.cancel()
        
        self.game_state.phase = GamePhase.PROCESSING_ACTIONS
        
        # Process actions through game logic
        round_result = self.game_logic.process_round(
            self.current_round_actions, self.game_state, self.players
        )
        
        # Update player scores
        for player_id, payoff in round_result.payoffs.items():
            if player_id in self.players:
                self.players[player_id].total_score += payoff
                self.players[player_id].round_scores.append(payoff)
        
        # Update game state
        self.game_state = self.game_logic.update_game_state(
            self.game_state, round_result, self.players
        )
        
        # Now reveal all the actions from this round with proper round information
        for action_data in self.current_round_actions:
            action_reveal_event = GameEvent(
                event_type=EventType.ACTION_SUBMITTED,
                player_id=action_data.player.player_id,
                round_number=self.game_state.current_round,
                data={
                    "action": action_data.action,
                    "player_name": action_data.player.player_name,
                    "revealed": True,
                    "round_number": self.game_state.current_round,
                    "message": f"Round {self.game_state.current_round}: {action_data.player.player_name} chose {action_data.action}"
                },
                visible_to_roles=action_data.visible_to_roles
            )
            self.game_state.history.add_event(action_reveal_event)
        
        # Add round completed event with proper round information
        event = GameEvent(
            event_type=EventType.ROUND_COMPLETED,
            round_number=self.game_state.current_round,
            data={
                "round_number": self.game_state.current_round,
                "round_summary": round_result.round_summary,
                "payoffs": round_result.payoffs,
                "actions": [(a.player.player_name, a.action) for a in self.current_round_actions],
                "message": f"Round {self.game_state.current_round} Completed"
            }
        )
        self.game_state.history.add_event(event)
        
        # Log player scores at round completion
        print(f"\n=== Round {self.game_state.current_round} Completed ===")
        sorted_players = sorted(self.players.items(), key=lambda x: x[1].total_score, reverse=True)
        for rank, (player_id, player) in enumerate(sorted_players, 1):
            print(f"{rank}. {player.player_name} ({player.role}): {player.total_score} points")
        print("=" * 50)
        
        # Notify players of round results with action reveals
        await self._broadcast_update({
            'type': 'ROUND_COMPLETED',
            'round_number': self.game_state.current_round,
            'round_result': {
                'round_summary': round_result.round_summary,
                'payoffs': round_result.payoffs,
                'player_scores': {pid: p.total_score for pid, p in self.players.items()},
                'actions': [(a.player.player_name, a.action) for a in self.current_round_actions]
            }
        })
        
        # Check if game is finished
        if self.game_logic.is_game_finished(self.game_state, self.players):
            await self._end_game()
        else:
            # Move to next round
            self.game_state.current_round += 1
            await asyncio.sleep(2)  # Brief pause between rounds
            await self._start_round()
    
    async def _end_game(self) -> None:
        """End the game and calculate final results"""
        self.game_state.phase = GamePhase.GAME_END
        self.game_state.ended_at = datetime.now(timezone.utc)
        
        # Calculate final scores
        final_scores = self.game_logic.calculate_final_scores(self.game_state, self.players)
        
        # Determine winner
        winners = self.game_logic.get_winner(self.game_state, self.players)
        if not winners:
            winner_name = None
        else:
            winner_names = [winner.player_name for winner in winners]
        
        winner_display_name = ' and '. join(winner_names)
        # Add game ended event
        event = GameEvent(
            event_type=EventType.GAME_ENDED,
            data={
                "final_scores": final_scores,
                "winner": winner_display_name,
                "duration_seconds": int((self.game_state.ended_at - self.game_state.started_at).total_seconds()) if self.game_state.started_at else 0
            }
        )
        self.game_state.history.add_event(event)
        
        # Notify players
        await self._broadcast_update({
            'type': 'GAME_ENDED',
            'final_scores': final_scores,
            'winner': winner_display_name,
            'game_summary': {
                'total_rounds': self.game_state.current_round,
                'duration_seconds': event.data["duration_seconds"],
                'players': {pid: self._serialize_player(player) for pid, player in self.players.items()}
            }
        })
    
    async def _round_timer(self) -> None:
        """Timer for round timeout"""
        try:
            await asyncio.sleep(self.game_config.round_timeout_seconds)
            # Time's up, process round with submitted actions only
            if self.game_state.phase == GamePhase.AWAITING_ACTIONS:
                await self._process_round()
        except asyncio.CancelledError:
            pass  # Timer was cancelled
    
    async def _trigger_ai_agents(self) -> None:
        """Trigger AI agents to take actions if it's their turn"""
        for player_id, agent in self.ai_agents.items():
            player = self.players[player_id]
            
            if player.can_act_in_phase(self.game_state.phase, self.game_state.current_turn_role):
                # Check if agent hasn't acted yet this round
                if not any(a.player.player_id == player_id for a in self.current_round_actions):
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
        """Get estimated number of actions needed to complete the round
        
        This is now used only for UI display purposes. The actual logic
        for determining round completion is handled by game logic methods.
        """
        if self.game_config.turn_based:
            # For turn-based games, estimate based on current turn role
            current_role = self.game_state.current_turn_role
            if current_role:
                role_players = [p for p in self.players.values() if p.role == current_role and p.is_connected]
                return len(role_players)
            return 1  # Fallback for single action per turn
        else:
            # Only count connected players, same as the game logic
            connected_players = [p for p in self.players.values() if p.is_connected]
            return len(connected_players)
    
    def _get_current_round_action_status(self) -> Dict[str, bool]:
        """Get which players have submitted actions for the current round"""
        action_status = {}
        
        # Get all connected players
        for player_id, player in self.players.items():
            if player.is_connected:
                # Check if player has submitted action for current round
                has_acted = any(
                    action.player.player_id == player_id 
                    for action in self.current_round_actions
                )
                action_status[player_id] = has_acted
        
        return action_status
    
    def _serialize_player(self, player: Player) -> Dict[str, Any]:
        """Serialize player for API responses"""
        return {
            "player_id": player.player_id,
            "player_name": player.player_name,
            "role": player.role,
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
            "round_deadline": self.round_deadline.isoformat() if self.round_deadline else None,
            "description": self.game_config.description
        }
    
    async def _broadcast_update(self, message: Dict[str, Any]) -> None:
        """Broadcast update to all connected players"""
        # Send personalized messages based on player roles
        for player_id, player in self.players.items():
            personalized_message = self._personalize_message(message, player)
            await websocket_manager.send_personal_message(personalized_message, player_id)
    
    def _personalize_message(self, message: Dict[str, Any], player: Player) -> Dict[str, Any]:
        """Personalize message based on player role and visibility rules"""
        # Add visible game state for the player
        if message.get('type') in ['ROUND_STARTED', 'GAME_STARTED']:
            message['visible_state'] = self.game_logic.get_visible_state(self.game_state, player)
            message['available_actions'] = self.game_logic.get_available_actions(player, self.game_state)
        
        return message
    
    async def player_disconnected(self, player_id: str) -> None:
        """Handle player disconnection"""
        if player_id in self.players:
            self.players[player_id].is_connected = False
            
            # Notify other players
            await self._broadcast_update({
                'type': 'PLAYER_DISCONNECTED',
                'player_id': player_id
            })
    
    async def player_reconnected(self, player_id: str) -> None:
        """Handle player reconnection"""
        if player_id in self.players:
            self.players[player_id].is_connected = True
            
            # Send current game state to reconnected player
            visible_state = self.game_logic.get_visible_state(self.game_state, self.players[player_id])
            available_actions = self.game_logic.get_available_actions(self.players[player_id], self.game_state)
            
            await websocket_manager.send_personal_message({
                'type': 'RECONNECTED',
                'game_state': self._get_public_game_state(),
                'visible_state': visible_state,
                'available_actions': available_actions
            }, player_id)