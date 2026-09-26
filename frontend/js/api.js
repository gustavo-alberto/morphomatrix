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

  importMatrix: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("POST", "/api/matrices/import", { body: form });
  },
  exportUrl: (id) => `${matrixPath(id)}/export`,
};
