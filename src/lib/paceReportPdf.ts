/* THE CLIENT REPORT, DRAWN AS A REAL PDF.
 *
 * Not a screenshot. Earlier versions rasterised the live page with html2canvas,
 * which renders a CLONE of the document in a hidden iframe — and that clone has
 * to re-fetch the stylesheet, re-evaluate the media queries and finish before it
 * is captured. On a developer machine it always won that race; on a real device,
 * over a network, behind a service worker, it did not, and the report came out
 * unstyled, mis-sized or soft. Four different symptoms, one cause: the output
 * depended on the browser's state at the moment you pressed the button.
 *
 * So nothing here depends on the browser. Every rule, box and glyph is drawn
 * from the numbers, in points, on an A3 landscape page. The result is a proper
 * vector PDF — real selectable text, sharp at any zoom, a few hundred KB — and
 * byte-for-byte the same document on every device, every time.
 *
 * The layout deliberately mirrors the on-screen report: the same sections in the
 * same order, the same palette, the same chart geometry. */
import {
  INK, INK2, MUTED, LINE, ACCENT, BRAND, SURF2, OK, WARN, DANGER, BLUE, ACTUAL, TARGET,
  san, setFont, fit, panel, table, wash, type Doc,
} from './reportKit';
import { boardSheets, boardScale, runHeight, BOARD_ACT_H, BOARD_ACT_GAP,
  BOARD_AREA_CHROME, BOARD_AREA_GAP } from './pillars';
import type { PlanAxis, PlanLane, PlacedMark } from './plan';
import { foundWords } from './testing';
import { vsTarget } from './measures';
import type { LineSeries } from './measures';


export interface PaceReportData {
  now: number;
  /** Whose project this is. The report used to say "Project Pace" because there
   *  was only one; now it says whatever the project is called, and who leads it,
   *  because the person receiving it needs to know who to go to. */
  title: string;
  lead?: string;
  /** What the lead IS on this report — the project's lead, or, on a line's own
   *  deck, that line's owner. The page prints the same words. */
  leadRole: string;
  subtitle: string;
  lines: {
    key: string; name: string; variant?: string;
    owner?: string; sponsor?: string;
    /** WHAT THIS LINE IS MEASURED ON, and where it stands — the same series the
     *  screen's chart takes, so the page and the file cannot disagree about
     *  which period is in play or which way is good. Absent on a project that
     *  has not said what it measures yet, and the panel says so. */
    series?: LineSeries;
  }[];
  atTarget: number;
  pctDone: number; complete: number; total: number; openTotal: number; openOnTrack: number; late: number;
  openSnags: number; winsThisWeek: number;
  /** The roll-up: one row per line, each number coming from that line's own
   *  pack. On a line's own deck this is the single line it covers. */
  byLine: {
    /** True for an area the tracker carries that no project line answers for —
     *  drawn muted, because the columns only a line can fill are empty by
     *  nature rather than by neglect. */
    noLine?: boolean;
    name: string; owner: string;
    open: number; late: number; done: number; total: number;
    nextOpen: number; nextDone: number; snags: number; wins: number;
    /** The latest reading on the measure the project leads on, and whether it is
     *  on the good side of its target — worked out where the direction is known
     *  rather than by comparing two numbers here. */
    latest: number | null; meeting?: boolean; unit?: string;
  }[];
  /* WHAT THE JOB IS WAITING ON, drawn as the sheet it comes off: a row per
     thing, a column per week, green from the week it lands. `covered` is worked
     out by lib/materials alongside the screen's own grid, so the page and the
     file cannot disagree about which cells are green. Absent when the project
     is waiting on nothing, and then the sheet is not printed at all. */
  materials?: {
    total: number; here: number; waiting: number; late: number; nextDue?: string;
    weeks: { start: string; label: string; month: string }[];
    /* `due` arrives already written for print ("21 Sep"), the same as every
       other date in this contract: the drawer never looks at the DOM and never
       parses a date either. */
    rows: {
      what: string; due?: string; here: boolean; late?: number; covered: boolean[];
      /* The week it lands in, one entry per column and at most one of them set.
         The date is printed IN that cell: the side column is 62pt wide and easy
         to read past, which is how a sheet ends up looking like a row of grey
         squares to the person it was drawn for. */
      lands: (string | undefined)[];
    }[];
  };
  /* WHAT THE MACHINE CAN RUN, drawn the same way and for the same reason. The
     one difference is the fill: a film is green or it is not, a program is
     green (proved), amber (on the machine, unproved) or hollow (not written),
     with a ring on the week its test is booked. `fill` and `booked` are worked
     out by lib/programs beside the screen's own grid, so the page and the file
     cannot shade a different week. Absent when there are no programs, and then
     the sheet is not printed at all. */
  programs?: {
    total: number; proved: number; onMachine: number; needed: number;
    overdue: number; nextTest?: string;
    weeks: { start: string; label: string; month: string }[];
    /* `when` arrives already written for print ("proved 14 Sep", "29 Sep",
       "no date"), the same as every other date in this contract: the drawer
       never parses one. */
    rows: {
      what: string; runs?: string; when: string;
      state: 'needed' | 'onMachine' | 'proved'; overdue?: number;
      fill: ('proved' | 'machine' | 'none')[]; booked: boolean[];
    }[];
  };
  /* WHERE THE JOB IS, and WHEN — the sheet the report never had.
   *
   * The screen leads on a verdict card, a timeline and a table of what is
   * outstanding; until this existed the client got none of the three, and the
   * footer under the screen's table promised "the client report prints this
   * same table" while it did not. Same call, same numbers: `standing()` for
   * the sentence and the rows, `layoutPlan()` for the marks — laid out with
   * the SHEET's own minGap, because an A3 fits far more across than a phone
   * and should therefore stack fewer lines.
   *
   * Everything arrives drawn-ready, as everywhere else in this contract:
   * positions are fractions of the axis and dates are already words. */
  plan?: {
    /** The verdict, in the words the screen's card uses. */
    says: string;
    /** "The date has moved 8 days from what was agreed." Absent when it hasn't. */
    slip?: string;
    /** "4 of 13 done · 4 still ahead · 2 past the day" */
    counted: string;
    axis: PlanAxis;
    lanes: PlanLane[];
    /** The five rows of the screen's table, unchanged. */
    outstanding: { what: string; open: number; late: number; whose?: string }[];
  };
  /* THE TRIALS — a commissioning job's whole story, and the report had no page
     for it. Planned, which machine, what it passes on, who with; and for one
     that has happened, the day and what came of it. Absent on a line's own deck
     and on a project with none, and then no sheet is printed. */
  trials?: {
    planned: number; passed: number; failed: number; notRun: number;
    rows: {
      title: string; machine: string; when: string; passesIf: string;
      withWhom: string; product: string; result: string;
      outcome: 'planned' | 'passed' | 'failed' | 'notRun';
      outcomeWord: string;
      /* ---- the fundamentals the client acts on, lifted out of the whole day ----
       * The trial card prints everything. This prints the loop: what it was
       * meant to do, what it actually did, what that turned up, and what
       * happens next with a name and a date on it. */
      /** What happened, against what it was meant to do — never the outcome
       *  word alone, which is a verdict nobody in the room can check. */
      verdict: string;
      found: { written: number; actioned: number; undecided: number };
      /** The first next step still outstanding. */
      next?: { what: string; owner: string; due: string; done: boolean };
      /** How many more there are after that one. */
      nextMore: number;
      follows?: string;
      ledTo: string[];
    }[];
  };
  /** Does this project keep a weekly tracker at all? A commissioning job does
   *  not, and printing it a ppm sheet, a 3P board and an action list is three
   *  pages of scaffolding in front of the two it does carry. */
  tracker: boolean;
  lateActions: { line: string; what: string; owner: string; due: string }[];
  lateMore: number;
  todos: { state: 'todo' | 'waiting'; what: string; who: string; when: string }[];
  /** Finished lines and what came of them. A Next step marked Done used to drop
   *  out of the report entirely, taking its outcome with it — which is the one
   *  part the client most wants to read. */
  completed: { what: string; who: string; outcome: string }[];
  completedMore: number;
  /** `line` is which line's walk it came off. On the project's report the
   *  snags are merged from every line, so without it the client reads six problems
   *  with no idea whose they are. Empty on a line's own deck, where the answer
   *  is on the masthead. */
  snags: { problem: string; owner: string; days: number; status: string; line: string }[];
  /* `impact` is the claim as it should read. When the win carries a proof it is
     the derived sentence and `verdict` says which way it went; with no proof it
     is whatever somebody typed and `verdict` is absent. The page draws the two
     differently on purpose — a measured claim should not look like a typed one. */
  wins: { title: string; impact: string; story: string; who: string; where: string;
          verdict?: 'proven' | 'better' | 'flat' | 'worse' }[];
  /* PEOPLE · PROCESS · PLANT, straight off the workbook. Its own sheet, because
     three columns of actions is the shape somebody is being handed — squeezed
     into a corner it stops being a board and becomes a list. */
  board: { area: string; pillar: 'people' | 'plant' | 'process'; title: string;
           owner: string; due: string; rag: string }[];
  /** Rows the workbook did not place. Printed as a count, never hidden. */
  boardUnplaced: number;
  /* WHERE THE TIME IS GOING. Present only when the project runs a Pareto and an
     upload has carried the sheet; absent is the normal case, and an absent
     Pareto costs the report a page rather than printing an empty one. */
  pareto?: {
    period?: string; beforePeriod?: string; headline?: string;
    totalMins: number; totalStops: number;
    vitalCount: number; vitalShare: number;
    comparable: boolean;
    rows: { category: string; mins: number; share: number; events: number;
            minPerEvent: number; vital: boolean; move: string; verdict: string }[];
    more: number;
    gone: string[];
  };
  /** The project's lever tree, flat — parent ids, drawn into a page of its own.
   *  Empty when nobody has drawn one, and then the page is not printed at all
   *  rather than printed blank. */
  tree: { id: string; parentId?: string; text: string; rag: string; sort: number }[];
}

/* ---------- small drawing helpers ---------- */

/** Trim to fit a column, with an ellipsis — the exec cut, never a wrapped essay. */
/* ---------- one line chart, same geometry as the on-screen SVG ----------
 *
 * Takes the measure's own series rather than four quarters of packs per minute.
 * The x axis is TIME: a fortnight between two readings is drawn as a fortnight,
 * which the week-indexed version could not do.
 */
