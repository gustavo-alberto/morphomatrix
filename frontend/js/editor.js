// Matrix editor: table of functions (rows) x solutions (columns).

import { ApiError, api } from "./api.js";
import { openCellDialog } from "./cell-dialog.js";
import {
  NO_COMBINATION,
  columnLabel,
  getCell,
  isCellEmpty,
  moveId,
  parameterLabel,
  photoUrl,
  printUrl,
} from "./matrix-utils.js";
import { applyStaticTranslations, initLanguageSelect, t } from "./i18n.js";
import { initThemeToggle } from "./theme.js";
import { getDetailedView, initDetailedViewToggle } from "./view-prefs.js";
import {
  NAME_MAX_LENGTH,
  choiceDialog,
  confirmDialog,
  el,
  errorMessage,
  promptDialog,
  toast,
} from "./ui.js";

const matrixId = new URLSearchParams(window.location.search).get("id");

const titleEl = document.getElementById("matrix-title");
const toolbarEl = document.getElementById("editor-toolbar");
const exportLink = document.getElementById("export-backup");
const statusEl = document.getElementById("editor-status");
const contentEl = document.getElementById("editor-content");
const comboBarEl = document.getElementById("combination-bar");
const hintEl = document.getElementById("editor-hint");
const tableWrap = document.getElementById("table-wrap");

let matrix = null;
let busy = false;
// Detailed view adds parameters and combination dots to the cells.
let detailedView = getDetailedView();

// Active combination is remembered per matrix across reloads.
const ACTIVE_COMBINATION_KEY = `morphomatrix.activeCombination.${matrixId}`;
let activeCombinationId = localStorage.getItem(ACTIVE_COMBINATION_KEY);

/** The active combination, or null when in plain edit mode. */
function activeCombination() {
  return matrix?.combinations.find((c) => c.id === activeCombinationId) ?? null;
}

function setActiveCombination(id) {
  activeCombinationId = id;
  if (id) localStorage.setItem(ACTIVE_COMBINATION_KEY, id);
  else localStorage.removeItem(ACTIVE_COMBINATION_KEY);
}

// --- State & actions --------------------------------------------------------

/** Replace the local state, re-render and optionally restore focus. */
function setMatrix(next, ...focusKeys) {
  matrix = next;
  render();
  focusFirst(focusKeys);
}

function focusFirst(keys) {
  for (const key of keys) {
    const node = document.querySelector(`[data-focus="${key}"]`);
    if (node && !node.disabled) {
      node.focus();
      return;
    }
  }
}

/**
 * Run a mutating action, one at a time. On failure, show a message and
 * reload the matrix so the UI reflects the server state.
 */
async function run(action, errorsByStatus = {}, fallback = t("editor.actionError")) {
  if (busy) return;
  busy = true;
  document.body.setAttribute("aria-busy", "true");
  try {
    await action();
  } catch (error) {
    toast(errorMessage(error, errorsByStatus, fallback), "error");
    await reload();
  } finally {
    busy = false;
    document.body.removeAttribute("aria-busy");
  }
}

async function reload() {
  try {
    setMatrix(await api.getMatrix(matrixId));
  } catch (error) {
    showFatal(error);
  }
}

function showFatal(error) {
  const notFound = !matrixId || (error instanceof ApiError && error.status === 404);
  toolbarEl.hidden = true;
  contentEl.hidden = true;
  statusEl.hidden = false;
  statusEl.replaceChildren(
    `${notFound ? t("common.matrixNotFound") : errorMessage(error, {}, t("common.matrixLoadError"))} `,
    el("a", { href: "./", text: t("common.backToList") }),
  );
}

// --- Rows -------------------------------------------------------------------

function addRow() {
  run(async () => {
    const title = t("editor.defaultRowTitle", { n: matrix.rows.length + 1 });
    const next = await api.addRow(matrixId, title);
    setMatrix(next);
    startRowRename(next.rows.at(-1));
  });
}

function moveRow(index, delta) {
  const ids = moveId(matrix.rows.map((r) => r.id), index, delta);
  if (!ids) return;
  const rowId = matrix.rows[index].id;
  const direction = delta < 0 ? "up" : "down";
  const opposite = delta < 0 ? "down" : "up";
  run(async () => {
    setMatrix(await api.reorderRows(matrixId, ids), `row-${direction}-${rowId}`, `row-${opposite}-${rowId}`);
  });
}

