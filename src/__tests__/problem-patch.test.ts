/* A PROBLEM'S BOXES, EACH KEPT (FLOW-AUDIT #4).
 *
 * "If you type who owes a problem and then its due date, the name is lost."
 * The register's editor wrote each box as `{ ...theCopyItLastDrew, ...box }`.
 * WHOSE was written on leaving it; the date a moment later — from a copy the
 * screen had drawn before the name landed — and that second write put the old
 * name back while the page said "Saved". A field written is a field patched
 * into the row as it is stored now, never a whole row from a copy. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => await import('../db');
const problem = { id: 'p1', workspaceId: 'w1', problem: 'Bagger jaw jams on 2kg film', status: 'open' as const, raisedAt: 1, updatedAt: 1, media: [], owner: 'Priya Shah' };

describe('a problem patched by its fields', () => {
  it('two boxes written one after the other from the same drawn copy both stay', async () => {
    const db = await fresh();
    await db.addSnag(problem);
    /* both writes start from the copy the screen drew — neither waits for the other */
    await Promise.all([db.patchSnag('p1', { owner: 'Sam Lee' }), db.patchSnag('p1', { dueAt: 1_760_050_800_000 })]);
    const s = (await db.listAllSnags()).find(x => x.id === 'p1');
    expect(s?.owner).toBe('Sam Lee');
    expect(s?.dueAt).toBe(1_760_050_800_000);
    expect(s?.problem).toBe('Bagger jaw jams on 2kg film');
    expect(s?.updatedAt).toBeGreaterThan(1);
  }, 30_000);   /* the first to open the store in a fresh module graph */

  it('a change worked out from the stored row: journey steps added from two places both kept', async () => {
    const db = await fresh();
    await db.addSnag(problem);
    const step = (id: string) => (cur: { journey?: { id: string; at: number; did: string }[] }) => ({ journey: [...(cur.journey ?? []), { id, at: 2, did: `step ${id}` }] });
    await Promise.all([db.patchSnag('p1', step('a')), db.patchSnag('p1', step('b'))]);
    const s = (await db.listAllSnags()).find(x => x.id === 'p1');
    expect((s?.journey ?? []).map(j => j.id).sort()).toEqual(['a', 'b']);
  });

  it('a field cleared is cleared; a problem not here is not made', async () => {
    const db = await fresh();
    await db.addSnag(problem);
    await db.patchSnag('p1', { owner: undefined });
    expect((await db.listAllSnags()).find(x => x.id === 'p1')?.owner).toBeUndefined();
    expect(await db.patchSnag('nobody', { owner: 'X' })).toBeUndefined();
    expect((await db.listAllSnags()).length).toBe(1);
  });
});

/* FLOW-AUDIT #13: "a problem seen on the floor cannot become the head of the fish" */
describe('a problem in the register taken to its root cause', () => {
  it.each(['case', 'status'] as const)('keeps a concurrent %s edit when Undo is tapped', async edit => {
    const db = await fresh();
    const { problemFromRegister } = await import('../lib/useProblems');
    const ws = await db.createWorkspace('Line 7');
    const project = await db.createProject('Seal recovery', '#000', 'Rowland', undefined, 'board', 'dmaic', 'line-recovery');
    const line = await db.addPaceLine({ projectId: project.id, key: '7', name: 'Line 7', sort: 0, workspaceId: ws.id });
    await db.addSnag({ ...problem, workspaceId: ws.id });
    const result = await problemFromRegister('p1', project.id, line.id, project.name);
    if (!result) throw new Error('No investigation');
    if (edit === 'case') await db.patchCase(result.problem.id, c => ({ ...c, title: 'Updated from the floor' }));
    else await db.patchSnag('p1', { status: 'in_progress', closeNote: undefined });
    await result.undo();
    const updated = await db.getCase(result.problem.id);
    expect(updated?.title).toBe(edit === 'case' ? 'Updated from the floor' : problem.problem);
    expect(await db.getSnag('p1')).toMatchObject({ caseId: result.problem.id, status: edit === 'case' ? 'closed' : 'in_progress' });
  }, 30000);
  it('keeps a recovery from taking another project’s problem on the same line', async () => {
    const db = await fresh();
    const { problemFromRegister } = await import('../lib/useProblems');
    const ws = await db.createWorkspace('Line 7');
    const p = await db.createProject('Seal recovery', '#000', 'Rowland', undefined, 'board', 'dmaic', 'line-recovery');
    const line = await db.addPaceLine({ projectId: p.id, key: '7', name: 'Line 7', sort: 0, workspaceId: ws.id });
    await db.addSnag({ ...problem, workspaceId: ws.id, projectId: 'other' });
    expect(await problemFromRegister('p1', p.id, line.id, p.name)).toBeUndefined();
    expect(await db.listCases(ws.id)).toEqual([]);
    expect(await db.getSnag('p1')).toMatchObject({ status: 'open', projectId: 'other' });
  }, 30000);
  it('opens a 6M problem in its words on the job\'s line, the register problem taken there and said so; undone, both as they were', async () => {
    const db = await fresh();
    const { problemFromRegister, sixMProblemsOf } = await import('../lib/useProblems');
    const proj = await db.createProject('Line 7 pace', '#000', 'Rowland', 'r@example.com', 'board');
    const ws = await db.createWorkspace('Line 7');
    const line = await db.addPaceLine({ projectId: proj.id, key: '7', name: 'Line 7', sort: 0, workspaceId: ws.id });
    await db.addSnag({ ...problem, workspaceId: ws.id, journey: [{ id: 'j1', at: 5, did: 'New jaw springs', result: 'jammed again' }] });
    const attempts = await Promise.all([problemFromRegister('p1', proj.id, line.id, proj.name), problemFromRegister('p1', proj.id, line.id, proj.name)]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    const made = attempts.find(Boolean);
    if (!made) throw new Error('nothing was opened');
    expect([made.problem.title, made.problem.lineId, made.problem.source]).toEqual(['Bagger jaw jams on 2kg film', line.id, { kind: 'observed', snag: 'p1' }]);
    const s = (await db.listAllSnags()).find(x => x.id === 'p1');
    expect([s?.status, s?.caseId, s?.projectId, s?.journey?.map(j => j.did)]).toEqual(['closed', made.problem.id, proj.id, ['New jaw springs', 'Taken to 6M on Line 7 pace — to find its root cause']]);
    const rows = await sixMProblemsOf(proj.id);
    expect(rows.map(r => [r.title, r.open, r.phase, r.workspaceId, r.jobLineId, r.fromSnagId])).toEqual([['Bagger jaw jams on 2kg film', true, 'finding', ws.id, line.id, 'p1']]);
    await db.patchSnag('p1', row => ({ journey: [...(row.journey ?? []), { id: 'j2', at: 8, did: 'New observation' }] }));
    await made.undo();
    const back = (await db.listAllSnags()).find(x => x.id === 'p1');
    expect([back?.status, back?.caseId, back?.projectId, back?.journey?.length]).toEqual(['open', undefined, undefined, 2]);
    expect(await sixMProblemsOf(proj.id)).toEqual([]);
  }, 30_000);
});
