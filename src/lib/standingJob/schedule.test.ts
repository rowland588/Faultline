import { describe, expect, it } from 'vitest';
import { periodKey, scheduleDue, nextRunAt, londonClockOn } from './schedule';

describe('London email schedule', () => {
  it('uses ISO weeks at the year boundary', () => {
    expect(periodKey('weekly', Date.parse('2025-12-29T10:00:00Z'))).toBe('2026-W01');
    expect(periodKey('weekly', Date.parse('2026-11-25T10:00:00Z'))).toBe('2026-W48');
  });
  it('waits for the London time, including British Summer Time', () => {
    expect(scheduleDue('weekly', undefined, 1, Date.parse('2026-07-06T06:59Z'), 8, 0)).toBe(false);
    expect(scheduleDue('weekly', undefined, 1, Date.parse('2026-07-06T07:00Z'), 8, 0)).toBe(true);
  });
  it('next run is the next London clock, including summer time', () => {
    expect(londonClockOn('2026-07-06', 8, 0)).toBe(Date.parse('2026-07-06T07:00:00Z'));
    expect(nextRunAt('weekly', 1, 8, 0, undefined, Date.parse('2026-07-06T06:59:00Z'))).toBe(Date.parse('2026-07-06T07:00:00Z'));
    expect(nextRunAt('daily', 1, 7, 0, '2026-11-24', Date.parse('2026-11-24T19:00:00Z'))).toBe(londonClockOn('2026-11-25', 7, 0));
  });
});
