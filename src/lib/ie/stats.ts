/* THE STATISTICS THE ANALYSIS TOOL SAYS — how sure, did it change, do two ways agree, how many readings,
 * are the readings too close together (knowledge/specs/FC-105-analysis.md §3 and §6; knowledge/methods/
 * stats/confidence-intervals, two-sample-tests, sample-size-power, autocorrelation). Pure, and proved
 * against SciPy's printed figures (scripts/knowledge/cases-w3a.py) in __tests__/stats.test.ts — never
 * against its own output. It adds to lib/ie/dist (the normal, the t's beta, lnGamma) and never replaces it. */
import { betaInc, itemsToShow, lnGamma, normalCdf, normalQuantile } from './dist';

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]): number => sum(xs) / xs.length;
export const sd = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)); };
export type Confidence = 0.9 | 0.95 | 0.99;
export const CONFIDENCES: readonly Confidence[] = [0.9, 0.95, 0.99];

/* ------------------------------ the distributions ----------------------------------- */

/** The regularised lower incomplete gamma P(a, x) — series below a + 1, continued fraction above. */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a, del = 1 / a, s = del;
    for (let i = 0; i < 500; i++) { ap += 1; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-15) break; }
    return s * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < TINY) d = TINY; c = b + an / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
/** P(X ≤ x) for χ² on k degrees of freedom. */
export const chi2Cdf = (x: number, k: number): number => gammaP(k / 2, x / 2);
/** The x with P(X ≤ x) = p for χ² on k degrees of freedom. */
export function chi2Quantile(p: number, k: number): number {
  let lo = 0, hi = Math.max(10, k + 20 * Math.sqrt(2 * k));
  while (chi2Cdf(hi, k) < p) hi *= 2;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (chi2Cdf(mid, k) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** P(T ≤ t) for Student's t on df degrees of freedom. */
export function tCdf(t: number, df: number): number {
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0;
  const tail = 0.5 * betaInc(df / 2, 0.5, df / (df + t * t));
  return t > 0 ? 1 - tail : tail;
}
/** The t with P(T ≤ t) = p on df degrees of freedom. */
export function tQuantile(p: number, df: number): number {
  if (p === 0.5) return 0;
  if (p < 0.5) return -tQuantile(1 - p, df);
  let lo = 0, hi = 10;
  while (tCdf(hi, df) < p && hi < 1e9) hi *= 2;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (tCdf(mid, df) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** The x with I_x(a, b) = p — the beta's quantile, by bisection. */
export function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (betaInc(a, b, mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const twoSided = (z: number): number => 2 * (1 - normalCdf(Math.abs(z)));

/* ------------------------------ how sure: intervals --------------------------------- */

export interface Interval { lo: number; hi: number }
/** The mean's interval: x̄ ± t(1 − α/2; n − 1)·s/√n. */
export function meanInterval(n: number, m: number, s: number, conf: number): Interval & { t: number; half: number } {
  const t = tQuantile(1 - (1 - conf) / 2, n - 1), half = t * s / Math.sqrt(n);
  return { lo: m - half, hi: m + half, t, half };
}
/** The spread's interval, s·√((n − 1)/χ²) on both sides. */
export function spreadInterval(n: number, s: number, conf: number): Interval {
  const a = 1 - conf;
  return { lo: s * Math.sqrt((n - 1) / chi2Quantile(1 - a / 2, n - 1)), hi: s * Math.sqrt((n - 1) / chi2Quantile(a / 2, n - 1)) };
}
/** A share, exact (Clopper & Pearson 1934): k of n. */
export function shareExact(k: number, n: number, conf: number): Interval {
  const a = 1 - conf;
  return { lo: k <= 0 ? 0 : betaQuantile(a / 2, k, n - k + 1), hi: k >= n ? 1 : betaQuantile(1 - a / 2, k + 1, n - k) };
}
/** A share, Wilson (1927): k of n. */
export function shareWilson(k: number, n: number, conf: number): Interval {
  const z = normalQuantile(1 - (1 - conf) / 2), p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d;
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
}
/** A rate: `count` events in `exposure` units, Poisson by χ² — per unit of exposure. */
export function rateInterval(count: number, exposure: number, conf: number): Interval {
  const a = 1 - conf;
  return { lo: count <= 0 ? 0 : chi2Quantile(a / 2, 2 * count) / (2 * exposure), hi: chi2Quantile(1 - a / 2, 2 * count + 2) / (2 * exposure) };
}

/* ------------------------------ did it change --------------------------------------- */

export interface WelchResult { nBefore: number; nAfter: number; meanBefore: number; meanAfter: number; sdBefore: number; sdAfter: number;
  /** after − before */ diff: number; t: number; df: number; p: number; lo: number; hi: number }
/** Welch's t (1947): after − before, Welch–Satterthwaite degrees of freedom, two-sided p, the difference's interval.
 *  Undefined with fewer than two in a group or no spread in either. */
export function welch(before: number[], after: number[], conf: number): WelchResult | undefined {
  if (before.length < 2 || after.length < 2) return undefined;
  const vb = sd(before) ** 2 / before.length, va = sd(after) ** 2 / after.length, se2 = vb + va;
  if (!(se2 > 0)) return undefined;
  const df = se2 ** 2 / (vb ** 2 / (before.length - 1) + va ** 2 / (after.length - 1)), diff = mean(after) - mean(before), se = Math.sqrt(se2);
  const t = diff / se, h = tQuantile(1 - (1 - conf) / 2, df) * se;
  return { nBefore: before.length, nAfter: after.length, meanBefore: mean(before), meanAfter: mean(after), sdBefore: sd(before), sdAfter: sd(after),
    diff, t, df, p: 2 * (1 - tCdf(Math.abs(t), df)), lo: diff - h, hi: diff + h };
}

/** Average ranks (ties share the mean rank) and the tie sizes. */
function ranks(xs: number[]): { r: number[]; ties: number[] } {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]), r = new Array<number>(xs.length), ties: number[] = [];
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    if (j > i) ties.push(j - i + 1);
    i = j + 1;
  }
  return { r, ties };
}
/** The number of ways the U statistic of an m-by-n comparison takes each value 0 … mn (no ties). */
function uCounts(m: number, n: number): number[] {
  /* f(u; m, n) = f(u − n; m − 1, n) + f(u; m, n − 1) — kept as a table over (m, n) rows */
  const memo = new Map<string, number[]>();
  const f = (a: number, b: number): number[] => {
    if (a === 0 || b === 0) return [1];
    const key = `${a},${b}`; const hit = memo.get(key); if (hit) return hit;
    const x = f(a - 1, b), y = f(a, b - 1), out = new Array<number>(a * b + 1).fill(0);
    x.forEach((c, u) => { out[u + b] += c; });
    y.forEach((c, u) => { out[u] += c; });
    memo.set(key, out); return out;
  };
  return f(m, n);
}
export interface MannWhitneyResult { /** the after sample's U — pairs where after > before, ties half */ u: number; p: number; exact: boolean; nBefore: number; nAfter: number }
export const MW_EXACT_TO = 20;
/** Mann & Whitney (1947): exact up to 20 a group with no ties, else the normal with the tie and continuity corrections. */
export function mannWhitney(before: number[], after: number[]): MannWhitneyResult | undefined {
  const n1 = after.length, n2 = before.length;
  if (n1 < 1 || n2 < 1) return undefined;
  const { r, ties } = ranks([...after, ...before]);
  const u1 = sum(r.slice(0, n1)) - n1 * (n1 + 1) / 2, u2 = n1 * n2 - u1;
  if (!ties.length && n1 <= MW_EXACT_TO && n2 <= MW_EXACT_TO) {
    const counts = uCounts(n1, n2), total = sum(counts), u = Math.min(u1, u2);
    let cum = 0; for (let i = 0; i <= u; i++) cum += counts[i];
    return { u: u1, p: Math.min(1, 2 * cum / total), exact: true, nBefore: n2, nAfter: n1 };
  }
  const N = n1 + n2, mu = n1 * n2 / 2, tie = sum(ties.map(t => t ** 3 - t)) / (N * (N - 1));
  const s = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tie));
  if (!(s > 0)) return { u: u1, p: 1, exact: false, nBefore: n2, nAfter: n1 };
  const z = (Math.max(u1, u2) - mu - 0.5) / s;
  return { u: u1, p: Math.min(1, 2 * (1 - normalCdf(z))), exact: false, nBefore: n2, nAfter: n1 };
}

export interface TwoShares { p1: number; p2: number; z: number; pZ: number; pFisher: number; expectedMin: number; /** which p leads */ leads: 'z' | 'fisher' }
/** ln C(n, k) */
const lnChoose = (n: number, k: number): number => lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
/** Two shares, k₁ of n₁ before and k₂ of n₂ after: the pooled z, Fisher's exact (two-sided, the tables no likelier than
 *  the one seen), and which leads — Fisher when any expected count is under 5. */
export function twoShares(k1: number, n1: number, k2: number, n2: number): TwoShares | undefined {
  if (n1 < 1 || n2 < 1 || k1 < 0 || k2 < 0 || k1 > n1 || k2 > n2) return undefined;
  const K = k1 + k2, N = n1 + n2, pp = K / N, p1 = k1 / n1, p2 = k2 / n2;
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)), z = se > 0 ? (p2 - p1) / se : 0;
  const lnP = (a: number) => lnChoose(n1, a) + lnChoose(n2, K - a) - lnChoose(N, K);
  const seen = lnP(k1); let pF = 0;
  for (let a = Math.max(0, K - n2); a <= Math.min(K, n1); a++) { const l = lnP(a); if (l <= seen + 1e-7) pF += Math.exp(l); }
  const expectedMin = Math.min(K * n1 / N, K * n2 / N, (N - K) * n1 / N, (N - K) * n2 / N);
  return { p1, p2, z, pZ: se > 0 ? twoSided(z) : 1, pFisher: Math.min(1, pF), expectedMin, leads: expectedMin < 5 ? 'fisher' : 'z' };
}

