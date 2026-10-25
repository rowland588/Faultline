/* A MEASURED TEST — readings in, Ppk and Cpk out (docs/TOOLKIT.md, Part 4, tool 1;
 * the worked example in docs/LEAN40.md's appendix).
 *
 * Rowland, 10 October: "More emphasis on the tools and the tool design, such
 * as Cpk." The question: does this pass, and would it keep passing all shift?
 * The count of readings within the limits answers the first; the capability
 * (Cpk) the second — and both are said, because a test can pass on thirty
 * packs and still be a machine that will put 2 in 100 out light by Friday.
 *
 * FACTS → FIGURES → READING → VERDICT, and nothing worked out is stored. Pure:
 * the readings and what was agreed in, the figures and the sentences out.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?          the agreed count, said as "12 of 30 in"; Cpk only from
 *                    25 readings, otherwise "too few for capability — from 12"
 *   what it doesn't  a capability is a prediction from a sample: it "would
 *   claim            drift", it is never said to have happened
 *   people decide    a reading far from the rest is flagged, never struck by
 *                    the app; a struck reading keeps its place and counts for
 *                    nothing
 *
 * Agreed with "go, start release 2" (docs/BUILD.md): capable from Cpk 1.33,
 * just capable from 1.00, shown from 25 readings; the packers' three rules
 * applied plainly — fewer than 1 in 40 short by more than the tolerable
 * negative error means, on 30 packs, none.
 *
 * Made to cover more than two limits (knowledge/specs/FC-094-capability.md,
 * part 1 — Rowland, 22 October: "The process capability study is not
 * flexible enough ... I've got no idea what the tick is"): one limit (at
 * least, at most); pass or fail with how many may fail and what the count
 * proves (the success-run bound, spc.zero-failure-demonstration); the three
 * checks before an index is trusted — bell-shaped (D'Agostino–Pearson, which
 * whole-number readings do not throw), steady, read finely enough
 * (spc.normality-checks); how sure a Ppk is (Bissell's bound); and
 * the histogram. The distributions are lib/ie/dist, proved against SciPy. */
import type { AgreedReadings, StudyReading } from '../../lib/study';
import { fittedFigures, fittedSays, stackFigures, stackSays, type FittedFigures } from './modes';
import { runsFigures, faultsFigures, rateFigures, machineFigures, fillFigures, questionFigures, weigherFigures, runsSays, faultsSays, rateSays, machineSays, fillSays, questionSays, weigherSays, densitySays, type RunsFigures, type FaultsFigures, type RateFigures, type MachineFigures, type FillFigures, type QuestionFigures, type WeigherFigures } from './modes';
import { describe, describeSays, orderSays, type Described } from '../../lib/ie/describe';
import { autocorrelation, type Autocorrelation } from '../../lib/ie/stats';
import { binomUpper, dagostinoPearson, fewerThan, histogram, individualsLimits, itemsToShow, mostMayFail, ppkLowerBound, runOnOneSide, skewness, upperTail } from '../../lib/ie/dist';

export { upperTail };

export type Tone = 'r' | 'a' | 'w' | 'g' | 'n';

/* PPK AND CPK, AS THE PRACTICE NAMES THEM (AIAG SPC; ISO 22514). Rowland, 13
   October: "it's likely there are still quantification issues ... the
   capability page". The figure this tool called Cpk was worked from the
   overall spread of the readings — the practice calls that Ppk (Cmk for a
   machine's run): the readings as they came. Cpk is worked from the spread
   within — pack to pack, the average moving range ÷ 1.128 for single
   readings taken in order. On a steady run the two agree; on a run that
   drifts they part, and the drift is what a test must see. The verdict
   stands on Ppk — what was seen; Cpk is said beside it, and the drift in
   words when they part. */
/** d2 for a moving range of two readings — the practice's constant. */
export const D2 = 1.128;
/** They part when the run-to-run figure is this much above the readings' own. */
export const DRIFT_GAP = 0.2;

export const CPK_CAPABLE = 1.33;
export const CPK_JUST = 1.0;
export const CPK_FROM = 25;
/** The three checks before capability are said from this many readings. */
export const CHECK_FROM = 20;
/** Bell-shaped enough when the D'Agostino–Pearson p is at least this. */
export const BELL_P = 0.05;
/** Read finely enough with at least this many different values. */
export const FINE_FROM = 5;
/** How sure the bounds are — one-sided. */
export const SURE = 0.95;
/** PASS OR FAIL, HOW IT IS JUDGED (part 1b, 23 October): a number that may fail, a loss allowed, or a
 *  confidence level — and the confidences offered, 95% the default as before. */
export type Judge = 'count' | 'loss' | 'confidence';
export const CONFIDENCES = [0.9, 0.95, 0.99] as const;
export const judgeOf = (a?: AgreedReadings): Judge => (a?.judge === 'loss' || a?.judge === 'confidence' ? a.judge : 'count');
export const confOf = (a?: AgreedReadings): number => (a?.conf !== undefined && (CONFIDENCES as readonly number[]).includes(a.conf) ? a.conf : SURE);
/** 0.95 → "95%". */
export const pctWord = (c: number): string => `${Math.round(c * 100)}%`;
/** A share good, said rounded down to 0.1% so it never flatters — 0.97622 → "97.6%". */
export const goodWord = (x: number): string => `${(Math.floor(Math.max(0, x) * 1000 + 1e-9) / 10).toFixed(1)}%`;
/** HOW MANY MAY FAIL AND IT STILL PASSES: the number agreed; a loss allowed, ⌊(100 − good)·count ÷ 100⌋
 *  (worked in hundredths, so 98% of 4,500 is 90, never 89); a confidence level, the most that still
 *  shows it (lib/ie/dist mostMayFail) — −1 when even none failing cannot. */
export function mayFailOf(a: AgreedReadings | undefined, count: number): number {
  const j = judgeOf(a);
  if (j === 'count') return Math.max(0, Math.floor(a?.allowFail ?? 0));
  const good = a?.good ?? NaN;
  if (!(good > 0 && good <= 100)) return 0;
  if (j === 'loss') return Math.floor(((100 - good) * Math.max(0, count)) / 100 + 1e-9);
  return mostMayFail(Math.max(0, Math.round(count)), (100 - good) / 100, confOf(a));
}

/** One standard deviation of the readings, as the floor says it. */
export interface Outside { id: string; no: number; value: number; side: 'low' | 'high' }

export interface PackersFigures {
  nominal: number;
  /** The tolerable negative error, in the test's unit. */
  tne: number;
  meanOk: boolean;
  /** Short by more than the TNE, and by more than twice it. */
  shortTne: number;
  short2Tne: number;
  rule2Ok: boolean;
  rule3Ok: boolean;
}

