// Home page: list, create, rename, delete and import matrices.

import { api } from "./api.js";
import { initThemeToggle } from "./theme.js";
import { confirmDialog, el, errorMessage, formatDateTime, promptDialog, toast } from "./ui.js";

const listEl = document.getElementById("matrix-list");
const statusEl = document.getElementById("list-status");
const newButton = document.getElementById("new-matrix-btn");
const importButton = document.getElementById("import-btn");
const importInput = document.getElementById("import-input");

const editorUrl = (id) => `editor.html?id=${encodeURIComponent(id)}`;

// --- Rendering --------------------------------------------------------------

function renderTime(label, iso) {
  return el("span", {}, `${label} `, el("time", { datetime: iso, text: formatDateTime(iso) }));
}

function renderItem(matrix) {
  return el(
    "li",
    { class: "matrix-item" },
    el(
      "div",
      { class: "matrix-info" },
      el("a", { class: "matrix-name", href: editorUrl(matrix.id), text: matrix.name }),
      el(
        "p",
        { class: "matrix-meta" },
        renderTime("Criada em", matrix.created_at),
        el("span", { "aria-hidden": "true", text: " · " }),
        renderTime("Atualizada em", matrix.updated_at),
      ),
    ),
    el(
      "div",
      { class: "matrix-actions" },
      el("a", { class: "btn", href: editorUrl(matrix.id), "aria-label": `Abrir ${matrix.name}`, text: "Abrir" }),
      el("button", {
        type: "button",
        class: "btn",
        "aria-label": `Renomear ${matrix.name}`,
        text: "Renomear",
        onClick: () => renameMatrix(matrix),
      }),
      el("button", {
        type: "button",
        class: "btn btn-danger-outline",
        "aria-label": `Excluir ${matrix.name}`,
        text: "Excluir",
        onClick: () => deleteMatrix(matrix),
      }),
    ),
  );
}

function renderList(matrices) {
  listEl.replaceChildren(...matrices.map(renderItem));
  const empty = matrices.length === 0;
  statusEl.hidden = !empty;
  statusEl.textContent = empty ? "Nenhuma matriz ainda. Crie a primeira ou importe um backup." : "";
}

async function loadList() {
  try {
    renderList(await api.listMatrices());
  } catch (error) {
    statusEl.hidden = false;
    statusEl.textContent = "Não foi possível carregar as matrizes.";
    toast(errorMessage(error), "error");
  }
}

// --- Actions ----------------------------------------------------------------

async function createMatrix() {
  const name = await promptDialog({ title: "Nova matriz", label: "Nome da matriz", confirmLabel: "Criar" });
  if (name === null) return;
  try {
    const matrix = await api.createMatrix(name);
    window.location.href = editorUrl(matrix.id);
  } catch (error) {
    toast(errorMessage(error, {}, "Não foi possível criar a matriz."), "error");
  }
}

async function renameMatrix(matrix) {
  const name = await promptDialog({ title: "Renomear matriz", label: "Nome da matriz", value: matrix.name });
  if (name === null || name === matrix.name) return;
  try {
    await api.renameMatrix(matrix.id, name);
    toast("Matriz renomeada.", "success");
  } catch (error) {
    toast(errorMessage(error, { 404: "Esta matriz não existe mais." }, "Não foi possível renomear a matriz."), "error");
  }
  await loadList();
}

async function deleteMatrix(matrix) {
  const confirmed = await confirmDialog({
    title: "Excluir matriz",
    message: `A matriz "${matrix.name}" e todas as suas fotos serão excluídas permanentemente.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api.deleteMatrix(matrix.id);
    toast(`Matriz "${matrix.name}" excluída.`, "success");
  } catch (error) {
    toast(errorMessage(error, { 404: "Esta matriz já havia sido excluída." }, "Não foi possível excluir a matriz."), "error");
  }
  await loadList();
}

async function importBackup(file) {
  importButton.disabled = true;
  importButton.textContent = "Importando…";
  try {
    const matrix = await api.importMatrix(file);
    toast(`Backup importado como nova matriz: "${matrix.name}".`, "success");
    await loadList();
  } catch (error) {
    toast(
      errorMessage(
        error,
        {
          413: "O backup excede o tamanho máximo permitido.",
          422: "Arquivo inválido. Selecione um backup .zip exportado pelo Morphomatrix.",
        },
        "Não foi possível importar o backup.",
      ),
      "error",
    );
  } finally {
    importButton.disabled = false;
    importButton.textContent = "Importar";
  }
}

// --- Wiring -----------------------------------------------------------------

initThemeToggle(document.getElementById("theme-toggle"));
newButton.addEventListener("click", createMatrix);
importButton.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  importInput.value = ""; // allow re-selecting the same file later
  if (file) importBackup(file);
});

loadList();
