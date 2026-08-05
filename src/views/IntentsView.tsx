import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ChevronRight, Tag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { IntentRecord } from '../types';

export const IntentsView: React.FC = () => {
  const [intents, setIntents] = useState<IntentRecord[]>([]);

  useEffect(() => {
    setIntents(dataService.getIntents());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Intent Records"
        subtitle="Captured architectural intents, high-level objectives, and implementation goals"
        ttsContent="Intent records catalog."
      />

      <div className="space-y-4">
        {intents.map((intent) => (
          <div
            key={intent.id}
            className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={intent.status} />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Source: {intent.sourceType || 'SPECIFICATION'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{intent.id}</span>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">{intent.title}</h2>
            {intent.description && <p className="text-xs text-slate-300">{intent.description}</p>}

            {intent.tags && intent.tags.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {intent.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Source Ref: {intent.sourceRef || 'N/A'}</span>
              <Link
                to={`/intents/${intent.id}`}
                className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
              >
                <span>Inspect Intent</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
