import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-down';
import { Link as RouterLink } from 'react-router-dom';
import { Users, ChevronRight, Code2, Tag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { Candidate } from '../types';

export const CandidatesView: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    setCandidates(dataService.getCandidates());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Implementation Candidates"
        subtitle="Harvested code proposals, readiness metrics, and feature candidates"
        ttsContent="Implementation candidates overview."
      />

      <div className="space-y-4">
        {candidates.map((cand) => (
          <div
            key={cand.id}
            className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-600 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={cand.status} />
                <span className="font-mono text-xs text-slate-400">{cand.id}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-indigo-300">
                <span>Readiness:</span>
                <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(cand.compilationReadiness || 0.8) * 100}%` }}
                  />
                </div>
                <span>{((cand.compilationReadiness || 0.8) * 100).toFixed(0)}%</span>
              </div>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">{cand.title}</h2>
            {cand.intentDescription && (
              <p className="text-xs text-slate-300 leading-relaxed">{cand.intentDescription}</p>
            )}

            {cand.tags && cand.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {cand.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-700"
                  >
                    <Tag className="w-2.5 h-2.5 text-indigo-400" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Harvest Source: {cand.harvestSourceFilename || 'N/A'}
              </span>
              <RouterLink
                to={`/candidates/${cand.id}`}
                className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
              >
                <span>View Candidate</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </RouterLink>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
