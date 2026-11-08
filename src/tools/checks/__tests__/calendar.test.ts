import { describe, expect, it } from 'vitest';
import { logCalendar } from '../calendar';
import type { AgreedLog, LogResult } from '../../../lib/study';

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();
const log = { since: day(2026, 10, 26, 6), checks: [{ id: 'c1', name: 'Seal pull', kind: 'value', lo: 40, when: { every: 1, unit: 'shift' } }, { id: 'c2', name: 'Guard', kind: 'passfail', when: { every: 1, unit: 'shift' } }] } as unknown as AgreedLog;
const r = (id: string, checkId: string, at: number, o: Partial<LogResult>): LogResult => ({ id, checkId, at, outcome: 'pass', ...o } as LogResult);

describe('the log as a calendar', () => {
  it('a day a cell, Monday first, the done and the not-passing counted by the log\'s own verdict', () => {
    const results = [
      r('a', 'c1', day(2026, 11, 2), { outcome: 'value', value: 45 }),
      r('b', 'c1', day(2026, 11, 3), { outcome: 'value', value: 31 }),   // under its limit: not passing
      r('c', 'c2', day(2026, 11, 3), { outcome: 'fail' }),
      r('d', 'c2', day(2026, 11, 4), { outcome: 'pass', struck: true } as Partial<LogResult>),
    ];
    const cal = logCalendar(log, results, undefined, day(2026, 11, 8), 2);
    expect(cal.weeks).toHaveLength(2);
    expect(new Date(cal.weeks[0][0].day).getDay()).toBe(1); // a Monday: 26 Oct
    const nov2 = cal.weeks[1][0], nov3 = cal.weeks[1][1], nov4 = cal.weeks[1][2];
    expect([nov2.done, nov2.bad]).toEqual([1, 0]);
    expect([nov3.done, nov3.bad]).toEqual([2, 2]);
    expect(nov4.done).toBe(0); // the struck one is not counted
    expect(cal.done).toBe(3);
    expect(cal.bad).toBe(2);
    expect(cal.daysWith).toBe(14);
    expect(cal.daysDone).toBe(2);
  });
  it('days before the log started and days still to come are marked, not gaps', () => {
    const cal = logCalendar({ ...log, since: day(2026, 11, 4, 6) }, [], undefined, day(2026, 11, 5), 1);
    expect(cal.weeks[0].map(d => (d.before ? 'b' : d.future ? 'f' : 'o')).join('')).toBe('bboofff');
  });
});
