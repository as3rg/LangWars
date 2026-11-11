# Working in LangWars

LangWars is a shared-state programming game. Players should be able to break each
other's solutions through the language; they must never gain host execution or
access to server credentials. Preserve that distinction when changing the game.

Use **LWLang** in player-facing text and **LangWarsScript** in interpreter code and
technical documentation. The language specification is
`docs/LangWarsScriptSpec.md`; record deliberate deviations and ambiguous decisions
in `server/langwarsscript/DECISIONS.md`. Explicit user instructions take priority
over a specification that has not yet caught up.

## Layout

- `server/langwarsscript/`: bounded parser, interpreter and contract validation.
- `server/app.py`: FastAPI authentication, player and administrator endpoints.
- `server/worker.py`: sandbox processes, queue leases, publication and rechecks.
- `server/store.py`: PostgreSQL production store; SQLite supports local tests.
- `server/seed.py`: default settings and tasks. Default tasks have English and
  Russian translations; authored tasks need at least one language.
- `frontend/`: React, TypeScript, Vite, CodeMirror and TanStack Query. Production
  uses the real API; mocks are only a development/demo option.
- `deploy/`, `compose*.yaml`: Docker, reverse proxies and Portainer deployment.
- `scripts/`, `docs/Backups.md`: database backup and recovery tooling.

For substantial changes spanning independent backend, frontend or interpreter
work, use subagents with agreed file ownership. Coordinate API contracts before
implementing both ends. Do not overwrite another contributor's changes.

## Implementation

- Never use host `eval`, `exec`, imports or generated host code to execute player
  programs. Keep source/AST/value/work/output limits and the process boundary.
- Builtin escape calls are restricted to stdlib-annotated definitions. Enforce
  language restrictions statically and at runtime where inherited state matters.
- Run untrusted execution and contract probes in the killable sandbox, outside
  database transactions. Recheck authorization, fenced job leases and world
  versions under the commit lock. A stale worker must not publish.
- Rechecks are read-only: never republish a previous solution. Scores count
  distinct currently passing tasks plus explicit adjustments and charges.
- Treat notifications and other publication side effects transactionally and
  idempotently. Apply disclosure settings on the server, including old history;
  hiding names in the frontend alone is insufficient.
- Validate user input and keep private code, hidden tests, password/session hashes
  and deployment secrets out of public responses and logs.
- Keep settings backfills idempotent and preserve configured values and authored
  content. Schema migrations are not required for incompatible experimental
  changes, but never discard a running database as an incidental development step.
- Localize application controls through `frontend/src/lib/i18n.ts` and `ru.ts`.
  Do not translate identifiers, source syntax, logins or arbitrary authored text.
  Locale changes must preserve editor drafts and account state.
- Prefer short controls and examples to extra headings or explanatory UI panels.
  Respect reduced-motion preferences for effects.
- Fonts are bundled locally. Preserve the strict production script/font CSP;
  Vite must emit font files rather than inline `data:` font URLs.

## Verification

Run checks appropriate to the change. Add regression tests for real interpreter,
security, scoring, privacy and concurrency failures, rather than tests that merely
mirror implementation details.

```sh
python -m unittest discover -s server/tests -v
python -m unittest discover -s scripts/tests -v
cd frontend
npm test
npm run build
```

On Windows, use `./.venv/Scripts/python.exe` when the global Python shim is absent.
`TEST_POSTGRES_URL` enables PostgreSQL concurrency checks in a disposable schema;
the rest of the backend suite uses temporary SQLite databases. Linux containers
are the production interpreter resource boundary. Build and inspect production
assets when changing fonts, CSP or deployment configuration.

## Operations

The normal local stack is `docker compose -p langwars up --build -d --scale worker=2`.
Use only this project's containers and volumes; other Docker projects may be
running on the same host. Never print `.env` or real bootstrap credentials. Keep
the database and API private, and workers on the VPN for distributed deployments.
Do not push images, publish releases or modify a remote deployment unless asked.

Backups are opt-in through `compose.backup.yaml`; they use PostgreSQL 17 full and
incremental physical backups. Read `docs/Backups.md` before changing recovery or
retention behavior. Test recovery in an isolated database, preserving the live
volume. Report what changed, what was tested, and any material limitation.
