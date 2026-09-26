// Home page: list, create, rename, delete and import matrices.

import { api } from "./api.js";
import { applyStaticTranslations, initLanguageSelect, t } from "./i18n.js";
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
  const name = matrix.name;
  return el(
    "li",
    { class: "matrix-item" },
    el(
      "div",
      { class: "matrix-info" },
      el("a", { class: "matrix-name", href: editorUrl(matrix.id), text: name }),
      el(
        "p",
        { class: "matrix-meta" },
        renderTime(t("home.createdAt"), matrix.created_at),
        el("span", { "aria-hidden": "true", text: " · " }),
        renderTime(t("home.updatedAt"), matrix.updated_at),
      ),
    ),
    el(
      "div",
      { class: "matrix-actions" },
      el("a", {
        class: "btn",
        href: editorUrl(matrix.id),
        "aria-label": t("home.openLabel", { name }),
        text: t("common.open"),
      }),
      el("button", {
        type: "button",
        class: "btn",
        "aria-label": t("home.renameLabel", { name }),
        text: t("common.rename"),
        onClick: () => renameMatrix(matrix),
      }),
      el("button", {
        type: "button",
        class: "btn btn-danger-outline",
        "aria-label": t("home.deleteLabel", { name }),
        text: t("common.delete"),
        onClick: () => deleteMatrix(matrix),
      }),
    ),
  );
}

function renderList(matrices) {
  listEl.replaceChildren(...matrices.map(renderItem));
  const empty = matrices.length === 0;
  statusEl.hidden = !empty;
  statusEl.textContent = empty ? t("home.empty") : "";
}

async function loadList() {
  try {
    renderList(await api.listMatrices());
  } catch (error) {
    statusEl.hidden = false;
    statusEl.textContent = t("home.loadError");
    toast(errorMessage(error), "error");
  }
}

// --- Actions ----------------------------------------------------------------

async function createMatrix() {
  const name = await promptDialog({
    title: t("home.newMatrix"),
    label: t("home.nameLabel"),
    confirmLabel: t("common.create"),
  });
  if (name === null) return;
  try {
    const matrix = await api.createMatrix(name);
    window.location.href = editorUrl(matrix.id);
  } catch (error) {
    toast(errorMessage(error, {}, t("home.createError")), "error");
  }
}

async function renameMatrix(matrix) {
  const name = await promptDialog({ title: t("home.renameTitle"), label: t("home.nameLabel"), value: matrix.name });
  if (name === null || name === matrix.name) return;
  try {
    await api.renameMatrix(matrix.id, name);
    toast(t("home.renamed"), "success");
  } catch (error) {
    toast(errorMessage(error, { 404: t("home.renameGone") }, t("home.renameError")), "error");
  }
  await loadList();
}

async function deleteMatrix(matrix) {
  const confirmed = await confirmDialog({
    title: t("home.deleteTitle"),
    message: t("home.deleteMessage", { name: matrix.name }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api.deleteMatrix(matrix.id);
    toast(t("home.deleted", { name: matrix.name }), "success");
  } catch (error) {
    toast(errorMessage(error, { 404: t("home.deleteGone") }, t("home.deleteError")), "error");
  }
  await loadList();
}

async function importBackup(file) {
  importButton.disabled = true;
  importButton.textContent = t("home.importing");
  try {
    const matrix = await api.importMatrix(file);
    toast(t("home.imported", { name: matrix.name }), "success");
    await loadList();
  } catch (error) {
    toast(
      errorMessage(
        error,
        { 413: t("home.importTooLarge"), 422: t("home.importInvalid") },
        t("home.importError"),
      ),
      "error",
    );
  } finally {
    importButton.disabled = false;
    importButton.textContent = t("home.import");
  }
}

// --- Wiring -----------------------------------------------------------------

applyStaticTranslations();
initLanguageSelect(document.getElementById("language-select"));
initThemeToggle(document.getElementById("theme-toggle"));
newButton.addEventListener("click", createMatrix);
importButton.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  importInput.value = ""; // allow re-selecting the same file later
  if (file) importBackup(file);
});

loadList();
