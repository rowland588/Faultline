/* A MACHINE'S RELIABILITY, BY HAND — MTBF and the failure rate from a person
 * stood at the machine (docs/TOOLKIT.md, tool 13).
 *
 * Rowland, 21 October: "a tool ... to measure machine reliability, MTBF and a
 * failure rate ... a person stood at a machine, tapping a button every time
 * an event happened, a stop, could be a failure or a pick or whatever the
 * machine's function is ... also I start a clock watch I can stop and start,
 * the calculation of MTBF makes sense why I need these 2 things ... allow
 * continued testing, and continued testing builds up data".
 *
 * The two facts are the watch and the taps. The watch says how long the
 * machine was watched running — the stretches it ran, never the clock on the
 * wall: it is stopped while the machine is down, at a break, when nobody is
 * there. The taps say how many events were seen in that time. So:
 *
 *   MTBF          = watched running time ÷ events
 *   failure rate  = events ÷ watched running time (λ, an hour)
 *
 * Every later session adds to the same two lists, so the figures firm up as
 * the watching builds. What is said beside them, each from the same facts:
 *
 *   - 90% BOUNDS. Events at random over a watched time T (a time-ended test):
 *     the MTBF lies between 2T/χ²(0.95; 2n+2) and 2T/χ²(0.05; 2n), and λ
 *     between their inverses. With no event yet, only "at least 2T/χ²(0.90;
 *     2)" can be said. Under five events the figure is called rough.
 *   - THE CHANCE OF AN HOUR WITH NONE, e^(−1 h ÷ MTBF), and the run nine in
 *     ten last, MTBF × −ln 0.9 — what a person on the line feels.
 *   - THE GAPS between one event and the next, in watched time: their median,
 *     shortest, longest and spread (CV). Near 1, they come at random; well
 *     under, they come round regularly (a reel, a refill, a wear part); well
 *     over, they come in bursts (one stop brings the next). A rough read,
 *     from five gaps.
 *   - THE TREND (Laplace's test, 90%): the events bunching late in the
 *     watched time — coming more often, getting worse — or early, getting
 *     better; else no sign of either. From four events.
 *   - BY KIND, when the team tells them apart: each one's count, share and
 *     its own MTBF (the watched time over its count) — the top one first.
 *   - BY DAY: the watched time, events and MTBF of each day it was watched,
 *     which the trend on the page draws.
 *   - WHAT IT COSTS (docs/CAPACITY.md §6, lib/cost — the one cost model):
 *     with the minutes the line stands for each event (agreed), the minutes
 *     lost an hour of running = λ × those minutes; the crew's time
 *     (labourPerHour) and the packs not made at the line's rated speed — where
 *     it stops the line — and their margin, each an hour of running and a
 *     day of the line's shifts. What is missing is named, never guessed.
 *
 * Pure: nothing worked out here is stored. */
import { labourPerHour, ratedPerMin } from '../cost';
import { lineDay } from '../lineLoss';
import type { AgreedReliability, RelEvent, WatchRun } from '../study';
import type { Workspace } from '../../types';

const HOUR = 3_600_000;

/* ------------------------------------------------------------------ words */

/** One event, more than one: "stop" → "stops", "pick" → "picks", "batch" → "batches". */
export function plural(word: string, n = 2): string {
  const w = word.trim() || 'event';
  if (n === 1) return w;
  if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(w)) return `${w}es`;
  return `${w}s`;
}

/** "an hour of running", in the time a person says it: 40 s, 47 min, 3.2 h. */
export function span(h: number): string {
  if (!Number.isFinite(h)) return '—';
  const min = h * 60;
  if (min < 1) return `${Math.round(min * 60)} s`;
  if (min < 120) return `${min < 10 ? +min.toFixed(1) : Math.round(min)} min`;
  return `${+h.toFixed(h < 10 ? 1 : 0)} h`;
}

