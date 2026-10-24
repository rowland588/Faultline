/* W3a's arithmetic against SciPy's printed figures (scripts/knowledge/cases-w3a.py) — every expected number below was
 * produced there, never by this code (knowledge/specs/FC-105-analysis.md §6). */
import { describe as suite, it, expect } from 'vitest';
import { describe } from '../describe';
import {
  acf, autocorrelation, chi2Quantile, cyclesNeeded, differenceSeen, finiteN, mannWhitney, marginAchieved, meanInterval, nForMean, nForShare,
  nForTwoMeans, nForTwoShares, nZeroFailures, pairedT, powerTwoMeans, rateInterval, shareExact, shareWilson, spreadInterval, tCdf, tQuantile,
  twoShares, welch, wilcoxon,
} from '../stats';

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const near = (a: number | undefined, b: number, tol: number) => expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);

suite('the distributions', () => {
  it('Student’s t and χ² against known critical values', () => {
    near(tQuantile(0.975, 29), 2.0452, 1e-4); near(tQuantile(0.95, 29), 1.6991, 1e-4); near(tQuantile(0.995, 29), 2.7564, 1e-4);
    near(tQuantile(0.975, 1), 12.7062, 1e-3); near(tCdf(2.0452, 29), 0.975, 1e-5);
    near(chi2Quantile(0.975, 29), 45.722, 1e-2); near(chi2Quantile(0.025, 29), 16.047, 1e-2);
  });
});
suite('describing the thirty packs (FC-103)', () => {
  const d = describe(THIRTY)!;
  it('centre, spread, quartiles, shape', () => {
    expect(d.n).toBe(30); near(d.mean, 401.1967, 1e-4); near(d.median, 401.2, 1e-9); near(d.sd, 0.5986, 1e-4);
    expect([d.min, d.max]).toEqual([400.1, 402.6]); near(d.q1, 400.8, 1e-9); near(d.q3, 401.6, 1e-9); near(d.iqr, 0.8, 1e-9);
    near(d.g1, 0.1418, 1e-4); near(d.g2, -0.3823, 1e-4); near(d.cv, 0.149, 1e-3);
  });
  it('the fences and no outlier; a wild reading is flagged, not removed', () => {
    near(d.fences.lo, 399.6, 1e-9); near(d.fences.hi, 402.8, 1e-9); expect(d.outliers).toEqual([]);
    const w = describe([...THIRTY, 410])!; expect(w.outliers).toEqual([{ value: 410, at: 30 }]); expect(w.n).toBe(31);
  });
  it('too few readings say nothing', () => { expect(describe([1])).toBeUndefined(); expect(describe([3, 3, 3])!.g1).toBeUndefined(); });
});
suite('how sure (FC-104)', () => {
  const n = 30, m = 401.1967, s = 0.5986;
  it('the mean’s interval at 90, 95 and 99%', () => {
    for (const [c, lo, hi] of [[0.9, 401.011, 401.3823], [0.95, 400.9732, 401.4202], [0.99, 400.8954, 401.4979]] as const) {
      const i = meanInterval(n, m, s, c); near(i.lo, lo, 2e-4); near(i.hi, hi, 2e-4);
    }
  });
  it('the spread’s interval', () => {
    for (const [c, lo, hi] of [[0.9, 0.4941, 0.766], [0.95, 0.4767, 0.8046], [0.99, 0.4456, 0.8898]] as const) {
      const i = spreadInterval(n, s, c); near(i.lo, lo, 2e-4); near(i.hi, hi, 3e-4);
    }
  });
  it('a share, exact and Wilson, including the edges', () => {
    const cases: [number, number, number, number, number, number][] = [[7, 600, 0.0047, 0.02389, 0.00566, 0.02388], [0, 50, 0, 0.07112, 0, 0.07135],
      [3, 20, 0.03207, 0.37893, 0.05237, 0.36042], [20, 20, 0.83157, 1, 0.83887, 1]];
    for (const [k, N, elo, ehi, wlo, whi] of cases) {
      const e = shareExact(k, N, 0.95), w = shareWilson(k, N, 0.95);
      near(e.lo, elo, 2e-5); near(e.hi, ehi, 2e-5); near(w.lo, wlo, 2e-5); near(w.hi, whi, 2e-5);
    }
    const e99 = shareExact(7, 600, 0.99); near(e99.lo, 0.00341, 2e-5); near(e99.hi, 0.02832, 2e-5);
  });
  it('a rate per hour', () => {
    const a = rateInterval(12, 40, 0.95); near(a.lo, 0.15501, 1e-4); near(a.hi, 0.52404, 1e-4);
    const z = rateInterval(0, 40, 0.95); expect(z.lo).toBe(0); near(z.hi, 0.09222, 1e-4);
    const o = rateInterval(1, 8, 0.95); near(o.lo, 0.00316, 1e-4); near(o.hi, 0.69646, 1e-4);
  });
});
suite('did it change — measured (FC-105)', () => {
  const B = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7];
  const A = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
  it('Welch’s t', () => {
    const w = welch(B, A, 0.95)!;
    near(w.meanBefore, 12.8083, 1e-4); near(w.sdBefore, 0.3476, 1e-4); near(w.meanAfter, 12.3083, 1e-4); near(w.sdAfter, 0.2429, 1e-4);
    near(w.t, -4.0842, 1e-4); near(w.df, 19.6754, 1e-3); near(w.p, 0.000594, 2e-6); near(w.diff, -0.5, 1e-9); near(w.lo, -0.7556, 1e-4); near(w.hi, -0.2444, 1e-4);
  });
  it('nothing to test with no spread or too few', () => { expect(welch([1, 1, 1], [1, 1, 1], 0.95)).toBeUndefined(); expect(welch([1], [2, 3], 0.95)).toBeUndefined(); });
});

