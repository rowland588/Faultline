/* THE PLAN, ON PAPER — the stage-gate client report's plan sheet: where the
 * job is, machine by machine, as the screen's plan draws it (docs/STEADY.md,
 * S4). */
import {
  INK, INK2, MUTED, LINE, BRAND, SURF2, OK, WARN, DANGER, BLUE,
  san, setFont, fit, panel, table, wash, type Doc
} from '../reportKit';
import type { PlanLane, PlacedMark } from '../plan';
import type { PaceReportData } from './data';

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
    case 'ran': return { colour: WARN, filled: true };
    case 'late': return { colour: DANGER, filled: false };
    case 'booked': return { colour: BLUE, filled: false };
    default: return { colour: MUTED, filled: false };
  }
}

/* THE PANEL IS AS TALL AS WHAT IS IN IT, the same rule the materials sheet
 * keeps: a box three times the height of its content reads as a page that
 * failed to finish rather than as a short list.
 *
 * Out here as its own function so the front page can ASK how tall it would be
 * before deciding whether to carry it — see "where the job is, under the tests"
 * below. Measured in the same order the drawing happens, because the box is
 * drawn before anything that goes in it. panel() returns y + 30, so that header
 * is part of the height and was the 30pt this first got wrong: the bottom rule
 * cut through the last two rows of the table. */
const PLAN_ROW_H = 15, PLAN_LANE_GAP = 7;

/* ---- A LANE WITH TOO MUCH IN IT IS DRAWN AS DENSITY, NOT AS WORDS ----
 *
 * Rowland: "the client reports still don't adapt to the amount of content in
 * the app — it overspills, becomes merged and messy." Page 2 was the worst of
 * it. Eighty materials each got a labelled dot, the labels needed twenty-two
 * lines to stop touching, and the lane ran through the footer and off the
 * sheet with the fixes, the tests and the table never drawn at all.
 *
 * A lane that would take more than a few lines is collapsed: every mark on ONE
 * line, unlabelled, so the eye still reads when the work lands and where the
 * red is — and the lane's own name carries the count in words: "12 late · 7
 * ahead". Names are page 3's and the lists' business; the timeline's is shape.
 * Collapsed first by size when the sheet would otherwise overflow, and always
 * past MAX_LANE_ROWS, because six lines of labels is a wall whether or not it
 * fits. */
export const MAX_LANE_ROWS = 8;
/** Past this many marks a lane is density whatever the room: sixteen labelled
 *  dots is a list, and page 3 is the list. */
export const MAX_LANE_MARKS = 16;
type PlanLaneDrawn = PlanLane & { collapsed?: string };
type PlanDrawn = Omit<NonNullable<PaceReportData['plan']>, 'lanes'> & { lanes: PlanLaneDrawn[] };
const COLLAPSED_H = 22;

const laneH = (l: PlanLaneDrawn, rowH: number): number =>
  l.collapsed ? Math.max(rowH, COLLAPSED_H) : l.rows.length * rowH;

function collapseLane(l: PlanLane): PlanLaneDrawn {
  const marks = l.rows.flat().sort((a, b) => a.at - b.at);
  const n = (f: (m: PlacedMark) => boolean) => marks.filter(f).length;
  const late = n(m => m.tone === 'late'), ahead = n(m => m.tone === 'booked');
  const done = n(m => m.tone === 'done' || m.tone === 'failed' || m.tone === 'ran');
  const words = late ? `${late} late · ${ahead} ahead` : `${done} done · ${ahead} ahead`;
  return { ...l, rows: [marks.map(m => ({ ...m, label: '' }))], collapsed: `${marks.length} · ${words}` };
}

/** The plan as the sheet can carry it. Pure; the drawing reads the result. */
export function fitPlan(pl: NonNullable<PaceReportData['plan']>, room: number): PlanDrawn {
  const busy = (l: PlanLane) => l.rows.length > MAX_LANE_ROWS || l.rows.reduce((n, r) => n + r.length, 0) > MAX_LANE_MARKS;
  let lanes: PlanLaneDrawn[] = pl.lanes.map(l => (busy(l) ? collapseLane(l) : l));
  const tooTall = () => planPanelHeight({ ...pl, lanes }, Infinity) > room;
  while (tooTall()) {
    const open = lanes.filter(l => !l.collapsed && l.rows.length > 1);
    if (open.length === 0) break;
    const biggest = open.reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
    lanes = lanes.map(l => (l === biggest ? collapseLane(l) : l));
  }
  return { ...pl, lanes };
}

export function planPanelHeight(pl: PlanDrawn, ceiling: number,
  rowH = PLAN_ROW_H): number {
  const chartOnly = pl.lanes.reduce((n, l) => n + laneH(l, rowH), 0) + pl.lanes.length * PLAN_LANE_GAP + 4;
  const PANEL_HEAD = 30;
  const beforeChart = 24 + (pl.slip ? 11 : 0) + 26;      // verdict, slip, month labels
  const afterChart = 26 + 22 + 8;                         // date tags, key, table heading
  const tableH = 5 + 13 * pl.outstanding.length + 8;
  return Math.min(ceiling, Math.max(220, PANEL_HEAD + beforeChart + chartOnly + afterChart + tableH + 16));
}

/** `at` puts the panel somewhere other than the top of a sheet of its own —
 *  the front page, under the tests — and then there is no footer to write,
 *  because the sheet it is riding on has its own. */
