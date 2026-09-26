"""Pydantic schemas for the morphological matrix domain and API payloads.

Stored models (Matrix, Row, Column, Cell, ...) mirror the JSON file persisted
for each matrix. Input models (*Create / *Update) carry the validation rules
applied to user-provided data.
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Self
from uuid import uuid4

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

PARAMETER_MIN = 1  # best (green)
PARAMETER_MAX = 5  # worst (red)
DEFAULT_PARAMETER_VALUE = 3


class ParameterKey(StrEnum):
    """Built-in parameters. The UI translates their labels; no text is stored."""

    COMPLEXITY = "complexity"
    COST = "cost"


# Built-in parameters every new cell starts with, in display order.
DEFAULT_PARAMETER_KEYS = (ParameterKey.COMPLEXITY, ParameterKey.COST)

NAME_MAX_LENGTH = 200

# Free text, trimmed, never blank.
Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=NAME_MAX_LENGTH),
]
ParameterValue = Annotated[int, Field(ge=PARAMETER_MIN, le=PARAMETER_MAX)]
# Hex color, e.g. "#4f9dde"; stored lowercase.
Color = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^#[0-9a-fA-F]{6}$"),
]


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
    """A 1-5 rating: either built-in (`key`) or custom (free-text `name`)."""

    key: ParameterKey | None = None
    name: Name | None = None
    value: ParameterValue = DEFAULT_PARAMETER_VALUE

    @model_validator(mode="after")
    def check_key_or_name(self) -> Self:
        if (self.key is None) == (self.name is None):
            raise ValueError("A parameter needs either a key (built-in) or a name (custom), not both")
        return self


def default_parameters() -> list[Parameter]:
    return [Parameter(key=key) for key in DEFAULT_PARAMETER_KEYS]


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
    # Columns have no title and no visible label; `order` sets the display order.
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
    # The UI sends a translated title; when omitted, a neutral fallback is used.
    title: Name | None = None


class RowUpdate(BaseModel):
    title: Name


class ReorderRequest(BaseModel):
    # Row order: must contain every existing row id exactly once, in the desired order.
    ids: list[str]


class CellUpdate(BaseModel):
    solution_name: Annotated[
        str, StringConstraints(strip_whitespace=True, max_length=NAME_MAX_LENGTH)
    ] = ""
    parameters: list[Parameter]

    @field_validator("parameters")
    @classmethod
    def check_unique(cls, parameters: list[Parameter]) -> list[Parameter]:
        keys = [p.key for p in parameters if p.key is not None]
        names = [p.name.casefold() for p in parameters if p.name is not None]
        if len(keys) != len(set(keys)) or len(names) != len(set(names)):
            raise ValueError("Duplicate parameters")
        return parameters


class CombinationCreate(BaseModel):
    # The UI sends a translated name; when omitted, a neutral fallback and a
    # palette color are used.
    name: Name | None = None
    color: Color | None = None


class CombinationUpdate(BaseModel):
    # Partial update: only provided fields are changed.
    name: Name | None = None
    color: Color | None = None
    # Replaces all selections (row_id -> column_id).
    selections: dict[str, str] | None = None


class CombinationDuplicate(BaseModel):
    # The UI sends a translated name; when omitted, "{original} (copy)" is used.
    name: Name | None = None


class SelectionToggle(BaseModel):
    row_id: str
    column_id: str


# --- Responses ---------------------------------------------------------------


class AffectedCombination(BaseModel):
    id: str
    name: str


class RemovalResponse(BaseModel):
    """Result of deleting a row/column, listing combinations that lost a selection."""

    matrix: Matrix
    affected_combinations: list[AffectedCombination]
