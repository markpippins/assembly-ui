import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge, entityLabel } from '../utils/idFormat';
import { Observation } from '../types';

/** Compact single-line payload summary (mirrors Angular payloadSummary). */
function payloadSummary(payload: Record<string, unknown> | null): string {
 if (!payload) return '—';
 try {
 const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
 if (str.length > 120) return str.slice(0, 120) + '...';
 return str;
 } catch {
 return '—';
 }
}

export const ObservationsView: React.FC = () => {
 const { version } = useLiveData();
 const [observations, setObservations] = useState<Observation[]>([]);

 useEffect(() => {
 setObservations(dataService.getObservations());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="System Observations"
 subtitle="Telemetry events, automated triggers, and workspace state captures"
 ttsContent="System observations workspace."
 />

 <div className="space-y-4">
 {observations.map((obs) => (
 <div key={obs.id} className="app-panel p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-mono text-sm font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 border border-sky-500/30">
 {obs.triggerType}
 </span>
 {obs.assessed && (
 <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
 <Check className="w-3 h-3" /> Assessed
 </span>
 )}
 </div>
 <Link to={`/observations/${obs.id}`} className="font-mono text-[11px] text-indigo-600 hover:underline">{idBadge(obs.id)}</Link>
 </div>

 <p className="bg-slate-50 px-3 py-2 rounded-lg font-mono text-xs text-slate-600 overflow-x-auto border border-slate-200 whitespace-pre-wrap break-words">
 {payloadSummary(obs.payload)}
 </p>

 <div className="pt-2 flex justify-between items-center text-sm font-mono text-slate-500 ">
 <span>
 <span className="mr-3">Artifact: {obs.sourceArtifactId ? <Link to={`/assessments/${obs.sourceArtifactId}`} className="text-indigo-600 hover:underline">{entityLabel(obs.sourceArtifactId, obs.sourceArtifactType || undefined)}</Link> : 'N/A'}</span>
 <span className="mr-3">Type: {obs.sourceArtifactType || '—'}</span>
 <span>{formatDateTime(obs.createdAt)}</span>
 </span>
 <Link to={`/observations/${obs.id}`} className="text-indigo-400 hover:underline flex items-center gap-1">
 <span>Inspect</span>
 <ChevronRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
