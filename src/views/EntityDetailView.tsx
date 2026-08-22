import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Database, FileCode, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import * as api from '../services/apiClient';

// ── Entity route map (mirrors Angular utils/entity-route) ─────────────
const ENTITY_ROUTE_MAP: Record<string, string> = {
 work_request: 'work-requests',
 requirement: 'requirements',
 agenda: 'agendas',
 candidate: 'candidates',
 harvest: 'harvests',
 assessment: 'assessments',
 observation: 'observations',
 report: 'reports',
 agent_record: 'agent-records',
 agent: 'agents',
 specification: 'specifications',
 open_question: 'open-questions',
 open_questions: 'open-questions',
 forum: 'forums',
 plan: 'plans',
};

function entityRouteForType(type: string | null): string | null {
 if (!type) return null;
 return ENTITY_ROUTE_MAP[type] || type.replace(/_/g, '-');
}

// ── Metadata formatting (mirrors Angular entity-detail component) ─────
const METADATA_EXCLUDED_KEYS = new Set([
 'id', 'entityType', 'entityId',
 'docklang', // shown in dedicated DockLang toggle section
 'sourceText', // shown in dedicated Source Conversation section
 'candidates', // raw JSON — not useful in metadata table
 'metadata', // raw JSON — shows docklingVersion etc.
 'runMetadata', // raw JSON — empty or opaque
 'items', // agenda items array — rendered in dedicated Agenda Items panel
]);

function formatKey(key: string): string {
 return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

function formatDate(date: string): string {
 return formatDateTime(date);
}

function formatValue(value: unknown): string {
 if (value === null || value === undefined) return '—';
 if (typeof value === 'boolean') return value ? 'Yes' : 'No';
 if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
 return formatDate(value);
 }
 if (Array.isArray(value)) {
 if (!value.length) return '—';
 const formatted = value.map((item) => {
 if (typeof item === 'object' && item !== null) {
 const obj = item as Record<string, unknown>;
 return String(obj['title'] || obj['name'] || obj['label'] || obj['id'] || JSON.stringify(item));
 }
 return String(item);
 });
 return formatted.join(', ');
 }
 if (typeof value === 'object') return JSON.stringify(value, null, 2);
 return String(value);
}

function resolveEntityRoute(
 entity: Record<string, unknown>,
 rawKey: string,
 value: unknown
): string | null {
 if (!value || typeof value !== 'string' || !value.trim()) return null;
 const val = value.trim();

 if ((rawKey === 'sourceId' || rawKey === 'source_id')) {
 const sourceType = (entity['sourceType'] || entity['source_type']) as string | undefined;
 if (sourceType) {
 const route = entityRouteForType(sourceType);
 if (route) return `/${route}/${val}`;
 }
 }

 let stem = '';
 if (rawKey.endsWith('Id')) {
 stem = rawKey.slice(0, -2);
 } else if (rawKey.endsWith('_id')) {
 stem = rawKey.slice(0, -3);
 } else if (rawKey.endsWith('Ref')) {
 stem = rawKey.slice(0, -3);
 }

 if (stem) {
 let targetType = stem;
 if (targetType.startsWith('source') && targetType.length > 6) {
 targetType = targetType.slice(6);
 targetType = targetType.charAt(0).toLowerCase() + targetType.slice(1);
 } else if (targetType.startsWith('target') && targetType.length > 6) {
 targetType = targetType.slice(6);
 targetType = targetType.charAt(0).toLowerCase() + targetType.slice(1);
 }

 const normalized = targetType.replace(/([A-Z])/g, '_$1').toLowerCase();
 const route = entityRouteForType(normalized);
 if (route) return `/${route}/${val}`;
 }

 return null;
}

