#!/usr/bin/env python3
"""
Main entry point for the NUS Web Security Gameplay backend server.
Run this from the backend directory.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src", "games", "agents", "config"]
    )