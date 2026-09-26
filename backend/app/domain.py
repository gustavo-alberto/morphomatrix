"""Pure in-memory operations on a Matrix (no I/O).

Callers are expected to run these inside storage.edit_matrix() so changes are
persisted atomically. Rows and columns are always kept sorted by `order`, with
`order` normalized to 0..n-1 after every structural change.
"""

from dataclasses import dataclass, field

from .errors import InvalidOperationError, NotFoundError
from .models import (
    AffectedCombination,
    Cell,
    Column,
    Matrix,
    Parameter,
    Row,
    cell_key,
    new_item_id,
)

# User-facing label, therefore kept in Portuguese.
DEFAULT_ROW_TITLE = "Função {n}"


@dataclass
class RemovalResult:
    affected_combinations: list[AffectedCombination] = field(default_factory=list)
    # Relative photo paths no longer referenced; delete them after saving.
    orphan_photos: list[str] = field(default_factory=list)


# --- Lookups -----------------------------------------------------------------


def find_row(matrix: Matrix, row_id: str) -> Row:
    for row in matrix.rows:
        if row.id == row_id:
            return row
    raise NotFoundError("Row", row_id)


def find_column(matrix: Matrix, column_id: str) -> Column:
    for column in matrix.columns:
        if column.id == column_id:
            return column
    raise NotFoundError("Column", column_id)


# --- Helpers -----------------------------------------------------------------


def _renumber(items: list[Row] | list[Column]) -> None:
    for index, item in enumerate(items):
        item.order = index


def _reordered[T: (Row, Column)](items: list[T], ids: list[str]) -> list[T]:
    by_id = {item.id: item for item in items}
    if len(ids) != len(by_id) or set(ids) != set(by_id):
        raise InvalidOperationError("ids must contain every existing id exactly once")
    return [by_id[item_id] for item_id in ids]


def _remove_cells(matrix: Matrix, keys: list[str], result: RemovalResult) -> None:
    for key in keys:
        cell = matrix.cells.pop(key, None)
        if cell is not None and cell.photo:
            result.orphan_photos.append(cell.photo)


# --- Rows --------------------------------------------------------------------


def add_row(matrix: Matrix, title: str | None = None) -> Row:
    row = Row(
        id=new_item_id(),
        title=title or DEFAULT_ROW_TITLE.format(n=len(matrix.rows) + 1),
        order=len(matrix.rows),
    )
    matrix.rows.append(row)
    return row


def rename_row(matrix: Matrix, row_id: str, title: str) -> Row:
    row = find_row(matrix, row_id)
    row.title = title
    return row


def reorder_rows(matrix: Matrix, ids: list[str]) -> None:
    matrix.rows = _reordered(matrix.rows, ids)
    _renumber(matrix.rows)


def delete_row(matrix: Matrix, row_id: str) -> RemovalResult:
    """Remove a row, its cells and any combination selection on it (cascade)."""
    row = find_row(matrix, row_id)
    result = RemovalResult()

    matrix.rows.remove(row)
    _renumber(matrix.rows)
    _remove_cells(matrix, [cell_key(row_id, c.id) for c in matrix.columns], result)

    for combination in matrix.combinations:
        if combination.selections.pop(row_id, None) is not None:
            result.affected_combinations.append(
                AffectedCombination(id=combination.id, name=combination.name)
            )
    return result


# --- Columns -----------------------------------------------------------------


def add_column(matrix: Matrix) -> Column:
    column = Column(id=new_item_id(), order=len(matrix.columns))
    matrix.columns.append(column)
    return column


def reorder_columns(matrix: Matrix, ids: list[str]) -> None:
    matrix.columns = _reordered(matrix.columns, ids)
    _renumber(matrix.columns)


def delete_column(matrix: Matrix, column_id: str) -> RemovalResult:
    """Remove a column, its cells and any combination selection on it (cascade)."""
    column = find_column(matrix, column_id)
    result = RemovalResult()

    matrix.columns.remove(column)
    _renumber(matrix.columns)
    _remove_cells(matrix, [cell_key(r.id, column_id) for r in matrix.rows], result)

    for combination in matrix.combinations:
        removed_rows = [r for r, c in combination.selections.items() if c == column_id]
        for row_id in removed_rows:
            del combination.selections[row_id]
        if removed_rows:
            result.affected_combinations.append(
                AffectedCombination(id=combination.id, name=combination.name)
            )
    return result


# --- Cells -------------------------------------------------------------------


def get_or_create_cell(matrix: Matrix, row_id: str, column_id: str) -> Cell:
    find_row(matrix, row_id)
    find_column(matrix, column_id)
    key = cell_key(row_id, column_id)
    if key not in matrix.cells:
        matrix.cells[key] = Cell()
    return matrix.cells[key]


def update_cell(
    matrix: Matrix,
    row_id: str,
    column_id: str,
    solution_name: str,
    parameters: list[Parameter],
) -> Cell:
    cell = get_or_create_cell(matrix, row_id, column_id)
    cell.solution_name = solution_name
    cell.parameters = parameters
    return cell
