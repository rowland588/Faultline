/* A METHOD CHANGED UNDER CONTROL — keys kept for the same things, every
 * change said in a line, and what moving a running project onto the new
 * version does to the work already done: steps done stay done, records on a
 * step that has gone stay as history, a passed gate stands and says what it
 * would now also need. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord } from '../records';
import { changesOf, keepKeys, moveEffect } from '../change';
import { fromProposal } from '../proposal';
import { readFlow } from '../runtime';
import { validateDefinition } from '../validate';

const v1: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Kit trial', purpose: 'Prove a kit.', kind: 'other', roles: [{ key: 'fitter', name: 'Fitter' }],
  stages: [
    { key: 'prove-the-kit', name: 'Prove the kit', steps: [
      { key: 'a-new-step', title: 'Kit laid out', per: 'machine', answer: 'done', role: 'fitter', evidence: { photos: 1 } },
      { key: 'trial', title: 'Trial changeover', per: 'machine', answer: 'measure', fields: [{ key: 'box_1', label: 'Changeover minutes', type: 'reading', max: 20 }] },
    ], gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'f', type: 'fieldMeets', step: 'trial', field: 'box_1', op: '<=', value: 20, policy: 'block' }] } },
    { key: 'hand-over', name: 'Hand over', steps: [{ key: 'sop', title: 'SOP written', per: 'line', answer: 'paperwork' }], gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }] } },
  ],
};
let n = 0;
const rec = (o: Partial<FlowRecord>): FlowRecord => ({ id: `r${++n}`, projectId: 'P', kind: 'step', stageKey: 'prove-the-kit', version: 1, outcome: 'done', doneOn: '2026-10-10', sort: n, createdAt: n, updatedAt: n, ...o });

describe('keys kept for the same things', () => {
  it('a version written afresh — as the assistant proposes one — keeps the keys records point at', () => {
    const proposed = fromProposal({
      name: 'Kit trial', purpose: 'Prove a kit on every bagger.', kind: 'other', roles: [{ name: 'Fitter', side: 'either' }],
      stages: [
        { name: 'Prove the kit', purpose: '', steps: [
          { title: 'Kit laid out', per: 'machine', answer: 'done', role: 'Fitter', photos: 1, files: 0, fields: [] },
          { title: 'Trial changeover', per: 'machine', answer: 'measure', role: '', photos: 0, files: 0, fields: [
            { label: 'Changeover minutes', type: 'reading', unit: 'min', min: null, max: 15, options: [], formula: '', required: true },
            { label: 'Fitters', type: 'number', unit: '', min: null, max: null, options: [], formula: '', required: false },
            { label: 'Fitter minutes', type: 'calc', unit: 'min', min: null, max: null, options: [], formula: 'changeover_minutes * fitters', required: false },
          ] },
          { title: 'Shadow board checked', per: 'line', answer: 'check', role: '', photos: 0, files: 0, fields: [] },
        ], gate: [{ type: 'fieldMeets', policy: 'block', step: 'Trial changeover', field: 'Changeover minutes', op: '<=', value: 15 }] },
        { name: 'Hand over', purpose: '', steps: [{ title: 'SOP written', per: 'line', answer: 'paperwork', role: '', photos: 0, files: 0, fields: [] }], gate: [] },
      ],
    }).def;
    const kept = keepKeys(v1, proposed);
    const steps = kept.stages[0].steps;
    expect(steps.map(s => s.key)).toEqual(['a-new-step', 'trial', 'shadow-board-checked']);
    expect(steps[1].fields?.map(f => f.key)).toEqual(['box_1', 'fitters', 'fitter_minutes']);
    expect(steps[1].fields?.[2].formula).toBe('box_1 * fitters');
    expect(kept.stages[0].gate.conditions[0]).toMatchObject({ step: 'trial', field: 'box_1', value: 15 });
    expect(kept.stages.map(s => s.key)).toEqual(['prove-the-kit', 'hand-over']);
    expect(validateDefinition(kept).ok).toBe(true);
  });
});

describe('every change, a line', () => {
  it('says what was added, removed, moved and changed', () => {
    const v2 = structuredClone(v1);
    v2.stages[0].steps[1].fields = [{ key: 'box_1', label: 'Changeover minutes', type: 'reading', max: 15 }];
    v2.stages[0].steps.push({ key: 'board', title: 'Shadow board checked', per: 'line', answer: 'check' });
    v2.stages[0].gate.conditions.push({ id: 'm', type: 'manual', label: 'Kit stored', policy: 'block' });
    v2.stages[1].steps = [];
    v2.stages[1].name = 'Hand it over';
    const said = changesOf(v1, v2).map(c => `${c.what}: ${c.text}`);
    expect(said).toContain('added: Step “Shadow board checked” in Prove the kit');
    expect(said).toContain('changed: Step “Trial changeover”: its boxes or their limits');
    expect(said).toContain('changed: Prove the kit\'s gate: 1 thing it now needs');
    expect(said).toContain('changed: Stage “Hand over” renamed “Hand it over”');
    expect(said).toContain('removed: Step “SOP written” from Hand over');
    expect(changesOf(v1, structuredClone(v1))).toEqual([]);
  });
});

describe('moving a running project onto a new version', () => {
  it('keeps what was done, keeps what has gone as history, says what is new and which gates now need more', () => {
    const records = [
      rec({ stepKey: 'a-new-step', assetId: 'm1' }),
      rec({ stepKey: 'trial', assetId: 'm1', values: { box_1: 18 } }),
      rec({ kind: 'gate', stepKey: undefined, stageKey: 'prove-the-kit' }),
      rec({ stageKey: 'hand-over', stepKey: 'sop', outcome: 'planned' }),
    ];
    const v2 = structuredClone(v1);
    v2.stages[0].steps.push({ key: 'board', title: 'Shadow board checked', per: 'line', answer: 'check' });
    v2.stages[0].gate.conditions.push({ id: 'm', type: 'manual', label: 'Kit stored', policy: 'block' });
    v2.stages[1].steps = [{ key: 'sign', title: 'Production signs', per: 'line', answer: 'signoff' }];
    const e = moveEffect(v1, v2, records);
    expect(e.keptDone).toBe(2);
    expect(e.newSteps).toEqual(['Shadow board checked', 'Production signs']);
    expect(e.history).toEqual(['SOP written']);
    expect(e.gatesChanged).toEqual(['Prove the kit — passed before it also needed 1 more thing']);
    expect(e.says).toBe('2 steps done stay done; 2 new steps to do; 1 step no longer on the method kept as history; 1 passed gate stands though it now needs more. Nothing is deleted.');
    /* and the runtime reads the project on v2 from the same records: the pass stands, the new step is to do */
    const s = readFlow({ def: v2, records, machines: [{ id: 'm1', name: 'Bagger 1' }], today: '2026-10-20' });
    expect(s.stages[0].gate.passed).toBe(true);
    expect(s.stages[0].steps.find(x => x.def.key === 'board')?.tone).toBe('ahead');
    expect(s.stages[0].steps.find(x => x.def.key === 'trial')?.complete).toBe(true);
  });
});
