/* THE PACE SURFACE: the lines and their ppm, the workspace behind them, the next
 * steps and the wins.
 *
 * One module because every part of it is keyed the same way — project, then line —
 * and the helpers that do that keying are shared between them.
 */
import type { ID } from '../types';
import { uid, now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import type { PaceTodoRow, PaceWinRow, PaceLineRow } from './rows';
import { recordTombstones } from './sync';
import { getWorkspace } from './workspaces';
import { DEFAULT_PROJECT_ID, inProject, onLine } from './projects';

/* ---------- a project's lines, and who owns them ----------
 * Every device derives the same row id from project + line key, so a line added
 * on the laptop and one added on the phone are the SAME cloud row rather than
 * two rivals. Older rows on random ids are folded onto that shared id.
 *
 * Nothing is seeded. Four lines of one factory's used to be filled in here for
 * the first project on every device; a project's lines are the ones somebody
 * added to it. */
export async function loadPaceLines(projectId: string): Promise<PaceLineRow[]> {
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
 *  on the phone rather than the phone pushing it back. */
export async function deletePaceLine(id: ID): Promise<void> {
  const db = await getDB();
  const row = await db.get('pace_ppm', id);
  if (!row) return;
  await db.put('pace_ppm', { ...row, deletedAt: now(), updatedAt: now() });
  signalWrite();
}

export async function putPaceLine(row: PaceLineRow): Promise<void> {
  await (await getDB()).put('pace_ppm', { ...row, updatedAt: now() });
  signalWrite();
}

/* ---------- the workspace behind Project Pace ----------
 * The snag list is workspace-scoped ("the workspace IS the line"), and Project
 * Pace is not a workspace, so it keeps one of its own. The id is remembered in
 * meta rather than looked up by name, so renaming the workspace cannot orphan
 * a walk. */
const walkKey = (projectId?: string) =>
  !projectId || projectId === DEFAULT_PROJECT_ID ? 'paceWorkspace' : `paceWorkspace:${projectId}`;

export async function getPaceWorkspaceId(projectId?: string): Promise<ID | null> {
  const m = (await (await getDB()).get('meta', walkKey(projectId))) as { id: ID } | undefined;
  if (!m?.id) return null;
  return (await getWorkspace(m.id)) ? m.id : null;   // deleted since? treat as absent
}
export async function setPaceWorkspaceId(id: ID, projectId?: string): Promise<void> {
  await (await getDB()).put('meta', { id }, walkKey(projectId));
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
} | null> {
  const db = await getDB();
  const line = (await db.getAll('pace_ppm')).find(l => l.workspaceId === wsId && !l.deletedAt);
  const projectId = line ? (line.projectId ?? DEFAULT_PROJECT_ID) : await projectForWorkspace(wsId);
  if (!projectId) return null;
  const p = await db.get('projects', projectId);
  if (p?.deletedAt) return null;
  return {
    projectId,
    projectName: p?.name ?? 'the project',
    lineId: line?.id,
    lineName: line?.name,
  };
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

  // the project's line-walk workspace is remembered in meta, keyed by project
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
    .filter(l => l.projectId === projectId && !l.deletedAt && l.workspaceId)
    .map(l => l.workspaceId!);
  return [...new Set([...(walk ? [walk] : []), ...lines])];
}

/* ---------- next steps ---------- */
export async function listPaceTodos(projectId: string, lineId?: string): Promise<PaceTodoRow[]> {
  const all = await (await getDB()).getAll('pace_todos');
  return all.filter(inProject(projectId)).filter(onLine(lineId)).sort((a, b) => a.createdAt - b.createdAt);
}
export async function putPaceTodo(t: PaceTodoRow): Promise<void> {
  await (await getDB()).put('pace_todos', { ...t, updatedAt: now() });
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
export async function deletePaceWin(id: ID): Promise<void> {
  await (await getDB()).delete('pace_wins', id);
  await recordTombstones('pace_wins', [id]);
  signalWrite();
}
