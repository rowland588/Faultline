/* Projects, and the quarterly numbers that hang off them.
 *
 * Targets and actuals live here rather than in pace.ts because they belong to the
 * PROJECT: a line can be renamed or removed and its targets still have to be
 * findable.
 */
import type { ID, Project, Workspace } from '../types';
import type { PlanModel } from '../lib/planModel';
import { planModel } from '../lib/planModel';
import { uid, now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';
import { allPaceLines } from './pace';
import { getWorkspace, restoreWorkspace } from './workspaces';
import { addMachineToLine } from './lineRecords';
import { putProgram } from './programs';
import { putAsset, putTest, putTestItem } from './testing';
import { putStandard } from './standards';
import { putStudy } from './studies';
import { listAllPrograms } from './programs';
import { archiveWorkspace } from './workspaces';
import { projectsOnWorkspace, putPaceLine } from './pace';

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

/** Create a project. Everything else about it — its lines, its people — is
 *  added afterwards, so this is deliberately just a name and a colour. */
export async function createProject(
  name: string, color: string, lead?: string, leadEmail?: string,
  /** The plan model, chosen at the moment the project is started — see
   *  ProjectsScreen. Not bolted on afterwards in a settings tab nobody visits:
   *  a project runs the 3P board, the lever tree or a commissioning list, and
   *  which one is a decision worth asking for up front rather than leaving as
   *  an unticked box under Lines & people. */
  model?: PlanModel,
): Promise<Project> {
  const p: Project = {
    id: uid(), name: name.trim() || 'New project', color, workspaceIds: [],
    lead, leadEmail,
    leverTree: model === 'tree' || undefined,
    commissioning: model === 'commissioning' || undefined,
    createdAt: now(), updatedAt: now(),
  };
  await (await getDB()).put('projects', p);
  signalWrite();
  return p;
}

/* Project targets and actuals, and the uploaded tracker's snapshots: RETIRED 13 October
   (docs/BLUEPRINT.md §5.1-5.2) — read by no screen, 0 rows in the cloud. */

/** A row belongs to a project if it says so — and if it says nothing, it is the
 *  default project's. That is what carries every next step, win and upload the
 *  user already has into Project Pace rather than into nothing. */
/** Exported for pace.ts, which keys everything the same way. */
export const inProject = (projectId: string) => (r: { projectId?: string }) =>
  (r.projectId ?? DEFAULT_PROJECT_ID) === projectId;

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
 * RELEASE TO THE LINE (Rowland, 29 October): an installation project's programs,
 * tests and machines belong on the production line when the gate shell goes away
 * — projectId cleared, workspaceId set to the line (Line 2A when it exists).
 */

async function allWorkspaces(): Promise<Workspace[]> {
  return (await getDB()).getAll('workspaces');
}

/** Which factory line should own what leaves an installation project. */
async function resolveReleaseWorkspace(projectId: ID, hint?: ID): Promise<ID> {
  if (hint) return hint;
  const [jobLines, workspaces] = await Promise.all([allPaceLines(), allWorkspaces()]);
  const onJob = jobLines.filter(l => l.projectId === projectId && !l.deletedAt);
  const line2a = onJob.find(l => /2a/i.test(l.name) || l.key === '2A');
  if (line2a?.workspaceId) return line2a.workspaceId;
  const ws2a = workspaces.find(w => !w.archived && /line\s*2a/i.test(w.name))
    ?? workspaces.find(w => w.archived && /line\s*2a/i.test(w.name));
  if (ws2a) return ws2a.id;
  const withWs = onJob.find(l => l.workspaceId);
  if (withWs?.workspaceId) return withWs.workspaceId;
  const p = await getProject(projectId);
  const fromProj = p?.workspaceIds?.find(Boolean);
  if (fromProj) return fromProj;
  throw new Error('Pick which production line should keep the programs and tests.');
}

export interface ReleaseInstallationResult {
  workspaceId: ID;
  programs: number;
  tests: number;
  machines: number;
  /** Factory lines archived because they only belonged to this installation. */
  linesArchived: number;
}

/** After an installation project goes away: drop its gate lines from the factory
 *  board and archive workspaces that only existed for that job (Line 7 / Line 8
 *  on the install), keeping the line that now owns the programs. */
export async function tidyArchivedInstallation(projectId: ID, keepWorkspaceId?: ID): Promise<number> {
  const db = await getDB();
  const stamp = now();
  const paceRows = (await db.getAll('pace_ppm')).filter(r => r.projectId === projectId && !r.deletedAt);
  const wsIds = new Set<ID>();
  for (const row of paceRows) {
    if (row.workspaceId) wsIds.add(row.workspaceId);
    await putPaceLine({ ...row, deletedAt: stamp, updatedAt: stamp });
  }
  if (paceRows.length) await recordTombstones('pace_ppm', paceRows.map(r => r.id));

  const progs = await listAllPrograms();
  let archived = 0;
  for (const wsId of wsIds) {
    if (keepWorkspaceId && wsId === keepWorkspaceId) continue;
    const on = await projectsOnWorkspace(wsId);
    const live = (await Promise.all(on.map(id => getProject(id)))).filter(p => p && !p.archivedAt && !p.deletedAt);
    if (live.length) continue;
    if (progs.some(p => !p.deletedAt && !p.projectId && p.workspaceId === wsId)) continue;
    const ws = await db.get('workspaces', wsId);
    if (ws && !ws.archived) {
      await archiveWorkspace(wsId);
      archived++;
    }
  }
  return archived;
}

const INSTALL_TIDY_KEY = 'fl-install-tidy-swept';

/** One pass per archived installation project — clears ghost lines on Factory after Rowland moved programs to the line. */
export async function sweepArchivedInstallationLines(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(INSTALL_TIDY_KEY) ?? '[]') as string[]; } catch { done = []; }
  for (const p of await allProjects()) {
    if (!p.archivedAt || planModel(p) !== 'commissioning' || done.includes(p.id)) continue;
    await tidyArchivedInstallation(p.id);
    done.push(p.id);
    localStorage.setItem(INSTALL_TIDY_KEY, JSON.stringify(done));
  }
}

