/* REPAIR TIMES AND ANDON CALLS ON A RELIABILITY STUDY — how long each stop
 * takes to clear, split into waiting and fixing, the machine's availability;
 * and a call for help's response and resolution, by reason, by shift.
 * (knowledge/specs/FC-059-repair-times.md — also FC-055 short stops, how long;
 * knowledge/specs/FC-015-andon-calls.md.)
 *
 * The study already taps each stop. A TIMED count adds the two moments after
 * the tap: HELP ARRIVED and RUNNING AGAIN (or the time said — "took 40 s").
 * From them, per stop, waiting = arrived − tapped, fixing = running again −
 * arrived, repair = running again − tapped. What is said:
 *
 *   - MTTR — the median first (repair times are skewed), with its exact
 *     distribution-free 90% interval from the order statistics (from 5
 *     timed), the mean beside it, the 90th percentile (linear, NumPy's
 *     default) from 10 timed, the longest.
 *   - WAITING AND FIXING apart, from the stops that have a help stamp.
 *   - AVAILABILITY = MTBF ÷ (MTBF + MTTR), with the MTBF's 90% range, and what
 *     halving the repair time gives (IEC 60050-192 as the record gives it).
 *   - THE MINUTES LOST AN HOUR OF RUNNING = failure rate × MTTR — FC-055's
 *     "how long are they, in total".
 *   - FOR A CALL (andon): response and resolution by the median and the slow
 *     end, the share within the response wanted, the reasons ranked by the
 *     minutes waited (never by who called), by the line's shifts.
 *
 * Pure: nothing worked out here is stored, no name of a person is read. */
import { binomCdf } from '../../lib/ie/dist';
import type { RelEvent } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import { gbp, mins, pct, plural, span } from './words';

const MIN = 60_000, HOUR = 3_600_000;

/** Timed stops the figures are called rough under. */
export const ROUGH_TIMED = 5;
/** The 90th percentile is said from this many timed; under it, the longest. */
export const P90_FROM = 10;
/** The median's exact 90% interval exists from this many (n = 5 covers 93.75%). */
export const MEDIAN_CI_FROM = 5;
/** The measured mean replaces the typed "minutes the line stands" in the money from here. */
export const MIN_TIMED_FOR_MONEY = 3;
/** A stop open this long is asked about. */
export const OPEN_STALE_H = 4;
/** The reasons a count may list (the record: five to eight). */
export const MAX_REASONS = 8;
/** The reasons a timed stop starts with — a person adds their own and takes any off (Rowland, 26 October: "before there
 *  were some default and I could then add ... I press these reasons during the tests"). A starting list, the builder's
 *  choice for a packing line, never a standard: eight at most, the floor's words. */
export const DEFAULT_STOP_REASONS = ['jam', 'film break', 'sensor', 'material short', 'changeover', 'waiting for operator', 'quality check', 'no product'];
/** And a call for help (andon) — the record's five. */
export const DEFAULT_CALL_REASONS = ['film change', 'jam', 'QA check', 'label', 'material short'];
/** The counts that are stoppages — what a stop timed with its reason is offered for. */
export const isStoppage = (name: string): boolean => /^(stop|jam|failure|short stop|breakdown|stoppage)s?$/i.test(name.trim());
/** Help-stamped stops needed before waiting and fixing are said apart. */
export const MIN_HELPED = 3;

/* ------------------------------------------------------------------ a time said */

/** A time a person says — "40 s", "90 sec", "1.5 min", "1:30" (minutes:seconds),
 *  "2 h", a bare number is minutes — in milliseconds. Undefined when it is not
 *  one, or under a second or over a day. */
export function parseDuration(text: string): number | undefined {
  const t = text.trim().toLowerCase().replace(',', '.');
  if (!t) return undefined;
  let ms: number | undefined;
  let m = /^(\d+):(\d{1,2})$/.exec(t);
  if (m) ms = Number(m[2]) < 60 ? (Number(m[1]) * 60 + Number(m[2])) * 1000 : undefined;
  else if ((m = /^(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds?)$/.exec(t))) ms = Number(m[1]) * 1000;
  else if ((m = /^(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)$/.exec(t))) ms = Number(m[1]) * HOUR;
  else if ((m = /^(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?)?$/.exec(t))) ms = Number(m[1]) * MIN;
  return ms !== undefined && ms >= 1000 && ms <= 24 * HOUR ? Math.round(ms) : undefined;
}

