// Matrix editor: table of functions (rows) x solutions (columns).

import { ApiError, api } from "./api.js";
import { openCellDialog } from "./cell-dialog.js";
import { columnLabel, getCell, isCellEmpty, moveId, photoUrl } from "./matrix-utils.js";
import { NAME_MAX_LENGTH, confirmDialog, el, errorMessage, toast } from "./ui.js";

const matrixId = new URLSearchParams(window.location.search).get("id");

const titleEl = document.getElementById("matrix-title");
const toolbarEl = document.getElementById("editor-toolbar");
const exportLink = document.getElementById("export-backup");
const statusEl = document.getElementById("editor-status");
const contentEl = document.getElementById("editor-content");
const tableWrap = document.getElementById("table-wrap");

let matrix = null;
let busy = false;

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

async function editCell(row, column) {
  if (busy) return;
  const next = await openCellDialog(matrix, row, column);
  const focusKey = `cell-${row.id}-${column.id}`;
  if (next) setMatrix(next, focusKey);
  else focusFirst([focusKey]);
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

function cellAriaLabel(row, column, cell, stored) {
  const base = `${row.title}, ${columnLabel(column)}`;
  if (!stored) return `${base}: vazia. Adicionar solução`;
  const params = cell.parameters.map((p) => `${p.name} ${p.value}`).join(", ");
  return `${base}: ${cell.solution_name || "sem nome"}${params ? ` (${params})` : ""}. Editar`;
}

function renderCell(row, column) {
  const stored = matrix.cells[`${row.id}_${column.id}`];
  const cell = getCell(matrix, row.id, column.id);
  return el(
    "td",
    { class: "cell" },
    el(
      "button",
      {
        type: "button",
        class: "cell-button",
        "data-focus": `cell-${row.id}-${column.id}`,
        "aria-label": cellAriaLabel(row, column, cell, stored),
        onClick: () => editCell(row, column),
      },
      ...renderCellContent(cell, stored),
    ),
  );
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

  const scrollLeft = tableWrap.scrollLeft;
  tableWrap.replaceChildren(renderTable());
  tableWrap.scrollLeft = scrollLeft;

  statusEl.hidden = true;
  toolbarEl.hidden = false;
  contentEl.hidden = false;
}

// --- Bootstrap --------------------------------------------------------------

if (!matrixId) showFatal(null);
else reload();
