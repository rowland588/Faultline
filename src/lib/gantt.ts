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
import { HANDOVER_KEY, keyOfMark, overlapOf, storyOf } from './story';
import { isOverdue, type Test, type TestItem } from './testing';
import { todayISO as isoDay } from './weeks';

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
  /* ---- the story, when the job's records are given (lib/story) ---- */
  /** The overrun: from the day after the finish first planned to the finish
   *  now, and by how many days. */
  slip?: { start: number; span: number; days: number };
  /** Each day something happened on it — a move, a problem written up. */
  marks?: { at: number; iso: string }[];
  /** Its fixes, drawn directly under it: with their dates, or open-ended from
   *  the day they were booked when no date is agreed. */
  fixes?: (GanttRow & { open?: boolean })[];
  /** Where its story is filed (lib/story keyOf) — a stage's own id, or
   *  "asset:…", "material:…", "program:…". */
  key?: string;
  /** It starts before the step ahead of it on its machine has finished. */
  overlap?: string;
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
  /** Each time the handover moved later, with why — from the records. */
  handoverMoves?: { on: string; from: string; to: string; days: number; why: string }[];
}

/* The order a stage-gate job runs in: machines land, materials arrive, then the
   gates, then what is left to put right. */
const GROUPS: { kind: PlanMark['kind']; label: string }[] = [
  /* First: what you asked to be reminded of, in its own colour. */
  { kind: 'note', label: 'Reminders from notes' },
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

const STAGE_KINDS = new Set<PlanMark['kind']>(['install', 'setup', 'handover', 'test']);

export function gantt(marks: PlanMark[], opts: { today: string; expectedAt?: string; plannedAt?: string },
  records?: { tests: Test[]; items: TestItem[] }): Gantt {
  const { today, expectedAt, plannedAt } = opts;
  const endOf = (m: PlanMark) => (m.until && m.until > m.at ? m.until : m.at);

  /* WHAT HAPPENED TO EACH STAGE — its moves, what was found, its fixes. */
  const stories = new Map<string, ReturnType<typeof storyOf>>();
  if (records) for (const m of marks) {
    const key = keyOfMark(m.kind, m.id);
    if (!m.id || !key) continue;
    const st = storyOf(key, records.tests, records.items);
    if (st.moves.length || st.found.length || st.fixes.length) stories.set(m.id, st);
  }
  /* A fix that hangs under its stage is not drawn again among the Fixes. */
  const underStage = new Set([...stories.values()].flatMap(st => st.fixes.map(f => f.id)));
  const fixDays = [...stories.values()].flatMap(st => [
    ...st.days, ...(st.original ? [st.original] : []),
    ...st.fixes.flatMap(f => [f.plannedFor, f.plannedTo, f.ranOn, isoDay(new Date(f.createdAt))].filter((d): d is string => !!d)),
  ]);

  /* THE CALENDAR'S EDGES: every bar, today and both handover dates, with a few
     days either side, squared off to whole weeks so the columns start on a
     Monday and the weekends fall in the same place on every row. */
  const ends = [today, ...marks.flatMap(m => [m.at, endOf(m)]), ...fixDays, ...[expectedAt, plannedAt].filter((d): d is string => !!d)].sort();
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

  /* A fix under its stage: its own dates when it has them — the day it ran, or
     the window booked — and otherwise open-ended from the day it was booked,
     "no date agreed". */
  const fixRow = (f: Test): GanttRow & { open?: boolean } => {
    const at = f.ranOn ?? f.plannedFor;
    const until = f.ranOn ? f.ranTo : f.plannedTo;
    const tone: PlanMark['tone'] = f.outcome === 'passed' ? 'done' : f.outcome === 'failed' ? 'failed' : isOverdue(f, today) ? 'late' : 'booked';
    if (!at) {
      const made = isoDay(new Date(f.createdAt));
      return { id: f.id, kind: 'fix', label: f.title, from: made, to: made, tone: 'none', start: between(from, made), span: 1, when: 'no date agreed', open: true };
    }
    const end = until && until > at ? until : at;
    return { id: f.id, kind: 'fix', label: f.title, from: at, to: end, tone, start: between(from, at), span: between(at, end) + 1, when: windowWords(at, end) };
  };

  const groups: GanttGroup[] = [];
  for (const g of GROUPS) {
    const rows = marks
      .filter(m => m.kind === g.kind && !(m.kind === 'fix' && m.id && underStage.has(m.id)))
      .map((m): GanttRow => {
        const end = endOf(m);
        const row: GanttRow = {
          ...(m.id ? { id: m.id } : {}),
          kind: m.kind, label: m.label, from: m.at, to: end, tone: m.tone,
          start: between(from, m.at), span: between(m.at, end) + 1, when: windowWords(m.at, end),
        };
        const key = keyOfMark(m.kind, m.id);
        if (key) row.key = key;
        if (records && m.id && STAGE_KINDS.has(m.kind)) {
          const step = records.tests.find(t => t.id === m.id);
          const over = step ? overlapOf(step, records.tests) : undefined;
          if (over) row.overlap = over.title;
        }
        const st = m.id ? stories.get(m.id) : undefined;
        if (st) {
          if (st.original && st.original < end) {
            const s0 = between(from, st.original) + 1;
            row.slip = { start: s0, span: between(st.original, end), days: between(st.original, end) };
          }
          if (st.days.length) row.marks = st.days.map(iso => ({ at: between(from, iso), iso }));
          if (st.fixes.length) row.fixes = st.fixes.map(f => fixRow(f));
        }
        return row;
      })
      .sort((a, b) => a.start - b.start || a.span - b.span || a.label.localeCompare(b.label));
    if (rows.length) groups.push({ kind: g.kind, label: g.label, rows });
  }

  const handoverMoves = records ? storyOf(HANDOVER_KEY, records.tests, records.items).moves
    .map(m => ({ on: m.on, from: m.from, to: m.to, days: m.days, why: m.why })) : [];
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
    ...(handoverMoves.length ? { handoverMoves } : {}),
  };
}

/** Where a row opens — the record it was drawn from. */
export function ganttHref(projectId: string, row: Pick<GanttRow, 'id' | 'kind'>): string | undefined {
  if (row.kind === 'material') return `/project/${projectId}/materials`;
  if (row.kind === 'program') return `/project/${projectId}/programs`;
  if (row.kind === 'machine') return `/project/${projectId}/install`;
  if (row.kind === 'action') return `/project/${projectId}/board`;
  if (row.kind === 'note') return `/project/${projectId}/notes`;
  return row.id ? `/project/${projectId}/testing/${encodeURIComponent(row.id)}` : undefined;
}
