import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge, entityLabel } from '../utils/idFormat';
import { Specification } from '../types';

export const SpecificationsView: React.FC = () => {
 const { version } = useLiveData();
 const [specs, setSpecs] = useState<Specification[]>([]);

 useEffect(() => {
 setSpecs(dataService.getSpecifications());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Specifications"
 subtitle="Versioned system specifications, revision histories, and item snapshots"
 ttsContent="Versioned specifications catalog."
 />

 <div className="space-y-4">
 {specs.map((spec) => (
 <div key={spec.id} className="app-panel p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="font-mono text-sm font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 ">
 Revision #{spec.revisionNumber} ({spec.revisionType})
 </span>
 </div>
 <Link to={`/specifications/${spec.id}`} className="font-mono text-[11px] text-indigo-600 hover:underline">{idBadge(spec.id)}</Link>
 </div>

 <h2 className="text-base font-bold text-slate-900 font-poppins">Specification for Agenda: <Link to={`/agendas/${spec.agendaId}`} className="text-indigo-600 hover:underline">{entityLabel(spec.agendaId, 'agenda')}</Link></h2>
 <p className="text-sm text-slate-700 ">{spec.changeSummary}</p>

 <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-mono text-slate-500 ">
 <span>
 <span className="mr-3">Valid From: {formatDateTime(spec.validFrom)}</span>
 <span>Created: {formatDateTime(spec.createdAt)}</span>
 </span>
 <Link to={`/specifications/${spec.id}`} className="text-indigo-400 hover:underline flex items-center gap-1">
 <span>View Snapshot</span>
 <ChevronRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
