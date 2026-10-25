/* WHICH SHAPE FITS — fitting a distribution to readings and reading the tail from it (FC-114; FC-096 uses it for a
 * capability that is not bell-shaped). knowledge/methods/stats/distribution-fitting.md and spc/capability-nonnormal.md;
 * knowledge/specs/FC-114-fitting.md. Pure, and proved against SciPy (scripts/knowledge/cases-w3c.py) in __tests__/fit.test.ts —
 * never against its own output.
 *
 * Four shapes, each with its parameters found as the record says:
 *   normal       the mean and the spread (n − 1) — as the capability study reads it
 *   lognormal    the mean and spread (n − 1) of ln x — a right-leaning set that cannot go below zero
 *   Weibull      two-parameter (shape β, scale η, the lower end fixed at zero), by maximum likelihood
 *   exponential  one parameter, the mean, by maximum likelihood — times between events with no memory
 * Each is judged by Anderson–Darling (A², the test that weighs the tails) and compared by AIC (2k − 2 ln L, the likelihood at its
 * maximum). Not offered: a three-parameter shape (a lower end that is not zero), gamma, Johnson and Box–Cox — said on the page. */
import { normalQuantile, upperTail } from './dist';

export type ModelId = 'normal' | 'lognormal' | 'weibull' | 'exponential';
export const MODEL_IDS: readonly ModelId[] = ['normal', 'lognormal', 'weibull', 'exponential'];
export const MODEL_WORDS: Record<ModelId, { name: string; article: string; leans: string }> = {
  normal: { name: 'normal', article: 'a normal', leans: 'a bell' },
  lognormal: { name: 'lognormal', article: 'a lognormal', leans: 'leaning high, never below zero' },
  weibull: { name: 'Weibull', article: 'a Weibull', leans: 'a times-to-failure shape, never below zero' },
  exponential: { name: 'exponential', article: 'an exponential', leans: 'times between events with no memory' },
};
/** The goodness-of-fit test rejects a shape at this p — the house's, as the bell-shape check's (capability BELL_P). */
export const REJECT_P = 0.05;
/** A shape this many AIC points above the best is not "about as good" (Burnham & Anderson 2002: under 2 is essentially equal support). */
export const AIC_ABOUT_EQUAL = 2;
/** A shape is fitted from this many readings (the record: thirty to tell a normal from a lognormal; fewer is a hint). */
export const FIT_FROM = 20;
/** …and called firm from this many. */
export const FIT_FIRM = 50;

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[]): number => { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)); };
/** Φ(z) with the tiny lower tail kept (upperTail is good to 1e-7 *relative* everywhere). */
const ncdf = (z: number): number => upperTail(-z);

export interface Model {
  id: ModelId;
  /** normal: mu, sigma · lognormal: mu, sigma of ln x · Weibull: beta (shape), eta (scale) · exponential: mean */
  p: Record<string, number>;
  /** the parameters counted for AIC (the lower end fixed at zero is not one) */
  k: number;
  /** ln L at the maximum (the normal's and lognormal's spread at its 1/n maximum, whatever spread the shape is read with) */
  ll: number;
  aic: number;
}
export interface Goodness {
  a2: number;
  /** A² as the tables want it: scaled for the shape and n */
  astar: number;
  /** the p-value; for Weibull and exponential, interpolated in Stephens' tables and held at the table's ends */
  p: number;
  /** p is held at the end of the table: "above" — p is at least this; "below" — p is at most this */
  edge?: 'above' | 'below';
}
export interface Candidate { model: Model; ad?: Goodness; rejected: boolean }
export interface Excluded { id: ModelId; why: string }
export interface FitSet {
  n: number;
  /** fewer than this many different values: the goodness test is thrown by rounding */
  distinct: number;
  candidates: Candidate[];
  excluded: Excluded[];
  /** the shape that leads: the lowest AIC among those not rejected (the normal kept when it is within AIC_ABOUT_EQUAL of that) */
  leads?: ModelId;
  /** nothing was kept: the one with the lowest AIC, to show how far off the best is */
  closest?: ModelId;
  /** other shapes that fit about as well as the leader (within AIC_ABOUT_EQUAL) and were not rejected */
  alsoFit: ModelId[];
}

