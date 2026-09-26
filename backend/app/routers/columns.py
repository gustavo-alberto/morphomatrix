"""Column (solution) endpoints."""

from fastapi import APIRouter, status

from .. import domain, photos, storage
from ..models import Matrix, ReorderRequest, RemovalResponse

router = APIRouter(prefix="/api/matrices/{matrix_id}/columns", tags=["columns"])


@router.post("", response_model=Matrix, status_code=status.HTTP_201_CREATED)
def add_column(matrix_id: str) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.add_column(matrix)
    return matrix


# Declared before "/{column_id}" routes for consistency with rows.
@router.put("/reorder", response_model=Matrix)
def reorder_columns(matrix_id: str, payload: ReorderRequest) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.reorder_columns(matrix, payload.ids)
    return matrix


@router.delete("/{column_id}", response_model=RemovalResponse)
def delete_column(matrix_id: str, column_id: str) -> RemovalResponse:
    with storage.edit_matrix(matrix_id) as matrix:
        result = domain.delete_column(matrix, column_id)
    for photo in result.orphan_photos:
        photos.delete_photo_file(matrix_id, photo)
    return RemovalResponse(matrix=matrix, affected_combinations=result.affected_combinations)
