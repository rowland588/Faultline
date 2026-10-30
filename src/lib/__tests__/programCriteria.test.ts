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

/* ---------------------------------------------------------------------------------------------------------------------
 * THE 30 OCTOBER AUDIT (docs/PROGRAM-GOAL.md, "Which tools can judge a test") — Rowland: "Five tools in the criteria picker
 * — what are you saying, we only have 5 tools built? We should have many more that offer a verdict." The tools added end in
 * a verdict against a stated target by their own module: SMED against the minutes it must come in at, a line balance against
 * takt. Each reads through studySays — the module its page uses — and says `notYet` while it cannot be told.
 * ------------------------------------------------------------------------------------------------------------------- */
import { ANALYSIS_JUDGES, CRITERION_HELP, CRITERION_MADE, CRITERION_TOOLS, balancesToPick, canJudge, criterionBalance, isCriterionTool, proofStudiesToPick, standardsToTime } from '../programCriteria';
import { againstStandard, changeoverSays, figuresOf, mustComeIn } from '../../tools/changeover/changeover';
import { studySays } from '../studyLinks';
import type { Standard } from '../../tools/linestandard/standard';

const step = (id: string, order: number, sec: number | undefined, side: 'internal' | 'external' = 'internal', source: 'timed' | 'typed' | 'carried' = 'timed') =>
  ({ id, order, name: `Element ${id}`, side, ...(sec !== undefined ? { sec } : {}), source });
/* strip the former 10 min + fit it 8 min = 18 min with the line stopped */
const smed = (minutes: number | undefined, seq = [step('a', 0, 600), step('b', 1, 480)], o: Partial<ToolStudy> = {}): ToolStudy => ({
  id: 'smed', tool: 'changeover', name: 'Changeover to the 2 kg pack', programId: 'p5', projectId: 'j',
  ...(minutes !== undefined ? { agreed: { changeover: { minutes } } } : {}),
  facts: { sequence: seq }, uses: [], startedAt: 1, createdAt: 1, updatedAt: Date.parse('2026-10-29T10:00:00Z'), ...o });
const on = (s: ToolStudy) => criteriaOf(withCriterion(p5, { kind: 'study', id: s.id }), [s], [], '2026-10-30')[0];

describe('the criterion tools — every one a tool whose study ends in a verdict', () => {
  it('six tools, five made from the picker and a line balance timed on a line standard', () => {
    expect([...CRITERION_TOOLS]).toEqual(['capability', 'chart', 'reliability', 'analysis', 'changeover', 'balance']);
    expect([...CRITERION_MADE]).toEqual(['capability', 'chart', 'reliability', 'analysis', 'changeover']);
    expect(CRITERION_TOOLS.every(t => CRITERION_HELP[t].name && CRITERION_HELP[t].judges && CRITERION_HELP[t].example)).toBe(true);
    /* a tool that only shows figures is never offered */
    for (const t of ['map', 'sampling', 'losses', 'talk', 'calc', 'log', 'scored', 'board']) expect(isCriterionTool(t)).toBe(false);
  });
});

