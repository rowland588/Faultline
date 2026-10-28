/* PROGRAM 5 PROVED BY THE CRITERIA PICKED FOR IT (lib/programCriteria;
 * docs/PROGRAM-GOAL.md). Rowland, 27–28 October: program 5 (Express 1.25 kg)
 * didn't pass its run on net packs a minute because of lost time that had
 * nothing to do with the trial — "you can fail the overall goal, but it still
 * means that you passed the test"; "the program has a set role of criteria. So
 * I choose the criteria ... If they pass, I then need to be able to sign off ...
 * me and my colleagues together".
 *
 * So: the net run left off, a capability study and a reliability study picked,
 * both passing against what is set in them, signed off by two names. */
import { describe, expect, it } from 'vitest';
import { cannotSignOff, criteriaOf, criteriaVerdict, criterionStudy, passedItLine, signedOff, signersOf, studiesToPick, unpickedStudyChoices, unsigned, withAllProofStudies, withCriterion, withoutCriterion } from '../programCriteria';
import { isProved, programAfterFloor, programAfterTest, programAfterTestGone, stateOf, type Program } from '../programs';
import type { Test } from '../testing';
import type { ToolStudy } from '../study';

const t0 = 1_700_000_000_000;
const H = 3_600_000;
const p5: Program = { id: 'p5', projectId: 'j', what: 'Program 5', runs: 'Express 1.25 kg', state: 'onMachine', sort: 5, createdAt: t0, updatedAt: t0 };
/* its run: 75 ppm for 60 min with a net target — short on net alone */
const run: Test = { id: 'r1', projectId: 'j', title: 'Prove program Program 5', kind: 'test', outcome: 'failed', programId: 'p5', ranOn: '2026-10-27',
  runAgreed: { rate: 75, minutes: 60, net: 55 }, run: { speed: 75, minutes: 60, packs: 3300, rejects: 48 }, sort: 1, createdAt: t0, updatedAt: t0 } as Test;

/* placement weight — thirty readings, 395–408 g: capable */
const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const cap = (o: Partial<ToolStudy> = {}): ToolStudy => ({ id: 'cap', tool: 'capability', name: 'Placement 75 ppm', programId: 'p5', projectId: 'j',
  agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 395, upper: 408, count: 30 } },
  facts: { readings: THIRTY.map((value, i) => ({ id: `r${i}`, value, at: i })) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: Date.parse('2026-10-27T10:00:00Z'), ...o });
/* robot faults — one in ten hours watched against an MTBF wanted of an hour: met */
const rel = (events = 1): ToolStudy => ({ id: 'rel', tool: 'reliability', name: 'Robot faults', programId: 'p5', projectId: 'j',
  agreed: { reliability: { counts: [{ id: 'f', name: 'robot fault', targetMin: 60 }] } },
  facts: { watch: [{ id: 'w', from: t0, to: t0 + 10 * H }], events: Array.from({ length: events }, (_, i) => ({ id: `e${i}`, at: t0 + (i + 1) * (10 * H / (events + 1)), count: 'f' })) },
  uses: [], startedAt: 1, createdAt: 1, updatedAt: Date.parse('2026-10-27T15:00:00Z') });

const picked = withCriterion(withCriterion(p5, { kind: 'study', id: 'cap' }), { kind: 'study', id: 'rel' });

