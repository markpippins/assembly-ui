import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Send, ShieldAlert, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { dataService } from '../services/dataService';
import { useLiveData } from '../context/LiveDataContext';
import { formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { OpenQuestion, OpenQuestionAnswer, TimelineEvent } from '../types';

export const OpenQuestionDetailView: React.FC = () => {
 const { version } = useLiveData();
 const { id } = useParams<{ id: string }>();
 const [q, setQ] = useState<OpenQuestion | null>(null);
 const [answers, setAnswers] = useState<OpenQuestionAnswer[]>([]);
 const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

 const [role, setRole] = useState('Architect');
 const [answerText, setAnswerText] = useState('');
 const [confidence, setConfidence] = useState('HIGH');
 const [reasoning, setReasoning] = useState('');
 const { showToast } = useToast();

 const loadQuestionData = () => {
 if (id) {
 const item = dataService.getOpenQuestion(id);
 if (item) setQ(item);
 setAnswers(dataService.getQuestionAnswers(id));
 setTimeline(dataService.getQuestionTimeline(id));
 }
 };

 useEffect(() => {
 loadQuestionData();
 }, [id, version]);

 const handleAddAnswer = (e: React.FormEvent) => {
 e.preventDefault();
 if (!answerText.trim() || !id) return;

 dataService.addQuestionAnswer(id, {
 role,
 answer: answerText.trim(),
 confidence,
 reasoning: reasoning.trim() || undefined,
 });

 setAnswerText('');
 setReasoning('');
 showToast('Answer recorded and question status updated!', 'success');
 loadQuestionData();
 };

 if (!q) {
 return (
 <div className="max-w-4xl mx-auto py-8 text-center text-slate-400">
 <p>Question not found</p>
 <Link to="/open-questions" className="text-sm text-indigo-400 hover:underline mt-2 inline-block">
 Return to Open Questions
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
 <div className="flex items-center gap-2 text-sm text-slate-500 ">
 <Link to="/open-questions" className="hover:text-indigo-400 flex items-center gap-1">
 <ArrowLeft className="w-3.5 h-3.5" />
 <span>Open Questions</span>
 </Link>
 <span>/</span>
 <Link to={`/open-questions/${q.id}`} className="text-slate-900 font-mono hover:text-indigo-600 :text-indigo-400 hover:underline">{q.id}</Link>
 </div>

 <PageHeader
 title={q.title}
 subtitle={`Category: ${q.category}`}
 ttsContent={`Question: ${q.title}. ${q.description || ''}`}
 action={<StatusBadge status={q.status} size="md" />}
 />

 <div className="app-panel p-4 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Link to={`/open-questions/${q.id}`} className="font-mono text-sm text-indigo-600 hover:underline">{q.id}</Link>
 {q.blocking && (
 <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 ">
 <AlertTriangle className="w-3.5 h-3.5" />
 BLOCKING
 </span>
 )}
 </div>
 <span className="text-sm text-slate-500 font-mono">Raised by {q.createdBy || 'Contributor'}</span>
 </div>

 <MarkdownRenderer content={q.description || 'No additional description.'} />
 </div>

 {/* Answer Submission Form */}
 <form onSubmit={handleAddAnswer} className="app-panel p-4 space-y-4">
 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-mono">Provide Answer / Resolution</h3>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="oq-role" className="block text-sm font-medium text-slate-600 mb-1">Responding Role</label>
 <select
 id="oq-role"
 value={role}
 onChange={(e) => setRole(e.target.value)}
 className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
 >
 <option value="Architect">Architect</option>
 <option value="Lead Engineer">Lead Engineer</option>
 <option value="Product Manager">Product Manager</option>
 <option value="Security Engineer">Security Engineer</option>
 </select>
 </div>

 <div>
 <label htmlFor="oq-confidence" className="block text-sm font-medium text-slate-600 mb-1">Confidence</label>
 <select
 id="oq-confidence"
 value={confidence}
 onChange={(e) => setConfidence(e.target.value)}
 className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
 >
 <option value="HIGH">High (Definitive)</option>
 <option value="MEDIUM">Medium (Provisional)</option>
 <option value="LOW">Low (Needs Verification)</option>
 </select>
 </div>
 </div>

 <div>
 <label htmlFor="oq-answer" className="block text-sm font-medium text-slate-600 mb-1">Answer Decision</label>
 <textarea
 id="oq-answer"
 required
 rows={3}
 value={answerText}
 onChange={(e) => setAnswerText(e.target.value)}
 placeholder="State the decision or answer cleanly..."
 className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
 />
 </div>

 <div>
 <label htmlFor="oq-reasoning" className="block text-sm font-medium text-slate-600 mb-1">Supporting Reasoning (Optional)</label>
 <input
 id="oq-reasoning"
 type="text"
 value={reasoning}
 onChange={(e) => setReasoning(e.target.value)}
 placeholder="Trade-offs, performance impact, or specs reference..."
 className="w-full h-9 px-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
 />
 </div>

 <div className="flex justify-end">
 <button
 type="submit"
 disabled={!answerText.trim()}
 className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm"
 >
 <Send className="w-3.5 h-3.5" />
 <span>Record Answer</span>
 </button>
 </div>
 </form>

 {/* Existing Answers */}
 <div className="space-y-4">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Answers ({answers.length})</h3>
 {answers.map((ans) => (
 <div key={ans.id} className="app-panel p-4 space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-emerald-600 ">{ans.role}</span>
 <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 ">
 Confidence: {ans.confidence}
 </span>
 </div>
 <span className="text-[11px] text-slate-400 font-mono">
 {formatDateTime(ans.answeredAt)}
 </span>
 </div>
 <MarkdownRenderer content={ans.answer} />
 {ans.reasoning && (
 <p className="text-sm text-slate-500 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
 Reasoning: {ans.reasoning}
 </p>
 )}
 </div>
 ))}
 </div>

 {/* Audit Timeline */}
 <div className="app-panel p-4 space-y-3">
 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Event Timeline</h3>
 <div className="space-y-3 pl-2 border-l border-slate-700">
 {timeline.map((evt, idx) => (
 <div key={idx} className="relative pl-4">
 <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-indigo-500 border border-slate-900" />
 <div className="text-sm font-bold text-slate-800 ">{evt.label}</div>
 <p className="text-[11px] text-slate-400">{evt.description}</p>
 <p className="text-[10px] font-mono text-slate-500">{formatDateTime(evt.timestamp)}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
};
