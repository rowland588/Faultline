/* Cases — the thin A3. Always workspace-scoped. */
import type { ID, Case } from '../types';
import { now, uid } from '../lib/ids';
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
/** Open the investigation and link the originating observation in one local write. */
export async function takeRegisterProblem(snagId: string, draft: Case, job: string, recovery: boolean) {
  const db = await getDB();
  const tx = db.transaction(['cases', 'snags'], 'readwrite');
  const snags = tx.objectStore('snags');
  const before = await snags.get(snagId);
  if (!before || before.deletedAt || before.archivedAt || before.caseId || before.status === 'closed'
    || before.workspaceId !== draft.workspaceId || (recovery && before.projectId && before.projectId !== draft.projectId)) {
    await tx.done;
    return undefined;
  }
  const t = now();
  const problem = { ...draft, title: before.problem.trim() || 'Something seen' };
  const closeNote = `Taken to 6M on ${job}`;
  const step = { id: uid(), at: t, did: `Taken to 6M on ${job} — to find its root cause` };
  await tx.objectStore('cases').add(problem);
  await snags.put({ ...before, status: 'closed', closedAt: t, projectId: draft.projectId, caseId: problem.id,
    closeNote, journey: [...(before.journey ?? []), step], updatedAt: t });
  await tx.done;
  signalWrite();

  return { problem, undo: async () => {
    const undo = db.transaction(['cases', 'snags'], 'readwrite');
    const cases = undo.objectStore('cases'), register = undo.objectStore('snags');
    const current = await register.get(snagId);
    const investigation = await cases.get(problem.id);
    // Only reverse the transition we made. Later notes on the register are independent.
    if (!current || current.deletedAt || current.archivedAt || current.caseId !== problem.id
      || current.status !== 'closed' || current.closedAt !== t || current.closeNote !== closeNote
      || current.projectId !== problem.projectId || !investigation || JSON.stringify(investigation) !== JSON.stringify(problem)) {
      await undo.done;
      return;
    }
    const at = now();
    await cases.put({ ...investigation, deletedAt: at, updatedAt: at });
    await register.put({ ...current, status: before.status, closedAt: before.closedAt, projectId: before.projectId,
      caseId: before.caseId, closeNote: before.closeNote, journey: current.journey?.filter(j => j.id !== step.id), updatedAt: at });
    await undo.done;
    signalWrite();
  } };
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
