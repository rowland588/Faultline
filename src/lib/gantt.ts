/* THE PLAN AS A GANTT — dates across the top, one row per thing, a bar from the
 * day it starts to the day it finishes.
 *
 * Rowland: "on the plan view we have dates but they are matched to the job —
 * build a proper Gantt chart view with dates across the top, showing easily on
 * a calendar." The timeline packed every mark into lanes with its date written
 * beside it, so a date was read off a label, not off the calendar. Here the
 * calendar is the axis: every day (or week, on a long job) is a column, and a
 * bar's ends sit on the days they mean.
 *
 * NOTHING NEW IS STORED. The rows are lib/standing's `plan` — the same marks the
 * timeline, the Home board and the client report draw — so the Gantt cannot say
 * a different thing about the job. This module only lays them out, in DAYS from
 * the first column; the screen multiplies by however wide a day is.
 */
import type { PlanMark } from './standing';
import { windowWords } from './plan';

export type GanttScale = 'day' | 'week';

export interface GanttRow {
  id?: string;
  kind: PlanMark['kind'];
  label: string;
  from: string;
  to: string;
  tone: PlanMark['tone'];
  /** Days from the first column to the first day of the bar. */
  start: number;
  /** How many days the bar covers — 1 for a single day. */
  span: number;
  /** "5–9 Oct", for the bar itself. */
  when: string;
}

export interface GanttGroup { kind: PlanMark['kind']; label: string; rows: GanttRow[] }
export interface GanttDay { iso: string; day: number; dow: number; weekend: boolean; at: number }
export interface GanttBand { label: string; start: number; span: number }

export interface Gantt {
  from: string;
  to: string;
  /** Columns, in days. */
  days: number;
  dayList: GanttDay[];
  months: GanttBand[];
  /** Monday-start weeks, labelled by their Monday — "w/c 5 Oct" on a long job. */
  weeks: GanttBand[];
  groups: GanttGroup[];
  /** Day index of today, when it falls inside the chart. */
  today?: number;
  expected?: { at: number; when: string };
  agreed?: { at: number; when: string };
  /** The scale that reads best for this length of job. */
  scale: GanttScale;
}

/* The order a stage-gate job runs in: machines land, materials arrive, then the
   gates, then what is left to put right. */
const GROUPS: { kind: PlanMark['kind']; label: string }[] = [
  { kind: 'machine', label: 'Machines arriving' },
  { kind: 'material', label: 'Materials' },
  { kind: 'install', label: 'Install' },
  { kind: 'setup', label: 'Set up' },
  { kind: 'test', label: 'Commission' },
  { kind: 'program', label: 'Programs' },
  { kind: 'handover', label: 'Hand over' },
  { kind: 'fix', label: 'Fixes' },
  { kind: 'action', label: 'Actions' },
];

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => isoOf(utc(iso) + n * DAY);
const between = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DAY);
/** 0 = Monday … 6 = Sunday. */
const dowOf = (iso: string) => (new Date(utc(iso)).getUTCDay() + 6) % 7;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Days a chart runs to before it reads better in weeks. */
export const WEEKS_AFTER = 120;
/** The shortest chart — a month, so a one-week job still sits on a calendar. */
const MIN_DAYS = 28;

export function gantt(marks: PlanMark[], opts: { today: string; expectedAt?: string; plannedAt?: string }): Gantt {
  const { today, expectedAt, plannedAt } = opts;
  const endOf = (m: PlanMark) => (m.until && m.until > m.at ? m.until : m.at);

  /* THE CALENDAR'S EDGES: every bar, today and both handover dates, with a few
     days either side, squared off to whole weeks so the columns start on a
     Monday and the weekends fall in the same place on every row. */
  const ends = [today, ...marks.flatMap(m => [m.at, endOf(m)]), ...[expectedAt, plannedAt].filter((d): d is string => !!d)].sort();
  let from = addDays(ends[0], -3);
  from = addDays(from, -dowOf(from));
  let to = addDays(ends[ends.length - 1], 4);
  to = addDays(to, 6 - dowOf(to));
  if (between(from, to) + 1 < MIN_DAYS) to = addDays(from, MIN_DAYS - 1);
  const days = between(from, to) + 1;

  const dayList: GanttDay[] = [];
  const months: GanttBand[] = [];
  const weeks: GanttBand[] = [];
  const firstYear = Number(from.slice(0, 4));
  for (let i = 0; i < days; i++) {
    const iso = addDays(from, i);
    const dow = dowOf(iso);
    dayList.push({ iso, day: Number(iso.slice(8, 10)), dow, weekend: dow >= 5, at: i });
    const y = Number(iso.slice(0, 4)), mo = Number(iso.slice(5, 7)) - 1;
    const label = y !== firstYear || mo === 0 ? `${MONTHS[mo]} ${String(y).slice(2)}` : MONTHS[mo];
    const last = months[months.length - 1];
    if (!last || last.label !== label) months.push({ label, start: i, span: 1 });
    else last.span++;
    if (dow === 0) weeks.push({ label: `${Number(iso.slice(8, 10))} ${MONTHS[mo]}`, start: i, span: Math.min(7, days - i) });
  }

  const groups: GanttGroup[] = [];
  for (const g of GROUPS) {
    const rows = marks
      .filter(m => m.kind === g.kind)
      .map((m): GanttRow => {
        const end = endOf(m);
        return {
          ...(m.id ? { id: m.id } : {}),
          kind: m.kind, label: m.label, from: m.at, to: end, tone: m.tone,
          start: between(from, m.at), span: between(m.at, end) + 1, when: windowWords(m.at, end),
        };
      })
      .sort((a, b) => a.start - b.start || a.span - b.span || a.label.localeCompare(b.label));
    if (rows.length) groups.push({ kind: g.kind, label: g.label, rows });
  }

  const inside = (iso?: string) => (iso && iso >= from && iso <= to ? between(from, iso) : undefined);
  const t = inside(today);
  const ex = inside(expectedAt);
  const ag = plannedAt && plannedAt !== expectedAt ? inside(plannedAt) : undefined;
  return {
    from, to, days, dayList, months, weeks, groups,
    ...(t != null ? { today: t } : {}),
    ...(ex != null && expectedAt ? { expected: { at: ex, when: windowWords(expectedAt) } } : {}),
    ...(ag != null && plannedAt ? { agreed: { at: ag, when: windowWords(plannedAt) } } : {}),
    scale: days > WEEKS_AFTER ? 'week' : 'day',
  };
}

/** Where a row opens — the record it was drawn from. */
export function ganttHref(projectId: string, row: Pick<GanttRow, 'id' | 'kind'>): string | undefined {
  if (row.kind === 'material') return `/project/${projectId}/materials`;
  if (row.kind === 'program') return `/project/${projectId}/programs`;
  if (row.kind === 'machine') return `/project/${projectId}/install`;
  if (row.kind === 'action') return `/project/${projectId}/board`;
  return row.id ? `/project/${projectId}/testing/${encodeURIComponent(row.id)}` : undefined;
}
