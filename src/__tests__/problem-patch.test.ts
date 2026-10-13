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
  });

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
