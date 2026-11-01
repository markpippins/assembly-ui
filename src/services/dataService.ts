import {
  User, Forum, Thread, Comment, FeedPost, WorkRequest, Requirement, Agenda, Candidate,
  Harvest, OpenQuestion, OpenQuestionAnswer,
  TimelineEvent, Assessment, Observation, AgentRecord, Specification,
  Plan, SpecItem, Counts, SearchResult, statusMeta
} from '../types';
import * as api from './apiClient';

// ── Live data cache (populated by initDataService) ───────────────────
// assembly-ui is live-only: all reads go through this in-memory cache,
// which initDataService() pre-loads from the real backends (assembly-srv
// via /api, nebula-srv via /nebula) before first render. Collections that
// are expensive to pre-load (threads per forum, harvest details, question
// answers) are lazy-loaded on demand into per-key caches and re-read
// shortly after by the views.
let liveCache: Record<string, any> | null = null;

// ── Change notification ─────────────────────────────────────────────
// Subscribers (LiveDataContext) re-render the app whenever the shared
// liveCache is (re)populated or background-refreshed.
type ChangeListener = () => void;
const changeListeners = new Set<ChangeListener>();

export function onDataChanged(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => { changeListeners.delete(listener); };
}

function emitChange(): void {
  for (const listener of changeListeners) {
    try { listener(); } catch { /* never let one subscriber break others */ }
  }
}

// ── Lazy-cache access tracking ──────────────────────────────────────
// Per-key lazy caches (_threadDetail_*, _comments_*, _answers_*,
// _harvestDetail_*) are refreshed in the background only while they were
// accessed recently — entries the user hasn't touched in a while keep
// serving their cached value and self-heal on revisit (the getters always
// kick off an async refetch).
const LAZY_REFRESH_WINDOW_MS = 10 * 60 * 1000;
const cacheAccess = new Map<string, number>();

function touchCache(key: string): void {
  cacheAccess.set(key, Date.now());
}

function recentLazyIds(prefix: string): string[] {
  if (!liveCache) return [];
  const cutoff = Date.now() - LAZY_REFRESH_WINDOW_MS;
  const ids: string[] = [];
  for (const [key, ts] of cacheAccess) {
    if (!key.startsWith(prefix)) continue;
    if (ts < cutoff || !(liveCache as any)[key]) {
      cacheAccess.delete(key);
      continue;
    }
    ids.push(key.slice(prefix.length));
  }
  return ids;
}

export async function initDataService(): Promise<void> {
  try {
    const data = await api.loadAllData();
    liveCache = data;
    // Seed the per-collection total tracker from boot counts so the first
    // background poll can skip unchanged heavy collections immediately.
    if (data.counts) (liveCache as any)._totals = { ...data.counts };
    // Background-fill the remaining candidate pages (boot payload is page
    // 1 only — see apiClient.loadAllData); emits once the full list lands.
    ensureCandidatesFull();
    // Background-fill the full agent-records list WITH bodies (boot payload
    // is page 1 only, no content — see apiClient.loadAllData). Single-flight
    // + 60s cooldown inside; a dev double-mount boot is inert.
    ensureAgentRecordContent();
    // Pre-populate per-forum thread caches so ForumDetailView renders
    // threads immediately without lazy-load delay.
    const bySlug = (data as any)._threadsBySlug;
    if (bySlug) {
      for (const [slug, threads] of Object.entries(bySlug)) {
        // A second boot init (dev double-mount) can land a fresh page-1 while
        // a previous fill already walked deeper pages — union instead of
        // replacing so the filled rows aren't dropped.
        const existing = (liveCache as any)['_threads_' + slug];
        const filledThrough = threadsFillTotals[slug];
        if (
          Array.isArray(existing) && filledThrough != null &&
          (threads as any[]).length < filledThrough
        ) {
          (liveCache as any)['_threads_' + slug] = unionById(existing, threads as any[]);
        } else {
          (liveCache as any)['_threads_' + slug] = threads;
        }
      }
      // Envelope totals from the page-1 fetches; the fill uses them to
      // decide which forums need more pages. Seed the filled-up-to tracker
      // too: forums whose page 1 already covers the whole list are done.
      const totals = (data as any)._threadsTotals;
      if (totals) (liveCache as any)._threadsTotal = { ...totals };
      const bySlug2 = (liveCache as any)._threadsTotal;
      if (bySlug2) {
        for (const [slug, total] of Object.entries(bySlug2)) {
          threadsFillTotals[slug] =
            typeof total === 'number' && total <= THREADS_PAGE_SIZE ? (total as number) : null;
        }
      }
    }
    // Background-fill the remaining per-forum thread pages (boot payload is
    // page 1 only); emits when a forum's full list lands.
    ensureThreadsFull();
    console.log('[dataService] Live data loaded at t=' + Math.round(performance.now()) + 'ms:', {
      forums: data.forums?.length,
      threads: 'loaded on demand',
      feed: data.feed?.length,
      workRequests: data.workRequests?.length,
      requirements: data.requirements?.length,
    });
    emitChange();
  } catch (err) {
    // No mock fallback — surface the failure and let views render empty
    // states. The health banner shows the backend as unreachable.
    console.error('[dataService] Failed to load live data:', err);
    liveCache = {};
  }
}

// ── Background refresh ──────────────────────────────────────────────
// Re-pulls live data from the backends and merges it into liveCache IN
// PLACE, then notifies subscribers so mounted views re-read the cache.
// Design notes:
// - INCREMENTAL: a ~25ms /counts probe gates the expensive work. The heavy
//   collections (agent-records ≈ 8k rows / 80+ pages, harvests ≈ 1k rows on
//   a slow server-side query) are only re-pulled when their row count
//   changed — and then usually just page 1 (newest rows), union-merged into
//   the cache. A full resync (everything + per-forum threads) runs every
//   FULL_RESYNC_EVERY cycles to catch deletions and mid-list inserts.
// - Core collections are replaced with fresh rows; optimistic local-only
//   entries (client-created rows whose server ack hasn't landed in a poll
//   yet) are preserved on top so user posts never blink away.
// - Recently accessed lazy caches (open thread detail + comments, question
//   answers, harvest details) are re-fetched BEFORE the notification fires,
//   so the view the user is looking at swaps straight to fresh data with no
//   empty flicker window.

// Full resync cadence: at 15s base interval this is ~5 minutes.
const FULL_RESYNC_EVERY = 20;
// counts-endpoint key → collection name for the heavy collections.
const HEAVY_COUNT_KEYS: Record<string, string> = {
  candidates: 'candidates',
  agentRecords: 'agent-records',
  harvests: 'harvests',
};
// Page-1 delta pulls are trusted only for small count deltas (unstable
// server ordering can overlap pages; a margin below the 100-row page size
// keeps the "all new rows are on page 1" assumption safe).
const DELTA_MAX_ROWS = 90;

let refreshCycle = 0;

