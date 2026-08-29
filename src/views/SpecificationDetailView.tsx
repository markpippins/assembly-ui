import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { idBadge, entityLabel } from '../utils/idFormat';
import { Specification } from '../types';

export const SpecificationDetailView: React.FC = () => {
 const { version } = useLiveData();
 const { id } = useParams<{ id: string }>();
 const [spec, setSpec] = useState<Specification | null>(null);

 useEffect(() => {
 if (id) {
 const item = dataService.getSpecification(id);
 if (item) setSpec(item);
 }
 }, [id, version]);

 if (!spec) {
 return (
 <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
 <p>Specification not found</p>
 <Link to="/specifications" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
 Return to Specifications
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <Link to="/specifications" className="hover:text-indigo-400 flex items-center gap-1">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Specifications</span>
 </Link>
 <span>/</span>
 <Link to={`/specifications/${spec.id}`} className="text-slate-900 font-mono hover:text-indigo-600 :text-indigo-400 hover:underline">{idBadge(spec.id)}</Link>
 </div>

 <PageHeader
 title={<>Specification <Link to={`/specifications/${spec.id}`} className="text-indigo-600 hover:underline font-mono">{idBadge(spec.id)}</Link></>}
 subtitle={`Revision ${spec.revisionNumber} (${spec.revisionType})`}
 ttsContent={`Specification ${spec.id}. ${spec.changeSummary || ''}`}
 />

 <div className="app-panel p-4 space-y-4">
 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">Change Summary</h3>
 <p className="text-sm text-slate-700 leading-relaxed">{spec.changeSummary}</p>

 <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-sm font-mono">
 <div>
 <span className="text-slate-500 block text-[11px]">Valid From</span>
 <span className="text-slate-700 ">{spec.validFrom ? formatDateTime(spec.validFrom) : '—'}</span>
 </div>
 <div>
 <span className="text-slate-500 block text-[11px]">Valid Until</span>
 <span className="text-slate-700 ">{spec.validUntil ? formatDateTime(spec.validUntil) : '—'}</span>
 </div>
 <div>
 <span className="text-slate-500 block text-[11px]">Created</span>
 <span className="text-slate-700 ">{spec.createdAt ? formatDateTime(spec.createdAt) : '—'}</span>
 </div>
 </div>

 {spec.derivedFrom && spec.derivedFrom.length > 0 && (
 <div className="pt-3 border-t border-slate-200 ">
 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono mb-2">Derived From</h3>
 <ul className="space-y-1">
 {spec.derivedFrom.map((source) => (
 <li key={source} className="text-sm font-mono text-slate-600 "><Link to={`/specifications/${source}`} className="text-indigo-600 hover:underline">{entityLabel(source, 'specification')}</Link></li>
 ))}
 </ul>
 </div>
 )}

 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono pt-3 border-t border-slate-200 ">
 Item Snapshot Data
 </h3>
 <div className="bg-slate-50 p-4 font-mono text-sm text-slate-700 overflow-x-auto border border-slate-200 ">
 <pre>{JSON.stringify(spec.itemSnapshot, null, 2)}</pre>
 </div>
 </div>
 </div>
 );
};