/* ------------------------------------------------------------------ a timed stop */

/** One counted tap of a timed count, its times as they can be read: a running-
 *  again before the tap, or a help stamp outside the two, is not read. */
export interface TimedStop { id: string; at: number; arrivedAt?: number; fixedAt?: number; est?: boolean; reason?: string; open: boolean }

export function stopsOf(counted: readonly RelEvent[]): TimedStop[] {
  return counted.map(e => {
    const fixed = e.fixedAt !== undefined && e.fixedAt > e.at ? e.fixedAt : undefined;
    const arrived = e.arrivedAt !== undefined && e.arrivedAt >= e.at && (fixed === undefined || e.arrivedAt <= fixed) ? e.arrivedAt : undefined;
    return { id: e.id, at: e.at, ...(arrived !== undefined ? { arrivedAt: arrived } : {}), ...(fixed !== undefined ? { fixedAt: fixed } : {}),
      ...(e.est ? { est: true } : {}), ...(e.reason?.trim() ? { reason: e.reason.trim() } : {}), open: fixed === undefined };
  });
}

/** The minutes the machine stood, for the running time: from the tap to
 *  running again, an open one to `t`. */
export function downSpans(stops: readonly TimedStop[], t: number): [number, number][] {
  return stops.map(s => [s.at, s.fixedAt ?? Math.max(s.at, t)] as [number, number]).filter(([a, b]) => b > a);
}

/* ------------------------------------------------------------------ the arithmetic */

/** The p-th percentile of sorted values by linear interpolation at position
 *  1 + p(n − 1) — NumPy's default. */
export function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return NaN;
  const pos = p * (sorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const sortedAsc = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);
export const median = (xs: readonly number[]): number => percentile(sortedAsc(xs), 0.5);
const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

/** The order-statistic rank l of the median's 90% interval: the largest k with
 *  P(Binomial(n, ½) ≤ k − 1) ≤ 0.05 — the interval is [x₍ₗ₎, x₍ₙ₊₁₋ₗ₎], its
 *  coverage 1 − 2P(B ≤ l − 1) ≥ 90%. 0 when n is too small for one (n < 5). */
export function medianRank(n: number): number {
  let l = 0;
  for (let k = 1; k <= Math.floor(n / 2); k++) if (binomCdf(k - 1, n, 0.5) <= 0.05) l = k;
  return l;
}

/* ------------------------------------------------------------------ the figures of a timed stop count */

export interface ReasonRow { reason: string; n: number; waitMin: number; clearMin: number }
export interface StopBar { at: number; waitMin?: number; fixMin: number; est: boolean }

export interface RepairFigures {
  /** Counted taps, those timed, still open, and of the timed those said not clocked. */
  n: number; timed: number; open: number; typed: number;
  enough: 'none' | 'rough' | 'enough';
  meanMin?: number; medianMin?: number; medianLo?: number; medianHi?: number; p90Min?: number; maxMin?: number; minMin?: number;
  totalMin: number;
  /** Stops with a help stamp, and the waiting and fixing figures from them. */
  helped: number;
  waitMedianMin?: number; fixMedianMin?: number; waitMeanMin?: number; fixMeanMin?: number; waitShare?: number;
  /** Stops open longer than OPEN_STALE_H. */
  stale: number;
  /** The per-hour-of-running figures, from the failure rate. */
  lostMinPerH?: number;
  availability?: number; availLo?: number; availHi?: number; availHalf?: number; halfBackMinPerH?: number;
  reasons: ReasonRow[];
  bars: StopBar[];
}

/** What the module needs of the study's own figures for a count (structural, so
 *  this file never imports reliability.ts). */
export interface RelBasis { n: number; hours: number; rate?: number; mtbfH?: number; lo?: number; hi?: number }

export function reasonRows(stops: readonly TimedStop[], by: 'wait' | 'clear'): ReasonRow[] {
  const m = new Map<string, ReasonRow>();
  for (const s of stops) {
    const k = s.reason ?? 'not said';
    const r = m.get(k) ?? { reason: k, n: 0, waitMin: 0, clearMin: 0 };
    r.n++;
    if (s.arrivedAt !== undefined) r.waitMin += (s.arrivedAt - s.at) / MIN;
    if (s.fixedAt !== undefined) r.clearMin += (s.fixedAt - s.at) / MIN;
    m.set(k, r);
  }
  const key = (r: ReasonRow) => (by === 'wait' ? r.waitMin : r.clearMin);
  return [...m.values()].sort((a, b) => key(b) - key(a) || b.n - a.n || a.reason.localeCompare(b.reason));
}

