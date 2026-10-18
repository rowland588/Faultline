/* THE SAME JOB, READ BOTH WAYS — the new runtime against the stage gate's own
 * reading (lib/install journeyOf), the first serious proof of the engine
 * (docs/PLATFORM-STATUS.md, "Parity").
 *
 * A stage-gate job is read as a definition (lib/flow/templates
 * definitionFromJob) and its steps and tests as flow records
 * (recordsFromStageGate); then, for every machine at every gate, the runtime
 * must say what journeyOf says. Hundreds of random jobs, not one example, so
 * a rule that differs anywhere shows.
 *
 * WHAT IS LEFT OUT, ON PURPOSE — the stage gate's rules that are not a step's
 * own record, each written down as a difference to keep, not a bug:
 *   - Set up counts a machine's PROGRAMS (lib/programs) as well as its steps;
 *     a definition has no programs, so these jobs have none.
 *   - Install reads a machine marked installed with no steps as done.
 *   - A stage is late when its problems LOST HOURS or MOVED ITS FINISH
 *     (lib/hoursLost, movedLater) — kept in the items under a step, which a
 *     flow record does not carry yet.
 *   - A step on one machine and not another: the stage gate lets each machine
 *     have its own list; a definition gives every machine the same steps. */
import { describe, it, expect } from 'vitest';
import { journeyOf } from '../../install';
import type { Asset, Test } from '../../testing';
import { definitionFromJob, recordsFromStageGate, stageGateDefinition } from '../templates';
import { machineStageTone, readFlow } from '../runtime';
import { validateDefinition } from '../validate';

const TODAY = '2026-10-20';
const GATES = ['install', 'setup', 'commission', 'handover'] as const;

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const day = (offset: number) => { const d = new Date(`${TODAY}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

let n = 0;
const asset = (name: string): Asset => ({ id: `a${++n}`, projectId: 'p', name, state: 'onSite', onSiteOn: day(-20), sort: n, updatedAt: 1 } as Asset);

/** A random stage-gate job: every machine with the same steps at every gate,
 *  each step somewhere on its way, and some tests tried more than once. */
function randomJob(): { assets: Asset[]; tests: Test[] } {
  const assets = [asset('Tray sealer'), asset('Case packer')];
  const lists: Record<(typeof GATES)[number], string[]> = {
    install: ['Positioned', 'Air and power', 'Dry run'],
    setup: ['Recipes set', 'Guards on'],
    commission: ['Runs at speed', 'Rejects proven'],
    handover: ['Manuals', 'Signed off'],
  };
  const tests: Test[] = [];
  for (const a of assets) {
    for (const g of GATES) {
      lists[g].forEach((title, i) => {
        const outcome = pick(['planned', 'planned', 'passed', 'passed', 'failed', 'notRun'] as const);
        const plannedFor = rnd() < 0.85 ? day(Math.floor(rnd() * 30) - 15) : undefined;
        const ran = outcome !== 'planned' || rnd() < 0.2;
        const base: Test = {
          id: `t${++n}`, projectId: 'p', title, assetId: a.id, outcome, sort: i, createdAt: n, updatedAt: n,
          kind: g === 'commission' ? 'test' : 'install',
          ...(g === 'setup' || g === 'handover' ? { gate: g } : {}),
          ...(plannedFor ? { plannedFor } : {}),
          ...(ran ? { ranOn: plannedFor ?? day(-1) } : {}),
          ...(rnd() < 0.3 ? { result: 'what happened' } : {}),
        };
        tests.push(base);
        /* a re-test of a test that did not pass */
        if (g === 'commission' && outcome === 'failed' && rnd() < 0.6) {
          tests.push({ ...base, id: `t${++n}`, fromTestId: base.id, outcome: pick(['planned', 'passed', 'failed'] as const), ranOn: undefined, result: undefined, plannedFor: day(Math.floor(rnd() * 10) - 3), createdAt: n, updatedAt: n });
        }
      });
    }
  }
  return { assets, tests };
}

describe('the runtime reads a stage-gate job as the stage gate does', () => {
  it('says the same of every machine at every gate, on 300 random jobs', () => {
    let compared = 0;
    for (let k = 0; k < 300; k++) {
      const { assets, tests } = randomJob();
      const def = definitionFromJob(tests);
      expect(validateDefinition(def).ok).toBe(true);
      const state = readFlow({ def, records: recordsFromStageGate(def, tests), machines: assets.map(a => ({ id: a.id, name: a.name })), today: TODAY });
      for (const a of assets) {
        const native = journeyOf(a, tests, [], TODAY);
        GATES.forEach((g, i) => {
          const mine = machineStageTone(state.stages[i], a.id);
          const theirs = native[i].tone;
          if (mine !== theirs) {
            const detail = tests.filter(t => t.assetId === a.id && (g === 'commission' ? (t.kind ?? 'test') === 'test' : t.kind === 'install' && (t.gate ?? 'install') === g))
              .map(t => `${t.title}:${t.outcome}:${t.plannedFor ?? '-'}:${t.ranOn ?? '-'}${t.fromTestId ? ':retest' : ''}`);
            throw new Error(`job ${k}, ${a.name}, ${g}: stage gate says ${theirs}, runtime says ${mine} — ${detail.join(' | ')}`);
          }
          compared++;
        });
      }
    }
    expect(compared).toBe(300 * 2 * 4);
  });

  it('counts the same steps done', () => {
    for (let k = 0; k < 50; k++) {
      const { assets, tests } = randomJob();
      const def = definitionFromJob(tests);
      const state = readFlow({ def, records: recordsFromStageGate(def, tests), machines: assets.map(a => ({ id: a.id, name: a.name })), today: TODAY });
      const install = state.stages[0];
      const nativeDone = tests.filter(t => t.kind === 'install' && !t.gate && t.outcome === 'passed').length;
      expect(install.done).toBe(nativeDone);
    }
  });
});

describe('a job\'s usual lists as a method', () => {
  it('turns the app\'s four lists into a definition the app can run', () => {
    const def = stageGateDefinition(undefined, [], 'Stage gate');
    const c = validateDefinition(def);
    expect(c.errors).toEqual([]);
    expect(def.stages.map(s => s.name)).toEqual(['Install', 'Set up', 'Commission', 'Hand over']);
    expect(def.stages[3].steps.find(s => /PUWER/.test(s.title))?.answer).toBe('signoff');
    expect(def.stages[2].steps.find(s => /Performance run/.test(s.title))?.answer).toBe('measure');
    expect(def.stages[0].steps.find(s => s.title === 'Air and power connected')?.role).toBe('site');
  });

  it('keeps what a job agreed a test must show', () => {
    const job = {
      id: 'j', updatedAt: 1,
      gateStages: {
        commission: ['Performance run at the agreed rate', 'Packs to spec'],
        usualAgreed: { 'commission:performance run at the agreed rate': { runAgreed: { rate: 60, minutes: 120, rejectsMax: 30 } }, 'commission:packs to spec': { passesIf: 'Seal, weight and code all right on 50 packs' } },
      },
    };
    const def = stageGateDefinition(job, [job]);
    const run = def.stages[2].steps[0];
    expect(run.fields?.map(f => [f.key, f.min ?? f.max])).toEqual([['rate', 60], ['minutes', 120], ['rejects', 30]]);
    expect(def.stages[2].steps[1]).toMatchObject({ answer: 'check', passesIf: 'Seal, weight and code all right on 50 packs' });
  });
});
