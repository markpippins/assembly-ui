import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
 ArrowLeft,
 FileCode,
 FileText,
 Code,
 Copy,
 Check,
 Download,
 Layers,
 MessageSquare,
 Bot,
 User,
 Hash,
 Folder,
 Sliders,
 Filter,
 Search,
 ChevronDown,
 ChevronUp,
 Sparkles,
 Quote,
 List as ListIcon,
 Terminal,
 Database,
 Info,
 MoreVertical,
 Flag
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { TTSButton } from '../components/TTSButton';
import { Tooltip } from '../components/Tooltip';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { Harvest } from '../types';

interface ItemContextMenuProps {
 itemKey: string;
 itemTitle: string;
 contentText: string;
 rawData: any;
 isFlagged: boolean;
 isOpen: boolean;
 onToggleOpen: (e: React.MouseEvent) => void;
 onCopyContent: () => void;
 onCopyRawData: () => void;
 onToggleFlag: () => void;
}

const ItemContextMenu: React.FC<ItemContextMenuProps> = ({
 itemTitle,
 isFlagged,
 isOpen,
 onToggleOpen,
 onCopyContent,
 onCopyRawData,
 onToggleFlag,
}) => {
 return (
 <div className="relative inline-block context-menu-container">
 <button
 onClick={onToggleOpen}
 className={`p-1.5 rounded-lg border text-sm transition-all cursor-pointer flex items-center justify-center ${
 isOpen
 ? 'bg-indigo-50 border-indigo-300 text-indigo-600 '
 : 'bg-white hover:bg-slate-100 :bg-slate-700 border-slate-200 text-slate-600 '
 }`}
 title="Item Context Menu"
 >
 <MoreVertical className="w-3.5 h-3.5" />
 </button>

 {isOpen && (
 <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 shadow-xl z-50 py-1.5 text-sm font-sans animate-in fade-in zoom-in-95 duration-100">
 <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400 border-b border-slate-100 mb-1 truncate">
 {itemTitle}
 </div>

 <button
 onClick={onCopyContent}
 className="w-full text-left px-3 py-2 hover:bg-slate-50 :bg-slate-800 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
 >
 <Copy className="w-3.5 h-3.5 text-indigo-500" />
 <span>Copy content</span>
 </button>

 <button
 onClick={onCopyRawData}
 className="w-full text-left px-3 py-2 hover:bg-slate-50 :bg-slate-800 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
 >
 <FileCode className="w-3.5 h-3.5 text-emerald-500" />
 <span>Copy raw data</span>
 </button>

 <div className="my-1 border-t border-slate-100 " />

 <button
 onClick={onToggleFlag}
 className={`w-full text-left px-3 py-2 hover:bg-slate-50 :bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors ${
 isFlagged ? 'text-amber-600 font-medium' : 'text-slate-700 '
 }`}
 >
 <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'text-amber-500 fill-amber-500' : 'text-amber-500'}`} />
 <span>{isFlagged ? 'Unflag item' : 'Flag for review'}</span>
 </button>
 </div>
 )}
 </div>
 );
};

export const HarvestDetailView: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const { showToast } = useToast();
 const { version } = useLiveData();
 const [harvest, setHarvest] = useState<Harvest | null>(null);
 const [viewMode, setViewMode] = useState<'markdown' | 'raw'>('markdown');
 const [searchQuery, setSearchQuery] = useState('');
 const [roleFilter, setRoleFilter] = useState<'all' | 'assistant' | 'user'>('all');
 const [copied, setCopied] = useState(false);
 const [collapsedTurns, setCollapsedTurns] = useState<Record<number, boolean>>({});
 const [flaggedItems, setFlaggedItems] = useState<Record<string, boolean>>({});
 const [activeContextMenuKey, setActiveContextMenuKey] = useState<string | null>(null);

 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (activeContextMenuKey && !(e.target as HTMLElement).closest('.context-menu-container')) {
 setActiveContextMenuKey(null);
 }
 };
 window.addEventListener('click', handleClickOutside);
 return () => window.removeEventListener('click', handleClickOutside);
 }, [activeContextMenuKey]);

 useEffect(() => {
 if (!id) return;
 const h = dataService.getHarvest(id);
 if (h) {
 setHarvest(h);
 }
 // The list projection carries no docklang — the detail endpoint
 // resolves asynchronously into the cache. Re-read until it lands
 // (ThreadDetailView convention) so deep links render the full
 // document instead of the empty fallback.
 if (!(h && (h as any).docklang)) {
 let attempts = 0;
 const checkDetail = () => {
 attempts++;
 const h2 = dataService.getHarvest(id!);
 if (h2 && (h2 as any).docklang) {
 setHarvest(h2);
 } else if (attempts < 10) {
 window.setTimeout(checkDetail, 300);
 }
 };
 window.setTimeout(checkDetail, 300);
 }
 }, [id, version]);

 const handleCopyItemContent = (content: string, label: string) => {
 navigator.clipboard.writeText(content);
 showToast(`Copied content for ${label}`, 'success');
 setActiveContextMenuKey(null);
 };

 const handleCopyItemRawData = (data: any, label: string) => {
 navigator.clipboard.writeText(JSON.stringify(data, null, 2));
 showToast(`Copied raw JSON for ${label}`, 'success');
 setActiveContextMenuKey(null);
 };

 const handleToggleItemFlag = (itemKey: string, label: string) => {
 setFlaggedItems((prev) => {
 const isFlagged = !prev[itemKey];
 showToast(
 isFlagged ? `Flagged "${label}" for review` : `Removed flag from "${label}"`,
 'info'
 );
 return { ...prev, [itemKey]: isFlagged };
 });
 setActiveContextMenuKey(null);
 };

 if (!harvest) {
 return (
 <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
 <p className="text-sm text-slate-500 ">Harvest details not found for ID: {id}</p>
 <Link
 to="/harvests"
 className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-all"
 >
 <ArrowLeft className="w-4 h-4" />
 <span>Return to Artifact Harvests</span>
 </Link>
 </div>
 );
 }

 const docklang = harvest.docklang as any;
 const meta = docklang?.meta || {};
 const stats = docklang?.stats || {};
 // Real docklang payloads use snake_case keys (discourse_units, total_units,
 // total_blocks, by_type); older fixtures used camelCase. Accept both.
 const discourseUnits: any[] = docklang?.discourseUnits || docklang?.discourse_units || [];
 const totalUnits = stats?.totalUnits ?? stats?.total_units ?? discourseUnits.length;
 const totalBlocks = stats?.totalBlocks ?? stats?.total_blocks ?? 0;
 const byType = stats?.byType || stats?.by_type || {};

 const title = meta.title || harvest.sourceFilename || `Harvest ${harvest.id}`;
 const provenance = meta.provenance || {};

 const handleCopyJSON = () => {
 const dataToCopy = harvest.docklang ? JSON.stringify(harvest.docklang, null, 2) : harvest.sourceText || '';
 navigator.clipboard.writeText(dataToCopy);
 setCopied(true);
 showToast('Copied raw Harvest data to clipboard!', 'success');
 setTimeout(() => setCopied(false), 2000);
 };

 const handleDownloadJSON = () => {
 const dataToDownload = harvest.docklang ? JSON.stringify(harvest.docklang, null, 2) : harvest.sourceText || '';
 const blob = new Blob([dataToDownload], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-harvest.json`;
 a.click();
 URL.revokeObjectURL(url);
 showToast('Downloaded Harvest JSON file', 'info');
 };

 const toggleTurnCollapse = (turnIdx: number) => {
 setCollapsedTurns((prev) => ({
 ...prev,
 [turnIdx]: !prev[turnIdx],
 }));
 };

 const copyTurnContent = (turnText: string, turnTitle: string) => {
 navigator.clipboard.writeText(turnText);
 showToast(`Copied content for ${turnTitle}`, 'success');
 };

 // Filter discourse units
 const filteredUnits = discourseUnits.filter((unit) => {
 const role = unit.provenance?.role;
 if (roleFilter !== 'all' && role !== roleFilter) return false;

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 const bodyMatches = unit.body?.toLowerCase().includes(q);
 const headingMatches = unit.heading?.toLowerCase().includes(q);
 return bodyMatches || headingMatches;
 }

 return true;
 });

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 {/* Breadcrumbs & Navigation */}
 <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 ">
 <div className="flex items-center gap-2">
 <Link to="/harvests" className="hover:text-indigo-600 :text-indigo-400 flex items-center gap-1 transition-colors">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Artifact Harvests</span>
 </Link>
 <span>/</span>
 <span className="text-slate-800 font-mono font-medium truncate max-w-xs">{title}</span>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handleCopyJSON}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 :bg-slate-700 text-slate-700 rounded-lg text-sm font-semibold transition-all cursor-pointer"
 title="Copy Raw Harvest Data"
 >
 {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
 <span>{copied ? 'Copied' : 'Copy JSON'}</span>
 </button>

 <button
 onClick={handleDownloadJSON}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 :bg-slate-700 text-slate-700 rounded-lg text-sm font-semibold transition-all cursor-pointer"
 title="Download JSON File"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Download</span>
 </button>

 <TTSButton
 text={`Harvest Candidate details for ${title}. Total units: ${stats.totalUnits || 0}, Total blocks: ${stats.totalBlocks || 0}`}
 />
 </div>
 </div>

 {/* Header Info Card */}
 <div className="bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm transition-all">
 {/* Title & Metadata Badges */}
 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-6">
 <div className="space-y-2">
 <div className="flex flex-wrap items-center gap-2">
 <Tooltip content="Schema Format: Defines the structural specification and serialization rules used for this harvest.">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-help">
 <Sparkles className="w-3 h-3 text-indigo-500" />
 {meta.format || 'docklang/v0.3'}
 </span>
 </Tooltip>

 {harvest.model && (
 <Tooltip content="AI Model: Generative intelligence model used to harvest and classify discourse blocks.">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 cursor-help">
 <Bot className="w-3 h-3 text-emerald-500" />
 {harvest.model}
 </span>
 </Tooltip>
 )}

 <Tooltip content="Abstraction Level: Level 3 signifies deep discourse segmentation with aggregated turns and typed blocks.">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-600 cursor-help">
 Level {harvest.level || 3}
 </span>
 </Tooltip>

 <Tooltip content="Visibility Scope Policy: Specifies organizational governance and sharing permissions.">
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 text-slate-600 cursor-help">
 {harvest.visibilityScope || 'ORGANIZATION'}
 </span>
 </Tooltip>
 </div>

 <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-poppins tracking-tight">
 {title}
 </h1>

 <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 ">
 <Tooltip content="Unique Harvest Identifier: Canonical database token generated at ingestion time.">
 <span>
 Harvest ID: <Link to={`/harvests/${harvest.id}`} className="font-mono text-indigo-600 underline decoration-dotted underline-offset-2 hover:decoration-solid">{harvest.id}</Link>
 </span>
 </Tooltip>
 <span>•</span>
 <Tooltip content="Ingestion Date: The timestamp when this harvest was processed into the system repository.">
 <span className="cursor-help">
 Created: {formatDateTime(harvest.createdAt)}
 </span>
 </Tooltip>
 </div>
 </div>

 <div className="flex items-center gap-3 self-start">
 {Object.values(flaggedItems).filter(Boolean).length > 0 && (
 <Tooltip content="Flagged Review Items: Total discourse units or blocks flagged for manual review or auditing.">
 <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-300 text-sm font-semibold rounded-xl shadow-xs cursor-help">
 <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
 <span>{Object.values(flaggedItems).filter(Boolean).length} Flagged</span>
 </span>
 </Tooltip>
 )}

 <Tooltip content="Extracted Candidates: View work candidates and actionable tasks derived from this harvest document.">
 <Link
 to="/candidates"
 className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
 >
 <Database className="w-4 h-4" />
 <span>{harvest.totalCandidates || 0} Candidates</span>
 </Link>
 </Tooltip>
 </div>
 </div>

 {/* Provenance Details */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200/80 text-sm font-mono">
 <div className="space-y-1">
 <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
 <Folder className="w-3.5 h-3.5 text-indigo-500" />
 <span>Source Provenance</span>
 <Tooltip content="Source File Location: Path or reference pointing to original input transcript file.">
 <Info className="w-3 h-3 text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
 </Tooltip>
 </div>
 <p className="text-slate-800 truncate font-mono text-[11px]" title={provenance.source || harvest.sourcePath || ''}>
 {provenance.source || harvest.sourcePath || 'N/A'}
 </p>
 </div>

 <div className="space-y-1">
 <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
 <Hash className="w-3.5 h-3.5 text-emerald-500" />
 <span>Conversation ID</span>
 <Tooltip content="Conversation Trace ID: Linking key identifying the original chat thread context.">
 <Info className="w-3 h-3 text-slate-400 hover:text-emerald-500 cursor-help transition-colors" />
 </Tooltip>
 </div>
 <p className="text-slate-800 font-mono text-[11px] truncate">
 {provenance.conversationId || harvest.metadata?.conversationId || 'N/A'}
 </p>
 </div>
 </div>

 {/* Stats Chips & Unit Metrics Breakdown */}
 <div className="space-y-2">
 <div className="flex items-center justify-between text-sm font-semibold text-slate-700 font-mono">
 <div className="flex items-center gap-1.5">
 <span>Discourse Metrics & Block Breakdown</span>
 <Tooltip content="Discourse Block Breakdown: Quantitative summary of conversation turns and extracted semantic blocks.">
 <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500 cursor-help transition-colors" />
 </Tooltip>
 </div>
 <Tooltip content="Totals: Aggregate discourse units (turns) and total content blocks.">
 <span className="cursor-help underline decoration-dotted underline-offset-2">
 {totalUnits} Discourse Units • {totalBlocks} Total Blocks
 </span>
 </Tooltip>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
 <Tooltip content="Discourse Units: Aggregated conversational turns in this harvest document.">
 <div className="bg-indigo-50/50 border border-indigo-100 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-indigo-600 font-mono">
 {totalUnits}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Units
 </div>
 </div>
 </Tooltip>

 <Tooltip content="Paragraph Blocks: Count of standard narrative text blocks extracted across turns.">
 <div className="bg-slate-50 border border-slate-200 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-slate-900 font-mono">
 {byType.paragraph || 0}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Paragraphs
 </div>
 </div>
 </Tooltip>

 <Tooltip content="Quote Blocks: Count of verbatim quotes and key principles highlighted.">
 <div className="bg-slate-50 border border-slate-200 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-slate-900 font-mono">
 {byType.quote || 0}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Quotes
 </div>
 </div>
 </Tooltip>

 <Tooltip content="List Blocks: Count of bulleted or numbered structured lists.">
 <div className="bg-slate-50 border border-slate-200 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-slate-900 font-mono">
 {byType.list || 0}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Lists
 </div>
 </div>
 </Tooltip>

 <Tooltip content="Code Blocks: Count of technical snippets, configuration files, or shell commands.">
 <div className="bg-slate-50 border border-slate-200 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-slate-900 font-mono">
 {byType.code || 0}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Code
 </div>
 </div>
 </Tooltip>

 <Tooltip content="Separator Blocks: Count of turn section boundaries and dividers.">
 <div className="bg-slate-50 border border-slate-200 p-3 text-center cursor-help transition-transform hover:-translate-y-0.5">
 <div className="text-lg font-bold text-slate-900 font-mono">
 {byType.separator || 0}
 </div>
 <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
 Separators
 </div>
 </div>
 </Tooltip>
 </div>
 </div>
 </div>

 {/* Control Surface: View Switcher Toggle & Filters */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-3 shadow-xs">
 {/* Toggle Switch */}
 <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 ">
 <button
 onClick={() => setViewMode('markdown')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
 viewMode === 'markdown'
 ? 'bg-white text-indigo-600 shadow-xs'
 : 'text-slate-600 hover:text-slate-900 :text-white'
 }`}
 >
 <FileText className="w-4 h-4" />
 <span>Markdown Rendition</span>
 </button>

 <button
 onClick={() => setViewMode('raw')}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
 viewMode === 'raw'
 ? 'bg-white text-indigo-600 shadow-xs'
 : 'text-slate-600 hover:text-slate-900 :text-white'
 }`}
 >
 <Code className="w-4 h-4" />
 <span>Raw Data (JSON)</span>
 </button>
 </div>

 {/* Search & Role Filter Controls */}
 {viewMode === 'markdown' && (
 <div className="flex flex-wrap items-center gap-3">
 {/* Search Input */}
 <div className="relative flex-1 sm:w-64">
 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <label htmlFor="hd-search" className="sr-only">Search discourse</label>
 <input
 id="hd-search"
 type="text"
 placeholder="Search discourse..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
 />
 </div>

 {/* Role Filter */}
 <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-mono">
 <button
 onClick={() => setRoleFilter('all')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 roleFilter === 'all'
 ? 'bg-white text-slate-900 font-bold shadow-xs'
 : 'text-slate-500 hover:text-slate-800 :text-slate-200'
 }`}
 >
 All
 </button>

 <button
 onClick={() => setRoleFilter('assistant')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 roleFilter === 'assistant'
 ? 'bg-white text-indigo-600 font-bold shadow-xs'
 : 'text-slate-500 hover:text-slate-800 :text-slate-200'
 }`}
 >
 Assistant
 </button>

 <button
 onClick={() => setRoleFilter('user')}
 className={`px-2.5 py-1 rounded-lg transition-all ${
 roleFilter === 'user'
 ? 'bg-white text-emerald-600 font-bold shadow-xs'
 : 'text-slate-500 hover:text-slate-800 :text-slate-200'
 }`}
 >
 User
 </button>
 </div>
 </div>
 )}
 </div>

 {/* VIEW CONTENT */}
 {viewMode === 'markdown' ? (
 <div className="space-y-6">
 {discourseUnits.length === 0 ? (
 /* Fallback if sourceText markdown */
 <div className="bg-white border border-slate-200 p-8 space-y-4 shadow-sm">
 <h3 className="text-sm font-bold text-slate-900 font-mono">Document Text Rendition</h3>
 {(harvest.sourceText || (harvest as any).source_text || '').trim() ? (
 <div className="bg-slate-50 p-6 border border-slate-200 leading-relaxed">
 <MarkdownRenderer content={harvest.sourceText || (harvest as any).source_text || ''} />
 </div>
 ) : (
 <div className="bg-slate-50 p-6 border border-slate-200 leading-relaxed text-sm text-slate-500 ">
 No document content available for this harvest.
 </div>
 )}
 </div>
 ) : (
 /* Aggregated Document Turns */
 filteredUnits.map((unit, idx) => {
 const role = unit.provenance?.role || (unit.heading?.includes('user') ? 'user' : 'assistant');
 const isAssistant = role === 'assistant';
 const isCollapsed = collapsedTurns[idx];
 const turnKey = `turn-${idx}`;
 const turnTitle = unit.heading || `Turn ${idx + 1}`;
 const isTurnFlagged = !!flaggedItems[turnKey];
 const isTurnMenuOpen = activeContextMenuKey === turnKey;
 const turnBody = unit.body || '';

 return (
 <div
 key={idx}
 onContextMenu={(e) => {
 e.preventDefault();
 setActiveContextMenuKey(turnKey);
 }}
 className={`bg-white border ${
 isTurnFlagged
 ? 'border-amber-400 ring-2 ring-amber-400/20'
 : isAssistant
 ? 'border-slate-200 '
 : 'border-emerald-200/80 '
 } shadow-sm transition-all overflow-hidden`}
 >
 {/* Turn Header Card */}
 <div
 className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b ${
 isTurnFlagged
 ? 'bg-amber-50/60 border-amber-200 '
 : isAssistant
 ? 'bg-slate-50/70 border-slate-100 '
 : 'bg-emerald-50/40 border-emerald-100 '
 }`}
 >
 <div className="flex items-center gap-3">
 <div
 className={`w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm border ${
 isTurnFlagged
 ? 'bg-amber-100 text-amber-600 border-amber-300 '
 : isAssistant
 ? 'bg-indigo-50 text-indigo-600 border-indigo-200 '
 : 'bg-emerald-50 text-emerald-600 border-emerald-200 '
 }`}
 >
 {isAssistant ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
 </div>

 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-sm font-bold text-slate-900 font-poppins">
 {turnTitle}
 </h2>

 <span
 className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${
 isAssistant
 ? 'bg-indigo-100 text-indigo-700 '
 : 'bg-emerald-100 text-emerald-700 '
 }`}
 >
 {role}
 </span>

 {isTurnFlagged && (
 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-700 border border-amber-300 ">
 <Flag className="w-3 h-3 fill-amber-500 text-amber-500" />
 Flagged for Review
 </span>
 )}
 </div>

 <p className="text-[11px] text-slate-500 font-mono">
 {unit.provenance?.blockCount || unit.blocks?.length || 0} blocks aggregated • Turn Index #{unit.provenance?.turnIndex ?? idx}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => copyTurnContent(turnBody, turnTitle)}
 className="p-1.5 bg-white hover:bg-slate-100 :bg-slate-700 border border-slate-200 text-slate-600 rounded-lg text-sm transition-all cursor-pointer"
 title="Copy Turn Content"
 >
 <Copy className="w-3.5 h-3.5" />
 </button>

 <ItemContextMenu
 itemKey={turnKey}
 itemTitle={turnTitle}
 contentText={turnBody}
 rawData={unit}
 isFlagged={isTurnFlagged}
 isOpen={isTurnMenuOpen}
 onToggleOpen={(e) => {
 e.stopPropagation();
 setActiveContextMenuKey(isTurnMenuOpen ? null : turnKey);
 }}
 onCopyContent={() => handleCopyItemContent(turnBody, turnTitle)}
 onCopyRawData={() => handleCopyItemRawData(unit, turnTitle)}
 onToggleFlag={() => handleToggleItemFlag(turnKey, turnTitle)}
 />

 <button
 onClick={() => toggleTurnCollapse(idx)}
 className="p-1.5 bg-white hover:bg-slate-100 :bg-slate-700 border border-slate-200 text-slate-600 rounded-lg text-sm transition-all cursor-pointer"
 title={isCollapsed ? 'Expand Turn' : 'Collapse Turn'}
 >
 {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>

 {/* Turn Aggregated Document Body */}
 {!isCollapsed && (
 <div className="p-6 sm:p-8 space-y-4 font-sans leading-relaxed text-slate-800 text-sm">
 {Array.isArray(unit.blocks) && unit.blocks.length > 0 ? (
 unit.blocks.map((block: any, bIdx: number) => {
 const type = block.type || 'paragraph';
 const blockKey = `turn-${idx}-block-${bIdx}`;
 const blockTitle = `Block #${bIdx + 1} (${type})`;
 const blockText = type === 'list' ? (block.items || []).join('\n') : (block.content || '');
 const isBlockFlagged = !!flaggedItems[blockKey];
 const isBlockMenuOpen = activeContextMenuKey === blockKey;

 const blockWrapperClass = `relative group/block border p-3.5 transition-all ${
 isBlockFlagged
 ? 'border-amber-300 bg-amber-50/30 shadow-xs'
 : 'border-slate-100 hover:border-slate-200 :border-slate-700 bg-white/50 '
 }`;

 const renderBlockHeader = () => (
 <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 ">
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
 #{bIdx + 1} {type}
 </span>
 {isBlockFlagged && (
 <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300 ">
 <Flag className="w-3 h-3 fill-amber-500 text-amber-500" />
 Flagged for Review
 </span>
 )}
 </div>
 <ItemContextMenu
 itemKey={blockKey}
 itemTitle={blockTitle}
 contentText={blockText}
 rawData={block}
 isFlagged={isBlockFlagged}
 isOpen={isBlockMenuOpen}
 onToggleOpen={(e) => {
 e.stopPropagation();
 setActiveContextMenuKey(isBlockMenuOpen ? null : blockKey);
 }}
 onCopyContent={() => handleCopyItemContent(blockText, blockTitle)}
 onCopyRawData={() => handleCopyItemRawData(block, blockTitle)}
 onToggleFlag={() => handleToggleItemFlag(blockKey, blockTitle)}
 />
 </div>
 );

 if (type === 'quote') {
 return (
 <div
 key={bIdx}
 onContextMenu={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setActiveContextMenuKey(blockKey);
 }}
 className={blockWrapperClass}
 >
 {renderBlockHeader()}
 <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-3 text-slate-800 font-serif text-sm leading-relaxed space-y-1">
 <Quote className="w-4 h-4 text-indigo-400 mb-1" />
 <p className="italic">{block.content}</p>
 </div>
 </div>
 );
 }

 if (type === 'list') {
 const items = block.items || [];
 return (
 <div
 key={bIdx}
 onContextMenu={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setActiveContextMenuKey(blockKey);
 }}
 className={blockWrapperClass}
 >
 {renderBlockHeader()}
 <ul className="list-disc pl-5 space-y-1.5 text-slate-800 text-sm">
 {items.map((item: string, iIdx: number) => (
 <li key={iIdx} className="leading-relaxed">
 {item}
 </li>
 ))}
 </ul>
 </div>
 );
 }

 if (type === 'code') {
 return (
 <div
 key={bIdx}
 onContextMenu={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setActiveContextMenuKey(blockKey);
 }}
 className={blockWrapperClass}
 >
 {renderBlockHeader()}
 <div className="bg-slate-950 border border-slate-800 p-4 font-mono text-sm text-emerald-600 overflow-x-auto shadow-inner leading-relaxed">
 <pre>{block.content}</pre>
 </div>
 </div>
 );
 }

 if (type === 'separator') {
 return (
 <div
 key={bIdx}
 onContextMenu={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setActiveContextMenuKey(blockKey);
 }}
 className={blockWrapperClass}
 >
 {renderBlockHeader()}
 <div className="my-2 border-t border-slate-200 flex items-center justify-center">
 <span className="bg-white px-3 -mt-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
 •••
 </span>
 </div>
 </div>
 );
 }

 // Default: Paragraph
 return (
 <div
 key={bIdx}
 onContextMenu={(e) => {
 e.preventDefault();
 e.stopPropagation();
 setActiveContextMenuKey(blockKey);
 }}
 className={blockWrapperClass}
 >
 {renderBlockHeader()}
 <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
 {block.content}
 </p>
 </div>
 );
 })
 ) : (
 <div className="leading-relaxed text-sm text-slate-800 ">
 <MarkdownRenderer content={unit.body || ''} />
 </div>
 )}
 </div>
 )}
 </div>
 );
 })
 )}
 </div>
 ) : (
 /* Raw Data (JSON) View */
 <div className="bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-xl">
 <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-sm font-mono">
 <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2">
 <FileCode className="w-4 h-4 text-indigo-400" />
 Docklang Canonical JSON Structure
 </span>

 <span className="text-slate-500">
 {harvest.fileSize || 0} Bytes • Version {harvest.version || 1}
 </span>
 </div>

 <div className="p-4 bg-slate-900/80 font-mono text-sm text-indigo-600 overflow-x-auto max-h-[700px] border border-slate-800/80 shadow-inner leading-relaxed">
 <pre>{harvest.docklang ? JSON.stringify(harvest.docklang, null, 2) : JSON.stringify(harvest, null, 2)}</pre>
 </div>
 </div>
 )}
 </div>
 );
};
