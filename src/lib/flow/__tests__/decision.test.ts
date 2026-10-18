/* DECISIONS ON WHAT IS FOUND (FlowStepDef.onlyIf; lib/flow/runtime): a step
 * needed only when an earlier figure says so — waiting on that step until it
 * is done, then needed or not, said why, and a step decided against counted
 * in nothing it would have held up. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import { readFlow, ruleHolds } from '../runtime';
import { validateDefinition } from '../validate';
import { stepSquare, stepWhy, stepWord } from '../view';
import type { FlowRecord } from '../records';

const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Rejects checked', purpose: 'Rejects counted; looked into only when there are too many.', kind: 'improvement',
  roles: [{ key: 'lead', name: 'Line lead' }],
  stages: [
    {
      key: 'check', name: 'Check', steps: [{
        key: 'count', title: 'Count the rejects', per: 'line', answer: 'form',
        fields: [{ key: 'rejects', label: 'Rejects', type: 'number', unit: 'packs' }, { key: 'shift', label: 'Shift', type: 'choice', options: ['Days', 'Nights'] }],
      }],
      gate: { conditions: [{ id: 'g1', type: 'stepsDone', policy: 'block' }] },
    },
    {
      key: 'act', name: 'Act', steps: [
        { key: 'why', title: 'Find why', per: 'line', answer: 'form', role: 'lead', fields: [{ key: 'cause', label: 'The cause', type: 'text' }], onlyIf: { step: 'count', field: 'rejects', op: '>', value: 5 } },
        { key: 'fix', title: 'Fix it', per: 'line', answer: 'done', after: ['why'], onlyIf: { step: 'why', field: 'cause', op: '!=', value: 'none' } },
        { key: 'nights', title: 'Brief the night shift', per: 'line', answer: 'done', onlyIf: { step: 'count', field: 'shift', op: '=', value: 'Nights' } },
        { key: 'file', title: 'File the count', per: 'line', answer: 'done', after: ['why'] },
      ],
      gate: { conditions: [{ id: 'g2', type: 'stepsDone', policy: 'block' }] },
    },
  ],
};

let n = 0;
const rec = (stageKey: string, stepKey: string, o: Partial<FlowRecord> = {}): FlowRecord => ({
  id: `r${++n}`, projectId: 'p', kind: 'step', stageKey, stepKey, outcome: 'done', doneOn: '2026-10-18', createdAt: n, updatedAt: n, ...o,
} as FlowRecord);
const read = (records: FlowRecord[]) => readFlow({ def, records, machines: [], today: '2026-10-18', startedOn: '2026-10-01' });
const step = (s: ReturnType<typeof read>, key: string) => s.stages.flatMap(x => x.steps).find(x => x.def.key === key);

describe('a step decided on what is found', () => {
  it('waits, said why, until the step it reads is done', () => {
    const s = read([]);
    const why = step(s, 'why');
    expect(why?.decision).toEqual({ says: 'Needed only when rejects above 5 packs — decided when “Count the rejects” is done' });
    expect(why?.blockedBy).toEqual(['Count the rejects']);
    expect(why && stepWhy(why)).toBe('Needed only when rejects above 5 packs — decided when “Count the rejects” is done');
    expect(why?.complete).toBe(false);
  });

  it('needed when the figure meets it — said with the figure', () => {
    const s = read([rec('check', 'count', { values: { rejects: 8, shift: 'Days' } })]);
    const why = step(s, 'why');
    expect(why?.decision).toEqual({ needed: true, says: 'Needed — Rejects 8 packs, above 5 packs' });
    expect(why?.notNeeded).toBeUndefined();
    expect(why?.blockedBy).toEqual([]);
    expect(why && stepWhy(why)).toBe('Needed — Rejects 8 packs, above 5 packs');
    expect(s.outstanding.map(o => o.stepKey)).toContain('why');
  });

  it('not needed when it does not — settled, grey, and holding nothing up', () => {
    const s = read([rec('check', 'count', { values: { rejects: 3, shift: 'Days' } }), rec('act', 'file')]);
    const why = step(s, 'why'), fix = step(s, 'fix'), nights = step(s, 'nights'), file = step(s, 'file');
    expect(why).toMatchObject({ notNeeded: true, complete: true, tone: 'done', missing: [] });
    expect(why && [stepWord(why), stepSquare(why), stepWhy(why)]).toEqual(['Not needed', 'n', 'Not needed — Rejects 3 packs; it is needed only when rejects above 5 packs']);
    /* a step decided by a step not needed is not needed either */
    expect(fix && stepWhy(fix)).toBe('Not needed — “Find why” was not needed');
    /* words: the same or not */
    expect(nights?.notNeeded).toBe(true);
    /* waiting on a step not needed is waiting on nothing */
    expect(file?.blockedBy).toEqual([]);
    const act = s.stages[1];
    expect([act.done, act.total]).toEqual([1, 1]);
    expect(act.gate.conditions[0]).toMatchObject({ met: true, why: '1 of 1 done (3 not needed)' });
    expect(s.counts.steps).toBe(2);
    expect(s.outstanding.some(o => ['why', 'fix', 'nights'].includes(o.stepKey ?? ''))).toBe(false);
  });

  it('a stage whose every step is decided against can pass', () => {
    const lone: FlowDefinition = { ...def, stages: [def.stages[0], { ...def.stages[1], steps: [def.stages[1].steps[0]] }] };
    const s = readFlow({ def: lone, records: [rec('check', 'count', { values: { rejects: 0 } }), { ...rec('check', ''), kind: 'gate', stepKey: undefined } as FlowRecord], machines: [], today: '2026-10-18' });
    expect(s.stages[1].gate.conditions[0]).toMatchObject({ met: true, why: 'none needed (1 not needed)' });
    expect(s.stages[1].gate.canPass).toBe(true);
  });

  it('per machine, each machine decided by its own figure', () => {
    const perMachine: FlowDefinition = {
      ...def,
      stages: [
        { ...def.stages[0], steps: [{ ...def.stages[0].steps[0], per: 'machine' }] },
        { ...def.stages[1], steps: [{ ...def.stages[1].steps[0], per: 'machine' }] },
      ],
    };
    const machines = [{ id: 'm1', name: 'Filler' }, { id: 'm2', name: 'Sealer' }];
    const s = readFlow({ def: perMachine, records: [rec('check', 'count', { assetId: 'm1', values: { rejects: 9 } }), rec('check', 'count', { assetId: 'm2', values: { rejects: 1 } })], machines, today: '2026-10-18' });
    const whys = s.stages[1].steps;
    expect(whys.map(w => [w.machine, w.decision?.needed])).toEqual([['Filler', true], ['Sealer', false]]);
  });

  it('a figure meets a rule by size, words the same or not, yes and no as words', () => {
    expect(ruleHolds({ step: 'a', field: 'b', op: '>=', value: 5 }, 5)).toBe(true);
    expect(ruleHolds({ step: 'a', field: 'b', op: '<', value: 5 }, '4')).toBe(true);
    expect(ruleHolds({ step: 'a', field: 'b', op: '>', value: 5 }, undefined)).toBe(false);
    expect(ruleHolds({ step: 'a', field: 'b', op: '=', value: 'Nights' }, ' nights ')).toBe(true);
    expect(ruleHolds({ step: 'a', field: 'b', op: '=', value: 'Yes' }, true)).toBe(true);
    expect(ruleHolds({ step: 'a', field: 'b', op: '!=', value: false }, true)).toBe(true);
    expect(ruleHolds({ step: 'a', field: 'b', op: '>', value: 'x' }, 'y')).toBe(false);
  });
});

