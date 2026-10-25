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
import { describe, type Described } from '../../lib/ie/describe';
import { compareGroups, type GroupsResult } from '../../lib/ie/groups';
import { predictAt, regress, relate, tableTest, VIF_SERIOUS, type Line, type Multiple, type TableResult } from '../../lib/ie/relate';
import {
  acf, autocorrelation, cyclesNeeded, differenceSeen, finiteN, mannWhitney, mean, meanInterval, nForMean, nForShare, nForTwoMeans, nForTwoShares, nZeroFailures,
  pairedT, rateInterval, sd, shareExact, shareWilson, spreadInterval, twoShares, welch, wilcoxon,
  type Autocorrelation, type Confidence, type CyclesNeeded, type Interval, type MannWhitneyResult, type PairedResult, type TwoShares, type WelchResult, type WilcoxonResult,
} from '../../lib/ie/stats';

import { big, cap, fmtP, fx, pct, pctWord, pSay, placesOf } from './format';
import { independenceCheck, outlierCheck } from './checks';
import { gaugeFigures, gaugeGrids, gaugePicture, gaugePlot, gaugeProblem, gaugeSays, gaugeTiles, learnFigures, learnPlot, learnProblem, learnSays, learnTiles, shapeFigures, shapeGrids, shapePlot, shapeProblem, shapeSays, shapeTiles, type GaugeFigures, type Grid, type LearnFigures, type ShapeFigures } from './measure';

export type Tone = 'g' | 'a' | 'r' | 'n';
/** Intervals on a mean need this many readings; a paired test this many pairs; a comparison this many a side (said weak under 8). */
export const MEAN_FROM = 8;
export const PAIRS_FROM = 6;
export const COMPARE_FROM = 3;
export const WEAK_UNDER = 8;
/** Bell-shapedness is checked from this many in a set. */
export const NORMAL_FROM = 20;
/** A relation: a line is fitted from this many pairs (said weak under LINE_FROM), a prediction is rough under PREDICT_WEAK; several drivers need 5 a driver + 5 rows. */
export const RELATE_FROM = 4;
export const LINE_FROM = 10;
export const PREDICT_WEAK = 20;
export const MAX_DRIVERS = 5;
export const MAX_NAMES = 8;
/** The order of a relation's residuals is judged from this many rows (as a series of readings is: 30). */
const AUTOCORR_FROM_PAIRS = 30;
export const rowsFor = (k: number): number => (k <= 1 ? RELATE_FROM : 5 * k + 5);
export const DEFAULT_CONFIDENCE: Confidence = 0.95;

export const KIND_WORDS: Record<AgreedAnalysis['kind'], { name: string; ask: string; example: string }> = {
  sure: { name: 'How sure', ask: 'How sure am I of this figure?', example: 'thirty packs weighed; 7 rejected out of 600; 12 stops in 40 hours' },
  change: { name: 'Did it change', ask: 'Did it really change?', example: 'fill weights before and after a re-calibration; rejects before and after new film' },
  paired: { name: 'Do two ways agree', ask: 'Do two ways of measuring agree?', example: 'two checkweighers on the same packs; the scale and the lab' },
  groups: { name: 'Do groups differ', ask: 'Do these groups really differ?', example: 'give-away by shift; fill weight by head; seal strength by supplier' },
  table: { name: 'Are two things linked', ask: 'Is one thing linked to the other?', example: 'fault type by lane, counted off the reject bin; rejects by shift and product' },
  relate: { name: 'What moves with what', ask: 'Does one thing move with another — and by how much?', example: 'seal strength against jaw temperature; give-away against speed and product temperature' },
  gauge: { name: 'Is the gauge fit', ask: 'Is this gauge fit for what it judges?', example: 'a bench scale against a 500 g test weight; a probe at five temperatures; the daily check weight' },
  learn: { name: 'How fast it is learning', ask: 'How fast is a new job being learned?', example: 'seconds a pack for a new starter or a new product, run after run; when the standard will be met' },
  shape: { name: 'Which shape fits', ask: 'Which shape do these readings follow?', example: 'residual oxygen; minutes between short stops; seal strength with a hard floor' },
  plan: { name: 'How many readings', ask: 'How many readings do I need?', example: 'to know a mean to ±0.3 g; to see a 0.5 g difference between shifts' },
};
export const confidenceOf = (a: Pick<AgreedAnalysis, 'confidence'>): Confidence => a.confidence ?? DEFAULT_CONFIDENCE;
export { pctWord, placesOf, fmtP, pSay } from './format';

/* ------------------------------------------- reading the record --------------------------------------- */
const live = (rs: StudyReading[]): StudyReading[] => rs.filter(r => !r.struck);
const armValues = (rs: StudyReading[], arm: string): number[] => live(rs).filter(r => r.arm === arm && typeof r.value === 'number').map(r => r.value as number);
const noArm = (rs: StudyReading[]): number[] => live(rs).filter(r => !r.arm && typeof r.value === 'number').map(r => r.value as number);
const pctPoints = (x: number): string => `${(Math.abs(x) * 100).toFixed(Math.abs(x) * 100 < 1 ? 2 : 1)} points`;
const unitOf = (a: AgreedAnalysis): string => (a.unit ? ` ${a.unit}` : '');
const singular = (u: string): string => u.replace(/s$/, '');

/** A reading in a counted run — made (the base) and rejected (the count). */
interface Run { k: number; n: number }
const runs = (rs: StudyReading[], arm?: string): Run => live(rs).filter(r => typeof r.made === 'number' && typeof r.rejected === 'number' && (arm === undefined ? !r.arm : r.arm === arm))
  .reduce((t, r) => ({ k: t.k + (r.rejected as number), n: t.n + (r.made as number) }), { k: 0, n: 0 });

