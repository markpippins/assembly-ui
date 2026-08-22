import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChevronRight, HelpCircle, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';
import { AgentRecord } from '../types';

type SortField = 'title' | 'role' | 'createdAt';
type SortDir = 'asc' | 'desc';

// Mirrors Angular's DEFAULT_USER_ID (config/user.config.ts) — the ID used when
// raising a question/thread on behalf of the local user.
const DEFAULT_USER_ID = '9abe1316-312e-4a2f-96ad-88c4b86c7b1e';

const ISSUES_FORUM_SLUG = 'issues-and-open-questions';

function toggleSort(field: SortField, current: SortField, dir: SortDir): { field: SortField; dir: SortDir } {
 if (field === current) return { field, dir: dir === 'asc' ? 'desc' : 'asc' };
 return { field, dir: field === 'title' || field === 'role' ? 'asc' : 'desc' };
}

export const AgentsView: React.FC = () => {
 const { version } = useLiveData();
 const [records, setRecords] = useState<AgentRecord[]>([]);
 const [sortField, setSortField] = useState<SortField>('createdAt');
 const [sortDir, setSortDir] = useState<SortDir>('desc');
 const [raiseTarget, setRaiseTarget] = useState<AgentRecord | null>(null);
 const [title, setTitle] = useState('');
 const [body, setBody] = useState('');
 const { showToast } = useToast();

 useEffect(() => {
 setRecords(dataService.getAgentRecords());
 }, [version]);

 const sorted = useMemo(() => {
 const items = [...records];
 items.sort((a, b) => {
 let cmp = 0;
 if (sortField === 'title') {
 cmp = (a.title || '').localeCompare(b.title || '');
 } else if (sortField === 'role') {
 cmp = (a.role || '').localeCompare(b.role || '');
 } else {
 cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
 }
 return sortDir === 'asc' ? cmp : -cmp;
 });
 return items;
 }, [records, sortField, sortDir]);

 const onToggleSort = (field: SortField) => {
 const next = toggleSort(field, sortField, sortDir);
 setSortField(next.field);
 setSortDir(next.dir);
 };

 const openRaise = (rec: AgentRecord) => {
 setRaiseTarget(rec);
 setTitle(rec.title || '');
 setBody('');
 };

 const closeRaise = () => setRaiseTarget(null);

 const submitRaise = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !body.trim() || !raiseTarget) return;
 const users = dataService.getUsers();
 const postedById = users.find((u) => u.id === DEFAULT_USER_ID)?.id
 ?? users[0]?.id
 ?? DEFAULT_USER_ID;
 try {
 dataService.createThread(ISSUES_FORUM_SLUG, {
 title: title.trim(),
 body: body.trim(),
 postedById,
 });
 showToast('Question posted to Issues forum!', 'success');
 } catch (err) {
 showToast(`Failed to post question: ${(err as Error).message}`, 'error');
 }
 setRaiseTarget(null);
 };

 return (
 <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Agents"
 subtitle="Agent records across the Assembly."
 ttsContent="Agent records catalog."
 />

 {records.length === 0 ? (
 <EmptyState
 icon={Bot}
 title="No agents"
 description="Agent records will appear here once they are created."
 />
 ) : (
 <div className="app-panel overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-sm">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
 <th
 onClick={() => onToggleSort('title')}
 className="py-3 px-4 font-semibold cursor-pointer hover:text-indigo-600 :text-indigo-400 select-none"
 >
 Title {sortField === 'title' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
 </th>
 <th
 onClick={() => onToggleSort('role')}
 className="w-28 py-3 px-4 font-semibold cursor-pointer hover:text-indigo-600 :text-indigo-400 select-none"
 >
 Role {sortField === 'role' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
 </th>
 <th
 onClick={() => onToggleSort('createdAt')}
 className="w-36 py-3 px-4 font-semibold cursor-pointer hover:text-indigo-600 :text-indigo-400 select-none"
 >
 Created {sortField === 'createdAt' && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
 </th>
 <th className="w-28 py-3 px-4 font-semibold text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {sorted.map((rec) => (
 <tr key={rec.id} className="hover:bg-slate-50 :bg-slate-700/30 transition-colors">
 <td className="py-3 px-4">
 <div className="flex flex-col">
 <Link
 to={`/agent-records/${rec.id}`}
 className="font-bold text-slate-900 hover:text-indigo-600 :text-indigo-300 transition-colors"
 >
 {rec.title || 'Untitled'}
 </Link>
 <Link
 to={`/agent-records/${rec.id}`}
 className="text-xs text-slate-500 hover:text-indigo-600 :text-indigo-300 transition-colors"
 >
 {rec.recordType || 'Record'}
 </Link>
 </div>
 </td>
 <td className="py-3 px-4">
 <StatusBadge status={rec.role || 'unknown'} type="role" />
 </td>
 <td className="py-3 px-4 text-xs text-slate-500 font-mono">
 {formatDateTime(rec.createdAt)}
 </td>
 <td className="py-3 px-4 text-right">
 <button
 onClick={() => openRaise(rec)}
 className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 :bg-amber-500/20 transition-all cursor-pointer"
 >
 <HelpCircle className="w-3.5 h-3.5" />
 Raise Question
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Raise Question modal — mirrors Angular's RaiseQuestionComponent
 (posts a new thread to the Issues forum linked to this record). */}
 {raiseTarget && (
 <div
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
 role="dialog"
 aria-modal="true"
 >
 <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={closeRaise} />
 <div className="relative w-full sm:w-auto sm:max-w-lg sm:rounded-lg app-panel p-4 shadow-xl max-h-[90vh] sm:max-h-none overflow-y-auto">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-gray-900 ">
 Raise Open Question
 </h3>
 <button
 onClick={closeRaise}
 className="text-gray-400 hover:text-gray-600 :text-gray-300 transition-colors cursor-pointer"
 aria-label="Close"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <p className="text-sm text-gray-500 mb-3">
 Create a new post in{' '}
 <span className="font-medium text-gray-700 ">Issues</span> linked to{' '}
 <span className="font-medium text-gray-700 ">
 {raiseTarget.title || 'Untitled'}
 </span>.
 </p>

 <form onSubmit={submitRaise} className="space-y-3">
 <div>
 <label htmlFor="rq-title" className="block text-sm font-medium text-gray-700 mb-1">
 Title
 </label>
 <input
 id="rq-title"
 name="rq-title"
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
 placeholder="Short summary of the question"
 required
 />
 </div>
 <div>
 <label htmlFor="rq-body" className="block text-sm font-medium text-gray-700 mb-1">
 Body
 </label>
 <textarea
 id="rq-body"
 name="rq-body"
 rows={4}
 value={body}
 onChange={(e) => setBody(e.target.value)}
 className="w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
 placeholder="Describe the question or concern..."
 required
 />
 </div>

 <div className="flex items-center justify-end gap-2 mt-4">
 <button
 type="button"
 onClick={closeRaise}
 className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 :text-gray-200 transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer"
 >
 Post Question
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
