import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { Specification } from '../types';

export const SpecificationsView: React.FC = () => {
  const [specs, setSpecs] = useState<Specification[]>([]);

  useEffect(() => {
    setSpecs(dataService.getSpecifications());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Specifications"
        subtitle="Versioned system specifications, revision histories, and item snapshots"
        ttsContent="Versioned specifications catalog."
      />

      <div className="space-y-4">
        {specs.map((spec) => (
          <div key={spec.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Revision #{spec.revisionNumber} ({spec.revisionType})
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">{spec.id}</span>
            </div>

            <h2 className="text-base font-bold text-white font-poppins">Specification for Agenda: {spec.agendaId}</h2>
            <p className="text-xs text-slate-300">{spec.changeSummary}</p>

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Valid From: {new Date(spec.validFrom).toLocaleDateString()}</span>
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