export function repairFigures(stops: readonly TimedStop[], f: RelBasis, t: number): RepairFigures {
  const done = stops.filter(s => !s.open);
  const r = done.map(s => ((s.fixedAt as number) - s.at) / MIN);
  const open = stops.length - done.length;
  const stale = stops.filter(s => s.open && (t - s.at) / HOUR > OPEN_STALE_H).length;
  const out: RepairFigures = { n: f.n, timed: done.length, open, typed: done.filter(s => s.est).length, stale, totalMin: r.reduce((a, b) => a + b, 0),
    enough: done.length === 0 ? 'none' : done.length < ROUGH_TIMED ? 'rough' : 'enough', helped: 0, reasons: [], bars: [] };
  const withReason = stops.some(s => s.reason);
  if (withReason) out.reasons = reasonRows(stops, 'clear');
  if (!done.length) return out;

  const sorted = sortedAsc(r);
  out.meanMin = mean(r); out.medianMin = percentile(sorted, 0.5); out.maxMin = sorted[sorted.length - 1]; out.minMin = sorted[0];
  if (done.length >= P90_FROM) out.p90Min = percentile(sorted, 0.9);
  if (done.length >= MEDIAN_CI_FROM) {
    const l = medianRank(done.length);
    if (l > 0) { out.medianLo = sorted[l - 1]; out.medianHi = sorted[done.length - l]; }
  }

  const helped = done.filter(s => s.arrivedAt !== undefined);
  out.helped = helped.length;
  if (helped.length) {
    const w = helped.map(s => ((s.arrivedAt as number) - s.at) / MIN), x = helped.map(s => ((s.fixedAt as number) - (s.arrivedAt as number)) / MIN);
    out.waitMedianMin = median(w); out.fixMedianMin = median(x); out.waitMeanMin = mean(w); out.fixMeanMin = mean(x);
    const tot = w.reduce((a, b) => a + b, 0) + x.reduce((a, b) => a + b, 0);
    if (tot > 0) out.waitShare = w.reduce((a, b) => a + b, 0) / tot;
  }

  if (f.rate !== undefined) out.lostMinPerH = f.rate * out.meanMin;
  if (f.mtbfH !== undefined && f.mtbfH > 0) {
    const mttr = out.meanMin / 60, mtbf = f.mtbfH;
    out.availability = mtbf / (mtbf + mttr);
    out.availHalf = mtbf / (mtbf + mttr / 2);
    if (f.lo !== undefined && f.hi !== undefined) { out.availLo = f.lo / (f.lo + mttr); out.availHi = f.hi / (f.hi + mttr); }
    if (out.lostMinPerH !== undefined) out.halfBackMinPerH = out.lostMinPerH / 2;
  }

  out.bars = barsOf(done);
  return out;
}

/** A bar for each cleared stop, in the order they came: waiting then fixing, or the whole time with no help stamp. */
export function barsOf(done: readonly TimedStop[]): StopBar[] {
  return done.filter(s => s.fixedAt !== undefined).map(s => s.arrivedAt !== undefined
    ? { at: s.at, waitMin: (s.arrivedAt - s.at) / MIN, fixMin: ((s.fixedAt as number) - s.arrivedAt) / MIN, est: !!s.est }
    : { at: s.at, fixMin: ((s.fixedAt as number) - s.at) / MIN, est: !!s.est });
}

/* ------------------------------------------------------------------ the sentences */

type Tone = 'r' | 'a' | 'g' | 'n';
export interface Said { text: string; tone: Tone }