// ── DockLang → markdown (mirrors Angular docklangToMarkdown) ───────────
function docklangToMarkdown(docklang: Record<string, unknown> | null): string {
 if (!docklang) return '';
 const parts: string[] = [];

 // Meta section
 const meta = docklang['meta'] as Record<string, any> | undefined;
 if (meta) {
 if (meta['title']) parts.push(`# ${meta['title']}`);
 if (meta['model']) parts.push(`**Model:** ${meta['model']}`);
 if (meta['description']) parts.push(meta['description']);
 if (meta['date']) parts.push(`*Date: ${meta['date']}*`);
 if (meta['source_filename']) parts.push(`*File: ${meta['source_filename']}*`);
 parts.push('');
 }

 // Stats summary
 const stats = docklang['stats'] as Record<string, any> | undefined;
 if (stats) {
 parts.push('---');
 parts.push('');
 const totalBlocks = stats['total_blocks'] ?? stats['totalBlocks'] ?? '?';
 const totalUnits = stats['total_units'] ?? stats['totalUnits'] ?? (docklang['discourse_units'] as Array<any> | undefined)?.length ?? '?';
 parts.push(`> **Stats:** ${totalUnits} turns, ${totalBlocks} blocks`);
 const byTypeRaw = stats['by_type'] || stats['byType'];
 if (byTypeRaw && typeof byTypeRaw === 'object') {
 const breakdown = Object.entries(byTypeRaw as Record<string, number>)
 .map(([k, v]) => `${k}: ${v}`).join(', ');
 parts.push(`> ${breakdown}`);
 }
 parts.push('');
 }

 // Discourse units (turns with blocks)
 const units = (docklang['discourse_units'] || docklang['discourseUnits']) as Array<any> | undefined;
 if (units && Array.isArray(units)) {
 for (const unit of units) {
 if (unit.heading) {
 parts.push(`## ${unit.heading}`);
 } else if (unit.provenance?.role) {
 const role = String(unit.provenance.role);
 parts.push(`## ${role.charAt(0).toUpperCase() + role.slice(1)}`);
 }

 const blocks = unit.blocks as Array<any> | undefined;
 if (blocks && Array.isArray(blocks) && blocks.length > 0) {
 for (const block of blocks) {
 const blockType = block.type || 'paragraph';

 let textContent = '';
 if (typeof block.content === 'string') {
 textContent = block.content;
 } else if (block.content && typeof block.content === 'object') {
 textContent = block.content.text || block.content.code || block.content.content || '';
 } else if (typeof block.body === 'string') {
 textContent = block.body;
 } else if (typeof block.text === 'string') {
 textContent = block.text;
 }

 if (blockType === 'code') {
 const lang = block.language || (typeof block.content === 'object' ? block.content?.language : '') || '';
 parts.push('');
 parts.push(`\`\`\`${lang}\n${textContent}\n\`\`\``);
 parts.push('');
 } else if (blockType === 'diagram') {
 const fmt = block.format || 'mermaid';
 parts.push('');
 parts.push(`\`\`\`${fmt}\n${textContent}\n\`\`\``);
 parts.push('');
 } else if (blockType === 'quote') {
 const quoted = textContent.split('\n').map((line: string) => `> ${line}`).join('\n');
 parts.push(quoted + '\n');
 } else if (blockType === 'separator') {
 parts.push('---\n');
 } else if (blockType === 'list') {
 if (textContent) {
 parts.push(textContent + '\n');
 } else if (Array.isArray(block.items)) {
 parts.push(block.items.map((it: any) => `- ${it}`).join('\n') + '\n');
 }
 } else {
 if (textContent) {
 parts.push(textContent + '\n');
 }
 }
 }
 } else if (unit.body && typeof unit.body === 'string') {
 parts.push(unit.body + '\n');
 }
 parts.push('');
 }
 }

 if (parts.length === 0) {
 const allKeys = Object.keys(docklang);
 for (const key of allKeys) {
 if (['meta', 'stats', 'discourse_units', 'discourseUnits'].includes(key)) continue;
 const val = docklang[key];
 if (typeof val === 'string') {
 parts.push(`## ${key}`);
 parts.push(val);
 parts.push('');
 }
 }
 }

 return parts.join('\n').trim();
}

/** Docklang rendered as readable markdown — tries docklang field first,
 * then attempts to parse sourceText as docklang JSON if docklang is null. */
function harvestDockLangMarkdown(entity: Record<string, unknown>): string {
 const docklang = entity['docklang'];
 const sourceText = entity['sourceText'] || entity['source_text'];

 // Primary: convert docklang object to markdown
 if (docklang) {
 if (typeof docklang === 'object' && docklang !== null) {
 const md = docklangToMarkdown(docklang as Record<string, unknown>);
 if (md) return md;
 } else if (typeof docklang === 'string' && docklang.trim().startsWith('{')) {
 try {
 const parsed = JSON.parse(docklang);
 if (parsed && typeof parsed === 'object') {
 const md = docklangToMarkdown(parsed as Record<string, unknown>);
 if (md) return md;
 }
 } catch {
 // not valid json
 }
 }
 }

 // Fallback: try to parse sourceText as docklang JSON (some imports store
 // docklang data in sourceText when docklang field is null)
 if (sourceText && typeof sourceText === 'string' && sourceText.trim().startsWith('{')) {
 try {
 const parsed = JSON.parse(sourceText);
 if (parsed && typeof parsed === 'object') {
 const md = docklangToMarkdown(parsed as Record<string, unknown>);
 if (md) return md;
 }
 } catch {
 // Not valid JSON — fall through to raw sourceText
 }
 }

 // Last fallback: return sourceText as-is (the markdown renderer will handle it)
 return typeof sourceText === 'string' ? sourceText : '';
}

