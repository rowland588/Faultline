/* METHODS TO START FROM — the stage gate's own lists read as a definition,
 * and a stage-gate job's records read as a method's (docs/PLATFORM-STATUS.md).
 *
 * The stage gate already keeps part of its method as data: each job's list
 * for every gate, who each line is usually with, how it is answered and what
 * a test must show (lib/install usualStages, usualWith, answerOf,
 * usualAgreed), handed from job to job. stageGateDefinition turns exactly
 * that into a definition, so the first method anybody runs on the new engine
 * is the one they already know — and nothing they wrote is typed twice.
 *
 * recordsFromStageGate reads a stage-gate job's steps and tests as flow
 * records. It is how the new runtime is checked against the old reading
 * (lib/flow/__tests__/parity): the same job, read both ways, must say the
 * same thing about every machine at every gate. */
import type { Project } from '../../types';
import {
  appStages, answerByName, chosenAnswer, usualAgreed, usualStages, usualWith, type ListGate, type StageHolder,
} from '../install';
import { gateOf, type Test } from '../testing';
import { FLOW_SCHEMA, keyOf, type FlowAnswer, type FlowDefinition, type FlowField, type FlowStage, type FlowStepDef } from './definition';
import type { FlowOutcome, FlowRecord } from './records';

const GATES: { gate: ListGate; key: string; name: string; purpose: string }[] = [
  { gate: 'install', key: 'install', name: 'Install', purpose: 'Each machine positioned, connected and dry-run.' },
  { gate: 'setup', key: 'setup', name: 'Set up', purpose: 'Each machine made ready to run what it will run — programs, recipes, change parts, guards.' },
  { gate: 'commission', key: 'commission', name: 'Commission', purpose: 'Each machine proved against what was agreed.' },
  { gate: 'handover', key: 'handover', name: 'Hand over', purpose: 'What the site takes with each machine, signed for.' },
];

/** The run's three numbers as fields, judged as the stage gate judges a run
 *  (lib/run): the rate, how long, the most rejects. */
function runFields(agreed?: { rate?: number; minutes?: number; rejectsMax?: number }): FlowField[] {
  return [
    { key: 'rate', label: 'Rate', type: 'reading', unit: 'packs/min', ...(agreed?.rate !== undefined ? { min: agreed.rate } : {}), required: true },
    { key: 'minutes', label: 'Minutes run', type: 'reading', unit: 'min', ...(agreed?.minutes !== undefined ? { min: agreed.minutes } : {}), required: true },
    { key: 'rejects', label: 'Rejects', type: 'reading', unit: 'packs', ...(agreed?.rejectsMax !== undefined ? { max: agreed.rejectsMax } : {}) },
  ];
}

/** A stage-gate method from a job's usual lists — the job's own, else the
 *  one edited most recently, else the app's. */
export function stageGateDefinition<P extends StageHolder>(project?: P, all: readonly P[] = [], name = 'Stage gate'): FlowDefinition {
  const stages: FlowStage[] = GATES.map(g => {
    const { stages: titles } = usualStages(project, all, g.gate);
    const holder = usualStages(project, all, g.gate).from === 'other'
      ? all.find(p => p.id === usualStages(project, all, g.gate).otherId) ?? project : project;
    const taken = new Set<string>();
    const steps: FlowStepDef[] = titles.map(title => {
      const key = keyOf(title, taken); taken.add(key);
      const t = { kind: g.gate === 'commission' ? 'test' as const : 'install' as const, gate: g.gate === 'commission' || g.gate === 'install' ? undefined : g.gate, title };
      const said = chosenAnswer(holder, t as Pick<Test, 'kind' | 'gate' | 'title'>) ?? answerByName(t as Pick<Test, 'kind' | 'gate' | 'title'>);
      const agreed = g.gate === 'commission' ? usualAgreed(holder, title) : undefined;
      const answer: FlowAnswer = said === 'run' ? 'measure' : g.gate === 'commission' ? 'check'
        : said === 'paperwork' ? 'paperwork' : said === 'signoff' ? 'signoff' : 'done';
      return {
        key, title, per: 'machine', answer,
        role: usualWith(holder, g.gate, title) === 'site' ? 'site' : 'supplier',
        ...(agreed?.passesIf ? { passesIf: agreed.passesIf } : {}),
        ...(answer === 'measure' ? { fields: runFields(agreed?.runAgreed) } : {}),
        ...(said === 'programs' ? { help: 'The machine’s programs loaded — each one’s status is kept on Programs.' } : {}),
      };
    });
    return {
      key: g.key, name: g.name, purpose: g.purpose, steps,
      gate: {
        conditions: [
          { id: 'all-done', type: 'stepsDone', policy: 'block' as const },
          ...(g.gate === 'handover' ? [{ id: 'no-critical', type: 'noOpenProblems' as const, priority: 'critical' as const, policy: 'warn' as const }] : []),
        ],
      },
    };
  });
  return {
    schema: FLOW_SCHEMA,
    name,
    purpose: 'New equipment taken through its gates — installed, set up, proved against what was agreed and handed over.',
    kind: 'stagegate',
    roles: [
      { key: 'supplier', name: 'The machine’s supplier', side: 'supplier' },
      { key: 'site', name: 'The site', side: 'site' },
    ],
    stages,
  };
}