/** Move a project's programs, tests, machines and line standards onto a factory line. */
async function moveInstallationArtifactsToLine(projectId: ID, wsId: ID, stamp: number): Promise<{ programs: number; tests: number; machines: number }> {
  const db = await getDB();

  const assets = (await db.getAllFromIndex('commission_assets', 'by_project', projectId))
    .filter(a => !(a as { deletedAt?: number }).deletedAt);
  for (const a of assets) {
    await addMachineToLine(wsId, a.name, a.oem);
    await putAsset({ ...a, projectId: '', workspaceId: wsId, updatedAt: stamp });
  }

  const programs = (await db.getAllFromIndex('programs', 'by_project', projectId))
    .filter(r => !(r as { deletedAt?: number }).deletedAt);
  for (const prog of programs) {
    await putProgram({ ...prog, projectId: '', workspaceId: wsId, updatedAt: stamp });
  }

  const tests = (await db.getAllFromIndex('tests', 'by_project', projectId))
    .filter(t => !t.deletedAt);
  for (const test of tests) {
    await putTest({ ...test, projectId: '', updatedAt: stamp });
  }

  const items = (await db.getAllFromIndex('test_items', 'by_project', projectId))
    .filter(i => !(i as { deletedAt?: number }).deletedAt);
  for (const item of items) {
    await putTestItem({ ...item, projectId: '', updatedAt: stamp });
  }

  const standards = (await db.getAllFromIndex('standards', 'by_project', projectId))
    .filter(s => !s.deletedAt);
  for (const s of standards) {
    await putStandard({ ...s, projectId: '', workspaceId: wsId, updatedAt: stamp });
  }

  const studies = (await db.getAllFromIndex('studies', 'by_project', projectId)).filter(s => !s.deletedAt);
  for (const s of studies) {
    if (s.workspaceId) await putStudy({ ...s, projectId: undefined, updatedAt: stamp });
  }

  return { programs: programs.length, tests: tests.length, machines: assets.length };
}

async function installationProjectOnLine(projectId: ID, wsId: ID): Promise<boolean> {
  return (await projectsOnWorkspace(wsId)).includes(projectId);
}

/** How many programs and tests would move off archived installation projects onto this line. */
export async function countLiftableFromArchivedProjects(wsId: ID): Promise<{ programs: number; tests: number }> {
  const db = await getDB();
  let programs = 0;
  let tests = 0;
  for (const p of await allProjects()) {
    if (!p.archivedAt || planModel(p) !== 'commissioning') continue;
    if (!(await installationProjectOnLine(p.id, wsId))) continue;
    programs += (await db.getAllFromIndex('programs', 'by_project', p.id)).filter(r => !(r as { deletedAt?: number }).deletedAt).length;
    tests += (await db.getAllFromIndex('tests', 'by_project', p.id)).filter(t => !t.deletedAt).length;
  }
  return { programs, tests };
}

/** Programs and tests still on archived installation projects come onto the line; projects stay archived. */
export async function liftProgramsFromArchivedProjectsOnLine(wsId: ID): Promise<{ programs: number; tests: number }> {
  const stamp = now();
  let programs = 0;
  let tests = 0;
  for (const p of await allProjects()) {
    if (!p.archivedAt || planModel(p) !== 'commissioning') continue;
    if (!(await installationProjectOnLine(p.id, wsId))) continue;
    const moved = await moveInstallationArtifactsToLine(p.id, wsId, stamp);
    programs += moved.programs;
    tests += moved.tests;
  }
  signalWrite();
  return { programs, tests };
}

/** Put a production line back on the factory board — programs on the line, not a project. */
export async function restoreProductionLine(wsId: ID): Promise<{ lifted: { programs: number; tests: number } }> {
  const lifted = await liftProgramsFromArchivedProjectsOnLine(wsId);
  await restoreWorkspace(wsId);
  return { lifted };
}

/** Move every program, test, machine and line standard onto a production line,
 *  then archive the installation project (gates, plan, Commission — all on the
 *  archived project, reachable from Archive if needed). */
export async function releaseInstallationToLine(projectId: ID, workspaceId?: ID): Promise<ReleaseInstallationResult> {
  const p = await getProject(projectId);
  if (!p) throw new Error('That project is not here.');
  if (planModel(p) !== 'commissioning') throw new Error('Only an installation project can release programs to the line.');
  const wsId = await resolveReleaseWorkspace(projectId, workspaceId);
  const stamp = now();
  const moved = await moveInstallationArtifactsToLine(projectId, wsId, stamp);
  const target = await getWorkspace(wsId);
  if (target?.archived) await restoreWorkspace(wsId);
  const linesArchived = await tidyArchivedInstallation(projectId, wsId);
  await archiveProject(projectId);
  return { workspaceId: wsId, ...moved, linesArchived };
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