export interface SampleFigures {
  /** Readings that count — struck ones left out. */
  n: number;
  /** How many the test needs. */
  count: number;
  enough: boolean;
  mean?: number;
  sd?: number;
  min?: number;
  max?: number;
  outside: Outside[];
  /** The spread within — pack to pack: the average moving range ÷ 1.128. */
  sdWithin?: number;
  /** Ppk, Pp: from the overall spread — the readings as they came. The verdict stands on Ppk. */
  pp?: number;
  ppk?: number;
  /** Which limit the readings are nearest. */
  ppkSide?: 'low' | 'high';
  /** Cpk, Cp: from the spread within — what the machine does pack to pack. */
  cp?: number;
  cpk?: number;
  cpkSide?: 'low' | 'high';
  /** The share that would fall outside at this mean and overall spread — and each tail of it. */
  shareOut?: number;
  shareLow?: number;
  shareHigh?: number;
  /** Readings more than 3 spreads from the mean of the others — flagged, not struck. */
  flagged: string[];
  /** Decimal places the readings were taken to — never more precision than the measurement. */
  dp: number;
  packers?: PackersFigures;
  ticks?: TickFigures;
  /** The three checks before capability — from CHECK_FROM readings. */
  checks?: SampleChecks;
  /** Bissell's 95% lower bound on Ppk — from CPK_FROM readings. */
  ppkLow?: number;
  /** The histogram's bars, each saying whether a reading in it is outside. */
  hist?: { edges: number[]; counts: number[]; width: number; out: boolean[] };
  /** W3a — the readings described (FC-103) and checked for dependence on the one before (FC-115), in the order taken. */
  desc?: Described;
  order?: Autocorrelation;
  /* W1 — the modes (knowledge/specs/FC-094-capability.md parts 2–4; ./modes): rejects out of what was
     made, faults found on each item, held at a rate; and on a measurement, machine capability and the
     lowest legal fill. */
  runs?: RunsFigures;
  faults?: FaultsFigures;
  rate?: RateFigures;
  machine?: MachineFigures;
  fill?: FillFigures;
  /** part 4 — oxygen, a seal or a CCP against its limit (the guard band); a weigher's heads */
  question?: QuestionFigures;
  weigher?: WeigherFigures;
  /** FC-096 — readings that are not bell-shaped: the four shapes fitted, the tail from the one that fits, beside the count as measured */
  fitted?: FittedFigures;
}

/** PASS OR FAIL, ONE AT A TIME — the count, how many may fail, and what the
 *  count proves: the exact one-sided bound on the share that would fail. */
export interface TickFigures {
  ok: number;
  bad: { id: string; no: number }[];
  /** How many may fail and it still passes — 0 when none may (the old rule); −1 when a confidence
   *  level cannot be shown by the count agreed. */
  allowFail: number;
  /** How it is judged, the share good it is judged against (loss, confidence) and the confidence. */
  judge: Judge;
  good?: number;
  conf: number;
  /** `conf` confident fewer than this share would fail, from what is in. */
  proves: number;
  /** Checked, with this many failing, to show fewer than 1 in 100 (at `conf`). */
  toShow1: number;
  /** The failed by what became of them — waste unless said (FC-156). */
  fates: Record<Fate, number>;
}

/* ============================ MONEY ==========================================
 * knowledge/specs/FC-156-capability-money.md. Rowland, 17 October: "everything
 * must derive a cost in the entire app"; 24 October, a reject's three fates —
 * "a reject that is reworked = cost to rework it putting it through the process
 * again ... a reject but only because a machine missed it but a human then
 * recovered it ... a reject that you cannot rework or human recover — it's
 * pure waste" — and the costs typed on each study. Nothing here is a proof:
 * the rejects' money is the sample's share at the packs a shift, said with
 * the count it came from. */
export type Fate = 'waste' | 'rework' | 'recovered';
export const FATES: { k: Fate; word: string; eg: string }[] = [
  { k: 'waste', word: 'Waste', eg: 'cannot be reworked or recovered' },
  { k: 'rework', word: 'Reworked', eg: 'put through the process again' },
  { k: 'recovered', word: 'Recovered by hand', eg: 'the machine missed it, a person put it in its box' },
];
export const fateOf = (r: Pick<StudyReading, 'fate'>): Fate => r.fate ?? 'waste';
export const fateWord = (k: Fate): string => (k === 'waste' ? 'waste' : k === 'rework' ? 'reworked' : 'recovered by hand');
/** A weight the money can be said in — grams or kilos, as typed on the study. */
export const weightUnit = (unit?: string): 'g' | 'kg' | undefined => {
  const u = (unit ?? '').trim().toLowerCase();
  return u === 'g' || u === 'gram' || u === 'grams' ? 'g' : u === 'kg' || u === 'kilo' || u === 'kilos' ? 'kg' : undefined;
};

export interface Giveaway {
  /** Over the nominal, a pack, in the study's unit (0 when the mean is not over it). */
  perPack: number;
  unit: string;
  /** A shift and a week, when the packs a shift (and the shifts a week) are given and the unit is a weight. */
  kgShift?: number; kgWeek?: number;
  /** In money, when the cost a kilo is given too. */
  gbpShift?: number; gbpWeek?: number;
  /** What is missing to say it in money, in the words the tile shows. */
  missing: string[];
}
export interface RejectsShift { failed: number; waste: number; rework: number; recovered: number; wasteGbp?: number; reworkGbp?: number; gbp?: number }
export interface RejectsMoney {
  /** The sample: failed of checked, and by fate. */
  failed: number; n: number; fates: Record<Fate, number>;
  /** Scaled to the packs a shift, by the sample's share. */
  shift?: RejectsShift;
  weekGbp?: number;
  missing: string[];
}
export interface SampleMoney { giveaway?: Giveaway; rejects?: RejectsMoney; runs?: RunsMoney }
/** REJECTS OUT OF WHAT WAS MADE in money (W1, by FC-156's rule): the pooled share at the packs a shift
 *  × a pack's materials — every reject pure waste unless the fates are typed on a pass-or-fail study. */
export interface RunsMoney { p: number; rejectsShift?: number; gbpShift?: number; gbpWeek?: number; missing: string[] }

export const MISSING_PACKS = 'give the packs a shift to say it in money';
export const MISSING_KG = 'give £ a kg to say it in money';
export const MISSING_WEIGHT = 'in money needs a weight in g or kg';
const missingCosts = (fates: Record<Fate, number>, a: AgreedReadings): string | undefined => {
  const need = [fates.waste > 0 && a.materialsPerPack === undefined ? 'a pack’s materials' : '', fates.rework > 0 && a.reworkPerPack === undefined ? 'one rework’s cost' : ''].filter(Boolean);
  return need.length ? `give ${need.join(' and ')} to say it in money` : undefined;
};
const positive = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v > 0;

/** WHAT THE FINDING COSTS — give-away on a measured study with a nominal; the
 *  rejects by fate on a pass-or-fail study. Absent where the study has neither. */
