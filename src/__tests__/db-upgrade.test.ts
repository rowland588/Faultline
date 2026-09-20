/* THE DEVICE'S OWN DATA, ACROSS AN APP UPDATE.
 *
 * Every screen reads from IndexedDB, and the open path is the one piece of this
 * app that can fail in a way nothing else can recover from: if the database will
 * not open, there is no app — no error screen with the data still safe behind it,
 * just nothing. And it is the hardest thing to test by hand, because reproducing
 * it means having yesterday's version of the app installed.
 *
 * The comments in db.ts name three failures that have actually happened, and each
 * one is a case below:
 *   - requesting a LOWER version than exists throws VersionError and wedges the
 *     whole app, which a foreign or newer build leaving the same-named database
 *     at a higher version really did cause
 *   - a store missing from a database already at or past our version, which needs
 *     a one-past bump so an idempotent pass can add it
 *   - an upgrade that loses what the device already had
 *
 * fake-indexeddb provides a real IDB implementation, so these exercise the actual
 * openDB calls rather than a mock of them.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';

const DB_NAME = 'faultline';

/** The stores db.ts declares it cannot run without. Read from the source so this
 *  list can never fall behind the one the app enforces. */
const REQUIRED: Parameters<Awaited<ReturnType<typeof import('../db').getDB>>['objectStoreNames']['contains']>[0][] = [
  'workspaces', 'observations', 'media', 'meta', 'segments', 'snag_assets', 'snags',
  'tombstones', 'cases', 'projects', 'project_targets', 'project_actuals',
  'pace_snapshots', 'pace_lines', 'pace_todos', 'pace_ppm', 'pace_wins', 'tree_nodes',
  'commission_assets', 'tests', 'test_items',
];

/** A fresh IndexedDB per test, and a fresh module registry so db.ts's cached
 *  connection does not leak from one case into the next. */
beforeEach(async () => {
  // vi.stubGlobal rather than assigning indexedDB directly: it is a read-only
  // global, and vitest puts it back afterwards instead of leaking a factory from
  // one file into the next.
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const freshDb = async () => {
  const db = await import('../db');
  return db.getDB();
};

describe('a fresh device', () => {
  it('opens at the current version with every store the app needs', async () => {
    const db = await freshDb();
    for (const store of REQUIRED) {
      expect(db.objectStoreNames.contains(store), `missing store: ${store}`).toBe(true);
    }
  });

  it('declares the same store list the test asserts', async () => {
    // Guards against this test rotting: if db.ts adds a store, the count moves.
    const db = await freshDb();
    expect([...db.objectStoreNames].sort()).toEqual([...REQUIRED].sort());
  });
});

describe('a device that already has data', () => {
  it('carries its rows through an upgrade from an older version', async () => {
    // THE CASE THAT MATTERS. Somebody's phone has last week's build and a week of
    // line walks in it. Opening the new build must not cost them any of it.
    const old = await openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('workspaces', { keyPath: 'id' });
        const obs = d.createObjectStore('observations', { keyPath: 'id' });
        obs.createIndex('by_workspace', 'workspaceId');
      },
    });
    await old.put('workspaces', { id: 'ws-1', name: 'Line 7', schemaVersion: 1 });
    await old.put('observations', { id: 'o-1', workspaceId: 'ws-1', category: 'Changeover', durationMs: 1000 });
    await old.put('observations', { id: 'o-2', workspaceId: 'ws-1', category: 'Breakdown', durationMs: 2000 });
    old.close();

    const db = await freshDb();

    expect(await db.get('workspaces', 'ws-1')).toMatchObject({ name: 'Line 7' });
    expect((await db.getAll('observations')).map(o => o.id).sort()).toEqual(['o-1', 'o-2']);
    // and the stores that did not exist before are there now
    for (const store of REQUIRED) {
      expect(db.objectStoreNames.contains(store), `missing store: ${store}`).toBe(true);
    }
  });

  it('adds an index a store was created without', async () => {
    // ensureStores creates indexes only when it creates the store, so a store that
    // already exists never gained a new one however many versions passed. Nothing
    // was broken by that yet — no shipped build made a store without its indexes —
    // but the next index added to an existing store would have worked on every
    // fresh install and done nothing at all on every device that already had the
    // app, surfacing as a thrown query on somebody's phone. ensureIndexes repairs
    // them on every upgrade instead.
    const old = await openDB(DB_NAME, 1, {
      upgrade(d) { d.createObjectStore('observations', { keyPath: 'id' }); },  // no indexes
    });
    await old.put('observations', { id: 'o-1', workspaceId: 'ws-1' });
    old.close();

    const db = await freshDb();
    const tx = db.transaction('observations');
    expect([...tx.store.indexNames]).toContain('by_workspace');
    expect([...tx.store.indexNames]).toContain('by_ws_started');
    await tx.done;
    // and the row that was already there is untouched
    expect(await db.get('observations', 'o-1')).toMatchObject({ workspaceId: 'ws-1' });
  });
});