function chart(d: Doc, x: number, y: number, w: number, h: number, l: PaceReportData['lines'][number]) {
  d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 5, 5, 'FD');

  /* head: name + people on the left, latest reading and margin on the right */
  setFont(d, 11.5, 'bold', INK);
  d.text(san(l.name), x + 12, y + 18);
  // Who is against this line. A chart with a name on it is somebody's number
  // rather than just a number — and the sub-line is read before the plot is.
  const people = [l.owner && `Owner ${l.owner}`, l.sponsor && `Sponsor ${l.sponsor}`]
    .filter(Boolean).join('  \u00b7  ');
  const sub = [people, l.variant].filter(Boolean).join('  \u00b7  ');
  if (sub) { setFont(d, 7, 'normal', MUTED); d.text(fit(d, sub, w * 0.6), x + 12, y + 28); }

  const s = l.series;
  const nice = (v: number) => String(Math.round(v * 100) / 100);

  /* A project that has not said what it measures, or a line with nothing
     recorded, gets a panel that says which — never an empty axis. */
  if (!s || s.points.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text(fit(d, s
      ? `No ${s.measure.name.toLowerCase()} recorded yet`
        + (s.target != null ? ` \u00b7 target ${nice(s.target)}${s.measure.unit ? ' ' + s.measure.unit : ''}` : '')
      : 'This project has not said what it measures yet', w - 24), x + 12, y + h / 2);
    return;
  }

  const unit = s.measure.unit ?? '';
  const target = s.target;
  const vals = s.points.map(p => p.value);
  const last = vals[vals.length - 1];

  setFont(d, 17, 'bold', INK);
  d.text(nice(last), x + w - 12, y + 20, { align: 'right' });
  setFont(d, 6.5, 'normal', MUTED);
  d.text(fit(d, unit ? `${unit} latest` : 'latest', w * 0.3), x + w - 12, y + 28, { align: 'right' });
  if (s.margin != null) {
    setFont(d, 7.5, 'bold', s.margin >= 0 ? OK : DANGER);
    d.text(`${s.margin >= 0 ? '+' : ''}${nice(s.margin)} vs ${s.period?.name ?? 'target'}`,
      x + w - 12, y + 37, { align: 'right' });
  }

  /* legend — the measure by name, and the target when there is one */
  const lgY = y + 46;
  d.setDrawColor(ACTUAL); d.setLineWidth(1.6);
  d.setLineDashPattern([], 0);
  d.line(x + 12, lgY, x + 26, lgY);
  setFont(d, 7, 'normal', INK2);
  const nameLab = fit(d, s.measure.name, w * 0.4);
  d.text(nameLab, x + 30, lgY + 2.4);
  if (target != null) {
    const tx = x + 30 + d.getTextWidth(nameLab) + 10;
    d.setDrawColor(TARGET); d.setLineDashPattern([3, 2], 0);
    d.line(tx, lgY, tx + 14, lgY);
    d.setLineDashPattern([], 0);
    setFont(d, 7, 'normal', INK2);
    d.text(fit(d, `${s.period?.name ?? 'Target'} \u00b7 ${nice(target)}${unit ? ' ' + unit : ''}`, w * 0.4),
      tx + 18, lgY + 2.4);
  }

  /* plot area — the period strip at the foot only when there are targets to show */
  const strip = s.across.some(a => a.value != null);
  const qH = strip ? 26 : 0;
  const pL = x + 34, pR = x + w - 52;
  const pT = y + 58, pB = y + h - qH - 20;

  const withTarget = target != null ? [...vals, target] : vals;
  const lo = Math.min(...withTarget), hi = Math.max(...withTarget);
  const span = hi - lo;
  const pad = span > 0 ? span * 0.35 : Math.max(Math.abs(hi) * 0.1, 1);
  const yMin = lo >= 0 ? Math.max(0, lo - pad) : lo - pad;
  const yMax = hi + pad;

  const ts = s.points.map(p => Date.parse(p.at + 'T12:00:00'));
  const t0ms = ts[0], t1ms = ts[ts.length - 1];
  const px = (i: number) => (t1ms === t0ms ? (pL + pR) / 2 : pL + ((ts[i] - t0ms) / (t1ms - t0ms)) * (pR - pL));
  const py = (v: number) => pT + ((yMax - v) / (yMax - yMin || 1)) * (pB - pT);

  // recessive gridlines + y labels
  const grid = [yMin, (yMin + yMax) / 2, yMax];
  d.setLineWidth(0.4);
  for (const g of grid) {
    d.setDrawColor('#eef3f8'); d.setLineDashPattern([2, 2], 0);
    d.line(pL, py(g), pR, py(g));
    d.setLineDashPattern([], 0);
    setFont(d, 6, 'normal', MUTED);
    d.text(nice(g), pL - 5, py(g) + 2, { align: 'right' });
  }
  // date labels: the ends and the middle, never one per reading
  const dayLab = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  setFont(d, 6, 'normal', MUTED);
  const ticks = s.points.length <= 2
    ? s.points.map((_, i) => i)
    : [0, Math.floor((s.points.length - 1) / 2), s.points.length - 1];
  for (const i of ticks) {
    d.text(dayLab(s.points[i].at), px(i), pB + 11,
      { align: i === 0 ? 'left' : i === s.points.length - 1 ? 'right' : 'center' });
  }

  // target line, dashed, labelled at the right
  if (target != null) {
    d.setDrawColor(TARGET); d.setLineWidth(1.2); d.setLineDashPattern([4, 3], 0);
    d.line(pL, py(target), pR, py(target));
    d.setLineDashPattern([], 0);
    setFont(d, 6.5, 'bold', TARGET);
    d.text('Target', pR + 5, py(target) + 2);
  }

  // the readings, in the order they were taken
  d.setDrawColor(ACTUAL); d.setLineWidth(1.8);
  for (let i = 1; i < s.points.length; i++) {
    d.line(px(i - 1), py(vals[i - 1]), px(i), py(vals[i]));
  }
  d.setFillColor(ACTUAL);
  s.points.forEach((_, i) => d.circle(px(i), py(vals[i]), 2.2, 'F'));
  setFont(d, 6.5, 'bold', ACTUAL);
  d.text(nice(last), px(s.points.length - 1) + 5, py(last) + 2);

  /* every period's target, the one in play highlighted — however many periods
     this business runs, not four. */
  if (strip) {
    const cells = s.across.slice(0, 6);
    const qW = (w - 24 - (cells.length - 1) * 5) / cells.length;
    cells.forEach((cell, i) => {
      const qx = x + 12 + i * (qW + 5), qy = y + h - qH - 6;
      const now = s.period?.name === cell.name;
      d.setFillColor(now ? '#fdf0e0' : SURF2);
      d.setDrawColor(now ? WARN : SURF2); d.setLineWidth(0.8);
      d.roundedRect(qx, qy, qW, qH, 4, 4, 'FD');
      setFont(d, 6, 'bold', now ? WARN : MUTED);
      d.text(fit(d, cell.name, qW - 4), qx + qW / 2, qy + 10, { align: 'center' });
      setFont(d, 9.5, 'bold', now ? WARN : INK);
      d.text(cell.value == null ? '--' : nice(cell.value), qx + qW / 2, qy + 21, { align: 'center' });
    });
  }
}

/* ---------- what we are waiting on, as the sheet draws it ----------
 *
 * Rowland asked for this one by pointing at the spreadsheet: "ensure it renders
 * on the pdf gm report like the picture does". The picture is not a list — it is
 * a grid, rows of film down the side and weeks across the top, green from the
 * week each one lands. A client reads coverage off it in one look, which is the
 * whole reason it is kept that way.
 *
 * So this draws the grid, not a table of dates. The columns come from the data
 * and the green cells are worked out by lib/materials — the same call the screen
 * makes, so the page and the file can never shade a different week.
 */
/* The two sheet heights, as arithmetic rather than as a side effect of drawing.
   Pulled out so the caller can ask "do these two fit one sheet?" before it
   commits a page to either of them — see drawPaceReport. */
/* ===================== WHERE THE JOB IS — the plan, on paper ================
 *
 * The same three things the project screen leads with, in the same order and
 * off the same two calls: the verdict sentence, the dated work on an axis, and
 * the table of what is outstanding with a name against it.
 *
 * THIS IS THE SHEET THE REPORT WAS MISSING. Every other page here answers a
 * narrower question — which film, which program, which trial — and a client
 * reading them in sequence had to assemble the position themselves. Rowland:
 * "this software has to have the ability for me to show the business a formal
 * process, to show that I am in control of the project." A page that says the
 * position in one sentence, draws the days it has left, and then names who owes
 * what, IS that. It goes directly behind the front page for the same reason.
 *
 * NOTHING IS COMPUTED HERE. Positions arrived as fractions and dates arrived as
 * words; this file only decides where ink goes.
 */
const PLAN_LANE_W = 74;

/** A mark's colour, and whether it is filled. The rule the screen draws by:
 *  filled means it happened, and the colour says whether that was good. */
function planInk(tone: PlacedMark['tone']): { colour: string; filled: boolean } {
  switch (tone) {
    case 'done': return { colour: OK, filled: true };
    case 'failed': return { colour: DANGER, filled: true };
    case 'late': return { colour: DANGER, filled: false };
    case 'booked': return { colour: BLUE, filled: false };
    default: return { colour: MUTED, filled: false };
  }
}

