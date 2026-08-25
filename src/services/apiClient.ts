// apiClient.ts — thin fetch wrappers for all Assembly API routes.
// Used by dataService for all reads/writes against the live backends.
//
// All list endpoints return the canonical nebula-srv envelope shape:
//   { items: T[], total: number, page: number, pageSize: number }
// Single-item endpoints return bare objects.
// Creates return { id: string }.

const API_BASE = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function listUrl(path: string, params?: Record<string, string>, base: string = API_BASE): string {
  const url = new URL(`${base}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

// ── Paginated list helpers ──────────────────────────────────────────
interface ListEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function listAll<T>(path: string, params?: Record<string, string>, base: string = API_BASE, pageSize: number = 100): Promise<T[]> {
  // Fetch all pages up to a reasonable max
  const all: T[] = [];
  let page = 1;
  while (true) {
    const url = listUrl(path, { ...params, page: String(page), pageSize: String(pageSize) }, base);
    const env: ListEnvelope<T> = await request(url);
    all.push(...env.items);
    if (env.items.length < pageSize || all.length >= env.total) break;
    page++;
  }
  // Deduplicate by id — the backend can return overlapping rows across
  // pages (unstable ordering while rows are inserted) and rows with null
  // ids; duplicate React keys break list rendering, so collapse them here.
  const seen = new Set<string>();
  return all.filter((item: any) => {
    const key = item?.id != null ? String(item.id) : '';
    if (key === '') {
      // Keep null-id rows (they still render with a fallback key in views)
      return true;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Forums ───────────────────────────────────────────────────────────
export async function fetchForums() {
  // GET /api/forums returns flat array (not paginated envelope)
  const forums = await request<any[]>(listUrl('/forums'));
  return Array.isArray(forums) ? forums : (forums as any).items ?? [];
}

export async function createForum(data: { name: string; slug: string; description: string }) {
  return request<any>(listUrl('/forums'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reorderForums(orderedIds: string[]) {
  return request<any>(listUrl('/forums/reorder'), {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}

// ── Threads ──────────────────────────────────────────────────────────
// The threads endpoint supports both a legacy flat array and a paginated
// envelope ({ items, total, page, pageSize }) when page/pageSize params are
// present. We always paginate (listAll) so large forums like transcripts
// load in small chunks instead of one multi-hundred-MB payload; the list
// omits full bodies by default. Body policy per forum size:
//   - small forums (<= 100 threads): includeBody=true — full previews, cheap
//   - large forums (transcripts, harvest-candidates, ...): bodyWindow=20 —
//     bodies for only the 20 most-recent threads, so recent posts show
//     previews without shipping every body
// The detail view fetches any body on demand regardless.
// Body policy per forum size: small forums get full bodies (cheap previews),
// large forums get only a recent body window (recent previews, light payload).
export function threadBodyPolicy(threadCount?: number | null): { includeBody?: boolean; bodyWindow?: number } {
  if ((threadCount ?? 0) <= 100) return { includeBody: true };
  return { bodyWindow: 20 };
}

export async function fetchThreads(slug: string, bodyPolicy?: { includeBody?: boolean; bodyWindow?: number }) {
  const params: Record<string, string> = {};
  if (bodyPolicy?.includeBody) params.includeBody = 'true';
  if (bodyPolicy?.bodyWindow) params.bodyWindow = String(bodyPolicy.bodyWindow);
  return listAll<any>(`/forums/${slug}/threads`, params, API_BASE, 500);
}

export async function createThread(slug: string, data: { title: string; body: string; postedById?: string; role?: string | null; model?: string | null }) {
  return request<any>(listUrl(`/forums/${slug}/threads`), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchThread(threadId: string): Promise<{ thread: any; comments: any[] }> {
  return request(listUrl(`/forums/threads/${threadId}`));
}

// PUT /api/forums/threads/:id/status — set the colored status indicator
// (root post rating, 0..7). Any commenter may update it.
export async function setThreadStatus(threadId: string, rating: number) {
  return request<any>(listUrl(`/forums/threads/${threadId}/status`), {
    method: 'PUT',
    body: JSON.stringify({ rating }),
  });
}

export async function addComment(threadId: string, data: { body: string; postedById?: string; parentId?: string | null; role?: string | null; model?: string | null }) {
  return request<any>(listUrl(`/forums/threads/${threadId}/comments`), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// PUT /api/forums/comments/:id — edit a comment body.
export async function updateComment(commentId: string, body: string) {
  return request<any>(listUrl(`/forums/comments/${commentId}`), {
    method: 'PUT',
    body: JSON.stringify({ body }),
  });
}

// ── Decision cards (shrapnel-backed persistence) ──────────────────────
// "Agreed selection:" submissions are stored as derived artifacts in the
// shrapnel EAV object store via /api/decisions (assembly-srv). Saving is
// best-effort fire-and-forget from the UI (the reply comment remains the
// durable source of truth); GET re-hydrates the submitted state so cards
// stay frozen across reloads.

export interface DecisionSelection {
  itemIdx: number;
  label: string;
  selected: boolean;
  /** Free-text "Other" value entered for this item, when present. */
  other?: string;
}

export interface DecisionPayload {
  threadId: string;
  /** 'thread' or the comment id the decision was made on. */
  sourceId: string;
  /** 'tasks' (checkbox) | 'choices' (radio). */
  mode: string;
  blockIdx: number;
  selections: DecisionSelection[];
  /** Comment id of the posted "Agreed selection:" reply. */
  replyCommentId?: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
}

export async function saveDecision(data: DecisionPayload) {
  return request<any>(listUrl('/decisions'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchDecisions(threadId: string): Promise<DecisionPayload[]> {
  const result = await request<any[] | ListEnvelope<any>>(listUrl('/decisions', { threadId }));
  return Array.isArray(result) ? result : result.items ?? [];
}

// DELETE /api/forums/comments/:id — soft-delete (expiration-based) a comment.
export async function deleteComment(commentId: string) {
  return request<any>(listUrl(`/forums/comments/${commentId}`), { method: 'DELETE' });
}

// ── Feed ─────────────────────────────────────────────────────────────
export async function fetchFeed() {
  const result = await request<any[] | ListEnvelope<any>>(listUrl('/feed'));
  return Array.isArray(result) ? result : result.items ?? [];
}

export async function createFeedPost(data: { text: string; postedById?: string }) {
  return request<any>(listUrl('/feed'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteFeedPost(id: string) {
  return request<any>(listUrl(`/feed/${id}`), { method: 'DELETE' });
}

// ── Entity collections (generic paginated list + single-item GET) ────
const COLLECTIONS = [
  'work-requests',
  'requirements',
  'agendas',
  'candidates',
  'harvests',
  'assessments',
  'observations',
  'agent-records',
  'specifications',
  'plans',
] as const;

export type CollectionName = typeof COLLECTIONS[number];

export async function fetchCollection(name: CollectionName, opts?: { includeContent?: boolean }): Promise<any[]> {
  // Record bodies are opt-in (opts.includeContent) — the default list
  // projection omits `content` because full-content pulls over ~8k agent
  // records paginate to 80+ sequential requests (~17 MB) and made boot take
  // minutes. Views that need bodies lazy-load them via dataService.
  const params = name === 'agent-records' && opts?.includeContent ? { includeContent: 'true' } : undefined;
  return listAll(`/${name}`, params);
}

// Single paginated slice of a collection — used by dataService's lazy
// agent-record body loader, which walks pages with bounded concurrency
// instead of one long sequential chain.
export async function fetchCollectionPage(
  name: CollectionName,
  page: number,
  opts?: { includeContent?: boolean; pageSize?: number }
): Promise<{ items: any[]; total: number }> {
  const params = name === 'agent-records' && opts?.includeContent ? { includeContent: 'true' } : undefined;
  const url = listUrl(`/${name}`, {
    ...(params ?? {}),
    page: String(page),
    pageSize: String(opts?.pageSize ?? 100),
  });
  return request(url);
}

export async function fetchCollectionItem(name: CollectionName, id: string): Promise<any | null> {
  try {
    return await request(listUrl(`/${name}/${id}`));
  } catch (e: any) {
    if (e.message?.includes('404')) return null;
    throw e;
  }
}

// NOTE: there is no PATCH /harvests/:id on either backend (nebula-srv
// documents GET/POST/DELETE only; assembly-srv proxies harvests read-only).
// Harvests are append-only extraction records — the UI must not offer a
// source-text edit surface that would silently 404. (LAC audit f5dafe8f)

// ── Open Questions ──────────────────────────────────────────────────
export async function fetchOpenQuestions(params?: Record<string, string>) {
  return listAll('/open-questions', params);
}

// Resolved questions come from the backend's `resolved=true` filter (mirrors
// Angular's getResolvedQuestions). The unfiltered list returns answered rows
// with status 'OPEN' — resolving via status client-side misses them.
export async function fetchResolvedQuestions(): Promise<any[]> {
  return listAll('/open-questions', { resolved: 'true' });
}

export async function fetchOpenQuestion(id: string) {
  return request<any>(listUrl(`/open-questions/${id}`));
}

export async function createOpenQuestion(data: Record<string, unknown>) {
  return request<any>(listUrl('/open-questions'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchQuestionAnswers(questionId: string) {
  return request<{ answers: any[] }>(listUrl(`/open-questions/${questionId}/answers`));
}

export async function addQuestionAnswer(questionId: string, data: Record<string, unknown>) {
  return request<any>(listUrl(`/open-questions/${questionId}/answers`), {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchQuestionTimeline(questionId: string) {
  const result = await request<any[]>(listUrl(`/open-questions/${questionId}/timeline`));
  return Array.isArray(result) ? result : [];
}

// ── Users ────────────────────────────────────────────────────────────
export async function fetchUsers() {
  const result = await request<any[] | ListEnvelope<any>>(listUrl('/users'));
  return Array.isArray(result) ? result : result.items ?? [];
}

// ── Counts ───────────────────────────────────────────────────────────
export async function fetchCounts(): Promise<Record<string, number>> {
  return request(listUrl('/counts'));
}

// ── Search ───────────────────────────────────────────────────────────
export async function searchApi(q: string): Promise<{ results: any[]; total: number }> {
  return request(listUrl('/search', { q }));
}

// ── Health ───────────────────────────────────────────────────────────
export async function fetchHealth(): Promise<{ status: string; service?: string; mode?: string }> {
  return request(listUrl('/health'));
}

// ── Specs (nebula proxy) ───────────────────────────────────────────
export async function fetchSpecs() {
  // Specs live under /nebula, not /api. The Vite proxy rewrites
  // /nebula/* → /api/* to nebula-srv:3101.
  return listAll('/specs', undefined, '/nebula');
}

export async function fetchSpecItem(id: string) {
  return request<any>(new URL(`/nebula/specs/${id}`, window.location.origin).toString());
}

// ── Agenda items ────────────────────────────────────────────────────
export async function fetchAgendaItems(agendaId: string): Promise<any[]> {
  try {
    const result = await request<any[]>(listUrl(`/agendas/${agendaId}/items`));
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

// ── Load all data at once (for init) ────────────────────────────────
// Each fetch is wrapped individually so one 404 doesn't kill the entire load.

// Heavy collections are the ones whose row counts make a full listAll walk
// expensive server-side (agent-records ≈ 8k rows / 80+ pages, harvests ≈ 1k
// rows on a slow TOAST-heavy query): 'agent-records' and 'harvests'.
// Background polls omit them via includeHeavy:false and pull deltas
// separately (see dataService.refreshDataService).

export interface LoadAllDataOpts {
  /** Omit heavy collections from the result (default: include them). */
  includeHeavy?: boolean;
  /** Skip the per-forum thread prefetch (caller gates on thread count). */
  skipThreads?: boolean;
}

const safe = <T>(p: Promise<T>, label: string): Promise<T> =>
  p.catch(err => { console.warn(`[apiClient] ${label} failed:`, err.message); return [] as unknown as T; });

export async function loadAllData(opts: LoadAllDataOpts = {}): Promise<Record<string, any>> {
  const includeHeavy = opts.includeHeavy !== false;

  const [
    forums,
    feed,
    workRequests,
    requirements,
    agendas,
    candidates,
    harvests,
    openQuestions,
    resolvedOpenQuestions,
    assessments,
    observations,
    agentRecords,
    specifications,
    plans,
    specs,
    users,
    counts,
  ] = await Promise.all([
    safe(fetchForums(), 'forums'),
    safe(fetchFeed(), 'feed'),
    safe(fetchCollection('work-requests'), 'work-requests'),
    safe(fetchCollection('requirements'), 'requirements'),
    safe(fetchCollection('agendas'), 'agendas'),
    safe(fetchCollection('candidates'), 'candidates'),
    includeHeavy ? safe(fetchCollection('harvests'), 'harvests') : Promise.resolve(undefined),
    safe(fetchOpenQuestions(), 'open-questions'),
    safe(fetchResolvedQuestions(), 'open-questions-resolved'),
    safe(fetchCollection('assessments'), 'assessments'),
    safe(fetchCollection('observations'), 'observations'),
    includeHeavy ? safe(fetchCollection('agent-records'), 'agent-records') : Promise.resolve(undefined),
    safe(fetchCollection('specifications'), 'specifications'),
    safe(fetchCollection('plans'), 'plans'),
    safe(fetchSpecs(), 'specs'),
    safe(fetchUsers(), 'users'),
    safe(fetchCounts(), 'counts'),
  ]);

  // Pre-fetch threads for all forums so ForumDetailView doesn't show empty.
  // Small forums request full bodies (previews); large forums request only a
  // recent body window so the boot payload stays light. Skippable for fast
  // background polls where the thread count hasn't changed.
  const threadsBySlug: Record<string, any[]> = {};
  if (!opts.skipThreads && Array.isArray(forums) && forums.length > 0) {
    const threadResults = await Promise.allSettled(
      forums.map((f: any) =>
        fetchThreads(f.slug, threadBodyPolicy(f.threadCount)).then(t => ({ slug: f.slug, threads: t }))
      )
    );
    for (const r of threadResults) {
      if (r.status === 'fulfilled') {
        threadsBySlug[r.value.slug] = r.value.threads;
      }
    }
  }

  return {
    forums, feed, workRequests, requirements, agendas, candidates,
    harvests, openQuestions, resolvedOpenQuestions,
    assessments, observations, agentRecords, specifications, plans, specs,
    users, counts,
    _threadsBySlug: threadsBySlug,
  };
}

// ── Substance segment sets ─────────────────────────────────────────
// LAC rule 4: target from env (VITE_SUBSTANCE_URL), documented default :3115.
const SUBSTANCE_BASE = ((import.meta as any).env?.VITE_SUBSTANCE_URL as string | undefined) || 'http://localhost:3115';

export interface SegmentSet {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchSegmentSetsForHarvest(harvestId: string): Promise<SegmentSet[]> {
  try {
    const res = await fetch(`${SUBSTANCE_BASE}/segment-sets`);
    if (!res.ok) return [];
    const data = await res.json();
    const all: SegmentSet[] = Array.isArray(data) ? data : data.items || [];
    // Filter to segment sets whose metadata.harvest_id matches
    return all.filter((s: SegmentSet) => s.metadata?.harvest_id === harvestId);
  } catch {
    return [];
  }
}

// ── Harvest candidates (promotion gate) ─────────────────────────────
// PATCH /nebula/harvest-candidates/:id — update candidate status/metadata
// (proxied by vite to nebula-srv :3101; verified live 2026-08-25).
export async function updateHarvestCandidate(id: string, patch: Record<string, unknown>) {
  return request<any>(listUrl(`/harvest-candidates/${id}`, undefined, '/nebula'), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// Module-level index of all harvest candidates keyed by lowercase 8-char id
// prefix. Promotion-batch threads reference candidates by 8-hex prefix only,
// so resolving prefix → {uuid, status, …} needs the full collection. Cached
// for TTL seconds to avoid re-paginating (~18 × 500) on every visit.
let candIndexPromise: Promise<Record<string, any>> | null = null;
let candIndexAt = 0;
const CAND_INDEX_TTL_MS = 5 * 60 * 1000;

export function fetchCandidatesIndex(force = false): Promise<Record<string, any>> {
  const now = Date.now();
  if (!force && candIndexPromise && now - candIndexAt < CAND_INDEX_TTL_MS) return candIndexPromise;
  candIndexAt = now;
  candIndexPromise = (async () => {
    const items = await listAll<any>('/harvest-candidates', undefined, '/nebula', 500);
    const idx: Record<string, any> = {};
    for (const c of items) {
      if (typeof c?.id === 'string' && c.id.length >= 8) idx[c.id.slice(0, 8).toLowerCase()] = c;
    }
    return idx;
  })();
  return candIndexPromise;
}
