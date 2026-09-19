/* ARCHIVING, AND DELETING FOR GOOD.
 *
 * Two failures this guards against, both of which look like nothing at the time.
 *
 * ORPHANS. A project's commissioning rows, stages, tree nodes and targets live
 * in their own stores keyed by projectId. Deleting only the project row leaves
 * every one of them behind: they still sync, still count, and still turn up in
 * totals belonging to a project that no longer exists. Nobody reports that,
 * because nobody can see it.
 *
 * A DELETE THAT DOES NOT TRAVEL. Without a tombstone the other device pushes
 * its copy straight back on the next sync, so the row returns and the person
 * who deleted it concludes the app is broken. A delete that only happens on the
 * device it was typed on is not a delete; it is a disagreement that resolves
 * itself by restoring the data.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const freshDb = async () => await import('../db');

/** A project with one row in every store it owns. */
async function projectWithEverything(db: Awaited<ReturnType<typeof freshDb>>) {
  const id = 'proj-under-test';
  const t = 1;
  await db.addProject({
    id, name: 'Line 5 — Brillopack', color: '#0b7d68', workspaceIds: [],
    commissioning: true, createdAt: t, updatedAt: t,
  });
  await db.putCommissionPhase({ id: 'ph1', projectId: id, key: 'fat', sort: 10, updatedAt: t });
  await db.putCommissionItem({
    id: 'it1', projectId: id, kind: 'task', title: 'Guarding sign-off',
    state: 'todo', sort: 1, createdAt: t, updatedAt: t,
  });
  await db.putTreeNode({ id: 'tn1', projectId: id, text: 'Output', rag: 'g', sort: 0, createdAt: t, updatedAt: t });
  return id;
}

describe('archiving is reversible and loses nothing', () => {
  it('takes the project out of the live list and puts it back', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);

    await db.archiveProject(id);
    const archived = await db.getProject(id);
    expect(archived?.archivedAt).toBeGreaterThan(0);

    await db.restoreProject(id);
    expect((await db.getProject(id))?.archivedAt).toBeUndefined();
  });

  it('leaves every row the project owns exactly where it was', async () => {
    // The whole point. If archiving touched the contents it would not be the
    // safe option, and people would go on never using it.
    const db = await freshDb();
    const id = await projectWithEverything(db);
    await db.archiveProject(id);

    expect(await db.listCommissionItems(id)).toHaveLength(1);
    expect(await db.listCommissionPhases(id)).toHaveLength(1);
    expect(await db.listTreeNodes(id)).toHaveLength(1);
  });
});

describe('deleting for good takes the whole file with it', () => {
  it('says what it will take BEFORE anything is destroyed', async () => {
    // Nobody can consent to "delete everything" without being told what
    // everything is, so the count has to be available to the confirm.
    const db = await freshDb();
    const id = await projectWithEverything(db);

    const owned = await db.projectContents(id);
    const by = Object.fromEntries(owned.map(c => [c.store, c.count]));
    expect(by.commission_items).toBe(1);
    expect(by.commission_phases).toBe(1);
    expect(by.tree_nodes).toBe(1);
  });

  it('leaves no orphans in any store the project owned', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);

    await db.purgeProject(id);

    expect(await db.getProject(id)).toBeUndefined();
    expect(await db.listCommissionItems(id)).toEqual([]);
    expect(await db.listCommissionPhases(id)).toEqual([]);
    expect(await db.listTreeNodes(id)).toEqual([]);
    expect(await db.projectContents(id)).toEqual([]);
  });

  it('tombstones every id, so the delete travels to the other devices', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);
    await db.purgeProject(id);

    const stones = await db.listTombstones();
    const kinds = new Set(stones.map(s => s.kind));
    expect(kinds.has('projects'), 'the project itself').toBe(true);
    expect(kinds.has('commission_items'), 'its commissioning rows').toBe(true);
    expect(kinds.has('commission_phases'), 'its stages').toBe(true);
    expect(kinds.has('tree_nodes'), 'its lever tree').toBe(true);
    expect(stones.map(s => s.id)).toContain(id);
  });

  it('touches nothing belonging to another project', async () => {
    const db = await freshDb();
    const doomed = await projectWithEverything(db);
    await db.addProject({
      id: 'keeper', name: 'Line 7', color: '#1c6fb8', workspaceIds: [],
      createdAt: 1, updatedAt: 1,
    });
    await db.putCommissionItem({
      id: 'safe1', projectId: 'keeper', kind: 'task', title: 'Still mine',
      state: 'todo', sort: 1, createdAt: 1, updatedAt: 1,
    });

    await db.purgeProject(doomed);

    expect(await db.getProject('keeper')).toBeTruthy();
    expect((await db.listCommissionItems('keeper')).map(i => i.title)).toEqual(['Still mine']);
  });

  it('is safe on a project that owns nothing at all', async () => {
    const db = await freshDb();
    await db.addProject({ id: 'bare', name: 'Bare', color: '#000', workspaceIds: [], createdAt: 1, updatedAt: 1 });
    await expect(db.purgeProject('bare')).resolves.toBeUndefined();
    expect(await db.getProject('bare')).toBeUndefined();
  });
});