function planSheet(d: Doc, data: PaceReportData, page: number, pages: number): void {
  const pl = data.plan;
  if (!pl) return;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  /* THE PANEL IS AS TALL AS WHAT IS IN IT, the same rule the materials sheet
     keeps: a box three times the height of its content reads as a page that
     failed to finish rather than as a short list. Arithmetic, because the box
     has to be drawn before the things that go in it. */
  const rowsTotal = pl.lanes.reduce((n, l) => n + l.rows.length, 0);
  const ROW_H = 15, LANE_GAP = 7;
  const chartOnly = rowsTotal * ROW_H + pl.lanes.length * LANE_GAP + 4;
  /* Measured in the same order the drawing happens, because the box is drawn
     before anything that goes in it. panel() returns y + 30, so that header is
     part of the height and was the 30pt this first got wrong: the bottom rule
     cut through the last two rows of the table. */
  const PANEL_HEAD = 30;
  const beforeChart = 24 + (pl.slip ? 11 : 0) + 26;      // verdict, slip, month labels
  const afterChart = 26 + 22 + 8;                         // date tags, key, table heading
  const tableH = 5 + 13 * pl.outstanding.length + 8;
  const panelH = Math.min(
    H - 2 * M - 14,
    Math.max(220, PANEL_HEAD + beforeChart + chartOnly + afterChart + tableH + 16),
  );
  const panelBottom = M + panelH;
  const top = panel(d, M, M, CW, panelH, String(page), 'Where the job is', pl.counted);
  const x0 = M + 14, right = M + CW - 14;

  /* ---- the verdict, in the words the screen says it in --------------------- */
  setFont(d, 13, 'bold', INK);
  d.text(fit(d, san(pl.says), right - x0), x0, top + 18);
  let y = top + 24;
  if (pl.slip) {
    setFont(d, 8.5, 'normal', WARN);
    d.text(fit(d, san(pl.slip), right - x0), x0, y + 10);
    y += 11;
  }

  /* ---- the axis ----------------------------------------------------------- */
  const trackX = x0 + PLAN_LANE_W, trackW = right - trackX;
  const at = (f: number) => trackX + f * trackW;

  const rowH = ROW_H, laneGap = LANE_GAP, chartH = chartOnly;
  const chartTop = y + 26;
  const chartBottom = chartTop + chartH;

  /* months, behind everything */
  pl.axis.ticks.forEach(t => {
    d.setDrawColor(LINE); d.setLineWidth(0.5);
    d.line(at(t.at), chartTop - 12, at(t.at), chartBottom);
    setFont(d, 6.5, 'bold', MUTED);
    d.text(t.label.toUpperCase(), at(t.at) + 3, chartTop - 15);
  });

  /* the slip: the ground between the day agreed and the day now expected */
  if (pl.axis.agreed && pl.axis.expected) {
    const a = Math.min(pl.axis.agreed.at, pl.axis.expected.at);
    const b = Math.max(pl.axis.agreed.at, pl.axis.expected.at);
    d.setFillColor(...wash(WARN, 0.12));
    d.rect(at(a), chartTop - 12, at(b) - at(a), chartH + 12, 'F');
  }

  /* today, and the two dates */
  const rule = (f: number, colour: string, width: number) => {
    d.setDrawColor(colour); d.setLineWidth(width);
    d.line(at(f), chartTop - 12, at(f), chartBottom);
  };
  if (pl.axis.today != null) rule(pl.axis.today, INK2, 1);
  if (pl.axis.agreed) rule(pl.axis.agreed.at, MUTED, 1);
  if (pl.axis.expected) rule(pl.axis.expected.at, BRAND, 1.4);

  /* ---- the lanes ---------------------------------------------------------- */
  let ly = chartTop;
  for (const lane of pl.lanes) {
    setFont(d, 6.5, 'bold', INK2);
    d.text(fit(d, lane.label.toUpperCase(), PLAN_LANE_W - 6), x0, ly + 9);

    for (const row of lane.rows) {
      const cy = ly + rowH / 2;
      for (const m of row) {
        const { colour, filled } = planInk(m.tone);
        const mx = at(m.at);

        /* a machine occupies time: arriving and running are different days */
        if (m.until != null && m.until > m.at) {
          d.setFillColor(...wash(colour, 0.3));
          d.rect(mx, cy - 1.6, at(m.until) - mx, 3.2, 'F');
        }

        d.setDrawColor(colour); d.setLineWidth(1.1);
        if (filled) { d.setFillColor(colour); d.circle(mx, cy, 2.6, 'FD'); }
        else { d.setFillColor(255, 255, 255); d.circle(mx, cy, 2.6, 'FD'); }

        /* The label goes right of the dot, or back towards the middle when the
           dot is near the edge — the last mark on a plan is the one a client
           looks for, and clipping it is the one thing this must not do. */
        const words = san(m.label), when = m.when;
        setFont(d, 7.5, 'bold', INK);
        const wWords = d.getTextWidth(words);
        setFont(d, 6.5, 'normal', MUTED);
        const wWhen = d.getTextWidth(when) + 4;
        const flip = mx + 6 + wWords + wWhen > right;

        if (flip) {
          setFont(d, 6.5, 'normal', MUTED);
          d.text(when, mx - 6, cy + 2.4, { align: 'right' });
          setFont(d, 7.5, 'bold', INK);
          d.text(fit(d, words, mx - 6 - wWhen - trackX + PLAN_LANE_W), mx - 6 - wWhen, cy + 2.4, { align: 'right' });
        } else {
          setFont(d, 7.5, 'bold', INK);
          d.text(fit(d, words, right - mx - 6 - wWhen), mx + 6, cy + 2.4);
          setFont(d, 6.5, 'normal', MUTED);
          d.text(when, mx + 6 + Math.min(wWords, right - mx - 6 - wWhen) + 4, cy + 2.4);
        }
      }
      ly += rowH;
    }
    ly += laneGap;
    if (lane !== pl.lanes[pl.lanes.length - 1]) {
      d.setDrawColor(SURF2); d.setLineWidth(0.5);
      d.line(x0, ly - laneGap / 2, right, ly - laneGap / 2);
    }
  }

  /* the two dates, named under the axis */
  const tag = (f: number, text: string, bg: string, fg: string) => {
    setFont(d, 6.5, 'bold', fg);
    const w = d.getTextWidth(text) + 8;
    const x = Math.max(trackX, Math.min(at(f) - w / 2, right - w));
    d.setFillColor(bg); d.roundedRect(x, chartBottom + 3, w, 10, 5, 5, 'F');
    setFont(d, 6.5, 'bold', fg);
    d.text(text, x + w / 2, chartBottom + 10, { align: 'center' });
  };
  if (pl.axis.today != null) tag(pl.axis.today, 'TODAY', INK, '#ffffff');
  if (pl.axis.agreed) tag(pl.axis.agreed.at, `${pl.axis.agreed.label.toUpperCase()} · ${pl.axis.agreed.when}`, SURF2, INK2);
  if (pl.axis.expected) tag(pl.axis.expected.at, `${pl.axis.expected.label.toUpperCase()} · ${pl.axis.expected.when}`, BRAND, '#ffffff');

  /* the key — the one rule, said once */
  const keyY = chartBottom + 26;
  let kx = x0;
  const key = (tone: PlacedMark['tone'], words: string) => {
    const { colour, filled } = planInk(tone);
    d.setDrawColor(colour); d.setLineWidth(1.1);
    if (filled) d.setFillColor(colour); else d.setFillColor(255, 255, 255);
    d.circle(kx + 3, keyY - 2, 2.6, 'FD');
    setFont(d, 6.5, 'normal', INK2);
    d.text(words, kx + 9, keyY);
    kx += 9 + d.getTextWidth(words) + 14;
  };
  key('done', 'done');
  key('failed', 'ran, didn’t pass');
  key('late', 'the day has gone');
  key('booked', 'still ahead');
  setFont(d, 6.5, 'normal', MUTED);
  d.text('Filled means it happened.', right, keyY, { align: 'right' });

  /* ---- what we are waiting on, and whose it is ---------------------------- */
  const tY = keyY + 22;
  /* MEASURE BEFORE SWITCHING. getTextWidth reads whatever font is CURRENTLY
     set, so measuring the 9pt bold title after setting 7pt normal returned a
     width for the wrong face and printed "and whose it is" straight through
     the heading. */
  setFont(d, 9, 'bold', INK);
  const headW = d.getTextWidth('What we are waiting on');
  d.text('What we are waiting on', x0, tY);
  setFont(d, 7, 'normal', MUTED);
  d.text('and whose it is', x0 + headW + 8, tY);

  table(d, x0, tY + 8, right - x0,
    [
      { head: '', width: 0.46 },
      { head: 'Open', width: 0.1, align: 'right' },
      { head: 'Late', width: 0.1, align: 'right' },
      { head: 'Mostly whose', width: 0.34 },
    ],
    pl.outstanding.map(r => [
      { text: san(r.what), bold: true },
      { text: String(r.open), bold: true },
      /* A dash rather than a nought: a column of noughts is a column the eye
         learns to skip, and the one row carrying a number has to survive it. */
      { text: r.late ? String(r.late) : '—', colour: r.late ? DANGER : MUTED, bold: !!r.late },
      { text: r.whose ? san(r.whose) : '—', colour: INK2 },
    ]),
    /* The panel, not the page: a row that does not fit is dropped rather than
       printed through the bottom rule. The height above is worked out so that
       never happens, and this is the belt to that pair of braces. */
    panelBottom - 8);

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — where the job is`, CW * 0.8), M, H - M + 6);
  d.text('Worked out from the lists the job already keeps — nothing typed twice.',
    W - M, H - M + 6, { align: 'right' });
}

export const MAT_ROWS = 26;
export function materialsHeight(data: PaceReportData, H: number, M: number): number {
  const m = data.materials;
  if (!m) return 0;
  const rows = Math.min(m.rows.length, MAT_ROWS);
  const rowH = Math.max(12, Math.min(22, (H - 2 * M - 14 - 44 - 50 - 22) / Math.max(1, rows)));
  return Math.min(H - 2 * M - 14, Math.max(150, 44 + 50 + rows * rowH + 22));
}

function materialsSheet(d: Doc, data: PaceReportData, page: number, pages: number,
  yTop?: number, withFoot = true): number {
  const m = data.materials;
  if (!m) return 0;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  const late = m.late > 0
    ? `${m.late} late \u00b7 ${m.waiting} still to come \u00b7 ${m.here} of ${m.total} in`
    : `${m.waiting} still to come \u00b7 ${m.here} of ${m.total} in`;

  const rows = m.rows.slice(0, MAT_ROWS);    // a sheet nobody can read is not a picture
  const weeks = m.weeks;
  const y0 = yTop ?? M;

  /* THE PANEL IS AS TALL AS THE PLAN, not as tall as the page.
   *
   * Drawn full height first, seven rows of film sat in the top quarter of an A3
   * inside a box three times their height, which reads as a page that failed to
   * finish rather than as a short list. A box that stops where its content stops
   * leaves the white space OUTSIDE it, where white space is just paper. */
  /* GRID_HEAD was 36 and the week labels sat inside it at top+30 — but the
     first row's cells are drawn from `bodyTop - rowH + 6`, which on a tall row
     began at top+20 and painted straight over them. The grid printed with a
     month band, no week names, and an unlabelled column axis: the reader could
     see a block of green and not which weeks it covered. */
  const PANEL_HEAD = 44, GRID_HEAD = 50, FOOT_PAD = 22;
  const rowH = Math.max(12, Math.min(22, (H - 2 * M - 14 - PANEL_HEAD - GRID_HEAD - FOOT_PAD) / Math.max(1, rows.length)));
  const panelH = Math.min(
    H - 2 * M - 14,
    Math.max(150, PANEL_HEAD + GRID_HEAD + rows.length * rowH + FOOT_PAD),
  );
  const top = panel(d, M, y0, CW, panelH, String(page), 'What we are waiting on', late);

  /* Columns: the thing, when it is planned for, then one narrow cell per week.
     The week cells get whatever is left, so a long plan squeezes rather than
     running off the page. */
  const x0 = M + 14;
  const right = M + CW - 14;
  const whenW = 62;
  /* THE WEEK CELLS TAKE THE SHEET. Capped at 34 they drew a grid six inches
     wide in the middle of an A3 and left the rest white — "we've got the
     calendar all the way under the size". The cap is now generous enough that
     a short plan fills the paper it is printed on. */
  const wkW = Math.min(58, Math.max(14, (right - x0 - 320 - whenW) / Math.max(1, weeks.length)));
  const itemW = right - x0 - whenW - wkW * weeks.length;
  const gridX = x0 + itemW + whenW;

  /* The first row begins BELOW the week names, whatever the row height. */
  const headBottom = top + 34;
  const bodyTop = headBottom + rowH - 6;

  /* ---- the head: the months over their weeks, then the week names ---- */
  let runFrom = 0;
  weeks.forEach((w, i) => {
    const lastOfRun = i === weeks.length - 1 || weeks[i + 1].month !== w.month;
    if (!lastOfRun) return;
    const x = gridX + runFrom * wkW;
    const width = (i - runFrom + 1) * wkW;
    d.setFillColor(SURF2); d.setDrawColor(LINE); d.setLineWidth(0.5);
    d.rect(x, top + 10, width, 12, 'FD');
    setFont(d, 6.5, 'bold', INK2);
    d.text(fit(d, w.month.toUpperCase(), width - 4), x + width / 2, top + 18.5, { align: 'center' });
    runFrom = i + 1;
  });

  setFont(d, 6.5, 'bold', MUTED);
  d.text('WHAT WE NEED', x0, top + 18.5);
  d.text('PLANNED FOR', x0 + itemW, top + 18.5);
  weeks.forEach((w, i) => {
    setFont(d, 6, 'bold', MUTED);
    d.text(fit(d, w.label, wkW - 2), gridX + i * wkW + wkW / 2, top + 30, { align: 'center' });
  });

  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x0, headBottom - 2, right, headBottom - 2);

  /* ---- the rows ----
     THE BANDS FIRST, ALL OF THEM, then the text. Drawn row by row, a shaded
     row's background began at the previous row's baseline + 5 and painted over
     its second line — so "3d late" under a date came out sliced in half on a
     sheet going to a client. */
  rows.forEach((_r, i) => {
    if (i % 2 !== 1) return;
    d.setFillColor('#faf9f5');
    d.rect(x0 - 4, bodyTop + i * rowH - rowH + 5, right - x0 + 8, rowH, 'F');
  });

  rows.forEach((r, i) => {
    const y = bodyTop + i * rowH;

    setFont(d, Math.min(8, rowH * 0.5), r.late != null ? 'bold' : 'normal', r.here ? MUTED : INK);
    d.text(fit(d, san(r.what), itemW - 6), x0, y);

    /* The arrival column says one of three things, and each one is a different
       fact: it is here, it is due on a date, or nobody has given a date. */
    setFont(d, Math.min(7, rowH * 0.45), 'bold',
      r.here ? OK : r.late != null ? DANGER : r.due ? INK2 : MUTED);
    d.text(r.here ? 'In stock' : r.due ? r.due : 'no date', x0 + itemW, y);
    if (r.late != null) {
      setFont(d, 5.5, 'normal', DANGER);
      d.text(`${r.late}d late`, x0 + itemW, y + 6);
    }

    /* The green. A covered week is filled; an uncovered one is left as the
       faintest wash, so the eye reads the BLOCK of green rather than counting
       cells — which is exactly how the spreadsheet is read. */
    r.covered.forEach((on, c) => {
      const cx = gridX + c * wkW;
      d.setFillColor(on ? OK : '#eae7de');
      d.setDrawColor('#ffffff'); d.setLineWidth(0.6);
      d.rect(cx + 0.5, y - rowH + 6, wkW - 1, rowH - 2.5, 'FD');

      /* THE DAY, IN THE WEEK IT LANDS. White on the green it sits on, so it
         reads as part of the block rather than as something stuck over it. */
      const on_date = r.lands[c];
      if (on_date) {
        setFont(d, Math.min(6, wkW * 0.19), 'bold', on ? '#ffffff' : INK2);
        d.text(fit(d, on_date, wkW - 2), cx + wkW / 2, y - rowH / 2 + 8, { align: 'center' });
      }
    });
  });

  if (withFoot) {
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${page} of ${pages} \u2014 what we are waiting on`, CW * 0.8), M, H - M + 6);
    d.text(
      m.rows.length > rows.length
        ? `${m.rows.length - rows.length} more on the list than fit this sheet \u2014 the app has them all`
        : 'Green from the week it lands, the same as the plan it comes off.',
      W - M, H - M + 6, { align: 'right' });
  }
  return y0 + panelH;
}

/* ---------- the trials ----------
 * A trial is a sentence, not a state, so this is a table and not a grid: what
 * we plan to prove, on which machine, on what product, what it passes on, who
 * with, when — and once the day has happened, what came of it.
 *
 * The plan and the day stay separate columns. The difference between what you
 * meant to run and what you ran is usually the story.
 */
/* ---------- THE TRIALS, AS CARDS ----------
 *
 * "I'm happy with a card each."
 *
 * A seven-column table was the wrong shape for this. It printed the outcome
 * word and, in 5.5pt grey underneath it, whatever commentary would fit — which
 * is how "run the BU at 75 packs a minute for an hour" came out as "didn't
 * pass" with a clipped sentence beside it and nothing a client could act on.
 *
 * A card holds the loop instead, in the order the day runs it:
 *
 *   EXPECTED   what it was agreed it passes on, before the day
 *   HAPPENED   what it actually did, against that
 *   FOUND      what the day turned up, and how much of it became an action
 *   NEXT       the step still outstanding, with a name and a date on it
 *
 * The outcome word alone is a verdict nobody in the room can check. The
 * expectation beside it is what makes it an argument.
 */

/* ---------- HOW BIG A CARD WANTS TO BE ----------
 *
 * Rowland: "PDF messy because you are trying to put everything on one sheet —
 * the trials. Expand and make the PDF dynamic, it will grow, make use of the
 * space better."
 *
 * The cards were a FIXED 122pt in a fixed two-column grid, and every value
 * inside was clipped to one line by fit(). Those are the same fault twice: a
 * guessed height cannot be right for the content, so it was too tall for the
 * five short cards a seeded job has — bottom third of an A3 white — and would
 * have cut a long expectation off mid-sentence on a real one.
 *
 * So a card MEASURES ITSELF and takes the room it needs, and the sheet is
 * filled rather than partly used. It is the argument the 3P board already makes
 * on its own sheet, for the same reason: a panel leaving the bottom third of an
 * A3 blank is as wrong as one running off the edge, it just fails more quietly.
 *
 * THREE THINGS FALL OUT OF IT, in this order:
 *
 *   1  A FEW TESTS GET THE FULL WIDTH.  Four or fewer and the cards run one to
 *      a row, which roughly doubles the room a sentence has. That is the whole
 *      point of the extra space: more of what somebody wrote, not the same
 *      words printed larger.
 *   2  VALUES WRAP RATHER THAN CLIP.  Up to three lines, and up to five when
 *      the sheet has room going spare — the slack is spent on the text before
 *      it is spent on air.
 *   3  WHAT IS LEFT OVER IS SHARED OUT.  Rows stretch so the stack finishes at
 *      the foot of the panel, capped, because one card on an empty sheet should
 *      not become a half-page box.
 *
 * splitTextToSize is pure, so measuring costs nothing and cannot disagree with
 * the drawing: both ask the same question of the same document, and the draw
 * takes the very lines the measure produced.
 */

type TrialRow = NonNullable<PaceReportData['trials']>['rows'][number];

const CARD_HEAD = 43;        // the title, the meta line, and the rule under them
const CARD_LEAD = 10.5;      // one wrapped line inside a value
const CARD_ROWGAP = 6;       // between EXPECTED and HAPPENED
const CARD_PAD = 12;         // under the last line
const CARD_GAP = 12;         // between cards, across and down
const LABEL_W = 54;          // the label gutter down the left of the rows

interface CardRow { label: string; lines: string[]; colour: string; bold: boolean }
interface CardPlan { rows: CardRow[]; meta: string; tone: string; word: string; h: number }

/** Everything the card will put on the page, already wrapped to its column, and
 *  therefore its height. Measure and draw both read this — there is no second
 *  arithmetic to drift out of step with the first. */
