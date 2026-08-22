# Assembly UI (React)

Modern React reimplementation of the Assembly deliberation UI. **Live-only** —
no mock mode, no fixtures; every view reads from the real Nexus backends.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` (dev.js) starts the Vite dev server:

- Vite UI at **http://localhost:4214** by default (`PORT` overrides);
- Vite proxies `/api` to `assembly-srv` at `http://localhost:3107` and
  `/nebula` to `nebula-srv` at `http://localhost:3101` (see `vite.config.ts`).

`API_TARGET` and `NEBULA_TARGET` may be overridden in `.env` or the shell.
Shell environment values take precedence over `.env`.

## Production serve

```bash
npm run build   # vite build → dist/
npm start       # vite preview — serves the built bundle
```

## Tests

```bash
npm test   # tsc --noEmit + tests/comment-persistence.mjs (live-mode regression)
```
