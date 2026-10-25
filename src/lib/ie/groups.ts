/* SEVERAL GROUPS — does a shift, a head, a supplier really differ, and which one (knowledge/specs/FC-107-groups-
 * tables-relations.md §3 and §6; knowledge/methods/stats/anova). One-way ANOVA with its F, p and η²; Tukey's HSD (Tukey–
 * Kramer for unequal sizes) from the studentised range, integrated here, never a t-test per pair; Kruskal–Wallis with its
 * tie correction. Pure, and proved against SciPy's printed figures (scripts/knowledge/cases-w3b.py) in
 * __tests__/groups.test.ts — never against its own output. Levene's test is lib/ie/charts' and is not repeated. */
import { lnGamma } from './dist';
import { chi2Cdf, mean, sd } from './stats';
import { fCdf } from './dist';
import { levene } from './charts';

/* ------------------------------ the studentised range ------------------------------- */

/** Gauss–Legendre nodes and weights on [−1, 1], by Newton's method on the Legendre polynomial. */
function legendre(n: number): { x: number[]; w: number[] } {
  const x: number[] = [], w: number[] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), dp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      dp = n * (z * p1 - p2) / (z * z - 1);
      const dz = p1 / dp; z -= dz; if (Math.abs(dz) < 1e-15) break;
    }
    x.push(z); w.push(2 / ((1 - z * z) * dp * dp));
  }
  return { x, w };
}
const GL = legendre(16);
/** ∫ₐᵇ f by composite 16-point Gauss–Legendre over `panels` equal panels. */
function integrate(f: (v: number) => number, a: number, b: number, panels: number): number {
  const h = (b - a) / panels; let total = 0;
  for (let p = 0; p < panels; p++) {
    const mid = a + (p + 0.5) * h, half = h / 2;
    for (let i = 0; i < GL.x.length; i++) total += GL.w[i] * f(mid + half * GL.x[i]);
  }
  return total * (h / 2);
}
/** Φ(z) to full precision — through the incomplete gamma, not the table-free approximation of lib/ie/dist (the cdf below
 *  takes the difference of two of them, so 1e-7 in each would show). */
