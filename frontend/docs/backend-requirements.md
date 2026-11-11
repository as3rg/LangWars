# LangWars — Backend Handoff (Frontend Requirements)

> **Read this first.**
> This document describes **what the existing frontend needs from the backend**. It is a
> **frontend integration requirement**, **not the full backend specification**.
>
> The backend team is expected to design the real system: data model, persistence, judge
> sandbox, security, rate limits, observability, deployment, scaling, and all behaviours
> not listed here. [`spec/openapi.yaml`](../spec/openapi.yaml) and [`api.md`](./api.md)
> describe the current integration surface only; they are also not exhaustive.
>
> Anything the frontend does **not** use is a backend design decision. Anything listed here
> as a behaviour is a contract the UI currently relies on.

## 1. Project context

LangWars is a LeetCode-style arena for **LWLang**, a small custom language that evolves
task by task. A task declares a language version and **editor addon packs**. Addons can add
keywords and diagnostics; the task also defines examples, a starter solution and scoring.

Current state:

- The frontend is implemented in this repository.
- The backend is **fully mocked** with MSW (`src/mocks/`), including auth, judge, rating,
  news, admin and persistence (browser `localStorage`).
- `src/api/client.ts` is the only place the UI talks to the network. All calls go to
  `/api/*`.
- Setting `VITE_USE_MOCK=false` disables MSW; the real backend must then serve `/api`.

The backend's goal is to replace the mock **without changing the frontend's API contract
shape and semantics**. Improvements to internals are welcome; breaking UI-visible changes
must be agreed with the frontend.

## 2. Ownership boundary

| Area | Frontend (already implemented) | Backend (to implement) |
| --- | --- | --- |
| Editor, highlighting, addon diagnostics | Yes, client-side reference parser | Must compile independently for judging |
| LWLang language spec | Reference parser + docs | Real compiler/interpreter + sandbox |
| Judge verdict | Deterministic fake judge | Real execution, tests, limits |
| Score / rating | Renders returned values only | Computes score, rating, ranks, deltas |
| Auth UI | Login/register forms, token storage | Credentials, JWT, roles, revocation |
| News/tasks/submissions/admin UI | Yes | Persistence, validation, authorization |
| Diff UI | Renders returned hunks | Compute diff vs previous submission |
| Custom task pages | Registry by `kind` | Return `insights` payloads for registered kinds |

Important: **client-side diagnostics are not trustworthy** for judging. The backend must
parse/compile submitted code itself.

## 3. Non-negotiable integration contract

The following is the minimum needed to run the current UI. Shapes are in
[`spec/openapi.yaml`](../spec/openapi.yaml); semantics are in [`api.md`](./api.md).

### 3.1 Conventions

- Base path `/api`, JSON UTF-8.
- `Authorization: Bearer <token>` for authenticated calls.
- Error body: `{ "error": { "code": "...", "message": "..." } }`.
- HTTP status usage: `400` validation, `401` auth, `403` role/privacy, `404` missing,
  `409` conflict, `422` rejected submission/too large, `429` rate limit.
- All timestamps are ISO-8601 UTC strings.
- IDs are opaque strings; the frontend treats them as keys.
- `204 No Content` for successful deletes.
- If the API is served from a different origin, CORS must allow the frontend origin,
  `Authorization`, `Content-Type`, and expose any custom headers you add.

### 3.2 Endpoints used by the UI

