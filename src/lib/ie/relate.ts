/* COUNTS IN A TABLE, AND WHAT MOVES WITH WHAT — the χ² test of association, Pearson and Spearman, the least-squares line
 * and multiple regression (knowledge/specs/FC-107-groups-tables-relations.md §3 and §6; knowledge/methods/stats/
 * chi-square-association, correlation-regression). Pure, and proved against SciPy's and NumPy's printed figures
 * (scripts/knowledge/cases-w3b.py) in __tests__/relate.test.ts — never against its own output. */
import { fCdf } from './dist';
import { chi2Cdf, mean, tCdf, tQuantile, twoShares } from './stats';
import { normalCdf, normalQuantile } from './dist';

/* ------------------------------ counts in a table ----------------------------------- */

export interface TableResult {
  rows: number; cols: number; total: number; rowTotals: number[]; colTotals: number[];
  expected: number[][]; chi2: number; df: number; p: number; cramersV: number; residuals: number[][];
  minExpected: number; /** the share of cells expecting 5 or more */ shareFive: number;
  /** Cochran's rule as the record gives it: 80% of cells expect 5 or more and none expects under 1 */ trusted: boolean;
  /** a 2 × 2 only: Yates' correction and Fisher's exact test, and which one leads (Fisher when any expected count is under 5) */
  two?: { yates: number; pYates: number; pFisher: number; leads: 'chi2' | 'fisher' };
}
/** The χ² of association on a table of counts (rows × columns). Undefined below 2 × 2, a negative or non-whole count, or a row or column with nothing in it. */
export function tableTest(counts: number[][]): TableResult | undefined {
  const r = counts.length, c = counts[0]?.length ?? 0;
  if (r < 2 || c < 2 || counts.some(row => row.length !== c || row.some(v => !Number.isFinite(v) || v < 0))) return undefined;
  const rowTotals = counts.map(row => row.reduce((a, b) => a + b, 0)), colTotals = counts[0].map((_, j) => counts.reduce((a, row) => a + row[j], 0));
  if (rowTotals.some(v => v <= 0) || colTotals.some(v => v <= 0)) return undefined;
  const total = rowTotals.reduce((a, b) => a + b, 0);
  const expected = rowTotals.map(rt => colTotals.map(ct => rt * ct / total));
  let chi2 = 0; const residuals = counts.map((row, i) => row.map((o, j) => { const e = expected[i][j]; chi2 += (o - e) ** 2 / e; return (o - e) / Math.sqrt(e); }));
  const df = (r - 1) * (c - 1), flat = expected.flat(), minExpected = Math.min(...flat), shareFive = flat.filter(e => e >= 5).length / flat.length;
  const out: TableResult = { rows: r, cols: c, total, rowTotals, colTotals, expected, chi2, df, p: 1 - chi2Cdf(chi2, df),
    cramersV: Math.sqrt(chi2 / (total * (Math.min(r, c) - 1))), residuals, minExpected, shareFive, trusted: shareFive >= 0.8 && minExpected >= 1 };
  if (r === 2 && c === 2) {
    const [[a, b], [cc, d]] = counts, det = Math.abs(a * d - b * cc), yates = total * Math.max(0, det - total / 2) ** 2 / (rowTotals[0] * rowTotals[1] * colTotals[0] * colTotals[1]);
    const fi = twoShares(a, a + b, cc, cc + d);
    out.two = { yates, pYates: 1 - chi2Cdf(yates, 1), pFisher: fi?.pFisher ?? 1, leads: minExpected < 5 ? 'fisher' : 'chi2' };
  }
  return out;
}

/* ------------------------------ one driver: correlation and the line ----------------- */

