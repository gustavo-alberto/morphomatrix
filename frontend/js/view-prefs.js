// View preferences shared by the editor and the print view.
//
// Parameters (Complexity, Cost, custom ones) are hidden by default so the
// matrix reads as a plain functions x solutions grid; the user can turn them
// on. The choice is stored per browser and kept in sync across open tabs.

const SHOW_PARAMETERS_KEY = "morphomatrix.showParameters";

export function getShowParameters() {
  try {
    return localStorage.getItem(SHOW_PARAMETERS_KEY) === "1";
  } catch {
    return false;
  }
}

function saveShowParameters(show) {
  try {
    if (show) localStorage.setItem(SHOW_PARAMETERS_KEY, "1");
    else localStorage.removeItem(SHOW_PARAMETERS_KEY);
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}

/**
 * Bind a checkbox to the "show parameters" preference. `onChange(show)` runs
 * when the user toggles it here or in another tab.
 */
export function initShowParametersToggle(checkbox, onChange) {
  if (!checkbox) return;
  checkbox.checked = getShowParameters();
  checkbox.addEventListener("change", () => {
    saveShowParameters(checkbox.checked);
    onChange(checkbox.checked);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== SHOW_PARAMETERS_KEY) return;
    checkbox.checked = getShowParameters();
    onChange(checkbox.checked);
  });
}
