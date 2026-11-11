/* LUNA AND THE VISIT (docs/CONSULTANT-WORKSPACE.md C6): start_visit and end_visit by a card only; a new customer and its visit on one card,
 * the brief kept; visit_state reading only the visit's customer's records; switch_client switching the client the person is in with no
 * card, refusing an unknown or archived one; never another customer's record. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { CapCtx } from '../types';

vi.setConfig({ testTimeout: 30_000 });
const store = new Map<string, string>();
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
  vi.resetModules();
});

const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), me: 'Rowland', ...o });

async function seed() {
  const db = await import('../../db');
  const reg = await import('../registry');
  const lines = await import('../../lib/lines');
  const w = await lines.addLineToFactory('Branston Line 1');
  await db.updateWorkspace({ ...w, clientName: 'Branston', siteName: 'Lincoln' });
  const t = Date.now();
  await db.addSnag({ id: 'br1', workspaceId: w.id, problem: 'BRANSTON-ONLY seal drift', status: 'open', priority: 'high', raisedAt: t, updatedAt: t });
  return { db, reg, w, visits: await import('../../lib/visits'), ac: await import('../../lib/activeClient') };
}

describe('the visit through the capabilities', () => {
  it('a new customer and its visit on one card — nothing made before it, the brief kept, the customer the client you are in', async () => {
    const { reg, db, visits, ac } = await seed();
    const input = { client: 'Business B', site: 'Leeds', brief: 'look at their production performance' };
    const p = await reg.previewCall(ctx(), call('start_visit', input));
    expect(p.ok && p.says).toMatch(/Add Business B as a new customer \(Leeds\).*start a visit there today.*“look at their production performance”/);
    expect((await reg.runCall(ctx(), call('start_visit', input), { confirmed: false })).ok).toBe(false);
    expect(visits.visitsOf(await db.listAllStudies())).toHaveLength(0);
    const r = await reg.runCall(ctx(), call('start_visit', input), { confirmed: true });
    expect(r.ok && r.says).toMatch(/Business B is a customer now, and the visit at Business B \(Leeds\) is started/);
    const vs = visits.visitsOf(await db.listAllStudies());
    expect(vs.map(v => [v.client, v.site, v.brief, v.by])).toEqual([['Business B', 'Leeds', 'look at their production performance', 'Rowland']]);
    expect(visits.storedVisit()?.id).toBe(vs[0].id);
    expect(ac.storedClient()).toBe('Business B');
    expect(r.ok && r.refs[0].href).toBe(`/visit/${vs[0].id}`);
  });

  it('visit_state reads only the visit’s customer — never Branston’s problem raised in the same hours', async () => {
    const { reg, db } = await seed();
    await reg.runCall(ctx(), call('start_visit', { client: 'Business B' }), { confirmed: true });
    const lines = await import('../../lib/lines');
    const b = await lines.addLineToFactory('B Packing 1');   /* takes the customer in hand */
    expect(b.clientName).toBe('Business B');
    const t = Date.now();
    await db.addSnag({ id: 'b1', workspaceId: b.id, problem: 'Guard loose', status: 'open', priority: 'low', raisedAt: t, updatedAt: t });
    const s = await reg.runCall(ctx(), call('visit_state', {}), { confirmed: false });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.says).toMatch(/The visit in hand: Business B/);
    expect(s.says).toMatch(/1 problem/);
    const data = s.data as { problems: { id: string }[] };
    expect(data.problems.map(x => x.id)).toEqual(['b1']);
    expect(JSON.stringify(s)).not.toMatch(/BRANSTON-ONLY/);
  });

  it('“I’m back at Branston” switches the client with no card; an unknown or archived customer is refused', async () => {
    const { reg, ac } = await seed();
    await reg.runCall(ctx(), call('start_visit', { client: 'Business B' }), { confirmed: true });
    const r = await reg.runCall(ctx(), call('switch_client', { client: 'branston' }), { confirmed: false });
    expect(r.ok && r.says).toMatch(/You are in Branston now.*The visit at Business B is still in hand/);
    expect(ac.storedClient()).toBe('Branston');
    const no = await reg.runCall(ctx(), call('switch_client', { client: 'Cobb Foods' }), { confirmed: false });
    expect(!no.ok && no.why).toMatch(/No customer called “Cobb Foods”/);
    const cust = await import('../../lib/customers');
    await cust.archiveCustomer('Business B');
    const gone = await reg.runCall(ctx(), call('switch_client', { client: 'Business B' }), { confirmed: false });
    expect(!gone.ok && gone.why).toMatch(/archived/);
  });

  it('end_visit by a card; with none in hand it is refused before any card; a client changes nothing', async () => {
    const { reg, db, visits } = await seed();
    expect((await reg.previewCall(ctx(), call('end_visit', {}))).ok).toBe(false);
    await reg.runCall(ctx(), call('start_visit', { client: 'Business B' }), { confirmed: true });
    expect((await reg.runCall(ctx(), call('end_visit', {}), { confirmed: false })).ok).toBe(false);
    const e = await reg.runCall(ctx(), call('end_visit', {}), { confirmed: true });
    expect(e.ok && e.says).toMatch(/The visit at Business B is ended/);
    expect(visits.visitsOf(await db.listAllStudies())[0].endedAt).toBeTypeOf('number');
    expect(visits.storedVisit()).toBeNull();
    expect((await reg.previewCall(ctx({ level: 'client' }), call('start_visit', { client: 'Business C' }))).ok).toBe(false);
  });
});
