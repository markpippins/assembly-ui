import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MessageSquarePlus, ExternalLink } from 'lucide-react';
import * as api from '../services/apiClient';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

/**
 * [candidate-drilldown] Per-candidate gate panel for promotion batches.
 *
 * Rendered on /candidates/:id when the entity is a harvest candidate.
 * Lets the operator promote (approve), strike, or comment about THIS ONE
 * candidate without touching the rest of its batch:
 *
 *  - Approve/Strike PATCHes the candidate status in nebula immediately
 *    ('approved' | 'struck') — visible as a badge on every batch post that
 *    references the candidate (render-time decoration in ThreadDetailView).
 *  - When the operator arrived from a batch thread (?thread=<id>), the
 *    verdict is ALSO echoed into that thread as a parseable single-card
 *    "**Agreed selection:**" comment, so stage3_execute picks it up with no
 *    parser changes (cross-card isolation already supported).
 *  - Commentary is appended to the echo comment; "Comment only" posts just
 *    the commentary without a verdict.
 */

const STATUS_META: Record<string, { label: string; cls: string }> = {
  promoted: { label: 'promoted', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  approved: { label: 'approved · pending execution', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  struck: { label: 'struck', cls: 'bg-red-100 text-red-800 border-red-300' },
  discarded: { label: 'discarded', cls: 'bg-red-100 text-red-800 border-red-300' },
  reviewed: { label: 'reviewed', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export const CandidateGatePanel: React.FC<{
  candidateId: string;
  onStatusChange?: (status: string) => void;
}> = ({ candidateId, onStatusChange }) => {
  const [searchParams] = useSearchParams();
  const threadParam = searchParams.get('thread');
  const { showToast } = useToast();

  const [resolvedId, setResolvedId] = useState<string | null>(
    candidateId.length === 36 ? candidateId : null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [commentary, setCommentary] = useState('');
  const [busy, setBusy] = useState<'approve' | 'strike' | 'comment' | null>(null);
  const [echoInfo, setEchoInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve 8-hex prefixes to full UUIDs via the shared candidates index.
  useEffect(() => {
    if (candidateId.length === 36) {
      setResolvedId(candidateId);
      return;
    }
    let cancelled = false;
    api.fetchCandidatesIndex().then((idx) => {
      const hit = idx[candidateId.toLowerCase()];
      if (!cancelled) setResolvedId(hit?.id ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [candidateId]);

  // Fresh status from nebula (the live cache may be stale after gate runs).
  useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    api.fetchCollectionItem('candidates', resolvedId).then((c) => {
      if (!cancelled && c) setStatus(c.status ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [resolvedId]);

  /**
   * Build a parseable single-card "**Agreed selection:**" block for this
   * candidate from the batch thread body: locate the card's three radio
   * lines by prefix and flip the chosen option's marker to (x).
   */
  const buildEchoComment = async (
    verdict: 'approve' | 'strike',
    short: string,
  ): Promise<{ body: string; threadTitle?: string } | null> => {
    if (!threadParam) return null;
    let thread: any;
    try {
      const res = await api.fetchThread(threadParam);
      thread = res?.thread;
    } catch {
      return null; // thread gone/unreachable — status PATCH still applied
    }
    if (!thread?.body) return null;
    const lines = thread.body.split('\n');
    const start = lines.findIndex((l: string) =>
      /^\*\*Card `[0-9a-f]{8}`\*\*/.test(l.trim()) && l.includes(`\`${short}\``));
    if (start < 0) return null;
    const optionLines: string[] = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (!/^\s*[-*]\s+\([ xX]\)/.test(lines[i])) break;
      optionLines.push(lines[i]);
    }
    if (optionLines.length === 0) return null;
    const needle = verdict === 'approve' ? 'Approve as mapped' : 'Strike';
    const flipped = optionLines.map((l) => {
      if (l.includes(needle)) return l.replace(/\([ xX]\)/, '(x)');
      return l.replace(/\(([xX])\)/, '( )');
    });
    const parts = ['**Agreed selection:**', '', ...flipped];
    return { body: parts.join('\n'), threadTitle: thread.title };
  };

  const decide = async (verdict: 'approve' | 'strike' | 'comment') => {
    setError(null);
    if (!resolvedId) {
      setError('Could not resolve this candidate id against the candidates index.');
      return;
    }
    setBusy(verdict);
    try {
      const short = resolvedId.slice(0, 8).toLowerCase();
      const commentaryTrimmed = commentary.trim();

      // 1. Immediate status update in nebula → badges everywhere reflect it.
      if (verdict !== 'comment') {
        const next = verdict === 'approve' ? 'approved' : 'struck';
        await api.updateHarvestCandidate(resolvedId, { status: next });
        setStatus(next);
        onStatusChange?.(next);
      }

      // 2. Echo a parseable verdict comment into the originating batch.
      if (threadParam && verdict !== 'comment') {
        const echo = await buildEchoComment(verdict, short);
        if (echo) {
          const suffix = commentaryTrimmed ? `\n\n${commentaryTrimmed}` : '';
          const body = `${echo.body}${suffix}\n\n— per-candidate decision from candidate detail`;
          await dataService.addComment(threadParam, { body });
          setEchoInfo(`verdict posted to “${echo.threadTitle ?? threadParam}”`);
        } else {
          setEchoInfo('batch thread unreachable — only status was updated');
        }
      } else if (verdict === 'comment' && threadParam && commentaryTrimmed) {
        await dataService.addComment(threadParam, { body: commentaryTrimmed });
        setEchoInfo('comment posted to batch thread');
      }

      if (verdict !== 'comment') {
        showToast(verdict === 'approve' ? 'Candidate approved' : 'Candidate struck', 'success');
      } else {
        showToast('Comment recorded', 'success');
      }
      setCommentary('');
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const meta = status ? STATUS_META[status] : undefined;

  return (
    <div className="app-panel p-4" data-testid="candidate-gate-panel">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">
          Promotion Gate
        </h3>
        {threadParam && (
          <a
            href={`/forums/planning/threads/${threadParam}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            title="Open originating batch thread"
          >
            batch thread <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-slate-500">Status:</span>
        {meta ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${meta.cls}`}>
            {meta.label}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">awaiting gate decision</span>
        )}
      </div>

      <textarea
        value={commentary}
        onChange={(e) => setCommentary(e.target.value)}
        rows={3}
        placeholder="Commentary for this candidate (attached to your verdict)…"
        className="mt-3 w-full resize-y rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => decide('approve')}
          className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => decide('strike')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" /> Strike
        </button>
        <button
          type="button"
          disabled={!!busy || !commentary.trim()}
          onClick={() => decide('comment')}
          title="Post commentary without a verdict"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" /> Comment only
        </button>
      </div>

      {!threadParam && (
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          Opened directly — approve/strike updates the candidate status but does not
          post to a batch thread. Follow a card link from a promotion batch to also
          echo the verdict there.
        </p>
      )}
      {echoInfo && (
        <p className="mt-2 text-[11px] text-emerald-700">{echoInfo}</p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CandidateGatePanel;
