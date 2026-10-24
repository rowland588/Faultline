/* THE ANALYSIS — its figures and its words (knowledge/specs/FC-105-analysis.md, W3a; 24 October 2026).
 *
 * One record (lib/study AgreedAnalysis on a ToolStudy of tool 'analysis'), four questions asked first —
 * how sure am I of this figure (FC-104, with the readings described, FC-103, and checked for dependence,
 * FC-115), did it change (FC-105), do two ways of measuring agree (FC-106), how many readings do I need
 * (FC-113, FC-020). The arithmetic is lib/ie/stats and lib/ie/describe (proved against SciPy); this module
 * turns a study's readings or counts into one picture's figures and the sentences the page and the paper
 * say — never a second copy of either. Confidence is said in the language throughout: "we can be 95%
 * confident". */
import type { AgreedAnalysis, AnalysisPlan, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { dagostinoPearson, histogram } from '../../lib/ie/dist';
import { describe, orderSays, type Described } from '../../lib/ie/describe';
import {
  autocorrelation, cyclesNeeded, differenceSeen, finiteN, mannWhitney, mean, meanInterval, nForMean, nForShare, nForTwoMeans, nForTwoShares, nZeroFailures,
  pairedT, rateInterval, sd, shareExact, shareWilson, spreadInterval, twoShares, welch, wilcoxon,
  type Autocorrelation, type Confidence, type CyclesNeeded, type Interval, type MannWhitneyResult, type PairedResult, type TwoShares, type WelchResult, type WilcoxonResult,
} from '../../lib/ie/stats';

export type Tone = 'g' | 'a' | 'r' | 'n';
/** Intervals on a mean need this many readings; a paired test this many pairs; a comparison this many a side (said weak under 8). */
export const MEAN_FROM = 8;
export const PAIRS_FROM = 6;
export const COMPARE_FROM = 3;
export const WEAK_UNDER = 8;
/** Bell-shapedness is checked from this many in a set. */
export const NORMAL_FROM = 20;
export const DEFAULT_CONFIDENCE: Confidence = 0.95;

export const KIND_WORDS: Record<AgreedAnalysis['kind'], { name: string; ask: string; example: string }> = {
  sure: { name: 'How sure', ask: 'How sure am I of this figure?', example: 'thirty packs weighed; 7 rejected out of 600; 12 stops in 40 hours' },
  change: { name: 'Did it change', ask: 'Did it really change?', example: 'fill weights before and after a re-calibration; rejects before and after new film' },
  paired: { name: 'Do two ways agree', ask: 'Do two ways of measuring agree?', example: 'two checkweighers on the same packs; the scale and the lab' },
  plan: { name: 'How many readings', ask: 'How many readings do I need?', example: 'to know a mean to ±0.3 g; to see a 0.5 g difference between shifts' },
};
export const confidenceOf = (a: Pick<AgreedAnalysis, 'confidence'>): Confidence => a.confidence ?? DEFAULT_CONFIDENCE;
export const pctWord = (c: number): string => `${Math.round(c * 100)}%`;

/* ------------------------------------------- reading the record --------------------------------------- */
const live = (rs: StudyReading[]): StudyReading[] => rs.filter(r => !r.struck);
const armValues = (rs: StudyReading[], arm: string): number[] => live(rs).filter(r => r.arm === arm && typeof r.value === 'number').map(r => r.value as number);
const noArm = (rs: StudyReading[]): number[] => live(rs).filter(r => !r.arm && typeof r.value === 'number').map(r => r.value as number);
const decimalsOf = (v: number): number => { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(4, s.length - i - 1); };
/** Decimals the person typed — the most any reading has (never more than four). */
export const placesOf = (vs: number[]): number => vs.reduce((m, v) => Math.max(m, decimalsOf(v)), 0);
const fx = (v: number, dp: number): string => v.toFixed(Math.max(0, dp)).replace('-', '−');
const big = (n: number): string => Math.round(n).toLocaleString('en-GB');
export const fmtP = (p: number): string => (p < 0.0001 ? '< 0.0001' : p >= 0.1 ? p.toFixed(2) : p >= 0.01 ? p.toFixed(3) : p.toFixed(4));
/** "p = 0.0006" — or "p < 0.0001" when it is smaller than is worth the digits. */
export const pSay = (p: number): string => (p < 0.0001 ? 'p < 0.0001' : `p = ${fmtP(p)}`);
const pct = (x: number): string => `${(x * 100).toFixed(x * 100 < 1 ? 2 : 1)}%`;
const pctPoints = (x: number): string => `${(Math.abs(x) * 100).toFixed(Math.abs(x) * 100 < 1 ? 2 : 1)} points`;
const unitOf = (a: AgreedAnalysis): string => (a.unit ? ` ${a.unit}` : '');
const singular = (u: string): string => u.replace(/s$/, '');

/** A reading in a counted run — made (the base) and rejected (the count). */
interface Run { k: number; n: number }
const runs = (rs: StudyReading[], arm?: string): Run => live(rs).filter(r => typeof r.made === 'number' && typeof r.rejected === 'number' && (arm === undefined ? !r.arm : r.arm === arm))
  .reduce((t, r) => ({ k: t.k + (r.rejected as number), n: t.n + (r.made as number) }), { k: 0, n: 0 });

/* ------------------------------------------- the figures ---------------------------------------------- */
export interface Check { what: string; say: string; tone: Tone }
interface Base { conf: Confidence; alpha: number; dp: number; unit: string; checks: Check[] }
export interface SureFigures extends Base {
  kind: 'sure'; of: 'mean' | 'share' | 'rate'; n: number; enough: boolean;
  d?: Described; mean?: Interval & { half: number }; spread?: Interval; ac?: Autocorrelation; hist?: ReturnType<typeof histogram>;
  share?: { k: number; n: number; p: number; exact: Interval; wilson: Interval };
  rate?: { count: number; hours: number; rate: number; int: Interval };
}
export interface ChangeFigures extends Base {
  kind: 'change'; data: 'measured' | 'counted'; enough: boolean; weak: boolean; better: 'lower' | 'higher' | 'either';
  before: number[]; after: number[]; descB?: Described; descA?: Described; welch?: WelchResult; mw?: MannWhitneyResult; leads: 'welch' | 'mw'; nonNormal: boolean;
  counted?: { k1: number; n1: number; k2: number; n2: number; t: TwoShares; before: Interval; after: Interval; straddle: boolean };
  /** the p the leading test gives, and whether it is under 1 − confidence */
  p?: number; significant: boolean;
  /** readings a group it would take to see a change this size at 80% power */
  needed?: number;
}
export interface PairedFigures extends Base {
  kind: 'paired'; enough: boolean; pairs: number; diffs: number[]; t?: PairedResult; wx?: WilcoxonResult; leads: 'ttest' | 'wilcoxon'; nonNormal: boolean;
  p?: number; significant: boolean; within?: number; agrees: boolean; dropped: number; first: string; second: string; desc?: Described;
}
export interface PlanFigures extends Base {
  kind: 'plan'; ask: AnalysisPlan['ask']; ok: boolean; why?: string; power: number;
  /** what is needed (the count that leads) and the alternatives said beside it */
  need?: number; alt?: { label: string; n: number }[]; sdUsed?: number; sdFrom?: 'typed' | 'readings'; have: number;
  cycles?: CyclesNeeded; seen?: { n: number; diff: number }[]; seconds?: number; minutes?: number; /** one person’s time at the line’s rate, when it has one */ pounds?: number;
}
export type AnalysisFigures = SureFigures | ChangeFigures | PairedFigures | PlanFigures;

const normalCheck = (what: string, xs: number[]): { check?: Check; non: boolean } => {
  if (xs.length < NORMAL_FROM) return { non: false };
  const dp = dagostinoPearson(xs); if (!dp) return { non: false };
  const non = dp.p < 0.05;
  return { non, check: { what, say: non ? `${what}: not bell-shaped (D’Agostino–Pearson ${pSay(dp.p)}) — the rank test leads.` : `${what}: bell-shaped enough for the t (D’Agostino–Pearson ${pSay(dp.p)}).`, tone: non ? 'a' : 'n' } };
};
const outlierCheck = (what: string, d?: Described): Check | undefined => (d && d.outliers.length
  ? { what, say: `${what}: ${d.outliers.length} reading${d.outliers.length === 1 ? '' : 's'} beyond the fences (${d.outliers.slice(0, 4).map(o => `${o.value} at reading ${o.at + 1}`).join(', ')}${d.outliers.length > 4 ? ', …' : ''}) — look at ${d.outliers.length === 1 ? 'it' : 'them'}; none is removed.`, tone: 'a' } : undefined);
const independenceCheck = (what: string, ac?: Autocorrelation): Check | undefined => {
  if (!ac) return undefined;
  if (!ac.enough) return { what, say: `${what}: ${ac.n} readings in order — fewer than 30, too few to judge whether each depends on the last.`, tone: 'n' };
  if (!ac.dependent) return { what, say: `${what}: each reading is independent enough of the last (r₁ ${fx(ac.r1, 2)}, inside ±${fx(ac.band, 2)}).`, tone: 'n' };
  return { what, say: orderSays(ac, 'Readings'), tone: 'a' };
};

export function analysisFigures(a: AgreedAnalysis, readings: StudyReading[], opts: { rate?: number } = {}): AnalysisFigures {
  const conf = confidenceOf(a), alpha = 1 - conf, unit = a.unit ?? '';
  const base = (dp: number): Base => ({ conf, alpha, dp, unit, checks: [] });
  if (a.kind === 'sure') {
    const of = a.of ?? 'mean';
    if (of === 'share') {
      const r = runs(readings), b = base(1); const f: SureFigures = { ...b, kind: 'sure', of, n: r.n, enough: r.n > 0 };
      if (r.n > 0 && r.k <= r.n) f.share = { k: r.k, n: r.n, p: r.k / r.n, exact: shareExact(r.k, r.n, conf), wilson: shareWilson(r.k, r.n, conf) };
      return f;
    }
    if (of === 'rate') {
      const r = runs(readings), b = base(2); const f: SureFigures = { ...b, kind: 'sure', of, n: r.k, enough: r.n > 0 };
      if (r.n > 0) f.rate = { count: r.k, hours: r.n, rate: r.k / r.n, int: rateInterval(r.k, r.n, conf) };
      return f;
    }
    const xs = noArm(readings), dp = placesOf(xs), f: SureFigures = { ...base(dp), kind: 'sure', of, n: xs.length, enough: xs.length >= MEAN_FROM };
    const d = describe(xs);
    if (d) { f.d = d; f.hist = histogram(xs); }
    if (d && f.enough) { const mi = meanInterval(d.n, d.mean, d.sd, conf); f.mean = mi; f.spread = d.sd > 0 ? spreadInterval(d.n, d.sd, conf) : undefined; }
    f.ac = autocorrelation(xs);
    const nc = normalCheck('Readings', xs), ic = independenceCheck('Order', f.ac), oc = outlierCheck('Readings', d);
    f.checks = [nc.check, ic, oc].filter((c): c is Check => !!c);
    return f;
  }
  if (a.kind === 'change') {
    const data = a.data ?? 'measured', better = a.better ?? 'either';
    if (data === 'counted') {
      const r1 = runs(readings, 'before'), r2 = runs(readings, 'after'), b = base(1);
      const f: ChangeFigures = { ...b, kind: 'change', data, enough: r1.n > 0 && r2.n > 0, weak: false, better, before: [], after: [], leads: 'welch', nonNormal: false, significant: false };
      const t = r1.n > 0 && r2.n > 0 ? twoShares(r1.k, r1.n, r2.k, r2.n) : undefined;
      if (t) {
        const p = t.leads === 'fisher' ? t.pFisher : t.pZ, straddle = (t.pZ < alpha) !== (t.pFisher < alpha);
        f.counted = { k1: r1.k, n1: r1.n, k2: r2.k, n2: r2.n, t, before: shareExact(r1.k, r1.n, conf), after: shareExact(r2.k, r2.n, conf), straddle };
        f.p = p; f.significant = p < alpha;
        const d = Math.abs(t.p2 - t.p1);
        if (!f.significant && d > 0) f.needed = nForTwoShares(Math.min(t.p1, t.p2), Math.max(t.p1, t.p2), conf, 0.8);
        if (t.leads === 'fisher') f.checks.push({ what: 'Test', say: `Test: the smallest expected count is ${fx(t.expectedMin, 1)}, under 5 — Fisher’s exact test leads (z gives ${pSay(t.pZ)}).`, tone: 'n' });
        else f.checks.push({ what: 'Test', say: `Test: every expected count is 5 or more — the z test leads (Fisher’s exact gives ${pSay(t.pFisher)}).`, tone: 'n' });
        if (straddle) f.checks.push({ what: 'Borderline', say: `Borderline: the z test (${pSay(t.pZ)}) and Fisher’s exact (${pSay(t.pFisher)}) fall either side of ${fmtP(alpha)} — more readings would settle it.`, tone: 'a' });
      }
      return f;
    }
    const bf = armValues(readings, 'before'), af = armValues(readings, 'after'), dp = placesOf([...bf, ...af]);
    const f: ChangeFigures = { ...base(dp), kind: 'change', data, enough: bf.length >= COMPARE_FROM && af.length >= COMPARE_FROM, weak: Math.min(bf.length, af.length) < WEAK_UNDER, better, before: bf, after: af, leads: 'welch', nonNormal: false, significant: false };
    f.descB = describe(bf); f.descA = describe(af);
    if (f.enough) {
      f.welch = welch(bf, af, conf); f.mw = mannWhitney(bf, af);
      const nb = normalCheck('Before', bf), na = normalCheck('After', af);
      f.nonNormal = nb.non || na.non; f.leads = f.nonNormal && f.mw ? 'mw' : 'welch';
      f.checks = [nb.check, na.check, outlierCheck('Before', f.descB), outlierCheck('After', f.descA)].filter((c): c is Check => !!c);
      if (!nb.check && !na.check) f.checks.push({ what: 'Shape', say: `Shape: fewer than ${NORMAL_FROM} in a group, so bell-shapedness is not checked — the t leads and the rank test is shown beside it.`, tone: 'n' });
      if (f.weak) f.checks.push({ what: 'Size', say: `Size: fewer than ${WEAK_UNDER} in a group — a weak test; read it as a hint.`, tone: 'a' });
      const p = f.leads === 'mw' ? f.mw?.p : f.welch?.p;
      if (p !== undefined) f.p = p;
      f.significant = p !== undefined && p < alpha;
      if (f.welch && !f.significant && Math.abs(f.welch.diff) > 0) {
        const pooled = Math.sqrt((f.welch.sdBefore ** 2 + f.welch.sdAfter ** 2) / 2);
        if (pooled > 0) f.needed = nForTwoMeans(Math.abs(f.welch.diff), pooled, conf, 0.8).exact;
      }
    }
    return f;
  }
  if (a.kind === 'paired') {
    const live2 = live(readings).filter(r => typeof r.value === 'number' && typeof r.with === 'number'), dp = placesOf(live2.flatMap(r => [r.value as number, r.with as number]));
    const diffs = live2.map(r => Math.round(((r.with as number) - (r.value as number)) * 1e9) / 1e9);
    const f: PairedFigures = { ...base(dp), kind: 'paired', enough: diffs.length >= PAIRS_FROM, pairs: diffs.length, diffs, leads: 'ttest', nonNormal: false, significant: false, within: a.within, agrees: false,
      dropped: live(readings).filter(r => typeof r.value === 'number' && typeof r.with !== 'number').length, first: a.firstName?.trim() || 'the first way', second: a.secondName?.trim() || 'the second way' };
    f.desc = describe(diffs);
    if (f.enough) {
      f.t = pairedT(diffs, conf); f.wx = wilcoxon(diffs);
      const nc = normalCheck('Differences', diffs); f.nonNormal = nc.non; f.leads = nc.non && f.wx ? 'wilcoxon' : 'ttest';
      if (nc.check) f.checks.push(nc.check); else f.checks.push({ what: 'Shape', say: `Shape: fewer than ${NORMAL_FROM} pairs, so bell-shapedness of the differences is not checked — the paired t leads and Wilcoxon’s is shown beside it.`, tone: 'n' });
      const oc = outlierCheck('Differences', f.desc); if (oc) f.checks.push(oc);
      const p = f.leads === 'wilcoxon' ? f.wx?.p : f.t?.p; if (p !== undefined) f.p = p;
      f.significant = p !== undefined && p < alpha;
      if (f.t && a.within !== undefined && a.within > 0) f.agrees = f.t.lo >= -a.within && f.t.hi <= a.within;
    }
    return f;
  }
  /* the plan: how many readings */
  const p = a.plan ?? { ask: 'mean' as const }, conf2 = conf, power = p.power ?? 0.8;
  const pilot = noArm(readings), sdUsed = p.sd !== undefined && p.sd > 0 ? p.sd : pilot.length >= MEAN_FROM && sd(pilot) > 0 ? sd(pilot) : undefined;
  const f: PlanFigures = { ...base(placesOf(pilot)), kind: 'plan', ask: p.ask, ok: false, power, have: pilot.length, sdUsed, sdFrom: p.sd !== undefined && p.sd > 0 ? 'typed' : sdUsed !== undefined ? 'readings' : undefined };
  const why = planProblem(p, pilot.length);
  if (why) { f.why = why; return f; }
  if (p.seconds && p.seconds > 0) f.seconds = p.seconds;
  switch (p.ask) {
    case 'mean': {
      const n = nForMean(sdUsed as number, p.e as number, conf2), t = p.population ? finiteN(n.t, p.population) : n.t;
      f.ok = true; f.need = t; f.alt = [{ label: 'by the normal’s z', n: n.z }, ...(p.population ? [{ label: `finite population of ${big(p.population)}`, n: t }] : [])];
      break;
    }
    case 'difference': {
      const n = nForTwoMeans(p.delta as number, sdUsed as number, conf2, power);
      f.ok = true; f.need = n.exact; f.alt = [{ label: 'by the normal approximation', n: Math.ceil(n.approx) }];
      f.seen = [Math.ceil(n.exact / 4), Math.ceil(n.exact / 2), n.exact].map(g => ({ n: g, diff: differenceSeen(Math.max(g, 2), sdUsed as number, conf2, power) }));
      break;
    }
    case 'share': {
      const pp = p.p !== undefined && p.p > 0 && p.p < 1 ? p.p : 0.5, n = nForShare(pp, p.e as number, conf2), t = p.population ? finiteN(n, p.population) : n;
      f.ok = true; f.need = t; f.alt = pp === 0.5 ? [] : [{ label: 'with nothing known (50%)', n: nForShare(0.5, p.e as number, conf2) }];
      if (p.population) f.alt.push({ label: `finite population of ${big(p.population)}`, n: t });
      break;
    }
    case 'twoShares': f.ok = true; f.need = nForTwoShares(p.p1 as number, p.p2 as number, conf2, power); break;
    case 'zero': f.ok = true; f.need = nZeroFailures(p.p0 as number, conf2); break;
    case 'cycles': {
      const c = cyclesNeeded(pilot, p.k as number, conf2); if (!c) { f.why = 'Time at least two cycles first.'; return f; }
      f.ok = true; f.cycles = c; f.need = c.n; f.alt = [{ label: 'by the normal’s z', n: Math.ceil(c.z) }];
      break;
    }
  }
  if (f.ok && f.need !== undefined && f.seconds) {
    const each = p.ask === 'difference' || p.ask === 'twoShares' ? 2 : 1;
    f.minutes = (f.need * each * f.seconds) / 60;
    if (opts.rate && opts.rate > 0) f.pounds = (f.minutes / 60) * opts.rate;
  }
  return f;
}

/** What is missing from a plan, said as the box to fill — empty when it can be worked out. */
export function planProblem(p: AnalysisPlan, pilotN = 0): string {
  const sdOk = (p.sd !== undefined && p.sd > 0) || pilotN >= MEAN_FROM;
  switch (p.ask) {
    case 'mean': return !sdOk ? 'A guess of the spread (s) — or at least 8 readings to take it from.' : !(p.e !== undefined && p.e > 0) ? 'The precision wanted, ± in the unit.' : '';
    case 'difference': return !sdOk ? 'A guess of the spread (s) — or at least 8 readings to take it from.' : !(p.delta !== undefined && p.delta > 0) ? 'The difference that matters, in the unit.' : '';
    case 'share': return !(p.e !== undefined && p.e > 0 && p.e < 0.5) ? 'The precision wanted, as a share — 0.02 for ±2 points.' : '';
    case 'twoShares': return !(p.p1 !== undefined && p.p2 !== undefined && p.p1 >= 0 && p.p1 <= 1 && p.p2 >= 0 && p.p2 <= 1 && p.p1 !== p.p2) ? 'Two different shares, before and after — 0.10 and 0.05.' : '';
    case 'zero': return !(p.p0 !== undefined && p.p0 > 0 && p.p0 < 1) ? 'The share allowed to be bad — 0.01 for 99% good.' : '';
    case 'cycles': return pilotN < 2 ? 'Time at least two cycles first — type them as readings.' : !(p.k !== undefined && p.k > 0 && p.k < 1) ? 'The precision wanted, as a share of the mean — 0.05 for ±5%.' : '';
  }
}

/** What cannot be agreed, said while agreeing. */
export function analysisProblem(a: Pick<AgreedAnalysis, 'kind' | 'name' | 'within'>): string {
  if (!a.name.trim()) return 'What is measured — a name, "Fill weight".';
  if (a.within !== undefined && !(a.within > 0)) return 'The largest difference that does not matter — a number above 0, in the unit.';
  return '';
}

/* ------------------------------------------- the words ------------------------------------------------- */
export interface AnalysisSays { text: string; tone: Tone; verdict: string; /** the second sentence — the spread, the interval of each side, what it would take */ more: string[]; /** what it does not claim */ notClaimed: string }
const sure = (c: number): string => `we can be ${pctWord(c)} confident`;

export function analysisSays(f: AnalysisFigures, a: AgreedAnalysis): AnalysisSays {
  const u = unitOf(a), name = a.name.trim() || 'The figure';
  if (f.kind === 'sure') {
    if (f.of === 'share') {
      const s = f.share;
      if (!s) return { text: f.n === 0 ? 'Nothing counted yet. Type a run — how many were made, how many were rejected.' : 'The rejected cannot be more than were made.', tone: 'n', verdict: 'Not started', more: [], notClaimed: '' };
      const noun = name.toLowerCase();
      return { text: `${s.k} of ${big(s.n)} — ${pct(s.p)} ${noun}: ${sure(f.conf)} the true figure is between ${pct(s.exact.lo)} and ${pct(s.exact.hi)}.`, tone: 'n', verdict: `Between ${pct(s.exact.lo)} and ${pct(s.exact.hi)}`,
        more: [`Wilson’s interval, beside the exact: ${pct(s.wilson.lo)} to ${pct(s.wilson.hi)}.`, ...(s.k === 0 ? [`None found is not none there: at ${pctWord(f.conf)}, up to ${pct(s.exact.hi)} could still be.`] : [])],
        notClaimed: 'This is how sure the count is, not whether it is acceptable — that is the limit’s to say.' };
    }
    if (f.of === 'rate') {
      const r = f.rate, unitW = singular(a.unit?.trim() || 'hour');
      if (!r) return { text: 'Nothing counted yet. Type the count and the time it was counted over.', tone: 'n', verdict: 'Not started', more: [], notClaimed: '' };
      return { text: `${r.count} in ${big(r.hours)} ${a.unit?.trim() || 'hours'} — ${fx(r.rate, r.rate < 0.1 ? 3 : 2)} per ${unitW}: ${sure(f.conf)} the true rate is between ${fx(r.int.lo, r.rate < 0.1 ? 3 : 2)} and ${fx(r.int.hi, r.rate < 0.1 ? 3 : 2)} per ${unitW}.`, tone: 'n',
        verdict: `${fx(r.int.lo, 2)}–${fx(r.int.hi, 2)} per ${unitW}`, more: r.count === 0 ? [`None in the time counted is not none there: up to ${fx(r.int.hi, 3)} per ${unitW} is still possible.`] : [],
        notClaimed: 'This is how sure the rate is from this count, not why it happens.' };
    }
    if (!f.d) return { text: `${f.n} reading${f.n === 1 ? '' : 's'} — type or paste the readings in the order taken.`, tone: 'n', verdict: 'Not started', more: [], notClaimed: '' };
    if (!f.mean) return { text: `${f.n} reading${f.n === 1 ? '' : 's'}, mean ${fx(f.d.mean, f.dp + 1)}${u} — too few to say how sure: an interval on a mean needs at least ${MEAN_FROM}.`, tone: 'n', verdict: 'Too few', more: [], notClaimed: '' };
    const m = f.mean;
    return { text: `${big(f.d.n)} readings, mean ${fx(f.d.mean, f.dp + 1)}${u} — ${sure(f.conf)} the true mean is between ${fx(m.lo, f.dp + 1)} and ${fx(m.hi, f.dp + 1)}${u} (± ${fx(m.half, f.dp + 1)}${u}).`, tone: 'n', verdict: `Sure to ± ${fx(m.half, f.dp + 1)}${u}`,
      more: [f.spread ? `The spread (s) is ${fx(f.d.sd, f.dp + 1)}${u}; ${sure(f.conf)} the true spread is between ${fx(f.spread.lo, f.dp + 1)} and ${fx(f.spread.hi, f.dp + 1)}${u}.` : '',
        `Middle half ${fx(f.d.q1, f.dp + 1)}–${fx(f.d.q3, f.dp + 1)}${u}, median ${fx(f.d.median, f.dp + 1)}${u}${f.d.g1 !== undefined ? `, lean ${fx(f.d.g1, 2)}` : ''}.`].filter(Boolean),
      notClaimed: 'An interval is how sure the mean is from these readings — not a range the readings or the packs will fall in.' };
  }
  if (f.kind === 'change') {
    if (f.data === 'counted') {
      const c = f.counted;
      if (!c) return { text: 'Type a run for before and a run for after — how many were made, how many were rejected.', tone: 'n', verdict: 'Not started', more: [], notClaimed: '' };
      const dir = c.t.p2 < c.t.p1 ? 'fell' : 'rose', pts = pctPoints(c.t.p2 - c.t.p1), p = f.p as number, test = c.t.leads === 'fisher' ? 'Fisher’s exact' : 'z test';
      const rightWay = better(f, c.t.p2 - c.t.p1);
      const head = `Before ${c.k1} of ${big(c.n1)} (${pct(c.t.p1)}), after ${c.k2} of ${big(c.n2)} (${pct(c.t.p2)}): it ${dir} by ${pts}`;
      if (c.straddle) return { text: `${head} — borderline: ${test} gives ${pSay(p)}, the other test falls on the other side of ${fmtP(f.alpha)}.`, tone: 'n', verdict: 'Borderline', more: shareLines(f), notClaimed: notFix };
      if (f.significant) return { text: `${head} — ${sure(f.conf)} it ${dir} (${pSay(p)}, ${test}). ${[rightWay.says, 'What moved it is the fix’s to say.'].filter(Boolean).join(' ')}`, tone: rightWay.tone, verdict: rightWay.verdict, more: shareLines(f), notClaimed: notFix };
      return { text: `${head} — but ${sure(f.conf)} only of this: the counts cannot tell a change from chance (${pSay(p)}, ${test})${f.needed ? `; to see a change this size would take about ${big(f.needed)} in each` : ''}.`, tone: 'n', verdict: 'No change shown', more: shareLines(f), notClaimed: notFix };
    }
    if (!f.enough) return { text: `Before ${f.before.length}, after ${f.after.length} reading${f.after.length === 1 ? '' : 's'} — at least ${COMPARE_FROM} in each are needed to compare.`, tone: 'n', verdict: f.before.length + f.after.length ? 'Too few' : 'Not started', more: [], notClaimed: '' };
    const w = f.welch;
    if (!w) return { text: 'Every reading in a group is the same, so there is no spread to test against — the readings cannot say whether it changed.', tone: 'n', verdict: 'Nothing to test', more: [], notClaimed: '' };
    const dir = w.diff < 0 ? 'fell' : 'rose', p = f.p as number, abs = (x: number) => fx(Math.abs(x), f.dp + 1), rightWay = better(f, w.diff);
    const head = `Before ${fx(w.meanBefore, f.dp + 1)}${u}, after ${fx(w.meanAfter, f.dp + 1)}${u}: it ${dir} by ${abs(w.diff)}${u}`;
    const how = f.leads === 'mw' ? `Mann–Whitney (the readings are not bell-shaped), ${pSay(p)}` : `${pSay(p)}`;
    const more = [`Difference in means ${fx(w.diff, f.dp + 1)}${u}, ${pctWord(f.conf)} interval ${fx(w.lo, f.dp + 1)} to ${fx(w.hi, f.dp + 1)}${u} (Welch’s t ${fx(w.t, 2)}, ${fx(w.df, 1)} degrees of freedom${f.leads === 'mw' ? '; indicative — the readings are not bell-shaped' : ''}).`,
      f.mw ? `Mann–Whitney: U ${fx(f.mw.u, f.mw.u % 1 ? 1 : 0)}, ${pSay(f.mw.p)}${f.mw.exact ? ' (exact)' : ' (normal approximation, ties and continuity corrected)'}${f.leads === 'welch' ? ', shown beside the t' : ''}.` : '',
      f.descB && f.descA ? `Spread: before s ${fx(f.descB.sd, f.dp + 1)}, after s ${fx(f.descA.sd, f.dp + 1)}${u}.` : ''].filter(Boolean);
    if (f.significant) return { text: `${head} — ${sure(f.conf)} it ${dir} by between ${abs(w.lo < 0 && w.hi < 0 ? w.hi : w.lo)} and ${abs(w.lo < 0 && w.hi < 0 ? w.lo : w.hi)}${u} (${how}). ${[rightWay.says, 'What moved it is the fix’s to say.'].filter(Boolean).join(' ')}`, tone: rightWay.tone, verdict: rightWay.verdict, more, notClaimed: notFix };
    return { text: `${head}, but ${sure(f.conf)} only that the change is somewhere between ${fx(w.lo, f.dp + 1)} and ${fx(w.hi, f.dp + 1)}${u} (${how}) — these readings cannot tell a change from chance${f.needed ? `; to see a change this size would take about ${big(f.needed)} in each group` : ''}.`, tone: 'n', verdict: 'No change shown', more, notClaimed: notFix };
  }
  if (f.kind === 'paired') {
    if (!f.enough) return { text: `${f.pairs} pair${f.pairs === 1 ? '' : 's'} — at least ${PAIRS_FROM} are needed to compare two ways of measuring.`, tone: 'n', verdict: f.pairs ? 'Too few' : 'Not started', more: f.dropped ? [`${f.dropped} reading${f.dropped === 1 ? '' : 's'} with no second value, left out.`] : [], notClaimed: '' };
    const t = f.t;
    if (!t) return { text: 'Every pair differs by the same amount, so there is no spread to test against.', tone: 'n', verdict: 'Nothing to test', more: [], notClaimed: '' };
    const dp = f.dp + 1, p = f.p as number, higher = t.mean > 0, n = f.pairs, count = higher ? t.higher : t.lower;
    const more = [`Mean difference ${fx(t.mean, dp)}${u}, ${pctWord(f.conf)} interval ${fx(t.lo, dp)} to ${fx(t.hi, dp)}${u} (paired t ${fx(t.t, 2)}, ${t.df} degrees of freedom, ${pSay(t.p)}).`,
      f.wx ? `Wilcoxon’s signed-rank: W ${fx(f.wx.w, f.wx.w % 1 ? 1 : 0)}, ${pSay(f.wx.p)}${f.wx.exact ? ' (exact)' : ' (normal approximation, ties and continuity corrected)'}${f.wx.zeros ? `, ${f.wx.zeros} zero difference${f.wx.zeros === 1 ? '' : 's'} dropped` : ''}${f.leads === 'ttest' ? ', shown beside the t' : ''}.` : '',
      f.dropped ? `${f.dropped} reading${f.dropped === 1 ? '' : 's'} with no second value, left out.` : ''].filter(Boolean);
    if (f.agrees) return { text: `${cap(f.second)} and ${f.first} agree: ${sure(f.conf)} the difference is no more than ${fx(f.within as number, dp)}${u}, which is the most that does not matter (mean difference ${fx(t.mean, dp)}${u}, ${pSay(p)}).`, tone: 'g', verdict: 'Agree', more, notClaimed: 'Agreeing in the mean is not agreeing pack by pack — look at the differences listed.' };
    if (f.significant) {
      const over = f.within !== undefined && Math.abs(t.mean) > f.within;
      return { text: `${cap(f.second)} reads ${fx(Math.abs(t.mean), dp)}${u} ${higher ? 'higher' : 'lower'} than ${f.first} — ${sure(f.conf)} by between ${fx(Math.min(Math.abs(t.lo), Math.abs(t.hi)), dp)} and ${fx(Math.max(Math.abs(t.lo), Math.abs(t.hi)), dp)}${u} (${pSay(p)}), in ${count} of ${n} pairs.${f.within !== undefined ? (over ? ` That is more than the ${fx(f.within, dp)}${u} that does not matter.` : ` That is within the ${fx(f.within, dp)}${u} that does not matter.`) : ''}`,
        tone: over ? 'r' : 'n', verdict: over ? 'Differ' : f.within !== undefined ? 'Differ, within what matters' : 'Differ', more, notClaimed: 'This says the two differ, not which is right — that needs a reference of known value.' };
    }
    return { text: `The two ways differ by ${fx(Math.abs(t.mean), dp)}${u} on average, but ${sure(f.conf)} only that it is between ${fx(t.lo, dp)} and ${fx(t.hi, dp)}${u} (${pSay(p)}) — these pairs cannot tell a difference from chance.`, tone: 'n', verdict: 'No difference shown', more, notClaimed: 'Not finding a difference is not showing they agree — say how big a difference matters and the page will judge it.' };
  }
  /* plan */
  const power = pctWord(f.power), conf = pctWord(f.conf), p = a.plan;
  if (!f.ok || f.need === undefined || !p) return { text: f.why ?? 'Say what to size.', tone: 'n', verdict: 'Not enough to size', more: [], notClaimed: '' };
  const mins = f.minutes !== undefined ? ` That is about ${big(f.minutes)} minutes at ${f.seconds} seconds a reading${f.pounds !== undefined ? ` — about £${big(f.pounds)} of one person’s time` : ''}.` : '';
  const alt = f.alt?.length ? f.alt.map(x => `${big(x.n)} ${x.label}`).join('; ') : '';
  switch (f.ask) {
    case 'mean': return { text: `To know the mean to within ± ${fx(p.e as number, f.dp + 1)}${u} at ${conf} confidence, take about ${big(f.need)} readings (spread ${fx(f.sdUsed as number, 2)}${u}, ${f.sdFrom === 'typed' ? 'a guess' : `from ${f.have} readings`}).${mins}`, tone: 'n', verdict: `${big(f.need)} readings`, more: alt ? [`For comparison: ${alt}. Student’s t leads — the normal’s z is a touch low for small counts.`] : [], notClaimed: 'The count is only as good as the spread guessed — a spread twice as big needs four times the readings.' };
    case 'difference': return { text: `To see a difference of ${fx(p.delta as number, f.dp + 1)}${u} between two groups at ${power} power and ${conf} confidence, take about ${big(f.need)} from each group (spread ${fx(f.sdUsed as number, 2)}${u}).${mins}`, tone: 'n', verdict: `${big(f.need)} a group`, more: [f.seen ? `With ${f.seen.map(s => `${big(s.n)} a group you could see ${fx(s.diff, f.dp + 1)}${u}`).join('; with ')}.` : '', alt ? `For comparison: ${alt}.` : ''].filter(Boolean), notClaimed: 'Power is the chance of seeing a real difference of this size — it says nothing about a difference smaller than that.' };
    case 'share': return { text: `To pin a share${p.p !== undefined && p.p > 0 && p.p < 1 ? ` near ${pct(p.p)}` : ''} to within ± ${pctPoints(p.e as number)} at ${conf} confidence, count about ${big(f.need)}.${mins}`, tone: 'n', verdict: `${big(f.need)} counted`, more: f.alt?.length ? [`For comparison: ${alt}.`] : [], notClaimed: 'A share needs far more counted than a mean needs measured — say so before promising a precise rate from one morning’s count.' };
    case 'twoShares': return { text: `To tell ${pct(p.p1 as number)} from ${pct(p.p2 as number)} at ${power} power and ${conf} confidence, count about ${big(f.need)} in each group.${mins}`, tone: 'n', verdict: `${big(f.need)} a group`, more: [], notClaimed: 'Power is the chance of seeing a real difference of this size.' };
    case 'zero': return { text: `To show at least ${pct(1 - (p.p0 as number))} good at ${conf} confidence with no failure, test ${big(f.need)} in a row — one failure and the count starts again.${mins}`, tone: 'n', verdict: `${big(f.need)} in a row`, more: [], notClaimed: 'A clean run shows the share is probably that good — it is not a guarantee for the next one.' };
    case 'cycles': {
      const c = f.cycles as CyclesNeeded, left = Math.max(0, c.n - c.have);
      return { text: `${c.have} cycle${c.have === 1 ? '' : 's'} timed — the mean is sure to ± ${fx(c.marginPct, 1)}% at ${conf}. To be sure to ± ${pct(p.k as number)} time ${big(c.n)} in all${left ? `: ${big(left)} more` : ' — you have enough'}.`, tone: left ? 'a' : 'g', verdict: left ? `${big(left)} more cycles` : 'Enough cycles', more: [`The margin now is ± ${fx(c.marginNow, 2)}${a.unit ? ` ${a.unit}` : ''}. ${alt ? `For comparison: ${alt}.` : ''}`], notClaimed: 'More cycles shrink the margin only if each is timed the same way, at normal pace, on the same element.' };
    }
  }
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const notFix = 'The test says the number moved — not why. What moved it is the fix’s to say.';
const better = (f: { better: 'lower' | 'higher' | 'either' }, diff: number): { says: string; tone: Tone; verdict: string } => {
  if (f.better === 'either') return { says: '', tone: 'n', verdict: 'Changed' };
  const right = (f.better === 'lower' && diff < 0) || (f.better === 'higher' && diff > 0);
  return right ? { says: 'That is the right way for this measure.', tone: 'g', verdict: 'Moved the right way' } : { says: 'That is the wrong way for this measure.', tone: 'r', verdict: 'Moved the wrong way' };
};
const shareLines = (f: ChangeFigures): string[] => (f.counted
  ? [`Before ${pct(f.counted.t.p1)}, ${pctWord(f.conf)} interval ${pct(f.counted.before.lo)} to ${pct(f.counted.before.hi)}; after ${pct(f.counted.t.p2)}, ${pct(f.counted.after.lo)} to ${pct(f.counted.after.hi)}.`,
    `z ${fx(f.counted.t.z, 2)} (${pSay(f.counted.t.pZ)}); Fisher’s exact ${pSay(f.counted.t.pFisher)}.`] : []);

/* ------------------------------------------- the tiles, the closing line ------------------------------- */
/** THE TILES (docs/LEAN-PAGE.md): a few counted figures, each with its of — the verdict is the band's. */
export function analysisTiles(f: AnalysisFigures, a: AgreedAnalysis): LeanTile[] {
  const u = unitOf(a), conf = pctWord(f.conf), dp = f.dp + 1;
  const t = (k: string, v: string, of?: string, tone?: Tone): LeanTile => ({ k, v, ...(of ? { of } : {}), ...(tone && tone !== 'n' ? { tone } : {}) });
  if (f.kind === 'sure') {
    if (f.of === 'share') { const s = f.share; return [t('Counted', s ? `${s.k} of ${big(s.n)}` : '—'), t('Share', s ? pct(s.p) : '—'), t(`${conf} sure`, s ? `${pct(s.exact.lo)}–${pct(s.exact.hi)}` : '—', 'exact interval'), t('Wilson', s ? `${pct(s.wilson.lo)}–${pct(s.wilson.hi)}` : '—')]; }
    if (f.of === 'rate') { const r = f.rate, w = singular(a.unit?.trim() || 'hour'); return [t('Counted', r ? big(r.count) : '—'), t('Over', r ? `${big(r.hours)} ${a.unit?.trim() || 'hours'}` : '—'), t('Rate', r ? `${fx(r.rate, 2)} per ${w}` : '—'), t(`${conf} sure`, r ? `${fx(r.int.lo, 2)}–${fx(r.int.hi, 2)}` : '—', `per ${w}`)]; }
    return [t('Readings', big(f.n), f.n < MEAN_FROM ? `at least ${MEAN_FROM} for an interval` : undefined), t('Mean', f.d ? `${fx(f.d.mean, dp)}${u}` : '—', f.d ? `median ${fx(f.d.median, dp)}` : undefined),
      t(`${conf} sure`, f.mean ? `± ${fx(f.mean.half, dp)}${u}` : '—', f.mean ? `${fx(f.mean.lo, dp)}–${fx(f.mean.hi, dp)}` : undefined), t('Spread', f.d ? `${fx(f.d.sd, dp)}${u}` : '—', f.d ? `range ${fx(f.d.min, f.dp)}–${fx(f.d.max, f.dp)}` : undefined),
      t('Order', f.ac ? (f.ac.enough ? (f.ac.dependent ? 'Linked' : 'Independent') : 'Too few to judge') : '—', f.ac ? `r₁ ${fx(f.ac.r1, 2)} · band ±${fx(f.ac.band, 2)}` : undefined, f.ac?.dependent ? 'a' : 'n')];
  }
  if (f.kind === 'change') {
    if (f.data === 'counted') { const c = f.counted; return [t('Before', c ? `${pct(c.t.p1)}` : '—', c ? `${c.k1} of ${big(c.n1)}` : undefined), t('After', c ? `${pct(c.t.p2)}` : '—', c ? `${c.k2} of ${big(c.n2)}` : undefined),
      t('Change', c ? `${c.t.p2 - c.t.p1 < 0 ? '−' : '+'}${pctPoints(c.t.p2 - c.t.p1)}` : '—'), t('p', f.p !== undefined ? fmtP(f.p) : '—', c ? (c.t.leads === 'fisher' ? 'Fisher’s exact' : 'z test') : undefined, f.significant ? (better(f, (c?.t.p2 ?? 0) - (c?.t.p1 ?? 0)).tone) : 'n'), t('Sure', c ? conf : '—')]; }
    const w = f.welch;
    return [t('Before', f.before.length ? `${fx(mean(f.before), dp)}${u}` : '—', `${f.before.length} readings`), t('After', f.after.length ? `${fx(mean(f.after), dp)}${u}` : '—', `${f.after.length} readings`),
      t('Change', w ? `${w.diff < 0 ? '−' : '+'}${fx(Math.abs(w.diff), dp)}${u}` : '—', w ? `${conf}: ${fx(w.lo, dp)} to ${fx(w.hi, dp)}` : undefined), t('p', f.p !== undefined ? fmtP(f.p) : '—', f.p !== undefined ? (f.leads === 'mw' ? 'Mann–Whitney' : 'Welch’s t') : undefined, f.significant ? better(f, w?.diff ?? 0).tone : 'n'),
      t('Test', f.enough ? (f.leads === 'mw' ? 'Rank test' : 't test') : '—', f.enough ? (f.nonNormal ? 'not bell-shaped' : f.weak ? 'weak — few readings' : undefined) : undefined)];
  }
  if (f.kind === 'paired') {
    const r = f.t;
    return [t('Pairs', big(f.pairs), f.pairs < PAIRS_FROM ? `at least ${PAIRS_FROM}` : undefined), t('Mean difference', r ? `${r.mean < 0 ? '−' : '+'}${fx(Math.abs(r.mean), dp)}${u}` : '—', r ? `${f.second} − ${f.first}` : undefined),
      t(`${conf} sure`, r ? `${fx(r.lo, dp)} to ${fx(r.hi, dp)}` : '—'), t('p', f.p !== undefined ? fmtP(f.p) : '—', f.p !== undefined ? (f.leads === 'wilcoxon' ? 'Wilcoxon' : 'paired t') : undefined),
      t('Higher', r ? `${r.higher} of ${f.pairs}` : '—', r ? `${f.second} reads higher` : undefined)];
  }
  const mins = f.minutes !== undefined ? `${big(f.minutes)} min` : undefined;
  if (f.ask === 'cycles' && f.cycles) return [t('Timed', big(f.cycles.have)), t('Needed', big(f.cycles.n), `±${pct(a.plan?.k ?? 0)} at ${conf}`), t('Still to time', big(Math.max(0, f.cycles.n - f.cycles.have)), undefined, f.cycles.n > f.cycles.have ? 'a' : 'g'), t('Margin now', `± ${fx(f.cycles.marginPct, 1)}%`, `± ${fx(f.cycles.marginNow, 2)}${u}`)];
  return [t('Needed', f.ok && f.need !== undefined ? big(f.need) : '—', f.ask === 'difference' || f.ask === 'twoShares' ? 'a group' : undefined), t('Confidence', conf), ...(f.ask === 'difference' || f.ask === 'twoShares' ? [t('Power', pctWord(f.power))] : []), ...(mins ? [t('Time', mins, f.pounds !== undefined ? `£${big(f.pounds)} · ${f.seconds} s a reading` : `${f.seconds} s a reading`)] : [])];
}

/** THE CLOSING LINE. */
export function analysisClosing(f: AnalysisFigures, a: AgreedAnalysis, said: AnalysisSays): { text: string; tone: Tone } {
  if (said.verdict === 'Not started') return { text: 'Nothing recorded yet.', tone: 'n' };
  const what = a.name.trim() || 'The figure';
  if (f.kind === 'sure') return { text: `${said.verdict} — ${what}, ${pctWord(f.conf)} confidence.`, tone: said.tone };
  if (f.kind === 'change') return { text: `${said.verdict} — ${what}${f.p !== undefined ? `, ${pSay(f.p)}` : ''}, ${pctWord(f.conf)} confidence.`, tone: said.tone };
  if (f.kind === 'paired') return { text: `${said.verdict} — ${f.pairs} pair${f.pairs === 1 ? '' : 's'}${f.p !== undefined ? `, ${pSay(f.p)}` : ''}.`, tone: said.tone };
  return { text: `${said.verdict}.`, tone: said.tone };
}

/* ------------------------------------------- the picture ----------------------------------------------- */
/** One lane of the picture — the readings as bars or dots, a point with its interval, a zero line — in the unit of its own axis.
 *  The page draws these as SVG and the paper with the report engine, so the two never part. */
export interface PicRow {
  label: string; axis: [number, number]; unit?: string; zero?: boolean; tone?: Tone;
  hist?: { edges: number[]; counts: number[] }; dots?: number[];
  point?: { v: number; text: string }; band?: { lo: number; hi: number; text: string };
}
const span = (vs: number[]): [number, number] => { const lo = Math.min(...vs), hi = Math.max(...vs); const p = Math.max((hi - lo) * 0.08, Math.abs(hi) * 0.0005, 1e-9); return [lo - p, hi + p]; };
const sym = (vs: number[]): [number, number] => { const m = Math.max(...vs.map(Math.abs), 1e-9) * 1.15; return [-m, m]; };

export function analysisPicture(f: AnalysisFigures, a: AgreedAnalysis): PicRow[] {
  const u = a.unit ?? '', dp = f.dp + 1, c = pctWord(f.conf);
  if (f.kind === 'sure') {
    if (f.of === 'share' && f.share) { const s = f.share; return [{ label: 'Share', axis: [0, Math.min(1, Math.max(s.exact.hi * 1.2, 0.02))], unit: '%', point: { v: s.p, text: pct(s.p) }, band: { lo: s.exact.lo, hi: s.exact.hi, text: `${c}: ${pct(s.exact.lo)}–${pct(s.exact.hi)}` } }]; }
    if (f.of === 'rate' && f.rate) { const r = f.rate; return [{ label: 'Rate', axis: [0, Math.max(r.int.hi * 1.2, 1e-9)], unit: `per ${singular(u || 'hour')}`, point: { v: r.rate, text: fx(r.rate, 2) }, band: { lo: r.int.lo, hi: r.int.hi, text: `${c}: ${fx(r.int.lo, 2)}–${fx(r.int.hi, 2)}` } }]; }
    if (f.d && f.hist) {
      const xs = [f.d.min, f.d.max, ...(f.mean ? [f.mean.lo, f.mean.hi] : []), f.hist.edges[0], f.hist.edges[f.hist.edges.length - 1]], axis = span(xs);
      return [{ label: 'Readings', axis, unit: u, hist: { edges: f.hist.edges, counts: f.hist.counts } },
        ...(f.mean ? [{ label: 'Mean', axis, unit: u, point: { v: f.d.mean, text: fx(f.d.mean, dp) }, band: { lo: f.mean.lo, hi: f.mean.hi, text: `${c}: ${fx(f.mean.lo, dp)}–${fx(f.mean.hi, dp)}` } }] : [])];
    }
    return [];
  }
  if (f.kind === 'change') {
    if (f.data === 'counted' && f.counted) {
      const k = f.counted, hi = Math.min(1, Math.max(k.before.hi, k.after.hi) * 1.15), axis: [number, number] = [0, Math.max(hi, 0.02)];
      return [{ label: 'Before', axis, unit: '%', point: { v: k.t.p1, text: pct(k.t.p1) }, band: { lo: k.before.lo, hi: k.before.hi, text: `${pct(k.before.lo)}–${pct(k.before.hi)}` } },
        { label: 'After', axis, unit: '%', point: { v: k.t.p2, text: pct(k.t.p2) }, band: { lo: k.after.lo, hi: k.after.hi, text: `${pct(k.after.lo)}–${pct(k.after.hi)}` } }];
    }
    if (f.data === 'measured' && f.welch && f.descB && f.descA) {
      const w = f.welch, mb = meanInterval(w.nBefore, w.meanBefore, w.sdBefore, f.conf), ma = meanInterval(w.nAfter, w.meanAfter, w.sdAfter, f.conf), axis = span([...f.before, ...f.after, mb.lo, mb.hi, ma.lo, ma.hi]);
      const r = better(f, w.diff);
      return [{ label: 'Before', axis, unit: u, dots: f.before, point: { v: w.meanBefore, text: fx(w.meanBefore, dp) }, band: { lo: mb.lo, hi: mb.hi, text: `${fx(mb.lo, dp)}–${fx(mb.hi, dp)}` } },
        { label: 'After', axis, unit: u, dots: f.after, point: { v: w.meanAfter, text: fx(w.meanAfter, dp) }, band: { lo: ma.lo, hi: ma.hi, text: `${fx(ma.lo, dp)}–${fx(ma.hi, dp)}` } },
        { label: 'Change', axis: sym([w.lo, w.hi, w.diff]), unit: u, zero: true, tone: f.significant ? r.tone : 'n', point: { v: w.diff, text: fx(w.diff, dp) }, band: { lo: w.lo, hi: w.hi, text: `${c}: ${fx(w.lo, dp)} to ${fx(w.hi, dp)}` } }];
    }
    return [];
  }
  if (f.kind === 'paired' && f.t) {
    const t = f.t;
    return [{ label: `${f.second} − ${f.first}`, axis: sym([...f.diffs, t.lo, t.hi]), unit: u, zero: true, dots: f.diffs, tone: f.significant ? 'a' : 'n', point: { v: t.mean, text: fx(t.mean, dp) }, band: { lo: t.lo, hi: t.hi, text: `${c}: ${fx(t.lo, dp)} to ${fx(t.hi, dp)}` } }];
  }
  return [];
}

/* ------------------------------------------- pasted readings ------------------------------------------- */
export interface Pasted { values: number[]; pairs: [number, number][]; skipped: string[] }
/** Numbers pasted or typed in a box — a number to a line, or spaced or comma separated; with `cols` 2, a pair to a line. Whatever
 *  is not a number is listed in `skipped`, never silently dropped. */
export function parsePasted(text: string, cols: 1 | 2 = 1): Pasted {
  const out: Pasted = { values: [], pairs: [], skipped: [] };
  const num = (t: string): number | undefined => (t !== '' && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : undefined);
  for (const line of text.split(/\r?\n/)) {
    const toks = line.split(/[\s,;]+/).filter(Boolean); if (!toks.length) continue;
    if (cols === 2) {
      const [x, y] = [num(toks[0]), num(toks[1])];
      if (toks.length === 2 && x !== undefined && y !== undefined) out.pairs.push([x, y]); else out.skipped.push(line.trim());
    } else for (const t of toks) { const v = num(t); if (v !== undefined) out.values.push(v); else out.skipped.push(t); }
  }
  return out;
}