/* ------------------------------------------- the figures ---------------------------------------------- */
export interface Check { what: string; say: string; tone: Tone }
export interface Base { conf: Confidence; alpha: number; dp: number; unit: string; checks: Check[] }
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
export interface GroupsFigures extends Base {
  kind: 'groups'; better: 'lower' | 'higher' | 'either'; noun: string; enough: boolean; weak: boolean;
  /** every group named, in the order first seen, with its readings and what they look like */
  groups: { name: string; values: number[]; desc?: Described }[]; /** groups with too few readings to compare, left out */ left: string[];
  res?: GroupsResult; leads: 'anova' | 'kruskal'; nonNormal: boolean; unalike: boolean; p?: number; significant: boolean;
}
export interface TableFigures extends Base {
  kind: 'table'; rowName: string; colName: string; rows: string[]; cols: string[]; counts: number[][]; total: number; enough: boolean;
  res?: TableResult; /** which test leads: the χ², Fisher's exact for a 2 × 2 with an expected count under 5, or the χ² only as an approximation */ lead: 'chi2' | 'fisher' | 'approx';
  p?: number; significant: boolean; /** counts typed under a row or column name no longer agreed */ orphans: number; /** rows or columns with nothing counted in them */ empty: string[];
}
export interface RelateFigures extends Base {
  kind: 'relate'; k: number; n: number; need: number; enough: boolean; weak: boolean; drivers: { name: string; unit?: string }[]; xs: number[][]; y: number[];
  line?: Line; multi?: Multiple; /** perfectly collinear drivers, or a constant one — nothing is fitted */ refusal?: string; p?: number; significant: boolean;
}
export type AnalysisFigures = SureFigures | ChangeFigures | PairedFigures | PlanFigures | GroupsFigures | TableFigures | RelateFigures | GaugeFigures | ShapeFigures | LearnFigures;

const normalCheck = (what: string, xs: number[]): { check?: Check; non: boolean } => {
  if (xs.length < NORMAL_FROM) return { non: false };
  const dp = dagostinoPearson(xs); if (!dp) return { non: false };
  const non = dp.p < 0.05;
  return { non, check: { what, say: non ? `${what}: not bell-shaped (D’Agostino–Pearson ${pSay(dp.p)}) — the rank test leads.` : `${what}: bell-shaped enough for the t (D’Agostino–Pearson ${pSay(dp.p)}).`, tone: non ? 'a' : 'n' } };
};

