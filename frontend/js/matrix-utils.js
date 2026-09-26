// Pure helpers about the matrix data model, shared by editor and print views.

import { t } from "./i18n.js";

// Built-in parameters, mirroring backend defaults (models.py). They carry a
// `key` and no stored name; the label comes from "parameter.{key}".
export const DEFAULT_PARAMETER_KEYS = ["complexity", "cost"];
export const DEFAULT_PARAMETER_VALUE = 3;
export const PARAMETER_MIN = 1; // best (green)
export const PARAMETER_MAX = 5; // worst (red)
export const PARAMETER_VALUES = [1, 2, 3, 4, 5];

export const cellKey = (rowId, columnId) => `${rowId}_${columnId}`;

// Query value used by the print view for "no highlighted combination".
export const NO_COMBINATION = "none";

export function printUrl(matrixId, combinationId) {
  const params = new URLSearchParams({ id: matrixId, combination: combinationId ?? NO_COMBINATION });
  return `print.html?${params}`;
}

/**
 * Column label derived from its position: S1, S2, ... Not shown in the UI
 * (columns are unnamed slots); kept as an internal/debug reference.
 */
export const columnLabel = (column) => `S${column.order + 1}`;

/** 1-based column position, used only in screen-reader text ("column 2 of 3"). */
export const columnNumber = (column) => column.order + 1;

/** Built-in parameters cannot be renamed or removed. */
export const isBuiltInParameter = (parameter) => Boolean(parameter.key);

/** Display name: translated for built-in parameters, as typed for custom ones. */
export function parameterLabel(parameter) {
  return parameter.key ? t(`parameter.${parameter.key}`) : parameter.name ?? "";
}

export function defaultParameters() {
  return DEFAULT_PARAMETER_KEYS.map((key) => ({ key, name: null, value: DEFAULT_PARAMETER_VALUE }));
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
