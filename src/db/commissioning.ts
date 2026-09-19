/* Commissioning — the readiness list for a line handover. */
import type { ID } from '../types';
import type { CommissionItem, Phase } from '../lib/commissioning';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

/* ---------- commissioning: the readiness list for a line handover ---------- */

export async function listCommissionItems(projectId: string): Promise<CommissionItem[]> {
  const all = await (await getDB()).getAllFromIndex('commission_items', 'by_project', projectId);
  return all.filter(i => !i.deletedAt).sort((a, b) => a.sort - b.sort);
}

export async function putCommissionItem(i: CommissionItem): Promise<void> {
  await (await getDB()).put('commission_items', { ...i, updatedAt: now() });
  signalWrite();
}

/** Several at once — seeding a fresh list writes a dozen rows, and one write
 *  each would fire the sync debounce a dozen times over. */
export async function putCommissionItems(items: CommissionItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('commission_items', 'readwrite');
  const t = now();
  for (const i of items) await tx.store.put({ ...i, updatedAt: t });
  await tx.done;
  signalWrite();
}

export async function deleteCommissionItem(id: ID): Promise<void> {
  await (await getDB()).delete('commission_items', id);
  await recordTombstones('commission_items', [id]);
  signalWrite();
}

/* ---------- the programme: the stages the line goes through ---------- */

export async function listCommissionPhases(projectId: string): Promise<Phase[]> {
  const all = await (await getDB()).getAllFromIndex('commission_phases', 'by_project', projectId);
  return all.filter(p => !p.deletedAt);
}

export async function putCommissionPhase(p: Phase): Promise<void> {
  await (await getDB()).put('commission_phases', { ...p, updatedAt: now() });
  signalWrite();
}

export async function putCommissionPhases(phases: Phase[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('commission_phases', 'readwrite');
  const t = now();
  for (const p of phases) await tx.store.put({ ...p, updatedAt: t });
  await tx.done;
  signalWrite();
}
