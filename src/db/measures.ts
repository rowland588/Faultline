/* Targets and readings. The measures and periods themselves live on the project
 * row — see types.ts — because they are small lists owned entirely by it. */
import type { ID } from '../types';
import type { Reading, Target } from '../lib/measures';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

export async function listTargets(projectId: string): Promise<Target[]> {
  const all = await (await getDB()).getAllFromIndex('targets', 'by_project', projectId);
  return all.filter(t => !t.deletedAt);
}

export async function putTarget(t: Target): Promise<void> {
  await (await getDB()).put('targets', { ...t, updatedAt: now() });
  signalWrite();
}

export async function deleteTarget(id: ID): Promise<void> {
  await (await getDB()).delete('targets', id);
  await recordTombstones('targets', [id]);
  signalWrite();
}

export async function listReadings(projectId: string): Promise<Reading[]> {
  const all = await (await getDB()).getAllFromIndex('readings', 'by_project', projectId);
  return all.filter(r => !r.deletedAt);
}

export async function putReading(r: Reading): Promise<void> {
  await (await getDB()).put('readings', { ...r, updatedAt: now() });
  signalWrite();
}

/** Several at once — a paste writes a hundred rows, and one write each would
 *  fire the sync debounce a hundred times over. */
export async function putReadings(rows: Reading[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDB();
  const tx = db.transaction('readings', 'readwrite');
  const t = now();
  for (const r of rows) await tx.store.put({ ...r, updatedAt: t });
  await tx.done;
  signalWrite();
}

export async function deleteReading(id: ID): Promise<void> {
  await (await getDB()).delete('readings', id);
  await recordTombstones('readings', [id]);
  signalWrite();
}
