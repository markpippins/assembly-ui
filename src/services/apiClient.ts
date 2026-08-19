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

async function listAll<T>(path: string, params?: Record<string, string>, base: string = API_BASE): Promise<T[]> {
  // Fetch all pages up to a reasonable max
  const all: T[] = [];
  let page = 1;
  const pageSize = 100;
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
export async function fetchThreads(slug: string) {
  const result = await request<any[] | ListEnvelope<any>>(listUrl(`/forums/${slug}/threads`));
  return Array.isArray(result) ? result : result.items ?? [];
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

export async function addComment(threadId: string, data: { body: string; postedById?: string; parentId?: string | null; role?: string | null; model?: string | null }) {
  return request<any>(listUrl(`/forums/threads/${threadId}/comments`), {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

export async function fetchCollection(name: CollectionName): Promise<any[]> {
  // The agent-records list projection omits `content` by default (payload
  // size); the Agent Records / Reports views render record bodies in the
  // list, so opt in. (nebula-srv GET /api/agent-records?includeContent=true)
  const params = name === 'agent-records' ? { includeContent: 'true' } : undefined;
  return listAll(`/${name}`, params);
}

export async function fetchCollectionItem(name: CollectionName, id: string): Promise<any | null> {
  try {
    return await request(listUrl(`/${name}/${id}`));
  } catch (e: any) {
    if (e.message?.includes('404')) return null;
    throw e;
  }
}

// ── Harvests (has PATCH) ────────────────────────────────────────────
export async function updateHarvest(id: string, data: { sourceText: string }) {
  return request<any>(listUrl(`/harvests/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

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

// ── Conversations (nebula) ───────────────────────────────────────────
// Conversation snapshots/blocks are nebula-schema tables owned by nebula-srv.
// Reads go straight to nebula-srv through the /nebula proxy (which rewrites
// /nebula → /api on :3101), mirroring the Angular data.service migration —
// see Assembly Issues thread 81eadf40 for the boundary decision.

export async function fetchConversations(): Promise<any[]> {
  return listAll('/conversations', undefined, '/nebula');
}

export async function fetchConversation(id: string): Promise<any | null> {
  try {
    return await request(
      new URL(`/nebula/conversations/by-snapshot/${id}`, window.location.origin).toString()
    );
  } catch (e: any) {
    if (e.message?.includes('404')) return null;
    throw e;
  }
}

export async function fetchConversationBlocks(snapshotId: string): Promise<any[]> {
  try {
    const result = await request<{ blocks: any[] }>(
      new URL(`/nebula/conversations/by-snapshot/${snapshotId}/blocks`, window.location.origin).toString()
    );
    return result.blocks ?? [];
  } catch {
    return [];
  }
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
const safe = <T>(p: Promise<T>, label: string): Promise<T> =>
  p.catch(err => { console.warn(`[apiClient] ${label} failed:`, err.message); return [] as unknown as T; });

export async function loadAllData(): Promise<Record<string, any>> {
  const [
    forums,
    feed,
    workRequests,
    requirements,
    agendas,
    candidates,
    harvests,
    conversations,
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
    safe(fetchCollection('harvests'), 'harvests'),
    safe(fetchConversations(), 'conversations'),
    safe(fetchOpenQuestions(), 'open-questions'),
    safe(fetchResolvedQuestions(), 'open-questions-resolved'),
    safe(fetchCollection('assessments'), 'assessments'),
    safe(fetchCollection('observations'), 'observations'),
    safe(fetchCollection('agent-records'), 'agent-records'),
    safe(fetchCollection('specifications'), 'specifications'),
    safe(fetchCollection('plans'), 'plans'),
    safe(fetchSpecs(), 'specs'),
    safe(fetchUsers(), 'users'),
    safe(fetchCounts(), 'counts'),
  ]);

  // Pre-fetch threads for all forums so ForumDetailView doesn't show empty.
  const threadsBySlug: Record<string, any[]> = {};
  if (Array.isArray(forums) && forums.length > 0) {
    const threadResults = await Promise.allSettled(
      forums.map((f: any) =>
        fetchThreads(f.slug).then(t => ({ slug: f.slug, threads: t }))
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
    harvests, conversations, openQuestions, resolvedOpenQuestions,
    assessments, observations, agentRecords, specifications, plans, specs,
    users, counts,
    _threadsBySlug: threadsBySlug,
  };
}