| Method | Path | Used for |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/register`, `/auth/logout` | Auth |
| GET | `/me` | Session restore, header identity, admin role |
| GET | `/news` | Landing page |
| GET | `/tasks` | Task grid, filters, solved/attempted |
| GET | `/tasks/{id}` | Task workspace |
| POST | `/tasks/{id}/run` | "Run" against examples |
| POST | `/tasks/{id}/submit` | Judged submission + rating update |
| GET | `/tasks/{id}/submissions?scope=mine\|all` | Task submission log (no code) |
| GET | `/tasks/{id}/insights` | Custom task pages |
| GET | `/submissions?taskId=&userId=&limit=` | Global log (no code) |
| GET | `/submissions/{id}` | Code + diff for author/admin |
| GET | `/rating/tables` | Available ladders and dynamic columns |
| GET | `/rating?table={id}` | Ladder rows |
| GET | `/admin/summary`, `/admin/users` | Admin dashboard |
| PATCH | `/admin/users/{id}` | Role/note updates |
| POST/PATCH/DELETE | `/admin/news`, `/admin/news/{id}` | News CRUD |

`GET /tasks/{id}` accepts either the task id or slug. The mock uses ids like `tsk_*` and
slugs like `catnip-night`; task links use ids.

### 3.3 Fields the UI reads (do not rename casually)

- **User:** `id, username, displayName, role, avatarHue, rating, solvedCount, streak`.
  `avatarHue` is a 0–360 number used for the generated avatar. Admin also reads `adminNote`.
- **NewsItem:** `id, title, body, category, pinned, accent, createdAt`, optional
  `cta {label, href}`, `startsAt, endsAt`. `body` is rendered as markdown-lite.
- **Task:** `id, slug, title, difficulty, tags, score, solvedBy, languageVersion,
  addonPacks, statement, constraints, examples, starterCode, entryPoint, timeLimitMs`,
  optional `customPages`, `ratingTable`, `solved`, `attempted`.
  - `difficulty` must be `easy | medium | hard | nightmare`.
  - `languageVersion` must be one of `v0.1 | v0.2 | v0.3` until the frontend adds more.
  - `addonPacks` are ids the editor uses; unknown ids are ignored gracefully.
  - `customPages` entries are `{ id, title, kind, config? }`. The frontend maps `kind` to a
    component registry. Unknown kinds show a placeholder. `config` is frontend-defined.
- **Verdict status:** exactly `OK | FAIL | WRONG_ANSWER | TLE | CE`.
- **Submission summary:** `id, taskId, taskTitle, userId, username, status, score,
  languageVersion, createdAt, durationMs, testsPassed, testsTotal`.
- **Submission detail adds:** `code`, `diagnostics`, `tests`, optional `stdout`,
  `previousId`, `previousCode`, `diff { unified, hunks }`.
  - `diff.hunks` is `{ type: 'add'|'del'|'ctx', oldLine?, newLine?, text }[]`.
- **Rating descriptor:** `{ id, title, description?, columns, highlightUserId? }` where
  `columns` are **extra** columns beyond rank/user/score/solved:
  `{ key, label, align? }`.
- **Rating row:** `{ rank, userId, username, score, solved, delta?, extra }`.
  `extra` values may be strings or numbers and are rendered verbatim (the UI formats ISO
  timestamps specially). New columns require **no frontend change**.
- **Rating table:** `{ descriptor, rows, me? }`.
- **Submit response:** `{ submission, ratingUpdate }` where `ratingUpdate` is
  `{ tableId, delta, newScore, rank, rankBefore }`.

### 3.4 Rating table ids

- `global`
- `task:{taskId}` for every task
- `event:{eventId}` for events

The frontend uses exactly these ids. `task:` and `event:` tables must exist when advertised
by `/rating/tables`.

### 3.5 Submission detail / diff semantics

- `GET /submissions/{id}` is allowed only for the submission author or an admin.
- The frontend opens the detail modal from:
  - the user's own rows in any log,
  - any row when the viewer is admin.
- The diff is shown against the **user's previous submission for the same task** (by
  `createdAt`). If there is none, `diff` and `previousId` may be omitted; the UI displays a
  "first submission" state.
- The UI renders `diff.hunks`; `unified` is informational/fallback.

### 3.6 Run vs submit

- `POST /tasks/{id}/run` is used for the editor's "Run" button. It should execute only
  example tests/visible tests and return `RunResult` without persisting a submission or
  affecting rating.
- `POST /tasks/{id}/submit` must persist and return the final verdict synchronously for
  the current UI. If you implement asynchronous judging later, the frontend needs a new
  polling/SSE/WS contract; do not silently change `submit` to return a pending result.

## 4. Behaviour the UI relies on

1. **Login returns `{ token, user }`.** The frontend stores the token and restores the
   session by calling `/me`. A `401` from `/me` clears the session.
2. **Admin role comes from `/me`.** The admin pane is rendered only when
   `user.role === 'admin'`; the API must still enforce it on every admin route.
3. **Submissions are author-private.** Summaries/logs are visible to authenticated users
   without code; detail is only author/admin.
4. **Ranking is server-owned.** Score, rating, rank, delta and rank-before are computed by
   the backend. The UI only displays them. The mock currently awards full task score on the
   first accepted solution, applies a small penalty for failures, and returns the global
   rank movement. The real formula is your decision, but the response shape must stay.
5. **A submission response immediately updates the visible rating.** The header rating and
   rank display come from `ratingUpdate.newScore` / `rank`.
6. **Task solved state:** `solved` is true if the current user has any accepted submission;
   `attempted` is true if they have any submission. `solvedBy` is a display count.
7. **News pinned item** is used as a hero/event banner. `endsAt` drives the countdown.
8. **`/tasks/{id}/insights`** is public and feeds custom task pages with task statistics
   and code-free recent submission summaries. It must exclude source, hidden tests,
   and private submission details. The UI expects
   `{ kind, data }`; the mock returns stats for the `stats` kind. Unknown payload shapes are
   only safe for registered kinds — coordinate before adding new ones.
9. **LWLang versions and addons** are part of task data. The frontend parses submitted code
   with the reference parser for editor diagnostics only. Task `languageVersion` and
   `addonPacks` must be stable; changing them changes the client-side diagnostics.
10. **No HTML is trusted.** Markdown bodies are rendered by the frontend without
    `dangerouslySetInnerHTML`; keep markdown-lite, do not send raw HTML expecting execution.

## 5. What the mock currently fakes (and what "real" means)

| Mock behaviour | Required real behaviour |
| --- | --- |
| Token `mock-token-<userId>` | JWT/session with expiry, revocation, secure password hashing (argon2id) |
| In-browser `localStorage` DB | Server database + migrations |
| Signature/regex fake judge | LWLang compiler/interpreter, test runner, sandbox |
| Fixed sample-test results | Real per-test execution, outputs, limits |
| Seeded ratings and deterministic deltas | Real rating algorithm, event rules, tie-breakers |
| In-memory news/task/user mutations | Persistent CRUD with validation and audit |
| Admin role check in mock handlers | Enforced RBAC on every admin endpoint |
| `POST /admin/reset` (mock-only) | Not part of production; do not implement unless wanted |
| Client-side editor addon diagnostics | Backend must re-validate compiled code; addons remain editor UX |

Judge requirements (minimum):

- Parse with a real LWLang implementation matching `docs/lwlang.md` version semantics.
- Compile errors → `CE`, with diagnostics where feasible.
- Sandboxed execution with per-task wall-clock (`timeLimitMs`), memory, output and process
  limits.
- Wrong output → `WRONG_ANSWER`; timeout → `TLE`; runtime/infra failure → `FAIL`.
- Persist per-test results and stdout; never execute in the API process.
- Rate-limit submissions (at least 1 per few seconds per user/task) and cap code size
  (current contract: 64 KiB).

## 6. Explicitly left to the backend team

These are **not** specified by the frontend and should be designed in the backend session:

- Database schema, migrations, indexing, retention, backups.
- Async judge architecture (queue/workers) and how to extend `submit` for async.
- Pagination/cursors for logs (the UI currently asks for up to 200).
- SSE/WebSocket verdict streaming (not used yet).
- Rating formula, tie-break policy, event scoring, anti-abuse.
- Sandbox technology and isolation guarantees.
- Admin capabilities beyond the current news/user endpoints: task authoring, addon
  registry, audit log, moderation, reports.
- Remote addon loading/versioning (the frontend currently bundles addon packs).
- Public solutions, comments, notifications, search, user profiles.
- Observability, metrics, tracing, deployment, secrets, CORS policy.
- Input sanitisation policy for markdown news/task statements.

Anything above can be added, but changes visible to the frontend must update
`spec/openapi.yaml` and be coordinated.

## 7. Suggested implementation order

1. Scaffold service, database, migrations, error envelope, `/health`.
2. Auth (`register/login/logout`), `/me`, roles.
3. Read endpoints: news, tasks, task detail.
4. Submissions storage + judge worker + `run` / `submit`, verdict model.
5. Submission logs, detail, privacy, diff computation.
6. Rating tables/rows, `ratingUpdate` on submit, dynamic columns.
7. Admin summary/users/news CRUD with RBAC.
8. Hardening: sandbox, rate limits, quotas, audit, CORS, observability.
9. Integration test with the frontend (`VITE_USE_MOCK=false`).

## 8. Frontend integration checklist

- [ ] `/api/health` reachable, errors use the documented envelope.
- [ ] `neko/nyanya`-style demo data seeded or equivalent test users available.
- [ ] Login + `/me` + admin role work; 401 clears the session.
- [ ] News feed renders; pinned + `endsAt` work.
- [ ] Task list/detail render; `languageVersion` is `v0.1`–`v0.3`.
- [ ] Run returns `RunResult`; Submit returns `SubmitResult` and persists.
- [ ] Submission log rows have no code; detail is author/admin only.
- [ ] Diff hunks render correctly against the previous submission.
- [ ] Rating tables include `global`, every `task:{id}`, and event tables.
- [ ] Extra rating columns render without frontend changes.
- [ ] Admin news CRUD and user role/note updates work and are RBAC-protected.
- [ ] Custom page endpoint returns `{ kind, data }` for `stats`.
- [ ] Code size and rate limits return `422`/`429` with the error envelope.

## 9. References

- [`spec/openapi.yaml`](../spec/openapi.yaml) — machine-readable integration surface
  (frontend contract, not the full backend spec).
- [`api.md`](./api.md) — endpoint semantics, judge notes, security notes.
- [`lwlang.md`](./lwlang.md) — LWLang language and addon rules.
- [`plan.md`](./plan.md) — frontend architecture and extension points.
- `src/mocks/` — executable reference behaviour for the mock (useful for edge cases).
- `src/api/types.ts` — exact TypeScript shapes the UI consumes.

---

**Reminder:** this is a frontend requirement document. Treat it as the input to the backend
design, then write the complete backend specification separately.
