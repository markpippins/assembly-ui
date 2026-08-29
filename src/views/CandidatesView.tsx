import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Users, ChevronRight, Code2, Tag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge } from '../utils/idFormat';
import { Candidate } from '../types';

export const CandidatesView: React.FC = () => {
 const { version } = useLiveData();
 const [candidates, setCandidates] = useState<Candidate[]>([]);

 useEffect(() => {
 setCandidates(dataService.getCandidates());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Implementation Candidates"
 subtitle="Harvested code proposals, readiness metrics, and feature candidates"
 ttsContent="Implementation candidates overview."
 />

 <div className="space-y-4">
 {candidates.map((cand) => (
 <div
 key={cand.id}
 className="app-panel p-4 space-y-3 hover:border-slate-600 transition-all"
 >
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <StatusBadge status={cand.status} />
 <RouterLink to={`/candidates/${cand.id}`} className="font-mono text-sm text-indigo-600 hover:underline">{idBadge(cand.id)}</RouterLink>
 </div>
 <div className="flex items-center gap-2 font-mono text-sm text-indigo-600 ">
 <span>Readiness:</span>
 <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
 <div
 className="h-full bg-emerald-500 rounded-full"
 style={{ width: `${(cand.compilationReadiness || 0.8) * 100}%` }}
 />
 </div>
 <span>{((cand.compilationReadiness || 0.8) * 100).toFixed(0)}%</span>
 </div>
 </div>

 <h2 className="text-base font-bold text-slate-900 font-poppins">{cand.title}</h2>
 {cand.intentDescription && (
 <p className="text-sm text-slate-700 leading-relaxed">{cand.intentDescription}</p>
 )}

 {cand.tags && cand.tags.length > 0 && (
 <div className="flex flex-wrap items-center gap-1.5 pt-1">
 {cand.tags.map((tag) => (
 <span
 key={tag}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-[10px] font-mono border border-slate-200 "
 >
 <Tag className="w-2.5 h-2.5 text-indigo-400" />
 {tag}
 </span>
 ))}
 </div>
 )}

 <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
 <span className="text-slate-400 font-mono text-[11px]">
 Harvest Source: {cand.harvestSourceFilename || 'N/A'} · {formatDateTime(cand.createdAt)}
 </span>
 <RouterLink
 to={`/candidates/${cand.id}`}
 className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
 >
 <span>View Candidate</span>
 <ChevronRight className="w-3.5 h-3.5" />
 </RouterLink>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
