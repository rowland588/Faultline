/* THE PLAN, DRAWN — everything the job carries a date for, on one axis.
 *
 * Rowland: "what you've described almost is like a Gantt chart in a way, and
 * not literally."
 *
 * Not literally, and the difference matters. A Gantt is a chart of TASKS WITH
 * DEPENDENCIES, and drawing one would mean asking him to declare that the film
 * blocks the trial which blocks the sign-off — work he has not done, in a
 * notation he would then have to maintain. This draws only what the app already
 * knows: the days that are already written on machines, materials, programs and
 * trials, laid side by side so the shape of the job is visible at all.
 *
 * NOTHING NEW IS STORED. lib/standing.ts already returns `plan: PlanMark[]`
 * off those four lists. This is the arithmetic of putting them on an axis, and
 * it lives here — away from React and away from jsPDF — because the screen and
 * the client report have to agree about where a mark sits, and the surest way
 * to make them agree is to give them both the same numbers.
 *
 * THE CONTRACT WITH THE DRAWERS is the one the rest of the report already
 * keeps: positions arrive as fractions of the axis, dates arrive already
 * written for print. Neither drawer parses a date, and neither decides what a
 * mark means.
 *
 * HOW A MARK READS, in one rule with two halves:
 *
 *   FILLED   it has happened          HOLLOW  it has not
 *   green    and it was good          blue    and it is still ahead of us
 *   red      and it was not           red     and the day has gone
 *
 * So a hollow red ring is "this was due and it is not done", which is the
 * thing a client actually looks for, and it never gets confused with a trial
 * that ran and failed — that one happened, and is filled.
 *
 * THE SLIP IS DRAWN, not merely counted. When the agreed date and the expected
 * date differ, both are marked and the ground between them is shaded. The
 * verdict card says "the date has moved 8 days"; this is those 8 days at the
 * scale of the job, which is the difference between a number and an argument.
 */
import { recordHref } from './install';
import type { PlanMark } from './standing';

/** A mark, placed. `at` and `until` are fractions of the axis, 0 at the left. */
export interface PlacedMark {
  /** The record it was drawn from, so tapping the mark opens it. Absent on a
   *  bunch (bunchPlan), which stands for several and opens its lane's list. */
  id?: string;
  kind: PlanMark['kind'];
  at: number;
  /** Set only where a thing occupies time rather than happening on a day: a
   *  machine arrives and starts running, and those are different days. */
  until?: number;
  label: string;
  /** Already written for print — "21 Sep". No drawer parses a date. */
  when: string;
  tone: PlanMark['tone'];
  /** How many records the mark stands for, when bunchPlan made it one. */
  count?: number;
  /** Which way the words go from the mark. Right, unless they would run off
   *  the end of the axis and there is more room behind the mark than ahead of
   *  it — the last thing on a plan is the one a client looks for, and it must
   *  never be the one that gets cut. See placeLabel. Optional only so that a
   *  hand-built mark in a test reads as right-going with the whole axis to
   *  itself, which is what an unplaced mark is. */
  side?: 'right' | 'left';
  /** How much of the axis the words have on that side before they reach its
   *  edge, as a fraction. A drawer whose words are wider than this trims them
   *  rather than letting them leave the lane. */
  room?: number;
}

/** One horizontal band. `rows` is the band split into as many lines as it took
 *  to stop the labels sitting on top of each other. */
export interface PlanLane {
  kind: PlanMark['kind'];
  label: string;
  rows: PlacedMark[][];
}

export interface PlanMarker {
  at: number;
  label: string;
  /** "26 Oct" — the date under the label. */
  when: string;
}

export interface PlanAxis {
  /** ISO, month-aligned. Kept for tests and for anybody debugging a position. */
  from: string;
  to: string;
  /** Month starts, as fractions. The first is always 0. */
  ticks: { at: number; label: string }[];
  /** Absent when today falls outside the axis, which happens on a job whose
   *  dates are all in the past. */
  today?: number;
  /** Where the job is expected to be at rate. */
  expected?: PlanMarker;
  /** What that was agreed to be, drawn ONLY when it differs from expected —
   *  two markers on the same day is a stutter, not information. */
  agreed?: PlanMarker;
}

export interface Plan {
  axis: PlanAxis;
  lanes: PlanLane[];
  /** Nothing carries a date. The caller draws its own empty state rather than
   *  an axis with nothing on it, which reads as a fault. */
  empty: boolean;
}

