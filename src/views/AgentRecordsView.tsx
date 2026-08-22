import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChevronRight, Tag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { AgentRecord } from '../types';

export const AgentRecordsView: React.FC = () => {
 const { version } = useLiveData();
 const [records, setRecords] = useState<AgentRecord[]>([]);

 useEffect(() => {
 setRecords(dataService.getAgentRecords());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Agent Records & Logs"
 subtitle="Autonomous agent execution logs, decision records, and progress notes"
 ttsContent="Agent execution records and audit logs."
 />

 <div className="space-y-4">
 {records.map((rec) => (
 <div key={rec.id} className="app-panel p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-mono text-sm font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/30">
 {rec.role || 'Agent'}
 </span>
 <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 ">
 Type: {rec.recordType || 'LOG'}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <TTSButton text={`${rec.title || ''}. ${rec.content || ''}`} label="Read Record" />
 <Link to={`/agent-records/${rec.id}`} className="font-mono text-[11px] text-indigo-600 hover:underline">{rec.id}</Link>
 </div>
 </div>

 <h2 className="text-base font-bold text-slate-900 font-poppins">{rec.title}</h2>
 <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200 ">
 {rec.content}
 </p>

 {rec.tags && rec.tags.length > 0 && (
 <div className="flex items-center gap-1.5 pt-1">
 {rec.tags.map((t) => (
 <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200 ">
 #{t}
 </span>
 ))}
 </div>
 )}

 <div className="pt-2 flex justify-between items-center text-sm font-mono text-slate-500 ">
 <span>
 <span className="mr-3">Path: {rec.sourcePath || 'N/A'}</span>
 <span>{formatDateTime(rec.createdAt)}</span>
 </span>
 <Link to={`/agent-records/${rec.id}`} className="text-indigo-400 hover:underline flex items-center gap-1">
 <span>Inspect Record</span>
 <ChevronRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