function planTrialCard(d: Doc, r: TrialRow, w: number, maxLines: number): CardPlan {
  const tone = r.outcome === 'passed' ? OK : r.outcome === 'failed' ? DANGER
    : r.outcome === 'notRun' ? WARN : BLUE;
  const vw = w - LABEL_W - 24;

  const wrap = (text: string, bold: boolean): string[] => {
    setFont(d, 8, bold ? 'bold' : 'normal', INK);
    const all = d.splitTextToSize(san(text), vw) as string[];
    if (all.length <= maxLines) return all.length ? all : [''];
    /* Over the limit, the last line it keeps carries the ellipsis, so the page
       says "there is more of this" rather than stopping mid-word as if that
       were the end of the sentence. The trial card prints the rest in full. */
    const cut = all.slice(0, maxLines);
    cut[maxLines - 1] = fit(d, `${cut[maxLines - 1]} ${all[maxLines] ?? ''}`, vw);
    return cut;
  };

  const next = r.next
    ? [r.next.what, r.next.owner || 'nobody yet', r.next.due].filter(Boolean).join(' · ')
      + (r.nextMore ? ` (+${r.nextMore} more)` : '')
    : 'nothing agreed yet';

  const rows: CardRow[] = [
    { label: 'EXPECTED', lines: wrap(r.passesIf || 'nothing agreed in advance', false),
      colour: r.passesIf ? INK2 : MUTED, bold: false },
    { label: 'HAPPENED', lines: wrap(r.verdict || '—', r.outcome !== 'planned'),
      colour: r.outcome === 'planned' ? MUTED : INK, bold: r.outcome !== 'planned' },
    { label: 'FOUND', lines: wrap(foundWords(r.found), false),
      colour: r.found.undecided ? WARN : INK2, bold: false },
    { label: 'NEXT', lines: wrap(next, !!r.next && !r.next.done),
      colour: r.next ? (r.next.owner ? INK : DANGER) : MUTED, bold: !!r.next && !r.next.done },
  ];

  /* THE LOOP, when there is one. It was in the data all along and no card ever
     drew it — the client report kept saying a test leads to the next test and
     then printed nothing that showed it. The room to say so is exactly what
     measuring the card instead of guessing it buys. */
  const sits = [
    r.follows && `follows “${san(r.follows)}”`,
    r.ledTo.length && `led to ${r.ledTo.map(t => `“${san(t)}”`).join(', ')}`,
  ].filter(Boolean).join('   ·   ');
  if (sits) rows.push({ label: 'WHERE IT SITS', lines: wrap(sits, false), colour: MUTED, bold: false });

  const h = CARD_HEAD + rows.reduce((a, row) => a + row.lines.length * CARD_LEAD + CARD_ROWGAP, 0) + CARD_PAD;
  return {
    rows, tone, word: r.outcomeWord.toUpperCase(), h,
    meta: [r.machine, r.withWhom && `with ${r.withWhom}`, r.when, r.product].filter(Boolean).join(' · '),
  };
}

/** Draw a planned card. `h` is what the ROW settled on, which may be more than
 *  the card asked for — the box takes it so the row has one bottom edge rather
 *  than a ragged one, and the words stay where they were measured. */
function drawTrialCard(d: Doc, p: CardPlan, title: string, x: number, y: number, w: number, h: number): void {
  d.setDrawColor(LINE); d.setLineWidth(0.7);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 5, 5, 'FD');
  /* The verdict as a spine down the left edge, not a tint behind the words:
     a fill under text is the thing that fails under a strip light. */
  d.setFillColor(p.tone);
  d.roundedRect(x, y, 3.5, h, 2, 2, 'F');

  setFont(d, 6.5, 'bold', p.tone);
  const pw = d.getTextWidth(p.word) + 14;
  d.setFillColor(...wash(p.tone, 0.14));
  d.roundedRect(x + w - 12 - pw, y + 9, pw, 14, 7, 7, 'F');
  d.text(p.word, x + w - 12 - pw / 2, y + 18.5, { align: 'center' });

  setFont(d, 10, 'bold', INK);
  d.text(fit(d, title, w - 30 - pw), x + 12, y + 20);

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, p.meta, w - 24), x + 12, y + 31);

  d.setDrawColor(LINE); d.setLineWidth(0.5);
  d.line(x + 12, y + 37, x + w - 12, y + 37);

  let ry = y + CARD_HEAD + 5;
  for (const row of p.rows) {
    setFont(d, 6, 'bold', MUTED);
    d.text(row.label, x + 12, ry);
    setFont(d, 8, row.bold ? 'bold' : 'normal', row.colour);
    row.lines.forEach((l, i) => d.text(l, x + 12 + LABEL_W, ry + i * CARD_LEAD));
    ry += row.lines.length * CARD_LEAD + CARD_ROWGAP;
  }
}

/* ---------- WHERE THE CARDS FALL ----------
 *
 * Pure arithmetic over measured heights, drawing nothing, because the footer
 * says "page 2 of 5" and cannot know the 5 until every card has been measured.
 * Exported so the packing can be tested as numbers rather than looked at. */

/** The height of each ROW of cards — a row is as tall as the taller of its
 *  pair, so the two have one bottom edge. */
export function cardRowHeights(heights: number[], cols: number): number[] {
  const rows: number[] = [];
  for (let i = 0; i < heights.length; i += cols) {
    rows.push(Math.max(...heights.slice(i, i + cols)));
  }
  return rows;
}

/** How many CARDS land on each sheet: the front panel first, then sheets of
 *  their own. A card taller than an empty sheet goes on one by itself — without
 *  that guard the loop never ends, which is the only way this can fail badly. */
export function packCards(heights: number[], cols: number, frontRoom: number, sheetRoom: number): number[] {
  if (heights.length === 0) return [0];
  const out: number[] = [];
  let i = 0;
  while (i < heights.length) {
    const room = out.length === 0 ? frontRoom : sheetRoom;
    let used = 0, n = 0;
    while (i + n < heights.length) {
      const rowH = Math.max(...heights.slice(i + n, i + n + cols));
      const need = used + (n ? CARD_GAP : 0) + rowH;
      if (need > room) break;
      used = need;
      n += Math.min(cols, heights.length - i - n);
    }
    if (n === 0) n = Math.min(cols, heights.length - i);
    out.push(n);
    i += n;
  }
  return out;
}

/** THE STACK, AND THEREFORE THE PANEL. A panel is as tall as its cards plus its
 *  own chrome — it does not take the sheet and leave the rest white.
 *
 *  The first attempt at this shared the leftover room out across the rows so
 *  the stack finished at the foot of the panel. It filled the sheet and it read
 *  worse: the words stay where they were measured, so all it did was move the
 *  white inside the boxes and make five short tests look like five things with
 *  something missing. A page that ENDS where its content ends looks deliberate;
 *  a page of half-empty frames looks broken. Growth is for when there is more
 *  to say, and that is what the sheets after this one are for. */
export function stackHeight(rowHeights: number[]): number {
  if (rowHeights.length === 0) return 0;
  return rowHeights.reduce((a, b) => a + b, 0) + CARD_GAP * (rowHeights.length - 1);
}

/** One column when there are few enough that the width is better spent on the
 *  sentences than on a second card beside them. */
const columnsFor = (n: number): number => (n <= 4 ? 1 : 2);

/** Measure every card once, at the width the column count gives it, and raise
 *  the wrap limit when the whole set would leave the front panel with room
 *  going spare. The slack is spent on words before it is spent on air. */
function planTrials(d: Doc, rows: TrialRow[], cw: number, frontRoom: number): CardPlan[] {
  const tight = rows.map(r => planTrialCard(d, r, cw, 3));
  const cols = columnsFor(rows.length);
  const stack = cardRowHeights(tight.map(p => p.h), cols);
  const used = stack.reduce((a, b) => a + b, 0) + CARD_GAP * Math.max(0, stack.length - 1);
  if (used > frontRoom * 0.8) return tight;
  return rows.map(r => planTrialCard(d, r, cw, 5));
}

/** Draw `count` cards from `from`, each at the height it measured. Returns how
 *  many it drew. */
function trialCardGrid(
  d: Doc, rows: TrialRow[], plans: CardPlan[], cols: number,
  x: number, y: number, w: number, from: number, count: number,
): number {
  const cw = cols === 1 ? w : (w - CARD_GAP) / 2;
  const mine = plans.slice(from, from + count);
  const heights = cardRowHeights(mine.map(p => p.h), cols);

  let cy = y;
  mine.forEach((p, k) => {
    const rowH = heights[Math.floor(k / cols)] ?? p.h;
    if (k % cols === 0 && k > 0) cy += (heights[Math.floor(k / cols) - 1] ?? 0) + CARD_GAP;
    drawTrialCard(d, p, rows[from + k].title, x + (k % cols) * (cw + CARD_GAP), cy, cw, rowH);
  });
  return mine.length;
}

/** The trials on the front page. Returns how many did NOT fit, so the caller
 *  can decide how many sheets the rest have earned. */
function trialsPanel(d: Doc, data: PaceReportData, M: number, top0: number, CW: number, panelH: number,
  split: { plans: CardPlan[]; cols: number; pages: number[] }): number {
  const t = data.trials;
  const sub = t
    ? `${t.planned} booked · ${t.passed} passed${t.failed ? ` · ${t.failed} didn’t` : ''}${
        t.notRun ? ` · ${t.notRun} didn’t run` : ''}`
    : 'nothing booked yet';
  const top = panel(d, M, top0, CW, panelH, '1', 'Tests and fixes', sub);

  if (!t || t.rows.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('Nothing has been booked on this job yet.', M + 14, top + 22);
    return 0;
  }

  const drawn = trialCardGrid(d, t.rows, split.plans, split.cols, M + 14, top + 14, CW - 28, 0, split.pages[0] ?? 0);
  return t.rows.length - drawn;
}

/** The rest of them, a sheet each until there are none left. It used to be one
 *  extra sheet and whatever fell off it was gone — a job running twenty tests
 *  silently lost the last eight. */
