/* WHAT A BUSINESS MEASURES, AND WHAT GOOD LOOKS LIKE.
 *
 * This app was built for one factory and it showed in the schema: a line row
 * carried `q1, q2, q3, q4` and a weekly array indexed from one fixed Monday,
 * and every one of those numbers was packs per minute. Four quarters, one
 * measure, one shape of spreadsheet feeding them. A bakery counting cases per
 * hour, a pharma line on first-pass yield, anybody running four-week periods
 * rather than quarters — none of them had anywhere to put a number.
 *
 * So the business supplies the words, the same way it already does on a test:
 *
 *   A MEASURE   what you judge a line on: a name, a unit, and which way is good
 *   A PERIOD    a label and two dates. "Q1", "January", "Vertical start-up"
 *   A TARGET    one measure, one period, one line, one number
 *   A READING   one measure, one line, one date, one number
 *
 * Nothing here knows what a ppm is, and nothing should. The app's job is to
 * hold the numbers and say whether they are going the right way.
 *
 * WHICH WAY IS GOOD IS PART OF THE MEASURE. Waste at 2.4 against a target of
 * 2.0 is BAD; ppm at 61 against 60 is good. Without `direction` on the measure
 * the app has to guess, and the first thing it would do is congratulate
 * somebody for making more waste.
 */
import type { ID } from '../types';

export type Direction = 'up' | 'down';

export interface Measure {
  id: ID;
  /** "Packs per minute", "OEE", "Waste", "First-pass yield". */
  name: string;
  /** "ppm", "%", "cases/hr". Free text: it is a label, not a calculation. */
  unit?: string;
  /** Whether a bigger number is better. */
  direction: Direction;
  sort: number;
}

export interface Period {
  id: ID;
  /** "Q1", "January", "Vertical start-up". Whatever this business calls it. */
  name: string;
  /** ISO dates. A period is a name and two dates and nothing else. */
  from?: string;
  to?: string;
  sort: number;
}

/** One line's aim for one measure over one period. */
export interface Target {
  id: ID;
  projectId: ID;
  lineId: ID;
  measureId: ID;
  periodId: ID;
  value: number;
  updatedAt: number;
  deletedAt?: number;
}