export function analysisFigures(a: AgreedAnalysis, readings: StudyReading[], opts: { rate?: number } = {}): AnalysisFigures {
  const conf = confidenceOf(a), alpha = 1 - conf, unit = a.unit ?? '';
  const base = (dp: number): Base => ({ conf, alpha, dp, unit, checks: [] });
  if (a.kind === 'gauge') return gaugeFigures(a, readings, base(0));
  if (a.kind === 'shape') return shapeFigures(a, readings, base(0));
  if (a.kind === 'learn') return learnFigures(a, readings, base(0), opts.rate);
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
  if (a.kind === 'groups') {
    const better = a.better ?? 'either', noun = a.firstName?.trim() || 'group';
    const names: string[] = []; for (const r of readings) if (typeof r.value === 'number' && r.arm && !names.includes(r.arm)) names.push(r.arm);
    const groups = names.map(n => { const values = armValues(readings, n); return { name: n, values, desc: describe(values) }; });
    const used = groups.filter(g => g.values.length >= COMPARE_FROM), left = groups.filter(g => g.values.length < COMPARE_FROM).map(g => g.name);
    const f: GroupsFigures = { ...base(placesOf(groups.flatMap(g => g.values))), kind: 'groups', better, noun, groups, left, enough: used.length >= 2, weak: false, leads: 'anova', nonNormal: false, unalike: false, significant: false };
    if (f.enough) {
      const res = compareGroups(used.map(g => ({ name: g.name, values: g.values })), conf); f.res = res;
      const norms = used.map(g => normalCheck(g.name, g.values)); f.nonNormal = norms.some(n => n.non);
      f.unalike = !!res?.levene && res.levene.p < 0.05;
      f.leads = (f.nonNormal || f.unalike) && res ? 'kruskal' : 'anova';
      if (res) { f.p = f.leads === 'kruskal' ? res.kruskal.p : res.p; f.significant = f.p < alpha; }
      f.checks = norms.map(n => n.check).filter((c): c is Check => !!c);
      if (!norms.some(n => n.check)) f.checks.push({ what: 'Shape', say: `Shape: fewer than ${NORMAL_FROM} in a group, so bell-shapedness is not checked — the F leads and Kruskal–Wallis is shown beside it.`, tone: 'n' });
      if (res?.levene) f.checks.push({ what: 'Spreads', say: f.unalike ? `Spreads: Levene’s test ${pSay(res.levene.p)} — the spreads differ between the ${noun}s, so Kruskal–Wallis leads and Tukey’s intervals are indicative.` : `Spreads: Levene’s test ${pSay(res.levene.p)} — the spreads are alike enough to pool.`, tone: f.unalike ? 'a' : 'n' });
      for (const g of used) { const oc = outlierCheck(g.name, g.desc); if (oc) f.checks.push(oc); }
      if (used.some(g => g.values.length < WEAK_UNDER)) f.checks.push({ what: 'Size', say: `Size: fewer than ${WEAK_UNDER} in a ${noun} — a weak test; read it as a hint.`, tone: 'a' });
    }
    if (left.length) f.checks.push({ what: 'Too few', say: `Too few: ${left.join(', ')} ${left.length === 1 ? 'has' : 'have'} fewer than ${COMPARE_FROM} readings, so ${left.length === 1 ? 'it is' : 'they are'} left out of the comparison until there are more.`, tone: 'a' });
    f.weak = used.some(g => g.values.length < WEAK_UNDER);
    return f;
  }
  if (a.kind === 'table') {
    const rows = a.rows ?? [], cols = a.cols ?? [], known = live(readings).filter(r => typeof r.made === 'number' && r.col !== undefined && r.arm !== undefined);
    const counts = rows.map(r => cols.map(c => known.filter(x => x.arm === r && x.col === c).reduce((t, x) => t + (x.made as number), 0)));
    const total = counts.flat().reduce((x, y) => x + y, 0), orphans = known.filter(x => !rows.includes(x.arm as string) || !cols.includes(x.col as string)).length;
    const empty = [...rows.filter((_, i) => counts[i].every(v => v === 0)).map(r => r), ...cols.filter((_, j) => counts.every(row => row[j] === 0))];
    const f: TableFigures = { ...base(0), kind: 'table', rowName: a.firstName?.trim() || 'row', colName: a.secondName?.trim() || 'column', rows, cols, counts, total, enough: false, lead: 'chi2', significant: false, orphans, empty };
    if (rows.length >= 2 && cols.length >= 2 && total > 0) {
      const res = tableTest(counts);
      if (res) {
        f.res = res; f.enough = true; f.lead = res.two ? res.two.leads : res.trusted ? 'chi2' : 'approx';
        f.p = f.lead === 'fisher' && res.two ? res.two.pFisher : res.p; f.significant = f.p < alpha;
        if (res.two) f.checks.push({ what: 'Test', say: res.two.leads === 'fisher' ? `Test: the smallest expected count is ${fx(res.minExpected, 1)}, under 5 — Fisher’s exact test leads (χ² gives ${pSay(res.p)}, with Yates’ correction ${pSay(res.two.pYates)}).` : `Test: every expected count is 5 or more — the χ² leads (with Yates’ correction ${pSay(res.two.pYates)}; Fisher’s exact ${pSay(res.two.pFisher)}).`, tone: 'n' });
        else if (res.trusted) f.checks.push({ what: 'Test', say: `Test: ${Math.round(res.shareFive * 100)}% of the cells expect 5 or more and none expects under 1 — the χ² can be trusted (smallest expected ${fx(res.minExpected, 1)}).`, tone: 'n' });
        else f.checks.push({ what: 'Counts too small', say: `Counts too small: ${Math.round((1 - res.shareFive) * 100)}% of the cells expect fewer than 5 (the smallest ${fx(res.minExpected, 1)}) — the χ² is only an approximation here and its ${pSay(res.p)} is not to be trusted. Merge categories that mean the same, or count more.`, tone: 'a' });
      }
    }
    if (orphans) f.checks.push({ what: 'Names', say: `Names: ${orphans} count${orphans === 1 ? '' : 's'} typed under a name no longer agreed ${orphans === 1 ? 'is' : 'are'} left out — change what was agreed to bring ${orphans === 1 ? 'it' : 'them'} back.`, tone: 'a' });
    return f;
  }
  if (a.kind === 'relate') {
    const drivers = a.drivers ?? [], k = drivers.length, need = rowsFor(k);
    const rs = live(readings).filter(r => typeof r.value === 'number' && Array.isArray(r.xs) && r.xs.length === k && r.xs.every(Number.isFinite));
    const y = rs.map(r => r.value as number), xs = drivers.map((_, j) => rs.map(r => (r.xs as number[])[j]));
    const f: RelateFigures = { ...base(placesOf(y)), kind: 'relate', k, n: rs.length, need, enough: rs.length >= need && k >= 1, weak: k === 1 && rs.length < LINE_FROM, drivers, xs, y, significant: false };
    if (!f.enough) return f;
    if (k === 1) {
      const l = relate(xs[0], y, conf); if (!l) { f.refusal = 'Either the driver or the result is the same in every row, so there is no line to fit.'; return f; }
      f.line = l; f.p = l.pR; f.significant = l.pR < alpha;
      if (f.weak) f.checks.push({ what: 'Size', say: `Size: fewer than ${LINE_FROM} pairs — a line from so few is a hint; read it as one.`, tone: 'a' });
      if (l.runs) f.checks.push({ what: 'Shape', say: l.runs.p < 0.05 ? `Shape: the points fall above and below the line in ${l.runs.runs} stretches where about ${fx(l.runs.expected, 0)} are expected (${pSay(l.runs.p)}) — the line is too straight; the relation bends, so do not trust it at the ends.` : `Shape: the points fall above and below the line in ${l.runs.runs} stretches, about as many as expected (${fx(l.runs.expected, 0)}) — no sign that the line is the wrong shape.`, tone: l.runs.p < 0.05 ? 'a' : 'n' });
      if (rs.length >= AUTOCORR_FROM_PAIRS) { const band = 2 / Math.sqrt(rs.length); f.checks.push({ what: 'Order', say: Math.abs(l.lag1) > band ? `Order: each point’s distance from the line follows the last one’s (r₁ ${fx(l.lag1, 2)}, outside ±${fx(band, 2)}) — the pairs are not independent, so the intervals are too narrow.` : `Order: each point’s distance from the line is independent enough of the last (r₁ ${fx(l.lag1, 2)}, inside ±${fx(band, 2)}).`, tone: Math.abs(l.lag1) > band ? 'a' : 'n' }); }
      if (Math.abs(l.r - l.rho) > 0.2) f.checks.push({ what: 'Outlier', say: `Outlier: Pearson’s r (${fx(l.r, 2)}) and Spearman’s ρ (${fx(l.rho, 2)}) disagree — one or two points, or a curve, are pulling the line. Look at the points; none is removed.`, tone: 'a' });
      const wild = l.residuals.map((v, i) => [v, i] as const).filter(([v]) => Math.abs(v) > 3 * l.se);
      if (wild.length) f.checks.push({ what: 'Residuals', say: `Residuals: ${wild.length} point${wild.length === 1 ? '' : 's'} lie more than three standard errors from the line (row${wild.length === 1 ? '' : 's'} ${wild.slice(0, 4).map(([, i]) => i + 1).join(', ')}) — look at ${wild.length === 1 ? 'it' : 'them'}.`, tone: 'a' });
      return f;
    }
    const m = regress(xs, y, drivers.map(d => d.name), conf);
    if ('collinear' in m) {
      f.refusal = m.constant !== undefined ? `${drivers[m.constant].name} is the same in every row, so it cannot be told apart from the intercept — take it out, or vary it.`
        : m.collinear ? `${drivers[m.collinear[0]].name} and ${drivers[m.collinear[1]].name} move exactly together, so their separate effects cannot be told apart — keep one.` : 'The rows cannot be fitted — check the readings.';
      return f;
    }
    f.multi = m; f.p = m.pF; f.significant = m.pF < alpha;
    const vifs = m.drivers.map(d => `${d.name} ${fx(d.vif ?? 1, 1)}`).join(', ');
    f.checks.push(m.serious ? { what: 'Drivers move together', say: `Drivers move together: variance inflation ${vifs} — above ${VIF_SERIOUS}. Their separate effects cannot be read apart; keep one of them, or read the drivers only together.`, tone: 'a' }
      : { what: 'Drivers move together', say: `Drivers: variance inflation ${vifs} — below ${VIF_SERIOUS}, the drivers do not move together enough to blur each other’s effect.`, tone: 'n' });
    if (rs.length >= AUTOCORR_FROM_PAIRS) { const l1 = acf(m.residuals, 1), band = 2 / Math.sqrt(rs.length); f.checks.push({ what: 'Order', say: Math.abs(l1) > band ? `Order: each row’s distance from the fit follows the last one’s (r₁ ${fx(l1, 2)}, outside ±${fx(band, 2)}) — the rows are not independent, so the intervals are too narrow.` : `Order: each row’s distance from the fit is independent enough of the last (r₁ ${fx(l1, 2)}, inside ±${fx(band, 2)}).`, tone: Math.abs(l1) > band ? 'a' : 'n' }); }
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
export function analysisProblem(a: Pick<AgreedAnalysis, 'kind' | 'name' | 'within'> & Partial<Pick<AgreedAnalysis, 'rows' | 'cols' | 'drivers' | 'gauge' | 'shape' | 'standard' | 'perRun'>>): string {
  if (a.kind === 'gauge') return gaugeProblem(a.name, a.gauge);
  if (a.kind === 'shape') return shapeProblem(a.name, a.shape);
  if (a.kind === 'learn') return learnProblem(a.name, a.standard, a.perRun);
  if (!a.name.trim()) return 'What is measured — a name, "Fill weight".';
  if (a.kind === 'table') {
    const dup = (xs: string[]) => new Set(xs.map(x => x.toLowerCase())).size !== xs.length;
    if ((a.rows ?? []).length < 2 || (a.rows ?? []).length > MAX_NAMES) return `The rows — two to ${MAX_NAMES} names, separated by commas ("Lane 1, Lane 2, Lane 3").`;
    if ((a.cols ?? []).length < 2 || (a.cols ?? []).length > MAX_NAMES) return `The columns — two to ${MAX_NAMES} names, separated by commas ("Underweight, Leaker, Misprint").`;
    if (dup(a.rows ?? []) || dup(a.cols ?? [])) return 'Two rows or two columns have the same name.';
  }
  if (a.kind === 'relate') {
    const ds = a.drivers ?? [];
    if (ds.length < 1 || ds.length > MAX_DRIVERS) return `The drivers — one to ${MAX_DRIVERS} names, each with its unit in brackets, separated by commas ("Jaw temperature (°C)").`;
    if (new Set(ds.map(d => d.name.toLowerCase())).size !== ds.length) return 'Two drivers have the same name.';
  }
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
  if (f.kind === 'groups') return groupsSays(f, name, u);
  if (f.kind === 'table') return tableSays(f);
  if (f.kind === 'relate') return relateSays(f, name, u);
  if (f.kind === 'gauge') return gaugeSays(f, a);
  if (f.kind === 'shape') return shapeSays(f, a);
  if (f.kind === 'learn') return learnSays(f, a);
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
/* ------------------------------------------- the three kinds of W3b: groups, a table, a relation -------- */
/** Significant digits, not decimals — a slope may be 0.145 or 0.00014 a unit. The minus is the true minus. */
const sg = (v: number, d = 3): string => (v === 0 ? '0' : Number(v.toPrecision(d)).toLocaleString('en-GB', { maximumSignificantDigits: d })).replace('-', '−');
const dfs = (n: number): string => `${n} degree${n === 1 ? '' : 's'} of freedom`;
const share0 = (x: number): string => `${Math.round(x * 100)}%`;
/** Cramér's V in words by Cohen's (1988) effect sizes, w = 0.1, 0.3, 0.5 scaled by √(min(rows, cols) − 1). */
export function cramersWord(v: number, rows: number, cols: number): string {
  const s = Math.sqrt(Math.max(1, Math.min(rows, cols) - 1));
  return v >= 0.5 / s ? 'large' : v >= 0.3 / s ? 'medium' : v >= 0.1 / s ? 'small' : 'negligible';
}
const orientPair = (p: { a: string; b: string; diff: number; lo: number; hi: number }) => (p.diff >= 0 ? { hi: p.a, lo: p.b, d: p.diff, from: p.lo, to: p.hi } : { hi: p.b, lo: p.a, d: -p.diff, from: -p.hi, to: -p.lo });

function groupsSays(f: GroupsFigures, name: string, u: string): AnalysisSays {
  const noun = f.noun, nouns = `${noun}s`, dp = f.dp + 1;
  if (!f.enough) {
    const have = f.groups.filter(g => g.values.length >= COMPARE_FROM).length;
    return { text: f.groups.length ? `${f.groups.length} ${f.groups.length === 1 ? noun : nouns} so far, ${have} with ${COMPARE_FROM} or more readings — at least two ${nouns} of ${COMPARE_FROM} readings each are needed to compare.` : `No readings yet. Name a ${noun}, then type or paste its readings.`, tone: 'n', verdict: f.groups.length ? 'Too few' : 'Not started', more: [], notClaimed: '' };
  }
  const r = f.res;
  if (!r) return { text: `Every reading within a ${noun} is the same, so there is no spread to test against — the readings cannot say whether the ${nouns} differ.`, tone: 'n', verdict: 'Nothing to test', more: [], notClaimed: '' };
  const p = f.p as number, lead = f.leads === 'kruskal' ? `Kruskal–Wallis H ${fx(r.kruskal.h, 1)} on ${dfs(r.kruskal.df)}` : `F ${fx(r.f, 1)} on ${r.df1} and ${r.df2} degrees of freedom`;
  const effect = `η² ${fx(r.eta2, 2)} — ${share0(r.eta2)} of the variation is between the ${nouns}`;
  const sigPairs = [...r.pairs].filter(x => x.p < f.alpha).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff)), quiet = r.pairs.filter(x => x.p >= f.alpha);
  const said = sigPairs.slice(0, 4).map(x => { const o = orientPair(x); return `${o.hi} is above ${o.lo} by ${fx(o.d, dp)}${u} (between ${fx(o.from, dp)} and ${fx(o.to, dp)}${u})`; }).join('; ') + (sigPairs.length > 4 ? `; and ${sigPairs.length - 4} more pairs` : '');
  const nots = quiet.length === 0 ? '' : quiet.length <= 3 ? `${quiet.map(x => `${x.a} and ${x.b}`).join('; ')} ${quiet.length === 1 ? 'are' : 'are each'} not shown to differ.` : `${quiet.length} pairs are not shown to differ.`;
  const means = r.groups.map(g => `${g.name} ${fx(g.mean, dp)}${u} (n ${g.n}, s ${fx(g.sd, dp)})`).join(' · ');
  const more = [`${means}.`,
    f.leads === 'kruskal' ? `One-way ANOVA, beside: F ${fx(r.f, 1)}, ${pSay(r.p)}.` : `Kruskal–Wallis, beside: H ${fx(r.kruskal.h, 1)}, ${pSay(r.kruskal.p)}.`,
    `Pairs by Tukey’s HSD${r.groups.some(g => g.n !== r.groups[0].n) ? ' (Tukey–Kramer, the sizes differ)' : ''}: ${pctWord(f.conf)} intervals that hold together across all ${r.pairs.length} pair${r.pairs.length === 1 ? '' : 's'}${f.leads === 'kruskal' ? '; indicative — Tukey assumes bell shapes and alike spreads' : ''}.`];
  const notClaimed = `This says the ${nouns} differ, not why — and a ${noun} not shown to differ is not shown to be the same.`;
  if (!f.significant) return { text: `${name} by ${noun}: ${sure(f.conf)} only that these readings cannot tell the ${nouns} apart from chance (${lead}, ${pSay(p)}; ${effect}).${nots && quiet.length > 3 ? '' : ''}`, tone: 'n', verdict: 'No difference shown', more, notClaimed };
  let text = `${name} by ${noun}: ${sure(f.conf)} the ${nouns} differ (${lead}, ${pSay(p)}); ${effect}. ${said ? `${said}. ` : 'Tukey’s test could not single out which pair. '}${nots}`.trim();
  let tone: Tone = 'n', verdict = `The ${nouns} differ`;
  if (f.better !== 'either' && sigPairs.length) {
    const worst = [...r.groups].sort((x, y) => (f.better === 'lower' ? y.mean - x.mean : x.mean - y.mean))[0];
    if (sigPairs.some(x => { const o = orientPair(x); return f.better === 'lower' ? o.hi === worst.name : o.lo === worst.name; })) { tone = 'a'; verdict = `${worst.name} is the worst`; text += ` ${worst.name} is the wrong way for this measure.`; }
  }
  return { text, tone, verdict, more, notClaimed };
}

function tableSays(f: TableFigures): AnalysisSays {
  const row = f.rowName.toLowerCase(), col = f.colName.toLowerCase();
  if (!f.enough || !f.res) {
    return { text: f.total === 0 ? `Nothing counted yet. Pick a ${row} and a ${col}, then type how many.` : f.rows.length < 2 || f.cols.length < 2 ? 'Name at least two rows and two columns.' : `Nothing counted yet in ${f.empty.join(', ')} — every ${row} and every ${col} needs at least one count before the table can be tested.`, tone: 'n', verdict: f.total ? 'Too few' : 'Not started', more: [], notClaimed: '' };
  }
  const r = f.res, p = f.p as number, word = cramersWord(r.cramersV, r.rows, r.cols);
  const test = f.lead === 'fisher' ? 'Fisher’s exact test' : `χ² ${fx(r.chi2, 1)} on ${dfs(r.df)}`;
  const stand = r.residuals.flatMap((rs, i) => rs.map((v, j) => ({ v, i, j }))).filter(c => Math.abs(c.v) > 2).sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).slice(0, 4)
    .map(c => `${f.rows[c.i]} has ${c.v > 0 ? 'more' : 'fewer'} ${f.cols[c.j]} than chance would give (${f.counts[c.i][c.j]} against ${fx(r.expected[c.i][c.j], 1)})`);
  const standing = stand.length ? ` The cells that stand out: ${stand.join('; ')}.` : r.rows * r.cols > 4 ? ' No single cell stands out beyond ±2.' : '';
  const more = [`Cramér’s V ${fx(r.cramersV, 2)} — a ${word} link (Cohen’s sizes, scaled to the table).`,
    r.two ? `2 × 2: χ² ${fx(r.chi2, 2)} (${pSay(r.p)}), with Yates’ correction ${fx(r.two.yates, 2)} (${pSay(r.two.pYates)}), Fisher’s exact ${pSay(r.two.pFisher)}.` : `Smallest expected count ${fx(r.minExpected, 1)}; ${Math.round(r.shareFive * 100)}% of the cells expect 5 or more.`,
    `Counted ${big(r.total)} in ${r.rows * r.cols} cells; each cell’s count, what chance would give and its standardised residual are in the table.`];
  const notClaimed = 'A link is not a cause. This says the counts are not spread the way chance alone would spread them — not why.';
  if (f.lead === 'approx') return { text: `The counts are too small for the χ² to be trusted: ${Math.round((1 - r.shareFive) * 100)}% of the cells expect fewer than 5 (the smallest ${fx(r.minExpected, 1)}). It gives ${pSay(r.p)}, but that is only an approximation — merge categories that mean the same, or count more before reading anything into it.`, tone: 'a', verdict: 'Counts too small', more, notClaimed };
  const head = `${cap(f.colName)} and ${row}`;
  if (!f.significant) return { text: `${head} are not shown to be linked: ${sure(f.conf)} only that these counts cannot tell the pattern of ${col}s in one ${row} from another’s (${test}, ${pSay(p)}; Cramér’s V ${fx(r.cramersV, 2)}).`, tone: 'n', verdict: 'No link shown', more, notClaimed };
  return { text: `${head} are linked: ${sure(f.conf)} the pattern of ${col}s is not the same in every ${row} (${test}, ${pSay(p)}; Cramér’s V ${fx(r.cramersV, 2)}, a ${word} link).${standing}`, tone: 'n', verdict: 'Linked', more, notClaimed };
}