export function sampleMoney(f: SampleFigures, a: AgreedReadings | undefined): SampleMoney {
  if (a?.kind === 'rejects' && f.runs && f.runs.made > 0) {
    const r = f.runs, missing: string[] = [];
    if (a.packsPerShift === undefined) missing.push(MISSING_PACKS);
    if (a.materialsPerPack === undefined) missing.push('give a pack’s materials to say it in money');
    const rejectsShift = a.packsPerShift !== undefined ? r.p * a.packsPerShift : undefined;
    const gbpShift = rejectsShift !== undefined && a.materialsPerPack !== undefined ? rejectsShift * a.materialsPerPack : undefined;
    const gbpWeek = gbpShift !== undefined && a.shiftsPerWeek ? gbpShift * a.shiftsPerWeek : undefined;
    return { runs: { p: r.p, ...(rejectsShift !== undefined ? { rejectsShift } : {}), ...(gbpShift !== undefined ? { gbpShift } : {}), ...(gbpWeek !== undefined ? { gbpWeek } : {}), missing } };
  }
  if (!a || !f.n) return {};
  const P = positive(a.packsPerShift) ? Math.round(a.packsPerShift as number) : undefined;
  const W = positive(a.shiftsPerWeek) ? (a.shiftsPerWeek as number) : undefined;
  if (a.kind === 'ticks') {
    const t = f.ticks;
    if (!t || !t.bad.length) return {};
    const r: RejectsMoney = { failed: t.bad.length, n: f.n, fates: t.fates, missing: [] };
    if (P === undefined) r.missing.push(MISSING_PACKS);
    else {
      const per = (k: number) => Math.round((P * k) / f.n);
      const shift: RejectsShift = { failed: per(t.bad.length), waste: per(t.fates.waste), rework: per(t.fates.rework), recovered: per(t.fates.recovered) };
      if (t.fates.waste > 0 && a.materialsPerPack !== undefined && a.materialsPerPack >= 0) shift.wasteGbp = shift.waste * a.materialsPerPack;
      if (t.fates.rework > 0 && a.reworkPerPack !== undefined && a.reworkPerPack >= 0) shift.reworkGbp = shift.rework * a.reworkPerPack;
      const need = missingCosts(t.fates, a);
      if (need) r.missing.push(need);
      else { shift.gbp = (shift.wasteGbp ?? 0) + (shift.reworkGbp ?? 0); if (W !== undefined) r.weekGbp = shift.gbp * W; }
      r.shift = shift;
    }
    return { rejects: r };
  }
  if (a.nominal === undefined || f.mean === undefined) return {};
  const g: Giveaway = { perPack: Math.max(0, f.mean - a.nominal), unit: a.unit ?? '', missing: [] };
  const wu = weightUnit(a.unit);
  if (!wu) g.missing.push(MISSING_WEIGHT);
  else {
    const kg = wu === 'g' ? g.perPack / 1000 : g.perPack;
    if (P === undefined) g.missing.push(MISSING_PACKS);
    else {
      g.kgShift = kg * P;
      if (W !== undefined) g.kgWeek = g.kgShift * W;
      if (!positive(a.costPerKg)) g.missing.push(MISSING_KG);
      else { g.gbpShift = g.kgShift * (a.costPerKg as number); if (W !== undefined) g.gbpWeek = g.kgShift * W * (a.costPerKg as number); }
    }
  }
  return { giveaway: g };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** Kilos as a person says them: 41 kg, 0.4 kg, 2,050 kg. */
export const kgWord = (kg: number): string => `${kg >= 100 ? Math.round(kg).toLocaleString('en-GB') : kg >= 10 ? kg.toFixed(1).replace(/\.0$/, '') : kg.toFixed(kg >= 1 ? 1 : 2).replace(/\.?0+$/, '')} kg`;
/** Pounds as the loss count says them (lib/cost fmtGBP): £738, £3.7k. */
export const gbpWord = (n: number): string => (n >= 1000 ? `£${(Math.round(n / 100) / 10).toFixed(1)}k` : `£${Math.round(n).toLocaleString('en-GB')}`);

/** THE MONEY IN ONE SENTENCE, with its because — under what the study says. */
export function moneySays(m: SampleMoney, f: SampleFigures, a: AgreedReadings): { text: string; tone: Tone } | undefined {
  if (m.runs) {
    const r = m.runs;
    if (r.gbpShift === undefined) return { text: `In money: ${r.missing.join('; ')}.`, tone: 'n' };
    return { text: `At ${(r.p * 100).toFixed(2)}% rejected, a shift of ${big(a.packsPerShift as number)} loses about ${big(Math.round(r.rejectsShift as number))} packs — ${gbpWord(r.gbpShift)} of materials${r.gbpWeek !== undefined ? `, ${gbpWord(r.gbpWeek)} a week` : ''} — because of the rejects.`, tone: 'a' };
  }
  const unit = a.unit ? ` ${a.unit}` : '';
  if (m.giveaway) {
    const g = m.giveaway;
    if (g.perPack <= 0) return { text: `No give-away: the mean (${fix(f.mean as number, f.dp)}${unit}) is not over the nominal.`, tone: 'n' };
    const parts = [g.kgShift !== undefined ? `${kgWord(g.kgShift)} a shift` : '', g.gbpShift !== undefined ? `${gbpWord(g.gbpShift)} a shift` : '', g.gbpWeek !== undefined ? `${gbpWord(g.gbpWeek)} a week` : ''].filter(Boolean);
    return { text: `Give-away ${fix(g.perPack, f.dp)}${unit} a pack${parts.length ? ` — ${parts.join(', ')}` : ''} — because the mean (${fix(f.mean as number, f.dp)}${unit}) sits ${fix(g.perPack, f.dp)}${unit} over the nominal.${g.missing.length ? ` ${cap(g.missing.join('; '))}.` : ''}`, tone: g.gbpShift !== undefined && g.gbpShift > 0 ? 'a' : 'n' };
  }
  if (m.rejects) {
    const r = m.rejects, by = (['waste', 'rework', 'recovered'] as Fate[]).filter(k => r.fates[k] > 0);
    const sample = `${big(r.failed)} of ${big(r.n)} failed — ${by.map(k => `${big(r.fates[k])} ${fateWord(k)}`).join(', ')}`;
    if (!r.shift) return { text: `Rejects: ${sample}. ${r.missing.join('; ')}.`, tone: 'n' };
    const s = r.shift;
    const said = by.map(k => k === 'waste' ? `${big(s.waste)} to waste${s.wasteGbp !== undefined ? ` (${gbpWord(s.wasteGbp)})` : ''}`
      : k === 'rework' ? `${big(s.rework)} reworked${s.reworkGbp !== undefined ? ` (${gbpWord(s.reworkGbp)})` : ''}`
      : `${big(s.recovered)} recovered by hand, not priced`).join(', ');
    const total = s.gbp !== undefined ? `, ${gbpWord(s.gbp)} a shift${r.weekGbp !== undefined ? `, ${gbpWord(r.weekGbp)} a week` : ''}` : '';
    return { text: `Rejects: ${sample} — at ${big(Math.round(a.packsPerShift as number))} a shift that is ${said}${total}${r.missing.length ? `. ${r.missing.join('; ')}` : ''}.`, tone: s.gbp !== undefined && s.gbp > 0 ? 'a' : 'n' };
  }
  return undefined;
}

export interface SampleChecks {
  /** The D'Agostino–Pearson test against the bell, its two parts, and which
   *  way it leans — undefined when every reading is the same. */
  shape?: { p: number; k2: number; zSkew: number; zKurt: number; skew: number; bell: boolean };
  /** The individuals chart's limits (x̄ ± 2.66·MR̄), the readings beyond
   *  them, and the first run of eight on one side of the mean. */
  steady: { lcl: number; ucl: number; beyond: { id: string; no: number; value: number }[]; run?: { fromNo: number; toNo: number; length: number; side: 'above' | 'below' }; ok: boolean };
  /** How many different values were read. */
  distinct: number;
  fine: boolean;
}

/** Kept readings in the order taken, numbered 1… as they stand in the list. */
const counted = (rs: StudyReading[]) => rs.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck);

const dpOf = (v: number) => { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(3, s.length - i - 1); };
const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[], m = meanOf(xs)) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)));
/** The spread within, from the readings in the order taken: the average of
 *  each reading's difference from the one before, ÷ d2. */
