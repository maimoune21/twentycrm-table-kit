# Twenty CRM Dashboard — Reusable Template

Standalone React + Vite app that runs the production **Candidats** dashboard
(Twenty-CRM style table) against fully **dummy data** — no backend required.

## Run

```bash
npm run dev          # http://127.0.0.1:5175
```

## Project layout

```
v2/
├── index.html
├── vite.config.ts          ← aliases + auto-stub plugin
├── api-stub-plugin.ts      ← intercepts every `@/api/*` import
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx            ← React entry
    ├── App.tsx             ← providers + routes
    ├── index.css           ← Tailwind v4 + upstream theme
    ├── admin/              ← ★ FULL EDITABLE COPY of the dashboard source
    │   ├── v2/
    │   │   ├── candidats/   ← the Candidats page (edit freely)
    │   │   ├── ecoles/
    │   │   ├── entreprises/
    │   │   ├── offres/
    │   │   ├── recruteurs/
    │   │   ├── components/  ← AdminRecordPage, RecordTablePagination, …
    │   │   ├── hooks/       ← useApplyFiltersAndSorts, useToggleColumnSort, …
    │   │   ├── utils/
    │   │   ├── types.ts
    │   │   └── index.ts
    │   └── shared/          ← SupprimerDialog, AffecterPremiumDialog, …
   └── data/
      ├── candidats.ts         ← ★ dummy rows in raw API shape
      ├── api-candidates.ts    ← reads from data/candidats.ts
      ├── api-villes.ts
      ├── api-ecoles.ts
      ├── api-metiers.ts
      ├── api-niveaux-etudes.ts
      ├── api-categories.ts
      ├── api-type-contrat.ts
      ├── api-type-stage.ts
      ├── api-auth.ts
      └── auth-provider.tsx
```

## Editing the dashboard

The whole Twenty-CRM-style page lives under [`src/admin/`](src/admin) and is
**fully editable**. When you inspect an element in the DOM and search for
the class name or the text, the result will point to a file in this folder.

Vite is configured with these specific aliases (in `vite.config.ts`) so the
upstream `@/auth/pages/admin/v2/...` and `@/auth/pages/admin/shared/...`
imports resolve to the local copy:

```ts
{ find: /^@\/auth\/pages\/admin\/v2(\/.*)?$/,     replacement: `${LOCAL}/admin/v2$1`     },
{ find: /^@\/auth\/pages\/admin\/shared(\/.*)?$/, replacement: `${LOCAL}/admin/shared$1` },
```

Everything else (`@/components/ui/*`, `@/lib/*`, `@/hooks/*`, …) still
resolves to the upstream repo via the general `@` alias — these are shared
utilities you usually don't need to edit. If you ever want to edit one of
those too, just copy it into `src/` mirroring the same path and the alias
order will pick up the local version first.

## Plugging in a different dataset

To turn this into a dashboard for, e.g., **schools** or **jobs**, copy the
candidat dataset into a new file and update the stub that owns the list:

1. Add `src/data/<your-entity>.ts` exporting `DUMMY_<YOUR_ENTITY>_RAW`
   in the same raw shape the production hook expects.
2. Update `src/data/api-candidates.ts` (or add a new data adapter and register
   it in `vite.config.ts → realStubs`) to read from your new dataset.
3. Restart `npm run dev`.

The upstream column definitions, cell renderers, filters and side panel
will pick up the new rows automatically.

## How auto-stubbing works

`api-stub-plugin.ts` is a tiny Vite plugin that:

1. Intercepts every import whose specifier starts with `@/api/` (or whose
   resolved absolute path lives under the upstream `src/api/` folder).
2. Parses the importer's named imports.
3. Emits a virtual module that re-exports the matching symbols from the
   local stub file when one is registered in `vite.config.ts → realStubs`,
   otherwise exports a thenable callable Proxy (`__noop`) that safely
   absorbs any call signature without crashing the page.

This means new `@/api/*` imports added upstream **do not break the demo**.
