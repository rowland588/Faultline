/* What the machine can run. One store, keyed by project — see lib/programs.ts
 * for why a program is three states and a date rather than a status field. */
import type { ID } from '../types';
import type { Test, TestItem } from '../lib/testing';
import { programAfterFloor, programAfterTest, programAfterTestGone, type Program, type ProvingTest } from '../lib/programs';
import { floorFailure, partsOfProgram } from '../lib/programsReport';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

export async function listPrograms(projectId: string): Promise<Program[]> {
  const all = await (await getDB()).getAllFromIndex('programs', 'by_project', projectId);
  return all.filter(p => !p.deletedAt);
}

/** Every program on the device, on every line and job — the control room's
 *  Programs and a line's page read them (lib/lineRecords). */
export async function listAllPrograms(): Promise<Program[]> {
  return (await (await getDB()).getAll('programs')).filter(p => !p.deletedAt);
}

export async function putProgram(p: Program): Promise<void> {
  await (await getDB()).put('programs', { ...p, updatedAt: now() });
  signalWrite();
}

/** Several at once — a pasted list is a dozen rows, and one write each would
 *  fire the sync debounce a dozen times over. */
export async function putPrograms(rows: Program[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDB();
  const tx = db.transaction('programs', 'readwrite');
  const t = now();
  for (const p of rows) await tx.store.put({ ...p, updatedAt: t });
  await tx.done;
  signalWrite();
}

export async function deleteProgram(id: ID): Promise<Restore> {
  const db = await getDB();
  const row = await db.get('programs', id);
  await db.delete('programs', id);
  await recordTombstones('programs', [id]);
  signalWrite();
  return async () => { if (row) await restoreRows('programs', [row]); };
}

/** THE PROGRAM A TEST PROVES, brought into line with it (lib/programs
 *  programAfterTest). Called on every local write of a test, so the two
 *  records cannot disagree: a pass writes its day onto the program, a fail —
 *  or a test put back to planned — takes the date off again, and the
 *  program's test date follows the test's. A test about no program costs one
 *  field read. (It replaces applyTestOutcome, which said the same and was
 *  never called: the link was drawn and not joined.) */
export async function followTest(t: ProvingTest | undefined, before?: Pick<ProvingTest, 'outcome' | 'ranOn'>): Promise<void> {
  if (!t?.programId) return;
  const p = await (await getDB()).get('programs', t.programId) as Program | undefined;
  if (!p) return;
  /* A pass older than a failure said on the floor proves nothing (flow
     audit #3): the floor's newest failure is read with the test — and a
     test that said passed already, only written again, is no new proof. */
  const failed = await failedOnFloor(p);
  const fresh = !(before?.outcome === 'passed' && before.ranOn === t.ranOn);
  const after = programAfterTest(p, t, undefined, failed?.on, fresh);
  /* Proved by it now is the newer fact; else a failure newer than its
     proof — a hand proof's too — still takes it back to on the machine. */
  const next = after?.provedOn ? after : programAfterFloor(after ?? p, failed) ?? after;
  if (next) await putProgram(next);
}

/** A TEST DELETED, ITS PROGRAM FORGETS IT (lib/programs programAfterTestGone):
 *  the link, the day it was booked for and a proof that was its pass come
 *  off, and the program follows the test it still has. Returns what puts the
 *  program back as it was, for the delete's Undo. Called by db/testing
 *  deleteTest, after the test is gone. */
export async function forgetTest(t: ProvingTest & { projectId?: string }): Promise<Restore> {
  const db = await getDB();
  const all = await db.getAll('programs') as Program[];
  const p = all.find(x => !x.deletedAt && (x.id === t.programId || x.testId === t.id));
  if (!p) return async () => undefined;
  /* the program's other tests, on any job — a line's own is proved on whichever job tests it */
  const rest = (await db.getAll('tests') as Test[]).filter(x => x.programId === p.id && x.id !== t.id && !x.deletedAt) as unknown as (ProvingTest & { createdAt?: number })[];
  const next = programAfterTestGone(p, t, rest);
  if (!next) return async () => undefined;
  await putProgram(next);
  return async () => { await restoreRows('programs', [p]); };
}

/** The newest failure the floor said of a job's program — on the part of
 *  its name on its machine's programs stage (lib/programsReport
 *  floorFailure). A line's own program has no floor of its own. */
async function failedOnFloor(p: Program): Promise<{ on: string; at: number } | undefined> {
  if (!p.projectId) return undefined;
  const db = await getDB();
  const [tests, items, project] = await Promise.all([
    db.getAllFromIndex('tests', 'by_project', p.projectId),
    db.getAllFromIndex('test_items', 'by_project', p.projectId),
    db.get('projects', p.projectId),
  ]);
  return floorFailure(p, tests, items, project ?? undefined);
}

/** THE PROGRAM A PART IS, brought into line with what the floor said of it
 *  (lib/programs programAfterFloor). Called on every local write of a part:
 *  a failure said after the day it was proved drops the program back to on
 *  the machine, so the line's Programs, the control room and the job read
 *  one answer (flow audit #3); that failure taken off again (`before` had
 *  it, an undo say) hands it back to the test that proved it. A part with
 *  no status said, before or now, costs nothing. */
export async function followPart(i: TestItem | undefined, before?: TestItem): Promise<void> {
  if (!i || i.kind !== 'next' || !i.projectId || !i.testId) return;
  if (!(i.results?.length || before?.results?.length)) return;
  const db = await getDB();
  const stage = await db.get('tests', i.testId) as Test | undefined;
  if (!stage || stage.deletedAt || stage.kind !== 'install' || (stage.gate ?? '') !== 'setup') return;
  const [programs, tests, items, project] = await Promise.all([
    db.getAllFromIndex('programs', 'by_project', i.projectId),
    db.getAllFromIndex('tests', 'by_project', i.projectId),
    db.getAllFromIndex('test_items', 'by_project', i.projectId),
    db.get('projects', i.projectId),
  ]);
  const holder = project ?? undefined;
  const was = before ? items.map(x => (x.id === before.id ? before : x)) : undefined;
  for (const p of programs.filter(x => !x.deletedAt)) {
    if (!partsOfProgram(p, tests, items, holder).some(x => x.id === i.id)) continue;
    const failed = floorFailure(p, tests, items, holder);
    let next = programAfterFloor(p, failed);
    /* The failure that un-proved it taken off: the test that proved it, if
       it still says passed, proves it again. */
    const wasFailed = was ? floorFailure(p, tests, was, holder) : undefined;
    if (!next && !p.provedOn && p.testId && wasFailed && wasFailed.at !== failed?.at) {
      const t = tests.find(x => x.id === p.testId && !x.deletedAt);
      if (t) next = programAfterTest(p, t, undefined, failed?.on);
    }
    if (next) await putProgram(next);
  }
}
