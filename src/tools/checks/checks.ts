/* THE CHECK LOG'S ARITHMETIC (knowledge/specs/FC-236-check-logs.md) — what is due, done, missed or failed, and what
 * a failure holds. Pure: a log's checks and its results in, the states out; nothing here is stored.
 *
 * THE RULE FOR "EVERY HOUR" is the floor's: no gap between two checks longer than the hour, with a grace. A check
 * every interval I is due I after the last one was done (the first is due when the log began); it is done on time
 * if it is done by its due moment plus a GRACE, and missed once the grace has passed. The grace is a quarter of the
 * interval, at least 5 minutes and at most 12 hours (Faultline's choice, said on the page). A check done early
 * meets the due moment it is early for, and the next is due an interval after it — the schedule follows the floor.
 *
 *   done      green   more than a grace before its next due moment
 *   soon      amber   within a grace before it
 *   due       amber   past the due moment, still inside the grace
 *   overdue   red     the grace has passed; the due moment is missed until it is done
 *   failed    red     the last result failed and nothing since has passed
 *   event     grey    done when something happens (start-up, a changeover, a trigger) — never overdue
 *   off       grey    taken off the list
 *
 * Compliance counts each due moment once: met on time, or missed. A failure holds the product made since the last
 * good check (a re-test that fails again holds nothing more — the line was stopped). */
import type { AgreedLog, LogCheck, LogFreq, LogResult } from '../../lib/study';
import { mannKendall } from '../../lib/ie/charts';
import type { LogDef } from './def';
import { findingBelowOf, scoreOf } from './scoring';

export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export const DEFAULT_SHIFT_HOURS = 8;

/** The gap between two due moments, in ms; undefined for a check done when something happens. */
export function intervalOf(f: LogFreq, shiftHours = DEFAULT_SHIFT_HOURS): number | undefined {
  if (!('every' in f) || !(f.every > 0)) return undefined;
  const unit = f.unit === 'min' ? MIN : f.unit === 'hour' ? HOUR : f.unit === 'shift' ? shiftHours * HOUR : f.unit === 'day' ? DAY : 7 * DAY;
  return f.every * unit;
}

/** A quarter of the interval, at least 5 minutes, at most 12 hours. */
export const graceOf = (interval: number): number => Math.min(Math.max(interval / 4, 5 * MIN), 12 * HOUR);

/** "every hour", "every 30 minutes", "every shift", "at start-up", "after a changeover". */
export function freqWords(f: LogFreq): string {
  if ('when' in f) return f.when === 'startup' ? 'at start-up' : f.when === 'changeover' ? 'after a changeover' : f.note?.trim() ? `when ${f.note.trim()}` : 'when it is triggered';
  const one = { min: 'minute', hour: 'hour', shift: 'shift', day: 'day', week: 'week' }[f.unit];
  return f.every === 1 ? `every ${one}` : `every ${f.every} ${one}s`;
}

export const FREQ_UNITS: { unit: 'min' | 'hour' | 'shift' | 'day' | 'week'; one: string; many: string }[] = [
  { unit: 'min', one: 'minute', many: 'minutes' }, { unit: 'hour', one: 'hour', many: 'hours' }, { unit: 'shift', one: 'shift', many: 'shifts' },
  { unit: 'day', one: 'day', many: 'days' }, { unit: 'week', one: 'week', many: 'weeks' },
];

/* --------------------------------------------------------------------------------- words for time */

/** "35 min", "1 h 5 min", "2 days" — a length of time as a person says it. */
export function span(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; }
  const d = Math.round(m / 1440);
  return `${d} days`;
}

