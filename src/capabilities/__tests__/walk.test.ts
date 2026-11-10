/* THE FACTORY WALK (docs/FACTORY-WALK.md): a department with no line is a record of its own and never doubled; where the person is
 * is kept apart from what they are talking about; a photo is stamped with where and when; a photo is filed only by a confirmed card,
 * as a link to the one photograph (a problem takes the same key, nothing copied); a page reads only confirmed links. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';
import { linkMatches, placeSaid, walkPhotosFor, walkWith, type WalkStop } from '../../lib/walk';

vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines'), depts: await import('../../db/departments') });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

async function seed() {
  const f = await fresh();
  const w = await f.lines.addLineToFactory('Line 3');
  await f.db.updateWorkspace({ ...w, clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing hall', assets: ['Bagger', 'Checkweigher'] });
  const t = Date.now();
  const cid = 'conv1';
  await f.db.putStudy({ id: cid, tool: 'talk', name: 'Walk', facts: { colleague: true, turns: [], threads: [{ id: 'th1', title: 'Bagger jams', status: 'parked', scope: { lineId: w.id }, notes: [], refs: [], at: t }] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  await f.db.addSnag({ id: 'p1', workspaceId: w.id, problem: 'Bags not presenting', status: 'open', priority: 'high', raisedAt: t, updatedAt: t });
  const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), conversationId: cid, me: 'Rowland', ...o });
  return { ...f, w, cid, ctx };
}

describe('the walk, pure', () => {
  it('says a place, keeps a trail without repeating the same stop, and reads only confirmed links', () => {
    const a: WalkStop = { at: 1, how: 'said', site: 'Hull', area: 'Packing hall', lineId: 'L3', line: 'Line 3', machine: 'Bagger' };
    expect(placeSaid(a)).toBe('Hull › Packing hall › Line 3 › Bagger');
    const t1 = walkWith([], a);
    expect(walkWith(t1, { ...a, at: 2 })).toHaveLength(1);
    expect(walkWith(t1, { at: 3, how: 'said', area: 'Dispatch' })).toHaveLength(2);
    const link = { id: 'x', to: 'machine' as const, refId: 'L3', machine: 'Bagger', label: 'Bagger on Line 3', at: 1, how: 'confirmed' as const };
    expect(linkMatches(link, { lineId: 'L3' })).toBe(true);
    expect(linkMatches(link, { lineId: 'L3', machine: 'bagger' })).toBe(true);
    expect(linkMatches(link, { lineId: 'L3', machine: 'Checkweigher' })).toBe(false);
    /* a photo merely taken at the line is not shown on its page */
    const convs = [{ id: 'c', facts: { turns: [
      { id: 't1', at: 5, kind: 'photo', media: { blobKey: 'k1', mime: 'image/jpeg' }, where: a },
      { id: 't2', at: 6, kind: 'photo', media: { blobKey: 'k2', mime: 'image/jpeg' }, where: a, filed: [link] },
    ] } }];
    expect(walkPhotosFor(convs, { lineId: 'L3' }).map(p => p.blobKey)).toEqual(['k2']);
  });
});

