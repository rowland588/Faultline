/* The Pareto picks the problems (docs/SIXM.md, the working method, step 1):
 * which bar offers what, the line it files on, the problem it already is,
 * the action it becomes, and the one way it becomes a problem — with the
 * reason a bar outside the vital few earned one kept on the problem. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { pickOf, vitalSentence, lineOfBar, problemOfBar, justDoItStep, WHY_CHOICES } from '../paretoPicks';
import { paretoView } from '../paretoView';
import type { ProblemView } from '../problems';
import type { Case } from '../../types';

const sheet = (rows: [string, number, number][]) => ({
  rows: rows.map(([category, mins, events]) => ({ category, mins, events, minPerEvent: mins / events, profile: 'Mixed', byLine: {} })),
  totalMins: rows.reduce((t, r) => t + r[1], 0), totalStops: rows.reduce((t, r) => t + r[2], 0),
});

describe('which bar offers what', () => {
  const v = paretoView(sheet([['Minor stop', 250, 21], ['Changeover', 12, 2], ['Waiting', 4, 1]]));
  it('the vital few find the root cause; the rest just do it', () => {
    expect(v.rows.map(r => pickOf(r))).toEqual(['root', 'just', 'just']);
  });
  it('a bar that has gone, or lost nothing, offers nothing', () => {
    expect(pickOf({ vital: false, verdict: 'gone', mins: 0 })).toBeNull();
    expect(pickOf({ vital: true, mins: 0 })).toBeNull();
  });
  it('says the finding in one line, and that each vital bar gets its own problem only on a 6M job', () => {
    const two = paretoView(sheet([['Minor stop', 60, 10], ['Breakdown', 35, 2], ['Waiting', 5, 1]]));
    expect(vitalSentence(two, true)).toBe('2 of 3 categories carry 95% of the lost time — each gets its own problem');
    expect(vitalSentence(two, false)).toBe('2 of 3 categories carry 95% of the lost time');
    expect(vitalSentence(v, true)).toBe('1 of 3 categories carries 94% of the lost time — it gets its own problem');
  });
  it('asks for a reason with the three quick choices', () => {
    expect(WHY_CHOICES).toEqual(['Safety', 'Quality / food safety', 'It is the constraint']);
  });
});

describe('the line a bar is filed on', () => {
  const lines = [{ id: 'a', name: 'Line 2A' }, { id: 'b', name: 'Line 7' }];
  it('is the line that lost the most to it', () => {
    expect(lineOfBar({ byLine: { 'Line 2A': 5, 'Line 7': 30 } }, lines)?.id).toBe('b');
  });
  it('is the only line when there is one, and nothing when it cannot say', () => {
    expect(lineOfBar({ byLine: { 'The project': 9 } }, [lines[0]])?.id).toBe('a');
    expect(lineOfBar({ byLine: { 'The project': 9 } }, lines)).toBeUndefined();
  });
});

describe('the problem a bar already is', () => {
  const pv = (id: string, o: Partial<Case>): ProblemView => ({
    problem: { id, workspaceId: 'w', title: id, path: [], baselineMsWeek: 0, status: 'open', openedAt: 1, updatedAt: 1, projectId: 'p', ...o },
    phase: 'finding', bones: [], measure: null, actions: [], roots: [], says: '',
  });
  const list = [
    pv('closed', { lineId: 'a', status: 'closed', closedAt: 50, source: { kind: 'pareto', category: 'Minor stop' } }),
    pv('other-line', { lineId: 'b', source: { kind: 'pareto', category: 'Minor stop' } }),
    pv('gap', { lineId: 'a', source: { kind: 'gap' } }),
  ];
  it('on its own line only, the open one first', () => {
    expect(problemOfBar(list, 'Minor stop', 'b')?.problem.id).toBe('other-line');
    expect(problemOfBar([...list, pv('open', { lineId: 'a', source: { kind: 'pareto', category: 'Minor stop' } })], 'Minor stop', 'a')?.problem.id).toBe('open');
  });
  it('a fixed bar says it is holding — unless only an open problem will do', () => {
    expect(problemOfBar(list, 'Minor stop', 'a')?.problem.id).toBe('closed');
    expect(problemOfBar(list, 'Minor stop', 'a', true)).toBeUndefined();
  });
  it('a bar with no problem has none', () => {
    expect(problemOfBar(list, 'Changeover', 'a')).toBeUndefined();
  });
});

describe('a bar as an action — just do it', () => {
  it('carries the bar’s words, its line, the bone its category sits on and what it cost', () => {
    const s = justDoItStep({ category: 'Changeover', mins: 12, events: 2 }, { projectId: 'p', lineId: 'a', id: 'x', now: 5 });
    expect(s).toMatchObject({ id: 'x', projectId: 'p', lineId: 'a', what: 'Changeover', state: 'todo', pillar: 'method', createdAt: 5 });
    expect(s.why).toBe('12 min lost over 2 stops in the last four weeks');
    expect(s.causeRef).toBeUndefined();
    expect(justDoItStep({ category: 'Waiting', mins: 3.25, events: 1 }, { projectId: 'p', id: 'y', now: 1 }).why).toBe('3.3 min lost over 1 stop in the last four weeks');
  });
});

describe('a bar becomes a problem, once', () => {
  beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

  it('keeps the reason, the machine it is mostly on, and opens the same problem the second time', async () => {
    const db = await import('../../db');
    const { createProblem, loadProblems, viewsOf } = await import('../useProblems');
    const { openBarProblem } = await import('../paretoPicks');
    const { problemTitleOfBar, sameSource } = await import('../../screens/FishboneScreen');
    const proj = await db.createProject('Line 2A pace', '#000', 'Rowland', 'r@example.com', 'board');
    const ws = await db.createWorkspace('Line 2A');
    const line = await db.addPaceLine({ projectId: proj.id, key: '2A', name: 'Line 2A', sort: 0, workspaceId: ws.id });
    const t = Date.now();
    for (const [i, asset] of ['Bagger', 'Bagger', 'Basketer'].entries()) {
      await db.addObservation({ id: `o${i}`, workspaceId: ws.id, category: 'Waiting', asset, startedAt: t - (2 + i) * 86_400_000,
        durationMs: 3 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t });
    }
    const create = (o: { title: string; lineId?: string; source: Case['source'] }) => createProblem(proj.id, o);
    const views = async () => viewsOf(await loadProblems(proj.id), proj.id);
    const c = await openBarProblem({ category: 'Waiting', line, problems: await views(), create, why: 'Safety', title: problemTitleOfBar, same: sameSource });
    expect(c.source).toEqual({ kind: 'pareto', category: 'Waiting', asset: 'Bagger', why: 'Safety' });
    expect(c.title).toBe('Bagger waiting on Line 2A');
    expect(c.lineId).toBe(line.id);
    const again = await openBarProblem({ category: 'Waiting', line, problems: await views(), create, why: 'It is the constraint', title: problemTitleOfBar, same: sameSource });
    expect(again.id).toBe(c.id);
    expect((await views()).length).toBe(1);
    expect((await views())[0].problem.source?.why).toBe('Safety');
  });
});
