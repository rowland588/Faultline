/* Projects, and the quarterly numbers that hang off them.
 *
 * Targets and actuals live here rather than in pace.ts because they belong to the
 * PROJECT: a line can be renamed or removed and its targets still have to be
 * findable.
 */
import type { ID, Millis, Project, ProjectLineTarget, ProjectLineActual } from '../types';
import type { PlanModel } from '../lib/planModel';
import { uid, now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import type { PaceSnapshotRow } from './rows';
import { recordTombstones } from './sync';

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

/* Project targets — quarterly PPM goals for each line */
export async function getProjectTargets(projectId: ID): Promise<ProjectLineTarget[]> {
  const db = await getDB();
  const targets = await db.getAllFromIndex('project_targets', 'by_project', projectId);
  return targets.filter(t => !t.deletedAt);
}
export async function addProjectTarget(t: ProjectLineTarget): Promise<void> {
  await (await getDB()).put('project_targets', t);
  signalWrite();
}
export async function updateProjectTarget(t: ProjectLineTarget): Promise<void> {
  await (await getDB()).put('project_targets', { ...t, updatedAt: now() });
  signalWrite();
}

/* Project actuals — daily/weekly PPM measurements */
export async function getProjectActuals(projectId: ID, startDate?: Millis, endDate?: Millis): Promise<ProjectLineActual[]> {
  const db = await getDB();
  const actuals = await db.getAllFromIndex('project_actuals', 'by_project', projectId);
  const filtered = actuals.filter(a => !a.deletedAt);
  if (startDate || endDate) {
    return filtered.filter(a => (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate));
  }
  return filtered;
}
export async function addProjectActual(a: ProjectLineActual): Promise<void> {
  await (await getDB()).put('project_actuals', a);
  signalWrite();
}
export async function getProjectActualsByWorkspace(projectId: ID, workspaceId: ID): Promise<ProjectLineActual[]> {
  const db = await getDB();
  const actuals = await db.getAllFromIndex('project_actuals', 'by_workspace', workspaceId);
  return actuals.filter(a => a.projectId === projectId && !a.deletedAt).sort((a, b) => a.date - b.date);
}


/* ============ PACE SNAPSHOTS — weekly uploads of the tracker workbook ============
 * Newest first. Local to this device by design (see the schema note above). */
export async function listPaceSnapshots(projectId: string): Promise<PaceSnapshotRow[]> {
  const all = await (await getDB()).getAll('pace_snapshots');
  return all.filter(inProject(projectId)).sort((a, b) => b.takenAt - a.takenAt);
}

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
export async function addPaceSnapshot(s: PaceSnapshotRow): Promise<void> {
  await (await getDB()).put('pace_snapshots', s);
  signalWrite();
}
export async function deletePaceSnapshot(id: ID): Promise<void> {
  await (await getDB()).delete('pace_snapshots', id);
  await recordTombstones('pace_snapshots', [id]);
  signalWrite();
}

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
 */

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
  'commission_assets', 'tests', 'test_items', 'targets', 'readings', 'tree_nodes',
  'project_targets', 'project_actuals',
] as const;

/** The same, for the four stores that predate the by_project index and are
 *  scanned instead. They are the project's too — its lines, the next steps and
 *  wins written against them, and the trackers uploaded to it — and leaving
 *  them behind is how "delete for ever" quietly meant "most of it". */
const PROJECT_OWNED_SCANNED = ['pace_ppm', 'pace_todos', 'pace_wins', 'pace_snapshots'] as const;

/** Plain words for a store, for a person being asked to destroy it. */
export const STORE_WORDS: Record<string, string> = {
  pace_ppm: 'lines',
  pace_todos: 'next steps',
  pace_wins: 'wins',
  pace_snapshots: 'uploaded trackers',
  targets: 'targets',
  readings: 'readings',
  tests: 'tests',
  test_items: 'things found and next steps',
  commission_assets: 'machines',
  tree_nodes: 'lever-tree boxes',
  project_targets: 'quarterly targets',
  project_actuals: 'weekly actuals',
};

/** What a purge would take with it, counted before anybody is asked to confirm.
 *  Nobody can consent to "delete everything" without being told what everything
 *  is. */
export async function projectContents(id: ID): Promise<{ store: string; count: number }[]> {
  const db = await getDB();
  const out: { store: string; count: number }[] = [];
  for (const store of PROJECT_OWNED) {
    const rows = await db.getAllFromIndex(store, 'by_project', id);
    const live = rows.filter(r => !(r as { deletedAt?: number }).deletedAt);
    if (live.length) out.push({ store, count: live.length });
  }
  for (const store of PROJECT_OWNED_SCANNED) {
    const rows = (await db.getAll(store)).filter(inProject(id));
    const live = rows.filter(r => !(r as { deletedAt?: number }).deletedAt);
    if (live.length) out.push({ store, count: live.length });
  }
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
 *  reachable from the workspace list. */
export async function purgeProject(id: ID): Promise<void> {
  const db = await getDB();
  const bury = async (store: typeof PROJECT_OWNED[number] | typeof PROJECT_OWNED_SCANNED[number], ids: string[]) => {
    if (!ids.length) return;
    const tx = db.transaction(store, 'readwrite');
    for (const rowId of ids) await tx.store.delete(rowId);
    await tx.done;
    await recordTombstones(store, ids);
  };

  for (const store of PROJECT_OWNED) {
    const rows = await db.getAllFromIndex(store, 'by_project', id);
    await bury(store, rows.map(r => (r as { id: string }).id));
  }
  for (const store of PROJECT_OWNED_SCANNED) {
    const rows = (await db.getAll(store)).filter(inProject(id));
    await bury(store, rows.map(r => (r as { id: string }).id));
  }
  await db.delete('projects', id);
  await recordTombstones('projects', [id]);
  signalWrite();
}