/* ------------------------------ the same items two ways ----------------------------- */

export interface PairedResult { n: number; mean: number; sd: number; t: number; df: number; p: number; lo: number; hi: number; /** pairs where the second is higher */ higher: number; lower: number }
/** The paired t on the differences (second − first). Undefined below two pairs or with no spread in the differences. */
export function pairedT(diffs: number[], conf: number): PairedResult | undefined {
  const n = diffs.length; if (n < 2) return undefined;
  const m = mean(diffs), s = sd(diffs); if (!(s > 0)) return undefined;
  const se = s / Math.sqrt(n), t = m / se, h = tQuantile(1 - (1 - conf) / 2, n - 1) * se;
  return { n, mean: m, sd: s, t, df: n - 1, p: 2 * (1 - tCdf(Math.abs(t), n - 1)), lo: m - h, hi: m + h, higher: diffs.filter(d => d > 0).length, lower: diffs.filter(d => d < 0).length };
}
export interface WilcoxonResult { /** the smaller of the two rank sums, as SciPy reports it */ w: number; p: number; exact: boolean; n: number; zeros: number }
export const WX_EXACT_TO = 25;
/** Wilcoxon's signed-rank (1945) on the differences: zeros dropped; exact up to 25 with no ties, else the normal with the
 *  tie and continuity corrections. Undefined with fewer than one non-zero difference. */