function trialsSheet(d: Doc, data: PaceReportData, from: number, count: number, sheet: number, sheets: number,
  page: number, pages: number, split: { plans: CardPlan[]; cols: number }): void {
  const t = data.trials;
  if (!t) return;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  setFont(d, 8, 'bold', BRAND);
  d.text('TESTS AND FIXES — CONTINUED', M, M + 8);
  setFont(d, 18, 'bold', INK);
  d.text(fit(d, `${data.title} · what we are proving`, CW * 0.7), M, M + 30);
  setFont(d, 8.5, 'normal', INK2);
  d.text(`${from + 1} to ${from + count} of ${t.rows.length}${sheets > 1 ? ` · sheet ${sheet} of ${sheets}` : ''}`, M, M + 44);
  d.setDrawColor(INK); d.setLineWidth(1.2);
  d.line(M, M + 52, W - M, M + 52);

  trialCardGrid(d, t.rows, split.plans, split.cols, M, M + 66, CW, from, count);

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — tests and fixes`, CW * 0.8), M, H - M + 6);
}


/* ---------- WHAT THE MACHINE CAN RUN ----------
 *
 * Rowland: "on the client report we, for some reason, have what the machine can run
 * for the programs, and then we have a calendar — September, October, week
 * three, week four, week one, week two, week three, week four. Makes no sense.
 * We don't need that."
 *
 * He is right, and the reason is worth keeping written down. A program is not a
 * thing that ARRIVES. Materials earn a calendar because each one lands on a
 * date and the question is coverage over time — is the week we want to run in
 * green yet. A program is written, loaded and proved, and once it is proved it
 * stays proved; painting that across eight week columns produced eight columns
 * of one colour and a single ring, which is a great deal of ink to say "tested
 * on the 6th".
 *
 * So this is a LIST, two columns across the sheet, answering the four things
 * somebody actually asks: what it is, what it runs, where it has got to, and
 * when we find out. The state is a word as well as a colour, because this page
 * gets photocopied and faxed to an OEM.
 */
export function programsHeight(data: PaceReportData, H: number, M: number): number {
  const pg = data.programs;
  if (!pg) return 0;
  const maxRows = Math.floor((H - 2 * M - 14 - 34 - 30 - 12) / 22);
  const perCol = pg.rows.length > 16
    ? Math.min(maxRows, Math.ceil(pg.rows.length / 2))
    : Math.min(maxRows, pg.rows.length);
  return Math.min(H - 2 * M - 14, Math.max(130, 34 + perCol * 22 + 30 + 12));
}

function programsSheet(d: Doc, data: PaceReportData, page: number, pages: number,
  yTop?: number, withFoot = true): void {
  const pg = data.programs;
  if (!pg) return;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  const sub = pg.overdue > 0
    ? `${pg.overdue} past its test date · ${pg.proved} of ${pg.total} proved`
    : `${pg.proved} of ${pg.total} proved · ${pg.onMachine} on the machine · ${pg.needed} not written`;

  /* THE SHEET IS AS TALL AS THE LIST, and as wide as it needs to be.
     A panel given the whole A3 whatever is in it printed seven programs in the
     top-left corner of an otherwise empty sheet — the same "be a bit smarter
     with size" complaint the calendar earned. */
  const rowH = 22;
  const HEAD = 34, KEY = 30, PAD = 12;
  const maxRows = Math.floor((H - 2 * M - 14 - HEAD - KEY - PAD) / rowH);

  /* One column while the list is short enough to read down; two once it is long
     enough that a second column saves a sheet rather than splitting a glance. */
  const twoCols = pg.rows.length > 16;
  const perCol = twoCols ? Math.min(maxRows, Math.ceil(pg.rows.length / 2)) : Math.min(maxRows, pg.rows.length);
  const rows = pg.rows.slice(0, perCol * (twoCols ? 2 : 1));

  const panelH = Math.min(H - 2 * M - 14, Math.max(130, HEAD + perCol * rowH + KEY + PAD));
  const y0 = yTop ?? M;
  /* Sharing a sheet with materials: no badge, because the badge is the page
     number and the page already has one. */
  const top = panel(d, M, y0, CW, panelH, withFoot ? String(page) : '', 'What the machine can run', sub);

  const gap = 34;
  const inner = CW - 28;
  /* A single column stops well short of the full A3 width: a three-word program
     name with 800pt of rule after it reads as a mistake. */
  const colW = twoCols ? (inner - gap) / 2 : Math.min(inner, 620);
  const x0 = M + 14;
  const bodyTop = top + HEAD;

  const wRuns = colW * 0.28, wWhen = colW * 0.32;
  const wWhat = colW - wRuns - wWhen;

  for (let c = 0; c < (twoCols ? 2 : 1); c++) {
    const cx = x0 + c * (colW + gap);
    if (c * perCol >= rows.length) break;

    setFont(d, 6.5, 'bold', MUTED);
    d.text('PROGRAM', cx, top + 20);
    d.text('WHAT IT RUNS', cx + wWhat, top + 20);
    d.text('WHERE IT HAS GOT TO', cx + wWhat + wRuns, top + 20);
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx, top + 24, cx + colW, top + 24);

    for (let i = 0; i < perCol; i++) {
      const r = rows[c * perCol + i];
      if (!r) break;
      const y = bodyTop + i * rowH;

      if (i % 2 === 1) {
        d.setFillColor('#faf9f5');
        d.rect(cx - 4, y - 13, colW + 8, rowH, 'F');
      }

      /* A dot carries the state as colour; the words beside it carry it
         without. Neither is load-bearing on its own — this page gets
         photocopied and faxed to an OEM. */
      const dot = r.state === 'proved' ? OK : r.overdue != null ? DANGER
        : r.state === 'onMachine' ? WARN : MUTED;
      d.setFillColor(dot);
      d.circle(cx + 3, y - 3, 3, 'F');

      setFont(d, 9, r.overdue != null ? 'bold' : 'normal', r.state === 'proved' ? INK2 : INK);
      d.text(fit(d, san(r.what), wWhat - 18), cx + 11, y);

      setFont(d, 8, 'normal', MUTED);
      d.text(fit(d, san(r.runs ?? '\u2014'), wRuns - 8), cx + wWhat, y);

      /* "6 days ago" goes on the SAME line, not under it. Underneath, it fell
         into the rule between the rows and read as a smudge. */
      const when = r.overdue != null
        ? `${r.when} \u00b7 ${r.overdue} day${r.overdue === 1 ? '' : 's'} ago`
        : r.when;
      setFont(d, 8, 'bold',
        r.state === 'proved' ? OK : r.overdue != null ? DANGER : r.state === 'onMachine' ? INK2 : MUTED);
      d.text(fit(d, when, wWhen - 8), cx + wWhat + wRuns, y);

      d.setDrawColor('#eef1ea'); d.setLineWidth(0.4);
      d.line(cx, y + 7, cx + colW, y + 7);
    }
  }

  /* ---- the key: four dots and what they mean ---- */
  const keyY = y0 + panelH - 13;
  let kx = x0;
  ([[OK, 'Proved'], [WARN, 'On the machine, not proved'], [DANGER, 'Test date gone'], [MUTED, 'Not written yet']] as const)
    .forEach(([c, label]) => {
      d.setFillColor(c); d.circle(kx + 3, keyY - 2, 3, 'F');
      setFont(d, 6.5, 'normal', INK2);
      d.text(label, kx + 10, keyY);
      kx += 26 + d.getTextWidth(label);
    });

  if (withFoot) {
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — what the machine can run`, CW * 0.8), M, H - M + 6);
    d.text(
      pg.rows.length > rows.length
        ? `${pg.rows.length - rows.length} more on the list than fit this sheet — the app has them all`
        : 'Proved carries the day it was proved. The word on its own is an opinion.',
      W - M, H - M + 6, { align: 'right' });
  }
}

/* ---------- the lever tree ----------
 * Laid out left to right, exactly as it is on screen: the outcome on the left,
 * each level a column to its right, children stacked and their parent centred
 * against them. Two passes — measure every subtree's height, then place — which
 * is the only way a parent can sit level with the middle of its own children.
 *
 * Everything is drawn. A report that quietly dropped the bottom row would be
 * hiding the work, so when the tree is bigger than the sheet the whole thing is
 * scaled down instead. */
const PILL_KEYS = ['people', 'plant', 'process'] as const;

/** The 3P sheet's footer. Extracted because the board can spill onto a second
 *  sheet, and both have to say the same thing about what is not on it. */
