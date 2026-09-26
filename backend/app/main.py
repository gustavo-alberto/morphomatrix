"""FastAPI application entry point.

- API routes live under the /api prefix.
- The static frontend (plain HTML/CSS/JS) is served at the root "/".
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, MATRICES_DIR


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure the data layout exists (the volume may start empty).
    MATRICES_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Morphomatrix", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Must be the last mount: it catches everything that is not an API route.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
