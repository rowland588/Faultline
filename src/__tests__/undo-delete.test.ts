/* UNDO AFTER A DELETE brings back exactly what went.
 *
 * Every delete hands back how to take it back. Asserted against the real
 * store (fake-indexeddb): the rows, the photos they pointed at, and the
 * tombstone — which must be gone after an undo, or the next sync would push
 * the delete the undo was meant to cancel. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const photo = (k: string) => ({ id: `m-${k}`, kind: 'photo' as const, blobKey: k, mime: 'image/jpeg', capturedAt: 1 });

describe('undo after a delete', () => {
  it('brings a test back with what was found under it and every photo', async () => {
    const db = await import('../db');
    await db.putBlob('b-test', new Blob(['t']));
    await db.putBlob('b-item', new Blob(['i']));
    await db.putTest({ id: 't1', projectId: 'p', title: 'Seal', outcome: 'failed', sort: 1, createdAt: 1, updatedAt: 1, media: [photo('b-test')] });
    await db.putTestItem({ id: 'i1', projectId: 'p', testId: 't1', kind: 'found', what: 'Jaw cold', sort: 1, createdAt: 1, updatedAt: 1, media: [photo('b-item')] });

    const undo = await db.deleteTest('t1', 'p');
    expect(await db.listTests('p')).toHaveLength(0);
    expect(await db.getBlob('b-test')).toBeUndefined();
    expect((await db.listTombstones()).map(t => t.id).sort()).toEqual(['i1', 't1']);

    await undo();
    expect((await db.listTests('p')).map(t => t.title)).toEqual(['Seal']);
    expect((await db.listTestItems('p')).map(i => i.what)).toEqual(['Jaw cold']);
    expect(await db.getBlob('b-test')).toBeDefined();
    expect(await db.getBlob('b-item')).toBeDefined();
    expect(await db.listTombstones()).toEqual([]);
  });

  it('stamps what it brings back newer than the delete, so it wins on every device', async () => {
    const db = await import('../db');
    await db.putTest({ id: 't1', projectId: 'p', title: 'Seal', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 });
    const before = (await db.listTests('p'))[0].updatedAt;
    const undo = await db.deleteTest('t1', 'p');
    await new Promise(r => setTimeout(r, 5));
    await undo();
    expect((await db.listTests('p'))[0].updatedAt).toBeGreaterThan(before);
  });

  it('puts a machine back and its tests name it again', async () => {
    const db = await import('../db');
    await db.putAsset({ id: 'a1', projectId: 'p', name: 'Wrapper', state: 'running', sort: 1, updatedAt: 1 });
    await db.putTest({ id: 't1', projectId: 'p', title: 'Seal', outcome: 'planned', assetId: 'a1', sort: 1, createdAt: 1, updatedAt: 1 });
    const undo = await db.deleteAsset('a1', 'p');
    expect((await db.listTests('p'))[0].assetId).toBeUndefined();
    await undo();
    expect((await db.listAssets('p')).map(a => a.name)).toEqual(['Wrapper']);
    expect((await db.listTests('p'))[0].assetId).toBe('a1');
  });

  it('puts a lever tree branch back whole, and leaves the rest of the tree alone', async () => {
    const db = await import('../db');
    const box = (id: string, parentId?: string) => ({ id, projectId: 'p', parentId, text: id, rag: 'n' as const, sort: 0, createdAt: 1, updatedAt: 1 });
    await db.putTreeNodes([box('top'), box('line', 'top'), box('cond', 'line'), box('other', 'top')]);
    const undo = await db.deleteTreeBranch('p', 'line');
    expect((await db.listTreeNodes('p')).map(n => n.id).sort()).toEqual(['other', 'top']);
    expect((await db.listTombstones()).map(t => t.id).sort()).toEqual(['cond', 'line']);
    await undo();
    expect((await db.listTreeNodes('p')).map(n => n.id).sort()).toEqual(['cond', 'line', 'other', 'top']);
    expect((await db.listTreeNodes('p')).find(n => n.id === 'cond')?.parentId).toBe('line');
    expect(await db.listTombstones()).toEqual([]);
  });

  it('puts a material and a program back', async () => {
    const db = await import('../db');
    await db.putMaterial({ id: 'm1', projectId: 'p', what: 'Film', sort: 1, createdAt: 1, updatedAt: 1 });
    await db.putProgram({ id: 'g1', projectId: 'p', what: 'Recipe 1', state: 'needed', sort: 1, createdAt: 1, updatedAt: 1 });
    const um = await db.deleteMaterial('m1');
    const ug = await db.deleteProgram('g1');
    expect(await db.listMaterials('p')).toHaveLength(0);
    await um(); await ug();
    expect((await db.listMaterials('p')).map(m => m.what)).toEqual(['Film']);
    expect((await db.listPrograms('p')).map(g => g.what)).toEqual(['Recipe 1']);
    expect(await db.listTombstones()).toEqual([]);
  });

  /* "Call it Brillopak": the tidy rewrites every place a supplier is typed,
     touches nothing else, and is itself undoable. */
  it('makes a supplier’s spellings one in every place, and takes it back', async () => {
    const db = await import('../db');
    await db.putAsset({ id: 'a1', projectId: 'p', name: 'Wrapper', oem: 'Brilopak', state: 'awaited', sort: 1, updatedAt: 1 });
    await db.putTest({ id: 't1', projectId: 'p', title: 'Seal', withWhom: 'brillopak', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 });
    await db.putTest({ id: 't2', projectId: 'p', title: 'Other', withWhom: 'Ilapak UK', outcome: 'planned', sort: 2, createdAt: 1, updatedAt: 1 });
    await db.putMaterial({ id: 'm1', projectId: 'p', what: 'Film', from: 'Brilopak', sort: 1, createdAt: 1, updatedAt: 1 });
    await db.putProgram({ id: 'g1', projectId: 'p', what: 'Recipe', from: 'Brillopak', state: 'needed', sort: 1, createdAt: 1, updatedAt: 1 });

    const { changed, undo } = await db.renameSupplier(['p'], ['Brilopak', 'Brillopak'], 'Brillopak');
    expect(changed).toBe(3);   // machine, test, material — the program is already spelled right
    expect((await db.listAssets('p'))[0].oem).toBe('Brillopak');
    expect((await db.listTests('p')).map(t => t.withWhom).sort()).toEqual(['Brillopak', 'Ilapak UK']);
    expect((await db.listMaterials('p'))[0].from).toBe('Brillopak');

    await undo();
    expect((await db.listAssets('p'))[0].oem).toBe('Brilopak');
    expect((await db.listTests('p')).find(t => t.id === 't1')?.withWhom).toBe('brillopak');
    expect((await db.listPrograms('p'))[0].from).toBe('Brillopak');
  });
});
