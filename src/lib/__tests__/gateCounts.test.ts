/* EVERY COUNT IS ITS PAGE'S (docs/FLOW-AUDIT.md, finding 16).
 *
 * The rail said "Problems 5", counting the fixes, while the Problems page held
 * 7 problems with no fix; Hand over's Needs you said "Nothing" while two of
 * its three machines had none of its items. One reading each, for the page's
 * head, its Needs you and the rail. */
import { describe, it, expect } from 'vitest';
import { problemsTally } from '../noted';
import { gateGaps, installGrid } from '../install';
import type { Asset, Test, TestItem } from '../testing';

const TODAY = '2026-10-13';
let n = 0;
const test = (o: Partial<Test> = {}): Test => ({ id: `t${++n}`, projectId: 'p', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const item = (o: Partial<TestItem> & { testId: string }): TestItem => ({ id: `i${++n}`, projectId: 'p', kind: 'found', what: `Problem ${n}`, sort: n, createdAt: n, updatedAt: 1, ...o }) as TestItem;
const asset = (o: Partial<Asset> = {}): Asset => ({ id: `a${++n}`, projectId: 'p', name: `Machine ${n}`, state: 'onSite', sort: n, updatedAt: 1, ...o });

describe("a job's problems, counted once", () => {
  it('open is the fixes still to do and the problems no fix is booked for; late the fixes past their day', () => {
    const run = test({ title: 'Seal' });
    const fixLate = test({ kind: 'fix', title: 'Re-track', plannedFor: '2026-10-10' });
    const fixAhead = test({ kind: 'fix', title: 'Guard', plannedFor: '2026-10-20' });
    const fixDone = test({ kind: 'fix', title: 'Belt', outcome: 'passed', ranOn: '2026-10-09' });
    const items = [
      item({ testId: run.id, becameTestId: fixLate.id }),   // followed as its fix
      item({ testId: run.id }), item({ testId: run.id }),     // two with no fix
      item({ testId: run.id, doneAt: 5 }),                    // sorted
    ];
    expect(problemsTally([run, fixLate, fixAhead, fixDone], items, [], TODAY)).toEqual({ open: 4, fixes: 2, noFix: 2, late: 1, done: 1 });
  });
});

describe('what a gate is missing', () => {
  const usual = ['Manuals', 'Training', 'Spares'];
  const a = asset({ name: 'Wrapper' }), b = asset({ name: 'Checkweigher' }), c = asset({ name: 'Coder', state: 'awaited' });
  const tests = [test({ kind: 'install', gate: 'handover', assetId: a.id, title: 'Manuals' })];
  it('names the machines with none of its stages, and counts the squares not added on the rest', () => {
    const g = gateGaps(installGrid([a, b, c], tests, [], TODAY, usual, 'handover'), 'handover');
    expect(g.bare.map(x => x.name)).toEqual(['Checkweigher', 'Coder']);
    expect(g.unplanned).toBe(2);
    expect(g.byMachine).toEqual([{ asset: a, n: 2 }]);
  });
  it('at Install, a machine already in and running before anybody kept steps is not missing them', () => {
    const running = asset({ name: 'Old palletiser', state: 'running' });
    expect(gateGaps(installGrid([running], [], [], TODAY, usual, 'install'), 'install').bare).toEqual([]);
    expect(gateGaps(installGrid([running], [], [], TODAY, usual, 'handover'), 'handover').bare).toEqual([running]);
  });
});
