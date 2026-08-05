import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCode, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
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
          <div key={item.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {item.sourceType || 'SPEC'}
                </span>
                {item.included && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Included
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-400">{item.id}</span>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">{item.title}</h2>
            {item.body && <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">{item.body}</p>}

            {item.plannerNote && (
              <p className="text-xs text-amber-300/90 italic bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20">
                Planner Note: {item.plannerNote}
              </p>
            )}

            <div className="pt-2 flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Agenda Title: {item.agendaTitle || 'N/A'}</span>
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
