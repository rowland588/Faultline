/* THE CAPABILITY STUDY'S MODES — W1 (knowledge/specs/FC-094-capability.md parts
 * 2–4; docs/TOOLS-BUILD.md). Rowland, 22 October: "surely we can do a process
 * capability on rejection rate ... it has to run consistently for 75 packs per
 * minute for an X amount of time"; 24 October: build every planned tool.
 *
 * Three more answers to "What are you measuring?" on the one study record:
 *   rejects out of what was made   — the binomial, its exact bounds, the p-chart (FC-098, FC-088, FC-102)
 *   faults found on each item      — the Poisson, its bounds, the u-chart, the tally and its Pareto (FC-099, FC-089, FC-124, FC-125)
 *   held at a rate for a time      — per-interval rates against the side agreed (FC-083)
 * and two readings of a measurement: machine capability on consecutive parts
 * (FC-084) and the lowest legal fill of a sold-by-weight study (FC-157).
 * Every figure here is checked against scripts/knowledge/cases-w1.py
 * (SciPy) in __tests__/sample.test.ts; the words are the only words the
 * screen and the paper say. */
import type { AgreedReadings, StudyReading } from '../../lib/study';
import { binomUpper, binomLower, poissonUpper, poissonLower, pLimits, uLimits, laneySigmaZ, LANEY_BAND, processZ, cmCmk, fillTargets, individualsLimits, ppkLowerBound, normalQuantile, anovaOneWay } from '../../lib/ie/dist';

export type ModeTone = 'r' | 'a' | 'w' | 'g' | 'n';
export type Verdict = 'met' | 'notShown' | 'notMet' | 'none';
export type Held = 'held' | 'gaps' | 'not' | 'none';

/** From this many runs or inspections the pooled rate and its bounds are said; the chart from CHART_FROM. */
export const RUNS_FROM = 3;
export const CHART_FROM = 5;
/** The share of intervals that must be met for "held with gaps", in % — a choice of the specification. */
export const HELD_SHARE = 90;
/** Machine capability's agreed Cmk for acceptance, when none is typed — the usual 1.67, said as the OEM's. */
export const CMK_AGREED = 1.67;
/** Intervals before the one-sided Ppk on the rates is said (as a measurement's CPK_FROM). */
export const RATE_PPK_FROM = 25;

const big = (n: number): string => n.toLocaleString('en-GB');
const pct = (p: number, dp = 2): string => `${(p * 100).toFixed(dp)}%`;
/** A share in the floor's words: per 100 when it is a whole-ish number, else per 1,000 or per million. */
export const shareWords = (p: number): string => {
  if (!(p > 0)) return '0%';
  if (p >= 0.01) { const h = p * 100; return `${Math.abs(h - Math.round(h)) < 1e-9 ? h.toFixed(0) : h.toFixed(1)}%`; }
  if (p >= 0.001) return `${(p * 1000).toFixed(1)} in 1,000`;
  return `${Math.round(p * 1e6).toLocaleString('en-GB')} per million`;
};
const counted = <T extends StudyReading>(rs: T[]) => rs.map((r, i) => ({ ...r, no: i + 1 })).filter(r => !r.struck);
const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs: number[], m = meanOf(xs)) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)));

/* ================================ REJECTS ================================= */
export interface RunRow { id: string; no: number; made: number; rejected: number; p: number; lcl: number; ucl: number; out: boolean }
export interface RunsFigures {
  runs: RunRow[];
  made: number; rejected: number;
  /** The pooled rate and its exact two-sided 95% bounds; `upper` the one-sided 95% bound the verdict reads. */
  p: number; lo: number; hi: number; upper: number; perMillion: number;
  /** The equivalent Z, Ppk and sigma level — a comparison only. */
  z?: { z: number; ppkEq: number; sigma: number };
  /** Laney's σz, and whether the limits were widened by it (outside LANEY_BAND). */
  sigmaZ?: number; laney: boolean;
  /** The maximum agreed as a fraction, and the verdict against it by the upper bound and the chart. */
  max?: number; verdict: Verdict;
  /** About how many more at this rate before the bound would fall under the maximum — when not shown yet. */
  moreToShow?: number;
}

