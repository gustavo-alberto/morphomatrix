"""Application path configuration.

Expected layout (both locally and inside the container):

    <root>/backend/app/config.py
    <root>/frontend/
    <root>/data/

Inside the container <root> is /app, so data lives in /app/data (volume).
Paths can be overridden through environment variables.
"""

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = Path(os.environ.get("MORPHO_DATA_DIR", ROOT_DIR / "data")).resolve()
FRONTEND_DIR = Path(os.environ.get("MORPHO_FRONTEND_DIR", ROOT_DIR / "frontend")).resolve()

# Each matrix: MATRICES_DIR/{id}.json + MATRICES_DIR/{id}/uploads/
MATRICES_DIR = DATA_DIR / "matrices"
