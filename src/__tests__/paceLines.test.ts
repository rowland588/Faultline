/* A LINE'S IDENTITY, WHICH IS WHAT EVERY LINK TO IT DEPENDS ON.
 *
 * `loadPaceLines` does two jobs that pull against each other, and getting the
 * balance wrong is silent in both directions:
 *
 *   IT COLLAPSES RIVALS. A line added on the laptop and the same line added on
 *   the phone used to be two rows with two random ids, and the newer one would
 *   delete the older one along with the numbers typed into it. Two rows claiming
 *   one key are folded onto an id both devices derive the same way.
 *
 *   IT LEAVES EVERYTHING ELSE ALONE. A line nobody is fighting over keeps the id
 *   it was created with, because that id is in the URL of its pack, on its deck,
 *   and against every reading, next step and win ever written on it.
 *
 * That second rule used to be written as "not one of the lines the app seeds",
 * and deleting the seed took the rule away with it: every hand-added line was
 * quietly re-keyed on the next load, and every route to one answered "that line
 * isn't on this project any more". The smoke test caught it; these tests are so
 * that the next person does not have to.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const freshDb = async () => await import('../db');
const PROJ = 'proj-1';

describe('a line keeps the id it was created with', () => {
  it('survives a reload with the same id, so its pack is still reachable', async () => {
    const db = await freshDb();
    const added = await db.addPaceLine({ projectId: PROJ, key: '2A', name: 'Line 2A' });

    const after = await db.loadPaceLines(PROJ);

    expect(after.map(l => l.id)).toEqual([added.id]);
    // and again — a re-key that only happens on the second load is still a bug
    expect((await db.loadPaceLines(PROJ)).map(l => l.id)).toEqual([added.id]);
  });

  it('keeps what was written against it', async () => {
    const db = await freshDb();
    const line = await db.addPaceLine({ projectId: PROJ, key: '7', name: 'Line 7' });
    await db.putReading({
      id: 'r1', projectId: PROJ, lineId: line.id, measureId: 'm1',
      at: '2026-09-15', value: 61, createdAt: 1, updatedAt: 1,
    });

    const [reloaded] = await db.loadPaceLines(PROJ);

    // the reading points at a line that is still there under that id
    expect((await db.listReadings(PROJ))[0].lineId).toBe(reloaded.id);
  });

  it('leaves another project’s line with the same key alone', async () => {
    const db = await freshDb();
    const mine = await db.addPaceLine({ projectId: PROJ, key: '2A', name: 'Line 2A' });
    const theirs = await db.addPaceLine({ projectId: 'proj-2', key: '2A', name: 'Line 2A' });

    expect((await db.loadPaceLines(PROJ)).map(l => l.id)).toEqual([mine.id]);
    expect((await db.loadPaceLines('proj-2')).map(l => l.id)).toEqual([theirs.id]);
  });
});

describe('two rows claiming one line', () => {
  it('collapses onto one row, keeping the newer edit', async () => {
    const db = await freshDb();
    // Two devices, two random ids, one line — what the shared id exists to fix.
    await db.putPaceLine({ id: 'from-laptop', projectId: PROJ, key: '2A', name: 'Line 2A', updatedAt: 1 });
    await db.putPaceLine({ id: 'from-phone', projectId: PROJ, key: '2A', name: 'Line 2A — renamed', updatedAt: 1 });
    // putPaceLine stamps its own clock, so make the laptop's the older one
    const db2 = await db.getDB();
    await db2.put('pace_ppm', { id: 'from-laptop', projectId: PROJ, key: '2A', name: 'Line 2A', updatedAt: 10 });
    await db2.put('pace_ppm', { id: 'from-phone', projectId: PROJ, key: '2A', name: 'Line 2A — renamed', updatedAt: 20 });

    const after = await db.loadPaceLines(PROJ);

    expect(after).toHaveLength(1);
    expect(after[0].name, 'the newer edit wins').toBe('Line 2A — renamed');
    // on an id both devices derive the same way, so neither can mint a rival
    expect(after[0].id).toBe('ppm-proj-1-2A');
  });

  it('tombstones the row it folded away, so the other device follows', async () => {
    const db = await freshDb();
    const db2 = await db.getDB();
    await db2.put('pace_ppm', { id: 'from-laptop', projectId: PROJ, key: '2A', name: 'Line 2A', updatedAt: 10 });
    await db2.put('pace_ppm', { id: 'from-phone', projectId: PROJ, key: '2A', name: 'Line 2A', updatedAt: 20 });

    await db.loadPaceLines(PROJ);

    const stones = (await db.listTombstones()).filter(s => s.kind === 'pace_ppm');
    expect(stones.map(s => s.id)).toContain('from-laptop');
  });
});

describe('a deleted line stays deleted', () => {
  it('does not come back on the next load', async () => {
    const db = await freshDb();
    const line = await db.addPaceLine({ projectId: PROJ, key: '10', name: 'Line 10' });
    await db.deletePaceLine(line.id);

    expect(await db.loadPaceLines(PROJ)).toEqual([]);
    expect(await db.loadPaceLines(PROJ)).toEqual([]);
  });
});
