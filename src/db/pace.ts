/* THE PACE SURFACE: the lines and their ppm, the workspace behind them, the next
 * steps and the wins.
 *
 * One module because every part of it is keyed the same way — project, then line —
 * and the helpers that do that keying are shared between them.
 */
import type { ID } from '../types';
import { uid, now } from '../lib/ids';
import { todayISO } from '../lib/weeks';
import { getDB, signalWrite } from './core';
import type { PaceTodoRow, PaceWinRow, PaceLineRow } from './rows';
import type { SnagAsset } from '../snag/types';
import { recordTombstones, restoreRows, type Restore } from './sync';
import { getWorkspace } from './workspaces';
import { DEFAULT_PROJECT_ID, inProject, onLine, updateProject } from './projects';

/* ---------- a project's lines, and who owns them ----------
 * Every device derives the same row id from project + line key, so a line added
 * on the laptop and one added on the phone are the SAME cloud row rather than
 * two rivals. Older rows on random ids are folded onto that shared id.
 *
 * Nothing is seeded. Four lines of one factory's used to be filled in here for
 * the first project on every device; a project's lines are the ones somebody
 * added to it. */
/** `tidy` folds rivals onto the shared id and deletes the rows it folded away.
 *  DELETING IS THE OWNER'S (lib/access): the database keeps every deleted_at
 *  for anyone else (faultline_keep_agreement), so a team member's device that
 *  tombstoned a rival would see it pulled straight back, and fold it again,
 *  on every pass. Without `tidy` the lines are read the same way — one per
 *  line, the newer edit — and nothing is written; the owner's device does the
 *  folding the next time it opens the project (usePaceLines passes can.remove). */
export async function loadPaceLines(projectId: string, { tidy = false }: { tidy?: boolean } = {}): Promise<PaceLineRow[]> {
  const db = await getDB();
  const rows = await db.getAll('pace_ppm');

  // one-time lift out of the old line-name-keyed store
  if (db.objectStoreNames.contains('pace_lines')) {
    const old = await db.getAll('pace_lines');
    if (old.length) {
      for (const r of old) { const row = { ...r, id: r.id || ppmId(r.key) }; await db.put('pace_ppm', row); rows.push(row); }
      await db.clear('pace_lines');           // migrated, not duplicated
    }
  }

  const mine = rows.filter(r => r.projectId === projectId && !r.deletedAt);

  // Collapse to ONE row per line, on an id every device derives the same way.
  //
  // A random id per device was the bug: open the app on the phone and it minted
  // its own four rows, then — being newer — deleted the four the laptop had the
  // typed numbers in. Deriving the id from the line key means the phone's seed
  // and the laptop's row are the SAME row, so the cloud merges them by clock
  // instead of one killing the other.
  const best = new Map<string, PaceLineRow>();
  const losers: string[] = [];
  /** Keys that TWO rows claimed. Only those get re-keyed below. */
  const contested = new Set<string>();
  const canonical = (r: PaceLineRow) => ppmId(r.key, projectId);
  const better = (a: PaceLineRow, b: PaceLineRow) => {
    const ta = a.updatedAt ?? 0, tb = b.updatedAt ?? 0;
    if (ta !== tb) return ta > tb ? a : b;                  // newest edit wins
    return a.id === canonical(a) ? a : b;                   // tie: the canonical id
  };
  for (const r of mine) {
    const cur = best.get(r.key);
    if (!cur) { best.set(r.key, r); continue; }
    contested.add(r.key);
    const win = better(cur, r);
    best.set(r.key, win);
    losers.push(win === cur ? r.id : cur.id);
  }

  /* Re-key the survivor of a FIGHT onto the canonical id, keeping its clock so a
     typed number still beats another device's untouched copy.
   *
   * A line nobody is fighting over keeps the id it was created with. That rule
   * used to be expressed as "not in the seed", and deleting the seed took the
   * rule with it — so every hand-added line was silently re-keyed on load, and
   * every link to one ("that line isn't on this project any more") broke. */
  if (!tidy) return [...best.values()].sort(byLineOrder);
  const out: PaceLineRow[] = [];
  for (const [key, r] of best) {
    const want = ppmId(key, projectId);
    if (r.id === want || !contested.has(key)) { out.push(r); continue; }
    // A new clock, because the re-key IS a change the cloud has to hear about:
    // keeping the old one would leave the row below this device's push cursor,
    // so the canonical row would never leave the laptop.
    const moved = { ...r, id: want, updatedAt: now() };
    await db.put('pace_ppm', moved);          // write the new row BEFORE dropping the old
    losers.push(r.id);
    out.push(moved);
  }

  if (losers.length) {
    for (const id of losers) await db.delete('pace_ppm', id);
    await recordTombstones('pace_ppm', losers);
  }

  if (losers.length) signalWrite();
  return out.sort(byLineOrder);
}