function phi(z: number): number {
  const a = z * z / 2;
  if (a === 0) return 0.5;
  /* erf(|z|/√2) = P(½, z²/2) */
  let p: number;
  if (a < 1.5) { let ap = 0.5, del = 2, s = del; for (let i = 0; i < 200; i++) { ap += 1; del *= a / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-16) break; } p = s * Math.exp(-a + 0.5 * Math.log(a) - lnGamma(0.5)); }
  else {
    const TINY = 1e-300; let b = a + 0.5, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i < 300; i++) { const an = -i * (i - 0.5); b += 2; d = an * d + b; if (Math.abs(d) < TINY) d = TINY; c = b + an / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    p = 1 - Math.exp(-a + 0.5 * Math.log(a) - lnGamma(0.5)) * h;
  }
  return z > 0 ? 0.5 + p / 2 : 0.5 - p / 2;
}
const PDF = (z: number): number => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
/** The range of k standard normals, P(W ≤ w) = k ∫ φ(z)[Φ(z) − Φ(z − w)]^(k−1) dz. */
function rangeCdf(w: number, k: number): number {
  if (w <= 0) return 0;
  return k * integrate(z => PDF(z) * Math.max(0, phi(z) - phi(z - w)) ** (k - 1), -9, 9 + Math.min(w, 0), 8);
}
/** P(Q ≤ q) for the studentised range of k groups on ν degrees of freedom: the range's cdf averaged over s = √(χ²ᵥ/ν). */
export function studentizedRangeCdf(q: number, k: number, nu: number): number {
  if (q <= 0) return 0;
  const lnC = Math.log(2) + (nu / 2) * Math.log(nu / 2) - lnGamma(nu / 2);
  const dens = (s: number): number => s <= 0 ? (nu === 1 ? Math.exp(lnC) : 0) : Math.exp(lnC + (nu - 1) * Math.log(s) - nu * s * s / 2);
  const spread = 14 / Math.sqrt(2 * nu), lo = Math.max(0, 1 - spread), hi = 1 + spread;
  return Math.min(1, integrate(s => dens(s) * rangeCdf(q * s, k), lo, hi, 10));
}
/** The q with P(Q ≤ q) = p — bisection. */
export function studentizedRangeQuantile(p: number, k: number, nu: number): number {
  let lo = 0, hi = 8;
  while (studentizedRangeCdf(hi, k, nu) < p && hi < 200) hi *= 2;
  for (let i = 0; i < 34; i++) { const mid = (lo + hi) / 2; if (studentizedRangeCdf(mid, k, nu) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* ------------------------------ one-way ANOVA, Tukey, Kruskal–Wallis ---------------- */

export interface GroupIn { name: string; values: number[] }
export interface GroupSummary { name: string; n: number; mean: number; sd: number; lo: number; hi: number }
export interface Pair { a: string; b: string; /** mean(a) − mean(b) */ diff: number; q: number; p: number; lo: number; hi: number }
export interface GroupsResult {
  k: number; N: number; groups: GroupSummary[];
  f: number; p: number; df1: number; df2: number; ssb: number; ssw: number; msw: number; eta2: number;
  levene?: { w: number; p: number }; kruskal: { h: number; p: number; df: number };
  pairs: Pair[]; qCrit: number;
}
/** Ranks with ties averaged, and the tie sizes. */
function rankAll(xs: number[]): { r: number[]; ties: number[] } {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]), r = new Array<number>(xs.length), ties: number[] = [];
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    if (j > i) ties.push(j - i + 1);
    i = j + 1;
  }
  return { r, ties };
}
/** Kruskal–Wallis H (1952): 12/(N(N+1))·ΣRᵢ²/nᵢ − 3(N+1), divided by 1 − Σ(t³ − t)/(N³ − N), on k − 1 df. */
export function kruskalWallis(groups: number[][]): { h: number; p: number; df: number } | undefined {
  const g = groups.filter(x => x.length >= 1);
  if (g.length < 2) return undefined;
  const all = g.flat(), N = all.length, { r, ties } = rankAll(all);
  let at = 0, s = 0;
  for (const x of g) { let R = 0; for (let i = 0; i < x.length; i++) R += r[at + i]; at += x.length; s += R * R / x.length; }
  const corr = 1 - ties.reduce((a, t) => a + t ** 3 - t, 0) / (N ** 3 - N);
  if (!(corr > 0)) return undefined;
  const h = (12 / (N * (N + 1)) * s - 3 * (N + 1)) / corr;
  return { h, p: 1 - chi2Cdf(h, g.length - 1), df: g.length - 1 };
}
/** FC-107: the F test, η², Levene, Kruskal–Wallis and Tukey's pairs at `conf`. Undefined with fewer than two groups of two
 *  readings or when no group has any spread. */
export function compareGroups(input: GroupIn[], conf: number): GroupsResult | undefined {
  const gs = input.filter(g => g.values.length >= 2);
  if (gs.length < 2) return undefined;
  const all = gs.flatMap(g => g.values), N = all.length, grand = mean(all), k = gs.length;
  const ssb = gs.reduce((s, g) => s + g.values.length * (mean(g.values) - grand) ** 2, 0);
  const ssw = gs.reduce((s, g) => { const m = mean(g.values); return s + g.values.reduce((t, v) => t + (v - m) ** 2, 0); }, 0);
  const df1 = k - 1, df2 = N - k;
  if (!(ssw > 0) || df2 < 1) return undefined;
  const msw = ssw / df2, f = ssb / df1 / msw;
  const summary = gs.map(g => ({ name: g.name, n: g.values.length, mean: mean(g.values), sd: sd(g.values), lo: Math.min(...g.values), hi: Math.max(...g.values) }));
  const qCrit = studentizedRangeQuantile(conf, k, df2), pairs: Pair[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const se = Math.sqrt(msw / 2 * (1 / summary[i].n + 1 / summary[j].n)), diff = summary[i].mean - summary[j].mean, q = Math.abs(diff) / se;
    pairs.push({ a: summary[i].name, b: summary[j].name, diff, q, p: Math.max(0, 1 - studentizedRangeCdf(q, k, df2)), lo: diff - qCrit * se, hi: diff + qCrit * se });
  }
  const lv = levene(gs.map(g => g.values)), kw = kruskalWallis(gs.map(g => g.values));
  return { k, N, groups: summary, f, p: 1 - fCdf(f, df1, df2), df1, df2, ssb, ssw, msw, eta2: ssb / (ssb + ssw),
    ...(lv ? { levene: { w: lv.w, p: lv.p } } : {}), kruskal: kw ?? { h: 0, p: 1, df: df1 }, pairs, qCrit };
}
