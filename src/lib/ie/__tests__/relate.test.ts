/* W3b's table, correlation and regression arithmetic against SciPy's and NumPy's printed figures (scripts/knowledge/cases-w3b.py)
 * — every expected number below was produced there, never by this code (knowledge/specs/FC-107-groups-tables-relations.md §6). */
import { describe as suite, it, expect } from 'vitest';
import { predictAt, regress, relate, tableTest, type Multiple } from '../relate';

const near = (a: number | undefined, b: number, tol: number) => expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);

suite('counts in a table (FC-108)', () => {
  const t = tableTest([[18, 7, 5], [9, 14, 4], [6, 5, 12]])!;
  it('χ², degrees of freedom, p, Cramér’s V', () => { near(t.chi2, 17.2383, 1e-3); expect(t.df).toBe(4); near(t.p, 0.001737, 2e-6); near(t.cramersV, 0.3282, 1e-3); expect(t.trusted).toBe(true); });
  it('expected counts and standardised residuals', () => {
    [[12.38, 9.75, 7.88], [11.14, 8.78, 7.09], [9.49, 7.48, 6.04]].forEach((row, i) => row.forEach((v, j) => near(t.expected[i][j], v, 6e-3)));
    [[1.6, -0.88, -1.02], [-0.64, 1.76, -1.16], [-1.13, -0.91, 2.43]].forEach((row, i) => row.forEach((v, j) => near(t.residuals[i][j], v, 6e-3)));
  });
  it('a 2 × 2 has Yates and Fisher beside; Fisher leads below 5 expected', () => {
    const s = tableTest([[12, 88], [4, 96]])!; near(s.chi2, 4.3478, 1e-3); near(s.p, 0.037056, 1e-5);
    near(s.two!.yates, 3.3288, 1e-3); near(s.two!.pYates, 0.068076, 1e-5); near(s.two!.pFisher, 0.065197, 1e-5); near(s.minExpected, 8, 1e-9); expect(s.two!.leads).toBe('chi2');
    const l = tableTest([[60, 940], [40, 960]])!; near(l.chi2, 4.2105, 1e-3); near(l.p, 0.040174, 1e-5); near(l.two!.yates, 3.8, 1e-3); near(l.two!.pYates, 0.051253, 1e-5); near(l.two!.pFisher, 0.05076, 1e-5);
    expect(tableTest([[3, 1], [1, 3]])!.two!.leads).toBe('fisher');
  });
  it('a small table is χ²-significant but is said not to be trusted', () => {
    const s = tableTest([[3, 1, 6], [8, 5, 2]])!; near(s.chi2, 6.1869, 1e-3); expect(s.df).toBe(2); near(s.p, 0.045346, 1e-5);
    near(s.minExpected, 2.4, 1e-9); near(s.shareFive, 1 / 6, 1e-9); expect(s.trusted).toBe(false);
  });
  it('refusals', () => {
    expect(tableTest([[1, 2]])).toBeUndefined(); expect(tableTest([[1, 0], [2, 0]])).toBeUndefined(); expect(tableTest([[1, -1], [2, 3]])).toBeUndefined();
  });
});
const X = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205], Y = [9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0];
suite('one driver (FC-109)', () => {
  const l = relate(X, Y, 0.95)!;
  it('Pearson with its interval, Spearman', () => {
    near(l.r, 0.98683, 1e-5); near(l.pR, 3.05e-9, 5e-11); near(l.rLo, 0.9522, 1e-4); near(l.rHi, 0.9964, 1e-4); near(l.rho, 1, 1e-12); expect(l.pRho).toBe(0);
  });
  it('the line, its intervals, R², s_e', () => {
    near(l.slope, 0.14517, 1e-5); near(l.seSlope, 0.00752, 1e-5); near(l.slopeLo, 0.12841, 1e-5); near(l.slopeHi, 0.16194, 1e-5);
    near(l.intercept, -12.0185, 1e-4); near(l.seIntercept, 1.342, 1e-3); near(l.r2, 0.97384, 1e-5); near(l.se, 0.4499, 1e-4);
  });
  it('a prediction at 172 and its two intervals; beyond the range is flagged', () => {
    const p = predictAt(l, 172, 0.95); near(p.y, 12.9515, 1e-4); near(p.meanHalf, 0.3037, 1e-4); near(p.newHalf, 1.0475, 1e-4); expect(p.inside).toBe(true);
    expect(predictAt(l, 230, 0.95).inside).toBe(false);
  });
  it('the residual checks: signs, runs, lag-1, Durbin–Watson — the line is too straight', () => {
    expect(l.runs!.signs).toBe('---++++++---'); expect(l.runs!.runs).toBe(3); near(l.runs!.expected, 7, 1e-9); near(l.runs!.z, -2.422, 1e-3); near(l.runs!.p, 0.0154, 1e-4);
    near(l.lag1, 0.4564, 1e-4); near(l.durbinWatson, 0.6012, 1e-4);
  });
  it('a noisy straight line and an outlier', () => {
    const xn = [10.0, 11.3, 12.6, 13.9, 15.2, 16.5, 17.8, 19.1, 20.4, 21.7, 23.0, 24.3, 25.7, 27.0, 28.3, 29.6, 30.9, 32.2, 33.5, 34.8, 36.1, 37.4, 38.7, 40.0];
    const yn = [7.43, 9.46, 6.16, 10.97, 9.54, 9.29, 9.94, 10.25, 11.93, 13.85, 14.2, 14.92, 12.82, 13.61, 18.01, 17.96, 20.07, 19.55, 17.52, 20.94, 20.8, 20.96, 20.37, 22.0];
    const n = relate(xn, yn, 0.95)!; near(n.r, 0.96048, 1e-5); near(n.slope, 0.51383, 1e-5); near(n.seSlope, 0.03175, 1e-5); near(n.intercept, 1.8439, 1e-4); near(n.r2, 0.92251, 1e-5);
    near(n.lag1, -0.0037, 1e-4); near(n.rho, 0.95478, 1e-5); near(n.rLo, 0.9094, 1e-4); near(n.rHi, 0.983, 1e-4); expect(n.runs!.p).toBeGreaterThan(0.05);
    const o = relate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [2, 1, 4, 3, 5, 6, 6, 8, 9, 40], 0.95)!; near(o.r, 0.68986, 1e-5); near(o.pR, 0.02727, 1e-5); near(o.rho, 0.97265, 1e-5); near(o.pRho, 2.3689e-6, 1e-8);
  });
  it('too few pairs or no spread say nothing', () => { expect(relate([1, 2, 3], [1, 2, 3], 0.95)).toBeUndefined(); expect(relate([1, 1, 1, 1], [1, 2, 3, 4], 0.95)).toBeUndefined(); });
});
const SP = [73, 99, 73, 92, 95, 76, 78, 75, 64, 79, 70, 70, 67, 68, 93, 77, 70, 84, 84, 86, 96, 66, 75, 71, 61, 67, 76, 76, 85, 78];
const TP = [10.1, 6.2, 5.3, 7.3, 5.0, 7.7, 8.6, 11.2, 12.7, 4.5, 13.6, 11.2, 13.9, 5.2, 7.8, 9.0, 11.5, 7.1, 8.5, 6.8, 8.5, 9.1, 9.7, 11.0, 6.4, 10.3, 4.9, 10.1, 8.6, 5.3];
const GA = [2.78, 2.79, 2.66, 2.84, 3.24, 2.55, 2.66, 2.79, 2.95, 2.49, 3.33, 2.66, 3.02, 2.76, 2.92, 2.89, 3.21, 2.89, 2.7, 2.25, 3.7, 2.66, 3.09, 2.68, 2.69, 2.79, 2.42, 2.6, 2.98, 2.36];
suite('several drivers (FC-110)', () => {
  const m = regress([SP, TP], GA, ['speed', 'temp'], 0.95) as Multiple;
  it('coefficients, standard errors, p and intervals', () => {
    near(m.intercept.b, 1.1411, 1e-4); near(m.intercept.se, 0.50428, 1e-4); near(m.intercept.p, 0.031897, 1e-5);
    const [s, t] = m.drivers; near(s.b, 0.01399, 1e-5); near(s.se, 0.00521, 1e-5); near(s.t, 2.6838, 1e-3); near(s.p, 0.012279, 1e-5); near(s.lo, 0.00329, 1e-5); near(s.hi, 0.02468, 1e-5);
    near(t.b, 0.06851, 1e-5); near(t.se, 0.01987, 1e-5); near(t.p, 0.001864, 1e-5); near(t.lo, 0.02775, 1e-5); near(t.hi, 0.10928, 1e-5);
  });
  it('R², adjusted R², s_e, F and its p; VIF', () => {
    near(m.r2, 0.33492, 1e-5); near(m.adjR2, 0.28566, 1e-5); near(m.se, 0.25426, 1e-5); near(m.f, 6.7984, 1e-3); near(m.pF, 0.004062, 1e-6); expect([m.df1, m.df2]).toEqual([2, 27]);
    near(m.drivers[0].vif, 1.2372, 1e-3); near(m.drivers[1].vif, 1.2372, 1e-3); expect(m.serious).toBe(false);
  });
  it('one driver gives the same line as relate()', () => {
    const one = regress([X], Y, ['temp'], 0.95) as Multiple, l = relate(X, Y, 0.95)!;
    near(one.drivers[0].b, l.slope, 1e-9); near(one.drivers[0].se, l.seSlope, 1e-9); near(one.intercept.b, l.intercept, 1e-7); near(one.intercept.se, l.seIntercept, 1e-7); near(one.r2, l.r2, 1e-9);
  });
  it('drivers that move together are warned of', () => {
    const t2 = [7.29, 9.82, 7.28, 9.21, 9.44, 7.6, 7.83, 7.48, 6.37, 7.87, 7.05, 6.92, 6.68, 6.78, 9.31, 7.7, 6.94, 8.5, 8.41, 8.53, 9.56, 6.6, 7.53, 7.03, 6.14, 6.63, 7.56, 7.64, 8.59, 7.8];
    const g2 = [1.8, 2.63, 1.65, 2.3, 2.35, 2.12, 2.02, 1.85, 1.8, 1.75, 1.96, 1.67, 1.56, 1.69, 2.27, 2.08, 1.76, 2.23, 2.28, 2.1, 2.12, 1.9, 1.96, 1.4, 1.42, 1.77, 1.65, 1.78, 1.76, 2.04];
    const c = regress([SP, t2], g2, ['speed', 'second'], 0.95) as Multiple;
    near(c.drivers[0].b, -0.02242, 1e-4); near(c.drivers[1].b, 0.45498, 1e-4); near(c.intercept.b, 0.13914, 1e-4); near(c.drivers[0].vif, 459.76, 0.05); expect(c.serious).toBe(true);
  });
  it('a constant driver and perfectly collinear drivers are refused', () => {
    expect('constant' in (regress([SP, SP.map(() => 5)], GA, ['a', 'b'], 0.95) as object)).toBe(true);
    const r = regress([SP, SP.map(v => v * 2)], GA, ['a', 'b'], 0.95); expect('collinear' in r && (r as { collinear: number[] | null }).collinear).toEqual([0, 1]);
  });
});
