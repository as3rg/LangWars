# LangWars Backend — Requirement List & API Semantics

> **Scope warning.** This document describes the **frontend's requirements** for the API,
> not the complete backend specification. It is the integration contract the current UI
> relies on. The backend team owns the real design (data model, judge sandbox, security,
> scaling, etc.). See [`backend-requirements.md`](./backend-requirements.md) for the full
> handoff, and [`../spec/openapi.yaml`](../spec/openapi.yaml) for the machine-readable
> integration surface (also not exhaustive).

## Conventions

- Base path: `/api`, JSON only (`application/json; charset=utf-8`).
- Auth: `Authorization: Bearer <jwt>`; access token TTL 30 min, refresh via `/auth/refresh`
  (reserved). Roles: `user`, `admin`.
- Errors: `{ "error": { "code": "STRING_CODE", "message": "...", "details"?: unknown } }`
  with proper HTTP status (400 validation, 401, 403, 404, 409, 422 judge, 429 rate limit).
- IDs: opaque strings (`tsk_*`, `sub_*`, `usr_*`, `news_*`).
- Time: ISO-8601 UTC.
- Pagination: `?limit=&cursor=` → `{ items, nextCursor }` where noted.
- Every response from the mock carries `X-Mock-Backend: 1`.

## Entities

### User
`id, username, displayName, email?, role, avatarHue, rating, solvedCount, streak, adminNote?, createdAt`

### NewsItem
`id, title, body (markdown-lite), category: event|update|maintenance|holiday, pinned, accent: cyan|magenta|violet|amber, cta?: {label, href}, createdAt, startsAt?, endsAt?`

### TaskSummary
`id, slug, title, difficulty: easy|medium|hard|nightmare, tags[], score, solvedBy, languageVersion, addonPacks[], solved?: boolean, attempted?: boolean`

### Task (extends summary)
`statement (markdown-lite), constraints[], examples[{input, output, explanation?}], starterCode, entryPoint, timeLimitMs, customPages?: [{id,title,kind,config}], ratingTable?: string`

### Submission
Summary (no code): `id, taskId, taskTitle, userId, username, status, score, languageVersion, createdAt, durationMs, testsPassed, testsTotal`
Detail adds: `code, diagnostics[], tests[], stdout?, previousId?`

### Verdict status
`OK | FAIL | WRONG_ANSWER | TLE | CE`

### RatingTableDescriptor
`id, title, description, columns: [{key,label,align?}], highlightUserId?`
### RatingTable
`descriptor, rows: [{ rank, userId, username, score, solved, delta?, extra: Record<string,string|number> }], me?: row`

## Endpoints

### Auth
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | – | `{username,password}` → `{token,user}`; demo: `neko/nyanya`, `admin/nyanya` |
| POST | `/auth/register` | – | `{username,email,password}`; 409 on duplicate |
| POST | `/auth/logout` | user | invalidate token |
| GET | `/me` | user | current user |
| PATCH | `/me` | user | `displayName?`, `avatarHue?` |

### News
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/news` | – | sorted pinned desc, createdAt desc |
| GET | `/news/{id}` | – | 404 unknown |
| POST | `/admin/news` | admin | create |
| PATCH | `/admin/news/{id}` | admin | partial update |
| DELETE | `/admin/news/{id}` | admin | |

### Tasks
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/tasks` | optional | includes `solved`/`attempted` when authenticated |
| GET | `/tasks/{id}` | optional | by id or slug |
| POST | `/tasks/{id}/run` | user | body `{code, languageVersion}` → `RunResult` (example tests only, synchronous-ish) |
| POST | `/tasks/{id}/submit` | user | body `{code, languageVersion}` → `{submission, ratingUpdate}` |
| GET | `/tasks/{id}/submissions?scope=mine\|all` | user | summaries only, newest first |
| GET | `/tasks/{id}/insights` | user | extension data for custom pages (shape: `{kind, data}`) |
| POST | `/admin/tasks` | admin | create |
| PATCH | `/admin/tasks/{id}` | admin | update incl. addonPacks/languageVersion |
| DELETE | `/admin/tasks/{id}` | admin | |

### Submissions
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/submissions?taskId=&userId=&limit=` | user | log without code |
| GET | `/submissions/{id}` | user/admin | code + diff vs user's previous submission for same task |

Diff contract: `{ previousId?: string, previousCode?: string, unified: string, hunks: [{ type: add\|del\|ctx, oldLine?, newLine?, text }] }`.
The mock computes it with jsdiff; the backend may use its own algorithm but must return `hunks`
compatible with the frontend `DiffView`.

### Rating
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/rating/tables` | optional | descriptors: global, `task:{taskId}`, `event:{eventId}` |
| GET | `/rating?table={id}` | optional | rows + `me`; unknown table → 404 |

Columns are dynamic. Known extra columns:
- global: `streak`, `lastSolve`
- task: `bestTime`, `attempts`
- event: `eventPoints`, `badges`

### Admin
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/admin/summary` | admin | counts + recent activity |
| GET | `/admin/users` | admin | users with `adminNote` |
| PATCH | `/admin/users/{id}` | admin | role/note updates |
| POST | `/admin/reset` | admin | **mock-only** reseed of the in-browser database (not part of the production contract) |

## Judge semantics (future implementation)

1. Validate body size (≤ 64 KiB) and language version exists.
2. Parse with the LWLang compiler. Parse errors → `CE`; diagnostics returned.
3. Run all tests in a sandboxed interpreter with wall clock = `task.timeLimitMs`,
   memory cap, output cap. Non-zero/failed → `WRONG_ANSWER`/`TLE`/`FAIL`.
4. Score: full task score on first `OK`; no score for repeats; partial scoring is a
   future addition (`testDetails` already carries per-test output).
5. Rating: Elo-like per task, recomputed; response carries delta + new rank.
6. Persist code snapshot, tests, diagnostics, stdout. Never expose other users' code
   unless the task is marked public-solutions (future).

## Mock-only behaviour

- Fake judge: code is normalized, hashed and matched against a per-task signature
  (`requiredPatterns`). Missing signature → `WRONG_ANSWER`, parse failure → `CE`.
  Deterministic: same code + version = same verdict.
- DB persists to `localStorage` (`langwars.mock.db.v1`) so submissions survive reloads.
- Reset via `localStorage.removeItem('langwars.mock.db.v1')`.
- Latency 120–420 ms, submission verdict 400–900 ms.

## Security notes for the real backend

- Judge must never execute untrusted code in the API process; use a sandboxed worker with
  seccomp/namespaces, CPU/memory/time/output limits.
- Rate limit submissions (e.g. 1 / 5s / user / task) and total (e.g. 60/h).
- Store code snapshots with integrity hashes; audit admin actions.
- JWT rotation + revoke list; password hashing with argon2id.
