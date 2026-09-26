// Cell edit dialog: photo, solution name and 1-5 parameters.
//
// Changes (including photo upload/removal) are only sent when the user
// clicks "Salvar"; "Cancelar" / Esc discards everything.

import { api } from "./api.js";
import { NAME_MAX_LENGTH, confirmDialog, el, errorMessage, toast } from "./ui.js";
import {
  DEFAULT_PARAMETER_VALUE,
  PARAMETER_VALUES,
  columnLabel,
  getCell,
  isDefaultParameter,
  photoUrl,
} from "./matrix-utils.js";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];

let uid = 0;
const nextKey = () => `p${++uid}`;

/**
 * Open the dialog. Resolves to the updated matrix if something was saved,
 * or null if the user cancelled without changes being persisted.
 */
export function openCellDialog(matrix, row, column) {
  return new Promise((resolve) => {
    const original = getCell(matrix, row.id, column.id);
    let result = null;

    // --- Photo --------------------------------------------------------------

    const photo = { pendingFile: null, previewUrl: null, remove: false };
    const preview = el("div", { class: "photo-preview" });
    const fileInput = el("input", { type: "file", accept: PHOTO_TYPES.join(","), hidden: true });
    const uploadButton = el("button", { type: "button", class: "btn" });
    const removeButton = el("button", { type: "button", class: "btn btn-danger-outline", text: "Remover foto" });

    function currentPhotoSrc() {
      if (photo.previewUrl) return photo.previewUrl;
      if (original.photo && !photo.remove) return photoUrl(matrix.id, original.photo);
      return null;
    }

    function renderPhoto() {
      const src = currentPhotoSrc();
      preview.replaceChildren(
        src
          ? el("img", { src, alt: "Foto da solução" })
          : el("span", { class: "photo-empty", text: "Sem foto" }),
      );
      uploadButton.textContent = src ? "Trocar foto" : "Enviar foto";
      removeButton.hidden = !src;
    }

    function clearPending() {
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      photo.pendingFile = null;
      photo.previewUrl = null;
    }

    uploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const [file] = fileInput.files;
      fileInput.value = "";
      if (!file) return;
      if (!PHOTO_TYPES.includes(file.type)) {
        toast("Formato inválido. Use uma foto JPG ou PNG.", "error");
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast("A foto excede o limite de 5MB.", "error");
        return;
      }
      clearPending();
      photo.pendingFile = file;
      photo.previewUrl = URL.createObjectURL(file);
      photo.remove = false;
      renderPhoto();
    });

    removeButton.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: "Remover foto",
        message: "A foto desta solução será removida ao salvar.",
        confirmLabel: "Remover",
        danger: true,
      });
      if (!confirmed) return;
      clearPending();
      photo.remove = Boolean(original.photo);
      renderPhoto();
      uploadButton.focus();
    });

    // --- Solution name ------------------------------------------------------

    const nameInput = el("input", {
      id: "cell-solution-name",
      class: "input",
      type: "text",
      maxlength: NAME_MAX_LENGTH,
      autocomplete: "off",
      placeholder: "Ex.: Motor elétrico",
    });
    nameInput.value = original.solution_name;

    // --- Parameters ---------------------------------------------------------

    const params = original.parameters.map((p) => ({ ...p, key: nextKey() }));
    const paramList = el("div", { class: "param-list" });

    function renderParam(param) {
      const fixed = isDefaultParameter(param.name) && !param.isNew;
      const options = PARAMETER_VALUES.map((value) => {
        const radio = el("input", {
          type: "radio",
          class: "visually-hidden",
          name: `param-${param.key}`,
          value,
          checked: param.value === value,
        });
        radio.addEventListener("change", () => {
          param.value = value;
        });
        return el("label", { class: `scale-option scale-${value}` }, radio, el("span", { text: String(value) }));
      });

      let nameNode;
      if (fixed) {
        nameNode = el("span", { class: "param-name", text: param.name });
      } else {
        nameNode = el("input", {
          class: "input input-sm param-name-input",
          type: "text",
          maxlength: NAME_MAX_LENGTH,
          autocomplete: "off",
          placeholder: "Nome do parâmetro",
          "aria-label": "Nome do parâmetro",
          "data-param-key": param.key,
        });
        nameNode.value = param.name;
        nameNode.addEventListener("input", () => {
          param.name = nameNode.value;
        });
      }

      const removeParam = fixed
        ? el("span", { class: "param-remove-placeholder", "aria-hidden": "true" })
        : el("button", {
            type: "button",
            class: "icon-btn",
            "aria-label": `Remover parâmetro ${param.name || "novo"}`,
            title: "Remover parâmetro",
            text: "✕",
            onClick: () => {
              params.splice(params.indexOf(param), 1);
              renderParams();
              addParamButton.focus();
            },
          });

      return el(
        "fieldset",
        { class: "param-row" },
        el("legend", { class: "visually-hidden", text: `Parâmetro ${param.name || "novo"} (1 = melhor, 5 = pior)` }),
        nameNode,
        el("div", { class: "scale-picker" }, ...options),
        removeParam,
      );
    }

    function renderParams() {
      paramList.replaceChildren(...params.map(renderParam));
    }

    const addParamButton = el("button", {
      type: "button",
      class: "btn btn-sm",
      text: "+ Adicionar parâmetro",
      onClick: () => {
        const param = { name: "", value: DEFAULT_PARAMETER_VALUE, key: nextKey(), isNew: true };
        params.push(param);
        renderParams();
        paramList.querySelector(`[data-param-key="${param.key}"]`)?.focus();
      },
    });

    // --- Validation & save --------------------------------------------------

    const formError = el("p", { class: "form-error", role: "alert", hidden: true });

    function validate() {
      const seen = new Set();
      for (const param of params) {
        const name = param.name.trim();
        if (!name) return "Informe o nome de todos os parâmetros.";
        const normalized = name.toLocaleLowerCase("pt-BR");
        if (seen.has(normalized)) return `O parâmetro "${name}" está repetido.`;
        seen.add(normalized);
      }
      return null;
    }

    const cancelButton = el("button", { type: "button", class: "btn", text: "Cancelar" });
    const saveButton = el("button", { type: "submit", class: "btn btn-primary", text: "Salvar" });

    let isSaving = false;
    function setSaving(saving) {
      isSaving = saving;
      for (const button of [cancelButton, saveButton, uploadButton, removeButton, addParamButton]) {
        button.disabled = saving;
      }
      saveButton.textContent = saving ? "Salvando…" : "Salvar";
    }

    async function save(event) {
      event.preventDefault();
      const problem = validate();
      formError.hidden = !problem;
      formError.textContent = problem ?? "";
      if (problem) return;

      setSaving(true);
      try {
        result = await api.updateCell(matrix.id, row.id, column.id, {
          solution_name: nameInput.value.trim(),
          parameters: params.map(({ name, value }) => ({ name: name.trim(), value })),
        });
        if (photo.pendingFile) {
          result = await api.uploadPhoto(matrix.id, row.id, column.id, photo.pendingFile);
        } else if (photo.remove) {
          result = await api.deletePhoto(matrix.id, row.id, column.id);
        }
        dialog.close("saved");
      } catch (error) {
        // `result` may hold a partially saved matrix; it is still returned on close.
        toast(
          errorMessage(
            error,
            {
              404: "Esta função ou solução não existe mais.",
              413: "A foto excede o limite de 5MB.",
              415: "Formato inválido. Use uma foto JPG ou PNG.",
              422: "Dados inválidos. Revise os campos.",
            },
            "Não foi possível salvar a solução.",
          ),
          "error",
        );
        setSaving(false);
      }
    }

    // --- Dialog -------------------------------------------------------------

    const titleId = "cell-dialog-title";
    const form = el(
      "form",
      { class: "cell-form", novalidate: true },
      el("h2", { id: titleId, class: "dialog-title", text: `${row.title} · ${columnLabel(column)}` }),
      el(
        "section",
        { class: "cell-section", "aria-label": "Foto" },
        preview,
        el("div", { class: "photo-actions" }, uploadButton, removeButton, fileInput),
        el("p", { class: "hint", text: "JPG ou PNG, até 5MB." }),
      ),
      el(
        "div",
        { class: "cell-section" },
        el("label", { class: "field-label", for: nameInput.id, text: "Nome da solução" }),
        nameInput,
      ),
      el(
        "section",
        { class: "cell-section", "aria-labelledby": "cell-params-title" },
        el(
          "div",
          { class: "section-heading" },
          el("h3", { id: "cell-params-title", class: "field-label", text: "Parâmetros" }),
          el("span", { class: "hint", text: "1 = melhor · 5 = pior" }),
        ),
        paramList,
        addParamButton,
      ),
      formError,
      el("div", { class: "dialog-actions" }, cancelButton, saveButton),
    );

    const dialog = el("dialog", { class: "dialog dialog-wide", "aria-labelledby": titleId }, form);
    form.addEventListener("submit", save);
    cancelButton.addEventListener("click", () => dialog.close("cancel"));
    // Esc must not close the dialog while requests are in flight.
    dialog.addEventListener("cancel", (event) => {
      if (isSaving) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
      clearPending();
      dialog.remove();
      resolve(result);
    });

    renderPhoto();
    renderParams();
    document.body.append(dialog);
    dialog.showModal();
    nameInput.focus();
  });
}
