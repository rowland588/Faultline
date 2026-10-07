/* A WHOLE SYNC PASS, against a cloud small enough to read.
 *
 * Each case here is a fault scripts/sync-two-devices.mjs found by driving two
 * real browsers — kept as a unit test too, so it fails on every commit rather
 * than only when somebody runs the harness:
 *
 *   - one row the cloud refused held back every row of its kind in the batch;
 *   - with no signal the pass reported "signed out", nothing counted the
 *     unsent work, and Sign out wiped it;
 *   - two triggers together ran two passes at once;
 *   - a second device sent back up every file it had only downloaded;
 *   - a file over the bucket's limit was "still to back up" for ever;
 *   - two devices editing different boxes of one test lost one of them. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

type Row = Record<string, unknown>;
const NET = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };

/** Just enough of supabase-js for the engine: the chains it builds, a rev per
 *  write, one statement per upsert (one refused row fails it all, as Postgres
 *  does), and a bucket with a size limit. */
function fakeCloud() {
  const tables = new Map<string, Map<string, Row>>();
  const objects = new Map<string, Blob>();
  let rev = 0;
  const c = {
    tables, objects,
    offline: false,
    refuse: null as null | ((t: string, r: Row) => boolean),
    limit: Infinity,
    upserts: [] as { table: string; ids: string[]; ok: boolean }[],
    uploads: [] as string[],
    pulls: 0,
    rows: (t: string) => [...(tables.get(t)?.values() ?? [])],
    put(t: string, r: Row) { if (!tables.has(t)) tables.set(t, new Map()); tables.get(t)!.set(r.id as string, { ...r, rev: ++rev }); },
  };
  const chain = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let op: { kind: 'select' } | { kind: 'upsert'; rows: Row[] } | { kind: 'update'; patch: Row } = { kind: 'select' };
    let order: string | null = null; let limit = Infinity;
    const run = async () => {
      await Promise.resolve();
      if (c.offline) return { data: null, error: NET };
      if (op.kind === 'upsert') {
        const bad = c.refuse && op.rows.some(r => c.refuse!(table, r));
        c.upserts.push({ table, ids: op.rows.map(r => r.id as string), ok: !bad });
        if (bad) return { data: null, error: { code: '42501', message: `new row violates row-level security policy for table "${table}"`, details: null, hint: null } };
        for (const r of op.rows) c.put(table, { ...(tables.get(table)?.get(r.id as string) ?? {}), ...r });
        return { data: null, error: null };
      }
      if (op.kind === 'update') {
        for (const r of c.rows(table).filter(r => filters.every(f => f(r)))) c.put(table, { ...r, ...op.patch });
        return { data: null, error: null };
      }
      if (table === 'tests') c.pulls++;
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
    storage: { from: () => ({
      upload: async (key: string, blob: Blob) => {
        if (c.offline) return { error: { message: 'Failed to fetch' } };
        c.uploads.push(key);
        if (blob.size > c.limit) return { error: { status: 413, statusCode: '413', message: 'The object exceeded the maximum allowed size' } };
        c.objects.set(key, blob);
        return { error: null };
      },
      download: async (path: string) => {
        const o = c.objects.get(path);
        return o ? { data: o, error: null } : { data: null, error: { status: 400, statusCode: '404', message: 'Object not found' } };
      },
    }) },
  };
  return { c, client };
}

let cloud: ReturnType<typeof fakeCloud>['c'];
async function boot() {
  vi.resetModules();
  vi.stubGlobal('indexedDB', new IDBFactory());
  const f = fakeCloud();
  cloud = f.c;
  vi.doMock('../client', () => ({ cloudConfigured: true, supabase: f.client }));
  const db = await import('../../db');
  const sync = await import('../sync');
  return { db, sync };
}
const T = (id: string, extra: Row = {}) => ({ id, projectId: 'p1', kind: 'test' as const, title: id, outcome: 'planned' as const, sort: 1, createdAt: 1, updatedAt: 1, ...extra });
const I = (id: string, what: string) => ({ id, projectId: 'p1', testId: 't1', kind: 'found' as const, what, sort: 1, createdAt: 1, updatedAt: 1 });

