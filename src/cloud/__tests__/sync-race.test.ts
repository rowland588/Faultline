/* AN EDIT SAVED WHILE A PULL IS MERGING — scenario 10 of
 * scripts/sync-two-devices.mjs failed once under the gate: readings added on
 * the phone and a strike were gone from every device. A pull read the row,
 * merged the cloud's newer copy into it and wrote the merge back; a save on
 * the phone between that read and that write was written over, and the row
 * then counted as sent, so nothing ever carried it up. The write is now made
 * only if the row is still the one read (db rawPutIf), else read and merged
 * again. This makes the save land in exactly that window, every time. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

type Row = Record<string, unknown>;

function fakeCloud() {
  const tables = new Map<string, Map<string, Row>>();
  let rev = 0;
  const c = {
    rows: (t: string) => [...(tables.get(t)?.values() ?? [])],
    put(t: string, r: Row) { if (!tables.has(t)) tables.set(t, new Map()); tables.get(t)!.set(r.id as string, { ...r, rev: ++rev }); },
  };
  const chain = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let op: { kind: 'select' } | { kind: 'upsert'; rows: Row[] } | { kind: 'update'; patch: Row } = { kind: 'select' };
    let order: string | null = null; let limit = Infinity;
    const run = async () => {
      await Promise.resolve();
      if (op.kind === 'upsert') { const stored = op.rows.map(r => { c.put(table, { ...(tables.get(table)?.get(r.id as string) ?? {}), ...r }); return tables.get(table)!.get(r.id as string)!; }); return { data: stored, error: null }; }
      if (op.kind === 'update') { const hit = c.rows(table).filter(r => filters.every(f => f(r))); for (const r of hit) c.put(table, { ...r, ...op.patch }); return { data: hit.map(r => tables.get(table)!.get(r.id as string)!), error: null }; }
      let out = c.rows(table).filter(r => filters.every(f => f(r)));
      if (order) out = out.sort((a, b) => Number(a[order!]) - Number(b[order!]));
      return { data: out.slice(0, limit), error: null };
    };
    const b = {
      select: () => b,
      eq: (col: string, v: unknown) => { filters.push(r => r[col] === v); return b; },
      gt: (col: string, v: number) => { filters.push(r => Number(r[col]) > v); return b; },
      in: (col: string, vs: unknown[]) => { filters.push(r => vs.includes(r[col])); return b; },
      order: (col: string) => { order = col; return b; },
      limit: (n: number) => { limit = n; return b; },
      range: () => b,
      upsert: (rows: Row[]) => { op = { kind: 'upsert', rows }; return b; },
      update: (patch: Row) => { op = { kind: 'update', patch }; return b; },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run().then(res, rej),
    };
    return b;
  };
  const client = {
    from: chain,
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'rowland@example.com' } } } }) },
    storage: { from: () => ({ upload: async () => ({ error: null }), download: async () => ({ data: null, error: { status: 400, statusCode: '404', message: 'Object not found' } }) }) },
  };
  return { c, client };
}

/** The save to make the moment the pull has read the study, before it writes. */
let midPull: null | (() => Promise<void>) = null;

async function boot() {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
  const f = fakeCloud();
  vi.doMock('../client', () => ({ cloudConfigured: true, supabase: f.client }));
  vi.doMock('../../db', async (orig: () => Promise<Record<string, unknown>>) => {
    const m = await orig() as { rawGet: (s: string, id: string) => Promise<Row | undefined> };
    return { ...m, rawGet: async (store: string, id: string) => {
      const v = await m.rawGet(store, id);
      if (store === 'studies' && midPull) { const go = midPull; midPull = null; await go(); }
      return v;
    } };
  });
  const db = await import('../../db');
  const sync = await import('../sync');
  return { db, sync, cloud: f.c };
}

const reading = (id: string, value: number, struck?: boolean) => ({ id, value, at: 1, ...(struck ? { struck } : {}) });
const ids = (rs?: { id: string }[]) => (rs ?? []).map(r => r.id).sort().join(',');

describe('an edit saved while a pull is merging the same row', () => {
  beforeEach(() => { vi.unstubAllGlobals(); midPull = null; });

  it('is kept — merged with the cloud\'s copy, and sent', async () => {
    const { db, sync, cloud } = await boot();
    const t = Date.now();
    await db.putStudy({ id: 's', tool: 'capability', name: 'Weight 400 g', facts: { readings: [reading('r1', 401.2), reading('r2', 400.9)] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    await sync.syncNow();
    expect(ids((cloud.rows('studies')[0]?.facts as { readings?: { id: string }[] } | undefined)?.readings)).toBe('r1,r2');

    /* the laptop adds two readings: the cloud's copy is newer */
    const there = cloud.rows('studies')[0];
    cloud.put('studies', { ...there, facts: { readings: [reading('r1', 401.2), reading('r2', 400.9), reading('r3', 402.0), reading('r4', 401.5)] }, updated_at: Number(there.updated_at) + 5 });

    /* the phone adds one and strikes one — saved the moment the pull has read the row */
    midPull = async () => {
      await db.patchStudy('s', cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []).map(r => (r.id === 'r1' ? { ...r, struck: true } : r)), reading('r5', 399.9)] } }));
    };
    await sync.syncNow();
    expect(midPull).toBeNull();                      // the save did land mid-pull
    await sync.syncNow();                            // and goes up

    const here = await db.getStudy('s');
    const cl = cloud.rows('studies')[0].facts as { readings: { id: string; struck?: boolean }[] };
    expect(ids(here?.facts.readings)).toBe('r1,r2,r3,r4,r5');
    expect(ids(cl.readings)).toBe('r1,r2,r3,r4,r5');
    expect(here?.facts.readings?.find(r => r.id === 'r1')?.struck).toBe(true);
    expect(cl.readings.find(r => r.id === 'r1')?.struck).toBe(true);
  });
});