export function runsFigures(a: AgreedReadings, readings: StudyReading[]): RunsFigures | undefined {
  if (a.kind !== 'rejects') return undefined;
  const rows = counted(readings).filter(r => typeof r.made === 'number' && r.made > 0 && typeof r.rejected === 'number' && r.rejected >= 0);
  const made = rows.reduce((s, r) => s + (r.made as number), 0), rejected = rows.reduce((s, r) => s + Math.min(r.rejected as number, r.made as number), 0);
  const max = a.maxShare !== undefined && a.maxShare > 0 ? a.maxShare / 100 : undefined;
  if (!made) return { runs: [], made: 0, rejected: 0, p: 0, lo: 0, hi: 0, upper: 0, perMillion: 0, laney: false, max, verdict: 'none' };
  const p = rejected / made;
  const lo = rejected ? binomLower(rejected, made, 0.975) : 0, hi = binomUpper(rejected, made, 0.975), upper = binomUpper(rejected, made, 0.95);
  const rates = rows.map(r => (r.rejected as number) / (r.made as number)), sizes = rows.map(r => r.made as number);
  const sigmaZ = rows.length >= CHART_FROM ? laneySigmaZ(rates, sizes, p, 'p') : undefined;
  const laney = sigmaZ !== undefined && (sigmaZ < LANEY_BAND[0] || sigmaZ > LANEY_BAND[1]);
  const runs: RunRow[] = rows.map((r, i) => {
    const l = pLimits(p, sizes[i]);
    const widen = laney && sigmaZ !== undefined ? sigmaZ : 1;
    const s = Math.sqrt(Math.max(0, p * (1 - p)) / sizes[i]) * widen;
    const lcl = laney ? Math.max(0, p - 3 * s) : l.lcl, ucl = laney ? Math.min(1, p + 3 * s) : l.ucl;
    return { id: r.id, no: r.no, made: r.made as number, rejected: r.rejected as number, p: rates[i], lcl, ucl, out: rows.length >= CHART_FROM && (rates[i] > ucl + 1e-12 || rates[i] < lcl - 1e-12) };
  });
  const anyOut = runs.some(r => r.out);
  let verdict: Verdict = 'none', moreToShow: number | undefined;
  if (max !== undefined && rows.length >= RUNS_FROM) {
    if (p > max) verdict = 'notMet';
    else if (upper <= max && !anyOut) verdict = 'met';
    else {
      verdict = 'notShown';
      /* at this rate, the one-sided bound falls with the count: p + 1.645√(p(1−p)/N) ≤ max → N */
      if (p < max && p > 0) { const need = Math.ceil((normalQuantile(0.95) ** 2) * p * (1 - p) / (max - p) ** 2); moreToShow = Math.max(0, need - made); }
    }
  }
  return { runs, made, rejected, p, lo, hi, upper, perMillion: p * 1e6, z: processZ(p), sigmaZ, laney, max, verdict, ...(moreToShow !== undefined ? { moreToShow } : {}) };
}

/* ================================= FAULTS ================================= */
export interface InspRow { id: string; no: number; inspected: number; faults: number; u: number; lcl: number; ucl: number; out: boolean }
export interface TallyRow { kind: string; count: number; share: number; cum: number; gbp?: number }
export interface FaultsFigures {
  insp: InspRow[];
  items: number; faults: number;
  dpu: number; lo: number; hi: number; upper: number;
  /** The share of items carrying at least one fault, 1 − e^(−DPU). */
  shareAny: number;
  sigmaZ?: number; laney: boolean;
  /** Every inspection the same size — the c-chart's case. */
  equal: boolean;
  tally: TallyRow[];
  dpmo?: { dpmo: number; opportunities: number; z?: { z: number; ppkEq: number; sigma: number } };
  max?: number; verdict: Verdict;
}
export const OTHER = 'Other';

export function faultsFigures(a: AgreedReadings, readings: StudyReading[]): FaultsFigures | undefined {
  if (a.kind !== 'faults') return undefined;
  const rows = counted(readings).filter(r => typeof r.inspected === 'number' && r.inspected > 0 && typeof r.faults === 'number' && r.faults >= 0);
  const items = rows.reduce((s, r) => s + (r.inspected as number), 0), faults = rows.reduce((s, r) => s + (r.faults as number), 0);
  const max = a.maxShare !== undefined && a.maxShare > 0 ? a.maxShare / 100 : undefined;
  /* the tally by kind — the study's kinds first in their order, then any typed, Other last */
  const counts = new Map<string, number>();
  for (const k of a.faultKinds ?? []) counts.set(k, 0);
  for (const r of rows) for (const [k, c] of Object.entries(r.kinds ?? {})) counts.set(k, (counts.get(k) ?? 0) + Math.max(0, c));
  const tallied = [...counts.values()].reduce((s, c) => s + c, 0);
  if (faults > tallied) counts.set(OTHER, (counts.get(OTHER) ?? 0) + (faults - tallied));
  const sorted = [...counts.entries()].filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1] || (x[0] === OTHER ? 1 : y[0] === OTHER ? -1 : 0));
  let cum = 0;
  const tally: TallyRow[] = sorted.map(([kind, count]) => { cum += count; return { kind, count, share: faults ? count / faults : 0, cum: faults ? cum / faults : 0 }; });
  if (!items) return { insp: [], items: 0, faults: 0, dpu: 0, lo: 0, hi: 0, upper: 0, shareAny: 0, laney: false, equal: true, tally, max, verdict: 'none' };
  const dpu = faults / items;
  const lo = poissonLower(faults, items, 0.975), hi = poissonUpper(faults, items, 0.975), upper = poissonUpper(faults, items, 0.95);
  const rates = rows.map(r => (r.faults as number) / (r.inspected as number)), sizes = rows.map(r => r.inspected as number);
  const sigmaZ = rows.length >= CHART_FROM ? laneySigmaZ(rates, sizes, dpu, 'u') : undefined;
  const laney = sigmaZ !== undefined && (sigmaZ < LANEY_BAND[0] || sigmaZ > LANEY_BAND[1]);
  const insp: InspRow[] = rows.map((r, i) => {
    const l = uLimits(dpu, sizes[i]);
    const s = Math.sqrt(Math.max(0, dpu) / sizes[i]) * (laney && sigmaZ !== undefined ? sigmaZ : 1);
    const lcl = laney ? Math.max(0, dpu - 3 * s) : l.lcl, ucl = laney ? dpu + 3 * s : l.ucl;
    return { id: r.id, no: r.no, inspected: sizes[i], faults: r.faults as number, u: rates[i], lcl, ucl, out: rows.length >= CHART_FROM && (rates[i] > ucl + 1e-12 || rates[i] < lcl - 1e-12) };
  });
  const anyOut = insp.some(r => r.out);
  let verdict: Verdict = 'none';
  if (max !== undefined && rows.length >= RUNS_FROM) verdict = dpu > max ? 'notMet' : upper <= max && !anyOut ? 'met' : 'notShown';
  const k = a.opportunities;
  const dpmo = k !== undefined && k > 0 ? { dpmo: 1e6 * faults / (items * k), opportunities: k, z: processZ(faults / (items * k)) } : undefined;
  return { insp, items, faults, dpu, lo, hi, upper, shareAny: 1 - Math.exp(-dpu), sigmaZ, laney, equal: new Set(sizes).size === 1, tally, ...(dpmo ? { dpmo } : {}), max, verdict };
}

