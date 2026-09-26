"""Combination endpoints (sets of chosen solutions, one column per row)."""

from typing import Annotated

from fastapi import APIRouter, Body, status

from .. import domain, storage
from ..models import (
    CombinationCreate,
    CombinationDuplicate,
    CombinationUpdate,
    Matrix,
    SelectionToggle,
)

router = APIRouter(prefix="/api/matrices/{matrix_id}/combinations", tags=["combinations"])


@router.post("", response_model=Matrix, status_code=status.HTTP_201_CREATED)
def add_combination(
    matrix_id: str, payload: Annotated[CombinationCreate | None, Body()] = None
) -> Matrix:
    payload = payload or CombinationCreate()
    with storage.edit_matrix(matrix_id) as matrix:
        domain.add_combination(matrix, payload.name, payload.color)
    return matrix


@router.put("/{combination_id}", response_model=Matrix)
def update_combination(matrix_id: str, combination_id: str, payload: CombinationUpdate) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.update_combination(
            matrix, combination_id, payload.name, payload.color, payload.selections
        )
    return matrix


@router.post("/{combination_id}/toggle", response_model=Matrix)
def toggle_selection(matrix_id: str, combination_id: str, payload: SelectionToggle) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.toggle_selection(matrix, combination_id, payload.row_id, payload.column_id)
    return matrix


@router.post(
    "/{combination_id}/duplicate", response_model=Matrix, status_code=status.HTTP_201_CREATED
)
def duplicate_combination(
    matrix_id: str,
    combination_id: str,
    payload: Annotated[CombinationDuplicate | None, Body()] = None,
) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.duplicate_combination(matrix, combination_id, payload.name if payload else None)
    return matrix


@router.delete("/{combination_id}", response_model=Matrix)
def delete_combination(matrix_id: str, combination_id: str) -> Matrix:
    with storage.edit_matrix(matrix_id) as matrix:
        domain.delete_combination(matrix, combination_id)
    return matrix
