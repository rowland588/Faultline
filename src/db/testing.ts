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

/* ---------- ONE NOUN: THE ACTION BECOMES A FIX ----------
 *
 * Rowland: "what's the difference between an action and a fix? I don't think
 * there is. Action could be something to do with training, a fix is usually a
 * physical object — but as a matter of fact they're just fixes. I think we only
 * need fix."
 *
 * He is right, and it is the fifth-concept rule doing its work: two nouns for
 * one job means choosing between them every time, and then the numbers split
 * across two rows of the table a client reads.
 *
 * So an agreed next step is no longer a line under a test. It is a FIX — the
 * same record a test is, with its own days, its own findings and its own card.
 * The words, whose it is and the date it was wanted all carry across; nothing
 * is thrown away.
 *
 * WHY THIS RUNS IN THE APP RATHER THAN AS SQL. The rows live on the device
 * first and in the cloud second, and a phone can be carrying one that has never
 * been pushed. Converting here means every device fixes its own and the result
 * syncs like any other edit.
 *
 * IT NEEDS NO FLAG TO SAY IT HAS RUN. Once a next step has become a fix there
 * is no next step left to find, so calling it twice does nothing — which is the
 * only kind of migration worth trusting. */
export async function actionsBecomeFixes(projectId: ID): Promise<number> {
  const db = await getDB();
  const items = (await db.getAllFromIndex('test_items', 'by_project', projectId))
    .filter(i => !i.deletedAt && i.kind === 'next');
  if (items.length === 0) return 0;

  const tests = (await db.getAllFromIndex('tests', 'by_project', projectId)).filter(t => !t.deletedAt);
  const topSort = tests.reduce((n, t) => Math.max(n, t.sort), 0);
  const at = now();
  let made = 0;

  for (const i of items) {
    /* An action that already became a test or a fix is accounted for by that
       record — converting it again would make a second one saying the same. */
    if (!i.becameTestId) {
      const parent = tests.find(t => t.id === i.testId);
      const fix: Test = {
        id: `${i.id}-fix`,
        projectId,
        kind: 'fix',
        title: i.what,
        assetId: parent?.assetId,
        /* Whose it was, and the day it was wanted — an action's two facts. */
        withWhom: i.owner,
        plannedFor: i.due,
        /* What it came out of, so the chain still reads: the observation that
           prompted it, or the note somebody left on the line. */
        passesIf: i.note,
        fromTestId: i.testId,
        outcome: i.doneAt ? 'passed' : 'planned',
        ranOn: i.doneAt ? new Date(i.doneAt).toISOString().slice(0, 10) : undefined,
        sort: topSort + 1 + made,
        createdAt: i.createdAt,
        updatedAt: at,
      };
      await db.put('tests', fix);
      /* The observation it came from points at the fix now, not at a line. */
      if (i.fromItemId) {
        const obs = await db.get('test_items', i.fromItemId);
        if (obs && !obs.deletedAt) {
          await db.put('test_items', { ...obs, becameItemId: undefined, becameTestId: fix.id, updatedAt: at });
        }
      }
      made++;
    }
    /* The line goes: soft-deleted, so the deletion travels to every device
       rather than the row reappearing on the next pull. */
    await db.put('test_items', { ...i, deletedAt: at, updatedAt: at });
  }

  signalWrite();
  return made;
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
