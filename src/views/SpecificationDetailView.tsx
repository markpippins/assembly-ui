import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { Specification } from '../types';

export const SpecificationDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [spec, setSpec] = useState<Specification | null>(null);

  useEffect(() => {
    if (id) {
      const item = dataService.getSpecification(id);
      if (item) setSpec(item);
    }
  }, [id]);

  if (!spec) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
        <p>Specification not found</p>
        <Link to="/specifications" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          Return to Specifications
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/specifications" className="hover:text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Specifications</span>
        </Link>
        <span>/</span>
        <span className="text-white font-mono">{spec.id}</span>
      </div>

      <PageHeader
        title={`Specification ${spec.id}`}
        subtitle={`Revision ${spec.revisionNumber} (${spec.revisionType})`}
        ttsContent={`Specification ${spec.id}. ${spec.changeSummary || ''}`}
      />

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Change Summary</h3>
        <p className="text-xs text-slate-200 leading-relaxed">{spec.changeSummary}</p>

        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono pt-3 border-t border-slate-700">
          Item Snapshot Data
        </h3>
        <div className="bg-slate-900 p-4 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-700/60">
          <pre>{JSON.stringify(spec.itemSnapshot, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