export async function refreshDataService(): Promise<boolean> {
  if (!liveCache) {
    await initDataService();
    return true;
  }
  try {
    const cache = liveCache;
    const fullResync = refreshCycle++ % FULL_RESYNC_EVERY === 0;

    // 1. Refresh recently-viewed lazy detail caches first.
    const lazyTasks: Promise<void>[] = [];
    for (const id of recentLazyIds('_threadDetail_')) {
      touchCache('_threadDetail_' + id);
      lazyTasks.push(
        api.fetchThread(id).then(({ thread, comments }) => {
          if (!liveCache) return;
          (liveCache as any)['_threadDetail_' + id] = thread;
          (liveCache as any)['_comments_' + id] = comments || [];
        }).catch(() => {})
      );
    }
    for (const qid of recentLazyIds('_answers_')) {
      touchCache('_answers_' + qid);
      lazyTasks.push(
        api.fetchQuestionAnswers(qid).then(({ answers }) => {
          if (!liveCache) return;
          (liveCache as any)['_answers_' + qid] = answers || [];
        }).catch(() => {})
      );
    }
    for (const hid of recentLazyIds('_harvestDetail_')) {
      touchCache('_harvestDetail_' + hid);
      lazyTasks.push(
        api.fetchCollectionItem('harvests', hid).then((raw) => {
          if (!liveCache || !raw) return;
          (liveCache as any)['_harvestDetail_' + hid] = mapHarvestDetail(raw);
        }).catch(() => {})
      );
    }
    await Promise.all(lazyTasks);

    // 2. Counts probe decides what needs pulling. If it fails, fall back to
    // a full resync — correctness over speed when we can't see row counts.
    let counts: Record<string, number> | null = null;
    try { counts = await api.fetchCounts(); } catch { /* fall through */ }

    // Per-forum thread prefetch is skipped while the global thread count is
    // unchanged; new/edited comments in already-open threads are still kept
    // fresh by the lazy-detail pass above, and the periodic full resync
    // refreshes forum previews regardless.
    const storedTotals = ((cache as any)._totals ??= {}) as Record<string, number>;
    const skipThreads =
      !fullResync && !!counts && counts.threads === storedTotals['threads'];

    // Heavy collections: pull only what changed. Delta mode fetches just the
    // newest rows (page 1); full mode walks all pages via loadAllData.
    const deltaJobs: Array<{ key: string; collection: string }> = [];
    if (counts && !fullResync) {
      for (const [countKey, collection] of Object.entries(HEAVY_COUNT_KEYS)) {
        const total = counts[countKey];
        const stored = storedTotals[countKey];
        const delta = total != null && stored != null ? total - stored : null;
        if (
          total != null && stored != null &&
          total > 150 && delta !== null && delta > 0 && delta <= DELTA_MAX_ROWS
        ) {
          deltaJobs.push({ key: countKey, collection });
        }
      }
    }

    const [data, ...deltaPages] = await Promise.all([
      // No counts visibility → play safe and do a full pull this cycle.
      api.loadAllData({ includeHeavy: fullResync || !counts, skipThreads }),
      ...deltaJobs.map((j) =>
        api.fetchCollectionPage(j.collection as any, 1, { pageSize: 100 })
          .catch(() => ({ items: [], total: 0 }))
      ),
    ]);
    // A failed or oversized delta falls back to a full walk next cycle by
    // leaving storedTotals untouched for that key.

    // 3. Merge fetched data into the cache in place.
    let changed = false;

    // 3a. Delta merges first — prepend the newest rows to the cached list.
    deltaJobs.forEach((j, i) => {
      const page = deltaPages[i];
      const key = j.key;
      if (!page || page.items.length === 0) return;
      const existing = Array.isArray(cache[key]) ? cache[key] : [];
      cache[key] = mergeNewer(existing, page.items);
      changed = true;
    });

    // 3b. Core collections replaced with fresh rows (only keys actually
    // present in the payload — fast polls omit the heavy ones).
    const CORE_LIST_KEYS = [
      'forums', 'feed', 'workRequests', 'requirements', 'agendas',
      'candidates', 'harvests', 'openQuestions', 'resolvedOpenQuestions',
      'assessments', 'observations', 'agentRecords', 'specifications',
      'plans', 'specs', 'users',
    ] as const;
    for (const key of CORE_LIST_KEYS) {
      if (!Array.isArray((data as any)[key])) continue;
      // Skip a key we just delta-merged above (its full list wasn't pulled).
      if (deltaJobs.some((j) => j.key === key)) continue;
      // Candidates is handled by the delta path + ensureCandidatesFull():
      // loadAllData payloads carry only page 1 (~100 rows) and merging them
      // here would replace the full cached list (~11.7k rows) with that page.
      if (key === 'candidates') continue;
      // Agent-records is the same deal (page-1-only boot payload): union
      // the fresh page 1 on top instead of replacing, so the background
      // fill's deeper rows aren't dropped each resync.
      if (key === 'agentRecords') {
        if (Array.isArray(cache.agentRecords) && Array.isArray((data as any).agentRecords)) {
          cache.agentRecords = unionById(cache.agentRecords, (data as any).agentRecords);
          changed = true;
        }
        continue;
      }
      cache[key] = mergeList(cache[key], (data as any)[key]);
      changed = true;
    }
    if (counts) cache.counts = counts;
    else if (data.counts) cache.counts = data.counts;
    // Re-apply lazily-loaded record bodies so the poll cycle never blanks
    // out content that views already displayed.
    applyAgentRecordContent();

    // 3c. Per-forum thread lists ship pre-fetched with loadAllData (when not
    // skipped). Page 1 only now — the background fill (kick below) walks the
    // rest, same deal as the candidates core-merge above.
    const bySlug = (data as any)._threadsBySlug;
    if (bySlug && Object.keys(bySlug).length > 0) {
      const totalsPayload = (data as any)._threadsTotals ?? {} as Record<string, number | null>;
      for (const [slug, threads] of Object.entries(bySlug)) {
        const key = '_threads_' + slug;
        const existing = cache[key];
        const incoming = threads as any[];
        // A forum whose fill completed (or is walking) holds more rows than a
        // poll's page-1 payload — union so the deeper rows survive; otherwise
        // plain merge (full replace heals deletions on non-filled forums).
        const filledThrough = threadsFillTotals[slug];
        cache[key] =
          Array.isArray(existing) && filledThrough != null && incoming.length < filledThrough
            ? unionById(existing, incoming)
            : mergeList(existing, incoming);
        // Re-open the fill only when the forum's total moved since the last
        // completed fill — not on every poll: completed forums stay closed,
        // and cooldown still paces the occasional re-walk.
        const totalNow = totalsPayload[slug];
        if (
          typeof totalNow === 'number' && totalNow > THREADS_PAGE_SIZE &&
          threadsFillTotals[slug] !== totalNow
        ) {
          threadsFillTotals[slug] = null;
        }
      }
      (cache as any)._threadsTotal = { ...((cache as any)._threadsTotal ?? {}), ...totalsPayload };
      changed = true;
    }
    // Heal page-1-only thread caches that a fill hasn't walked yet
    // (boot kicked one, but a drift poll replaced the page-1 rows before it
    // finished, or a previous kick was cooldown-suppressed). The fill's own
    // 60s cooldown keeps this from re-walking every cycle.
    ensureThreadsFull();

    // 4. Persist the totals snapshot so future polls can gate on it.
    if (counts) {
      for (const k of Object.keys(counts)) storedTotals[k] = counts[k];
    }

    // Candidates drift beyond the delta path's small margin (delete storms,
    // big harvest batches) is healed by the background full fill; the fill's
    // own 60s cooldown keeps this from re-walking on every cycle.
    if (
      counts?.candidates != null && candidatesFullTotal !== null &&
      Math.abs(counts.candidates - candidatesFullTotal) > DELTA_MAX_ROWS
    ) {
      ensureCandidatesFull();
    }
    // Agent-records: re-open the full list+content fill while the cache
    // isn't known-complete for the server's total (inserts push new rows
    // onto page 1; incomplete walks and deletions converge on these).
    if (
      counts?.agentRecords != null &&
      counts.agentRecords !== agentFillTotal
    ) {
      ensureAgentRecordContent();
    }

    if (changed) emitChange();
    return true;
  } catch (err) {
    console.warn('[dataService] Background refresh failed:', err);
    return false;
  }
}

