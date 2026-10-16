/* EVERY GATE'S USUAL LIST, IN ONE TAP.
 *
 * The stage-gate walk (16 October): a job started with two machines took 16
 * taps, and half of them were one chore four times over — Install, Set up,
 * Commission and Hand over each said "give them all the N" on its own page.
 * The four lists are the same job's lists (lib/install usualStages); giving
 * them is one decision. This gives a set of machines every gate's usual list
 * they have none of yet, each line starting with who it is usually with and,
 * for a test, what it must show — exactly what each gate's own button gives
 * (ui/InstallGrid add, ui/CommissionGrid add). One write, one Undo.
 *
 * Pure reading below the line of `giveEveryGate`; the writes go through the
 * job's own testing state. */
import { deleteTest } from '../db';
import { usualAgreed, usualHolder, usualStages, whoFor, type ListGate } from './install';
import { gateOf, live, type Asset, type StepGate, type Test } from './testing';
import type { StageHolder } from './install';
import type { useTesting } from './useTesting';

type TT = ReturnType<typeof useTesting>;
export const EVERY_GATE: readonly ListGate[] = ['install', 'setup', 'commission', 'handover'];
const GATE_WORD: Record<ListGate, string> = { install: 'Install', setup: 'Set up', commission: 'Commission', handover: 'Hand over' };

/** Has this machine none of this gate's lines yet? */
export function bareAt(tests: readonly Test[], assetId: string, gate: ListGate): boolean {
  return !live(tests as Test[]).some(t => t.assetId === assetId
    && (gate === 'commission' ? t.kind === 'test' : t.kind === 'install' && gateOf(t) === gate));
}

/** What one tap would give: each gate where these machines have none of its
 *  list, with how many lines a machine. Empty when no machine is bare at two
 *  gates or more — one gate's own button says that already. */
export function everyGateOffer<P extends StageHolder>(project: P | undefined, projects: readonly P[], tests: readonly Test[], assetIds: readonly string[]):
  { gates: { gate: ListGate; word: string; n: number; machines: string[] }[]; says: string } {
  const gates = EVERY_GATE.map(gate => ({
    gate, word: GATE_WORD[gate], n: usualStages(project, projects, gate).stages.length,
    machines: assetIds.filter(id => bareAt(tests, id, gate)),
  })).filter(g => g.n > 0 && g.machines.length > 0);
  const many = gates.length >= 2;
  return { gates: many ? gates : [], says: many ? gates.map(g => `${g.word} ${g.n}`).join(' · ') : '' };
}

/** Give them, every gate at once; returns the lines made (for an Undo). */
export async function giveEveryGate<P extends StageHolder & { id: string }>(tt: TT, project: P, projects: readonly P[], assets: readonly Asset[], assetIds: readonly string[]): Promise<string[]> {
  const offer = everyGateOffer(project, projects, tt.tests, assetIds);
  const made: string[] = [];
  for (const g of offer.gates) {
    const stages = usualStages(project, projects, g.gate).stages;
    const holder = usualHolder(project, projects, g.gate) ?? project;
    for (const id of g.machines) {
      const oem = assets.find(a => a.id === id)?.oem;
      if (g.gate === 'commission') {
        made.push(...await tt.planTests(stages.map(title => {
          const agreed = usualAgreed(holder, title);
          return { title, assetId: id, extra: {
            withWhom: whoFor(holder, 'commission', title, oem),
            ...(agreed?.passesIf?.trim() ? { passesIf: agreed.passesIf.trim() } : {}),
            ...(agreed?.runAgreed ? { runAgreed: agreed.runAgreed } : {}),
          } };
        })));
      } else {
        made.push(...await tt.planSteps(stages, id, g.gate as StepGate, title => whoFor(holder, g.gate, title, oem)));
      }
    }
  }
  return made;
}

/** Take them back. */
export async function takeBack(ids: readonly string[], projectId: string): Promise<void> {
  for (const id of ids) await deleteTest(id, projectId);
}
