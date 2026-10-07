/* Rowland, 7 October: "every day I almost have a huddle ... what are we
   planning to do today? Let's agree that, and then let's move forward." */
import { describe, expect, it } from 'vitest';
import { leftFrom, planCount, planFor, planOn } from '../huddle';
import { dayOf } from '../day';
import type { Test, TestItem } from '../testing';

const line = (i: Partial<TestItem>): TestItem => ({ id: 'x', projectId: 'j', testId: '', kind: 'today', what: 'Do it', due: '2026-10-07', sort: 1, createdAt: 1, updatedAt: 1, ...i });
const step = { id: 's', projectId: 'j', kind: 'install', title: 'Dry run', outcome: 'planned', plannedFor: '2026-10-09', sort: 1, createdAt: 1, updatedAt: 1 } as Test;

describe('the plan for today', () => {
  const items = [
    line({ id: 'a', what: 'Load the programs', testId: 's', sort: 2 }),
    line({ id: 'b', what: 'Walk the guarding', doneAt: 5, sort: 1 }),
    line({ id: 'y1', what: 'Book the electrician', due: '2026-10-06' }),
    line({ id: 'y2', what: 'Unpack', due: '2026-10-06', doneAt: 3 }),
    { ...line({ id: 'n', what: 'A note, not the plan' }), kind: 'note' as const },
  ];
  it('is the day’s lines in the order agreed, and a record’s own', () => {
    expect(planFor(items, '2026-10-07').map(i => i.id)).toEqual(['b', 'a']);
    expect(planOn('s', items, '2026-10-07').map(i => i.id)).toEqual(['a']);
  });
  it('offers what the last huddle left undone, until it is carried over', () => {
    expect(leftFrom(items, '2026-10-07')).toEqual({ day: '2026-10-06', lines: [items[2]] });
    expect(leftFrom([...items, line({ id: 'c', fromItemId: 'y1' })], '2026-10-07')).toBeUndefined();
  });
  it('says how it is going in words', () => {
    expect(planCount(planFor(items, '2026-10-07'))).toBe('1 of 2 done');
    expect(planCount(planFor(items, '2026-10-06'))).toBe('1 of 2 done');
    expect(planCount([line({})], true)).toBe('none of 1 done');
    expect(planCount([line({ doneAt: 1 })])).toBe('all 1 done');
  });
  it('the day’s story says how the plan went — today to do, a past day not done', () => {
    const input = { tests: [step], items, assets: [], materials: [], programs: [] };
    const today = dayOf(input, '2026-10-07', '2026-10-07');
    const sec = today.sections.find(s => s.key === 'plan');
    expect(sec?.title).toBe('The plan for today — 1 of 2 done');
    expect(sec?.lines.map(l => [l.text, l.tone])).toEqual([['Walk the guarding — done', 'done'], ['Load the programs — The line — Dry run — to do', 'booked']]);
    expect(today.headline.startsWith('Plan for the day: 1 of 2 done.')).toBe(true);
    const past = dayOf(input, '2026-10-06', '2026-10-07');
    expect(past.sections.find(s => s.key === 'plan')?.lines.map(l => l.tone)).toEqual(['slipped', 'done']);
  });
});