// Optimistic client-side ids look like `<kind>-<epoch ms>`; server ids are
// UUIDs. Local-only entries are kept across merges until their server
// counterpart appears (matched by id once create-acks reconcile them).
function isLocalOnlyId(id: unknown): boolean {
  return typeof id === 'string' && /^[a-z]+-\d{10,}$/.test(id);
}

// Union with id dedupe: fresh rows lead (newest-first server order), then
// any still-touched rows that the fresh pages didn't include (deeper pages
// from a previous background fill, optimistic local rows). Stale server rows
// drop out on the next complete walk; deleted ones heal via drift resync.
function unionById(existing: any[], fresh: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  const push = (row: any) => {
    if (row?.id == null) { out.push(row); return; }
    const key = String(row.id);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };
  for (const row of fresh) push(row);
  for (const row of existing) push(row);
  return out;
}

function mergeList(existing: any[] | undefined, fresh: any[]): any[] {
  if (!existing || existing.length === 0) return fresh;
  const freshIds = new Set(fresh.map((f) => String(f?.id)));
  const localOnly = existing.filter(
    (e) => isLocalOnlyId(e?.id) && !freshIds.has(String(e.id))
  );
  return localOnly.length > 0 ? [...localOnly, ...fresh] : fresh;
}

// Union-merge for incremental (page-1 delta) pulls: the fetched rows are the
// newest ones, so they go on top; already-cached rows that weren't re-fetched
// keep their positions below. Optimistic local-only entries stay on the very
// top, same as mergeList.
function mergeNewer(existing: any[], fresh: any[]): any[] {
  const freshIds = new Set(
    fresh.filter((f) => f?.id != null).map((f) => String(f.id))
  );
  const notInFresh = (e: any) =>
    e?.id == null || !freshIds.has(String(e.id));
  const localOnly = existing.filter(
    (e) => isLocalOnlyId(e?.id) && notInFresh(e)
  );
  const rest = existing.filter(
    (e) => !isLocalOnlyId(e?.id) && notInFresh(e)
  );
  return [...localOnly, ...fresh, ...rest];
}

// ── Helpers ─────────────────────────────────────────────────────────
function liveList(key: string): any[] {
  return liveCache?.[key] ?? [];
}

function liveItem(key: string, id: string): any | undefined {
  return liveList(key).find((item: any) => item.id === id);
}

// ── Harvest detail mapping ───────────────────────────────────────────
// The harvest detail endpoint returns the raw snake_case row from the
// nebula.harvests view (source_text, docklang, total_candidates, ...).
// Map it onto the camelCase Harvest shape used across the UI.
function mapHarvestDetail(raw: Record<string, any>): Harvest {
  return {
    id: raw.id,
    sourcePath: raw.source_path ?? null,
    sourceFilename: raw.source_filename ?? null,
    model: raw.model ?? null,
    totalCandidates: raw.total_candidates ?? null,
    candidates: raw.candidates ?? null,
    sourceText: raw.source_text ?? null,
    tags: raw.tags ?? null,
    metadata: raw.metadata ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    level: raw.level ?? null,
    visibilityScope: raw.visibility_scope ?? null,
    docklang: raw.docklang ?? null,
    sourceHash: raw.source_hash ?? null,
    fileSize: raw.file_size ?? null,
    version: raw.version ?? null,
    runMetadata: raw.run_metadata ?? null,
  };
}

// ── Identity (who posts) ─────────────────────────────────────────────
// The user's posting identity is persisted per-browser in localStorage.
// Until one is chosen, comments/threads fall back to the first user.

const IDENTITY_KEY = 'assembly.currentUserId';

function getStoredUserId(): string | null {
  try { return localStorage.getItem(IDENTITY_KEY); } catch { return null; }
}

function setStoredUserId(id: string | null): void {
  try {
    if (id) localStorage.setItem(IDENTITY_KEY, id);
    else localStorage.removeItem(IDENTITY_KEY);
  } catch { /* ignore */ }
}

function resolveUser(postedById: string | undefined, users: User[]): User {
  const fallback: User = { id: 'anon', name: 'Anonymous', avatar: '?', email: '', createdAt: new Date().toISOString() };
  if (!users || users.length === 0) return fallback;
  if (postedById) {
    const byArg = users.find((u: User) => u.id === postedById);
    if (byArg) return byArg;
  }
  const stored = getStoredUserId();
  if (stored) {
    const byStored = users.find((u: User) => u.id === stored);
    if (byStored) return byStored;
  }
  return users[0];
}

// ── Agent-record content (lazy) ─────────────────────────────────────
// Record bodies are NOT part of the boot preload anymore (~8k records ×
// full content paginated to 80+ sequential requests and blocked first
// paint for minutes). Instead:
//  - The list views call getAgentRecords(); on first access we kick off a
//    ONE-TIME background full-content fetch, store bodies in a per-id map,
//    and emitChange() so mounted views re-read with bodies filled in.
//  - Detail views call getAgentRecord(id); if the cached row has no body
//    we fetch just that record's detail endpoint in the background.
// refreshDataService() re-applies the stored bodies after every core-list
// merge so a background poll never blanks out loaded content.

const AGENT_CONTENT_RETRY_MS = 60 * 1000;
let agentContentLastAttempt = 0;
let agentContentInFlight = false;
// Total the cache is known-complete through (set by the full fill; null =
// cache is page-1-only or the walk never ran).
let agentFillTotal: number | null = null;
const agentDetailAttempted = new Set<string>();

function agentContentMap(): Record<string, string> {
  if (!liveCache) return {};
  if (!(liveCache as any)._agentRecordContent) {
    (liveCache as any)._agentRecordContent = {} as Record<string, string>;
  }
  return (liveCache as any)._agentRecordContent;
}

/** Fill cached rows' missing bodies from the stored per-id content map. */
function applyAgentRecordContent(): void {
  const map = (liveCache as any)?._agentRecordContent as Record<string, string> | undefined;
  if (!map || !Array.isArray(liveCache?.agentRecords)) return;
  for (const rec of liveCache!.agentRecords as AgentRecord[]) {
    if (rec && rec.content == null && map[rec.id] != null) {
      rec.content = map[rec.id];
    }
  }
}

/** One-time background fetch of all agent-record bodies (60s retry cooldown).
 *  Walks pages with bounded concurrency — a sequential chain of ~82 pages
 *  took minutes on a loaded machine.
 *
 *  Since the boot payload became page-1-only (list without bodies), this
 *  walk also owns the full LIST: page 1 is re-fetched fresh with content so
 *  interleaved boot writes can't shift the basis, the completed list wholly
 *  replaces the cache (deletions heal), and agentFillTotal lets the refresh
 *  cycle re-open the walk when the server-side total moves. */
