import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, CornerDownRight, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';
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
    if (threadId) {
      const res = dataService.getThread(threadId);
      if (res.thread) setThread(res.thread);
      setComments(res.comments);
    }
  };

  useEffect(() => {
    loadData();
  }, [threadId]);

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

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center text-slate-500 dark:text-slate-400 space-y-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thread not found</p>
        <Link
          to={`/forums/${slug || 'issues-and-open-questions'}`}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-block font-medium"
        >
          Return to Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to={`/forums/${thread.forum.slug}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{thread.forum.name}</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-md">{thread.title}</span>
      </div>

      {/* Main Thread Card */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={thread.author.name} avatar={thread.author.avatar} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-poppins">{thread.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Posted by <span className="text-slate-700 dark:text-slate-200 font-semibold">{thread.author.name}</span> on{' '}
                {new Date(thread.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <TTSButton text={`${thread.title}. ${thread.body}`} label="Read Thread" />
        </div>

        <div className="prose dark:prose-invert max-w-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
          {thread.body}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>{thread.replyCount} replies</span>
          <span>{thread.viewCount} views</span>
        </div>
      </div>

      {/* Reply Form */}
      <form onSubmit={(e) => handlePostComment(e, null)} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl p-4 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">Post a Reply</h3>
        <textarea
          value={replyingToId === null ? replyText : ''}
          onChange={(e) => {
            setReplyingToId(null);
            setReplyText(e.target.value);
          }}
          placeholder="Write your constructive response..."
          rows={3}
          className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!replyText.trim() || replyingToId !== null}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Reply</span>
          </button>
        </div>
      </form>

      {/* Comments / Replies List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Discussion ({comments.length})</h3>

        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-2 shadow-xs ${
              comment.parentId ? 'ml-6 border-l-2 border-l-indigo-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar name={comment.author.name} avatar={comment.author.avatar} size="sm" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{comment.author.name}</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <TTSButton text={comment.body} label="Read" />
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line pl-8">{comment.body}</p>

            <div className="pl-8 pt-1">
              <button
                onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>

            {/* Nested Reply Form */}
            {replyingToId === comment.id && (
              <form onSubmit={(e) => handlePostComment(e, comment.id)} className="mt-3 ml-8 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Replying to ${comment.author.name}...`}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReplyingToId(null)}
                    className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                  >
                    Send Reply
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
