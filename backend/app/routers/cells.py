"""Cell and photo endpoints."""

from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse

from .. import domain, photos, storage
from ..models import CellUpdate, Matrix, cell_key

router = APIRouter(prefix="/api/matrices/{matrix_id}", tags=["cells"])


@router.put("/cells/{row_id}/{column_id}", response_model=Matrix)
def update_cell(matrix_id: str, row_id: str, column_id: str, payload: CellUpdate) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.update_cell(matrix, row_id, column_id, payload.solution_name, payload.parameters)
    return matrix


@router.post("/cells/{row_id}/{column_id}/photo", response_model=Matrix)
def upload_photo(matrix_id: str, row_id: str, column_id: str, file: UploadFile) -> Matrix:
    # Read one byte past the limit so oversized files are detected without
    # loading arbitrarily large payloads into memory.
    data = file.file.read(photos.MAX_PHOTO_BYTES + 1)
    extension = photos.validate_photo(data)

    new_photo: str | None = None
    try:
        with storage.edit_matrix(matrix_id) as matrix:
            cell = domain.get_or_create_cell(matrix, row_id, column_id)
            new_photo = photos.save_photo(matrix_id, data, extension)
            old_photo, cell.photo = cell.photo, new_photo
    except BaseException:
        # Do not leave an unreferenced file behind if saving the matrix failed.
        photos.delete_photo_file(matrix_id, new_photo)
        raise

    # Upload replaces the previous photo (one photo per cell).
    photos.delete_photo_file(matrix_id, old_photo)
    return matrix


@router.delete("/cells/{row_id}/{column_id}/photo", response_model=Matrix)
def delete_photo(matrix_id: str, row_id: str, column_id: str) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.find_row(matrix, row_id)
        domain.find_column(matrix, column_id)
        cell = matrix.cells.get(cell_key(row_id, column_id))
        old_photo = cell.photo if cell else None
        if cell:
            cell.photo = None
    photos.delete_photo_file(matrix_id, old_photo)
    return matrix


@router.get("/uploads/{filename}", response_class=FileResponse)
def get_photo(matrix_id: str, filename: str) -> FileResponse:
    path = photos.photo_path(matrix_id, filename)
    extension = filename.rsplit(".", 1)[1]
    # Filenames are random and never reused, so the content is immutable.
    return FileResponse(
        path,
        media_type=photos.MEDIA_TYPES[extension],
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
