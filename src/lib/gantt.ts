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
import { isOverdue, isSettled, latestAttempts, live, type Asset, type StepGate, type Test, type TestItem } from './testing';
import { niceDay, todayISO as isoDay } from './weeks';
import { isLate, walkWords, type WalkLane, type WalkSnag } from './walkSnags';
import { appStages, installOf, JOURNEY, journeyNow, lateOrProblem, machineAt, journeyOf, redReasons, stageKey } from './install';
import { partsOf } from './noted';
import { criticalCount, criticalOn, riskOn } from './critical';
import { DAY_HOURS, hoursTally, hoursWord } from './hoursLost';
import type { Program } from './programs';

export type GanttScale = 'day' | 'week';

/** The plan's tones: the marks' own, and `problem` — an install step that hit
 *  a problem and lost no time, in amber (lib/install lateOrProblem). */
export type GanttTone = PlanMark['tone'] | 'problem';

/** "1 late · 2 a problem · 1 didn’t pass" — every abnormal row counted by what
 *  it is, never "3 late or a problem". Empty when nothing is. */
export function badWords(rows: Pick<GanttRow, 'tone'>[], extraLate = 0): string {
  const n = (t: GanttTone) => rows.filter(r => r.tone === t).length;
  const late = n('late') + extraLate, problem = n('problem'), failed = n('failed');
  return [late ? `${late} late` : '', problem ? `${problem} a problem` : '', failed ? `${failed} didn’t pass` : ''].filter(Boolean).join(' · ');
}

export interface GanttRow {
  id?: string;
  kind: PlanMark['kind'];
  label: string;
  /** The machine, when the label is "Machine — title" (PlanMark.on). */
  on?: string;
  from: string;
  to: string;
  tone: GanttTone;
  /** Why it wears that tone, when the rule decided it: "late — 2 h lost",
   *  "a problem — no time lost". */
  says?: string;
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
  /** Its machine's next stage not yet done — said "Next" in words, never by
   *  a state's colour (withNext). */
  next?: boolean;
  /** PARTS OF THE PLAN, as branches off the stage (lib/noted partsOf): drawn
   *  under it like its fixes, each with its state in words and, when it has
   *  a day, a mark on that day. */
  parts?: GanttPart[];
  /** "2 parts · 1 done" — said on the stage's own row. */
  partsSay?: string;
  /** Its open critical problems (lib/critical criticalOn) — "1 critical",
   *  solid red, beside its name on screen and on paper. Never a row of its own. */
  critical?: number;
  /** Its open high risks (lib/critical riskOn) — "1 high risk", amber,
   *  where critical would be when there is no critical one. */
  risk?: number;
}

/** A part's state: done, past its day, due within two days, booked on a day
 *  further off, or written with no day. */
export type PartState = 'done' | 'late' | 'soon' | 'booked' | 'todo';
export interface GanttPart {
  id: string;
  label: string;
  owner?: string;
  due?: string;
  /** Days from the first column to its day, when it has one. */
  at?: number;
  state: PartState;
  /** "done 6 Oct", "late — due 4 Oct", "due 8 Oct", "to do". */
  says: string;
}

/** A part as the plan draws it — the same reading the stage's own list makes. */
export function partOf(i: TestItem, today: string): Omit<GanttPart, 'at'> {
  const soon = isoDay(new Date(Date.parse(`${today}T12:00:00Z`) + 2 * 86_400_000));
  const state: PartState = i.doneAt != null ? 'done' : !i.due ? 'todo' : i.due < today ? 'late' : i.due <= soon ? 'soon' : 'booked';
  const says = state === 'done' ? `done ${niceDay(isoDay(new Date(i.doneAt as number)))}`
    : state === 'late' ? `late — due ${niceDay(i.due)}` : state === 'todo' ? 'to do' : `due ${niceDay(i.due)}`;
  return { id: i.id, label: i.what.trim() || 'A part', ...(i.owner ? { owner: i.owner } : {}), ...(i.due ? { due: i.due } : {}), state, says };
}

