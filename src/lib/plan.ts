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
import type { PlanMark } from './standing';

/** A mark, placed. `at` and `until` are fractions of the axis, 0 at the left. */
export interface PlacedMark {
  kind: PlanMark['kind'];
  at: number;
  /** Set only where a thing occupies time rather than happening on a day: a
   *  machine arrives and starts running, and those are different days. */
  until?: number;
  label: string;
  /** Already written for print — "21 Sep". No drawer parses a date. */
  when: string;
  tone: PlanMark['tone'];
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
  items: { kind: PlanMark['kind']; when: string; label: string; tone: PlanMark['tone'] }[];
}

/* The order the job actually runs in, which is not the order the lists were
   built in: a machine lands, its film turns up, a program is proved on it, and
   then a trial can be run. Reading top to bottom is reading the job. */
const LANES: { kind: PlanMark['kind']; label: string }[] = [
  { kind: 'machine', label: 'Machines' },
  { kind: 'material', label: 'Materials' },
  { kind: 'program', label: 'Programs' },
  { kind: 'trial', label: 'Trials' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "21 Sep". The one place a date becomes words for this drawing. */
export function whenWords(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
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
   *  straight through the mark seven days after it. Labels are drawn to the
   *  RIGHT of their dot, so what has to fit before the next dot is the
   *  PREVIOUS mark's label — which is what the packer asks this for. */
  widthOf?: (m: PlanMark) => number;
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
  for (const d of [today, opts.expectedAt, opts.plannedAt]) if (d) dates.push(d);

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
      .map(m => ({
        placed: {
          kind: m.kind, at: pos(m.at), until: m.until ? pos(m.until) : undefined,
          label: m.label, when: whenWords(m.at), tone: m.tone,
        } satisfies PlacedMark,
        from: m,
      }))
      .sort((a, b) => a.placed.at - b.placed.at);

    /* Greedy packing: a mark goes on the first line whose last mark has enough
       clear space before it. In date order, so the lines read left to right. */
    const rows: { placed: PlacedMark; from: PlanMark }[][] = [];
    for (const m of placed) {
      const row = rows.find(r => {
        const prev = r[r.length - 1];
        if (!prev) return false;
        const need = opts.widthOf ? Math.max(opts.widthOf(prev.from), 0.01) : minGap;
        return m.placed.at - (prev.placed.until ?? prev.placed.at) >= need;
      });
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
    month.items.push({ kind: m.kind, when: whenWords(m.at), label: m.label, tone: m.tone });
  }
  return out;
}

/** What the plan is worth saying about itself, for the sheet's so-what line.
 *  Counted off the marks rather than stored, like everything else here. */
export function planSays(marks: PlanMark[], today: string): string {
  if (marks.length === 0) return 'Nothing on any list carries a date yet.';
  const done = marks.filter(m => m.tone === 'done').length;
  const late = marks.filter(m => m.tone === 'late').length;
  const ahead = marks.filter(m => m.at > today).length;
  const bits = [`${done} of ${marks.length} done`];
  if (ahead) bits.push(`${ahead} still ahead`);
  if (late) bits.push(`${late} past the day`);
  return bits.join(' · ');
}

export { dayMs as PLAN_DAY_MS, iso as planISO };
