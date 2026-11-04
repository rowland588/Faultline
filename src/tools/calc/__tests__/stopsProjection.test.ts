/* FC-241 part 2 — the Garwood bounds and the carried-forward figures against SciPy (scripts/knowledge/cases-stops-extrapolation.py) */
import { describe, expect, it } from 'vitest';
import { firmness, garwood, project, stopsForPrecision } from '../stopsProjection';

describe('the exact Poisson interval, as SciPy gives it', () => {
  for (const [conf, n, lo, hi] of [[0.9, 6, 2.613, 11.8424], [0.95, 6, 2.2019, 13.0595], [0.99, 6, 1.5369, 15.6597], [0.95, 12, 6.2006, 20.9616], [0.95, 62, 47.535, 79.4812], [0.95, 0, 0, 3.6889], [0.9, 0, 0, 2.9957]] as const) {
    it(`${n} stops at ${conf * 100}%`, () => {
      const g = garwood(n, conf);
      expect(g.lo).toBeCloseTo(lo, 3);
      expect(g.hi).toBeCloseTo(hi, 3);
    });
  }
});

describe('stops for ±25% and ±50%, by the exact interval (SciPy)', () => {
  it('48, 66 and 111 for Firm at 90, 95 and 99%', () => {
    expect([0.9, 0.95, 0.99].map(c => stopsForPrecision(0.25, c))).toEqual([48, 66, 111]);
  });
  it('13, 18 and 29 for Fair', () => {
    expect([0.9, 0.95, 0.99].map(c => stopsForPrecision(0.5, c))).toEqual([13, 18, 29]);
  });
  it('the stops it advises give the word it promises', () => {
    for (const c of [0.9, 0.95, 0.99]) { const n = stopsForPrecision(0.25, c), g = garwood(n, c), h = garwood(n - 1, c); expect(firmness((g.hi - g.lo) / 2 / n)).toBe('Firm'); expect(firmness((h.hi - h.lo) / 2 / (n - 1))).not.toBe('Firm'); }
  });
});

describe('carrying case A forward: four workstations watched 120 min, 6 stops, 35.75 min, 429 kg', () => {
  const base = { watchedMin: 120, stops: 6, minutes: 35.75, lost: 429, conf: 0.95 };
  it('8 hours is 1,716 kg, 629.7 to 3,735.0, Rough, 66 stops and 1,200 minutes more', () => {
    const p = project({ ...base, horizonMin: 480 });
    expect(p.lost).toBeCloseTo(1716, 6);
    expect(p.range?.lo).toBeCloseTo(629.7, 1);
    expect(p.range?.hi).toBeCloseTo(3735.0, 0);
    expect(p.relHalf).toBeCloseTo(0.9048, 3);
    expect(p.firm).toBe('Rough');
    expect(p.need?.stops).toBe(66);
    expect(p.need?.watchMore).toBeCloseTo(1200, 6);
  });
  it('1 hour is 214.5 kg, 78.7 to 466.9', () => {
    const p = project({ ...base, horizonMin: 60 });
    expect(p.lost).toBeCloseTo(214.5, 6);
    expect(p.range?.lo).toBeCloseTo(78.7, 1);
    expect(p.range?.hi).toBeCloseTo(466.9, 1);
  });
  it('watching longer at the same rate narrows the range (10 times the sample)', () => {
    const a = project({ ...base, horizonMin: 480 });
    const b = project({ watchedMin: 1200, stops: 60, minutes: 357.5, lost: 4290, conf: 0.95, horizonMin: 480 });
    expect(b.lost).toBeCloseTo(a.lost, 6);
    expect((b.range!.hi - b.range!.lo)).toBeLessThan((a.range!.hi - a.range!.lo) / 2);
    expect(b.relHalf!).toBeLessThan(a.relHalf!);
  });
  it('no stops: only the count’s upper bound, no range', () => {
    const p = project({ watchedMin: 60, horizonMin: 480, stops: 0, minutes: 0, lost: 0, conf: 0.95 });
    expect(p.range).toBeUndefined();
    expect(p.count.hi).toBeCloseTo(3.6889, 3);
    expect(p.noRange).toMatch(/no stop has been seen/);
  });
  it('minutes without stops counted: the point figure, no range, and why', () => {
    const p = project({ ...base, stops: 0, horizonMin: 480, stopsMissing: true });
    expect(p.range).toBeUndefined();
    expect(p.noRange).toMatch(/no stops counted/);
  });
  it('words for firmness', () => {
    expect([0.2, 0.25, 0.4, 0.51].map(firmness)).toEqual(['Firm', 'Firm', 'Fair', 'Rough']);
  });
});