describe('program 5 — the criteria picked, the net run left off', () => {
  it('each criterion is its tool’s own answer; the run that failed on net is not one of them', () => {
    const a = criteriaOf(picked, [cap(), rel()], [run], '2026-10-28');
    expect(a.map(x => [x.title, x.word])).toEqual([['Capability study — Placement 75 ppm', 'passed'], ['Reliability study — Robot faults', 'passed']]);
    expect(a[0].says).toMatch(/Ppk/);
    expect(a.every(x => x.tone === 'g')).toBe(true);
  });
  it('both passed — ready to sign off, and only then', () => {
    const v = criteriaVerdict(picked, criteriaOf(picked, [cap(), rel()], [run], '2026-10-28'));
    expect([v.ready, v.signed, v.words, v.tone]).toEqual([true, false, 'Ready to sign off — all 2 criteria passed', 'a']);
    /* the capability study with readings outside 401–404 g: one of two, red */
    const tight = cap({ agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 401, upper: 404, count: 30 } } });
    const v2 = criteriaVerdict(picked, criteriaOf(picked, [tight, rel()], [run], '2026-10-28'));
    expect([v2.ready, v2.words, v2.tone]).toEqual([false, '1 of 2 criteria passed · 1 didn’t pass', 'r']);
    /* the reliability study not watched yet: not yet, never a pass */
    const none = { ...rel(), facts: {} };
    expect(criteriaOf(picked, [cap(), none], [run], '2026-10-28')[1].word).toBe('notYet');
  });
  it('picking a criterion does not prove it; a passed run no longer proves it once criteria are picked', () => {
    expect(isProved(picked)).toBe(false);
    const passedRun = { ...run, outcome: 'passed' as const };
    expect(programAfterTest(picked, passedRun)).toBeUndefined();
    /* with none picked, as before: a pass proves it */
    expect(programAfterTest(p5, passedRun)?.provedOn).toBe('2026-10-27');
  });
  it('signed off by two names — "Signed off — passed", its day the proved day', () => {
    const answers = criteriaOf(picked, [cap(), rel()], [run], '2026-10-28');
    const by = signersOf('R. Glew, J. Smith');
    expect(by).toEqual(['R. Glew', 'J. Smith']);
    expect(cannotSignOff(picked, answers, by, '2026-10-28')).toBeUndefined();
    const s = signedOff(picked, by, '2026-10-28', t0 + 5);
    expect([stateOf(s), s.provedOn, s.signedOff]).toEqual(['proved', '2026-10-28', { by: ['R. Glew', 'J. Smith'], on: '2026-10-28', at: t0 + 5 }]);
    const v = criteriaVerdict(s, answers);
    expect([v.signed, v.words, v.tone]).toEqual([true, 'Signed off — passed 28 Oct by R. Glew and J. Smith', 'g']);
    expect(passedItLine(s, answers)).toMatch(/^Signed off — passed 28 Oct by R\. Glew and J\. Smith · Placement 75 ppm: .+ \(27 Oct\) · Robot faults: .+ \(27 Oct\)$/);
  });
  it('refused while a criterion has not passed, with no names, or with none picked', () => {
    const tight = cap({ agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 401, upper: 404, count: 30 } } });
    const a = criteriaOf(picked, [tight, rel()], [run], '2026-10-28');
    expect(cannotSignOff(picked, a, ['R. Glew'], '2026-10-28')).toMatch(/^Not every criterion has passed: Capability study — Placement 75 ppm — didn’t pass/);
    const ok = criteriaOf(picked, [cap(), rel()], [run], '2026-10-28');
    expect(cannotSignOff(picked, ok, [' '], '2026-10-28')).toBe('Say who is signing it off.');
    expect(cannotSignOff(p5, [], ['R. Glew'], '2026-10-28')).toMatch(/^Pick its criteria first/);
  });
  it('a signed-off program stays signed off: a test, a deleted test or the floor do not take it back', () => {
    const s = signedOff(picked, ['R. Glew'], '2026-10-28', t0 + 5);
    expect(programAfterTest(s, run)).toBeUndefined();
    expect(programAfterTestGone({ ...s, testId: 'r1' }, run)?.provedOn ?? s.provedOn).toBe('2026-10-28');
    expect(programAfterFloor(s, { on: '2026-10-29', at: t0 + 9 })).toBeUndefined();
    /* and a criterion that slips afterwards is said, not undone by itself */
    const tight = cap({ agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 401, upper: 404, count: 30 } } });
    const v = criteriaVerdict(s, criteriaOf(s, [tight, rel()], [run], '2026-10-29'));
    expect(v.signed).toBe(true);
    expect(v.since).toMatch(/^Since it was signed off, Capability study — Placement 75 ppm reads didn’t pass\.$/);
  });
  it('taken back: on the machine again, its criteria kept', () => {
    const back = unsigned(signedOff(picked, ['R. Glew'], '2026-10-28', 1));
    expect([stateOf(back), back.provedOn, back.signedOff, back.criteria?.length]).toEqual(['onMachine', undefined, undefined, 2]);
  });
});