function footBoard(d: Doc, data: PaceReportData, page: number, pages: number, sheet: number): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — the 3P board${sheet > 1 ? ` (${sheet})` : ''}`, (W - 56) * 0.8), 28, H - 28 + 6);
  d.text(data.boardUnplaced > 0
    ? `${data.boardUnplaced} tracker row${data.boardUnplaced === 1 ? '' : 's'} with no 3P value`
    : 'Every tracker row is on the board.', W - 28, H - 28 + 6, { align: 'right' });
}

const TREE_STATUS: Record<string, { c: string; label: string }> = {
  n: { c: MUTED,  label: 'Not started' },
  w: { c: BLUE, label: 'In progress' },
  a: { c: WARN,   label: 'At risk' },
  r: { c: DANGER, label: 'Blocked' },
  g: { c: OK,     label: 'Done' },
};


interface TreeIn { id: string; parentId?: string; text: string; rag: string; sort: number }
interface TreeBox { text: string; rag: string; depth: number; kids: TreeBox[]; h: number; y: number }

/* Mutable, and set for the duration of one page by withTreeScale below. jsPDF
 * has no transform to scale a drawing after the fact, so the geometry itself is
 * what shrinks — which keeps the text legible rather than squashing it. */
let BOX_W = 150, BOX_GAP_Y = 7, COL_GAP = 34, LINE_H = 8.4, PAD = 6;
let FS_BIG = 8, FS_SMALL = 7, FS_PILL = 5.6;
const TREE_BASE = { BOX_W: 150, BOX_GAP_Y: 7, COL_GAP: 34, LINE_H: 8.4, PAD: 6, FS_BIG: 8, FS_SMALL: 7, FS_PILL: 5.6 };

/** Draw the tree at `k` of its natural size, then put the geometry back. */
function withTreeScale(k: number, draw: () => void): void {
  BOX_W = TREE_BASE.BOX_W * k; BOX_GAP_Y = TREE_BASE.BOX_GAP_Y * k;
  COL_GAP = TREE_BASE.COL_GAP * k; LINE_H = TREE_BASE.LINE_H * k; PAD = TREE_BASE.PAD * k;
  // Type never goes below 5pt — under that it is a grey smear on paper, and a
  // tree nobody can read is not a smaller tree, it is no tree.
  FS_BIG = Math.max(5, TREE_BASE.FS_BIG * k);
  FS_SMALL = Math.max(4.6, TREE_BASE.FS_SMALL * k);
  FS_PILL = Math.max(4.2, TREE_BASE.FS_PILL * k);
  try { draw(); } finally { Object.assign(
    { }, TREE_BASE);
    BOX_W = TREE_BASE.BOX_W; BOX_GAP_Y = TREE_BASE.BOX_GAP_Y; COL_GAP = TREE_BASE.COL_GAP;
    LINE_H = TREE_BASE.LINE_H; PAD = TREE_BASE.PAD;
    FS_BIG = TREE_BASE.FS_BIG; FS_SMALL = TREE_BASE.FS_SMALL; FS_PILL = TREE_BASE.FS_PILL;
  }
}

function treeShape(rows: TreeIn[]): TreeBox[] {
  const has = new Set(rows.map(r => r.id));
  const kids = new Map<string, TreeIn[]>();
  for (const r of rows) {
    const k = r.parentId && has.has(r.parentId) ? r.parentId : '';
    kids.set(k, [...(kids.get(k) ?? []), r]);
  }
  const make = (r: TreeIn, depth: number): TreeBox => ({
    text: san(r.text) || '-', rag: r.rag, depth, h: 0, y: 0,
    kids: (kids.get(r.id) ?? []).sort((a, b) => a.sort - b.sort).map(k => make(k, depth + 1)),
  });
  return (kids.get('') ?? []).sort((a, b) => a.sort - b.sort).map(r => make(r, 0));
}

/** Height of the box itself, and then of everything under it. A parent is as
 *  tall as its children stacked, or as tall as its own box — whichever wins. */
function treeMeasure(d: Doc, b: TreeBox): number {
  setFont(d, b.depth >= 3 ? FS_SMALL : FS_BIG, 'bold', INK);
  const lines = d.splitTextToSize(b.text, BOX_W - PAD * 2) as string[];
  const own = PAD * 2 + lines.length * LINE_H + FS_PILL + 3;
  const kidsH = b.kids.length
    ? b.kids.reduce((t, k) => t + treeMeasure(d, k), 0) + (b.kids.length - 1) * BOX_GAP_Y
    : 0;
  b.h = Math.max(own, kidsH);
  return b.h;
}

function treeDraw(d: Doc, b: TreeBox, x: number, top: number): void {
  const st = TREE_STATUS[b.rag] ?? TREE_STATUS.n;
  const small = b.depth >= 3;
  setFont(d, small ? FS_SMALL : FS_BIG, 'bold', INK);
  const lines = d.splitTextToSize(b.text, BOX_W - PAD * 2) as string[];
  const own = PAD * 2 + lines.length * LINE_H + FS_PILL + 3;
  const by = top + (b.h - own) / 2;            // centred against its own subtree

  const [wr, wg, wb] = wash(st.c, b.rag === 'n' ? 0.05 : 0.11);
  d.setFillColor(wr, wg, wb);                   // a wash of its own status
  d.setDrawColor(st.c);
  d.setLineWidth(b.rag === 'n' ? 0.4 : 0.7);
  d.roundedRect(x, by, BOX_W, own, 2.5, 2.5, 'FD');
  // the status stripe down the left, so the state reads even in mono
  d.setFillColor(st.c);
  d.rect(x, by + 1, 2, own - 2, 'F');

  setFont(d, small ? FS_SMALL : FS_BIG, 'bold', INK);
  lines.forEach((ln, i) => d.text(ln, x + PAD, by + PAD + LINE_H * 0.72 + i * LINE_H));
  setFont(d, FS_PILL, 'bold', st.c);
  d.text(st.label.toUpperCase(), x + PAD, by + own - PAD + 1.5);

  if (b.kids.length === 0) return;

  // stem out of this box, the bar down its children, and a stub into each
  const cx = x + BOX_W, cy = by + own / 2;
  const kidX = x + BOX_W + COL_GAP;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(cx, cy, cx + COL_GAP / 2, cy);

  let ky = top;
  const centres: number[] = [];
  for (const k of b.kids) {
    treeDraw(d, k, kidX, ky);
    const kOwn = (() => {
      setFont(d, k.depth >= 3 ? FS_SMALL : FS_BIG, 'bold', INK);
      const kl = d.splitTextToSize(k.text, BOX_W - PAD * 2) as string[];
      return PAD * 2 + kl.length * LINE_H + FS_PILL + 3;
    })();
    const kcy = ky + (k.h - kOwn) / 2 + kOwn / 2;
    centres.push(kcy);
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx + COL_GAP / 2, kcy, kidX, kcy);
    ky += k.h + BOX_GAP_Y;
  }
  if (centres.length > 1) {
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx + COL_GAP / 2, centres[0], cx + COL_GAP / 2, centres[centres.length - 1]);
  }
}

export function drawPaceReport(d: Doc, raw: PaceReportData): void {
  // sanitise once, at the boundary — everything below draws known-safe text
  const data: PaceReportData = {
    ...raw,
    title: san(raw.title) || 'Project',
    subtitle: san(raw.subtitle),
    lead: raw.lead ? san(raw.lead) : undefined,
    leadRole: san(raw.leadRole) || 'Lead',
    lines: raw.lines.map(l => ({
      ...l, name: san(l.name),
      variant: l.variant ? san(l.variant) : undefined,
      owner: l.owner ? san(l.owner) : undefined,
      sponsor: l.sponsor ? san(l.sponsor) : undefined,
    })),
    byLine: raw.byLine.map(r => ({ ...r, name: san(r.name), owner: san(r.owner) })),
    lateActions: raw.lateActions.map(a => ({ line: san(a.line), what: san(a.what), owner: san(a.owner), due: san(a.due) })),
    todos: raw.todos.map(t => ({ ...t, what: san(t.what), who: san(t.who), when: san(t.when) })),
    completed: raw.completed.map(c => ({ what: san(c.what), who: san(c.who), outcome: san(c.outcome) })),
    snags: raw.snags.map(s2 => ({ ...s2, problem: san(s2.problem), owner: san(s2.owner), line: san(s2.line) })),
    wins: raw.wins.map(w => ({
      title: san(w.title), impact: san(w.impact), story: san(w.story),
      who: san(w.who), where: san(w.where), verdict: w.verdict,
    })),
    board: raw.board.map(b => ({
      area: san(b.area), pillar: b.pillar,
      /* The workbook's Action cells carry hard line breaks — people write two
         or three dated updates into one cell. jsPDF's splitTextToSize breaks on
         \n FIRST and does not re-wrap what follows, so a 200-character second
         line was drawn straight across the next column. Collapsed to one
         stream of words before it is ever measured. */
      title: san(b.title),   // san() collapses the log lines — see above
      owner: san(b.owner), due: san(b.due), rag: b.rag,
    })),
    boardUnplaced: raw.boardUnplaced,
    /* THE TRIALS WERE NOT COMING THROUGH THIS DOOR.
     *
     * Every other list is sanitised here and the trials were not, because when
     * they were added they went into a table of short cells and nothing in the
     * seed had a character WinAnsi lacks. The first real title with an arrow in
     * it — "Changeover 2kg -> 1.25kg" — printed as "Changeover 2kg !'", with
     * the letter spacing wrecked, because jsPDF's built-in fonts are
     * WinAnsi-encoded and mis-measure what they cannot draw.
     *
     * san() is the ONE door. Anything that skips it is a rendering bug waiting
     * for somebody to type a real character. */
    trials: raw.trials && {
      ...raw.trials,
      rows: raw.trials.rows.map(r => ({
        ...r,
        title: san(r.title), machine: san(r.machine), passesIf: san(r.passesIf),
        withWhom: san(r.withWhom), product: san(r.product), result: san(r.result),
        verdict: san(r.verdict),
        next: r.next && { ...r.next, what: san(r.next.what), owner: san(r.next.owner) },
        follows: r.follows ? san(r.follows) : undefined,
        ledTo: r.ledTo.map(san),
      })),
    },
    materials: raw.materials && {
      ...raw.materials,
      rows: raw.materials.rows.map(r => ({ ...r, what: san(r.what) })),
    },
    programs: raw.programs && {
      ...raw.programs,
      rows: raw.programs.rows.map(r => ({
        ...r, what: san(r.what), runs: r.runs ? san(r.runs) : undefined, when: san(r.when),
      })),
    },
  };
  const W = d.internal.pageSize.getWidth();        // 1190.55pt
  const H = d.internal.pageSize.getHeight();       // 841.89pt
  const M = 26;
  const CW = W - 2 * M;

  const dateLong = new Date(data.now).toLocaleDateString(undefined,
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ================= PAGE 1 — LINE PACE ================= */
  setFont(d, 8, 'bold', BRAND);
  d.text('IMPROVEMENT INITIATIVE · CLIENT REPORT', M, M + 8);
  setFont(d, 24, 'bold', INK);
  d.text(fit(d, data.title, CW * 0.6), M, M + 34);
  setFont(d, 9, 'normal', INK2);
  d.text(fit(d, data.subtitle, CW * 0.62), M, M + 48);

  setFont(d, 7, 'bold', MUTED);
  d.text('STATUS AS AT', W - M, M + 8, { align: 'right' });
  setFont(d, 11, 'bold', INK);
  d.text(dateLong, W - M, M + 24, { align: 'right' });
  setFont(d, 8, 'normal', MUTED);
  d.text('Prepared for the client', W - M, M + 37, { align: 'right' });
  if (data.lead) {
    setFont(d, 8, 'bold', BRAND);
    d.text(fit(d, `${data.leadRole} · ${data.lead}`, CW * 0.35), W - M, M + 48, { align: 'right' });
  }

  d.setDrawColor(INK); d.setLineWidth(1.4);
  d.line(M, M + 56, W - M, M + 56);

  /* KPI tiles */
  // On a line's own deck "0/1 lines at target" is a riddle; the number the
  // owner is judged on is the reading itself, against their target.
  const only = data.lines.length === 1 ? data.lines[0] : null;
  const solo = only?.series;
  const r2 = (v: number) => String(Math.round(v * 100) / 100);
  const tiles: [string, string, string, string][] = [
    only && solo
      ? [solo.latest == null ? '--' : r2(solo.latest),
         (solo.measure.unit ? `${solo.measure.unit} latest` : 'latest'),
         vsTarget(solo),
         solo.meeting == null ? MUTED : solo.meeting ? OK : DANGER]
      : [`${data.atTarget}/${data.lines.length}`, 'Lines at target', 'latest reading vs target',
         data.atTarget === data.lines.length ? OK : data.atTarget === 0 ? DANGER : WARN],
    [`${data.pctDone}%`, 'Actions complete', `${data.complete} of ${data.total}`, OK],
    [String(data.openTotal), 'Still open', 'in flight', BRAND],
    [String(data.late), 'Overdue', 'past their date', data.late > 0 ? DANGER : OK],
    [String(data.openSnags), 'Open evidence', 'from the line walk', data.openSnags > 0 ? WARN : OK],
    [String(data.winsThisWeek), 'Wins this week', 'what worked', OK],
  ];

  /* A COMMISSIONING JOB'S OWN NUMBERS. "0% actions complete" is not a fact
     about this job, it is a fact about a spreadsheet it does not keep. */
  const tr = data.trials, mt = data.materials, pg = data.programs;
  const commTiles: [string, string, string, string][] = [
    [String(tr?.planned ?? 0), 'Booked', 'still to do', BRAND],
    [String(tr?.passed ?? 0), 'Passed or fixed', `of ${tr?.rows.length ?? 0} on the job`, OK],
    [String(tr?.failed ?? 0), 'Didn\u2019t pass', 'and what came of it', (tr?.failed ?? 0) > 0 ? DANGER : OK],
    [String(pg?.proved ?? 0), 'Programs proved', `of ${pg?.total ?? 0} on the machine`, (pg?.proved ?? 0) > 0 ? OK : MUTED],
    [String(mt?.late ?? 0), 'Films late', 'past the date, still not here', (mt?.late ?? 0) > 0 ? DANGER : OK],
    [String(data.openSnags), 'Open evidence', 'from the line walk', data.openSnags > 0 ? WARN : OK],
  ];
  const headTiles = data.tracker ? tiles : commTiles;
  const tGap = 8, tW = (CW - tGap * 5) / 6, tY = M + 68, tH = 54;
  headTiles.forEach(([n, label, sub, colour], i) => {
    const tx = M + i * (tW + tGap);
    d.setFillColor('#ffffff'); d.setDrawColor(LINE); d.setLineWidth(0.8);
    d.roundedRect(tx, tY, tW, tH, 5, 5, 'FD');
    d.setFillColor(colour);                                  // the status band
    d.roundedRect(tx, tY, tW, 3, 1.5, 1.5, 'F');
    setFont(d, 19, 'bold', colour === BRAND ? INK : colour);
    d.text(n, tx + 10, tY + 26);
    setFont(d, 8, 'bold', INK);
    d.text(label, tx + 10, tY + 38);
    setFont(d, 6.5, 'normal', MUTED);
    d.text(sub, tx + 10, tY + 47);
  });

  /* line pace */
  const lpY = tY + tH + 12;
  const lpH = H - M - lpY - 18;
  /* Titled for whatever this business measures, read off the first line's own
     series — the page and the file have to say the same words. */
  const lead = data.lines.find(l => l.series)?.series?.measure;

  /* How many trials did not fit the front page. Counted here, used below to
     decide whether they have earned a sheet of their own — and the page
     arithmetic for the whole report falls out of the same number. */
  /* MEASURED BEFORE ANYTHING IS DRAWN, because the footer says "page 2 of 5"
     and cannot know the 5 until every card has been measured. One plan, used
     by the front panel, by each continuation sheet, and by the page count —
     so the three cannot disagree about where a card went. */
  const split = (() => {
    const rows = data.trials?.rows ?? [];
    if (data.tracker || rows.length === 0) return { plans: [] as CardPlan[], cols: 1, pages: [0], panelH: lpH };
    const cols = columnsFor(rows.length);
    const cw = cols === 1 ? CW - 28 : (CW - 28 - CARD_GAP) / 2;
    /* The room a panel's cards actually get: the front one sits under the
       tiles and behind a numbered head, a continuation sheet is bare. */
    const frontRoom = lpH - 30 - 14 - 12;
    const sheetRoom = H - M - 24 - (M + 66);
    const plans = planTrials(d, rows, cw, frontRoom);
    const pages = packCards(plans.map(p => p.h), cols, frontRoom, sheetRoom);
    /* What the front panel is actually drawn at: its own chrome plus the cards
       that landed on it. It stops where they stop. */
    const front = stackHeight(cardRowHeights(plans.slice(0, pages[0]).map(p => p.h), cols));
    return { plans, cols, pages, panelH: Math.min(lpH, 30 + 14 + front + 14) };
  })();

  let trialsOver = 0;
  if (!data.tracker) {
    /* NO TRACKER, NO PPM SHEET. What this job is actually doing is running
       trials, so that is the front page — a card each, carrying the loop. */
    trialsOver = trialsPanel(d, data, M, lpY, CW, split.panelH, split);
  } else {
  const ruleY = panel(d, M, lpY, CW, lpH, '1', lead ? lead.name : 'The numbers',
    lead
      ? `Every reading against the target for the period it falls in${lead.unit ? ` \u00b7 ${lead.unit}` : ''}`
      : 'This project has not said what it measures yet');
  /* The grid follows how many lines there actually are. A line's own deck has
   * one chart, and one chart drawn in a quarter of the page leaves three
   * quarters of an A3 blank — so one line gets the whole panel, two get a row
   * each, and three or four get the two-by-two the project has always had. */
  const cGap = 10;
  const n = Math.min(data.lines.length, 4);
  const cols = n <= 1 ? 1 : 2;
  const rows = n <= 2 ? 1 : 2;
  const cW = (CW - 24 - (cols - 1) * cGap) / cols;
  const cH = (lpY + lpH - ruleY - 20 - (rows - 1) * cGap) / rows;
  data.lines.slice(0, 4).forEach((l, i) => {
    const cx = M + 12 + (i % cols) * (cW + cGap);
    const cy = ruleY + 10 + Math.floor(i / cols) * (cH + cGap);
    chart(d, cx, cy, cW, cH, l);
  });
  }

  /* The areas, and how they fall across sheets. BOARD_AVAIL comes from
   * lib/pillars and is in points — the same number the report screen measures
   * against, so the two can never disagree about the page count. */
  const boardAreas = [...new Set(data.board.map(b => b.area))].map(area => ({
    area,
    counts: PILL_KEYS.map(k => data.board.filter(b => b.area === area && b.pillar === k).length),
  }));
  const boardPlan = boardSheets(boardAreas);
  /* The same order the screen renders in, counted the same way: pace, where the
     time is going, the plan, the work, the detail. */
  const hasPareto = !!data.pareto;
  /* A project waiting on nothing prints no materials sheet — an empty grid is a
     page that tells the reader off for having nothing outstanding. */
  const hasMaterials = !!data.materials && data.materials.rows.length > 0;
  /* Same rule for programs: a project with none prints no sheet. */
  const hasPrograms = !!data.programs && data.programs.rows.length > 0;
  /* The detail sheet carries the tracker, the next steps, the walk and the
     wins. With none of them it is a page of headings, so it is not printed —
     which on a commissioning job it never had any of. */
  const hasDetail = data.tracker || data.todos.length > 0 || data.wins.length > 0 || data.snags.length > 0;
  /* The trials that did not fit the front page get a sheet, and it goes
     directly behind it: the rest of the same thought, not an appendix. */
  /* Every sheet after the front one, not just the first. A job running twenty
     tests used to have the last eight silently dropped off the single extra
     sheet the old arithmetic allowed for. */
  const trialSheets = Math.max(0, split.pages.length - 1);
  const hasMoreTrials = trialsOver > 0;
  /* The two "what are we waiting on" panels share a sheet when both are short
     enough to sit on one, which is the usual case. Measured rather than
     guessed: both heights are arithmetic, so the page count below can be right
     before either of them is drawn. */
  const shareSheet = hasMaterials && hasPrograms
    && materialsHeight(data, H, M) + 14 + programsHeight(data, H, M) <= H - 2 * M - 14;
  /* WHERE THE JOB IS goes directly behind the front page. Every other sheet
     here answers a narrower question, and a reader who had to assemble the
     position out of four of them was doing the report's job for it. */
  const hasPlan = !!data.plan && data.plan.lanes.length > 0;
  const pages = 1 + (hasPlan ? 1 : 0) + trialSheets + (hasDetail ? 1 : 0) + (hasPareto ? 1 : 0)
    + (hasMaterials ? 1 : 0) + (hasPrograms && !shareSheet ? 1 : 0)
    + (data.tree.length > 0 ? 1 : 0) + boardPlan.length;
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page 1 of ${pages} — ${data.tracker ? 'line pace' : 'tests and fixes'}`, CW * 0.8), M, H - M + 6);
  d.text(data.tracker
    ? 'The tracker workbook is the system of record; this report reads it.'
    : 'A test is planned, then run, and what it found becomes the next one.',
    W - M, H - M + 6, { align: 'right' });

  const wherePage = 2;
  const trialsPage = wherePage + (hasPlan ? 1 : 0);
  const paretoPage = trialsPage + trialSheets;
  const materialsPage = paretoPage + (hasPareto ? 1 : 0);
  /* Programs sit directly behind materials, because the two answer one question
     between them: what is this line waiting on. */
  const programsPage = shareSheet ? materialsPage : materialsPage + (hasMaterials ? 1 : 0);
  const planPage = programsPage + (hasPrograms && !shareSheet ? 1 : 0);
  const boardPage = planPage + (data.tree.length > 0 ? 1 : 0);

  /* ============== WHERE THE JOB IS — the verdict, the plan, the table =======
   * The same three things the project screen leads with, in the same order and
   * off the same two calls. Only when something carries a date: an axis with
   * nothing on it reads as a fault rather than as an absence. */
  if (hasPlan) {
    d.addPage('a3', 'landscape');
    planSheet(d, data, wherePage, pages);
  }

  /* ================= THE REST OF THE TRIALS, on a sheet of their own ========
   * Only when there are any. Six cards fit the front page; a job running ten
   * trials should not have four of them silently dropped, which is what the
   * table it replaced did with "+4 more than fit this sheet". */
  if (hasMoreTrials && data.trials) {
    let from = split.pages[0] ?? 0;
    for (let sheet = 1; sheet < split.pages.length; sheet++) {
      const count = split.pages[sheet];
      d.addPage('a3', 'landscape');
      trialsSheet(d, data, from, count, sheet, trialSheets, trialsPage + sheet - 1, pages, split);
      from += count;
    }
  }

  /* ============ WHERE THE TIME IS GOING — the Pareto, its own sheet ============
   * A ranking is a shape before it is a table, so the bar is drawn and the
   * numbers sit beside it. When a second Pareto has been uploaded the right
   * hand column carries the movement — the only thing in this report that says
   * whether the work CHANGED anything rather than merely happened. */
  if (data.pareto) {
    const pv = data.pareto;
    d.addPage('a3', 'landscape');
    const py = panel(d, M, M, CW, H - 2 * M - 14, String(paretoPage), 'Where the time is going',
      pv.comparable && pv.beforePeriod
        ? `${pv.period ?? 'this period'} against ${pv.beforePeriod} \u2014 what moved`
        : `${pv.period ?? 'the measured period'} \u2014 ${Math.round(pv.totalMins).toLocaleString()} minutes across ${pv.totalStops} stops`);

    setFont(d, 9, 'bold', INK);
    d.text(fit(d, `${pv.vitalCount} categories carry ${Math.round(pv.vitalShare * 100)}% of the lost time`, CW - 24), M + 12, py + 16);
    if (pv.headline) {
      setFont(d, 7.5, 'normal', MUTED);
      d.text(fit(d, pv.headline, CW - 24), M + 12, py + 28);
    }

    const x0 = M + 12;
    const wAll = CW - 24;
    /* Column geometry as fractions of the panel, so the table cannot run off
       the sheet when a category name is long. */
    const cCat = wAll * 0.26, cBar = wAll * (pv.comparable ? 0.26 : 0.40);
    const cNum = wAll * 0.07;
    const xCat = x0, xBar = xCat + cCat;
    const xShare = xBar + cBar + 8, xStops = xShare + cNum, xMps = xStops + cNum;
    const xMove = xMps + cNum + 8;

    let ry = py + 44;
    setFont(d, 6.6, 'bold', MUTED);
    d.text('CATEGORY', xCat, ry);
    d.text('MINUTES LOST', xBar, ry);
    d.text('SHARE', xShare + cNum - 2, ry, { align: 'right' });
    d.text('STOPS', xStops + cNum - 2, ry, { align: 'right' });
    d.text('MIN/STOP', xMps + cNum - 2, ry, { align: 'right' });
    if (pv.comparable) d.text('CHANGE', xMove, ry);
    d.setDrawColor(LINE); d.setLineWidth(0.8);
    d.line(x0, ry + 4, x0 + wAll, ry + 4);
    ry += 16;

    const maxMins = pv.rows[0]?.mins ?? 0;
    const rowH = 17;
    const bottom = H - M - 14 - 26;
    for (const r of pv.rows) {
      if (ry + rowH > bottom) break;
      if (r.vital) {
        const [vr, vg, vb] = wash(BRAND, 0.05);
        d.setFillColor(vr, vg, vb);
        d.rect(x0, ry - 9, wAll, rowH - 2, 'F');
        d.setFillColor(BRAND); d.rect(x0, ry - 9, 2, rowH - 2, 'F');
      }
      setFont(d, 7.6, 'bold', INK);
      d.text(fit(d, r.category, cCat - 10), xCat + 5, ry);

      const bw = maxMins > 0 ? (r.mins / maxMins) * (cBar - 44) : 0;
      const [br, bg, bb] = wash(BRAND, 0.55);
      d.setFillColor(br, bg, bb);
      d.roundedRect(xBar, ry - 6.5, Math.max(bw, 1), 8, 1.5, 1.5, 'F');
      setFont(d, 7.6, 'bold', INK);
      d.text(Math.round(r.mins).toLocaleString(), xBar + cBar - 4, ry, { align: 'right' });

      setFont(d, 7.2, 'normal', INK2);
      d.text(`${Math.round(r.share * 100)}%`, xShare + cNum - 2, ry, { align: 'right' });
      d.text(String(r.events), xStops + cNum - 2, ry, { align: 'right' });
      d.text(String(Math.round(r.minPerEvent * 10) / 10), xMps + cNum - 2, ry, { align: 'right' });

      if (pv.comparable) {
        const c = r.verdict === 'down' || r.verdict === 'gone' ? OK
          : r.verdict === 'up' ? DANGER
          : r.verdict === 'new' ? WARN : MUTED;
        setFont(d, 7, r.verdict === 'down' || r.verdict === 'up' ? 'bold' : 'normal', c);
        d.text(fit(d, r.move, x0 + wAll - xMove), xMove, ry);
      }
      ry += rowH;
    }

    if (pv.more > 0 || pv.gone.length > 0) {
      setFont(d, 6.8, 'normal', MUTED);
      const bits = [
        pv.more > 0 ? `+${pv.more} smaller categor${pv.more === 1 ? 'y' : 'ies'} below these` : '',
        pv.gone.length > 0 ? `gone entirely: ${pv.gone.join(', ')}` : '',
      ].filter(Boolean).join(' \u00b7 ');
      d.text(fit(d, bits, wAll), x0, Math.min(ry + 6, bottom + 14));
    }

    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${paretoPage} of ${pages} \u2014 where the time is going`, CW * 0.8), M, H - M + 6);
    d.text(pv.comparable && pv.beforePeriod
      ? `Measured against the Pareto covering ${pv.beforePeriod}.`
      : 'One Pareto so far \u2014 no movement can be claimed from a single reading.',
      W - M, H - M + 6, { align: 'right' });
  }

  /* ============ WHAT WE ARE WAITING ON — the plan, as a grid ============
   * Its own sheet, because it is the one page a client can read coverage off in a
   * look: rows of what we need, weeks across the top, green from the week each
   * one lands. Only when there IS something outstanding. */
  if (hasMaterials) {
    d.addPage('a3', 'landscape');
    const bottom = materialsSheet(d, data, materialsPage, pages, M, !shareSheet);
    /* WHAT WE ARE WAITING ON AND WHAT THE MACHINE CAN RUN, ONE SHEET.
       They answer one question between them, and two short panels on two A3s
       is the "be a bit smarter with size" complaint in its plainest form. */
    if (shareSheet) {
      programsSheet(d, data, programsPage, pages, bottom + 14, false);
      setFont(d, 7, 'normal', MUTED);
      d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${materialsPage} of ${pages} \u2014 what we are waiting on, and what the machine can run`, CW * 0.8), M, H - M + 6);
      d.text('Green from the week it lands. Proved carries the day it was proved.',
        W - M, H - M + 6, { align: 'right' });
    }
  }

  /* ============ WHAT THE MACHINE CAN RUN — the programs, as a grid ============
   * Behind the films, and read the same way. Only when there are any. */
  if (hasPrograms && !shareSheet) {
    d.addPage('a3', 'landscape');
    programsSheet(d, data, programsPage, pages);
  }

  /* ================= THE PLAN — the lever tree, its own sheet =================
   * Only when there is one. A page with a heading and nothing under it is worse
   * than no page. */
  if (data.tree.length > 0) {
    d.addPage('a3', 'landscape');
    /* The number in the panel's disc is the PAGE, so it has to be the computed
       one. It was the literal "2", which was true only while the tree was
       always the second sheet — a Pareto in front of it already made it lie. */
    const tpY = panel(d, M, M, CW, H - 2 * M - 14, String(planPage), 'The plan',
      'What has to be true for the outcome, and where each part has got to');

    const roots = treeShape(data.tree);
    for (const r of roots) treeMeasure(d, r);
    const totalH = roots.reduce((t, r) => t + r.h, 0) + Math.max(0, roots.length - 1) * BOX_GAP_Y * 2;
    const depth = (function deepest(bs: TreeBox[], at = 1): number {
      return bs.reduce((m, b) => Math.max(m, b.kids.length ? deepest(b.kids, at + 1) : at), at);
    })(roots);
    const totalW = depth * BOX_W + (depth - 1) * COL_GAP;

    // One scale for the whole drawing, so a big tree shrinks rather than
    // spilling off the sheet or losing its bottom row.
    const availW = CW - 24, availH = (H - M - 20) - tpY;
    /* Up as well as down. A four-box tree drawn at 1:1 on an A3 is a postage
     * stamp in the middle of a blank page; a big one still has to shrink to
     * fit. Capped at 1.7 so the boxes stay boxes rather than becoming posters. */
    const k = Math.min(1.7, availW / totalW, availH / totalH);

    withTreeScale(k, () => {
      // re-measured at the page's own scale — wrapping changes with the width
      for (const r of roots) treeMeasure(d, r);
      const th = roots.reduce((t, r) => t + r.h, 0) + Math.max(0, roots.length - 1) * BOX_GAP_Y * 2;
      let y = tpY + Math.max(0, (availH - th) / 2);
      const x0 = M + 12 + Math.max(0, (availW - totalW * k) / 2);
      for (const r of roots) {
        treeDraw(d, r, x0, y);
        y += r.h + BOX_GAP_Y * 2;
      }
    });

    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} · client report · page ${planPage} of ${pages} — the plan`, CW * 0.8), M, H - M + 6);
    d.text('Kept by hand on the project\u2019s lever tree; the work under it comes off the tracker.',
      W - M, H - M + 6, { align: 'right' });
  }

  /* ============ PEOPLE · PROCESS · PLANT — its own sheet ============
   * One card per area, each with three columns. A board is the one thing in
   * this report whose SHAPE is the message: if it arrives as a list somebody
   * has been handed different information. */
  if (data.board.length > 0) {
    d.addPage('a3', 'landscape');
    const bpY = panel(d, M, M, CW, H - 2 * M - 14, String(boardPage), '3P Board — People · Plant · Process',
      'One card per area \u00b7 every action off this week\u2019s workbook');

    const PILL: { key: 'people' | 'plant' | 'process'; label: string; c: string }[] = [
      { key: 'people',  label: 'PEOPLE',  c: BRAND },
      { key: 'plant',   label: 'PLANT',   c: WARN },
      { key: 'process', label: 'PROCESS', c: BLUE },
    ];
    const colGap = 14;
    const colW = (CW - 24 - colGap * 2) / 3;

    /* FIT AND FILL. The board is four or five cards and it wants to be
       taken in whole, across a table — so the whole drawing is scaled to the
       sheet it is on, DOWN when there is a lot of work and UP when there is
       not. A board that leaves the bottom third of an A3 blank is as wrong as
       one that runs off the edge; it just fails more quietly.

       Each sheet gets its own scale, because a spilled second sheet carrying
       one card should fill itself rather than print it small at the top.
       Every vertical measurement and every type size below is multiplied by
       it, so the page is the same drawing at a different size. */
    let ay = bpY + 14;
    let sheet = 1;

    for (const [si, plan] of boardPlan.entries()) {
      if (si > 0) {
        footBoard(d, data, boardPage + sheet - 1, pages, sheet);
        d.addPage('a3', 'landscape');
        sheet++;
        ay = panel(d, M, M, CW, H - 2 * M - 14, String(boardPage),
          '3P Board — People · Plant · Process (continued)',
          'One card per area \u00b7 every action off this week\u2019s workbook') + 14;
      }
      const k = boardScale(runHeight(plan));
      for (const blk of plan) {
      const area = blk.area;
      const mine = data.board.filter(b => b.area === area);

      // the area's own heading, ruled across all three columns
      setFont(d, 10 * k, 'bold', INK);
      d.text(area.toUpperCase(), M + 12, ay + 8 * k);
      setFont(d, 7.5 * k, 'normal', MUTED);
      d.text(`${mine.length} action${mine.length === 1 ? '' : 's'} · ${mine.filter(b => b.rag === 'g').length} done`,
        M + 12 + CW - 24, ay + 8 * k, { align: 'right' });
      d.setDrawColor(LINE); d.setLineWidth(0.8);
      d.line(M + 12, ay + 12 * k, M + 12 + CW - 24, ay + 12 * k);

      /* The area's block is exactly as tall as the arithmetic in lib/pillars
         says it is — that is what makes the fit honest rather than hopeful. */
      const headH = 16 * k;
      const colHeadH = 14 * k;
      const cardH = BOARD_ACT_H * k;
      const cardGap = BOARD_ACT_GAP * k;

      PILL.forEach((p, i) => {
        const x = M + 12 + i * (colW + colGap);
        const rows = mine.filter(b => b.pillar === p.key);
        const hy = ay + headH + 8 * k;
        setFont(d, 8 * k, 'bold', p.c);
        d.text(p.label, x, hy);
        setFont(d, 7.5 * k, 'normal', MUTED);
        d.text(String(rows.length), x + colW, hy, { align: 'right' });
        d.setDrawColor(p.c); d.setLineWidth(1.2);
        d.line(x, hy + 3 * k, x + colW, hy + 3 * k);

        let y = ay + headH + colHeadH;
        if (rows.length === 0) {
          setFont(d, 8 * k, 'normal', MUTED);
          d.text('\u2014', x, y + 8 * k);
          return;
        }
        for (const b of rows) {
          /* The tree's own words, except for amber. On the tree amber is a node
             somebody judged at risk; on the board it is only ever set by the
             workbook's Overdue flag, and Overdue is the word that gets asked
             about in the room. */
          const st = { ...(TREE_STATUS[b.rag] ?? TREE_STATUS.n) };
          if (b.rag === 'a') st.label = 'Overdue';

          const [wr, wg, wb] = wash(st.c, 0.06);
          d.setFillColor(wr, wg, wb); d.setDrawColor(LINE); d.setLineWidth(0.4);
          d.roundedRect(x, y, colW, cardH, 3, 3, 'FD');
          d.setFillColor(st.c); d.rect(x, y + 1, 2, cardH - 2, 'F');

          /* ONE line of action text, not two. The workbook's Action cells run
             to paragraphs — several dated updates in one cell — and a wall
             board wants the gist with the detail a tap away in the app. That
             one line is what buys the room to get every area onto one sheet. */
          setFont(d, 7.8 * k, 'bold', INK);
          const lines = d.splitTextToSize(b.title, colW - 16) as string[];
          const head = lines.length > 1
            ? (lines[0] ?? '').replace(/\s*\S*$/, '\u2026')
            : (lines[0] ?? '');
          d.text(head, x + 8 * k, y + 11 * k);

          const ty = y + 20 * k;
          setFont(d, 6.5 * k, 'bold', st.c);
          d.text(st.label.toUpperCase(), x + 8 * k, ty);
          const stW = d.getTextWidth(st.label.toUpperCase());
          setFont(d, 6.5 * k, 'normal', INK2);
          d.text(fit(d, [b.owner, b.due && 'due ' + b.due].filter(Boolean).join(' \u00b7 '), colW - 20 * k - stW),
            x + 8 * k + stW + 6 * k, ty);
          y += cardH + cardGap;
        }
      });

      /* Advance by the SAME arithmetic the page count used, not by whatever the
         drawing happened to reach — that is the difference between a board that
         fits and one that is merely close. */
      const tallest = Math.max(...blk.counts, 0);
      ay += BOARD_AREA_CHROME * k
        + (tallest ? tallest * (BOARD_ACT_H + BOARD_ACT_GAP) * k : 14 * k)
        + BOARD_AREA_GAP * k;
      }
    }

    footBoard(d, data, boardPage + sheet - 1, pages, sheet);
  }

  /* ================= TRACKER, ATTENTION & MOVEMENT ================= */
  if (!hasDetail) return;
  d.addPage('a3', 'landscape');

  const gap = 12;
  const colW = (CW - gap * 2) / 3;
  const rowH1 = (H - 2 * M - 18 - gap) * 0.56;
  const rowH2 = (H - 2 * M - 18 - gap) - rowH1;
  const r1y = M, r2y = M + rowH1 + gap;

  /* 2 — action tracker */
  const atRule = panel(d, M, r1y, colW, rowH1, '2',
    data.byLine.length > 1 ? 'Action tracker & the lines' : 'Action tracker',
    data.byLine.length > 1
      ? `${data.total} actions — and what each line's own pack holds`
      : `${data.total} actions`);
  const barY = atRule + 14, barW = colW - 24, barX = M + 12;
  const seg = (v: number) => (data.total ? (v / data.total) * barW : 0);
  d.setFillColor(SURF2); d.roundedRect(barX, barY, barW, 14, 3, 3, 'F');
  let sx = barX;
  ([[data.complete, OK], [data.openOnTrack, BRAND], [data.late, DANGER]] as [number, string][])
    .forEach(([v, c]) => { const sw = seg(v); if (sw > 0.5) { d.setFillColor(c); d.rect(sx, barY, sw, 14, 'F'); sx += sw; } });

  let lx = barX;
  ([['Complete', data.complete, OK], ['Open', data.openOnTrack, BRAND], ['Overdue', data.late, DANGER]] as [string, number, string][])
    .forEach(([lab, v, c]) => {
      d.setFillColor(c); d.roundedRect(lx, barY + 22, 7, 7, 1.5, 1.5, 'F');
      setFont(d, 7.5, 'normal', INK);
      d.text(lab, lx + 11, barY + 28.5);
      const lw = d.getTextWidth(lab);
      setFont(d, 7.5, 'bold', INK);
      d.text(String(v), lx + 14 + lw, barY + 28.5);
      lx += 14 + lw + d.getTextWidth(String(v)) + 12;
    });

  /* The roll-up. Every column after the name is somebody else's pack read from
   * here: their actions, their next steps, their walk, their wins. */
  table(d, barX, barY + 46, barW,
    [{ head: 'Line', width: 0.19 }, { head: 'Owner', width: 0.19 },
     { head: data.byLine.find(r => r.unit)?.unit ?? 'Latest', width: 0.11, align: 'right' },
     { head: 'Open', width: 0.10, align: 'right' }, { head: 'Late', width: 0.10, align: 'right' },
     { head: 'Next', width: 0.11, align: 'right' }, { head: 'Evid.', width: 0.10, align: 'right' },
     { head: 'Wins', width: 0.10, align: 'right' }],
    data.byLine.map(r => [
      { text: r.name, bold: true, colour: r.noLine ? MUTED : INK },
      { text: r.owner, colour: MUTED },
      { text: r.latest == null ? '--' : String(Math.round(r.latest * 100) / 100), bold: true,
        colour: r.meeting == null ? MUTED : r.meeting ? OK : DANGER },
      { text: String(r.open) },
      { text: String(r.late), colour: r.late > 0 ? DANGER : INK, bold: r.late > 0 },
      { text: String(r.nextOpen) },
      { text: String(r.snags), colour: r.snags > 0 ? WARN : INK },
      { text: String(r.wins), colour: r.wins > 0 ? OK : INK },
    ]),
    r1y + rowH1 - 10);

  /* An em dash in the reading column is a question a client asks out loud, so the page
     answers it before they have to. Only when there is one. */
  const noLines = data.byLine.filter(r => r.noLine).map(r => r.name);
  if (noLines.length > 0) {
    setFont(d, 6.4, 'normal', MUTED);
    d.text(fit(d, `${noLines.join(' \u00b7 ')} ${noLines.length === 1 ? 'is an area' : 'are areas'} on the tracker with no line on the project \u2014 actions counted, the rest needs a line adding.`, barW),
      barX, r1y + rowH1 - 2);
  }

  /* 3 — overdue & at risk (spans two columns) */
  const odX = M + colW + gap, odW = colW * 2 + gap;
  const odRule = panel(d, odX, r1y, odW, rowH1, '3', 'Overdue & at risk', 'The actions past their date — where help is needed');
  const endY = table(d, odX + 12, odRule + 14, odW - 24,
    [{ head: 'Line', width: 0.10 }, { head: 'Action', width: 0.55 },
     { head: 'Owner', width: 0.22 }, { head: 'Due', width: 0.13, align: 'right' }],
    data.lateActions.map(a => [
      { text: a.line, bold: true },
      { text: a.what },
      { text: a.owner, colour: INK2 },
      { text: a.due, colour: DANGER, bold: true },
    ]),
    r1y + rowH1 - 22);
  if (data.lateMore > 0) {
    setFont(d, 7, 'bold', DANGER);
    d.text(`+${data.lateMore} more overdue — see the tracker`, odX + 12, endY + 16);
  }

  /* 4 — next steps */
  const nsRule = panel(d, M, r2y, colW, rowH2, '4', 'Next steps', 'To do, waiting, and what came of the finished ones');
  const nsBottom = r2y + rowH2 - 10;
  let ny = table(d, M + 12, nsRule + 14, colW - 24,
    [{ head: 'State', width: 0.20 }, { head: 'What', width: 0.44 }, { head: 'Who', width: 0.20 }, { head: 'When', width: 0.16 }],
    data.todos.map(t => [
      { text: t.state === 'waiting' ? 'Waiting' : 'To do', colour: t.state === 'waiting' ? WARN : ACCENT, bold: true },
      { text: t.what },
      { text: t.who, colour: INK2 },
      { text: t.when, colour: INK2 },
    ]),
    nsBottom);

  /* Finished, with the outcome — the part that used to vanish the moment a line
   * was ticked off. Two lines each so the verdict has room to be read. */
  if (data.completed.length && ny + 30 < nsBottom) {
    ny += 18;
    setFont(d, 6.5, 'bold', OK);
    d.text('DONE — WHAT CAME OF IT', M + 12, ny);
    ny += 4;
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(M + 12, ny, M + colW - 12, ny);
    for (const c of data.completed) {
      if (ny + 24 > nsBottom) break;
      ny += 12;
      setFont(d, 8, 'bold', INK);
      d.text(fit(d, c.what, colW - 70), M + 12, ny);
      if (c.who) {
        setFont(d, 7, 'normal', ACCENT);
        d.text(fit(d, c.who, 52), M + colW - 12, ny, { align: 'right' });
      }
      if (c.outcome) {
        ny += 9;
        setFont(d, 7.5, 'normal', INK2);
        d.text(fit(d, c.outcome, colW - 26), M + 12, ny);
      }
      ny += 4;
    }
    if (data.completedMore > 0 && ny + 12 < nsBottom) {
      ny += 11;
      setFont(d, 7, 'bold', MUTED);
      d.text(`+${data.completedMore} more finished`, M + 12, ny);
    }
  }

  /* 5 — line walk */
  const lwX = M + colW + gap;
  const lwRule = panel(d, lwX, r2y, colW, rowH2, '5', 'Line walk',
    `${data.openSnags} open snag${data.openSnags === 1 ? '' : 's'}`);
  let sy = lwRule + 18;
  if (data.snags.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('No open snags on the walk.', lwX + 12, sy);
  }
  for (const s of data.snags) {
    if (sy + 14 > r2y + rowH2 - 10) break;
    d.setFillColor(s.status === 'in_progress' ? WARN : DANGER);
    d.circle(lwX + 16, sy - 2.5, 3, 'F');
    setFont(d, 8, 'normal', INK);
    d.text(fit(d, s.problem, colW - 118), lwX + 24, sy);
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, [s.line, s.owner, `${s.days}d`].filter(Boolean).join(' · '), 94),
      lwX + colW - 12, sy, { align: 'right' });
    d.setDrawColor('#eef3f8'); d.setLineWidth(0.4);
    d.line(lwX + 12, sy + 5, lwX + colW - 12, sy + 5);
    sy += 17;
  }

  /* 6 — what worked */
  const wwX = M + (colW + gap) * 2;
  const wwRule = panel(d, wwX, r2y, colW, rowH2, '6', 'What we tried', 'What worked, what didn\'t');
  let wy = wwRule + 18;
  if (data.wins.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('Nothing logged yet.', wwX + 12, wy);
  }
  const VERDICT: Record<string, { label: string; c: string }> = {
    proven: { label: 'PROVEN', c: OK },
    better: { label: 'NOT YET PROVEN', c: BLUE },
    flat:   { label: 'NO CHANGE', c: MUTED },
    worse:  { label: 'WORSE', c: DANGER },
  };
  for (const win of data.wins) {
    if (wy + 34 > r2y + rowH2 - 8) break;
    /* A proved win wears its verdict as the pill and prints the derived
       sentence on its own line — the sentence carries both means and both week
       counts, so it is far too long to squeeze in beside a title. An unproved
       one keeps the old typed pill, in ink rather than green: a number somebody
       typed should not be dressed as a result. */
    const v = win.verdict ? VERDICT[win.verdict] : null;
    const pill = v ? v.label : win.impact;
    const pillC = v ? v.c : INK2;
    let pillW = 0;
    if (pill) {
      setFont(d, 7, 'bold', pillC);
      pillW = d.getTextWidth(pill) + 12;
      const [pr, pg, pb] = wash(pillC, 0.12);
      d.setFillColor(pr, pg, pb); d.setDrawColor(pillC); d.setLineWidth(0.6);
      d.roundedRect(wwX + colW - 12 - pillW, wy - 8, pillW, 12, 6, 6, 'FD');
      setFont(d, 7, 'bold', pillC);
      d.text(pill, wwX + colW - 12 - pillW / 2, wy, { align: 'center' });
    }
    setFont(d, 8.5, 'bold', INK);
    d.text(fit(d, win.title, colW - 30 - pillW), wwX + 12, wy);
    wy += 11;
    if (v && win.impact) {
      setFont(d, 7.5, 'bold', pillC);
      d.text(fit(d, win.impact, colW - 24), wwX + 12, wy);
      wy += 10;
    }
    if (win.story) {
      setFont(d, 7.5, 'normal', INK2);
      for (const ln of d.splitTextToSize(win.story, colW - 24).slice(0, 2)) {
        if (wy + 10 > r2y + rowH2 - 8) break;
        d.text(ln as string, wwX + 12, wy); wy += 9;
      }
    }
    setFont(d, 7, 'bold', ACCENT);
    d.text(fit(d, [win.who, win.where].filter(Boolean).join(' · '), colW - 24), wwX + 12, wy);
    wy += 15;
  }

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${pages} of ${pages} — tracker, attention & movement`, CW * 0.8), M, H - M + 6);
  d.text(`Generated ${new Date(data.now).toLocaleString(undefined,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    W - M, H - M + 6, { align: 'right' });
}
