import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, BarChart } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge } from '../utils/idFormat';
import { Agenda } from '../types';

export const AgendasView: React.FC = () => {
 const { version } = useLiveData();
 const [agendas, setAgendas] = useState<Agenda[]>([]);

 useEffect(() => {
 setAgendas(dataService.getAgendas());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Agendas & Planning"
 subtitle="Cohesion analysis, gap assessments, and high-level project goals"
 ttsContent="Agendas and planning workspace."
 />

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {agendas.map((agenda) => (
 <div
 key={agenda.id}
 className="app-panel p-4 space-y-4 flex flex-col justify-between"
 >
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <StatusBadge status={agenda.status} />
 <Link to={`/agendas/${agenda.id}`} className="font-mono text-[10px] text-indigo-600 hover:underline">{idBadge(agenda.id)}</Link>
 </div>
 <h2 className="text-base font-bold text-slate-900 font-poppins">{agenda.title}</h2>
 <p className="text-sm text-slate-700 font-medium">Scope: {agenda.scope || 'General'}</p>
 {agenda.plannerAnalysis && (
 <p className="text-sm text-slate-500 line-clamp-3 bg-slate-50 p-3 border border-slate-200 ">
 {agenda.plannerAnalysis}
 </p>
 )}
 </div>

 <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
 <div className="flex items-center gap-3 font-mono text-slate-500 ">
 <span className="flex items-center gap-1.5">
 <BarChart className="w-3.5 h-3.5 text-indigo-500 " />
 Cohesion: {agenda.cohesionScore ? `${(agenda.cohesionScore * 100).toFixed(0)}%` : 'N/A'}
 </span>
 <span>{agenda.sourceCount ?? 0} sources</span>
 <span>{formatDateTime(agenda.createdAt)}</span>
 </div>
 <Link
 to={`/agendas/${agenda.id}`}
 className="inline-flex items-center gap-1 text-indigo-400 hover:underline font-medium"
 >
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