export function planSheet(d: Doc, data: PaceReportData, page: number, pages: number,
  place?: { top: number; n: string }, opts: { grow?: boolean; foot?: boolean } = {}): number {
  const pl: PlanDrawn | undefined = data.plan;
  if (!pl) return 0;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  const panelTop = place?.top ?? M;
  const room = H - M - panelTop - 14;
  const need = planPanelHeight(pl, room);

  /* ---- ON ITS OWN SHEET, THE PLAN FILLS THE SHEET ----
   *
   * Rowland: "expand and make the pdf dynamic, make use of the space better."
   *
   * The panel took only the height it needed, which is right — but on its own
   * A3 that left the timeline squeezed into a 90pt band with five hundred
   * points of white underneath it, and the marks so close together that their
   * labels ran into one another. The one drawing on this page that is worth
   * looking at was the smallest thing on it.
   *
   * So the slack goes into the LANES: the rows get taller, the marks separate,
   * and the labels stop colliding. This is growth that buys legibility rather
   * than air — which is why it is right here and was wrong on the test cards,
   * where the words would have stayed put and only the boxes grown. Capped,
   * because a plan with two marks should not print them an inch apart.
   *
   * Riding on the front page it takes what it needs and no more; the sheet
   * under it belongs to the tests. */
  const rowsTotal = pl.lanes.reduce((n, l) => n + l.rows.length, 0);
  /* A collapsed lane's row is one line of dots, and never grows: the slack
     goes to the lanes that carry words. */
  const growing = pl.lanes.reduce((n, l) => n + (l.collapsed ? 0 : l.rows.length), 0) || rowsTotal;
  /* No growth when something else is coming under it: the slack is theirs. */
  const slack = opts.grow === false ? 0 : Math.max(0, room - need);
  /* 30pt is about as far apart as two marks on a timeline can sit and still
     read as one line of work rather than as a list. Past that the growth is
     only air, and air inside a frame is worse than a page that ends. */
  const ROW_H = rowsTotal > 0 ? Math.min(30, PLAN_ROW_H + slack / growing) : PLAN_ROW_H;
  const LANE_GAP = PLAN_LANE_GAP;
  /* And then the panel ends where its content ends. Filling the sheet by
     stretching the frame was the first attempt and it just moved the white
     inside the box — the same mistake the test cards taught, in a new place. */
  const panelH = Math.min(room, planPanelHeight(pl, room, ROW_H));
  const panelBottom = panelTop + panelH;
  const top = panel(d, M, panelTop, CW, panelH, place?.n ?? String(page), 'Where the project is', pl.counted);
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

  const rowH = ROW_H, laneGap = LANE_GAP;
  const chartH = pl.lanes.reduce((n, l) => n + laneH(l, ROW_H), 0) + pl.lanes.length * LANE_GAP + 4;
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
    /* The count, in words, where the names would have been. */
    if (lane.collapsed) {
      setFont(d, 6, 'normal', MUTED);
      d.text(fit(d, lane.collapsed, PLAN_LANE_W - 6), x0, ly + 17);
    }
    const thisRowH = lane.collapsed ? laneH(lane, rowH) : rowH;

    for (const row of lane.rows) {
      const cy = ly + thisRowH / 2;
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
        if (!m.label) continue;           // a collapsed lane: the dot is the whole mark

        /* The label goes right of the dot, or back towards the middle when the
           dot is near the edge — the last mark on a plan is the one a client
           looks for, and clipping it is the one thing this must not do. */
        const words = san(m.label), when = m.when;
        setFont(d, 7.5, 'bold', INK);
        const wWords = d.getTextWidth(words);
        setFont(d, 6.5, 'normal', MUTED);
        const wWhen = d.getTextWidth(when) + 4;
        /* A BAR'S LABEL STARTS WHERE THE BAR ENDS. The layout already reserved
           its room there (lib/plan footprint); drawing it from the start dot
           ran the bar straight through the machine's own name, which on a
           phone read as the name being struck out. */
        const ex = m.until != null && m.until > m.at ? at(m.until) : mx;
        const flip = ex + 6 + wWords + wWhen > right;
        /* A white backing under the words, so the Today and date rules run
           behind a label rather than through it. */
        const knock = (x: number, w: number) => {
          d.setFillColor(255, 255, 255);
          d.rect(x - 1.5, cy - 4.6, w + 3, 9, 'F');
        };

        if (flip) {
          const shown = fit(d, words, mx - 6 - wWhen - trackX + PLAN_LANE_W);
          setFont(d, 7.5, 'bold', INK);
          const wShown = d.getTextWidth(shown);
          knock(mx - 6 - wWhen - wShown, wShown + wWhen);
          setFont(d, 6.5, 'normal', MUTED);
          d.text(when, mx - 6, cy + 2.4, { align: 'right' });
          setFont(d, 7.5, 'bold', INK);
          d.text(shown, mx - 6 - wWhen, cy + 2.4, { align: 'right' });
        } else {
          setFont(d, 7.5, 'bold', INK);
          const shown = fit(d, words, right - ex - 6 - wWhen);
          const wShown = d.getTextWidth(shown);
          knock(ex + 6, wShown + wWhen);
          d.text(shown, ex + 6, cy + 2.4);
          setFont(d, 6.5, 'normal', MUTED);
          d.text(when, ex + 6 + wShown + 4, cy + 2.4);
        }
      }
      ly += thisRowH;
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
  /* Only when there is one on the sheet — the key is the rule, not a menu. */
  if (pl.lanes.some(l => l.rows.some(r => r.some(m => m.tone === 'ran')))) key('ran', 'ran, no verdict yet');
  key('late', 'late');
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

  /* Riding on the front page, the sheet it is on has already written its own
     footer — and a second one stamped over the first is how a report comes out
     claiming to be two different pages at once. */
  if (place || opts.foot === false) return panelBottom;
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — where the project is`, CW * 0.8), M, H - M + 6);
  d.text('Read off the same records the site and the OEM are working to.',
    W - M, H - M + 6, { align: 'right' });
  return panelBottom;
}
