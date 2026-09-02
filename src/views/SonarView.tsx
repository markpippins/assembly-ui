import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Bug,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  getSonarIssues,
  getSonarHotspots,
  reviewSonarHotspot,
  reviewSonarIssue,
  fetchThreads,
  SonarListEnvelope,
  SonarIssueRow,
  SonarHotspotRow,
} from '../services/apiClient';
import { sonarKeyOf, ruleFamilyOf } from '../utils/threadTags';

// Sonar finding key / rule family -> sonar forum thread id (from the
// `Sonar key:` / `Rule family:` body markers the sync script writes).
interface SonarThreadMap {
  finding: Record<string, string>;
  rule: Record<string, string>;
}
const EMPTY_THREAD_MAP: SonarThreadMap = { finding: {}, rule: {} };

function ForumLink({ tid }: { tid?: string }) {
  if (!tid) return <span className="text-xs text-slate-300">—</span>;
  return (
    <Link
      to={`/forums/sonar/${tid}`}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
      title="Open the sonar forum thread for this finding"
    >
      <ExternalLink className="w-3 h-3" /> Forum
    </Link>
  );
}

const severityStyles: Record<string, string> = {
  BLOCKER: 'bg-rose-100 text-rose-700 ring-rose-200',
  CRITICAL: 'bg-orange-100 text-orange-700 ring-orange-200',
  MAJOR: 'bg-amber-100 text-amber-700 ring-amber-200',
  MINOR: 'bg-sky-100 text-sky-700 ring-sky-200',
  INFO: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const probabilityStyles: Record<string, string> = {
  HIGH: 'bg-rose-100 text-rose-700 ring-rose-200',
  MEDIUM: 'bg-amber-100 text-amber-700 ring-amber-200',
  LOW: 'bg-sky-100 text-sky-700 ring-sky-200',
};

const severityRank: Record<string, number> = { BLOCKER: 4, CRITICAL: 3, MAJOR: 2, MINOR: 1, INFO: 0 };
const probabilityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${styles[value] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {value}
    </span>
  );
}

function ReviewBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const reviewed = value !== 'to-review';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
      reviewed ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-amber-100 text-amber-700 ring-amber-200'
    }`}>
      {value}
    </span>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function WriteButtons({
  busy,
  actions,
  onAction,
}: {
  busy: boolean;
  actions: { label: string; value: string; cls: string }[];
  onAction: (v: string) => void;
}) {
  if (busy) return <span className="inline-block mt-1 text-[10px] text-slate-400 animate-pulse">saving…</span>;
  return (
    <span className="flex flex-wrap gap-1 mt-1">
      {actions.map((a) => (
        <button
          key={a.value}
          onClick={(e) => { e.stopPropagation(); onAction(a.value); }}
          title="Write review decision back to SonarQube + local schema"
          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${a.cls}`}
        >
          {a.label}
        </button>
      ))}
    </span>
  );
}

function WriteError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{message}</div>;
}

const selectCls =
  'bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500';
const inputCls =
  'bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 w-56';

interface FilterBarProps {
  children: React.ReactNode;
}

function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {children}
    </div>
  );
}

