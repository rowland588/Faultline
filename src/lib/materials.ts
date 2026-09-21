/* WHAT WE ARE WAITING ON.
 *
 * Rowland's own words for why this exists: "these are the films we require with
 * dates of arrival, or green arrived… this list is used as what we need as a
 * business". It is the sheet a line is actually run off — LINE 2 NEW
 * PERFORATION PLAN — where every row is a film, the column beside it says
 * either "In stock" or the date it is planned for, and the weeks to the right
 * of that date go green.
 *
 * So a material is three facts and nothing else:
 *
 *   WHAT IT IS     "TESC03163A Finest Red 2kg"
 *   WHEN IT IS DUE a date, or nothing, because "no date agreed" is a real state
 *   WHETHER IT IS HERE
 *
 * Everything else is worked out: what is late, what order the list reads in,
 * the counts, and the week-by-week grid that makes the sheet a picture.
 *
 * IT IS NOT A STOCK SYSTEM. No quantities that have to stay correct, no
 * receipting, no part-deliveries. A factory already has a system for that and
 * this is not trying to be it — this is the one question a project asks, which
 * is whether the thing it is waiting for has turned up yet.
 */
import type { ID } from '../types';

export interface Material {
  id: ID;
  projectId: ID;
  /** What it is. The only field that must be filled in. */
  what: string;
  /** How much — free text, "10 reels", because a reel and a roll and a pallet
   *  are not units this app should pretend to understand. */
  howMuch?: string;
  /** Which line it is for. Optional on purpose: half of what a job waits on is
   *  not line-specific, and forcing a line on it would be a lie. */
  lineId?: ID;
  /** Who is bringing it. */
  from?: string;
  /** ISO date it is due. Absent when nobody has given a date. */
  due?: string;

  /* WHETHER IT IS HERE IS STORED, NOT DERIVED FROM A DATE.
   *
   * A sheet that says "In stock" knows the thing is here and does not know when
   * it landed. Deriving "here" from a landing date would have forced a date to
   * be invented for every one of those rows — and an invented date is worse
   * than no date, because it reads as a fact. */
  here?: boolean;
  /** The day it actually landed, when anybody knows it. Marking something in
   *  sets both; an import that only knows "in stock" sets `here` alone. */
  inOn?: string;