/** "2 parts · 1 done · 1 late" — counted by what each is. */
export function partsWords(parts: Pick<GanttPart, 'state'>[]): string {
  const n = (st: PartState) => parts.filter(p => p.state === st).length;
  return [`${parts.length} part${parts.length === 1 ? '' : 's'}`, n('done') ? `${n('done')} done` : '', n('late') ? `${n('late')} late` : ''].filter(Boolean).join(' · ');
}

export interface GanttGroup {
  kind: PlanMark['kind']; label: string; rows: GanttRow[];
  /** By stage: the same rows under a light heading each — a stage with one
   *  row per machine, or (Commission) a machine with its tests (byStage). */
  subs?: GanttSub[];
}
/** "Positioned and levelled · 2 machines · 1 late" — its rows are the group's. */
export interface GanttSub { label: string; n: string; bad: string; rows: GanttRow[] }
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
  /** What the filmed walk found — one lane, never a row per snag (lib/walkSnags). */
  walk?: WalkLane;
  /** The same rows, one band per machine — set by withMachines (By machine). */
  machines?: GanttMachine[];
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
/* A stage of a list — its parts are its own lines. A test's 'next' items are
   next steps out of what it found, not parts of a stage. */
const LIST_STAGE = new Set<PlanMark['kind']>(['install', 'setup', 'handover']);

