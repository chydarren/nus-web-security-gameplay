import argparse
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import logging

from .api.game import router as game_router, create_game
from .api.websocket import router as websocket_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_args():
    parser = argparse.ArgumentParser(description="NUS Game Theory Platform Backend")
    parser.add_argument(
        "--host", type=str, default="0.0.0.0"
    )
    parser.add_argument(
        "--port", type=int, default=8000
    )
    parser.add_argument(
        "--game_config", type=str, default="config/default.json",
        help="Path to the game configuration file"
    )
    return parser.parse_args()

args = parse_args()

app = FastAPI(title="NUS IDS Platform", version="0.1.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(game_router, prefix="/api", tags=["game"])
app.include_router(websocket_router, tags=["websocket"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NUS IDS Platform",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    global args
    """Create a game when server starts"""
    try:
        logger.info("Creating game on server startup...")
        await create_game(args.game_config)
        logger.info("Game created successfully!")
    except Exception as e:
        logger.error(f"Failed to create game: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=args.host,
        port=args.port,
        reload=True
    )