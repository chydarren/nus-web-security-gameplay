# 🎮 Game Theory Platform v7: Security Defense Game

A modular game theory platform with React frontend and FastAPI backend, implementing a simplified security defense game where players collaborate to protect a shared network.

## 🌟 Features

- **Modular Architecture**: Pluggable game logic and AI agents
- **Real-time Gameplay**: WebSocket-based real-time updates
- **AI Agent Support**: Simple rule-based and LLM-based agents
- **Security Game**: Collaborative defense against probabilistic attacks
- **Modern Frontend**: React with TypeScript and Tailwind CSS
- **Role-based Gameplay**: Players take on defender roles

## 🏗️ Architecture

```
├── backend/                 # FastAPI backend
│   ├── src/                # Core application code
│   │   ├── models/         # Pydantic data models
│   │   ├── services/       # Business logic services
│   │   ├── api/           # REST API endpoints
│   │   └── utils/         # Utility functions
│   ├── games/             # Game logic modules
│   ├── agents/            # AI agent implementations
│   └── config/            # Game configurations
└── frontend/              # React frontend
    ├── src/
    │   ├── components/    # React components
    │   ├── hooks/         # Custom React hooks
    │   ├── services/      # API services
    │   └── types/         # TypeScript types
    └── public/
```

## 🚀 Quick Start

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   python -m src.main
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## 🎮 How to Play

### Security Defense Game

1. **Game Setup**: Create a new game (requires 3 players)
2. **Join Game**: Players join as "defender" role
3. **Add AI Agents**: Optionally add AI players to fill slots
4. **Start Game**: Begin the 5-round security defense simulation

### Gameplay Mechanics

- **Network Security**: Shared network security level (0-100%)
- **Individual Defense**: Each player's personal defense level
- **Actions**: "Reinforce" defenses (costs 5 points) or "Do Nothing"
- **Attacks**: Random attacks occur with increasing probability each round
- **Damage**: Successful attacks damage all players, but those with higher defense take less damage

### Scoring

- **Reinforcement Cost**: -5 points per reinforcement action
- **Attack Damage**: Variable damage based on individual defense level
- **Goal**: Minimize total damage while balancing reinforcement costs

## 🤖 AI Agents

### Simple Agent
```bash
curl -X POST http://localhost:8000/api/add_ai_agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "simple",
    "agent_config": {
      "role": "defender",
      "personality": "strategic"
    }
  }'
```

Available personalities:
- `strategic`: Balances multiple factors
- `aggressive`: Reinforces when network security is low
- `conservative`: Reinforces frequently for safety

### OpenAI Agent (requires API key)
```bash
curl -X POST http://localhost:8000/api/add_ai_agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "openai",
    "agent_config": {
      "api_key": "your-openai-key",
      "model": "gpt-4",
      "personality": "strategic",
      "role": "defender"
    }
  }'
```

## 📋 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

- `POST /api/create_game` - Create a new game session
- `POST /api/join` - Join the game as a human player
- `POST /api/add_ai_agent` - Add an AI agent to the game
- `POST /api/start` - Start the game when all players have joined
- `POST /api/action/{player_id}` - Submit a player action
- `GET /api/state` - Get current game state
- `GET /api/state/{player_id}` - Get player-specific game state
- `WS /ws/{player_id}` - WebSocket connection for real-time updates

## 🎯 Game Configuration

Edit `backend/config/game_configs/security_game.json` to customize:

```json
{
  "game_type": "security_game",
  "total_rounds": 5,
  "required_players": 3,
  "round_timeout_seconds": 120,
  "game_specific_config": {
    "initial_network_security": 100,
    "base_attack_probability": 0.3,
    "reinforcement_cost": 5,
    "reinforcement_benefit": 10,
    "attack_damage_base": 50
  }
}
```

## 🔧 Development

### Adding New Games

1. Create a new game logic class in `backend/games/`
2. Extend the `GameLogic` abstract base class
3. Implement all required methods
4. Create a configuration file in `backend/config/game_configs/`

### Adding New AI Agents

1. Create a new agent class in `backend/agents/`
2. Extend the `AIAgent` abstract base class
3. Implement the `get_action` method
4. Handle any required configuration in `__init__`

## 🐛 Troubleshooting

### Backend Issues
- Ensure Python 3.8+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify the server is running on port 8000

### Frontend Issues
- Ensure Node.js 16+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### WebSocket Connection Issues
- Check that the backend is running and accessible
- Verify CORS settings in the backend
- Check browser console for connection errors


## Documentation

Developer and user documentation is available in the `docs/` folder. See `docs/README.md` for getting started with the docs.