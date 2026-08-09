# Assembly (Angular)

Modern Angular reimplementation of the Assembly deliberation UI.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` (dev.js) selects the runtime:

- **`ASSEMBLY_MODE=mock`** (default) — backend-free refinement workspace:
  - Vite UI at **http://localhost:3000** by default;
  - in-memory fixture API (`server.js`) on **http://localhost:33107**, which Vite
    proxies `/api` and `/nebula` to;
  - representative data for the list/detail views; local forum posts, comments,
    open questions, forum management, and feed actions all supported;
  - requires no Nexus backend services.
- **`ASSEMBLY_MODE=live`** — work against real Nexus services:
  - Vite UI on the terrain-designated **http://localhost:4204** port;
  - Vite proxies `/api` to `assembly-srv` at `http://localhost:3107` and
    `/nebula` to `nebula-srv` at `http://localhost:3101`.

`PORT`, `MOCK_API_PORT`, `API_TARGET`, and `NEBULA_TARGET` may be overridden in
`.env` or the shell. Shell environment values take precedence over `.env`.

## Mock-fixture API (`npm start`)

`server.js` serves **only** the in-memory mock-fixture API — the static-file
serving and live-proxy branches were removed (architect decision, thread
50aa2af6, Path A ratified 2026-08-09). Vite owns dev/live mode; production
hosting serves the built bundle.

```bash
npm start            # mock API on http://localhost:33107
MOCK_API_PORT=3399 npm start   # override the port
```

The mock API is the same surface `npm run dev` uses in mock mode: `/api/*`
fixture endpoints and `/nebula/*` fixtures, backed by `mock-data.js`. It is
Architect-owned surface — changing or replacing it (e.g. MSW,
vite-plugin-mock) requires going back through a thread.
