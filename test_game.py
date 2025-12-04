#!/usr/bin/env python3

"""
Simple test script to verify the game system works
"""

import sys
import os
import asyncio
import json

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from src.services.game_session import GameSession

async def test_game_session():
    """Test basic game session functionality"""
    print("🧪 Testing Game Theory Platform v7...")
    
    try:
        # Create game session
        print("1. Creating game session...")
        game_session = GameSession("config/game_configs/security_game.json")
        print(f"   Game ID: {game_session.game_state.game_id}")
        print(f"   Game Type: {game_session.game_config.game_type}")
        print(f"   Required Players: {game_session.game_config.required_players}")
        
        # Add players
        print("\n2. Adding players...")
        player1 = await game_session.add_player("Alice", "defender")
        print(f"   Added player: {player1.player_name} ({player1.role})")
        
        player2 = await game_session.add_player("Bob", "defender")
        print(f"   Added player: {player2.player_name} ({player2.role})")
        
        # Add AI agent
        print("\n3. Adding AI agent...")
        ai_player = await game_session.add_ai_agent("simple", {
            "role": "defender",
            "personality": "strategic"
        })
        print(f"   Added AI player: {ai_player.player_name} ({ai_player.role})")
        
        # Start game
        print("\n4. Starting game...")
        await game_session.start_game()
        print(f"   Game phase: {game_session.game_state.phase}")
        print(f"   Current round: {game_session.game_state.current_round}")
        
        # Simulate one round
        print("\n5. Simulating round 1...")
        
        # Players submit actions
        await game_session.submit_action(player1.player_id, "reinforce")
        print(f"   {player1.player_name} reinforced defenses")
        
        await game_session.submit_action(player2.player_id, "do_nothing")
        print(f"   {player2.player_name} did nothing")
        
        # AI will act automatically
        await asyncio.sleep(1)  # Wait for AI to act
        
        # Wait for round to complete
        await asyncio.sleep(2)
        
        print(f"\n6. Round 1 completed!")
        print(f"   Game phase: {game_session.game_state.phase}")
        print(f"   Current round: {game_session.game_state.current_round}")
        
        # Show player scores
        print("\n7. Player scores:")
        for pid, player in game_session.players.items():
            print(f"   {player.player_name}: {player.total_score} points")
        
        # Show network status
        network_security = game_session.game_state.game_specific_state.get("network_security_level", 0)
        successful_attacks = game_session.game_state.game_specific_state.get("successful_attacks", 0)
        total_attacks = game_session.game_state.game_specific_state.get("total_attacks", 0)
        
        print(f"\n8. Network status:")
        print(f"   Security level: {network_security}%")
        print(f"   Successful attacks: {successful_attacks}/{total_attacks}")
        
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_game_session())