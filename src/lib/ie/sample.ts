/* A MEASURED TEST — readings in, Cpk out (docs/TOOLKIT.md, Part 4, tool 1;
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
 * negative error means, on 30 packs, none. */
import type { AgreedReadings, StudyReading } from '../study';

export type Tone = 'r' | 'a' | 'w' | 'g' | 'n';

export const CPK_CAPABLE = 1.33;
export const CPK_JUST = 1.0;
export const CPK_FROM = 25;

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
  cp?: number;
  cpk?: number;
  /** Which limit the capability is nearest. */
  cpkSide?: 'low' | 'high';
  /** The share that would fall outside at this mean and spread. */
  shareOut?: number;
  /** Readings more than 3 spreads from the mean of the others — flagged, not struck. */
  flagged: string[];
  /** Decimal places the readings were taken to — never more precision than the measurement. */
  dp: number;
  packers?: PackersFigures;
  ticks?: { ok: number; bad: { id: string; no: number }[] };
}

/** Kept readings in the order taken, numbered 1… as they stand in the list. */
const counted = (rs: StudyReading[]) => rs.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck);

const dpOf = (v: number) => { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(3, s.length - i - 1); };
const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[], m = meanOf(xs)) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)));

/** P(Z > z) for a standard normal — Numerical Recipes' erfc, good to 1e-7. */
export function upperTail(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806
    + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? erfc / 2 : 1 - erfc / 2;
}

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
    return { n: t.length, count, enough: count > 0 && t.length >= count, outside: [], flagged: [], dp: 0,
      ticks: { ok: t.filter(r => r.ok).length, bad: t.filter(r => !r.ok).map(r => ({ id: r.id, no: r.no })) } };
  }
  const vs = kept.filter((r): r is typeof r & { value: number } => typeof r.value === 'number' && Number.isFinite(r.value));
  const xs = vs.map(r => r.value);
  const dp = xs.reduce((d, x) => Math.max(d, dpOf(x)), 0);
  const f: SampleFigures = { n: xs.length, count, enough: count > 0 && xs.length >= count, outside: [], flagged: [], dp };
  if (!xs.length) return f;
  const m = meanOf(xs), s = sdOf(xs, m);
  Object.assign(f, { mean: m, sd: s, min: Math.min(...xs), max: Math.max(...xs) });

  /* Packers: the limit is the nominal less the TNE, said by the three rules. */
  let lower = agreed?.lower, upper = agreed?.upper;
  if (agreed?.kind === 'packers' && agreed.nominal !== undefined) {
    const tne = tneFor(agreed.nominal, agreed.unit);
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
    const lo = lower !== undefined ? (m - lower) / (3 * s) : Infinity;
    const hi = upper !== undefined ? (upper - m) / (3 * s) : Infinity;
    f.cpk = Math.min(lo, hi);
    f.cpkSide = lo <= hi ? 'low' : 'high';
    if (lower !== undefined && upper !== undefined) f.cp = (upper - lower) / (6 * s);
    f.shareOut = (lower !== undefined ? upperTail((m - lower) / s) : 0) + (upper !== undefined ? upperTail((upper - m) / s) : 0);
  }
  if (xs.length >= 5) {
    f.flagged = vs.filter((r, i) => {
      const others = xs.filter((_, j) => j !== i), om = meanOf(others), os = sdOf(others, om);
      return os > 0 && Math.abs(r.value - om) > 3 * os;
    }).map(r => r.id);
  }
  return f;
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
  if (!f.n) return { text: `Nothing measured yet — ${f.count} readings to take.`, tone: 'n', verdict: 'Not measured' };
  const of = `${f.n} of ${f.count} in`;

  if (a.kind === 'ticks' && f.ticks) {
    const { ok, bad } = f.ticks;
    if (bad.length) {
      const which = bad.slice(0, 3).map(b => `no. ${b.no}`).join(', ') + (bad.length > 3 ? ` and ${bad.length - 3} more` : '');
      return { text: `${ok} of ${f.n} ✓ — ${bad.length} ✗ (${which}) — Didn’t pass.`, tone: 'r', verdict: 'Didn’t pass' };
    }
    return f.enough ? { text: `${ok} of ${f.n} ✓ — Passed.`, tone: 'g', verdict: 'Passed' }
      : { text: `${of} — all ✓ so far.`, tone: 'a', verdict: of };
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

/** Would it keep passing all shift — the Cpk sentence, from 25 readings. */
export function capabilityWords(f: SampleFigures, a: AgreedReadings): { text: string; tone: Tone } | undefined {
  if (a.kind === 'ticks' || f.cpk === undefined || !Number.isFinite(f.cpk)) return undefined;
  if (f.n < CPK_FROM) return { text: `Too few for capability — from ${f.n}.`, tone: 'n' };
  const c = f.cpk.toFixed(2), from = `from ${f.n}`;
  if (f.cpk >= CPK_CAPABLE) return { text: `Capable: Cpk ${c} ${from}.`, tone: 'g' };
  if (f.cpk >= CPK_JUST) return { text: `Just capable: Cpk ${c} ${from} — watch it.`, tone: 'a' };
  const side = f.cpkSide ? sideWord(f.cpkSide, a.unit) : 'outside';
  const share = f.shareOut !== undefined ? ` — ${inWords(f.shareOut)} would be ${side}` : ` — would drift ${side}`;
  return { text: `Not capable: Cpk ${c} ${from}${share}.`, tone: 'a' };
}

/** Before → after on two studies of the same test: "the number moved", never
 *  "the fix did it". Enough on both sides, or "too early". */
export function compareSamples(before: SampleFigures, after: SampleFigures, a: AgreedReadings): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early to compare — both need their readings in.', tone: 'n' };
  const dp = after.dp, unit = u(a.unit);
  const parts: string[] = [];
  if (before.mean !== undefined && after.mean !== undefined) parts.push(`mean ${fix(before.mean, dp)} → ${fix(after.mean, dp)}${unit}`);
  if (before.outside.length !== after.outside.length) parts.push(`outside ${before.outside.length} → ${after.outside.length}`);
  const cb = before.n >= CPK_FROM ? before.cpk : undefined, ca = after.n >= CPK_FROM ? after.cpk : undefined;
  if (cb !== undefined && ca !== undefined) parts.push(`Cpk ${cb.toFixed(2)} → ${ca.toFixed(2)}`);
  const both = cb !== undefined && ca !== undefined;
  const now = !after.outside.length && (ca === undefined || !both || ca >= CPK_CAPABLE);
  const word = both && ca !== undefined ? (ca >= CPK_CAPABLE ? 'capable now' : ca >= CPK_JUST ? 'just capable now' : 'still not capable') : (after.outside.length ? 'still outside' : 'all within now');
  return { text: `${parts.join(' · ')} — ${word}. The number moved; what moved it is the fix's to say.`, tone: now ? 'g' : after.outside.length ? 'r' : 'a' };
}
