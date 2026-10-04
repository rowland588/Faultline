/* Cases — the thin A3. Always workspace-scoped. */
import type { ID, Case } from '../types';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows } from './sync';

/* ---------- cases (the thin A3 — always workspace-scoped) ---------- */
export async function listCases(workspaceId: ID): Promise<Case[]> {
  const all = await (await getDB()).getAllFromIndex('cases', 'by_workspace', workspaceId);
  return all.filter(c => c.deletedAt == null).sort((a, b) => b.openedAt - a.openedAt);
}
export async function getCase(id: ID): Promise<Case | undefined> {
  const c = await (await getDB()).get('cases', id);
  return c?.deletedAt == null ? c : undefined;
}
export async function addCase(c: Case): Promise<void> {
  await (await getDB()).put('cases', c);
  signalWrite();
}
export async function updateCase(c: Case): Promise<void> {
  await (await getDB()).put('cases', { ...c, updatedAt: now() });
  signalWrite();
}
/** A project's problems (docs/SIXM.md): the Cases that say they are on it,
 *  and LEGACY Cases — opened before a Case carried a project — that live in
 *  one of `workspaceIds` (its lines' workspaces). Newest first. There is no
 *  project index on the store (adding one is a schema version for a list
 *  that is tens of rows long), so this reads them all and filters. */
export async function listProjectCases(projectId: string, workspaceIds: ID[]): Promise<Case[]> {
  const ws = new Set(workspaceIds);
  const all = await (await getDB()).getAll('cases');
  return all
    .filter(c => c.deletedAt == null && (c.projectId ? c.projectId === projectId : ws.has(c.workspaceId)))
    .sort((a, b) => b.openedAt - a.openedAt);
}
/** Read the live row, change it, write it back stamped — so a change made
 *  from a view never writes over a field another device has changed since
 *  the view was drawn. Returns the row as written, or undefined when it has
 *  gone. */
export async function patchCase(id: ID, change: (c: Case) => Case): Promise<Case | undefined> {
  const cur = await getCase(id);
  if (!cur) return undefined;
  const next = { ...change(cur), id: cur.id, updatedAt: now() };
  await (await getDB()).put('cases', next);
  signalWrite();
  return next;
}
/** The row whatever its state — a removed one too. For the readers that must
 *  tell "its problem was removed" from "not on this device yet" (an action's
 *  causeRef). */
export async function getCaseEvenRemoved(id: ID): Promise<Case | undefined> {
  return (await getDB()).get('cases', id);
}
/** A problem opened by mistake, taken away (docs/SIXM.md): a SOFT delete —
 *  `deletedAt` set and synced, so every device drops it, and the database lets
 *  only the owner set it (faultline_keep_agreement). Returns the row as it was
 *  before, for Undo, or undefined when it had already gone. Its countermeasures
 *  are actions and stay on the board; their causeRef then points at a removed
 *  problem, which every reader says in words. */
export async function removeCase(id: ID): Promise<Case | undefined> {
  const before = await getCase(id);
  if (!before) return undefined;
  await patchCase(id, c => ({ ...c, deletedAt: now() }));
  return before;
}
/** Undo of removeCase: the row put back as it was, stamped now so it wins
 *  over the removal on every device. */
export async function restoreCase(before: Case): Promise<void> {
  const { deletedAt: _gone, ...live } = before;
  await restoreRows('cases', [live]);
}
/** Hard delete + tombstone. Actions keep their caseId (it just dangles —
 *  they lose the folder, never their own life). */
export async function deleteCase(id: ID): Promise<void> {
  const db = await getDB();
  if (!(await db.get('cases', id))) return;
  await db.delete('cases', id);
  await recordTombstones('cases', [id]);
}

/* ============ PROJECTS — improvement initiatives spanning multiple workspaces ============ */
