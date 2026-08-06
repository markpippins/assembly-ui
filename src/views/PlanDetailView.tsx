import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckSquare, FileText } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { Plan } from '../types';

export const PlanDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (id) {
      const item = dataService.getPlan(id);
      if (item) setPlan(item);
    }
  }, [id]);

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
        <p>Plan not found</p>
        <Link to="/plans" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
          Return to Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/plans" className="hover:text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Plans</span>
        </Link>
        <span>/</span>
        <Link to={`/plans/${plan.id}`} className="text-slate-900 dark:text-white font-mono hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">{plan.id}</Link>
      </div>

      <PageHeader
        title={plan.title}
        subtitle={`Project: ${plan.project} • File: ${plan.fileName}`}
        ttsContent={`Plan ${plan.title}. Goal: ${plan.goal}. Content: ${plan.content}`}
        action={<StatusBadge status={plan.status} size="md" />}
      />

      <div className="app-panel p-4 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Goal</h3>
          <MarkdownRenderer content={plan.goal || ''} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Acceptance Criteria</h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
            {plan.acceptanceCriteria}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Content Markdown</h3>
          <MarkdownRenderer content={plan.content || ''} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm font-mono border-t border-slate-200 dark:border-slate-700/60 pt-4">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Files Affected</span>
            <span className="text-indigo-600 dark:text-indigo-300 font-bold">{plan.filesAffected}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Prompt Reference</span>
            <span className="text-slate-700 dark:text-slate-200">{plan.promptRef}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Created</span>
            <span className="text-slate-700 dark:text-slate-200">{plan.createdAt ? formatDateTime(plan.createdAt) : '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Updated</span>
            <span className="text-slate-700 dark:text-slate-200">{plan.updatedAt ? formatDateTime(plan.updatedAt) : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