/** The app's own four lists, with no job to read — for a first method. */
export const appStageGate = (): FlowDefinition => stageGateDefinition(undefined, [], 'Stage gate');

/* ------------------------------ a job read as records ---------------------- */

const OUTCOME: Record<Test['outcome'], FlowOutcome> = { planned: 'planned', passed: 'done', failed: 'failed', notRun: 'notRun' };

/** A definition built from a job's own steps and tests — every title kept at
 *  each gate, in order — so the job reads the same both ways. */
export function definitionFromJob(tests: readonly Test[]): FlowDefinition {
  const liveTests = tests.filter(t => !t.deletedAt);
  const roots = rootTitles(liveTests);
  const stages: FlowStage[] = GATES.map(g => {
    const titles: string[] = [];
    const mine = liveTests.filter(t => g.gate === 'commission' ? (t.kind ?? 'test') === 'test' : t.kind === 'install' && gateOf(t) === g.gate)
      .sort((a, b) => a.sort - b.sort);
    for (const t of mine) {
      const title = g.gate === 'commission' ? roots.get(t.id) ?? t.title : t.title;
      if (!titles.includes(title)) titles.push(title);
    }
    const taken = new Set<string>();
    return {
      key: g.key, name: g.name, purpose: g.purpose,
      steps: titles.map(title => { const key = keyOf(title, taken); taken.add(key); return { key, title, per: 'machine' as const, answer: g.gate === 'commission' ? 'check' as const : 'done' as const }; }),
      gate: { conditions: [{ id: 'all-done', type: 'stepsDone' as const, policy: 'block' as const }] },
    };
  });
  return { schema: FLOW_SCHEMA, name: 'Stage gate (read from the job)', purpose: 'A stage-gate job read as a method.', kind: 'stagegate', roles: [], stages };
}

/** A re-test is an attempt of the test it follows on from: its title is the
 *  first test's. */
function rootTitles(tests: readonly Test[]): Map<string, string> {
  const byId = new Map(tests.map(t => [t.id, t]));
  const out = new Map<string, string>();
  for (const t of tests) {
    let cur: Test = t;
    for (let guard = 0; guard < 100; guard++) {
      const up = cur.fromTestId ? byId.get(cur.fromTestId) : undefined;
      if (!up) break;
      cur = up;
    }
    out.set(t.id, cur.title);
  }
  return out;
}

/** A stage-gate job's steps and tests as flow records, keyed to `def`. */
export function recordsFromStageGate(def: FlowDefinition, tests: readonly Test[]): FlowRecord[] {
  const liveTests = tests.filter(t => !t.deletedAt);
  const roots = rootTitles(liveTests);
  const out: FlowRecord[] = [];
  for (const t of liveTests) {
    const face = t.kind ?? 'test';
    if (face === 'fix') continue;
    const stageKey = face === 'test' ? 'commission' : gateOf(t);
    const stage = def.stages.find(s => s.key === stageKey);
    const title = face === 'test' ? roots.get(t.id) ?? t.title : t.title;
    const step = stage?.steps.find(s => s.title === title);
    if (!stage || !step) continue;
    out.push({
      id: t.id, projectId: t.projectId, kind: 'step', stageKey, stepKey: step.key,
      ...(t.assetId ? { assetId: t.assetId } : {}),
      version: 1,
      outcome: OUTCOME[t.outcome],
      ...((t.plannedTo ?? t.plannedFor) ? { plannedFor: t.plannedTo ?? t.plannedFor } : {}),
      ...((t.ranTo ?? t.ranOn) ? { doneOn: t.ranTo ?? t.ranOn } : {}),
      ...(t.withWhom ? { who: t.withWhom } : {}),
      ...(t.result ? { note: t.result } : {}),
      ...(t.media?.length ? { media: t.media } : {}),
      ...(t.docs?.length ? { docs: t.docs } : {}),
      sort: t.sort, createdAt: t.createdAt, updatedAt: t.updatedAt,
    });
  }
  return out;
}

/** What a project's start day is, read from the job: its planned start, else
 *  the day it was made. */
export const startOf = (p: Pick<Project, 'plannedAt' | 'createdAt'>): string =>
  p.plannedAt ?? new Date(p.createdAt).toISOString().slice(0, 10);

export { appStages };
