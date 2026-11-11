import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '../../types';
import { activeClientOf, CLIENT_KEY, clientBand, clientScope, inClient, placeInClient, projectInClient, setActiveClient, snagInClient, storedClient, studyInClient } from '../activeClient';
import { CLIENT_KEY as STORY_KEY, clientShown } from '../storyPick';
import { customerName, customersOf } from '../customers';

const line = (id: string, clientName?: string): Workspace => ({ id, name: id, ...(clientName ? { clientName } : {}) } as Workspace);
const jl = (projectId: string, workspaceId: string) => ({ id: `${projectId}:${workspaceId}`, projectId, workspaceId });

describe('one active client (lib/activeClient, C1)', () => {
  /* the device's storage, as a browser has it */
  beforeEach(() => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
  });

  it('no client named: nothing filtered, no choice offered', () => {
    const s = clientScope([line('L1'), line('L2')], [jl('P1', 'L1')], 'Anyone');
    expect(s.clients).toEqual([]);
    expect(s.client).toBe('');
    expect(s.several || s.filtering || s.all).toBe(false);
    expect(s.line('L1') && s.project('P1') && s.project('P0') && s.record({}) && s.record({ workspaceId: 'L2' })).toBe(true);
    expect(clientBand(s)).toBe('');
  });

  it('one client named: that client is the active one and nothing is filtered — a line naming none, a project on no line all shown', () => {
    const s = clientScope([line('L1', 'Branston'), line('L2', ' Branston '), line('L3')], [jl('P1', 'L1')], 'Business B');
    expect(s.clients).toEqual(['Branston']);
    expect(s.client).toBe('Branston');
    expect(s.filtering).toBe(false);
    expect(s.line('L3') && s.project('P9') && s.record({ projectId: 'P9' })).toBe(true);
    expect(clientBand(s)).toBe('');
  });

  describe('two clients', () => {
    const lines = [line('B1', 'Branston'), line('B2', 'Branston'), line('X1', 'Business B'), line('N1')];
    const jobs = [jl('PB', 'B1'), jl('PB', 'B2'), jl('PX', 'X1'), jl('PN', 'N1')];

    it('one chosen: only its lines, projects, studies and problems', () => {
      const s = clientScope(lines, jobs, 'Business B');
      expect(s.several && s.filtering && !s.all).toBe(true);
      expect(s.client).toBe('Business B');
      expect([s.line('B1'), s.line('X1'), s.line('N1')]).toEqual([false, true, false]);
      expect(inClient(s, 'X1')).toBe(true);
      expect(projectInClient(s, { id: 'PX' })).toBe(true);
      expect(projectInClient(s, { id: 'PB' })).toBe(false);
      expect(studyInClient(s, { workspaceId: 'X1' })).toBe(true);
      expect(studyInClient(s, { workspaceId: 'B2', projectId: 'PX' })).toBe(false); // its line says whose before its project
      expect(snagInClient(s, { workspaceId: 'walk-of-PX', projectId: 'PX' })).toBe(true); // a project's own walk: the project's client
      expect(snagInClient(s, { workspaceId: 'B1' })).toBe(false);
      expect(clientBand(s)).toBe('Business B');
    });

    it('a project on no line, or only on a line naming no client, is no client\'s — shown under All clients only', () => {
      const s = clientScope(lines, jobs, 'Branston');
      expect(s.project('P-none')).toBe(false);
      expect(s.project('PN')).toBe(false);
      expect(s.record({ projectId: 'P-none' })).toBe(false);
      const all = clientScope(lines, jobs, '');
      expect(all.project('P-none') && all.project('PN')).toBe(true);
    });

    it('none chosen, or one no longer named: All clients — everything, each saying whose', () => {
      for (const stored of ['', 'Gone Ltd']) {
        const s = clientScope(lines, jobs, stored);
        expect(s.client).toBe('');
        expect(s.all && !s.filtering).toBe(true);
        expect(s.line('B1') && s.line('X1') && s.project('PB')).toBe(true);
        expect(s.whose({ workspaceId: 'X1' })).toBe('Business B');
        expect(s.whose({ projectId: 'PB' })).toBe('Branston');
        expect(s.whose({ projectId: 'P-none' })).toBe('');
        expect(clientBand(s)).toBe('All clients');
      }
    });

    it('a project across both clients is shown under each', () => {
      const s = clientScope(lines, [...jobs, jl('PBoth', 'B1'), jl('PBoth', 'X1')], 'Branston');
      expect(s.project('PBoth')).toBe(true);
      expect(s.projectClients('PBoth')).toEqual(['Branston', 'Business B']);
      expect(s.projectOf('PBoth', 'Business B')).toBe(true);
    });

    it('a place by its address follows the client', () => {
      const s = clientScope(lines, jobs, 'Branston');
      expect(placeInClient(s, '/lines/B1?view=tools')).toBe(true);
      expect(placeInClient(s, `/lines/${encodeURIComponent('X1')}`)).toBe(false);
      expect(placeInClient(s, '/project/PX/actions')).toBe(false);
      expect(placeInClient(s, '/tools')).toBe(true);
    });
  });

  it('the active client among those named', () => {
    expect(activeClientOf([], 'A')).toBe('');
    expect(activeClientOf(['A'], '')).toBe('A');
    expect(activeClientOf(['A', 'B'], 'B')).toBe('B');
    expect(activeClientOf(['A', 'B'], 'C')).toBe('');
  });

  it('the choice is kept under the key the Lines tab and the Story use, and the Story follows it', () => {
    expect(CLIENT_KEY).toBe('faultline.client');
    expect(STORY_KEY).toBe(CLIENT_KEY);
    setActiveClient('Business B');
    expect(localStorage.getItem('faultline.client')).toBe('Business B');
    expect(storedClient()).toBe('Business B');
    const two = [line('B1', 'Branston'), line('X1', 'Business B')];
    expect(clientShown(two)).toBe('Business B');
    setActiveClient('');
    expect(storedClient()).toBe('');
    expect(clientShown(two)).toBe('Branston'); // All clients: a story is one client's — the first
    expect(clientScope(two, [], storedClient()).all).toBe(true);
  });
});

