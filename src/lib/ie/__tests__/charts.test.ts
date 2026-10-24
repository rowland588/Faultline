/* The chart arithmetic against SciPy (scripts/knowledge/cases-spc.py, cases-w2.py; knowledge/specs/FC-086-charts.md §6). */
import { describe, it, expect } from 'vitest';
import { CHART_CONSTANTS, c4Of, xmrLimits, subgroupLimits, nelson, cusum, ewma, levene, runsAboutMedian, mannKendall, WESTERN_ELECTRIC } from '../charts';

const FORTY = [400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6, 399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0, 399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8, 400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9];

describe('W2 — the constants and the limits', () => {
  it('the table agrees with d₂ and c₄ re-derived', () => {
    expect(3 / CHART_CONSTANTS[2].d2).toBeCloseTo(2.66, 2);
    expect(CHART_CONSTANTS[4].A2).toBeCloseTo(3 / (2.059 * 2), 2);
    expect(c4Of(4)).toBeCloseTo(0.9213, 3); expect(c4Of(2)).toBeCloseTo(0.7979, 3); expect(c4Of(11)).toBeCloseTo(CHART_CONSTANTS[11].c4, 3);
  });
  it('XmR frozen on the first twenty: centre 399.750, MR̄ 0.6632, limits 397.986–401.514, MR UCL 2.167', () => {
    const l = xmrLimits(FORTY.slice(0, 20))!;
    expect(l.centre).toBeCloseTo(399.75, 3); expect(l.mrBar).toBeCloseTo(0.6632, 3);
    expect(l.lcl).toBeCloseTo(397.986, 2); expect(l.ucl).toBeCloseTo(401.514, 2); expect(l.mrUcl).toBeCloseTo(2.167, 2);
    expect(xmrLimits([1])).toBeUndefined();
  });
  it('X̄-R on six subgroups of four: X̿ 400.2375, R̄ 0.7333, limits 399.703–400.772, R to 1.673; subgroup 4 outside', () => {
    const G = [[400.2, 399.8, 400.5, 400.1], [399.9, 400.4, 400.0, 399.6], [400.3, 400.1, 399.7, 400.6], [400.8, 401.2, 400.9, 401.5], [400.0, 399.5, 400.2, 399.9], [400.4, 400.0, 400.3, 399.8]];
    const l = subgroupLimits(G, 4)!;
    expect(l.kind).toBe('R'); expect(l.grand).toBeCloseTo(400.2375, 4); expect(l.spreadBar).toBeCloseTo(0.7333, 3);
    expect(l.lcl).toBeCloseTo(399.703, 2); expect(l.ucl).toBeCloseTo(400.772, 2); expect(l.spreadLcl).toBe(0); expect(l.spreadUcl).toBeCloseTo(1.673, 2);
    expect(401.1 > l.ucl).toBe(true);
    expect(subgroupLimits([...G, [400.1, 400.2]], 4)!.groups).toBe(6);   // the short subgroup left out
    expect(subgroupLimits(Array.from({ length: 4 }, (_, g) => Array.from({ length: 12 }, (_, i) => 400 + ((g * 12 + i) % 5) * 0.1)), 12)!.kind).toBe('S');
  });
});

describe('W2 — the signals (Nelson 1984, Western Electric)', () => {
  const l = xmrLimits(FORTY.slice(0, 20))!;
  it('against the frozen limits the shifted twenty fire: beyond at 35 and 38, eight above from 28', () => {
    const s = nelson(FORTY, l.centre, l.sigma, WESTERN_ELECTRIC);
    expect(s.filter(x => x.rule === 'beyond').map(x => x.points[0])).toEqual([35, 38]);
    const run = s.find(x => x.rule === 'run')!;
    expect(run.points[0]).toBe(28); expect(run.side).toBe('above');
    expect(s.filter(x => x.rule === 'run').length).toBe(1);   // one run, said once
  });
  it('a trend of six and fifteen inside fire only when asked', () => {
    const trend = [0, 1, 2, 3, 4, 5, 6, 3, 2, 1].map(v => 400 + v * 0.2);
    expect(nelson(trend, 400.6, 1, WESTERN_ELECTRIC).some(x => x.rule === 'trend')).toBe(false);
    expect(nelson(trend, 400.6, 1, ['trend']).find(x => x.rule === 'trend')!.points).toEqual([1, 2, 3, 4, 5, 6, 7]);   // the rise goes on to the seventh
    const flat = Array.from({ length: 16 }, (_, i) => 400 + (i % 2 ? 0.1 : -0.1));
    expect(nelson(flat, 400, 1, ['inside']).find(x => x.rule === 'inside')!.points.length).toBe(15);
    expect(nelson(flat, 400, 1, ['alternate']).some(x => x.rule === 'alternate')).toBe(true);
  });
  it('2 of 3 and 4 of 5 on one side', () => {
    expect(nelson([0, 2.5, 0.5, 2.6], 0, 1).find(x => x.rule === '2of3')!.points).toEqual([2, 3, 4]);
    expect(nelson([1.2, 1.3, 0.2, 1.1, 1.4], 0, 1).find(x => x.rule === '4of5')!.points).toEqual([1, 2, 3, 4, 5]);
    expect(nelson([0, 2.5, 0.5, -2.6], 0, 1).some(x => x.rule === '2of3')).toBe(false);
  });
});

