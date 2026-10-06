/* What the machine can run. One store, keyed by project — see lib/programs.ts
 * for why a program is three states and a date rather than a status field. */
import type { ID } from '../types';
import { programAfterTest, type Program, type ProvingTest } from '../lib/programs';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones, restoreRows, type Restore } from './sync';

export async function listPrograms(projectId: string): Promise<Program[]> {
  const all = await (await getDB()).getAllFromIndex('programs', 'by_project', projectId);
  return all.filter(p => !p.deletedAt);
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
export async function followTest(t: ProvingTest | undefined): Promise<void> {
  if (!t?.programId) return;
  const p = await (await getDB()).get('programs', t.programId) as Program | undefined;
  const next = p && programAfterTest(p, t);
  if (next) await putProgram(next);
}
