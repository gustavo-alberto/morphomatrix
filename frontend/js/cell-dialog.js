// Cell edit dialog: photo, solution name and 1-5 parameters.
//
// Changes (including photo upload/removal) are only sent when the user
// clicks Save; Cancel / Esc discards everything.

import { api } from "./api.js";
import { getLanguage, t } from "./i18n.js";
import { NAME_MAX_LENGTH, confirmDialog, el, errorMessage, toast } from "./ui.js";
import {
  DEFAULT_PARAMETER_VALUE,
  PARAMETER_VALUES,
  getCell,
  isBuiltInParameter,
  parameterLabel,
  photoUrl,
} from "./matrix-utils.js";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Local id for each parameter row in the dialog (not the parameter `key`).
let uidCounter = 0;
const nextUid = () => `p${++uidCounter}`;

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
    const removeButton = el("button", { type: "button", class: "btn btn-danger-outline", text: t("cell.removePhoto") });

    function currentPhotoSrc() {
      if (photo.previewUrl) return photo.previewUrl;
      if (original.photo && !photo.remove) return photoUrl(matrix.id, original.photo);
      return null;
    }

    function renderPhoto() {
      const src = currentPhotoSrc();
      preview.replaceChildren(
        src
          ? el("img", { src, alt: t("cell.photoAlt") })
          : el("span", { class: "photo-empty", text: t("cell.noPhoto") }),
      );
      uploadButton.textContent = src ? t("cell.replacePhoto") : t("cell.uploadPhoto");
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
        toast(t("cell.invalidType"), "error");
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast(t("cell.tooLarge"), "error");
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
        title: t("cell.removePhoto"),
        message: t("cell.removePhotoMessage"),
        confirmLabel: t("cell.remove"),
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
      placeholder: t("cell.namePlaceholder"),
    });
    nameInput.value = original.solution_name;

    // --- Parameters ---------------------------------------------------------

    // Custom parameters keep an editable `name`; built-in ones keep their `key`.
    const params = original.parameters.map((p) => ({ key: p.key ?? null, name: p.name ?? "", value: p.value, uid: nextUid() }));
    const paramList = el("div", { class: "param-list" });

    function renderParam(param) {
      const fixed = isBuiltInParameter(param);
      const displayName = fixed ? parameterLabel(param) : param.name || t("cell.newParam");
      const options = PARAMETER_VALUES.map((value) => {
        const radio = el("input", {
          type: "radio",
          class: "visually-hidden",
          name: `param-${param.uid}`,
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
        nameNode = el("span", { class: "param-name", text: displayName });
      } else {
        nameNode = el("input", {
          class: "input input-sm param-name-input",
          type: "text",
          maxlength: NAME_MAX_LENGTH,
          autocomplete: "off",
          placeholder: t("cell.paramNameLabel"),
          "aria-label": t("cell.paramNameLabel"),
          "data-param-uid": param.uid,
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
            "aria-label": t("cell.removeParamLabel", { name: displayName }),
            title: t("cell.removeParam"),
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
        el("legend", { class: "visually-hidden", text: t("cell.paramLegend", { name: displayName }) }),
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
      text: t("cell.addParam"),
      onClick: () => {
        const param = { key: null, name: "", value: DEFAULT_PARAMETER_VALUE, uid: nextUid() };
        params.push(param);
        renderParams();
        paramList.querySelector(`[data-param-uid="${param.uid}"]`)?.focus();
      },
    });

    // --- Validation & save --------------------------------------------------

    const formError = el("p", { class: "form-error", role: "alert", hidden: true });

    function validate() {
      const normalize = (text) => text.trim().toLocaleLowerCase(getLanguage());
      // Built-in labels count as taken, so "Custo" cannot be added twice.
      const seen = new Set(params.filter(isBuiltInParameter).map((p) => normalize(parameterLabel(p))));
      for (const param of params.filter((p) => !isBuiltInParameter(p))) {
        const name = param.name.trim();
        if (!name) return t("cell.paramNameRequired");
        if (seen.has(normalize(name))) return t("cell.paramDuplicate", { name });
        seen.add(normalize(name));
      }
      return null;
    }

    const cancelButton = el("button", { type: "button", class: "btn", text: t("common.cancel") });
    const saveButton = el("button", { type: "submit", class: "btn btn-primary", text: t("common.save") });

    let isSaving = false;
    function setSaving(saving) {
      isSaving = saving;
      for (const button of [cancelButton, saveButton, uploadButton, removeButton, addParamButton]) {
        button.disabled = saving;
      }
      saveButton.textContent = saving ? t("cell.saving") : t("common.save");
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
          parameters: params.map(({ key, name, value }) => (key ? { key, value } : { name: name.trim(), value })),
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
              404: t("cell.gone"),
              413: t("cell.tooLarge"),
              415: t("cell.invalidType"),
              422: t("cell.invalidData"),
            },
            t("cell.saveError"),
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
      // Columns have no visible name: the function title identifies the cell.
      el("h2", { id: titleId, class: "dialog-title", text: row.title }),
      el(
        "section",
        { class: "cell-section", "aria-label": t("cell.photoSection") },
        preview,
        el("div", { class: "photo-actions" }, uploadButton, removeButton, fileInput),
        el("p", { class: "hint", text: t("cell.photoHint") }),
      ),
      el(
        "div",
        { class: "cell-section" },
        el("label", { class: "field-label", for: nameInput.id, text: t("cell.solutionName") }),
        nameInput,
      ),
      el(
        "section",
        { class: "cell-section", "aria-labelledby": "cell-params-title" },
        el(
          "div",
          { class: "section-heading" },
          el("h3", { id: "cell-params-title", class: "field-label", text: t("cell.parameters") }),
          el("span", { class: "hint", text: t("scale.hint") }),
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