describe('the walk, through the capabilities', () => {
  it('a department is its own record with nothing under it, found and never doubled', async () => {
    const { reg, ctx, depts, db } = await seed();
    const r = await reg.runCall(ctx(), call('add_department', { area: 'Dispatch', site: 'Hull', client: 'Acme Foods' }), { confirmed: true });
    expect(r.ok).toBe(true);
    const again = await reg.runCall(ctx(), call('add_department', { area: ' dispatch ', site: 'hull' }), { confirmed: true });
    expect(again.ok && again.says).toMatch(/already a department/);
    const list = await depts.listDepartments();
    expect(list).toHaveLength(1);
    expect(list[0].facts).toMatchObject({ area: 'Dispatch', site: 'Hull', client: 'Acme Foods' });
    expect(list[0].facts.known?.area?.how).toBe('reported');
    expect((await db.listWorkspaces()).map(w => w.name)).toEqual(['Line 3']);   /* no line made under it */
    expect((await reg.runCall(ctx(), call('add_department', { area: 'Goods in' }), { confirmed: false })).ok).toBe(false);   /* a card first */
  });

  it('a move is not a new subject: the position and trail change, the threads do not, and the open one here is offered', async () => {
    const { reg, ctx, w, cid, db } = await seed();
    await reg.runCall(ctx(), call('set_focus', { title: 'Film costs', scope: {} }), { confirmed: false });
    const r = await reg.runCall(ctx(), call('set_position', { lineId: w.id, machine: 'bagger', said: 'I am at the bagger on line 3' }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/You are at Hull › Packing hall › Line 3 › Bagger/);
    expect(r.says).toMatch(/subject stays “Film costs”/);
    expect(r.says).toMatch(/Open here: “Bagger jams” \(parked\)/);
    const s = await db.getStudy(cid);
    const f = s?.facts as unknown as { position: WalkStop; walk: WalkStop[]; threads: { title: string; status: string }[] };
    expect(f.position.machine).toBe('Bagger');
    expect(f.threads.find(t => t.title === 'Film costs')?.status).toBe('current');
    const d = await reg.runCall(ctx(), call('set_position', { area: 'Dispatch' }), { confirmed: false });
    expect(d.ok && d.says).toMatch(/not a department in Faultline yet/);
    expect(((await db.getStudy(cid))?.facts as unknown as { walk: WalkStop[] }).walk).toHaveLength(2);
    expect((await reg.runCall(ctx(), call('set_position', { machine: 'Bagger' }), { confirmed: false })).ok).toBe(false);
  });

  it('a photo is filed by a confirmed card to a machine and a problem — the same photograph, never a copy, never a guess', async () => {
    const { reg, ctx, w, cid, db } = await seed();
    await db.putBlob('talk-k1', new Blob(['x'], { type: 'image/jpeg' }));
    await db.patchStudy(cid, cur => ({ facts: { ...cur.facts, turns: [{ id: 't1', at: Date.now(), kind: 'photo', media: { blobKey: 'talk-k1', mime: 'image/jpeg', capturedAt: Date.now() }, where: { at: 1, how: 'said', lineId: w.id, line: 'Line 3' } }] } as never }));
    expect((await reg.runCall(ctx(), call('file_photo', { photoKey: 'talk-k1', to: 'machine', lineId: w.id, machine: 'Bagger' }), { confirmed: false })).ok).toBe(false);
    const guess = await reg.runCall(ctx(), call('file_photo', { photoKey: 'talk-k1', to: 'machine', lineId: w.id, machine: 'Wrapper' }), { confirmed: true });
    expect(!guess.ok && guess.why).toMatch(/never filed to a guess/);
    expect((await reg.runCall(ctx(), call('file_photo', { photoKey: 'talk-k1', to: 'machine', lineId: w.id, machine: 'bagger' }), { confirmed: true })).ok).toBe(true);
    expect((await reg.runCall(ctx(), call('file_photo', { photoKey: 'talk-k1', to: 'problem', problemId: 'p1' }), { confirmed: true })).ok).toBe(true);
    const twice = await reg.runCall(ctx(), call('file_photo', { photoKey: 'talk-k1', to: 'problem', problemId: 'p1' }), { confirmed: true });
    expect(!twice.ok && twice.why).toMatch(/already filed/);
    const snag = (await db.listAllSnags()).find(x => x.id === 'p1');
    expect(snag?.media?.map(m => m.blobKey)).toEqual(['talk-k1']);
    const convs = [(await db.getStudy(cid)) as { id: string; facts: unknown }];
    expect(walkPhotosFor(convs, { lineId: w.id, machine: 'Bagger' })).toHaveLength(1);
    expect(walkPhotosFor(convs, { lineId: w.id })[0].links.every(l => l.how === 'confirmed' && l.by === 'Rowland')).toBe(true);
    const st = await reg.runCall(ctx(), call('walk_state', {}), { confirmed: false });
    expect(st.ok && st.says).toMatch(/1 photo in all, 0 not filed/);
  });
});
