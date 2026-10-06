/* Rowland, 6 October: "in commissioning we don't yet have a default set that
   you made for the other gates — I now want this. Also programs are directly
   linked to commissioning, so make the link." */
import { describe, expect, it } from 'vitest';
import { programAfterTest, provingTitle, type Program } from '../programs';
import { commissionGrid, programsToProve, testCell } from '../commission';
import { appStages, cleanStages, usualStages } from '../install';
import { COMMISSION_TESTS, nextFrom, type Asset, type Test } from '../testing';

const TODAY = '2026-10-06';
const prog = (p: Partial<Program> = {}): Program => ({ id: 'p1', projectId: 'j', what: 'P-121', state: 'onMachine', sort: 1, createdAt: 1, updatedAt: 1, ...p });
const test = (t: Partial<Test> = {}): Test => ({ id: 't1', projectId: 'j', kind: 'test', title: 'Prove program P-121', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1, ...t } as Test);
const asset = (id: string, name: string): Asset => ({ id, projectId: 'j', name, state: 'installed', sort: 1, createdAt: 1, updatedAt: 1 } as Asset);

describe('a program is proved by its test in Commission', () => {
  it('passing proves it, on the day the test ran, and takes the booked day off', () => {
    const after = programAfterTest(prog({ testOn: '2026-10-09' }), test({ programId: 'p1', outcome: 'passed', ranOn: '2026-10-05' }), TODAY);
    expect(after).toMatchObject({ state: 'proved', provedOn: '2026-10-05', testOn: undefined, testId: 't1' });
  });
  it('a fail puts a program this test proved back to on the machine', () => {
    const after = programAfterTest(prog({ state: 'proved', provedOn: '2026-10-05', testId: 't1' }), test({ programId: 'p1', outcome: 'failed' }), TODAY);
    expect(after).toMatchObject({ state: 'onMachine', provedOn: undefined });
  });
  it('a program signed off by hand is never unproved by a test that did not prove it', () => {
    expect(programAfterTest(prog({ state: 'proved', provedOn: '2026-09-01' }), test({ programId: 'p1', outcome: 'planned', plannedFor: '2026-10-09' }), TODAY)).toBeUndefined();
  });
  it('its test day follows the test', () => {
    expect(programAfterTest(prog(), test({ programId: 'p1', plannedFor: '2026-10-09' }), TODAY)).toMatchObject({ testOn: '2026-10-09', testId: 't1' });
  });
  it('a test about another program, or none, changes nothing', () => {
    expect(programAfterTest(prog(), test({ programId: 'p2', outcome: 'passed' }), TODAY)).toBeUndefined();
    expect(programAfterTest(prog(), test({ outcome: 'passed' }), TODAY)).toBeUndefined();
  });
  it('nothing to change is said as nothing', () => {
    expect(programAfterTest(prog({ testOn: '2026-10-09', testId: 't1' }), test({ programId: 'p1', plannedFor: '2026-10-09' }), TODAY)).toBeUndefined();
  });
  it('a re-test is still proving the same program', () => {
    expect(nextFrom(test({ programId: 'p1' }), () => 'n', 2).programId).toBe('p1');
  });
});

describe('Commission has a usual list, like the other gates', () => {
  it('the app gives six tests, kept and edited per job like the stages', () => {
    expect(appStages('commission')).toEqual(COMMISSION_TESTS);
    expect(usualStages(undefined, [], 'commission')).toEqual({ stages: [...COMMISSION_TESTS], from: 'app' });
    const job = { id: 'j', gateStages: { commission: ['Seal strength', 'Speed'] }, updatedAt: 1 };
    expect(usualStages(job, [], 'commission').stages).toEqual(['Seal strength', 'Speed']);
    expect(cleanStages([...COMMISSION_TESTS], 'commission')).toBeUndefined();
  });
});

describe('the Commission grid', () => {
  const usual = ['Speed', 'Seal'];
  const wrapper = asset('w', 'Wrapper'), coder = asset('c', 'Coder');
  it('a square is the latest attempt of that test on that machine, in the house colours', () => {
    const first = test({ id: 'a', title: 'Speed', assetId: 'w', outcome: 'failed', ranOn: '2026-10-01' });
    const retest = test({ id: 'b', title: 'Speed — re-test', assetId: 'w', fromTestId: 'a', outcome: 'passed', ranOn: '2026-10-03' });
    const { rows } = commissionGrid([wrapper, coder], [first, retest], [], usual, TODAY);
    expect(rows[0].cells[0]?.test.id).toBe('b');
    expect(rows[0].cells[0]?.tone).toBe('g');
    expect(rows[0].missing).toBe(1);
    expect(rows[1].missing).toBe(2);
  });
  it('says each state in words', () => {
    expect(testCell(test({ plannedFor: '2026-10-09' }), TODAY)).toEqual({ tone: 'w', word: 'booked 9 Oct' });
    expect(testCell(test({ plannedFor: '2026-10-01' }), TODAY).tone).toBe('r');
    expect(testCell(test(), TODAY)).toEqual({ tone: 'n', word: 'no day yet' });
  });
  it('counts a machine’s programs beside its tests, and the ones still to prove', () => {
    const progs = [prog({ id: 'p1', assetId: 'w' }), prog({ id: 'p2', assetId: 'w', state: 'proved', provedOn: '2026-10-01' }), prog({ id: 'p3', assetId: 'w' })];
    const tests = [test({ id: 'x', programId: 'p1', assetId: 'w', plannedFor: '2026-10-02' })];
    const { rows, columns } = commissionGrid([wrapper], tests, progs, usual, TODAY);
    expect(columns).toEqual(usual);   // a program's test is not a column
    expect(rows[0].programs).toEqual({ total: 3, proved: 1, testing: 1, noTest: 1, wrong: 1 });
    const owed = programsToProve(progs, tests, TODAY);
    expect(owed.map(o => [o.program.id, o.tone])).toEqual([['p1', 'r'], ['p3', 'n']]);
  });
  it('a test outside the usual list is a column of its own, as a stage is on Install', () => {
    const own = test({ id: 'e', title: 'Emergency stops', assetId: 'c', outcome: 'passed', ranOn: '2026-10-01' });
    const board = commissionGrid([wrapper, coder], [own], [], usual, TODAY);
    expect(board.columns).toEqual(['Speed', 'Seal', 'Emergency stops']);
    expect(board.usualCount).toBe(2);
    expect(board.rows[1].cells[2]?.tone).toBe('g');
    expect(board.rows[1].missing).toBe(2);
  });
  it('names a program’s test after the program', () => {
    expect(provingTitle({ what: 'P-121' })).toBe('Prove program P-121');
  });
});