export const sdWithinOf = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  return t / (xs.length - 1) / D2;
};
/** A capability index and its nearer side, from a mean and a spread. */
const indexOf = (m: number, s: number, lower?: number, upper?: number): { k: number; side: 'low' | 'high'; c?: number } => {
  const lo = lower !== undefined ? (m - lower) / (3 * s) : Infinity;
  const hi = upper !== undefined ? (upper - m) / (3 * s) : Infinity;
  return { k: Math.min(lo, hi), side: lo <= hi ? 'low' : 'high', ...(lower !== undefined && upper !== undefined ? { c: (upper - lower) / (6 * s) } : {}) };
};

/** The tolerable negative error for a pack sold by weight or volume (the
 *  Weights and Measures (Packaged Goods) Regulations 2006, Schedule 2), in the
 *  test's own unit. Undefined outside 5 g to 10 kg. */
export function tneFor(nominal: number, unit?: string): number | undefined {
  const big = /^(kg|l|litre|litres)$/i.test(unit ?? '');
  const q = big ? nominal * 1000 : nominal;            // grams or millilitres
  let e: number | undefined;
  if (q < 5 || q > 10000) return undefined;
  if (q <= 50) e = q * 0.09;
  else if (q <= 100) e = 4.5;
  else if (q <= 200) e = q * 0.045;
  else if (q <= 300) e = 9;
  else if (q <= 500) e = q * 0.03;
  else if (q <= 1000) e = 15;
  else if (q <= 10000) e = q * 0.015;
  if (e === undefined) return undefined;
  return big ? e / 1000 : e;
}

/** The figures, from what was agreed and the readings as taken. */
export function sample(agreed: AgreedReadings | undefined, readings: StudyReading[]): SampleFigures {
  const count = Math.max(0, agreed?.count ?? 0);
  const kept = counted(readings);
  if (agreed?.kind === 'ticks') {
    const t = kept.filter(r => typeof r.ok === 'boolean');
    const bad = t.filter(r => !r.ok).map(r => ({ id: r.id, no: r.no }));
    const fates: Record<Fate, number> = { waste: 0, rework: 0, recovered: 0 };
    for (const r of t) if (!r.ok) fates[fateOf(r)]++;
    return { n: t.length, count, enough: count > 0 && t.length >= count, outside: [], flagged: [], dp: 0,
      ticks: { ok: t.length - bad.length, bad, fates, allowFail: mayFailOf(agreed, count), judge: judgeOf(agreed), ...(judgeOf(agreed) !== 'count' && agreed.good !== undefined ? { good: agreed.good } : {}),
        conf: confOf(agreed), proves: binomUpper(bad.length, t.length, confOf(agreed)), toShow1: itemsToShow(0.01, confOf(agreed), bad.length) } };
  }
  /* W1 — the counted modes: a run, an inspection or an interval a reading */
  if (agreed?.kind === 'rejects') {
    const runs = runsFigures(agreed, readings) as RunsFigures;
    return { n: runs.runs.length, count, enough: count > 0 && runs.runs.length >= count, outside: [], flagged: [], dp: 0, runs };
  }
  if (agreed?.kind === 'faults') {
    const faults = faultsFigures(agreed, readings) as FaultsFigures;
    return { n: faults.insp.length, count, enough: count > 0 && faults.insp.length >= count, outside: [], flagged: [], dp: 0, faults };
  }
  if (agreed?.kind === 'rate') {
    const rate = rateFigures(agreed, readings) as RateFigures;
    return { n: rate.intervals.length, count, enough: count > 0 && rate.intervals.length >= count, outside: [], flagged: [], dp: 1, rate };
  }
  const vs = kept.filter((r): r is typeof r & { value: number } => typeof r.value === 'number' && Number.isFinite(r.value));
  const xs = vs.map(r => r.value);
  const dp = xs.reduce((d, x) => Math.max(d, dpOf(x)), 0);
  const f: SampleFigures = { n: xs.length, count, enough: count > 0 && xs.length >= count, outside: [], flagged: [], dp };
  if (!xs.length) return f;
  const m = meanOf(xs), s = sdOf(xs, m), sw = sdWithinOf(xs);
  Object.assign(f, { mean: m, sd: s, min: Math.min(...xs), max: Math.max(...xs), ...(xs.length >= 2 ? { sdWithin: sw } : {}) });

  /* Packers: the limit is the nominal less the TNE, said by the three rules. */
  let lower = agreed?.lower, upper = agreed?.upper;
  if (agreed?.kind === 'packers' && agreed.nominal !== undefined) {
    const tne = packersTne(agreed);
    if (tne !== undefined) {
      const nom = agreed.nominal;
      const shortTne = xs.filter(x => x < nom - tne).length, short2Tne = xs.filter(x => x < nom - 2 * tne).length;
      f.packers = { nominal: nom, tne, meanOk: m >= nom, shortTne, short2Tne, rule2Ok: shortTne * 40 < xs.length, rule3Ok: short2Tne === 0 };
      lower = nom - tne; upper = undefined;
    }
  }
  f.outside = vs.flatMap((r): Outside[] => (lower !== undefined && r.value < lower ? [{ id: r.id, no: r.no, value: r.value, side: 'low' }]
    : upper !== undefined && r.value > upper ? [{ id: r.id, no: r.no, value: r.value, side: 'high' }] : []));
  if (agreed?.kind === 'packers') f.outside = f.outside.filter(o => f.packers && o.value < f.packers.nominal - f.packers.tne);

  if (s > 0 && (lower !== undefined || upper !== undefined)) {
    const p = indexOf(m, s, lower, upper);
    f.ppk = p.k; f.ppkSide = p.side;
    if (p.c !== undefined) f.pp = p.c;
    /* each tail kept, so the words can say which side the share falls on —
       or both, when it does (docs/UPGRADE-AUDIT.md M2) */
    f.shareLow = lower !== undefined ? upperTail((m - lower) / s) : 0;
    f.shareHigh = upper !== undefined ? upperTail((upper - m) / s) : 0;
    f.shareOut = f.shareLow + f.shareHigh;
  }
  if (sw > 0 && (lower !== undefined || upper !== undefined)) {
    const c = indexOf(m, sw, lower, upper);
    f.cpk = c.k; f.cpkSide = c.side;
    if (c.c !== undefined) f.cp = c.c;
  }
  if (xs.length >= 5) {
    f.flagged = vs.filter((r, i) => {
      const others = xs.filter((_, j) => j !== i), om = meanOf(others), os = sdOf(others, om);
      return os > 0 && Math.abs(r.value - om) > 3 * os;
    }).map(r => r.id);
  }
  /* how sure the Ppk is, so thirty readings read rougher than three hundred */
  if (f.ppk !== undefined && Number.isFinite(f.ppk) && xs.length >= CPK_FROM) f.ppkLow = ppkLowerBound(f.ppk, xs.length, SURE);

  /* BEFORE CAPABILITY — bell-shaped, steady, read finely enough */
  if (xs.length >= CHECK_FROM) {
    const dp2 = dagostinoPearson(xs), sk = skewness(xs);
    const lim = individualsLimits(xs);
    const beyond = lim ? vs.filter(r => r.value > lim.ucl + 1e-12 || r.value < lim.lcl - 1e-12).map(r => ({ id: r.id, no: r.no, value: r.value })) : [];
    const run = runOnOneSide(xs, m);
    const distinct = new Set(xs.map(x => x.toFixed(dp))).size;
    f.checks = {
      ...(dp2 && sk !== undefined ? { shape: { p: dp2.p, k2: dp2.k2, zSkew: dp2.zSkew, zKurt: dp2.zKurt, skew: sk, bell: dp2.p >= BELL_P } } : {}),
      steady: { lcl: lim?.lcl ?? m, ucl: lim?.ucl ?? m, beyond,
        ...(run ? { run: { fromNo: vs[run.from].no, toNo: vs[run.to].no, length: run.to - run.from + 1, side: run.side } } : {}),
        ok: !beyond.length && !run },
      distinct, fine: distinct >= FINE_FROM,
    };
    if (agreed?.kind === 'limits' && f.checks.shape && !f.checks.shape.bell) {
      const fit = fittedFigures(xs, lower, upper, f.outside.length, CPK_CAPABLE);
      if (fit) f.fitted = fit;
    }
  }

  /* the histogram, with the limits inside its span */
  const also = [lower, upper, agreed?.nominal].filter((v): v is number => v !== undefined);
  const h = histogram(xs, also);
  if (h) {
    const outIds = new Set(f.outside.map(o => o.id)), out = h.counts.map(() => false);
    for (const r of vs) if (outIds.has(r.id)) out[Math.min(h.counts.length - 1, Math.max(0, Math.floor((r.value - h.edges[0]) / h.width + 1e-9)))] = true;
    f.hist = { edges: h.edges, counts: h.counts, width: h.width, out };
  }
  f.desc = describe(xs);
  f.order = autocorrelation(vs.map(r => r.value));
  /* W1 — machine capability on one machine's consecutive parts (FC-084); the lowest legal fill on a
     sold-by-weight study (FC-157) */
  if (agreed) {
    const machine = machineFigures(agreed, m, s, xs.length, lower, upper);
    if (machine) f.machine = machine;
    const fill = fillFigures(agreed, m, s, xs.length, f.packers?.tne);
    if (fill) f.fill = fill;
    const q = questionFigures(agreed, xs, lower, upper);
    if (q) f.question = q;
    const w = weigherFigures(agreed, vs);
    if (w) f.weigher = w;
  }
  return f;
}

