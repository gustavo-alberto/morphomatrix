"""Pydantic schemas for the morphological matrix domain and API payloads.

Stored models (Matrix, Row, Column, Cell, ...) mirror the JSON file persisted
for each matrix. Input models (*Create / *Update) carry the validation rules
applied to user-provided data.
"""

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from pydantic import BaseModel, Field, StringConstraints

PARAMETER_MIN = 1  # best (green)
PARAMETER_MAX = 5  # worst (red)
DEFAULT_PARAMETER_VALUE = 3

# User-facing labels, therefore kept in Portuguese.
DEFAULT_PARAMETER_NAMES = ("Complexidade", "Custo")

NAME_MAX_LENGTH = 200

# Free text, trimmed, never blank.
Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=NAME_MAX_LENGTH),
]
ParameterValue = Annotated[int, Field(ge=PARAMETER_MIN, le=PARAMETER_MAX)]


def utc_now() -> datetime:
    return datetime.now(UTC)


def new_matrix_id() -> str:
    return str(uuid4())


def new_item_id() -> str:
    """Short id for rows, columns and combinations (unique within a matrix)."""
    return uuid4().hex[:12]


def cell_key(row_id: str, column_id: str) -> str:
    return f"{row_id}_{column_id}"


# --- Stored models -----------------------------------------------------------


class Parameter(BaseModel):
    name: Name
    value: ParameterValue = DEFAULT_PARAMETER_VALUE


def default_parameters() -> list[Parameter]:
    return [Parameter(name=name) for name in DEFAULT_PARAMETER_NAMES]


class Cell(BaseModel):
    solution_name: str = ""
    # Path relative to the matrix folder, e.g. "uploads/abcd1234.jpg".
    photo: str | None = None
    parameters: list[Parameter] = Field(default_factory=default_parameters)


class Row(BaseModel):
    id: str
    title: str
    order: int


class Column(BaseModel):
    # Columns have no title: the UI label (S1, S2, ...) is derived from `order`.
    id: str
    order: int


class Combination(BaseModel):
    id: str
    name: str
    color: str
    # row_id -> column_id (at most one selected column per row).
    selections: dict[str, str] = Field(default_factory=dict)


class Matrix(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    rows: list[Row] = Field(default_factory=list)
    columns: list[Column] = Field(default_factory=list)
    # Keyed by cell_key(row_id, column_id).
    cells: dict[str, Cell] = Field(default_factory=dict)
    combinations: list[Combination] = Field(default_factory=list)


class MatrixSummary(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime


# --- Input models ------------------------------------------------------------


class MatrixCreate(BaseModel):
    name: Name


class MatrixUpdate(BaseModel):
    name: Name


class RowCreate(BaseModel):
    # When omitted, a default title ("Função N") is generated.
    title: Name | None = None


class RowUpdate(BaseModel):
    title: Name


class ReorderRequest(BaseModel):
    # Must contain every existing id exactly once, in the desired order.
    ids: list[str]


class CellUpdate(BaseModel):
    solution_name: Annotated[
        str, StringConstraints(strip_whitespace=True, max_length=NAME_MAX_LENGTH)
    ] = ""
    parameters: list[Parameter]


# --- Responses ---------------------------------------------------------------


class AffectedCombination(BaseModel):
    id: str
    name: str


class RemovalResponse(BaseModel):
    """Result of deleting a row/column, listing combinations that lost a selection."""

    matrix: Matrix
    affected_combinations: list[AffectedCombination]
