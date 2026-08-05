import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Plus, AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { OpenQuestion } from '../types';

export const OpenQuestionsView: React.FC = () => {
  const [questions, setQuestions] = useState<OpenQuestion[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DESIGN');
  const [blocking, setBlocking] = useState(false);
  const { showToast } = useToast();

  const loadQuestions = () => {
    setQuestions(dataService.getOpenQuestions(false));
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    dataService.createOpenQuestion({
      title: title.trim(),
      description: description.trim(),
      category,
      blocking,
    });
    setTitle('');
    setDescription('');
    setBlocking(false);
    setShowCreateModal(false);
    showToast('Open question logged successfully!', 'success');
    loadQuestions();
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Open Questions"
        subtitle="Unresolved architectural trade-offs, blockers, and clarification requests"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Question</span>
          </button>
        }
      />

      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 space-y-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">All questions resolved!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">No active open questions. Raise a question if needed.</p>
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={q.status} />
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                    {q.category}
                  </span>
                  {q.blocking && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40">
                      <AlertTriangle className="w-3 h-3" />
                      BLOCKING
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{q.id}</span>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white font-poppins">{q.title}</h2>
              {q.description && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{q.description}</p>}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>Raised by {q.createdBy || 'Contributor'}</span>
                <Link
                  to={`/open-questions/${q.id}`}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  <span>Answer / Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Question Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-poppins">Raise an Open Question</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Question Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="State the core decision or question..."
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Context</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the options, trade-offs, or missing information..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DESIGN">Design</option>
                    <option value="ARCHITECTURE">Architecture</option>
                    <option value="MISSING_INFO">Missing Information</option>
                    <option value="TECH_DEBT">Tech Debt</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={blocking}
                      onChange={(e) => setBlocking(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-rose-600 dark:text-rose-300">Mark as Blocking</span>
                  </label>
                </div>
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
                  Submit Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