/** THE TNE A PACKERS STUDY RUNS ON: the weight table's for a weight; for a volume pack checked by weight
 *  (FC-163) the volume table's at the nominal in millilitres, converted by the density. */
export function packersTne(a: Pick<AgreedReadings, 'nominal' | 'unit' | 'nominalMl' | 'density'>): number | undefined {
  if (a.nominalMl !== undefined && a.density !== undefined && a.density > 0) { const t = tneFor(a.nominalMl, 'ml'); return t === undefined ? undefined : t * a.density; }
  return a.nominal === undefined ? undefined : tneFor(a.nominal, a.unit);
}

/** THE LINES A PICTURE DRAWS — the limits and the target, for the readings
 *  in order and the histogram, on screen and on paper alike. */
export function sampleLines(f: SampleFigures, a: AgreedReadings): { v: number; label: string; kind: 'lim' | 'lim2' | 'nom' }[] {
  const tne = f.packers?.tne;
  const lines: { v: number; label: string; kind: 'lim' | 'lim2' | 'nom' }[] = [];
  if (a.kind === 'packers' && f.packers && tne !== undefined) {
    lines.push({ v: f.packers.nominal, label: `nominal ${f.packers.nominal}`, kind: 'nom' });
    lines.push({ v: f.packers.nominal - tne, label: `${+tne.toFixed(3)} short`, kind: 'lim' });
    lines.push({ v: f.packers.nominal - 2 * tne, label: `${+(2 * tne).toFixed(3)} short`, kind: 'lim2' });
  } else {
    if (a.upper !== undefined) lines.push({ v: a.upper, label: `${a.lower === undefined ? 'at most' : 'upper'} ${a.upper}`, kind: 'lim' });
    if (a.lower !== undefined) lines.push({ v: a.lower, label: `${a.upper === undefined ? 'at least' : 'lower'} ${a.lower}`, kind: 'lim' });
    if (a.nominal !== undefined && a.nominal !== a.lower && a.nominal !== a.upper) lines.push({ v: a.nominal, label: `target ${a.nominal}`, kind: 'nom' });
  }
  return lines;
}


/* ---------------------------------------------------------------- the words */

const fix = (v: number, dp: number) => v.toFixed(dp);
const isWeight = (unit?: string) => /^(g|kg|mg|oz|lb)$/i.test(unit ?? '');
const sideWord = (side: 'low' | 'high', unit?: string) => (isWeight(unit) ? (side === 'low' ? 'light' : 'heavy') : side);
const u = (unit?: string) => (unit ? ` ${unit}` : '');

/** "about 2 in 100" — the share said the way a person would. */
export function inWords(p: number): string {
  if (p >= 0.995) return 'nearly all';
  for (const d of [100, 1000, 10000]) {
    const k = Math.round(p * d);
    if (k >= 1) return `about ${k} in ${d.toLocaleString('en-GB')}`;
  }
  return 'fewer than 1 in 10,000';
}

function limitsWords(a: AgreedReadings, dp: number): string {
  const unit = u(a.unit);
  if (a.lower !== undefined && a.upper !== undefined) return `within ${fix(a.lower, dp)}–${fix(a.upper, dp)}${unit}`;
  if (a.lower !== undefined) return `at least ${fix(a.lower, dp)}${unit}`;
  if (a.upper !== undefined) return `at most ${fix(a.upper, dp)}${unit}`;
  return 'with no limits agreed';
}

export interface SampleSays {
  /** The reading, its verdict word last. */
  text: string;
  tone: Tone;
  /** One word or two: Passed · Didn't pass · 12 of 30 in · Not measured. */
  verdict: string;
  /** The second sentence — would it keep passing — with its own tone. */
  capability?: { text: string; tone: Tone };
}

