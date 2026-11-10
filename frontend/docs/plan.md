# LangWars — Frontend Plan & Backend Brief

> Status: frontend vertical slice implemented with a mocked backend (MSW).
> The backend handoff is [`backend-requirements.md`](./backend-requirements.md); it is a
> **frontend requirement document, not the full backend specification**. Semantics live in
> [`api.md`](./api.md) and the integration surface in [`../spec/openapi.yaml`](../spec/openapi.yaml).
> A dedicated backend session will design and implement the real system.

## 1. Product

LangWars is a LeetCode-style arena for **LWLang**, a small custom language that evolves
task-by-task. Each task can ship **editor addons** that extend the language (new keywords,
grammar) and run diagnostics (errors / warnings) on either the **AST** or the **source**.

Key flows:

1. Browse news / events on the landing page.
2. Pick a task, read the statement, write LWLang in the editor.
3. Editor highlights syntax, shows problems (errors + warnings) from all active addons.
4. Run (mock) or Submit. Submit returns verdict, score and updated rating.
5. Inspect last submissions with code and diff, full submission log and rating tables.
6. Admins manage news/tasks from the admin pane (API is mocked, auth is server-side later).

## 2. Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 6 + TypeScript (strict) |
| UI | React 18 |
| Routing | React Router 7 (data mode ready) |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Editor | CodeMirror 6 (custom stream language + lint) |
| Mock API | MSW 2 (network-level, zero app-code changes to swap) |
| Styling | Design tokens + CSS Modules-free global SCSS-like CSS |
| Tests | Vitest |

## 3. Routes

| Route | Page | Notes |
| --- | --- | --- |
| `/` | News | pinned event, feed, cat mascot, live badges |
| `/tasks` | Task list | filters, difficulty, solved state, language version |
| `/tasks/:id` | Task | statement, editor, diagnostics, run/submit, tabs |
| `/tasks/:id?tab=submissions` | Task submissions | own submissions + code/diff viewer |
| `/tasks/:id?tab=insights` | Custom task page | example of per-task extension (`cat-stats`) |
| `/submissions` | Global submission log | all user submissions, no code |
| `/rating` | Rating | switchable tables (global / per-task / event) with dynamic columns |
| `/auth` | Login / register | mocked credentials |
| `/admin` | Admin pane | news + task management, role-gated by API |
| `*` | Not found | pixel cat 404 |

## 4. Extensibility

### 4.1 Task custom pages

`TaskDef.customPages?: CustomPageDef[]` with `{ id, title, kind, config }`. The frontend
has a registry `CUSTOM_TASK_PAGES: Record<kind, Component>`; unknown kinds render a
graceful placeholder. Mock tasks demonstrate `cat-stats` (kind `stats`) and a custom
rating table for the holiday event.

### 4.2 Rating tables

`GET /api/rating/tables` returns table descriptors including arbitrary `columns`.
The rating page renders whatever columns the backend sends — no frontend change needed
for new "extra info" columns.

### 4.3 Editor addons

Addons are data-driven: `EditorAddon { kind: 'ast' | 'source', run(ctx) }`. Task
definitions list addon pack ids. The editor resolves packs → keyword/grammar patches
plus passes. Packs live in `src/lwlang/addons` and can be code-split later; loading real
remote addons is a backend concern.

## 5. Backend brief (summary, see api.md)

- Auth: JWT access token, roles `user` / `admin`.
- Tasks: definitions include statement, starter code, language version, addon packs,
  score, examples, custom pages.
- Submissions: async judge; verdict `OK | FAIL | WRONG_ANSWER | TLE | CE`; score; per-test
  details; code snapshot. Diff computed against the user's previous submission for the task.
- Rating: computed server-side; table descriptors + rows; per-task and event tables.
- News: CRUD (admin), categories, pinned flag.
- Admin: news/tasks CRUD, users list; role enforced server-side.
- Run endpoint: dry-run against example tests (used by the editor "Run" button).
- Mock implementation lives in `src/mocks/*`; it persists to localStorage and uses a
  deterministic signature-based fake judge.

## 6. Out of scope for this session

Real judge sandboxing, real compiler/parser on the backend, formatter/linter quality,
real syntax highlighting grammar, OAuth, websockets (polling/refetch now), pagination.
