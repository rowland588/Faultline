/* MACHINES AND PROGRAMS ON THE LINE (docs/BLUEPRINT.md, Stage 2) — a program
 * planned on a line with no job; a machine named once, one record however
 * many times it is said; a rename carried to the record and the stops; and a
 * job deleted leaving the line's machines and programs where they stand.
 *
 * Each guards a way it could go wrong silently: two phones naming one
 * machine making two; a rename in Set up the line parting a machine from
 * what is known about it; and "delete for ever" on a finished job taking the
 * line's machines and the programs proved on them with it. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../db'), lines: await import('../lib/lines'), lr: await import('../lib/lineRecords') });
const job = (id: string, o: Record<string, unknown> = {}) => ({ id, name: id, color: '#000', workspaceIds: [], createdAt: 1, updatedAt: 1, ...o });

describe('a program planned on a line', () => {
  it('needs no job, names its machine, and the machine joins the line\'s list once', async () => {
    const { db, lines, lr } = await fresh();
    const w = await lines.addLineToFactory('Line 7', 'Packing');
    const p = await db.addLineProgram(w.id, { what: 'P-104 perforation', machine: 'Bagger', runs: 'Finest Red 2kg', testOn: '2026-10-20', note: 'OEM sends it Friday' });
    expect(p).toMatchObject({ projectId: '', workspaceId: w.id, what: 'P-104 perforation', runs: 'Finest Red 2kg', state: 'needed' });
    await db.addLineProgram(w.id, { what: 'P-105', machine: ' bagger ' });
    const ws = (await db.listWorkspaces()).find(x => x.id === w.id);
    expect(ws?.assets).toEqual(['Whole line', 'Bagger']);
    const assets = await db.listAllAssets();
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ id: lr.lineMachineId(w.id, 'Bagger'), projectId: '', workspaceId: w.id });
    const progs = lr.programsOnLine(w.id, await db.listAllPrograms(), await db.allPaceLines());
    expect(progs.map(x => x.what)).toEqual(['P-104 perforation', 'P-105']);
    expect(progs.every(x => x.assetId === assets[0].id)).toBe(true);
  });

  it('a machine named with its maker; renamed on the list, its record and its stops follow', async () => {
    const { db, lines, lr } = await fresh();
    const w = await lines.addLineToFactory('Line 7');
    await db.addMachineToLine(w.id, 'Checkweigher', 'Ishida');
    await db.addMachineToLine(w.id, 'Case packer');
    let ws = (await db.listWorkspaces()).find(x => x.id === w.id);
    if (!ws) throw new Error('the line was not kept');
    expect(lr.machinesOnLine(ws, await db.listAllAssets(), []).map(m => [m.name, m.record?.oem])).toEqual([['Checkweigher', 'Ishida'], ['Case packer', undefined]]);
    await db.updateWorkspace({ ...ws, assets: ['Check weigher', 'Case packer'] });
    await db.renameLineMachine(w.id, 'Checkweigher', 'Check weigher');
    ws = (await db.listWorkspaces()).find(x => x.id === w.id);
    if (!ws) throw new Error('the line was not kept');
    expect(lr.machinesOnLine(ws, await db.listAllAssets(), [])[0]).toMatchObject({ name: 'Check weigher', record: { oem: 'Ishida' } });
  });

  it('a job\'s new program finds the job\'s only line', async () => {
    const { db, lines, lr } = await fresh();
    const w = await lines.addLineToFactory('Line 2A');
    await db.addProject(job('stage-gate', { commissioning: {} }));
    await db.putPaceLine({ id: 'l1', projectId: 'stage-gate', key: '2A', name: 'Line 2A', workspaceId: w.id, updatedAt: 1 });
    expect(await db.lineForJobRecord('stage-gate')).toBe(w.id);
    await db.putProgram({ id: 'old', projectId: 'stage-gate', what: 'Written before', state: 'onMachine', sort: 10, createdAt: 1, updatedAt: 1 });
    expect(lr.programsOnLine(w.id, await db.listAllPrograms(), await db.allPaceLines()).map(p => p.id)).toEqual(['old']);
  });
});

describe('a job deleted for ever', () => {
  it('leaves the line\'s machines and programs on the line, on no job; its own go with it', async () => {
    const { db, lines } = await fresh();
    const w = await lines.addLineToFactory('Line 2A');
    await db.addProject(job('stage-gate', { commissioning: {} }));
    await db.putAsset({ id: 'm-line', projectId: 'stage-gate', workspaceId: w.id, name: 'Robot palletiser', state: 'running', sort: 1, updatedAt: 1 });
    await db.putAsset({ id: 'm-job', projectId: 'stage-gate', name: 'Spare', state: 'onSite', sort: 2, updatedAt: 1 });
    await db.putProgram({ id: 'p-line', projectId: 'stage-gate', workspaceId: w.id, what: 'Pallet 1200', state: 'proved', provedOn: '2026-10-01', sort: 10, createdAt: 1, updatedAt: 1 });
    await db.putProgram({ id: 'p-job', projectId: 'stage-gate', what: 'Trial', state: 'needed', sort: 20, createdAt: 1, updatedAt: 1 });
    const said = await db.projectContents('stage-gate');
    expect(said.find(x => x.store === 'commission_assets')?.count).toBe(1);
    expect(said.find(x => x.store === 'programs')?.count).toBe(1);
    await db.purgeProject('stage-gate');
    expect((await db.listAllAssets()).map(a => [a.id, a.projectId])).toEqual([['m-line', '']]);
    expect((await db.listAllPrograms()).map(p => [p.id, p.projectId, p.provedOn])).toEqual([['p-line', '', '2026-10-01']]);
  });
});

/* Flow audit #3, 13 October: PR-04 read "Proved 12 Oct" on the line and
 * "Failed · closed 13 Oct" on the job — the floor's failure on Set up's
 * programs stage never reached the program record the line shows. */