function relateSays(f: RelateFigures, name: string, u: string): AnalysisSays {
  const lc = name.toLowerCase();
  if (!f.enough) return { text: f.k < 1 ? 'Name at least one driver.' : f.n === 0 ? `No rows yet. Type a ${f.k === 1 ? 'pair' : 'row'} — ${f.drivers.map(d => d.name).join(', ')}, then ${name}.` : `${f.n} row${f.n === 1 ? '' : 's'} — at least ${f.need} are needed${f.k > 1 ? ` for ${f.k} drivers (5 for each, and 5 more)` : ' to fit a line'}.`, tone: 'n', verdict: f.n ? 'Too few' : 'Not started', more: [], notClaimed: '' };
  if (f.refusal) return { text: f.refusal, tone: 'n', verdict: 'Nothing to fit', more: [], notClaimed: '' };
  const notClaimed = `A link is not a cause. This says ${f.k === 1 ? 'the two move' : 'they move'} together in these readings — not that ${f.k === 1 ? 'one makes the other' : 'the drivers make it'} move, and not beyond the range measured.`;
  if (f.line) {
    const l = f.line, d = f.drivers[0], dn = d.name.toLowerCase(), per = `${sg(Math.abs(l.slope))}${u} for every extra 1${d.unit ? ` ${d.unit}` : ''} of ${dn}`;
    const more = [`Pearson’s r ${fx(l.r, 3)} (${pctWord(f.conf)}: ${fx(l.rLo, 3)} to ${fx(l.rHi, 3)}, ${pSay(l.pR)}); Spearman’s ρ ${fx(l.rho, 3)} (${pSay(l.pRho)}), the rank version that an outlier cannot bend.`,
      `The line: ${lc} = ${sg(l.intercept)} ${l.slope < 0 ? '−' : '+'} ${sg(Math.abs(l.slope))} × ${dn}; the slope’s standard error ${sg(l.seSlope)}; a typical point lies ${sg(l.se)}${u} from it.`,
      `Type a ${dn} inside ${sg(l.xRange[0])}–${sg(l.xRange[1])}${d.unit ? ` ${d.unit}` : ''} to see what the line gives there, and how far a new reading could stray.`];
    const bent = !!l.runs && l.runs.p < 0.05, tail = bent ? ` But the line is too straight for these points: they fall above and below it in ${l.runs?.runs} stretches where about ${fx(l.runs?.expected ?? 0, 0)} are expected — the relation bends, so do not trust the straight line at the ends.` : '';
    if (!f.significant) return { text: `${name} does not move with ${dn} that these readings can show: ${sure(f.conf)} only that the slope is between ${sg(l.slopeLo)} and ${sg(l.slopeHi)}${u} per ${d.unit ?? 'unit'}, which includes no change at all (r ${fx(l.r, 2)}, ${pSay(l.pR)}).`, tone: 'n', verdict: 'No link shown', more, notClaimed };
    return { text: `${name} ${l.slope >= 0 ? 'rises' : 'falls'} ${per} — ${sure(f.conf)} the true change for each is between ${sg(Math.abs(l.slope >= 0 ? l.slopeLo : l.slopeHi))} and ${sg(Math.abs(l.slope >= 0 ? l.slopeHi : l.slopeLo))}${u}. ${share0(l.r2)} of the variation in ${lc} goes with ${dn} (r ${fx(l.r, 2)}, R² ${fx(l.r2, 2)}, ${pSay(l.pR)}).${tail}`,
      tone: bent ? 'a' : 'n', verdict: bent ? 'Linked, not straight' : 'Linked', more, notClaimed };
  }
  const m = f.multi as Multiple, words = m.drivers.map(d => `${d.name} ${d.b >= 0 ? '+' : '−'}${sg(Math.abs(d.b))}${u} (${sg(d.lo)} to ${sg(d.hi)}, ${pSay(d.p)})`);
  const quiet = m.drivers.filter(d => d.p >= f.alpha).map(d => d.name);
  const more = [`Together the ${m.k} drivers explain ${share0(m.r2)} of the variation in ${lc} (adjusted ${share0(m.adjR2)}); F ${fx(m.f, 2)} on ${m.df1} and ${m.df2} degrees of freedom, ${pSay(m.pF)}; a typical row lies ${sg(m.se)}${u} from the fit.`,
    `The intercept is ${sg(m.intercept.b)}${u} (${sg(m.intercept.lo)} to ${sg(m.intercept.hi)}) — what the fit gives with every driver at zero, which may lie far outside the readings.`,
    quiet.length ? `${quiet.join(' and ')} ${quiet.length === 1 ? 'is' : 'are'} not shown to matter once the others are in.` : 'Each driver is shown to matter with the others held.'];
  if (!f.significant) return { text: `${name} does not move with these ${m.k} drivers that the readings can show: ${sure(f.conf)} only that together they explain ${share0(m.r2)} of the variation, which is no more than chance would give (F ${fx(m.f, 2)}, ${pSay(m.pF)}).`, tone: 'n', verdict: 'No link shown', more, notClaimed };
  return { text: `${name} goes with the drivers — ${sure(f.conf)} they move it together (F ${fx(m.f, 2)}, ${pSay(m.pF)}; R² ${fx(m.r2, 2)}). Per unit of each, the others held: ${words.join('; ')}.${m.serious ? ' The drivers move together, so these separate effects cannot be read apart.' : ''}`,
    tone: m.serious ? 'a' : 'n', verdict: m.serious ? 'Drivers move together' : 'Drivers found', more, notClaimed };
}

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
  if (f.kind === 'groups') {
    const r = f.res, used = f.groups.filter(g => g.values.length >= COMPARE_FROM), top = r ? [...r.groups].sort((x, y) => y.mean - x.mean) : [];
    const gap = top.length > 1 ? top[0].mean - top[top.length - 1].mean : undefined;
    const worst = f.significant && f.better !== 'either' && !!r && f.res?.pairs.some(x => x.p < f.alpha);
    return [t(`${f.noun[0].toUpperCase()}${f.noun.slice(1)}s`, big(used.length), f.left.length ? `${f.left.length} with too few` : undefined), t('Readings', big(f.groups.reduce((n, g) => n + g.values.length, 0))),
      t('Widest gap', gap !== undefined ? `${fx(gap, dp)}${u}` : '—', top.length > 1 ? `${top[0].name} − ${top[top.length - 1].name}` : undefined),
      t('p', f.p !== undefined ? fmtP(f.p) : '—', f.p !== undefined ? (f.leads === 'kruskal' ? 'Kruskal–Wallis' : 'one-way ANOVA') : undefined, worst && f.significant ? 'a' : 'n'),
      t('Between the groups', r ? share0(r.eta2) : '—', r ? 'η², the share of the variation' : undefined)];
  }
  if (f.kind === 'table') {
    const r = f.res;
    return [t('Counted', big(f.total), r ? `${r.rows} × ${r.cols} cells` : undefined), t(f.lead === 'fisher' ? 'Fisher’s exact' : 'χ²', r ? (f.lead === 'fisher' ? '—' : fx(r.chi2, 1)) : '—', r && f.lead !== 'fisher' ? dfs(r.df) : undefined),
      t('p', f.p !== undefined ? fmtP(f.p) : '—', f.lead === 'approx' ? 'approximate — counts too small' : undefined, f.lead === 'approx' ? 'a' : 'n'), t('Cramér’s V', r ? fx(r.cramersV, 2) : '—', r ? `${cramersWord(r.cramersV, r.rows, r.cols)} link` : undefined), t('Sure', f.enough ? conf : '—')];
  }
  if (f.kind === 'gauge') return gaugeTiles(f, a);
  if (f.kind === 'shape') return shapeTiles(f, a);
  if (f.kind === 'learn') return learnTiles(f, a);
  if (f.kind === 'relate') {
    if (f.k === 1) {
      const l = f.line, d = f.drivers[0];
      return [t('Pairs', big(f.n), f.n < f.need ? `at least ${f.need} for a line` : f.weak ? `at least ${LINE_FROM} for a firm line` : undefined, f.weak ? 'a' : 'n'), t('Link', l ? `r ${fx(l.r, 2)}` : '—', l ? `ρ ${fx(l.rho, 2)} · ${pSay(l.pR)}` : undefined),
        t('Per unit', l ? `${l.slope >= 0 ? '+' : '−'}${sg(Math.abs(l.slope))}${u}` : '—', l ? `${conf}: ${sg(l.slopeLo)} to ${sg(l.slopeHi)} per ${d.unit ?? 'unit'}` : undefined), t('Explained', l ? share0(l.r2) : '—', l ? 'R²' : undefined),
        t('Shape', l?.runs ? (l.runs.p < 0.05 ? 'Bends' : 'Straight enough') : '—', l?.runs ? `${l.runs.runs} stretches · ${fx(l.runs.expected, 0)} expected` : undefined, l?.runs && l.runs.p < 0.05 ? 'a' : 'n')];
    }
    const m = f.multi;
    const strong = m ? [...m.drivers].sort((x, y) => x.p - y.p)[0] : undefined;
    return [t('Rows', big(f.n), f.n < f.need ? `at least ${f.need} for ${f.k} drivers` : undefined, f.n < f.need ? 'a' : 'n'), t('Explained', m ? share0(m.r2) : '—', m ? `adjusted ${share0(m.adjR2)}` : undefined), t('p', f.p !== undefined ? fmtP(f.p) : '—', m ? `F ${fx(m.f, 1)}` : undefined),
      t('Strongest', strong ? strong.name : '—', strong ? pSay(strong.p) : undefined), t('Worst VIF', m ? fx(m.maxVif, 1) : '—', m ? (m.serious ? 'drivers move together' : 'drivers apart enough') : undefined, m?.serious ? 'a' : 'n')];
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
  if (f.kind === 'gauge' || f.kind === 'shape' || f.kind === 'learn') return { text: `${said.verdict} — ${what}, ${pctWord(f.conf)} confidence.`, tone: said.tone };
  if (f.kind === 'groups' || f.kind === 'table' || f.kind === 'relate') return { text: `${said.verdict} — ${what}${f.p !== undefined ? `, ${pSay(f.p)}` : ''}, ${pctWord(f.conf)} confidence.`, tone: said.tone };
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
  if (f.kind === 'gauge') return gaugePicture(f, a);
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
  if (f.kind === 'groups' && f.res) {
    const used = f.groups.filter(g => g.values.length >= COMPARE_FROM), cis = used.map(g => { const d = g.desc; return d ? meanInterval(d.n, d.mean, d.sd, f.conf) : undefined; });
    const axis = span([...used.flatMap(g => g.values), ...cis.flatMap(i => (i ? [i.lo, i.hi] : []))]);
    return used.map((g, i) => ({ label: `${g.name} · ${g.values.length}`, axis, unit: u, dots: g.values, ...(g.desc && cis[i] ? { point: { v: g.desc.mean, text: fx(g.desc.mean, dp) }, band: { lo: (cis[i] as Interval).lo, hi: (cis[i] as Interval).hi, text: `${c}: ${fx((cis[i] as Interval).lo, dp)}–${fx((cis[i] as Interval).hi, dp)}` } } : {}) }));
  }
  if (f.kind === 'paired' && f.t) {
    const t = f.t;
    return [{ label: `${f.second} − ${f.first}`, axis: sym([...f.diffs, t.lo, t.hi]), unit: u, zero: true, dots: f.diffs, tone: f.significant ? 'a' : 'n', point: { v: t.mean, text: fx(t.mean, dp) }, band: { lo: t.lo, hi: t.hi, text: `${c}: ${fx(t.lo, dp)} to ${fx(t.hi, dp)}` } }];
  }
  return [];
}