export function wilcoxon(diffs: number[]): WilcoxonResult | undefined {
  /* differences are arithmetic on typed decimals — 401.6 − 401.2 and 402.5 − 402.1 are 0.4 to the eye and not to a float */
  const clean = diffs.map(d => Math.round(d * 1e9) / 1e9), nz = clean.filter(d => d !== 0), zeros = clean.length - nz.length, n = nz.length; if (n < 1) return undefined;
  const { r, ties } = ranks(nz.map(Math.abs));
  const plus = sum(r.filter((_, i) => nz[i] > 0)), minus = n * (n + 1) / 2 - plus, w = Math.min(plus, minus);
  if (!ties.length && n <= WX_EXACT_TO) {
    const counts = new Array<number>(n * (n + 1) / 2 + 1).fill(0); counts[0] = 1;
    for (let k = 1; k <= n; k++) for (let s = counts.length - 1; s >= k; s--) counts[s] += counts[s - k];
    const total = 2 ** n; let cum = 0; for (let i = 0; i <= w; i++) cum += counts[i];
    return { w, p: Math.min(1, 2 * cum / total), exact: true, n, zeros };
  }
  const mu = n * (n + 1) / 4, v = n * (n + 1) * (2 * n + 1) / 24 - sum(ties.map(t => t ** 3 - t)) / 48;
  if (!(v > 0)) return { w, p: 1, exact: false, n, zeros };
  const z = (Math.abs(plus - mu) - 0.5) / Math.sqrt(v);
  return { w, p: Math.min(1, 2 * (1 - normalCdf(z))), exact: false, n, zeros };
}