/** What the figures say, in the order a person would say it. */
export function sampleSays(f: SampleFigures, a: AgreedReadings | undefined): SampleSays {
  if (!a) return { text: 'Agree the limits and how many readings, then take them.', tone: 'n', verdict: 'Not agreed' };
  /* W1 — the counted modes say themselves (./modes), their own empty words included */
  if (a.kind === 'rejects' && f.runs) return runsSays(f.runs, f.count);
  if (a.kind === 'faults' && f.faults) return faultsSays(f.faults, f.count);
  if (a.kind === 'rate' && f.rate) return rateSays(f.rate, f.count, a.unit);
  if (!f.n) return { text: `Nothing measured yet — ${f.count} readings to take.`, tone: 'n', verdict: 'Not measured' };
  const of = `${f.n} of ${f.count} in`;

  if (a.kind === 'ticks' && f.ticks) {
    /* the agreed verdict stays the verdict: more failed than may → it did
       not pass, at once; what the count proves is said under it, with its
       confidence (part 1b) */
    const t = f.ticks, { bad, allowFail } = t, ok = big(t.ok);
    const proves = provesWords(t, f.n, f.enough);
    const which = bad.slice(0, 3).map(b => `no. ${b.no}`).join(', ') + (bad.length > 3 ? ` and ${bad.length - 3} more` : '');
    const failed = bad.length ? `${big(bad.length)} failed (${which})` : '';
    if (t.judge === 'count') {
      if (bad.length > allowFail)
        return { text: `${ok} of ${big(f.n)} good — ${failed}${allowFail ? `, at most ${big(allowFail)} allowed` : ''} — Didn’t pass.`, tone: 'r', verdict: 'Didn’t pass', capability: proves };
      if (f.enough)
        return { text: `${ok} of ${big(f.n)} good${bad.length ? ` — ${failed}, ${big(allowFail)} allowed` : ''} — Passed.`, tone: 'g', verdict: 'Passed', capability: proves };
      return { text: `${big(f.n)} of ${big(f.count)} checked — ${bad.length ? `${failed}, ${big(allowFail)} allowed so far` : 'all good so far'}.`, tone: 'a', verdict: of, capability: proves };
    }
    /* a loss allowed or a confidence level: the rule said with the count, every time */
    const rule = ruleWords(t);
    if (allowFail < 0) {
      const p0 = (100 - (t.good ?? 100)) / 100;
      return { text: `${big(f.count)} checked cannot show ${rule.slice(4)}, even with none failing — it takes ${big(itemsToShow(p0, t.conf, 0))}.`, tone: 'r', verdict: 'Didn’t pass', capability: proves };
    }
    if (bad.length > allowFail)
      return { text: `${ok} of ${big(f.n)} good — ${failed}, at most ${big(allowFail)} allowed${rule} — Didn’t pass.`, tone: 'r', verdict: 'Didn’t pass', capability: proves };
    if (f.enough)
      return { text: `${ok} of ${big(f.n)} good — ${failed || 'none failed'}, ${big(allowFail)} allowed${rule} — Passed.`, tone: 'g', verdict: 'Passed', capability: proves };
    return { text: `${big(f.n)} of ${big(f.count)} checked — ${failed || 'all good so far'}, ${big(allowFail)} allowed${rule}.`, tone: 'a', verdict: of, capability: proves };
  }

  const dp = f.dp, unit = u(a.unit), m = f.mean ?? 0, mean = `mean ${fix(m, dp)}${unit}`;
  const sayOutside = () => {
    const sides = [...new Set(f.outside.map(o => o.side))];
    const both = f.outside.length === 2 ? 'both' : 'all';
    const how = sides.length === 1 ? (f.outside.length === 1 ? `, ${sideWord(sides[0], a.unit)}` : `, ${both} ${sideWord(sides[0], a.unit)}`) : '';
    const vals = f.outside.slice(0, 4).map(o => fix(o.value, dp)).join(', ') + (f.outside.length > 4 ? ` and ${f.outside.length - 4} more` : '');
    return `${f.outside.length} outside${how} (${vals})`;
  };

  let main: { text: string; tone: Tone; verdict: string };
  if (a.kind === 'packers' && f.packers) {
    const p = f.packers, tne = fix(p.tne, Math.max(dp, p.tne % 1 ? 1 : 0));
    const two = fix(2 * p.tne, Math.max(dp, (2 * p.tne) % 1 ? 1 : 0));
    const rules = [
      `average ${fix(m, dp)}${unit}, ${p.meanOk ? 'at or above' : 'below'} ${fix(p.nominal, dp)} ${p.meanOk ? '✓' : '✗'}`,
      p.shortTne ? `${p.shortTne} more than ${tne}${unit} short ${p.rule2Ok ? '✓' : '✗'}` : `none more than ${tne}${unit} short ✓`,
      p.short2Tne ? `${p.short2Tne} more than ${two}${unit} short ✗` : `none more than ${two}${unit} short ✓`,
    ];
    const ok = p.meanOk && p.rule2Ok && p.rule3Ok;
    const failNow = !p.rule3Ok || (f.enough && !ok);
    main = failNow ? { text: `${rules.join(' · ')} — Didn’t pass.`, tone: 'r', verdict: 'Didn’t pass' }
      : f.enough ? { text: `${rules.join(' · ')} — Passed.`, tone: 'g', verdict: 'Passed' }
      : { text: `${of} — ${rules.join(' · ')} so far.`, tone: 'a', verdict: of };
  } else if (f.outside.length) {
    main = { text: `${f.n} readings, ${mean} — ${sayOutside()} — Didn’t pass.`, tone: 'r', verdict: 'Didn’t pass' };
  } else if (!f.enough) {
    main = { text: `${of} — all ${limitsWords(a, dp)} so far.`, tone: 'a', verdict: of };
  } else {
    main = { text: `${f.n} readings, ${mean}, ${fix(f.min ?? m, dp)}–${fix(f.max ?? m, dp)}, all ${limitsWords(a, dp)} — Passed.`, tone: 'g', verdict: 'Passed' };
  }
  return { ...main, capability: capabilityWords(f, a) };
}

const big = (n: number) => n.toLocaleString('en-GB');

/** The rule a loss allowed or a confidence level is judged by, after "allowed" — " for 98% good",
 *  " for 98% good, 95% confident"; nothing for a number that may fail (it is the number). */
export function ruleWords(t: Pick<TickFigures, 'judge' | 'good' | 'conf'>): string {
  if (t.judge === 'loss') return ` for ${t.good}% good`;
  if (t.judge === 'confidence') return ` for ${t.good}% good, ${pctWord(t.conf)} confident`;
  return '';
}

/** WHAT A PASS-OR-FAIL COUNT PROVES, with its confidence (part 1b; spc.zero-failure-demonstration) —
 *  the exact one-sided bound on the share that would fail, never flattering: a number that may fail
 *  says it as "fewer than x in 100 would fail" and what 1 in 100 would take; a loss allowed or a
 *  confidence level as the share good, rounded down, beside the share agreed. */
function provesWords(t: TickFigures, n: number, enough: boolean): { text: string; tone: Tone } {
  const failed = t.bad.length;
  const pc = pctWord(t.conf);
  if (t.proves >= 0.995) return { text: `${failed ? `${big(failed)} failed in ${big(n)}` : enough ? 'That' : 'So far that'} proves nothing yet about how few would fail.`, tone: 'n' };
  const lead = failed ? `${big(failed)} failed in ${big(n)}: we` : enough ? 'We' : 'So far we';
  if (t.judge === 'count') {
    const more = t.proves > 0.01
      ? `; to show fewer than 1 in 100 takes ${big(t.toShow1)}${failed ? ` checked with ${big(failed)} failed` : ' good in a row'}` : '';
    return { text: `${lead} can be ${pc} confident ${fewerThan(t.proves)} would fail${more}.`, tone: 'n' };
  }
  const low = 1 - t.proves, good = t.good ?? 100;
  const shown = low * 100 + 1e-9 >= good;
  const short = shown ? '' : !enough ? `; ${good}% is not shown yet`
    : t.judge === 'loss' ? `; ${good}% itself is not shown at this confidence — the count passed it` : ` — short of the ${good}% agreed`;
  return { text: `${lead} can be ${pc} confident at least ${goodWord(low)} would be good${short}.`, tone: 'n' };
}

/** W1 — THE NOTES A MEASUREMENT CARRIES BESIDE ITS SENTENCES: machine capability on one machine's
 *  consecutive parts (FC-084) and the lowest legal fill on a sold-by-weight study (FC-157), each from
 *  ./modes, on screen and on paper alike. */
