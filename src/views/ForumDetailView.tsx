import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare, Plus, ArrowLeft, Eye, Clock, X, Send, MessagesSquare } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Forum, Thread } from '../types';

export const ForumDetailView: React.FC<{ slug?: string }> = ({ slug: slugProp }) => {
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
      // In live mode, threads are loaded async, so re-check after a delay
      const isLiveMode = (import.meta.env.ASSEMBLY_MODE || 'mock') === 'live';
      if (isLiveMode && threads.length === 0) {
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
  }, [slug]);

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
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/forums" className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Forums</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">{forumName}</span>
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
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/forums/${slug || thread.forum.slug}/${thread.id}`}
              className="group block bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 rounded-xl p-4 transition-all shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar name={thread.author.name} avatar={thread.author.avatar} size="md" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-600 dark:text-indigo-300 transition-colors font-poppins">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{thread.body}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1 font-mono">
                      <span>By {thread.author.name}</span>
                      <span>•</span>
                      <span>{formatDateTime(thread.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 shrink-0 font-mono">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>{thread.replyCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{thread.viewCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-poppins">New Discussion Thread</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label htmlFor="fd-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Thread Title</label>
                <input
                  id="fd-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your question or topic..."
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>

              <div>
                <label htmlFor="fd-body" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Content / Details</label>
                <textarea
                  id="fd-body"
                  rows={5}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Provide complete context..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
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
