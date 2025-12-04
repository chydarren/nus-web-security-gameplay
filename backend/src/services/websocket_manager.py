from typing import Dict, List
from fastapi import WebSocket
import json

class WebSocketManager:
    """Manage WebSocket connections for real-time game updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, player_id: str):
        """Accept and store a WebSocket connection"""
        await websocket.accept()
        self.active_connections[player_id] = websocket
    
    def disconnect(self, player_id: str):
        """Remove a WebSocket connection"""
        if player_id in self.active_connections:
            del self.active_connections[player_id]
    
    async def send_personal_message(self, message: dict, player_id: str):
        """Send a message to a specific player"""
        if player_id in self.active_connections:
            try:
                await self.active_connections[player_id].send_text(json.dumps(message))
            except:
                # Connection broken, remove it
                self.disconnect(player_id)
    
    async def broadcast(self, message: dict):
        """Send a message to all connected players"""
        disconnected = []
        for player_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except:
                # Connection broken, mark for removal
                disconnected.append(player_id)
        
        # Remove broken connections
        for player_id in disconnected:
            self.disconnect(player_id)
    
    async def broadcast_to_players(self, message: dict, player_ids: List[str]):
        """Send a message to specific players"""
        disconnected = []
        for player_id in player_ids:
            if player_id in self.active_connections:
                try:
                    await self.active_connections[player_id].send_text(json.dumps(message))
                except:
                    disconnected.append(player_id)
        
        # Remove broken connections
        for player_id in disconnected:
            self.disconnect(player_id)

# Global instance
websocket_manager = WebSocketManager()