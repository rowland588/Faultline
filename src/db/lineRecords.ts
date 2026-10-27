/* WRITING A LINE'S MACHINES AND PROGRAMS (lib/lineRecords, docs/BLUEPRINT.md
 * Stage 2). A machine's name is on the line's list (`workspace.assets`, the
 * one every picker reads); its record carries what more is known. These keep
 * the two together, so nothing else has to. */
import type { ID, Workspace } from '../types';
import type { Asset } from '../lib/testing';
import type { Program, ProgramState } from '../lib/programs';
import { lineMachineId, lineOfMachine, machineKey, onlyLineOf, type JobLine } from '../lib/lineRecords';
import { now, uid } from '../lib/ids';
import { getDB } from './core';
import { putAsset, listAllAssets } from './testing';
import { putProgram, listAllPrograms } from './programs';
import { allPaceLines } from './pace';
import { patchWorkspaceRecord } from './workspaces';
import { renameInObservations } from './observations';
import { listAllSnags, patchSnag } from './walk';
import { listStandardsForLine, putStandard } from './standards';
import { listStudiesForLine, patchStudy } from './studies';

/** A machine's name on the line's list, at the end, when it is not there. */
async function onTheList(wsId: ID, name: string): Promise<void> {
  const ws = await (await getDB()).get('workspaces', wsId) as Workspace | undefined;
  if (!ws || (ws.assets ?? []).some(a => machineKey(a) === machineKey(name))) return;
  await patchWorkspaceRecord(wsId, { assets: [...(ws.assets ?? []), name.trim()] });
}

/** A MACHINE ADDED TO THE LINE — its name on the list (where the stopwatch,
 *  the walk and a problem find it); a record too when its maker is said. */
export async function addMachineToLine(wsId: ID, name: string, oem?: string): Promise<void> {
  const n = name.trim();
  if (!n) return;
  await onTheList(wsId, n);
  if (oem?.trim()) await setMachineFacts(wsId, n, { oem: oem.trim() });
}

/** The record of a machine on the line, made the first time more than its
 *  name is said: the line's own (on no job), with the same id on every device
 *  for the same name. A job's record of that name is used when there is no
 *  line's own. */
export async function machineRecordFor(wsId: ID, name: string): Promise<Asset> {
  const n = name.trim();
  const [assets, jobLines] = await Promise.all([listAllAssets(), allPaceLines()]);
  const onLine = assets.filter(a => lineOfMachine(a, jobLines) === wsId && machineKey(a.name) === machineKey(n));
  const found = onLine.find(a => !a.projectId) ?? onLine[0];
  if (found) return found;
  const ws = await (await getDB()).get('workspaces', wsId) as Workspace | undefined;
  const at = (ws?.assets ?? []).findIndex(a => machineKey(a) === machineKey(n));
  const want = lineMachineId(wsId, n);
  /* A record renamed away from this name keeps its id; a new one must not
     land on top of it. */
  const taken = await (await getDB()).get('commission_assets', want);
  const a: Asset = {
    id: taken ? uid() : want, projectId: '', workspaceId: wsId, name: n,
    state: 'running', sort: (at < 0 ? (ws?.assets ?? []).length : at) * 10, updatedAt: now(),
  };
  await putAsset(a);
  await onTheList(wsId, n);
  return a;
}

/** What is known about a machine on the line — who made it, a note. */
export async function setMachineFacts(wsId: ID, name: string, facts: Pick<Asset, 'oem' | 'note'>): Promise<void> {
  const a = await machineRecordFor(wsId, name);
  await putAsset({ ...a, ...facts, oem: facts.oem?.trim() || undefined });
}

/** A MACHINE RENAMED on the line's list: its stops (as Set up the line always
 *  did) and its records on the line follow, so the name and what is known
 *  about it never part. Returns the stops renamed. */
export async function renameLineMachine(wsId: ID, from: string, to: string): Promise<number> {
  const n = await renameInObservations(wsId, 'asset', from, to);
  const [assets, jobLines] = await Promise.all([listAllAssets(), allPaceLines()]);
  for (const a of assets.filter(x => lineOfMachine(x, jobLines) === wsId && machineKey(x.name) === machineKey(from))) {
    await putAsset({ ...a, name: to.trim() });
  }
  /* THE PROBLEMS AND THE CAPACITY STATIONS FOLLOW TOO. Both join the machine
     by its name (the register's `targetAsset`, Line capacity's station): a
     rename that left them behind dropped the machine's problems off its row
     and parted the bottleneck from its stops (docs/UPGRADE-AUDIT.md C3). */
  const key = machineKey(from), name = to.trim();
  for (const s of await listAllSnags()) {
    if (s.workspaceId === wsId && !s.deletedAt && s.targetAsset && machineKey(s.targetAsset) === key) await patchSnag(s.id, { targetAsset: name });
  }
  for (const st of await listStandardsForLine(wsId)) {
    const stations = st.capacity?.stations ?? [];
    /* a station's name, and the name its stops are logged under when that is not its name (Station.asset) */
    const hit = (x: { name: string; asset?: string }) => machineKey(x.name) === key || (!!x.asset && machineKey(x.asset) === key);
    if (!stations.some(hit)) continue;
    await putStandard({ ...st, capacity: { ...st.capacity, stations: stations.map(x => (!hit(x) ? x : {
      ...x, ...(machineKey(x.name) === key ? { name } : {}), ...(x.asset && machineKey(x.asset) === key ? { asset: name } : {}),
    })) } as NonNullable<typeof st.capacity> });
  }
  /* EVERY STUDY OF IT ON THE LINE follows too — a reliability count, a check
     log, a capability study, the stopwatch's: each keeps its machine in the
     line's words (ToolStudy.machine), and a rename used to leave them saying
     the old one (docs/STAGEGATE-RESEARCH.md §5, slice 2). */
  for (const s of await listStudiesForLine(wsId)) {
    if (s.machine && machineKey(s.machine) === key) await patchStudy(s.id, { machine: name });
  }
  /* THE LINE'S OWN LIST — where the stopwatch, the walk and a problem pick a
     machine — is renamed in place too, so every caller gets it: a job's
     Install renamed the record alone and left the list saying the old name
     beside the record's new one, two machines on the line's page (the review
     of C3). A name already on the list is not added twice. */
  const ws = await (await getDB()).get('workspaces', wsId) as Workspace | undefined;
  const list = ws?.assets ?? [];
  if (list.some(a => machineKey(a) === key)) {
    const next: string[] = [];
    for (const a of list) {
      const nm = machineKey(a) === key ? name : a;
      if (!next.some(x => machineKey(x) === machineKey(nm))) next.push(nm);
    }
    await patchWorkspaceRecord(wsId, { assets: next });
  }
  return n;
}

