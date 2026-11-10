# LangWars

A shared-state programming arena. The browser calls a real API; accepted solutions publish variables and functions into a common world. Later submissions can break earlier solutions, and the worker rechecks affected submissions and recalculates scores.

The interface calls the language **LWLang**. Its implementation follows [LangWarsScript](docs/LangWarsScriptSpec.md), with explicit implementation decisions in [the interpreter notes](server/langwarsscript/DECISIONS.md).

## Run with Docker

Install Docker Engine and Docker Compose v2. Copy `.env.example` to `.env`, fill in `POSTGRES_PASSWORD` and `BOOTSTRAP_ADMIN_PASSWORD` with different long random values, then run:

```sh
docker compose up --build -d --scale worker=2
```

Open <http://localhost:8080>. Sign in using the bootstrap administrator credentials from `.env`. There are no demo accounts. The bootstrap account is only created when the database has no administrator; editing the environment is not a password reset mechanism.

PostgreSQL persists in the `postgres` Docker volume. Runs and submissions are asynchronous jobs. API restarts do not lose queued work; abandoned worker jobs can be reclaimed. A run executes the visible examples without publishing. Submit runs every test and publishes only after passing the tests and contract checks.

The admin page controls registrations, invitations, users, name quotas, submission cooldowns, allowed dictionary words, the deny-list, permitted core overrides, per-task override limits, tasks and tests, and news/events. The submission feed includes all players; source code is restricted to its author and administrators. The namespace browser shows the shared definitions that players can affect.

## Development

Use Python 3.13 and Node.js 22 or newer. From the repository root:

```sh
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r server/requirements.txt
uvicorn server.app:app --reload --port 8000
```

In another terminal with the same Python environment, run `python -m server.worker`. SQLite is used by default for development and stores data under `data/`. Set the bootstrap administrator environment variables before starting the API for the first time. Set `DATABASE_URL` to a PostgreSQL URL to use the production storage path.

In a third terminal:

```sh
cd frontend
npm ci
npm run dev
```

Vite proxies `/api` to port 8000. The real API is the default; historical mock fixtures are not production data.

```sh
python -m unittest discover -s server/tests -v
cd frontend
npm test
npm run build
```

See [deployment and operations](docs/Operations.md) for VPN workers, resource sizing, backups, and the execution boundary. Read [architecture](docs/Architecture.md) before changing publication or rejudging.

The completed checks and their limits are recorded in [verification](docs/Verification.md).
