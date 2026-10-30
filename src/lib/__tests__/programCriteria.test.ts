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
import { ANALYSIS_JUDGES, CRITERION_HELP, CRITERION_MADE, CRITERION_PICKS, CRITERION_TOOLS, balancesToPick, canJudge, criterionBalance, isCriterionTool, proofStudiesToPick, standardsToTime } from '../programCriteria';
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
  it('ten choices with the run test: nine tools of studies, a line capacity kept on a standard — and a line balance timed on one', () => {
    expect([...CRITERION_TOOLS]).toEqual(['capability', 'chart', 'reliability', 'analysis', 'changeover', 'balance', 'sampling', 'losses', 'log']);
    expect([...CRITERION_MADE]).toEqual(['capability', 'chart', 'reliability', 'analysis', 'changeover', 'sampling', 'losses']);
    expect([...CRITERION_PICKS]).toEqual(['capability', 'chart', 'reliability', 'analysis', 'changeover', 'balance', 'capacity', 'sampling', 'losses', 'log']);
    expect(CRITERION_PICKS.every(t => CRITERION_HELP[t].name && CRITERION_HELP[t].judges && CRITERION_HELP[t].example)).toBe(true);
    /* a tool that only shows figures, with no target to type, is never offered */
    for (const t of ['map', 'talk', 'calc', 'scored', 'board']) expect(isCriterionTool(t)).toBe(false);
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

/* ---------------------------------------------------------------------------------------------------------------------
 * THE SECOND SLICE OF THE AUDIT (30 October, the coordinator's "do the Line capacity slice now … and revisit two refusals"):
 * Line capacity (a criterion kept on a line standard), a check log judged by a count not the clock, work sampling against a
 * share typed on the study, a loss count against the most a shift may lose. Each reads through the tool's own module.
 * ------------------------------------------------------------------------------------------------------------------- */
import { capacitiesToPick, capacitiesToStart, capacityHref, cannotJudge, criterionLog, logsToPick } from '../programCriteria';
import { capacityVerdict, type Capacity, type Station } from '../../tools/linebalance/capacity';
import { workAgainst } from '../../tools/sampling/sampling';
import { lostAgainst, lossFigures } from '../../tools/losses/losses';
import { inARow } from '../../tools/checks/inARow';
import { defOf } from '../../tools/checks/registry';
import { mapKind } from './helpers/noop';

describe('Line capacity — meets its target or falls short (the sheet’s own gap)', () => {
  /* the worked line of tools/linebalance/__tests__/capacity.test.ts: Bagger 70 bags a minute, Basketer 12 to a basket at 5.5 a minute = 66 */
  const st = (o: Partial<Station> & { name: string; unit: string }): Station => ({ id: o.name, kind: 'machine', contains: 1, ratePer: 'min', ...o });
  const cap = (target?: number, stations: Station[] = [st({ name: 'Bagger', unit: 'bags', rate: 70 }), st({ name: 'Basketer', unit: 'baskets', contains: 12, rate: 5.5 })]): Capacity => ({ stations, ...(target !== undefined ? { targetPerMin: target } : {}) });
  const std = (id: string, c?: Capacity, o: Partial<Standard> = {}): Standard => ({ id, projectId: 'j', product: `Product ${id}`, marks: [], sort: 0, createdAt: 1, updatedAt: Date.parse('2026-10-29T10:00:00Z'), ...(c ? { capacity: c } : {}), ...o });
  const withCap = withCriterion(p5, { kind: 'capacity', id: 's1' });
  const ans = (s: Standard) => criteriaOf(withCap, [], [], '2026-10-30', { standards: [s] })[0];

  it('the module: 66 against a target of 60 meets it; against 70 it is 4 short; no target or no stations: not yet', () => {
    expect(capacityVerdict(cap(60))).toMatchObject({ word: 'meets', verdict: 'Meets the 60 bags/min target' });
    expect(capacityVerdict(cap(70))).toMatchObject({ word: 'short', verdict: '4 bags/min short of the 70 target' });
    expect(capacityVerdict(cap(66)).word).toBe('meets');                     // exactly the target is meeting it
    expect(capacityVerdict(cap(undefined))).toMatchObject({ word: 'notYet', verdict: 'No target yet' });
    expect(capacityVerdict(cap(60, []))).toMatchObject({ word: 'notYet', verdict: 'No stations yet' });
    expect(capacityVerdict(undefined).word).toBe('notYet');
    /* a station with no speed cannot be counted: nothing to judge */
    expect(capacityVerdict(cap(60, [st({ name: 'Bagger', unit: 'bags' })])).word).toBe('notYet');
  });
  it('as a criterion: Passed, Didn’t pass, Not yet — with the sheet’s sentence and the short form', () => {
    const met = ans(std('s1', cap(60)));
    expect([met.word, met.tone, met.title, met.short]).toEqual(['passed', 'g', 'Line capacity — Product s1', 'Product s1: Meets the 60 bags/min target']);
    expect(met.says).toContain('limits the line at 66');
    expect(met.standard?.id).toBe('s1');
    const missed = ans(std('s1', cap(70)));
    expect([missed.word, missed.tone, missed.short]).toEqual(['failed', 'r', 'Product s1: 4 bags/min short of the 70 target']);
    expect(ans(std('s1', cap(undefined))).word).toBe('notYet');
    expect(ans(std('s1')).word).toBe('notYet');                                // a standard with no capacity written yet
  });
  it('the standards not read here: not yet, never gone; deleted or absent when read: gone', () => {
    expect(criteriaOf(withCap, [], [], '2026-10-30')[0]).toMatchObject({ word: 'notYet', tone: 'n' });          // no ctx
    expect(criteriaOf(withCap, [], [], '2026-10-30', { standards: [] })[0]).toMatchObject({ word: 'gone', tone: 'a' });
    expect(ans(std('s1', cap(60), { deletedAt: 3 })).word).toBe('gone');
  });
  it('it sits among the others: ready to sign off only when every criterion passed, signed off with its short form in the line', () => {
    const picked = withCriterion(withCriterion(p5, { kind: 'study', id: 'cap' }), { kind: 'capacity', id: 's1' });
    const a = criteriaOf(picked, [cap2()], [run], '2026-10-30', { standards: [std('s1', cap(60))] });
    expect(criteriaVerdict(picked, a).words).toBe('Ready to sign off — all 2 criteria passed');
    const b = criteriaOf(picked, [cap2()], [run], '2026-10-30', { standards: [std('s1', cap(70))] });
    expect(criteriaVerdict(picked, b)).toMatchObject({ words: '1 of 2 criteria passed · 1 didn’t pass', ready: false });
    expect(cannotSignOff(picked, b, ['R. Glew'], '2026-10-30')).toMatch(/Line capacity — Product s1 — didn’t pass/);
    const signed = signedOff(picked, ['R. Glew'], '2026-10-30', 5);
    expect(passedItLine(signed, a)).toMatch(/· Product s1: Meets the 60 bags\/min target \(29 Oct\)$/);
  });
  it('the capacities to pick: written ones in the program’s place; one to start where no stations are written', () => {
    const list = [std('a', cap(60)), std('b', undefined), std('c', cap(60), { projectId: 'other' }), std('d', cap(60), { deletedAt: 1 }), std('e', { stations: [] })];
    expect(capacitiesToPick({ projectId: 'j' }, list).map(s => s.id)).toEqual(['a']);
    expect(capacitiesToStart({ projectId: 'j' }, list).map(s => s.id)).toEqual(['b', 'e']);
    expect(capacitiesToPick({ projectId: 'j', criteria: [{ kind: 'capacity', id: 'a' }] }, list)).toEqual([]);
    expect(capacitiesToPick({ projectId: '', workspaceId: 'w' }, [std('f', cap(60), { projectId: '', workspaceId: 'w' })]).map(s => s.id)).toEqual(['f']);
    expect(capacityHref({ id: 'a', projectId: 'j' })).toBe('/project/j/standard/a?at=balance');
    expect(capacityHref({ id: 'a', projectId: '', workspaceId: 'w' })).toBe('/w/w/standards/a?at=balance');
  });
  it('taking it off keeps the standard; the same capacity twice is one', () => {
    expect(withCriterion(withCap, { kind: 'capacity', id: 's1' }).criteria).toHaveLength(1);
    expect(withoutCriterion(withCap, { kind: 'capacity', id: 's1' }).criteria).toBeUndefined();
  });
  it('the cloud keeps the kind (mapper) — a later build’s unknown kind is still dropped', () => {
    expect(mapKind([{ kind: 'capacity', id: 'x' }, { kind: 'study', id: 'y' }, { kind: 'nonsense', id: 'z' }])).toEqual([{ kind: 'capacity', id: 'x' }, { kind: 'study', id: 'y' }]);
  });
});
const cap2 = () => cap();

describe('Work sampling — the work share wanted, margins counted', () => {
  const tapsFor = (who: string, working: number, waiting: number) => [
    ...Array.from({ length: working }, (_, i) => ({ id: `${who}w${i}`, at: i, who, activity: 'working' })),
    ...Array.from({ length: waiting }, (_, i) => ({ id: `${who}x${i}`, at: 1000 + i, who, activity: 'waiting' })),
  ];
  const a = (want?: number, who = ['Op 1']): NonNullable<ToolStudy['agreed']> => ({ sampling: { who, activities: ['working', 'waiting'], marginPts: 5, from: 0, to: 1, prompts: [], ...(want !== undefined ? { workAtLeast: want } : {}) } });
  const sm = (agreed: ToolStudy['agreed'], taps: ReturnType<typeof tapsFor>): ToolStudy => ({ id: 'sm', tool: 'sampling', name: 'Packers, morning', programId: 'p5', projectId: 'j', agreed, facts: { taps }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 });
  it('54 of 60 working (90% ±8 points) is at least 80%: met; at 85% it is too close to call — not yet', () => {
    const taps = tapsFor('Op 1', 54, 6);
    expect(workAgainst(a(80).sampling, taps)).toMatchObject({ word: 'met', verdict: 'working at least 80%' });
    const near = workAgainst(a(85).sampling, taps);
    expect(near).toMatchObject({ word: 'notYet' });
    expect(near?.text).toContain('too close to 85%');
    const ans = on(sm(a(80), taps));
    expect([ans.word, ans.short]).toEqual(['passed', 'Packers, morning: working at least 80%']);
  });
  it('30 of 60 working (50%): its upper bound is under 80% — missed, said who', () => {
    const v = workAgainst(a(80).sampling, tapsFor('Op 1', 30, 30));
    expect(v).toMatchObject({ word: 'missed', verdict: 'Under the 80% wanted' });
    expect(v?.text).toContain('Op 1 is working 50% of the time');
    expect(on(sm(a(80), tapsFor('Op 1', 30, 30))).word).toBe('failed');
  });
  it('one person short of the share fails them all; one with too few taps keeps it not yet', () => {
    expect(workAgainst(a(80, ['Op 1', 'Op 2']).sampling, [...tapsFor('Op 1', 54, 6), ...tapsFor('Op 2', 30, 30)])?.word).toBe('missed');
    const early = workAgainst(a(80, ['Op 1', 'Op 2']).sampling, [...tapsFor('Op 1', 54, 6), ...tapsFor('Op 2', 5, 5)]);
    expect(early).toMatchObject({ word: 'notYet' });
    expect(early?.text).toContain('Op 2 has too few taps');
  });
  it('no share wanted, or none typed on the study: no verdict and the criterion says why', () => {
    expect(workAgainst(a().sampling, tapsFor('Op 1', 54, 6))).toBeUndefined();
    const none = sm(a(), tapsFor('Op 1', 54, 6));
    expect(cannotJudge(none)).toMatch(/No share is wanted yet/);
    const r = on(none);
    expect([r.word, r.tone]).toEqual(['notYet', 'n']);
    expect(r.says).toMatch(/No share is wanted yet/);
  });
});

describe('Loss count — against the most a shift may lose', () => {
  /* Line 7, Shift 1: 450 planned minutes at 100 a minute = 45,000 expected; 36,500 made → 85 min lost (the loss module's worked case) */
  const count = { shift: 'Shift 1', from: 0, to: 1, plannedMin: 450, breakMin: 30, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate' as const, rateMachine: 'Bagger' };
  const ls = (max?: number, c: Partial<typeof count> | null = {}): ToolStudy => ({ id: 'ls', tool: 'losses', name: 'Shift 1 at the packer', programId: 'p5', projectId: 'j',
    ...(max !== undefined ? { agreed: { losses: { maxLostMin: max } } } : {}), facts: c ? { losses: { ...count, ...c } } : {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 });
  it('85 min lost against at most 90: within; against 60: over by 25', () => {
    expect(lostAgainst(lossFigures(count, undefined, undefined), 90)).toMatchObject({ word: 'within', verdict: 'Within the 90 min allowed' });
    expect(lostAgainst(lossFigures(count, undefined, undefined), 60)).toMatchObject({ word: 'over', verdict: 'Over the 60 min allowed by 25 min' });
    expect(lostAgainst(lossFigures(count, undefined, undefined), undefined)).toBeUndefined();
    const ok = on(ls(90)), bad = on(ls(60));
    expect([ok.word, ok.tone, ok.short]).toEqual(['passed', 'g', 'Shift 1 at the packer: Within the 90 min allowed']);
    expect([bad.word, bad.tone, bad.short]).toEqual(['failed', 'r', 'Shift 1 at the packer: Over the 60 min allowed by 25 min']);
    expect(ok.says).toContain('85 min lost, within the 90 min allowed.');
  });
  it('the shift not counted yet: not yet; nothing typed: no verdict, said', () => {
    expect(on(ls(90, { made: undefined })).word).toBe('notYet');
    expect(on(ls(90, null)).word).toBe('notYet');
    const none = on(ls(undefined));
    expect([none.word, none.tone]).toEqual(['notYet', 'n']);
    expect(none.says).toMatch(/No most is set yet/);
  });
  it('exactly the most is within it', () => {
    expect(on(ls(85)).word).toBe('passed');
  });
});

describe('Check log — the latest results of every check passed (a count, not the clock)', () => {
  const def = defOf('metal-detection');
  type Chk = NonNullable<NonNullable<ToolStudy['agreed']>['log']>['checks'][number];
  type Res = NonNullable<ToolStudy['facts']['results']>[number];
  const chk = (id: string): Chk => ({ id, name: `Check ${id}`, when: { every: 1, unit: 'hour' }, kind: 'passfail' });
  const res = (checkId: string, i: number, outcome: 'pass' | 'fail'): Res => ({ id: `${checkId}${i}`, checkId, at: 1_000 * (i + 1), outcome });
  const lg = (n: number | undefined, results: Res[], checks: Chk[] = [chk('a'), chk('b')]): ToolStudy => ({ id: 'lg', tool: 'log', name: 'Metal detection, commissioning week', programId: 'p5', projectId: 'j', workspaceId: 'w',
    agreed: { log: { key: 'metal-detection', checks, since: 0, ...(n !== undefined ? { inARow: n } : {}) } }, facts: { results }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 });
  const all = (a: 'pass' | 'fail', n: number, c: string) => Array.from({ length: n }, (_, i) => res(c, i, i === n - 1 ? a : 'pass'));
  it('the last 3 of both checks passed: passed — whatever time it is', () => {
    expect(def).toBeTruthy();
    const s = lg(3, [...all('pass', 3, 'a'), ...all('pass', 4, 'b')]);
    expect(inARow(s)).toMatchObject({ word: 'passed', verdict: '3 in a row passed' });
    const a = on(s);
    expect([a.word, a.tone, a.short]).toEqual(['passed', 'g', 'Metal detection, commissioning week: 3 in a row passed']);
    /* the same fact a year later: still passed — the clock is not read */
    expect(inARow({ ...s, facts: { results: s.facts.results } })?.word).toBe('passed');
  });
  it('a check that failed on its latest: didn’t pass, whichever the others; a failure stands until it passes again', () => {
    const s = lg(3, [...all('pass', 3, 'a'), ...all('fail', 4, 'b')]);
    expect(inARow(s)).toMatchObject({ word: 'failed', verdict: '1 check failed' });
    expect(on(s).word).toBe('failed');
    const fixed = lg(3, [...all('pass', 3, 'a'), ...all('fail', 4, 'b'), res('b', 4, 'pass'), res('b', 5, 'pass')]);
    expect(inARow(fixed)?.word).toBe('notYet');                      // 2 passes since the failure, 3 wanted
    expect(inARow(lg(3, [...all('pass', 3, 'a'), ...all('fail', 4, 'b'), res('b', 4, 'pass'), res('b', 5, 'pass'), res('b', 6, 'pass')]))?.word).toBe('passed');
  });
  it('fewer than the count done, or the list empty: not yet, with each check’s streak said', () => {
    const s = lg(3, [...all('pass', 2, 'a'), ...all('pass', 3, 'b')]);
    expect(inARow(s)).toMatchObject({ word: 'notYet', verdict: 'Not yet — 2 of 3 in a row' });
    expect(inARow(s)?.text).toContain('Check a 2 of 3');
    expect(inARow(lg(3, [], []))).toMatchObject({ word: 'notYet', verdict: 'No checks yet' });
    expect(on(lg(3, [])).word).toBe('notYet');
  });
  it('a struck result does not count; a check taken off is not asked', () => {
    const results = [...all('pass', 3, 'a'), { ...res('b', 0, 'fail'), struck: true }, ...all('pass', 3, 'b')];
    expect(inARow(lg(3, results))?.word).toBe('passed');
    expect(inARow(lg(3, all('pass', 3, 'a'), [chk('a'), { ...chk('b'), removed: true }]))?.word).toBe('passed');
  });
  it('a value or a score is judged by the log’s own verdict: a reading outside its limits is a bad result', () => {
    const val: Chk = { id: 'v', name: 'Seal temp', when: { every: 1, unit: 'hour' }, kind: 'value', lo: 150, hi: 180, unit: '°C' };
    const r = (i: number, value: number): Res => ({ id: `v${i}`, checkId: 'v', at: i + 1, outcome: 'value', value });
    expect(inARow(lg(2, [r(0, 160), r(1, 170)], [val]))?.word).toBe('passed');
    expect(inARow(lg(2, [r(0, 160), r(1, 190)], [val]))?.word).toBe('failed');
  });
  it('no count typed: figures only — the criterion is not yet and says what to set; "up to date" is never a pass', () => {
    const s = lg(undefined, [...all('pass', 3, 'a'), ...all('pass', 3, 'b')]);
    expect(inARow(s)).toBeUndefined();
    expect(cannotJudge(s)).toMatch(/No count is set yet/);
    const a = on(s);
    expect([a.word, a.tone]).toEqual(['notYet', 'n']);
    expect(a.says).toMatch(/No count is set yet/);
  });
  it('a new log for the program: one of the kinds, on its line, from the starter list; none without a line', () => {
    const d = defOf('metal-detection') as NonNullable<typeof def>;
    const s = criterionLog({ ...p5, assetId: 'a1', workspaceId: 'w' }, d, { id: 'n', at: 9, name: 'Metal detection, week 1', machine: 'Detector' }) as ToolStudy;
    expect([s.tool, s.name, s.programId, s.projectId, s.workspaceId, s.assetId, s.machine, s.agreed?.log?.key]).toEqual(['log', 'Metal detection, week 1', 'p5', 'j', 'w', 'a1', 'Detector', 'metal-detection']);
    expect((s.agreed?.log?.checks ?? []).length).toBeGreaterThan(0);
    expect(criterionLog(p5, d, { id: 'n', at: 9, name: 'x' })).toBeUndefined();
    expect(logsToPick({ projectId: 'j' }, [s, { ...s, id: 'o', projectId: 'other' }, { ...s, id: 'd', deletedAt: 1 }]).map(x => x.id)).toEqual(['n']);
  });
});
