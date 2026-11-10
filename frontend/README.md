# LangWars

A neon, LeetCode-style arena for **LWLang**, a custom language that grows task by task.
This repository contains the **frontend only**, running against a fully mocked backend
(MSW) that implements the contract in [`spec/openapi.yaml`](spec/openapi.yaml).

Built with React 18 + Vite + TypeScript, CodeMirror 6, TanStack Query, Zustand and MSW 2.

## Quick start

With Nix (recommended):

```bash
nix develop        # Node 22 + npm; enters frontend/ and installs deps on first use
npm run dev
```

Without Nix:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Nix outputs

From the repository root:

```bash
nix develop                    # dev shell (installs node_modules if missing)
nix build .#frontend           # static production build in ./result
nix build .#tests              # typecheck + Vitest in the Nix sandbox
nix flake check                # build + test checks for the current system
nix fmt                        # format flake.nix
```

The Nix build keeps the MSW mock enabled, so `./result` is a self-contained demo build.
Set `VITE_USE_MOCK=false` at build time when targeting a real backend.

Demo accounts (password `nyanya`):

| User | Role |
| --- | --- |
| `neko` | user (has seeded submissions) |
| `admin` | admin (admin pane enabled) |

The mock backend persists to `localStorage` under `langwars.mock.db.v1`.
Reset it from **Admin → Reset mock DB**, or in devtools:

```js
localStorage.removeItem('langwars.mock.db.v1')
```

To point at a future real backend, set `VITE_USE_MOCK=false` and serve the API at `/api`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with MSW |
| `npm run build` | typecheck + production build |
| `npm run preview` | preview the build (mocks still active) |
| `npm run typecheck` | `tsc` project build |
| `npm test` | Vitest (LWLang parser, addons, formatter) |

## What is implemented

- **News / events** landing page with pinned event, countdown and neon news cards.
- **Task registry** with difficulty filters, search, solved state, addon/version info.
- **Task workspace**: markdown-lite statement, examples, constraints, CodeMirror editor,
  run & submit, verdict panel with score/rating delta, problems panel, task rating,
  event ladder, submission log, custom task pages.
- **LWLang** reference parser + addon pipeline (source and AST passes) producing errors,
  warnings and hints; version-gated keywords (`v0.1`, `v0.2`, `v0.3`).
- **Mock backend**: auth, news, tasks, run/submit, submissions with code & diff, rating
  tables with dynamic columns, admin summary/users/news CRUD, reset.
- **Design system**: black/neon tokens, animated canvas background, CRT toggle,
  pixel cat mascot (Neko-9), responsive layout, reduced-motion support.

Mocked intentionally (dedicated later sessions): **syntax highlighter grammar, formatter,
linter quality, judge/compiler, real backend**. The editor's diagnostics are real AST/source
passes against the reference parser; the formatter is a naive whitespace normalizer.

## LWLang & editor addons

Language spec: [`docs/lwlang.md`](docs/lwlang.md).

A task pins a version and addon packs. Packs can add keywords and diagnostics:

```ts
const pack: AddonPack = {
  id: 'my-pack',
  title: 'My pack',
  kind: 'task',
  keywords: [],
  sourcePasses: [({ code, lines }) => [/* diagnostics */]],
  astPasses: [({ ast }) => [/* diagnostics */]],
}
```

Register it in `src/lwlang/addons/registry.ts` and list its id in a task's `addonPacks`.
Diagnostics flow into the CodeMirror gutter, lint underline and the problems panel.

### Adding a custom task page

1. Add a component under `src/pages/custom/`.
2. Register it in `src/pages/custom/registry.tsx` under a `kind`.
3. Add `customPages: [{ id, title, kind }]` to a task. The page can call
   `GET /tasks/{id}/insights` for data. Example: `Cat Stats` on **Catnip Night**.

### Adding rating columns

Rating rows carry `extra: Record<string, string | number>` and each table descriptor
declares its extra columns. Adding a column is a backend/spec change only — the UI renders
whatever the descriptor declares.

## Project layout

```
docs/            plan, design system, LWLang spec, backend requirements
spec/            OpenAPI 3.1 contract
src/
  api/           typed client, React Query hooks, API types
  components/    layout, UI primitives, mascot, markdown, diff, submissions modal
  editor/        CodeMirror language stream, theme, editor shell + problems panel
  lwlang/        tokenizer, parser, AST, addon packs, diagnostics pipeline
  mocks/         MSW handlers, seeded DB, fake judge, rating computation
  pages/         news, tasks, task, submissions, rating, admin, auth, custom pages
  store/         Zustand auth/UI/toast stores
  styles/        design tokens + global styles
```

## Backend hand-off

Start with:

- [`docs/backend-requirements.md`](docs/backend-requirements.md) — frontend handoff for the
  backend team. **This is a frontend requirement document, not the full backend spec.**
- [`docs/api.md`](docs/api.md) — semantics, judge requirements, security notes.
- [`spec/openapi.yaml`](spec/openapi.yaml) — machine-readable integration surface.
- [`docs/plan.md`](docs/plan.md) — architecture and extension points.

The frontend only talks to `/api` through `src/api/client.ts`. Removing MSW and pointing
the dev proxy at the real service is the intended swap.

---

Made with too much caffeine and one (1) terminal cat.
