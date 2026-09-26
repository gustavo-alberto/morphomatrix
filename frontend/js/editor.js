// Matrix editor: table of functions (rows) x solutions (columns).

import { ApiError, api } from "./api.js";
import { openCellDialog } from "./cell-dialog.js";
import {
  NO_COMBINATION,
  columnLabel,
  getCell,
  isCellEmpty,
  moveId,
  photoUrl,
  printUrl,
} from "./matrix-utils.js";
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
async function run(action, errorsByStatus = {}, fallback = "Não foi possível concluir a ação.") {
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
    notFound ? "Matriz não encontrada. " : `${errorMessage(error, {}, "Não foi possível carregar a matriz.")} `,
    el("a", { href: "./", text: "Voltar para a lista" }),
  );
}

// --- Rows -------------------------------------------------------------------

function addRow() {
  run(async () => {
    const next = await api.addRow(matrixId);
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
    title: "Excluir função",
    message: `A função "${row.title}" e todas as soluções desta linha (incluindo fotos) serão excluídas.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const { matrix: next, affected_combinations: affected } = await api.deleteRow(matrixId, row.id);
    setMatrix(next, "add-row");
    toast(removalMessage(`Função "${row.title}" excluída.`, affected), "success");
  }, { 404: "Esta função já havia sido excluída." });
}

function startRowRename(row) {
  const button = document.querySelector(`[data-focus="row-title-${row.id}"]`);
  if (!button) return;
  const input = el("input", {
    class: "input input-sm row-title-input",
    type: "text",
    maxlength: NAME_MAX_LENGTH,
    autocomplete: "off",
    "aria-label": "Nome da função",
  });
  input.value = row.title;

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const title = input.value.trim();
    if (!save || !title || title === row.title) {
      if (save && !title) toast("O nome da função não pode ficar vazio.", "error");
      input.replaceWith(button);
      button.focus();
      return;
    }
    run(async () => {
      setMatrix(await api.renameRow(matrixId, row.id, title), `row-title-${row.id}`);
    }, { 404: "Esta função não existe mais." });
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

function moveColumn(index, delta) {
  const ids = moveId(matrix.columns.map((c) => c.id), index, delta);
  if (!ids) return;
  const columnId = matrix.columns[index].id;
  const direction = delta < 0 ? "left" : "right";
  const opposite = delta < 0 ? "right" : "left";
  run(async () => {
    setMatrix(
      await api.reorderColumns(matrixId, ids),
      `col-${direction}-${columnId}`,
      `col-${opposite}-${columnId}`,
    );
  });
}

async function deleteColumn(column) {
  const label = columnLabel(column);
  const confirmed = await confirmDialog({
    title: "Excluir coluna",
    message: `A coluna ${label} e todas as suas soluções (incluindo fotos) serão excluídas. As colunas seguintes serão renumeradas.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const { matrix: next, affected_combinations: affected } = await api.deleteColumn(matrixId, column.id);
    setMatrix(next, "add-column");
    toast(removalMessage(`Coluna ${label} excluída.`, affected), "success");
  }, { 404: "Esta coluna já havia sido excluída." });
}

function removalMessage(base, affected) {
  if (!affected.length) return base;
  const names = affected.map((c) => `"${c.name}"`).join(", ");
  return `${base} Seleção removida das combinações: ${names}.`;
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
  }, { 404: "Esta combinação ou solução não existe mais." });
}

// --- Combinations -----------------------------------------------------------

const combinationErrors = { 404: "Esta combinação não existe mais." };

async function createCombination() {
  const name = await promptDialog({
    title: "Nova combinação",
    label: "Nome da combinação",
    value: `Combinação ${matrix.combinations.length + 1}`,
    confirmLabel: "Criar",
  });
  if (name === null) return;
  run(async () => {
    const next = await api.createCombination(matrixId, name);
    setActiveCombination(next.combinations.at(-1).id);
    setMatrix(next, `combo-${activeCombinationId}`);
    toast(`Combinação "${name}" criada. Clique nas células para escolher as soluções.`, "success");
  });
}

