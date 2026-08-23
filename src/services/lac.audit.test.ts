// @vitest-environment happy-dom
// LAC contract test (architect thread 83d2fd5c, rule 5) — assembly-ui.
// AUDIT-ONLY (delta f5dafe8f): assembly-ui is already live-authoritative
// (no mode toggle, no fixtures). These tests pin that state: pre-init
// reads return EMPTY (never fabricated rows), and live transport failures
// surface as errors rather than silent fallbacks.

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('LAC audit: assembly-ui dataService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('pre-init reads return empty structures — nothing is fabricated', async () => {
    const { dataService } = await import('./dataService');
    // No initDataService() call: cache is null. Reads must be safe + empty.
    expect(dataService.getForums()).toEqual([]);
    expect(dataService.getThreads('any-forum')).toEqual([]);
  });

  it('live transport failure propagates (fail-visible) — no synthetic rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('simulate network failure');
    }));
    const api = await import('./apiClient');
    await expect(api.fetchThreads('transcripts', {})).rejects.toThrow();
  });

  it('mode cannot be flipped by storage — there are no mode keys to consult', async () => {
    localStorage.setItem('assembly_mode', 'mock');
    sessionStorage.setItem('useMock', 'true');
    const { dataService } = await import('./dataService');
    // Service exposes no mock-mode concept; reads still resolve against the
    // (empty) live cache only.
    expect(dataService.getForums()).toEqual([]);
    expect(typeof (dataService as any).isMockMode).toBe('undefined');
  });
});
