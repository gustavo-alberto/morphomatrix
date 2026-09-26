"""FastAPI application entry point.

- API routes live under the /api prefix.
- The static frontend (plain HTML/CSS/JS) is served at the root "/".
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, MATRICES_DIR
from .routers import matrices
from .storage import MatrixNotFoundError


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure the data layout exists (the volume may start empty).
    MATRICES_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Morphomatrix", lifespan=lifespan)


@app.exception_handler(MatrixNotFoundError)
async def matrix_not_found_handler(_: Request, exc: MatrixNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Matrix not found"})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(matrices.router)

# Must be the last mount: it catches everything that is not an API route.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
