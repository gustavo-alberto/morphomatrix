// Thin wrapper around the backend REST API.

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request(method, path, { json, body } = {}) {
  const init = { method, headers: { Accept: "application/json" } };
  if (json !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  } else if (body !== undefined) {
    // FormData: the browser sets the multipart boundary itself.
    init.body = body;
  }

  const response = await fetch(path, init);
  if (!response.ok) {
    let detail = null;
    try {
      const data = await response.json();
      detail = typeof data.detail === "string" ? data.detail : null;
    } catch {
      // Non-JSON error body: keep the status only.
    }
    throw new ApiError(response.status, detail);
  }
  return response.status === 204 ? null : response.json();
}

const matrixPath = (id) => `/api/matrices/${encodeURIComponent(id)}`;

export const api = {
  listMatrices: () => request("GET", "/api/matrices"),
  getMatrix: (id) => request("GET", matrixPath(id)),
  createMatrix: (name) => request("POST", "/api/matrices", { json: { name } }),
  renameMatrix: (id, name) => request("PUT", matrixPath(id), { json: { name } }),
  deleteMatrix: (id) => request("DELETE", matrixPath(id)),

  importMatrix: (file) => request("POST", "/api/matrices/import", { body: fileForm(file) }),
  exportUrl: (id) => `${matrixPath(id)}/export`,

  // Rows
  addRow: (id, title) => request("POST", `${matrixPath(id)}/rows`, { json: { title } }),
  renameRow: (id, rowId, title) =>
    request("PUT", `${matrixPath(id)}/rows/${encodeURIComponent(rowId)}`, { json: { title } }),
  reorderRows: (id, ids) => request("PUT", `${matrixPath(id)}/rows/reorder`, { json: { ids } }),
  deleteRow: (id, rowId) => request("DELETE", `${matrixPath(id)}/rows/${encodeURIComponent(rowId)}`),

  // Columns
  addColumn: (id) => request("POST", `${matrixPath(id)}/columns`),
  reorderColumns: (id, ids) => request("PUT", `${matrixPath(id)}/columns/reorder`, { json: { ids } }),
  deleteColumn: (id, columnId) =>
    request("DELETE", `${matrixPath(id)}/columns/${encodeURIComponent(columnId)}`),

  // Cells
  updateCell: (id, rowId, columnId, cell) => request("PUT", cellPath(id, rowId, columnId), { json: cell }),
  uploadPhoto: (id, rowId, columnId, file) =>
    request("POST", `${cellPath(id, rowId, columnId)}/photo`, { body: fileForm(file) }),
  deletePhoto: (id, rowId, columnId) => request("DELETE", `${cellPath(id, rowId, columnId)}/photo`),

  // Combinations
  createCombination: (id, name) => request("POST", `${matrixPath(id)}/combinations`, { json: { name } }),
  renameCombination: (id, combinationId, name) =>
    request("PUT", combinationPath(id, combinationId), { json: { name } }),
  toggleSelection: (id, combinationId, rowId, columnId) =>
    request("POST", `${combinationPath(id, combinationId)}/toggle`, {
      json: { row_id: rowId, column_id: columnId },
    }),
  duplicateCombination: (id, combinationId, name) =>
    request("POST", `${combinationPath(id, combinationId)}/duplicate`, { json: { name } }),
  deleteCombination: (id, combinationId) => request("DELETE", combinationPath(id, combinationId)),
};

function combinationPath(id, combinationId) {
  return `${matrixPath(id)}/combinations/${encodeURIComponent(combinationId)}`;
}

function cellPath(id, rowId, columnId) {
  return `${matrixPath(id)}/cells/${encodeURIComponent(rowId)}/${encodeURIComponent(columnId)}`;
}

function fileForm(file) {
  const form = new FormData();
  form.append("file", file);
  return form;
}
