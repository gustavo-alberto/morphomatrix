// Light/dark theme switching.
//
// "system" follows the OS preference (no data-theme attribute); "light" and
// "dark" force a scheme via <html data-theme>. The initial value is applied
// by an inline script in each page <head> to avoid a flash of the wrong theme.

const STORAGE_KEY = "morphomatrix.theme";
const MODES = ["system", "light", "dark"];

// User-facing labels, therefore in Portuguese.
const LABELS = { system: "Sistema", light: "Claro", dark: "Escuro" };
const ICONS = { system: "◐", light: "☀", dark: "☾" };

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

/** Turn `button` into a toggle cycling Sistema -> Claro -> Escuro. */
export function initThemeToggle(button) {
  if (!button) return;
  let mode = readMode();

  const render = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    button.replaceChildren(
      Object.assign(document.createElement("span"), { className: "theme-icon", textContent: ICONS[mode] }),
      `Tema: ${LABELS[mode]}`,
    );
    button.firstChild.setAttribute("aria-hidden", "true");
    button.title = `Mudar para tema ${LABELS[next].toLowerCase()}`;
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
