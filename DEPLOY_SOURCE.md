# Single Source Policy (docs only)

This repository now uses `docs/` as the single source for website files.

## Canonical files

- `docs/index.html` (shop frontend)
- `docs/admin.html` (admin backend UI)

Do not edit root-level `index.html` or `admin.html` (they were removed on purpose).

## Local development

- Backend serves static files from `docs/`
- Start backend:

```bash
cd server
npm start
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/admin.html`

## GitHub Pages

Keep Pages source as:

- Branch: `main`
- Folder: `/docs`

This avoids duplication and keeps deployment consistent.
