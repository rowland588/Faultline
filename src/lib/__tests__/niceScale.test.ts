import { describe, it, expect } from 'vitest';
import { niceScale } from '../niceScale';

describe('a chart scale in round numbers', () => {
  it('turns 29.05 / 43.5 / 57.95 into tens', () => {
    const s = niceScale(32, 55);
    expect(s.ticks.every(t => t % 5 === 0)).toBe(true);
    expect(s.min).toBeLessThanOrEqual(32);
    expect(s.max).toBeGreaterThanOrEqual(55);
  });
  it('never goes below zero for a measure that cannot', () => {
    expect(niceScale(1, 4).min).toBe(0);
  });
  it('gives a flat series a band, and small numbers clean decimals', () => {
    expect(niceScale(5, 5).ticks.length).toBeGreaterThan(1);
    expect(niceScale(0.1, 0.4).ticks.every(t => String(t).length <= 4)).toBe(true);
  });
});