/** One number somebody recorded. */
export interface Reading {
  id: ID;
  projectId: ID;
  lineId: ID;
  measureId: ID;
  /** ISO date. A reading happens on a DAY — storing a midnight in some zone
   *  shows in Manchester as the day before it was taken. */
  at: string;
  value: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ================================== derived ================================ */

export const live = <T extends { deletedAt?: number }>(rows: T[]): T[] => rows.filter(r => !r.deletedAt);

export const bySort = <T extends { sort: number; name: string; deletedAt?: number }>(rows: T[]): T[] =>
  live(rows).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

/** The readings for one line and measure, oldest first — the order a chart
 *  draws in and the order a trend reads in.
 *
 *  Two readings on the SAME DAY are ordered by when they were written, so the
 *  later one is the latest. Without that tie-break "the latest reading" depended
 *  on whatever order the database handed the rows back, and a correction typed
 *  after a paste could lose to the number it was correcting. */
export function seriesFor(readings: Reading[], lineId: ID, measureId: ID): Reading[] {
  return live(readings)
    .filter(r => r.lineId === lineId && r.measureId === measureId)
    .sort((a, b) => a.at.localeCompare(b.at) || a.createdAt - b.createdAt);
}

export const latestOf = (readings: Reading[], lineId: ID, measureId: ID): Reading | undefined => {
  const s = seriesFor(readings, lineId, measureId);
  return s[s.length - 1];
};

/** Which period a date falls in. Undefined when it falls in none — which is a
 *  real answer, not a gap to be papered over: a reading taken between two
 *  periods has no target to be judged against. */
export function periodOf(periods: Period[], at: string): Period | undefined {
  return bySort(periods).find(p => (!p.from || at >= p.from) && (!p.to || at <= p.to));
}

export const targetFor = (targets: Target[], lineId: ID, measureId: ID, periodId?: ID): Target | undefined =>
  periodId ? live(targets).find(t => t.lineId === lineId && t.measureId === measureId && t.periodId === periodId) : undefined;

/** Is this number where it should be, given which way is good?
 *
 *  `undefined` when there is nothing to compare it against — deliberately not
 *  `false`, because "no target set" and "missing the target" are different
 *  things and only one of them is somebody's fault. */
export function meets(value: number, target: number | undefined, direction: Direction): boolean | undefined {
  if (target == null) return undefined;
  return direction === 'up' ? value >= target : value <= target;
}

export interface Standing {
  measure: Measure;
  latest?: Reading;
  /** The period the latest reading falls in. */
  period?: Period;
  target?: number;
  /** Signed distance from target in the measure's own units, positive when it
   *  is on the good side of it whichever direction that is. */
  margin?: number;
  meeting?: boolean;
  readings: number;
}

/** Where one line stands on every measure — the whole of what a line screen
 *  needs, worked out once. */
export function standingFor(
  measures: Measure[], periods: Period[], targets: Target[], readings: Reading[], lineId: ID,
): Standing[] {
  return bySort(measures).map((measure): Standing => {
    const series = seriesFor(readings, lineId, measure.id);
    const latest = series[series.length - 1];
    const period = latest ? periodOf(periods, latest.at) : undefined;
    const t = targetFor(targets, lineId, measure.id, period?.id)?.value;
    const meeting = latest ? meets(latest.value, t, measure.direction) : undefined;
    const margin = latest && t != null
      ? Math.round(((measure.direction === 'up' ? latest.value - t : t - latest.value)) * 100) / 100
      : undefined;
    return { measure, latest, period, target: t, margin, meeting, readings: series.length };
  });
}

/** Every target a line has for one measure, in period order — the chips under a
 *  measure, and what a chart draws its line against. */
export function targetsAcross(
  periods: Period[], targets: Target[], lineId: ID, measureId: ID,
): { period: Period; value?: number }[] {
  return bySort(periods).map(period => ({
    period,
    value: targetFor(targets, lineId, measureId, period.id)?.value,
  }));
}

/** The default periods a project is offered when it has none: four quarters
 *  from a start date. OFFERED, not imposed — the whole point of this file is
 *  that a period is a name and two dates, and the app has no business insisting
 *  a business runs on quarters. */
export function quarters(fromISO: string, mkId: () => string): Period[] {
  const start = new Date(fromISO);
  if (!Number.isFinite(start.getTime())) return [];
  return [0, 1, 2, 3].map((q): Period => {
    const from = new Date(start); from.setMonth(from.getMonth() + q * 3);
    const to = new Date(start); to.setMonth(to.getMonth() + (q + 1) * 3); to.setDate(to.getDate() - 1);
    return {
      id: mkId(), name: `Q${q + 1}`, sort: (q + 1) * 10,
      from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10),
    };
  });
}

/* ============================== paste and map ==============================
 *
 * What replaced a reader that knew one workbook's sheets by name — and could
 * therefore only ever read that workbook. Anything this cannot place is
 * reported rather than guessed at: a bad import that quietly drops half the
 * rows is worse than one that refuses.
 *
 * Three shapes of spreadsheet all arrive here, because all three are what
 * people actually keep:
 *
 *   Line | Date | Packs per minute | Waste      a column per measure
 *   Line | 27 Jul | 3 Aug | 10 Aug             a column per date, one measure
 *   Line | Date | Reading                      the simple one
 *
 * They are the same thing to this code: every column is either the line, the
 * date, a measure's readings, or one date's readings. Nothing else is special.
 */

export type ColumnRole =
  | { kind: 'ignore' }
  | { kind: 'line' }
  /** The date this row's readings were taken on. */
  | { kind: 'date' }
  /** This column holds readings OF that measure, dated by the row's date column. */
  | { kind: 'measure'; measureId: ID }
  /** This column's heading IS a date, so its numbers are readings taken on it —
   *  of whichever measure the sheet is for. */
  | { kind: 'on'; at: string };

export interface PasteMap {
  /** One role per heading, by position. */
  roles: ColumnRole[];
  /** The measure the date-headed columns belong to. */
  measureId?: ID;
}

export interface PastedRow { cells: string[] }

export interface Pasted {
  headings: string[];
  rows: PastedRow[];
}

/** Tab- or comma-separated text off a clipboard, into headings and rows.
 *  Tabs first: that is what a spreadsheet actually puts on the clipboard, and
 *  splitting on commas would cut "Line 2, night shift" in half. */
