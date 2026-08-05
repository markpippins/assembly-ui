import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, ChevronRight, FileCode2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { Plan } from '../types';

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    setPlans(dataService.getPlans());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Implementation Plans"
        subtitle="Conduit plans, acceptance criteria, prompt references, and affected files"
        ttsContent="Implementation plans catalog."
      />

      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={plan.status} />
                <span className="font-mono text-xs text-indigo-300 font-bold">{plan.project}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{plan.id}</span>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">{plan.title}</h2>
            <p className="text-xs text-slate-300 font-medium">Goal: {plan.goal}</p>

            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-xs font-mono text-slate-300">
              Files Affected: <span className="text-indigo-300">{plan.filesAffected}</span>
            </div>

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>File: {plan.fileName}</span>
              <Link to={`/plans/${plan.id}`} className="text-indigo-400 hover:underline flex items-center gap-1 font-medium">
                <span>Plan Specs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
