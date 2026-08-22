import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ChevronRight, FileText, HelpCircle, CheckSquare, MessageSquare, Calendar } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { dataService } from '../services/dataService';

export const SearchView: React.FC = () => {
 const [searchParams] = useSearchParams();
 const queryParam = searchParams.get('q') || '';
 const [query, setQuery] = useState(queryParam);
 const [results, setResults] = useState<{
 requirements: any[];
 workRequests: any[];
 openQuestions: any[];
 threads: any[];
 agendas: any[];
 }>({
 requirements: [],
 workRequests: [],
 openQuestions: [],
 threads: [],
 agendas: [],
 });

 useEffect(() => {
 setQuery(queryParam);
 if (queryParam.trim()) {
 const q = queryParam.toLowerCase();

 const reqs = dataService.getRequirements().filter(
 (r) => (r.title || '').toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
 );

 const wrs = dataService.getWorkRequests().filter(
 (w) => w.title.toLowerCase().includes(q) || (w.description && w.description.toLowerCase().includes(q))
 );

 const oqs = dataService.getOpenQuestions(false).filter(
 (o) => o.title.toLowerCase().includes(q) || (o.description && o.description.toLowerCase().includes(q))
 );

 const ths = dataService.getThreads('all').filter(
 (t) => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)
 );

 const ags = dataService.getAgendas().filter(
 (a) => a.title.toLowerCase().includes(q) || (a.plannerAnalysis && a.plannerAnalysis.toLowerCase().includes(q))
 );

 setResults({
 requirements: reqs,
 workRequests: wrs,
 openQuestions: oqs,
 threads: ths,
 agendas: ags,
 });
 }
 }, [queryParam]);

 const totalResults =
 results.requirements.length +
 results.workRequests.length +
 results.openQuestions.length +
 results.threads.length +
 results.agendas.length;

 return (
 <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
 <PageHeader
 title="Workspace Search"
 subtitle={queryParam ? `Search results for "${queryParam}" (${totalResults} matches)` : 'Search across all Assembly entities'}
 ttsContent={`Search results for ${queryParam}. Found ${totalResults} matches.`}
 />

 {/* Results Groups */}
 {!queryParam.trim() ? (
 <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-400">
 <Search className="w-8 h-8 mx-auto text-slate-500 mb-2" />
 <p className="text-sm font-medium">Enter a query in the top search bar to begin</p>
 </div>
 ) : totalResults === 0 ? (
 <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-400">
 <p className="text-sm font-medium">No matching items found for "{queryParam}"</p>
 <p className="text-sm mt-1">Try searching for keywords like "Auth", "Database", "API", or "Schema".</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Requirements */}
 {results.requirements.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
 <CheckSquare className="w-4 h-4 text-emerald-600 " />
 <span>Requirements ({results.requirements.length})</span>
 </h2>
 <div className="space-y-2">
 {results.requirements.map((r) => (
 <Link
 key={r.id}
 to={`/requirements/${r.id}`}
 className="block app-panel p-4 transition-all hover:border-indigo-500/60"
 >
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-900 text-sm">{r.title}</span>
 <span className="font-mono text-[10px] text-slate-400">{r.id}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Work Requests */}
 {results.workRequests.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
 <FileText className="w-4 h-4 text-sky-400" />
 <span>Work Requests ({results.workRequests.length})</span>
 </h2>
 <div className="space-y-2">
 {results.workRequests.map((wr) => (
 <Link
 key={wr.id}
 to={`/work-requests/${wr.id}`}
 className="block app-panel p-4 transition-all hover:border-indigo-500/60"
 >
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-900 text-sm">{wr.title}</span>
 <span className="font-mono text-[10px] text-slate-400">{wr.id}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Open Questions */}
 {results.openQuestions.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
 <HelpCircle className="w-4 h-4 text-amber-400" />
 <span>Open Questions ({results.openQuestions.length})</span>
 </h2>
 <div className="space-y-2">
 {results.openQuestions.map((q) => (
 <Link
 key={q.id}
 to={`/open-questions/${q.id}`}
 className="block app-panel p-4 transition-all hover:border-indigo-500/60"
 >
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-900 text-sm">{q.title}</span>
 <span className="font-mono text-[10px] text-slate-400">{q.id}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Agendas */}
 {results.agendas.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-2">
 <Calendar className="w-4 h-4 text-purple-500 " />
 <span>Agendas ({results.agendas.length})</span>
 </h2>
 <div className="space-y-2">
 {results.agendas.map((a) => (
 <Link
 key={a.id}
 to={`/agendas/${a.id}`}
 className="block app-panel p-4 transition-all hover:border-indigo-500/60"
 >
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-900 text-sm">{a.title}</span>
 <span className="font-mono text-[10px] text-slate-500 ">{a.id}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Threads */}
 {results.threads.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
 <MessageSquare className="w-4 h-4 text-indigo-400" />
 <span>Forum Threads ({results.threads.length})</span>
 </h2>
 <div className="space-y-2">
 {results.threads.map((t) => (
 <Link
 key={t.id}
 to={`/forums/${t.forum.slug}/${t.id}`}
 className="block app-panel p-4 transition-all hover:border-indigo-500/60"
 >
 <div className="flex justify-between items-center">
 <span className="font-bold text-slate-900 text-sm">{t.title}</span>
 <span className="font-mono text-[10px] text-slate-400">By {t.author.name}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
};