async function duplicateCombination(combination) {
  const name = await promptDialog({
    title: "Duplicar combinação",
    label: "Nome da cópia",
    value: `${combination.name} (cópia)`,
    confirmLabel: "Duplicar",
  });
  if (name === null) return;
  run(async () => {
    const before = new Set(matrix.combinations.map((c) => c.id));
    const next = await api.duplicateCombination(matrixId, combination.id, name);
    const copy = next.combinations.find((c) => !before.has(c.id));
    setActiveCombination(copy.id);
    setMatrix(next, `combo-${copy.id}`);
    toast(`Combinação "${name}" criada a partir de "${combination.name}".`, "success");
  }, combinationErrors);
}

async function renameCombination(combination) {
  const name = await promptDialog({
    title: "Renomear combinação",
    label: "Nome da combinação",
    value: combination.name,
  });
  if (name === null || name === combination.name) return;
  run(async () => {
    setMatrix(await api.renameCombination(matrixId, combination.id, name), `combo-${combination.id}`);
    toast("Combinação renomeada.", "success");
  }, combinationErrors);
}

async function deleteCombination(combination) {
  const confirmed = await confirmDialog({
    title: "Excluir combinação",
    message: `A combinação "${combination.name}" e suas escolhas serão excluídas. As soluções da matriz não são afetadas.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  run(async () => {
    const next = await api.deleteCombination(matrixId, combination.id);
    setActiveCombination(null);
    setMatrix(next, "combo-none");
    toast(`Combinação "${combination.name}" excluída.`, "success");
  }, combinationErrors);
}

// --- PDF export -------------------------------------------------------------

async function exportPdf() {
  const choice = await choiceDialog({
    title: "Exportar PDF",
    message:
      "Escolha a combinação a destacar. A matriz completa será exibida. Tamanho do papel (A3/A4), orientação e escala são definidos no diálogo de impressão.",
    options: [
      { value: NO_COMBINATION, label: "Nenhuma (matriz sem destaque)" },
      ...matrix.combinations.map((c) => ({ value: c.id, label: c.name, color: c.color })),
    ],
    value: activeCombination()?.id ?? NO_COMBINATION,
    confirmLabel: "Abrir impressão",
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

function renderColumnHeader(column, index) {
  const label = columnLabel(column);
  const last = matrix.columns.length - 1;
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
          label: `Mover ${label} para a esquerda`,
          symbol: "←",
          focus: `col-left-${column.id}`,
          disabled: index === 0,
          onClick: () => moveColumn(index, -1),
        }),
        iconButton({
          label: `Mover ${label} para a direita`,
          symbol: "→",
          focus: `col-right-${column.id}`,
          disabled: index === last,
          onClick: () => moveColumn(index, 1),
        }),
        iconButton({
          label: `Excluir coluna ${label}`,
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
        "aria-label": `Função: ${row.title}. Renomear`,
        title: "Clique para renomear",
        text: row.title,
        onClick: () => startRowRename(row),
      }),
      el(
        "div",
        { class: "header-controls" },
        iconButton({
          label: `Mover "${row.title}" para cima`,
          symbol: "↑",
          focus: `row-up-${row.id}`,
          disabled: index === 0,
          onClick: () => moveRow(index, -1),
        }),
        iconButton({
          label: `Mover "${row.title}" para baixo`,
          symbol: "↓",
          focus: `row-down-${row.id}`,
          disabled: index === last,
          onClick: () => moveRow(index, 1),
        }),
        iconButton({
          label: `Excluir função "${row.title}"`,
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
    return [el("span", { class: "cell-empty", text: "+ Adicionar solução" })];
  }
  const parts = [];
  if (cell.photo) {
    parts.push(el("img", { class: "cell-photo", src: photoUrl(matrix.id, cell.photo), alt: "", loading: "lazy" }));
  }
  parts.push(
    cell.solution_name
      ? el("span", { class: "cell-name", text: cell.solution_name })
      : el("span", { class: "cell-name cell-name-empty", text: "Sem nome" }),
  );
  if (cell.parameters.length) {
    parts.push(
      el(
        "ul",
        { class: "cell-params" },
        ...cell.parameters.map((p) =>
          el(
            "li",
            { class: "cell-param" },
            el("span", { class: "cell-param-name", text: p.name }),
            el("span", { class: `scale-badge scale-${p.value}`, text: String(p.value) }),
          ),
        ),
      ),
    );
  }
  return parts;
}

function cellDescription(row, column, cell, stored) {
  const base = `${row.title}, ${columnLabel(column)}`;
  if (!stored) return `${base}: vazia`;
  const params = cell.parameters.map((p) => `${p.name} ${p.value}`).join(", ");
  return `${base}: ${cell.solution_name || "sem nome"}${params ? ` (${params})` : ""}`;
}

/** Colored dots for every combination this cell belongs to. */
function renderMemberships(memberships) {
  if (!memberships.length) return null;
  return el(
    "span",
    { class: "cell-combos", "aria-hidden": "true" },
    ...memberships.map((c) => {
      const dot = el("span", { class: "combo-dot", title: c.name });
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

  let label = cellDescription(row, column, cell, stored);
  if (memberships.length) label += `. Combinações: ${memberships.map((c) => c.name).join(", ")}`;
  label += active ? `. Escolher em "${active.name}"` : stored ? ". Editar" : ". Adicionar solução";

  const content = !stored && active
    ? [el("span", { class: "cell-empty", text: "Vazia" })]
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
      renderMemberships(memberships),
      ...content,
    ),
    // While selecting, the cell click toggles; editing needs its own button.
    active
      ? iconButton({
          label: `Editar solução: ${row.title}, ${columnLabel(column)}`,
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
        title: "Funções com solução escolhida",
        text: `${chosen}/${matrix.rows.length}`,
      }),
    );
  } else {
    children.push(el("span", { class: "combo-tab-name", text: "Nenhuma" }));
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
    el("button", { type: "button", class: "btn btn-sm", text: "+ Nova combinação", onClick: createCombination }),
  ];
  if (active) {
    actions.push(
      el("button", { type: "button", class: "btn btn-sm", text: "Duplicar", onClick: () => duplicateCombination(active) }),
      el("button", { type: "button", class: "btn btn-sm", text: "Renomear", onClick: () => renameCombination(active) }),
      el("button", {
        type: "button",
        class: "btn btn-sm btn-danger-outline",
        text: "Excluir",
        onClick: () => deleteCombination(active),
      }),
    );
  }
  comboBarEl.replaceChildren(
    el("span", { id: "combo-bar-label", class: "combo-bar-label", text: "Combinação ativa" }),
    el(
      "div",
      { class: "combo-tabs", role: "group", "aria-labelledby": "combo-bar-label" },
      renderCombinationTab(null, !active),
      ...matrix.combinations.map((c) => renderCombinationTab(c, c.id === active?.id)),
    ),
    el("div", { class: "combo-actions", role: "group", "aria-label": "Ações da combinação" }, ...actions),
  );

  hintEl.textContent = active
    ? `Clique numa célula para marcá-la ou desmarcá-la em "${active.name}" (uma solução por função). Use ✎ para editar a solução.`
    : "Clique numa célula para editar a solução. Selecione uma combinação para escolher soluções.";
}

function renderTable() {
  const { rows, columns } = matrix;
  const solutionSpan = Math.max(columns.length, 1);

  const addColumnButton = el("button", {
    type: "button",
    class: "btn btn-sm add-btn",
    "data-focus": "add-column",
    "aria-label": "Adicionar coluna de solução",
    text: "+ Solução",
    onClick: addColumn,
  });
  const addRowButton = el("button", {
    type: "button",
    class: "btn btn-sm add-btn",
    "data-focus": "add-row",
    "aria-label": "Adicionar função",
    text: "+ Função",
    onClick: addRow,
  });

  const thead = el(
    "thead",
    {},
    el(
      "tr",
      {},
      el("th", { scope: "col", rowspan: 2, class: "corner-header", text: "Funções" }),
      el("th", { scope: "colgroup", colspan: solutionSpan, class: "solutions-header", text: "Soluções" }),
      el("th", { rowspan: 2, class: "add-column-cell" }, addColumnButton),
    ),
    el(
      "tr",
      {},
      ...(columns.length
        ? columns.map(renderColumnHeader)
        : [el("th", { class: "col-header col-placeholder", text: "Nenhuma solução" })]),
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

  return el("table", { class: "matrix-table" }, thead, tbody);
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

document.getElementById("export-pdf").addEventListener("click", exportPdf);

if (!matrixId) showFatal(null);
else reload();