/** Every live line, whatever project it is in — for the projects list, which
 *  needs the counts and the owners without opening each project in turn. A row
 *  written before projects became plural reads as the default project's, the
 *  same as the adoption in loadPaceLines but without writing anything. */
export async function allPaceLines(): Promise<PaceLineRow[]> {
  const rows = await (await getDB()).getAll('pace_ppm');
  return rows
    .filter(r => !r.deletedAt)
    .map(r => (r.projectId ? r : { ...r, projectId: DEFAULT_PROJECT_ID }))
    .sort(byLineOrder);
}

/** Added lines sit after the ones the project started with, then alphabetically
 *  — a stable order that never depends on which device wrote the row. */
const byLineOrder = (a: PaceLineRow, b: PaceLineRow) =>
  (a.sort ?? 0) - (b.sort ?? 0) || a.key.localeCompare(b.key, undefined, { numeric: true });

/** The same id on every device, so one line is one cloud row. The default
 *  project keeps the bare `ppm-<key>` ids its rows already have on the user's
 *  laptop and phone; anything else is namespaced by project. */
const ppmId = (key: string, projectId?: string) =>
  !projectId || projectId === DEFAULT_PROJECT_ID ? `ppm-${key}` : `ppm-${projectId}-${key}`;

/** Add a line to a project. The key is what the team calls it ("2A"); the id is
 *  random because a hand-added line is created once, by one person, and does
 *  not need two devices to independently agree on it. */
export async function addPaceLine(row: Omit<PaceLineRow, 'id' | 'updatedAt'>): Promise<PaceLineRow> {
  const line: PaceLineRow = { ...row, id: uid(), updatedAt: now() };
  await (await getDB()).put('pace_ppm', line);
  signalWrite();
  return line;
}

/** Soft delete — a tombstone, so removing a line on the laptop also removes it
 *  on the phone rather than the phone pushing it back. Hands back how to put
 *  it back — the same Undo every other delete offers: clearing the mark,
 *  stamped now, so every device takes the line back too. */
export async function deletePaceLine(id: ID): Promise<(() => Promise<void>) | undefined> {
  const db = await getDB();
  const row = await db.get('pace_ppm', id);
  if (!row) return undefined;
  await db.put('pace_ppm', { ...row, deletedAt: now(), updatedAt: now() });
  signalWrite();
  return async () => {
    const cur = (await (await getDB()).get('pace_ppm', id)) ?? row;
    await putPaceLine({ ...cur, deletedAt: undefined });
  };
}

export async function putPaceLine(row: PaceLineRow): Promise<void> {
  await (await getDB()).put('pace_ppm', { ...row, updatedAt: now() });
  signalWrite();
}

/* ---------- the project's own walk ----------
 * The snag list is workspace-scoped ("the workspace IS the line"), and a
 * project is not a workspace, so it keeps one of its own for the walk its
 * Evidence tab opens. The link LIVES ON THE PROJECT ROW (walkWorkspaceId),
 * which syncs: that is what lets the laptop open the walk the phone filmed.
 * It used to live only in this device's meta store, and every other device
 * made a second, empty walk. Meta is kept as the fallback for a link made
 * before the row carried one — read once, then carried over. */
const walkKey = (projectId?: string) =>
  !projectId || projectId === DEFAULT_PROJECT_ID ? 'paceWorkspace' : `paceWorkspace:${projectId}`;
const onProject = (projectId?: string): projectId is string => !!projectId && projectId !== DEFAULT_PROJECT_ID;

async function putWalkOnProject(projectId: string, id: ID): Promise<void> {
  const p = await (await getDB()).get('projects', projectId);
  if (!p || p.walkWorkspaceId === id) return;
  await updateProject({ ...p, walkWorkspaceId: id });
}

export async function getPaceWorkspaceId(projectId?: string): Promise<ID | null> {
  const db = await getDB();
  if (onProject(projectId)) {
    const p = await db.get('projects', projectId);
    if (p?.walkWorkspaceId && await getWorkspace(p.walkWorkspaceId)) return p.walkWorkspaceId;
  }
  const m = (await db.get('meta', walkKey(projectId))) as { id: ID } | undefined;
  if (!m?.id || !(await getWorkspace(m.id))) return null;   // deleted since? treat as absent
  if (onProject(projectId)) await putWalkOnProject(projectId, m.id);  // carry a pre-row link over
  return m.id;
}
export async function setPaceWorkspaceId(id: ID, projectId?: string): Promise<void> {
  await (await getDB()).put('meta', { id }, walkKey(projectId));
  if (onProject(projectId)) await putWalkOnProject(projectId, id);
}

