/* WEIBULL — does a part wear out, fail at random or fail young, and when
 * should it be changed? (knowledge/specs/FC-060-weibull.md; knowledge/methods/
 * maintenance/weibull.md.)
 *
 * The ages of a part when it failed — and of the parts still running, which
 * count and are never dropped — fitted to R(t) = exp(−(t ÷ η)^β) by MAXIMUM
 * LIKELIHOOD, with the 90% likelihood-ratio interval on β and on the B10 life.
 * The Weibull plot's line (median-rank regression, Bernard's approximation,
 * Johnson's adjusted ranks for the parts still running) is drawn beside it as
 * the check that one failure mode is in play. From the fit: B10 and B50, the
 * mean life, the chance a part of a given age fails in the next stretch, and
 * the age-replacement interval that costs least given what a failure and a
 * planned change cost (Barlow and Hunter 1960).
 *
 * Ages are scaled by the oldest before fitting (no overflow with large β) and
 * scaled back. Every figure is checked against SciPy in
 * scripts/knowledge/cases-w5.py. Pure. */
import { lnGamma } from './chi2';
import { num, sig } from './words';
import type { LeanTile } from '../../lib/lean';

/** Failures before the shape is fitted. */
export const WEIBULL_MIN = 6;
/** Under this many failures every figure is a first guess. */
export const WEIBULL_FIRM = 20;
/** The two fits differ when their β differ by this share. */
export const FITS_DIFFER = 0.2;
/** A Weibull plot straighter than this is one mode; under it, a doubt is said. */
export const STRAIGHT_R2 = 0.9;

export interface Life { age: number; failed: boolean }

const C10 = -Math.log(0.9);
const CUT90 = 1.3527717;     // ½ χ²₁(0.90) = ½ × 2.705543 — the likelihood-ratio drop for a 90% interval

/* ------------------------------------------------------------------ the likelihood */

function logLik(b: number, eta: number, x: readonly number[], failed: readonly boolean[]): number {
  let l = 0;
  for (let i = 0; i < x.length; i++) {
    const z = (x[i] / eta) ** b;
    l -= z;
    if (failed[i]) l += Math.log(b) - b * Math.log(eta) + (b - 1) * Math.log(x[i]);
  }
  return l;
}

/** The profile log-likelihood in β (η eliminated), up to a constant that does not depend on β. */
function profile(b: number, x: readonly number[], failed: readonly boolean[]): number {
  const r = failed.filter(Boolean).length;
  let sum = 0, lf = 0;
  for (let i = 0; i < x.length; i++) { sum += x[i] ** b; if (failed[i]) lf += Math.log(x[i]); }
  return r * Math.log(b) - r * Math.log(sum / r) + (b - 1) * lf - r;
}

function mle(x: readonly number[], failed: readonly boolean[]): { beta: number; eta: number } | undefined {
  const r = failed.filter(Boolean).length;
  if (r < 2) return undefined;
  const meanLn = x.reduce((s, v, i) => s + (failed[i] ? Math.log(v) : 0), 0) / r;
  const g = (b: number): number => {
    let sw = 0, swl = 0;
    for (const v of x) { const p = v ** b; sw += p; swl += p * Math.log(v); }
    return sw > 0 ? swl / sw - 1 / b - meanLn : NaN;
  };
  let lo = 0.02, hi = 100;
  const glo = g(lo), ghi = g(hi);
  if (!(glo < 0 && ghi > 0)) return undefined;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (g(mid) < 0) lo = mid; else hi = mid; }
  const beta = (lo + hi) / 2;
  const eta = (x.reduce((s, v) => s + v ** beta, 0) / r) ** (1 / beta);
  return Number.isFinite(beta) && Number.isFinite(eta) && eta > 0 ? { beta, eta } : undefined;
}

/** Where the profile falls `cut` below its peak, on either side of β̂. */
function betaBounds(b0: number, x: readonly number[], failed: readonly boolean[]): { lo: number; hi: number } | undefined {
  const peak = profile(b0, x, failed), target = peak - CUT90;
  const f = (b: number) => profile(b, x, failed) - target;
  let a = b0;
  const step = 0.8;
  for (let i = 0; i < 60 && f(a) > 0; i++) a *= step;
  if (f(a) > 0) return undefined;
  let lo = a, hi = b0;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
  const bLo = (lo + hi) / 2;
  let c = b0;
  for (let i = 0; i < 60 && f(c) > 0; i++) c *= 1.25;
  if (f(c) > 0) return undefined;
  lo = b0; hi = c;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return { lo: bLo, hi: (lo + hi) / 2 };
}

