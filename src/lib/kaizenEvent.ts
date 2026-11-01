/* THE KAIZEN EVENT, AS ONE MODULE (docs/METHODS.md §16; knowledge/methods/lean/kaizen-event.md) — the week as day columns, each day
 * with what was seen, what was changed and the measure at the day's close, then the 30-day check. The screen (project/method/shapes/
 * kaizen-event) and the paper (lib/report/kaizenPaper) both read this, so they cannot part. Pure.
 *
 * Where it is kept: answers of the method's sheet (lib/methodSheet), a day's three as `day-see@n`, `day-change@n`, `day-measure@n`
 * (n = 1…, extra rows scoped method:kaizen-event:<field>@<n>), the start of the week as `start` (an ISO day), the check as
 * `check-date` and `check-verdict`. Nothing new is stored. */
import { addDays } from './weeks';

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
const between = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);

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