/** Extracts docklang JSON string from harvest entity for the DockLang toggle */
function harvestDockLang(entity: Record<string, unknown>): string {
 const docklang = entity['docklang'];
 if (!docklang) return '';
 try {
 return typeof docklang === 'string' ? docklang : JSON.stringify(docklang, null, 2);
 } catch {
 return String(docklang);
 }
}

/** Merges consecutive blocks by the same role into single-turn markdown sections */

// ── Agenda item helpers (mirrors Angular) ─────────────────────────────
function getItemTitle(item: Record<string, unknown>): string {
 return String(item['title'] || item['name'] || item['topic'] || 'Untitled Item');
}
function getItemSourceType(item: Record<string, unknown>): string {
 return String(item['sourceType'] || item['source_type'] || '');
}
function getItemSourceId(item: Record<string, unknown>): string {
 return String(item['sourceId'] || item['source_id'] || '');
}
function getItemBody(item: Record<string, unknown>): string {
 return String(item['body'] || item['description'] || item['summary'] || '');
}

export const EntityDetailView: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const location = useLocation();
 const { version } = useLiveData();
 const [entityData, setEntityData] = useState<any>(null);
 const [entityType, setEntityType] = useState<string>('Entity');
 const [agendaItems, setAgendaItems] = useState<any[]>([]);
 const [segmentSets, setSegmentSets] = useState<any[]>([]);
 const [showDockLang, setShowDockLang] = useState(false);

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
 setAgendaItems([]);
 setSegmentSets([]);
 setShowDockLang(false);

 // Sub-collections (mirrors Angular loadSubCollections)
 if (type === 'Agenda' && id) {
 if (data && Array.isArray(data.items)) setAgendaItems(data.items);
 api.fetchAgendaItems(id).then((fetched) => {
 if (fetched && fetched.length > 0) setAgendaItems(fetched);
 }).catch(() => {});
 }
 // Segment sets for candidates (fetched from substance-srv by harvest_id)
 if (type === 'Candidate' && data?.harvestId) {
 api.fetchSegmentSetsForHarvest(data.harvestId).then((sets) => {
 if (sets.length > 0) setSegmentSets(sets);
 }).catch(() => {});
 }
 }, [id, location, version]);

 const metadataEntries = useMemo(() => {
 if (!entityData) return [];
 return Object.entries(entityData)
 .filter(([key]) => !METADATA_EXCLUDED_KEYS.has(key))
 .map(([key, value]) => ({
 key: formatKey(key),
 rawKey: key,
 value,
 formattedValue: formatValue(value),
 route: resolveEntityRoute(entityData, key, value),
 }));
 }, [entityData]);

 if (!entityData) {
 return (
 <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
 <p>Entity details not found for ID: {id}</p>
 <Link to="/feed" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
 Return to Activity Feed
 </Link>
 </div>
 );
 }

 const title = entityData.title || entityData.name || entityData.sourceFilename || `${entityType} ${id}`;
 const harvestMd = entityType === 'Harvest' ? harvestDockLangMarkdown(entityData) : '';

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <button onClick={() => window.history.back()} className="hover:text-indigo-400 flex items-center gap-1">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Back</span>
 </button>
 <span>/</span>
 <Link to={location.pathname} className="text-slate-900 font-mono hover:text-indigo-600 :text-indigo-400 hover:underline">{id}</Link>
 </div>

 <PageHeader
 title={title}
 subtitle={`${entityType} detail`}
 ttsContent={`${entityType} ${title}. ${entityData.description || entityData.content || ''}`}
 />

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Main column */}
 <div className="lg:col-span-2 space-y-4">
 {entityData.description && (
 <div className="app-panel p-4">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Description</h3>
 <MarkdownRenderer content={entityData.description} />
 </div>
 )}

 {entityData.content && (
 <div className="app-panel p-4">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Content</h3>
 <MarkdownRenderer content={entityData.content} />
 </div>
 )}

 {/* Harvest Source Conversation (markdown default, DockLang toggle) */}
 {entityType === 'Harvest' && harvestMd && (
 <div className="app-panel overflow-hidden">
 <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
 <h2 className="text-sm font-semibold text-slate-900 ">
 {showDockLang ? 'DockLang' : 'Source Conversation'}
 </h2>
 <div className="flex items-center gap-2">
 {entityData.docklang && (
 <button
 onClick={() => setShowDockLang((v) => !v)}
 className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors bg-amber-100 text-amber-700 border border-amber-300 "
 title="Toggle DockLang view"
 >
 <FileCode className="w-3 h-3" />
 {showDockLang ? 'Markdown' : 'DockLang'}
 </button>
 )}
 <span className="text-xs text-slate-400 ">
 {(showDockLang ? harvestDockLang(entityData) : harvestMd).length} chars
 </span>
 </div>
 </div>
 <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
 {!showDockLang ? (
 <MarkdownRenderer content={harvestMd} />
 ) : (
 <pre className="text-xs font-mono text-slate-800 bg-slate-50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
 {harvestDockLang(entityData)}
 </pre>
 )}
 </div>
 </div>
 )}

 {/* Agenda Items */}
 {entityType === 'Agenda' && agendaItems.length > 0 && (
 <div className="app-panel overflow-hidden">
 <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
 <h2 className="text-sm font-semibold text-slate-900 ">Agenda Items</h2>
 <span className="text-xs text-slate-400 ">{agendaItems.length} items</span>
 </div>
 <div className="divide-y divide-slate-100 ">
 {agendaItems.map((item, idx) => {
 const obj = item as Record<string, unknown>;
 const sourceId = getItemSourceId(obj);
 const sourceType = getItemSourceType(obj);
 const itemRoute = sourceId && sourceType ? `/${entityRouteForType(sourceType) || sourceType}/${sourceId}` : null;
 return (
 <div key={String(obj['id'] || obj['sourceId'] || obj['title'] || idx)} className="px-4 py-3">
 <div className="text-sm font-medium text-slate-900 ">{getItemTitle(obj)}</div>
 <div className="text-xs text-slate-500 mt-1">
 {sourceType && (
 itemRoute ? (
 <Link to={itemRoute} className="text-indigo-600 hover:underline font-medium">
 Source: {sourceType} / {sourceId}
 </Link>
 ) : (
 <span>Source: {sourceType}{sourceId ? ` / ${sourceId}` : ''}</span>
 )
 )}
 </div>
 {getItemBody(obj) && (
 <div className="text-sm text-slate-600 mt-2 line-clamp-3">{getItemBody(obj)}</div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Metadata table */}
 {metadataEntries.length > 0 && (
 <div className="app-panel overflow-hidden">
 <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
 <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
 <Database className="w-4 h-4 text-slate-500 " />
 Metadata
 </h2>
 <Link to={location.pathname} className="font-mono text-[11px] text-indigo-600 hover:underline">ID: {entityData.id}</Link>
 </div>
 <dl className="divide-y divide-slate-100 ">
 {metadataEntries.map((entry) => (
 <div key={entry.rawKey} className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
 <dt className="text-xs font-medium text-slate-500 uppercase">{entry.key}</dt>
 <dd className="text-sm text-slate-900 sm:col-span-2 whitespace-pre-wrap break-words">
 {entry.route ? (
 <Link to={entry.route} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-semibold">
 {entry.formattedValue}
 <CheckCircle2 className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
 </Link>
 ) : (
 entry.formattedValue
 )}
 </dd>
 </div>
 ))}
 </dl>
 </div>
 )}

 {/* Segment Sets for candidates */}
 {segmentSets.length > 0 && (
 <div className="app-panel overflow-hidden">
 <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 ">
 <h2 className="text-sm font-semibold text-slate-900 ">
 Related Segment Sets
 </h2>
 </div>
 <div className="divide-y divide-slate-100 ">
 {segmentSets.map((set) => (
 <div key={set.id} className="px-4 py-3">
 <div className="text-sm font-medium text-slate-900 ">{set.name}</div>
 {set.description && (
 <div className="text-xs text-slate-500 mt-1 line-clamp-2">{set.description}</div>
 )}
 <div className="text-[10px] font-mono text-slate-400 mt-1">
 ID: {set.id.slice(0, 8)}…
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-4">
 <div className="app-panel p-4">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">Entity Inspector</h3>
 <p className="text-xs text-slate-500 leading-relaxed">
 This {entityType.toLowerCase()} record shows its human-readable markdown content plus a
 formatted metadata table. Deep JSON structures (harvest docklang, agenda items, conversation
 blocks) are rendered as readable documents above.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
};
