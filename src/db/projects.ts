import type { PaceLineRow } from './rows';
/* Projects, and the quarterly numbers that hang off them.
 *
 * Targets and actuals live here rather than in pace.ts because they belong to the
 * PROJECT: a line can be renamed or removed and its targets still have to be
 * findable.
 */
import type { ID, Project, Workspace } from '../types';
import type { PlanModel } from '../lib/planModel';
import type { MethodKey } from '../lib/methods';
import { planModel } from '../lib/planModel';
import { clientOfFactoryLine, lineKey } from '../lib/projectLines';
import { uid, now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { allPaceLines } from './pace';
import { listWorkspaces } from './workspaces';

export async function allProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  return projects.filter(p => !p.deletedAt);
}
export async function getProject(id: ID): Promise<Project | undefined> {
  const p = await (await getDB()).get('projects', id);
  return p?.deletedAt == null ? p : undefined;
}
export async function addProject(p: Project): Promise<void> {
  await (await getDB()).put('projects', p);
  signalWrite();
}
export async function updateProject(p: Project): Promise<void> {
  await (await getDB()).put('projects', { ...p, updatedAt: now() });
  signalWrite();
}
/** An editor only owns the fields it changed. Preserve edits, archive state and method saved elsewhere. */
export async function patchProject(id: ID, patch: Partial<Project>): Promise<void> {
  const tx = (await getDB()).transaction('projects', 'readwrite');
  const latest = await tx.store.get(id);
  if (!latest || latest.deletedAt) throw new Error('This project is no longer available.');
  await tx.store.put({ ...latest, ...patch, id, updatedAt: now() });
  await tx.done;
  signalWrite();
}
export async function deleteProject(id: ID): Promise<void> {
  const db = await getDB();
  const p = await db.get('projects', id);
  if (!p) return;
  await db.put('projects', { ...p, deletedAt: now() });
  signalWrite();
}

/** The id the app's own first project used to be minted under, on every device.
 *
 *  NOTHING CREATES IT ANY MORE. It is kept because rows written before projects
 *  became plural carry no projectId and are read as belonging to it, and because
 *  a line's row id and a workspace's meta key are derived from it — changing
 *  either would orphan data already on somebody's device.
 *
 *  What it no longer does is conjure a project called "Project Pace" out of
 *  nothing, seed it with one factory's four lines, and refuse to be deleted. */
export const DEFAULT_PROJECT_ID = 'project-pace';

/** Every project this device holds. No project is created here: a person's
 *  first project is the one they start, or the one they are invited to.
 *
 *  The app used to ship with one and mint it on sight, which was right while it
 *  was one person's page and wrong the moment somebody else signed in — they got
 *  a project named after a factory they had never heard of, holding its lines
 *  and its tracker, and it could not be deleted. */
export async function ensureProjects(): Promise<Project[]> {
  const db = await getDB();
  return (await db.getAll('projects')).filter(p => !p.deletedAt).sort(byProjectOrder);
}

/** By name — a list that reads the same on every device, rather than in
 *  creation order, which no two devices share. */
const byProjectOrder = (a: Project, b: Project) => a.name.localeCompare(b.name);

export interface ProjectStart {
  lineIds?: readonly string[];
  handover?: string;
}

