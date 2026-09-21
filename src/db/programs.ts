/* What the machine can run. One store, keyed by project — see lib/programs.ts
 * for why a program is three states and a date rather than a status field. */
import type { ID } from '../types';
import type { Program } from '../lib/programs';
import { now } from '../lib/ids';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

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

export async function deleteProgram(id: ID): Promise<void> {
  await (await getDB()).delete('programs', id);
  await recordTombstones('programs', [id]);
  signalWrite();
}

/** Every program a test proved, brought back into line with it.
 *
 *  Called when a test's outcome changes, so the two records can never disagree:
 *  a pass writes its day onto the programs it proved, and a fail — or a test
 *  put back to planned — takes the date off again and drops them to on the
 *  machine. The program keeps pointing at the test either way; that is how the
 *  screen can still offer "why" on something that went backwards. */
export async function applyTestOutcome(
  projectId: string, testId: ID, passed: boolean, ranOn?: string,
): Promise<void> {
  const mine = (await listPrograms(projectId)).filter(p => p.testId === testId);
  if (!mine.length) return;
  await putPrograms(mine.map(p => (passed
    ? { ...p, state: 'proved' as const, provedOn: ranOn ?? p.provedOn ?? p.testOn, testOn: undefined }
    : { ...p, state: 'onMachine' as const, provedOn: undefined })));
}