/* ================================== RATE ================================== */
export interface IntervalRow { id: string; no: number; packs: number; rate: number; met: boolean }
export interface RateFigures {
  intervals: IntervalRow[];
  side: 'least' | 'most'; limit: number; intervalMin: number;
  met: number; share: number;
  /** The longest run of consecutive met intervals, in minutes. */
  stretchMin: number;
  made: number; expected: number; ratio: number;
  mean: number; sd: number;
  /** The one-sided Ppk on the interval rates against the limit, from RATE_PPK_FROM, with Bissell's bound. */
  ppk?: number; ppkLow?: number;
  /** Intervals beyond the individuals limits on the rates — a stop or a surge worth naming. */
  beyond: number[];
  heldShare: number; held: Held;
}

export function rateFigures(a: AgreedReadings, readings: StudyReading[]): RateFigures | undefined {
  if (a.kind !== 'rate') return undefined;
  const side: 'least' | 'most' = a.upper !== undefined && a.lower === undefined ? 'most' : 'least';
  const limit = side === 'least' ? (a.lower ?? 0) : (a.upper ?? 0);
  const intervalMin = a.intervalMin !== undefined && a.intervalMin > 0 ? a.intervalMin : 1;
  const heldShare = a.heldShare !== undefined && a.heldShare > 0 && a.heldShare <= 100 ? a.heldShare : HELD_SHARE;
  const rows = counted(readings).filter(r => typeof r.value === 'number' && Number.isFinite(r.value) && (r.value as number) >= 0);
  const intervals: IntervalRow[] = rows.map(r => {
    const rate = (r.value as number) / intervalMin;
    return { id: r.id, no: r.no, packs: r.value as number, rate, met: side === 'least' ? rate >= limit - 1e-9 : rate <= limit + 1e-9 };
  });
  const n = intervals.length;
  if (!n) return { intervals, side, limit, intervalMin, met: 0, share: 0, stretchMin: 0, made: 0, expected: 0, ratio: 0, mean: 0, sd: 0, beyond: [], heldShare, held: 'none' };
  const met = intervals.filter(i => i.met).length;
  let best = 0, run = 0;
  for (const i of intervals) { run = i.met ? run + 1 : 0; best = Math.max(best, run); }
  const made = intervals.reduce((s, i) => s + i.packs, 0), expected = limit * intervalMin * n;
  const rates = intervals.map(i => i.rate), mean = meanOf(rates), sd = sdOf(rates, mean);
  const lim = individualsLimits(rates);
  const beyond = lim ? intervals.filter(i => i.rate > lim.ucl + 1e-9 || i.rate < lim.lcl - 1e-9).map(i => i.no) : [];
  let ppk: number | undefined, ppkLow: number | undefined;
  if (n >= RATE_PPK_FROM && sd > 0) { ppk = (side === 'least' ? mean - limit : limit - mean) / (3 * sd); ppkLow = ppkLowerBound(ppk, n); }
  const enough = a.count > 0 && n >= a.count;
  const meanMeets = side === 'least' ? mean >= limit - 1e-9 : mean <= limit + 1e-9;
  const held: Held = !enough ? 'none' : met === n ? 'held' : (met / n) * 100 >= heldShare && meanMeets ? 'gaps' : 'not';
  return { intervals, side, limit, intervalMin, met, share: met / n, stretchMin: best * intervalMin, made, expected, ratio: expected ? made / expected : 0, mean, sd, ...(ppk !== undefined ? { ppk } : {}), ...(ppkLow !== undefined ? { ppkLow } : {}), beyond, heldShare, held };
}

