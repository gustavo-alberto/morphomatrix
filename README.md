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

Button names below are shown as they appear in the English interface.

### Language and theme

- The interface is available in **Português** and **English**. It starts in your browser's language (Portuguese for any language other than English) and can be changed with the language selector at the top of every page. The choice is remembered.
- **Theme** switches between System, Light and Dark. The print view and PDF are always light.
- The built-in parameters (Complexity and Cost) follow the selected language. Everything you type (matrix, function, solution, parameter and combination names) is kept as written.

### Matrices

- **New matrix**: enter a name to create an empty matrix and open the editor.
- **Open**, **Rename**, **Delete**: available for each matrix in the list.

### Editing a matrix

- **+ Function** adds a row (function); **+ Solution** adds a column (solution). Columns have no name: each cell is identified by its function and its solution name.
- Click a function name to rename it (Enter saves, Esc cancels).
- Use the ↑ ↓ arrows to reorder functions. Solution columns keep their position, since each one spans every function. Use ✕ to delete a function or a column; this also removes it from any combination.
- Click a cell to edit it: photo (JPG/PNG/WebP, up to 5MB), solution name and parameters on a 1–5 scale (1 = best, 5 = worst). Use **+ Add parameter** for extra parameters. Changes apply on **Save**.
- The matrix opens in a simplified view. Turn on **Detailed view** (above the table, and in the print view) to also show the parameters and the colored dots marking which combinations use each solution. The choice is remembered and also applies to the PDF (parameters and scale legend).

### Combinations

- **+ New combination** creates a combination and makes it active.
- With a combination active, clicking a cell selects or unselects that solution for its function (one per function). Use ✎ to edit the cell instead.
- **Duplicate** copies the active combination, useful to track how the choice evolves. **Rename** and **Delete** apply to the active combination.
- Select **None** to go back to plain editing.

### Exporting to PDF

1. Click **Export PDF** and choose the combination to highlight (or **None**).
2. The print view opens in a new tab and the browser print dialog appears.
3. Choose **Save as PDF**, the paper size (A3 or A4), orientation and scale.

The suggested file name is `{matrix}_{combination}_{timestamp}`.

### Backup and restore

- **Export backup** (in the editor) downloads a `.zip` with the matrix and its photos.
- **Import** (in the matrix list) restores a backup `.zip` as a new matrix.
