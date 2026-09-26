# morphomatrix
A simple morphological matrix tool for product design

## Running

Requires [Docker](https://docs.docker.com/get-docker/).

With Docker Compose:

```sh
docker compose up -d --build
```

Or with plain Docker:

```sh
docker build -t morphomatrix .
docker run -d -p 127.0.0.1:8000:8000 -v "$(pwd)/data:/app/data" morphomatrix
```

On Windows PowerShell, use `-v "${PWD}/data:/app/data"`.

Open <http://127.0.0.1:8000> in your browser.

Matrices and photos are stored in the `data/` folder, which is kept between runs. The app has no authentication and is only exposed on `127.0.0.1`.

To stop:

```sh
docker compose down
```

## Usage

The interface is in Portuguese; button names below are shown as they appear.

### Matrices

- **Nova matriz**: enter a name to create an empty matrix and open the editor.
- **Abrir**, **Renomear**, **Excluir**: available for each matrix in the list.

### Editing a matrix

- **+ Função** adds a row (function); **+ Solução** adds a column (solution). Columns are labeled S1, S2, ... by position.
- Click a function name to rename it (Enter saves, Esc cancels).
- Use the arrows to reorder rows and columns, and ✕ to delete them. Deleting a row or column also removes it from any combination.
- Click a cell to edit it: photo (JPG/PNG, up to 5MB), solution name and parameters on a 1–5 scale (1 = best, 5 = worst). Use **+ Adicionar parâmetro** for extra parameters. Changes apply on **Salvar**.

### Combinations

- **+ Nova combinação** creates a combination and makes it active.
- With a combination active, clicking a cell selects or unselects that solution for its function (one per function). Use ✎ to edit the cell instead.
- **Duplicar** copies the active combination, useful to track how the choice evolves. **Renomear** and **Excluir** apply to the active combination.
- Select **Nenhuma** to go back to plain editing.

### Exporting to PDF

1. Click **Exportar PDF** and choose the combination to highlight (or **Nenhuma**).
2. The print view opens in a new tab and the browser print dialog appears.
3. Choose **Save as PDF**, the paper size (A3 or A4), orientation and scale.

The suggested file name is `{matrix}_{combination}_{timestamp}`.

### Backup and restore

- **Exportar backup** (in the editor) downloads a `.zip` with the matrix and its photos.
- **Importar** (in the matrix list) restores a backup `.zip` as a new matrix.
