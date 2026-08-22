import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { InteractiveMarkdown, buildSelectionBody } from '../components/InteractiveMarkdown';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { StatusIndicator } from '../components/StatusIndicator';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Thread, Comment, THREAD_STATUS_LIST, statusMeta } from '../types';

export const ThreadDetailView: React.FC = () => {
 const { version } = useLiveData();
 const { slug, threadId } = useParams<{ slug: string; threadId: string }>();
 const [thread, setThread] = useState<Thread | null>(null);
 const [comments, setComments] = useState<Comment[]>([]);
 const [replyText, setReplyText] = useState('');
 const [replyingToId, setReplyingToId] = useState<string | null>(null);
 // Interactive task-list agreement state: checkedMap keyed `${sourceId}:${blockIdx}:${itemIdx}`.
 const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
 // Single-choice (radio) state: `${sourceId}:${blockIdx}` -> selected itemIdx.
 const [radioTasks, setRadioTasks] = useState<Record<string, number>>({});
 // "Other" free-text state: `other:${sourceId}:${blockIdx}:${itemIdx}` -> typed text.
 const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
 // sourceIds ('thread' or comment id) that already submitted an agreement reply.
 const [submittedFor, setSubmittedFor] = useState<Set<string>>(new Set());
 const { showToast } = useToast();

 const loadData = () => {
 if (!threadId) return;
 // Warm the per-forum thread cache (live mode keeps threads per slug in liveCache,
 // so getThreads(slug) populates it synchronously before getThread is consulted).
 if (slug) dataService.getThreads(slug);
 const res = dataService.getThread(threadId);
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

 useEffect(() => {
 loadData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [threadId, slug, version]);

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
 };

 const handleSubmitSelection = (sourceId: string, sourceBody: string, parentId: string | null) => {
 if (!threadId) return;
 const body = buildSelectionBody(sourceBody, sourceId, checkedTasks, radioTasks, otherTexts);
 dataService.addComment(threadId, { body, parentId });
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
 <button
 onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
 className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary-600 :text-primary-300 transition-colors"
 >
 <CornerDownRight className="w-3 h-3" />
 Reply
 </button>
 </div>
 {replyingToId === comment.id && (
 <form onSubmit={(e) => handlePostComment(e, comment.id)} className={`mt-2 space-y-2 ${nested ? 'ml-7' : 'ml-9'}`}>
 <label htmlFor={`reply-to-${comment.id}`} className="sr-only">Reply to {comment.author.name}</label>
 <textarea
 id={`reply-to-${comment.id}`}
 value={replyText}
 onChange={(e) => setReplyText(e.target.value)}
 placeholder={`Replying to ${comment.author.name}...`}
 rows={2}
 className="w-full bg-white border border-steel-200 rounded-lg p-2.5 text-sm text-steel-900 placeholder-steel-400 focus:outline-none focus:border-primary-500 resize-none"
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
 <div className="mt-4">
 <InteractiveMarkdown
 content={thread.body}
 sourceId="thread"
 checkedMap={checkedTasks}
 onToggle={handleTaskToggle}
 radioMap={radioTasks}
 onRadio={handleRadioToggle}
 otherMap={otherTexts}
 onOtherChange={handleOtherChange}
 disabled={submittedFor.has('thread')}
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
 rows={2}
 className="w-full resize-none rounded border border-steel-200 p-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-steel-800"
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
