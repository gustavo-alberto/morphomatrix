"""Backup export/import as a zip file.

Zip layout:

    manifest.json       {"format": "morphomatrix-backup", "version": 1}
    matrix.json         the matrix document
    uploads/{file}      photos referenced by cells

Import always creates a brand-new, isolated matrix: new matrix id, new
uploads folder and freshly generated photo filenames. Zip entries are only
read by exact name and never extracted by path, so crafted entry names
(e.g. "../x") cannot write outside the data directory.
"""

import json
import logging
import os
import re
import shutil
import tempfile
import unicodedata
import zipfile
import zlib
from typing import BinaryIO

from pydantic import ValidationError

from . import domain, photos, storage
from .errors import BackupTooLargeError, InvalidBackupError
from .models import Matrix, new_matrix_id, utc_now

logger = logging.getLogger(__name__)

BACKUP_FORMAT = "morphomatrix-backup"
BACKUP_VERSION = 1
MANIFEST_NAME = "manifest.json"
MATRIX_NAME = "matrix.json"

MAX_BACKUP_BYTES = 1024 * 1024 * 1024  # compressed upload
MAX_MATRIX_JSON_BYTES = 20 * 1024 * 1024
MAX_ENTRIES = 20_000


# --- Export ------------------------------------------------------------------


def export_filename(matrix: Matrix) -> str:
    """ASCII-safe download name, e.g. "Matriz-Projeto-X_20260926-1530.zip"."""
    ascii_name = unicodedata.normalize("NFKD", matrix.name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^A-Za-z0-9]+", "-", ascii_name).strip("-") or "matriz"
    return f"{slug}_{utc_now():%Y%m%d-%H%M}.zip"


def export_matrix(matrix_id: str) -> tuple[str, str]:
    """Build the backup zip in a temp file; return (temp_path, download_name).

    The caller is responsible for deleting the temp file.
    """
    matrix = storage.get_matrix(matrix_id)
    fd, tmp_path = tempfile.mkstemp(prefix="morpho-export-", suffix=".zip")
    try:
        with os.fdopen(fd, "wb") as fh, zipfile.ZipFile(fh, "w", zipfile.ZIP_DEFLATED) as zf:
            manifest = {"format": BACKUP_FORMAT, "version": BACKUP_VERSION}
            zf.writestr(MANIFEST_NAME, json.dumps(manifest))
            zf.writestr(MATRIX_NAME, matrix.model_dump_json(indent=2))

            for cell in matrix.cells.values():
                filename = photos.filename_from_relative(cell.photo) if cell.photo else None
                if filename is None:
                    continue
                source = storage.uploads_dir(matrix_id) / filename
                if source.is_file():
                    # Photos are already compressed; storing avoids wasted CPU.
                    zf.write(source, cell.photo, compress_type=zipfile.ZIP_STORED)
                else:
                    logger.warning("Photo %s missing on disk, not exported", cell.photo)
    except BaseException:
        os.unlink(tmp_path)
        raise
    return tmp_path, export_filename(matrix)


# --- Import ------------------------------------------------------------------


def _read_entry(zf: zipfile.ZipFile, info: zipfile.ZipInfo, limit: int) -> bytes:
    """Read an entry, enforcing `limit` on the actual decompressed size."""
    if info.file_size > limit:
        raise BackupTooLargeError()
    try:
        with zf.open(info) as fh:
            data = fh.read(limit + 1)
    except (zipfile.BadZipFile, zlib.error, EOFError, RuntimeError, NotImplementedError):
        # Corrupted data, bad CRC, encrypted or unsupported compression.
        raise InvalidBackupError(f"Unreadable zip entry: {info.filename}") from None
    if len(data) > limit:
        raise BackupTooLargeError()
    return data


def _check_upload_size(fileobj: BinaryIO) -> None:
    fileobj.seek(0, os.SEEK_END)
    size = fileobj.tell()
    fileobj.seek(0)
    if size > MAX_BACKUP_BYTES:
        raise BackupTooLargeError()


