/* FC-241 part 3 — the time watched in the science, against scripts/knowledge/cases-stops-extrapolation.py (SciPy 1.x: chi2, nbinom). */
import { describe, expect, it } from 'vitest';
import { predictStops, project } from '../stopsProjection';
import { chiSquareSf, clusterTest, parseLog, parseSpans } from '../stopsCluster';

describe('the rate with its own interval', () => {
  it('6 stops in 120 min: 3 an hour, 1.1009 to 6.5297 at 95%; 17 in 2000: 0.51 an hour, 0.2971 to 0.8166', () => {
    const a = project({ watchedMin: 120, horizonMin: 480, stops: 6, minutes: 35.75, lost: 429, conf: 0.95 });
    expect(a.rate.perHour).toBeCloseTo(3, 9); expect(a.rate.lo).toBeCloseTo(1.1009, 3); expect(a.rate.hi).toBeCloseTo(6.5297, 3);
    const b = project({ watchedMin: 2000, horizonMin: 60, stops: 17, minutes: 45.85, lost: 4585, conf: 0.95 });
    expect(b.rate.perHour).toBeCloseTo(0.51, 9); expect(b.rate.lo).toBeCloseTo(0.2971, 3); expect(b.rate.hi).toBeCloseTo(0.8166, 3);
  });
});

describe('what one stretch could actually see', () => {
  it.each([
    [6, 120, 480, 0.95, 8, 52], [6, 120, 60, 0.95, 0, 8], [6, 120, 480, 0.90, 10, 47], [17, 2000, 60, 0.99, 0, 3],
    [0, 120, 480, 0.95, 0, 11], [0, 480, 480, 0.95, 0, 3], [62, 1200, 480, 0.95, 14, 37],
  ])('%i stops in %i min over %i min at %f: %i to %i stops', (n, t, h, c, lo, hi) => {
    expect(predictStops(n, t, h, c)).toEqual({ lo, hi });
  });
  it('costs it at the sample’s loss a stop: case A 8 h, 71.5 kg a stop → 572 to 3,718 kg', () => {
    const a = project({ watchedMin: 120, horizonMin: 480, stops: 6, minutes: 35.75, lost: 429, conf: 0.95 });
    expect(a.predict.loss?.lo).toBeCloseTo(572, 6); expect(a.predict.loss?.hi).toBeCloseTo(3718, 6);
  });
});

describe('no stop seen: what the watching rules out', () => {
  it('0 in 120 min: at most 1.8444 an hour, 14.756 over 8 h, 3.6889 h with none to rule out one an hour; 0 in 480: 0.4611, 3.689', () => {
    const a = project({ watchedMin: 120, horizonMin: 480, stops: 0, minutes: 0, lost: 0, conf: 0.95 });
    expect(a.none?.perHour).toBeCloseTo(1.8444, 3); expect(a.none?.overHorizon).toBeCloseTo(14.756, 2); expect(a.none?.ruleOutHours).toBeCloseTo(3.6889, 3);
    const b = project({ watchedMin: 480, horizonMin: 480, stops: 0, minutes: 0, lost: 0, conf: 0.95 });
    expect(b.none?.perHour).toBeCloseTo(0.4611, 3); expect(b.none?.overHorizon).toBeCloseTo(3.689, 2);
  });
});

describe('do the stops come in bursts', () => {
  it('χ² upper tail agrees with SciPy: D 58 on 7 df is below 1e-9; D 0.8 on 7 df is 0.997444', () => {
    expect(chiSquareSf(58, 7)).toBeLessThan(1e-9);
    expect(chiSquareSf(0.8, 7)).toBeCloseTo(0.997444, 5);
    expect(chiSquareSf(14.067, 7)).toBeCloseTo(0.05, 3);
  });
  /* a watch of eight 10-minute stretches, stops placed so the bins' counts are the cases' */
  const MIN = 60000;
  const spans = (n: number) => Array.from({ length: n }, (_, i) => ({ s: i * 100 * MIN, e: i * 100 * MIN + 10 * MIN }));
  const stopsFor = (counts: number[]) => counts.flatMap((c, bin) => Array.from({ length: c }, (_, j) => bin * 100 * MIN + (1 + (j % 8)) * MIN));
  it('evenly spread (3 in each of 8 bins) → D 0, no burst', () => {
    const c = clusterTest(stopsFor([3, 3, 3, 3, 3, 3, 3, 3]), spans(8));
    expect(c.bins).toBe(4); /* 24 stops ÷ 5 → 4 bins of two stretches: 6 each */
    expect(c.D).toBeCloseTo(0, 9); expect(c.clustered).toBe(false);
  });
  it('bursts: 10 · 0 · 0 · 0 · 12 · 0 · 1 · 1 over eight stretches → clustered', () => {
    const counts = [10, 0, 0, 0, 12, 0, 1, 1];
    const sp = spans(8); const stops = stopsFor(counts);
    /* 24 stops → k = 4 bins of two stretches */
    const c = clusterTest(stops, sp);
    expect(c.used).toBe(24); expect(c.bins).toBe(4);
    expect(c.clustered).toBe(true); expect(c.phi as number).toBeGreaterThan(1); expect(c.p as number).toBeLessThan(0.001);
  });
  it('too few stops, or watching that was only typed, says why and tests nothing', () => {
    expect(clusterTest(stopsFor([1, 1, 1]), spans(3)).why).toMatch(/about ten are needed/);
    expect(clusterTest([1, 2, 3], []).why).toMatch(/typed, not timed/);
    expect(clusterTest(stopsFor([4, 4]), spans(2)).bins).toBeUndefined();
  });
  it('a stop pressed outside any watching is not in the test and is counted apart', () => {
    const c = clusterTest([...stopsFor([6, 6, 6]), 9_999_999 * MIN], spans(3));
    expect(c.outside).toBe(1); expect(c.used).toBe(18);
  });
  it('widens the count’s interval about the count by √φ (case: n 6, φ 2.25 → 0.3028 to 16.5892)', () => {
    const w = project({ watchedMin: 120, horizonMin: 480, stops: 6, minutes: 35.75, lost: 429, conf: 0.95, phi: 2.25 });
    expect(w.count.lo).toBeCloseTo(0.3028, 3); expect(w.count.hi).toBeCloseTo(16.5892, 3); expect(w.widened).toBeCloseTo(1.5, 9);
    const plain = project({ watchedMin: 120, horizonMin: 480, stops: 6, minutes: 35.75, lost: 429, conf: 0.95 });
    expect(plain.widened).toBeUndefined();
  });
  it('parses the logs the page keeps', () => {
    expect(parseLog('100;200;x;300')).toEqual([100, 200, 300]);
    expect(parseSpans('10-20;30-25;40-50')).toEqual([{ s: 10, e: 20 }, { s: 40, e: 50 }]);
  });
});