/** The log-likelihood maximised over β with the B10 life fixed at v. */
function b10Profile(v: number, x: readonly number[], failed: readonly boolean[]): number {
  const f = (lb: number) => { const b = Math.exp(lb); return logLik(b, v / C10 ** (1 / b), x, failed); };
  let a = Math.log(0.05), c = Math.log(100);
  const phi = (Math.sqrt(5) - 1) / 2;
  let x1 = c - phi * (c - a), x2 = a + phi * (c - a), f1 = f(x1), f2 = f(x2);
  for (let i = 0; i < 90; i++) {
    if (f1 < f2) { a = x1; x1 = x2; f1 = f2; x2 = a + phi * (c - a); f2 = f(x2); }
    else { c = x2; x2 = x1; f2 = f1; x1 = c - phi * (c - a); f1 = f(x1); }
  }
  return Math.max(f1, f2);
}

function b10Bounds(b10: number, peakLogLik: number, x: readonly number[], failed: readonly boolean[]): { lo: number; hi: number } | undefined {
  const target = peakLogLik - CUT90;
  const f = (v: number) => b10Profile(v, x, failed) - target;
  let a = b10;
  for (let i = 0; i < 40 && f(a) > 0; i++) a *= 0.8;
  let c = b10;
  for (let i = 0; i < 40 && f(c) > 0; i++) c *= 1.25;
  if (f(a) > 0 || f(c) > 0) return undefined;
  let lo = a, hi = b10;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
  const bl = (lo + hi) / 2;
  lo = b10; hi = c;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return { lo: bl, hi: (lo + hi) / 2 };
}

/* ------------------------------------------------------------------ the plot's line */

/** Johnson's adjusted ranks for the failures among the parts (the parts still
 *  running at a failure's age come after it), and Bernard's median rank. */
export function johnsonRanks(lives: readonly Life[]): { age: number; adj: number; f: number }[] {
  const items = [...lives].sort((a, b) => a.age - b.age || Number(b.failed) - Number(a.failed));
  const N = items.length;
  let prev = 0;
  const out: { age: number; adj: number; f: number }[] = [];
  items.forEach((it, i) => {
    if (!it.failed) return;
    const reverse = N - i;
    prev = prev + (N + 1 - prev) / (1 + reverse);
    out.push({ age: it.age, adj: prev, f: (prev - 0.3) / (N + 0.4) });
  });
  return out;
}

export function rankRegression(lives: readonly Life[]): { beta: number; eta: number; r2: number; points: { age: number; f: number }[] } | undefined {
  const pts = johnsonRanks(lives);
  const xs = pts.map(p => Math.log(p.age)), ys = pts.map(p => Math.log(-Math.log(1 - p.f)));
  const n = pts.length;
  if (n < 2) return undefined;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0), syy = ys.reduce((s, v) => s + (v - my) ** 2, 0), sxy = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  if (!(sxx > 0)) return undefined;
  const beta = sxy / sxx, icpt = my - beta * mx;
  return { beta, eta: Math.exp(-icpt / beta), r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1, points: pts.map(p => ({ age: p.age, f: p.f })) };
}

/* ------------------------------------------------------------------ the fit */

export type WeibullReading = 'wears' | 'random' | 'young';
export interface WeibullFit {
  failures: number; running: number;
  enough: 'none' | 'few' | 'rough' | 'enough';
  beta?: number; eta?: number; betaLo?: number; betaHi?: number;
  b10?: number; b10Lo?: number; b10Hi?: number; b50?: number; meanLife?: number;
  /** The Weibull plot's own line and the failures' points on it. */
  rr?: { beta: number; eta: number; r2: number };
  points: { age: number; f: number }[];
  /** Wears out or fails young only when the 90% interval is clear of 1; else random, `leans` saying which way β̂ points. */
  says?: WeibullReading;
  leans?: 'wears' | 'young';
  /** The two fits' β differ by FITS_DIFFER or more. */
  fitsDiffer?: boolean;
  /** The plot is not straight. */
  crooked?: boolean;
  /** Why it is not fitted, when it is not (equal ages and the like). */
  why?: string;
}