describe('W2 — CUSUM and EWMA (cases-spc.py: a +1.0 g shift from reading 21)', () => {
  it('K 0.4, H 4.0 signals at 38 with C⁺ 4.8; since about 28; the level near 401', () => {
    const c = cusum(FORTY, 400, 0.4, 4.0);
    expect(c.signal).toBe(38); expect(c.side).toBe('above'); expect(c.plus[37]).toBeCloseTo(4.8, 1);
    expect(c.since).toBeGreaterThanOrEqual(21); expect(c.since).toBeLessThanOrEqual(30);
    expect(c.level).toBeGreaterThan(400.6); expect(c.level).toBeLessThan(401.4);
    expect(cusum(FORTY.slice(0, 20), 400, 0.4, 4.0).signal).toBeUndefined();
  });
  it('EWMA λ 0.2, L 2.962 on σ 0.8: half-width 0.79, signals at 38 with z 400.89', () => {
    const e = ewma(FORTY, 400, 0.8);
    expect(e.upper[39] - 400).toBeCloseTo(0.79, 2); expect(e.signal).toBe(38); expect(e.z[37]).toBeCloseTo(400.89, 2);
  });
});

describe('W2 — Levene, the runs about the median, Mann–Kendall and Sen', () => {
  it('two products’ deviations: W 0.045, p 0.83 — alike', () => {
    const A = [0.0, 1.5, 1.3, -0.6, -0.3, -0.6, 0.6, -0.1, 0.8, -2.0, 1.7, -0.1], B = [0.9, -0.2, -0.5, 0.6, 1.1, -0.3, -0.2, 0.9, -1.1, -2.0];
    const l = levene([A, B])!;
    expect(l.w).toBeCloseTo(0.045, 2); expect(l.p).toBeCloseTo(0.83, 1);
    expect(levene([A.map(x => x * 4), B])!.p).toBeLessThan(0.05);
  });
  it('the runs table: n 12 → fewer than 4; n 20 → fewer than 7; the twelve weekly rates have 4 runs', () => {
    const rr = [2.1, 2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2];
    const r = runsAboutMedian(rr)!;
    expect(r.runs).toBe(4); expect(r.fewest).toBe(4); expect(r.signal).toBe(false);
    expect(runsAboutMedian(Array.from({ length: 20 }, (_, i) => (i % 2 ? 1 : -1) * (1 + i / 100)))!.fewest).toBe(7);
    expect(runsAboutMedian([1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3])!).toMatchObject({ runs: 2, fewest: 4, signal: true });   // a step: two runs on twelve
    expect(runsAboutMedian([1, 1, 1, 2, 2, 2, 3, 3, 3])!.signal).toBe(false);   // three and three: no count of runs can be a signal
  });
  it('Mann–Kendall on the twelve rates: S 52, τ 0.788, p 0.0001; Sen’s slope 0.100 a week', () => {
    const mk = mannKendall([2.1, 2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2])!;
    expect(mk.s).toBe(52); expect(mk.tau).toBeCloseTo(0.788, 2); expect(mk.p).toBeLessThan(0.001); expect(mk.slope).toBeCloseTo(0.1, 3);
    expect(mannKendall([2, 2.1, 2, 1.9, 2.1, 2, 2, 1.9, 2.1, 2])!.p).toBeGreaterThan(0.3);
    expect(mannKendall([1, 2, 3])).toBeUndefined();
  });
});
