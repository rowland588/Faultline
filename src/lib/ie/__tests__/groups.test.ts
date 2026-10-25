/* W3b's several-groups arithmetic against SciPy's printed figures (scripts/knowledge/cases-w3b.py) — every expected number
 * below was produced there, never by this code (knowledge/specs/FC-107-groups-tables-relations.md §6). */
import { describe as suite, it, expect } from 'vitest';
import { compareGroups, kruskalWallis, studentizedRangeCdf, studentizedRangeQuantile } from '../groups';

const near = (a: number | undefined, b: number, tol: number) => expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);
const A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2], B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6], C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1];
const shifts = [{ name: 'A', values: A }, { name: 'B', values: B }, { name: 'C', values: C }];

suite('the studentised range', () => {
  it('its cdf and its 95% critical values against SciPy', () => {
    near(studentizedRangeCdf(3.5, 3, 21), 0.945105, 2e-6); near(studentizedRangeCdf(5, 5, 12), 0.972432, 2e-6);
    near(studentizedRangeQuantile(0.95, 3, 21), 3.5646, 1e-3); near(studentizedRangeQuantile(0.95, 4, 56), 3.7447, 1e-3);
    near(studentizedRangeQuantile(0.95, 2, 10), 3.1511, 1e-3);
  });
  it('90 and 99% critical values', () => {
    near(studentizedRangeQuantile(0.9, 3, 21), 3.0688, 1e-3); near(studentizedRangeQuantile(0.99, 3, 21), 4.6122, 1e-3);
  });
});
suite('three shifts (FC-107)', () => {
  const r = compareGroups(shifts, 0.95)!;
  it('the F, p, sums of squares and η²', () => {
    expect(r.k).toBe(3); expect(r.N).toBe(24); near(r.f, 21.9291, 1e-3); near(r.p, 0.00000721, 1e-7);
    near(r.ssb, 1.7308, 1e-3); near(r.ssw, 0.8287, 1e-3); near(r.eta2, 0.6762, 1e-3); expect([r.df1, r.df2]).toEqual([2, 21]);
    near(r.groups[0].mean, 1.1125, 1e-9); near(r.groups[1].mean, 1.7, 1e-9); near(r.groups[2].mean, 1.15, 1e-9);
  });
  it('Levene and Kruskal–Wallis', () => {
    near(r.levene!.w, 0.4081, 1e-3); near(r.levene!.p, 0.6701, 1e-3); near(r.kruskal.h, 15.0729, 1e-3); near(r.kruskal.p, 0.000533, 2e-6);
  });
  it('Tukey’s pairs with their intervals', () => {
    const [ab, ac, bc] = r.pairs;
    near(ab.diff, -0.5875, 1e-9); near(ab.p, 0.000021, 2e-6); near(ab.lo, -0.8379, 1e-3); near(ab.hi, -0.3371, 1e-3);
    near(ac.diff, -0.0375, 1e-9); near(ac.p, 0.924719, 1e-4); near(ac.lo, -0.2879, 1e-3); near(ac.hi, 0.2129, 1e-3);
    near(bc.diff, 0.55, 1e-9); near(bc.p, 0.000049, 2e-6); near(bc.lo, 0.2996, 1e-3); near(bc.hi, 0.8004, 1e-3);
    near(r.qCrit, 3.5646, 1e-3);
  });
  it('90 and 99% change the intervals', () => {
    const r9 = compareGroups(shifts, 0.9)!, r99 = compareGroups(shifts, 0.99)!;
    near(r9.pairs[0].lo, -0.80304, 1e-3); near(r9.pairs[0].hi, -0.37196, 1e-3); near(r99.pairs[0].lo, -0.91144, 2e-3); near(r99.pairs[0].hi, -0.26356, 2e-3);
  });
});
suite('unequal sizes — Tukey–Kramer', () => {
  const U = [{ name: '1', values: [10.1, 10.4, 9.8, 10.0, 10.3, 10.2] }, { name: '2', values: [10.9, 11.2, 10.7, 11.0, 11.4, 10.8, 11.1, 11.3, 10.6] }, { name: '3', values: [10.2, 10.5, 10.1, 10.4] }];
  const r = compareGroups(U, 0.95)!;
  it('F, Kruskal–Wallis, Levene and the pairs', () => {
    near(r.f, 26.5564, 1e-3); near(r.p, 0.00000825, 1e-7); near(r.kruskal.h, 13.9347, 1e-3); near(r.kruskal.p, 0.000942, 2e-6); near(r.levene!.p, 0.5353, 1e-3);
    near(r.pairs[0].diff, -0.8667, 1e-3); near(r.pairs[0].p, 0.000012, 2e-6); near(r.pairs[0].lo, -1.1951, 1e-3); near(r.pairs[0].hi, -0.5382, 1e-3);
    near(r.pairs[1].p, 0.546042, 1e-4); near(r.pairs[1].lo, -0.5689, 1e-3); near(r.pairs[1].hi, 0.2356, 1e-3);
    near(r.pairs[2].diff, 0.7, 1e-3); near(r.pairs[2].p, 0.00052, 2e-6); near(r.pairs[2].lo, 0.3255, 1e-3); near(r.pairs[2].hi, 1.0745, 1e-3);
  });
});
suite('groups that do not differ, and the refusals', () => {
  const same = [[5.1, 5.3, 4.9, 5.2, 5.0, 5.1], [5.0, 5.2, 5.1, 4.8, 5.3, 5.2], [5.2, 5.0, 5.1, 5.3, 4.9, 5.1]].map((values, i) => ({ name: 'G' + (i + 1), values }));
  it('F 0 and every pair far from different', () => {
    const r = compareGroups(same, 0.95)!; near(r.f, 0, 1e-9); near(r.p, 1, 1e-9); expect(Math.min(...r.pairs.map(p => p.p))).toBeGreaterThan(0.99);
  });
  it('fewer than two groups of two, or no spread, say nothing', () => {
    expect(compareGroups([{ name: 'a', values: [1, 2, 3] }], 0.95)).toBeUndefined();
    expect(compareGroups([{ name: 'a', values: [1, 2, 3] }, { name: 'b', values: [4] }], 0.95)).toBeUndefined();
    expect(compareGroups([{ name: 'a', values: [2, 2, 2] }, { name: 'b', values: [3, 3, 3] }], 0.95)).toBeUndefined();
  });
  it('Kruskal–Wallis with ties still has a p', () => { const k = kruskalWallis([[1, 1, 2], [2, 3, 3], [3, 4, 4]])!; expect(k.p).toBeGreaterThan(0); expect(k.p).toBeLessThan(1); });
});