describe('SMED — against the minutes it must come in at (30 October audit)', () => {
  it('18 min against 20: within, passed — with the standard said in its sentence and its short form', () => {
    const a = on(smed(20));
    expect([a.word, a.tone, a.title]).toEqual(['passed', 'g', 'SMED — Changeover to the 2 kg pack']);
    expect(a.says).toContain('Within the 20 min standard.');
    expect(a.short).toBe('Changeover to the 2 kg pack: Within the 20 min standard');
    expect(studySays(smed(20)).verdict).toBe('Within the 20 min standard');
  });
  it('18 min against 15: over by 3 min, didn’t pass', () => {
    const a = on(smed(15));
    expect([a.word, a.tone]).toEqual(['failed', 'r']);
    expect(a.says).toContain('Over the 15 min standard by 3 min.');
    expect(a.short).toBe('Changeover to the 2 kg pack: Over the 15 min standard by 3 min');
  });
  it('external work inside is the page’s amber, never the criterion’s: within the minutes still passes', () => {
    const a = on(smed(25, [step('a', 0, 600), step('e', 1, 300, 'external'), step('b', 2, 480)]));   // 23 min as timed
    expect(a.word).toBe('passed');
    expect(studySays(smed(25, [step('a', 0, 600), step('e', 1, 300, 'external'), step('b', 2, 480)])).tone).toBe('g');
    /* the same figures with no minutes typed: figures only — not yet, never a pass */
    const none = on(smed(undefined, [step('a', 0, 600), step('e', 1, 300, 'external'), step('b', 2, 480)]));
    expect([none.word, none.tone]).toEqual(['notYet', 'n']);
  });
  it('no minutes typed: not yet, however good the time looks', () => {
    const a = on(smed(undefined));
    expect([a.word, a.short]).toEqual(['notYet', 'Changeover to the 2 kg pack: 18 min now']);
  });
  it('not yet while it cannot be told: nothing timed, an element with no time, one carried from the changeover before', () => {
    expect(on(smed(20, [])).word).toBe('notYet');
    expect(on(smed(20, [step('a', 0, undefined)])).word).toBe('notYet');
    expect(on(smed(20, [step('a', 0, 600), step('b', 1, undefined)])).word).toBe('notYet');            // 10 min of a changeover not all timed
    expect(on(smed(20, [step('a', 0, 600), step('b', 1, 480, 'internal', 'carried')])).word).toBe('notYet');
    /* over is still over with an element untimed — the minutes are at least this — but not with one carried */
    expect(on(smed(15, [step('a', 0, 1000), step('b', 1, undefined)])).word).toBe('failed');
    expect(on(smed(15, [step('a', 0, 1000), step('b', 1, 480, 'internal', 'carried')])).word).toBe('notYet');
  });
  it('the module’s two rules agree: over by more than half a minute is over, in changeoverSays and in againstStandard', () => {
    for (const [sec, want] of [[20 * 60 + 29, 'within'], [20 * 60 + 31, 'over'], [19 * 60, 'within']] as const) {
      const f = figuresOf({ sequence: [step('a', 0, sec)] });
      expect(againstStandard(f, { minutes: 20 })?.word).toBe(want);
      expect(changeoverSays(f, { minutes: 20 }).lines.some(l => l.tone === 'r')).toBe(want === 'over');
    }
    expect(againstStandard(figuresOf({ sequence: [step('a', 0, 600)] }), undefined)).toBeUndefined();
  });
  it('the study’s own minutes win over a product’s line standard; neither: none', () => {
    expect(mustComeIn({ minutes: 12 }, { minutes: 30 })).toEqual({ minutes: 12 });
    expect(mustComeIn(undefined, { minutes: 30 })).toEqual({ minutes: 30 });
    expect(mustComeIn({ minutes: 0 }, undefined)).toBeUndefined();
  });
  it('a SMED deleted is gone; an overrule beside the verdict takes its place', () => {
    const p = withCriterion(p5, { kind: 'study', id: 'smed' });
    expect(criteriaOf(p, [{ ...smed(20), deletedAt: 5 }], [], '2026-10-30')[0].word).toBe('gone');
    expect(criteriaOf(p, [{ ...smed(15), overrule: { verdict: 'Passed', why: 'agreed with the OEM', by: 'R. Glew', at: 3 } }], [], '2026-10-30')[0].word).toBe('passed');
  });
});

