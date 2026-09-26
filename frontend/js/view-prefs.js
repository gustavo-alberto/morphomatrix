// View preferences shared by the editor and the print view.
//
// The matrix opens in a simplified view (a plain functions x solutions grid).
// The detailed view adds the cell parameters (Complexity, Cost, custom ones)
// and, in the editor, the colored dots showing which combinations use each
// solution. The choice is stored per browser and kept in sync across tabs.

const DETAILED_VIEW_KEY = "morphomatrix.detailedView";

export function getDetailedView() {
  try {
    return localStorage.getItem(DETAILED_VIEW_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDetailedView(detailed) {
  try {
    if (detailed) localStorage.setItem(DETAILED_VIEW_KEY, "1");
    else localStorage.removeItem(DETAILED_VIEW_KEY);
  } catch {
    // Storage unavailable: the choice lasts until the page is closed.
  }
}

/**
 * Bind a checkbox to the "detailed view" preference. `onChange(detailed)`
 * runs when the user toggles it here or in another tab.
 */
export function initDetailedViewToggle(checkbox, onChange) {
  if (!checkbox) return;
  checkbox.checked = getDetailedView();
  checkbox.addEventListener("change", () => {
    saveDetailedView(checkbox.checked);
    onChange(checkbox.checked);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== DETAILED_VIEW_KEY) return;
    checkbox.checked = getDetailedView();
    onChange(checkbox.checked);
  });
}
