import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, ChevronRight, FileCode2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge } from '../utils/idFormat';
import { Plan } from '../types';

export const PlansView: React.FC = () => {
 const { version } = useLiveData();
 const [plans, setPlans] = useState<Plan[]>([]);

 useEffect(() => {
 setPlans(dataService.getPlans());
 }, [version]);

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Implementation Plans"
 subtitle="Conduit plans, acceptance criteria, prompt references, and affected files"
 ttsContent="Implementation plans catalog."
 />

 <div className="space-y-4">
 {plans.map((plan, planIdx) => (
 <div key={plan.id ?? `plan-${planIdx}`} className="app-panel p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <StatusBadge status={plan.status} />
 <span className="font-mono text-sm text-indigo-600 font-bold">{plan.project}</span>
 </div>
 <Link to={`/plans/${plan.id}`} className="font-mono text-[11px] text-indigo-600 hover:underline">{idBadge(plan.id)}</Link>
 </div>

 <h2 className="text-base font-bold text-slate-900 font-poppins">{plan.title}</h2>
 <p className="text-sm text-slate-700 font-medium">Goal: {plan.goal}</p>

 <div className="bg-slate-50 p-3 border border-slate-200 text-sm font-mono text-slate-700 ">
 Files Affected: <span className="text-indigo-600 ">{plan.filesAffected}</span>
 </div>

 <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-mono text-slate-500 ">
 <span>
 <span className="mr-3">File: {plan.fileName}</span>
 <span>Updated: {formatDateTime(plan.updatedAt)}</span>
 </span>
 {plan.id ? (
 <Link to={`/plans/${plan.id}`} className="text-indigo-400 hover:underline flex items-center gap-1 font-medium">
 <span>Plan Specs</span>
 <ChevronRight className="w-3.5 h-3.5" />
 </Link>
 ) : (
 <span className="text-slate-400 text-xs">No plan id</span>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};
