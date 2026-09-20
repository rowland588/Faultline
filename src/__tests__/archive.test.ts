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
  await db.putAsset({ id: 'as1', projectId: id, name: 'Ilapak flow wrapper', state: 'running', sort: 10, updatedAt: t });
  await db.putTest({
    id: 'ts1', projectId: id, title: 'Seal integrity', assetId: 'as1',
    outcome: 'planned', sort: 1, createdAt: t, updatedAt: t,
  });
  await db.putTestItem({
    id: 'ti1', projectId: id, testId: 'ts1', kind: 'found', what: 'Jaw temperature drifting',
    sort: 1, createdAt: t, updatedAt: t,
  });
  await db.putTreeNode({ id: 'tn1', projectId: id, text: 'Output', rag: 'g', sort: 0, createdAt: t, updatedAt: t });

  /* The four that predate the by_project index and are scanned instead — the
     line itself, the work written against it, and the tracker uploaded to the
     project. These were kept when a project was deleted, which is how "delete
     for ever" quietly meant "most of it". */
  await db.putPaceLine({ id: 'ppm-5', projectId: id, key: '5', name: 'Line 5', updatedAt: t });
  await db.putTarget({ id: 'tg1', projectId: id, lineId: 'ppm-5', measureId: 'm1', periodId: 'p1', value: 60, updatedAt: t });
  await db.putReading({ id: 'rd1', projectId: id, lineId: 'ppm-5', measureId: 'm1', at: '2026-09-15', value: 61, createdAt: t, updatedAt: t });
  await db.putPaceTodo({
    id: 'td1', projectId: id, lineId: 'ppm-5', what: 'order the film', where: 'Line 5',
    why: 'rate', who: 'Dave', when: 'Friday', state: 'todo', createdAt: t, updatedAt: t,
  });
  await db.putPaceWin({
    id: 'wn1', projectId: id, lineId: 'ppm-5', title: 'it got faster', story: '', impact: '',
    where: 'Line 5', who: 'Dave', createdAt: t, updatedAt: t,
  });
  await db.addPaceSnapshot({ id: 'sn1', projectId: id, takenAt: t, fileName: 'tracker.xlsx', actions: [] });
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

    expect(await db.listTests(id)).toHaveLength(1);
    expect(await db.listTestItems(id)).toHaveLength(1);
    expect(await db.listAssets(id)).toHaveLength(1);
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
    expect(by.tests).toBe(1);
    expect(by.test_items).toBe(1);
    expect(by.commission_assets).toBe(1);
    expect(by.tree_nodes).toBe(1);
    // and the four that are scanned rather than indexed
    expect(by.pace_ppm, 'its lines').toBe(1);
    expect(by.pace_todos, 'its next steps').toBe(1);
    expect(by.pace_wins, 'its wins').toBe(1);
    expect(by.pace_snapshots, 'its uploads').toBe(1);
    expect(by.readings).toBe(1);
    expect(by.targets).toBe(1);
  });

  it('leaves no orphans in any store the project owned', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);

    await db.purgeProject(id);

    expect(await db.getProject(id)).toBeUndefined();
    expect(await db.listTests(id)).toEqual([]);
    expect(await db.listTestItems(id)).toEqual([]);
    expect(await db.listAssets(id)).toEqual([]);
    expect(await db.listTreeNodes(id)).toEqual([]);
    expect(await db.loadPaceLines(id), 'its lines go with it').toEqual([]);
    expect(await db.listPaceTodos(id)).toEqual([]);
    expect(await db.listPaceWins(id)).toEqual([]);
    expect(await db.listPaceSnapshots(id)).toEqual([]);
    expect(await db.listReadings(id)).toEqual([]);
    expect(await db.listTargets(id)).toEqual([]);
    expect(await db.projectContents(id)).toEqual([]);
  });

  it('tombstones every id, so the delete travels to the other devices', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);
    await db.purgeProject(id);

    const stones = await db.listTombstones();
    const kinds = new Set(stones.map(s => s.kind));
    expect(kinds.has('projects'), 'the project itself').toBe(true);
    expect(kinds.has('tests'), 'its tests').toBe(true);
    expect(kinds.has('test_items'), 'what was found on them').toBe(true);
    expect(kinds.has('commission_assets'), 'its machines').toBe(true);
    expect(kinds.has('tree_nodes'), 'its lever tree').toBe(true);
    expect(kinds.has('pace_ppm'), 'its lines').toBe(true);
    expect(kinds.has('pace_todos'), 'its next steps').toBe(true);
    expect(kinds.has('pace_wins'), 'its wins').toBe(true);
    expect(kinds.has('readings'), 'its readings').toBe(true);
    expect(stones.map(s => s.id)).toContain(id);
  });

  it('touches nothing belonging to another project', async () => {
    const db = await freshDb();
    const doomed = await projectWithEverything(db);
    await db.addProject({
      id: 'keeper', name: 'Line 7', color: '#1c6fb8', workspaceIds: [],
      createdAt: 1, updatedAt: 1,
    });
    await db.putTest({
      id: 'safe1', projectId: 'keeper', title: 'Still mine',
      outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1,
    });
    // a line with the SAME human key on the other project — the scan must go by
    // projectId, not by anything that looks like the line
    await db.putPaceLine({ id: 'ppm-keeper-5', projectId: 'keeper', key: '5', name: 'Line 5', updatedAt: 1 });

    await db.purgeProject(doomed);

    expect(await db.getProject('keeper')).toBeTruthy();
    expect((await db.listTests('keeper')).map(t => t.title)).toEqual(['Still mine']);
    expect((await db.loadPaceLines('keeper')).map(l => l.name)).toEqual(['Line 5']);
  });

  it('is safe on a project that owns nothing at all', async () => {
    const db = await freshDb();
    await db.addProject({ id: 'bare', name: 'Bare', color: '#000', workspaceIds: [], createdAt: 1, updatedAt: 1 });
    await expect(db.purgeProject('bare')).resolves.toBeUndefined();
    expect(await db.getProject('bare')).toBeUndefined();
  });
});

