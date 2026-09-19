/* Projects, and the quarterly numbers that hang off them.
 *
 * Targets and actuals live here rather than in pace.ts because they belong to the
 * PROJECT: a line can be renamed or removed and its targets still have to be
 * findable.
 */
import { type IDBPDatabase } from 'idb';
import type { ID, Millis, Project, ProjectLineTarget, ProjectLineActual } from '../types';
import type { PlanModel } from '../lib/planModel';
import { uid, now } from '../lib/ids';
import { PACE_BASELINE_AT } from '../lib/projectPaceData';
import { getDB, signalWrite } from './core';
import type { PaceSnapshotRow } from './rows';
import { recordTombstones } from './sync';
import type { AppDB } from './core';

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

/** The project the app has always had. Its id is fixed rather than random for
 *  the same reason the line ids are: two devices must land on ONE project, not
 *  two rivals, and the lines already on those devices have to find their way
 *  home to it. */
export const DEFAULT_PROJECT_ID = 'project-pace';

/** True when this device is holding Project Pace's data from before projects
 *  became plural — lines, next steps, wins or an uploaded tracker with no
 *  project against them. That data needs a project to live in; a device with
 *  none does not, and must not invent one.
 *
 *  This is what keeps the fixed id safe now that other people are being invited
 *  in. If every device minted `project-pace` on sight, the second person to
 *  sign in would push a project row whose id already belongs to someone else's
 *  — a primary key they cannot even see, so the write fails and their sync
 *  stalls. A new person starts with no projects and is given one by being
 *  invited, which is what actually happens. */
async function hasLegacyPaceData(db: IDBPDatabase<AppDB>): Promise<boolean> {
  for (const store of ['pace_ppm', 'pace_todos', 'pace_wins', 'pace_snapshots'] as const) {
    const rows = await db.getAll(store);
    if (rows.some(r => !(r as { projectId?: string }).projectId)) return true;
  }
  return false;
}

/** Make sure there is at least one project to open, and that it is the same
 *  project on every one of THIS user's devices. Returns every project, the one
 *  the app shipped with first. */
export async function ensureProjects(defaults: {
  name: string; description?: string; color: string; lead?: string; leadEmail?: string;
}): Promise<Project[]> {
  const db = await getDB();
  const existing = (await db.getAll('projects')).filter(p => !p.deletedAt);
  const hasLegacy = await hasLegacyPaceData(db);
  if (!existing.some(p => p.id === DEFAULT_PROJECT_ID) && hasLegacy) {
    // A fixed old clock, exactly like the line seed: this is shipped scaffolding,
    // not an edit, so a project someone has since renamed always wins over it.
    const project: Project = {
      id: DEFAULT_PROJECT_ID, name: defaults.name, description: defaults.description,
      color: defaults.color, workspaceIds: [], lead: defaults.lead, leadEmail: defaults.leadEmail,
      createdAt: PACE_BASELINE_AT, updatedAt: PACE_BASELINE_AT,
    };
    await db.put('projects', project);
    existing.push(project);
    signalWrite();
  }
  // Now that the default project exists, everything written before projects
  // became plural belongs to it. (Lines are adopted inside loadPaceLines, which
  // is where the rest of the line merging happens — one pass, one decision.)
  if (existing.some(p => p.id === DEFAULT_PROJECT_ID)) await adoptOrphanPaceRows(db);

  return existing.sort(byProjectOrder);
}

/** Stamp the default project onto next steps, wins and uploads that predate
 *  projects. Reading them already treats a missing project as the default, so
 *  this changes nothing on screen — it matters because the row PUSHES what it
 *  holds. Left unstamped, the first edit to an old next step would send
 *  project_id: null and undo what the migration set on the server, and the
 *  people invited to the project would stop seeing it.
 *
 *  The clock is deliberately untouched: this is bookkeeping, not an edit, and a
 *  new clock here would let a stale device's copy beat a real change made
 *  somewhere else. */
async function adoptOrphanPaceRows(db: IDBPDatabase<AppDB>): Promise<void> {
  let touched = false;
  for (const store of ['pace_todos', 'pace_wins', 'pace_snapshots'] as const) {
    for (const row of await db.getAll(store)) {
      if ((row as { projectId?: string }).projectId) continue;
      await db.put(store, { ...row, projectId: DEFAULT_PROJECT_ID } as never);
      touched = true;
    }
  }
  if (touched) signalWrite();
}

/** The default first, then the rest by name — a list that reads the same on
 *  every device rather than in creation order, which no two devices share. */
const byProjectOrder = (a: Project, b: Project) =>
  (a.id === DEFAULT_PROJECT_ID ? 0 : 1) - (b.id === DEFAULT_PROJECT_ID ? 0 : 1)
  || a.name.localeCompare(b.name);

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
export async function listPaceSnapshots(projectId: string = DEFAULT_PROJECT_ID): Promise<PaceSnapshotRow[]> {
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
  'commission_items', 'commission_phases', 'tree_nodes',
  'project_targets', 'project_actuals',
] as const;

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
  return out;
}

/** Delete a project and everything it owns, for good.
 *
 *  Tombstoned as it goes, so the other devices follow rather than pushing their
 *  copies back — a delete that only happens on the phone it was typed on is not
 *  a delete, it is a disagreement that resolves itself by restoring the data.
 *
 *  A LINE IS NOT DELETED WITH ITS PROJECT. The walk, its videos and its snags
 *  belong to the line and usually outlive the project that was looking at them;
 *  taking them too would make deleting a finished handover destroy a year of
 *  evidence about a machine that is still running. */
export async function purgeProject(id: ID): Promise<void> {
  const db = await getDB();
  for (const store of PROJECT_OWNED) {
    const rows = await db.getAllFromIndex(store, 'by_project', id);
    if (!rows.length) continue;
    const ids = rows.map(r => (r as { id: string }).id);
    const tx = db.transaction(store, 'readwrite');
    for (const rowId of ids) await tx.store.delete(rowId);
    await tx.done;
    await recordTombstones(store, ids);
  }
  await db.delete('projects', id);
  await recordTombstones('projects', [id]);
  signalWrite();
}
