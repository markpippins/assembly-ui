import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, ChevronRight, AlertTriangle, HelpCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { Requirement } from '../types';

export const RequirementsView: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  useEffect(() => {
    setRequirements(dataService.getRequirements());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="System Requirements"
        subtitle="Functional and technical specifications, acceptance criteria, and resolution status"
        ttsContent="System requirements catalog."
      />

      <div className="app-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-semibold">ID / Title</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold">Open Questions</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <Link to={`/requirements/${req.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                        {req.title || 'Untitled Requirement'}
                      </Link>
                      <Link to={`/requirements/${req.id}`} className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">{req.id}</Link>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px] uppercase">{req.reqType || 'FUNCTIONAL'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.priority} type="priority" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {req.createdAt ? formatDateTime(req.createdAt) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="flex items-center gap-1 text-sky-400">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {req.questionCounts.openCount} open
                      </span>
                      {req.questionCounts.blockingCount > 0 && (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {req.questionCounts.blockingCount} blocking
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/requirements/${req.id}`}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-600 dark:text-indigo-300 font-medium"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
