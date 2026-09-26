"""Row (function) endpoints."""

from typing import Annotated

from fastapi import APIRouter, Body, status

from .. import domain, photos, storage
from ..models import Matrix, ReorderRequest, RemovalResponse, RowCreate, RowUpdate

router = APIRouter(prefix="/api/matrices/{matrix_id}/rows", tags=["rows"])


@router.post("", response_model=Matrix, status_code=status.HTTP_201_CREATED)
def add_row(matrix_id: str, payload: Annotated[RowCreate | None, Body()] = None) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.add_row(matrix, payload.title if payload else None)
    return matrix


# Declared before "/{row_id}" so "reorder" is not captured as a row id.
@router.put("/reorder", response_model=Matrix)
def reorder_rows(matrix_id: str, payload: ReorderRequest) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.reorder_rows(matrix, payload.ids)
    return matrix


@router.put("/{row_id}", response_model=Matrix)
def rename_row(matrix_id: str, row_id: str, payload: RowUpdate) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.rename_row(matrix, row_id, payload.title)
    return matrix


@router.delete("/{row_id}", response_model=RemovalResponse)
def delete_row(matrix_id: str, row_id: str) -> RemovalResponse:
    with storage.edit_matrix(matrix_id) as matrix:
        result = domain.delete_row(matrix, row_id)
    for photo in result.orphan_photos:
        photos.delete_photo_file(matrix_id, photo)
    return RemovalResponse(matrix=matrix, affected_combinations=result.affected_combinations)
