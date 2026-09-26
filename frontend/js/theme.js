// Light/dark theme switching.
//
// "system" follows the OS preference (no data-theme attribute); "light" and
// "dark" force a scheme via <html data-theme>. The initial value is applied
// by an inline script in each page <head> to avoid a flash of the wrong theme.

import { t } from "./i18n.js";

const STORAGE_KEY = "morphomatrix.theme";
const MODES = ["system", "light", "dark"];
const ICONS = { system: "◐", light: "☀", dark: "☾" };

const modeLabel = (mode) => t(`theme.${mode}`);

function readMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function applyMode(mode) {
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}

function saveMode(mode) {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}

/** Turn `button` into a toggle cycling System -> Light -> Dark. */
export function initThemeToggle(button) {
  if (!button) return;
  let mode = readMode();

  const render = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    button.replaceChildren(
      Object.assign(document.createElement("span"), { className: "theme-icon", textContent: ICONS[mode] }),
      t("theme.label", { mode: modeLabel(mode) }),
    );
    button.firstChild.setAttribute("aria-hidden", "true");
    button.title = t("theme.switchTo", { mode: modeLabel(next).toLowerCase() });
  };

  button.addEventListener("click", () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyMode(mode);
    saveMode(mode);
    render();
  });

  // Keep other open tabs (e.g. the print view) in sync.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    mode = readMode();
    applyMode(mode);
    render();
  });

  applyMode(mode);
  render();
}
