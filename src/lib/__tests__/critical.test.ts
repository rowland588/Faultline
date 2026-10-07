/* Rowland, 6 October: "the ability to say that this is critical, and to write
   more narrative behind it — potential solutions, what it means for the
   business ... say in a report: look at this, this is a major problem." */
import { describe, expect, it } from 'vitest';
import { criticalOn, criticalProblems, criticalState } from '../critical';
import { stageGateOnTarget } from '../onTarget';
import type { Asset, Test, TestItem } from '../testing';

const TODAY = '2026-10-06';
const step = (t: Partial<Test> = {}): Test => ({ id: 's1', projectId: 'j', kind: 'install', gate: 'setup', title: 'Programs loaded', assetId: 'a', outcome: 'planned', plannedFor: '2026-10-20', sort: 1, createdAt: 1, updatedAt: 1, ...t } as Test);
const found = (i: Partial<TestItem> = {}): TestItem => ({ id: 'f1', projectId: 'j', testId: 's1', kind: 'found', what: 'Programs cannot be copied over', sort: 1, createdAt: 10, updatedAt: 10, ...i });
const wrapper = { id: 'a', projectId: 'j', name: 'Pick and place', state: 'installed', sort: 1, createdAt: 1, updatedAt: 1 } as Asset;

describe('a critical problem', () => {
  it('is read with where it is, its story and the way agreed', () => {
    const item = found({ critical: true, impact: 'Cannot release the line on the agreed day', ways: [{ id: 'w', what: 'A belt to bypass the robot', agreed: true }, { id: 'v', what: 'A second engineer' }] });
    const { open, sorted } = criticalProblems([step()], [item, found({ id: 'plain' })], [wrapper]);
    expect(sorted).toEqual([]);
    expect(open).toHaveLength(1);
    expect(open[0].where).toBe('Pick and place — Programs loaded');
    expect(criticalState(open[0])).toBe('open · going with: A belt to bypass the robot');
  });
  it('says when nothing is agreed, or nothing written', () => {
    const one = criticalProblems([step()], [found({ critical: true, ways: [{ id: 'w', what: 'x' }, { id: 'v', what: 'y' }] })], []).open[0];
    expect(criticalState(one)).toBe('open · 2 ways round it, none agreed');
    expect(criticalState(criticalProblems([step()], [found({ critical: true })], []).open[0])).toBe('open · no way round it yet');
  });
  it('is sorted when said sorted, or when the fix it booked is done', () => {
    const fix = { id: 'x', projectId: 'j', kind: 'fix', title: 'Rewrite', outcome: 'passed', ranOn: '2026-10-05', sort: 2, createdAt: 1, updatedAt: 1 } as Test;
    const item = found({ critical: true, becameTestId: 'x' });
    expect(criticalProblems([step(), fix], [item], []).sorted).toHaveLength(1);
    expect(criticalOn('s1', [item], [step(), fix])).toEqual([]);
    expect(criticalOn('s1', [item])).toHaveLength(1);   // without the tests, only "sorted" by hand counts
  });
});

describe('"Are we on target?" with a critical problem open', () => {
  const x = (items: TestItem[]) => ({ project: { plannedAt: '2026-11-02', expectedAt: '2026-11-02' }, tests: [step()], items, assets: [wrapper], materials: [], programs: [], today: TODAY });
  it('is never on target while one is open, and says so', () => {
    expect(stageGateOnTarget(x([])).tone).toBe('on');
    const v = stageGateOnTarget(x([found({ critical: true })]));
    expect(v.tone).toBe('risk');
    expect(v.reason).toContain('1 critical: Programs cannot be copied over');   // named, as late things are
  });
  it('a sorted one does not hold it', () => {
    expect(stageGateOnTarget(x([found({ critical: true, doneAt: 20 })])).tone).toBe('on');
  });
});