describe('the validator keeps a decision honest', () => {
  const withRule = (onlyIf: unknown, at = 1) => {
    const d = structuredClone(def) as unknown as { stages: { steps: Record<string, unknown>[] }[] };
    d.stages[at].steps[0].onlyIf = onlyIf;
    return validateDefinition(d).errors.map(e => e.message).join(' | ');
  };
  it('kept when it reads a figure before it', () => {
    expect(validateDefinition(def).errors).toEqual([]);
    expect(validateDefinition(def).def?.stages[1].steps[0].onlyIf).toEqual({ step: 'count', field: 'rejects', op: '>', value: 5 });
  });
  it('refused in words otherwise', () => {
    expect(withRule({ step: 'nope', field: 'rejects', op: '>', value: 5 })).toMatch(/decided by a step that is not on the method: "nope"/);
    expect(withRule({ step: 'file', field: 'x', op: '>', value: 5 })).toMatch(/is decided by "File the count", which does not come before it/);
    expect(withRule({ step: 'count', field: 'colour', op: '>', value: 5 })).toMatch(/"colour", which is not a box or a figure of “Count the rejects”/);
    expect(withRule({ step: 'count', field: 'rejects', op: '>', value: 'lots' })).toMatch(/compares “Rejects”, a number, with "lots" — give a number/);
    expect(withRule({ step: 'count', field: 'shift', op: '>', value: 'Days' })).toMatch(/compares “Shift” by size — words are only the same \(=\) or not \(≠\)/);
    expect(withRule({ step: 'count', field: 'rejects', op: '~', value: 5 })).toMatch(/is decided with "~"/);
  });
});

describe('a decision proposed by the assistant', () => {
  it('read by the step’s title and the figure’s label, and said back the same', async () => {
    const { fromProposal, toProposal } = await import('../proposal');
    const said = toProposal(def) as { stages: { steps: { only_if: Record<string, string> }[] }[] };
    expect(said.stages[1].steps[0].only_if).toEqual({ step: 'Count the rejects', field: 'Rejects', op: '>', value: '5' });
    expect(said.stages[1].steps[2].only_if).toEqual({ step: 'Count the rejects', field: 'Shift', op: '=', value: 'Nights' });
    expect(said.stages[0].steps[0].only_if).toEqual({ step: '', field: '', op: '', value: '' });
    const again = validateDefinition(fromProposal({ ...said, assumptions: [], questions: [] }).def);
    expect(again.errors).toEqual([]);
    expect(again.def?.stages[1].steps.map(s => s.onlyIf)).toEqual([
      { step: 'count-the-rejects', field: 'rejects', op: '>', value: 5 },
      { step: 'find-why', field: 'the_cause', op: '!=', value: 'none' },
      { step: 'count-the-rejects', field: 'shift', op: '=', value: 'Nights' },
      undefined,
    ]);
  });
});
