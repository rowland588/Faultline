/* Testing — the machines, the tests, and what hangs off a test. */
import type { ID } from '../types';
import type { Asset, Test, TestItem } from '../lib/testing';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

/* ---------- the machines ----------
   The store is still called commission_assets: it is already on every device
   and in the cloud, and renaming a table nobody sees would cost a migration for
   no gain. */

export async function listAssets(projectId: string): Promise<Asset[]> {
  const all = await (await getDB()).getAllFromIndex('commission_assets', 'by_project', projectId);
  return all.filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export async function putAsset(a: Asset): Promise<void> {
  await (await getDB()).put('commission_assets', { ...a, updatedAt: now() });
  signalWrite();
}

/** Remove a machine. Its tests stay: a test that happened, happened, and losing
 *  the record of it because somebody tidied up the machine list would be the
 *  worst possible trade. They simply stop naming a machine. */
export async function deleteAsset(id: ID, projectId: string): Promise<void> {
  const db = await getDB();
  const tests = (await db.getAllFromIndex('tests', 'by_project', projectId)).filter(t => t.assetId === id);
  const tx = db.transaction(['commission_assets', 'tests'], 'readwrite');
  await tx.objectStore('commission_assets').delete(id);
  const t = now();
  for (const test of tests) await tx.objectStore('tests').put({ ...test, assetId: undefined, updatedAt: t });
  await tx.done;
  await recordTombstones('commission_assets', [id]);
  signalWrite();
}

/* ---------- the tests ---------- */

export async function listTests(projectId: string): Promise<Test[]> {
  const all = await (await getDB()).getAllFromIndex('tests', 'by_project', projectId);
  return all.filter(t => !t.deletedAt);
}

export async function putTest(t: Test): Promise<void> {
  await (await getDB()).put('tests', { ...t, updatedAt: now() });
  signalWrite();
}

/** A test and everything under it. Both tombstoned, or the delete never leaves
 *  this device and the other one pushes its copy straight back. */
export async function deleteTest(id: ID, projectId: string): Promise<void> {
  const db = await getDB();
  const items = (await db.getAllFromIndex('test_items', 'by_project', projectId)).filter(i => i.testId === id);
  const tx = db.transaction(['tests', 'test_items'], 'readwrite');
  await tx.objectStore('tests').delete(id);
  for (const i of items) await tx.objectStore('test_items').delete(i.id);
  await tx.done;
  await recordTombstones('tests', [id]);
  if (items.length) await recordTombstones('test_items', items.map(i => i.id));
  signalWrite();
}

/** What deleting a test would take with it, so the warning says a number rather
 *  than "and related data". */
export async function testContents(id: ID, projectId: string): Promise<{ found: number; next: number }> {
  const items = (await (await getDB()).getAllFromIndex('test_items', 'by_project', projectId))
    .filter(i => i.testId === id && !i.deletedAt);
  return {
    found: items.filter(i => i.kind === 'found').length,
    next: items.filter(i => i.kind === 'next').length,
  };
}

/* ---------- what we found, and what happens next ---------- */

export async function listTestItems(projectId: string): Promise<TestItem[]> {
  const all = await (await getDB()).getAllFromIndex('test_items', 'by_project', projectId);
  return all.filter(i => !i.deletedAt);
}

export async function putTestItem(i: TestItem): Promise<void> {
  await (await getDB()).put('test_items', { ...i, updatedAt: now() });
  signalWrite();
}

export async function deleteTestItem(id: ID): Promise<void> {
  await (await getDB()).delete('test_items', id);
  await recordTombstones('test_items', [id]);
  signalWrite();
}
