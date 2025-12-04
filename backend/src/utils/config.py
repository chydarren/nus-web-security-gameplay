import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

# Configuration directory
CONFIG_DIR = BASE_DIR / "config"

# Default configuration
DEFAULT_CONFIG = {
    "host": "0.0.0.0",
    "port": 8000,
    "debug": True
}