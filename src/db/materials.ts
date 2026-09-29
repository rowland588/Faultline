/* What the job is waiting on. One store, keyed by project — see
 * lib/materials.ts for why a material is only three facts. */
import type { ID } from '../types';
import type { Material } from '../lib/materials';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

export async function listMaterials(projectId: string): Promise<Material[]> {
  const all = await (await getDB()).getAllFromIndex('materials', 'by_project', projectId);
  return all.filter(m => !m.deletedAt);
}

export async function putMaterial(m: Material): Promise<void> {
  await (await getDB()).put('materials', { ...m, updatedAt: now() });
  signalWrite();
}

/** Several at once — a pasted plan is fifteen rows, and one write each would
 *  fire the sync debounce fifteen times over. */
export async function putMaterials(rows: Material[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDB();
  const tx = db.transaction('materials', 'readwrite');
  const t = now();
  for (const m of rows) await tx.store.put({ ...m, updatedAt: t });
  await tx.done;
  signalWrite();
}

export async function deleteMaterial(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('materials', id);
  await db.delete('materials', id);
  await recordTombstones('materials', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('materials', [row]); };
}
