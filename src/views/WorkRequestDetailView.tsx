import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, CheckSquare, Calendar, User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge, entityLabel } from '../utils/idFormat';
import { WorkRequest } from '../types';

export const WorkRequestDetailView: React.FC = () => {
 const { version } = useLiveData();
 const { id } = useParams<{ id: string }>();
 const [wr, setWr] = useState<WorkRequest | null>(null);

 useEffect(() => {
 if (id) {
 const item = dataService.getWorkRequest(id);
 if (item) setWr(item);
 }
 }, [id, version]);

 if (!wr) {
 return (
 <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
 <p>Work Request not found</p>
 <Link to="/work-requests" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
 Return to Work Requests
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <Link to="/work-requests" className="hover:text-indigo-400 flex items-center gap-1">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Work Requests</span>
 </Link>
 <span>/</span>
 <Link to={`/work-requests/${wr.id}`} className="text-slate-900 font-mono hover:text-indigo-600 :text-indigo-400 hover:underline">{idBadge(wr.id)}</Link>
 </div>

 <PageHeader
 title={wr.title}
 subtitle={<>ID: <Link to={`/work-requests/${wr.id}`} className="text-indigo-600 hover:underline font-mono">{idBadge(wr.id)}</Link></>}
 ttsContent={`Work Request ${wr.title}. Status ${wr.status}. Intent: ${wr.intent || 'None'}.`}
 action={<StatusBadge status={wr.status} size="md" />}
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="md:col-span-2 space-y-6">
 <div className="app-panel p-4 space-y-3">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Description</h3>
 <MarkdownRenderer content={wr.description || 'No detailed description provided.'} />
 </div>

 <div className="app-panel p-4 space-y-3">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Context & Constraints</h3>
 <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm text-indigo-600 overflow-x-auto border border-slate-700/60">
 <pre>{JSON.stringify({ context: wr.context, constraints: wr.constraints }, null, 2)}</pre>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <div className="app-panel p-4 space-y-4">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-700 pb-2">
 Metadata
 </h3>
 <div className="space-y-3 text-sm">
 <div>
 <span className="text-slate-400 block text-[11px]">Intent</span>
 <MarkdownRenderer content={wr.intent || 'N/A'} />
 </div>

 <div>
 <span className="text-slate-400 block text-[11px]">Created By</span>
 <span className="text-slate-800 font-medium">{wr.createdBy || 'System'}</span>
 </div>

 <div>
 <span className="text-slate-400 block text-[11px]">Created Date</span>
 <span className="text-slate-200 font-mono text-[11px]">{formatDateTime(wr.createdAt)}</span>
 </div>

 {wr.sourceSpecificationId && (
 <div>
 <span className="text-slate-400 block text-[11px]">Source Specification</span>
 <Link to={`/specifications/${wr.sourceSpecificationId}`} className="text-indigo-400 hover:underline font-medium">
 {entityLabel(wr.sourceSpecificationId, 'specification')}
 </Link>
 </div>
 )}

 {wr.sourceRequirementId && (
 <div>
 <span className="text-slate-400 block text-[11px]">Source Requirement</span>
 <Link to={`/requirements/${wr.sourceRequirementId}`} className="text-indigo-400 hover:underline font-medium">
 {entityLabel(wr.sourceRequirementId, 'requirement')}
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