/* ------------------------------------------------------------------ the shapes */
export function cdf(m: Model, x: number): number {
  switch (m.id) {
    case 'normal': return ncdf((x - m.p.mu) / m.p.sigma);
    case 'lognormal': return x <= 0 ? 0 : ncdf((Math.log(x) - m.p.mu) / m.p.sigma);
    case 'weibull': return x <= 0 ? 0 : -Math.expm1(-Math.pow(x / m.p.eta, m.p.beta));
    case 'exponential': return x <= 0 ? 0 : -Math.expm1(-x / m.p.mean);
  }
}
/** The value that a share p of the set falls at or below. */
export function quantileOf(m: Model, p: number): number {
  switch (m.id) {
    case 'normal': return m.p.mu + m.p.sigma * normalQuantile(p);
    case 'lognormal': return Math.exp(m.p.mu + m.p.sigma * normalQuantile(p));
    case 'weibull': return m.p.eta * Math.pow(-Math.log1p(-p), 1 / m.p.beta);
    case 'exponential': return -m.p.mean * Math.log1p(-p);
  }
}
/** ln F(x) and ln(1 − F(x)) without losing the tails — what the Anderson–Darling sum needs. */
function logs(m: Model, x: number): [number, number] {
  switch (m.id) {
    case 'normal': { const z = (x - m.p.mu) / m.p.sigma; return [Math.log(Math.max(ncdf(z), 1e-300)), Math.log(Math.max(upperTail(z), 1e-300))]; }
    case 'lognormal': { const z = (Math.log(x) - m.p.mu) / m.p.sigma; return [Math.log(Math.max(ncdf(z), 1e-300)), Math.log(Math.max(upperTail(z), 1e-300))]; }
    case 'weibull': { const z = Math.pow(x / m.p.eta, m.p.beta); return [Math.log(Math.max(-Math.expm1(-z), 1e-300)), -z]; }
    case 'exponential': { const z = x / m.p.mean; return [Math.log(Math.max(-Math.expm1(-z), 1e-300)), -z]; }
  }
}

/** The Weibull shape β by maximum likelihood: the root of Σ xᵝ ln x ÷ Σ xᵝ − 1/β − mean(ln x), which only rises with β. */
function weibullFit(xs: number[]): { beta: number; eta: number } | undefined {
  const mx = Math.max(...xs), ys = xs.map(x => x / mx), ly = ys.map(Math.log), mly = mean(ly);
  if (!(sdOf(xs) > 0)) return undefined;
  const g = (b: number): number => {
    let s0 = 0, s1 = 0;
    for (let i = 0; i < ys.length; i++) { const w = Math.exp(b * ly[i]); s0 += w; s1 += w * ly[i]; }
    return s1 / s0 - 1 / b - mly;
  };
  let lo = 0.02, hi = 4000;
  if (!(g(lo) < 0) || !(g(hi) > 0)) return undefined;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (g(mid) > 0) hi = mid; else lo = mid; if (hi - lo < 1e-13 * hi) break; }
  const beta = (lo + hi) / 2;
  let s = 0; for (const y of ys) s += Math.pow(y, beta);
  return { beta, eta: mx * Math.pow(s / ys.length, 1 / beta) };
}

