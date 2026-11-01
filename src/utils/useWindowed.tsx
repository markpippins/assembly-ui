import React, { useEffect, useRef, useState } from 'react';

/**
 * Ramp render pressure for very long lists (agent-records ≈ 15.5k rows,
 * candidates ≈ 11.7k cards). Rendering the full list at once pins the main
 * thread for minutes during mount and every background cache swap.
 *
 * useWindowed keeps at most `visibleCount` rows mounted and grows the window
 * by `chunk` when the caller places the returned `sentinelRef` node near the
 * bottom of the scroll flow (IntersectionObserver, ~1 viewport ahead).
 *
 * - `resetKey` change (sorts, filters, pagination state) restarts the window
 *   at one chunk so re-sorts of the full list stay instant.
 * - List *shrink* (cache trimmed, filters catch fewer rows) clamps the
 *   window; growth from the background fills just extends the remaining
 *   slice, the mounted row count doesn't jump.
 */
export function useWindowed(total: number, chunk = 150, resetKey?: unknown): {
  visibleCount: number;
  slice: <T>(items: T[]) => T[];
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  reset: () => void;
  more: () => void;
} {
  const [visible, setVisible] = useState(() => Math.min(chunk, Math.max(total, 0)));
  const prev = useRef<{ total: number; resetKey?: unknown }>({ total, resetKey });

  if (prev.current.resetKey !== resetKey) {
    prev.current = { total, resetKey };
    setVisible(Math.min(chunk, Math.max(total, 0)));
  } else if (total !== prev.current.total) {
    const prevTotal = prev.current.total;
    prev.current = { total };
    if (total < prevTotal) {
      // Shrink: clamp the window to the new length.
      setVisible((v) => Math.min(v, Math.max(total, 0)));
    }
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= total) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + chunk, total));
        }
      },
      { rootMargin: '1200px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, total, chunk, resetKey]);

  return { visibleCount: visible, sentinelRef, slice: <T,>(items: T[]) => items.slice(0, visible), reset: () => setVisible(Math.min(chunk, Math.max(total, 0))), more: () => setVisible((v) => Math.min(v + chunk, Math.max(total, 0))) };
}

/**
 * Footer strip for windowed lists: sentinel node, live coverage counter, and
 * a manual "show more" affordance (JS-off / tracker-averse users can still
 * reach the whole list in bounded steps).
 */
export function WindowFooter(props: {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  visibleCount: number;
  total: number;
  onMore: () => void;
  noun?: string;
}): React.ReactElement {
  const { sentinelRef, visibleCount, total, onMore, noun = 'items' } = props;
  return (
    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
      <span>
        Showing {visibleCount.toLocaleString()} of {total.toLocaleString()} {noun}
      </span>
      <div className="flex items-center gap-3">
        {visibleCount < total && (
          <button
            onClick={onMore}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 font-sans font-semibold hover:bg-slate-50 cursor-pointer"
          >
            Show {Math.min(150, total - visibleCount).toLocaleString()} more
          </button>
        )}
        <div ref={sentinelRef} className="h-3 w-24" aria-hidden="true" />
      </div>
    </div>
  );
}