/** Save the project, its agreed date and its starting lines in one transaction. */
export async function createProject(
  name: string, color: string, lead?: string, leadEmail?: string,
  /** The plan model, chosen at the moment the project is started — see
   *  ProjectsScreen. Not bolted on afterwards in a settings tab nobody visits:
   *  a project runs the 3P board, the lever tree or a commissioning list, and
   *  which one is a decision worth asking for up front rather than leaving as
   *  an unticked box under Lines & people. */
  model?: PlanModel,
  /** The method it runs (src/lib/methods.ts, M3) — stage gate is also the commissioning list. */
  method?: MethodKey,
  /** An engagement programme is separate from the method chosen later. */
  programKey?: Project['programKey'],
  start: ProjectStart = {},
): Promise<Project> {
  const p: Project = {
    id: uid(), name: name.trim() || 'New project', color, workspaceIds: [],
    lead, leadEmail,
    leverTree: model === 'tree' || undefined,
    commissioning: model === 'commissioning' || method === 'stage-gate' || undefined,
    method,
    programKey,
    ...(start.handover ? { plannedAt: start.handover, expectedAt: start.handover } : {}),
    createdAt: now(), updatedAt: now(),
  };
  const db = await getDB();
  const tx = db.transaction(['projects', 'pace_ppm', 'workspaces'], 'readwrite');
  try {
    const ids = [...new Set(start.lineIds)];
    const rows = await Promise.all(ids.map(id => tx.objectStore('workspaces').get(id)));
    if (rows.some(line => !line || line.archived)) throw new Error('A selected line is no longer available. Choose the lines again.');
    const lines = rows.filter((line): line is NonNullable<typeof line> => !!line);
    if (new Set(lines.map(clientOfFactoryLine)).size > 1) throw new Error('Choose lines belonging to the same customer.');
    await tx.objectStore('projects').add(p);
    for (const [i, line] of lines.entries()) {
      await tx.objectStore('pace_ppm').add({
        id: uid(), projectId: p.id, key: lineKey(line.name), name: line.name,
        workspaceId: line.id, sort: i + 1, updatedAt: p.updatedAt,
      });
    }
    await tx.done;
  } catch (error) {
    try { tx.abort(); } catch { /* the failing request already aborted the transaction */ }
    await tx.done.catch(() => {});
    throw error;
  }
  signalWrite();
  return p;
}

/* Project targets and actuals, and the uploaded tracker's snapshots: RETIRED 13 October
   (docs/BLUEPRINT.md §5.1-5.2) — read by no screen, 0 rows in the cloud. */

/** A row belongs to a project if it says so — and if it says nothing, it is the
 *  default project's. That is what carries every next step, win and upload the
 *  user already has into Project Pace rather than into nothing. */
/** Exported for pace.ts, which keys everything the same way. */
export const inProject = (projectId: string) => (r: { projectId?: string; standalone?: boolean }) =>
  (!r.standalone || !!r.projectId) && (r.projectId ?? DEFAULT_PROJECT_ID) === projectId;

/** Filter to one line's own items. No line asked for means the project view —
 *  everything, whether it names a line or not, because the project is the sum
 *  of its lines plus whatever spans them. */
export const onLine = (lineId?: string) => (r: { lineId?: string }) => !lineId || r.lineId === lineId;

/* ---------- putting a project away, and taking it out for good ----------
 *
 * Two different acts, deliberately not one control.
 *
 * ARCHIVE is reversible and loses nothing: the project leaves the list and
 * every row it owns stays exactly where it is. That is what somebody wants
 * ninety-nine times out of a hundred when a job finishes — and if the only
 * option on offer is DELETE, they leave the dead project on screen for years
 * rather than risk it.
 *
 * PURGE is the other one. It is reachable only from the archive, so nothing can
 * be destroyed in one step from the main list, and it takes the project's whole
 * file with it.
 *
 * RELEASE TO THE LINE assigns operating records to the project's production lines.
 * The commissioning history stays readable through its original record IDs.
 */

/** Older installations kept their factory-line links on the project itself. */
export function installationDestinations(project: Project, jobs: readonly PaceLineRow[], workspaces: readonly Workspace[]): Workspace[] {
  const linked = jobs.filter(line => line.projectId === project.id && !line.deletedAt).flatMap(line => line.workspaceId ? [line.workspaceId] : []);
  const ids = new Set(linked.length ? linked : project.workspaceIds);
  return workspaces.filter(line => ids.has(line.id) && line.id !== project.walkWorkspaceId && !line.archived);
}

export async function listInstallationDestinations(projectId: ID): Promise<Workspace[]> {
  const [project, jobs, workspaces] = await Promise.all([getProject(projectId), allPaceLines(), listWorkspaces()]);
  return project ? installationDestinations(project, jobs, workspaces) : [];
}

export interface ReleaseInstallationResult {
  workspaceId: ID;
  programs: number;
  tests: number;
  machines: number;
  linesArchived: number;
}

/** Release the operating records together. Tests, test attachments, project studies and project lines retain the
 * original IDs and project permissions the archive, linked sources and program history use to open them. */
