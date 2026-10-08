/**
 * A problem changed from its own record (ui/ProblemRecord, docs/DOORS.md) —
 * the one form's answer replaces its words, hours and flag whole; the fix it
 * booked keeps up with the words; and only a live problem opens as one.
 */
import { describe, it, expect, vi } from 'vitest';
import { problemOf, saveProblemEdit } from '../ProblemRecord';
import type { Test, TestItem } from '../../lib/testing';
import type { Can } from '../../lib/access';

const OWNER: Can = { level: 'owner', edit: true, agree: true, remove: true, people: true };
const TEAM: Can = { level: 'team', edit: true, agree: false, remove: false, people: false };
const problem = (more: Partial<TestItem> = {}): TestItem =>
  ({ id: 'p1', projectId: 'j', testId: 's1', kind: 'found', what: 'Seal jaw drifting', createdAt: 0, updatedAt: 0, ...more } as TestItem);
const fixOf = (more: Partial<Test> = {}): Test =>
  ({ id: 'f1', projectId: 'j', kind: 'fix', title: 'Seal jaw drifting', passesIf: 'Seal jaw drifting', ...more } as Test);
const tt = (tests: Test[] = []) => ({ tests, saveItem: vi.fn(async (_i: TestItem) => {}), patchTest: vi.fn(async (_id: string, _p: Partial<Test> | ((cur: Test) => Partial<Test>)) => {}) });

describe('a problem changed from its own record', () => {
  it('saves nothing when nothing changed', () => {
    const t = tt();
    const p = problem({ hoursLost: 3 });
    saveProblemEdit(t, p, { why: 'Seal jaw drifting', media: [], hoursLost: 3 }, OWNER);
    expect(t.saveItem).not.toHaveBeenCalled();
  });

  it('moves critical to high risk whole: the hours become could-cost, critical goes', () => {
    const t = tt();
    const p = problem({ critical: true, hoursLost: 6, impact: 'Launch at risk' });
    saveProblemEdit(t, p, { why: 'Seal jaw drifting', media: [], risk: true, couldLose: 6, impact: 'Launch at risk' }, OWNER);
    const saved = t.saveItem.mock.calls[0][0];
    expect(saved.critical).toBeUndefined();
    expect(saved.risk).toBe(true);
    expect(saved.couldLose).toBe(6);
    expect(saved.hoursLost).toBeUndefined();
    expect(saved.impact).toBe('Launch at risk');
  });

  it('never keeps a high risk on a critical problem', () => {
    const t = tt();
    saveProblemEdit(t, problem({ risk: true }), { why: 'Seal jaw drifting', media: [], critical: true, risk: true }, OWNER);
    const saved = t.saveItem.mock.calls[0][0];
    expect(saved.critical).toBe(true);
    expect(saved.risk).toBeUndefined();
  });

  it('carries new words to the fix it booked — "The problem" only for the owner', () => {
    const owner = tt([fixOf()]);
    saveProblemEdit(owner, problem({ becameTestId: 'f1' }), { why: 'Seal jaw drifting above 180 °C', media: [] }, OWNER);
    expect(owner.patchTest).toHaveBeenCalledWith('f1', { title: 'Seal jaw drifting above 180 °C', passesIf: 'Seal jaw drifting above 180 °C' });
    const team = tt([fixOf()]);
    saveProblemEdit(team, problem({ becameTestId: 'f1' }), { why: 'Seal jaw drifting above 180 °C', media: [] }, TEAM);
    expect(team.patchTest).toHaveBeenCalledWith('f1', { title: 'Seal jaw drifting above 180 °C' });
  });

  it('leaves a fix that was given its own name alone', () => {
    const t = tt([fixOf({ title: 'Fit the upgraded heater', passesIf: 'Holds 180 °C for an hour' })]);
    saveProblemEdit(t, problem({ becameTestId: 'f1' }), { why: 'Seal jaw drifting above 180 °C', media: [] }, OWNER);
    expect(t.saveItem).toHaveBeenCalled();
    expect(t.patchTest).not.toHaveBeenCalled();
  });
});

describe('what the drawer opens as a problem', () => {
  it('is a live problem — not a part of the plan, not a deleted one', () => {
    const items = [problem(), problem({ id: 'n1', kind: 'next' }), problem({ id: 'gone', deletedAt: 1 })];
    expect(problemOf('p1', items)?.id).toBe('p1');
    expect(problemOf('n1', items)).toBeUndefined();
    expect(problemOf('gone', items)).toBeUndefined();
  });
});
