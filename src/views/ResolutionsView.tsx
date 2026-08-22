import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { OpenQuestion } from '../types';

export const ResolutionsView: React.FC = () => {
 const { version } = useLiveData();
 const [resolved, setResolved] = useState<OpenQuestion[]>([]);

 useEffect(() => {
 setResolved(dataService.getOpenQuestions(true));
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Question Resolutions"
 subtitle="Catalog of resolved architectural trade-offs and answered decisions"
 ttsContent="Resolved open questions archive."
 />

 <div className="space-y-4">
 {resolved.length === 0 ? (
 <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-400">
 <p className="text-sm font-medium">No resolved questions logged yet.</p>
 </div>
 ) : (
 resolved.map((q) => (
 <div
 key={q.id}
 className="app-panel p-4 space-y-3 hover:border-slate-600 transition-all"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ">
 <Check className="w-3 h-3" />
 RESOLVED
 </span>
 <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 ">
 {q.category}
 </span>
 </div>
 <Link to={`/open-questions/${q.id}`} className="font-mono text-[11px] text-indigo-600 hover:underline">{q.id}</Link>
 </div>

 <h2 className="text-base font-bold text-slate-900 font-poppins">{q.title}</h2>
 {q.description && <p className="text-sm text-slate-700 ">{q.description}</p>}

 <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-mono text-slate-500 ">
 <span>
 <span className="mr-3">Created {formatDateTime(q.createdAt)}</span>
 <span className="mr-3">Answered by {q.answeredBy || 'Architect'}</span>
 {q.answeredAt && <span>{formatDateTime(q.answeredAt)}</span>}
 </span>
 <Link
 to={`/open-questions/${q.id}`}
 className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium"
 >
 <span>Review Resolution</span>
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