/** Valid lives: an age more than 0 and under 10⁷. */
export const validAge = (a: number): boolean => Number.isFinite(a) && a > 0 && a < 1e7;

export function fitWeibull(lives: readonly Life[]): WeibullFit {
  const ok = lives.filter(l => validAge(l.age));
  const failures = ok.filter(l => l.failed).length, running = ok.length - failures;
  const out: WeibullFit = { failures, running, enough: failures === 0 ? 'none' : failures < WEIBULL_MIN ? 'few' : failures < WEIBULL_FIRM ? 'rough' : 'enough', points: [] };
  const rr = rankRegression(ok);
  if (rr) out.points = rr.points;
  if (failures < WEIBULL_MIN) return out;
  const scale = Math.max(...ok.map(l => l.age));
  const x = ok.map(l => l.age / scale), failed = ok.map(l => l.failed);
  const m = mle(x, failed);
  if (!m) { out.why = new Set(ok.filter(l => l.failed).map(l => l.age)).size < 2 ? 'every failure is the same age' : 'the ages do not give a fit'; return out; }
  const beta = m.beta, eta = m.eta * scale;
  out.beta = beta; out.eta = eta;
  out.b10 = eta * C10 ** (1 / beta); out.b50 = eta * Math.log(2) ** (1 / beta); out.meanLife = eta * Math.exp(lnGamma(1 + 1 / beta));
  const bb = betaBounds(beta, x, failed);
  if (bb) { out.betaLo = bb.lo; out.betaHi = bb.hi; }
  const peak = logLik(m.beta, m.eta, x, failed);
  const bl = b10Bounds(out.b10 / scale, peak, x, failed);
  if (bl) { out.b10Lo = bl.lo * scale; out.b10Hi = bl.hi * scale; }
  if (rr) {
    out.rr = { beta: rr.beta, eta: rr.eta, r2: rr.r2 };
    out.fitsDiffer = Math.abs(rr.beta - beta) / beta >= FITS_DIFFER;
    out.crooked = rr.r2 < STRAIGHT_R2;
  }
  if (out.betaLo !== undefined && out.betaHi !== undefined) {
    out.says = out.betaLo > 1 ? 'wears' : out.betaHi < 1 ? 'young' : 'random';
    if (out.says === 'random' && beta !== 1) out.leans = beta > 1 ? 'wears' : 'young';
  }
  return out;
}

/** R(t) of a fit. */
export const reliabilityAt = (beta: number, eta: number, age: number): number => Math.exp(-((age / eta) ** beta));

/** The chance a part of `age` fails within the next `ahead`. */
export const failsWithin = (beta: number, eta: number, age: number, ahead: number): number =>
  1 - Math.exp(-(((age + ahead) / eta) ** beta - (age / eta) ** beta));

/* ------------------------------------------------------------------ the age-replacement interval */

export interface Replacement { T: number; rate: number; runRate: number; savingPct: number }

