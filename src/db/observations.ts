/* Observations. Always workspace-scoped. */
import type { ID, Observation } from '../types';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';

/* ---------- observations (always workspace-scoped) ---------- */

export async function listObservations(workspaceId: ID): Promise<Observation[]> {
  const all = await (await getDB()).getAllFromIndex('observations', 'by_workspace', workspaceId);
  return all.filter(o => o.deletedAt == null).sort((a, b) => b.startedAt - a.startedAt);
}

export async function addObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', o);
  signalWrite();
}

export async function updateObservation(o: Observation): Promise<void> {
  await (await getDB()).put('observations', { ...o, updatedAt: now() });
  signalWrite();
}

export async function softDeleteObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: now(), updatedAt: now() });
  signalWrite();
}

/** Undo a soft-delete (clears the tombstone). Powers the delete → Undo affordance. */
export async function restoreObservation(id: ID): Promise<void> {
  const db = await getDB();
  const o = await db.get('observations', id);
  if (!o) return;
  await db.put('observations', { ...o, deletedAt: undefined, updatedAt: now() });
  signalWrite();
}

/** Rename a taxonomy value across every observation that uses it, so a rename in
 *  settings doesn't orphan history (the taxonomy is stored as plain strings). */
export async function renameInObservations(
  workspaceId: ID, field: 'category' | 'subcategory' | 'asset' | 'shift', from: string, to: string,
  onlyCategory?: string, // scope sub-category renames to their parent category
): Promise<number> {
  if (from === to) return 0;
  const db = await getDB();
  const all = await db.getAllFromIndex('observations', 'by_workspace', workspaceId);
  const tx = db.transaction('observations', 'readwrite');
  let n = 0;
  for (const o of all) {
    if (o[field] === from && (onlyCategory == null || o.category === onlyCategory)) {
      await tx.objectStore('observations').put({ ...o, [field]: to, updatedAt: now() }); n++;
    }
  }
  await tx.done;
  if (n > 0) signalWrite();
  return n;
}