const twoSidedT = (t: number, df: number): number => 2 * (1 - tCdf(Math.abs(t), df));
function ranksOf(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]), r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}
const pearson = (x: number[], y: number[]): number => {
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const lag1 = (v: number[]): number => { const m = mean(v), den = v.reduce((a, x) => a + (x - m) ** 2, 0); let num = 0; for (let i = 0; i + 1 < v.length; i++) num += (v[i] - m) * (v[i + 1] - m); return den > 0 ? num / den : 0; };

export interface Line {
  n: number; r: number; pR: number; rLo: number; rHi: number; rho: number; pRho: number;
  slope: number; intercept: number; seSlope: number; seIntercept: number; slopeLo: number; slopeHi: number; r2: number; se: number; xMean: number; sxx: number; t: number;
  residuals: number[]; lag1: number; durbinWatson: number;
  /** Wald–Wolfowitz on the residuals' signs in the order of x: too few runs says the line is the wrong shape */
  runs?: { runs: number; expected: number; z: number; p: number; signs: string };
  xRange: [number, number];
}
/** FC-109: Pearson with Fisher's z interval, Spearman, the line with its intervals, the residual checks. Undefined below 4 pairs or with no spread in either. */
export function relate(x: number[], y: number[], conf: number): Line | undefined {
  const n = x.length;
  if (n < 4 || y.length !== n) return undefined;
  const mx = mean(x), my = mean(y), sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0), syy = y.reduce((a, v) => a + (v - my) ** 2, 0);
  if (!(sxx > 0) || !(syy > 0)) return undefined;
  let sxy = 0; for (let i = 0; i < n; i++) sxy += (x[i] - mx) * (y[i] - my);
  const r = sxy / Math.sqrt(sxx * syy), slope = sxy / sxx, intercept = my - slope * mx;
  const residuals = y.map((v, i) => v - (intercept + slope * x[i])), rss = residuals.reduce((a, v) => a + v * v, 0), se = Math.sqrt(rss / (n - 2));
  const seSlope = se / Math.sqrt(sxx), seIntercept = se * Math.sqrt(1 / n + mx * mx / sxx), t = tQuantile(1 - (1 - conf) / 2, n - 2);
  const tr = Math.abs(r) >= 1 ? Infinity : r * Math.sqrt((n - 2) / (1 - r * r)), z = Math.atanh(Math.max(-0.9999999999, Math.min(0.9999999999, r))), zc = normalQuantile(1 - (1 - conf) / 2) / Math.sqrt(n - 3);
  const rho = pearson(ranksOf(x), ranksOf(y)), trho = Math.abs(rho) >= 1 ? Infinity : rho * Math.sqrt((n - 2) / (1 - rho * rho));
  /* the runs of the residual signs in the order of x (a residual of exactly zero has no sign and is left out) */
  const order = x.map((_, i) => i).sort((a, b) => x[a] - x[b] || a - b), signs = order.map(i => residuals[i]).filter(v => Math.abs(v) > 1e-12).map(v => (v > 0 ? 1 : 0));
  let runs: Line['runs'];
  const n1 = signs.reduce<number>((a, b) => a + b, 0), n0 = signs.length - n1, m = signs.length;
  if (n1 >= 2 && n0 >= 2) {
    let rn = 1; for (let i = 1; i < m; i++) if (signs[i] !== signs[i - 1]) rn++;
    const mu = 2 * n1 * n0 / m + 1, v = 2 * n1 * n0 * (2 * n1 * n0 - m) / (m * m * (m - 1)), zr = v > 0 ? (rn - mu) / Math.sqrt(v) : 0;
    runs = { runs: rn, expected: mu, z: zr, p: 2 * (1 - normalCdf(Math.abs(zr))), signs: signs.map(s => (s ? '+' : '-')).join('') };
  }
  const dw = residuals.slice(1).reduce((a, v, i) => a + (v - residuals[i]) ** 2, 0) / (rss || 1);
  return { n, r, pR: Math.abs(r) >= 1 ? 0 : twoSidedT(tr, n - 2), rLo: Math.tanh(z - zc), rHi: Math.tanh(z + zc), rho, pRho: Math.abs(rho) >= 1 ? 0 : twoSidedT(trho, n - 2),
    slope, intercept, seSlope, seIntercept, slopeLo: slope - t * seSlope, slopeHi: slope + t * seSlope, r2: r * r, se, xMean: mx, sxx, t: slope / seSlope,
    residuals, lag1: lag1(residuals), durbinWatson: dw, ...(runs ? { runs } : {}), xRange: [Math.min(...x), Math.max(...x)] };
}
/** The line at x0: ŷ, the mean's half-width and a new reading's half-width. */
export function predictAt(l: Line, x0: number, conf: number): { y: number; meanHalf: number; newHalf: number; inside: boolean } {
  const t = tQuantile(1 - (1 - conf) / 2, l.n - 2), d = (x0 - l.xMean) ** 2 / l.sxx;
  return { y: l.intercept + l.slope * x0, meanHalf: t * l.se * Math.sqrt(1 / l.n + d), newHalf: t * l.se * Math.sqrt(1 + 1 / l.n + d), inside: x0 >= l.xRange[0] && x0 <= l.xRange[1] };
}

/* ------------------------------ several drivers: multiple regression ------------------ */

