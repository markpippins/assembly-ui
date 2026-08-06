import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
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
            className="app-panel p-4 space-y-3 hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={a.outcome} />
                <span className="text-sm font-mono text-indigo-600 dark:text-indigo-300">
                  Confidence: {a.confidence ? `${(a.confidence * 100).toFixed(0)}%` : 'N/A'}
                </span>
              </div>
              <Link to={`/assessments/${a.id}`} className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">{a.id}</Link>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-white font-poppins">Assessment for Observation: {a.observationId}</h2>
            {a.analysisDetail && <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">{a.analysisDetail}</p>}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-sm font-mono text-slate-500 dark:text-slate-400">
              <span>
                <span className="mr-3">Agenda Ref: {a.agendaId || 'N/A'}</span>
                <span>{formatDateTime(a.createdAt)}</span>
              </span>
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
