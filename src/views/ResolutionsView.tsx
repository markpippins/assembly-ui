import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { OpenQuestion } from '../types';

export const ResolutionsView: React.FC = () => {
  const [resolved, setResolved] = useState<OpenQuestion[]>([]);

  useEffect(() => {
    setResolved(dataService.getOpenQuestions(true));
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Question Resolutions"
        subtitle="Catalog of resolved architectural trade-offs and answered decisions"
        ttsContent="Resolved open questions archive."
      />

      <div className="space-y-4">
        {resolved.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No resolved questions logged yet.</p>
          </div>
        ) : (
          resolved.map((q) => (
            <div
              key={q.id}
              className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-600 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Check className="w-3 h-3" />
                    RESOLVED
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                    {q.category}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">{q.id}</span>
              </div>

              <h2 className="text-base font-bold text-white font-poppins">{q.title}</h2>
              {q.description && <p className="text-xs text-slate-300">{q.description}</p>}

              <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Answered by {q.answeredBy || 'Architect'}</span>
                <Link
                  to={`/open-questions/${q.id}`}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium"
                >
                  <span>Review Resolution</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
