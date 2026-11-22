/* A PART OF A DATE, AS A COLUMN OF THE QUESTION (22 November 2026 — docs/LUNA-ANALYSIS.md, G4 slice A2).
 *
 * Rowland, 21 November: "no more analysis — Luna knows everything. Ask her a question." A manager asks "are Mondays worse?", "which
 * hour of the day do we lose most?", "how did each quarter go?" — and a question could group a date only by day, week, month or year,
 * and only as the LAST of its groups: it could not filter on a weekday, count by the hour, or tie a row to another sheet by its day.
 *
 * Now the question says which part of a date it wants — `parts: [{ as, column, part }]` — and the part is a COLUMN of that question
 * by its `as` name, usable wherever a column is: grouped by, filtered on, counted, or matched to another sheet in a lookup.
 *
 *   day       the day itself, with no time of day (a date)          week      the workbook's own week when it has one, else the ISO week
 *   month     2026-09                                               quarter   2026-Q3
 *   year      2026 (a number)                                       hour      0–23, the hour of the day (a number)
 *   weekday   Monday … Sunday — and groups of it are put in the order of the week, never of the alphabet
 *
 * The rules it keeps (LUNA-ANALYSIS §1): the part is worked by this code on every row; a row with no date has no part — it is
 * "(blank)" / "(not recorded)" in a group of its own and counted in the notes, never put with another; an hour is never taken from
 * dates that hold no time of day — refused in words, not answered "0". Pure: both engines (lib/workbook/query over a workbook's rows,
 * lib/data/table over the app's own records) use it. */
import { weekKey, type WorkWeek } from './week';

export const PART_KINDS = ['day', 'week', 'month', 'quarter', 'year', 'hour', 'weekday'] as const;
export type PartKind = typeof PART_KINDS[number];
/** One part of one date column, named `as` in the question. */
export interface Part { as: string; column: string; part: PartKind }
export const PARTS_MAX = 4;
/** HOW TO ASK, said in a refusal — never in the tool's own description. */
export const PARTS_HOW = 'parts is up to four of { as, column, part }: a date column’s day, week, month, quarter, year, hour or weekday, named as — then a column of this question (group by it, filter on it, match a lookup by it).';

/** The days of the week in the order of the week — Monday first, as a factory's week is read. */
export const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_MS = 86_400_000;
const RANK = new Map<string, number>(WEEK_ORDER.map((d, i) => [d.toLowerCase(), i]));

/** What a part IS — a date, a number, or words. */
export const partType = (part: PartKind): 'date' | 'number' | 'text' => (part === 'day' ? 'date' : part === 'year' || part === 'hour' ? 'number' : 'text');
/** A part in words — for the note that says how the column was made. */
export const PART_SAID: Record<PartKind, string> = { day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year', hour: 'hour of the day (0–23)', weekday: 'day of the week' };

/** The group a moment falls in. A week is the WORKBOOK'S OWN when it has one (`week` — its last day, and its own name), else the ISO week. */
export function bucket(ms: number, by: 'day' | 'week' | 'month' | 'year', week?: WorkWeek): string {
  const d = new Date(ms);
  if (by === 'week' && week) return weekKey(ms, week);
  if (by === 'year') return String(d.getUTCFullYear());
  if (by === 'month') return d.toISOString().slice(0, 7);
  if (by === 'day') return d.toISOString().slice(0, 10);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime() - y0) / 86_400_000 + 1) / 7)).padStart(2, '0')}`;
}

/** The part of a moment (a date as the sheet or the record writes it — its own wall clock, read as UTC). A `day` is the moment's own
 *  midnight (ms); a `year` and an `hour` are numbers; the rest are words. */
export function partValue(ms: number, part: PartKind, week?: WorkWeek): number | string {
  const d = new Date(ms);
  if (part === 'day') return Math.floor(ms / DAY_MS) * DAY_MS;
  if (part === 'year') return d.getUTCFullYear();
  if (part === 'hour') return d.getUTCHours();
  if (part === 'weekday') return WEEK_ORDER[(d.getUTCDay() + 6) % 7];
  if (part === 'quarter') return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
  return bucket(ms, part, week);
}
/** Does a moment hold a time of day — anything but its own midnight? */
export const hasTime = (ms: number): boolean => ms % DAY_MS !== 0;

const word = (x: unknown): x is string => typeof x === 'string' && !!x.trim();
/** The parts as they were asked for, checked — or why not, in words. */
export function readParts(v: unknown): Part[] | string {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > PARTS_MAX) return PARTS_HOW;
  const out: Part[] = [];
  for (const x of v) {
    const o = x && typeof x === 'object' ? x as Record<string, unknown> : {};
    if (!word(o.as) || !word(o.column) || !PART_KINDS.includes(String(o.part) as PartKind)) return PARTS_HOW;
    out.push({ as: o.as.trim().replace(/\s+/g, ' ').slice(0, 60), column: o.column.trim(), part: o.part as PartKind });
  }
  return out;
}

/** GROUPS IN ORDER OF THEIR KEYS. As it always was — the keys joined and compared as words, numbers by their size — except where a key
 *  is a day of the week: then the keys are compared one by one, two weekdays by their place in the week (Monday before Friday), and
 *  a key that is no weekday (a row with no date) after the seven — one order, whatever is compared with whatever. */
export function cmpGroupKeys(a: readonly string[], b: readonly string[], locale?: string): number {
  const opts = { numeric: true } as const;
  const weekday = (k: string): number | undefined => RANK.get(k.trim().toLowerCase());
  if (!a.some(k => weekday(k) !== undefined) && !b.some(k => weekday(k) !== undefined)) return a.join(' ').localeCompare(b.join(' '), locale, opts);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? '', y = b[i] ?? '';
    const rx = weekday(x), ry = weekday(y);
    const c = rx !== undefined && ry !== undefined ? rx - ry : rx !== undefined ? -1 : ry !== undefined ? 1 : x.localeCompare(y, locale, opts);
    if (c) return c;
  }
  return 0;
}
