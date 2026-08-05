import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Database, Code, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { TTSButton } from '../components/TTSButton';
import { dataService } from '../services/dataService';

export const EntityDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [entityData, setEntityData] = useState<any>(null);
  const [entityType, setEntityType] = useState<string>('Entity');

  useEffect(() => {
    if (!id) return;

    const path = location.pathname;
    let data: any = null;
    let type = 'Entity';

    if (path.includes('/requirements')) {
      data = dataService.getRequirement(id);
      type = 'Requirement';
    } else if (path.includes('/agendas')) {
      data = dataService.getAgenda(id);
      type = 'Agenda';
    } else if (path.includes('/candidates')) {
      data = dataService.getCandidate(id);
      type = 'Candidate';
    } else if (path.includes('/harvests')) {
      data = dataService.getHarvest(id);
      type = 'Harvest';
    } else if (path.includes('/conversations')) {
      data = dataService.getConversation(id);
      type = 'Conversation';
    } else if (path.includes('/intents')) {
      data = dataService.getIntent(id);
      type = 'Intent';
    } else if (path.includes('/assessments')) {
      data = dataService.getAssessment(id);
      type = 'Assessment';
    } else if (path.includes('/observations')) {
      data = dataService.getObservation(id);
      type = 'Observation';
    } else if (path.includes('/agent-records') || path.includes('/reports')) {
      data = dataService.getAgentRecord(id);
      type = 'Agent Record';
    } else if (path.includes('/specs')) {
      data = dataService.getSpecItem(id);
      type = 'Spec Item';
    }

    setEntityData(data);
    setEntityType(type);
  }, [id, location]);

  if (!entityData) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
        <p>Entity details not found for ID: {id}</p>
        <Link to="/feed" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          Return to Activity Feed
        </Link>
      </div>
    );
  }

  const title = entityData.title || entityData.name || entityData.sourceFilename || `${entityType} ${id}`;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => window.history.back()} className="hover:text-indigo-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span>/</span>
        <span className="text-white font-mono">{id}</span>
      </div>

      <PageHeader
        title={title}
        subtitle={`Entity Inspector • Type: ${entityType}`}
        ttsContent={`${entityType} ${title}. ${entityData.description || entityData.content || ''}`}
      />

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <span className="font-mono text-xs font-bold text-indigo-300 uppercase">{entityType} Object Inspector</span>
          <span className="font-mono text-[11px] text-slate-400">ID: {entityData.id}</span>
        </div>

        {entityData.description && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Description</h3>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3.5 rounded-lg border border-slate-700/50">
              {entityData.description}
            </p>
          </div>
        )}

        {entityData.content && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">Content</h3>
            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-lg border border-slate-700/50 font-sans">
              {entityData.content}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Raw JSON Attribute Tree</h3>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-800 shadow-inner">
            <pre>{JSON.stringify(entityData, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