/** The stop count's sentence — typically how long, the worst, the machine's availability. */
export function repairSays(ev: string, f: Pick<RelBasis, 'n' | 'mtbfH'>, r: RepairFigures): Said {
  const evs = plural(ev, f.n);
  if (!r.timed) {
    if (r.open) return { text: `${r.open} ${plural(ev, r.open)} not yet cleared — tap Running again when ${r.open === 1 ? 'it clears' : 'each clears'}, or say how long it took.`, tone: r.stale ? 'a' : 'n' };
    return { text: `None of the ${f.n} ${evs} is timed yet — tap Running again when each clears, or say how long it took.`, tone: 'n' };
  }
  const rough = r.enough === 'rough' ? ` — rough: ${r.timed} timed so far, ${ROUGH_TIMED} before it is said firmly` : '';
  const ci = r.medianLo !== undefined && r.medianHi !== undefined ? ` (90% sure ${mins(r.medianLo)}–${mins(r.medianHi)})` : '';
  const tail = r.p90Min !== undefined ? `, 1 in 10 over ${mins(r.p90Min)}` : '';
  let text = `${r.timed} of ${f.n} ${evs} timed: typically ${mins(r.medianMin ?? 0)}${ci} to clear (mean ${mins(r.meanMin ?? 0)}${tail}, longest ${mins(r.maxMin ?? 0)})${rough}.`;
  if (r.availability !== undefined && f.mtbfH !== undefined) {
    text += ` Available ${pct(r.availability)} of the time — MTBF ${span(f.mtbfH)} ÷ (MTBF + ${mins(r.meanMin ?? 0)} to repair).`;
    if (r.availHalf !== undefined) text += ` Halving the repair time would make it ${pct(r.availHalf)}${r.halfBackMinPerH !== undefined ? ` and give back ${mins(r.halfBackMinPerH)} of every hour of running` : ''}.`;
  }
  return { text, tone: r.stale ? 'a' : 'n' };
}

/** What it means: waiting or fixing, the long ones, what was said not clocked, the open. */
export function repairInsights(ev: string, f: Pick<RelBasis, 'n'>, r: RepairFigures): Said[] {
  const out: Said[] = [];
  if (r.timed && r.helped >= MIN_HELPED && r.waitShare !== undefined) {
    const lead = r.waitShare >= 0.5 ? ' Most of the time is waiting — look at who is called and how fast.' : r.waitShare <= 0.2 ? ' It is mostly fixing — look at the repair itself.' : '';
    out.push({ text: `Waiting for help is ${pct(r.waitShare)} of the time (typically ${mins(r.waitMedianMin ?? 0)}, from ${r.helped} ${plural(ev, r.helped)} with a help stamp); fixing is the rest (typically ${mins(r.fixMedianMin ?? 0)}, which includes finding the fault).${lead}`, tone: 'n' });
  } else if (r.timed) {
    out.push({ text: `Stamp Help arrived on each ${ev} to see waiting apart from fixing (${r.helped} of the ${MIN_HELPED} needed so far).`, tone: 'n' });
  }
  if (r.timed >= ROUGH_TIMED && r.meanMin !== undefined && r.medianMin !== undefined && r.meanMin >= 1.25 * r.medianMin) {
    out.push({ text: `A few long ones pull the mean (${mins(r.meanMin)}) above the typical (${mins(r.medianMin)}) — read the typical, and look at the longest, ${mins(r.maxMin ?? 0)}.`, tone: 'n' });
  }
  if (r.typed) out.push({ text: `${r.typed} of the ${r.timed} times ${r.typed === 1 ? 'was' : 'were'} said, not clocked.`, tone: 'n' });
  const untimed = f.n - r.timed - r.open;
  if (r.timed && untimed > 0) out.push({ text: `${untimed} ${plural(ev, untimed)} counted but never timed — the figures take them as long as the ${r.timed} timed.`, tone: 'n' });
  if (r.stale) out.push({ text: `${r.stale} ${plural(ev, r.stale)} open for more than ${OPEN_STALE_H} hours — say how long it took, or strike it; it is counted as down until then.`, tone: 'a' });
  else if (r.open && r.timed) out.push({ text: `${r.open} ${plural(ev, r.open)} not yet cleared, counted as down until they are.`, tone: 'n' });
  return out;
}

