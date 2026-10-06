import { describe, it, expect } from 'vitest';
import { hoursTally, fullDays, daysWord, hoursWord, partsWord, dayLength } from '../hoursLost';
import type { TestItem } from '../testing';

let n = 0;
const found = (hours: number, what: string, move?: [string, string], extra: Partial<TestItem> = {}): TestItem => {
  n++;
  return { id: `i${n}`, projectId: 'p', testId: 's1', kind: 'found', what, hoursLost: hours,
    ...(move ? { movedFrom: move[0], movedTo: move[1] } : {}), sort: n, createdAt: n, updatedAt: n, ...extra } as TestItem;
};

/* Rowland: "2 hours here, 1 hour there, 5 hours here maybe ... that was one
   day fully missed, or half a day." */
describe('hours lost add up into days', () => {
  it('2 h, then 1 h, banks 3 h towards an 8-hour day', () => {
    const t = hoursTally('s1', [found(2, 'Guard bracket wrong'), found(1, 'Waiting on air')], 8);
    expect(t.hours).toBe(3);
    expect(t.banked).toBe(3);
    expect(t.pushedDays).toBe(0);
    expect(t.pending.map(p => p.what)).toEqual(['Guard bracket wrong', 'Waiting on air']);
    expect(fullDays(t.banked, 5, 8)).toBe(1);   // 5 more makes the day
    expect(fullDays(t.banked, 4, 8)).toBe(0);
  });

  it('the problem that tips it carries the push, and its parts are the hours that made it', () => {
    const items = [found(2, 'Guard bracket wrong'), found(1, 'Waiting on air'), found(5, 'Guard remade', ['2026-10-12', '2026-10-13'])];
    const t = hoursTally('s1', items, 8);
    expect(t.pushedDays).toBe(1);
    expect(t.banked).toBe(0);
    expect(t.pending).toEqual([]);
    const parts = t.pushes.get(items[2].id)!;
    expect(parts.map(p => p.hours)).toEqual([2, 1, 5]);
    expect(partsWord(parts)).toBe('8 h lost — Guard bracket wrong 2 h; Waiting on air 1 h; Guard remade 5 h');
  });

  it('what a push did not use stays banked', () => {
    const t = hoursTally('s1', [found(10, 'Drive fault', ['2026-10-12', '2026-10-13'])], 8);
    expect(t.banked).toBe(2);
    expect(fullDays(t.banked, 6, 8)).toBe(1);
  });

  it('counts the job’s own working day, and only live problems on this stage', () => {
    const items = [found(6, 'Air'), found(6, 'Elsewhere', undefined, { testId: 's2' }), found(6, 'Taken off', undefined, { deletedAt: 9 })];
    expect(hoursTally('s1', items, 12).banked).toBe(6);
    expect(fullDays(6, 6, 12)).toBe(1);
    expect(dayLength({})).toBe(8);
    expect(dayLength({ dayHours: 12 })).toBe(12);
  });

  it('says hours and days in words', () => {
    expect(hoursWord(0.5)).toBe('30 min');
    expect(hoursWord(2)).toBe('2 h');
    expect(hoursWord(1.5)).toBe('1.5 h');
    expect(daysWord(4, 8)).toBe('half a day');
    expect(daysWord(2, 8)).toBe('a quarter of a day');
    expect(daysWord(8, 8)).toBe('1 day');
    expect(daysWord(10, 8)).toBe('1¼ days');
    expect(daysWord(16, 8)).toBe('2 days');
    expect(daysWord(0.5, 8)).toBe('under a quarter of a day');
    expect(daysWord(3, 8)).toBe('about half a day');
    expect(daysWord(8.5, 8)).toBe('about 1 day');
  });
});