export function gantt(marks: PlanMark[], opts: { today: string; expectedAt?: string; plannedAt?: string },
  records?: { tests: Test[]; items: TestItem[]; walk?: WalkSnag[] }): Gantt {
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
  /* An open snag widens the calendar to the day it was found; a closed one is
     drawn only if it falls on the job's calendar anyway. */
  const walk = records?.walk ?? [];
  const walkDays = walk.filter(s => s.state !== 'closed').map(s => s.found);
  /* A stage's parts — and the days they are due widen the calendar. */
  const partsOn = new Map<string, TestItem[]>();
  if (records) for (const m of marks) {
    if (!m.id || !LIST_STAGE.has(m.kind)) continue;
    const ps = partsOf(m.id, records.items);
    if (ps.length) partsOn.set(m.id, ps);
  }
  const partDays = [...partsOn.values()].flat().map(i => i.due).filter((d): d is string => !!d);
  const ends = [today, ...marks.flatMap(m => [m.at, endOf(m)]), ...fixDays, ...walkDays, ...partDays, ...[expectedAt, plannedAt].filter((d): d is string => !!d)].sort();
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
          ...(m.on ? { on: m.on } : {}),
          kind: m.kind, label: m.label, from: m.at, to: end, tone: m.tone,
          start: between(from, m.at), span: between(m.at, end) + 1, when: windowWords(m.at, end),
        };
        const key = keyOfMark(m.kind, m.id);
        if (key) row.key = key;
        if (records && m.id && STAGE_KINDS.has(m.kind)) {
          const step = records.tests.find(t => t.id === m.id);
          const over = step ? overlapOf(step, records.tests) : undefined;
          if (over) row.overlap = over.title;
          /* LATE OR A PROBLEM — which one (lib/install lateOrProblem). */
          const lp = step ? lateOrProblem(step, records.items, today) : undefined;
          const crit = step ? criticalOn(step.id, records.items, records.tests).length : 0;
          if (crit) row.critical = crit;
          const risky = step ? riskOn(step.id, records.items, records.tests).length : 0;
          if (risky) row.risk = risky;
          if (step && (lp === 'late' || lp === 'problem')) {
            const lost = hoursTally(step.id, records.items, DAY_HOURS).hours;
            row.tone = lp;
            row.says = lp === 'problem' ? 'a problem — no time lost' : lost > 0 ? `late — ${hoursWord(lost)} lost` : 'late';
          }
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
        const ps = m.id ? partsOn.get(m.id) : undefined;
        if (ps) {
          row.parts = ps.map(i => { const p = partOf(i, today); return p.due ? { ...p, at: between(from, p.due) } : p; });
          row.partsSay = partsWords(row.parts);
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
  /* THE WALK'S LANE: each day something was found, with how many are still
     open and how many are past the day promised. */
  let walkLane: WalkLane | undefined;
  if (walk.length) {
    const byDay = new Map<string, WalkSnag[]>();
    for (const s of walk) if (inside(s.found) != null) byDay.set(s.found, [...(byDay.get(s.found) ?? []), s]);
    walkLane = {
      days: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, l]) => ({
        at: between(from, day), iso: day, ids: l.map(s => s.id),
        open: l.filter(s => s.state !== 'closed').length, late: l.filter(s => isLate(s, today)).length,
      })),
      open: walk.filter(s => s.state !== 'closed').length,
      late: walk.filter(s => isLate(s, today)).length,
      closed: walk.filter(s => s.state === 'closed').length,
      words: walkWords(walk, today),
    };
  }
  const ex = inside(expectedAt);
  const ag = plannedAt && plannedAt !== expectedAt ? inside(plannedAt) : undefined;
  return {
    from, to, days, dayList, months, weeks, groups,
    ...(t != null ? { today: t } : {}),
    ...(ex != null && expectedAt ? { expected: { at: ex, when: windowWords(expectedAt) } } : {}),
    ...(ag != null && plannedAt ? { agreed: { at: ag, when: windowWords(plannedAt) } } : {}),
    scale: days > WEEKS_AFTER ? 'week' : 'day',
    ...(handoverMoves.length ? { handoverMoves } : {}),
    ...(walkLane ? { walk: walkLane } : {}),
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

/* ------------------------------ BY MACHINE ------------------------------
 *
 * Rowland, 5 October: "we have different machines but all muddled together on
 * the Gantt — difficult to see machine status." Grouped by gate, one machine's
 * stages sat in every group, between the other machines'. By machine, each
 * machine is one band: a header saying where it stands — the same reading the
 * front page's "Where each machine is" strip makes (lib/install journeyOf,
 * journeyNow, redReasons), so the two cannot disagree — and a bar from its
 * first date to its last; under it its own rows, gate by gate. Whatever is on
 * no one machine — materials, notes, line-level steps, the walk — is the last
 * band. NOTHING NEW: the same rows `gantt` laid out, in a different order.
 * By stage (the gates, as it always was) is one tap away. */

export type GanttBy = 'machine' | 'stage';

export interface GanttMachine {
  /** The machine; absent for the band of what is on no one machine. */
  id?: string;
  name: string;
  /** Where it stands, in words — "at Set up · 1 late", "Handed over". */
  says: string;
  /** Its state in the plan's colours: late, waiting (ran), done, ahead, none. */
  tone: GanttTone;
  /** The gate page its header opens — the one it is at (lib/install JOURNEY),
   *  the page the strip's tile for that gate opens. */
  path?: string;
  /** First date to last; absent when nothing on it is dated. The span is the
   *  machine's plan and wears no state of its own: its `segs` are its own
   *  rows' days merged, each in that row's tone, so red sits only on the days
   *  of what is actually late. */
  bar?: { start: number; span: number; when: string; segs: { start: number; span: number; tone: GanttTone }[] };
  /** Its rows, gate by gate in the order the job runs; the label is the gate. */
  groups: GanttGroup[];
  /** The filmed walk's lane is drawn in this band. */
  walk?: boolean;
  /** On paper only: each gate folded to one lane (lib/ganttPdf foldBands). */
  folded?: boolean;
}

/** The band of what is on no one machine. Rowland, 6 October: "what is 'the
 *  line and the whole job'?" — so it says what it is, and its header says
 *  what is in it (jobContents). */
export const JOB_BAND = 'Whole job — not on one machine';

/* What the whole job's band holds, in the floor's words, in the plan's order. */
const JOB_WORD: Partial<Record<PlanMark['kind'], string>> = {
  note: 'reminders', material: 'materials', install: 'install on the line', setup: 'set up on the line', test: 'tests on the line',
  program: 'programs', handover: 'handover', fix: 'fixes', action: 'actions',
};
/** "handover · materials · programs · the filmed walk" — built from what is there. */
export const jobContents = (groups: Pick<GanttGroup, 'kind'>[], walk: boolean): string =>
  [...groups.map(gr => JOB_WORD[gr.kind] ?? gr.kind), ...(walk ? ['the filmed walk'] : [])].join(' · ');

/* A machine's own rows, in the order its work runs. Its programs are its Set
   up, as journeyOf counts them. */
const MACHINE_GATES: { kind: PlanMark['kind']; label: string; kinds: PlanMark['kind'][] }[] = [
  { kind: 'machine', label: 'Arriving', kinds: ['machine'] },
  { kind: 'install', label: 'Install', kinds: ['install'] },
  { kind: 'setup', label: 'Set up', kinds: ['setup', 'program'] },
  { kind: 'test', label: 'Commission', kinds: ['test'] },
  { kind: 'handover', label: 'Hand over', kinds: ['handover'] },
  { kind: 'fix', label: 'Fixes', kinds: ['fix', 'action', 'note', 'material'] },
];

const byDate = (a: GanttRow, b: GanttRow) => a.start - b.start || a.span - b.span || a.label.localeCompare(b.label);
const isBad = (t: GanttTone) => t === 'late' || t === 'failed';
const endOfRow = (r: GanttRow) => Math.max(r.start + r.span, r.slip ? r.slip.start + r.slip.span : 0, ...(r.fixes ?? []).map(f => f.start + f.span));

function barOf(rows: GanttRow[], dayList: GanttDay[]): GanttMachine['bar'] {
  if (!rows.length) return undefined;
  const start = Math.min(...rows.map(r => r.start));
  const end = Math.max(...rows.map(endOfRow));
  const from = dayList[Math.max(0, start)]?.iso ?? rows[0].from;
  const to = dayList[Math.min(dayList.length - 1, end - 1)]?.iso ?? from;
  /* ONE LANE, MERGED MARKERS — each day takes the most abnormal tone of the
     rows on it (a stage, its fixes, its overrun past the finish first
     planned), and runs of one tone become one piece. */
  const day: (GanttTone | undefined)[] = Array(Math.max(0, end - start)).fill(undefined);
  const put = (s0: number, n: number, t: GanttTone) => {
    for (let d = Math.max(start, s0); d < Math.min(end, s0 + n); d++) {
      const was = day[d - start];
      if (!was || WORST.indexOf(t) < WORST.indexOf(was)) day[d - start] = t;
    }
  };
  for (const r of rows) {
    put(r.start, r.span, r.tone);
    if (r.slip) put(r.slip.start, r.slip.span, 'late');
    for (const f of r.fixes ?? []) put(f.start, f.span, f.tone);
  }
  const segs: NonNullable<GanttMachine['bar']>['segs'] = [];
  day.forEach((t, i) => {
    if (!t) return;
    const last = segs[segs.length - 1];
    if (last && last.tone === t && last.start + last.span === start + i) last.span++;
    else segs.push({ start: start + i, span: 1, tone: t });
  });
  return { start, span: Math.max(1, end - start), when: windowWords(from, to), segs };
}

/** Most abnormal first: a failure, then late, then a problem that lost no
 *  time, then waiting on somebody, then booked, then not started, and done
 *  last — normal recedes. */
export const WORST: GanttTone[] = ['failed', 'late', 'problem', 'ran', 'booked', 'none', 'done'];

/** "Wrapper — Dry run" is "Dry run" inside the wrapper's own band. */
export const stepOf = (r: Pick<GanttRow, 'on' | 'label'>): string =>
  (r.on && r.label.startsWith(`${r.on} — `) ? r.label.slice(r.on.length + 3) : r.label);

/** Which machine a row is on — by its record, never by its label (a step
 *  only one machine has carries no machine in its name). */
function machineFinder(job: { assets: Asset[]; tests: Test[]; programs?: readonly Program[] }) {
  const programs = job.programs ?? [];
  const machines = live(job.assets).sort((a, b) => a.sort - b.sort);
  const known = new Set(machines.map(a => a.id));
  const testOn = new Map(job.tests.map(t => [t.id, t] as const));
  const progOn = new Map(programs.map(p => [p.id, p.assetId] as const));
  const machineOf = (r: GanttRow): string | undefined => {
    let id: string | undefined;
    if (r.kind === 'machine') id = r.id;
    else if (r.kind === 'program') id = r.id ? progOn.get(r.id) : undefined;
    else if (STAGE_KINDS.has(r.kind) || r.kind === 'fix') {
      const t = r.id ? testOn.get(r.id) : undefined;
      id = t?.assetId ?? (t?.programId ? progOn.get(t.programId) : undefined);
    }
    return id && known.has(id) ? id : undefined;
  };
  return { machines, machineOf, testOn };
}

/* --------------------------------- NEXT ---------------------------------
 *
 * Rowland, 6 October: "I can't see where I am." Each machine's next stage not
 * yet done says "Next" on its row, in both views and on paper. Read the way
 * the "Where each machine is" strip reads it: the gate the machine is at
 * (journeyNow), and in it the first step not done in the job's order — the
 * Install grid's own "next" (installOf) — or, at Commission, its first test
 * still to run; failing that, the gates after it. Handed over: nothing next. */
export function nextSteps(job: { assets: Asset[]; tests: Test[]; items: TestItem[]; programs?: readonly Program[]; today: string }): Set<string> {
  const { tests, items, today } = job;
  const out = new Set<string>();
  const proofs = latestAttempts(tests);
  for (const a of live(job.assets)) {
    const at = JOURNEY.findIndex(x => x.label === journeyNow(journeyOf(a, tests, items, today, job.programs ?? [])));
    if (at < 0) continue;
    for (const gate of JOURNEY.slice(at)) {
      const id = gate.gate === 'commission'
        ? proofs.filter(t => t.assetId === a.id && !isSettled(t))
          .sort((x, y) => (x.plannedFor ?? '9999').localeCompare(y.plannedFor ?? '9999') || x.sort - y.sort)[0]?.id
        : installOf(a, tests, items, today, gate.gate).steps.find(st => st.next)?.step.id;
      if (id) { out.add(id); break; }
    }
  }
  return out;
}

/** The same rows, each machine's next stage marked — before they are banded
 *  or put under their stages, so both views say the same. */
export function withNext(g: Gantt, job: Parameters<typeof nextSteps>[0]): Gantt {
  const ids = nextSteps(job);
  if (!ids.size) return g;
  return { ...g, groups: g.groups.map(gr => ({ ...gr, rows: gr.rows.map(r => (r.id && ids.has(r.id) ? { ...r, next: true } : r)) })) };
}

/* ------------------------------- BY STAGE -------------------------------
 *
 * Rowland, 6 October: "when I do by stage I lose my ability to see clearly by
 * each machine. We need to be completely organised, where I can see machine
 * by stage at exactly the same time." By stage was one row per step, named
 * only by the step — with two machines, two rows called "Dry run" and no way
 * to tell whose was whose, and not side by side. Now inside each gate every
 * stage is a light heading — "Dry run · 2 machines · 1 late" — and under it
 * one row per machine, named by the machine: the Install grid's machine ×
 * stage, on the calendar. Stages run in the order the grid runs them (the
 * job's list — lib/install usualStages — then any other name in the order it
 * was first planned), machines in the machines' order. Commission's tests are no stage of a list, so they sit
 * under their machine instead. NOTHING NEW: the same rows, regrouped and
 * renamed; a job with nothing on a machine keeps the gates as they were. */
const BY_STAGE = new Set<PlanMark['kind']>(['install', 'setup', 'handover']);

export function byStage(g: Gantt, job: {
  assets: Asset[]; tests: Test[]; programs?: readonly Program[];
  /** Each gate's list, as the Install grid orders its columns; the app's when absent. */
  stages?: Partial<Record<StepGate, readonly string[]>>;
}): Gantt {
  const { machines, machineOf, testOn } = machineFinder(job);
  if (!g.groups.some(gr => (BY_STAGE.has(gr.kind) || gr.kind === 'test') && gr.rows.some(r => machineOf(r)))) return g;
  const order = new Map(machines.map((a, i) => [a.id, i] as const));
  const nameOf = new Map(machines.map(a => [a.id, a.name] as const));
  const LINE = 'The line';
  const machineRank = (r: GanttRow) => { const id = machineOf(r); return id ? order.get(id) ?? 0 : machines.length; };
  const titleOf = (r: GanttRow) => (r.id ? testOn.get(r.id)?.title : undefined) ?? stepOf(r);
  const sub = (label: string, rows: GanttRow[], noun: [string, string]): GanttSub =>
    ({ label, n: `${rows.length} ${rows.length === 1 ? noun[0] : noun[1]}`, bad: badWords(rows), rows });
  const groups = g.groups.map((gr): GanttGroup => {
    if (BY_STAGE.has(gr.kind)) {
      const list = (job.stages?.[gr.kind as StepGate] ?? appStages(gr.kind as StepGate)).map(stageKey);
      const place = (k: string) => { const i = list.indexOf(k); return i < 0 ? list.length : i; };
      const buckets = new Map<string, { label: string; sort: number; start: number; rows: GanttRow[] }>();
      for (const r of gr.rows) {
        const title = titleOf(r), k = stageKey(title);
        const sort = (r.id ? testOn.get(r.id)?.sort : undefined) ?? Infinity;
        const b = buckets.get(k);
        if (b) { b.rows.push(r); b.sort = Math.min(b.sort, sort); b.start = Math.min(b.start, r.start); }
        else buckets.set(k, { label: title, sort, start: r.start, rows: [r] });
      }
      const subs = [...buckets].sort(([ka, a], [kb, b]) => place(ka) - place(kb) || a.sort - b.sort || a.start - b.start).map(([, b]) => b)
        .map(b => sub(b.label, b.rows.sort((x, y) => machineRank(x) - machineRank(y) || byDate(x, y)).map(r => {
          const id = machineOf(r);
          const row: GanttRow = { ...r, label: id ? nameOf.get(id) ?? LINE : LINE };
          delete row.on;
          return row;
        }), ['machine', 'machines']));
      return { ...gr, rows: subs.flatMap(s => s.rows), subs };
    }
    if (gr.kind === 'test') {
      const buckets = new Map<string, GanttRow[]>();
      for (const r of [...gr.rows].sort((x, y) => machineRank(x) - machineRank(y) || byDate(x, y))) {
        const id = machineOf(r) ?? '';
        const row: GanttRow = { ...r, label: titleOf(r) };
        delete row.on;
        buckets.set(id, [...(buckets.get(id) ?? []), row]);
      }
      const subs = [...buckets].map(([id, rows]) => sub(id ? nameOf.get(id) ?? LINE : LINE, rows, ['test', 'tests']));
      return { ...gr, rows: subs.flatMap(s => s.rows), subs };
    }
    return gr;
  });
  return { ...g, groups };
}

/** The Gantt's rows put into one band per machine, then the line and the job. */
export function withMachines(g: Gantt, job: {
  assets: Asset[]; tests: Test[]; items: TestItem[]; programs?: readonly Program[]; today: string;
}): Gantt {
  const { tests, items, today } = job;
  const programs = job.programs ?? [];
  const { machines, machineOf } = machineFinder(job);

  const mine = new Map<string, GanttRow[]>();
  const rest: GanttGroup[] = [];
  for (const gr of g.groups) {
    const left: GanttRow[] = [];
    for (const r of gr.rows) {
      const id = machineOf(r);
      if (id) mine.set(id, [...(mine.get(id) ?? []), r]);
      else left.push(r);
    }
    if (left.length) rest.push({ ...gr, rows: left });
  }

  const bands: GanttMachine[] = machines.map(a => {
    const rows = mine.get(a.id) ?? [];
    const groups: GanttGroup[] = MACHINE_GATES.map(mg => ({
      kind: mg.kind, label: mg.label,
      rows: rows.filter(r => mg.kinds.includes(r.kind)).map((r): GanttRow => {
        /* Inside its own band the machine's name is said once, in the header. */
        if (r.kind === 'machine') return { ...r, label: a.onSiteOn ? (a.runningOn ? 'On site to running' : 'On site') : 'Due on site' };
        const bare: GanttRow = { ...r, label: stepOf(r) };
        delete bare.on;
        return bare;
      }).sort(byDate),
    })).filter(gr => gr.rows.length > 0);

    /* WHERE IT STANDS — the strip's own reading, not a second opinion. */
    const j = journeyOf(a, tests, items, today, programs);
    const now = journeyNow(j);
    const why = redReasons(a, tests, items, today);
    /* A late fix or program is drawn red in the band; folded, the header is
       all that shows, so it says so too. */
    const all = rows.flatMap(r => [r, ...(r.fixes ?? [])]);
    /* Counted off the rows, each by what it is — "1 late · 2 a problem" —
       so the header says what the bars show (lib/install lateOrProblem). A
       reason with no row (a step with no date) is still said, in its words. */
    const red = badWords(all) || (why.length ? `${why[0]}${why.length > 1 ? ` · and ${why.length - 1} more` : ''}` : '');
    const redRows = all.some(r => isBad(r.tone)), problemRows = all.some(r => r.tone === 'problem');
    const late = redRows || (!problemRows && (j.some(x => x.tone === 'late') || why.length > 0));
    const tone: GanttTone = late ? 'late'
      : problemRows ? 'problem'
      : now === 'Handed over' ? 'done'
        : rows.some(r => r.tone === 'ran') ? 'ran'
          : j.some(x => x.tone === 'going') || rows.some(r => r.tone === 'booked') ? 'booked' : 'none';
    /* "due on site" for a machine not here yet — never "at Install" (machineAt). */
    /* Its open critical problems, counted off its stages — the header is all
       that shows of a folded band on paper. */
    const crit = rows.reduce((n, r) => n + (r.critical ?? 0), 0);
    const says = [machineAt(a, j).says, crit ? criticalCount(crit) : '', red, rows.length ? '' : 'nothing dated yet'].filter(Boolean).join(' · ');
    const gate = JOURNEY.find(x => x.label === now) ?? JOURNEY[JOURNEY.length - 1];
    const bar = barOf(rows, g.dayList);
    return { id: a.id, name: a.name, says, tone, path: gate.path, groups, ...(bar ? { bar } : {}) };
  });

  /* THE LINE AND THE WHOLE JOB — what is on no one machine, in the gates'
     order, with the walk's lane. */
  const walk = !!g.walk && g.walk.days.length > 0;
  if (rest.length || walk) {
    const rows = rest.flatMap(gr => gr.rows);
    const bad = rows.filter(r => isBad(r.tone)).length + (walk && g.walk ? g.walk.late : 0);
    const open = walk && g.walk ? g.walk.open : 0;
    const tone: GanttTone = bad ? 'late'
      : rows.some(r => r.tone === 'problem') ? 'problem'
      : rows.some(r => r.tone === 'ran') ? 'ran'
        : rows.length > 0 && rows.every(r => r.tone === 'done') && !open ? 'done'
          : rows.some(r => r.tone === 'booked') || open ? 'booked' : 'none';
    /* What is in it, then what is wrong with it — only the walk: its lane's words. */
    const says = [jobContents(rest, walk), !rows.length && g.walk ? g.walk.words : badWords(rows, walk && g.walk ? g.walk.late : 0)].filter(Boolean).join(' · ');
    const bar = barOf(rows, g.dayList);
    bands.push({ name: JOB_BAND, says, tone, groups: rest, ...(walk ? { walk: true } : {}), ...(bar ? { bar } : {}) });
  }
  return { ...g, machines: bands };
}

/* WHICH WAY THE PLAN IS DRAWN, remembered on this device — the screen's
   switch, and the paper follows it. By machine unless somebody chose. */
const BY_KEY = 'faultline.gantt.by';
export function ganttBy(): GanttBy {
  try { return localStorage.getItem(BY_KEY) === 'stage' ? 'stage' : 'machine'; } catch { return 'machine'; }
}
export function keepGanttBy(by: GanttBy): void {
  try { localStorage.setItem(BY_KEY, by); } catch { /* the choice lasts the visit */ }
}
