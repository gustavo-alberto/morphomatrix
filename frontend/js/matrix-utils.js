// Pure helpers about the matrix data model, shared by editor and print views.

// Mirrors backend defaults (models.py). User-facing, therefore in Portuguese.
export const DEFAULT_PARAMETER_NAMES = ["Complexidade", "Custo"];
export const DEFAULT_PARAMETER_VALUE = 3;
export const PARAMETER_MIN = 1; // best (green)
export const PARAMETER_MAX = 5; // worst (red)
export const PARAMETER_VALUES = [1, 2, 3, 4, 5];

export const cellKey = (rowId, columnId) => `${rowId}_${columnId}`;

/** Column label derived from its position: S1, S2, ... */
export const columnLabel = (column) => `S${column.order + 1}`;

export const isDefaultParameter = (name) => DEFAULT_PARAMETER_NAMES.includes(name);

export function defaultParameters() {
  return DEFAULT_PARAMETER_NAMES.map((name) => ({ name, value: DEFAULT_PARAMETER_VALUE }));
}

/** Stored cell, or an unsaved empty cell with default parameters. */
export function getCell(matrix, rowId, columnId) {
  return (
    matrix.cells[cellKey(rowId, columnId)] ?? {
      solution_name: "",
      photo: null,
      parameters: defaultParameters(),
    }
  );
}

export function isCellEmpty(cell) {
  return !cell.solution_name && !cell.photo;
}

export function photoUrl(matrixId, relativePath) {
  return `/api/matrices/${encodeURIComponent(matrixId)}/${relativePath}`;
}

/** Return a copy of `ids` with the item at `index` moved by `delta` (-1 / +1). */
export function moveId(ids, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= ids.length) return null;
  const copy = [...ids];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
