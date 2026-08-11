/**
 * Conformance: comment/thread POSTs must include postedById.
 *
 * Regression guard for the live-mode persistence bug: dataService.addComment
 * previously fired the API call with only { body, parentId }, the server
 * rejected it with 400 ("Body and postedById are required"), and the error was
 * swallowed — so no UI-posted comment ever persisted. This test loads the REAL
 * dataService + apiClient modules (via Vite's SSR loader, live mode) with a
 * stubbed fetch, and asserts every comment/thread POST carries postedById
 * (from the stored identity, the explicit arg, or the first-user fallback).
 *
 * Run: npm test   (node tests/comment-persistence.mjs)
 * No test framework or new dependencies required.
 *
 * Scope: this guards the CLIENT payload only. The server-side contract
 * (400 when postedById is missing) is validated by assembly-srv, not here —
 * the stub returns ok:true for every POST regardless.
 */

import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Environment (must precede module load) ──────────────────────────
process.env.ASSEMBLY_MODE = 'live';
globalThis.window = { location: { origin: 'http://localhost' } };

// localStorage stub — dataService persists the identity here.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

// ── fetch stub — records POST bodies, serves canned lists ───────────
const USERS = [
  { id: 'u-admin', name: 'admin', email: 'admin@nexus.com', avatar: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u-architect', name: 'architect', email: 'architect@nexus.com', avatar: '', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u-alice', name: 'alice', email: 'alice@nexus.com', avatar: '', createdAt: '2026-01-01T00:00:00.000Z' },
];

const calls = []; // { url, method, body }

globalThis.fetch = async (url, init) => {
  const u = String(url);
  const method = init?.method || 'GET';
  let body = null;
  if (init?.body) {
    try { body = JSON.parse(init.body); } catch { body = init.body; }
  }
  calls.push({ url: u, method, body });

  const isPost = method !== 'GET';
  const json = (obj) => ({ ok: true, status: 200, statusText: 'OK', json: async () => obj, text: async () => '' });

  if (u.includes('/api/users') && !isPost) return json({ items: USERS, total: USERS.length, page: 1, pageSize: 100 });
  if (u.includes('/api/forums') && !u.includes('/threads') && !isPost) return json({ items: [] });
  if (u.includes('/api/feed') && !isPost) return json({ items: [] });
  return json({ items: [], total: 0, page: 1, pageSize: 100 });
};

// ── Runner ───────────────────────────────────────────────────────────
let fails = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ` | ${extra}` : ''));
  if (!cond) fails++;
};

const postBodies = (route) =>
  calls
    .filter((c) => c.method === 'POST' && c.url.includes(route))
    .map((c) => c.body);
const tick = () => new Promise((r) => setTimeout(r, 25));

const root = dirname(fileURLToPath(import.meta.url));
const server = await createServer({
  root: join(root, '..'),
  server: { middlewareMode: true, hmr: false, ws: false },
  logLevel: 'error',
  define: { 'import.meta.env.ASSEMBLY_MODE': '"live"' },
});

try {
  const { initDataService, dataService } = await server.ssrLoadModule('/src/services/dataService.ts');
  await initDataService();

  const users = dataService.getUsers();
  check('live users loaded from stub', users.length === 3, `count=${users.length}`);
  check('mock fallback NOT used', users[0]?.id === 'u-admin', `users[0]=${users[0]?.name}`);

  const architect = users.find((u) => u.id === 'u-architect');
  const alice = users.find((u) => u.id === 'u-alice');

  // 1. Stored identity → postedById = identity
  dataService.setCurrentUser(architect.id);
  dataService.addComment('thread-1', { body: 'hello', parentId: null });
  await tick();
  let post = postBodies('/comments').find((b) => b?.body === 'hello');
  check('comment POST to /comments includes postedById (identity)', post?.postedById === 'u-architect', JSON.stringify(post));
  check('comment POST carries body', post?.body === 'hello');
  check('comment POST carries parentId null', post?.parentId === null);
  // role/model are intentionally part of the contract (attribution); a future
  // change dropping them is a deliberate contract change, not a regression.
  check('comment POST carries role=identity name', post?.role === 'architect', `role=${post?.role}`);
  check('comment POST carries model=assembly-ui', post?.model === 'assembly-ui', `model=${post?.model}`);

  // 2. No stored identity → first-user fallback (admin)
  dataService.setCurrentUser(null);
  dataService.addComment('thread-1', { body: 'fallback post' });
  await tick();
  post = postBodies('/comments').find((b) => b?.body === 'fallback post');
  check('comment POST falls back to users[0]', post?.postedById === 'u-admin', JSON.stringify(post));

  // 3. Explicit postedById arg wins over stored identity
  dataService.setCurrentUser(architect.id);
  dataService.addComment('thread-1', { body: 'explicit arg', postedById: alice.id });
  await tick();
  post = postBodies('/comments').find((b) => b?.body === 'explicit arg');
  check('explicit postedById arg wins', post?.postedById === 'u-alice', JSON.stringify(post));

  // 4. Same regression class: thread POSTs include postedById
  dataService.createThread('change-log', { title: 'T', body: 'thread post' });
  await tick();
  post = postBodies('/threads').find((b) => b?.title === 'T');
  check('thread POST to /threads includes postedById (identity)', post?.postedById === 'u-architect', JSON.stringify(post));
  check('thread POST carries role', post?.role === 'architect');
  check('thread POST carries model', post?.model === 'assembly-ui');

  console.log(fails === 0 ? '\nALL PASS — comment/thread POSTs always carry postedById' : `\n${fails} FAILURES — persistence regression present`);
  await server.close();
  process.exit(fails === 0 ? 0 : 1);
} catch (err) {
  console.error('TEST ERROR:', err);
  process.exit(2);
}