/** Fit one shape to the readings (every reading above zero for the three that cannot go below it). */
export function fitModel(id: ModelId, xs: number[]): Model | { why: string } {
  const n = xs.length;
  if (n < 3) return { why: 'needs at least three readings' };
  if (id === 'normal') {
    const mu = mean(xs), sigma = sdOf(xs);
    if (!(sigma > 0)) return { why: 'every reading is the same' };
    const sml = Math.sqrt(xs.reduce((a, x) => a + (x - mu) ** 2, 0) / n), ll = -n / 2 * (Math.log(2 * Math.PI * sml * sml) + 1);
    return { id, p: { mu, sigma }, k: 2, ll, aic: 4 - 2 * ll };
  }
  if (xs.some(x => !(x > 0))) return { why: 'needs every reading above zero' };
  if (id === 'lognormal') {
    const lx = xs.map(Math.log), mu = mean(lx), sigma = sdOf(lx);
    if (!(sigma > 0)) return { why: 'every reading is the same' };
    const sml = Math.sqrt(lx.reduce((a, x) => a + (x - mu) ** 2, 0) / n), ll = -n / 2 * (Math.log(2 * Math.PI * sml * sml) + 1) - lx.reduce((a, b) => a + b, 0);
    return { id, p: { mu, sigma }, k: 2, ll, aic: 4 - 2 * ll };
  }
  if (id === 'weibull') {
    const w = weibullFit(xs); if (!w) return { why: 'the shape could not be found (the readings are too alike, or too few)' };
    let ll = 0; for (const x of xs) { const z = Math.pow(x / w.eta, w.beta); ll += Math.log(w.beta / w.eta) + (w.beta - 1) * Math.log(x / w.eta) - z; }
    return { id, p: { beta: w.beta, eta: w.eta }, k: 2, ll, aic: 4 - 2 * ll };
  }
  const m = mean(xs), ll = -n * Math.log(m) - n;
  return { id, p: { mean: m }, k: 1, ll, aic: 2 - 2 * ll };
}

/* ------------------------------------------------------------------ is it a fit */
/** Stephens' (1977) points for the extreme-value (Weibull on ln x), and for the exponential (1977, 1974) — as SciPy's anderson holds them. */
const GUMBEL_CRIT = [0.474, 0.637, 0.757, 0.877, 1.038], GUMBEL_P = [0.25, 0.1, 0.05, 0.025, 0.01];
const EXPON_CRIT = [0.916, 1.062, 1.321, 1.591, 1.959], EXPON_P = [0.15, 0.1, 0.05, 0.025, 0.01];

/** A p by straight interpolation in a table of (critical value, p), held at its two ends. */
function tableP(a: number, crit: number[], ps: number[]): { p: number; edge?: 'above' | 'below' } {
  if (a <= crit[0]) return { p: ps[0], edge: 'above' };
  if (a >= crit[crit.length - 1]) return { p: ps[ps.length - 1], edge: 'below' };
  for (let i = 1; i < crit.length; i++) if (a <= crit[i]) return { p: ps[i - 1] + (ps[i] - ps[i - 1]) * (a - crit[i - 1]) / (crit[i] - crit[i - 1]) };
  return { p: ps[ps.length - 1], edge: 'below' };
}
/** D'Agostino & Stephens (1986): p for a normal with both estimated, from A* = A²(1 + 0.75/n + 2.25/n²). */
function normalP(A: number): number {
  const p = A >= 0.6 ? Math.exp(1.2937 - 5.709 * A + 0.0186 * A * A)
    : A >= 0.34 ? Math.exp(0.9177 - 4.279 * A - 1.38 * A * A)
    : A >= 0.2 ? 1 - Math.exp(-8.318 + 42.796 * A - 59.938 * A * A)
    : 1 - Math.exp(-13.436 + 101.14 * A - 223.73 * A * A);
  return Math.min(1, Math.max(0, p));
}

/** Anderson–Darling of the readings against a fitted shape, with its p. */
export function goodness(m: Model, xs: number[]): Goodness | undefined {
  const n = xs.length;
  if (n < 8) return undefined;
  const s = [...xs].sort((a, b) => a - b), L = s.map(x => logs(m, x));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (2 * i + 1) * (L[i][0] + L[n - 1 - i][1]);
  const a2 = -n - sum / n;
  if (m.id === 'normal' || m.id === 'lognormal') { const A = a2 * (1 + 0.75 / n + 2.25 / (n * n)); return { a2, astar: A, p: normalP(A) }; }
  if (m.id === 'weibull') { const A = a2 * (1 + 0.2 / Math.sqrt(n)); return { a2, astar: A, ...tableP(A, GUMBEL_CRIT, GUMBEL_P) }; }
  const A = a2 * (1 + 0.6 / n); return { a2, astar: A, ...tableP(A, EXPON_CRIT, EXPON_P) };
}

