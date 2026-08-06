import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCode, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { SpecItem } from '../types';

export const SpecsView: React.FC = () => {
  const [specs, setSpecs] = useState<SpecItem[]>([]);

  useEffect(() => {
    setSpecs(dataService.getSpecs());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Spec Items"
        subtitle="Individual specification items, decisions, supporting refs, and inclusion flags"
        ttsContent="Specification items overview."
      />

      <div className="space-y-4">
        {specs.map((item) => (
          <div key={item.id} className="app-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                  {item.sourceType || 'SPEC'}
                </span>
                {item.included && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Included
                  </span>
                )}
              </div>
              <Link to={`/specs/${item.id}`} className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">{item.id}</Link>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-white font-poppins">{item.title}</h2>
            {item.body && <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">{item.body}</p>}

            {item.plannerNote && (
              <p className="text-sm text-amber-700 dark:text-amber-300/90 italic bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
                Planner Note: {item.plannerNote}
              </p>
            )}

            <div className="pt-2 flex justify-between items-center text-sm font-mono text-slate-500 dark:text-slate-400">
              <span>
                <span className="mr-3">Agenda Title: {item.agendaTitle || 'N/A'}</span>
                <span>{formatDateTime(item.createdAt)}</span>
              </span>
              <Link to={`/specs/${item.id}`} className="text-indigo-400 hover:underline flex items-center gap-1">
                <span>Inspect Spec</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