describe('picking and taking off criteria', () => {
  it('the same study twice is one; taking one off keeps the study', () => {
    expect(withCriterion(picked, { kind: 'study', id: 'cap' }).criteria).toHaveLength(2);
    const off = withoutCriterion(picked, { kind: 'study', id: 'cap' });
    expect(off.criteria).toEqual([{ kind: 'study', id: 'rel' }]);
    expect(withoutCriterion(off, { kind: 'study', id: 'rel' }).criteria).toBeUndefined();
  });
  it('a study deleted is said gone, never a pass', () => {
    const a = criteriaOf(picked, [rel()], [run], '2026-10-28');
    expect([a[0].word, a[0].tone]).toEqual(['gone', 'a']);
    expect(criteriaVerdict(picked, a).words).toBe('1 of 2 criteria passed · 1 gone');
  });
  it('a run test as a criterion: passed once any attempt passed; its failure on net said with what it met', () => {
    const p = withCriterion(p5, { kind: 'run', id: 'r1' });
    const [failed] = criteriaOf(p, [], [run], '2026-10-28');
    expect([failed.word, failed.title]).toEqual(['failed', 'Run test — aiming 75 ppm for 60 min · net 55 ppm']);
    expect(failed.says).toMatch(/^Test 1: didn’t pass — Didn’t pass on net rate alone/);
    const again: Test = { ...run, id: 'r2', fromTestId: 'r1', createdAt: t0 + 1, outcome: 'passed', ranOn: '2026-10-28', runAgreed: { rate: 75, minutes: 60 } } as Test;
    const [passed] = criteriaOf(p, [], [run, again], '2026-10-29');
    expect([passed.word, passed.on]).toEqual(['passed', '2026-10-28']);
  });
  it('the studies on offer: the program’s own and those lined up on its tests, in a tool that says pass or fail, not picked yet', () => {
    const onTest = cap({ id: 'c2', programId: undefined, uses: [{ id: 'u', kind: 'test', ref: 'r1', role: 'proof', at: 1 }] });
    const map = { ...cap({ id: 'm' }), tool: 'map' as const };
    const other = cap({ id: 'o', programId: 'p9' });
    expect(studiesToPick(withCriterion(p5, { kind: 'study', id: 'cap' }), [cap(), onTest, map, other], ['r1']).map(s => s.id)).toEqual(['c2']);
  });
  it('withAllProofStudies: every study on its tests, not the run', () => {
    const onTest = { ...cap(), id: 'c2', programId: undefined, uses: [{ id: 'u', kind: 'test', ref: 'r1', role: 'proof', at: 1, by: 'x' }] } as ToolStudy;
    const next = withAllProofStudies(p5, [cap(), onTest], ['r1']);
    expect(next.criteria?.map(c => c.id).sort()).toEqual(['c2']);
  });
  it('unpickedStudyChoices: proof-linked and passed first, each with its tool answer', () => {
    const onTest = cap({ id: 'c2', programId: undefined, name: 'Express 75 ppm', uses: [{ id: 'u', kind: 'test', ref: 'r1', role: 'proof', at: 1, by: 'x' }] });
    const empty = cap({ id: 'c3', programId: 'p5', name: 'Not read yet', facts: {} });
    const choices = unpickedStudyChoices(p5, [onTest, empty, cap()], ['r1']);
    expect(choices.map(c => c.c.id)).toEqual(['c2', 'cap', 'c3']);
    expect(choices[0].word).toBe('passed');
    expect(choices[2].word).toBe('notYet');
  });
  it('a new study for the program: on its project and machine, set up in its tool', () => {
    const s = criterionStudy({ ...p5, assetId: 'a1', workspaceId: 'w' }, 'reliability', ' Robot faults ', { id: 'n', at: 9, machine: 'Robot' });
    expect([s.tool, s.name, s.programId, s.projectId, s.workspaceId, s.assetId, s.machine, s.uses]).toEqual(['reliability', 'Robot faults', 'p5', 'j', 'w', 'a1', 'Robot', []]);
  });
});
