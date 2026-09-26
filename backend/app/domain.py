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
    Combination,
    Matrix,
    Parameter,
    Row,
    cell_key,
    new_item_id,
)

# Fallbacks for API clients that send no name. The UI always sends a name in
# the user's language, so these are neutral (English) and rarely stored.
DEFAULT_ROW_TITLE = "Function {n}"
DEFAULT_COMBINATION_NAME = "Combination {n}"
DUPLICATE_COMBINATION_NAME = "{name} (copy)"

# Combination colors, assigned in order (first unused wins). Pure green/red
# are avoided so they do not clash with the 1-5 parameter scale colors.
COMBINATION_PALETTE = (
    "#4f9dde",  # blue
    "#9b5de5",  # purple
    "#f4a261",  # orange
    "#2a9d8f",  # teal
    "#e76f9a",  # pink
    "#3d5a80",  # navy
    "#c9a227",  # gold
    "#6c757d",  # gray
)


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


def find_combination(matrix: Matrix, combination_id: str) -> Combination:
    for combination in matrix.combinations:
        if combination.id == combination_id:
            return combination
    raise NotFoundError("Combination", combination_id)


# --- Helpers -----------------------------------------------------------------


def _renumber(items: list[Row] | list[Column]) -> None:
    for index, item in enumerate(items):
        item.order = index


def _reordered(items: list[Row], ids: list[str]) -> list[Row]:
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


# --- Combinations ------------------------------------------------------------


def _next_color(matrix: Matrix) -> str:
    used = {c.color for c in matrix.combinations}
    for color in COMBINATION_PALETTE:
        if color not in used:
            return color
    return COMBINATION_PALETTE[len(matrix.combinations) % len(COMBINATION_PALETTE)]


def _validate_selections(matrix: Matrix, selections: dict[str, str]) -> None:
    """Every key must be an existing row and every value an existing column.

    Being a dict, a selection map already holds at most one column per row.
    """
    row_ids = {r.id for r in matrix.rows}
    column_ids = {c.id for c in matrix.columns}
    unknown_rows = sorted(set(selections) - row_ids)
    unknown_columns = sorted(set(selections.values()) - column_ids)
    if unknown_rows or unknown_columns:
        raise InvalidOperationError(
            f"Unknown ids in selections: rows={unknown_rows}, columns={unknown_columns}"
        )


def add_combination(matrix: Matrix, name: str | None = None, color: str | None = None) -> Combination:
    combination = Combination(
        id=new_item_id(),
        name=name or DEFAULT_COMBINATION_NAME.format(n=len(matrix.combinations) + 1),
        color=color or _next_color(matrix),
    )
    matrix.combinations.append(combination)
    return combination


def update_combination(
    matrix: Matrix,
    combination_id: str,
    name: str | None = None,
    color: str | None = None,
    selections: dict[str, str] | None = None,
) -> Combination:
    combination = find_combination(matrix, combination_id)
    if selections is not None:
        _validate_selections(matrix, selections)
        combination.selections = dict(selections)
    if name is not None:
        combination.name = name
    if color is not None:
        combination.color = color
    return combination


def toggle_selection(matrix: Matrix, combination_id: str, row_id: str, column_id: str) -> Combination:
    """Select `column_id` for `row_id`, or unselect it if already selected.

    Selecting replaces any previous selection on the same row.
    """
    combination = find_combination(matrix, combination_id)
    find_row(matrix, row_id)
    find_column(matrix, column_id)
    if combination.selections.get(row_id) == column_id:
        del combination.selections[row_id]
    else:
        combination.selections[row_id] = column_id
    return combination


def duplicate_combination(matrix: Matrix, combination_id: str, name: str | None = None) -> Combination:
    """Copy a combination (selections included) right after the original."""
    original = find_combination(matrix, combination_id)
    copy = Combination(
        id=new_item_id(),
        name=name or DUPLICATE_COMBINATION_NAME.format(name=original.name),
        color=_next_color(matrix),
        selections=dict(original.selections),
    )
    index = matrix.combinations.index(original)
    matrix.combinations.insert(index + 1, copy)
    return copy


def delete_combination(matrix: Matrix, combination_id: str) -> None:
    matrix.combinations.remove(find_combination(matrix, combination_id))


# --- Consistency -------------------------------------------------------------


def normalize(matrix: Matrix) -> list[str]:
    """Repair a matrix loaded from an external source (e.g. backup import).

    Sorts and renumbers rows/columns and drops cells or selections that point
    to rows/columns that do not exist. Returns a description of each repair.
    """
    repairs: list[str] = []

    matrix.rows.sort(key=lambda r: r.order)
    matrix.columns.sort(key=lambda c: c.order)
    _renumber(matrix.rows)
    _renumber(matrix.columns)

    row_ids = {r.id for r in matrix.rows}
    column_ids = {c.id for c in matrix.columns}
    valid_keys = {cell_key(r, c) for r in row_ids for c in column_ids}

    for key in [k for k in matrix.cells if k not in valid_keys]:
        del matrix.cells[key]
        repairs.append(f"dropped orphan cell {key}")

    for combination in matrix.combinations:
        for row_id, column_id in list(combination.selections.items()):
            if row_id not in row_ids or column_id not in column_ids:
                del combination.selections[row_id]
                repairs.append(f"dropped orphan selection {row_id}->{column_id} in {combination.id}")

    return repairs
