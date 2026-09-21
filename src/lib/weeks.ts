/* THE WEEKS ACROSS THE TOP.
 *
 * The grid is what makes a plan readable — weeks along the top, each row going
 * green from the week its thing lands. Materials had it first. Programs want
 * exactly the same picture, for the same reason: a line is waiting on two kinds
 * of thing and nobody should have to learn two pictures.
 *
 * So the columns live here rather than in either of them. One set of weeks, one
 * definition of "the Monday of", one bound on how wide a grid may get.
 */

/** Today, as an ISO date, in the reader's own zone — a delivery lands on a DAY,
 *  and `toISOString()` in Manchester rolls to tomorrow all summer evening. */
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole days between two ISO dates. Dates, not timestamps: a delivery is late
 *  by days, and an hour either side of midnight must not change the answer. */
export function daysBetween(fromISO: string, toISO: string): number {
  const d = (s: string) => Date.parse(s + 'T12:00:00');
  return Math.round((d(toISO) - d(fromISO)) / 86_400_000);
}

export interface Week {
  /** ISO date of the Monday. */
  start: string;
  /** ISO date of the Sunday — a date on it is inside this week. */
  end: string;
  /** "WK3" — which Monday of its month this is. */
  label: string;
  /** "September" — printed once, over the run of weeks that share it. */
  month: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** The Monday of the week an ISO date falls in. */
export function mondayOf(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const back = (d.getDay() + 6) % 7;                 // Sunday is 0, and starts no week
  d.setDate(d.getDate() - back);
  return todayISO(d);
}

export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

/** Which Monday of its month a Monday is: the first Monday of that month is 1. */
function weekOfMonth(mondayISO: string): number {
  const d = new Date(mondayISO + 'T12:00:00');
  return Math.floor((d.getDate() - 1) / 7) + 1;
}

/** The columns: from the week we are in now, far enough to cover the last of
 *  the dates given. Bounded at both ends — a grid nobody can read across is not
 *  a picture, and one date typed with the wrong year must not produce a
 *  thousand columns. */
export function weeksFrom(dates: string[], today = todayISO(), least = 6, most = 14): Week[] {
  const start = mondayOf(today);
  const last = dates.slice().sort().slice(-1)[0];
  const needed = last ? Math.floor(daysBetween(start, mondayOf(last)) / 7) + 1 : 0;
  const n = Math.max(least, Math.min(most, needed));

  return Array.from({ length: n }, (_, i) => {
    const s = addDays(start, i * 7);
    const d = new Date(s + 'T12:00:00');
    return { start: s, end: addDays(s, 6), label: `WK${weekOfMonth(s)}`, month: MONTHS[d.getMonth()] };
  });
}

/** The month band across the top of a grid: each month printed once, over the
 *  run of weeks that share it. */
export function monthSpans(weeks: Week[]): { month: string; span: number }[] {
  const out: { month: string; span: number }[] = [];
  for (const w of weeks) {
    const last = out[out.length - 1];
    if (last && last.month === w.month) last.span += 1;
    else out.push({ month: w.month, span: 1 });
  }
  return out;
}

/** Which week a date falls in, or -1. */
export const weekIndexOf = (weeks: Week[], iso?: string): number =>
  iso ? weeks.findIndex(w => iso >= w.start && iso <= w.end) : -1;