/** Every shape fitted and judged, and which leads. */
export function fitAll(xs: number[]): FitSet {
  const n = xs.length, candidates: Candidate[] = [], excluded: Excluded[] = [];
  const distinct = new Set(xs).size;
  for (const id of MODEL_IDS) {
    const m = fitModel(id, xs);
    if ('why' in m) { excluded.push({ id, why: m.why }); continue; }
    const ad = goodness(m, xs);
    candidates.push({ model: m, ...(ad ? { ad } : {}), rejected: !!ad && ad.p < REJECT_P });
  }
  const set: FitSet = { n, distinct, candidates, excluded, alsoFit: [] };
  const kept = candidates.filter(c => !c.rejected && c.ad);
  if (kept.length) {
    const best = [...kept].sort((a, b) => a.model.aic - b.model.aic)[0];
    const normal = kept.find(c => c.model.id === 'normal');
    set.leads = normal && normal.model.aic - best.model.aic < AIC_ABOUT_EQUAL ? 'normal' : best.model.id;
    const lead = candidates.find(c => c.model.id === set.leads) as Candidate;
    set.alsoFit = kept.filter(c => c.model.id !== set.leads && c.model.aic - lead.model.aic < AIC_ABOUT_EQUAL).map(c => c.model.id);
  } else if (candidates.length) {
    set.closest = [...candidates].sort((a, b) => a.model.aic - b.model.aic)[0].model.id;
  }
  return set;
}
export const candidateOf = (f: FitSet, id: ModelId | undefined): Candidate | undefined => f.candidates.find(c => c.model.id === id);

/* ------------------------------------------------------------------ the tail */
/** The three points a capability index and a tail are read from: 0.135%, the median and 99.865% (the ±3σ of a bell). */
export const P_LOW = 0.00135, P_MID = 0.5, P_HIGH = 0.99865;
export interface Tail {
  p00135: number; p50: number; p99865: number;
  /** the share of the set beyond each limit under this shape */
  below?: number; above?: number; out?: number;
  /** the percentile index (ISO 22514-2; Clements 1989): (limit − median) ÷ (X99.865 − median), the lower side likewise; the smaller is Ppk */
  ppu?: number; ppl?: number; ppk?: number; side?: 'low' | 'high';
}
export function tailOf(m: Model, lower?: number, upper?: number): Tail {
  const p00135 = quantileOf(m, P_LOW), p50 = quantileOf(m, P_MID), p99865 = quantileOf(m, P_HIGH);
  const t: Tail = { p00135, p50, p99865 };
  if (lower !== undefined) t.below = cdf(m, lower);
  if (upper !== undefined) t.above = 1 - cdf(m, upper);
  if (t.below !== undefined || t.above !== undefined) t.out = (t.below ?? 0) + (t.above ?? 0);
  if (upper !== undefined && p99865 > p50) t.ppu = (upper - p50) / (p99865 - p50);
  if (lower !== undefined && p50 > p00135) t.ppl = (p50 - lower) / (p50 - p00135);
  const sides = [t.ppl === undefined ? undefined : ['low', t.ppl] as const, t.ppu === undefined ? undefined : ['high', t.ppu] as const].filter((x): x is readonly ['low' | 'high', number] => !!x);
  if (sides.length) { const lowest = sides.reduce((a, b) => (b[1] < a[1] ? b : a)); t.ppk = lowest[1]; t.side = lowest[0]; }
  return t;
}

/** The probability plot: each reading, in order, against what the shape says it should be at its place in the set — a straight
 *  line of equal values is a fit; a curve says which way it leans (the record: positions (i − 0.5) ÷ n, Hazen). */
export function probabilityPlot(m: Model, xs: number[]): [number, number][] {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return s.map((v, i) => [quantileOf(m, (i + 0.5) / n), v] as [number, number]);
}