describe('Line balance — every person within takt (30 October audit)', () => {
  const typed = (id: string, who: string, sec: number) => ({ id, order: Number(id.replace(/\D/g, '')) || 0, name: id, who, typedSec: sec });
  const bal = (takt: number | undefined, secs: number[], o: Partial<ToolStudy> = {}): ToolStudy => ({
    id: 'bal', tool: 'balance', name: 'Packing, morning', projectId: 'j', standardId: 'std1', programId: 'p5',
    ...(takt !== undefined ? { agreed: { balance: { taktSec: takt } } } : {}),
    facts: { steps: secs.map((s, i) => typed(`e${i + 1}`, `Op ${i + 1}`, s)) }, uses: [], startedAt: 1, createdAt: 1, updatedAt: Date.parse('2026-10-29T10:00:00Z'), ...o });
  it('everyone inside a 12 s takt: passed, with the page’s sentence', () => {
    const a = on(bal(12, [10, 8]));
    expect([a.word, a.title, a.short]).toEqual(['passed', 'Line balance — Packing, morning', 'Packing, morning: Within takt']);
    expect(a.says).toContain('takt');
  });
  it('one person over takt: didn’t pass, who and by how much', () => {
    const a = on(bal(12, [14, 8]));
    expect([a.word, a.short]).toEqual(['failed', 'Packing, morning: Over takt']);
    expect(a.says).toContain('Op 1 carries');
  });
  it('no takt agreed, or nothing listed: not yet', () => {
    expect(on(bal(undefined, [10, 8])).word).toBe('notYet');
    expect(on(bal(12, [])).word).toBe('notYet');
  });
  it('the balances to pick are those timed in the program’s own place, and a new one is timed on a line standard', () => {
    const other = bal(12, [10], { id: 'b2', projectId: 'other' });
    const gone = bal(12, [10], { id: 'b3', deletedAt: 9 });
    expect(balancesToPick({ projectId: 'j' }, [bal(12, [10]), other, gone, cap()]).map(s => s.id)).toEqual(['bal']);
    expect(balancesToPick({ projectId: 'j', criteria: [{ kind: 'study', id: 'bal' }] }, [bal(12, [10])])).toEqual([]);
    expect(balancesToPick({ projectId: '', workspaceId: 'w' }, [bal(12, [10], { projectId: undefined, workspaceId: 'w' }), bal(12, [10], { id: 'b4', workspaceId: 'x' })]).map(s => s.id)).toEqual(['bal']);
    const std = (id: string, o: Partial<Standard>): Standard => ({ id, projectId: '', product: id, marks: [], sort: 0, createdAt: 1, updatedAt: 1, ...o });
    expect(standardsToTime({ projectId: 'j' }, [std('s1', { projectId: 'j' }), std('s2', { projectId: 'k' }), std('s3', { projectId: 'j', deletedAt: 1 })]).map(s => s.id)).toEqual(['s1']);
    expect(standardsToTime({ projectId: '', workspaceId: 'w' }, [std('s4', { workspaceId: 'w' }), std('s5', { workspaceId: 'x' })]).map(s => s.id)).toEqual(['s4']);
  });
  it('criterionBalance: the map’s people its elements, Line capacity’s target its takt, made for the program on its machine', () => {
    const std: Standard = { id: 'std1', projectId: 'j', workspaceId: 'w', product: 'Maris Piper 2 kg', sort: 0, createdAt: 1, updatedAt: 1,
      marks: [{ id: 'm1', kind: 'person', label: 'Op 1', task: 'Fold and tape', x: 0, y: 0 }, { id: 'm2', kind: 'person', label: 'Op 2', x: 0, y: 0 }] as Standard['marks'],
      capacity: { targetPerMin: 5, stations: [] } };
    const s = criterionBalance({ ...p5, assetId: 'a1', workspaceId: 'w' }, std, { id: 'n', at: 9, machine: 'Packer' });
    expect([s.tool, s.name, s.standardId, s.programId, s.projectId, s.workspaceId, s.assetId, s.machine]).toEqual(['balance', 'Maris Piper 2 kg', 'std1', 'p5', 'j', 'w', 'a1', 'Packer']);
    expect(s.agreed?.balance).toEqual({ taktSec: 12, from: 'target' });
    expect((s.facts.steps ?? []).map(x => [x.who, x.name])).toEqual([['Op 1', 'Fold and tape'], ['Op 2', 'Their work']]);
    /* named for what it judges when asked */
    expect(criterionBalance(p5, std, { id: 'n2', at: 9, name: ' Packing at 5 a minute ' }).name).toBe('Packing at 5 a minute');
  });
});

describe('Analysis — only the questions that judge can pass or fail', () => {
  const an = (agreed: ToolStudy['agreed'], readings: ToolStudy['facts']['readings'] = []): ToolStudy => ({ id: 'an', tool: 'analysis', name: 'Fill', programId: 'p5', projectId: 'j', agreed, facts: { readings }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 });
  let k = 0;
  const vs = (xs: number[], arm: string) => xs.map(value => ({ id: `x${++k}`, at: k, value, arm }));
  const B = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7], A = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
  it('did it change: moved the right way passes, the wrong way fails', () => {
    expect(on(an({ analysis: { kind: 'change', name: 'Fill weight', unit: 'g', better: 'lower' } }, [...vs(B, 'before'), ...vs(A, 'after')])).word).toBe('passed');
    expect(on(an({ analysis: { kind: 'change', name: 'Fill weight', unit: 'g', better: 'higher' } }, [...vs(B, 'before'), ...vs(A, 'after')])).word).toBe('failed');
  });
  it('how sure, how many, learning, shape: figures — green on their page, never a pass; the answer says so', () => {
    const sure = an({ analysis: { kind: 'sure', name: 'Fill weight', unit: 'g' } }, vs(B, 'x'));
    expect(canJudge(sure)).toBe(false);
    const a = on(sure);
    expect([a.word, a.tone]).toEqual(['notYet', 'n']);
    expect(a.says).toMatch(/gives figures, not a pass or fail/);
    for (const kind of ['sure', 'plan', 'groups', 'table', 'relate', 'learn', 'shape'] as const) expect(canJudge(an({ analysis: { kind, name: 'x' } }))).toBe(false);
    for (const kind of ANALYSIS_JUDGES) expect(canJudge(an({ analysis: { kind: kind as 'change', name: 'x' } }))).toBe(true);
    /* an overrule is the person’s word, even on a question that only gives figures */
    expect(on({ ...sure, overrule: { verdict: 'Passed', why: 'seen on the floor', at: 3 } }).word).toBe('passed');
  });
});

describe('what a picked SMED or balance lined up on a test’s Proved by offers', () => {
  it('they are offered as proving studies like the others', () => {
    const lined = { ...smed(20), programId: undefined, uses: [{ id: 'u', kind: 'test' as const, ref: 'r1', role: 'proof' as const, at: 1, by: 'x' }] };
    expect(proofStudiesToPick(p5, [lined], ['r1']).map(s => s.id)).toEqual(['smed']);
  });
});
