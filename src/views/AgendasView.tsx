import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, BarChart } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { dataService } from '../services/dataService';
import { Agenda } from '../types';

export const AgendasView: React.FC = () => {
  const [agendas, setAgendas] = useState<Agenda[]>([]);

  useEffect(() => {
    setAgendas(dataService.getAgendas());
  }, []);

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
            className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={agenda.status} />
                <span className="font-mono text-[10px] text-slate-400">{agenda.id}</span>
              </div>
              <h2 className="text-base font-bold text-white font-poppins">{agenda.title}</h2>
              <p className="text-xs text-slate-300 font-medium">Scope: {agenda.scope || 'General'}</p>
              {agenda.plannerAnalysis && (
                <p className="text-xs text-slate-400 line-clamp-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  {agenda.plannerAnalysis}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono text-indigo-300">
                <BarChart className="w-3.5 h-3.5" />
                <span>Cohesion: {agenda.cohesionScore ? `${(agenda.cohesionScore * 100).toFixed(0)}%` : 'N/A'}</span>
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
