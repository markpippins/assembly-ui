import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ArrowUpDown, ChevronRight, X, MessagesSquare } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { Forum } from '../types';

export const ForumsView: React.FC = () => {
  const [forums, setForums] = useState<Forum[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { showToast } = useToast();

  const loadForums = () => {
    setForums(dataService.getForums());
  };

  useEffect(() => {
    loadForums();
  }, []);

  const handleCreateForum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dataService.createForum({
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim(),
    });
    setName('');
    setDescription('');
    setShowCreateModal(false);
    showToast('Forum created successfully!', 'success');
    loadForums();
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Discussion Forums"
        subtitle="Categorized spaces for open questions, architectural decisions, and operational change logs"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Forum</span>
          </button>
        }
      />

      {/* Forum Cards */}
      {forums.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No Discussion Forums Created"
          description="Create structured forums to organize architectural proposals, technical queries, and work stream updates."
          actionLabel="Create First Forum"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forums.map((forum) => (
            <Link
              key={forum.id}
              to={`/forums/${forum.slug}`}
              className="group bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                    {forum.slug}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors font-poppins">
                  {forum.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{forum.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <div className="flex items-center gap-4">
                  <span>{forum.threadCount} threads</span>
                  <span>{forum.postCount} posts</span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-[11px]">Order #{forum.sortOrder}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Forum Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-poppins">Create New Forum</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateForum} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Forum Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Infrastructure & Telemetry"
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of forum scope..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Create Forum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