function ensureAgentRecordContent(): void {
  if (!liveCache || agentContentInFlight) return;
  if (Date.now() - agentContentLastAttempt < AGENT_CONTENT_RETRY_MS) return;
  agentContentInFlight = true;
  agentContentLastAttempt = Date.now();
  const PAGE_SIZE = 100;
  const CONCURRENCY = 6;

  api.fetchCollectionPage('agent-records', 1, { includeContent: true, pageSize: PAGE_SIZE })
    .then(async (first) => {
      const started = performance.now();
      // Sparse array indexed by row position keeps list ordering; holes are
      // avoided below so a failed page costs its rows, not the whole load.
      const slots: any[] = [];
      const place = (page: number, items: any[]) => {
        for (let i = 0; i < items.length; i++) slots[(page - 1) * PAGE_SIZE + i] = items[i];
      };
      place(1, first.items);
      const totalPages = Math.ceil(first.total / PAGE_SIZE);
      let next = 2;
      const flaked = new Set<number>();
      const worker = async (): Promise<void> => {
        while (next <= totalPages) {
          const page = next++;
          try {
            place(page, (await api.fetchCollectionPage('agent-records', page, { includeContent: true, pageSize: PAGE_SIZE })).items);
          } catch { flaked.add(page); /* heal below */ }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, Math.max(0, totalPages - 1)) }, worker)
      );
      // One retry round for pages that flaked mid-walk — the backend has
      // transient bursts under concurrent fills which vanish on retry.
      if (flaked.size > 0) {
        const retrySlots = [...flaked].map((p) => ({ p, ok: false }));
        const rNext = { index: 0 };
        const retryWorker = async (): Promise<void> => {
          while (rNext.index < retrySlots.length) {
            const slot = retrySlots[rNext.index++];
            try {
              place(slot.p, (await api.fetchCollectionPage('agent-records', slot.p, { includeContent: true, pageSize: PAGE_SIZE })).items);
              slot.ok = true;
            } catch { /* still missing — leave the cache as-is */ }
          }
        };
        await Promise.all(Array.from({ length: Math.min(3, retrySlots.length) }, retryWorker));
        for (const slot of retrySlots) {
          if (slot.ok) flaked.delete(slot.p); else flaked.add(slot.p);
        }
      }
      if (!liveCache) return;
      const complete = flaked.size === 0;
      const full = slots.filter(Boolean);
      const map = agentContentMap();
      for (const rec of full as AgentRecord[]) {
        if (rec?.id != null && rec.content != null) map[rec.id] = rec.content;
      }
      if (complete) {
        // Wholly replace so deleted server rows heal.
        liveCache.agentRecords = full;
        applyAgentRecordContent();
        console.log(
          '[dataService] agent-records fill done: rows=' + full.length +
          ' fillMs=' + Math.round(performance.now() - started) +
          ' atT=' + Math.round(started) + 'ms'
        );
      } else {
        // Incomplete walk: don't swap (it would arm-vent rows we already
        // have). Leave agentFillTotal unset — the refresh cycle re-kicks
        // after the cooldown and the walk converges.
        agentFillTotal = null;
        console.warn(
          '[dataService] agent-records fill incomplete: ' + flaked.size +
          ' of ' + totalPages + ' page(s) missed; re-walk scheduled'
        );
      }
      emitChange();
    })
    .catch((err) => {
      agentFillTotal = null;
      console.warn('[dataService] agent-record content load failed:', err);
    })
    .finally(() => { agentContentInFlight = false; });
}

// ── Harvest-candidate full-list fill (background) ───────────────────
// The boot payload carries only page 1 of harvest candidates (≈11.7k rows
// in prod — a full walk of 117 sequential ≈140ms pages blocked first render
// ~16s). This mirrors the agent-record content flow: bounded-concurrency
// page walk that swaps the full list into the cache and emits so mounted
// views re-read. Single-flight with a cooldown; re-kicked by
// refreshDataService when the row count drifts beyond the delta margin.

const CANDIDATES_Fill_COOLDOWN_MS = 60 * 1000;
let candidatesFillInFlight = false;
let candidatesFillLastAttempt = 0;
let candidatesFullTotal: number | null = null;

