"""Photo file handling for cells.

Photos are stored as MATRICES_DIR/{matrix_id}/uploads/{random}.{jpg|png|webp} and
referenced from the matrix JSON by the relative path "uploads/{filename}".
The file type is detected from the content (magic bytes), never trusted from
the client-provided name or content type.
"""

import logging
import re
import uuid
from pathlib import Path

from . import storage
from .errors import NotFoundError, PhotoTooLargeError, UnsupportedPhotoTypeError

logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 5 * 1024 * 1024
UPLOADS_PREFIX = "uploads/"

_FILENAME_RE = re.compile(r"^[0-9a-f]{32}\.(jpg|png|webp)$")
_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
# WebP is a RIFF container: "RIFF" + 4-byte size + "WEBP".
_RIFF_MAGIC = b"RIFF"
_WEBP_FOURCC = b"WEBP"

MEDIA_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def detect_extension(data: bytes) -> str | None:
    if data.startswith(_JPEG_MAGIC):
        return "jpg"
    if data.startswith(_PNG_MAGIC):
        return "png"
    if data.startswith(_RIFF_MAGIC) and data[8:12] == _WEBP_FOURCC:
        return "webp"
    return None


def validate_photo(data: bytes) -> str:
    """Check size and type; return the file extension to use."""
    if len(data) > MAX_PHOTO_BYTES:
        raise PhotoTooLargeError()
    extension = detect_extension(data)
    if extension is None:
        raise UnsupportedPhotoTypeError()
    return extension


def is_valid_filename(filename: str) -> bool:
    return bool(_FILENAME_RE.fullmatch(filename))


def filename_from_relative(relative_path: str) -> str | None:
    """Extract the filename from "uploads/{filename}", or None if malformed."""
    if not relative_path.startswith(UPLOADS_PREFIX):
        return None
    filename = relative_path.removeprefix(UPLOADS_PREFIX)
    return filename if is_valid_filename(filename) else None


def save_photo(matrix_id: str, data: bytes, extension: str) -> str:
    """Write the photo under a fresh random name; return its relative path."""
    directory = storage.uploads_dir(matrix_id)
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    (directory / filename).write_bytes(data)
    return UPLOADS_PREFIX + filename


def delete_photo_file(matrix_id: str, relative_path: str | None) -> None:
    """Best-effort removal of a photo file; malformed paths are ignored."""
    if not relative_path:
        return
    filename = filename_from_relative(relative_path)
    if filename is None:
        logger.warning("Ignoring malformed photo path %r", relative_path)
        return
    try:
        (storage.uploads_dir(matrix_id) / filename).unlink(missing_ok=True)
    except OSError as exc:
        logger.warning("Could not delete photo %s: %s", relative_path, exc)


def photo_path(matrix_id: str, filename: str) -> Path:
    """Resolve an existing photo file, raising NotFoundError otherwise."""
    if not is_valid_filename(filename):
        raise NotFoundError("Photo", filename)
    path = storage.uploads_dir(matrix_id) / filename
    if not path.is_file():
        raise NotFoundError("Photo", filename)
    return path