export type ModeNoteKind = 'machine' | 'fill' | 'question' | 'weigher' | 'density' | 'order' | 'fitted' | 'stack';
/** The middle of the readings, said under the histogram — median, middle half, lean (FC-103). */
export const spreadSays = (f: SampleFigures, unit?: string): string => (f.desc ? describeSays(f.desc, f.dp + 1, unit) : '');
export function modeNotes(f: SampleFigures, a: AgreedReadings | undefined): { k: ModeNoteKind; text: string; tone: Tone }[] {
  if (!a) return [];
  const out: { k: ModeNoteKind; text: string; tone: Tone }[] = [];
  if (f.question) out.push({ k: 'question', ...questionSays(f.question, f.dp, a.unit, a.limitSource) });
  if (f.weigher) out.push({ k: 'weigher', ...weigherSays(f.weigher, f.dp, a.unit) });
  if (f.machine) out.push({ k: 'machine', ...machineSays(f.machine) });
  if (f.fill && f.mean !== undefined) out.push({ k: 'fill', ...fillSays(f.fill, f.mean, f.dp, a.unit) });
  if (f.fitted) out.push({ k: 'fitted', ...fittedSays(f.fitted, a.unit) });
  const st = stackFigures(a, packersTne(a), f.sd, f.n);
  if (st) out.push({ k: 'stack', ...stackSays(st, f.dp, a.unit, { packs: MISSING_PACKS, kg: MISSING_KG }) });
  const od = orderSays(f.order);
  if (od) out.push({ k: 'order', text: od, tone: 'a' });
  const d = densitySays(a, a.nominalMl !== undefined ? tneFor(a.nominalMl, 'ml') : undefined);
  if (d) out.push({ k: 'density', ...d });
  return out;
}

/** WHAT A PASS-OR-FAIL TEST WOULD PROVE, said while it is being agreed — a number that may fail:
 *  so the count is chosen for the claim it has to support. */
export function passFailPlan(count: number, allowFail = 0, conf = SURE): string {
  const n = Math.max(1, Math.round(count)), k = Math.max(0, Math.floor(allowFail));
  const bound = binomUpper(k, n, conf), pc = pctWord(conf);
  const head = k ? `If no more than ${big(k)} of ${big(n)} fail` : `If all ${big(n)} pass`;
  if (bound >= 0.995) return `${head}, it proves nothing yet about how few would fail.`;
  const more = bound > 0.01 ? ` To prove fewer than 1 in 100 takes ${big(itemsToShow(0.01, conf, k))}${k ? ` with ${big(k)} allowed to fail` : ' in a row, none failing'}.` : '';
  return `${head}, we can be ${pc} confident ${fewerThan(bound)} would fail.${more}`;
}

/** WHAT ANY WAY OF JUDGING WOULD MEAN, said while agreeing (part 1b): the plan in a sentence, or why
 *  it cannot be agreed — the count too small for a confidence level, with the count it would take. */
export function passFailPlanOf(a: Pick<AgreedReadings, 'count' | 'judge' | 'allowFail' | 'good' | 'conf'>): { text: string; problem: string } {
  const n = Math.max(1, Math.round(a.count)), j = judgeOf(a as AgreedReadings), conf = confOf(a as AgreedReadings), pc = pctWord(conf);
  if (j === 'count') return { text: passFailPlan(n, a.allowFail ?? 0, conf), problem: '' };
  const good = a.good ?? NaN;
  const bad = goodProblem(j, good);
  if (bad) return { text: '', problem: bad };
  const k = mayFailOf({ kind: 'ticks', ...a, count: n } as AgreedReadings, n);
  const p0 = (100 - good) / 100;
  if (j === 'loss') {
    const proves = goodWord(1 - binomUpper(k, n, conf));
    return { text: k
      ? `At least ${good}% good: up to ${big(k)} of ${big(n)} may fail. If ${big(k)} fail it still passes — and that proves, ${pc} confident, at least ${proves} would be good.`
      : `At least ${good}% good: with ${big(n)} checked, none may fail. If all pass, that proves, ${pc} confident, at least ${proves} would be good.`, problem: '' };
  }
  if (k < 0) return { text: '', problem: `With ${big(n)} checked, even none failing shows only ${goodWord(1 - binomUpper(0, n, conf))} good, ${pc} confident — check at least ${big(itemsToShow(p0, conf, 0))}.` };
  return { text: `${pc} confident at least ${good}% good: of ${big(n)} checked, ${k ? `up to ${big(k)} may fail` : 'none may fail'}.`, problem: '' };
}

/** The share good, for a loss allowed or a confidence level: a percentage above 0 and up to 100 —
 *  below 100 for a confidence level, which can never show every one good. */
export function goodProblem(judge: Judge, good: number): string {
  if (judge === 'count') return '';
  if (!Number.isFinite(good) || good <= 0 || good > 100) return 'At least what % good — a percentage above 0, up to 100.';
  if (judge === 'confidence' && good >= 100) return '100% good can never be shown by checking — choose below 100, or none may fail.';
  return '';
}

/** WHAT A PASS-OR-FAIL TEST AGREED, in words (part 1b): "pass or fail each, 20 — at most 1 may fail",
 *  "… 4,500 — at least 98% good (up to 90 may fail)", "… 4,500 — 95% confident at least 98% good (up to
 *  74 may fail)"; a number that may fail adds its confidence only when not 95%, so an older study reads
 *  as it did. */
export function ticksAgreedWords(a: AgreedReadings): string {
  const j = judgeOf(a), c = confOf(a), k = mayFailOf(a, a.count);
  const may = k > 0 ? `up to ${big(k)} may fail` : k === 0 ? 'none may fail' : 'it cannot be shown by that count';
  if (j === 'loss') return `pass or fail each, ${big(a.count)} — at least ${a.good}% good (${may})${c !== SURE ? ` · ${pctWord(c)} confident` : ''}`;
  if (j === 'confidence') return `pass or fail each, ${big(a.count)} — ${pctWord(c)} confident at least ${a.good}% good (${may})`;
  return `pass or fail each, ${a.count} — ${k ? `at most ${k} may fail` : 'none may fail'}${c !== SURE ? ` · ${pctWord(c)} confident` : ''}`;
}

/** Can this many be allowed to fail? A whole number, fewer than are checked. */
export function allowFailProblem(count: number, allowFail: number): string {
  if (!Number.isInteger(allowFail) || allowFail < 0) return 'How many may fail — a whole number, 0 or more.';
  if (count >= 1 && allowFail >= count) return `At most ${count - 1} of ${count} may fail.`;
  return '';
}

/** BEFORE CAPABILITY — the three checks in words, each with its tone: is it
 *  bell-shaped, is it steady, was it read finely enough. Before CHECK_FROM
 *  readings, one line saying when. Measured studies only. */