/** The two tiles a timed stop count adds: its repair time and its availability. */
export function repairTiles(ev: string, f: Pick<RelBasis, 'n' | 'mtbfH'>, r: RepairFigures): LeanTile[] {
  if (!r.timed) return [{ k: 'Repair time', v: '—', of: r.open ? `${r.open} not yet cleared` : `none of the ${f.n} ${plural(ev, f.n)} timed yet` },
    { k: 'Available', v: '—', of: 'said once a stop is timed' }];
  const ci = r.medianLo !== undefined && r.medianHi !== undefined ? ` · 90% sure ${mins(r.medianLo)}–${mins(r.medianHi)}` : '';
  return [
    { k: 'Repair time', v: mins(r.medianMin ?? 0), of: `typical, to clear${ci} · mean ${mins(r.meanMin ?? 0)}${r.p90Min !== undefined ? ` · 1 in 10 over ${mins(r.p90Min)}` : ` · longest ${mins(r.maxMin ?? 0)}`} · ${r.timed} of ${f.n} timed${r.enough === 'rough' ? ' · rough' : ''}`,
      ...(r.stale ? { tone: 'a' as LeanTone } : {}) },
    r.availability !== undefined
      ? { k: 'Available', v: pct(r.availability), of: `MTBF ÷ (MTBF + MTTR)${r.availLo !== undefined && r.availHi !== undefined ? ` · ${pct(r.availLo)}–${pct(r.availHi)} on the MTBF’s 90% range` : ''}${r.lostMinPerH !== undefined ? ` · ${mins(r.lostMinPerH)} lost every hour of running` : ''}` }
      : { k: 'Available', v: '—', of: 'said once there is an MTBF' },
  ];
}

/** A fitter's time priced from the repairs: what it costs a repair and an
 *  hour of running — the fixing minutes where help is stamped, else the whole
 *  time (said). Absent a rate: the sentence that asks for it. */
export interface FitterCost { perRepair?: number; perHour?: number; basis: 'fixing' | 'whole'; missing?: string }
export function fitterCost(r: RepairFigures, ratePerH: number | undefined, fitterRate: number | undefined): FitterCost | undefined {
  if (!r.timed || r.meanMin === undefined) return undefined;
  const basis: FitterCost['basis'] = r.helped >= 1 && r.fixMeanMin !== undefined ? 'fixing' : 'whole';
  if (!(fitterRate && fitterRate > 0)) return { basis, missing: 'Give a fitter’s rate to say the repairs in money' };
  const minPer = basis === 'fixing' ? (r.fixMeanMin as number) : r.meanMin;
  const perRepair = (minPer / 60) * fitterRate;
  return { basis, perRepair, ...(ratePerH !== undefined ? { perHour: perRepair * ratePerH } : {}) };
}
export function fitterWords(c: FitterCost | undefined): string {
  if (!c) return '';
  if (c.missing || c.perRepair === undefined) return `${c.missing ?? ''}.`;
  return `A fitter’s time: ${gbp(c.perRepair)} a repair${c.perHour !== undefined ? `, ${gbp(c.perHour)} an hour of running` : ''} — ${c.basis === 'fixing' ? 'the fixing time, from help arrived to running again' : 'the whole time counted as the fitter’s (stamp Help arrived to separate the waiting)'}.`;
}

/* ------------------------------------------------------------------ a call for help */

export interface ShiftRow { name: string; calls: number; answered: number; respMedianMin?: number }
export interface CallFigures {
  calls: number; answered: number; cleared: number; open: number; typed: number;
  respMeanMin?: number; respMedianMin?: number; respP90Min?: number; respMaxMin?: number;
  resMedianMin?: number; resP90Min?: number; resMaxMin?: number; resMeanMin?: number;
  wantedMin?: number; within?: number; shareWithin?: number;
  waitTotalMin: number; clearTotalMin: number;
  /** Ranked by the minutes waited. */
  reasons: ReasonRow[];
  topWaiting?: ReasonRow; mostFrequent?: ReasonRow;
  stale: number;
  bars: StopBar[];
}

