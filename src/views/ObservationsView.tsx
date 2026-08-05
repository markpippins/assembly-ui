import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ChevronRight, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';
import { Observation } from '../types';

export const ObservationsView: React.FC = () => {
  const [observations, setObservations] = useState<Observation[]>([]);

  useEffect(() => {
    setObservations(dataService.getObservations());
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="System Observations"
        subtitle="Telemetry events, automated triggers, and workspace state captures"
        ttsContent="System observations workspace."
      />

      <div className="space-y-4">
        {observations.map((obs) => (
          <div key={obs.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  {obs.triggerType}
                </span>
                {obs.assessed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Assessed
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-400">{obs.id}</span>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-700/60">
              <pre>{JSON.stringify(obs.payload, null, 2)}</pre>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Artifact: {obs.sourceArtifactId || 'N/A'}</span>
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