/* ========================= MACHINE AND THE LOWEST FILL ===================== */
export interface MachineFigures { cm?: number; cmk?: number; agreed: number; accepted?: boolean; n: number }
/** Cm/Cmk on a measurement marked as one machine's consecutive parts (FC-084), against the Cmk agreed. */
export function machineFigures(a: AgreedReadings, mean: number | undefined, sd: number | undefined, n: number, lower?: number, upper?: number): MachineFigures | undefined {
  if (a.kind !== 'limits' || a.question !== 'machine' || mean === undefined || sd === undefined) return undefined;
  const agreed = a.cmkAgreed !== undefined && a.cmkAgreed > 0 ? a.cmkAgreed : CMK_AGREED;
  const r = cmCmk(mean, sd, lower, upper);
  return { ...r, agreed, n, ...(r.cmk !== undefined && n >= RATE_PPK_FROM ? { accepted: r.cmk >= agreed } : {}) };
}

export interface FillFigures { rule1: number; rule2: number; rule3: number; lowest: number; binds: 1 | 2 | 3; giveaway: number; gbpPer100?: number }
/** The lowest legal fill (FC-157) on a sold-by-weight study: the target the three rules need at this
 *  spread, and what the present mean gives away above it — in money by the £/kg typed (FC-156). */
export function fillFigures(a: AgreedReadings, mean: number | undefined, sd: number | undefined, n: number, tne: number | undefined): FillFigures | undefined {
  if (a.kind !== 'packers' || a.nominal === undefined || mean === undefined || sd === undefined || tne === undefined || n < RATE_PPK_FROM || !(sd > 0)) return undefined;
  const t = fillTargets(a.nominal, sd, tne);
  const giveaway = mean - t.lowest;
  const kg = a.unit === 'kg' ? 1 : a.unit === 'g' ? 0.001 : undefined;
  const gbpPer100 = kg !== undefined && a.costPerKg !== undefined && giveaway > 0 ? giveaway * kg * a.costPerKg * 100 : undefined;
  return { ...t, giveaway, ...(gbpPer100 !== undefined ? { gbpPer100 } : {}) };
}

/* ================================= WORDS ================================= */
export interface ModeSays { text: string; tone: ModeTone; verdict: string; capability?: { text: string; tone: ModeTone } }

const verdictWord = (v: Verdict, enough: boolean, of: string): { word: string; tone: ModeTone } =>
  v === 'met' ? { word: 'Met', tone: 'g' } : v === 'notMet' ? { word: 'Not met', tone: 'r' } : v === 'notShown' ? { word: enough ? 'Not shown yet' : of, tone: 'a' } : { word: of, tone: 'a' };

/** REJECTS OUT OF WHAT WAS MADE — the first sentence and the second (the chart, Laney, the comparison). */
export function runsSays(r: RunsFigures, count: number): ModeSays {
  const n = r.runs.length, of = `${n} of ${count} runs`;
  if (!n) return { text: `Nothing counted yet — ${count} runs to record, each what was made and what was rejected.`, tone: 'n', verdict: 'Not counted' };
  const enough = n >= count;
  const head = `${big(r.rejected)} rejected of ${big(r.made)} made — ${pct(r.p)} (${big(Math.round(r.perMillion))} per million)`;
  if (n < RUNS_FROM) return { text: `${head}; the bounds are said from ${RUNS_FROM} runs — ${n} so far.`, tone: 'a', verdict: of };
  const bounds = `95% confident between ${pct(r.lo)} and ${pct(r.hi)}`;
  const v = verdictWord(r.verdict, enough, of);
  const agreed = r.max !== undefined ? `; at most ${shareWords(r.max)} agreed` : '';
  const why = r.verdict === 'notMet' ? `: ${pct(r.p)} is above it`
    : r.verdict === 'notShown' ? (r.runs.some(x => x.out) ? ': a run is outside the chart’s limits — one process it is not' : `: the bound is ${pct(r.upper)}${r.moreToShow ? ` — about ${big(Math.ceil(r.moreToShow / 1000) * 1000)} more at this rate` : ''}`)
    : '';
  const text = `${head}, ${bounds}${agreed} — ${v.word}${why}.`;
  const outs = r.runs.filter(x => x.out);
  const chart = outs.length ? `Run ${outs.map(x => `${x.no} (${big(x.rejected)} of ${big(x.made)})`).join(', ')} ${outs.length === 1 ? 'is' : 'are'} outside the chart’s limits — one process it is not; find what ${outs.length === 1 ? 'that run' : 'those runs'} did.`
    : n >= CHART_FROM ? 'Every run inside the chart’s limits — one process, run to run.' : `The chart is drawn from ${CHART_FROM} runs — ${n} so far.`;
  const laney = r.laney && r.sigmaZ !== undefined ? ` Runs this large vary more than the count alone says (σz ${r.sigmaZ.toFixed(1)}): Laney’s limits are drawn.` : '';
  const cmp = r.z ? ` Compared with a measurement: Z ${r.z.z.toFixed(2)}, about Ppk ${r.z.ppkEq.toFixed(2)} (a comparison only).` : '';
  return { text, tone: v.tone, verdict: v.word, capability: { text: `${chart}${laney}${cmp}`, tone: outs.length ? 'a' : 'n' } };
}

/** FAULTS FOUND ON EACH ITEM — the rate, its bounds, the share with a fault, the verdict; then the
 *  tally's Pareto line and DPMO when the opportunities are typed. */
