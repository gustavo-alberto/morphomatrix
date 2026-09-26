"""FastAPI application entry point.

- API routes live under the /api prefix.
- The static frontend (plain HTML/CSS/JS) is served at the root "/".
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, MATRICES_DIR
from .errors import (
    BackupTooLargeError,
    InvalidBackupError,
    InvalidOperationError,
    NotFoundError,
    PhotoTooLargeError,
    UnsupportedPhotoTypeError,
)
from .photos import MAX_PHOTO_BYTES
from .routers import backup, cells, columns, combinations, matrices, rows


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure the data layout exists (the volume may start empty).
    MATRICES_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Morphomatrix", lifespan=lifespan)


@app.exception_handler(NotFoundError)
async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": f"{exc.resource} not found"},
    )


@app.exception_handler(InvalidOperationError)
async def invalid_operation_handler(_: Request, exc: InvalidOperationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": str(exc)},
    )


@app.exception_handler(PhotoTooLargeError)
async def photo_too_large_handler(_: Request, __: PhotoTooLargeError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        content={"detail": f"Photo exceeds {MAX_PHOTO_BYTES // (1024 * 1024)}MB"},
    )


@app.exception_handler(UnsupportedPhotoTypeError)
async def unsupported_photo_handler(_: Request, __: UnsupportedPhotoTypeError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        content={"detail": "Only JPG, PNG and WebP photos are accepted"},
    )


@app.exception_handler(InvalidBackupError)
async def invalid_backup_handler(_: Request, exc: InvalidBackupError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": str(exc)},
    )


@app.exception_handler(BackupTooLargeError)
async def backup_too_large_handler(_: Request, __: BackupTooLargeError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        content={"detail": "Backup exceeds size limits"},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(matrices.router)
app.include_router(rows.router)
app.include_router(columns.router)
app.include_router(cells.router)
app.include_router(combinations.router)
app.include_router(backup.router)

# Must be the last mount: it catches everything that is not an API route.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