async function deleteRow(row) {
  const confirmed = await confirmDialog({
    title: t("editor.deleteRowTitle"),
    message: t("editor.deleteRowMessage", { title: row.title }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const { matrix: next, affected_combinations: affected } = await api.deleteRow(matrixId, row.id);
    setMatrix(next, "add-row");
    toast(removalMessage(t("editor.rowDeleted", { title: row.title }), affected), "success");
  }, { 404: t("editor.rowGone") });
}

function startRowRename(row) {
  const button = document.querySelector(`[data-focus="row-title-${row.id}"]`);
  if (!button) return;
  const input = el("input", {
    class: "input input-sm row-title-input",
    type: "text",
    maxlength: NAME_MAX_LENGTH,
    autocomplete: "off",
    "aria-label": t("editor.rowNameLabel"),
  });
  input.value = row.title;

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const title = input.value.trim();
    if (!save || !title || title === row.title) {
      if (save && !title) toast(t("editor.rowNameEmpty"), "error");
      input.replaceWith(button);
      button.focus();
      return;
    }
    run(async () => {
      setMatrix(await api.renameRow(matrixId, row.id, title), `row-title-${row.id}`);
    }, { 404: t("editor.rowMissing") });
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));

  button.replaceWith(input);
  input.focus();
  input.select();
}

// --- Columns ----------------------------------------------------------------

function addColumn() {
  run(async () => {
    const next = await api.addColumn(matrixId);
    setMatrix(next, "add-column");
    tableWrap.scrollLeft = tableWrap.scrollWidth;
  });
}