export function faultsSays(f: FaultsFigures, count: number): ModeSays {
  const n = f.insp.length, of = `${n} of ${count} inspections`;
  if (!n) return { text: `Nothing inspected yet — ${count} inspections to record, each the items looked at and the faults found by kind.`, tone: 'n', verdict: 'Not counted' };
  const enough = n >= count;
  const per100 = `${(f.dpu * 100).toFixed(1)} per 100`;
  const head = `${big(f.faults)} faults on ${big(f.items)} items — ${f.dpu.toFixed(3)} an item (${per100})`;
  if (n < RUNS_FROM) return { text: `${head}; the bounds are said from ${RUNS_FROM} inspections — ${n} so far.`, tone: 'a', verdict: of };
  const v = verdictWord(f.verdict, enough, of);
  const agreed = f.max !== undefined ? `; at most ${(f.max * 100).toFixed(f.max * 100 % 1 ? 1 : 0)} per 100 agreed` : '';
  const why = f.verdict === 'notMet' ? `: ${per100} is above it` : f.verdict === 'notShown' ? (f.insp.some(x => x.out) ? ': an inspection is outside the chart’s limits' : `: the bound is ${(f.upper * 100).toFixed(1)} per 100`) : '';
  const text = `${head}, 95% confident ${f.lo.toFixed(3)}–${f.hi.toFixed(3)}; about ${pct(f.shareAny, 1)} of items carry a fault${agreed} — ${v.word}${why}.`;
  const top = f.tally.slice(0, 2);
  const pareto = top.length >= 2 && f.faults
    ? `${top[0].kind} and ${top[1].kind.toLowerCase()} are ${Math.round(top[1].cum * 100)}% of the faults${top.every(t => t.gbp !== undefined) && f.tally.every(t => t.gbp !== undefined) ? ` — and ${Math.round(100 * ((top[0].gbp ?? 0) + (top[1].gbp ?? 0)) / f.tally.reduce((s, t) => s + (t.gbp ?? 0), 0))}% of the money` : ''}.`
    : top.length === 1 ? `Every fault so far is ${top[0].kind.toLowerCase()}.` : '';
  const dpmo = f.dpmo ? ` ${big(Math.round(f.dpmo.dpmo))} per million opportunities (${f.dpmo.opportunities} an item)${f.dpmo.z ? ` — Z ${f.dpmo.z.z.toFixed(1)}, a ${f.dpmo.z.sigma.toFixed(1)}-sigma process by the 1.5-shift convention` : ''}.` : '';
  const outs = f.insp.filter(x => x.out);
  const chart = outs.length ? ` Inspection ${outs.map(x => x.no).join(', ')} ${outs.length === 1 ? 'is' : 'are'} outside the u-chart’s limits.` : '';
  const laney = f.laney && f.sigmaZ !== undefined ? ` Inspections this large vary more than the count alone says (σz ${f.sigmaZ.toFixed(1)}): Laney’s limits are drawn.` : '';
  return { text, tone: v.tone, verdict: v.word, capability: { text: `${pareto}${dpmo}${chart}${laney}`.trim(), tone: outs.length ? 'a' : 'n' } };
}

/** HELD AT A RATE FOR A TIME — met, the stretch, made against expected, the verdict; then the Ppk on
 *  the rates and any stop or surge the individuals limits found. */
export function rateSays(r: RateFigures, count: number, unit?: string): ModeSays {
  const n = r.intervals.length, u = unit ? ` ${unit}` : '';
  const what = `${r.side === 'least' ? 'At least' : 'At most'} ${r.limit}${u} a minute for ${count * r.intervalMin} minutes`;
  if (!n) return { text: `${what}: nothing counted yet — ${count} intervals of ${r.intervalMin} to count.`, tone: 'n', verdict: 'Not counted' };
  const of = `${n} of ${count} intervals`;
  const body = `met ${n === r.met ? 'every one of' : `${r.met} of`} ${n} (${Math.round(r.share * 100)}%), the longest stretch ${r.stretchMin} minute${r.stretchMin === 1 ? '' : 's'}, ${big(r.made)} made against ${big(Math.round(r.expected))}`;
  const v = r.held === 'held' ? { word: 'Held', tone: 'g' as ModeTone } : r.held === 'gaps' ? { word: 'Held with gaps', tone: 'a' as ModeTone } : r.held === 'not' ? { word: 'Not held', tone: 'r' as ModeTone } : { word: of, tone: 'a' as ModeTone };
  const why = r.held === 'not' ? `: ${r.met < n && (r.met / n) * 100 < r.heldShare ? `only ${Math.round(r.share * 100)}% met, under the ${r.heldShare}% agreed` : `the line averaged ${r.mean.toFixed(1)}${u} a minute`}` : '';
  const misses = r.intervals.filter(i => !i.met);
  const dip = misses.length && misses.length <= 4 ? `; ${r.side === 'least' ? 'a dip' : 'a surge'} to ${misses.map(i => Math.round(i.rate * 10) / 10).join(', ')} at minute${misses.length === 1 ? '' : 's'} ${misses.map(i => i.no).join(', ')}` : misses.length ? `; ${misses.length} intervals missed` : '';
  const text = `${what}: ${body} — ${v.word}${why}${dip}.`;
  const ppk = r.ppk !== undefined ? `One-sided Ppk on the rates ${r.ppk.toFixed(2)}${r.ppkLow !== undefined ? ` (95% sure at least ${r.ppkLow.toFixed(2)})` : ''} — ${r.ppk >= 1 ? 'the limit sits three spreads from the mean rate' : 'holding it is not capable: the mean rate sits close to the limit'}.` : `Ppk on the rates is said from ${RATE_PPK_FROM} intervals — ${n} so far.`;
  const beyond = r.beyond.length ? ` Minute${r.beyond.length === 1 ? '' : 's'} ${r.beyond.join(', ')} beyond the chart’s limits — a stop or a surge worth naming.` : '';
  return { text, tone: v.tone, verdict: v.word, capability: { text: `${ppk}${beyond}`, tone: r.ppk !== undefined && r.ppk < 1 ? 'a' : 'n' } };
}