/** A rate an hour, said: "1.3 an hour", "0.05 an hour". */
export function perHour(r: number): string {
  if (!Number.isFinite(r)) return '—';
  const v = r >= 10 ? Math.round(r) : r >= 1 ? +r.toFixed(1) : +r.toPrecision(2);
  return `${v} an hour`;
}

const gbp = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;
const pct = (f: number): string => `${Math.round(f * 100)}%`;

/* ------------------------------------------------------------------ the chi-square bounds */

/** ln Γ(x) — Lanczos, for the Poisson terms. */
function lnGamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** P(χ² ≤ x) with an even number of degrees of freedom k = 2m — one less
 *  the Poisson chance of fewer than m events at mean x/2. Exact. */
export function chi2Even(x: number, k: number): number {
  if (x <= 0) return 0;
  const m = k / 2, lam = x / 2;
  let sum = 0;
  for (let j = 0; j < m; j++) sum += Math.exp(-lam + j * Math.log(lam) - lnGamma(j + 1));
  return Math.min(1, Math.max(0, 1 - sum));
}

/** The p quantile of χ² with k (even) degrees of freedom, by halving. */
export function chi2Quantile(p: number, k: number): number {
  let lo = 0, hi = Math.max(10, k * 4);
  while (chi2Even(hi, k) < p) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (chi2Even(mid, k) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ the watch */

/** The stretches watched, as one: the runs not struck (one still running
 *  counted to `t`), overlaps — two phones at one machine — counted once. */
export function watchedSpans(runs: readonly WatchRun[], t: number): [number, number][] {
  const xs = runs.filter(r => !r.struck).map(r => [r.from, Math.max(r.from, r.to ?? t)] as [number, number])
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of xs) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** The run still going, if the watch is running — the latest one with no end. */
export const runningRun = (runs: readonly WatchRun[]): WatchRun | undefined =>
  runs.filter(r => !r.struck && r.to === undefined).sort((a, b) => b.from - a.from)[0];

/** Watched milliseconds before `at` — where an event sits on the watched clock. */
export function clockAt(spans: readonly [number, number][], at: number): number {
  let ms = 0;
  for (const [a, b] of spans) { if (at <= a) break; ms += Math.min(at, b) - a; }
  return ms;
}

const inSpans = (spans: readonly [number, number][], at: number): boolean => spans.some(([a, b]) => at >= a && at <= b);

/** The events that count: not struck, and seen while the watch ran. */
export function countedEvents(events: readonly RelEvent[], spans: readonly [number, number][]): RelEvent[] {
  return events.filter(e => !e.struck && inSpans(spans, e.at)).sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------------ the figures */

export type RelEnough = 'none' | 'rough' | 'enough';
/** Events before the MTBF is said as more than rough. */
export const ROUGH_UNDER = 5;
/** A stretch of the watch longer than this is asked about: left on? */
export const LEFT_ON_H = 12;

export interface RelKind { kind: string; n: number; share: number; mtbfH: number }
export interface RelDay { day: string; hours: number; n: number; mtbfH?: number }
export interface RelGaps { n: number; meanH: number; medianH: number; minH: number; maxH: number; cv: number; pattern?: 'random' | 'regular' | 'bursts' }
export interface RelTrend { u: number; says: 'worse' | 'better' | 'steady' }
export type RelVerdict = 'met' | 'met-unsure' | 'short-unsure' | 'short';

export interface RelFigures {
  /** Watched hours, and in how many stretches over how many days. */
  hours: number;
  stretches: number;
  days: RelDay[];
  /** The watch is running now, since — and for how many hours. */
  runningSince?: number;
  runningH?: number;
  /** Events that count, struck ones and those tapped while the watch was stopped. */
  n: number;
  struck: number;
  outside: number;
  enough: RelEnough;
  /** MTBF in hours — or, with no event yet, the 90% "at least" in `lo`. */
  mtbfH?: number;
  lo?: number;
  hi?: number;
  /** Events an hour, with its 90% bounds. */
  rate?: number;
  rateLo?: number;
  rateHi?: number;
  /** The chance of an hour with none; the run nine in ten last, in hours. */
  hourClear?: number;
  b10H?: number;
  gaps?: RelGaps;
  trend?: RelTrend;
  kinds: RelKind[];
  /** Events against watched hours, a point an event — the cumulative plot. */
  points: { h: number; n: number }[];
  /** Against the MTBF wanted, when it was agreed. */
  verdict?: RelVerdict;
}

const isoDayOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function reliability(a: AgreedReliability | undefined, runs: readonly WatchRun[] = [], events: readonly RelEvent[] = [], t = Date.now()): RelFigures {
  const spans = watchedSpans(runs, t);
  const ms = spans.reduce((s, [x, y]) => s + (y - x), 0);
  const hours = ms / HOUR;
  const live = countedEvents(events, spans);
  const n = live.length;
  const struck = events.filter(e => e.struck).length;
  const outside = events.filter(e => !e.struck && !inSpans(spans, e.at)).length;
  const run = runningRun(runs);

  /* by day: each stretch on the day it started */
  const byDay = new Map<string, { ms: number; n: number }>();
  for (const [x, y] of spans) {
    const k = isoDayOf(x), d = byDay.get(k) ?? { ms: 0, n: 0 };
    d.ms += y - x;
    d.n += live.filter(e => e.at >= x && e.at <= y).length;
    byDay.set(k, d);
  }
  const days: RelDay[] = [...byDay.entries()].sort(([p], [q]) => p.localeCompare(q))
    .map(([day, d]) => ({ day, hours: d.ms / HOUR, n: d.n, ...(d.n ? { mtbfH: d.ms / HOUR / d.n } : {}) }));

  const out: RelFigures = { hours, stretches: spans.length, days, ...(run ? { runningSince: run.from, runningH: Math.max(0, t - run.from) / HOUR } : {}), n, struck, outside,
    enough: n === 0 ? 'none' : n < ROUGH_UNDER ? 'rough' : 'enough', kinds: [], points: [] };
  if (hours <= 0) return out;

  if (n === 0) {
    /* nothing seen yet: only a floor — 90% sure the MTBF is at least this */
    out.lo = (2 * hours) / chi2Quantile(0.9, 2);
    out.rateHi = 1 / out.lo;
  } else {
    out.mtbfH = hours / n;
    out.rate = n / hours;
    out.lo = (2 * hours) / chi2Quantile(0.95, 2 * n + 2);
    out.hi = (2 * hours) / chi2Quantile(0.05, 2 * n);
    out.rateLo = 1 / out.hi;
    out.rateHi = 1 / out.lo;
    out.hourClear = Math.exp(-1 / out.mtbfH);
    out.b10H = out.mtbfH * -Math.log(0.9);
  }

  /* where each event sits on the watched clock */
  const at = live.map(e => clockAt(spans, e.at) / HOUR);
  out.points = at.map((h, i) => ({ h, n: i + 1 }));

  const gaps = at.slice(1).map((h, i) => h - at[i]);
  if (gaps.length) {
    const sorted = [...gaps].sort((p, q) => p - q);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const sd = gaps.length > 1 ? Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / (gaps.length - 1)) : 0;
    const mid = sorted.length / 2;
    const cv = mean > 0 ? sd / mean : 0;
    out.gaps = { n: gaps.length, meanH: mean, medianH: sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2,
      minH: sorted[0], maxH: sorted[sorted.length - 1], cv,
      ...(gaps.length >= 5 ? { pattern: cv < 0.7 ? 'regular' as const : cv > 1.3 ? 'bursts' as const : 'random' as const } : {}) };
  }

  if (n >= 4) {
    const u = (at.reduce((s, h) => s + h, 0) / n - hours / 2) / (hours * Math.sqrt(1 / (12 * n)));
    out.trend = { u, says: u > 1.645 ? 'worse' : u < -1.645 ? 'better' : 'steady' };
  }

  const kinds = new Map<string, number>();
  for (const e of live) if (e.kind?.trim()) kinds.set(e.kind.trim(), (kinds.get(e.kind.trim()) ?? 0) + 1);
  const untold = live.filter(e => !e.kind?.trim()).length;
  if (kinds.size) {
    if (untold) kinds.set('not said', untold);
    out.kinds = [...kinds.entries()].map(([kind, k]) => ({ kind, n: k, share: k / n, mtbfH: hours / k }))
      .sort((p, q) => q.n - p.n || p.kind.localeCompare(q.kind));
  }

  const want = a?.targetMin && a.targetMin > 0 ? a.targetMin / 60 : undefined;
  if (want !== undefined) {
    if (n === 0) out.verdict = (out.lo ?? 0) >= want ? 'met' : 'met-unsure';
    else if ((out.lo ?? 0) >= want) out.verdict = 'met';
    else if ((out.mtbfH ?? 0) >= want) out.verdict = 'met-unsure';
    else if ((out.hi ?? Infinity) >= want) out.verdict = 'short-unsure';
    else out.verdict = 'short';
  }
  return out;
}

/* ------------------------------------------------------------------ what it costs */

export interface RelCost {
  /** Minutes the line stands an hour of running, from the events. */
  downMinPerH?: number;
  labourPerH?: number;
  packsPerH?: number;
  marginPerH?: number;
  /** The same, a day of the line's shifts. */
  dayH?: number;
  labourPerDay?: number;
  packsPerDay?: number;
  marginPerDay?: number;
  /** What is not given, and where to give it. */
  missing: string[];
}

export type RelCostLine = Pick<Workspace, 'name' | 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack' | 'shifts'>;

export function relCost(f: RelFigures, a: AgreedReliability | undefined, line?: RelCostLine): RelCost {
  const missing: string[] = [];
  const down = a?.downMin && a.downMin > 0 ? a.downMin : undefined;
  if (down === undefined) missing.push(`the minutes the line stands for each ${plural(a?.event ?? 'event', 1)} (Change what was agreed)`);
  if (!line) missing.push('a line, for its crew, wage and speed');
  const lab = line ? labourPerHour(line) : 0;
  const speed = line ? ratedPerMin(line) : undefined;
  if (line && !(lab > 0)) missing.push('the line’s crew and wage (Your factory)');
  if (line && speed === undefined) missing.push('the line’s rated speed (Your factory)');
  if (f.rate === undefined || down === undefined) return { missing };
  const downMinPerH = f.rate * down;
  const out: RelCost = { downMinPerH, missing };
  if (lab > 0) out.labourPerH = lab * (downMinPerH / 60);
  if (speed !== undefined) {
    out.packsPerH = speed * downMinPerH;
    if (line?.marginPerPack && line.marginPerPack > 0) out.marginPerH = out.packsPerH * line.marginPerPack;
  }
  const day = line ? lineDay({ name: line.name, packsPerMin: line.packsPerMin, marginPerPack: line.marginPerPack, shifts: line.shifts }).minutes : undefined;
  if (day && day > 0) {
    out.dayH = day / 60;
    if (out.labourPerH !== undefined) out.labourPerDay = out.labourPerH * out.dayH;
    if (out.packsPerH !== undefined) out.packsPerDay = out.packsPerH * out.dayH;
    if (out.marginPerH !== undefined) out.marginPerDay = out.marginPerH * out.dayH;
  }
  return out;
}

/** "£4.20 of the crew’s time an hour of running · 140 packs not made where it stops the line (£28 margin)". */
export function costWords(c: RelCost): string {
  if (c.downMinPerH === undefined) return '';
  const parts = [
    `${+c.downMinPerH.toFixed(1)} min stood an hour of running`,
    c.labourPerH !== undefined ? `${gbp(c.labourPerH)} of the crew’s time` : '',
    c.packsPerH !== undefined ? `${Math.round(c.packsPerH).toLocaleString('en-GB')} packs not made where it stops the line${c.marginPerH !== undefined ? ` (${gbp(c.marginPerH)} margin)` : ''}` : '',
  ].filter(Boolean);
  const day = c.dayH !== undefined && (c.labourPerDay !== undefined || c.marginPerDay !== undefined)
    ? ` — a day of its shifts (${+c.dayH.toFixed(1)} h): ${[c.labourPerDay !== undefined ? `${gbp(c.labourPerDay)} labour` : '', c.marginPerDay !== undefined ? `${gbp(c.marginPerDay)} margin` : ''].filter(Boolean).join(' · ')}` : '';
  return parts.join(' · ') + day;
}

/* ------------------------------------------------------------------ what it says */

export interface RelSays { verdict: string; text: string; tone: 'r' | 'a' | 'g' | 'n' }

const VERDICT_WORD: Record<RelVerdict, string> = {
  met: 'meets the MTBF wanted', 'met-unsure': 'on the MTBF wanted, not yet sure', 'short-unsure': 'below the MTBF wanted, not yet sure', short: 'short of the MTBF wanted',
};
const VERDICT_TONE: Record<RelVerdict, RelSays['tone']> = { met: 'g', 'met-unsure': 'a', 'short-unsure': 'a', short: 'r' };

/** The study's sentence and verdict — the list's line, the band, the paper. */
export function reliabilitySays(a: AgreedReliability | undefined, f: RelFigures): RelSays {
  const ev = a?.event?.trim() || 'event', evs = plural(ev);
  if (!a) return { verdict: 'Not set up', text: 'Say what counts as an event, then start the watch at the machine.', tone: 'n' };
  if (f.hours <= 0) return { verdict: 'Not watched yet', text: `Start the watch at the machine and tap each ${ev} as it happens.`, tone: 'n' };
  const want = a.targetMin && a.targetMin > 0 ? a.targetMin / 60 : undefined;
  const v = f.verdict;
  if (f.n === 0) {
    return { verdict: `No ${evs} in ${span(f.hours)}`, tone: v ? VERDICT_TONE[v] : 'n',
      text: `No ${evs} in ${span(f.hours)} of watched running — 90% sure the MTBF is at least ${span(f.lo ?? 0)}${want ? ` against ${span(want)} wanted` : ''}. Keep watching for a figure.` };
  }
  const rough = f.enough === 'rough' ? ` — rough: ${f.n} ${plural(ev, f.n)} so far, ${ROUGH_UNDER} before it is said firmly` : '';
  const text = `${f.n} ${plural(ev, f.n)} in ${span(f.hours)} of watched running: one every ${span(f.mtbfH ?? 0)} (MTBF; 90% sure ${span(f.lo ?? 0)}–${span(f.hi ?? 0)}), ${perHour(f.rate ?? 0)}${rough}.`
    + (want && v ? ` Against ${span(want)} wanted, it ${VERDICT_WORD[v]}.` : '');
  return { verdict: `MTBF ${span(f.mtbfH ?? 0)}${v ? ` · ${VERDICT_WORD[v]}` : ''}`, text, tone: v ? VERDICT_TONE[v] : 'n' };
}

/** What it means, in sentences — the gaps, the trend, the top kind, the chance of an hour with none. */
export function reliabilityInsights(a: AgreedReliability | undefined, f: RelFigures): { text: string; tone: 'r' | 'a' | 'g' | 'n' }[] {
  const ev = a?.event?.trim() || 'event', evs = plural(ev);
  const out: { text: string; tone: 'r' | 'a' | 'g' | 'n' }[] = [];
  if (f.n === 0) return (f.runningH ?? 0) > LEFT_ON_H ? [{ text: `The watch has been running ${span(f.runningH ?? 0)} without a stop — if it was left on, stop it where the watching ended.`, tone: 'a' }] : out;
  if (f.hourClear !== undefined && f.b10H !== undefined) {
    out.push({ text: `The chance of an hour’s running with no ${ev}: ${pct(f.hourClear)}. Nine runs in ten last at least ${span(f.b10H)} before the next.`, tone: 'n' });
  }
  if (f.gaps) {
    const g = f.gaps;
    const how = g.pattern === 'regular' ? ` They come round fairly regularly (spread ${g.cv.toFixed(2)}) — look for something that comes round: a reel, a refill, a part that wears.`
      : g.pattern === 'bursts' ? ` They come in bursts (spread ${g.cv.toFixed(2)}) — one brings the next: look at what is not put right after the first.`
      : g.pattern === 'random' ? ` They come at random (spread ${g.cv.toFixed(2)}), as chance and many small causes make them.`
      : ` Five gaps before their pattern is read.`;
    out.push({ text: `Between one ${ev} and the next: typically ${span(g.medianH)}, from ${span(g.minH)} to ${span(g.maxH)}.${how}`, tone: g.pattern === 'bursts' ? 'a' : 'n' });
  }
  if (f.trend) {
    out.push(f.trend.says === 'worse' ? { text: `They are coming more often as the watching goes on — getting worse (90% sure).`, tone: 'r' }
      : f.trend.says === 'better' ? { text: `They are coming less often as the watching goes on — getting better (90% sure).`, tone: 'g' }
      : { text: `No sign of the ${evs} coming more or less often as the watching goes on.`, tone: 'n' });
  } else {
    out.push({ text: `Four ${evs} before it can be said whether they are coming more or less often.`, tone: 'n' });
  }
  const top = f.kinds.find(k => k.kind !== 'not said');
  if (top) out.push({ text: `The most: ${top.kind} — ${top.n} of ${f.n} (${pct(top.share)}), one every ${span(top.mtbfH)} on its own.`, tone: 'n' });
  if (f.outside) out.push({ text: `${f.outside} tapped while the watch was stopped — not counted.`, tone: 'a' });
  if ((f.runningH ?? 0) > LEFT_ON_H) out.push({ text: `The watch has been running ${span(f.runningH ?? 0)} without a stop — if it was left on, stop it at the last ${ev}, or the watched time is too long and the MTBF too high.`, tone: 'a' });
  return out;
}

/** Each day it was watched as a point of the trend — MTBF in minutes a day; a day with none named apart. */
export function dayPoints(f: RelFigures): { label: string; v: number; target?: number; now?: boolean }[] {
  return f.days.filter(d => d.mtbfH !== undefined).map(d => ({ label: d.day, v: Math.round((d.mtbfH as number) * 60) }));
}

/** BEFORE → AFTER — the machine watched again after a fix (a reliability
 *  study as its proof, lib/studyLinks beforeAfter). Better or worse is said
 *  only when the 90% bounds no longer overlap; until then the MTBF moved and
 *  it is not yet sure. It says the number moved, never that the fix did it. */
export function compareReliability(fb: RelFigures, fa: RelFigures, event = 'event'): { text: string; tone: 'r' | 'g' | 'n' } {
  const evs = plural(event);
  if (fb.mtbfH === undefined) return { text: `Before, no ${evs} were seen to set an MTBF against.`, tone: 'n' };
  if (fa.mtbfH === undefined) {
    const sure = (fa.lo ?? 0) > (fb.hi ?? Infinity);
    return { text: `No ${evs} in ${span(fa.hours)} watched after (90% sure the MTBF is at least ${span(fa.lo ?? 0)}), against one every ${span(fb.mtbfH)} before${sure ? ' — longer, beyond doubt' : ' — keep watching to be sure'}.`, tone: sure ? 'g' : 'n' };
  }
  const move = `MTBF ${span(fb.mtbfH)} → ${span(fa.mtbfH)}`;
  const bounds = `(90%: ${span(fb.lo ?? 0)}–${span(fb.hi ?? 0)} before, ${span(fa.lo ?? 0)}–${span(fa.hi ?? 0)} after)`;
  if ((fa.lo ?? 0) > (fb.hi ?? Infinity)) return { text: `${move} — longer between ${evs}, the bounds clear of each other ${bounds}.`, tone: 'g' };
  if ((fa.hi ?? Infinity) < (fb.lo ?? 0)) return { text: `${move} — shorter between ${evs}, the bounds clear of each other ${bounds}.`, tone: 'r' };
  return { text: `${move} — not yet sure: the bounds overlap ${bounds}; keep watching.`, tone: 'n' };
}
