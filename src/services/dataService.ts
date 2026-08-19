import {
  User, Forum, Thread, Comment, FeedPost, WorkRequest, Requirement, Agenda, Candidate,
  Harvest, ConversationSnapshot, ConversationBlock, OpenQuestion, OpenQuestionAnswer,
  TimelineEvent, Assessment, Observation, AgentRecord, Specification,
  Plan, SpecItem, Counts, SearchResult
} from '../types';
import * as api from './apiClient';

// ── Live data cache (populated by initDataService) ───────────────────
// assembly-ui is live-only: all reads go through this in-memory cache,
// which initDataService() pre-loads from the real backends (assembly-srv
// via /api, nebula-srv via /nebula) before first render. Collections that
// are expensive to pre-load (threads per forum, conversation blocks,
// harvest details, question answers) are lazy-loaded on demand into
// per-key caches and re-read shortly after by the views.
let liveCache: Record<string, any> | null = null;

export async function initDataService(): Promise<void> {
  try {
    const data = await api.loadAllData();
    liveCache = data;
    // Pre-populate per-forum thread caches so ForumDetailView renders
    // threads immediately without lazy-load delay.
    const bySlug = (data as any)._threadsBySlug;
    if (bySlug) {
      for (const [slug, threads] of Object.entries(bySlug)) {
        (liveCache as any)['_threads_' + slug] = threads;
      }
    }
    console.log('[dataService] Live data loaded:', {
      forums: data.forums?.length,
      threads: 'loaded on demand',
      feed: data.feed?.length,
      workRequests: data.workRequests?.length,
      requirements: data.requirements?.length,
    });
  } catch (err) {
    // No mock fallback — surface the failure and let views render empty
    // states. The health banner shows the backend as unreachable.
    console.error('[dataService] Failed to load live data:', err);
    liveCache = {};
  }
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
  getThreads(slug: string): Thread[] {
    const cacheKey = '_threads_' + slug;
    const cached = (liveCache as any)?.[cacheKey];
    if (cached) return cached;
    // Lazy-load threads for this forum on first access
    (liveCache as any)[cacheKey] = [];
    api.fetchThreads(slug).then(threads => {
      if (liveCache) (liveCache as any)[cacheKey] = threads;
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
    api.createThread(slug, { ...data, postedById: user.id, role: user.name, model: 'assembly-ui' }).catch(() => {});
    return newThread;
  }

  getThread(threadId: string): { thread: Thread | undefined; comments: Comment[] } {
    // Try cached threads from all slug caches
    const allCached: Thread[] = [];
    for (const key of Object.keys(liveCache || {})) {
      if (key.startsWith('_threads_')) allCached.push(...((liveCache as any)[key] || []));
    }
    const thread = allCached.find((t: Thread) => t.id === threadId);
    // Lazy-load thread detail + comments from API
    api.fetchThread(threadId).then(({ thread: t, comments: c }) => {
      if (liveCache) {
        (liveCache as any)['_threadDetail_' + threadId] = t;
        (liveCache as any)['_comments_' + threadId] = c || [];
      }
    }).catch(() => {});
    // Return any cached comments from a previous load
    const comments: Comment[] = (liveCache as any)?.['_comments_' + threadId] ?? [];
    return { thread: thread ?? (liveCache as any)?.['_threadDetail_' + threadId], comments };
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
    api.addComment(threadId, { ...data, postedById: user.id, role: user.name, model: 'assembly-ui' }).catch((err) => {
      console.error('[assembly-ui] addComment failed to persist:', err);
    });
    return newComment;
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
    api.createFeedPost({ text: data.text, postedById: user.id }).catch(() => {});
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
    api.fetchCollectionItem('harvests', id)
      .then((raw: any) => {
        if (raw && liveCache) {
          (liveCache as any)['_harvestDetail_' + id] = mapHarvestDetail(raw);
        }
      })
      .catch(() => {});
    return listItem;
  }

  updateHarvest(id: string, sourceText: string): boolean {
    const h = liveItem('harvests', id) as Harvest | undefined;
    if (h) { h.sourceText = sourceText; h.fileSize = sourceText.length; }
    api.updateHarvest(id, { sourceText }).catch(() => {});
    return !!h;
  }

  // ── Conversations (nebula) ────────────────────────────────────────
  getConversations(): ConversationSnapshot[] {
    return liveList('conversations');
  }

  getConversation(id: string): ConversationSnapshot | undefined {
    const found = liveItem('conversations', id);
    if (found) return found;
    // Fire-and-forget by-snapshot load (nebula-srv): `id` is a snapshot_id;
    // the single-item route lives on nebula-srv, not assembly-srv.
    api.fetchConversation(id).then(snap => {
      if (snap && liveCache) {
        const list = liveList('conversations');
        if (!list.some((c: any) => c.id === snap.id)) {
          (liveCache as any)['conversations'] = [snap, ...list];
        }
      }
    }).catch(() => {});
    return undefined;
  }

  getConversationBlocks(conversationId: string): ConversationBlock[] {
    const cached = (liveCache as any)?.['_conversationBlocks_' + conversationId];
    if (cached) return cached;
    // Fire-and-forget load
    api.fetchConversationBlocks(conversationId).then(blocks => {
      if (liveCache) (liveCache as any)['_conversationBlocks_' + conversationId] = blocks;
    }).catch(() => {});
    return [];
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
    api.createOpenQuestion(data as Record<string, unknown>).catch(() => {});
    return newQ;
  }

  getQuestionAnswers(questionId: string): OpenQuestionAnswer[] {
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
    api.addQuestionAnswer(questionId, data as Record<string, unknown>).catch(() => {});
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
    const records = liveList('agentRecords');
    return typeFilter ? records.filter((r: AgentRecord) => r.recordType === typeFilter) : records;
  }

  getAgentRecord(id: string): AgentRecord | undefined {
    return liveItem('agentRecords', id);
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

  // ── Search (cached collections + API fire-and-forget) ─────────────
  search(q: string): SearchResult[] {
    if (!q || !q.trim()) return [];
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
    return results;
  }

  searchAll(q: string): SearchResult[] {
    return this.search(q);
  }
}

export const dataService = new DataService();