/** WHERE AM I? — the full chain above a workspace, in one read.
 *
 *  A workspace is the bottom of a five-level tree (project → line → walk →
 *  segment → frame) and until now it could only name the project two levels
 *  up. That is why coming back out of a walk landed on the project overview
 *  rather than on the line you were working: the app did not know which line
 *  you had come from, so it guessed the only thing it knew.
 *
 *  Returns the line as well when the workspace is a line's own, so every screen
 *  can show the trail and every back button can land on the step above. */
export async function chainForWorkspace(wsId: ID): Promise<{
  projectId: string; projectName: string; lineId?: string; lineName?: string;
  /** A stage-gate job: its walk lives on Install, and that is the step above. */
  stageGate?: boolean;
} | null> {
  const db = await getDB();
  /* AN ARCHIVED JOB IS NOBODY'S CONTEXT (Rowland, 13 October: "somehow it
     was aligned to an old project ... an old archived project ... archive is
     causing issues"). A line of the factory can be on several jobs; the
     chain is the first job still live on it — never one archived or
     deleted, whose rail, name and lists must not wrap the line's tools. */
  const lines = (await db.getAll('pace_ppm')).filter(l => l.workspaceId === wsId && !l.deletedAt).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const walkOf = lines.length ? null : await projectForWorkspace(wsId);
  const candidates = lines.length ? lines.map(l => ({ line: l as typeof l | undefined, projectId: l.projectId ?? DEFAULT_PROJECT_ID })) : walkOf ? [{ line: undefined, projectId: walkOf }] : [];
  for (const c of candidates) {
    const p = await db.get('projects', c.projectId);
    if (p?.deletedAt || p?.archivedAt) continue;
    return {
      projectId: c.projectId,
      projectName: p?.name ?? 'the project',
      lineId: c.line?.id,
      lineName: c.line?.name,
      stageGate: !!p?.commissioning,
    };
  }
  return null;
}

/** Is this workspace part of a project that has been archived? Archiving a job
 *  puts away everything under it, so what it held — its cases included — must
 *  not keep counting on Home or on the improvement-work screen. */
export async function inArchivedProject(wsId: ID): Promise<boolean> {
  /* A line of the factory can be on several jobs at once (Your factory,
     13 October): it goes into the archive only when every job it is on has
     gone there — one job archived never takes a line another is still using. */
  const ids = await projectsOnWorkspace(wsId);
  if (!ids.length) return false;
  const db = await getDB();
  const ps = await Promise.all(ids.map(id => db.get('projects', id)));
  return ps.every(p => !p || !!p.archivedAt || !!p.deletedAt);
}

/** EVERY JOB A WORKSPACE IS ON — each project whose line names it, and the
 *  project whose own walk it is. A factory line is shared: Line 2A can be a
 *  stage-gate job's line and a 6M job's at once. */
export async function projectsOnWorkspace(wsId: ID): Promise<string[]> {
  const db = await getDB();
  const fromLines = (await db.getAll('pace_ppm')).filter(l => l.workspaceId === wsId && !l.deletedAt).map(l => l.projectId ?? DEFAULT_PROJECT_ID);
  const walk = fromLines.length ? null : await projectForWorkspace(wsId);
  return [...new Set([...fromLines, ...(walk ? [walk] : [])])];
}

/** THE PROJECTS' OWN WALKS — the workspaces a project films its walk in when
 *  it has no line ("<project> — line walk"). They are the project's, reached
 *  from it, and never a line of the factory: listed among the lines they read
 *  as a line nobody has. A workspace a project's line also names is a line. */
export async function projectWalkIds(): Promise<Set<string>> {
  const db = await getDB();
  const lineWs = new Set((await db.getAll('pace_ppm')).filter(l => !l.deletedAt && l.workspaceId).map(l => l.workspaceId as string));
  const walks = new Set<string>();
  for (const p of await db.getAll('projects')) if (p.walkWorkspaceId && !p.deletedAt) walks.add(p.walkWorkspaceId);
  for (const key of await db.getAllKeys('meta')) {
    const k = String(key);
    if (k !== 'paceWorkspace' && !k.startsWith('paceWorkspace:')) continue;
    const m = (await db.get('meta', key)) as { id?: ID } | undefined;
    if (m?.id) walks.add(m.id);
  }
  return new Set([...walks].filter(id => !lineWs.has(id)));
}

/** Which project a workspace belongs to, if any — its project's line-walk
 *  workspace, or the workspace of one of its lines. This is what lets the
 *  generic snag and capture screens offer a way back to the PROJECT rather
 *  than only to Home, which is three steps away from where you came in.
 *  Returns the project id, or null for a free-standing workspace. */
