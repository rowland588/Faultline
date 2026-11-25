import { describe, expect, it } from 'vitest';
import { periodKey, scheduleDue } from './schedule';

describe('London email schedule', () => {
  it('uses ISO weeks at the year boundary', () => {
    expect(periodKey('weekly', Date.parse('2025-12-29T10:00:00Z'))).toBe('2026-W01');
    expect(periodKey('weekly', Date.parse('2026-11-25T10:00:00Z'))).toBe('2026-W48');
  });
  it('waits for the London time, including British Summer Time', () => {
    expect(scheduleDue('weekly', undefined, 1, Date.parse('2026-07-06T06:59Z'), 8, 0)).toBe(false);
    expect(scheduleDue('weekly', undefined, 1, Date.parse('2026-07-06T07:00Z'), 8, 0)).toBe(true);
  });
});