export function checksSay(f: SampleFigures, a: AgreedReadings | undefined): { k: 'shape' | 'steady' | 'fine' | 'wait'; text: string; tone: Tone }[] {
  if (!a || a.kind === 'ticks' || !f.n) return [];
  const c = f.checks;
  if (!c) return [{ k: 'wait', text: `Said from ${CHECK_FROM} readings — ${f.n} so far.`, tone: 'n' }];
  const out: { k: 'shape' | 'steady' | 'fine' | 'wait'; text: string; tone: Tone }[] = [];
  const p = (v: number) => (v < 0.001 ? 'p < 0.001' : `p ${v.toFixed(v < 0.1 ? 3 : 2)}`);
  if (c.shape) {
    /* which part of the test carried it: the lean (skewness) or the tails (kurtosis) */
    const sh = c.shape, leans = Math.abs(sh.zSkew) >= Math.abs(sh.zKurt);
    const how = leans ? `${sh.skew >= 0 ? 'they lean high' : 'they lean low'} (skew ${sh.skew.toFixed(1)}, ${p(sh.p)})`
      : `the tails are ${sh.zKurt > 0 ? 'heavier' : 'lighter'} than a bell’s (${p(sh.p)})`;
    out.push(sh.bell
      ? { k: 'shape', text: `Bell-shaped enough (D’Agostino–Pearson ${p(sh.p)}).`, tone: 'g' }
      : { k: 'shape', text: `Not bell-shaped — ${how}: the share outside is read from the readings, not the bell.`, tone: 'a' });
  }
  const st = c.steady;
  if (st.ok) out.push({ k: 'steady', text: 'Steady across the run.', tone: 'g' });
  else {
    const ldp = f.dp || 1, parts: string[] = [];
    if (st.beyond.length) {
      const nos = st.beyond.slice(0, 3).map(b => String(b.no));
      const list = st.beyond.length === 1 ? `reading ${nos[0]} is` : `readings ${nos.slice(0, -1).join(', ')}${st.beyond.length > 3 ? `, ${nos[nos.length - 1]} and ${st.beyond.length - 3} more` : ` and ${nos[nos.length - 1]}`} are`;
      parts.push(`${list} outside ${st.lcl.toFixed(ldp)}–${st.ucl.toFixed(ldp)}`);
    }
    if (st.run) parts.push(`${st.run.length} in a row sat ${st.run.side} the mean from no. ${st.run.fromNo}`);
    out.push({ k: 'steady', text: `Not steady — ${parts.join(' and ')}.`, tone: 'a' });
  }
  out.push(c.fine
    ? { k: 'fine', text: `Read finely enough — ${c.distinct} different values.`, tone: 'g' }
    : { k: 'fine', text: `Only ${c.distinct} different value${c.distinct === 1 ? ' was' : 's were'} read — the scale is too coarse to show the spread; the shape and the index are rough.`, tone: 'a' });
  return out;
}

/** Did the run drift — the readings' own spread well wider than pack to pack? */
export const drifts = (f: SampleFigures): boolean =>
  f.ppk !== undefined && f.cpk !== undefined && Number.isFinite(f.ppk) && Number.isFinite(f.cpk) && f.cpk - f.ppk >= DRIFT_GAP;

/** Would it keep passing all shift — the capability sentence, from 25
 *  readings: the verdict on Ppk, what was seen; Cpk beside it, pack to pack;
 *  and, when the two part, the run drifting said in words. */
export function capabilityWords(f: SampleFigures, a: AgreedReadings): { text: string; tone: Tone } | undefined {
  if (a.kind === 'ticks') return undefined;
  /* every reading the same: no spread to judge by — said, never silent
     (docs/UPGRADE-AUDIT.md M13) */
  if (f.ppk === undefined && f.sd === 0 && f.n >= CPK_FROM && (a.lower !== undefined || a.upper !== undefined))
    return { text: `Every reading the same — spread 0 from ${f.n}; capability cannot be worked out (is the instrument reading finely enough?).`, tone: 'n' };
  if (f.ppk === undefined || !Number.isFinite(f.ppk)) return undefined;
  if (f.n < CPK_FROM) return { text: `Too few for capability — from ${f.n}.`, tone: 'n' };
  const c = f.ppk.toFixed(2), from = `from ${f.n}`;
  /* Cpk in the words only when it says something Ppk does not: the run
     drifting. When the steady check found readings beyond its limits but no
     run, they part because of those readings, not a drift — the check names
     them, and "drifts" would mislead (22 October, the oxygen readings) */
  const spikesOnly = !!f.checks && !f.checks.steady.ok && !f.checks.steady.run;
  const within = drifts(f) && !spikesOnly && f.cpk !== undefined ? ` Pack to pack it is steadier — Cpk ${f.cpk.toFixed(2)}: it drifts across the run.` : '';
  /* how sure — and an index on readings that are not steady, or not
     bell-shaped, is never green (spc.normality-checks) */
  const sure = f.ppkLow !== undefined ? `95% sure at least ${f.ppkLow.toFixed(2)}` : '';
  const unsteady = !!f.checks && !f.checks.steady.ok, notBell = !!f.checks?.shape && !f.checks.shape.bell;
  const why = unsteady ? 'the readings were not steady, so it may not hold' : notBell ? 'the readings are not bell-shaped, so read the index as rough' : '';
  if (f.ppk >= CPK_CAPABLE) return { text: `Capable: Ppk ${c} ${from}${sure ? ` — ${sure}` : ''}${why ? ` — but ${why}` : ''}.${within}`, tone: why ? 'a' : 'g' };
  if (f.ppk >= CPK_JUST) return { text: `Just capable: Ppk ${c} ${from}${sure ? `, ${sure}` : ''} — watch it${why ? `: ${why}` : ''}.${within}`, tone: 'a' };
  /* the share is two-tailed: when the far tail carries a tenth or more of
     it, the words say both sides — "about 5 in 100 would be light or heavy",
     never the whole on the near side */
  const twoSided = f.shareOut !== undefined && f.shareOut > 0 && Math.min(f.shareLow ?? 0, f.shareHigh ?? 0) >= 0.1 * f.shareOut;
  const side = twoSided ? `${sideWord('low', a.unit)} or ${sideWord('high', a.unit)}` : f.ppkSide ? sideWord(f.ppkSide, a.unit) : 'outside';
  /* not bell-shaped: the bell's tail is not said — what was seen is */
  const share = notBell ? ` — as measured, ${f.outside.length} of ${f.n} ${f.outside.length === 1 ? 'is' : 'are'} outside`
    : f.shareOut !== undefined ? ` — ${inWords(f.shareOut)} would be ${side}` : ` — would drift ${side}`;
  return { text: `Not capable: Ppk ${c} ${from}${share}.${within}`, tone: 'a' };
}

/** Before → after on two studies of the same test: "the number moved", never
 *  "the fix did it". Enough on both sides, or "too early". */
export function compareSamples(before: SampleFigures, after: SampleFigures, a: AgreedReadings): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early to compare — both need their readings in.', tone: 'n' };
  const dp = after.dp, unit = u(a.unit);
  const parts: string[] = [];
  if (before.mean !== undefined && after.mean !== undefined) parts.push(`mean ${fix(before.mean, dp)} → ${fix(after.mean, dp)}${unit}`);
  if (before.outside.length !== after.outside.length) parts.push(`outside ${before.outside.length} → ${after.outside.length}`);
  const cb = before.n >= CPK_FROM ? before.ppk : undefined, ca = after.n >= CPK_FROM ? after.ppk : undefined;
  if (cb !== undefined && ca !== undefined) parts.push(`Ppk ${cb.toFixed(2)} → ${ca.toFixed(2)}`);
  const both = cb !== undefined && ca !== undefined;
  const now = !after.outside.length && (ca === undefined || !both || ca >= CPK_CAPABLE);
  const word = both && ca !== undefined ? (ca >= CPK_CAPABLE ? 'capable now' : ca >= CPK_JUST ? 'just capable now' : 'still not capable') : (after.outside.length ? 'still outside' : 'all within now');
  return { text: `${parts.join(' · ')} — ${word}. The number moved; what moved it is the fix's to say.`, tone: now ? 'g' : after.outside.length ? 'r' : 'a' };
}