describe('customers (lib/customers, C2a)', () => {
  const story = (id: string, client: string, extra: Record<string, unknown> = {}) =>
    ({ id, tool: 'story', name: client, agreed: { story: { client, brief: '', startedAt: 1, ...extra } }, facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 }) as never;
  const lines = [line('B1', 'Branston'), line('X1', 'Business B')];

  it('a customer added with no line is a client; one named only on lines is one too', () => {
    const cs = customersOf(lines, [story('s1', 'Cobb Foods', { site: 'York' })]);
    expect(cs.map(c => [c.name, c.lines, c.site ?? '', c.archived])).toEqual([['Branston', 1, '', false], ['Business B', 1, '', false], ['Cobb Foods', 0, 'York', false]]);
    const s = clientScope(lines, [], 'Cobb Foods', cs);
    expect(s.clients).toEqual(['Branston', 'Business B', 'Cobb Foods']);
    expect(s.client).toBe('Cobb Foods');
    expect(s.line('B1') || s.line('X1')).toBe(false); // its world is empty
  });

  it('archived when every story of it is stamped — hidden everywhere, whichever client is active, its records untouched', () => {
    const studies = [story('s1', 'Business B', { archivedAt: 5 }), story('s2', 'business  b', { archivedAt: 9 })];
    const cs = customersOf(lines, studies);
    const b = cs.find(c => c.name === 'Business B');
    expect(b?.archived).toBe(true);
    expect(b?.archivedAt).toBe(9);
    expect(b?.storyIds).toEqual(['s1', 's2']);
    for (const stored of ['', 'Business B', 'Branston']) {
      const s = clientScope(lines, [jl('PX', 'X1')], stored, cs);
      expect(s.clients).toEqual(['Branston']);
      expect(s.several).toBe(false);
      expect(s.line('X1')).toBe(false);
      expect(s.project('PX')).toBe(false);
      expect(s.record({ workspaceId: 'X1' })).toBe(false);
      expect(s.line('B1')).toBe(true);
      expect(s.archived.map(c => c.name)).toEqual(['Business B']);
    }
    /* one story still open: not archived */
    expect(customersOf(lines, [story('s1', 'Business B', { archivedAt: 5 }), story('s3', 'Business B')]).find(c => c.name === 'Business B')?.archived).toBe(false);
  });

  it('a name is needed', () => {
    expect(customerName('  ')).toEqual({ ok: false, why: 'A customer needs a name.' });
    expect(customerName('  Cobb   Foods ')).toEqual({ ok: true, name: 'Cobb Foods' });
  });
});