/** One month of the agenda — the phone's reading of the same marks. */
export interface PlanMonth {
  label: string;
  items: { id?: string; kind: PlanMark['kind']; when: string; label: string; tone: PlanMark['tone']; count?: number }[];
}

/* The order the job actually runs in, which is not the order the lists were
   built in: a machine lands, its film turns up, a program is proved on it, and
   then a trial can be run. Reading top to bottom is reading the job. */
const LANES: { kind: PlanMark['kind']; label: string }[] = [
  { kind: 'machine', label: 'Machines' },
  /* Straight under the machines: installing is what happens between a
     machine's bar starting and it running. */
  { kind: 'install', label: 'Install' },
  { kind: 'material', label: 'Materials' },
  { kind: 'program', label: 'Programs' },
  /* The gates after Install, where they fall in the job: a machine is set up
     before it is proved, and handed over last. */
  { kind: 'setup', label: 'Set up' },
  { kind: 'fix', label: 'Fixes' },
  // A 3P or lever tree job's actions, off its board (lib/actions).
  { kind: 'action', label: 'Actions' },
  { kind: 'test', label: 'Tests' },
  { kind: 'handover', label: 'Hand over' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "21 Sep". The one place a date becomes words for this drawing. */
export function whenWords(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

/** A day, or a block of them: "21 Sep", "5–9 Oct", "30 Sep – 2 Oct". The start is
 *  half of what a block says, so a bar's words give both ends. */
export function windowWords(from: string, until?: string): string {
  if (!until || until <= from) return whenWords(from);
  if (from.slice(0, 7) === until.slice(0, 7)) return `${Number(from.slice(8, 10))}–${whenWords(until)}`;
  return `${whenWords(from)} – ${whenWords(until)}`;
}

/** "Sep", or "Jan 27" where the year turns — a job running over a new year
 *  that says "Jan" twice is a job nobody can read. */
function monthWords(y: number, m: number, firstYear: number): string {
  return m === 0 || y !== firstYear ? `${MONTHS[m]} ${String(y).slice(2)}` : MONTHS[m];
}

const dayMs = 86_400_000;
const utc = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const iso = (t: number): string => new Date(t).toISOString().slice(0, 10);

/** The first of the month an ISO date falls in. */
const monthStart = (s: string): string => `${s.slice(0, 7)}-01`;

/** The first of the month AFTER the one an ISO date falls in — the exclusive
 *  end of the axis, so a mark on the last day of the month is inside it. */
function monthAfter(s: string): string {
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7));
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export interface PlanOpts {
  today?: string;
  expectedAt?: string;
  plannedAt?: string;
  /** How far apart two marks must be, as a fraction of the axis, before they
   *  can share a line. It is the width of a label, so it belongs to whoever is
   *  drawing: an A3 sheet fits far more across than a phone does. */
  minGap?: number;
  /** How much of the axis THIS mark's words will actually take, as a fraction.
   *
   *  A flat minGap treats "P-104" and "Seal integrity — Finest Red 2kg —
   *  re-test" as the same width, and they are not: on the A3 the second ran
   *  straight through the mark seven days after it. The screen measures its
   *  text and passes the truth; the report estimates by character count. */
  widthOf?: (m: PlanMark) => number;
  /** Dates the axis must reach even though no mark here falls on them — the
   *  other jobs' dates, when several jobs are drawn under one calendar and a
   *  month has to land in the same place on every one of them. */
  span?: string[];
}

/** A label's width as a fraction of the axis, near enough to pack by.
 *
 *  Character count rather than real measurement, because this runs in the app
 *  and in the report and only one of those can measure text. It is deliberately
 *  a slight over-estimate: too generous costs a line, too mean overlaps, and
 *  only one of those is unreadable. */
export function labelGap(label: string, charPt: number, padPt: number, trackPt: number): number {
  return (label.length * charPt + padPt) / Math.max(1, trackPt);
}

/** Which side of a mark its words go, and how much axis they have there.
 *
 *  Right by default, because that is the way a plan reads. Back towards the
 *  middle when they would run off the end, because the last mark on a plan is
 *  the one a client looks for. When they fit on neither side — a long title on
 *  a mark in the middle of a short axis — the roomier side, and the drawer
 *  trims them to `room`. `at` and `end` are fractions; `end` is where a bar
 *  stops, and the same as `at` for a mark that happens on one day.
 *
 *  This used to be a fixed fraction of the axis (past 72%, flip), which was
 *  wrong in both directions: a short label at 80% was flipped for nothing and
 *  a long one at 60% ran a hundred pixels off the card. */
export function placeLabel(at: number, end: number, width: number): { side: 'right' | 'left'; room: number } {
  const ahead = Math.max(0, 1 - end);
  const behind = Math.max(0, at);
  if (width <= ahead) return { side: 'right', room: ahead };
  if (width <= behind) return { side: 'left', room: behind };
  return ahead >= behind ? { side: 'right', room: ahead } : { side: 'left', room: behind };
}

/** The stretch of axis a mark and its words take up, as [from, to] fractions:
 *  the dot (or bar) plus the words on whichever side they went, trimmed to
 *  the room there was. Two marks can share a line only when their footprints
 *  are clear of each other. Before this, only the width to the RIGHT of the
 *  previous mark was checked, so a mark whose words had been written back to
 *  the left landed them across whatever was already on the line. */
export function footprint(m: { at: number; until?: number; side?: 'right' | 'left'; room?: number }, width: number): [number, number] {
  const end = m.until != null && m.until > m.at ? m.until : m.at;
  const w = Math.min(width, m.room ?? 1);
  return m.side === 'left' ? [m.at - w, end] : [m.at, end + w];
}

/** A hair of clear axis between two footprints on a line — under half a day
 *  on a two-month axis, enough that words never touch the next dot. */
const CLEAR = 0.004;

/**
 * Put the marks on an axis.
 *
 * The axis runs from the month the first dated thing falls in to the month the
 * last one does — including today and both project dates, so a job whose work
 * is all done still shows the run up to the date it is judged on.
 */
export function layoutPlan(marks: PlanMark[], opts: PlanOpts = {}): Plan {
  const minGap = opts.minGap ?? 0.12;
  const today = opts.today;

  /* Every ISO date this drawing has to contain. A machine's bar ends at
     `until`, so that counts too. */
  const dates: string[] = [];
  for (const m of marks) {
    dates.push(m.at);
    if (m.until) dates.push(m.until);
  }
  for (const d of [today, opts.expectedAt, opts.plannedAt, ...(opts.span ?? [])]) if (d) dates.push(d);

  const sorted = [...dates].sort();
  const first = sorted[0], last = sorted[sorted.length - 1];
  if (marks.length === 0 || !first || !last) {
    return { axis: { from: '', to: '', ticks: [] }, lanes: [], empty: true };
  }

  const from = monthStart(first);
  const to = monthAfter(last);
  const t0 = utc(from), span = Math.max(dayMs, utc(to) - t0);
  const pos = (s: string): number => (utc(s) - t0) / span;

  /* ------------------------------- the ticks ------------------------------ */
  const ticks: { at: number; label: string }[] = [];
  const firstYear = Number(from.slice(0, 4));
  for (let t = from; utc(t) < utc(to); t = monthAfter(t)) {
    ticks.push({ at: pos(t), label: monthWords(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, firstYear) });
  }

  /* ------------------------------- the lanes ------------------------------ */
  const lanes: PlanLane[] = [];
  for (const lane of LANES) {
    const mine = marks.filter(m => m.kind === lane.kind);
    if (mine.length === 0) continue;   // an empty band is a row of nothing

    const placed = mine
      .map(m => {
        const at = pos(m.at);
        const until = m.until ? pos(m.until) : undefined;
        const end = until != null && until > at ? until : at;
        const width = opts.widthOf ? Math.max(opts.widthOf(m), 0.01) : minGap;
        const { side, room } = placeLabel(at, end, width);
        const p: PlacedMark = {
          ...(m.id ? { id: m.id } : {}),
          kind: m.kind, at, until, label: m.label, when: windowWords(m.at, m.until), tone: m.tone, side, room,
          ...(m.count ? { count: m.count } : {}),
        };
        return { placed: p, foot: footprint(p, width) };
      })
      .sort((a, b) => a.placed.at - b.placed.at);

    /* Greedy packing: a mark goes on the first line where nothing already
       there is under its footprint — dot, bar or words, whichever way the
       words went. In date order, so the lines read left to right. */
    const rows: { placed: PlacedMark; foot: [number, number] }[][] = [];
    for (const m of placed) {
      const row = rows.find(r => r.every(o =>
        m.foot[0] >= o.foot[1] + CLEAR || m.foot[1] + CLEAR <= o.foot[0]));
      if (row) row.push(m); else rows.push([m]);
    }
    lanes.push({ kind: lane.kind, label: lane.label, rows: rows.map(r => r.map(x => x.placed)) });
  }

  /* ------------------------------ the markers ----------------------------- */
  const axis: PlanAxis = { from, to, ticks };
  if (today && utc(today) >= t0 && utc(today) <= utc(to)) axis.today = pos(today);
  if (opts.expectedAt) {
    axis.expected = { at: pos(opts.expectedAt), label: 'At rate', when: whenWords(opts.expectedAt) };
    /* Only when it moved. The agreed date and the expected date being the same
       is the good case, and drawing it twice says nothing. */
    if (opts.plannedAt && opts.plannedAt !== opts.expectedAt) {
      axis.agreed = { at: pos(opts.plannedAt), label: 'Agreed', when: whenWords(opts.plannedAt) };
    }
  }

  return { axis, lanes, empty: false };
}

/**
 * The same marks, read down instead of across.
 *
 * A phone is 390 points wide and the axis wants two months on it; four bands of
 * labelled dots at that width is a smear. So at that size the plan becomes what
 * a plan is when you say it out loud — this month, then next month, in order.
 * It is not a second idea: same marks, same words, same tones, arranged for the
 * space there is.
 */
export function planAgenda(marks: PlanMark[]): PlanMonth[] {
  const out: PlanMonth[] = [];
  /* Sorted FIRST, then asked for its first year. Reading the year off the
     unsorted input meant whichever mark happened to be at the head of the
     array decided whether the months said "Jan" or "Jan 27" — which on a job
     running over a new year is the difference between a readable plan and one
     that says Jan twice. */
  const inOrder = [...marks].sort((a, b) => a.at.localeCompare(b.at));
  const firstYear = Number(inOrder[0]?.at.slice(0, 4) ?? 0);

  for (const m of inOrder) {
    const label = monthWords(Number(m.at.slice(0, 4)), Number(m.at.slice(5, 7)) - 1, firstYear);
    let month = out[out.length - 1];
    if (!month || month.label !== label) { month = { label, items: [] }; out.push(month); }
    month.items.push({
      ...(m.id ? { id: m.id } : {}),
      kind: m.kind, when: windowWords(m.at, m.until), label: m.label, tone: m.tone,
      ...(m.count ? { count: m.count } : {}),
    });
  }
  return out;
}

const MANY: Record<PlanMark['kind'], string> = {
  install: 'install steps', setup: 'set-up steps', handover: 'hand-over items', test: 'tests',
  fix: 'fixes', material: 'materials', program: 'programs', machine: 'machines', action: 'actions',
  note: 'reminders',
};

/** SAME DAY, SAME KIND, SAME OUTCOME — ONE LINE. Line 2B proved sixteen
 *  programs on 29 September and the plan drew sixteen rows of them, pushing
 *  the fixes and the tests that actually needed reading a screen further
 *  down. Three or more alike become "16 programs", and the lane still counts
 *  all sixteen. For the screen: the client report's sheet already folds a
 *  busy lane its own way (paceReportPdf fitPlan). */
export function bunchPlan(marks: PlanMark[], least = 3): PlanMark[] {
  const groups = new Map<string, PlanMark[]>();
  for (const m of marks) {
    const k = m.until ? `solo:${groups.size}` : `${m.kind}|${m.at}|${m.tone}`;
    const g = groups.get(k);
    if (g) g.push(m); else groups.set(k, [m]);
  }
  const out: PlanMark[] = [];
  for (const g of groups.values()) {
    const n = g.reduce((a, m) => a + (m.count ?? 1), 0);
    if (g.length < least) out.push(...g);
    else out.push({ kind: g[0].kind, at: g[0].at, tone: g[0].tone, label: `${n} ${MANY[g[0].kind]}`, count: n });
  }
  return out.sort((x, y) => x.at.localeCompare(y.at) || x.kind.localeCompare(y.kind));
}

/** The screen each lane's records are listed on — where a bunch opens. */
const LIST_OF: Record<PlanMark['kind'], string> = {
  install: 'install', setup: 'set-up', handover: 'handover', test: 'testing', fix: 'fixes',
  material: 'materials', program: 'programs', machine: 'install', action: 'board', note: 'notes',
};

/** WHERE A MARK OPENS — the record it was drawn from. Rowland: "having nodes
 *  that don't open is unacceptable." The same doors the board's own list
 *  (JobsBoard whereTo) and the project page's Gantt (gantt ganttHref) use for
 *  the same kinds: an action on its own sheet, a test, fix or step in the
 *  drawer over its list (lib/install recordHref), and the lists kept whole on one screen (materials, programs, notes,
 *  machines on Install) on that screen. A bunch stands for several, so it
 *  opens its lane's list rather than picking one of them. */
export function planHref(projectId: string, m: { kind: PlanMark['kind']; id?: string; count?: number }): string {
  const base = `/project/${projectId}`;
  const one = m.id && !m.count ? m.id : undefined;
  if (one && m.kind === 'action') return `${base}/board?a=${encodeURIComponent(one)}`;
  if (one && (m.kind === 'test' || m.kind === 'fix' || m.kind === 'install' || m.kind === 'setup' || m.kind === 'handover')) {
    return recordHref(projectId, one, m.kind);
  }
  return `${base}/${LIST_OF[m.kind]}`;
}

/** What the plan is worth saying about itself, for the sheet's so-what line.
 *  Counted off the marks rather than stored, like everything else here. */
export function planSays(marks: PlanMark[], today: string): string {
  if (marks.length === 0) return 'Nothing on any list carries a date yet.';
  const done = marks.filter(m => m.tone === 'done').length;
  const late = marks.filter(m => m.tone === 'late').length;
  const ran = marks.filter(m => m.tone === 'ran').length;
  const ahead = marks.filter(m => m.at > today).length;
  /* Counted as DATES, and said so. "3 of 10 done" printed under "10 things
     outstanding" on the client report read as a contradiction: the ten here
     are the dated marks on the chart, the ten there every open thing. */
  const bits = [`${marks.length} date${marks.length === 1 ? '' : 's'}`, `${done} done`];
  if (ahead) bits.push(`${ahead} still ahead`);
  if (ran) bits.push(`${ran} waiting on a verdict`);
  if (late) bits.push(`${late} late`);
  return bits.join(' · ');
}

export { dayMs as PLAN_DAY_MS, iso as planISO };


/* EACH GATE AS ONE BAR, START TO FINISH. Rowland: "we need date start and date
 * finish ... it needs to show a timeline." The marks already carry both ends of
 * every step; this folds them by gate — Install, Set up, Commission, Hand over —
 * so a job on the Home board reads as four bars, each from the first day
 * anything at that gate starts to the last day it finishes. Nothing is stored. */
export type SpanGate = 'install' | 'setup' | 'commission' | 'handover';
export interface GateSpan {
  gate: SpanGate;
  label: string;
  from: number;
  to: number;
  /** done when everything dated at the gate has happened and was good; late when
   *  anything failed or its day has gone; otherwise still ahead. */
  tone: 'done' | 'late' | 'booked';
  n: number;
  /** "5–16 Oct" — from the raw marks, when they are given. */
  words?: string;
}

const SPAN_OF: Partial<Record<PlacedMark['kind'], SpanGate>> = { install: 'install', setup: 'setup', test: 'commission', handover: 'handover' };
const SPAN_LABEL: Record<SpanGate, string> = { install: 'Install', setup: 'Set up', commission: 'Commission', handover: 'Hand over' };
const SPAN_ORDER: SpanGate[] = ['install', 'setup', 'commission', 'handover'];

export function gateSpans(marks: PlacedMark[], raw: PlanMark[] = []): GateSpan[] {
  const out: GateSpan[] = [];
  for (const gate of SPAN_ORDER) {
    const mine = marks.filter(m => SPAN_OF[m.kind] === gate);
    if (!mine.length) continue;
    const from = Math.min(...mine.map(m => m.at));
    const to = Math.max(...mine.map(m => (m.until != null && m.until > m.at ? m.until : m.at)));
    const tone = mine.some(m => m.tone === 'failed' || m.tone === 'late') ? 'late'
      : mine.every(m => m.tone === 'done') ? 'done' : 'booked';
    const dated = raw.filter(m => SPAN_OF[m.kind as PlacedMark['kind']] === gate);
    const first = dated.map(m => m.at).sort()[0];
    const last = dated.map(m => (m.until && m.until > m.at ? m.until : m.at)).sort().pop();
    out.push({ gate, label: SPAN_LABEL[gate], from, to, tone, n: mine.length, ...(first && last ? { words: windowWords(first, last) } : {}) });
  }
  return out;
}