describe('a line can be put away too, and its film is what makes deleting it different', () => {
  /** A workspace with a walk, a pinned machine, a snag and a captured loss. */
  async function lineWithEverything(db: Awaited<ReturnType<typeof freshDb>>) {
    const ws = await db.createWorkspace('Line 7');
    const t = 1;
    await db.addSegment({
      id: 'seg1', workspaceId: ws.id, name: 'walk 1', durationS: 90, sequence: 1,
      videoKey: 'vid-1', posterKey: 'post-1', createdAt: t, updatedAt: t,
    });
    await db.addSnagAsset({
      id: 'as1', workspaceId: ws.id, segmentId: 'seg1', name: 'Former roller',
      timestampS: 12, stillKey: 'still-1', createdAt: t, updatedAt: t,
    });
    await db.addSnag({
      id: 'sn1', workspaceId: ws.id, assetId: 'as1', problem: 'Roller misaligned',
      status: 'open', raisedAt: t, updatedAt: t,
    });
    return ws;
  }

  it('archiving takes it out of the list and leaves everything in place', async () => {
    const db = await freshDb();
    const ws = await lineWithEverything(db);

    await db.archiveWorkspace(ws.id);
    expect((await db.listWorkspaces()).map(w => w.id)).not.toContain(ws.id);
    expect((await db.listArchivedWorkspaces()).map(w => w.id)).toEqual([ws.id]);

    // The whole point of archiving: it is the SAFE one.
    expect(await db.listSegments(ws.id)).toHaveLength(1);
    expect(await db.snagsForWorkspace(ws.id)).toHaveLength(1);
  });

  it('restores it to the live list', async () => {
    const db = await freshDb();
    const ws = await lineWithEverything(db);
    await db.archiveWorkspace(ws.id);
    await db.restoreWorkspace(ws.id);

    expect((await db.listWorkspaces()).map(w => w.id)).toContain(ws.id);
    expect(await db.listArchivedWorkspaces()).toEqual([]);
  });

  it('counts what a delete would destroy, in words rather than table names', async () => {
    const db = await freshDb();
    const ws = await lineWithEverything(db);

    const owned = await db.workspaceContents(ws.id);
    const by = Object.fromEntries(owned.map(c => [c.what, c.count]));
    // Singular at one. "1 filmed walks" in the sentence asking somebody to
    // destroy a year of film reads as carelessness.
    expect(by['filmed walk']).toBe(1);
    expect(by['pinned machine']).toBe(1);
    expect(by.snag).toBe(1);
    expect(owned.map(c => c.what)).not.toContain('filmed walks');
    // Nothing that is empty is listed — "0 cases (A3s)" is noise in a warning.
    expect(owned.every(c => c.count > 0)).toBe(true);
  });

  it('deleting takes the video and the photographs with it', async () => {
    // This is what makes a line different from a project: the blobs exist
    // nowhere else, so there is no getting them back from the cloud either.
    const db = await freshDb();
    const ws = await lineWithEverything(db);
    await db.putBlob('vid-1', new Blob(['film']));
    await db.putBlob('still-1', new Blob(['frame']));

    await db.deleteWorkspace(ws.id);

    expect(await db.getWorkspace(ws.id)).toBeUndefined();
    expect(await db.listSegments(ws.id)).toEqual([]);
    expect(await db.snagsForWorkspace(ws.id)).toEqual([]);
    expect(await db.getBlob('vid-1')).toBeUndefined();
    expect(await db.getBlob('still-1')).toBeUndefined();
  });
});