async function deleteColumn(column) {
  const label = columnLabel(column);
  const confirmed = await confirmDialog({
    title: t("editor.deleteColumnTitle"),
    message: t("editor.deleteColumnMessage", { label }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const { matrix: next, affected_combinations: affected } = await api.deleteColumn(matrixId, column.id);
    setMatrix(next, "add-column");
    toast(removalMessage(t("editor.columnDeleted", { label }), affected), "success");
  }, { 404: t("editor.columnGone") });
}

function removalMessage(message, affected) {
  if (!affected.length) return message;
  const names = affected.map((c) => `"${c.name}"`).join(", ");
  return t("editor.removedFromCombinations", { message, names });
}

// --- Cells ------------------------------------------------------------------

async function editCell(row, column, focusKey = `cell-${row.id}-${column.id}`) {
  if (busy) return;
  const next = await openCellDialog(matrix, row, column);
  if (next) setMatrix(next, focusKey);
  else focusFirst([focusKey]);
}

/** Mark/unmark a solution for its row in the active combination. */
function toggleCell(row, column) {
  const combination = activeCombination();
  if (!combination) return;
  run(async () => {
    const next = await api.toggleSelection(matrixId, combination.id, row.id, column.id);
    setMatrix(next, `cell-${row.id}-${column.id}`);
  }, { 404: t("editor.toggleGone") });
}

// --- Combinations -----------------------------------------------------------

const combinationErrors = { 404: t("editor.combinationGone") };

async function createCombination() {
  const name = await promptDialog({
    title: t("editor.newCombinationTitle"),
    label: t("editor.combinationNameLabel"),
    value: t("editor.defaultCombinationName", { n: matrix.combinations.length + 1 }),
    confirmLabel: t("common.create"),
  });
  if (name === null) return;
  run(async () => {
    const next = await api.createCombination(matrixId, name);
    setActiveCombination(next.combinations.at(-1).id);
    setMatrix(next, `combo-${activeCombinationId}`);
    toast(t("editor.combinationCreated", { name }), "success");
  });
}

async function duplicateCombination(combination) {
  const name = await promptDialog({
    title: t("editor.duplicateTitle"),
    label: t("editor.copyNameLabel"),
    value: t("editor.copyName", { name: combination.name }),
    confirmLabel: t("common.duplicate"),
  });
  if (name === null) return;
  run(async () => {
    const before = new Set(matrix.combinations.map((c) => c.id));
    const next = await api.duplicateCombination(matrixId, combination.id, name);
    const copy = next.combinations.find((c) => !before.has(c.id));
    setActiveCombination(copy.id);
    setMatrix(next, `combo-${copy.id}`);
    toast(t("editor.duplicated", { name, source: combination.name }), "success");
  }, combinationErrors);
}

async function renameCombination(combination) {
  const name = await promptDialog({
    title: t("editor.renameCombinationTitle"),
    label: t("editor.combinationNameLabel"),
    value: combination.name,
  });
  if (name === null || name === combination.name) return;
  run(async () => {
    setMatrix(await api.renameCombination(matrixId, combination.id, name), `combo-${combination.id}`);
    toast(t("editor.combinationRenamed"), "success");
  }, combinationErrors);
}

async function deleteCombination(combination) {
  const confirmed = await confirmDialog({
    title: t("editor.deleteCombinationTitle"),
    message: t("editor.deleteCombinationMessage", { name: combination.name }),
    confirmLabel: t("common.delete"),
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const next = await api.deleteCombination(matrixId, combination.id);
    setActiveCombination(null);
    setMatrix(next, "combo-none");
    toast(t("editor.combinationDeleted", { name: combination.name }), "success");
  }, combinationErrors);
}

// --- PDF export -------------------------------------------------------------

async function exportPdf() {
  const choice = await choiceDialog({
    title: t("editor.exportPdf"),
    message: t("editor.exportPdfMessage"),
    options: [
      { value: NO_COMBINATION, label: t("editor.exportNone") },
      ...matrix.combinations.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    ],
    value: activeCombination()?.id ?? NO_COMBINATION,
    confirmLabel: t("editor.openPrint"),
  });
  if (choice === null) return;
  const url = printUrl(matrixId, choice === NO_COMBINATION ? null : choice);
  // New tab keeps the editor open; fall back to same tab if popups are blocked.
  if (!window.open(url, "_blank")) window.location.href = url;
}

function selectCombination(id) {
  setActiveCombination(id);
  render();
  focusFirst([`combo-${id ?? "none"}`]);
}

// --- Rendering --------------------------------------------------------------

function iconButton({ label, symbol, focus, disabled = false, onClick }) {
  return el("button", {
    type: "button",
    class: "icon-btn",
    "aria-label": label,
    title: label,
    "data-focus": focus,
    disabled,
    text: symbol,
    onClick,
  });
}

// Columns cannot be moved: a column spans every function, so reordering it
// would shuffle the whole set of solutions. Only deletion is offered.
function renderColumnHeader(column) {
  const label = columnLabel(column);
  return el(
    "th",
    { scope: "col", class: "col-header" },
    el(
      "div",
      { class: "header-content" },
      el("span", { class: "col-label", text: label }),
      el(
        "div",
        { class: "header-controls" },
        iconButton({
          label: t("editor.deleteColumnLabel", { label }),
          symbol: "✕",
          focus: `col-delete-${column.id}`,
          onClick: () => deleteColumn(column),
        }),
      ),
    ),
  );
}

function renderRowHeader(row, index) {
  const last = matrix.rows.length - 1;
  return el(
    "th",
    { scope: "row", class: "row-header" },
    el(
      "div",
      { class: "row-header-content" },
      el("button", {
        type: "button",
        class: "row-title",
        "data-focus": `row-title-${row.id}`,
        "aria-label": t("editor.rowTitleLabel", { title: row.title }),
        title: t("editor.rowTitleHint"),
        text: row.title,
        onClick: () => startRowRename(row),
      }),
      el(
        "div",
        { class: "header-controls" },
        iconButton({
          label: t("editor.moveUp", { title: row.title }),
          symbol: "↑",
          focus: `row-up-${row.id}`,
          disabled: index === 0,
          onClick: () => moveRow(index, -1),
        }),
        iconButton({
          label: t("editor.moveDown", { title: row.title }),
          symbol: "↓",
          focus: `row-down-${row.id}`,
          disabled: index === last,
          onClick: () => moveRow(index, 1),
        }),
        iconButton({
          label: t("editor.deleteRowLabel", { title: row.title }),
          symbol: "✕",
          focus: `row-delete-${row.id}`,
          onClick: () => deleteRow(row),
        }),
      ),
    ),
  );
}

function renderCellContent(cell, stored) {
  if (!stored || (isCellEmpty(cell) && !stored.parameters.length)) {
    return [el("span", { class: "cell-empty", text: t("editor.addSolution") })];
  }
  const parts = [];
  if (cell.photo) {
    parts.push(el("img", { class: "cell-photo", src: photoUrl(matrix.id, cell.photo), alt: "", loading: "lazy" }));
  }
  parts.push(
    cell.solution_name
      ? el("span", { class: "cell-name", text: cell.solution_name })
      : el("span", { class: "cell-name cell-name-empty", text: t("editor.noName") }),
  );
  if (detailedView && cell.parameters.length) {
    parts.push(
      el(
        "ul",
        { class: "cell-params" },
        ...cell.parameters.map((p) =>
          el(
            "li",
            { class: "cell-param" },
            el("span", { class: "cell-param-name", text: parameterLabel(p) }),
            el("span", { class: `scale-badge scale-${p.value}`, text: String(p.value) }),
          ),
        ),
      ),
    );
  }
  return parts;
}

const cellPosition = (row, column) => `${row.title}, ${columnLabel(column)}`;

function cellDescription(row, column, cell, stored) {
  const position = cellPosition(row, column);
  if (!stored) return t("editor.cellEmpty", { position });
  // Accessible name mirrors what is visible, so the simplified view stays simple.
  const params = detailedView ? cell.parameters.map((p) => `${parameterLabel(p)} ${p.value}`).join(", ") : "";
  const name = cell.solution_name || t("editor.unnamed");
  return `${t("editor.cellSolution", { position, name })}${params ? ` (${params})` : ""}`;
}

/**
 * Colored dots for every combination this cell belongs to. The active
 * combination's dot carries a check mark (not relying on color alone).
 */
function renderMemberships(memberships, activeId) {
  if (!memberships.length) return null;
  return el(
    "span",
    { class: "cell-combos", "aria-hidden": "true" },
    ...memberships.map((c) => {
      const isActive = c.id === activeId;
      const dot = el("span", {
        class: isActive ? "combo-dot is-active" : "combo-dot",
        title: c.name,
        text: isActive ? "✓" : null,
      });
      dot.style.setProperty("--combo-color", c.color);
      return dot;
    }),
  );
}

function renderCell(row, column) {
  const stored = matrix.cells[`${row.id}_${column.id}`];
  const cell = getCell(matrix, row.id, column.id);
  const active = activeCombination();
  const memberships = matrix.combinations.filter((c) => c.selections[row.id] === column.id);
  const selected = Boolean(active && active.selections[row.id] === column.id);

  // Simplified view: no membership dots, except the active combination's
  // check mark on the selected cell (selection must not rely on color alone).
  const visibleMemberships = detailedView ? memberships : memberships.filter((c) => c.id === active?.id);

  const labelParts = [cellDescription(row, column, cell, stored)];
  if (detailedView && memberships.length) {
    labelParts.push(t("editor.cellInCombinations", { names: memberships.map((c) => c.name).join(", ") }));
  }
  if (active) labelParts.push(t("editor.cellChooseIn", { name: active.name }));
  else labelParts.push(stored ? t("editor.cellEdit") : t("editor.cellAdd"));
  const label = labelParts.join(". ");

  const content = !stored && active
    ? [el("span", { class: "cell-empty", text: t("editor.cellEmptyShort") })]
    : renderCellContent(cell, stored);

  const td = el(
    "td",
    { class: `cell${active ? " cell-selectable" : ""}${selected ? " cell-selected" : ""}` },
    el(
      "button",
      {
        type: "button",
        class: "cell-button",
        "data-focus": `cell-${row.id}-${column.id}`,
        "aria-label": label,
        // Toggle semantics only while a combination is active.
        "aria-pressed": active ? String(selected) : null,
        onClick: () => (active ? toggleCell(row, column) : editCell(row, column)),
      },
      renderMemberships(visibleMemberships, active?.id),
      ...content,
    ),
    // While selecting, the cell click toggles; editing needs its own button.
    active
      ? iconButton({
          label: t("editor.editSolutionLabel", { position: cellPosition(row, column) }),
          symbol: "✎",
          focus: `cell-edit-${row.id}-${column.id}`,
          onClick: () => editCell(row, column, `cell-edit-${row.id}-${column.id}`),
        })
      : null,
  );
  if (active) td.style.setProperty("--combo-color", active.color);
  return td;
}

// --- Combination bar --------------------------------------------------------

function renderCombinationTab(combination, pressed) {
  const id = combination?.id ?? null;
  const children = [];
  if (combination) {
    const dot = el("span", { class: "combo-dot", "aria-hidden": "true" });
    dot.style.setProperty("--combo-color", combination.color);
    const chosen = Object.keys(combination.selections).length;
    children.push(
      dot,
      el("span", { class: "combo-tab-name", text: combination.name }),
      el("span", {
        class: "combo-count",
        title: t("editor.chosenCountTitle"),
        text: `${chosen}/${matrix.rows.length}`,
      }),
    );
  } else {
    children.push(el("span", { class: "combo-tab-name", text: t("editor.noCombination") }));
  }
  return el(
    "button",
    {
      type: "button",
      class: "combo-tab",
      "aria-pressed": String(pressed),
      "data-focus": `combo-${id ?? "none"}`,
      onClick: () => selectCombination(id),
    },
    ...children,
  );
}

function renderCombinationBar() {
  const active = activeCombination();
  const actions = [
    el("button", { type: "button", class: "btn btn-sm", text: t("editor.newCombination"), onClick: createCombination }),
  ];
  if (active) {
    actions.push(
      el("button", {
        type: "button",
        class: "btn btn-sm",
        text: t("common.duplicate"),
        onClick: () => duplicateCombination(active),
      }),
      el("button", {
        type: "button",
        class: "btn btn-sm",
        text: t("common.rename"),
        onClick: () => renameCombination(active),
      }),
      el("button", {
        type: "button",
        class: "btn btn-sm btn-danger-outline",
        text: t("common.delete"),
        onClick: () => deleteCombination(active),
      }),
    );
  }
  comboBarEl.replaceChildren(
    el("span", { id: "combo-bar-label", class: "combo-bar-label", text: t("editor.activeCombination") }),
    el(
      "div",
      { class: "combo-tabs", role: "group", "aria-labelledby": "combo-bar-label" },
      renderCombinationTab(null, !active),
      ...matrix.combinations.map((c) => renderCombinationTab(c, c.id === active?.id)),
    ),
    el("div", { class: "combo-actions", role: "group", "aria-label": t("editor.combinationActions") }, ...actions),
  );

  hintEl.textContent = active
    ? t("editor.hintSelecting", { name: active.name })
    : t("editor.hintEditing");
}

function renderTable() {
  const { rows, columns } = matrix;
  const solutionSpan = Math.max(columns.length, 1);

  const addColumnButton = el("button", {
    type: "button",
    class: "btn btn-sm add-btn",
    "data-focus": "add-column",
    "aria-label": t("editor.addColumnLabel"),
    text: t("editor.addColumn"),
    onClick: addColumn,
  });
  const addRowButton = el("button", {
    type: "button",
    class: "btn btn-sm add-btn",
    "data-focus": "add-row",
    "aria-label": t("editor.addRowLabel"),
    text: t("editor.addRow"),
    onClick: addRow,
  });

  const thead = el(
    "thead",
    {},
    el(
      "tr",
      {},
      el("th", { scope: "col", rowspan: 2, class: "corner-header", text: t("table.functions") }),
      el("th", { scope: "colgroup", colspan: solutionSpan, class: "solutions-header", text: t("table.solutions") }),
      el("th", { rowspan: 2, class: "add-column-cell" }, addColumnButton),
    ),
    el(
      "tr",
      {},
      ...(columns.length
        ? columns.map(renderColumnHeader)
        : [el("th", { class: "col-header col-placeholder", text: t("editor.noSolutions") })]),
    ),
  );

  const bodyRows = rows.map((row, index) =>
    el(
      "tr",
      {},
      renderRowHeader(row, index),
      ...(columns.length
        ? columns.map((column) => renderCell(row, column))
        : [el("td", { class: "cell cell-placeholder" })]),
    ),
  );

  const tbody = el(
    "tbody",
    {},
    ...bodyRows,
    el("tr", { class: "add-row" }, el("td", { colspan: solutionSpan + 1 }, addRowButton)),
  );

  return el("table", { class: detailedView ? "matrix-table" : "matrix-table view-simple" }, thead, tbody);
}

function render() {
  titleEl.textContent = matrix.name;
  document.title = `${matrix.name} · Morphomatrix`;
  exportLink.href = api.exportUrl(matrix.id);

  renderCombinationBar();
  const scrollLeft = tableWrap.scrollLeft;
  tableWrap.replaceChildren(renderTable());
  tableWrap.scrollLeft = scrollLeft;

  statusEl.hidden = true;
  toolbarEl.hidden = false;
  contentEl.hidden = false;
}

// --- Bootstrap --------------------------------------------------------------

applyStaticTranslations();
initLanguageSelect(document.getElementById("language-select"));
initThemeToggle(document.getElementById("theme-toggle"));
initDetailedViewToggle(document.getElementById("detailed-view"), (detailed) => {
  detailedView = detailed;
  if (matrix) render();
});
document.getElementById("export-pdf").addEventListener("click", exportPdf);

if (!matrixId) showFatal(null);
else reload();