export async function releaseInstallationToLine(projectId: ID, workspaceId?: ID): Promise<ReleaseInstallationResult> {
  const db = await getDB();
  const tx = db.transaction(['projects', 'workspaces', 'pace_ppm', 'commission_assets', 'programs', 'standards', 'tests', 'pace_todos'], 'readwrite');
  try {
    const [project, places, jobs, assets, programs, standards, tests, actions] = await Promise.all([
      tx.objectStore('projects').get(projectId),
      tx.objectStore('workspaces').getAll(),
      tx.objectStore('pace_ppm').getAll(),
      tx.objectStore('commission_assets').getAll(),
      tx.objectStore('programs').getAll(),
      tx.objectStore('standards').index('by_project').getAll(projectId),
      tx.objectStore('tests').index('by_project').getAll(projectId),
      tx.objectStore('pace_todos').getAll(),
    ]);
    if (!project || project.deletedAt) throw new Error('That project is no longer available.');
    if (planModel(project) !== 'commissioning') throw new Error('Only an installation project can hand over to production.');
    const destinations = installationDestinations(project, jobs, places);
    const fallback = workspaceId ? destinations.find(w => w.id === workspaceId) : destinations.length === 1 ? destinations[0] : undefined;
    if (!fallback) throw new Error('Choose an active production line linked to this installation.');

    // An explicit, conflicting factory location must never be overwritten with the default.
    const allowed = new Set(destinations.map(w => w.id));
    const destination = (existing: ID | undefined): ID => {
      if (existing && !allowed.has(existing)) throw new Error('A record belongs to a different or archived line. Check its line before handover.');
      return existing || fallback.id;
    };
    const linePlaces = new Map(jobs.filter(l => !l.deletedAt && l.projectId === projectId).map(l => [l.id, l.workspaceId]));
    const livePrograms = programs.filter(p => p.projectId === projectId && !p.deletedAt);
    const liveAssets = assets.filter(a => a.projectId === projectId && !a.deletedAt);
    const existingMachinePlaces = new Map(assets.filter(a => !a.deletedAt && a.workspaceId).map(a => [a.id, a.workspaceId]));
    const existingProgramPlaces = new Map(programs.filter(p => !p.deletedAt && p.workspaceId).map(p => [p.id, p.workspaceId]));
    const programPlaces = new Map<ID, ID>();
    const assetPlaces = new Map<ID, ID>();
    const machineNames = new Map<ID, string[]>();
    const stamp = now();

    for (const asset of liveAssets) {
      const known = new Set(livePrograms.filter(p => p.assetId === asset.id)
        .map(p => p.workspaceId || (p.lineId ? linePlaces.get(p.lineId) : undefined)).filter((id): id is ID => !!id));
      if (!asset.workspaceId && known.size > 1) throw new Error(`Choose the line for ${asset.name} before handover. Its programs name several lines.`);
      const place = destination(asset.workspaceId || [...known][0]);
      assetPlaces.set(asset.id, place);
      const names = machineNames.get(place) ?? [];
      if (asset.name.trim()) names.push(asset.name.trim());
      machineNames.set(place, names);
      await tx.objectStore('commission_assets').put({ ...asset, projectId: '', workspaceId: place, updatedAt: stamp });
    }
    for (const program of livePrograms) {
      const machine = program.assetId ? assetPlaces.get(program.assetId) || existingMachinePlaces.get(program.assetId) : undefined;
      const place = destination(program.workspaceId || (program.lineId ? linePlaces.get(program.lineId) : undefined) || machine);
      if (machine && machine !== place) throw new Error(`Check the line for ${program.what}. Its machine is on a different line.`);
      programPlaces.set(program.id, place);
      await tx.objectStore('programs').put({ ...program, projectId: '', workspaceId: place, updatedAt: stamp });
    }
    for (const standard of standards.filter(s => !s.deletedAt)) {
      const place = destination(standard.workspaceId || (standard.programId ? programPlaces.get(standard.programId) || existingProgramPlaces.get(standard.programId) : undefined));
      await tx.objectStore('standards').put({ ...standard, projectId: '', workspaceId: place, updatedAt: stamp });
    }
    for (const action of actions.filter(a => a.projectId === projectId && !a.workspaceId)) {
      const known = action.lineId ? linePlaces.get(action.lineId) : undefined;
      if (!known && (action.state === 'done' || (action.lineId && !linePlaces.has(action.lineId)))) continue;
      await tx.objectStore('pace_todos').put({ ...action, workspaceId: destination(known), updatedAt: stamp });
    }
    for (const ws of destinations) {
      const names = machineNames.get(ws.id) ?? [];
      const listed = [...(ws.assets ?? [])];
      const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
      const seen = new Set(listed.map(key));
      for (const name of names) if (!seen.has(key(name))) { listed.push(name); seen.add(key(name)); }
      if (listed.length !== (ws.assets?.length ?? 0)) await tx.objectStore('workspaces').put({ ...ws, assets: listed, updatedAt: stamp });
    }
    if (!project.archivedAt) await tx.objectStore('projects').put({ ...project, archivedAt: stamp, updatedAt: stamp });
    await tx.done;
    signalWrite();
    const namedTests = new Set(livePrograms.map(p => p.testId).filter(Boolean));
    const linked = tests.filter(t => !t.deletedAt && (namedTests.has(t.id) || (t.programId && programPlaces.has(t.programId)) || (t.assetId && assetPlaces.has(t.assetId))));
    return { workspaceId: fallback.id, programs: livePrograms.length, tests: linked.length, machines: liveAssets.length, linesArchived: 0 };
  } catch (error) {
    try { tx.abort(); } catch { /* IndexedDB may have already aborted the transaction. */ }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

export async function archiveProject(id: ID): Promise<void> {
  const db = await getDB();
  const p = await db.get('projects', id);
  if (!p) return;
  await db.put('projects', { ...p, archivedAt: now(), updatedAt: now() });
  signalWrite();
}

export async function restoreProject(id: ID): Promise<void> {
  const db = await getDB();
  const p = await db.get('projects', id);
  if (!p) return;
  await db.put('projects', { ...p, archivedAt: undefined, updatedAt: now() });
  signalWrite();
}

/** Everything a project owns, by the index each store keeps on projectId.
 *
 *  Kept as one list rather than eight calls so that adding a project-scoped
 *  store and forgetting to purge it is a change in ONE visible place. An
 *  orphaned row is not harmless: it still syncs, still counts, and shows up in
 *  a total belonging to a project that no longer exists. */
const PROJECT_OWNED = [
  'commission_assets', 'tests', 'test_items', 'targets', 'readings', 'materials',
  'tree_nodes',
  // the programs and the line standards are the project's too; leaving them
  // out of this list left both behind, syncing, after "delete for ever"
  'programs', 'standards',
] as const;

/** The same, for the four stores that predate the by_project index and are
 *  scanned instead. They are the project's too — its lines, the next steps and
 *  wins written against them, and the trackers uploaded to it — and leaving
 *  them behind is how "delete for ever" quietly meant "most of it". */
const PROJECT_OWNED_SCANNED = ['pace_ppm', 'pace_todos', 'pace_wins'] as const;

/** A 6M job's PROBLEMS — the Cases opened on it, each with its fishbone. They
 *  live in a line's store but name the job (projectId), and are the job's: a
 *  job deleted "fully" left them behind, syncing, until 9 October. A Case
 *  with no job of its own (from before problems were a job's) is the line's,
 *  and stays with it, as the walk does. */
const PROJECT_NAMED = ['cases'] as const;
const namedBy = (id: ID) => (r: unknown) => (r as { projectId?: string }).projectId === id;

/** A job's STUDIES (lib/study.ts) are evidence, not the job's work. One that is
 *  only on the job goes with it. One that is also on a line stays with the
 *  line, unlinked from the job — a year of measurements of a running machine
 *  is not destroyed because the job that borrowed them was deleted, the same
 *  rule the walk keeps. */
const goesWithJob = (s: { workspaceId?: string; deletedAt?: number }) => !s.workspaceId;

/** THE SAME RULE FOR A MACHINE AND A PROGRAM (docs/BLUEPRINT.md, Stage 2): one
 *  on a line of the factory is the line's — the machine still stands there and
 *  still runs what was proved on it after the job that brought it in is gone —
 *  so it stays, on no job. One on the job alone goes with it. A line standard
 *  on a line stays too: it is the line's map of a product. */
const LINE_KEPT = ['commission_assets', 'programs', 'standards'] as const;
const keptOnLine = (store: string, r: unknown) =>
  (LINE_KEPT as readonly string[]).includes(store) && !!(r as { workspaceId?: string }).workspaceId;

/** Plain words for a store, for a person being asked to destroy it. */
export const STORE_WORDS: Record<string, string> = {
  pace_ppm: 'lines',
  pace_todos: 'next steps',
  pace_wins: 'wins',
  targets: 'targets',
  readings: 'readings',
  materials: 'things on order',
  tests: 'tests',
  test_items: 'things found and next steps',
  commission_assets: 'machines',
  tree_nodes: 'lever-tree boxes',
  programs: 'programs',
  standards: 'line standard maps',
  studies: 'studies taken with the tools that are on no line',
  cases: 'problems, with their fishbones',
};

/** What a purge would take with it, counted before anybody is asked to confirm.
 *  Nobody can consent to "delete everything" without being told what everything
 *  is. */
export async function projectContents(id: ID): Promise<{ store: string; count: number }[]> {
  const db = await getDB();
  const out: { store: string; count: number }[] = [];
  for (const store of PROJECT_OWNED) {
    const rows = await db.getAllFromIndex(store, 'by_project', id);
    const live = rows.filter(r => !(r as { deletedAt?: number }).deletedAt && !keptOnLine(store, r));
    if (live.length) out.push({ store, count: live.length });
  }
  for (const store of PROJECT_OWNED_SCANNED) {
    const rows = (await db.getAll(store)).filter(inProject(id));
    const live = rows.filter(r => !(r as { deletedAt?: number }).deletedAt);
    if (live.length) out.push({ store, count: live.length });
  }
  for (const store of PROJECT_NAMED) {
    const live = (await db.getAll(store)).filter(namedBy(id)).filter(r => !(r as { deletedAt?: number }).deletedAt);
    if (live.length) out.push({ store, count: live.length });
  }
  const studies = (await db.getAllFromIndex('studies', 'by_project', id)).filter(s => !s.deletedAt && goesWithJob(s));
  if (studies.length) out.push({ store: 'studies', count: studies.length });
  return out;
}

/** Delete a project and everything it owns, for good.
 *
 *  Tombstoned as it goes, so the other devices follow rather than pushing their
 *  copies back — a delete that only happens on the phone it was typed on is not
 *  a delete, it is a disagreement that resolves itself by restoring the data.
 *
 *  THE LINES GO WITH IT, and so do their readings, targets, next steps, wins and
 *  uploads: they are the project's, and a line whose project is gone is a row
 *  nothing can open and nothing can delete. This used to keep them, which meant
 *  "delete for ever" left most of the project behind, syncing quietly.
 *
 *  WHAT SURVIVES IS THE WORKSPACE — the filmed walk, its videos and its snags.
 *  That belongs to the machine rather than to whoever was looking at it this
 *  quarter, and deleting a finished handover must not destroy a year of evidence
 *  about a line that is still running. A workspace with no project is still
 *  reachable from the workspace list. So does a study that is on a line as
 *  well as the job: it stays with the line, unlinked (goesWithJob, above). */
export async function purgeProject(id: ID): Promise<void> {
  const db = await getDB();
  const bury = async (store: typeof PROJECT_OWNED[number] | typeof PROJECT_OWNED_SCANNED[number] | typeof PROJECT_NAMED[number] | 'studies', ids: string[]) => {
    if (!ids.length) return;
    const tx = db.transaction(store, 'readwrite');
    for (const rowId of ids) await tx.store.delete(rowId);
    await tx.done;
    await recordTombstones(store, ids);
  };

  for (const store of PROJECT_OWNED) {
    const rows = await db.getAllFromIndex(store, 'by_project', id);
    await bury(store, rows.filter(r => !keptOnLine(store, r)).map(r => (r as { id: string }).id));
    const kept = rows.filter(r => keptOnLine(store, r));
    if (kept.length) {
      const tx = db.transaction(store, 'readwrite');
      for (const r of kept) await tx.store.put({ ...(r as object), projectId: '', updatedAt: now() } as never);
      await tx.done;
    }
  }
  for (const store of PROJECT_OWNED_SCANNED) {
    const rows = (await db.getAll(store)).filter(inProject(id));
    await bury(store, rows.map(r => (r as { id: string }).id));
  }
  for (const store of PROJECT_NAMED) {
    const rows = (await db.getAll(store)).filter(namedBy(id));
    await bury(store, rows.map(r => (r as { id: string }).id));
  }
  const studies = await db.getAllFromIndex('studies', 'by_project', id);
  await bury('studies', studies.filter(goesWithJob).map(s => s.id));
  for (const s of studies.filter(x => !goesWithJob(x))) {
    await db.put('studies', { ...s, projectId: undefined, uses: [], updatedAt: now() });
  }
  await db.delete('projects', id);
  await recordTombstones('projects', [id]);
  signalWrite();
}
