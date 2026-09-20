/* Commissioning — the machines, the packs, and the claims about them. */
import type { ID } from '../types';
import type { Asset, CommissionItem, Pack } from '../lib/commissioning';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

/* ---------- the claims: what has to become true ---------- */

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
  if (!items.length) return;
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

/* ---------- the machines ---------- */

export async function listCommissionAssets(projectId: string): Promise<Asset[]> {
  const all = await (await getDB()).getAllFromIndex('commission_assets', 'by_project', projectId);
  return all.filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export async function putCommissionAsset(a: Asset): Promise<void> {
  await (await getDB()).put('commission_assets', { ...a, updatedAt: now() });
  signalWrite();
}

/** Remove a machine, and take its claims with it.
 *
 *  Leaving them behind would drop them into "the line itself", where a rate for
 *  a machine that is no longer on the line reads as a rate the LINE has to hit.
 *  Both sides get tombstones, or the delete never leaves this device. */
export async function deleteCommissionAsset(id: ID, projectId: string): Promise<void> {
  const db = await getDB();
  const items = (await db.getAllFromIndex('commission_items', 'by_project', projectId))
    .filter(i => i.assetId === id);
  const tx = db.transaction(['commission_assets', 'commission_items'], 'readwrite');
  await tx.objectStore('commission_assets').delete(id);
  for (const i of items) await tx.objectStore('commission_items').delete(i.id);
  await tx.done;
  await recordTombstones('commission_assets', [id]);
  if (items.length) await recordTombstones('commission_items', items.map(i => i.id));
  signalWrite();
}

/** What deleting a machine would take with it, so the warning can say the
 *  number rather than "and related data". */
export async function assetContents(id: ID, projectId: string): Promise<{ items: number }> {
  const items = (await (await getDB()).getAllFromIndex('commission_items', 'by_project', projectId))
    .filter(i => i.assetId === id && !i.deletedAt);
  return { items: items.length };
}

/* ---------- the packs ---------- */

export async function listCommissionPacks(projectId: string): Promise<Pack[]> {
  const all = await (await getDB()).getAllFromIndex('commission_packs', 'by_project', projectId);
  return all.filter(p => !p.deletedAt).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export async function putCommissionPack(p: Pack): Promise<void> {
  await (await getDB()).put('commission_packs', { ...p, updatedAt: now() });
  signalWrite();
}

/** Remove a pack, and the programs written for it. Same reasoning as an asset:
 *  a program for a pack that no longer exists is a row nobody can act on. */
export async function deleteCommissionPack(id: ID, projectId: string): Promise<void> {
  const db = await getDB();
  const items = (await db.getAllFromIndex('commission_items', 'by_project', projectId))
    .filter(i => i.packId === id);
  const tx = db.transaction(['commission_packs', 'commission_items'], 'readwrite');
  await tx.objectStore('commission_packs').delete(id);
  for (const i of items) await tx.objectStore('commission_items').delete(i.id);
  await tx.done;
  await recordTombstones('commission_packs', [id]);
  if (items.length) await recordTombstones('commission_items', items.map(i => i.id));
  signalWrite();
}

export async function packContents(id: ID, projectId: string): Promise<{ items: number }> {
  const items = (await (await getDB()).getAllFromIndex('commission_items', 'by_project', projectId))
    .filter(i => i.packId === id && !i.deletedAt);
  return { items: items.length };
}