describe('a sync pass', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('one row the cloud refuses holds back only itself', async () => {
    const { db, sync } = await boot();
    await db.putTestItem(I('a', 'before it'));
    await db.putTestItem(I('b', 'REFUSE ME'));
    await db.putTestItem(I('c', 'after it'));
    cloud.refuse = (t, r) => t === 'test_items' && r.what === 'REFUSE ME';
    await sync.syncNow();
    expect(cloud.rows('test_items').map(r => r.what).sort()).toEqual(['after it', 'before it']);
    expect(sync.syncStatus().refused).toEqual([expect.objectContaining({ kind: 'test_items', rows: 1 })]);
    expect(sync.syncStatus().unsent).toBe(1);
    /* the rule lifted: it goes, and nothing is left */
    cloud.refuse = null;
    await sync.syncNow();
    expect(cloud.rows('test_items')).toHaveLength(3);
    expect(sync.syncStatus()).toMatchObject({ state: 'idle', refused: [], unsent: 0 });
  });

  it('with no signal says it is waiting, counts what is unsent, and never says "signed out"', async () => {
    const { db, sync } = await boot();
    cloud.offline = true;
    await db.putTestItem(I('a', 'filmed with no signal'));
    await sync.syncNow();
    const s = sync.syncStatus();
    expect(s.state).toBe('error');
    expect(s.unsent).toBe(1);
    expect(s.refused ?? []).toEqual([]);              // a dropped connection is not the cloud refusing
    cloud.offline = false;
    await sync.syncNow();
    expect(sync.syncStatus()).toMatchObject({ state: 'idle', unsent: 0 });
    expect(cloud.rows('test_items')).toHaveLength(1);
  });

  it('two calls at once run one pass, not two', async () => {
    const { db, sync } = await boot();
    await db.putTest(T('t1'));
    await Promise.all([sync.syncNow(), sync.syncNow(), sync.syncNow()]);
    expect(cloud.pulls).toBe(1);
    expect(cloud.upserts.filter(u => u.table === 'tests')).toHaveLength(1);
  });

  it('does not send back up a file it only downloaded', async () => {
    const { db, sync } = await boot();
    const media = [{ id: 'm1', kind: 'video', blobKey: 'blob-film', mime: 'video/webm', capturedAt: 1 }];
    cloud.put('tests', { id: 't1', project_id: 'p1', kind: 'test', title: 'Run', outcome: 'planned', media, sort: 1, created_at: 1, updated_at: 5 });
    cloud.objects.set('blob-film', new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3])], { type: 'video/webm' }));
    await sync.syncNow();
    for (let i = 0; i < 50 && !(await db.hasBlob('blob-film')); i++) await new Promise(r => setTimeout(r, 10));
    expect(await db.hasBlob('blob-film')).toBe(true);
    await db.patchTest('t1', { result: 'edited on the laptop' });
    await sync.syncNow();
    expect(cloud.rows('tests')[0].result).toBe('edited on the laptop');
    expect(cloud.uploads).toEqual([]);
  });

  it('a file over the limit is named too big, sent once, and not counted as still to back up', async () => {
    const { db, sync } = await boot();
    cloud.limit = 4;
    await db.putBlob('blob-big', new Blob([new Uint8Array(10)], { type: 'video/webm' }));
    await db.putTest(T('t1', { media: [{ id: 'm1', kind: 'video', blobKey: 'blob-big', mime: 'video/webm', capturedAt: 1 }] }));
    await sync.syncNow();
    await sync.syncNow();
    expect(cloud.uploads).toEqual(['blob-big']);
    expect(sync.syncStatus()).toMatchObject({ pendingUp: 0, tooBig: [{ key: 'blob-big', bytes: 10 }] });
    expect(cloud.rows('tests')).toHaveLength(1);       // the record itself still went
  });

  it('two devices editing different boxes of one test keep both', async () => {
    const { db, sync } = await boot();
    await db.putTest(T('t1'));
    await sync.syncNow();                              // agreed with the cloud
    /* the other device changes the result, and the cloud has it… */
    const theirs = cloud.rows('tests')[0];
    cloud.put('tests', { ...theirs, result: 'PHONE: 72 ppm', updated_at: Number(theirs.updated_at) + 10 });
    /* …while this one, offline, changed who it was done with — later */
    await new Promise(r => setTimeout(r, 5));
    await db.patchTest('t1', { withWhom: 'LAPTOP: Brillopak' });
    await sync.syncNow();
    const row = cloud.rows('tests')[0];
    expect(row).toMatchObject({ result: 'PHONE: 72 ppm', with_whom: 'LAPTOP: Brillopak' });
    expect(await db.getDB().then(d => d.get('tests', 't1'))).toMatchObject({ result: 'PHONE: 72 ppm', withWhom: 'LAPTOP: Brillopak' });
  });

  it('two edits in the same millisecond on two devices are both kept, not taken for an echo', async () => {
    const { db, sync } = await boot();
    await db.putTest(T('t1'));
    await sync.syncNow();
    await db.patchTest('t1', { withWhom: 'LAPTOP: Brillopak' });
    const mine = await db.getDB().then(d => d.get('tests', 't1'));
    const theirs = cloud.rows('tests')[0];
    /* the phone's edit carries exactly this device's clock */
    cloud.put('tests', { ...theirs, result: 'PHONE: 72 ppm', updated_at: mine!.updatedAt });
    await sync.syncNow();
    expect(cloud.rows('tests')[0]).toMatchObject({ result: 'PHONE: 72 ppm', with_whom: 'LAPTOP: Brillopak' });
  });
});

