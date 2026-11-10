# LangWars frontend

React, TypeScript, Vite, CodeMirror, and TanStack Query UI for the shared LWLang arena. The application connects to the real `/api` server by default. See the [repository README](../README.md) for the Docker deployment and administrator bootstrap.

```sh
npm ci
npm run dev
```

Vite serves the UI on port 5173 and forwards `/api` to `http://127.0.0.1:8000`. Start the API and a worker using the repository instructions. There are no built-in public accounts or default passwords.

```sh
npm run build
npm test
```

The interface supports registration and invitations, queued runs/submissions, worker diagnostics, submission inspection and diffs, rankings, the shared namespace, news/events, and administrator controls. Runs execute example tests without publishing; accepted submissions publish shared definitions. Rankings and submission lists refresh periodically to show the effects of other players' changes.

Administrators can change registration policy, quotas, submission cooldowns, dictionaries, denied terms, and permitted core overrides; create/revoke invites; manage accounts and reset passwords; edit tasks and hidden tests; publish events; restore core implementations; inspect all submissions; and view the audit trail. Core restoration runs as a worker job so contract checks do not block the API.

The server's interpreter is authoritative. Editor highlighting and completions use LWLang's actual syntax; worker diagnostics appear after Run or Submit. The original frontend's experimental parser/addon modules and MSW fixtures remain as development reference only and are not used to judge code. An explicit `VITE_USE_MOCK=true` enables those historical mock fixtures; their old syntax is incompatible with the production server. Do not enable mocks in a deployed build.

The authoritative language document is [the platform specification](../docs/LangWarsScriptSpec.md). The implementation decisions and deployment limitations are documented in the repository, replacing the original mock frontend handoff documents in this directory.
