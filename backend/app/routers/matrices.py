"""Matrix CRUD endpoints."""

from fastapi import APIRouter, status

from .. import storage
from ..models import Matrix, MatrixCreate, MatrixSummary, MatrixUpdate

router = APIRouter(
    prefix="/api/matrices",
    tags=["matrices"],
    responses={404: {"description": "Matrix not found"}},
)


@router.get("", response_model=list[MatrixSummary])
def list_matrices() -> list[MatrixSummary]:
    return storage.list_matrices()


@router.post("", response_model=Matrix, status_code=status.HTTP_201_CREATED)
def create_matrix(payload: MatrixCreate) -> Matrix:
    return storage.create_matrix(payload.name)


@router.get("/{matrix_id}", response_model=Matrix)
def get_matrix(matrix_id: str) -> Matrix:
    return storage.get_matrix(matrix_id)


@router.put("/{matrix_id}", response_model=Matrix)
def update_matrix(matrix_id: str, payload: MatrixUpdate) -> Matrix:
    return storage.rename_matrix(matrix_id, payload.name)


@router.delete("/{matrix_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_matrix(matrix_id: str) -> None:
    storage.delete_matrix(matrix_id)
