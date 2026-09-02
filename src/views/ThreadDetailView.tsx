import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, CornerDownRight, CheckCircle2, Pencil, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { InteractiveMarkdown, buildSelectionBody, splitSegments, isOtherItem } from '../components/InteractiveMarkdown';
import { BulkVerdictBar } from '../components/BulkVerdictBar'; // [bulk-verdict]
import { dataService } from '../services/dataService';
import * as api from '../services/apiClient';
import { useLiveData } from '../context/LiveDataContext';
import { StatusIndicator } from '../components/StatusIndicator';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Thread, Comment, THREAD_STATUS_LIST, statusMeta } from '../types';
import { titleTag, sonarKeyOf } from '../utils/threadTags';

export const ThreadDetailView: React.FC = () => {
 const { version } = useLiveData();
 const { slug, threadId } = useParams<{ slug: string; threadId: string }>();
 const [thread, setThread] = useState<Thread | null>(null);
 const [comments, setComments] = useState<Comment[]>([]);
 const [replyText, setReplyText] = useState('');
 const [replyingToId, setReplyingToId] = useState<string | null>(null);
 // Inline comment editing: which comment is being edited + its draft body.
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editText, setEditText] = useState('');
 // Interactive task-list agreement state: checkedMap keyed `${sourceId}:${blockIdx}:${itemIdx}`.
 const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
 // Single-choice (radio) state: `${sourceId}:${blockIdx}` -> selected itemIdx.
 const [radioTasks, setRadioTasks] = useState<Record<string, number>>({});
 // "Other" free-text state: `other:${sourceId}:${blockIdx}:${itemIdx}` -> typed text.
 const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
 // sourceIds ('thread' or comment id) that already submitted an agreement reply.
 const [submittedFor, setSubmittedFor] = useState<Set<string>>(new Set());
 // Persisted decision-card state re-hydrated from shrapnel after reload:
 // sources whose submitted decision records exist on the server.
  const [persistedSubmissions, setPersistedSubmissions] = useState<
    Record<string, { mode: string; blockIdx: number; selections: api.DecisionSelection[] }[]>
  >({});
  // [candidate-drilldown] Promotion-batch support: candidates index keyed by
  // 8-hex prefix → candidate record. Loaded lazily when the thread body looks
  // like a promotion batch; drives link decoration + status badges.
  const [candIndex, setCandIndex] = useState<Record<string, any>>({});
  const { showToast } = useToast();

  // ── Sonar finding writeback (SQ threads) ──────────────────────────
  // If this thread is a sonar-sync finding (`[SQ …]` title + `Sonar key:`
  // marker) and is still open, offer review buttons that write the decision
  // back through sonar-sync, then close the thread (comment + status 4) so
  // the forum reflects it immediately. The sonar-forum-sync scheduled run
  // then finds the thread already closed (idempotent).
  const sonarInfo = useMemo(() => {
    if (!thread) return null;
    const tg = titleTag(thread.title);
    if (!tg || !tg.tag.startsWith('SQ ')) return null;
    const key = sonarKeyOf(thread.body || '');
    if (!key) return null;
    const isHotspot = tg.tag.includes('HOTSPOT');
    const closed = (thread.statusRating ?? 0) >= 4;
    return { key, isHotspot, closed };
  }, [thread]);
  const [sonarBusy, setSonarBusy] = useState<string | null>(null);
  const [sonarError, setSonarError] = useState<string | null>(null);

  const applySonarReview = async (action: string) => {
    if (!sonarInfo || !thread) return;
    setSonarBusy(action);
    setSonarError(null);
    try {
      if (sonarInfo.isHotspot) {
        await api.reviewSonarHotspot(sonarInfo.key, action as 'safe' | 'fixed' | 'accept-risk');
      } else {
        await api.reviewSonarIssue(sonarInfo.key, action as 'resolve' | 'wontfix' | 'falsepositive');
      }
      // Persist onto the thread: completion comment + status 4, so the
      // forum closes immediately (sonar-forum-sync keeps it that way).
      dataService.addComment(thread.id, {
        body: `Resolved via assembly writeback (**${action}**) — SonarQube + the \`sonar\` schema are updated.`,
      });
      dataService.setThreadStatus(thread.id, 4);
      setThread({ ...thread, statusRating: 4 });
      showToast('Review written back to SonarQube; thread closed', 'success');
    } catch (e: any) {
      console.error('sonar writeback failed:', e);
      setSonarError(e?.message ?? 'Writeback failed — sonar-sync unreachable?');
    } finally {
      setSonarBusy(null);
    }
  };

 const loadData = () => {
 console.log('[tdv] loadData start ' + JSON.stringify({ slug, threadId }));
 if (!threadId) return;
 // Warm the per-forum thread cache (live mode keeps threads per slug in liveCache,
 // so getThreads(slug) populates it synchronously before getThread is consulted).
 if (slug) dataService.getThreads(slug);
 const res = dataService.getThread(threadId);
 console.log('[tdv] getThread sync ' + JSON.stringify({ thread: !!res.thread, comments: res.comments.length }));
 if (res.thread) setThread(res.thread);
 if (res.comments.length) setComments(res.comments);
 // The API fetch resolves asynchronously into the cache after this
 // synchronous read — re-read shortly after so cold deep-links render too.
 // The list cache omits bodies (includeBody=false by default), so also
 // re-read the thread: once the async detail fetch (api.fetchThread)
 // lands, getThread prefers the detail cache and the full body appears.
 // Keep checking until both the thread body and comments are loaded
 // (with safety limit).
 if (!res.thread?.body || !res.comments.length) {
 let attempts = 0;
 const maxAttempts = 12;
 const checkData = () => {
 attempts++;
 const r2 = dataService.getThread(threadId);
 console.log('[tdv] poll ' + attempts + ' ' + JSON.stringify({ thread: !!r2.thread, hasBody: !!r2.thread?.body, comments: r2.comments.length }));
 if (r2.thread) setThread(r2.thread);
 if (r2.comments.length) setComments(r2.comments);
 const threadReady = !!r2.thread?.body;
 if (!threadReady || !r2.comments.length) {
 if (attempts < maxAttempts) {
 // Try again after a delay
 window.setTimeout(checkData, 300);
 }
 }
 };
 window.setTimeout(checkData, 300);
 }
 };

 // Load thread + comments on mount and on LiveData version bumps.
 useEffect(() => {
   console.log('[tdv] mount effect ' + JSON.stringify({ slug, threadId, version }));
   loadData();
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [threadId, version]);

 // Re-hydrate submitted decisions from shrapnel so cards stay frozen
 // across reloads (the durable reply comment remains the source of
 // truth — this just restores the visual submitted state).
 useEffect(() => {
   if (!threadId) return;
   let cancelled = false;
   api.fetchDecisions(threadId).then((items) => {
     if (cancelled || !Array.isArray(items)) return;
     const bySource: typeof persistedSubmissions = {};
     const submitted: Set<string> = new Set();
     for (const d of items) {
       if (!d.sourceId) continue;
       if (!bySource[d.sourceId]) bySource[d.sourceId] = [];
       bySource[d.sourceId].push(d);
       submitted.add(d.sourceId);
     }
     setPersistedSubmissions(bySource);
     setSubmittedFor((prev) => new Set([...prev, ...submitted]));
   }).catch(() => { /* shrapnel store unavailable — UI-only freeze as before */ });
   return () => { cancelled = true; };
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [threadId]);

  // [candidate-drilldown] Load the candidates index when this thread is a
  // promotion batch (headers of the form **Card `xxxxxxxx`**). Progressive:
  // badges appear as pages land.
  useEffect(() => {
    if (!thread?.body?.includes('**Card `')) return;
    let cancelled = false;
    api.fetchCandidatesIndex().then((idx) => {
      if (!cancelled) setCandIndex(idx);
    }).catch(() => { /* nebula unreachable — cards render undecorated */ });
    return () => { cancelled = true; };
  }, [thread?.body]);

  // [candidate-drilldown] Decorate promotion-card headers at render time:
  //  - backticked 8-hex prefix becomes a link to /candidates/<uuid> (with
  //    ?thread= so the detail view can echo verdicts back to THIS batch)
  //  - current candidate status appended as a badge → decisions made anywhere
  //    (detail view, stage3 execution) are reflected on revisit. The thread
  //    body itself is never mutated — decoration is render-time only.
  const decoratedThreadBody = useMemo(() => {
    const body = thread?.body;
    if (!body || !body.includes('**Card `')) return body;
    return body.split('\n').map((line) => {
      const m = line.match(/^\*\*Card `([0-9a-f]{8})`\*\* — (.*)$/);
      if (!m) return line;
      const short = m[1].toLowerCase();
      const cand = candIndex[short];
      const uuid = cand?.id ?? short;
      const href = `/candidates/${uuid}${threadId ? `?thread=${threadId}` : ''}`;
      const badge =
        cand?.status === 'promoted' ? '✅ promoted'
        : cand?.status === 'struck' ? '⛔ struck'
        : cand?.status === 'discarded' ? '⛔ struck'
        : cand?.status === 'approved' ? '🔎 approved · pending execution'
        : '';
      const badgePart = badge ? ` · ${badge}` : '';
      return `**[Card \`${short}\`](${href}) — ${m[2]}${badgePart}**`;
    }).join('\n');
  }, [thread?.body, candIndex, threadId]);

  const handlePostComment = (e: React.FormEvent, parentId?: string | null) => {
 e.preventDefault();
 if (!replyText.trim() || !threadId) return;

 dataService.addComment(threadId, {
 body: replyText.trim(),
 parentId: parentId || null,
 });
 setReplyText('');
 setReplyingToId(null);
 showToast('Reply added successfully!', 'success');
 loadData();
 };

 // ── Comment edit / delete ─────────────────────────────────────────
 const handleStartEdit = (comment: Comment) => {
 setReplyingToId(null);
 setEditingId(comment.id);
 setEditText(comment.body);
 };

 const handleSaveEdit = () => {
 if (!threadId || !editingId || !editText.trim()) return;
 dataService.updateComment(threadId, editingId, editText.trim());
 setEditingId(null);
 setEditText('');
 showToast('Comment updated', 'success');
 loadData();
 };

 const handleCancelEdit = () => {
 setEditingId(null);
 setEditText('');
 };

 const handleDeleteComment = (comment: Comment) => {
 if (!threadId) return;
 if (!window.confirm('Delete this comment? Its direct replies are removed too.')) return;
 dataService.deleteComment(threadId, comment.id);
 if (replyingToId === comment.id) setReplyingToId(null);
 showToast('Comment deleted', 'info');
 loadData();
 };

 const handleTaskToggle = (sourceId: string, blockIdx: number, itemIdx: number, checked: boolean) => {
 setCheckedTasks((prev) => {
 const next = { ...prev };
 const key = `${sourceId}:${blockIdx}:${itemIdx}`;
 if (checked) next[key] = true;
 else delete next[key];
 return next;
 });
 };

 const handleRadioToggle = (sourceId: string, blockIdx: number, itemIdx: number) => {
 setRadioTasks((prev) => ({ ...prev, [`${sourceId}:${blockIdx}`]: itemIdx }));
 };

 const handleOtherChange = (sourceId: string, blockIdx: number, itemIdx: number, value: string) => {
 setOtherTexts((prev) => ({ ...prev, [`other:${sourceId}:${blockIdx}:${itemIdx}`]: value }));
 };

 const countCheckedFor = (sourceId: string) =>
 Object.keys(checkedTasks).filter((k) => k.startsWith(`${sourceId}:`)).length;

 const countRadioFor = (sourceId: string) =>
 Object.keys(radioTasks).filter((k) => k.startsWith(`${sourceId}:`)).length;

 const clearSource = (sourceId: string) => {
 setCheckedTasks((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (k.startsWith(`${sourceId}:`)) delete next[k];
 });
 return next;
 });
 setRadioTasks((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (k.startsWith(`${sourceId}:`)) delete next[k];
 });
 return next;
 });
 setOtherTexts((prev) => {
 const next = { ...prev };
 Object.keys(next).forEach((k) => {
 if (k.startsWith(`other:${sourceId}:`)) delete next[k];
 });
 return next;
 });
 }; const handleSubmitSelection = (sourceId: string, sourceBody: string, parentId: string | null) => {
   if (!threadId) return;
   const body = buildSelectionBody(sourceBody, sourceId, checkedTasks, radioTasks, otherTexts);
   // Durable record: the "Agreed selection:" reply comment.
   const posted = dataService.addComment(threadId, { body, parentId });
   // Derived artifact: snapshot the decision into the shrapnel EAV store
   // so submitted cards re-hydrate frozen after reload.
   const segments = splitSegments(sourceBody);
   const selections: api.DecisionSelection[] = [];
   for (const seg of segments) {
     if (seg.type !== 'tasks' && seg.type !== 'choices') continue;
     const blockIdx = seg.blockIdx;
     const blockKey = `${sourceId}:${blockIdx}`;
     const initialIdx = seg.type === 'choices'
       ? seg.items.findIndex((i) => i.initiallySelected)
       : -1;
     const selected = seg.type === 'choices'
       ? (radioTasks[blockKey] ?? (initialIdx >= 0 ? initialIdx : -1))
       : undefined;
     seg.items.forEach((item, itemIdx) => {
       const key = `${sourceId}:${blockIdx}:${itemIdx}`;
       const other = otherTexts[`other:${key}`];
       const isChecked = seg.type === 'tasks'
         ? (checkedTasks[key] ?? (seg.items[itemIdx] as { initiallyChecked: boolean }).initiallyChecked)
         : (selected === itemIdx);
       selections.push({
         itemIdx,
         label: isOtherItem(item.text) && other ? `Other: ${other}` : item.text,
         selected: isChecked,
         other,
       });
     });
   }
   dataService.saveDecision({
     threadId,
     sourceId,
     mode: segments.some((s) => s.type === 'choices') ? 'choices' : 'tasks',
     blockIdx: segments.findIndex((s) => s.type !== 'markdown'),
     selections,
     replyCommentId: posted.id,
     submittedAt: new Date().toISOString(),
   });
   clearSource(sourceId);
   setSubmittedFor((prev) => new Set(prev).add(sourceId));
   showToast('Agreement posted as reply', 'success');
   loadData();
 };

 // Agreement bar: appears under any source (thread body or comment) with checked items.
 const SelectionBar: React.FC<{ sourceId: string; sourceBody: string; parentId: string | null }> = ({
 sourceId,
 sourceBody,
 parentId,
 }) => {
 if (submittedFor.has(sourceId)) {
 return (
 <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 ">
 <CheckCircle2 className="w-3.5 h-3.5" />
 Agreement posted as a reply
 </div>
 );
 }
 const count = countCheckedFor(sourceId);
 const radioCount = countRadioFor(sourceId);
 if (count + radioCount === 0) return null;
 const label = radioCount > 0
 ? `Selections ready (${count + radioCount})`
 : `Agreed items (${count})`;
 return (
 <div className="mt-2 flex items-center justify-between gap-3 border border-primary-500/30 bg-primary-50 px-3 py-2">
 <span className="text-xs font-medium text-primary-700 ">
 {label}
 </span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => clearSource(sourceId)}
 className="text-xs text-gray-500 hover:text-gray-800 :text-white transition-colors"
 >
 Clear
 </button>
 <button
 type="button"
 onClick={() => handleSubmitSelection(sourceId, sourceBody, parentId)}
 className="app-btn-primary px-2.5 py-1 text-xs"
 >
 Submit selection
 </button>
 </div>
 </div>
 );
 };

 // Threaded comment tree, mirroring the Angular template's rootComments()/childComments().
 const rootComments = comments.filter((c) => !c.parentId);
 const childComments = (parentId: string) => comments.filter((c) => c.parentId === parentId);

 const CommentBody: React.FC<{ comment: Comment; nested: boolean }> = ({ comment, nested }) => {
 // Agreement replies (produced by Submit selection) are durable records, not
 // re-agreeable lists — render them non-interactive.
 const isAgreementReply = comment.body.trim().startsWith('**Agreed selection:**');
 return (
 <>
 <div className="flex items-center gap-2">
 <Avatar name={comment.author.name} avatar={comment.author.avatar} size="sm" />
 <div className="text-xs text-gray-500 ">
 <span className="font-medium text-gray-700 ">{comment.author.name}</span>
 <span className="ml-1">
 {formatDateTime(comment.createdAt)}
 </span>
 </div>
 </div>
 <div className={`mt-1 ${nested ? 'ml-7' : 'ml-9'}`}>
 {editingId === comment.id ? (
 /* Inline edit form — replaces the rendered body while editing. */
 <form
 onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}
 className="space-y-1.5"
 >
 <label htmlFor={`edit-${comment.id}`} className="sr-only">Edit comment</label>
 <textarea
 id={`edit-${comment.id}`}
 autoFocus
 value={editText}
 onChange={(e) => setEditText(e.target.value)}
 rows={16}
 className="w-full resize-y bg-white border border-primary-300 rounded-lg p-2.5 text-sm text-steel-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
 />
 <div className="flex justify-end gap-2">
 <button
 type="button"
 onClick={handleCancelEdit}
 className="px-3 py-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={!editText.trim()}
 className="app-btn-primary px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Save changes
 </button>
 </div>
 </form>
 ) : (
 <>
 <InteractiveMarkdown
 content={comment.body}
 sourceId={comment.id}
 checkedMap={checkedTasks}
 onToggle={handleTaskToggle}
 radioMap={radioTasks}
 onRadio={handleRadioToggle}
 otherMap={otherTexts}
 onOtherChange={handleOtherChange}
 disabled={submittedFor.has(comment.id) || isAgreementReply}
 />
 {!isAgreementReply && (
 <SelectionBar sourceId={comment.id} sourceBody={comment.body} parentId={comment.id} />
 )}
 </>
 )}
 {/* Comment actions: reply / edit / delete. Agreement replies are
     durable records — editable never, deletable always. */}
 <div className="mt-1.5 flex items-center gap-3">
 <button
 onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
 className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary-600 :text-primary-300 transition-colors"
 >
 <CornerDownRight className="w-3 h-3" />
 Reply
 </button>
 {!isAgreementReply && (
 <button
 onClick={() => handleStartEdit(comment)}
 className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary-600 :text-primary-300 transition-colors"
 >
 <Pencil className="w-3 h-3" />
 Edit
 </button>
 )}
 <button
 onClick={() => handleDeleteComment(comment)}
 title="Delete comment"
 className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-600 transition-colors"
 >
 <Trash2 className="w-3 h-3" />
 Delete
 </button>
 </div>
 </div>
 {replyingToId === comment.id && (
 <form onSubmit={(e) => handlePostComment(e, comment.id)} className={`mt-2 space-y-2 ${nested ? 'ml-7' : 'ml-9'}`}>
 <label htmlFor={`reply-to-${comment.id}`} className="sr-only">Reply to {comment.author.name}</label>
 <textarea
 id={`reply-to-${comment.id}`}
 value={replyText}
 onChange={(e) => setReplyText(e.target.value)}
 placeholder={`Replying to ${comment.author.name}...`}
 rows={16}
 className="w-full bg-white border border-steel-200 rounded-lg p-2.5 text-sm text-steel-900 placeholder-steel-400 focus:outline-none focus:border-primary-500 resize-y"
 />
 <div className="flex justify-end gap-2">
 <button
 type="button"
 onClick={() => setReplyingToId(null)}
 className="px-3 py-1 text-sm text-gray-500 hover:text-gray-800 :text-white"
 >
 Cancel
 </button>
 <button type="submit" disabled={!replyText.trim()} className="app-btn-primary disabled:opacity-50">
 Send Reply
 </button>
 </div>
 </form>
 )}
 </>
 );
 };

 if (!thread) {
 return (
 <div className="max-w-4xl mx-auto py-12 px-4 text-center text-steel-500 space-y-3">
 <p className="text-sm font-semibold text-steel-800 ">Thread not found</p>
 <Link
 to={`/forums/${slug || 'issues-and-open-questions'}`}
 className="text-sm text-primary-600 hover:underline inline-block font-medium"
 >
 Return to Forum
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto py-6 px-4">
 <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
 <Link to="/forums" className="hover:text-primary-700 :text-primary-300 transition-colors">
 Forums
 </Link>
 <span>/</span>
 <Link to={`/forums/${thread.forum.slug}`} className="hover:text-primary-700 :text-primary-300 transition-colors">
 {thread.forum.name}
 </Link>
 </div>

 {/* Main Thread Card (document) */}
 <div className="app-panel p-4 mb-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-center gap-2 min-w-0">
 {/* Status indicator: colored LED + selector. Any commenter may
     advance the thread status; changes persist via PUT /status and
     update every cached copy through dataService. */}
 <span className="shrink-0 inline-flex items-center gap-1.5">
 <StatusIndicator status={thread.statusRating} variant="led" showDefault />
 <select
 value={statusMeta(thread.statusRating).value}
 onChange={(e) => {
 const rating = Number(e.target.value);
 setThread((prev) => (prev ? { ...prev, statusRating: rating } : prev));
 dataService.setThreadStatus(thread.id, rating);
 }}
 title="Thread status (any commenter may update)"
 className="text-xs font-medium text-slate-600 bg-transparent border border-slate-200 rounded-md px-1.5 py-0.5 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
 >
 {THREAD_STATUS_LIST.map((s) => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>
 </span>
 </div>
 <TTSButton text={`${thread.title}. ${thread.body}`} label="Read Thread" />
 </div>
 <h1 className="text-lg font-bold text-gray-900 mt-2">{thread.title}</h1>
 <div className="flex items-center gap-2 mt-3">
 <Avatar name={thread.author.name} avatar={thread.author.avatar} size="md" />
 <div className="text-xs text-gray-500 ">
 <span className="font-medium text-gray-700 ">{thread.author.name}</span>
 <span className="ml-1">{formatDateTime(thread.createdAt)}</span>
 </div>
 </div>

 {/* Sonar finding writeback panel (SQ threads only, while open) */}
 {sonarInfo && !sonarInfo.closed && (
 <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
 <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
 Review this finding (writes back to SonarQube + the `sonar` schema, closes the thread)
 </div>
 {sonarError && (
 <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
 <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" /> {sonarError}
 </div>
 )}
 <div className="mt-2 flex flex-wrap gap-2">
 {sonarInfo.isHotspot ? (
 <>
 <button
 onClick={() => applySonarReview('safe')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
 >{sonarBusy === 'safe' ? 'saving…' : 'Safe'}</button>
 <button
 onClick={() => applySonarReview('fixed')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
 >{sonarBusy === 'fixed' ? 'saving…' : 'Fixed'}</button>
 <button
 onClick={() => applySonarReview('accept-risk')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
 >{sonarBusy === 'accept-risk' ? 'saving…' : 'Accept risk'}</button>
 </>
 ) : (
 <>
 <button
 onClick={() => applySonarReview('resolve')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
 >{sonarBusy === 'resolve' ? 'saving…' : 'Resolve'}</button>
 <button
 onClick={() => applySonarReview('wontfix')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
 >{sonarBusy === 'wontfix' ? 'saving…' : "Won't fix"}</button>
 <button
 onClick={() => applySonarReview('falsepositive')}
 disabled={!!sonarBusy}
 className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
 >{sonarBusy === 'falsepositive' ? 'saving…' : 'False positive'}</button>
 </>
 )}
 </div>
 </div>
 )}

  <div className="mt-4">
  {/* [candidate-drilldown] decoratedThreadBody adds per-candidate links +
      status badges; selection/verdict machinery below keeps using the raw
      thread.body so submitted labels stay byte-identical for stage3. */}
  <InteractiveMarkdown
  content={decoratedThreadBody ?? thread.body}
  sourceId="thread"
  checkedMap={checkedTasks}
  onToggle={handleTaskToggle}
  radioMap={radioTasks}
  onRadio={handleRadioToggle}
  otherMap={otherTexts}
  onOtherChange={handleOtherChange}
  disabled={submittedFor.has('thread')}
  />
 {/* [bulk-verdict] bulk actions above card list (to-do d9ac7608) */}
 <BulkVerdictBar
 threadBody={thread.body}
 sourceId="thread"
 disabled={submittedFor.has('thread')}
 onRadio={handleRadioToggle}
 />
 <SelectionBar sourceId="thread" sourceBody={thread.body} parentId={null} />
 </div>
 </div>

 {/* Reply Form (document) — new root comment */}
 <form onSubmit={(e) => handlePostComment(e, null)} className="app-panel p-3 mb-4">
 <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add a comment</h3>
 <label htmlFor="td-new-comment" className="sr-only">Add a comment</label>
 <textarea
 id="td-new-comment"
 value={replyingToId ? '' : replyText}
 onChange={(e) => {
 setReplyingToId(null);
 setReplyText(e.target.value);
 }}
 placeholder="Write your constructive response..."
 rows={16}
 className="w-full resize-y rounded border border-steel-200 p-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-steel-800"
 />
 <div className="flex items-center justify-end gap-2 mt-2">
 <button
 type="submit"
 disabled={!replyText.trim() || !!replyingToId}
 className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Send className="w-3.5 h-3.5" />
 Post Comment
 </button>
 </div>
 </form>

 {/* Comments (threaded) */}
 <h2 className="text-sm font-semibold text-gray-900 mb-2">Comments ({comments.length})</h2>
 {comments.length === 0 ? (
 <div className="app-panel p-6 text-center text-sm text-gray-400 ">
 <p className="font-medium text-gray-600 ">No comments</p>
 <p className="mt-1">Be the first to comment on this thread.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {rootComments.map((comment) => (
 <div key={comment.id} className="app-panel p-3">
 <CommentBody comment={comment} nested={false} />

 {/* Threaded replies */}
 {childComments(comment.id).length > 0 && (
 <div className="ml-9 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
 {childComments(comment.id).map((child) => (
 <div key={child.id} className="py-1.5">
 <CommentBody comment={child} nested />
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
};