function ensureCandidatesFull(): void {
    if (!liveCache || candidatesFillInFlight) return;
  if (
    candidatesFullTotal !== null &&
    Date.now() - candidatesFillLastAttempt < CANDIDATES_Fill_COOLDOWN_MS
  ) return;
  candidatesFillInFlight = true;
  candidatesFillLastAttempt = Date.now();
  const PAGE_SIZE = 100;
  const CONCURRENCY = 6;

  const fillStarted = performance.now();
  api.fetchCollectionPage('candidates', 1, { pageSize: PAGE_SIZE })
    .then(async (first) => {
      // Sparse slots indexed by row position preserve list ordering; holes
      // are dropped below so a failed page costs its rows, not the whole
      // load (same pattern as the agent-record content walk).
      const slots: any[] = [];
      const place = (page: number, items: any[]) => {
        for (let i = 0; i < items.length; i++) slots[(page - 1) * PAGE_SIZE + i] = items[i];
      };
      place(1, first.items);
      const totalPages = Math.max(Math.ceil(first.total / PAGE_SIZE), 1);
      let next = 2;
      const worker = async (): Promise<void> => {
        while (next <= totalPages) {
          const page = next++;
          try {
            place(page, (await api.fetchCollectionPage('candidates', page, { pageSize: PAGE_SIZE })).items);
          } catch { /* skip failed page */ }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, Math.max(0, totalPages - 1)) }, worker)
      );
      if (!liveCache) return;
      // Deduplicate by id — unstable server ordering can overlap rows
      // across pages (same reason listAll dedupes in apiClient).
      const seen = new Set<string>();
      const full = slots.filter(Boolean).filter((c: any) => {
        if (c?.id == null) return true; // null-id rows still render
        const key = String(c.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      candidatesFullTotal = first.total;
      const existing = (liveCache.candidates ?? []) as Candidate[];
      // Keep optimistic client-only rows until their server ack lands.
      const localOnly = existing.filter(
        (e) => isLocalOnlyId(e?.id) && !seen.has(String(e.id))
      );
      liveCache.candidates = localOnly.length > 0 ? [...localOnly, ...full] : full;
      const totals = ((liveCache as any)._totals ??= {}) as Record<string, number>;
      totals.candidates = first.total;
      emitChange();
      console.log(
        '[dataService] candidates fill done: rows=' + full.length +
        ' pages=' + totalPages +
        ' fillMs=' + Math.round(performance.now() - fillStarted) +
        ' atT=' + Math.round(fillStarted) + 'ms'
      );
    })
    .catch((err) => {
      console.warn('[dataService] harvest-candidate full load failed:', err);
    })
    .finally(() => { candidatesFillInFlight = false; });
}

// ── Per-forum full-list thread fill (background) ────────────────────
// Same shape as the candidates fill: this walk re-fetches page 1 FRESH per
// open forum (so deleted rows heal and interleaved boot writes can't shift
// the basis) plus pages 2..N with bounded concurrency, then swaps the
// complete list into the per-forum cache. Failed pages cost their own rows;
// the next kick (cooldown-gated) heals. Deep pages use bodyWindow=20 —
// bodies are fetched on demand by the detail view.
const THREADS_PAGE_SIZE = 500;
const THREADS_FILL_CONCURRENCY = 4;
const THREADS_FILL_COOLDOWN_MS = 60 * 1000;
let threadsFillInFlight = false;
let threadsFillLastAttempt = 0;
// slug → total the cache is known-complete through; null = page 1 only.
const threadsFillTotals: Record<string, number | null> = {};

function ensureThreadsFull(): void {
  if (!liveCache || threadsFillInFlight) return;
  if (Date.now() - threadsFillLastAttempt < THREADS_FILL_COOLDOWN_MS) return;
  const forumList = (liveCache.forums ?? []) as Array<{ slug: string }>;
  const totals = ((liveCache as any)._threadsTotal ?? {}) as Record<string, number | null>;
  // Only walk forums whose cache is confirmed page-1-only. After a complete
  // fill, threadsFillTotals[slug] tracks "filled through" so every poll
  // doesn't re-trigger a full re-walk.
  const open = forumList.filter(
    (f) => typeof totals[f.slug] === 'number' &&
      (totals[f.slug] as number) > THREADS_PAGE_SIZE &&
      threadsFillTotals[f.slug] === null
  );
  if (open.length === 0) return;
  threadsFillInFlight = true;
  threadsFillLastAttempt = Date.now();
  const fillStarted = performance.now();

  // slug → sparse flat array of fetched rows (index = zero-based global
  // row position across that forum's pages; holes are failed pages).
  const slots: Record<string, (any | undefined)[]> = {};
  for (const f of open) slots[f.slug] = [];
  const tasks: Array<{ slug: string; page: number }> = [];
  for (const f of open) {
    const totalPages = Math.ceil((totals[f.slug] as number) / THREADS_PAGE_SIZE);
    for (let page = 1; page <= totalPages; page++) tasks.push({ slug: f.slug, page });
  }
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const job = tasks[next++];
      try {
        // Recent-window preview policy only: boot renders previews from its
        // own page-1 seed; the detail view fetches older bodies on demand.
        const envelope = await api.fetchThreadsPage(
          job.slug, job.page,
          { bodyWindow: 20 },
        );
        for (let i = 0; i < envelope.items.length; i++) {
          slots[job.slug][(job.page - 1) * THREADS_PAGE_SIZE + i] = envelope.items[i];
        }
      } catch { /* skip failed page; next kick heals */ }
    }
  };
  Promise.all(
    Array.from({ length: Math.min(THREADS_FILL_CONCURRENCY, tasks.length) }, worker)
  )
    .then(() => {
      if (!liveCache) return;
      let changed = false;
      for (const f of open) {
        const slug = f.slug;
        const seen = new Set<string>();
        const prev = ((liveCache as any)['_threads_' + slug] ?? []) as any[];
        // Keep optimistic client-only threads across the swap.
        const localOnly = prev.filter((t: any) => isLocalOnlyId(t?.id));
        const full: any[] = [];
        for (const row of localOnly) { full.push(row); if (row?.id != null) seen.add(String(row.id)); }
        // Fresh rows lead after optimistic rows; null-id rows keep
        // rendering with fallback keys.
        for (const row of slots[slug]) {
          if (!row) continue;
          if (row?.id == null) { full.push(row); continue; }
          const key = String(row.id);
          if (seen.has(key)) continue;
          seen.add(key);
          full.push(row);
        }
        if ((liveCache as any)['_threads_' + slug] !== full) {
          (liveCache as any)['_threads_' + slug] = full;
          threadsFillTotals[slug] = typeof totals[slug] === 'number' ? (totals[slug] as number) : null;
          changed = true;
        }
      }
      console.log(
        '[dataService] threads fill done: forums=' + open.length +
        ' fillMs=' + Math.round(performance.now() - fillStarted) +
        ' atT=' + Math.round(fillStarted) + 'ms'
      );
      if (changed) emitChange();
    })
    .catch((err) => {
      console.warn('[dataService] threads full load failed:', err);
    })
    .finally(() => { threadsFillInFlight = false; });
}

class DataService {
  // ── Identity ──────────────────────────────────────────────────────
  setCurrentUser(id: string | null): void {
    setStoredUserId(id);
  }

  getCurrentUser(): User | null {
    const users = this.getUsers();
    if (!users || users.length === 0) return null;
    const stored = getStoredUserId();
    if (stored) {
      const found = users.find((u: User) => u.id === stored);
      if (found) return found;
      setStoredUserId(null); // stale identity — clear it
    }
    return users[0];
  }

  // ── Counts ────────────────────────────────────────────────────────
  getCounts(): Counts {
    return {
      forums: liveList('forums').length,
      posts: liveList('feed').length,
      threads: 0, // threads loaded on demand
      toDoThreads: ((liveCache as any)?.['_threads_to-do'] as any[] | undefined)?.length ?? 0,
      comments: 0,
      workRequests: liveList('workRequests').length,
      requirements: liveList('requirements').length,
      agendas: liveList('agendas').length,
      candidates: liveList('candidates').length,
      harvests: liveList('harvests').length,
      openQuestions: liveList('openQuestions').filter((q: any) => q.answeredAt == null).length,
      assessments: liveList('assessments').length,
      observations: liveList('observations').length,
      agentRecords: liveList('agentRecords').length,
      specifications: liveList('specifications').length,
      plans: liveList('plans').length,
    };
  }

  // ── Forums ────────────────────────────────────────────────────────
  getForums(): Forum[] {
    return liveList('forums');
  }

  createForum(data: { name: string; slug: string; description: string }): Forum {
    const newForum: Forum = {
      id: `forum-${Date.now()}`,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name, description: data.description,
      sortOrder: this.getForums().length + 1, threadCount: 0, postCount: 0,
    };
    liveCache!.forums.push(newForum);
    api.createForum(data).catch(() => {});
    return newForum;
  }

  reorderForums(orderedIds: string[]): boolean {
    const map = new Map<string, Forum>(this.getForums().map((f: Forum) => [f.id, f]));
    const reordered: Forum[] = [];
    orderedIds.forEach((id, idx) => { const f = map.get(id); if (f) { f.sortOrder = idx + 1; reordered.push(f); } });
    liveCache!.forums = reordered;
    api.reorderForums(orderedIds).catch(() => {});
    return true;
  }

  // ── Threads ───────────────────────────────────────────────────────
  // Small forums request full bodies so the list view renders previews;
  // large forums (transcripts, harvest-candidates, ...) request only a
  // recent body window (bodyWindow=20) so recent posts show previews without
  // shipping every body. The detail view fetches any body on demand.
  getThreads(slug: string): Thread[] {
    const cacheKey = '_threads_' + slug;
    const cached = (liveCache as any)?.[cacheKey];
    if (cached) return cached;
    // Pre-init render (render-first boot): liveCache is still null. Return
    // empty WITHOUT writing — initDataService() emits a change notification
    // when populated, and this view re-runs then, hitting the lazy-load below.
    if (!liveCache) return [];
    (liveCache as any)[cacheKey] = [];
    const forum = this.getForums().find((f: Forum) => f.slug === slug);
    const policy = forum ? api.threadBodyPolicy(forum.threadCount) : {};
    api.fetchThreadsPage(slug, 1, policy).then(list => {
      if (liveCache) (liveCache as any)[cacheKey] = list.items;
    }).catch(() => {});
    return [];
  }