def _check_manifest(zf: zipfile.ZipFile, entries: dict[str, zipfile.ZipInfo]) -> None:
    info = entries.get(MANIFEST_NAME)
    if info is None:
        return  # tolerated: matrix.json alone is enough
    try:
        manifest = json.loads(_read_entry(zf, info, 64 * 1024))
    except (ValueError, UnicodeDecodeError):
        raise InvalidBackupError("Invalid manifest.json") from None
    if not isinstance(manifest, dict) or manifest.get("format") != BACKUP_FORMAT:
        raise InvalidBackupError("Not a Morphomatrix backup")
    version = manifest.get("version")
    if not isinstance(version, int) or version > BACKUP_VERSION:
        raise InvalidBackupError(f"Unsupported backup version: {version}")


def _load_matrix(zf: zipfile.ZipFile, entries: dict[str, zipfile.ZipInfo]) -> Matrix:
    info = entries.get(MATRIX_NAME)
    if info is None:
        raise InvalidBackupError("matrix.json not found in backup")
    try:
        matrix = Matrix.model_validate_json(_read_entry(zf, info, MAX_MATRIX_JSON_BYTES))
    except ValidationError as exc:
        raise InvalidBackupError(f"Invalid matrix.json: {exc.error_count()} error(s)") from None

    for label, items in (
        ("row", matrix.rows),
        ("column", matrix.columns),
        ("combination", matrix.combinations),
    ):
        ids = [item.id for item in items]
        if len(ids) != len(set(ids)):
            raise InvalidBackupError(f"Duplicate {label} ids in matrix.json")
    return matrix


def import_matrix(fileobj: BinaryIO) -> Matrix:
    """Create a new matrix from a backup zip and return it."""
    _check_upload_size(fileobj)
    try:
        zf = zipfile.ZipFile(fileobj)
    except zipfile.BadZipFile:
        raise InvalidBackupError("File is not a valid zip") from None

    with zf:
        infos = zf.infolist()
        if len(infos) > MAX_ENTRIES:
            raise BackupTooLargeError()
        entries = {info.filename: info for info in infos if not info.is_dir()}

        _check_manifest(zf, entries)
        matrix = _load_matrix(zf, entries)

        for repair in domain.normalize(matrix):
            logger.info("Import repair: %s", repair)

        now = utc_now()
        matrix.id = new_matrix_id()
        matrix.created_at = now
        matrix.updated_at = now

        try:
            for key, cell in matrix.cells.items():
                cell.photo = _import_photo(zf, entries, matrix.id, key, cell.photo)
            storage.insert_matrix(matrix)
        except BaseException:
            # Leave nothing behind for a failed import.
            shutil.rmtree(storage.matrix_dir(matrix.id), ignore_errors=True)
            raise

    return matrix


def _import_photo(
    zf: zipfile.ZipFile,
    entries: dict[str, zipfile.ZipInfo],
    matrix_id: str,
    key: str,
    relative_path: str | None,
) -> str | None:
    """Copy one photo into the new matrix; return its new relative path.

    Missing or invalid photos are dropped (the cell is kept without photo).
    """
    if not relative_path:
        return None
    info = entries.get(relative_path)
    if photos.filename_from_relative(relative_path) is None or info is None:
        logger.warning("Import: photo %r for cell %s missing or malformed, dropped", relative_path, key)
        return None
    if info.file_size > photos.MAX_PHOTO_BYTES:
        logger.warning("Import: photo %r exceeds size limit, dropped", relative_path)
        return None

    data = _read_entry(zf, info, photos.MAX_PHOTO_BYTES)
    extension = photos.detect_extension(data)
    if extension is None:
        logger.warning("Import: photo %r is not JPG/PNG, dropped", relative_path)
        return None
    return photos.save_photo(matrix_id, data, extension)