/** A PROGRAM PLANNED ON A LINE, with no job. Its machine by name — the
 *  machine's record is made if this is the first thing said about it. */
export async function addLineProgram(wsId: ID, p: {
  what: string; machine?: string; runs?: string; testOn?: string; from?: string; note?: string; state?: ProgramState;
}): Promise<Program | undefined> {
  const what = p.what.trim();
  if (!what) return undefined;
  const asset = p.machine?.trim() ? await machineRecordFor(wsId, p.machine) : undefined;
  const all = await listAllPrograms();
  const jobLines = await allPaceLines();
  const sort = all.filter(x => (x.workspaceId ?? onlyLineOf(x.projectId, jobLines)) === wsId).reduce((m, x) => Math.max(m, x.sort), 0) + 10;
  const t = now();
  const row: Program = {
    id: uid(), projectId: '', workspaceId: wsId, what,
    ...(asset ? { assetId: asset.id } : {}),
    ...(p.runs?.trim() ? { runs: p.runs.trim() } : {}),
    ...(p.testOn ? { testOn: p.testOn } : {}),
    ...(p.from?.trim() ? { from: p.from.trim() } : {}),
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    state: p.state ?? 'needed', sort, createdAt: t, updatedAt: t,
  };
  await putProgram(row);
  return row;
}

/** A program put on another of the line's machines, by name ('' — the line
 *  itself). */
export async function putProgramOnMachine(p: Program, wsId: ID, machine: string): Promise<void> {
  const asset = machine.trim() ? await machineRecordFor(wsId, machine) : undefined;
  await putProgram({ ...p, assetId: asset?.id });
}

/** THE LINE A JOB'S NEW MACHINE OR PROGRAM IS ON — the job's only factory
 *  line (lib/lineRecords onlyLineOf), or the line its job line names. A job on
 *  several lines leaves it to be said. The machine's name joins that line's
 *  list, so the stopwatch and a problem on the line offer it too. */
export async function lineForJobRecord(projectId: string, jobLineId?: string): Promise<string | undefined> {
  const jobLines: JobLine[] = await allPaceLines();
  const named = jobLineId ? jobLines.find(l => l.id === jobLineId)?.workspaceId : undefined;
  return named ?? onlyLineOf(projectId, jobLines);
}

/** A MACHINE A PROJECT BRINGS IN (Install's Add a machine, Programs' typed
 *  machine) — one record of it on its line (lib/machineMerge,
 *  docs/STAGEGATE-RESEARCH.md §5): when the line already holds a record of
 *  that name of its own, the project takes that one on, its history kept,
 *  rather than making a second; when the project has one already, that one.
 *  Otherwise a new record, on the project's line, its name on the line's list.
 *  Returns the record's id. */
export async function addProjectMachine(projectId: ID, name: string, more: Pick<Asset, 'state' | 'sort'> & { oem?: string }): Promise<string> {
  const n = name.trim();
  const workspaceId = await lineForJobRecord(projectId);
  if (workspaceId) {
    const [assets, jobLines] = await Promise.all([listAllAssets(), allPaceLines()]);
    const onLine = assets.filter(a => !a.mergedInto && lineOfMachine(a, jobLines) === workspaceId && machineKey(a.name) === machineKey(n));
    const mine = onLine.find(a => a.projectId === projectId);
    if (mine) return mine.id;
    const lines = onLine.find(a => !a.projectId);
    if (lines) {
      await putAsset({ ...lines, projectId, workspaceId, state: more.state, sort: more.sort, ...(!lines.oem && more.oem?.trim() ? { oem: more.oem.trim() } : {}) });
      return lines.id;
    }
  }
  const id = uid();
  await putAsset({ id, projectId, ...(workspaceId ? { workspaceId } : {}), name: n, oem: more.oem?.trim() || undefined, state: more.state, sort: more.sort, updatedAt: now() });
  await machineJoinsLine({ workspaceId, name: n });
  return id;
}

export async function machineJoinsLine(a: Pick<Asset, 'workspaceId' | 'name'>): Promise<void> {
  if (a.workspaceId) await onTheList(a.workspaceId, a.name);
}