  createThread(slug: string, data: { title: string; body: string; postedById?: string }): Thread {
    const forums = this.getForums();
    let forum = forums.find((f: Forum) => f.slug === slug);
    if (!forum) {
      forum = { id: `forum-${Date.now()}`, slug, name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), description: `Discussions for ${slug}`, sortOrder: forums.length + 1, threadCount: 0, postCount: 0 };
      forums.push(forum);
      liveCache!.forums = forums;
    }
    const user = resolveUser(data.postedById, liveList('users') as User[]);
    const newThread: Thread = {
      id: `thread-${Date.now()}`,
      title: data.title, body: data.body,
      createdAt: new Date().toISOString(),
      author: { id: user.id, name: user.name, avatar: user.avatar || user.name?.[0] || '?' },
      forum: { id: forum.id, slug: forum.slug, name: forum.name },
      replyCount: 0, viewCount: 1, lastReplyAt: null, lastReplyAuthor: null,
    };
    const cacheKey = '_threads_' + slug;
    if (!(liveCache as any)[cacheKey]) (liveCache as any)[cacheKey] = [];
    (liveCache as any)[cacheKey].unshift(newThread);
    api.createThread(slug, { ...data, postedById: user.id, role: user.name, model: 'assembly-ui' })
      .then((created: any) => {
        const sid = created?.id ?? created?.thread?.id;
        if (sid) {
          // Reconcile the optimistic row with its server identity so the
          // next background merge dedupes it instead of duplicating it.
          newThread.id = sid;
        }
      })
      .catch(() => {});
    return newThread;
  }

  getThread(threadId: string): { thread: Thread | undefined; comments: Comment[] } {
    // Prefer the detail cache (full body) when it exists: the per-forum list
    // cache omits bodies (includeBody=false by default) so transcripts would
    // otherwise render empty. Fall back to the list entry while the async
    // detail fetch is still in flight.
    touchCache('_threadDetail_' + threadId);
    const detail = (liveCache as any)?.['_threadDetail_' + threadId] as Thread | undefined;
    let thread = detail;
    if (!thread) {
      // Try cached threads from all slug caches
      const allCached: Thread[] = [];
      for (const key of Object.keys(liveCache || {})) {
        if (key.startsWith('_threads_')) allCached.push(...((liveCache as any)[key] || []));
      }
      thread = allCached.find((t: Thread) => t.id === threadId);
    }
    // Lazy-load thread detail + comments from API
    api.fetchThread(threadId).then(({ thread: t, comments: c }) => {
      if (liveCache) {
        (liveCache as any)['_threadDetail_' + threadId] = t;
        (liveCache as any)['_comments_' + threadId] = c || [];
      }
    }).catch(() => {});
    // Return any cached comments from a previous load
    const comments: Comment[] = (liveCache as any)?.['_comments_' + threadId] ?? [];
    return { thread, comments };
  }

  addComment(threadId: string, data: { body: string; postedById?: string; parentId?: string | null }): Comment {
    const user = resolveUser(data.postedById, liveList('users') as User[]);
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      threadId, body: data.body,
      createdAt: new Date().toISOString(),
      parentId: data.parentId || null,
      author: { id: user.id, name: user.name, avatar: user.avatar || user.name?.[0] || '?' },
    };
    // Add to cache immediately so it appears in the UI
    const cacheKey = '_comments_' + threadId;
    if (!Array.isArray((liveCache as any)[cacheKey])) {
      (liveCache as any)[cacheKey] = [];
    }
    (liveCache as any)[cacheKey].push(newComment);
    // Also update thread metadata
    const threadCacheKey = '_threadDetail_' + threadId;
    const thread = (liveCache as any)[threadCacheKey];
    if (thread) {
      thread.replyCount = (thread.replyCount || 0) + 1;
      thread.lastReplyAt = newComment.createdAt;
      thread.lastReplyAuthor = user.name;
    }
    // The server requires postedById — inject the resolved user so live
    // comments actually persist. role/model are persisted by assembly-srv
    // for attribution: role is the picked user's name, model the UI.
    api.addComment(threadId, { ...data, postedById: user.id, role: user.name, model: 'assembly-ui' })
      .then((created: any) => {
        const sid = created?.id ?? created?.comment?.id;
        if (sid) newComment.id = sid;
      })
      .catch((err) => {
        console.error('[assembly-ui] addComment failed to persist:', err);
      });
    return newComment;
  }

  // ── Decision cards (shrapnel persistence) ─────────────────────────
  // Best-effort fire-and-forget (the "Agreed selection:" reply comment is
  // the durable source of truth; the shrapnel record re-hydrates submitted
  // state after reload). Errors are swallowed — the UI already shows the
  // reply, so persist failure degrades to last-write-wins in thread text.
  saveDecision(data: {
    threadId: string;
    sourceId: string;
    mode: string;
    blockIdx: number;
    selections: { itemIdx: number; label: string; selected: boolean; other?: string }[];
    replyCommentId?: string | null;
    submittedBy?: string | null;
    submittedAt?: string | null;
  }): void {
    const user = resolveUser(data.submittedBy ?? undefined, liveList('users') as User[]);
    api.saveDecision({
      ...data,
      submittedBy: data.submittedBy ?? user.name,
      submittedAt: data.submittedAt ?? new Date().toISOString(),
    }).catch((err) => {
      console.error('[assembly-ui] saveDecision failed:', err);
    });
  }

  getDecisions(threadId: string): Promise<any[]> {
    return api.fetchDecisions(threadId).catch((err) => {
      console.warn('[assembly-ui] fetchDecisions failed:', err);
      return [];
    });
  }

  // ── Thread status indicator ───────────────────────────────────────
  // Optimistic updates every cached copy of the thread (detail + any
  // per-forum list), persist via PUT /status, then notify so mounted
  // views re-read. Any commenter may advance the status.
  setThreadStatus(threadId: string, rating: number): boolean {
    if (!liveCache) return false;
    const detail = (liveCache as any)['_threadDetail_' + threadId];
    if (detail) detail.statusRating = rating;
    for (const key of Object.keys(liveCache)) {
      if (!key.startsWith('_threads_')) continue;
      const list = (liveCache as any)[key];
      if (!Array.isArray(list)) continue;
      const entry = list.find((t: any) => t?.id === threadId);
      if (entry) entry.statusRating = rating;
    }
    api.setThreadStatus(threadId, rating).catch((err) => {
      console.error('[assembly-ui] setThreadStatus failed:', err);
    });
    emitChange();
    return true;
  }

  // ── Comment edit / delete ─────────────────────────────────────────
  // Optimistic cache updates + fire-and-forget persistence, matching the
  // create path convention. Delete also removes direct replies (one nesting
  // level rendered by views) and trims the cached thread's replyCount.
  updateComment(threadId: string, commentId: string, body: string): boolean {
    if (!liveCache || !body.trim()) return false;
    const list = (liveCache as any)['_comments_' + threadId];
    if (Array.isArray(list)) {
      const c = list.find((x: any) => x?.id === commentId);
      if (c) c.body = body;
    }
    api.updateComment(commentId, body).catch((err) => {
      console.error('[assembly-ui] updateComment failed:', err);
    });
    emitChange();
    return true;
  }

  deleteComment(threadId: string, commentId: string): boolean {
    if (!liveCache) return false;
    const cacheKey = '_comments_' + threadId;
    const list = (liveCache as any)[cacheKey];
    if (Array.isArray(list)) {
      (liveCache as any)[cacheKey] = list.filter(
        (c: any) => c?.id !== commentId && c?.parentId !== commentId
      );
    }
    const detail = (liveCache as any)?.['_threadDetail_' + threadId];
    if (detail && typeof detail.replyCount === 'number' && detail.replyCount > 0) {
      detail.replyCount -= 1;
    }
    api.deleteComment(commentId).catch((err) => {
      console.error('[assembly-ui] deleteComment failed:', err);
    });
    emitChange();
    return true;
  }

  // ── Feed ──────────────────────────────────────────────────────────
  getFeed(): FeedPost[] {
    return liveList('feed');
  }

  createFeedPost(data: { title?: string; text: string; postedById?: string }): FeedPost {
    const user = resolveUser(data.postedById, liveList('users') as User[]);
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      title: data.title || (data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text),
      content: data.text,
      createdAt: new Date().toISOString(),
      comments: 0,
      author: { id: user.id, name: user.name, avatar: user.avatar || user.name?.[0] || '?' },
      forum: null,
    };
    liveCache!.feed.unshift(newPost);
    api.createFeedPost({ text: data.text, postedById: user.id })
      .then((created: any) => {
        const sid = created?.id ?? created?.post?.id;
        if (sid) newPost.id = sid;
      })
      .catch(() => {});
    return newPost;
  }

  deleteFeedPost(id: string): boolean {
    liveCache!.feed = liveCache!.feed.filter((p: FeedPost) => p.id !== id);
    api.deleteFeedPost(id).catch(() => {});
    return true;
  }

  // ── Work Requests ─────────────────────────────────────────────────
  getWorkRequests(): WorkRequest[] {
    return liveList('workRequests');
  }

  getWorkRequest(id: string): WorkRequest | undefined {
    return liveItem('workRequests', id);
  }

  // ── Requirements ──────────────────────────────────────────────────
  getRequirements(): Requirement[] {
    return liveList('requirements');
  }

  getRequirement(id: string): Requirement | undefined {
    return liveItem('requirements', id);
  }

  // ── Agendas ───────────────────────────────────────────────────────
  getAgendas(): Agenda[] {
    return liveList('agendas');
  }

  getAgenda(id: string): Agenda | undefined {
    return liveItem('agendas', id);
  }

  // ── Candidates ────────────────────────────────────────────────────
  getCandidates(): Candidate[] {
    return liveList('candidates');
  }

  getCandidate(id: string): Candidate | undefined {
    return liveItem('candidates', id);
  }

  // ── Harvests ──────────────────────────────────────────────────────
  getHarvests(): Harvest[] {
    return liveList('harvests');
  }

  getHarvest(id: string): Harvest | undefined {
    // Detail records are cached separately: the list endpoint returns a
    // camelCase summary projection WITHOUT docklang/sourceText, while the
    // detail endpoint (GET /api/harvests/:id) returns the full snake_case
    // row. Fetch it lazily and map it back to the Harvest shape so the
    // list cache stays intact. The detail view re-reads shortly after so
    // cold deep-links render too.
    const detail = (liveCache as any)?.['_harvestDetail_' + id];
    if (detail) return detail;
    const listItem = liveItem('harvests', id);
    if (!listItem) return undefined;
    touchCache('_harvestDetail_' + id);
    api.fetchCollectionItem('harvests', id)
      .then((raw: any) => {
        if (raw && liveCache) {
          (liveCache as any)['_harvestDetail_' + id] = mapHarvestDetail(raw);
        }
      })
      .catch(() => {});
    return listItem;
  }

  // ── Open Questions ────────────────────────────────────────────────
  getOpenQuestions(resolved = false, requirementId?: string): OpenQuestion[] {
    if (resolved) {
      // Resolved questions come from the backend's `resolved=true` filter
      // (Angular parity) — the unfiltered live list marks answered rows as
      // status 'OPEN', so a client-side status check would miss them all.
      const resolvedList = liveList('resolvedOpenQuestions');
      if (resolvedList.length > 0) {
        return resolvedList.filter((q: any) =>
          !requirementId || q.requirementId === requirementId
        );
      }
    }
    return liveList('openQuestions').filter((q: any) => {
      // Fallback (only reached when the resolved seed is unavailable): key
      // off answeredAt — the backend's own signal — since the unfiltered
      // list reports status 'OPEN' even for answered rows. The open branch
      // keeps the status check so answered rows still appear, matching the
      // Angular open-questions view (which lists everything unfiltered).
      const isRes = resolved
        ? q.answeredAt != null || q.status === 'ANSWERED' || q.status === 'RESOLVED'
        : q.status === 'ANSWERED' || q.status === 'RESOLVED';
      if (resolved && !isRes) return false;
      if (!resolved && isRes) return false;
      if (requirementId && q.requirementId !== requirementId) return false;
      return true;
    });
  }

  getOpenQuestion(id: string): OpenQuestion | undefined {
    return liveItem('openQuestions', id);
  }

  createOpenQuestion(data: Partial<OpenQuestion>): OpenQuestion {
    const newQ: OpenQuestion = {
      id: `question-${Date.now()}`,
      requirementId: data.requirementId || null,
      candidateId: data.candidateId || null,
      title: data.title || 'Untitled Question',
      description: data.description || null,
      category: data.category || 'GENERAL',
      status: 'OPEN',
      blocking: data.blocking || false,
      createdBy: data.createdBy || 'Anonymous',
      createdAt: new Date().toISOString(),
      answerCount: 0, roleCount: 0,
    };
    liveCache!.openQuestions.unshift(newQ);
    api.createOpenQuestion(data as Record<string, unknown>)
      .then((created: any) => {
        const sid = created?.id ?? created?.question?.id;
        if (sid) newQ.id = sid;
      })
      .catch(() => {});
    return newQ;
  }

  getQuestionAnswers(questionId: string): OpenQuestionAnswer[] {
    touchCache('_answers_' + questionId);
    const cached = (liveCache as any)?.['_answers_' + questionId];
    if (cached) return cached;
    api.fetchQuestionAnswers(questionId).then(({ answers }) => {
      if (liveCache) (liveCache as any)['_answers_' + questionId] = answers || [];
    }).catch(() => {});
    return [];
  }

  addQuestionAnswer(questionId: string, data: { role: string; answer: string; confidence?: string; reasoning?: string }): OpenQuestionAnswer {
    const newAns: OpenQuestionAnswer = {
      id: `ans-${Date.now()}`,
      questionId,
      role: data.role || 'Contributor',
      answer: data.answer,
      confidence: data.confidence || 'HIGH',
      reasoning: data.reasoning || null,
      answeredAt: new Date().toISOString(),
    };
    const cacheKey = '_answers_' + questionId;
    if (!(liveCache as any)[cacheKey]) (liveCache as any)[cacheKey] = [];
    (liveCache as any)[cacheKey].push(newAns);
    api.addQuestionAnswer(questionId, data as Record<string, unknown>)
      .then((created: any) => {
        const sid = created?.id ?? created?.answer?.id;
        if (sid) newAns.id = sid;
      })
      .catch(() => {});
    return newAns;
  }

  getQuestionTimeline(questionId: string): TimelineEvent[] {
    return []; // timeline not cached; would require API call
  }

  // ── Assessments ───────────────────────────────────────────────────
  getAssessments(): Assessment[] {
    return liveList('assessments');
  }

  getAssessment(id: string): Assessment | undefined {
    return liveItem('assessments', id);
  }

  // ── Observations ──────────────────────────────────────────────────
  getObservations(): Observation[] {
    return liveList('observations');
  }

  getObservation(id: string): Observation | undefined {
    return liveItem('observations', id);
  }

  // ── Agent Records ─────────────────────────────────────────────────
  getAgentRecords(typeFilter?: string): AgentRecord[] {
    ensureAgentRecordContent();
    const records = liveList('agentRecords') as AgentRecord[];
    return typeFilter ? records.filter((r: AgentRecord) => r.recordType === typeFilter) : records;
  }

  getAgentRecord(id: string): AgentRecord | undefined {
    const item = liveItem('agentRecords', id) as AgentRecord | undefined;
    if (item && item.content == null && !agentDetailAttempted.has(id)) {
      agentDetailAttempted.add(id);
      api.fetchCollectionItem('agent-records', id)
        .then((raw: any) => {
          if (raw && liveCache) {
            if (raw.content != null) agentContentMap()[id] = raw.content;
            applyAgentRecordContent();
            emitChange();
          }
        })
        .catch(() => { /* detail stays summary-only */ });
    }
    return item;
  }

  // ── Specifications ────────────────────────────────────────────────
  getSpecifications(): Specification[] {
    return liveList('specifications');
  }

  getSpecification(id: string): Specification | undefined {
    return liveItem('specifications', id);
  }

  // ── Plans ─────────────────────────────────────────────────────────
  getPlans(): Plan[] {
    return liveList('plans');
  }

  getPlan(id: string): Plan | undefined {
    return liveItem('plans', id);
  }

  // ── Specs (nebula proxy) ──────────────────────────────────────────
  getSpecs(): SpecItem[] {
    return liveList('specs');
  }

  getSpecItem(id: string): SpecItem | undefined {
    return liveItem('specs', id);
  }

  // ── Users ─────────────────────────────────────────────────────────
  getUsers(): User[] {
    return liveList('users');
  }

  getUser(id: string): User | undefined {
    return liveItem('users', id);
  }

  // ── Search (cached collections + threads + API fire-and-forget) ────
  // Debounce/dedupe state for the server-side thread-title search.
  // The local thread-cache scan below is synchronous; the server search
  // (GET /api/forums/search/by-thread-title) covers ALL forums and merges
  // in via emitChange when it lands.
  private static threadSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private static threadSearchCache = new Map<string, SearchResult[]>();

  search(q: string): SearchResult[] {
    if (!q || !q.trim()) {
      if (DataService.threadSearchTimer) {
        clearTimeout(DataService.threadSearchTimer);
        DataService.threadSearchTimer = null;
      }
      DataService.threadSearchCache.clear();
      return [];
    }
    const query = q.toLowerCase();

    const results: SearchResult[] = [];
    const collections: [string, any[]][] = [
      ['forums', liveList('forums')],
      ['workRequests', liveList('workRequests')],
      ['requirements', liveList('requirements')],
      ['agendas', liveList('agendas')],
      ['candidates', liveList('candidates')],
      ['openQuestions', liveList('openQuestions')],
      ['agentRecords', liveList('agentRecords')],
      ['plans', liveList('plans')],
    ];
    for (const [_type, items] of collections) {
      for (const item of items) {
        const haystack = `${item.id || ''} ${item.title || ''} ${item.description || ''} ${item.name || ''} ${item.slug || ''} ${item.body || ''} ${item.goal || ''} ${item.content || ''}`.toLowerCase();
        if (haystack.includes(query)) {
          const typeMap: Record<string, string> = { forums: 'Forum', workRequests: 'Work Request', requirements: 'Requirement', agendas: 'Agenda', candidates: 'Candidate', openQuestions: 'Open Question', agentRecords: 'Agent Record', plans: 'Plan' };
          const typeLabel = typeMap[_type] || _type;
          let href = `/${_type}/${item.id}`;
          if (_type === 'forums') href = `/forums/${item.slug}`;
          results.push({ type: typeLabel, id: item.id, title: item.title || item.name, description: item.description || item.body || '', href, status: item.status });
        }
      }
    }

    // ── Threads: search forum thread titles ─────────────────────────
    // (a) Synchronous scan of thread caches already loaded for visited
    //     forums (_threads_<slug>). The old code only scanned the forum
    //     containers, so thread titles never appeared in results.
    const forums = liveList('forums') as Forum[];
    const slugById = new Map<string, string>(forums.map((f) => [f.id, f.slug]));
    const seenThreadIds = new Set<string>();
    for (const key of Object.keys(liveCache ?? {})) {
      if (!key.startsWith('_threads_')) continue;
      const slug = key.slice('_threads_'.length);
      const threads = (liveCache as Record<string, any>)[key] as Thread[];
      if (!Array.isArray(threads)) continue;
      for (const t of threads) {
        const title = String(t?.title ?? '');
        if (!title.toLowerCase().includes(query)) continue;
        if (seenThreadIds.has(t.id)) continue;
        seenThreadIds.add(t.id);
        const forumSlug = (slug && slug !== 'undefined') ? slug : (slugById.get(t.forum?.id) || t.forum?.slug);
        results.push({
          type: 'Thread',
          id: t.id,
          title,
          description: String(t?.body ?? '').slice(0, 120),
          href: `/forums/${forumSlug || 'forums'}/${t.id}`,
          status: statusMeta(t?.statusRating).label,
        });
      }
    }

    // (b) Server-side title search covers ALL forums (including ones whose
    //     threads were never loaded locally). Fire-and-forget: results are
    //     cached per-query, deduped against (a) by thread id, and merged at
    //     the front of the Thread section; emitChange re-renders the modal.
    const trimmed = q.trim();
    const cached = DataService.threadSearchCache.get(trimmed);
    if (cached) {
      for (const r of cached) {
        if (!seenThreadIds.has(r.id)) {
          seenThreadIds.add(r.id);
          results.unshift(r);
        }
      }
    } else {
      if (DataService.threadSearchTimer) clearTimeout(DataService.threadSearchTimer);
      DataService.threadSearchTimer = setTimeout(() => {
        DataService.threadSearchTimer = null;
        api.searchThreadTitles(trimmed)
          .then((rows) => {
            if (!liveCache) return;
            const mapped: SearchResult[] = (Array.isArray(rows) ? rows : [])
              .filter((row: any) => row && row.title && row.id)
              .map((row: any) => ({
                type: 'Thread',
                id: String(row.id),
                title: String(row.title),
                description: String(row.text ?? '').slice(0, 120),
                href: `/forums/${slugById.get(row.forum_uuid) || 'forums'}/${row.id}`,
                status: statusMeta(row.rating).label,
              }));
            DataService.threadSearchCache.set(trimmed, mapped);
            emitChange();
          })
          .catch(() => { /* server search is best-effort; local scan still applies */ });
      }, 250);
    }

    return results;
  }

  searchAll(q: string): SearchResult[] {
    return this.search(q);
  }
}

export const dataService = new DataService();
