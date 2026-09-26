"""Backup export/import endpoints."""

import os

from fastapi import APIRouter, UploadFile, status
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from .. import backup
from ..models import Matrix

router = APIRouter(prefix="/api/matrices", tags=["backup"])


@router.get("/{matrix_id}/export", response_class=FileResponse)
def export_matrix(matrix_id: str) -> FileResponse:
    tmp_path, download_name = backup.export_matrix(matrix_id)
    return FileResponse(
        tmp_path,
        media_type="application/zip",
        filename=download_name,
        # Remove the temp zip once it has been sent.
        background=BackgroundTask(os.unlink, tmp_path),
    )


@router.post("/import", response_model=Matrix, status_code=status.HTTP_201_CREATED)
def import_matrix(file: UploadFile) -> Matrix:
    return backup.import_matrix(file.file)