  note?: string;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const live = (rows: Material[]): Material[] => rows.filter(m => !m.deletedAt);

/** Today, as an ISO date, in the reader's own zone — a delivery lands on a DAY,
 *  and `toISOString()` in Manchester rolls to tomorrow all summer evening. */
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ================================ where it is =============================== */

export type MaterialState =
  | 'here'      // it has turned up
  | 'late'      // the date has passed and it has not
  | 'waiting'   // due, not yet
  | 'undated';  // needed, and nobody has said when

export function stateOf(m: Material, today = todayISO()): MaterialState {
  if (m.here || m.inOn) return 'here';
  if (!m.due) return 'undated';
  return m.due < today ? 'late' : 'waiting';
}

export const isHere = (m: Material): boolean => !!(m.here || m.inOn);

/** Whole days between two ISO dates. Dates, not timestamps: a delivery is late
 *  by days, and an hour either side of midnight must not change the answer. */
export function daysBetween(fromISO: string, toISO: string): number {
  const d = (s: string) => Date.parse(s + 'T12:00:00');
  return Math.round((d(toISO) - d(fromISO)) / 86_400_000);
}

/** How many days late, or undefined when it is not. */
export function daysLate(m: Material, today = todayISO()): number | undefined {
  return stateOf(m, today) === 'late' && m.due ? daysBetween(m.due, today) : undefined;
}

/** The order the list reads in: what is holding you up, then what is coming,
 *  then what nobody has dated, and last what is already here. Inside each
 *  group, the soonest first. */
export function byUrgency(rows: Material[], today = todayISO()): Material[] {
  const rank: Record<MaterialState, number> = { late: 0, waiting: 1, undated: 2, here: 3 };
  return live(rows).slice().sort((a, b) => {
    const ra = rank[stateOf(a, today)], rb = rank[stateOf(b, today)];
    if (ra !== rb) return ra - rb;
    if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
    if (a.due !== b.due) return a.due ? -1 : 1;
    return a.sort - b.sort || a.what.localeCompare(b.what);
  });
}

export interface Tally { total: number; here: number; waiting: number; late: number; undated: number; nextDue?: string }

/** The counts at the top of the screen and on the report. `waiting` INCLUDES
 *  the late ones — they are still waiting, and a reader who has to add two
 *  numbers to find out how much is outstanding has been given a puzzle. */
export function tally(rows: Material[], today = todayISO()): Tally {
  const all = live(rows);
  const states = all.map(m => stateOf(m, today));
  /* flatMap rather than filter-then-map: the filter proves the date is there
     and the map cannot see that it did, so the pair needs an assertion and this
     does not. */
  const due = all.flatMap((m, i) => (states[i] === 'waiting' && m.due ? [m.due] : [])).sort();
  return {
    total: all.length,
    here: states.filter(s => s === 'here').length,
    waiting: states.filter(s => s === 'waiting' || s === 'late').length,
    late: states.filter(s => s === 'late').length,
    undated: states.filter(s => s === 'undated').length,
    nextDue: due[0],
  };
}

/* ========================= the weeks, across the top ========================
 *
 * What makes the sheet readable is not the list — it is the grid: the weeks
 * across the top, and each row going green from the week its film lands. This
 * is that, worked out rather than coloured in by hand.
 */

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

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

/** Which Monday of its month a Monday is: the first Monday of that month is 1. */
function weekOfMonth(mondayISO: string): number {
  const d = new Date(mondayISO + 'T12:00:00');
  return Math.floor((d.getDate() - 1) / 7) + 1;
}

/** The columns: from the week we are in now, far enough to cover the last thing
 *  anybody is waiting for. Bounded at both ends — a grid nobody can read across
 *  is not a picture, and one date typed with the wrong year must not produce a
 *  thousand columns. */
export function weeksFor(rows: Material[], today = todayISO(), least = 6, most = 14): Week[] {
  const start = mondayOf(today);
  const dues = live(rows).flatMap(m => (!isHere(m) && m.due ? [m.due] : []));
  const last = dues.sort().slice(-1)[0];
  const needed = last ? Math.floor(daysBetween(start, mondayOf(last)) / 7) + 1 : 0;
  const n = Math.max(least, Math.min(most, needed));

  return Array.from({ length: n }, (_, i) => {
    const s = addDays(start, i * 7);
    const d = new Date(s + 'T12:00:00');
    return { start: s, end: addDays(s, 6), label: `WK${weekOfMonth(s)}`, month: MONTHS[d.getMonth()] };
  });
}

/** Is this material available in this week — the green cell.
 *
 *  Here means green all the way across, which is what "In stock" means on the
 *  sheet. Otherwise it goes green from the week its date falls in, and stays
 *  green: a thing that has arrived does not un-arrive the following week. */
export function coveredIn(m: Material, w: Week, today = todayISO()): boolean {
  if (isHere(m)) return true;
  if (!m.due) return false;
  // Something already late is not covered anywhere yet, including the week its
  // date was in — the date passed and it is still not here.
  if (m.due < today) return false;
  return m.due <= w.end;
}

/* ============================ pasting the sheet ============================
 *
 * The sheet is pasted in rather than retyped, and it arrives exactly as messy
 * as a spreadsheet is: a merged title row, a heading row, week columns to the
 * right of the useful ones, and dates written "21-Sep" with no year on them.
 *
 * So this does not read by column heading — it reads each ROW for the two
 * things that matter. The first cell with words in it is what the thing is;
 * somewhere to its right is either a date or a word meaning it is already here.
 * A row with neither is not a material, which is how the title and the headings
 * take themselves out without anybody having to delete them first.
 */

export interface PastedMaterial {
  rowNo: number;
  what: string;
  due?: string;
  here?: boolean;
  /** Why this row is not a material, in words somebody can act on. */
  problem?: string;
}

const STOCK = /^(in stock|stock|in|here|arrived|yes|y|green|received|delivered)$/i;

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** A date off a sheet, as an ISO date. Handles what a British spreadsheet
 *  actually writes in an arrival column — 09-Oct, 21 Sep, 28/09/2026,
 *  2026-10-09 — and nothing else, because a guess here moves a delivery. */
export function readDate(cell: string, today = todayISO()): string | undefined {
  const t = cell.trim();
  if (!t) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  const uk = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (uk) {
    const yr = uk[3].length === 2 ? `20${uk[3]}` : uk[3];
    return `${yr}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`;
  }

  /* "09-Oct" and "21 Sep" carry no year, and the sheet means the NEXT one of
     those — a plan is about deliveries still to come. So a bare day and month
     takes this year, and rolls to next year when that would put it months in
     the past. Without the roll, a plan pasted in December for January would
     land eleven months back and read as overdue on the day it was typed. */
  const dayFirst = /^(\d{1,2})\s*[-\s/]\s*([a-z]{3,})\.?\s*(\d{4})?$/i.exec(t);
  const monthFirst = dayFirst ? null : /^([a-z]{3,})\.?\s*[-\s/]\s*(\d{1,2})\s*,?\s*(\d{4})?$/i.exec(t);
  if (!dayFirst && !monthFirst) return undefined;

  /* Named once, so the two shapes are read in one place rather than three
     times each with the compiler told to trust us. */
  const parts = dayFirst
    ? { day: dayFirst[1], word: dayFirst[2], stated: dayFirst[3] }
    : monthFirst
      ? { day: monthFirst[2], word: monthFirst[1], stated: monthFirst[3] }
      : undefined;
  if (!parts) return undefined;
  const { day, stated } = parts;
  const word = parts.word.toLowerCase();
  const mi = MONTH_NAMES.findIndex(m => word.startsWith(m));
  if (mi < 0) return undefined;

  const at = (y: number) => `${y}-${String(mi + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (stated) return at(Number(stated));
  const thisYear = at(Number(today.slice(0, 4)));
  return daysBetween(thisYear, today) > 180 ? at(Number(today.slice(0, 4)) + 1) : thisYear;
}

/** Read a pasted block into materials. Tab- or comma-separated, the same as
 *  everywhere else in the app: tabs first, because that is what a spreadsheet
 *  puts on the clipboard. */
export function readMaterialPaste(text: string, today = todayISO()): PastedMaterial[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';

  return lines.map((line, i): PastedMaterial => {
    const cells = line.split(sep).map(c => c.trim());
    const first = cells.findIndex(c => c !== '');
    const what = first < 0 ? '' : cells[first];

    let due: string | undefined;
    let here = false;
    for (const cell of cells.slice(first + 1)) {
      if (!cell) continue;
      if (STOCK.test(cell)) { here = true; continue; }
      if (!due) due = readDate(cell, today);
    }

    const problem = !what
      ? 'Nothing on this row'
      : (!due && !here)
        ? 'No arrival date on this row, and nothing saying it is already in'
        : undefined;

    return { rowNo: i + 1, what, due, here: here || undefined, problem };
  });
}
