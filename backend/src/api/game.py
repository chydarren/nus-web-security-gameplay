import logging
import traceback

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ..services.game_session import GameSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Global game session (in production, you'd use a proper session manager)
game_session: Optional[GameSession] = None

class JoinGameRequest(BaseModel):
    player_name: str
    role: str

class SubmitActionRequest(BaseModel):
    action: str
    action_data: Optional[Dict[str, Any]] = None

class AddAIAgentRequest(BaseModel):
    agent_type: str
    agent_config: Dict[str, Any]

@router.get("/game_info")
async def get_game_info():
    """Get current game information"""
    global game_session
    if game_session:
        # Get current role distribution
        role_counts = {}
        for player in game_session.players.values():
            role_counts[player.role] = role_counts.get(player.role, 0) + 1
        
        return {
            "success": True,
            "message": "Game session exists",
            "data": {
                "exists": True,
                "game_id": game_session.game_state.game_id,
                "phase": game_session.game_state.phase.value,
                "current_round": game_session.game_state.current_round,
                "current_players": len(game_session.players),
                "role_distribution": role_counts,
                "config": {
                    "game_type": game_session.game_config.game_type,
                    "description": getattr(game_session.game_config, 'description', 'No description available'),
                    "total_rounds": game_session.game_config.total_rounds,
                    "required_players": game_session.game_config.required_players,
                    "available_roles": game_session.game_logic.get_available_roles()
                }
            }
        }
    else:
        return {
            "success": True,
            "message": "No game session exists",
            "data": {"exists": False}
        }

@router.post("/create_game")
async def create_game(config_file: str = "config/default.json"):
    """Create a new game session"""
    global game_session
    try:
        game_session = GameSession(config_file)
        await game_session.initialize()
        return {
            "success": True,
            "message": "Game created successfully",
            "data": {
                "game_id": game_session.game_state.game_id,
                "config": {
                    "game_type": game_session.game_config.game_type,
                    "description": game_session.game_config.description,
                    "total_rounds": game_session.game_config.total_rounds,
                    "required_players": game_session.game_config.required_players,
                    "available_roles": game_session.game_logic.get_available_roles()
                }
            }
        }
    except Exception as e:
        logger.error(f"Failed to create game: {e}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Failed to create game: {str(e)}",
            "error": str(e)
        }

@router.post("/join")
async def join_game(request: JoinGameRequest):
    """Join the current game"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    try:
        player = await game_session.add_player(request.player_name, request.role)
        return {
            "success": True,
            "message": f"Player {request.player_name} joined as {request.role}",
            "data": {
                "player": {
                    "player_id": player.player_id,
                    "player_name": player.player_name,
                    "role": player.role
                },
                "game_state": game_session._get_public_game_state()
            }
        }
    except Exception as e:
        logger.error(f"Failed to add player {request.player_name} as {request.role}: {e}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Failed to join game: {str(e)}",
            "error": str(e)
        }

@router.post("/add_ai_agent")
async def add_ai_agent(request: AddAIAgentRequest):
    """Add an AI agent to the game"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    try:
        player = await game_session.add_ai_agent(request.agent_type, request.agent_config)
        return {
            "success": True,
            "message": f"AI agent {player.player_name} added as {player.role}",
            "data": {
                "player": {
                    "player_id": player.player_id,
                    "player_name": player.player_name,
                    "role": player.role,
                    "is_ai_agent": True
                }
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to add AI agent: {str(e)}",
            "error": str(e)
        }

@router.post("/start")
async def start_game():
    """Start the current game"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    try:
        await game_session.start_game()
        return {
            "success": True, 
            "message": "Game started successfully",
            "data": game_session._get_public_game_state()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to start game: {str(e)}",
            "error": str(e)
        }

@router.post("/action/{player_id}")
async def submit_action(player_id: str, request: SubmitActionRequest):
    """Submit a player action"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    try:
        await game_session.submit_action(player_id, request.action, request.action_data)
        return {
            "success": True, 
            "message": "Action submitted successfully",
            "data": {
                "action": request.action,
                "player_id": player_id
            }
        }
    except Exception as e:
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Failed to submit action: {str(e)}",
            "error": str(e)
        }

@router.get("/state")
async def get_game_state():
    """Get current game state"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    return {
        "success": True,
        "message": "Game state retrieved successfully",
        "data": game_session._get_public_game_state()
    }

@router.get("/state/{player_id}")
async def get_player_state(player_id: str):
    """Get game state visible to a specific player"""
    global game_session
    if not game_session:
        return {
            "success": False,
            "message": "No active game session found. Please create a game first.",
            "error": "NO_GAME_SESSION"
        }
    
    if player_id not in game_session.players:
        return {
            "success": False,
            "message": f"Player {player_id} not found in the game.",
            "error": "PLAYER_NOT_FOUND"
        }
    
    try:
        player = game_session.players[player_id]
        visible_state = game_session.game_logic.get_visible_state(game_session.game_state, player)
        available_actions = game_session.game_logic.get_available_actions(player, game_session.game_state)
        
        # Get game history visible to this player
        visible_events = game_session.game_state.history.get_events_for_player(player)
        
        # Convert events to frontend format with proper filtering and formatting
        game_history = []
        for event in visible_events:
            # Skip events that shouldn't be displayed in frontend
            if event.event_type.value in ["action_received", "action_count_update"]:
                continue
                
            # Format event for frontend display
            event_data = {
                "type": event.event_type.value.upper(),  # Convert to uppercase for consistency
                "player_id": event.player_id,
                "round_number": event.round_number,
                "timestamp": event.timestamp.isoformat()
            }
            
            # Add event-specific data with proper formatting
            if event.data:
                if event.event_type.value == "action_submitted" and event.data.get("revealed"):
                    # For revealed actions, include player name and action with round info
                    event_data.update({
                        "player_name": event.data.get("player_name"),
                        "action": event.data.get("action"),
                        "revealed": True,
                        "message": f"Round {event.round_number}: {event.data.get('player_name', 'Unknown')} chose {event.data.get('action', 'Unknown')}"
                    })
                elif event.event_type.value == "round_started":
                    event_data["message"] = f"Round {event.round_number} Started"
                elif event.event_type.value == "round_completed":
                    event_data["message"] = f"Round {event.round_number} Completed"
                    # Include round result data
                    event_data["data"] = event.data
                else:
                    # For other events, include original data
                    event_data["data"] = event.data
                    
                # Add any additional fields from event.data to top level for compatibility
                for key, value in event.data.items():
                    if key not in event_data:
                        event_data[key] = value
                        
            game_history.append(event_data)
        
        # Get current round action status
        action_status = game_session._get_current_round_action_status()
        
        return {
            "success": True,
            "message": "Player state retrieved successfully",
            "data": {
                "game_state": game_session._get_public_game_state(),
                "visible_state": visible_state,
                "global_game_info": game_session.game_logic.get_global_game_info(),
                "available_actions": available_actions,
                "player": game_session._serialize_player(player),
                "game_history": game_history,
                "action_status": action_status
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to get player state: {str(e)}",
            "error": str(e)
        }