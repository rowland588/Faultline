/* The line standard — one map per product. See lib/standard.ts. */
import type { ID } from '../types';
import type { Standard } from '../lib/standard';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

export async function listStandards(projectId: string): Promise<Standard[]> {
  const all = await (await getDB()).getAllFromIndex('standards', 'by_project', projectId);
  return all.filter(s => !s.deletedAt).sort((a, b) => a.sort - b.sort || a.product.localeCompare(b.product));
}

/** EVERY line standard on this device — on a line, on a job, or both: the
 *  tools page beside the snags (screens/LineToolsScreen). */
export async function listAllStandards(): Promise<Standard[]> {
  const all = await (await getDB()).getAll('standards');
  return all.filter(s => !s.deletedAt).sort((a, b) => a.sort - b.sort || a.product.localeCompare(b.product));
}

/** A line's standards — the maps and balances that belong to a line (a line
 *  study), whether or not they are attached to a job. */
export async function listStandardsForLine(workspaceId: string): Promise<Standard[]> {
  const all = await (await getDB()).getAll('standards');
  return all.filter(s => !s.deletedAt && s.workspaceId === workspaceId).sort((a, b) => a.sort - b.sort || a.product.localeCompare(b.product));
}

export async function getStandard(id: ID): Promise<Standard | undefined> {
  const s = await (await getDB()).get('standards', id);
  return s && !s.deletedAt ? s : undefined;
}

export async function putStandard(s: Standard): Promise<void> {
  await (await getDB()).put('standards', { ...s, updatedAt: now() });
  signalWrite();
}

/** Deleted with an undo. The picture stays in the store: a copied map shares
 *  it, and the undo needs it back. */
export async function deleteStandard(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('standards', id);
  await db.delete('standards', id);
  await recordTombstones('standards', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('standards', [row]); };
}