describe('mergeRows — who moved which box', () => {
  it('takes each side’s own change, and the newer clock only where both changed', async () => {
    const { mergeRows } = await import('../sync');
    const base = { id: 'x', a: 1, b: 1, c: 1, updated_at: 1 };
    const mine = { id: 'x', a: 2, b: 1, c: 3, updated_at: 3 };
    const theirs = { id: 'x', a: 1, b: 2, c: 4, updated_at: 2, rev: 9 };
    expect(mergeRows(base, mine, theirs, true)).toEqual({ row: { id: 'x', a: 2, b: 2, c: 3, updated_at: 2, rev: 9 }, ours: true, lost: [] });
    expect(mergeRows(base, mine, theirs, false)).toEqual({ row: { id: 'x', a: 2, b: 2, c: 4, updated_at: 2, rev: 9 }, ours: true, lost: ['c'] });
  });
  it('keeps a clip filmed offline AND a photo added elsewhere', async () => {
    const { mergeRows } = await import('../sync');
    const p = { id: 'p' }, v1 = { id: 'v1' }, v2 = { id: 'v2' }, ph = { id: 'ph' };
    const r = mergeRows({ media: [p, v1] }, { media: [p, v1, v2] }, { media: [p, ph] }, false);
    expect((r.row.media as { id: string }[]).map(m => m.id)).toEqual(['p', 'ph', 'v2']);   // v1 removed there, v2 added here
  });
  it('numbers put in for one product on the phone and another on the laptop both stay', async () => {
    const { mergeRows } = await import('../sync');
    const base = { runs: [{ id: 'a', product: 'Red' }, { id: 'b', product: 'White' }] };
    const mine = { runs: [{ id: 'a', product: 'Red', day: { packs: 3720 } }, { id: 'b', product: 'White' }] };
    const theirs = { runs: [{ id: 'a', product: 'Red' }, { id: 'b', product: 'White', day: { packs: 3550 } }, { id: 'c', product: 'Piper' }] };
    for (const mineNewer of [true, false]) {
      expect(mergeRows(base, mine, theirs, mineNewer).row.runs).toEqual([
        { id: 'a', product: 'Red', day: { packs: 3720 } }, { id: 'b', product: 'White', day: { packs: 3550 } }, { id: 'c', product: 'Piper' }]);
    }
    /* Both changed the same product: the newer, as any box both changed. */
    const both = mergeRows(base, mine, { runs: [{ id: 'a', product: 'Red', day: { packs: 1 } }, base.runs[1]] }, false);
    expect((both.row.runs as { day?: unknown }[])[0].day).toEqual({ packs: 1 });
  });
  it('has nothing of ours when we changed nothing the cloud lacks', async () => {
    const { mergeRows } = await import('../sync');
    expect(mergeRows({ a: 1 }, { a: 2 }, { a: 2 }, true).ours).toBe(false);
  });
});

describe('reading what went wrong', () => {
  it('tells no connection from the cloud saying no', async () => {
    const { isNoConnection, isTooLarge } = await import('../sync');
    expect(isNoConnection(NET)).toBe(true);
    expect(isNoConnection({ message: 'Load failed' })).toBe(true);
    expect(isNoConnection({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false);
    expect(isTooLarge({ status: 413, statusCode: '413', message: 'The object exceeded the maximum allowed size' })).toBe(true);
    expect(isTooLarge({ status: 400, statusCode: '404', message: 'Object not found' })).toBe(false);
  });
});

describe('mergeRows — what is not an edit', () => {
  it('leaves a column only the cloud has, and who pushed it, as theirs', async () => {
    const { mergeRows } = await import('../sync');
    const r = mergeRows({ a: 1, legacy: 7, owner_id: 'them' }, { a: 1, owner_id: 'me' }, { a: 1, legacy: 7, owner_id: 'them' }, true);
    expect(r).toEqual({ row: { a: 1, legacy: 7, owner_id: 'them' }, ours: false, lost: [] });
  });
});