suite('Mann–Whitney (FC-105)', () => {
  const B = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7];
  const A = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
  it('ties send it to the normal with the corrections', () => {
    const m = mannWhitney(B, A)!; expect(m.exact).toBe(false); expect(m.u).toBe(17.5); near(m.p, 0.001769, 5e-6);
  });
  it('exact where nothing is tied', () => {
    const b = [14.12, 14.35, 13.98, 14.6, 14.22, 14.48, 14.05, 14.31], a = [13.91, 14.02, 13.87, 14.18, 13.95, 14.27, 13.8, 14.09];
    const m = mannWhitney(b, a)!; expect(m.exact).toBe(true); expect(m.u).toBe(10); near(m.p, 0.020668, 2e-6);
    const s = mannWhitney([5.1, 6.3, 7.2], [8.4, 9.1, 10.2, 9.7])!; expect(s.exact).toBe(true); expect(s.u).toBe(12); near(s.p, 0.057143, 2e-6);
  });
  it('ten against eleven with ties, and thirty a side', () => {
    const t = mannWhitney([5, 6, 6, 7, 8, 8, 9, 10, 10, 11], [4, 5, 5, 6, 6, 7, 7, 8, 9, 9, 10])!; expect(t.u).toBe(38); near(t.p, 0.240643, 5e-6);
    const bb = [108.2, 89.8, 101.7, 97.7, 98.2, 99.1, 91.9, 99.1, 96.5, 113.3, 100.9, 98.6, 98.9, 97.3, 95.8, 98.4, 101.9, 99.0, 103.8, 99.2, 100.1, 106.2, 102.2, 98.0, 99.3, 102.2, 107.7, 98.9, 99.0, 104.0];
    const aa = [93.4, 95.3, 102.7, 98.6, 89.4, 96.0, 93.5, 96.6, 89.6, 97.0, 96.9, 102.3, 97.3, 98.0, 90.0, 105.0, 88.3, 100.4, 94.7, 92.5, 93.4, 93.3, 97.5, 95.6, 101.9, 88.7, 96.0, 92.4, 99.1, 87.5];
    const m = mannWhitney(bb, aa)!; expect(m.u).toBe(192); near(m.p, 0.00014, 2e-6); near(welch(bb, aa, 0.95)!.p, 0.000148, 2e-6);
  });
});
suite('did it change — counted (FC-105)', () => {
  it('the pooled z and Fisher’s exact, and which leads', () => {
    const a = twoShares(14, 400, 5, 380)!; near(a.z, -1.9779, 1e-4); near(a.pZ, 0.047945, 2e-6); near(a.pFisher, 0.062015, 2e-6); near(a.expectedMin, 9.26, 0.01); expect(a.leads).toBe('z');
    const b = twoShares(3, 40, 0, 45)!; near(b.pZ, 0.061425, 2e-6); near(b.pFisher, 0.10003, 2e-6); near(b.expectedMin, 1.41, 0.01); expect(b.leads).toBe('fisher');
    const c = twoShares(60, 1000, 40, 1000)!; near(c.pZ, 0.040174, 2e-6); near(c.pFisher, 0.05076, 2e-6); expect(c.leads).toBe('z');
  });
  it('refuses nonsense', () => { expect(twoShares(5, 0, 1, 10)).toBeUndefined(); expect(twoShares(11, 10, 1, 10)).toBeUndefined(); });
});
suite('the same items two ways (FC-106)', () => {
  const P1 = [401.2, 400.8, 402.1, 399.9, 401.5, 400.4, 401.9, 400.7, 401.1, 402.4, 400.2, 401.6];
  const P2 = [401.6, 401.1, 402.2, 400.5, 401.9, 400.3, 402.5, 401.2, 401.4, 402.9, 400.8, 402.1];
  it('the paired t', () => {
    const r = pairedT(P2.map((v, i) => v - P1[i]), 0.95)!;
    near(r.mean, 0.3917, 1e-4); near(r.sd, 0.2151, 1e-4); near(r.t, 6.3063, 1e-3); expect(r.df).toBe(11); near(r.p, 0.000058, 1e-6); near(r.lo, 0.255, 1e-3); near(r.hi, 0.5284, 1e-3);
    expect([r.higher, r.lower]).toEqual([11, 1]);
  });
  it('Wilcoxon: the twelve differences tie, so the normal with continuity', () => {
    const w = wilcoxon(P2.map((v, i) => v - P1[i]))!; expect(w.exact).toBe(false); expect(w.w).toBe(1.5); near(w.p, 0.003558, 5e-6);
  });
  it('Wilcoxon exact, no ties', () => {
    const w = wilcoxon([0.31, -0.12, 0.45, 0.22, 0.58, 0.07, 0.36, -0.04, 0.27, 0.51])!; expect(w.exact).toBe(true); expect(w.w).toBe(4); near(w.p, 0.013672, 2e-6);
    near(pairedT([0.31, -0.12, 0.45, 0.22, 0.58, 0.07, 0.36, -0.04, 0.27, 0.51], 0.95)!.p, 0.006188, 2e-6);
  });
  it('zeros are dropped and the normal is used', () => {
    const Q1 = [5.1, 4.8, 5.6, 5.0, 5.3, 4.9, 5.7, 5.2, 5.4, 5.0, 5.5, 4.7, 5.8, 5.1], add = [0.2, -0.1, 0.3, 0.2, 0, 0.4, 0.2, 0.3, 0, 0.2, 0.4, 0.1, 0.3, 0.2];
    const d = Q1.map((v, i) => Math.round((v + add[i] - v) * 100) / 100);
    const w = wilcoxon(d)!; expect(w.zeros).toBe(2); expect(w.exact).toBe(false); expect(w.w).toBe(1.5); near(w.p, 0.003368, 5e-6);
    const t = pairedT(d, 0.95)!; near(t.t, 4.8374, 1e-3); near(t.p, 0.000324, 2e-6);
  });
  it('no spread in the differences, or one pair, is refused', () => { expect(pairedT([0.5, 0.5, 0.5], 0.95)).toBeUndefined(); expect(pairedT([0.5], 0.95)).toBeUndefined(); expect(wilcoxon([0, 0])).toBeUndefined(); });
});
suite('how many readings (FC-113, FC-020)', () => {
  it('a mean: the normal’s count and Student’s', () => { const n = nForMean(0.9, 0.3); expect(n.z).toBe(35); expect(n.t).toBe(38); near(n.zRaw, 34.57, 0.01); });
  it('two means: the approximation, the exact count and the power at a group size', () => {
    const n = nForTwoMeans(0.5, 0.9); near(n.approx, 50.86, 0.01); expect(n.exact).toBe(52);
    near(powerTwoMeans(52, 0.5, 0.9), 0.80124, 5e-5); near(powerTwoMeans(51, 0.5, 0.9), 0.7934, 2e-4); near(powerTwoMeans(20, 0.5, 0.9), 0.40236, 5e-5); near(powerTwoMeans(10, 0.5, 0.9), 0.21757, 5e-5);
    expect(nForTwoMeans(0.5, 0.9, 0.95, 0.9).exact).toBe(70);
  });
  it('shares, two shares, finite population and zero failures', () => {
    expect(nForShare(0.1, 0.02)).toBe(865); expect(nForShare(0.5, 0.02)).toBe(2401); expect(nForShare(0.15, 0.03)).toBe(545);
    expect(nForTwoShares(0.1, 0.05)).toBe(435); expect(nForTwoShares(0.035, 0.013)).toBe(759);
    expect(finiteN(865, 500)).toBe(317); expect(nZeroFailures(0.01, 0.95)).toBe(299);
  });
  it('the margin achieved and the difference a study could see', () => { near(marginAchieved(30, 0.599), 0.2237, 1e-4); near(differenceSeen(20, 0.9), 0.7973, 1e-3); });
  it('the cycles to time', () => {
    const c = cyclesNeeded([12.1, 12.8, 11.6, 13.0, 12.4], 0.05)!; near(c.z, 3.13, 0.01); expect(c.n).toBe(6); near(c.marginNow, 0.6936, 1e-3); near(c.marginPct, 5.6, 0.01);
    expect(cyclesNeeded([12.1, 12.8, 11.6, 13.0, 12.4], 0.1)!.n).toBe(4); expect(cyclesNeeded([12.1, 12.8, 11.6, 13.0, 12.4], 0.02)!.n).toBe(23);
    expect(cyclesNeeded([12], 0.05)).toBeUndefined();
  });
});
suite('readings too close together (FC-115)', () => {
  const AR = [399.6, 399.1, 399.33, 399.81, 400.45, 400.33, 399.92, 399.56, 400.11, 400.88, 400.67, 399.78, 399.39, 400.43, 400.36, 399.35, 399.57, 399.16, 399.18, 399.26,
    399.2, 399.8, 399.85, 399.61, 399.97, 400.4, 399.42, 399.52, 399.22, 399.45, 399.02, 399.42, 399.64, 399.63, 399.25, 399.35, 399.07, 398.76, 399.37, 399.07];
  const IND = [400.53, 400.89, 398.72, 399.93, 400.51, 400.68, 400.33, 400.75, 400.14, 400.28, 400.09, 399.46, 399.58, 400.19, 399.71, 400.64, 400.65, 400.9, 399.99, 400.69,
    399.55, 399.59, 400.04, 400.14, 399.2, 399.13, 400.18, 399.57, 400.6, 400.2, 400.15, 400.1, 400.45, 399.92, 400.54, 399.74, 399.89, 399.66, 400.3, 400.02];
  it('r₁, r₂, r₃ against the band, Durbin–Watson, the shrink and the effective count', () => {
    const a = autocorrelation(AR)!;
    near(a.r1, 0.5474, 1e-4); near(a.r2, 0.1937, 1e-4); near(a.r3, 0.1456, 1e-4); near(a.band, 0.3162, 1e-4); near(a.durbinWatson, 0.8728, 1e-4); near(a.effective, 11.7, 0.01); near(a.shrink, 0.6728, 1e-4);
    expect(a.enough).toBe(true); expect(a.dependent).toBe(true);
  });
  it('sample every 2nd: the thinned series is inside its own band', () => { const a = autocorrelation(AR)!; expect(a.every!.m).toBe(2); expect(a.every!.n).toBe(20); near(a.every!.r1, 0.223, 1e-3); near(acf(AR.filter((_, i) => i % 3 === 0), 1), 0.1983, 1e-4); });
  it('an independent set says nothing, twenty readings are not judged', () => {
    const i = autocorrelation(IND)!; near(i.r1, 0.0861, 1e-4); expect(i.dependent).toBe(false); expect(i.every).toBeUndefined();
    const s = autocorrelation(AR.slice(0, 20))!; near(s.r1, 0.4952, 1e-4); expect(s.enough).toBe(false); expect(s.dependent).toBe(false);
  });
  it('no spread, too few: nothing', () => { expect(autocorrelation([5, 5, 5, 5, 5])).toBeUndefined(); expect(autocorrelation([1, 2, 3])).toBeUndefined(); });
});