/** MACHINE CAPABILITY — one sentence beside the measurement's. */
export function machineSays(m: MachineFigures): { text: string; tone: ModeTone } {
  if (m.cmk === undefined) return { text: 'Machine capability needs a limit and a spread.', tone: 'n' };
  const cm = m.cm !== undefined ? `Cm ${m.cm.toFixed(2)}, ` : '';
  if (m.n < RATE_PPK_FROM) return { text: `${cm}Cmk ${m.cmk.toFixed(2)} on ${m.n} consecutive parts — said from ${RATE_PPK_FROM}; the usual acceptance is 50.`, tone: 'n' };
  const need = m.cmk > 0 ? m.agreed / m.cmk : undefined;
  return m.accepted
    ? { text: `${cm}Cmk ${m.cmk.toFixed(2)} on ${m.n} consecutive parts against ${m.agreed} agreed — Accepted.`, tone: 'g' }
    : { text: `${cm}Cmk ${m.cmk.toFixed(2)} on ${m.n} consecutive parts against ${m.agreed} agreed — Not accepted${need !== undefined && need > 1 ? `; the spread would need to fall to ${Math.round(100 / need)}% of what it is` : ''}.`, tone: 'r' };
}

/** THE LOWEST LEGAL FILL — one sentence under a sold-by-weight study's figures. */
export function fillSays(f: FillFigures, mean: number, dp: number, unit?: string): { text: string; tone: ModeTone } {
  const u = unit ? ` ${unit}` : '';
  const binds = f.binds === 1 ? 'the average rule binds' : f.binds === 2 ? 'the 1-in-40 rule binds' : 'the none-below-twice rule binds';
  const money = f.gbpPer100 !== undefined ? ` — £${f.gbpPer100.toFixed(2)} a 100 packs` : '';
  if (f.giveaway <= 0) return { text: `At this spread the lowest target that keeps the three rules is ${f.lowest.toFixed(dp)}${u} (${binds}); the mean of ${mean.toFixed(dp)} is not above it.`, tone: 'g' };
  return { text: `At this spread the lowest target that keeps the three rules is ${f.lowest.toFixed(dp)}${u} (${binds}); the mean of ${mean.toFixed(dp)} gives ${f.giveaway.toFixed(dp)}${u} a pack away${money}.`, tone: 'a' };
}

/** THE AGREED WORDS for the three new kinds. */
export function modeAgreedWords(a: AgreedReadings): string | undefined {
  if (a.kind === 'rejects') return `rejects out of what was made, ${a.count} runs${a.maxShare !== undefined ? ` — at most ${a.maxShare}% rejected` : ''}`;
  if (a.kind === 'faults') return `faults found on each item, ${a.count} inspections${a.maxShare !== undefined ? ` — at most ${a.maxShare} per 100 items` : ''}${a.opportunities ? ` · ${a.opportunities} opportunities an item` : ''}`;
  if (a.kind === 'rate') {
    const side = a.upper !== undefined && a.lower === undefined ? `at most ${a.upper}` : `at least ${a.lower}`;
    const iv = a.intervalMin !== undefined && a.intervalMin > 0 ? a.intervalMin : 1;
    return `${side}${a.unit ? ` ${a.unit}` : ''} a minute for ${a.count * iv} minutes (${a.count} intervals of ${iv})`;
  }
  return undefined;
}

/** Can this agreement be saved? The problems a mode's inputs can have, in the floor's words. */
export function modeProblem(a: Pick<AgreedReadings, 'kind' | 'count' | 'maxShare' | 'opportunities' | 'intervalMin' | 'heldShare' | 'lower' | 'upper'>): string {
  if (a.kind === 'rejects' || a.kind === 'faults') {
    if (!(a.count >= 1)) return a.kind === 'rejects' ? 'How many runs — at least 1.' : 'How many inspections — at least 1.';
    if (a.maxShare !== undefined && !(a.maxShare > 0 && a.maxShare < 100)) return a.kind === 'rejects' ? 'At most what % rejected — above 0, below 100.' : 'At most how many faults per 100 items — above 0.';
    if (a.opportunities !== undefined && !(Number.isInteger(a.opportunities) && a.opportunities >= 1)) return 'Opportunities an item — a whole number, 1 or more.';
    return '';
  }
  if (a.kind === 'rate') {
    if (!(a.count >= 1)) return 'How many intervals — at least 1.';
    if (a.lower === undefined && a.upper === undefined) return 'The rate — at least or at most what, a minute?';
    if (a.intervalMin !== undefined && !(a.intervalMin > 0)) return 'Minutes in an interval — above 0.';
    if (a.heldShare !== undefined && !(a.heldShare > 0 && a.heldShare <= 100)) return 'Held with gaps from what % of intervals — above 0, up to 100.';
    return '';
  }
  return '';
}