export interface Coef { name: string; b: number; se: number; t: number; p: number; lo: number; hi: number; vif?: number }
export interface Multiple {
  n: number; k: number; intercept: Coef; drivers: Coef[]; r2: number; adjR2: number; se: number; f: number; pF: number; df1: number; df2: number;
  fitted: number[]; residuals: number[]; /** the worst VIF, and whether it is past the edge */ maxVif: number; serious: boolean;
}
export const VIF_SERIOUS = 10;
/** Invert a symmetric positive-definite matrix by Gauss–Jordan with partial pivoting; undefined when a pivot collapses. */
function invert(m: number[][]): number[][] | undefined {
  const n = m.length, a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) return undefined;
    [a[c], a[piv]] = [a[piv], a[c]];
    const d = a[c][c]; for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c]; if (f !== 0) for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j]; }
  }
  return a.map(row => row.slice(n));
}
/** FC-110: y on the drivers xs[0..k-1] (each a column, same length as y). Least squares on the centred, scaled drivers so a
 *  driver in thousands and one in tenths do not wreck the inverse. Undefined when a driver is constant or the drivers are
 *  perfectly collinear (the second return says which pair when it can). */
export function regress(xs: number[][], y: number[], names: string[], conf: number): Multiple | { collinear: [number, number] | null; constant?: number } {
  const k = xs.length, n = y.length;
  const sdOf = xs.map(col => { const m = mean(col); return Math.sqrt(col.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1)); });
  const flat = sdOf.findIndex(s => !(s > 0)); if (flat >= 0) return { collinear: null, constant: flat };
  const means = xs.map(mean), my = mean(y);
  const Z = xs.map((col, j) => col.map(v => (v - means[j]) / sdOf[j]));
  const G = Z.map(a => Z.map(b => a.reduce((s, v, i) => s + v * b[i], 0))), inv = invert(G);
  if (!inv) { let best: [number, number] = [0, Math.min(1, k - 1)], top = -1; for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const c = Math.abs(pearson(xs[i], xs[j])); if (c > top) { top = c; best = [i, j]; } } return { collinear: best }; }
  const zy = Z.map(col => col.reduce((s, v, i) => s + v * (y[i] - my), 0)), bz = inv.map(row => row.reduce((s, v, j) => s + v * zy[j], 0));
  const b = bz.map((v, j) => v / sdOf[j]), b0 = my - b.reduce((s, v, j) => s + v * means[j], 0);
  const fitted = y.map((_, i) => b0 + b.reduce((s, v, j) => s + v * xs[j][i], 0)), residuals = y.map((v, i) => v - fitted[i]);
  const rss = residuals.reduce((a, v) => a + v * v, 0), sst = y.reduce((a, v) => a + (v - my) ** 2, 0), df2 = n - k - 1;
  if (df2 < 1 || !(sst > 0)) return { collinear: null };
  const s2 = rss / df2, tc = tQuantile(1 - (1 - conf) / 2, df2);
  /* the drivers' standard errors: s²·(G⁻¹)ⱼⱼ / sdⱼ²; VIFⱼ = (n − 1)·(G⁻¹)ⱼⱼ / (n − 1) = the diagonal of the correlation matrix's inverse */
  const diagR = inv.map((row, j) => row[j] * (n - 1));
  const drivers: Coef[] = b.map((bj, j) => { const se = Math.sqrt(s2 * inv[j][j]) / sdOf[j], t = bj / se; return { name: names[j], b: bj, se, t, p: twoSidedT(t, df2), lo: bj - tc * se, hi: bj + tc * se, vif: diagR[j] }; });
  /* the intercept's variance: s²·(1/n + x̄ᵀ(XcᵀXc)⁻¹x̄), with (XcᵀXc)⁻¹ = D⁻¹G⁻¹D⁻¹ */
  let q = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) q += (means[i] / sdOf[i]) * inv[i][j] * (means[j] / sdOf[j]);
  const se0 = Math.sqrt(s2 * (1 / n + q)), r2 = 1 - rss / sst, f = (r2 / k) / ((1 - r2) / df2), maxVif = Math.max(...diagR);
  return { n, k, intercept: { name: 'intercept', b: b0, se: se0, t: b0 / se0, p: twoSidedT(b0 / se0, df2), lo: b0 - tc * se0, hi: b0 + tc * se0 }, drivers, r2,
    adjR2: 1 - (1 - r2) * (n - 1) / df2, se: Math.sqrt(s2), f, pF: 1 - fCdf(f, k, df2), df1: k, df2, fitted, residuals, maxVif, serious: maxVif > VIF_SERIOUS };
}
