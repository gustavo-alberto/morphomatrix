// Portuguese (Brazil) messages. Reference dictionary: every key must exist here.
// Placeholders: {name}. Plural keys end in ".one" / ".other" (see tn() in i18n.js).

export default {
  // Common
  "common.cancel": "Cancelar",
  "common.confirm": "Confirmar",
  "common.save": "Salvar",
  "common.create": "Criar",
  "common.open": "Abrir",
  "common.rename": "Renomear",
  "common.delete": "Excluir",
  "common.duplicate": "Duplicar",
  "common.loading": "Carregando…",
  "common.backToList": "Voltar para a lista",
  "common.matrixNotFound": "Matriz não encontrada.",
  "common.matrixLoadError": "Não foi possível carregar a matriz.",

  // Errors
  "error.unexpected": "Ocorreu um erro inesperado.",
  "error.notFound": "Item não encontrado. Recarregue a página.",
  "error.offline": "Sem conexão com o servidor.",
  "prompt.nameRequired": "Informe um nome.",

  // Language and theme
  "language.label": "Idioma",
  "theme.title": "Tema",
  "theme.label": "Tema: {mode}",
  "theme.switchTo": "Mudar para tema {mode}",
  "theme.system": "Sistema",
  "theme.light": "Claro",
  "theme.dark": "Escuro",

  // Page titles
  "page.editor": "Editor · Morphomatrix",
  "page.print": "Impressão · Morphomatrix",

  // Built-in parameters (see DEFAULT_PARAMETER_KEYS in matrix-utils.js)
  "parameter.complexity": "Complexidade",
  "parameter.cost": "Custo",

  // Shared matrix vocabulary
  "table.functions": "Funções",
  "table.solutions": "Soluções",
  "scale.hint": "1 = melhor · 5 = pior",

  // Home
  "home.newMatrix": "Nova matriz",
  "home.import": "Importar",
  "home.importing": "Importando…",
  "home.sectionTitle": "Matrizes",
  "home.listLabel": "Matrizes salvas",
  "home.createdAt": "Criada em",
  "home.updatedAt": "Atualizada em",
  "home.openLabel": "Abrir {name}",
  "home.renameLabel": "Renomear {name}",
  "home.deleteLabel": "Excluir {name}",
  "home.empty": "Nenhuma matriz ainda. Crie a primeira ou importe um backup.",
  "home.loadError": "Não foi possível carregar as matrizes.",
  "home.nameLabel": "Nome da matriz",
  "home.createError": "Não foi possível criar a matriz.",
  "home.renameTitle": "Renomear matriz",
  "home.renamed": "Matriz renomeada.",
  "home.renameGone": "Esta matriz não existe mais.",
  "home.renameError": "Não foi possível renomear a matriz.",
  "home.deleteTitle": "Excluir matriz",
  "home.deleteMessage": 'A matriz "{name}" e todas as suas fotos serão excluídas permanentemente.',
  "home.deleted": 'Matriz "{name}" excluída.',
  "home.deleteGone": "Esta matriz já havia sido excluída.",
  "home.deleteError": "Não foi possível excluir a matriz.",
  "home.imported": 'Backup importado como nova matriz: "{name}".',
  "home.importTooLarge": "O backup excede o tamanho máximo permitido.",
  "home.importInvalid": "Arquivo inválido. Selecione um backup .zip exportado pelo Morphomatrix.",
  "home.importError": "Não foi possível importar o backup.",

  // Editor: header and general
  "editor.back": "← Matrizes",
  "editor.exportPdf": "Exportar PDF",
  "editor.exportBackup": "Exportar backup",
  "editor.actionError": "Não foi possível concluir a ação.",
  "editor.hintEditing": "Clique numa célula para editar a solução. Selecione uma combinação para escolher soluções.",
  "editor.hintSelecting":
    'Clique numa célula para marcá-la ou desmarcá-la em "{name}" (uma solução por função). Use ✎ para editar a solução.',

  // Editor: rows (functions)
  "editor.addRow": "+ Função",
  "editor.addRowLabel": "Adicionar função",
  "editor.defaultRowTitle": "Função {n}",
  "editor.rowNameLabel": "Nome da função",
  "editor.rowNameEmpty": "O nome da função não pode ficar vazio.",
  "editor.rowMissing": "Esta função não existe mais.",
  "editor.rowTitleLabel": "Função: {title}. Renomear",
  "editor.rowTitleHint": "Clique para renomear",
  "editor.moveUp": 'Mover "{title}" para cima',
  "editor.moveDown": 'Mover "{title}" para baixo',
  "editor.deleteRowLabel": 'Excluir função "{title}"',
  "editor.deleteRowTitle": "Excluir função",
  "editor.deleteRowMessage": 'A função "{title}" e todas as soluções desta linha (incluindo fotos) serão excluídas.',
  "editor.rowDeleted": 'Função "{title}" excluída.',
  "editor.rowGone": "Esta função já havia sido excluída.",

  // Editor: columns (solutions)
  "editor.addColumn": "+ Solução",
  "editor.addColumnLabel": "Adicionar coluna de solução",
  "editor.noSolutions": "Nenhuma solução",
  "editor.moveLeft": "Mover {label} para a esquerda",
  "editor.moveRight": "Mover {label} para a direita",
  "editor.deleteColumnLabel": "Excluir coluna {label}",
  "editor.deleteColumnTitle": "Excluir coluna",
  "editor.deleteColumnMessage":
    "A coluna {label} e todas as suas soluções (incluindo fotos) serão excluídas. As colunas seguintes serão renumeradas.",
  "editor.columnDeleted": "Coluna {label} excluída.",
  "editor.columnGone": "Esta coluna já havia sido excluída.",
  "editor.removedFromCombinations": "{message} Seleção removida das combinações: {names}.",

  // Editor: cells
  "editor.addSolution": "+ Adicionar solução",
  "editor.cellEmptyShort": "Vazia",
  "editor.noName": "Sem nome",
  "editor.cellEmpty": "{position}: vazia",
  "editor.cellSolution": "{position}: {name}",
  "editor.unnamed": "sem nome",
  "editor.cellInCombinations": "Combinações: {names}",
  "editor.cellChooseIn": 'Escolher em "{name}"',
  "editor.cellEdit": "Editar",
  "editor.cellAdd": "Adicionar solução",
  "editor.editSolutionLabel": "Editar solução: {position}",

  // Editor: combinations
  "editor.activeCombination": "Combinação ativa",
  "editor.combinationActions": "Ações da combinação",
  "editor.noCombination": "Nenhuma",
  "editor.chosenCountTitle": "Funções com solução escolhida",
  "editor.newCombination": "+ Nova combinação",
  "editor.newCombinationTitle": "Nova combinação",
  "editor.combinationNameLabel": "Nome da combinação",
  "editor.defaultCombinationName": "Combinação {n}",
  "editor.combinationCreated": 'Combinação "{name}" criada. Clique nas células para escolher as soluções.',
  "editor.duplicateTitle": "Duplicar combinação",
  "editor.copyNameLabel": "Nome da cópia",
  "editor.copyName": "{name} (cópia)",
  "editor.duplicated": 'Combinação "{name}" criada a partir de "{source}".',
  "editor.renameCombinationTitle": "Renomear combinação",
  "editor.combinationRenamed": "Combinação renomeada.",
  "editor.deleteCombinationTitle": "Excluir combinação",
  "editor.deleteCombinationMessage":
    'A combinação "{name}" e suas escolhas serão excluídas. As soluções da matriz não são afetadas.',
  "editor.combinationDeleted": 'Combinação "{name}" excluída.',
  "editor.combinationGone": "Esta combinação não existe mais.",
  "editor.toggleGone": "Esta combinação ou solução não existe mais.",

  // Editor: PDF export
  "editor.exportPdfMessage":
    "Escolha a combinação a destacar. A matriz completa será exibida. Tamanho do papel (A3/A4), orientação e escala são definidos no diálogo de impressão.",
  "editor.exportNone": "Nenhuma (matriz sem destaque)",
  "editor.openPrint": "Abrir impressão",

  // Cell dialog
  "cell.photoSection": "Foto",
  "cell.photoAlt": "Foto da solução",
  "cell.noPhoto": "Sem foto",
  "cell.uploadPhoto": "Enviar foto",
  "cell.replacePhoto": "Trocar foto",
  "cell.removePhoto": "Remover foto",
  "cell.removePhotoMessage": "A foto desta solução será removida ao salvar.",
  "cell.remove": "Remover",
  "cell.photoHint": "JPG ou PNG, até 5MB.",
  "cell.invalidType": "Formato inválido. Use uma foto JPG ou PNG.",
  "cell.tooLarge": "A foto excede o limite de 5MB.",
  "cell.solutionName": "Nome da solução",
  "cell.namePlaceholder": "Ex.: Motor elétrico",
  "cell.parameters": "Parâmetros",
  "cell.paramNameLabel": "Nome do parâmetro",
  "cell.newParam": "novo",
  "cell.paramLegend": "Parâmetro {name} (1 = melhor, 5 = pior)",
  "cell.removeParam": "Remover parâmetro",
  "cell.removeParamLabel": "Remover parâmetro {name}",
  "cell.addParam": "+ Adicionar parâmetro",
  "cell.paramNameRequired": "Informe o nome de todos os parâmetros.",
  "cell.paramDuplicate": 'O parâmetro "{name}" está repetido.',
  "cell.saving": "Salvando…",
  "cell.gone": "Esta função ou solução não existe mais.",
  "cell.invalidData": "Dados inválidos. Revise os campos.",
  "cell.saveError": "Não foi possível salvar a solução.",

  // Print view
  "print.print": "Imprimir / Salvar PDF",
  "print.backToEditor": "Voltar ao editor",
  "print.hint":
    'No diálogo de impressão, escolha o destino "Salvar como PDF", o tamanho do papel (A3 ou A4), a orientação e a escala.',
  "print.highlighted.one": "Combinação destacada: {name} ({chosen}/{count} função)",
  "print.highlighted.other": "Combinação destacada: {name} ({chosen}/{count} funções)",
  "print.noHighlight": "Sem combinação destacada",
  "print.generatedAt": "Gerado em {date}",
  "print.scaleLabel": "Escala dos parâmetros:",
  "print.combinationNotFound": "Combinação não encontrada.",
  // PDF file name parts: ASCII letters and digits only.
  "print.file.matrix": "Matriz",
  "print.file.combination": "Combinacao",
  "print.file.none": "SemCombinacao",
};