export function parsePaste(text: string): Pasted {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  if (!lines.length) return { headings: [], rows: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const cut = (l: string) => l.split(sep).map(c => c.trim());
  const headings = cut(lines[0]);
  return { headings, rows: lines.slice(1).map(l => ({ cells: cut(l) })) };
}

const asNumber = (v?: string): number | undefined => {
  if (!v) return undefined;
  const n = Number(v.replace(/[£$,%\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

/** A date in whatever the sheet wrote, as an ISO date. Handles what a British
 *  spreadsheet actually produces — 2026-09-15, 15/09/2026, and the "3 Aug" /
 *  "w/c 3 Aug 2026" a week column gets headed with — and says nothing rather
 *  than guessing at anything else. A bare day and month takes the current year,
 *  which is what somebody typing "3 Aug" in a column heading means. */
export function asISODate(v?: string, now = new Date()): string | undefined {
  if (!v) return undefined;
  const t = v.trim().replace(/^w\/?c\s*/i, '');
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const uk = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(t);
  if (uk) {
    const yr = uk[3].length === 2 ? `20${uk[3]}` : uk[3];
    return `${yr}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}`;
  }
  const named = /^(\d{1,2})\s*([a-z]{3,})\.?\s*(\d{4})?$/i.exec(t);
  if (named) {
    const i = MONTHS.findIndex(m => named[2].toLowerCase().startsWith(m));
    if (i >= 0) {
      return `${named[3] ?? now.getFullYear()}-${String(i + 1).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
    }
  }
  return undefined;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** The mapping the app proposes, from the headings alone. PROPOSED — every
 *  column is shown with what it was taken for and can be changed before
 *  anything is written, because an import that places a column wrongly and says
 *  nothing is the worst outcome available. */
export function guessMap(headings: string[], measures: Measure[]): PasteMap {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const roles = headings.map((h): ColumnRole => {
    const n = norm(h);
    if (!n) return { kind: 'ignore' };
    const at = asISODate(h);
    if (at) return { kind: 'on', at };
    if (/^(line|lines|area|machine|asset|cell)$/.test(n)) return { kind: 'line' };
    if (/^(date|day|week|w c|week commencing|taken)$/.test(n)) return { kind: 'date' };
    const m = bySort(measures).find(x => norm(x.name) === n || (x.unit && norm(x.unit) === n));
    if (m) return { kind: 'measure', measureId: m.id };
    if (/^(reading|value|actual|result)$/.test(n)) {
      const only = bySort(measures)[0];
      return only ? { kind: 'measure', measureId: only.id } : { kind: 'ignore' };
    }
    return { kind: 'ignore' };
  });
  return { roles, measureId: bySort(measures)[0]?.id };
}

/** One reading a paste is asking to write. */
export interface ImportRow {
  /** 1-based row in the pasted block, so a problem can be pointed at. */
  rowNo: number;
  lineKey?: string;
  measureId?: ID;
  at?: string;
  value?: number;
  /** Why this cannot be imported, in words somebody can act on. */
  problem?: string;
}

/** Read a pasted table through a mapping, into one row per reading.
 *
 *  Empty cells are SKIPPED, not reported: a blank in a week's column is a week
 *  nobody measured, which is normal. A cell with something in it that cannot be
 *  read comes back with its problem, so the screen can show what it could not
 *  place instead of silently importing less than was pasted. */
export function readPaste(p: Pasted, map: PasteMap): ImportRow[] {
  const iLine = map.roles.findIndex(r => r.kind === 'line');
  const iDate = map.roles.findIndex(r => r.kind === 'date');
  const out: ImportRow[] = [];

  p.rows.forEach((row, ri) => {
    const rowNo = ri + 1;
    const lineKey = iLine >= 0 ? row.cells[iLine] : undefined;
    const rowDate = iDate >= 0 ? asISODate(row.cells[iDate]) : undefined;
    const dateCell = iDate >= 0 ? row.cells[iDate] : undefined;

    map.roles.forEach((role, ci) => {
      if (role.kind !== 'measure' && role.kind !== 'on') return;
      const raw = row.cells[ci];
      if (raw == null || raw.trim() === '') return;          // never measured
      const value = asNumber(raw);
      const measureId = role.kind === 'measure' ? role.measureId : map.measureId;
      const at = role.kind === 'on' ? role.at : rowDate;

      const problem =
        value == null ? `“${raw}” is not a number`
        : iLine < 0 ? 'No column is marked as the line'
        : !lineKey ? 'No line named on this row'
        : !measureId ? 'Nothing says which measure these numbers are'
        : at == null ? (iDate < 0 ? 'No column is marked as the date' : `“${dateCell ?? ''}” could not be read as a date`)
        : undefined;

      out.push({ rowNo, lineKey, measureId, at, value, problem });
    });
  });

  return out;
}

/* ============================ one line, one measure ========================
 *
 * What a chart needs, worked out in one place so the SVG on screen and the
 * vector chart in the A3 cannot disagree about which period is in play or which
 * way is good. They did disagree once, when both computed it themselves.
 */

export interface SeriesTarget { name: string; value?: number }

export interface LineSeries {
  measure: Measure;
  /** Oldest first. Every point is a reading somebody took on a day — there are
   *  no nulls, because a day nobody measured is a gap between two dates rather
   *  than a hole in an array. */
  points: { at: string; value: number; note?: string }[];
  /** The period in play, and its target — what the line is judged against now. */
  period?: Period;
  target?: number;
  /** Every period's target, in order: the strip under the chart. */
  across: SeriesTarget[];
  latest?: number;
  /** Signed, positive on the good side of target whichever way that is. */
  margin?: number;
  meeting?: boolean;
}

/** Today, as an ISO date, in the reader's own zone — a reading is taken on a DAY
 *  and `toISOString()` in Manchester rolls to tomorrow all summer evening. */
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The measure a project leads on: the first one, in the order they set. Used
 *  wherever one number has to stand for a line — a card, a KPI, a roll-up row. */
export const headline = (measures: Measure[]): Measure | undefined => bySort(measures)[0];

/** Everything one chart draws, for one line and one measure. `undefined` when
 *  the project has not defined a measure yet — which is a state the screens say
 *  out loud rather than drawing an empty axis for. */
export function lineSeries(
  measures: Measure[], periods: Period[], targets: Target[], readings: Reading[],
  lineId: ID, measureId?: ID, today = todayISO(),
): LineSeries | undefined {
  const measure = measureId ? bySort(measures).find(m => m.id === measureId) : headline(measures);
  if (!measure) return undefined;

  const series = seriesFor(readings, lineId, measure.id);
  const latest = series[series.length - 1];
  /* The period in play is the one TODAY falls in — that is the target somebody
     is working to. Only when today falls in none (a project whose periods have
     run out, or a set-up that never covered now) does it fall back to the period
     the last reading was taken in, so the chart still has something to measure
     against rather than nothing. */
  const period = periodOf(periods, today) ?? (latest ? periodOf(periods, latest.at) : undefined);
  const target = targetFor(targets, lineId, measure.id, period?.id)?.value;

  return {
    measure,
    points: series.map(r => ({ at: r.at, value: r.value, note: r.note })),
    period, target,
    across: targetsAcross(periods, targets, lineId, measure.id).map(t => ({ name: t.period.name, value: t.value })),
    latest: latest?.value,
    margin: latest && target != null
      ? Math.round((measure.direction === 'up' ? latest.value - target : target - latest.value) * 100) / 100
      : undefined,
    meeting: latest ? meets(latest.value, target, measure.direction) : undefined,
  };
}

/** Where a line stands against its target, in one line of words — "+3 ppm vs Q1
 *  target 60", or what is missing instead.
 *
 *  Written once because it was written five times: the chart, the A3, the exec
 *  page, the project card and the line's KPI all say this, and two of them had
 *  already drifted into saying it differently. */
export function vsTarget(s: Pick<LineSeries, 'measure' | 'target' | 'period' | 'margin'>): string {
  const { measure, target, period, margin } = s;
  if (target == null) return 'no target set';
  if (margin == null) return `${period ? `${period.name} target` : 'Target'} ${say(target, measure.unit)} · nothing measured yet`;
  return `${margin >= 0 ? '+' : ''}${say(margin)} vs ${period ? `${period.name} target` : 'target'} ${say(target, measure.unit)}`;
}

/** A number as it should read on screen: its own precision, then its unit.
 *  61 stays 61; 2.45 stays 2.45; nothing is rounded into agreeing with a target
 *  it does not agree with. */
export function say(value: number, unit?: string): string {
  const n = Math.round(value * 100) / 100;
  return unit ? `${n} ${unit}` : String(n);
}

/** Which of this project's lines a pasted cell is naming. Exact key first, then
 *  name, then a loose match — and `undefined` rather than a guess, so an import
 *  says what it could not place. */
export function matchLine<T extends { id: ID; key: string; name: string }>(lines: T[], cell: string): T | undefined {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const want = n(cell);
  if (!want) return undefined;
  return lines.find(l => n(l.key) === want)
    ?? lines.find(l => n(l.name) === want)
    ?? lines.find(l => n(l.name).endsWith(want) || n(l.key) === want.replace(/^line/, ''));
}
