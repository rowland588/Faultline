/* FC-134 — complaints per million, proved against figures written from SciPy (scripts/knowledge/cases-complaints.py), never
 * against this module's own output. */
import { describe, expect, it } from 'vitest';
import { KINDS, complaintCost, cpmu, pareto, ratesDiffer, usualRange } from '../complaints';

describe('the rate and its interval', () => {
  it.each([
    [7, 1_200_000, 5.8333, 2.3453, 12.0189],
    [12, 1_250_000, 9.6, 4.9605, 16.7693],
    [3, 400_000, 7.5, 1.5467, 21.9182],
    [20, 1_200_000, 16.6667, 10.1804, 25.7403],
    [1, 50_000, 20, 0.5064, 111.4329],
    [5, 400_000, 12.5, 4.0587, 29.1708],
  ])('%i on %i units', (c, n, rate, lo, hi) => {
    const r = cpmu(c, n);
    expect(r.perMillion).toBeCloseTo(rate, 3);
    expect(r.lo).toBeCloseTo(lo, 3);
    expect(r.hi).toBeCloseTo(hi, 3);
  });
  it('none received: the lower bound is 0 and the one-sided upper is about 3 ÷ N', () => {
    const r = cpmu(0, 1_000_000);
    expect(r.perMillion).toBe(0);
    expect(r.lo).toBe(0);
    expect(r.upper).toBeCloseTo(2.9957, 3);
    expect(r.hi).toBeCloseTo(3.6889, 3);
  });
  it('a large count stays exact enough and fast', () => {
    const r = cpmu(4000, 500_000_000);
    expect(r.lo).toBeLessThan(r.perMillion);
    expect(r.hi).toBeGreaterThan(r.perMillion);
  });
});

describe('the usual range', () => {
  it('106 complaints on 14.4 million units: the usual rate and the range for a period of n units', () => {
    const a = usualRange(106, 14_400_000, 1_250_000);
    expect(a.usual).toBeCloseTo(7.3611, 4);
    expect(a.lcl).toBeCloseTo(0.081, 3);
    expect(a.ucl).toBeCloseTo(14.6412, 3);
    const b = usualRange(106, 14_400_000, 1_200_000);
    expect(b.lcl).toBe(0);                                     // cut at 0
    expect(b.ucl).toBeCloseTo(14.7913, 3);
    expect(usualRange(106, 14_400_000, 1_000_000).ucl).toBeCloseTo(15.5005, 3);
    expect(usualRange(106, 14_400_000, 400_000).ucl).toBeCloseTo(20.2306, 3);
  });
});

describe('two rates', () => {
  it.each([
    [7, 1_200_000, 12, 1_250_000, 0.4083],
    [7, 1_200_000, 30, 1_200_000, 0.000191],
    [7, 1_200_000, 3, 400_000, 0.9488],
    [7, 1_200_000, 20, 1_200_000, 0.01916],
    [30, 1_200_000, 3, 400_000, 0.0411],
  ])('%i on %i against %i on %i', (c1, n1, c2, n2, p) => {
    expect(ratesDiffer({ c: c1, n: n1 }, { c: c2, n: n2 })!).toBeCloseTo(p, p < 0.001 ? 6 : 4);
  });
  it('none in either period has nothing to compare; equal rates give p = 1', () => {
    expect(ratesDiffer({ c: 0, n: 1e6 }, { c: 0, n: 1e6 })).toBeUndefined();
    expect(ratesDiffer({ c: 5, n: 1e6 }, { c: 5, n: 1e6 })).toBe(1);
  });
});

describe('the Pareto', () => {
  const counts = (xs: number[]) => KINDS.map((k, i) => ({ ...k, count: xs[i] ?? 0 }));
  it('5 · 3 · 2 · 1 · 1 on 1.25 million units', () => {
    const p = pareto(counts([5, 3, 2, 1, 1, 0]), 1_250_000);
    expect(p.map(r => r.label)).toEqual(['Foreign body', 'Packaging or seal', 'Taste, smell or condition', 'Quantity or weight', 'Labelling or date code']);
    expect(p.map(r => +(r.share * 100).toFixed(2))).toEqual([41.67, 25, 16.67, 8.33, 8.33]);
    expect(p.map(r => +(r.cum * 100).toFixed(2))).toEqual([41.67, 66.67, 83.33, 91.67, 100]);
    expect(p.map(r => +r.perMillion.toFixed(2))).toEqual([4, 2.4, 1.6, 0.8, 0.8]);
  });
  it('a tie keeps the order the kinds are listed in; kinds at zero are left out', () => {
    const p = pareto(counts([0, 2, 0, 2, 1, 0]), 1e6);
    expect(p.map(r => r.id)).toEqual(['packaging', 'quantity', 'labelling']);
  });
  it('none at all gives no rows', () => {
    expect(pareto(counts([0, 0, 0, 0, 0, 0]), 1e6)).toEqual([]);
  });
});

describe('money', () => {
  it('12 complaints at £85 on 1.25 million units', () => {
    const m = complaintCost(12, 1_250_000, 85);
    expect(m.total).toBe(1020);
    expect(m.perMillionUnits).toBeCloseTo(816, 6);
    expect(m.perUnitPence).toBeCloseTo(0.0816, 6);
  });
});