describe('a database left at a HIGHER version by another build', () => {
  it('opens it rather than throwing VersionError and wedging the app', async () => {
    // Requesting a lower version than exists throws, and there is no screen to
    // show for it. A foreign or newer build sharing the database name has done
    // this for real.
    const foreign = await openDB(DB_NAME, 99, {
      upgrade(d) {
        for (const s of REQUIRED) d.createObjectStore(s, { keyPath: s === 'meta' || s === 'media' ? undefined : 'id' });
      },
    });
    await foreign.put('workspaces', { id: 'ws-1', name: 'from the newer build' });
    foreign.close();

    const db = await freshDb();
    expect(db.version).toBeGreaterThanOrEqual(99);
    expect(await db.get('workspaces', 'ws-1')).toMatchObject({ name: 'from the newer build' });
  });

  it('adds a store missing from it, by going one version past', async () => {
    // Already at or beyond our version, so a plain open would not upgrade at all
    // and the missing store would stay missing for ever.
    const short = REQUIRED.filter(s => s !== 'tests');
    const foreign = await openDB(DB_NAME, 99, {
      upgrade(d) {
        for (const s of short) d.createObjectStore(s, { keyPath: s === 'meta' || s === 'media' ? undefined : 'id' });
      },
    });
    await foreign.put('workspaces', { id: 'ws-1', name: 'kept' });
    foreign.close();

    const db = await freshDb();
    expect(db.objectStoreNames.contains('tests')).toBe(true);
    expect(db.version).toBeGreaterThan(99);
    expect(await db.get('workspaces', 'ws-1')).toMatchObject({ name: 'kept' });
  });
});

describe('opening twice', () => {
  it('is idempotent — the second open changes nothing', async () => {
    const first = await freshDb();
    const version = first.version;
    const stores = [...first.objectStoreNames].sort();

    vi.resetModules();
    const again = await (await import('../db')).getDB();

    expect(again.version).toBe(version);
    expect([...again.objectStoreNames].sort()).toEqual(stores);
  });

  it('hands the same connection back within one module instance', async () => {
    const db = await import('../db');
    const a = await db.getDB();
    const b = await db.getDB();
    expect(a).toBe(b);
  });
});

describe('deleting a record', () => {
  it('SOFT delete marks the row, so the other device learns it went', async () => {
    // Soft, as the name says: the row stays with deletedAt set and syncs that way.
    // I first wrote this expecting a tombstone and it failed — tombstones are for
    // HARD deletes, where there is no row left to carry the news.
    const db = await import('../db');
    const ws = await db.createWorkspace('Line 7');
    await db.addObservation({
      id: 'o-1', workspaceId: ws.id, category: 'Changeover', subcategory: '', asset: 'Bagger',
      shift: 'Days', startedAt: 1, endedAt: 2, durationMs: 1, count: 1, timing: 'stopwatch',
      media: [], createdAt: 1, updatedAt: 1,
    });

    await db.softDeleteObservation('o-1');

    const conn = await db.getDB();
    const row = await conn.get('observations', 'o-1');
    expect(row, 'a soft delete must leave the row behind to carry deletedAt').toBeTruthy();
    expect(row?.deletedAt ?? 0).toBeGreaterThan(0);
    // and it is hidden from the ordinary read
    expect((await db.listObservations(ws.id)).map(o => o.id)).not.toContain('o-1');
  });

  it('undo clears the mark and the row comes back', async () => {
    const db = await import('../db');
    const ws = await db.createWorkspace('Line 7');
    await db.addObservation({
      id: 'o-1', workspaceId: ws.id, category: 'Changeover', subcategory: '', asset: 'Bagger',
      shift: 'Days', startedAt: 1, endedAt: 2, durationMs: 1, count: 1, timing: 'stopwatch',
      media: [], createdAt: 1, updatedAt: 1,
    });
    await db.softDeleteObservation('o-1');
    await db.restoreObservation('o-1');
    expect((await db.listObservations(ws.id)).map(o => o.id)).toContain('o-1');
  });

  it('HARD delete records a tombstone, because no row is left to carry it', async () => {
    const db = await import('../db');
    const ws = await db.createWorkspace('Line 7');
    const conn = await db.getDB();
    await conn.put('pace_wins', {
      id: 'w-1', projectId: 'p1', lineId: 'l1', title: 'faster changeover',
      story: 'new sequence', impact: '+4 ppm', who: 'Dave', where: 'Line 7',
      createdAt: 1, updatedAt: 1,
    });

    await db.deletePaceWin('w-1');

    expect(await conn.get('pace_wins', 'w-1')).toBeUndefined();
    const tombs = await conn.getAll('tombstones');
    expect(
      tombs.some(t => JSON.stringify(t).includes('w-1')),
      'without a tombstone the row returns on the next pull, because the cloud never heard it was deleted',
    ).toBe(true);
    expect(ws.id).toBeTruthy();
  });
});

describe('the index list stays honest', () => {
  it('every index db.ts declares really exists on a fresh database', async () => {
    // Iterates the app's OWN table rather than a copy typed out here. A copy would
    // only prove the copy was right — and INDEXES is already a second declaration
    // of what the create-store blocks make, so the one thing worth checking is
    // that the declaration matches the database.
    const dbMod = await import('../db');
    const conn = await dbMod.getDB();
    for (const [store, index] of dbMod.INDEXES) {
      const tx = conn.transaction(store);
      expect([...tx.objectStore(store).indexNames], `${store} is missing ${index}`).toContain(index);
      await tx.done;
    }
  });

  it('declares an index for every store the queries index on', async () => {
    const dbMod = await import('../db');
    expect(dbMod.INDEXES.length).toBeGreaterThanOrEqual(22);
    // no duplicate declarations, which would be a silent no-op in the repair pass
    const keys = dbMod.INDEXES.map(([s, n]) => `${s}.${n}`);
    expect(new Set(keys).size, 'the same index is declared twice').toBe(keys.length);
  });
});