/* ------------------------------ how many readings ----------------------------------- */

/** P(T ≤ t) for the noncentral t on df degrees of freedom with noncentrality δ — E over χ² of Φ(t√(v/df) − δ),
 *  by Simpson's rule on the χ² density. */
export function nctCdf(t: number, df: number, delta: number): number {
  const hi = df + 14 * Math.sqrt(2 * df) + 40, N = 4000, h = hi / N, lnC = -(df / 2) * Math.LN2 - lnGamma(df / 2);
  const g = (v: number): number => (v <= 0 ? 0 : Math.exp(lnC + (df / 2 - 1) * Math.log(v) - v / 2) * normalCdf(t * Math.sqrt(v / df) - delta));
  let s = g(0) + g(hi);
  for (let i = 1; i < N; i++) s += g(i * h) * (i % 2 ? 4 : 2);
  return s * h / 3;
}
/** Power of the two-sided two-sample t test with n a group, a true difference δ and spread s (α = 1 − confidence). */
export function powerTwoMeans(n: number, delta: number, s: number, conf = 0.95): number {
  const df = 2 * n - 2, ncp = delta / (s * Math.sqrt(2 / n)), tc = tQuantile(1 - (1 - conf) / 2, df);
  return 1 - nctCdf(tc, df, ncp) + nctCdf(-tc, df, ncp);
}
/** The readings for the mean to within ±e at the confidence: the normal's count and Student's (the t of the n it gives). */
export function nForMean(s: number, e: number, conf = 0.95): { z: number; zRaw: number; t: number } {
  const zq = normalQuantile(1 - (1 - conf) / 2), zRaw = (zq * s / e) ** 2;
  let n = 2; while (tQuantile(1 - (1 - conf) / 2, n - 1) * s / Math.sqrt(n) > e && n < 1e7) n++;
  return { z: Math.ceil(zRaw), zRaw, t: n };
}
/** A group's readings to see a difference δ between two means at the power: the smallest n with power ≥ target (exact). */
export function nForTwoMeans(delta: number, s: number, conf = 0.95, power = 0.8): { approx: number; exact: number } {
  const za = normalQuantile(1 - (1 - conf) / 2), zb = normalQuantile(power), approx = 2 * (za + zb) ** 2 * s * s / (delta * delta);
  let n = Math.max(2, Math.floor(approx * 0.7));
  while (powerTwoMeans(n, delta, s, conf) < power && n < 1e6) n++;
  return { approx, exact: n };
}
/** A share within ±e (absolute) at the confidence; p unknown is the worst case, 0.5. */
export const nForShare = (p: number, e: number, conf = 0.95): number => Math.ceil(normalQuantile(1 - (1 - conf) / 2) ** 2 * p * (1 - p) / (e * e));
/** A group's readings to tell two shares apart at the confidence and power. */
export function nForTwoShares(p1: number, p2: number, conf = 0.95, power = 0.8): number {
  const za = normalQuantile(1 - (1 - conf) / 2), zb = normalQuantile(power), pb = (p1 + p2) / 2;
  return Math.ceil((za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p1 - p2) ** 2);
}
/** The finite-population correction n/(1 + n/N). */
export const finiteN = (n: number, N: number): number => Math.ceil(n / (1 + n / N));
/** Items to show at least (1 − p₀) good with no failure, at the confidence (the zero-failure count). */
export const nZeroFailures = (p0: number, conf = 0.95): number => itemsToShow(p0, conf, 0);
/** The margin a study achieved, ±t·s/√n. */
export const marginAchieved = (n: number, s: number, conf = 0.95): number => tQuantile(1 - (1 - conf) / 2, n - 1) * s / Math.sqrt(n);
/** The difference n a group could see at the power: (z₁₋α/₂ + z₁₋β)·s·√(2/n). */
export const differenceSeen = (n: number, s: number, conf = 0.95, power = 0.8): number => (normalQuantile(1 - (1 - conf) / 2) + normalQuantile(power)) * s * Math.sqrt(2 / n);
export interface CyclesNeeded { n: number; z: number; marginNow: number; marginPct: number; have: number }
/** FC-020: the cycles to time so the mean is within k of itself (k = 0.05 is ±5%) — n′ = (t·s/(k·x̄))², solved for the t of the n it gives. */
export function cyclesNeeded(cycles: number[], k: number, conf = 0.95): CyclesNeeded | undefined {
  if (cycles.length < 2) return undefined;
  const m = mean(cycles), s = sd(cycles); if (!(m > 0) || !(s >= 0)) return undefined;
  let n = 2; while (tQuantile(1 - (1 - conf) / 2, n - 1) * s / Math.sqrt(n) > k * m && n < 1e7) n++;
  const marginNow = marginAchieved(cycles.length, s, conf);
  return { n, z: (normalQuantile(1 - (1 - conf) / 2) * s / (k * m)) ** 2, marginNow, marginPct: 100 * marginNow / m, have: cycles.length };
}