/* ------------------------------------------- the picture of a table and of a relation ------------------- */
/** What the page draws as a grid and a scatter and the paper as a table and a plot — one definition for both. */
export type Plot =
  | { kind: 'table'; rowName: string; colName: string; rows: string[]; cols: string[]; counts: number[][]; expected: number[][]; residuals: number[][]; rowTotals: number[]; colTotals: number[]; total: number }
  | { kind: 'scatter'; xName: string; yName: string; xUnit: string; yUnit: string; pts: [number, number][]; xAxis: [number, number]; yAxis: [number, number];
      line?: [[number, number], [number, number]]; band?: { x: number; lo: number; hi: number }[]; /** the fit against what was read: a line of equal values */ equal?: boolean;
      /** a fitted curve drawn through the points, and a level drawn across (a standard) — the learning curve */ curve?: [number, number][]; hline?: { y: number; label: string } };
const padded = (vs: number[]): [number, number] => { const lo = Math.min(...vs), hi = Math.max(...vs), p = Math.max((hi - lo) * 0.06, Math.abs(hi) * 0.0005, 1e-9); return [lo - p, hi + p]; };
export function analysisPlot(f: AnalysisFigures, a: AgreedAnalysis): Plot | undefined {
  if (f.kind === 'gauge') return gaugePlot(f, a);
  if (f.kind === 'shape') return shapePlot(f, a);
  if (f.kind === 'learn') return learnPlot(f, a);
  if (f.kind === 'table' && f.res) {
    return { kind: 'table', rowName: f.rowName, colName: f.colName, rows: f.rows, cols: f.cols, counts: f.counts, expected: f.res.expected, residuals: f.res.residuals, rowTotals: f.res.rowTotals, colTotals: f.res.colTotals, total: f.res.total };
  }
  if (f.kind === 'relate' && f.line) {
    const l = f.line, d = f.drivers[0], xs = f.xs[0], xAxis = padded(xs), steps = 24;
    const band = Array.from({ length: steps + 1 }, (_, i) => { const x = l.xRange[0] + (l.xRange[1] - l.xRange[0]) * i / steps, p = predictAt(l, x, f.conf); return { x, lo: p.y - p.meanHalf, hi: p.y + p.meanHalf }; });
    const yAxis = padded([...f.y, ...band.flatMap(b => [b.lo, b.hi])]);
    return { kind: 'scatter', xName: d.name, yName: a.name, xUnit: d.unit ?? '', yUnit: a.unit ?? '', pts: xs.map((x, i) => [x, f.y[i]] as [number, number]), xAxis, yAxis,
      line: [[l.xRange[0], l.intercept + l.slope * l.xRange[0]], [l.xRange[1], l.intercept + l.slope * l.xRange[1]]], band };
  }
  if (f.kind === 'relate' && f.multi) {
    const m = f.multi, ax = padded([...f.y, ...m.fitted]);
    return { kind: 'scatter', xName: 'Fitted', yName: a.name, xUnit: a.unit ?? '', yUnit: a.unit ?? '', pts: m.fitted.map((x, i) => [x, f.y[i]] as [number, number]), xAxis: ax, yAxis: ax, line: [[ax[0], ax[0]], [ax[1], ax[1]]], equal: true };
  }
  return undefined;
}
/** The small tables beside the picture — the references of a gauge study, the shapes tried — drawn by the page as tables and by the paper as tables. */
export function analysisGrids(f: AnalysisFigures, _a?: AgreedAnalysis): Grid[] {
  if (f.kind === 'gauge') return gaugeGrids(f);
  if (f.kind === 'shape') return shapeGrids(f);
  return [];
}
export type { Grid } from './measure';
/** The line's reading at a typed driver — inside the range measured, and beyond it said to be a guess. */
export function predictionSays(f: RelateFigures, a: AgreedAnalysis, x0: number): { text: string; inside: boolean } | undefined {
  if (!f.line) return undefined;
  const l = f.line, d = f.drivers[0], p = predictAt(l, x0, f.conf), u = a.unit ? ` ${a.unit}` : '', dp = f.dp + 1;
  if (!p.inside) return { text: `${sg(x0)}${d.unit ? ` ${d.unit}` : ''} is outside the ${sg(l.xRange[0])}–${sg(l.xRange[1])} measured — beyond the readings the line is a guess, so no interval is given.`, inside: false };
  return { text: `At ${sg(x0)}${d.unit ? ` ${d.unit}` : ''} the line gives ${fx(p.y, dp)}${u}: ${sure(f.conf)} the average there is between ${fx(p.y - p.meanHalf, dp)} and ${fx(p.y + p.meanHalf, dp)}${u}, and a single new reading would fall between ${fx(p.y - p.newHalf, dp)} and ${fx(p.y + p.newHalf, dp)}${u}.${f.n < PREDICT_WEAK ? ` With fewer than ${PREDICT_WEAK} pairs this is rough.` : ''}`, inside: true };
}

/** Rows of numbers pasted — `width` numbers to a line; whatever is not a row of exactly that many numbers is listed in `skipped`, never silently dropped. */
export function parseRows(text: string, width: number): { rows: number[][]; skipped: string[] } {
  const out = { rows: [] as number[][], skipped: [] as string[] };
  for (const line of text.split(/\r?\n/)) {
    const toks = line.split(/[\s,;]+/).filter(Boolean); if (!toks.length) continue;
    const nums = toks.map(t => (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN));
    if (nums.length === width && nums.every(Number.isFinite)) out.rows.push(nums); else out.skipped.push(line.trim());
  }
  return out;
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
