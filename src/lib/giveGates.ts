/* Apply a project's usual gate lists to its machines without changing work already recorded. */
import { deleteTest, getDB, signalWrite } from '../db';
import { now, uid } from './ids';
import { stageKey, usualAgreed, usualHolder, usualStages, whoFor, type ListGate, type StageHolder } from './install';
import { gateOf, type Test } from './testing';

export const EVERY_GATE: readonly ListGate[] = ['install', 'setup', 'commission', 'handover'];
const GATE_WORD: Record<ListGate, string> = { install: 'Install', setup: 'Set up', commission: 'Commission', handover: 'Hand over' };

function atGate(t: Test, assetId: string, gate: ListGate): boolean {
  return !t.deletedAt && t.assetId === assetId && (gate === 'commission'
    ? (t.kind ?? 'test') === 'test' : t.kind === 'install' && gateOf(t) === gate);
}

export function bareAt(tests: readonly Test[], assetId: string, gate: ListGate): boolean {
  return !tests.some(t => atGate(t, assetId, gate));
}

function missingAt(tests: readonly Test[], assetId: string, gate: ListGate, stages: readonly string[]): string[] {
  const existing = new Set(tests.filter(t => atGate(t, assetId, gate)).map(t => stageKey(t.title)));
  /* A gate that uses a wholly custom list keeps that choice. A partially applied
     usual list can be finished without touching a custom row or a recorded result. */
  if (existing.size && !stages.some(title => existing.has(stageKey(title)))) return [];
  const missing: string[] = [];
  for (const title of stages) {
    const key = stageKey(title);
    if (key && !existing.has(key)) { missing.push(title.trim()); existing.add(key); }
  }
  return missing;
}

export function everyGateOffer<P extends StageHolder>(project: P | undefined, projects: readonly P[], tests: readonly Test[], assetIds: readonly string[]) {
  let partial = false;
  const gates = EVERY_GATE.map(gate => {
    const stages = usualStages(project, projects, gate).stages;
    let n = 0;
    const machines = assetIds.filter(id => {
      const missing = missingAt(tests, id, gate, stages);
      if (missing.length && !bareAt(tests, id, gate)) partial = true;
      n += missing.length;
      return missing.length > 0;
    });
    return { gate, word: GATE_WORD[gate], n, machines };
  }).filter(g => g.n > 0);
  /* One untouched gate has its own button. Keep a way to repair an older partial list. */
  if (gates.length < 2 && !partial) return { gates: [], says: '' };
  return { gates, says: gates.map(g => `${g.word} ${g.n}`).join(' · ') };
}

/** Read live machines and their current tests inside the same IndexedDB transaction
 * as the additions. Overlapping tabs serialize, and a device interruption commits
 * the entire selection or none of it. Only newly inserted ids belong to Undo. */
export async function giveEveryGate<P extends StageHolder>(project: P, projects: readonly P[], assetIds: readonly string[]): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(['tests', 'commission_assets'], 'readwrite');
  const store = tx.objectStore('tests');
  const made: string[] = [];
  try {
    const [tests, assets] = await Promise.all([
      store.index('by_project').getAll(project.id),
      tx.objectStore('commission_assets').index('by_project').getAll(project.id),
    ]);
    const wanted = new Set(assetIds);
    const machines = assets.filter(asset => !asset.deletedAt && wanted.has(asset.id));
    const time = now();
    let sort = tests.reduce((max, t) => Math.max(max, t.sort), 0) + 1;
    for (const gate of EVERY_GATE) {
      const stages = usualStages(project, projects, gate).stages;
      const holder = usualHolder(project, projects, gate) ?? project;
      for (const asset of machines) {
        for (const title of missingAt(tests, asset.id, gate, stages)) {
          const agreed = gate === 'commission' ? usualAgreed(holder, title) : undefined;
          const test: Test = {
            id: uid(), projectId: project.id, assetId: asset.id, title,
            kind: gate === 'commission' ? 'test' : 'install',
            ...(gate === 'setup' || gate === 'handover' ? { gate } : {}),
            withWhom: whoFor(holder, gate, title, asset.oem),
            ...(agreed?.passesIf?.trim() ? { passesIf: agreed.passesIf.trim() } : {}),
            ...(agreed?.runAgreed ? { runAgreed: agreed.runAgreed } : {}),
            outcome: 'planned', sort: sort++, createdAt: time, updatedAt: time,
          };
          await store.add(test);
          made.push(test.id);
        }
      }
    }
    await tx.done;
  } catch (error) {
    try { tx.abort(); } catch { /* a failed request already aborted the transaction */ }
    await tx.done.catch(() => {});
    throw error;
  }
  if (made.length) signalWrite();
  return made;
}

export async function takeBack(ids: readonly string[], projectId: string): Promise<void> {
  for (const id of ids) await deleteTest(id, projectId);
}
