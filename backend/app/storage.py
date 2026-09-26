"""JSON file persistence for matrices.

Layout on disk:

    MATRICES_DIR/{matrix_id}.json
    MATRICES_DIR/{matrix_id}/uploads/*.jpg|png

Writes are atomic (temp file + os.replace) and every read-modify-write cycle
is serialized by a process-wide lock, which is enough for a single-user app
running in a single process.
"""

import logging
import os
import shutil
import tempfile
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from pydantic import ValidationError

from .config import MATRICES_DIR
from .errors import MatrixNotFoundError
from .models import Matrix, MatrixSummary, new_matrix_id, utc_now

logger = logging.getLogger(__name__)

# Reentrant so helpers can be composed inside edit_matrix().
_lock = threading.RLock()


# --- Paths -------------------------------------------------------------------


def _is_valid_matrix_id(matrix_id: str) -> bool:
    """Only canonical UUIDs are accepted, which also prevents path traversal."""
    try:
        return str(uuid.UUID(matrix_id)) == matrix_id
    except (ValueError, TypeError, AttributeError):
        return False


def _require_valid_id(matrix_id: str) -> None:
    if not _is_valid_matrix_id(matrix_id):
        raise MatrixNotFoundError(matrix_id)


def _json_path(matrix_id: str) -> Path:
    return MATRICES_DIR / f"{matrix_id}.json"


def matrix_dir(matrix_id: str) -> Path:
    _require_valid_id(matrix_id)
    return MATRICES_DIR / matrix_id


def uploads_dir(matrix_id: str) -> Path:
    return matrix_dir(matrix_id) / "uploads"


# --- Low-level I/O -----------------------------------------------------------


def _write(matrix: Matrix) -> None:
    MATRICES_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=MATRICES_DIR, prefix=f".{matrix.id}.", suffix=".tmp")
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(matrix.model_dump_json(indent=2))
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, _json_path(matrix.id))
    except BaseException:
        tmp_path.unlink(missing_ok=True)
        raise


def _read(matrix_id: str) -> Matrix:
    _require_valid_id(matrix_id)
    try:
        raw = _json_path(matrix_id).read_text(encoding="utf-8")
    except FileNotFoundError:
        raise MatrixNotFoundError(matrix_id) from None
    return Matrix.model_validate_json(raw)


# --- Public API --------------------------------------------------------------


def list_matrices() -> list[MatrixSummary]:
    """Return summaries of all readable matrices, most recently updated first."""
    summaries: list[MatrixSummary] = []
    if not MATRICES_DIR.exists():
        return summaries

    for path in MATRICES_DIR.glob("*.json"):
        if not _is_valid_matrix_id(path.stem):
            continue
        try:
            matrix = Matrix.model_validate_json(path.read_text(encoding="utf-8"))
        except (OSError, ValidationError) as exc:
            logger.warning("Skipping unreadable matrix file %s: %s", path.name, exc)
            continue
        summaries.append(MatrixSummary.model_validate(matrix.model_dump()))

    summaries.sort(key=lambda s: s.updated_at, reverse=True)
    return summaries


def create_matrix(name: str) -> Matrix:
    now = utc_now()
    matrix = Matrix(id=new_matrix_id(), name=name, created_at=now, updated_at=now)
    with _lock:
        _write(matrix)
    return matrix


def insert_matrix(matrix: Matrix) -> None:
    """Persist a fully built matrix under a new id (used by backup import)."""
    _require_valid_id(matrix.id)
    with _lock:
        if _json_path(matrix.id).exists():
            raise FileExistsError(f"Matrix already exists: {matrix.id}")
        _write(matrix)


def get_matrix(matrix_id: str) -> Matrix:
    with _lock:
        return _read(matrix_id)


@contextmanager
def edit_matrix(matrix_id: str) -> Iterator[Matrix]:
    """Load a matrix, let the caller mutate it, then persist it.

    Nothing is saved if the block raises. `updated_at` is refreshed on save.
    """
    with _lock:
        matrix = _read(matrix_id)
        yield matrix
        matrix.updated_at = utc_now()
        _write(matrix)


def rename_matrix(matrix_id: str, name: str) -> Matrix:
    with edit_matrix(matrix_id) as matrix:
        matrix.name = name
    return matrix


def delete_matrix(matrix_id: str) -> None:
    """Remove the matrix JSON file and its uploads folder."""
    _require_valid_id(matrix_id)
    with _lock:
        path = _json_path(matrix_id)
        if not path.exists():
            raise MatrixNotFoundError(matrix_id)
        path.unlink()
        shutil.rmtree(matrix_dir(matrix_id), ignore_errors=True)
