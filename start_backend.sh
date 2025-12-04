#!/bin/bash

echo "Game Theory Platform - Starting Backend..."

# Navigate to backend directory
cd backend

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting backend server on http://localhost:8000"
# python -m src.main --port 10001 --game_config config/game_configs/ids_nash_with_agents.json 
python -m src.main --port 10001 --game_config config/game_configs/ids_nash.json 