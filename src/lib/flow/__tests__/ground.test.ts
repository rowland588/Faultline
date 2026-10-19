/* ASKING ABOUT A PROJECT, GROUNDED — its facts, each with how it is known;
 * the questions the app answers itself with no assistant; an assistant's
 * answer checked against the facts it was sent (a figure it was not told is
 * never passed off as known); and a method said back in the proposal's shape
 * and changed, its keys and records kept. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord, Method } from '../records';
import { readFlow } from '../runtime';
import type { FlowProject } from '../operations';
import { answerLocally, factsOf } from '../ground';
import { checkAnswer } from '../askCore';
import { fromProposal, toProposal } from '../proposal';
import { readChange } from '../assist';
import { validateDefinition } from '../validate';

const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Kit trial', purpose: 'Prove a kit.', kind: 'other', roles: [{ key: 'fitter', name: 'Fitter' }, { key: 'qa', name: 'Quality' }],
  stages: [{
    key: 'prove', name: 'Prove the kit',
    steps: [
      { key: 'laid', title: 'Kit laid out', per: 'machine', answer: 'done', role: 'fitter', dueDays: 2 },
      { key: 'trial', title: 'Trial changeover', per: 'machine', answer: 'measure', role: 'fitter', fields: [{ key: 'mins', label: 'Changeover minutes', type: 'reading', unit: 'min', max: 20 }] },
    ],
    gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'm', type: 'manual', label: 'Kit stored on its board', policy: 'block' }] },
  }],
};
const machines = [{ id: 'b1', name: 'Bagger 1' }, { id: 'b2', name: 'Bagger 2' }];
let n = 0;
const rec = (o: Partial<FlowRecord>): FlowRecord => ({ id: `r${++n}`, projectId: 'P', kind: 'step', stageKey: 'prove', version: 1, outcome: 'done', sort: n, createdAt: n, updatedAt: n, ...o });
const records = [
  rec({ stepKey: 'laid', assetId: 'b1', doneOn: '2026-10-02', who: 'Dave' }),
  rec({ stepKey: 'trial', assetId: 'b1', doneOn: '2026-10-05', values: { mins: 26 }, outcome: 'failed' }),
];
const method: Method = { id: 'M', familyId: 'M', version: 2, status: 'active', definition: def, createdAt: 0, updatedAt: 0 };
const fp = (): FlowProject => ({
  project: { id: 'P', name: 'Bagger kit — Line 4', color: '#000', workspaceIds: [], createdAt: 0, updatedAt: 0, flow: { methodId: 'M', familyId: 'M', version: 2, startedOn: '2026-10-01', people: { fitter: 'Dave' } } },
  method, records, machines, problems: [{ open: true, title: 'Guard loose', priority: 'high' }], tools: {}, checks: {},
  state: readFlow({ def, records, machines, today: '2026-10-20', startedOn: '2026-10-01', people: { fitter: 'Dave' } }),
});

describe('a project’s facts', () => {
  it('says each thing once, with how it is known', () => {
    const f = factsOf(fp());
    const by = (id: string) => f.find(x => x.id === id);
    expect(by('project')).toMatchObject({ basis: 'known', text: expect.stringMatching(/“Bagger kit — Line 4”, running the method “Kit trial”, version 2, started 1 Oct 2026/) });
    expect(by('role:fitter')).toMatchObject({ basis: 'known', text: 'Fitter: Dave.' });
    expect(by('role:qa')).toMatchObject({ basis: 'not recorded', text: 'Nobody is named as Quality.' });
    expect(by('step:prove/laid/b1')).toMatchObject({ basis: 'known', text: '“Kit laid out” on Bagger 1 was done on 2 Oct by Dave.' });
    expect(by('step:prove/trial/b1')?.text).toMatch(/did not pass on 5 Oct: Changeover minutes 26 min — at most 20 min/);
    expect(by('step:prove/laid/b2')).toMatchObject({ basis: 'worked out', text: expect.stringMatching(/nothing recorded; due 3 Oct — late/) });
    expect(by('checks:prove')?.text).toBe('At Prove the kit\'s gate these are confirmed by hand: Kit stored on its board.');
    expect(by('problems')?.text).toBe('1 problem open on the project: Guard loose (high).');
    expect(f.every(x => !/@/.test(x.text))).toBe(true);
  });
});

describe('the questions the app answers itself', () => {
  it('what is late, what next, can the gate pass, who owes what — worked out, with no assistant', () => {
    expect(answerLocally('What is late?', fp())?.[0].text).toMatch(/^1 step late: Kit laid out — Bagger 2 \(due 3 Oct\)\.$/);
    expect(answerLocally('what should I do next', fp())?.[0]).toMatchObject({ basis: 'worked out', facts: ['next'] });
    const gate = answerLocally('Can we pass the gate?', fp());
    expect(gate?.[0].text).toMatch(/Prove the kit's gate needs: Every step in Prove the kit done/);
    expect(gate?.[1]).toMatchObject({ basis: 'known', text: expect.stringMatching(/confirmed by hand: Kit stored/) });
    expect(answerLocally('who owes what?', fp())?.[0].text).toMatch(/Still to do, by whom: Dave 3/);
    expect(answerLocally('When will it finish?', fp())?.[0].basis).toBe('unknown');
    expect(answerLocally('Tell me a joke', fp())).toBeNull();
    expect(answerLocally('Which template is this?', fp())).toBeNull();
  });
});

describe('an assistant’s answer, checked against what it was sent', () => {
  const facts = factsOf(fp());
  it('keeps what rests on the facts, and never passes off a figure it was not told as known', () => {
    const said = checkAnswer({ sentences: [
      { text: 'The trial on Bagger 1 took 26 min, over the 20 min limit.', basis: 'known', facts: ['step:prove/trial/b1'] },
      { text: 'It took 31 minutes on Bagger 2.', basis: 'known', facts: ['step:prove/trial/b1'] },
      { text: 'Bagger 2 will probably need the same adjustment.', basis: 'inferred', facts: ['step:prove/trial/b1'] },
      { text: 'There are 7 fitters on site.', basis: 'known', facts: ['made-up'] },
      { text: 'Nothing says who stores the kit.', basis: 'unknown', facts: [] },
    ] }, facts);
    expect(said.map(s => `${s.basis}: ${s.text}`)).toEqual([
      'known: The trial on Bagger 1 took 26 min, over the 20 min limit.',
      'inferred: It took 31 minutes on Bagger 2.',
      'inferred: Bagger 2 will probably need the same adjustment.',
      'unknown: Nothing says who stores the kit.',
    ]);
    expect(said[1].note).toBe('the figure 31 is not in what it was told');
    expect(checkAnswer('nonsense', facts)).toEqual([]);
  });

  it('a "known" sentence resting on worked-out facts is said to be worked out', () => {
    const said = checkAnswer({ sentences: [{ text: 'One step is late.', basis: 'known', facts: ['counts'] }] }, facts);
    expect(said[0].basis).toBe('worked out');
  });
});

describe('a method said back and changed', () => {
  it('round-trips through the proposal’s shape', () => {
    const back = fromProposal(toProposal(def)).def;
    expect(validateDefinition(back).ok).toBe(true);
    expect(back.stages[0].steps.map(s => s.title)).toEqual(['Kit laid out', 'Trial changeover']);
    expect(back.stages[0].gate.conditions.map(c => c.type)).toEqual(['stepsDone', 'manual']);
  });

  it('a proposed change keeps the keys records point at and says each change', () => {
    const p = toProposal(def) as { stages: { steps: unknown[]; gate: unknown[] }[] };
    p.stages[0].steps.push({ title: 'Shadow board checked', per: 'line', answer: 'check', role: 'Quality', passes_if: '', photos: 1, files: 0, due_days: null, after: [], fields: [], help: '' });
    const r = readChange(def, { ok: true, proposal: p });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.def.stages[0].steps.map(s => s.key)).toEqual(['laid', 'trial', 'shadow-board-checked']);
    expect(r.def.stages[0].steps[1].fields?.[0].key).toBe('mins');
    expect(r.changes.map(c => c.text)).toEqual(['Step “Shadow board checked” in Prove the kit']);
    /* the project's records still read: the failed trial is still the failed trial */
    const s = readFlow({ def: r.def, records, machines, today: '2026-10-20', startedOn: '2026-10-01' });
    expect(s.stages[0].steps.find(x => x.def.key === 'trial' && x.assetId === 'b1')?.failed).toBe(true);
  });
});