describe('one program, one answer', () => {
  const stage = { id: 'st', projectId: 'j', kind: 'install' as const, gate: 'setup' as const, title: 'Programs loaded', assetId: 'w', outcome: 'planned' as const, sort: 1, createdAt: 1, updatedAt: 1 };
  const part = (results: { is: 'failed' | 'baseline' | 'passed'; on: string; at: number }[]) =>
    ({ id: 'pt', projectId: 'j', testId: 'st', kind: 'next' as const, what: 'PR-04 Finest Red 2 kg', sort: 1, createdAt: 1, updatedAt: 1, results, doneAt: results.length ? results[results.length - 1].at : undefined });
  it('a failure said on the floor after its test passed drops it back to on the machine; taken off, its test proves it again', async () => {
    const { db } = await fresh();
    await db.addProject(job('j', { commissioning: {} }));
    await db.putTest(stage as never);
    await db.putProgram({ id: 'p04', projectId: 'j', assetId: 'w', what: 'PR-04 Finest Red 2 kg', state: 'onMachine', sort: 1, createdAt: 1, updatedAt: 1 });
    await db.putTest({ id: 'prove', projectId: 'j', kind: 'test', title: 'Prove program PR-04', assetId: 'w', programId: 'p04', outcome: 'passed', ranOn: '2026-10-12', sort: 2, createdAt: 1, updatedAt: 1 } as never);
    const read = async () => (await db.listAllPrograms()).find(p => p.id === 'p04');
    expect(await read()).toMatchObject({ state: 'proved', provedOn: '2026-10-12', testId: 'prove' });
    /* the floor fails it the next day */
    await db.putTestItem(part([{ is: 'failed', on: '2026-10-13', at: 2 }]) as never);
    expect(await read()).toMatchObject({ state: 'onMachine', testId: 'prove' });
    expect((await read())?.provedOn).toBeUndefined();
    /* its passed test written again proves nothing older than the failure */
    await db.patchTest('prove', { result: '500 packs, no rejects' });
    expect((await read())?.provedOn).toBeUndefined();
    /* the failure taken off (an undo): the test that proved it proves it again */
    await db.putTestItem(part([]) as never);
    expect(await read()).toMatchObject({ state: 'proved', provedOn: '2026-10-12' });
    /* a failure on the same day it was proved leaves Commission's word standing */
    await db.patchTestItem('pt', { results: [{ is: 'failed', on: '2026-10-12', at: 3 }] } as never);
    expect((await read())?.provedOn).toBe('2026-10-12');
  });
});
