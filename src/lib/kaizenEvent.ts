/* THE KAIZEN EVENT, AS ONE MODULE (docs/METHODS.md §16; knowledge/methods/lean/kaizen-event.md) — the week as day columns, each day
 * with what was seen, what was changed and the measure at the day's close, then the 30-day check. The screen (project/method/shapes/
 * kaizen-event) and the paper (lib/report/kaizenPaper) both read this, so they cannot part. Pure.
 *
 * Where it is kept: answers of the method's sheet (lib/methodSheet), a day's three as `day-see@n`, `day-change@n`, `day-measure@n`
 * (n = 1…, extra rows scoped method:kaizen-event:<field>@<n>), the start of the week as `start` (an ISO day), the check as
 * `check-date` and `check-verdict`, the readings since the week as `check-readings` and which way is better as `better`
 * (knowledge/specs/FC-016-kaizen-event.md). Nothing new is stored. */
import { addDays } from './weeks';
import { relate } from './ie/relate';

export type Answers = Readonly<Record<string, string>>;
const has = (s: string | undefined) => (s ?? '').trim() !== '';

/** A usual week has five days; a day more may be added up to a week. */
export const USUAL_DAYS = 5;
export const MOST_DAYS = 7;

/** How a week usually runs, as practice frames it (Laraia, Moody and Hall, The Kaizen Blitz) — a prompt, never a rule. */
export const RHYTHM: readonly string[] = [
  'Learn the process and take the baseline.',
  'Watch the waste, find the causes, collect ideas.',
  'Try the changes on the floor.',
  'Measure again, fix, write the new way.',
  'Train the people, report out, list what stays open.',
  'Carry on the open changes.',
  'Hold the new way.',
];

export interface EventDay {
  n: number;
  /** The date, when the start is given (weekends skipped). */
  iso?: string;
  see: string; change: string; measure: string;
  /** In words — never colour alone. */
  word: 'Not written' | 'Under way' | 'Written';
  hint: string;
}
export const dayFields = (n: number) => ({ see: `day-see@${n}`, change: `day-change@${n}`, measure: `day-measure@${n}` });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).getDay();
/** The next working day on or after `iso`. */
const working = (iso: string): string => { let d = iso; while (weekday(d) === 0 || weekday(d) === 6) d = addDays(d, 1); return d; };
/** The dates of `count` working days from `start`. */
export function dayDates(start: string | undefined, count: number): (string | undefined)[] {
  if (!start || !ISO.test(start)) return Array.from({ length: count }, () => undefined);
  const out: string[] = [];
  let d = working(start);
  for (let i = 0; i < count; i++) { out.push(d); d = working(addDays(d, 1)); }
  return out;
}

/** How many day columns are drawn: the usual five, more when a later day holds words or one was added. */
export function dayCount(a: Answers, added = 0): number {
  let top = USUAL_DAYS;
  for (let n = 1; n <= MOST_DAYS; n++) { const k = dayFields(n); if (has(a[k.see]) || has(a[k.change]) || has(a[k.measure])) top = Math.max(top, n); }
  return Math.min(MOST_DAYS, Math.max(top, USUAL_DAYS + added));
}

export function daysOf(a: Answers, added = 0): EventDay[] {
  const count = dayCount(a, added);
  const dates = dayDates(a['start'], count);
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1, k = dayFields(n);
    const see = (a[k.see] ?? '').trim(), change = (a[k.change] ?? '').trim(), measure = (a[k.measure] ?? '').trim();
    const w = [see, change, measure].filter(Boolean).length;
    return { n, ...(dates[i] ? { iso: dates[i] } : {}), see, change, measure, word: w === 0 ? 'Not written' : w === 3 ? 'Written' : 'Under way', hint: RHYTHM[i] ?? '' };
  });
}

