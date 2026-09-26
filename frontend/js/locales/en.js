// English messages. Keys mirror locales/pt-BR.js.

export default {
  // Common
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.save": "Save",
  "common.create": "Create",
  "common.open": "Open",
  "common.rename": "Rename",
  "common.delete": "Delete",
  "common.duplicate": "Duplicate",
  "common.loading": "Loading…",
  "common.backToList": "Back to the list",
  "common.matrixNotFound": "Matrix not found.",
  "common.matrixLoadError": "Could not load the matrix.",

  // Errors
  "error.unexpected": "An unexpected error occurred.",
  "error.notFound": "Item not found. Please reload the page.",
  "error.offline": "Cannot reach the server.",
  "prompt.nameRequired": "Please enter a name.",

  // Language and theme
  "language.label": "Language",
  "theme.title": "Theme",
  "theme.label": "Theme: {mode}",
  "theme.switchTo": "Switch to {mode} theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",

  // Page titles
  "page.editor": "Editor · Morphomatrix",
  "page.print": "Print · Morphomatrix",

  // View options
  "view.detailed": "Detailed view",

  // Built-in parameters (see DEFAULT_PARAMETER_KEYS in matrix-utils.js)
  "parameter.complexity": "Complexity",
  "parameter.cost": "Cost",

  // Shared matrix vocabulary
  "table.functions": "Functions",
  "table.solutions": "Solutions",
  "scale.hint": "1 = best · 5 = worst",

  // Home
  "home.newMatrix": "New matrix",
  "home.import": "Import",
  "home.importing": "Importing…",
  "home.sectionTitle": "Matrices",
  "home.listLabel": "Saved matrices",
  "home.createdAt": "Created",
  "home.updatedAt": "Updated",
  "home.openLabel": "Open {name}",
  "home.renameLabel": "Rename {name}",
  "home.deleteLabel": "Delete {name}",
  "home.empty": "No matrices yet. Create the first one or import a backup.",
  "home.loadError": "Could not load the matrices.",
  "home.nameLabel": "Matrix name",
  "home.createError": "Could not create the matrix.",
  "home.renameTitle": "Rename matrix",
  "home.renamed": "Matrix renamed.",
  "home.renameGone": "This matrix no longer exists.",
  "home.renameError": "Could not rename the matrix.",
  "home.deleteTitle": "Delete matrix",
  "home.deleteMessage": 'The matrix "{name}" and all its photos will be permanently deleted.',
  "home.deleted": 'Matrix "{name}" deleted.',
  "home.deleteGone": "This matrix had already been deleted.",
  "home.deleteError": "Could not delete the matrix.",
  "home.imported": 'Backup imported as a new matrix: "{name}".',
  "home.importTooLarge": "The backup exceeds the maximum allowed size.",
  "home.importInvalid": "Invalid file. Select a backup .zip exported by Morphomatrix.",
  "home.importError": "Could not import the backup.",

  // Editor: header and general
  "editor.back": "← Matrices",
  "editor.exportPdf": "Export PDF",
  "editor.exportBackup": "Export backup",
  "editor.actionError": "Could not complete the action.",
  "editor.hintEditing": "Click a cell to edit the solution. Select a combination to choose solutions.",
  "editor.hintSelecting":
    'Click a cell to select or unselect it in "{name}" (one solution per function). Use ✎ to edit the solution.',

  // Editor: rows (functions)
  "editor.addRow": "+ Function",
  "editor.addRowLabel": "Add function",
  "editor.defaultRowTitle": "Function {n}",
  "editor.rowNameLabel": "Function name",
  "editor.rowNameEmpty": "The function name cannot be empty.",
  "editor.rowMissing": "This function no longer exists.",
  "editor.rowTitleLabel": "Function: {title}. Rename",
  "editor.rowTitleHint": "Click to rename",
  "editor.moveUp": 'Move "{title}" up',
  "editor.moveDown": 'Move "{title}" down',
  "editor.deleteRowLabel": 'Delete function "{title}"',
  "editor.deleteRowTitle": "Delete function",
  "editor.deleteRowMessage": 'The function "{title}" and all solutions in this row (including photos) will be deleted.',
  "editor.rowDeleted": 'Function "{title}" deleted.',
  "editor.rowGone": "This function had already been deleted.",

  // Editor: columns (solutions)
  "editor.addColumn": "+ Solution",
  "editor.addColumnLabel": "Add solution column",
  "editor.noSolutions": "No solutions",
  "editor.moveLeft": "Move {label} left",
  "editor.moveRight": "Move {label} right",
  "editor.deleteColumnLabel": "Delete column {label}",
  "editor.deleteColumnTitle": "Delete column",
  "editor.deleteColumnMessage":
    "Column {label} and all its solutions (including photos) will be deleted. The following columns will be renumbered.",
  "editor.columnDeleted": "Column {label} deleted.",
  "editor.columnGone": "This column had already been deleted.",
  "editor.removedFromCombinations": "{message} Selection removed from combinations: {names}.",

  // Editor: cells
  "editor.addSolution": "+ Add solution",
  "editor.cellEmptyShort": "Empty",
  "editor.noName": "No name",
  "editor.cellEmpty": "{position}: empty",
  "editor.cellSolution": "{position}: {name}",
  "editor.unnamed": "unnamed",
  "editor.cellInCombinations": "Combinations: {names}",
  "editor.cellChooseIn": 'Choose in "{name}"',
  "editor.cellEdit": "Edit",
  "editor.cellAdd": "Add solution",
  "editor.editSolutionLabel": "Edit solution: {position}",

  // Editor: combinations
  "editor.activeCombination": "Active combination",
  "editor.combinationActions": "Combination actions",
  "editor.noCombination": "None",
  "editor.chosenCountTitle": "Functions with a chosen solution",
  "editor.newCombination": "+ New combination",
  "editor.newCombinationTitle": "New combination",
  "editor.combinationNameLabel": "Combination name",
  "editor.defaultCombinationName": "Combination {n}",
  "editor.combinationCreated": 'Combination "{name}" created. Click cells to choose the solutions.',
  "editor.duplicateTitle": "Duplicate combination",
  "editor.copyNameLabel": "Name of the copy",
  "editor.copyName": "{name} (copy)",
  "editor.duplicated": 'Combination "{name}" created from "{source}".',
  "editor.renameCombinationTitle": "Rename combination",
  "editor.combinationRenamed": "Combination renamed.",
  "editor.deleteCombinationTitle": "Delete combination",
  "editor.deleteCombinationMessage":
    'The combination "{name}" and its choices will be deleted. The matrix solutions are not affected.',
  "editor.combinationDeleted": 'Combination "{name}" deleted.',
  "editor.combinationGone": "This combination no longer exists.",
  "editor.toggleGone": "This combination or solution no longer exists.",

  // Editor: PDF export
  "editor.exportPdfMessage":
    "Choose the combination to highlight. The full matrix is shown. Paper size (A3/A4), orientation and scale are set in the print dialog.",
  "editor.exportNone": "None (no highlight)",
  "editor.openPrint": "Open print view",

  // Cell dialog
  "cell.photoSection": "Photo",
  "cell.photoAlt": "Solution photo",
  "cell.noPhoto": "No photo",
  "cell.uploadPhoto": "Upload photo",
  "cell.replacePhoto": "Replace photo",
  "cell.removePhoto": "Remove photo",
  "cell.removePhotoMessage": "The photo of this solution will be removed when you save.",
  "cell.remove": "Remove",
  "cell.photoHint": "JPG, PNG or WebP, up to 5MB.",
  "cell.invalidType": "Invalid format. Use a JPG, PNG or WebP photo.",
  "cell.tooLarge": "The photo exceeds the 5MB limit.",
  "cell.solutionName": "Solution name",
  "cell.namePlaceholder": "E.g. Electric motor",
  "cell.parameters": "Parameters",
  "cell.paramNameLabel": "Parameter name",
  "cell.newParam": "new",
  "cell.paramLegend": "Parameter {name} (1 = best, 5 = worst)",
  "cell.removeParam": "Remove parameter",
  "cell.removeParamLabel": "Remove parameter {name}",
  "cell.addParam": "+ Add parameter",
  "cell.paramNameRequired": "Enter a name for every parameter.",
  "cell.paramDuplicate": 'The parameter "{name}" is repeated.',
  "cell.saving": "Saving…",
  "cell.gone": "This function or solution no longer exists.",
  "cell.invalidData": "Invalid data. Please review the fields.",
  "cell.saveError": "Could not save the solution.",

  // Print view
  "print.print": "Print / Save as PDF",
  "print.backToEditor": "Back to editor",
  "print.hint":
    'In the print dialog, choose "Save as PDF" as the destination, then the paper size (A3 or A4), orientation and scale.',
  "print.highlighted.one": "Highlighted combination: {name} ({chosen}/{count} function)",
  "print.highlighted.other": "Highlighted combination: {name} ({chosen}/{count} functions)",
  "print.noHighlight": "No highlighted combination",
  "print.generatedAt": "Generated on {date}",
  "print.scaleLabel": "Parameter scale:",
  "print.combinationNotFound": "Combination not found.",
  // PDF file name parts: ASCII letters and digits only.
  "print.file.matrix": "Matrix",
  "print.file.combination": "Combination",
  "print.file.none": "NoCombination",
};