export async function projectForWorkspace(wsId: ID): Promise<string | null> {
  const db = await getDB();

  // a line's own workspace says so on the line row
  const line = (await db.getAll('pace_ppm')).find(l => l.workspaceId === wsId && !l.deletedAt);
  if (line) return line.projectId ?? DEFAULT_PROJECT_ID;

  // the project's own walk says so on the project row
  const owner = (await db.getAll('projects')).find(p => p.walkWorkspaceId === wsId && !p.deletedAt);
  if (owner) return owner.id;

  // a link made before the row carried one lives in meta, keyed by project
  for (const key of await db.getAllKeys('meta')) {
    const k = String(key);
    if (k !== 'paceWorkspace' && !k.startsWith('paceWorkspace:')) continue;
    const m = (await db.get('meta', key)) as { id?: ID } | undefined;
    if (m?.id === wsId) return k === 'paceWorkspace' ? DEFAULT_PROJECT_ID : k.slice('paceWorkspace:'.length);
  }
  return null;
}

/** Every workspace that belongs to a project — the project's own line-walk
 *  workspace plus one per line. Used to tell, from Home, which workspaces are a
 *  project's rather than free-standing. */
export async function projectWorkspaceIds(projectId: string): Promise<ID[]> {
  const walk = await getPaceWorkspaceId(projectId);
  const lines = (await (await getDB()).getAll('pace_ppm'))
    .flatMap(l => (l.projectId === projectId && !l.deletedAt && l.workspaceId ? [l.workspaceId] : []));
  return [...new Set([...(walk ? [walk] : []), ...lines])];
}

/* ---------- next steps ---------- */
export async function listPaceTodos(projectId: string, lineId?: string): Promise<PaceTodoRow[]> {
  const all = await (await getDB()).getAll('pace_todos');
  return all.filter(inProject(projectId)).filter(onLine(lineId)).sort((a, b) => a.createdAt - b.createdAt);
}
/** The day an action was marked done is the store's to keep, not the screen's:
 *  every place that moves a step to done (the board, the list, a Case) gets it
 *  without remembering to, and reopening a step clears it. A step that arrives
 *  already done from another device keeps the day it came with. */
export async function putPaceTodo(t: PaceTodoRow): Promise<void> {
  const db = await getDB();
  const before = await db.get('pace_todos', t.id);
  /* Stamped only on a real move to done. One already done before the day was
     kept stays as it was — it must not claim it was done today the next time
     somebody fixes a typo in it. */
  const wasDone = before?.state === 'done';
  const doneOn = t.state !== 'done' ? undefined : (t.doneOn ?? (wasDone ? before?.doneOn : todayISO()));
  await db.put('pace_todos', { ...t, doneOn, updatedAt: now() });
  signalWrite();
}
export async function deletePaceTodo(id: ID): Promise<void> {
  const db = await getDB();
  const row = await db.get('pace_todos', id);
  // the pictures go with it — otherwise the blobs sit in the media store forever
  const blobs = (row?.media ?? []).flatMap(m => [m.blobKey, m.thumbKey]).filter(Boolean) as string[];
  for (const k of blobs) await db.delete('media', k);
  await db.delete('pace_todos', id);
  await recordTombstones('pace_todos', [id]);
  signalWrite();
}

/* ---------- the success log ---------- */
export async function listPaceWins(projectId: string, lineId?: string): Promise<PaceWinRow[]> {
  const all = await (await getDB()).getAll('pace_wins');
  return all.filter(inProject(projectId)).filter(onLine(lineId)).sort((a, b) => b.createdAt - a.createdAt);   // newest win on top
}
export async function putPaceWin(w: PaceWinRow): Promise<void> {
  await (await getDB()).put('pace_wins', { ...w, updatedAt: now() });
  signalWrite();
}
/** Deleted with an undo (ui/Undo): the row as it was is handed back. */
export async function deletePaceWin(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('pace_wins', id);
  await db.delete('pace_wins', id);
  await recordTombstones('pace_wins', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('pace_wins', [row]); };
}

/** Every frame frozen on any of a project's walks — its own and its lines' —
 *  newest first, with the walk it came from. What a fix is pinned onto. */
export async function framesForProject(projectId: string): Promise<{ frame: SnagAsset; wsId: ID }[]> {
  const db = await getDB();
  const out: { frame: SnagAsset; wsId: ID }[] = [];
  for (const wsId of await projectWorkspaceIds(projectId)) {
    for (const frame of await db.getAllFromIndex('snag_assets', 'by_workspace', wsId)) out.push({ frame, wsId });
  }
  return out.sort((a, b) => (b.frame.updatedAt ?? b.frame.createdAt) - (a.frame.updatedAt ?? a.frame.createdAt));
}
