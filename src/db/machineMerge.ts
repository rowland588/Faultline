/* ONE RECORD OF A MACHINE, ON THIS DEVICE (lib/machineMerge). Run when the app
 * starts and after a sync brings rows in: a second record of a machine its
 * line already holds — made by Install beside the line's own, or by two
 * devices before they synced — is put away into the one kept, and everything
 * that named it names the kept one; and every study naming a machine its line
 * holds points at that record (slice 2). Writes only when there is something
 * to do, so it settles: run twice, the second run writes nothing. */
import { planOneRecord, mergedIds, movedScope, studiesToPoint, type MergePlan } from '../lib/machineMerge';
import { listAllAssets, putAsset, putTest, putTestItem } from './testing';
import { listAllPrograms, putProgram } from './programs';
import { listAllStudies, patchStudy, putStudy } from './studies';
import { allPaceLines } from './pace';
import { getDB } from './core';
import { now } from '../lib/ids';

let running: Promise<MergePlan> | null = null;

export function oneRecordPerMachine(): Promise<MergePlan> {
  running ??= (async () => {
    const jobLines = await allPaceLines();
    const plan = planOneRecord(await listAllAssets(), jobLines);
    if (plan.merges.length || plan.lined.length) await merge(plan);
    /* every study naming a machine its line holds points at that record (slice 2) */
    for (const p of studiesToPoint(await listAllStudies(), await listAllAssets(), jobLines)) await patchStudy(p.id, { assetId: p.assetId });
    return plan;
  })().finally(() => { running = null; });
  return running;
}

async function merge(plan: MergePlan): Promise<void> {
  const t = now();
  for (const a of plan.lined) await putAsset(a);
  for (const m of plan.merges) {
    if (m.changed) await putAsset(m.keep);
    for (const o of m.into) await putAsset({ ...o, mergedInto: m.keep.id, deletedAt: t });
  }
  const moved = mergedIds(plan);
  if (!moved.size) return;
  const db = await getDB();
  for (const x of await db.getAll('tests')) if (x.assetId && moved.has(x.assetId)) await putTest({ ...x, assetId: moved.get(x.assetId) });
  for (const x of await db.getAll('test_items')) {
    const to = x.testId ? movedScope(x.testId, moved) : undefined;
    if (to) await putTestItem({ ...x, testId: to });
  }
  for (const x of await listAllPrograms()) if (x.assetId && moved.has(x.assetId)) await putProgram({ ...x, assetId: moved.get(x.assetId) });
  for (const x of await listAllStudies()) if (x.assetId && moved.has(x.assetId)) await putStudy({ ...x, assetId: moved.get(x.assetId) });
}