/* ------------------------------ readings too close together ------------------------- */

/** Lag-k autocorrelation: Σ(xₜ − x̄)(xₜ₊ₖ − x̄) ÷ Σ(xₜ − x̄)². */
export function acf(xs: number[], k: number): number {
  const m = mean(xs), den = xs.reduce((a, x) => a + (x - m) ** 2, 0);
  if (!(den > 0) || xs.length <= k) return 0;
  let num = 0; for (let i = 0; i + k < xs.length; i++) num += (xs[i] - m) * (xs[i + k] - m);
  return num / den;
}
export const AUTOCORR_FROM = 30;
export interface Autocorrelation { n: number; r1: number; r2: number; r3: number; band: number; enough: boolean; dependent: boolean;
  /** √(1 − r₁): σ from the moving range is about this much of s when r₁ is positive */ shrink: number; effective: number; durbinWatson: number;
  /** the smallest spacing m (every m-th reading) at which the thinned series is inside its own band, with ≥ 10 left */
  every?: { m: number; n: number; r1: number } }
/** FC-115: r₁ against 2 ÷ √n, from 30 readings in the order taken, and the spacing to sample at. */
export function autocorrelation(xs: number[]): Autocorrelation | undefined {
  const n = xs.length; if (n < 4) return undefined;
  const m = mean(xs); if (!(xs.reduce((a, x) => a + (x - m) ** 2, 0) > 0)) return undefined;
  const r1 = acf(xs, 1), band = 2 / Math.sqrt(n), enough = n >= AUTOCORR_FROM, dependent = enough && Math.abs(r1) > band;
  const e = xs.map(x => x - m), dw = e.slice(1).reduce((a, v, i) => a + (v - e[i]) ** 2, 0) / e.reduce((a, v) => a + v * v, 0);
  let every: Autocorrelation['every'];
  if (dependent) for (let k = 2; Math.ceil(n / k) >= 10; k++) {
    const th = xs.filter((_, i) => i % k === 0), r = acf(th, 1);
    if (Math.abs(r) <= 2 / Math.sqrt(th.length)) { every = { m: k, n: th.length, r1: r }; break; }
  }
  return { n, r1, r2: acf(xs, 2), r3: acf(xs, 3), band, enough, dependent, shrink: Math.sqrt(Math.max(0, 1 - r1)), effective: n * (1 - r1) / (1 + r1), durbinWatson: dw, every };
}