/** A moment: "09:10" today, "Tue 14:05" within the week, "14 Oct 09:10" before. */
export function when(ms: number, ref: number = Date.now()): string {
  const d = new Date(ms), r = new Date(ref);
  const clock = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(r) - day(d)) / DAY);
  if (diff === 0) return clock;
  if (diff === 1) return `yesterday ${clock}`;
  if (diff === -1) return `tomorrow ${clock}`;
  if (Math.abs(diff) < 7) return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${clock}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${clock}`;
}

/* --------------------------------------------------------------------------------- results and verdicts */

/** The results of one check that stand: not struck, in the order they were done. */
export const resultsOf = (results: readonly LogResult[] | undefined, checkId?: string): LogResult[] =>
  (results ?? []).filter(r => !r.struck && (checkId === undefined || r.checkId === checkId)).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

export type Verdict = 'good' | 'bad' | 'info';

/** Did this result pass? A value inside its limits, a score at or over the agreed one, a count at its target;
 *  with nothing agreed to judge it against, it is recorded and not judged ('info'). */
export function verdictOf(c: LogCheck, r: LogResult, def?: Pick<LogDef, 'scale' | 'scoreRule'>): Verdict {
  if (r.outcome === 'fail') return 'bad';
  if (c.kind === 'passfail') return r.outcome === 'pass' ? 'good' : 'info';
  if (c.kind === 'value') {
    if (typeof r.value !== 'number' || (c.lo === undefined && c.hi === undefined)) return 'info';
    return (c.lo !== undefined && r.value < c.lo) || (c.hi !== undefined && r.value > c.hi) ? 'bad' : 'good';
  }
  if (c.kind === 'scored') {
    if (!def?.scale || c.passPct === undefined) return 'info';
    const f = scoreOf(r, def.scale, def.scoreRule, findingBelowOf(c, def.scale));
    return f?.pct === undefined ? 'info' : f.pct >= c.passPct ? 'good' : 'bad';
  }
  if (typeof r.count !== 'number' || c.target === undefined) return 'info';
  return r.count >= c.target ? 'good' : 'bad';
}

/* --------------------------------------------------------------------------------- the state of a check now */

export type StateKey = 'done' | 'soon' | 'due' | 'overdue' | 'failed' | 'event' | 'off';
export type Tone = 'g' | 'a' | 'r' | 'n';

export interface CheckState {
  check: LogCheck;
  key: StateKey;
  tone: Tone;
  last?: LogResult;
  lastGood?: LogResult;
  /** When it is next due (undefined for an event, or off). */
  nextDue?: number;
  /** How long past its due moment, when it is. */
  lateMs?: number;
  verdict?: Verdict;
  /** In words, for the round: "Overdue by 35 min — last done 08:05". */
  words: string;
}

export const sinceOf = (log: Pick<AgreedLog, 'since'>, c: Pick<LogCheck, 'addedAt'>): number => c.addedAt ?? log.since;

export function checkState(c: LogCheck, log: Pick<AgreedLog, 'since' | 'shiftHours'>, results: readonly LogResult[] | undefined, now: number, def?: Pick<LogDef, 'scale' | 'scoreRule'>): CheckState {
  if (c.removed) return { check: c, key: 'off', tone: 'n', words: 'Taken off the list' };
  const mine = resultsOf(results, c.id);
  const last = mine[mine.length - 1];
  const lastGood = [...mine].reverse().find(r => verdictOf(c, r, def) !== 'bad');
  const verdict = last ? verdictOf(c, last, def) : undefined;
  const base = { check: c, ...(last ? { last } : {}), ...(lastGood ? { lastGood } : {}), ...(verdict ? { verdict } : {}) };
  const I = intervalOf(c.when, log.shiftHours);
  if (verdict === 'bad' && last) return { ...base, key: 'failed', tone: 'r', words: `Failed ${when(last.at, now)}${last.by ? ` (${last.by})` : ''} — not yet checked again` };
  if (I === undefined) {
    return { ...base, key: 'event', tone: 'n', words: last ? `Last done ${when(last.at, now)}${last.by ? ` by ${last.by}` : ''}` : 'Not done yet' };
  }
  const G = graceOf(I);
  const due = last ? last.at + I : sinceOf(log, c);
  const late = now - due;
  if (late > G) return { ...base, key: 'overdue', tone: 'r', nextDue: due, lateMs: late, words: `Overdue by ${span(late)}${last ? ` — last done ${when(last.at, now)}` : ' — not done yet'}` };
  if (late >= 0) return { ...base, key: 'due', tone: 'a', nextDue: due, lateMs: late, words: last ? `Due now — last done ${when(last.at, now)}` : 'Due now — not done yet' };
  if (-late <= G) return { ...base, key: 'soon', tone: 'a', nextDue: due, words: `Due at ${when(due, now)}, in ${span(-late)}` };
  return { ...base, key: 'done', tone: 'g', nextDue: due, words: last ? `Done ${when(last.at, now)}${last.by ? ` by ${last.by}` : ''} — next ${when(due, now)}` : `Next ${when(due, now)}` };
}

/** WHAT TO DO NOW — the checks that want doing first (overdue, failed, due, soon), then those done, then those done when something happens. */
export interface Round {
  /** Want doing now: the most overdue first, then failed, due and soon. */
  now: CheckState[];
  /** Done, the soonest due first. */
  later: CheckState[];
  /** Done when something happens. */
  events: CheckState[];
  off: CheckState[];
}

const URGENCY: Record<StateKey, number> = { overdue: 0, failed: 1, due: 2, soon: 3, done: 4, event: 5, off: 6 };

export function roundOf(log: AgreedLog, results: readonly LogResult[] | undefined, now: number, def?: Pick<LogDef, 'scale' | 'scoreRule'>): Round {
  const all = log.checks.map(c => checkState(c, log, results, now, def));
  const by = (a: CheckState, b: CheckState) => URGENCY[a.key] - URGENCY[b.key] || (b.lateMs ?? 0) - (a.lateMs ?? 0) || (a.nextDue ?? 0) - (b.nextDue ?? 0);
  return {
    now: all.filter(s => ['overdue', 'failed', 'due', 'soon'].includes(s.key)).sort(by),
    later: all.filter(s => s.key === 'done').sort(by),
    events: all.filter(s => s.key === 'event'),
    off: all.filter(s => s.key === 'off'),
  };
}

/* --------------------------------------------------------------------------------- compliance */

export interface Compliance {
  /** Due moments decided in the period: met on time + missed. */
  expected: number;
  onTime: number;
  missed: number;
  /** onTime ÷ expected, in % — undefined when nothing was due. */
  pct?: number;
  /** The longest gap between two checks (or the start, a check, and now) in the period, minutes. */
  longestGapMin?: number;
}

/** One check's compliance in [from, to]: each due moment counted once, when it is decided — met by a result, or
 *  missed when its grace passes. Event checks have no due moments (expected 0). */
export function complianceOf(c: LogCheck, log: Pick<AgreedLog, 'since' | 'shiftHours'>, results: readonly LogResult[] | undefined, from: number, to: number): Compliance {
  const I = intervalOf(c.when, log.shiftHours);
  const start = sinceOf(log, c);
  if (I === undefined || c.removed) return { expected: 0, onTime: 0, missed: 0 };
  const G = graceOf(I);
  const mine = resultsOf(results, c.id).filter(r => r.at >= start && r.at <= to);
  let d = start, expected = 0, onTime = 0, missed = 0;
  for (const r of mine) {
    while (d + G < r.at) { const decided = d + G; if (decided >= from && decided <= to) { expected++; missed++; } d += I; }
    if (r.at >= from) { expected++; onTime++; }
    d = r.at + I;
  }
  while (d + G < to) { const decided = d + G; if (decided >= from) { expected++; missed++; } d += I; }
  /* the longest the line ran with this check not done, inside the period */
  const marks = [Math.max(start, from), ...mine.filter(r => r.at >= from).map(r => r.at), to];
  let gap = 0;
  for (let i = 1; i < marks.length; i++) gap = Math.max(gap, marks[i] - marks[i - 1]);
  return { expected, onTime, missed, ...(expected > 0 ? { pct: (onTime / expected) * 100 } : {}), longestGapMin: Math.round(gap / MIN) };
}

/** Every check's compliance added: due moments, met, missed. */
export function logCompliance(log: AgreedLog, results: readonly LogResult[] | undefined, from: number, to: number): Compliance {
  let expected = 0, onTime = 0, missed = 0, gap = 0;
  for (const c of log.checks) {
    const k = complianceOf(c, log, results, from, to);
    expected += k.expected; onTime += k.onTime; missed += k.missed; gap = Math.max(gap, k.longestGapMin ?? 0);
  }
  return { expected, onTime, missed, ...(expected > 0 ? { pct: (onTime / expected) * 100 } : {}), ...(gap ? { longestGapMin: gap } : {}) };
}

/* --------------------------------------------------------------------------------- failures and what they hold */

export interface Failure {
  check: LogCheck;
  result: LogResult;
  /** When the product at risk began: the last good check, else the log's start. */
  from: number;
  /** Minutes since then — 0 for a re-test that failed again (the line was stopped). */
  windowMin: number;
  /** No good check had been done yet: the window runs from the start of the log. */
  noGoodYet: boolean;
  /** A re-test that fails again continues the failure before it (its result id). */
  continues?: string;
}

/** Every failure of one check, with the window it holds. A run of failures with no good check between is one hold. */
export function failuresOf(c: LogCheck, log: Pick<AgreedLog, 'since'>, results: readonly LogResult[] | undefined, def?: Pick<LogDef, 'scale' | 'scoreRule'>): Failure[] {
  const out: Failure[] = [];
  let lastGood: LogResult | undefined, open: Failure | undefined;
  for (const r of resultsOf(results, c.id)) {
    const v = verdictOf(c, r, def);
    if (v === 'bad') {
      if (open) { out.push({ check: c, result: r, from: open.from, windowMin: 0, noGoodYet: open.noGoodYet, continues: open.result.id }); continue; }
      const from = lastGood?.at ?? sinceOf(log, c);
      open = { check: c, result: r, from, windowMin: Math.max(0, Math.round((r.at - from) / MIN)), noGoodYet: !lastGood };
      out.push(open);
    } else { lastGood = r; open = undefined; }
  }
  return out;
}

export function logFailures(log: AgreedLog, results: readonly LogResult[] | undefined, def?: Pick<LogDef, 'scale' | 'scoreRule'>): Failure[] {
  return log.checks.flatMap(c => failuresOf(c, log, results, def)).sort((a, b) => b.result.at - a.result.at);
}

/** What a clean record proves (knowledge/methods/foodsafety/metal-detection-verification.md, "Procedure"): n checks
 *  with none failed, at most this share could fail, at the confidence given — 1 − (1 − conf)^(1/n), the exact bound
 *  for zero failures (≈ 3/n at 95%). */
export const cleanBound = (n: number, conf = 0.95): number | undefined => (n >= 1 ? 1 - Math.pow(1 - conf, 1 / n) : undefined);

/* --------------------------------------------------------------------------------- a value, trended */

export interface ValueTrend {
  n: number;
  points: { at: number; v: number; bad: boolean }[];
  latest?: number;
  /** How far the latest is from the nearer limit, as a share of the band between them — both limits needed. */
  headroomPct?: number;
  /** Within NEARING_PCT of a limit, still inside it. */
  nearing?: 'lo' | 'hi';
  /** Mann–Kendall and Sen's slope from 8 readings: which way it is going, a reading at a time. */
  trend?: { dir: 'up' | 'down' | 'flat'; slope: number; p: number };
}

/** Within this share of the band of a limit the reading is "nearing" it (Faultline's choice, 15%). */
export const NEARING_PCT = 15;

export function valueTrend(c: LogCheck, results: readonly LogResult[] | undefined): ValueTrend {
  const pts = resultsOf(results, c.id).filter(r => typeof r.value === 'number').map(r => ({ at: r.at, v: r.value as number, bad: verdictOf(c, r) === 'bad' }));
  const latest = pts[pts.length - 1]?.v;
  const out: ValueTrend = { n: pts.length, points: pts, ...(latest !== undefined ? { latest } : {}) };
  if (latest !== undefined && c.lo !== undefined && c.hi !== undefined && c.hi > c.lo) {
    const room = Math.min(c.hi - latest, latest - c.lo);
    out.headroomPct = (room / (c.hi - c.lo)) * 100;
    if (room >= 0 && out.headroomPct <= NEARING_PCT) out.nearing = c.hi - latest <= latest - c.lo ? 'hi' : 'lo';
  }
  const mk = mannKendall(pts.map(p => p.v));
  if (mk) out.trend = { dir: mk.p < 0.05 ? (mk.slope > 0 ? 'up' : mk.slope < 0 ? 'down' : 'flat') : 'flat', slope: mk.slope, p: mk.p };
  return out;
}

/** "62 °C — 14% of the band from the upper limit, rising 1.3 °C a reading". */
export function valueSays(c: LogCheck, t: ValueTrend): string | undefined {
  if (t.latest === undefined) return undefined;
  const u = c.unit ? ` ${c.unit}` : '';
  const parts = [`${+t.latest.toFixed(2)}${u}`];
  if (t.headroomPct !== undefined) parts.push(t.nearing ? `${Math.round(t.headroomPct)}% of the band from the ${t.nearing === 'hi' ? 'upper' : 'lower'} limit` : `${Math.round(t.headroomPct)}% of the band clear of the nearer limit`);
  if (t.trend && t.trend.dir !== 'flat') parts.push(`${t.trend.dir === 'up' ? 'rising' : 'falling'} ${+Math.abs(t.trend.slope).toFixed(2)}${u} a reading`);
  return parts.join(' — ');
}

/* --------------------------------------------------------------------------------- the list, checked */

/** Is the check as agreed fit to be done? A problem in words, or none. */
export function checkProblem(c: Partial<LogCheck>): string | undefined {
  if (!c.name?.trim()) return 'Say what is checked.';
  if (c.when && 'every' in c.when && !(c.when.every > 0 && Number.isFinite(c.when.every))) return 'Say how often — a number above zero.';
  if (c.kind === 'value' && c.lo !== undefined && c.hi !== undefined && c.lo > c.hi) return 'The lower limit is above the upper one.';
  if (c.kind === 'scored' && !(c.items ?? []).length) return 'A scored checklist needs its questions.';
  if (c.kind === 'scored' && c.passPct !== undefined && !(c.passPct >= 0 && c.passPct <= 100)) return 'The score to reach is a percentage, 0 to 100.';
  if (c.kind === 'count' && c.target !== undefined && !(c.target >= 0)) return 'The target is a number, 0 or more.';
  return undefined;
}
