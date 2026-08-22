import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  onDataChanged,
  refreshDataService,
} from '../services/dataService';

// ── Live data refresh context ───────────────────────────────────────
// Owns the background poll that keeps dataService's liveCache fresh and
// broadcasts a monotonically increasing `version` whenever the cache is
// refreshed. Views read `version` into their data-loading effect deps so
// they re-read from the cache without remounting (drafts and scroll
// position survive every refresh).

interface LiveDataValue {
  /** Bumps on every successful cache (re)load — views re-read when it changes. */
  version: number;
  /** Force an immediate background refresh (no-op while one is in flight). */
  refreshNow: () => void;
  /** Epoch ms of the last successful background refresh, null before the first. */
  lastRefreshedAt: number | null;
}

const LiveDataContext = createContext<LiveDataValue>({
  version: 0,
  refreshNow: () => {},
  lastRefreshedAt: null,
});

/** Base poll interval; doubles per consecutive failure up to MAX_BACKOFF_MS. */
export const BASE_REFRESH_MS = 15_000;
const MAX_BACKOFF_MS = 4 * BASE_REFRESH_MS;
const FIRST_REFRESH_DELAY_MS = 5_000;

function autoRefreshDisabled(): boolean {
  try {
    return localStorage.getItem('assembly.autoRefresh') === 'off';
  } catch {
    return false;
  }
}

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const failuresRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  // Any cache load/refresh anywhere in dataService bumps the version.
  useEffect(() => onDataChanged(() => setVersion((v) => v + 1)), []);

  const runCycle = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!autoRefreshDisabled()) {
        // Skip work while the tab is hidden — resume on visibility.
        if (document.visibilityState !== 'hidden') {
          const ok = await refreshDataService();
          if (ok) {
            failuresRef.current = 0;
            setLastRefreshedAt(Date.now());
          } else {
            throw new Error('refreshDataService returned false');
          }
        }
      }
    } catch {
      failuresRef.current = Math.min(failuresRef.current + 1, 6);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const scheduleNext = useCallback(
    (delayMs: number): void => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        await runCycle();
        const backoffMs = Math.min(
          BASE_REFRESH_MS * Math.pow(2, failuresRef.current),
          MAX_BACKOFF_MS
        );
        scheduleNext(backoffMs);
      }, delayMs);
    },
    [runCycle]
  );

  useEffect(() => {
    scheduleNext(FIRST_REFRESH_DELAY_MS);
    // Refresh promptly when the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runCycle();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [scheduleNext, runCycle]);

  const refreshNow = useCallback((): void => {
    // Version bump happens via onDataChanged when the refresh succeeds.
    void runCycle();
  }, [runCycle]);

  return (
    <LiveDataContext.Provider value={{ version, refreshNow, lastRefreshedAt }}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData(): LiveDataValue {
  return useContext(LiveDataContext);
}
