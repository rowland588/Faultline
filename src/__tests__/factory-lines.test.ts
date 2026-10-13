/* YOUR FACTORY, AND THE JOBS ON IT (slice 2) — a line of the factory is
 * shared by the jobs on it; a project's own walk is never a line; a
 * project's line finds the factory's line of its name and never makes a
 * second.
 *
 * Each guards a way the factory could go wrong silently: one job archived
 * taking a line another job still uses out of the factory; a project's walk
 * listed among the lines as a line nobody has; and "Line 2A" made twice, its
 * problems split between two lines that look the same. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../db'), lines: await import('../lib/lines') });
const job = (id: string, o: Record<string, unknown> = {}) => ({ id, name: id, color: '#000', workspaceIds: [], createdAt: 1, updatedAt: 1, ...o });

describe('a line shared by the jobs on it', () => {
  it('stays in the factory while any job on it is live, and goes when every one is archived', async () => {
    const { db, lines } = await fresh();
    const w = await lines.addLineToFactory('Line 2A', 'Packing');
    await db.addProject(job('stage-gate', { archivedAt: 5 }));
    await db.addProject(job('six-m'));
    await db.putPaceLine({ id: 'l1', projectId: 'stage-gate', key: '2A', name: 'Line 2A', workspaceId: w.id, updatedAt: 1 });
    await db.putPaceLine({ id: 'l2', projectId: 'six-m', key: '2A', name: 'Line 2A', workspaceId: w.id, updatedAt: 1 });
    expect((await db.projectsOnWorkspace(w.id)).sort()).toEqual(['six-m', 'stage-gate']);
    expect(await db.inArchivedProject(w.id)).toBe(false);
    expect((await lines.liveProductionLines(await db.listWorkspaces())).map(x => x.name)).toEqual(['Line 2A']);
    const six = await db.getProject('six-m');
    if (!six) throw new Error('the 6M job was not kept');
    await db.updateProject({ ...six, archivedAt: 9 });
    expect(await db.inArchivedProject(w.id)).toBe(true);
  });
});

describe('a project’s own walk', () => {
  it('is never a line of the factory', async () => {
    const { db, lines } = await fresh();
    await lines.addLineToFactory('Line 1');
    const walk = await db.createWorkspace('Pace — line walk');
    await db.addProject(job('pace', { walkWorkspaceId: walk.id }));
    expect((await db.projectWalkIds()).has(walk.id)).toBe(true);
    expect((await lines.liveProductionLines(await db.listWorkspaces())).map(x => x.name)).toEqual(['Line 1']);
  });
});

describe('a project’s line and the factory', () => {
  it('finds the factory’s line of its name, never a second; a new one goes at the end of the floor', async () => {
    const { db, lines } = await fresh();
    const a = await lines.addLineToFactory('Line 2A', 'Packing');
    const b = await lines.factoryLineFor('line 2a ');
    expect(b.id).toBe(a.id);
    const c = await lines.factoryLineFor('Line 9');
    const floor = await lines.liveProductionLines(await db.listWorkspaces());
    expect(floor.map(x => [x.name, x.floorOrder])).toEqual([['Line 2A', 0], ['Line 9', 1]]);
    expect(c.floorOrder).toBe(1);
    expect((await db.listWorkspaces()).filter(x => x.name === 'Line 2A')).toHaveLength(1);
  });
  it('names a project’s short key from the factory line', async () => {
    const { lines } = await fresh();
    expect(lines.lineKey('Line 2A')).toBe('2A');
    expect(lines.lineKey('Bagger')).toBe('Bagger');
    expect(lines.lineKey('Line')).toBe('Line');
  });
});
