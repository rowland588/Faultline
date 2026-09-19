/* Cases — the thin A3. Always workspace-scoped. */
import type { ID, Case } from '../types';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

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
/** Hard delete + tombstone. Actions keep their caseId (it just dangles —
 *  they lose the folder, never their own life). */
export async function deleteCase(id: ID): Promise<void> {
  const db = await getDB();
  if (!(await db.get('cases', id))) return;
  await db.delete('cases', id);
  await recordTombstones('cases', [id]);
}

/* ============ PROJECTS — improvement initiatives spanning multiple workspaces ============ */