interface PagerProps {
  envelope: SonarListEnvelope<unknown>;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

function Pager({ envelope, page, pageSize, onPageChange }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(envelope.count / pageSize));
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
      <span className="font-mono">
        {envelope.count.toLocaleString()} total · page {page} / {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 disabled:opacity-40 hover:bg-slate-50"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function SortSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
      Sort:
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

type Tab = 'issues' | 'hotspots';

export const SonarView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('issues');

  // sonar forum thread map — fetched once, shared by both tabs. Rows link to
  // their per-finding thread (BLOCKER/CRITICAL/hotspots) or, for grouped
  // MAJOR+ findings, to the rule-family thread.
  const [threadMap, setThreadMap] = useState<SonarThreadMap>(EMPTY_THREAD_MAP);
  useEffect(() => {
    let isMounted = true;
    fetchThreads('sonar', { includeBody: true })
      .then((threads) => {
        if (!isMounted) return;
        const finding: Record<string, string> = {};
        const rule: Record<string, string> = {};
        for (const t of threads) {
          const fk = sonarKeyOf(t.body || '');
          if (fk) finding[fk] = t.id;
          const rk = ruleFamilyOf(t.body || '');
          if (rk) rule[rk] = t.id;
        }
        setThreadMap({ finding, rule });
      })
      .catch((err) => console.error('sonar thread map fetch failed:', err));
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Sonar"
        subtitle="Issues and security hotspots mirrored from SonarQube into the nexus `sonar` schema"
        ttsContent="Sonar folder. Issues and security hotspots detected by SonarQube, mirrored into the nexus database."
      >
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab('issues')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === 'issues' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Bug className="w-3.5 h-3.5" /> Issues
          </button>
          <button
            onClick={() => setTab('hotspots')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === 'hotspots' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Security Hotspots
          </button>
        </div>
      </PageHeader>

      {tab === 'issues' ? <IssuesTab threadMap={threadMap} /> : <HotspotsTab threadMap={threadMap} />}
    </div>
  );
};

/* ── Issues tab ─────────────────────────────────────────────────── */
const PAGE_SIZE = 25;

function IssuesTab({ threadMap }: { threadMap: SonarThreadMap }) {
  const [envelope, setEnvelope] = useState<SonarListEnvelope<SonarIssueRow>>({ items: [], count: 0 });
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [issueType, setIssueType] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('severity');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [writeError, setWriteError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    getSonarIssues({
      severity: severity || undefined,
      issueType: issueType || undefined,
      status: status || undefined,
      query: query || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((env) => {
        if (isMounted) setEnvelope(env);
      })
      .catch((err: Error) => {
        console.error('sonar issues fetch failed:', err);
        if (isMounted) {
          setEnvelope({ items: [], count: 0 });
          setError(err.message || 'Failed to load issues');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [severity, issueType, status, query, page, revision]);

  const applyReview = async (key: string, transition: string) => {
    setBusy((p) => ({ ...p, [key]: true }));
    setWriteError(null);
    try {
      await reviewSonarIssue(key, transition as 'resolve' | 'wontfix' | 'falsepositive');
      setRevision((r) => r + 1);
    } catch (err: any) {
      console.error('issue writeback failed:', err);
      setWriteError(err?.message ?? 'Writeback failed — sonar-sync unreachable?');
    } finally {
      setBusy((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const ordered = useMemo(() => {
    const copy = [...envelope.items];
    switch (sortKey) {
      case 'severity':
        copy.sort((a, b) => (severityRank[b.severity ?? ''] ?? -1) - (severityRank[a.severity ?? ''] ?? -1));
        break;
      case 'component':
        copy.sort((a, b) => (a.component_key ?? '').localeCompare(b.component_key ?? ''));
        break;
      case 'updated':
        copy.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
        break;
    }
    return copy;
  }, [envelope.items, sortKey]);

  const resetOnFilter = (setter: (v: string) => void) => (v: string) => { setPage(1); setter(v); };

  return (
    <div className="space-y-4">
      <FilterBar>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          Severity:
          <select value={severity} onChange={(e) => resetOnFilter(setSeverity)(e.target.value)} className={selectCls}>
            <option value="">Any</option>
            <option value="BLOCKER">Blocker</option>
            <option value="CRITICAL">Critical</option>
            <option value="MAJOR">Major</option>
            <option value="MINOR">Minor</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          Type:
          <select value={issueType} onChange={(e) => resetOnFilter(setIssueType)(e.target.value)} className={selectCls}>
            <option value="">Any</option>
            <option value="BUG">Bug</option>
            <option value="VULNERABILITY">Vulnerability</option>
            <option value="CODE_SMELL">Code Smell</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          Status:
          <select value={status} onChange={(e) => resetOnFilter(setStatus)(e.target.value)} className={selectCls}>
            <option value="">Any</option>
            <option value="OPEN">Open</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REOPENED">Reopened</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            placeholder="Search message / component…"
            className={inputCls + ' border-0 focus:ring-0'}
          />
        </div>
        <div className="ml-auto"><SortSelect value={sortKey} onChange={setSortKey} options={[['severity', 'Severity'], ['updated', 'Updated'], ['component', 'Component']]} /></div>
      </FilterBar>
      <WriteError message={writeError} />

      <div className="app-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Message</th>
                <th className="py-3 px-4 font-semibold">Component</th>
                <th className="py-3 px-4 font-semibold">Line</th>
                <th className="py-3 px-4 font-semibold">Review</th>
                <th className="py-3 px-4 font-semibold">Updated</th>
                <th className="py-3 px-4 font-semibold">Forum</th>
              </tr>
            </thead>
            {error ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-rose-600">{error}</td></tr></tbody>
            ) : isLoading ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-slate-500">Loading…</td></tr></tbody>
            ) : ordered.length === 0 ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-slate-500">No issues match the current filters.</td></tr></tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {ordered.map((it) => (
                  <tr key={it.key} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4"><Badge value={it.severity ?? 'INFO'} styles={severityStyles} /></td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{it.sonar_type ?? ''}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{it.status ?? ''}</td>
                    <td className="py-3 px-4 max-w-md">
                      <span className="text-xs text-slate-800" title={it.message ?? ''}>{truncate(it.message ?? '', 120)}</span>
                      <span className="block text-[10px] font-mono text-slate-400">{it.rule_key ?? ''}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{truncate(it.component_key ?? '', 42)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{it.line ?? ''}</td>
                    <td className="py-3 px-4">
                      <ReviewBadge value={it.review_status} />
                      {!it.review_status && (
                        <WriteButtons
                          busy={!!busy[it.key]}
                          onAction={(v) => applyReview(it.key, v)}
                          actions={[
                            { label: 'Resolve', value: 'resolve', cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
                            { label: "Won't fix", value: 'wontfix', cls: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
                            { label: 'False pos', value: 'falsepositive', cls: 'border-sky-200 text-sky-700 hover:bg-sky-50' },
                          ]}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{it.updated_at ? new Date(it.updated_at).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-4">
                      <ForumLink tid={threadMap.finding[it.key] ?? (it.rule_key ? threadMap.rule[it.rule_key] : undefined)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pager envelope={envelope} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}

/* ── Security Hotspots tab ──────────────────────────────────────── */
function HotspotsTab({ threadMap }: { threadMap: SonarThreadMap }) {
  const [envelope, setEnvelope] = useState<SonarListEnvelope<SonarHotspotRow>>({ items: [], count: 0 });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('probability');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [writeError, setWriteError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return ['', ...envelope.items.map((h) => h.security_category ?? '').filter((c) => c && !seen.has(c) && seen.add(c))];
  }, [envelope.items]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    getSonarHotspots({
      category: category || undefined,
      status: status || undefined,
      query: query || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((env) => {
        if (isMounted) setEnvelope(env);
      })
      .catch((err: Error) => {
        console.error('sonar hotspots fetch failed:', err);
        if (isMounted) {
          setEnvelope({ items: [], count: 0 });
          setError(err.message || 'Failed to load hotspots');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [category, status, query, page, revision]);

  const applyReview = async (key: string, action: string) => {
    setBusy((p) => ({ ...p, [key]: true }));
    setWriteError(null);
    try {
      await reviewSonarHotspot(key, action as 'safe' | 'fixed' | 'accept-risk');
      setRevision((r) => r + 1);
    } catch (err: any) {
      console.error('hotspot writeback failed:', err);
      setWriteError(err?.message ?? 'Writeback failed — sonar-sync unreachable?');
    } finally {
      setBusy((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const ordered = useMemo(() => {
    const copy = [...envelope.items];
    switch (sortKey) {
      case 'probability':
        copy.sort((a, b) => (probabilityRank[b.vulnerability_probability ?? ''] ?? -1) - (probabilityRank[a.vulnerability_probability ?? ''] ?? -1));
        break;
      case 'component':
        copy.sort((a, b) => (a.component_key ?? '').localeCompare(b.component_key ?? ''));
        break;
      case 'updated':
        copy.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
        break;
    }
    return copy;
  }, [envelope.items, sortKey]);

  const resetOnFilter = (setter: (v: string) => void) => (v: string) => { setPage(1); setter(v); };

  return (
    <div className="space-y-4">
      <FilterBar>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          Category:
          <select value={category} onChange={(e) => resetOnFilter(setCategory)(e.target.value)} className={selectCls}>
            <option value="">Any</option>
            {categories.filter((c) => c !== '').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          Status:
          <select value={status} onChange={(e) => resetOnFilter(setStatus)(e.target.value)} className={selectCls}>
            <option value="">Any</option>
            <option value="TO_REVIEW">To Review</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="REVIEWED_FIXED">Fixed</option>
          </select>
        </label>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            placeholder="Search message / component…"
            className={inputCls + ' border-0 focus:ring-0'}
          />
        </div>
        <div className="ml-auto"><SortSelect value={sortKey} onChange={setSortKey} options={[['probability', 'Probability'], ['updated', 'Updated'], ['component', 'Component']]} /></div>
      </FilterBar>
      <WriteError message={writeError} />

      <div className="app-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                <th className="py-3 px-4 font-semibold">Probability</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Message</th>
                <th className="py-3 px-4 font-semibold">Component</th>
                <th className="py-3 px-4 font-semibold">Line</th>
                <th className="py-3 px-4 font-semibold">Review</th>
                <th className="py-3 px-4 font-semibold">Updated</th>
                <th className="py-3 px-4 font-semibold">Forum</th>
              </tr>
            </thead>
            {error ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-rose-600">{error}</td></tr></tbody>
            ) : isLoading ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-slate-500">Loading…</td></tr></tbody>
            ) : ordered.length === 0 ? (
              <tbody><tr><td colSpan={9} className="py-8 px-4 text-center text-sm text-slate-500">No hotspots match the current filters.</td></tr></tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {ordered.map((h) => (
                  <tr key={h.key} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4"><Badge value={h.vulnerability_probability ?? 'NORMAL'} styles={probabilityStyles} /></td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{h.security_category ?? ''}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{h.status ?? ''}</td>
                    <td className="py-3 px-4 max-w-md">
                      <span className="text-xs text-slate-800" title={h.message ?? ''}>{truncate(h.message ?? '', 120)}</span>
                      <span className="block text-[10px] font-mono text-slate-400">{h.rule_key ?? ''}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{truncate(h.component_key ?? '', 42)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{h.line ?? ''}</td>
                    <td className="py-3 px-4">
                      <ReviewBadge value={h.review_status} />
                      {!h.review_status && h.status === 'TO_REVIEW' && (
                        <WriteButtons
                          busy={!!busy[h.key]}
                          onAction={(v) => applyReview(h.key, v)}
                          actions={[
                            { label: 'Safe', value: 'safe', cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
                            { label: 'Fixed', value: 'fixed', cls: 'border-sky-200 text-sky-700 hover:bg-sky-50' },
                            { label: 'Accept risk', value: 'accept-risk', cls: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
                          ]}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{h.updated_at ? new Date(h.updated_at).toLocaleDateString() : ''}</td>
                    <td className="py-3 px-4">
                      <ForumLink tid={threadMap.finding[h.key] ?? (h.rule_key ? threadMap.rule[h.rule_key] : undefined)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pager envelope={envelope} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}