/** The interval T minimising [Cp R(T) + Cf (1 − R(T))] ÷ ∫₀ᵀ R — for β > 1 and a failure that costs more than a planned change; searched over 0.02 η … 5 η. */
export function ageReplacement(beta: number, eta: number, cp: number, cf: number): Replacement | undefined {
  if (!(beta > 1) || !(cf > cp) || !(cp >= 0) || !(eta > 0)) return undefined;
  const R = (t: number) => Math.exp(-((t / eta) ** beta));
  const integral = (T: number) => { const N = 400, h = T / N; let s = R(0) + R(T); for (let i = 1; i < N; i++) s += R(i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; };
  const rate = (T: number) => (cp * R(T) + cf * (1 - R(T))) / integral(T);
  const G = 400, lo = 0.02 * eta, hi = 5 * eta;
  let best = 0, bv = Infinity;
  const grid = Array.from({ length: G + 1 }, (_, i) => lo * (hi / lo) ** (i / G));
  grid.forEach((T, i) => { const v = rate(T); if (v < bv) { bv = v; best = i; } });
  if (best === 0 || best === G) return undefined;
  let a = grid[best - 1], c = grid[best + 1];
  const phi = (Math.sqrt(5) - 1) / 2;
  let x1 = c - phi * (c - a), x2 = a + phi * (c - a), f1 = rate(x1), f2 = rate(x2);
  for (let i = 0; i < 80; i++) {
    if (f1 > f2) { a = x1; x1 = x2; f1 = f2; x2 = a + phi * (c - a); f2 = rate(x2); }
    else { c = x2; x2 = x1; f2 = f1; x1 = c - phi * (c - a); f1 = rate(x1); }
  }
  const T = (a + c) / 2, r = rate(T), run = cf / (eta * Math.exp(lnGamma(1 + 1 / beta)));
  return { T, rate: r, runRate: run, savingPct: 1 - r / run };
}

/* ------------------------------------------------------------------ lives from the watch */

/** The lives the study's own gaps stand for: a part replaced at each event.
 *  The first gap is a life only if the part was new when the watching began;
 *  the running stretch since the last event is a part still running. `at`:
 *  the events' clock in running hours; `hours`: the running time in all. */
export function watchLives(at: readonly number[], hours: number, newAtStart: boolean): Life[] {
  const out: Life[] = [];
  let prev = 0;
  at.forEach((h, i) => {
    const gap = h - prev;
    if (gap > 1e-9 && (i > 0 || newAtStart)) out.push({ age: gap, failed: true });
    prev = h;
  });
  const tail = hours - prev;
  if (tail > 1e-9 && (at.length > 0 || newAtStart)) out.push({ age: tail, failed: false });
  return out;
}

/* ------------------------------------------------------------------ in words */

export interface WeibullSaid { text: string; tone: 'r' | 'a' | 'g' | 'n' }

const range = (lo: number | undefined, hi: number | undefined, f: (x: number) => string): string => (lo !== undefined && hi !== undefined ? `90% sure ${f(lo)}–${f(hi)}` : '');

/** The sentence. */
export function weibullSays(unit: string, w: WeibullFit): WeibullSaid {
  if (w.beta === undefined) {
    if (w.why) return { text: `Not fitted: ${w.why}.`, tone: 'n' };
    if (!w.failures) return { text: 'No failures in the lives yet — a Weibull is fitted from 6.', tone: 'n' };
    return { text: `${w.failures} failure${w.failures === 1 ? '' : 's'} so far — a Weibull is fitted from ${WEIBULL_MIN}, because with fewer the shape is a guess.`, tone: 'n' };
  }
  const rough = w.enough === 'rough' ? `; a first guess — ${w.failures} failures, ${WEIBULL_FIRM} before it is firm` : '';
  const b = `β ${sig(w.beta)}, ${range(w.betaLo, w.betaHi, sig)}${rough}`;
  const verb = w.says === 'wears' ? `This part wears out (${b}): the older it gets, the likelier it fails.`
    : w.says === 'young' ? `This part fails young (${b}): new ones fail more than old ones — look at fitting and commissioning, not wear.`
    : `Age makes no difference that can be told (${b}, which holds 1)${w.leans ? `, though it leans ${w.leans === 'wears' ? 'wear-out' : 'early failure'}` : ''}.`;
  const lives = ` A tenth have failed by about ${num(w.b10 ?? 0)} ${unit}${w.b10Lo !== undefined ? ` (${range(w.b10Lo, w.b10Hi, num)})` : ''}, half by ${num(w.b50 ?? 0)}; the mean life is ${num(w.meanLife ?? 0)} ${unit}.`;
  return { text: verb + lives, tone: 'n' };
}

/** What it means — the doubts the page owes, plain. */
export function weibullInsights(unit: string, w: WeibullFit, hasRunning: boolean): WeibullSaid[] {
  const out: WeibullSaid[] = [];
  if (w.beta === undefined) return out;
  if (w.fitsDiffer && w.rr) out.push({ text: `The two fits differ: maximum likelihood β ${sig(w.beta)}, the plot’s line β ${sig(w.rr.beta)}. With ${w.failures} failures read β as a range, and the maximum-likelihood one leans steep on few.`, tone: 'a' });
  if (w.crooked && w.rr) out.push({ text: `The plot is not straight (r² ${sig(w.rr.r2)}): two failure modes in one list, or a stretch before the first failure. Split the modes — one count each — before trusting the shape.`, tone: 'a' });
  if (!hasRunning) out.push({ text: 'Every part listed has failed. A part changed before it failed belongs in the list as still running — leaving it out biases β high and the change interval too early.', tone: 'a' });
  if (w.says === 'random') out.push({ text: 'Changing it on a schedule buys nothing if failures do not depend on age: look for the cause of each failure instead.', tone: 'n' });
  void unit;
  return out;
}

/** The chance a part at an age fails in the next stretch, as a sentence. */
export function conditionalSays(unit: string, w: WeibullFit, age: number, ahead: number): string {
  if (w.beta === undefined || w.eta === undefined || !(age >= 0) || !(ahead > 0)) return '';
  const p = failsWithin(w.beta, w.eta, age, ahead);
  const odds = p >= 0.1 ? `about 1 in ${Math.round(1 / p)}` : `${(p * 100).toFixed(1)}%`;
  return `A part that has run ${num(age)} ${unit} has ${(p * 100).toFixed(p < 0.1 ? 1 : 0)}% chance (${odds}) of failing in the next ${num(ahead)}.`;
}

export interface ReplaceWords { text: string; missing: string[] }
/** The replacement interval and what it saves, or what is missing. */
export function replaceSays(unit: string, w: WeibullFit, cp: number | undefined, cf: number | undefined, gbpFn: (n: number) => string, dayUnits?: number): ReplaceWords {
  const missing: string[] = [];
  if (w.beta === undefined || w.eta === undefined) return { text: '', missing };
  if (w.says !== 'wears') return { text: w.says === 'young' ? 'No interval: a part that fails young is not helped by changing it on a schedule.' : 'No interval: age makes no difference that can be told, so changing it on a schedule buys nothing that can be shown.', missing };
  if (!(cp !== undefined && cp >= 0)) missing.push('what a planned change costs');
  if (!(cf !== undefined && cf > 0)) missing.push('what a failure costs (the part, the labour, the line’s lost time)');
  if (missing.length) return { text: `Give ${missing.join(' and ')} to say when to change it and what that saves.`, missing };
  if (!(cf !== undefined && cp !== undefined && cf > cp)) return { text: 'No interval beats running it to failure: a failure costs no more than a planned change.', missing };
  const rep = ageReplacement(w.beta, w.eta, cp as number, cf as number);
  if (!rep) return { text: 'No age to change it at beats running it to failure within five times its characteristic life.', missing };
  const firm = w.enough === 'enough' && (w.betaLo ?? 0) > 1;
  const per = rep.runRate - rep.rate;
  const day = dayUnits ? ` — ${gbpFn(per * dayUnits)} a day of the line’s shifts (${num(dayUnits)} ${unit} a day)` : '';
  return { text: `Changing it at about ${num(rep.T)} ${unit}${firm ? '' : ' (a first guess)'} costs ${gbpFn(rep.rate * 1000)} per 1,000 ${unit} against ${gbpFn(rep.runRate * 1000)} running it to failure — ${Math.round(rep.savingPct * 100)}% less, ${gbpFn(per * 1000)} per 1,000 ${unit}${day}. A planned change is ${gbpFn(cp as number)} and a failure ${gbpFn(cf as number)}.`, missing };
}

/** The tiles a part that wears adds. */
export function weibullTiles(unit: string, w: WeibullFit, rep: Replacement | undefined): LeanTile[] {
  if (w.beta === undefined) return [{ k: 'Shape β', v: '—', of: w.why ? w.why : `fitted from ${WEIBULL_MIN} failures — ${w.failures} so far` }, { k: 'B10 life', v: '—', of: 'said once the shape is fitted' }];
  return [
    { k: 'Shape β', v: sig(w.beta), of: `${w.says === 'wears' ? 'wears out' : w.says === 'young' ? 'fails young' : 'no wear that can be told'} · ${range(w.betaLo, w.betaHi, sig)} · ${w.failures} failed${w.running ? `, ${w.running} running` : ''}${w.enough === 'rough' ? ' · first guess' : ''}` },
    { k: 'B10 life', v: `${num(w.b10 ?? 0)} ${unit}`, of: `a tenth have failed by then${w.b10Lo !== undefined ? ` · ${range(w.b10Lo, w.b10Hi, num)}` : ''} · half by ${num(w.b50 ?? 0)}` },
    rep ? { k: 'Change at', v: `${num(rep.T)} ${unit}`, of: `age replacement · ${Math.round(rep.savingPct * 100)}% less than running to failure${w.enough === 'enough' && (w.betaLo ?? 0) > 1 ? '' : ' · first guess'}` }
      : { k: 'Change at', v: '—', of: w.says === 'wears' ? 'give the two costs to say it' : 'no wear that can be told — no interval' },
  ];
}

/** The table, rows of [label, value]. */
export function weibullRows(unit: string, w: WeibullFit): [string, string][] {
  if (w.beta === undefined) return [];
  const r: [string, string][] = [
    ['Shape β (maximum likelihood)', `${sig(w.beta)}${w.betaLo !== undefined ? ` (${range(w.betaLo, w.betaHi, sig)})` : ''}`],
    ['Characteristic life η', `${num(w.eta ?? 0)} ${unit}`],
    ['B10 — a tenth have failed', `${num(w.b10 ?? 0)} ${unit}${w.b10Lo !== undefined ? ` (${range(w.b10Lo, w.b10Hi, num)})` : ''}`],
    ['B50 — half have failed', `${num(w.b50 ?? 0)} ${unit}`],
    ['Mean life', `${num(w.meanLife ?? 0)} ${unit}`],
    ['Lives', `${w.failures} failed${w.running ? `, ${w.running} still running` : ''}`],
  ];
  if (w.rr) r.push(['The plot’s line (rank regression)', `β ${sig(w.rr.beta)}, η ${num(w.rr.eta)} ${unit}, r² ${sig(w.rr.r2)}`]);
  return r;
}

/* ------------------------------------------------------------------ the plot, once for the page and the paper */

export interface WeibullPlot {
  /** Axes in plot units: x = ln age, y = ln(−ln(1 − F)). */
  xMin: number; xMax: number; yMin: number; yMax: number;
  xTicks: { x: number; label: string }[]; yTicks: { y: number; label: string }[];
  points: { x: number; y: number }[];
  /** The two lines, as two ends each. */
  mle?: [{ x: number; y: number }, { x: number; y: number }];
  rr?: [{ x: number; y: number }, { x: number; y: number }];
}

const FTICKS = [0.01, 0.05, 0.1, 0.2, 0.5, 0.632, 0.9, 0.99];
const yOf = (f: number): number => Math.log(-Math.log(1 - f));

export function weibullPlot(w: WeibullFit): WeibullPlot | undefined {
  if (w.points.length < 2) return undefined;
  const ages = w.points.map(p => p.age);
  const lo = Math.min(...ages) / 1.6, hi = Math.max(...ages) * 1.6;
  const xMin = Math.log(lo), xMax = Math.log(hi);
  const pts = w.points.map(p => ({ x: Math.log(p.age), y: yOf(p.f) }));
  const ys = pts.map(p => p.y);
  const yMin = Math.min(yOf(0.01), Math.min(...ys) - 0.3), yMax = Math.max(yOf(0.99), Math.max(...ys) + 0.3);
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) ticks.push(v); }
  const out: WeibullPlot = {
    xMin, xMax, yMin, yMax,
    xTicks: ticks.map(v => ({ x: Math.log(v), label: num(v) })),
    yTicks: FTICKS.filter(f => yOf(f) >= yMin && yOf(f) <= yMax).map(f => ({ y: yOf(f), label: `${+(f * 100).toFixed(1)}%` })),
    points: pts,
  };
  if (w.beta !== undefined && w.eta !== undefined) out.mle = [{ x: xMin, y: w.beta * (xMin - Math.log(w.eta)) }, { x: xMax, y: w.beta * (xMax - Math.log(w.eta)) }];
  if (w.rr) out.rr = [{ x: xMin, y: w.rr.beta * (xMin - Math.log(w.rr.eta)) }, { x: xMax, y: w.rr.beta * (xMax - Math.log(w.rr.eta)) }];
  return out;
}
