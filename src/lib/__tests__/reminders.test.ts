import { describe, expect, it } from 'vitest';
import { dueNow, remindersOf, remindWords } from '../reminders';
import type { TestItem } from '../testing';

const TODAY = '2026-10-02';
let n = 0;
const note = (over: Partial<TestItem>): TestItem => ({
  id: `n${++n}`, projectId: 'p', testId: '', kind: 'note', what: 'Chase the OEM', sort: n, createdAt: n, updatedAt: n, ...over,
});

describe('reminders on notes', () => {
  const items = [
    note({ what: 'Order guards', due: '2026-10-05', onPlan: true }),
    note({ what: 'Call Ilapak', due: '2026-09-30' }),
    note({ what: 'Book electrician', due: TODAY }),
    note({ what: 'No date' }),
    note({ what: 'Talked about', due: TODAY, doneAt: 1 }),
    note({ what: 'Far off', due: '2026-11-20' }),
    note({ what: 'Deleted', due: TODAY, deletedAt: 1 }),
    note({ what: 'Not a note', due: TODAY, kind: 'next' as TestItem['kind'] }),
  ];

  it('lists open notes with a date, gone first, then soonest, a week ahead', () => {
    const rs = remindersOf(items, TODAY);
    expect(rs.map(r => r.what)).toEqual(['Call Ilapak', 'Book electrician', 'Order guards']);
    expect(rs.map(r => r.days)).toEqual([-2, 0, 3]);
    expect(rs[2].onPlan).toBe(true);
  });

  it('says something today only for what is due today or has gone', () => {
    expect(dueNow(remindersOf(items, TODAY)).map(r => r.what)).toEqual(['Call Ilapak', 'Book electrician']);
  });

  it('says when, in words', () => {
    expect(remindWords({ days: 0, due: TODAY })).toBe('Today');
    expect(remindWords({ days: 1, due: '2026-10-03' })).toMatch(/^Tomorrow · /);
    expect(remindWords({ days: 3, due: '2026-10-05' })).toMatch(/^In 3 days · .*5 Oct/);
    expect(remindWords({ days: -2, due: '2026-09-30' })).toMatch(/^2 days ago · /);
  });
});

import { standing } from '../standing';

describe('a reminder on the plan', () => {
  const base = { tests: [], assets: [], materials: [], programs: [], today: TODAY };
  it('is drawn on the plan only when it was put there', () => {
    const items = [note({ what: 'On it', due: '2026-10-05', onPlan: true }), note({ what: 'Just remind', due: '2026-10-05' })];
    const plan = standing({ ...base, items }).plan.filter(m => m.kind === 'note');
    expect(plan.map(m => m.label)).toEqual(['On it']);
    expect(plan[0]).toMatchObject({ at: '2026-10-05', tone: 'booked' });
  });
  it('reads done once talked about, and late once its day has gone', () => {
    const items = [note({ what: 'Done', due: '2026-09-30', onPlan: true, doneAt: 5 }), note({ what: 'Gone', due: '2026-09-30', onPlan: true })];
    const plan = standing({ ...base, items }).plan.filter(m => m.kind === 'note');
    expect(Object.fromEntries(plan.map(m => [m.label, m.tone]))).toEqual({ Done: 'done', Gone: 'late' });
  });
});
