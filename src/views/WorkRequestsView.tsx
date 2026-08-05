import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight, Filter } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { WorkRequest } from '../types';

export const WorkRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    setRequests(dataService.getWorkRequests());
  }, []);

  const filtered = requests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status.toUpperCase() === filterStatus;
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Work Requests"
        subtitle="Operational tasks, feature implementation requests, and automated agent jobs"
        ttsContent="Work requests catalog listing all active and completed tasks."
      >
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </PageHeader>

      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-semibold">ID / Title</th>
                <th className="py-3 px-4 font-semibold">Intent</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created By</th>
                <th className="py-3 px-4 font-semibold">Created Date</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.map((wr) => (
                <tr key={wr.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <Link to={`/work-requests/${wr.id}`} className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                        {wr.title}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{wr.id}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{wr.intent || '—'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={wr.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{wr.createdBy || 'System'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {new Date(wr.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/work-requests/${wr.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                    >
                      <span>View</span>
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