export function callFigures(stops: readonly TimedStop[], wantedMin: number | undefined, t: number): CallFigures {
  const answered = stops.filter(s => s.arrivedAt !== undefined), cleared = stops.filter(s => !s.open);
  const resp = answered.map(s => ((s.arrivedAt as number) - s.at) / MIN), res = cleared.map(s => ((s.fixedAt as number) - s.at) / MIN);
  const out: CallFigures = { calls: stops.length, answered: answered.length, cleared: cleared.length, open: stops.length - cleared.length, typed: cleared.filter(s => s.est).length,
    waitTotalMin: resp.reduce((a, b) => a + b, 0), clearTotalMin: res.reduce((a, b) => a + b, 0), reasons: reasonRows(stops, 'wait'),
    stale: stops.filter(s => s.open && (t - s.at) / HOUR > OPEN_STALE_H).length, bars: barsOf(cleared) };
  if (wantedMin && wantedMin > 0) out.wantedMin = wantedMin;
  if (resp.length) {
    const s = sortedAsc(resp);
    out.respMeanMin = mean(resp); out.respMedianMin = percentile(s, 0.5); out.respMaxMin = s[s.length - 1];
    if (resp.length >= P90_FROM) out.respP90Min = percentile(s, 0.9);
    if (out.wantedMin !== undefined) { out.within = resp.filter(x => x <= (out.wantedMin as number) + 1e-9).length; out.shareWithin = out.within / resp.length; }
  }
  if (res.length) {
    const s = sortedAsc(res);
    out.resMeanMin = mean(res); out.resMedianMin = percentile(s, 0.5); out.resMaxMin = s[s.length - 1];
    if (res.length >= P90_FROM) out.resP90Min = percentile(s, 0.9);
  }
  out.topWaiting = out.reasons[0]?.waitMin ? out.reasons[0] : undefined;
  out.mostFrequent = [...out.reasons].sort((a, b) => b.n - a.n || a.reason.localeCompare(b.reason))[0];
  return out;
}

/** The call count's sentence. */
export function callSays(ev: string, k: CallFigures): Said {
  const evs = plural(ev, k.calls);
  if (!k.calls) return { text: `No ${plural(ev)} yet — tap the button at the machine when one is made.`, tone: 'n' };
  if (!k.answered) return { text: `${k.calls} ${evs}, none with help arrived stamped yet — tap Help arrived when someone comes, Running again when the line runs.`, tone: k.stale ? 'a' : 'n' };
  const tail = k.respP90Min !== undefined ? `, 1 in 10 over ${mins(k.respP90Min)}` : `, slowest ${mins(k.respMaxMin ?? 0)}`;
  let text = `${k.calls} ${evs}: help came in ${mins(k.respMedianMin ?? 0)} typically${tail}`;
  text += k.resMedianMin !== undefined ? `; the line ran again in ${mins(k.resMedianMin)} typically${k.resP90Min !== undefined ? `, 1 in 10 over ${mins(k.resP90Min)}` : ''}.` : '.';
  text += ` ${mins(k.waitTotalMin)} waited in all${k.topWaiting ? ` — ${k.topWaiting.reason}, ${k.topWaiting.n} ${plural(ev, k.topWaiting.n)}, is ${mins(k.topWaiting.waitMin)} of it` : ''}.`;
  if (k.wantedMin !== undefined && k.within !== undefined) text += ` ${k.within} of ${k.answered} answered within the ${k.wantedMin} min wanted.`;
  return { text, tone: k.stale ? 'a' : 'n' };
}

export function callInsights(ev: string, k: CallFigures, listed: boolean): Said[] {
  const out: Said[] = [];
  if (!k.calls) return out;
  const evs = plural(ev);
  if (k.topWaiting && k.mostFrequent) {
    out.push(k.topWaiting.reason === k.mostFrequent.reason
      ? { text: `${k.topWaiting.reason} is both the most frequent and the most waited for — ${k.topWaiting.n} ${plural(ev, k.topWaiting.n)}, ${mins(k.topWaiting.waitMin)}.`, tone: 'n' }
      : { text: `The most waited for is ${k.topWaiting.reason} (${k.topWaiting.n} ${plural(ev, k.topWaiting.n)}, ${mins(k.topWaiting.waitMin)}); the most frequent is ${k.mostFrequent.reason} (${k.mostFrequent.n}, ${mins(k.mostFrequent.waitMin)}). The biggest total, not the most frequent, is first.`, tone: 'n' });
  }
  if (k.wantedMin !== undefined && k.shareWithin !== undefined) {
    out.push({ text: `${k.within} of ${k.answered} answered ${evs} had help within ${k.wantedMin} min (${pct(k.shareWithin)}).`, tone: k.shareWithin < 0.5 ? 'a' : 'n' });
  } else if (k.answered) {
    out.push({ text: `Say how fast help should come (Change what was agreed) to see how many ${evs} were answered in time.`, tone: 'n' });
  }
  if (!listed) out.push({ text: `List the reasons (five to eight) in Change what was agreed to see what the ${evs} are for.`, tone: 'n' });
  if (k.topWaiting && k.topWaiting.n >= 3) out.push({ text: `${k.topWaiting.reason} keeps coming — a recurring reason is a cause to take on: Make it better raises it from here.`, tone: 'n' });
  if (k.typed) out.push({ text: `${k.typed} of the ${k.cleared} times ${k.typed === 1 ? 'was' : 'were'} said, not clocked.`, tone: 'n' });
  if (k.stale) out.push({ text: `${k.stale} ${plural(ev, k.stale)} open for more than ${OPEN_STALE_H} hours — say how long it took, or strike it.`, tone: 'a' });
  out.push({ text: 'Calls are counted by reason and by shift, never by person.', tone: 'n' });
  return out;
}

