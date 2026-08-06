import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { formatDateTime } from '../utils/format';
import { AgentRecord } from '../types';

export const ReportsView: React.FC = () => {
  const [reports, setReports] = useState<AgentRecord[]>([]);

  useEffect(() => {
    setReports(dataService.getAgentRecords('report'));
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Status Reports"
        subtitle="Formal milestone summaries, executive reports, and status rollups"
        ttsContent="Status reports overview."
      />

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No formal reports available.</p>
          </div>
        ) : (
          reports.map((rep) => (
            <div key={rep.id} className="app-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                  {rep.role || 'Report'}
                </span>
                <Link to={`/agent-records/${rep.id}`} className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">{rep.id}</Link>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white font-poppins">{rep.title}</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                {rep.content}
              </p>

              <div className="pt-2 flex justify-between items-center text-sm font-mono text-slate-500 dark:text-slate-400">
                <span>Created: {formatDateTime(rep.createdAt)}</span>
                <Link to={`/agent-records/${rep.id}`} className="text-indigo-400 hover:underline flex items-center gap-1">
                  <span>Full Report</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
