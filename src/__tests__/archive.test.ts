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
  // the programs and the line standard — left behind by "delete for ever" until 4 October
  await db.putProgram({ id: 'pg1', projectId: id, what: 'Maris Piper 2kg', state: 'needed', sort: 1, createdAt: t, updatedAt: t });
  await db.putStandard({ id: 'st1', projectId: id, product: 'Maris Piper 2kg', marks: [], sort: 1, createdAt: t, updatedAt: t });
  return id;
}

describe('release installation to the line', () => {
  it('hands over a program with its original machine and the original project test visible in line reports', async () => {
    const db = await freshDb();
    const t = 1;
    const ws = await db.createWorkspace('Line 2A');
    const wsId = ws.id;
    const id = 'proj-line-2';
    await db.addProject({
      id, name: 'Line 2 commissioning', color: '#2b87d4', workspaceIds: [wsId],
      commissioning: true, createdAt: t, updatedAt: t,
    });
    await db.putPaceLine({ id: 'pl-2a', projectId: id, key: '2A', name: 'Line 2A', workspaceId: wsId, sort: 0, updatedAt: t });
    await db.putAsset({ id: 'as-w', projectId: id, name: 'Ilapak flow wrapper', oem: 'Ilapak', state: 'running', sort: 10, updatedAt: t });
    await db.putProgram({ id: 'pg1', projectId: id, assetId: 'as-w', what: 'PR-04 Finest Red 2 kg', state: 'onMachine', sort: 1, createdAt: t, updatedAt: t });
    await db.putTest({
      id: 'ts1', projectId: id, kind: 'test', title: 'Prove program PR-04', assetId: 'as-w', programId: 'pg1',
      ranOn: '2026-11-10', outcome: 'passed', sort: 1, createdAt: t, updatedAt: t,
    });

    const r = await db.releaseInstallationToLine(id);
    expect(r).toMatchObject({ workspaceId: wsId, programs: 1, tests: 1, machines: 1, linesArchived: 0 });

    const projectTests = await db.listTests(id);
    expect(projectTests.map(t => t.id)).toEqual(['ts1']);
    const programs = await db.listAllPrograms();
    expect(programs.find(p => p.id === 'pg1')).toMatchObject({ projectId: '', workspaceId: wsId, assetId: 'as-w' });
    const { machinesOnLine, lineProgramsReading } = await import('../lib/lineRecords');
    const line = (await db.getWorkspace(wsId))!;
    const assets = await db.listAllAssets();
    expect(assets.map(a => a.id)).toEqual(['as-w']);
    const reading = lineProgramsReading([{ ...line, machines: machinesOnLine(line, assets, await db.allPaceLines()), programs }], '2026-11-25', { tests: await db.listAllTests() });
    expect(reading?.machines[0]?.lines[0]).toMatchObject({ machine: 'Ilapak flow wrapper', programId: 'pg1', proof: { testId: 'ts1' } });
    // A production-line reader receives the released program, while installation tests and items require project membership.
    const visibleProjects = new Set<string>();
    const visibleTests = (await db.listAllTests()).filter(test => visibleProjects.has(test.projectId));
    const lineOnly = lineProgramsReading([{ ...line, machines: machinesOnLine(line, assets, await db.allPaceLines()),
      programs: programs.filter(p => p.workspaceId === wsId && !p.projectId) }], '2026-11-25', { tests: visibleTests });
    expect(lineOnly?.lines[0]).toMatchObject({ word: 'proved 10 Nov', proof: {unavailable: true} });
    expect(lineOnly?.lines[0].proof?.word).toContain('access to the archived project');
    expect(lineOnly?.lines[0].proof?.testId).toBeUndefined();
    expect(lineOnly?.lines[0].tests).toBeUndefined();
    expect(JSON.stringify(lineOnly)).not.toContain('Prove program PR-04');
    if (!lineOnly) throw new Error('Released program is missing');
    const { jsPDF } = await import('jspdf');
    const { drawOneProgramReport } = await import('../lib/programsReportPdf');
    const doc = new jsPDF({unit:'pt'});
    const words = vi.spyOn(doc, 'text');
    await drawOneProgramReport(doc, {lineName: line.name, printed:'25 Nov', reading:lineOnly});
    const printed = words.mock.calls.flatMap(call => call[0]).join(' ').replace(/\s+/g, ' ');
    expect(printed).toContain('10 Nov');
    expect(printed).toContain('access to the archived project');
    expect(printed).not.toContain('Prove program PR-04');
    await db.releaseInstallationToLine(id, wsId);
    expect((await db.listAllAssets()).map(a => a.id)).toEqual(['as-w']);
    expect((await db.getWorkspace(wsId))?.assets).toEqual([...(ws.assets ?? []), 'Ilapak flow wrapper']);
    expect((await db.getProject(id))?.archivedAt).toBeGreaterThan(0);
  });

  it('keeps each line’s operational records, source history, and project-wide work, and never adopts an unrelated Line 2A', async () => {
    const db = await freshDb();
    const a = await db.createWorkspace('Filler');
    const b = await db.createWorkspace('Packer');
    const other = await db.createWorkspace('Line 2A');
    const p = await db.createProject('Installation', '#000', undefined, undefined, 'commissioning');
    const ownLine = (workspaceId: string, key: string) => db.addPaceLine({ projectId: p.id, key, name: key, sort: 0, workspaceId });
    const l1 = await ownLine(a.id, 'filler');
    const l2 = await ownLine(b.id, 'packer');
    await db.putAsset({ id: 'asset-packer', projectId: p.id, name: 'Guide', oem: 'Maker', state: 'running', sort: 0, updatedAt: 1 });
    await db.putProgram({ id: 'packing', projectId: p.id, lineId: l2.id, assetId: 'asset-packer', what: 'Packing recipe', state: 'needed', sort: 0, createdAt: 1, updatedAt: 1 });
    await db.putTest({ id: 'gate', projectId: p.id, title: 'Customer accepted the installation', kind: 'install', gate: 'handover', outcome: 'passed', sort: 0, createdAt: 1, updatedAt: 1 });
    await db.putTestItem({ id: 'note', projectId: p.id, testId: 'gate', what: 'Signed during handover', kind: 'note', sort: 0, createdAt: 1, updatedAt: 1 });
    await db.putStandard({ id: 'line-standard', projectId: p.id, programId: 'packing', product: 'Packing recipe', marks: [], note: '', sort: 0, createdAt: 1, updatedAt: 1 });
    await db.putStudy({ id: 'study-b', tool: 'talk', projectId: p.id, workspaceId: b.id, name: 'Packer walk', uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, facts: {} });
    const task = { projectId: p.id, what: 'Check alignment', why: '', where: '', who: 'Alex', when: '', state: 'todo' as const, createdAt: 1, updatedAt: 1 };
    await db.putPaceTodo({ ...task, id: 'assigned', lineId: l2.id });
    await db.putPaceTodo({ ...task, id: 'unplaced' });
    await expect(db.releaseInstallationToLine(p.id)).rejects.toThrow('Choose');
    await expect(db.releaseInstallationToLine(p.id, other.id)).rejects.toThrow('Choose');
    expect((await db.getProject(p.id))?.archivedAt).toBeUndefined();
    await db.releaseInstallationToLine(p.id, a.id);
    expect((await db.listAllPrograms())[0]).toMatchObject({ id: 'packing', assetId: 'asset-packer', workspaceId: b.id });
    expect((await db.listAllAssets())[0]).toMatchObject({ id: 'asset-packer', workspaceId: b.id });
    expect((await db.listStandardsForLine(b.id))[0].id).toBe('line-standard');
    expect((await db.getStudy('study-b'))).toMatchObject({ projectId: p.id, workspaceId: b.id });
    expect((await db.listTests(p.id)).map(t => t.id)).toEqual(['gate']);
    expect((await db.listTestItems(p.id)).map(t => t.id)).toEqual(['note']);
    expect(await db.listPaceTodos(p.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'assigned', workspaceId: b.id, who: 'Alex' }),
      expect.objectContaining({ id: 'unplaced', workspaceId: a.id, who: 'Alex' }),
    ]));
    expect((await db.listArchivedWorkspaces())).toEqual([]);
    expect((await db.loadPaceLines(p.id)).map(l => l.id)).toEqual(expect.arrayContaining([l1.id, l2.id]));
  });

  it('rolls back a handover with a conflicting location after the first machine was processed', async () => {
    const db = await freshDb();
    const own = await db.createWorkspace('On the installation');
    const other = await db.createWorkspace('Other customer');
    const p = await db.createProject('Gate', '#000', undefined, undefined, 'commissioning');
    await db.addPaceLine({ projectId: p.id, workspaceId: own.id, key: 'only', name: 'Only', sort: 0 });
    for (const [id, workspaceId] of [['a-first', own.id], ['b-second', other.id]]) {
      await db.putAsset({ id, projectId: p.id, workspaceId, name: id, state: 'running', sort: 0, updatedAt: 1 });
    }
    await expect(db.releaseInstallationToLine(p.id)).rejects.toThrow('different or archived line');
    expect((await db.listAssets(p.id)).map(a => a.id)).toEqual(['a-first', 'b-second']);
    expect((await db.getProject(p.id))?.archivedAt).toBeUndefined();
    expect((await db.getWorkspace(other.id))?.assets).toEqual(other.assets);
  });

});

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
    // and the three that are scanned rather than indexed (the tracker's uploads retired — BLUEPRINT §5.1)
    expect(by.pace_ppm, 'its lines').toBe(1);
    expect(by.pace_todos, 'its next steps').toBe(1);
    expect(by.pace_wins, 'its wins').toBe(1);
    expect(by.readings).toBe(1);
    expect(by.targets).toBe(1);
    expect(by.programs).toBe(1);
    expect(by.standards).toBe(1);
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
    expect(await db.listReadings(id)).toEqual([]);
    expect(await db.listTargets(id)).toEqual([]);
    expect(await db.listPrograms(id)).toEqual([]);
    expect(await db.listStandards(id)).toEqual([]);
    expect(await db.projectContents(id)).toEqual([]);
  });

  /* Rowland, 9 October: "give me the ability to delete projects fully." A 6M
     job's problems live in a line's store but name the job — they are its. */
  it('takes the job’s problems with it, and leaves a line’s own problems with the line', async () => {
    const db = await freshDb();
    const id = await projectWithEverything(db);
    const t = 1;
    const kase = (cid: string, projectId?: string) => ({ id: cid, workspaceId: 'ws1', ...(projectId ? { projectId } : {}),
      title: 'Basketer minor stops', path: [], baselineMsWeek: 0, status: 'open' as const, openedAt: t, updatedAt: t });
    await db.addCase(kase('its', id));
    await db.addCase(kase('lines'));
    expect(Object.fromEntries((await db.projectContents(id)).map(c => [c.store, c.count])).cases).toBe(1);
    await db.purgeProject(id);
    expect(await db.getCase('its')).toBeUndefined();
    expect(await db.getCase('lines'), 'a problem with no job of its own is the line’s').toBeDefined();
    expect((await db.listTombstones()).some(s => s.kind === 'cases' && s.id === 'its')).toBe(true);
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
    expect(kinds.has('standards'), 'its line standard').toBe(true);
    expect(kinds.has('programs'), 'its programs').toBe(true);
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
    expect(by.problem, "the line's problems, in the word a person reads").toBe(1);
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
