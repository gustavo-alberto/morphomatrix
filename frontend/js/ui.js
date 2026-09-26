// Shared UI helpers: element builder, toasts and modal dialogs.
// User data is always inserted with textContent (never innerHTML).

import { ApiError } from "./api.js";

export const NAME_MAX_LENGTH = 200;

/**
 * Create an element. `attrs` keys: "class", "text", "on<Event>" handlers,
 * boolean attributes (true/false) or plain string attributes.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  node.append(...children.filter((child) => child !== null && child !== undefined));
  return node;
}

let idCounter = 0;
const uniqueId = (prefix) => `${prefix}-${++idCounter}`;

// --- Error messages ---------------------------------------------------------

/**
 * Translate an error into a user-facing message.
 * `byStatus` maps HTTP status codes to context-specific messages.
 */
export function errorMessage(error, byStatus = {}, fallback = "Ocorreu um erro inesperado.") {
  if (error instanceof ApiError) {
    if (byStatus[error.status]) return byStatus[error.status];
    if (error.status === 404) return "Item não encontrado. Recarregue a página.";
    return fallback;
  }
  if (error instanceof TypeError) return "Sem conexão com o servidor.";
  return fallback;
}

// --- Toasts -----------------------------------------------------------------

const TOAST_DURATION_MS = { info: 4000, success: 4000, error: 7000 };

function toastRegion() {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = el("div", { id: "toast-region", class: "toast-region", "aria-live": "polite" });
    document.body.append(region);
  }
  return region;
}

export function toast(message, type = "info") {
  const node = el("div", { class: `toast toast-${type}`, role: type === "error" ? "alert" : "status", text: message });
  toastRegion().append(node);
  setTimeout(() => node.remove(), TOAST_DURATION_MS[type] ?? TOAST_DURATION_MS.info);
}

// --- Dialogs ----------------------------------------------------------------

function openDialog(dialog, onClose) {
  dialog.addEventListener("close", () => {
    onClose(dialog.returnValue);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
}

/** Ask for confirmation. Resolves to true only if the user confirms. */
export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
}) {
  return new Promise((resolve) => {
    const titleId = uniqueId("dialog-title");
    const messageId = uniqueId("dialog-message");
    const dialog = el(
      "dialog",
      { class: "dialog", "aria-labelledby": titleId, "aria-describedby": messageId },
      el(
        "form",
        { method: "dialog" },
        el("h2", { id: titleId, class: "dialog-title", text: title }),
        el("p", { id: messageId, class: "dialog-message", text: message }),
        el(
          "div",
          { class: "dialog-actions" },
          // Destructive dialogs focus "Cancel" first to avoid accidental deletes.
          el("button", { type: "submit", class: "btn", value: "cancel", autofocus: danger, text: cancelLabel }),
          el("button", {
            type: "submit",
            class: danger ? "btn btn-danger" : "btn btn-primary",
            value: "confirm",
            autofocus: !danger,
            text: confirmLabel,
          }),
        ),
      ),
    );
    openDialog(dialog, (value) => resolve(value === "confirm"));
  });
}

/** Ask for a non-blank text value. Resolves to the trimmed text, or null if cancelled. */
export function promptDialog({
  title,
  label,
  value = "",
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
  maxLength = NAME_MAX_LENGTH,
}) {
  return new Promise((resolve) => {
    const titleId = uniqueId("dialog-title");
    const inputId = uniqueId("dialog-input");
    const input = el("input", {
      id: inputId,
      class: "input",
      type: "text",
      required: true,
      maxlength: maxLength,
      autocomplete: "off",
      autofocus: true,
    });
    input.value = value;
    input.addEventListener("input", () => input.setCustomValidity(""));

    const form = el(
      "form",
      { method: "dialog" },
      el("h2", { id: titleId, class: "dialog-title", text: title }),
      el("label", { class: "field-label", for: inputId, text: label }),
      input,
      el(
        "div",
        { class: "dialog-actions" },
        el("button", { type: "submit", class: "btn", value: "cancel", formnovalidate: true, text: cancelLabel }),
        el("button", { type: "submit", class: "btn btn-primary", value: "confirm", text: confirmLabel }),
      ),
    );

    // `required` accepts whitespace-only values; reject them explicitly.
    form.addEventListener("submit", (event) => {
      if (event.submitter?.value === "confirm" && !input.value.trim()) {
        event.preventDefault();
        input.setCustomValidity("Informe um nome.");
        input.reportValidity();
      }
    });

    const dialog = el("dialog", { class: "dialog", "aria-labelledby": titleId }, form);
    openDialog(dialog, (result) => resolve(result === "confirm" ? input.value.trim() : null));
    input.select();
  });
}

/**
 * Ask the user to pick one option. `options`: [{ value, label, color? }].
 * Resolves to the chosen value, or null if cancelled.
 */
export function choiceDialog({
  title,
  message,
  options,
  value = options[0]?.value,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}) {
  return new Promise((resolve) => {
    const titleId = uniqueId("dialog-title");
    const groupName = uniqueId("choice");
    const radios = options.map((option) => {
      const radio = el("input", { type: "radio", name: groupName, value: option.value, checked: option.value === value });
      const swatch = option.color ? el("span", { class: "combo-dot", "aria-hidden": "true" }) : null;
      swatch?.style.setProperty("--combo-color", option.color);
      return { radio, node: el("label", { class: "choice-option" }, radio, swatch, el("span", { text: option.label })) };
    });

    const dialog = el(
      "dialog",
      { class: "dialog", "aria-labelledby": titleId },
      el(
        "form",
        { method: "dialog" },
        el("h2", { id: titleId, class: "dialog-title", text: title }),
        message ? el("p", { class: "dialog-message", text: message }) : null,
        el("fieldset", { class: "choice-list" }, el("legend", { class: "visually-hidden", text: title }), ...radios.map((r) => r.node)),
        el(
          "div",
          { class: "dialog-actions" },
          el("button", { type: "submit", class: "btn", value: "cancel", text: cancelLabel }),
          el("button", { type: "submit", class: "btn btn-primary", value: "confirm", text: confirmLabel }),
        ),
      ),
    );
    openDialog(dialog, (result) => {
      const chosen = radios.find((r) => r.radio.checked);
      resolve(result === "confirm" && chosen ? chosen.radio.value : null);
    });
    (radios.find((r) => r.radio.checked) ?? radios[0])?.radio.focus();
  });
}

// --- Formatting -------------------------------------------------------------

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function formatDateTime(iso) {
  return dateTimeFormat.format(new Date(iso));
}
