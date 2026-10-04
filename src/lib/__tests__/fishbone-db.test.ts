/* The 6M problems against the real store: opening one on a line, causes merged
 * by id, closing with a hold and reopening, and legacy Cases (no project on
 * the row) still read as the line's problems. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { Case } from '../../types';
import type { Cause } from '../sixm';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const cause = (o: Partial<Cause> = {}): Cause => ({ id: 'k1', m: 'machine', text: 'Guide rail worn', grade: 'observed', status: 'suspected', whys: [], at: 1, ...o });

async function setup() {
  const db = await import('../../db');
  const hook = await import('../useProblems');
  const proj = await db.createProject('Line 2A pace', '#000', 'Rowland', 'r@example.com', 'board');
  const ws = await db.createWorkspace('Line 2A');
  const line = await db.addPaceLine({ projectId: proj.id, key: '2A', name: 'Line 2A', sort: 0, workspaceId: ws.id });
  const bare = await db.addPaceLine({ projectId: proj.id, key: '7', name: 'Line 7', sort: 1 });
  const t = Date.now();
  for (let i = 0; i < 6; i++) {
    await db.addObservation({
      id: `o${i}`, workspaceId: ws.id, category: 'Minor stop', subcategory: 'Misfeed', asset: 'Basketer',
      startedAt: t - (8 + i * 3) * 86_400_000, durationMs: 30 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t,
    });
  }
  return { db, hook, proj, ws, line, bare };
}

describe('a problem in the store', () => {
  it('opens on its line’s workspace, with its project, source, path and baseline', async () => {
    const { db, hook, proj, ws, line } = await setup();
    const c = await hook.createProblem(proj.id, { title: 'Basketer misfeeds', lineId: line.id, source: { kind: 'pareto', category: 'Minor stop', asset: 'Basketer' } });
    expect(c.workspaceId).toBe(ws.id);
    expect(c.projectId).toBe(proj.id);
    expect(c.lineId).toBe(line.id);
    expect(c.status).toBe('open');
    expect(c.causes).toEqual([]);
    expect(c.path).toEqual([{ dimension: 'asset', value: 'Basketer' }, { dimension: 'category', value: 'Minor stop' }]);
    expect(c.baselineMsWeek).toBeGreaterThan(0);
    expect(await db.getCase(c.id)).toBeDefined();
  });

  it('makes the line’s workspace on first use and writes it onto the line', async () => {
    const { db, hook, proj, bare } = await setup();
    const c = await hook.createProblem(proj.id, { title: 'Line 7 below rate', lineId: bare.id, source: { kind: 'gap' } });
    const after = (await db.loadPaceLines(proj.id)).find(l => l.id === bare.id);
    expect(after?.workspaceId).toBe(c.workspaceId);
    expect(c.baselineMsWeek).toBe(0);
  });

  it('merges causes by id, removes one, closes with a hold, records the check, reopens', async () => {
    const { db, hook, proj, line } = await setup();
    const c = await hook.createProblem(proj.id, { title: 'P', lineId: line.id, source: { kind: 'pareto', asset: 'Basketer' } });
    await hook.saveCauseOn(c.id, cause());
    await hook.saveCauseOn(c.id, cause({ id: 'k2', m: 'people', text: 'Nights' }));
    await hook.saveCauseOn(c.id, cause({ status: 'confirmed', root: true }));
    let row = await db.getCase(c.id);
    expect(row?.causes?.map(x => [x.id, x.status])).toEqual([['k1', 'confirmed'], ['k2', 'suspected']]);
    expect(row?.updatedAt).toBeGreaterThanOrEqual(c.updatedAt);

    await hook.removeCauseFrom(c.id, 'k2');
    row = await db.getCase(c.id);
    expect(row?.causes?.map(x => x.id)).toEqual(['k1']);

    await hook.closeProblem(c.id, { what: 'Rail checked weekly', everyDays: 7, since: '2026-10-01' });
    row = await db.getCase(c.id);
    expect(row?.status).toBe('closed');
    expect(row?.closedAt).toBeDefined();
    expect(row?.hold?.what).toBe('Rail checked weekly');

    await hook.checkedProblem(c.id);
    expect((await db.getCase(c.id))?.hold?.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await hook.reopenProblem(c.id);
    row = await db.getCase(c.id);
    expect(row?.status).toBe('open');
    expect(row?.closedAt).toBeUndefined();
    expect(row?.hold?.what).toBe('Rail checked weekly');   // the check stays
  });

  it('a write to a problem that has gone is undefined, not a crash', async () => {
    const { hook } = await setup();
    expect(await hook.saveCauseOn('nope', cause())).toBeUndefined();
  });
});

describe('loading a project’s problems', () => {
  it('reads new problems and legacy Cases on its lines, with their countermeasures', async () => {
    const { db, hook, proj, ws, line } = await setup();
    const legacy: Case = { id: 'legacy', workspaceId: ws.id, title: 'old case', path: [], baselineMsWeek: 600_000, status: 'open', openedAt: 1, updatedAt: 1 };
    const elsewhere: Case = { ...legacy, id: 'elsewhere', workspaceId: 'some-other-ws' };
    await db.addCase(legacy);
    await db.addCase(elsewhere);
    const c = await hook.createProblem(proj.id, { title: 'P', lineId: line.id, source: { kind: 'pareto', asset: 'Basketer' } });
    await hook.saveCauseOn(c.id, cause({ status: 'confirmed', root: true }));
    const t = Date.now();
    await db.putPaceTodo({ id: 'a1', projectId: proj.id, lineId: line.id, what: 'Replace the rail', where: '', why: '', who: 'Eng', when: '', state: 'todo', pillar: 'machine', causeRef: `${c.id}:k1`, expect: 'misfeeds halve', createdAt: t, updatedAt: t });
    await db.putPaceTodo({ id: 'a2', projectId: proj.id, what: 'Just do it', where: '', why: '', who: '', when: '', state: 'todo', createdAt: t, updatedAt: t });

    const loaded = await hook.loadProblems(proj.id);
    expect(loaded.cases.map(x => x.id).sort()).toEqual([c.id, 'legacy'].sort());
    const views = hook.viewsOf(loaded, proj.id, line.id);
    const mine = views.find(v => v.problem.id === c.id);
    expect(mine?.phase).toBe('acting');
    expect(mine?.actions.map(a => a.uid)).toEqual(['a1']);
    expect((mine?.actions[0] as { expect?: string }).expect).toBe('misfeeds halve');
    expect(mine?.bones).toHaveLength(6);
    expect(mine?.bones.find(b => b.m === 'machine')?.suggestions.some(s => s.text.includes('Misfeed'))).toBe(true);
    const old = views.find(v => v.problem.id === 'legacy');
    expect(old?.phase).toBe('finding');
    expect(old?.measure?.label).toBe('Lost time on Line 2A');

    // the other line sees neither
    const l7 = (await db.loadPaceLines(proj.id)).find(l => l.key === '7');
    expect(hook.viewsOf(loaded, proj.id, l7?.id)).toEqual([]);
  });

  it('listProjectCases keeps deleted and other projects’ cases out', async () => {
    const { db, proj, ws } = await setup();
    await db.addCase({ id: 'mine', workspaceId: 'x', projectId: proj.id, title: 'a', path: [], baselineMsWeek: 0, status: 'open', openedAt: 2, updatedAt: 1 });
    await db.addCase({ id: 'theirs', workspaceId: ws.id, projectId: 'other', title: 'b', path: [], baselineMsWeek: 0, status: 'open', openedAt: 3, updatedAt: 1 });
    await db.addCase({ id: 'gone', workspaceId: ws.id, title: 'c', path: [], baselineMsWeek: 0, status: 'open', openedAt: 4, updatedAt: 1, deletedAt: 5 });
    await db.addCase({ id: 'legacy', workspaceId: ws.id, title: 'd', path: [], baselineMsWeek: 0, status: 'open', openedAt: 1, updatedAt: 1 });
    expect((await db.listProjectCases(proj.id, [ws.id])).map(c => c.id)).toEqual(['mine', 'legacy']);
  });
});
