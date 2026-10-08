/* A PROGRAM, PROVED AT SPEED (lib/programRun). Rowland, 8 October: "if I've
 * got a program, then commissioning a program would be the next logical
 * choice, as in commissioning speed." */
import { describe, expect, it } from 'vitest';
import { agreedBefore, plannedRun, programRunSays, runsOfProgram } from '../programRun';
import type { Test, TestItem } from '../testing';

const run = (id: string, assetId: string, runs: Test['runs'], extra: Partial<Test> = {}) =>
  ({ id, projectId: 'p', kind: 'test', title: 'Runs with product at the agreed speed', assetId, outcome: 'planned', runs, sort: 1, createdAt: 1, updatedAt: 1, ...extra }) as Test;
const part = { id: 'part-12', what: 'PR-12 Express 1.25 kg' } as Pick<TestItem, 'id' | 'what'>;

describe('a program and its run in Commission', () => {
  it('finds the row that names it, or has its name, on its own machine only', () => {
    const tests = [
      run('t1', 'w', [{ id: 'a', product: 'Tesco Express 1.25 kg', program: 'part-12', agreed: { rate: 45, minutes: 60 } }]),
      run('t2', 'other', [{ id: 'b', product: 'PR-12 Express 1.25 kg' }]),
      run('t3', 'w', [{ id: 'c', product: 'pr-12 express 1.25 KG' }, { id: 'd', product: 'Something else' }]),
    ];
    expect(runsOfProgram(part, 'w', tests).map(x => x.p.run.id)).toEqual(['a', 'c']);
    /* By what it runs, when the run names the product. */
    expect(runsOfProgram({ id: 'x', what: 'PR-07' }, 'w', [run('t4', 'w', [{ id: 'e', product: 'Baking Potatoes 2 kg' }])], ['Baking Potatoes 2 kg']).length).toBe(1);
  });
  it('says the run in words and colour: passed green with its net, short red with what fell short, planned indigo', () => {
    const planned = runsOfProgram(part, 'w', [run('t1', 'w', [{ id: 'a', product: 'x', program: 'part-12', agreed: { rate: 45, minutes: 60 } }])]);
    expect(programRunSays(planned)).toEqual({ word: 'run planned', tone: 'w' });
    const met = runsOfProgram(part, 'w', [run('t1', 'w', [{ id: 'a', product: 'x', program: 'part-12', agreed: { rate: 45, minutes: 60 }, day: { minutes: 60, packs: 2760 }, ranOn: '2026-10-09' }])]);
    expect(programRunSays(met)).toMatchObject({ tone: 'g' });
    expect(programRunSays(met)?.word).toMatch(/^run passed 9 Oct — 46 ppm net$/);
    const short = runsOfProgram(part, 'w', [run('t1', 'w', [{ id: 'a', product: 'x', program: 'part-12', agreed: { rate: 45, minutes: 60 }, day: { minutes: 60, packs: 2400 } }])]);
    expect(programRunSays(short)).toMatchObject({ tone: 'r' });
    expect(programRunSays(short)?.word).toMatch(/^run short — net rate 5 ppm short/);
    expect(programRunSays([])).toBeUndefined();
  });
  it('is planned as a row naming the program, on the numbers the machine last agreed', () => {
    const tests = [run('t1', 'w', [{ id: 'a', product: 'Finest Red', agreed: { rate: 60, minutes: 30, rejectsMax: 1 } }])];
    expect(agreedBefore(tests, 'w')).toEqual({ rate: 60, minutes: 30, rejectsMax: 1 });
    expect(agreedBefore(tests, 'none')).toBeUndefined();
    expect(plannedRun(part, ' PR-12 Express 1.25 kg ', { rate: 45 }, 'r1')).toEqual({ id: 'r1', product: 'PR-12 Express 1.25 kg', program: 'part-12', agreed: { rate: 45 } });
  });
});

describe('the link survives the run being worked', () => {
  it('a row keeps the program it proves when its numbers go in or it is run again', async () => {
    const { withDay, runAgain } = await import('../run');
    const row = { id: 'a', product: 'x', program: 'part-12', agreed: { rate: 45 } };
    expect(withDay(row, 'minutes', 60, '2026-10-08').program).toBe('part-12');
    expect(runAgain([row], ['a'], () => 'b')[1]).toMatchObject({ id: 'b', program: 'part-12' });
  });
});

describe('a product run has its own words and problems', () => {
  it('keeps what was seen through its numbers going in, and finds the problems written on it', async () => {
    const { withDay } = await import('../run');
    const { problemsOnRun } = await import('../programRun');
    expect(withDay({ id: 'a', product: 'x', note: 'Seals good' }, 'minutes', 60, '2026-10-08').note).toBe('Seals good');
    const items = [
      { id: 'f1', projectId: 'p', testId: 't1', kind: 'found', what: 'Film drifts', fromItemId: 'a', sort: 1, createdAt: 2, updatedAt: 2 },
      { id: 'f2', projectId: 'p', testId: 't1', kind: 'found', what: 'Another product', fromItemId: 'b', sort: 2, createdAt: 3, updatedAt: 3 },
      { id: 'f3', projectId: 'p', testId: 't1', kind: 'found', what: 'Gone', fromItemId: 'a', deletedAt: 5, sort: 3, createdAt: 4, updatedAt: 4 },
    ] as TestItem[];
    expect(problemsOnRun(items, 't1', 'a').map(i => i.id)).toEqual(['f1']);
  });
  it('says on the test card which product a problem was written on', async () => {
    const { trialCard } = await import('../trialCard');
    const t = run('t1', 'w', [{ id: 'a', product: 'PR-12 Express 1.25 kg' }]);
    const items = [{ id: 'f1', projectId: 'p', testId: 't1', kind: 'found', what: 'Film drifts after 40 min', fromItemId: 'a', sort: 1, createdAt: 2, updatedAt: 2 }] as TestItem[];
    expect(trialCard(t, [t], items, []).findings.map(f => f.what)).toEqual(['On PR-12 Express 1.25 kg: Film drifts after 40 min']);
  });
});
