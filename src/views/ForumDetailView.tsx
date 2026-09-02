import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Plus, ArrowLeft, Eye, Clock, X, Send, MessagesSquare, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { StatusIndicator } from '../components/StatusIndicator';
import { statusMeta } from '../types';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Forum, Thread } from '../types';
import { titleTag, stripTag } from '../utils/threadTags';

// ── Triage chrome (filters + pagination) for thread lists ──────────
// Bot-populated forums (sonar, jenkins, github, to-do) carry [TAG]
// prefixes on titles; the badge/filter machinery below keeps even
// 500+-thread forums scannable. Status split: open = rating < 4
// (posted..implemented), accepted/closed = rating >= 4.
const PAGE_SIZE = 25;
const OPEN_MAX_RATING = 4;

export const ForumDetailView: React.FC<{ slug?: string }> = ({ slug: slugProp }) => {
 const { version } = useLiveData();
 const { slug: slugParam } = useParams<{ slug: string }>();
 // slug comes from the URL param, or from a passed prop (e.g. the
 // dedicated /todo route passes slug="to-do", mirroring Angular's route data)
 const slug = slugProp ?? slugParam;
 const [forum, setForum] = useState<Forum | null>(null);
 const [threads, setThreads] = useState<Thread[]>([]);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [title, setTitle] = useState('');
 const [body, setBody] = useState('');
 const { showToast } = useToast();

 useEffect(() => {
 if (slug) {
 const allForums = dataService.getForums();
 const current = allForums.find((f) => f.slug === slug);
 if (current) setForum(current);
 const threads = dataService.getThreads(slug);
 setThreads(threads);
 // Threads are loaded async, so re-check after a delay
 if (threads.length === 0) {
 let attempts = 0;
 const maxAttempts = 10;
 const checkThreads = () => {
 attempts++;
 const updatedThreads = dataService.getThreads(slug);
 if (updatedThreads.length > 0) {
 setThreads(updatedThreads);
 } else if (attempts < maxAttempts) {
 window.setTimeout(checkThreads, 300);
 }
 };
 window.setTimeout(checkThreads, 300);
 }
 }
 }, [slug, version]);

 const handleCreateThread = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !slug) return;
 dataService.createThread(slug, { title: title.trim(), body: body.trim() });
 setTitle('');
 setBody('');
 setShowCreateModal(false);
 showToast('Thread created successfully!', 'success');
 setThreads(dataService.getThreads(slug));
 };

 // ── Triage: tag/status/search filters + client-side pagination ──
 const [tagFilter, setTagFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState('all');
 const [query, setQuery] = useState('');
 const [page, setPage] = useState(1);

 // Distinct [TAG] prefixes in this forum (SQ severities first, then the rest).
 const tags = useMemo(() => {
   const seen = new Set<string>();
   const sq: string[] = [];
   const other: string[] = [];
   for (const t of threads) {
     const tg = titleTag(t.title);
     if (!tg || seen.has(tg.tag)) continue;
     seen.add(tg.tag);
     (tg.tag.startsWith('SQ ') ? sq : other).push(tg.tag);
   }
   const order = ['SQ BLOCKER', 'SQ CRITICAL', 'SQ MAJOR+', 'SQ MINOR', 'SQ INFO', 'SQ HOTSPOT'];
   sq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
   other.sort();
   return [...sq, ...other];
 }, [threads]);

 const filtered = useMemo(() => {
   return threads.filter((t) => {
     const tg = titleTag(t.title);
     if (tagFilter !== 'all' && (!tg || tg.tag !== tagFilter)) return false;
     const rating = t.statusRating ?? 0;
     if (statusFilter === 'open' && rating >= OPEN_MAX_RATING) return false;
     if (statusFilter === 'closed' && rating < OPEN_MAX_RATING) return false;
     const q = query.trim().toLowerCase();
     if (q) {
       const hay = (t.title + ' ' + (t.body || '')).toLowerCase();
       if (!hay.includes(q)) return false;
     }
     return true;
   });
 }, [threads, tagFilter, statusFilter, query]);

 useEffect(() => { setPage(1); }, [tagFilter, statusFilter, query]);
 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const safePage = Math.min(page, totalPages);
 const pageThreads = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
 const openCount = threads.filter((t) => (t.statusRating ?? 0) < OPEN_MAX_RATING).length;
 const closedCount = threads.length - openCount;
 const rangeFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
 const rangeTo = Math.min(safePage * PAGE_SIZE, filtered.length);

 const formatSlugToTitle = (s?: string) => {
 if (!s) return 'Forum Discussions';
 return s
 .split('-')
 .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
 .join(' ');
 };

 const forumName = forum ? forum.name : formatSlugToTitle(slug);
 const forumDescription = forum ? forum.description : `Discussion threads and open questions for ${forumName}.`;

 return (
 <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <Link to="/forums" className="hover:text-indigo-600 :text-indigo-400 flex items-center gap-1 transition-colors">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Forums</span>
 </Link>
 <span>/</span>
 <span className="text-slate-900 font-medium">{forumName}</span>
 </div>

 <PageHeader
 title={forumName}
 subtitle={forumDescription}
 action={
 <button
 onClick={() => setShowCreateModal(true)}
 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>New Thread</span>
 </button>
 }
 />

 {/* Triage filter bar (bot-populated forums benefit most) */}
 {threads.length > 0 && (
 <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
 <select
 value={tagFilter}
 onChange={(e) => setTagFilter(e.target.value)}
 className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
 >
 <option value="all">All tags</option>
 {tags.map((t) => <option key={t} value={t}>{t}</option>)}
 </select>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
 >
 <option value="all">Any status</option>
 <option value="open">Open</option>
 <option value="closed">Accepted / closed</option>
 </select>
 <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
 <Search className="w-3.5 h-3.5 text-slate-400" />
 <input
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search title / body…"
 className="w-44 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
 />
 </div>
 <span className="ml-auto text-[11px] font-mono text-slate-500">
 {threads.length} threads · {openCount} open · {closedCount} closed
 </span>
 </div>
 )}

 {/* Threads List */}
 <div className="space-y-3">
 {threads.length === 0 ? (
 <EmptyState
 icon={MessagesSquare}
 title="No Threads in this Forum Yet"
 description="Be the first to open a discussion thread, query architectural guidelines, or propose a change."
 actionLabel="Create First Thread"
 onAction={() => setShowCreateModal(true)}
 />
 ) : filtered.length === 0 ? (
 <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
 No threads match the current filters.
 </div>
 ) : (
 pageThreads.map((thread) => {
   const tg = titleTag(thread.title);
   return (
 <Link
 key={thread.id}
 to={`/forums/${slug || thread.forum.slug}/${thread.id}`}
 className="group relative block overflow-hidden bg-white border border-slate-200 hover:border-indigo-500/60 :border-indigo-500/60 p-4 transition-all shadow-xs"
 >
 {/* Colored status strip along the card's top edge (hidden for
     default 'Posted' so unstatused threads stay quiet). */}
 <StatusIndicator status={thread.statusRating} variant="bar" />
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <Avatar name={thread.author.name} avatar={thread.author.avatar} size="md" />
 <div className="space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 {tg && (
 <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${tg.cls}`}>
 {tg.badge}
 </span>
 )}
 <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 :text-indigo-600 transition-colors font-poppins">
 {stripTag(thread.title)}
 </h3>
 </div>
 {/* Body is omitted from the list endpoint by default
 (includeBody=true opt-in) to keep large forums like
 transcripts light — render the preview only when
 present; the detail view shows the full body. */}
 {thread.body ? (
 <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{thread.body}</p>
 ) : null}
 <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
 <span>By {thread.author.name}</span>
 <span>•</span>
 <span>{formatDateTime(thread.createdAt)}</span>
 {thread.statusRating ? (
 <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta(thread.statusRating).color.replace('bg-', 'text-')}`}>
 • {statusMeta(thread.statusRating).label}
 </span>
 ) : null}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-4 text-sm text-slate-500 shrink-0 font-mono">
 <div className="flex items-center gap-1">
 <MessageSquare className="w-3.5 h-3.5 text-indigo-500 " />
 <span>{thread.replyCount}</span>
 </div>
 <div className="flex items-center gap-1">
 <Eye className="w-3.5 h-3.5 text-slate-400" />
 <span>{thread.viewCount}</span>
 </div>
 </div>
 </div>
 </Link>
   );
 })
 )}
 </div>

 {/* Pager — keep large forums navigable */}
 {filtered.length > 0 && (
 <div className="flex items-center justify-between text-xs text-slate-500">
 <span className="font-mono">
 {rangeFrom}–{rangeTo} of {filtered.length} · page {safePage}/{totalPages}
 </span>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setPage(safePage - 1)}
 disabled={safePage <= 1}
 className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50"
 >
 <ChevronLeft className="w-3.5 h-3.5" /> Prev
 </button>
 <button
 onClick={() => setPage(safePage + 1)}
 disabled={safePage >= totalPages}
 className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50"
 >
 Next <ChevronRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 )}

 {/* Create Thread Modal */}
 {showCreateModal && (
 <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-900 ">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-sm font-bold text-slate-900 font-poppins">New Discussion Thread</h3>
 <button
 onClick={() => setShowCreateModal(false)}
 className="text-slate-400 hover:text-slate-600 :text-white"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleCreateThread} className="space-y-4">
 <div>
 <label htmlFor="fd-title" className="block text-sm font-semibold text-slate-700 mb-1">Thread Title</label>
 <input
 id="fd-title"
 type="text"
 required
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Summarize your question or topic..."
 className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 :border-indigo-400"
 />
 </div>

 <div>
 <label htmlFor="fd-body" className="block text-sm font-semibold text-slate-700 mb-1">Content / Details</label>
 <textarea
 id="fd-body"
 rows={5}
 required
 value={body}
 onChange={(e) => setBody(e.target.value)}
 placeholder="Provide complete context..."
 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 :border-indigo-400 resize-none"
 />
 </div>

 <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setShowCreateModal(false)}
 className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 :text-white"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm"
 >
 Post Thread
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