/** The two tiles a call count adds: help in, and cleared in. */
export function callTiles(ev: string, k: CallFigures): LeanTile[] {
  if (!k.answered) return [{ k: 'Help in', v: '—', of: k.calls ? 'stamp Help arrived on a call' : `no ${plural(ev)} yet` }, { k: 'Cleared in', v: '—', of: 'stamp Running again on a call' }];
  const share = k.wantedMin !== undefined && k.within !== undefined ? ` · ${k.within} of ${k.answered} within ${k.wantedMin} min` : '';
  return [
    { k: 'Help in', v: mins(k.respMedianMin ?? 0), of: `typical · mean ${mins(k.respMeanMin ?? 0)} · ${k.respP90Min !== undefined ? `1 in 10 over ${mins(k.respP90Min)}` : `slowest ${mins(k.respMaxMin ?? 0)}`}${share}`,
      ...(k.shareWithin !== undefined && k.shareWithin < 0.5 ? { tone: 'a' as LeanTone } : {}) },
    k.resMedianMin !== undefined
      ? { k: 'Cleared in', v: mins(k.resMedianMin), of: `the line running again, typical · ${k.resP90Min !== undefined ? `1 in 10 over ${mins(k.resP90Min)}` : `longest ${mins(k.resMaxMin ?? 0)}`} · ${k.cleared} of ${k.calls} cleared` }
      : { k: 'Cleared in', v: '—', of: 'stamp Running again on a call' },
  ];
}

/* ------------------------------------------------------------------ by shift */

/** The line's shifts as the settings keep them: a name and clock times. */
export interface ShiftTimes { name?: string; start?: string; end?: string }
const clock = (t?: string): number | undefined => { const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim()); return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : undefined; };

/** The shift whose clock times contain a moment's time of day (overnight shifts
 *  too); undefined with no shift containing it. */
export function shiftAt(shifts: readonly ShiftTimes[], ms: number): string | undefined {
  const d = new Date(ms), m = d.getHours() * 60 + d.getMinutes();
  for (let i = 0; i < shifts.length; i++) {
    const a = clock(shifts[i].start), b = clock(shifts[i].end);
    if (a === undefined || b === undefined || a === b) continue;
    if (a < b ? m >= a && m < b : m >= a || m < b) return shifts[i].name?.trim() || `Shift ${i + 1}`;
  }
  return undefined;
}

/** The calls by the line's shifts — only where the line has two or more with
 *  clock times; a call in none of them is said under "outside the shifts". */
export function callsByShift(stops: readonly TimedStop[], shifts: readonly ShiftTimes[] | undefined): ShiftRow[] {
  const usable = (shifts ?? []).filter(s => clock(s.start) !== undefined && clock(s.end) !== undefined);
  if (usable.length < 2) return [];
  const m = new Map<string, TimedStop[]>();
  for (const s of stops) { const k = shiftAt(usable, s.at) ?? 'outside the shifts'; m.set(k, [...(m.get(k) ?? []), s]); }
  const order = [...usable.map((s, i) => s.name?.trim() || `Shift ${i + 1}`), 'outside the shifts'];
  return order.filter(k => m.has(k)).map(k => {
    const xs = m.get(k) as TimedStop[], resp = xs.filter(s => s.arrivedAt !== undefined).map(s => ((s.arrivedAt as number) - s.at) / MIN);
    return { name: k, calls: xs.length, answered: resp.length, ...(resp.length >= 3 ? { respMedianMin: median(resp) } : {}) };
  });
}
