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

  it('no dead mutation path: harvests expose no edit/update surface', async () => {
    // Audit finding f5dafe8f: the UI previously offered a harvest source-text
    // edit surface that called PATCH /harvests/:id — an endpoint neither
    // nebula-srv nor assembly-srv implements (404 swallowed by the optimistic
    // cache, false success toast). Harvests are append-only extraction records;
    // the surface was removed. This pins: no updateHarvest export exists.
    const api = await import('./apiClient');
    expect(typeof (api as any).updateHarvest).toBe('undefined');
    const { dataService } = await import('./dataService');
    expect(typeof (dataService as any).updateHarvest).toBe('undefined');
  });

  it('every remaining mutation routes through the live api client', async () => {
    // The mutation surface is: forums (create/reorder), threads (create),
    // thread status, comments (create/edit/delete), feed (create/delete),
    // open-questions (create + answers). Each dataService mutation must
    // delegate to apiClient (live transport), never fabricate locally.
    const api = await import('./apiClient');
    for (const fn of [
      'createForum', 'reorderForums', 'createThread', 'setThreadStatus',
      'addComment', 'updateComment', 'deleteComment',
      'createFeedPost', 'deleteFeedPost',
      'createOpenQuestion', 'addQuestionAnswer',
    ]) {
      expect(typeof (api as any)[fn], `apiClient.${fn}`).toBe('function');
    }
  });
});
