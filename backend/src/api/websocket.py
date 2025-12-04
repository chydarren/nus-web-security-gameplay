from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.websocket_manager import websocket_manager
from ..api.game import game_session

router = APIRouter()

@router.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    """WebSocket endpoint for real-time game updates"""
    await websocket_manager.connect(websocket, player_id)
    
    # Mark player as connected if they're in the game
    if game_session and player_id in game_session.players:
        await game_session.player_reconnected(player_id)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # In this simple implementation, we just echo back
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        websocket_manager.disconnect(player_id)
        # Mark player as disconnected if they're in the game
        if game_session and player_id in game_session.players:
            await game_session.player_disconnected(player_id)