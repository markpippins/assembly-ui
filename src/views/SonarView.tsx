import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Bug,
  Flame,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { getSonarIssues, getSonarHotspots, SonarListEnvelope, SonarIssueRow, SonarHotspotRow } from '../services/apiClient';

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

      {tab === 'issues' ? <IssuesTab /> : <HotspotsTab />}
    </div>
  );
};

/* ── Issues tab ─────────────────────────────────────────────────── */
const PAGE_SIZE = 25;

function IssuesTab() {
  const [envelope, setEnvelope] = useState<SonarListEnvelope<SonarIssueRow>>({ items: [], count: 0 });
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [issueType, setIssueType] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('severity');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [severity, issueType, status, query, page]);

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
              </tr>
            </thead>
            {error ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-rose-600">{error}</td></tr></tbody>
            ) : isLoading ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-slate-500">Loading…</td></tr></tbody>
            ) : ordered.length === 0 ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-slate-500">No issues match the current filters.</td></tr></tbody>
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
                    <td className="py-3 px-4"><ReviewBadge value={it.review_status} /></td>
                    <td className="py-3 px-4 text-xs text-slate-500">{it.updated_at ? new Date(it.updated_at).toLocaleDateString() : ''}</td>
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
function HotspotsTab() {
  const [envelope, setEnvelope] = useState<SonarListEnvelope<SonarHotspotRow>>({ items: [], count: 0 });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('probability');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [category, status, query, page]);

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
              </tr>
            </thead>
            {error ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-rose-600">{error}</td></tr></tbody>
            ) : isLoading ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-slate-500">Loading…</td></tr></tbody>
            ) : ordered.length === 0 ? (
              <tbody><tr><td colSpan={8} className="py-8 px-4 text-center text-sm text-slate-500">No hotspots match the current filters.</td></tr></tbody>
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
                    <td className="py-3 px-4"><ReviewBadge value={h.review_status} /></td>
                    <td className="py-3 px-4 text-xs text-slate-500">{h.updated_at ? new Date(h.updated_at).toLocaleDateString() : ''}</td>
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