/* ================= PART 4 — THE QUESTIONS THAT ARE A MEASUREMENT WITH A LIMIT ================= */

/** Residual oxygen (FC-167), a seal's strength (FC-165), a CCP's limit (FC-169): the measurement's
 *  worst reading against its limit, the margin, how many break it — and for a CCP the probe's bias at
 *  the limit as a guard band (`foodsafety.ccp-monitoring`: a probe reading +0.14 high at 75 means a
 *  check reads 75.14 to be sure of 75). */
export interface QuestionFigures {
  q: 'oxygen' | 'seal' | 'ccp';
  side: 'least' | 'most';
  limit: number;
  /** the reading nearest or furthest over the limit — the lowest for "at least", the highest for "at most" */
  worst: number;
  /** how far the worst reading sits on the right side of the limit (negative when it breaks it) */
  margin: number;
  /** readings breaking the limit as read */
  over: number;
  n: number;
  /** CCP: the probe's bias at the limit (reads high when positive), the true margin after it, the check a reading must
   *  show to be sure of the limit, and how many readings sit inside that guard band — inside the limit as read, over it in truth */
  bias?: number;
  trueMargin?: number;
  mustRead?: number;
  guard?: number;
}
export function questionFigures(a: AgreedReadings, xs: number[], lower?: number, upper?: number): QuestionFigures | undefined {
  if (a.kind !== 'limits' || !xs.length || (a.question !== 'oxygen' && a.question !== 'seal' && a.question !== 'ccp')) return undefined;
  const side: 'least' | 'most' = a.question === 'oxygen' ? 'most' : a.question === 'seal' ? 'least' : upper !== undefined && lower === undefined ? 'most' : 'least';
  const limit = side === 'least' ? lower : upper;
  if (limit === undefined) return undefined;
  const worst = side === 'least' ? Math.min(...xs) : Math.max(...xs);
  const meets = (x: number) => (side === 'least' ? x >= limit - 1e-9 : x <= limit + 1e-9);
  const f: QuestionFigures = { q: a.question, side, limit, worst, margin: side === 'least' ? worst - limit : limit - worst, over: xs.filter(x => !meets(x)).length, n: xs.length };
  if (a.question === 'ccp' && a.probeBias !== undefined && a.probeBias !== 0) {
    const b = a.probeBias;                                   // the probe reads high by b (a true value x reads x + b)
    f.bias = b;
    f.trueMargin = side === 'least' ? f.margin - b : f.margin + b;
    f.mustRead = side === 'least' ? limit + b : limit + b;   // the reading that is truly on the limit
    f.guard = xs.filter(x => meets(x) && !meets(x - b)).length;
  }
  return f;
}
const fx = (v: number, dp: number): string => v.toFixed(dp);
export function questionSays(f: QuestionFigures, dp: number, unit?: string, source?: string): { text: string; tone: ModeTone } {
  const u = unit ? ` ${unit}` : '', src = source?.trim() ? ` (${source.trim()})` : '';
  const lim = `${f.side === 'least' ? 'at least' : 'at most'} ${fx(f.limit, dp)}${u}${src}`;
  if (f.q === 'oxygen') {
    const over = f.over ? `${f.over} of ${f.n} over it` : `all ${f.n} under it`;
    return { text: `Residual oxygen: the highest pack ${fx(f.worst, dp)}${u} against ${lim} — ${over}. The set leans high by design, so the share outside is read as measured, never from a bell; a high pack goes to the leak test.`, tone: f.over ? 'r' : 'n' };
  }
  if (f.q === 'seal') {
    const over = f.over ? `${f.over} of ${f.n} under it` : `a margin of ${fx(f.margin, dp)}${u} at the weakest`;
    return { text: `Seal strength: the weakest ${fx(f.worst, dp)}${u} against ${lim} — ${over}. Leaks are counted pass or fail in a study of their own: none leaking in n packs shows at most about 3 ÷ n, 95% confident.`, tone: f.over ? 'r' : 'n' };
  }
  const where = f.side === 'least' ? 'above' : 'below';
  const margin = f.over ? `${f.over} deviation${f.over === 1 ? '' : 's'} — the product since the last good check is held` : `the ${f.side === 'least' ? 'lowest' : 'highest'} reading ${fx(f.worst, dp)}${u} sits ${fx(f.margin, dp)}${u} ${where} it`;
  const probe = f.bias !== undefined && f.trueMargin !== undefined && f.mustRead !== undefined
    ? ` With the probe reading ${f.bias > 0 ? '+' : ''}${fx(f.bias, dp)}${u} at the limit, a check must read ${fx(f.mustRead, dp)}${u} to be sure of ${fx(f.limit, dp)}${u}${f.over ? '' : `; the true margin is ${fx(f.trueMargin, dp)}${u}`}${f.guard ? ` — ${f.guard} reading${f.guard === 1 ? ' sits' : 's sit'} inside that guard band, not shown safe` : ''}.`
    : '';
  /* red for a deviation as read, or one in truth once the probe's bias is taken off (a reading inside the guard
     band is one) — the method has no amber: a CCP is met or it is not */
  const tone: ModeTone = f.over || (f.trueMargin !== undefined && f.trueMargin < 0) || f.guard ? 'r' : 'n';
  return { text: `CCP: the critical limit is ${lim}; ${margin}.${probe}`, tone };
}

