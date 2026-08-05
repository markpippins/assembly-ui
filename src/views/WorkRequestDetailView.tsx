import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, CheckSquare, Calendar, User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';
import { WorkRequest } from '../types';

export const WorkRequestDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [wr, setWr] = useState<WorkRequest | null>(null);

  useEffect(() => {
    if (id) {
      const item = dataService.getWorkRequest(id);
      if (item) setWr(item);
    }
  }, [id]);

  if (!wr) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
        <p>Work Request not found</p>
        <Link to="/work-requests" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          Return to Work Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/work-requests" className="hover:text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Work Requests</span>
        </Link>
        <span>/</span>
        <span className="text-white font-mono">{wr.id}</span>
      </div>

      <PageHeader
        title={wr.title}
        subtitle={`ID: ${wr.id}`}
        ttsContent={`Work Request ${wr.title}. Status ${wr.status}. Intent: ${wr.intent || 'None'}.`}
        action={<StatusBadge status={wr.status} size="md" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Description</h3>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {wr.description || 'No detailed description provided.'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Context & Constraints</h3>
            <div className="bg-slate-900 p-4 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-700/60">
              <pre>{JSON.stringify({ context: wr.context, constraints: wr.constraints }, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-700 pb-2">
              Metadata
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Intent</span>
                <span className="text-white font-medium">{wr.intent || 'N/A'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Created By</span>
                <span className="text-white font-medium">{wr.createdBy || 'System'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Created Date</span>
                <span className="text-slate-200 font-mono text-[11px]">{new Date(wr.createdAt).toLocaleString()}</span>
              </div>

              {wr.sourceSpecificationId && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Source Specification</span>
                  <Link to={`/specifications/${wr.sourceSpecificationId}`} className="text-indigo-400 hover:underline font-mono">
                    {wr.sourceSpecificationId}
                  </Link>
                </div>
              )}

              {wr.sourceRequirementId && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Source Requirement</span>
                  <Link to={`/requirements/${wr.sourceRequirementId}`} className="text-indigo-400 hover:underline font-mono">
                    {wr.sourceRequirementId}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