export const VERDICTS = ['Holding', 'Slipping', 'Lost'] as const;
export type Verdict = typeof VERDICTS[number];
export const verdictTone = (v: Verdict): 'g' | 'a' | 'r' => (v === 'Holding' ? 'g' : v === 'Slipping' ? 'a' : 'r');

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayWords = (iso: string, withWeekday = false): string => {
  const d = new Date(`${iso}T12:00:00`);
  return `${withWeekday ? `${WEEKDAY[d.getDay()]} ` : ''}${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
export const between = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);

export interface Check {
  date?: string;
  /** The day it is suggested for: thirty days after the last day of the week, moved to the next working day. */
  suggested?: string;
  verdict?: Verdict;
  /** Where the check stands against today, in words. */
  says: string;
  tone: 'g' | 'a' | 'r' | 'n';
  /** The open actions and the measure at 30 days, as written under Sustain. */
  open: string; holding: string;
}
export function checkOf(a: Answers, today: string): Check {
  const days = daysOf(a);
  const last = days[days.length - 1]?.iso;
  const lastWithWords = [...days].reverse().find(d => d.word !== 'Not written')?.iso;
  const base = a['start'] && ISO.test(a['start']) ? (days[USUAL_DAYS - 1]?.iso ?? last) : undefined;
  const suggested = base ? working(addDays(lastWithWords && lastWithWords > base ? lastWithWords : base, 30)) : undefined;
  const date = ISO.test(a['check-date'] ?? '') ? a['check-date'] : undefined;
  const v = (VERDICTS as readonly string[]).includes(a['check-verdict'] ?? '') ? (a['check-verdict'] as Verdict) : undefined;
  const open = (a['open'] ?? '').trim(), holding = (a['holding'] ?? '').trim();
  const out = { ...(date ? { date } : {}), ...(suggested ? { suggested } : {}), ...(v ? { verdict: v } : {}), open, holding };
  if (v) return { ...out, says: `The 30-day check${date ? ` (${dayWords(date)})` : ''}: ${v.toLowerCase()}.`, tone: verdictTone(v) };
  if (!date) return { ...out, says: suggested ? `The 30-day check is not booked. Thirty days after the week is ${dayWords(suggested, true)}.` : 'The 30-day check is not booked — give the week’s first day, or a date.', tone: 'a' };
  const d = between(today, date);
  if (d < 0) return { ...out, says: `The 30-day check was due ${dayWords(date)} — ${-d} day${d === -1 ? '' : 's'} ago — and is not recorded.`, tone: 'r' };
  return { ...out, says: d === 0 ? 'The 30-day check is today.' : `The 30-day check is on ${dayWords(date, true)} — in ${d} day${d === 1 ? '' : 's'}.`, tone: 'n' };
}

/** The line under the board: where the week stands. */
export function eventSays(a: Answers, today: string): string {
  const days = daysOf(a);
  const written = days.filter(d => d.word === 'Written').length;
  const some = days.filter(d => d.word === 'Under way').length;
  const wk = `${written} of ${days.length} days written${some ? `, ${some} under way` : ''}`;
  return `${wk}. ${checkOf(a, today).says}`;
}

/** Is there anything to put on paper? */
export const anythingWritten = (a: Answers): boolean => Object.values(a).some(has);

/** Where the week itself stands against today: has it begun, is it over, which of its days passed with nothing written. */
export interface WeekState {
  started: boolean;
  /** The usual five days are behind us (needs the first day given). */
  ended: boolean;
  /** The last of the usual five days. */
  endDay?: string;
  /** Days whose date has passed and that hold no words — only when the first day is given. */
  missed: EventDay[];
}
export function weekOf(a: Answers, today: string): WeekState {
  const days = daysOf(a);
  const first = days[0]?.iso;
  const endDay = a['start'] && ISO.test(a['start']) ? days[USUAL_DAYS - 1]?.iso : undefined;
  const written = days.some(d => d.word !== 'Not written');
  const started = (!!first && first <= today) || written;
  const ended = !!endDay && endDay < today;
  const missed = days.filter(d => !!d.iso && d.iso < today && d.word === 'Not written');
  return { started, ended, ...(endDay ? { endDay } : {}), missed };
}

/** The event's actions as the sponsor reads them (docs: knowledge/methods/lean/kaizen-event.md — raised, closed, open, the share
 *  closed; an open one past its day is late; one nobody owns is the usual failure). Method answers are not actions. */
export interface ActionsState {
  raised: number; closed: number; open: number; late: number; noOwner: number;
  /** Whole percent closed of raised; null when none was raised. */
  share: number | null;
}
export interface OwedLike { kind: string; what: string; owner?: string; due?: string; doneAt?: number | null; testId?: string }
export function actionsOf(owed: readonly OwedLike[], today: string): ActionsState {
  const all = owed.filter(i => (i.kind === 'next' || i.kind === 'found') && !(i.testId ?? '').startsWith('method:'));
  const open = all.filter(i => !i.doneAt);
  const closed = all.length - open.length;
  return {
    raised: all.length, closed, open: open.length,
    late: open.filter(i => !!i.due && i.due < today).length,
    noOwner: open.filter(i => !(i.owner ?? '').trim()).length,
    share: all.length ? Math.round((closed / all.length) * 100) : null,
  };
}

/** What the event's money does not cover — said on the report and the paper (knowledge/STANDARD.md: a narrow tool says its scope; the
 *  event's own cost is knowledge/MONEY.md's FC-016 row, not built — knowledge/specs/FC-016-kaizen-event.md). */
export const OWN_COST = 'The week’s own cost — the people released × the days × the line’s rate — is not worked out here.';

/* IS THE GAIN HOLDING — the readings since the week, read for a trend (knowledge/methods/lean/kaizen-event.md: "the readings between the
 * event and the 30-day check … a trend back toward the baseline (Spearman's ρ on the order …) is the warning before the gain is gone";
 * knowledge/specs/FC-016-kaizen-event.md). The readings are typed in the order they were taken; Spearman's ρ of them against their order,
 * with its two-sided p from Student's t on n − 2 — lib/ie/relate, the function the Analysis uses (FC-109), as SciPy's spearmanr. A trend is
 * said at p < 0.05 (the 5% the team's weekly number uses, FC-117), never from fewer than four readings. Which way is better is the person's
 * tap, never guessed. The verdict stays the team's word; this is advice beside it. */
export const BETTER = ['lower', 'higher'] as const;
export type Better = typeof BETTER[number];
export const BETTER_WORD: Record<Better, string> = { lower: 'Lower is better', higher: 'Higher is better' };
/** The fewest readings a trend is read from (relate's own floor). */
export const TREND_MIN = 4;
export interface Holding {
  values: number[];
  /** Words among the readings that are not numbers — named, left out, never guessed. */
  bad: string[];
  n: number; mean?: number; rho?: number; p?: number;
  trend: 'empty' | 'few' | 'flat' | 'none' | 'rising' | 'falling';
  better?: Better;
  /** Against which way is better — absent when no trend, or no way said. */
  way?: 'right' | 'wrong';
  says: string;
  /** Amber is the warning (creeping back); a quiet green the right way; neutral otherwise. */
  tone: 'g' | 'a' | 'n';
}
const NUM = /^[-+]?\d+(?:\.\d+)?$/;
/** The readings as typed: numbers separated by commas, semicolons, spaces or lines. */
export function readingsOf(text: string | undefined): { values: number[]; bad: string[] } {
  const values: number[] = [], bad: string[] = [];
  for (const tok of (text ?? '').split(/[\s,;]+/)) {
    if (!tok) continue;
    if (NUM.test(tok)) values.push(Number(tok)); else if (!bad.includes(tok)) bad.push(tok);
  }
  return { values, bad };
}
const say1 = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 1 });
const sayP = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(p < 0.01 ? 3 : 2));
export function holdingOf(a: Answers): Holding {
  const { values, bad } = readingsOf(a['check-readings']);
  const better = (BETTER as readonly string[]).includes(a['better'] ?? '') ? (a['better'] as Better) : undefined;
  const n = values.length;
  const base = { values, bad, n, ...(better ? { better } : {}) };
  const left = bad.length ? ` Left out, not a number: ${bad.join(', ')}.` : '';
  if (!n) return { ...base, trend: 'empty', tone: 'n', says: `No readings since the week are written yet — type the measure as it has been taken since, in order, to see whether the gain is holding.${left}` };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const lead = `${n} reading${n === 1 ? '' : 's'} since the week`;
  if (n < TREND_MIN) return { ...base, mean, trend: 'few', tone: 'n', says: `${lead} (mean ${say1(mean)}) — a trend needs ${TREND_MIN} or more.${left}` };
  if (values.every(v => v === values[0])) return { ...base, mean, trend: 'flat', tone: 'n', says: `${lead}, all ${say1(values[0])} — no trend.${left}` };
  const l = relate(values.map((_, i) => i + 1), values, 0.95);
  if (!l) return { ...base, mean, trend: 'none', tone: 'n', says: `${lead}: mean ${say1(mean)}.${left}` };
  const stat = `Spearman’s ρ ${l.rho.toFixed(2)} on their order, p ${sayP(l.pRho)}`;
  if (!(l.pRho < 0.05)) return { ...base, mean, rho: l.rho, p: l.pRho, trend: 'none', tone: 'n', says: `${lead}: mean ${say1(mean)}, no steady trend (${stat}).${left}` };
  const trend = l.rho > 0 ? 'rising' : 'falling';
  const way = better ? ((trend === 'rising') === (better === 'higher') ? 'right' : 'wrong') : undefined;
  const reading = way === 'wrong' ? ' — the wrong way for this measure: the gain is creeping back.' : way === 'right' ? ' — the right way for this measure.' : ' — say which way is better for this measure to read it.';
  return { ...base, mean, rho: l.rho, p: l.pRho, trend, ...(way ? { way } : {}), tone: way === 'wrong' ? 'a' : way === 'right' ? 'g' : 'n', says: `${lead}: mean ${say1(mean)}, ${trend} (${stat})${reading}${left}` };
}