/** A WEIGHER'S HEADS (FC-158, `yield.multihead-weigher`): the readings by head, the head furthest
 *  from the others and the one-way ANOVA across heads that says whether the heads differ. */
export interface WeigherFigures {
  heads: { head: number; n: number; mean: number; sd: number }[];
  /** readings with no head said */
  noHead: number;
  /** the head whose mean sits furthest from the mean of the other heads, and by how much (signed) */
  far?: { head: number; diff: number; others: number };
  anova?: { f: number; p: number };
}
export function weigherFigures(a: AgreedReadings, rs: Pick<StudyReading, 'value' | 'head' | 'struck'>[]): WeigherFigures | undefined {
  if (a.kind !== 'limits' || a.question !== 'weigher') return undefined;
  const live = rs.filter(r => !r.struck && typeof r.value === 'number');
  if (!live.length) return undefined;
  const by = new Map<number, number[]>();
  let noHead = 0;
  for (const r of live) { if (r.head === undefined || !(r.head >= 1)) noHead++; else by.set(r.head, [...(by.get(r.head) ?? []), r.value as number]); }
  const heads = [...by.entries()].sort((p, q) => p[0] - q[0]).map(([head, xs]) => {
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = xs.length >= 2 ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)) : 0;
    return { head, n: xs.length, mean: m, sd };
  });
  const f: WeigherFigures = { heads, noHead };
  if (heads.length >= 2) {
    let best: WeigherFigures['far'];
    for (const h of heads) {
      const rest = heads.filter(o => o !== h), others = rest.reduce((s, o) => s + o.mean, 0) / rest.length, diff = h.mean - others;
      if (!best || Math.abs(diff) > Math.abs(best.diff)) best = { head: h.head, diff, others };
    }
    f.far = best;
    const an = anovaOneWay([...by.values()]);
    if (an) f.anova = { f: an.f, p: an.p };
  }
  return f;
}
export function weigherSays(w: WeigherFigures, dp: number, unit?: string): { text: string; tone: ModeTone } {
  const u = unit ? ` ${unit}` : '';
  if (w.heads.length < 2) return { text: `Heads: ${w.heads.length ? `only head ${w.heads[0].head} has readings` : 'no reading carries a head yet'}${w.noHead ? ` (${w.noHead} with no head)` : ''} — type the head with each reading to compare them.`, tone: 'n' };
  const counts = w.heads.map(h => h.n), range = Math.min(...counts) === Math.max(...counts) ? `${counts[0]} each` : `${Math.min(...counts)}–${Math.max(...counts)} each`;
  const far = w.far as NonNullable<WeigherFigures['far']>;
  const differ = w.anova ? (w.anova.p < 0.05 ? `the heads differ (ANOVA p ${w.anova.p < 0.001 ? '< 0.001' : w.anova.p.toFixed(3)}) — the fix is that head’s feeder, not the target` : `the heads agree (ANOVA p ${w.anova.p.toFixed(2)})`) : 'two readings a head are needed to test whether they differ';
  return {
    text: `Heads: ${w.heads.length} heads read (${range})${w.noHead ? `, ${w.noHead} reading${w.noHead === 1 ? '' : 's'} with no head` : ''}; head ${far.head} runs ${fx(Math.abs(far.diff), dp)}${u} ${far.diff >= 0 ? 'heavy' : 'light'} (${fx(far.others + far.diff, dp)} against ${fx(far.others, dp)} on the others) — ${differ}.`,
    tone: w.anova && w.anova.p < 0.05 ? 'a' : 'n',
  };
}

/** VOLUME PACKS CHECKED BY WEIGHT (FC-163): the nominal in millilitres and the density make the
 *  nominal in grams, and the TNE is the volume table's, converted — the three rules then run in grams. */
export function densitySays(a: AgreedReadings, tneMl: number | undefined): { text: string; tone: ModeTone } | undefined {
  if (a.kind !== 'packers' || a.nominalMl === undefined || a.density === undefined || tneMl === undefined) return undefined;
  const g = a.nominalMl * a.density, tneG = tneMl * a.density;
  return { text: `Sold by volume, checked by weight: ${big(a.nominalMl)} ml at ${a.density} g/ml is ${g.toFixed(1)} g; the tolerable negative error ${+tneMl.toFixed(2)} ml is ${tneG.toFixed(2)} g — the three rules run in grams (T1 ${(g - tneG).toFixed(2)} g, T2 ${(g - 2 * tneG).toFixed(2)} g). The density is the product’s at the temperature it is packed.`, tone: 'n' };
}
