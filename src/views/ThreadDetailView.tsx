import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, CornerDownRight } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Thread, Comment } from '../types';

export const ThreadDetailView: React.FC = () => {
  const { slug, threadId } = useParams<{ slug: string; threadId: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadData = () => {
    if (!threadId) return;
    // Warm the per-forum thread cache (live mode keeps threads per slug in liveCache,
    // so getThreads(slug) populates it synchronously before getThread is consulted).
    if (slug) dataService.getThreads(slug);
    const res = dataService.getThread(threadId);
    if (res.thread) setThread(res.thread);
    if (res.comments.length) setComments(res.comments);
    // In live mode the API fetch resolves asynchronously into the cache after this
    // synchronous read — re-read shortly after so cold deep-links render too.
    if (!res.thread && !res.comments.length) {
      window.setTimeout(() => {
        const r2 = dataService.getThread(threadId);
        if (r2.thread) setThread(r2.thread);
        if (r2.comments.length) setComments(r2.comments);
      }, 900);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, slug]);

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

  // Threaded comment tree, mirroring the Angular template's rootComments()/childComments().
  const rootComments = comments.filter((c) => !c.parentId);
  const childComments = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const CommentBody: React.FC<{ comment: Comment; nested: boolean }> = ({ comment, nested }) => (
    <>
      <div className="flex items-center gap-2">
        <Avatar name={comment.author.name} avatar={comment.author.avatar} size="sm" />
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">{comment.author.name}</span>
          <span className="ml-1">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>
      </div>
      <div className={`mt-1 ${nested ? 'ml-7' : 'ml-9'}`}>
        <MarkdownRenderer content={comment.body} />
        <button
          onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
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
            className="w-full bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-lg p-2.5 text-sm text-steel-900 dark:text-steel-100 placeholder-steel-400 focus:outline-none focus:border-primary-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReplyingToId(null)}
              className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
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

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center text-steel-500 dark:text-steel-400 space-y-3">
        <p className="text-sm font-semibold text-steel-800 dark:text-steel-200">Thread not found</p>
        <Link
          to={`/forums/${slug || 'issues-and-open-questions'}`}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-block font-medium"
        >
          Return to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <Link to="/forums" className="hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
          Forums
        </Link>
        <span>/</span>
        <Link to={`/forums/${thread.forum.slug}`} className="hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
          {thread.forum.name}
        </Link>
      </div>

      {/* Main Thread Card (document) */}
      <div className="app-panel p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{thread.title}</h1>
          <TTSButton text={`${thread.title}. ${thread.body}`} label="Read Thread" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Avatar name={thread.author.name} avatar={thread.author.avatar} size="md" />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{thread.author.name}</span>
            <span className="ml-1">{formatDateTime(thread.createdAt)}</span>
          </div>
        </div>
        <div className="mt-4">
          <MarkdownRenderer content={thread.body} />
        </div>
      </div>

      {/* Reply Form (document) — new root comment */}
      <form onSubmit={(e) => handlePostComment(e, null)} className="app-panel p-3 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Add a comment</h3>
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
          className="w-full resize-none rounded border border-steel-200 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-100 p-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white text-steel-800"
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
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Comments ({comments.length})</h2>
      {comments.length === 0 ? (
        <div className="app-panel p-6 text-center text-sm text-gray-400 dark:text-gray-500">
          <p className="font-medium text-gray-600 dark:text-gray-300">No comments</p>
          <p className="mt-1">Be the first to comment on this thread.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootComments.map((comment) => (
            <div key={comment.id} className="app-panel p-3">
              <CommentBody comment={comment} nested={false} />

              {/* Threaded replies */}
              {childComments(comment.id).length > 0 && (
                <div className="ml-9 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
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
