// Print view: full read-only matrix with one combination highlighted.
//
// The browser print dialog (window.print) produces the PDF; paper size,
// orientation and scale are left to the user. document.title is used by
// browsers as the default PDF file name, so it is set right before printing.

import { ApiError, api } from "./api.js";
import { NO_COMBINATION, PARAMETER_VALUES, columnLabel, getCell, photoUrl } from "./matrix-utils.js";
import { el, errorMessage, formatDateTime } from "./ui.js";

const params = new URLSearchParams(window.location.search);
const matrixId = params.get("id");
const combinationId = params.get("combination") || NO_COMBINATION;

const toolbarEl = document.getElementById("print-toolbar");
const statusEl = document.getElementById("print-status");
const contentEl = document.getElementById("print-content");

// --- File name --------------------------------------------------------------

/** Keep only ASCII letters and digits: "Matriz - Projeto Ação" -> "MatrizProjetoAcao". */
export function fileSafe(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "");
}

function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

/** "{matrix}_{combination}_{YYYYMMDD-HHmm}", e.g. "MatrizProjetoX_ConceitoA_20260926-1530". */
export function printTitle(matrix, combination) {
  const matrixPart = fileSafe(matrix.name) || "Matriz";
  const combinationPart = combination ? fileSafe(combination.name) || "Combinacao" : "SemCombinacao";
  return `${matrixPart}_${combinationPart}_${timestamp()}`;
}

// --- Rendering --------------------------------------------------------------

function renderCell(matrix, row, column, combination) {
  const stored = matrix.cells[`${row.id}_${column.id}`];
  const cell = getCell(matrix, row.id, column.id);
  const selected = Boolean(combination && combination.selections[row.id] === column.id);

  const td = el("td", { class: `print-cell${selected ? " selected" : ""}` });
  if (selected) {
    td.style.setProperty("--combo-color", combination.color);
    // Check mark keeps the highlight readable on black-and-white printers.
    td.append(el("span", { class: "selected-mark", title: combination.name, text: "✓" }));
  }
  if (!stored) return td;

  if (cell.photo) {
    td.append(el("img", { class: "print-photo", src: photoUrl(matrix.id, cell.photo), alt: cell.solution_name || "" }));
  }
  if (cell.solution_name) td.append(el("div", { class: "print-solution", text: cell.solution_name }));
  if (cell.parameters.length) {
    td.append(
      el(
        "ul",
        { class: "print-params" },
        ...cell.parameters.map((p) =>
          el(
            "li",
            {},
            el("span", { class: "print-param-name", text: p.name }),
            el("span", { class: `scale-badge scale-${p.value}`, text: String(p.value) }),
          ),
        ),
      ),
    );
  }
  return td;
}

function renderTable(matrix, combination) {
  const { rows, columns } = matrix;
  const span = Math.max(columns.length, 1);
  return el(
    "table",
    { class: "print-table" },
    el("colgroup", {}, el("col", { class: "functions-col" }), ...Array.from({ length: span }, () => el("col"))),
    el(
      "thead",
      {},
      el(
        "tr",
        {},
        el("th", { scope: "col", rowspan: 2, class: "print-corner", text: "Funções" }),
        el("th", { scope: "colgroup", colspan: span, class: "print-solutions", text: "Soluções" }),
      ),
      el(
        "tr",
        {},
        ...(columns.length
          ? columns.map((c) => el("th", { scope: "col", text: columnLabel(c) }))
          : [el("th", { text: "—" })]),
      ),
    ),
    el(
      "tbody",
      {},
      ...rows.map((row) =>
        el(
          "tr",
          {},
          el("th", { scope: "row", class: "print-row-title", text: row.title }),
          ...(columns.length ? columns.map((c) => renderCell(matrix, row, c, combination)) : [el("td")]),
        ),
      ),
    ),
  );
}

function renderHeader(matrix, combination) {
  let highlight;
  if (combination) {
    const dot = el("span", { class: "combo-dot", "aria-hidden": "true" });
    dot.style.setProperty("--combo-color", combination.color);
    const chosen = Object.keys(combination.selections).length;
    highlight = el(
      "span",
      { class: "print-highlight" },
      dot,
      `Combinação destacada: ${combination.name} (${chosen}/${matrix.rows.length} funções)`,
    );
  } else {
    highlight = el("span", { class: "print-highlight", text: "Sem combinação destacada" });
  }
  return el(
    "header",
    { class: "print-header" },
    el("h1", { class: "print-title", text: matrix.name }),
    el(
      "div",
      { class: "print-meta" },
      highlight,
      el("span", { text: `Gerado em ${formatDateTime(new Date().toISOString())}` }),
    ),
  );
}

function renderLegend() {
  return el(
    "footer",
    { class: "print-legend" },
    el("span", { text: "Escala dos parâmetros:" }),
    ...PARAMETER_VALUES.map((v) => el("span", { class: `scale-badge scale-${v}`, text: String(v) })),
    el("span", { text: "1 = melhor · 5 = pior" }),
  );
}

// --- Printing ---------------------------------------------------------------

function waitForImages(root) {
  // Printing before photos load would leave blank boxes in the PDF.
  const pending = [...root.querySelectorAll("img")]
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    );
  return Promise.all(pending);
}

function showError(message) {
  toolbarEl.hidden = true;
  contentEl.hidden = true;
  statusEl.hidden = false;
  statusEl.replaceChildren(`${message} `, el("a", { href: "./", text: "Voltar para a lista" }));
}

async function main() {
  if (!matrixId) {
    showError("Matriz não encontrada.");
    return;
  }

  let matrix;
  try {
    matrix = await api.getMatrix(matrixId);
  } catch (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    showError(notFound ? "Matriz não encontrada." : errorMessage(error, {}, "Não foi possível carregar a matriz."));
    return;
  }

  let combination = null;
  if (combinationId !== NO_COMBINATION) {
    combination = matrix.combinations.find((c) => c.id === combinationId) ?? null;
    if (!combination) {
      showError("Combinação não encontrada.");
      return;
    }
  }

  const print = () => {
    // A fresh timestamp per export avoids overwriting previous PDFs.
    document.title = printTitle(matrix, combination);
    window.print();
  };

  contentEl.replaceChildren(renderHeader(matrix, combination), renderTable(matrix, combination), renderLegend());
  document.getElementById("back-to-editor").href = `editor.html?id=${encodeURIComponent(matrix.id)}`;
  document.getElementById("print-btn").addEventListener("click", print);
  document.title = printTitle(matrix, combination);
  statusEl.hidden = true;
  toolbarEl.hidden = false;
  contentEl.hidden = false;

  await waitForImages(contentEl);
  print();
}

main();
