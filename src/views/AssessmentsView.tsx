import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { Assessment } from '../types';

export const AssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    setAssessments(dataService.getAssessments());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Impact Assessments"
        subtitle="Automated impact analyses, outcome assessments, and evaluation metrics"
        ttsContent="Impact assessments catalog."
      />

      <div className="space-y-4">
        {assessments.map((a) => (
          <div
            key={a.id}
            className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={a.outcome} />
                <span className="text-xs font-mono text-indigo-300">
                  Confidence: {a.confidence ? `${(a.confidence * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{a.id}</span>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">Assessment for Observation: {a.observationId}</h2>
            {a.analysisDetail && <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">{a.analysisDetail}</p>}

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Agenda Ref: {a.agendaId || 'N/A'}</span>
              <Link
                to={`/assessments/${a.id}`}
                className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
              >
                <span>View Full Impact</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
