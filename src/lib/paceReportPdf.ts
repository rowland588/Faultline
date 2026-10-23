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
import { niceScale } from './niceScale';
import {
  INK, INK2, MUTED, LINE, ACCENT, BRAND, SURF2, OK, WARN, DANGER, BLUE, ACTUAL, TARGET,
  san, setFont, fit, panel, table, wash, type Doc,
} from './reportKit';
import { BOARD_ACT_GAP, BOARD_AREA_GAP, boardName, PILLARS } from './pillars';
import { strandsOf, orderStrands, type StrandState } from './strands';
export { strandsOf, orderStrands, strandsSay, strandWord, STRAND_WORD, FIX_STRAND_WORD } from './strands';
export type { Strand, StrandState, StrandStep } from './strands';
import { vsTarget } from './measures';
import { CAP_SHEET_UNITS, capacityPlan, lineSheetUnits, type CapacityReport } from './capacity';
import { fmtN } from './capacityWords';
import { type PaceReportData } from './paceReport/data';
import { type BoardSheetDrawn, layBoard, boardLaneW, footBoard, BOARD_LANE_GAP, TREE_STATUS, BOARD_TITLE_LEAD, BOARD_META_LEAD } from './paceReport/board';
import { fitPlan, planPanelHeight, planSheet } from './paceReport/plan';
import { type Split, columnsFor, C_GAP, planStrand, packColumns, trialsPanel, trialsSheet } from './paceReport/trials';
import { materialsPlan, materialsHeight, materialsSheet } from './paceReport/materials';
import { programsPlan, programsHeight, programsSheet } from './paceReport/programs';
import { owesRoom, planOwes, owesSheet } from './paceReport/owes';
import { installPlan, installHeight, installSheet } from './paceReport/install';
import { treeShape, treeMeasure, type TreeBox, BOX_W, withTreeScale, treeDraw, BOX_GAP_Y, COL_GAP } from './paceReport/tree';

/* Every sheet of the paper is its own file (docs/STEADY.md, S4); each is
 * re-exported here so what imported it from this file still finds it. */
export * from './paceReport/data';
export * from './paceReport/plan';
export * from './paceReport/materials';
export * from './paceReport/install';
export * from './paceReport/trials';
export * from './paceReport/programs';
export * from './paceReport/board';
export * from './paceReport/tree';
export * from './paceReport/owes';

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
  // Round numbers on the scale, the same as the screen's — see lib/niceScale.
  const scale = niceScale(lo, hi);
  const yMin = scale.min, yMax = scale.max;

  const ts = s.points.map(p => Date.parse(p.at + 'T12:00:00'));
  const t0ms = ts[0], t1ms = ts[ts.length - 1];
  const px = (i: number) => (t1ms === t0ms ? (pL + pR) / 2 : pL + ((ts[i] - t0ms) / (t1ms - t0ms)) * (pR - pL));
  const py = (v: number) => pT + ((yMax - v) / (yMax - yMin || 1)) * (pB - pT);

  // recessive gridlines + y labels
  const grid = scale.ticks;
  d.setLineWidth(0.4);
  for (const g of grid) {
    d.setDrawColor('#eef3f3'); d.setLineDashPattern([2, 2], 0);
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
      d.setFillColor(now ? '#ffffff' : SURF2);
      d.setDrawColor(now ? INK : SURF2); d.setLineWidth(now ? 1.2 : 0.8);   // this period, by weight not amber
      d.roundedRect(qx, qy, qW, qH, 4, 4, 'FD');
      setFont(d, 6, 'bold', now ? INK : MUTED);
      d.text(fit(d, cell.name, qW - 4), qx + qW / 2, qy + 10, { align: 'center' });
      setFont(d, 9.5, 'bold', INK);
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

export function drawPaceReport(d: Doc, raw: PaceReportData, out?: { board?: BoardSheetDrawn[] }): void {
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
    completed: raw.completed.map(c => ({
      what: san(c.what), who: san(c.who), outcome: san(c.outcome),
      proof: c.proof ? { ...c.proof, words: san(c.proof.words) } : undefined,
    })),
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
    capacity: raw.capacity && {
      lines: raw.capacity.lines.map(l => ({
        ...l, name: san(l.name), owner: l.owner ? san(l.owner) : undefined, unit: san(l.unit), sentence: san(l.sentence), ...(l.vSays ? { vSays: san(l.vSays) } : {}),
        rows: l.rows.map(r => ({ ...r, name: san(r.name), chain: san(r.chain) })),
      })),
    },
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
    owes: raw.owes && {
      says: san(raw.owes.says),
      parties: raw.owes.parties.map(pt => ({
        ...pt, who: san(pt.who), ask: san(pt.ask),
        lines: pt.lines.map(l => ({ ...l, what: san(l.what), about: san(l.about),
          person: l.person ? san(l.person) : undefined, when: san(l.when) })),
      })),
    },
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
    installation: raw.installation && {
      ...raw.installation,
      rows: raw.installation.rows.map(r => ({
        ...r, machine: san(r.machine), oem: r.oem ? san(r.oem) : undefined, state: san(r.state), says: san(r.says),
        steps: r.steps.map(s => ({ ...s, title: san(s.title) })),
      })),
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
  /* The plan as a sheet can carry it — see fitPlan. Decided once, here, so the
     page count, the "under the tests" test and the drawing read one plan. */
  if (data.plan) data.plan = fitPlan(data.plan, H - 2 * M - 14);

  /* en-GB, pinned: `undefined` took the BUILD machine's locale and printed
     "Thursday, September 24, 2026" at the top of a Lincolnshire client's
     report. */
  const dateLong = new Date(data.now).toLocaleDateString('en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ================= PAGE 1 — LINE PACE ================= */
  setFont(d, 8, 'bold', BRAND);
  d.text(`${data.method ?? (data.tracker ? '' : 'Stage gate')}${data.method || !data.tracker ? ' · ' : ''}CLIENT REPORT`.toUpperCase(), M, M + 8);
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
    /* Only the abnormal number carries colour, as on screen: a zero is grey,
       and a share complete is the work, not good news. */
    [`${data.pctDone}%`, 'Actions complete', `${data.complete} of ${data.total}`, MUTED],
    [String(data.openTotal), 'Still open', 'in flight', MUTED],
    [String(data.late), 'Late', 'actions',  data.late > 0 ? DANGER : MUTED],
    [String(data.openSnags), 'Open evidence', 'from the line walk', data.openSnags > 0 ? WARN : MUTED],
    [String(data.winsThisWeek), 'Wins this week', 'what worked', data.winsThisWeek > 0 ? OK : MUTED],
  ];

  /* A COMMISSIONING JOB'S OWN NUMBERS. "0% actions complete" is not a fact
     about this job, it is a fact about a spreadsheet it does not keep. */
  const tr = data.trials;
  /* THE TILES COUNT WHAT THE SECTION UNDER THEM COUNTS. They counted TESTS —
     "2 booked · 2 passed" — over a section that talks about the four things the
     job is proving, so the two halves of one page disagreed about how big the
     job was. A failed test and its re-test are one thing to prove, not two, and
     the number a client repeats in a meeting has to be the one the page argues
     for underneath it. */
  /* TESTS ONLY. A fix on its own — a guard fitted — was a card among the tests
     and counted in these tiles, so the one thing "proved" on the page was a
     guard going on, not a test passing. It is page 3's now. */
  const headStrands = data.tracker ? [] : orderStrands(strandsOf(tr?.rows ?? [])).filter(x => x.kind === 'test');
  const nStrand = (st: StrandState) => headStrands.filter(x => x.state === st).length;
  const retestBooked = headStrands.filter(x => x.state === 'failed' && x.next?.what === 'Re-test').length;
  const commTiles: [string, string, string, string][] = [
    [String(headStrands.length), 'Tests', 'being proved on this project', MUTED],
    [String(nStrand('proved')), 'Proved', `of ${headStrands.length}`, nStrand('proved') > 0 ? OK : MUTED],
    [String(nStrand('failed')), 'Failed',
      nStrand('failed') ? `${retestBooked} with a re-test booked` : 'none',
      nStrand('failed') > 0 ? DANGER : MUTED],
    [String(nStrand('noVerdict') + nStrand('notRun')), 'Waiting',
      `${nStrand('noVerdict')} no verdict · ${nStrand('notRun')} not run`,
      nStrand('noVerdict') + nStrand('notRun') > 0 ? WARN : MUTED],
    /* THE WHOLE JOB'S LATE, when page 3 is there to account for it. Counted
       off the strands alone, this tile said 3 while page 2's sentence and page
       3's cards said 4 — the fourth a machine that never turned up, which is
       not a test and so was not on this page. One number, three pages. */
    ...((): [string, string, string, string][] => {
      const owesLate = data.owes?.parties.reduce((n, pt) => n + pt.late, 0);
      const strandLate = headStrands.reduce((n, st) => n + st.owed.filter(o => o.late).length, 0);
      const late = owesLate ?? strandLate;
      return [[String(late), 'Past the day',
        owesLate != null ? 'owed across the project — see who owes what' : 'owed and the date has gone',
        late > 0 ? DANGER : MUTED]];
    })(),
    /* INSTALL, when the job keeps install steps: machines in, and the steps
       behind that number — the installation sheet further on says which. */
    ...(data.installation && data.installation.total > 0
      ? [[`${data.installation.machinesIn}/${data.installation.machines}`, 'Installed',
          `${data.installation.done} of ${data.installation.total} install steps done`,
          data.installation.late > 0 ? DANGER : data.installation.done === data.installation.total ? OK : BRAND] as [string, string, string, string]]
      : []),
    /* Only when there is some: the line walk is part of the story when it has
       something open, and a tile reading 0 about it is not. */
    ...(data.openSnags > 0
      ? [[String(data.openSnags), 'Open evidence', 'from the line walk', WARN] as [string, string, string, string]]
      : []),
  ];
  const headTiles = data.tracker ? tiles : commTiles;
  const tGap = 8, tW = (CW - tGap * (headTiles.length - 1)) / headTiles.length, tY = M + 68, tH = 54;
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
    setFont(d, 7.5, 'normal', MUTED);
    d.text(fit(d, sub, tW - 20), tx + 10, tY + 47);
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
  const split: Split = (() => {
    const rows = data.trials?.rows ?? [];
    const none: Split = { plans: [], strands: [], cols: 1, cw: CW - 28,
      layout: { at: [], sheets: 1, front: 0, used: [0] }, panelH: lpH };
    if (data.tracker || rows.length === 0) return none;
    /* Tests only — see the tiles. The strands are measured before anything is
       drawn, so the page count and the packing are about what is drawn. */
    const strands = orderStrands(strandsOf(rows)).filter(x => x.kind === 'test');
    if (strands.length === 0) return none;
    const cols = columnsFor(strands.length);
    const cw = cols === 1 ? CW - 28 : (CW - 28 - C_GAP) / 2;
    /* The room a panel's cards actually get: the front one sits under the
       tiles and behind a numbered head, a continuation sheet is bare. */
    const frontRoom = lpH - 30 - 14 - 12;
    const sheetRoom = H - M - 24 - (M + 66);
    const plans = strands.map(st => planStrand(d, st, cw));
    const layout = packColumns(plans.map(p => p.h), cols, frontRoom, sheetRoom);
    /* The front panel stops where its cards stop. */
    return { plans, strands, cols, cw, layout, panelH: Math.min(lpH, 30 + 14 + layout.front + 14) };
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

  /* The board, laid out and measured, and how it falls across sheets — see
   * layBoard. BOARD_AVAIL comes from lib/pillars and is in points; the screen
   * is handed these very sheets (readPages), so the two can never disagree
   * about the page count or about where a line of an action breaks. */
  const boardPlan = layBoard(d, data, CW);
  if (out) out.board = boardPlan;
  /* The same order the screen renders in, counted the same way: pace, where the
     time is going, the plan, the work, the detail. */
  const hasPareto = !!data.pareto;
  /* The capacity ladder gets a sheet right behind the Pareto — where the time
     goes, then where the line is limited — and one per few lines, never
     splitting a line. */
  const capPlan = data.capacity ? capacityPlan(data.capacity) : [];
  const capSheets = capPlan.length;
  /* A project waiting on nothing prints no materials sheet — an empty grid is a
     page that tells the reader off for having nothing outstanding. */
  const hasMaterials = !!data.materials && data.materials.rows.length > 0;
  /* Same rule for programs: a project with none prints no sheet. */
  const hasPrograms = !!data.programs && data.programs.rows.length > 0;
  /* The detail sheet carries the tracker, the next steps, the walk and the
     wins. With none of them it is a page of headings, so it is not printed —
     which on a commissioning job it never had any of. */
  /* THE TRACKER SHEET IS THE TRACKER'S. On a commissioning job it printed an
     action tracker of zeros for lines the job has not got, an empty "Overdue
     & at risk" frame under a front page with three late things on it, and
     one seeded snag — a different product's report stapled to the back of
     the client's. It was there because every project was a Pace project. A
     job that does not keep a tracker gets no tracker sheet; what the site and
     the OEM owe each other is the front page's business. */
  const hasDetail = data.detail ?? data.tracker;
  /* The trials that did not fit the front page get a sheet, and it goes
     directly behind it: the rest of the same thought, not an appendix. */
  /* Every sheet after the front one, not just the first. A job running twenty
     tests used to have the last eight silently dropped off the single extra
     sheet the old arithmetic allowed for. */
  const trialSheets = Math.max(0, split.layout.sheets - 1);
  const hasMoreTrials = trialsOver > 0;
  /* The two "what are we waiting on" panels share a sheet when both are short
     enough to sit on one, which is the usual case. Measured rather than
     guessed: both heights are arithmetic, so the page count below can be right
     before either of them is drawn. */
  const matSheets = hasMaterials && data.materials ? materialsPlan(data.materials.rows.length, H, M).sheets : 0;
  const progSheets = hasPrograms && data.programs ? programsPlan(data.programs.rows.length, H, M).sheets : 0;
  const shareSheet = hasMaterials && hasPrograms && matSheets === 1 && progSheets === 1
    && materialsHeight(data, H, M) + 14 + programsHeight(data, H, M) <= H - 2 * M - 14;
  /* WHERE THE JOB IS goes directly behind the front page. Every other sheet
     here answers a narrower question, and a reader who had to assemble the
     position out of four of them was doing the report's job for it. */
  /* ---- WHERE THE JOB IS, UNDER THE TESTS WHEN IT FITS ----
   *
   * Rowland: "do the client report pages 2 and 3." Page 2's panel already took
   * only the height it needed — the waste was the empty SHEET around it. On a
   * commissioning job with a handful of tests the front page stopped two thirds
   * of the way down and the position went on a sheet of its own that was itself
   * a third full: two short pages where one full one says more.
   *
   * So when the two fit together, the client opens one sheet and reads the
   * tests and where the job is without turning it over. When there are enough
   * tests to fill the front page it keeps its own sheet, which is the case the
   * separate sheet was designed for. Measured, not assumed — the page count
   * below reads the same boolean. */
  /* Never between two sheets of strands: the story of what is being proved
     reads whole, then where the job is. It rode on page 1 whenever it fitted
     under the FIRST sheet's strands, which put the proved ones — the good
     news — on page 3 after the plan, under an 18pt title, as if a second
     document had started. */
  /* ---- THE TAIL OF THE LAST TEST SHEET IS NOT WASTED ----
   *
   * Whichever sheet the cards end on, page 1 or the fourth continuation, the
   * plan rides on what is left of it when it fits, and the debts ride under
   * the plan when THEY fit. A job with fourteen tests used to print sheet 3
   * with one card on it and the plan on a sheet of its own after that. */
  const lastSheet = split.layout.sheets - 1;
  const tailTop = lastSheet === 0
    ? lpY + split.panelH + 12
    : M + 66 + split.layout.used[lastSheet] + 12;
  const planH = data.plan && data.plan.lanes.length > 0 ? planPanelHeight(data.plan, H - 2 * M - 14) : 0;
  /* Never on a tracker's front page: that page is the numbers. */
  const planUnder = planH > 0 && !data.tracker && tailTop + planH <= H - M - 18;
  const hasPlan = planH > 0 && !planUnder;
  /* WHO OWES WHAT goes behind the story and the position, before anything
     narrower. Measured here, like the strands, so the page count is right
     before either is drawn. It starts under the plan when there is room —
     the position and the debts are one thought — and under the last cards
     when there is no plan. */
  const afterPlanTop = planUnder ? tailTop + planH + 12 : hasPlan ? M + planH + 12 : tailTop;
  const owesUnder = !data.tracker && !!data.owes && data.owes.parties.length > 0
    && owesRoom(H, M, afterPlanTop) >= 160;
  const owesPlan = data.tracker ? undefined : planOwes(d, data, W, H, M, owesUnder ? afterPlanTop : M);
  const owesSheets = owesPlan?.flow.sheets ?? 0;
  /* ---- INSTALLATION RIDES UNDER WHO OWES WHAT WHEN IT FITS ----
   * Two machines filled the top fifth of an A3 and left the rest white. When
   * the whole installation fits under the last sheet of the debts, it goes
   * there — the debts and how far each machine has got are read together. On
   * the tail of a test sheet it keeps its own: that sheet is already two
   * thoughts. Measured before anything is drawn, like everything here. */
  const inRows = data.installation?.rows.length ?? 0;
  const inSheets = inRows > 0 ? installPlan(inRows, H, M).sheets : 0;
  const owesLast = owesSheets - 1;
  const owesLastTop = owesLast === 0 && owesUnder ? afterPlanTop : M;
  const owesLastUsed = owesPlan
    ? owesPlan.flow.segs.filter(s => s.sheet === owesLast).reduce((n, s) => Math.max(n, s.y + s.h), 0) : 0;
  const owesBottom = owesLastTop + 30 + 12 + owesLastUsed + 14;
  const owesOnTail = owesLast === 0 && owesUnder && !hasPlan;
  const installRides = inSheets === 1 && owesSheets > 0 && !owesOnTail
    && owesBottom + 12 + installHeight(inRows) <= H - M - 18;
  const installSheets = installRides ? 0 : inSheets;
  const pages = 1 + (hasPlan ? 1 : 0) + trialSheets + owesSheets - (owesUnder ? 1 : 0) + installSheets
    + (hasDetail ? 1 : 0) + (hasPareto ? 1 : 0) + capSheets
    + matSheets + (hasPrograms && !shareSheet ? progSheets : 0)
    + (data.tree.length > 0 ? 1 : 0) + boardPlan.length;

  /* What rides on the tail of a test sheet, and what its footer then says. */
  const rideTail = (page: number): string => {
    const bits: string[] = [];
    if (planUnder) { planSheet(d, data, page, pages, { top: tailTop, n: '' }); bits.push('where the project is'); }
    if (owesUnder && !hasPlan && owesPlan) { owesSheet(d, data, owesPlan, 0, page, pages, { top: afterPlanTop }); bits.push('who owes what'); }
    return bits.length ? `what we are proving, ${bits.join(', and ')}` : 'what we are proving';
  };
  /* A tracker's front page is the numbers — the same words the screen's
     footer says. It printed "what we are proving", a stage-gate job's. */
  const frontTail = data.tracker ? 'the numbers' : lastSheet === 0 ? rideTail(1) : 'what we are proving';

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page 1 of ${pages} — ${frontTail}`, CW * 0.8), M, H - M + 6);
  d.text(data.tracker
    // The actions are kept in the app now, not read off a workbook.
    ? (data.detail === false ? 'No actions on the board yet.' : 'Every action is kept on the project’s board.')
    : 'One card per test, with the fixes for it. Who owes what, in full, is further on.',
    W - M, H - M + 6, { align: 'right' });

  /* THE STORY READS WHOLE, THEN THE POSITION. The plan sat between the first
     sheet of tests and the second, so a client turned from test 6 to a
     timeline and then back to test 7. The tests run on, then where the job
     is, then who owes what. */
  const trialsPage = 2;
  const wherePage = trialsPage + trialSheets;             // the plan's own sheet, when it has one
  const owesPage = owesUnder ? (hasPlan ? wherePage : 1 + trialSheets) : wherePage + (hasPlan ? 1 : 0);
  /* INSTALLATION behind who owes what: the position, the debts, then how far
     each machine has got — before anything narrower. */
  const installPage = owesPage + owesSheets;
  const paretoPage = installPage + installSheets;
  const capacityPage = paretoPage + (hasPareto ? 1 : 0);
  const materialsPage = capacityPage + capSheets;
  /* Programs sit directly behind materials, because the two answer one question
     between them: what is this line waiting on. */
  const programsPage = shareSheet ? materialsPage : materialsPage + matSheets;
  /* Behind every sheet materials and programs take — on a shared sheet that is
     the materials' sheet, not none: the board after them was stamped with the
     same page number as the sheet before it ("5", then "5" again). */
  const planPage = materialsPage + matSheets + (hasPrograms && !shareSheet ? progSheets : 0);
  const boardPage = planPage + (data.tree.length > 0 ? 1 : 0);

  /* ============== WHERE THE JOB IS — the verdict, the plan, the table =======
   * The same three things the project screen leads with, in the same order and
   * off the same two calls. Only when something carries a date: an axis with
   * nothing on it reads as a fault rather than as an absence. */
  /* ================= THE REST OF THE TRIALS, on a sheet of their own ========
   * Only when there are any. Six cards fit the front page; a job running ten
   * trials should not have four of them silently dropped, which is what the
   * table it replaced did with "+4 more than fit this sheet". */
  if (hasMoreTrials && data.trials) {
    for (let sheet = 1; sheet < split.layout.sheets; sheet++) {
      d.addPage('a3', 'landscape');
      const page = trialsPage + sheet - 1;
      const tail = sheet === lastSheet ? rideTail(page) : 'what we are proving';
      trialsSheet(d, data, sheet, trialSheets, page, pages, split, tail);
    }
  }

  /* ============== WHERE THE JOB IS — the verdict, the plan, the table =======
   * The same three things the project screen leads with, in the same order and
   * off the same two calls. Only when something carries a date: an axis with
   * nothing on it reads as a fault rather than as an absence. */
  if (hasPlan) {
    d.addPage('a3', 'landscape');
    const bottom = planSheet(d, data, wherePage, pages, undefined, { grow: !owesUnder, foot: !owesUnder });
    if (owesUnder && owesPlan) {
      owesSheet(d, data, owesPlan, 0, wherePage, pages, { top: bottom + 12 });
      const alsoInstall = installRides && owesLast === 0;
      if (alsoInstall) installSheet(d, data, wherePage, pages, 0, { top: owesBottom + 12 });
      setFont(d, 7, 'normal', MUTED);
      d.text(fit(d, `${data.title} · client report · page ${wherePage} of ${pages} — where the project is, who owes what${alsoInstall ? ', and installation' : ''}`, CW * 0.8), M, H - M + 6);
      d.text('The same debts as page 1, sorted by who owes them. Every line names what it hangs off.',
        W - M, H - M + 6, { align: 'right' });
    }
  }

  /* ============ WHO OWES WHAT — the rest of it, a sheet at a time ============ */
  if (owesPlan) {
    for (let sheet = owesUnder ? 1 : 0; sheet < owesSheets; sheet++) {
      d.addPage('a3', 'landscape');
      const page = owesPage + sheet;
      if (installRides && sheet === owesLast) {
        owesSheet(d, data, owesPlan, sheet, page, pages, { top: M, n: String(page) });
        installSheet(d, data, page, pages, 0, { top: owesBottom + 12 });
        setFont(d, 7, 'normal', MUTED);
        d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — who owes what, by when, and installation`, CW * 0.6), M, H - M + 6);
        d.text('The same debts as page 1, sorted by who owes them. Every line names what it hangs off.',
          W - M, H - M + 6, { align: 'right' });
      } else {
        owesSheet(d, data, owesPlan, sheet, page, pages);
      }
    }
  }

  for (let sheet = 0; sheet < installSheets; sheet++) {
    d.addPage('a3', 'landscape');
    installSheet(d, data, installPage + sheet, pages, sheet);
  }

  if (data.pareto) {
    const pv = data.pareto;
    d.addPage('a3', 'landscape');
    const py = panel(d, M, M, CW, H - 2 * M - 14, String(paretoPage), 'Where the time is going',
      pv.comparable && pv.beforePeriod
        ? `${pv.period ?? 'this period'} against ${pv.beforePeriod} \u2014 what moved`
        : `${pv.period ?? 'the measured period'} \u2014 ${Math.round(pv.totalMins).toLocaleString()} minutes across ${pv.totalStops} stops`);

    setFont(d, 9, 'bold', INK);
    d.text(fit(d, `${pv.vitalCount} ${pv.vitalCount === 1 ? 'category carries' : 'categories carry'} ${Math.round(pv.vitalShare * 100)}% of the lost time`, CW - 24), M + 12, py + 16);
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
      /* There is no upload: the Pareto is four weeks timed in the app against
         the four before, the same words the screen says. */
      : 'Nothing timed in the four weeks before \u2014 no movement can be claimed yet.',
      W - M, H - M + 6, { align: 'right' });
  }

  /* ============ WHERE THE LINE IS LIMITED — the ladder, a line at a time ============
   * Each station in one unit, the shortest bar the limit, the target as a dashed
   * mark, and the same sentence the Capacity screen leads with. A sheet holds
   * as many lines as fit and never splits one (capacityPlan). */
  if (data.capacity) {
    capPlan.forEach((idx, sheet) => {
      d.addPage('a3', 'landscape');
      const page = capacityPage + sheet;
      const cy0 = panel(d, M, M, CW, H - 2 * M - 14, String(page), 'Where the line is limited',
        'each station in one unit \u2014 the shortest is what holds the rest back');
      const x0 = M + 12, wAll = CW - 24;
      const labelW = wAll * 0.26, barX = x0 + labelW + 8, barW = wAll * 0.56, valX = x0 + wAll;
      /* A SHEET WITH ROOM TO SPARE SCALES UP. One short ladder on an A3 read as a
         thumbnail on a mostly empty page; the sheet's rows are stretched to the
         room there is, up to a little over twice, and the type grows more gently. */
      const used = idx.reduce((n, li) => n + lineSheetUnits((data.capacity as CapacityReport).lines[li]), 0);
      const k = Math.min(2.2, Math.max(1, CAP_SHEET_UNITS / Math.max(used, 1)));
      const f = 1 + (k - 1) * 0.4;
      let y = cy0 + 12 * f;
      for (const li of idx) {
        const l = (data.capacity as CapacityReport).lines[li];
        setFont(d, 10.5 * f, 'bold', INK);
        d.text(fit(d, l.name, wAll * 0.5), x0, y + 4);
        if (l.owner) { setFont(d, 7.4 * f, 'normal', MUTED); d.text(fit(d, `owned by ${l.owner}`, wAll * 0.4), x0 + wAll, y + 4, { align: 'right' }); }
        y += 16 * f;
        setFont(d, 8.4 * f, 'normal', INK2);
        const said = (d.splitTextToSize(l.sentence, wAll * 0.92) as string[]).slice(0, 3);
        for (const ln of said) { d.text(ln, x0, y); y += 11 * f; }
        /* the V-curve's sentence, once the owner has agreed its margin (docs/CAPACITY.md §4) */
        if (l.vSays) { setFont(d, 7.8 * f, 'normal', INK2); for (const ln of (d.splitTextToSize(l.vSays, wAll * 0.92) as string[]).slice(0, 2)) { d.text(ln, x0, y); y += 10 * f; } }
        y += 8 * f + 4;

        const rowH = 35 * k;          // room under the name for the chain, what arrives, and the detail behind the bar
        const bh = 11 * k;
        const top = y;
        const at = (v: number) => barX + Math.min(1, v / l.top) * barW;
        l.rows.forEach((r, i) => {
          const ry = top + i * rowH;
          setFont(d, 8 * f, 'bold', INK);
          d.text(fit(d, r.name, labelW - (r.limit ? 62 * f : 6)), x0, ry + bh * 0.8);
          /* the bottleneck is said in words, in ink — every line has one; red is for a failure (CLAUDE.md, visual management) */
          if (r.limit) { setFont(d, 6.2 * f, 'bold', INK); d.text('LIMITS THE LINE', x0 + labelW - 4, ry + bh * 0.8, { align: 'right' }); }
          if (r.chain) { setFont(d, 6.4 * f, 'normal', MUTED); d.text(fit(d, r.chain, labelW - 6), x0, ry + bh * 0.8 + 8.5 * f); }
          // what arrives against what it does, in its own unit — the number the station is read by
          if (/arrive/.test(r.feed)) { setFont(d, 6 * f, 'normal', r.feed.includes('holds the line back') ? DANGER : MUTED); d.text(fit(d, r.feed, labelW + barW * 0.5), x0, ry + bh * 0.8 + 15.5 * f); }
          // the detail behind the bar: the speed as typed, crew, running, good, and how it is known
          setFont(d, 5.8 * f, 'normal', MUTED); d.text(fit(d, r.detail, labelW + barW * 0.5), x0, ry + bh * 0.8 + 22 * f);
          d.setFillColor(SURF2); d.roundedRect(barX, ry + 1, barW, bh, 2, 2, 'F');
          const [pr, pg, pb] = wash(r.limit ? INK : BRAND, 0.28);
          d.setFillColor(pr, pg, pb);
          d.roundedRect(barX, ry + 1, Math.max(2, at(r.running) - barX), bh, 2, 2, 'F');
          d.setFillColor(r.limit ? INK : BRAND);
          d.roundedRect(barX, ry + 1, Math.max(2, at(r.effective) - barX), bh, 2, 2, 'F');
          setFont(d, 9 * f, 'bold', INK);
          d.text(fmtN(r.effective), valX, ry + bh * 0.85, { align: 'right' });
          if (r.effective < r.running - 1e-9) { setFont(d, 6.2 * f, 'normal', MUTED); d.text(`${fmtN(r.running)} running`, valX, ry + bh * 0.85 + 8 * f, { align: 'right' }); }
        });
        const bottom = top + l.rows.length * rowH;
        if (l.target != null) {
          const tx = at(l.target);
          d.setDrawColor(INK); d.setLineWidth(0.9); d.setLineDashPattern([2.2, 1.6], 0);
          d.line(tx, top - 3, tx, bottom - (rowH - bh - 1));
          d.setLineDashPattern([], 0);
          setFont(d, 6.4 * f, 'bold', INK); d.text(`target ${fmtN(l.target)}`, tx, top - 5.5, { align: 'center' });
        }
        y = bottom + 2;
        setFont(d, 6.6 * f, 'normal', MUTED);
        d.text(`${l.unit} a minute \u00b7 solid bar: with its own stops \u00b7 pale: at running speed${l.target != null ? ` \u00b7 dashed: target ${fmtN(l.target)}` : ''}${l.more > 0 ? ` \u00b7 +${l.more} more station${l.more === 1 ? '' : 's'} not shown` : ''}`, x0, y + 6);
        // the what-ifs beside the line, each judged against it in one sentence,
        // then DRAWN — its own ladder on the same scale, so the bars move too
        for (const x of l.whatIfs) {
          y += 11 * f;
          setFont(d, 7 * f, 'bold', INK);
          const head = san(`What if ${x.name}${x.onBoard ? ' \u00b7 on the board' : ''} \u2014`);
          d.text(head, x0, y + 6);
          const headW = d.getTextWidth(head) + 3;
          setFont(d, 7 * f, 'normal', INK2);
          d.text(fit(d, san(x.says), wAll - headW - 4), x0 + headW, y + 6);
          // what was changed, station by station (san: the arrow is not in the PDF font)
          for (const c of x.changed.slice(0, 3)) { y += 9 * f; setFont(d, 6.4 * f, 'normal', MUTED); d.text(fit(d, san(`\u2022 ${c}`), wAll - 12), x0 + 10, y + 6); }
          if (x.changed.length > 3) { y += 9 * f; setFont(d, 6.4 * f, 'normal', MUTED); d.text(`\u2022 +${x.changed.length - 3} more`, x0 + 10, y + 6); }
          if (!x.rows.length) continue;
          // the what-if's ladder: shorter rows, no detail (that is on the line as
          // run above), a changed station underlined and said, the limit red
          const wRowH = 14 * k, wBh = 7 * k;
          const wTop = y + 10 * f;
          x.rows.forEach((r, i) => {
            const ry = wTop + i * wRowH;
            setFont(d, 6.8 * f, 'bold', r.limit ? INK : INK);
            const nameW = labelW - 10 - (r.limit ? 76 * f : r.changed ? 34 * f : 6);
            d.text(fit(d, r.name, nameW), x0 + 10, ry + wBh * 0.9);
            if (r.changed) { const tw = d.getTextWidth(fit(d, r.name, nameW)); d.setDrawColor(INK2); d.setLineWidth(0.5); d.line(x0 + 10, ry + wBh * 0.9 + 1.4, x0 + 10 + tw, ry + wBh * 0.9 + 1.4); }
            if (r.limit) { setFont(d, 5.6 * f, 'bold', DANGER); d.text('WOULD LIMIT THE LINE', x0 + labelW - 4, ry + wBh * 0.9, { align: 'right' }); }
            else if (r.changed) { setFont(d, 5.6 * f, 'bold', INK2); d.text('CHANGED', x0 + labelW - 4, ry + wBh * 0.9, { align: 'right' }); }
            d.setFillColor(SURF2); d.roundedRect(barX, ry + 1, barW, wBh, 1.5, 1.5, 'F');
            const [pr, pg, pb] = wash(r.limit ? INK : BRAND, 0.28);
            d.setFillColor(pr, pg, pb);
            d.roundedRect(barX, ry + 1, Math.max(2, at(r.running) - barX), wBh, 1.5, 1.5, 'F');
            d.setFillColor(r.limit ? INK : BRAND);
            d.roundedRect(barX, ry + 1, Math.max(2, at(r.effective) - barX), wBh, 1.5, 1.5, 'F');
            setFont(d, 7.6 * f, 'bold', INK);
            d.text(fmtN(r.effective), valX, ry + wBh * 0.95, { align: 'right' });
            if (r.effective < r.running - 1e-9) { setFont(d, 5.4 * f, 'normal', MUTED); d.text(`${fmtN(r.running)} running`, valX - 24 * f, ry + wBh * 0.95, { align: 'right' }); }
          });
          const wBottom = wTop + x.rows.length * wRowH;
          if (x.target != null) {
            const tx = at(x.target);
            d.setDrawColor(INK); d.setLineWidth(0.7); d.setLineDashPattern([2.2, 1.6], 0);
            d.line(tx, wTop - 2, tx, wBottom - (wRowH - wBh - 1));
            d.setLineDashPattern([], 0);
          }
          y = wBottom - 4;
          setFont(d, 6 * f, 'normal', MUTED);
          d.text(`${l.unit} a minute, on the same scale as the line as run${x.line != null ? ` \u00b7 would do ${fmtN(x.line)}` : ''}${x.target != null ? ` \u00b7 dashed: target ${fmtN(x.target)}` : ''}`, x0 + 10, y + 6);
        }
        y += 22 * f;
        d.setDrawColor(LINE); d.setLineWidth(0.6); d.line(x0, y - 8, x0 + wAll, y - 8);
      }
      setFont(d, 7, 'normal', MUTED);
      d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${page} of ${pages} \u2014 where the line is limited`, CW * 0.8), M, H - M + 6);
      d.text('A steady-state screen: buffers hide short stops, so it shows where to look \u2014 not a promise.', W - M, H - M + 6, { align: 'right' });
    });
  }

  /* ============ WHAT WE ARE WAITING ON — the plan, as a grid ============
   * Its own sheet, because it is the one page a client can read coverage off in a
   * look: rows of what we need, weeks across the top, filled from the week each
   * one lands (indigo while coming, green once in). Only when there IS something
   * outstanding. */
  for (let sheet = 0; sheet < matSheets; sheet++) {
    d.addPage('a3', 'landscape');
    const bottom = materialsSheet(d, data, materialsPage + sheet, pages, M, !shareSheet, sheet);
    /* WHAT WE ARE WAITING ON AND WHAT THE MACHINE CAN RUN, ONE SHEET.
       They answer one question between them, and two short panels on two A3s
       is the "be a bit smarter with size" complaint in its plainest form. */
    if (shareSheet) {
      programsSheet(d, data, programsPage, pages, bottom + 14, false);
      setFont(d, 7, 'normal', MUTED);
      d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${materialsPage} of ${pages} \u2014 what we are waiting on, and what the machine can run`, CW * 0.8), M, H - M + 6);
      d.text('Indigo from the week it is due, green once it is in. Proved carries the day it was proved.',
        W - M, H - M + 6, { align: 'right' });
    }
  }

  /* ============ WHAT THE MACHINE CAN RUN — the programs, as a grid ============
   * Behind the films, and read the same way. Only when there are any. */
  if (hasPrograms && !shareSheet) {
    for (let sheet = 0; sheet < progSheets; sheet++) {
      d.addPage('a3', 'landscape');
      programsSheet(d, data, programsPage + sheet, pages, undefined, true, sheet);
    }
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
    d.text(fit(d, 'Kept by hand on the project\u2019s lever tree; the work under it comes off the board, and a box bound to a number takes its colour from the line\u2019s latest reading.', CW * 0.6),
      W - M, H - M + 6, { align: 'right' });
  }

  /* ============ THE BOARD — its own sheet ============
   * One block per line, each with the six lanes of lib/pillars in the
   * fishbone's order. A board is the one thing in this report whose SHAPE is
   * the message: if it arrives as a list somebody has been handed different
   * information. Laid out and measured by layBoard above; this only draws. */
  if (data.board.length > 0) {
    const boardTitle = `${boardName(data.method)} \u2014 ${PILLARS.map(p => p.label).join(' \u00b7 ')}`;
    const boardSub = 'One block per line \u00b7 every action on the project\u2019s board, on its bone';
    const laneW = boardLaneW(CW);

    /* FIT AND FILL. The whole drawing is scaled to the sheet it is on, DOWN
       when there is a lot of work and UP when there is not — each sheet its
       own scale, chosen by layBoard. Every vertical measurement and every
       type size below is multiplied by it, so the page is the same drawing at
       a different size. */
    for (const [si, sh] of boardPlan.entries()) {
      if (si > 0) footBoard(d, data, boardPage + si - 1, pages, si);
      d.addPage('a3', 'landscape');
      let ay = panel(d, M, M, CW, H - 2 * M - 14, String(boardPage),
        boardTitle + (si > 0 ? ' (continued)' : ''), boardSub) + 14;
      const k = sh.scale;

      for (const blk of sh.blocks) {
        // the area's own heading, ruled across all six lanes
        setFont(d, 10 * k, 'bold', INK);
        d.text(blk.area.toUpperCase() + (blk.part > 1 ? ' (CONTINUED)' : ''), M + 12, ay + 8 * k);
        setFont(d, 7.5 * k, 'normal', MUTED);
        d.text(`${blk.total} action${blk.total === 1 ? '' : 's'} \u00b7 ${blk.done} done`,
          M + 12 + CW - 24, ay + 8 * k, { align: 'right' });
        d.setDrawColor(LINE); d.setLineWidth(0.8);
        d.line(M + 12, ay + 12 * k, M + 12 + CW - 24, ay + 12 * k);

        const headH = 16 * k;
        const colHeadH = 14 * k;

        /* Told apart by place and name, not colour — the colours are kept for
           where each action stands (CLAUDE.md, visual management). */
        blk.lanes.forEach((ln, i) => {
          const x = M + 12 + i * (laneW + BOARD_LANE_GAP);
          const hy = ay + headH + 8 * k;
          setFont(d, 8 * k, 'bold', INK2);
          d.text(ln.label.toUpperCase(), x, hy);
          setFont(d, 7.5 * k, 'normal', MUTED);
          d.text(String(ln.count), x + laneW, hy, { align: 'right' });
          d.setDrawColor(INK2); d.setLineWidth(1.2);
          d.line(x, hy + 3 * k, x + laneW, hy + 3 * k);

          let y = ay + headH + colHeadH;
          if (ln.cards.length === 0) {
            /* A dash says "nothing on this bone". On a continued block a lane
               that has finished says nothing — its dash was on the first. */
            if (blk.part === 1) { setFont(d, 8 * k, 'normal', MUTED); d.text('\u2014', x, y + 8 * k); }
            return;
          }
          for (const c of ln.cards) {
            const st = TREE_STATUS[c.rag] ?? TREE_STATUS.n;
            const cardH = c.h * k;
            const [wr, wg, wb] = wash(st.c, 0.06);
            d.setFillColor(wr, wg, wb); d.setDrawColor(LINE); d.setLineWidth(0.4);
            d.roundedRect(x, y, laneW, cardH, 3, 3, 'FD');
            d.setFillColor(st.c); d.rect(x, y + 1, 2, cardH - 2, 'F');

            // every word of the action, on as many lines as it takes
            setFont(d, 7.8 * k, 'bold', INK);
            c.title.forEach((t, j) => d.text(t, x + 8 * k, y + (11 + j * BOARD_TITLE_LEAD) * k));

            const ty = y + (20 + (c.title.length - 1) * BOARD_TITLE_LEAD) * k;
            setFont(d, 6.5 * k, 'bold', st.c);
            d.text(c.status, x + 8 * k, ty);
            const stW = d.getTextWidth(c.status);
            setFont(d, 6.5 * k, 'normal', INK2);
            c.meta.forEach((m, j) => d.text(m, x + 8 * k + stW + 6 * k, ty + j * BOARD_META_LEAD * k));
            y += cardH + BOARD_ACT_GAP * k;
          }
        });

        /* Advance by the SAME arithmetic the sheet plan used, not by whatever
           the drawing happened to reach — that is the difference between a
           board that fits and one that is merely close. */
        ay += (blk.h + BOARD_AREA_GAP) * k;
      }
    }

    footBoard(d, data, boardPage + boardPlan.length - 1, pages, boardPlan.length);
  }

  /* ================= TRACKER, ATTENTION & MOVEMENT ================= */
  if (!hasDetail) return;
  d.addPage('a3', 'landscape');
  /* The badge is the page's number, as on every sheet before this one. This
     sheet's panels were numbered 2–6 from when it was the second page, so a
     four-page report read 1, 2, 3, then 2, 3, 4, 5, 6. They carry on from
     the sheet's own number, as the screen's preview numbers them. */
  const first = d.getNumberOfPages();
  const sheetNo = String(first);

  const gap = 12;
  const colW = (CW - gap * 2) / 3;

  /* ---------- THE TWO ROWS TAKE THE HEIGHT THEIR CONTENT NEEDS ----------
   *
   * Rowland, having seen the trials fixed: "do the client report pages 2 and 3."
   *
   * The six panels sat on a rigid grid — the top row 56% of the sheet and the
   * bottom row the other 44%, whatever was in them. On a job with two lines,
   * one overdue action and one win, that is six frames each sized for a full
   * A3 holding two rows, and the sheet reads as five things that failed to
   * load rather than a short week.
   *
   * THE SHAPE STAYS. The 3×2 is not decoration: tracker beside overdue on top,
   * then next steps, the walk and what we tried underneath, is the order
   * somebody reads them in and it is the same order as the screen. What
   * changes is only how tall each row is — and when the two together do not
   * fit, they share the sheet in the proportion they asked for rather than in
   * a proportion decided in advance.
   *
   * Measured in the same units the drawing uses: panel() returns y + 30, a
   * table row is 13pt on a 5pt header rule, and a floor of 150 keeps a panel
   * that is genuinely empty from collapsing to its own heading. */
  const PANEL_HEAD = 30, ROW = 13, TABLE_HEAD = 5, PAD = 12, FLOOR = 150;
  const tableH = (n: number) => TABLE_HEAD + ROW * n + 8;

  const noLines = data.byLine.filter(r => r.noLine).map(r => r.name);
  /* 14 to the bar, the bar itself, its key, then the roll-up table. */
  const trackerH = PANEL_HEAD + 14 + 14 + 32 + tableH(data.byLine.length)
    + (noLines.length > 0 ? 12 : 0) + PAD;
  const overdueH = PANEL_HEAD + 14 + tableH(data.lateActions.length)
    + (data.lateMore > 0 ? 22 : 0) + PAD;

  /* The finished-with-an-outcome block under next steps: a heading, its rule,
     then a line each and a second one wherever somebody wrote the outcome. */
  const doneH = data.completed.length === 0 ? 0
    : 22 + data.completed.reduce((n, c) => n + 16 + (c.outcome ? 9 : 0) + (c.proof ? 9 : 0), 0)
      + (data.completedMore > 0 ? 11 : 0);
  const nextH = PANEL_HEAD + 14 + tableH(data.todos.length) + doneH + PAD;
  const walkH = PANEL_HEAD + 18 + 17 * Math.max(1, data.snags.length) + PAD;
  /* A win is a title, the impact line a proved one carries, up to two lines of
     story, and whose it was. */
  const winsH = PANEL_HEAD + 18 + PAD + data.wins.reduce(
    (n, w) => n + 11 + (w.verdict && w.impact ? 10 : 0) + (w.story ? 18 : 0) + 15, 0)
    + (data.wins.length === 0 ? 14 : 0);

  const want1 = Math.max(FLOOR, trackerH, overdueH);
  const want2 = Math.max(FLOOR, nextH, walkH, winsH);
  const avail = H - 2 * M - 18 - gap;
  /* Only ever shrink. A row that wants less than its share keeps less than its
     share — that is the whole point — and the sheet simply ends sooner. */
  const k = Math.min(1, avail / (want1 + want2));
  const rowH1 = want1 * k;
  const rowH2 = want2 * k;
  const r1y = M, r2y = M + rowH1 + gap;

  /* 2 — action tracker */
  const atRule = panel(d, M, r1y, colW, rowH1, sheetNo,
    data.byLine.length > 1 ? 'The actions & the lines' : 'The actions',
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
  ([['Complete', data.complete, OK], ['Open', data.openOnTrack, BRAND], ['Late', data.late, DANGER]] as [string, number, string][])
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
     { head: 'Open', width: 0.135, align: 'right' }, { head: 'Late', width: 0.135, align: 'right' },
     // No NEXT column: a line's next steps ARE its actions now (lib/actions.ts),
     // so it printed the Open count a second time.
     { head: 'Evid.', width: 0.12, align: 'right' }, { head: 'Wins', width: 0.12, align: 'right' }],
    data.byLine.map(r => [
      { text: r.name, bold: true, colour: r.noLine ? MUTED : INK },
      { text: r.owner, colour: MUTED },
      { text: r.latest == null ? '--' : String(Math.round(r.latest * 100) / 100), bold: true,
        colour: r.meeting == null ? MUTED : r.meeting ? OK : DANGER },
      { text: String(r.open) },
      { text: String(r.late), colour: r.late > 0 ? DANGER : INK, bold: r.late > 0 },
      { text: String(r.snags), colour: r.snags > 0 ? WARN : INK },
      { text: String(r.wins), colour: r.wins > 0 ? OK : INK },
    ]),
    r1y + rowH1 - 10);

  /* An em dash in the reading column is a question a client asks out loud, so the page
     answers it before they have to. Only when there is one. Measured above,
     because the panel's height depends on whether this line is printed. */
  if (noLines.length > 0) {
    setFont(d, 6.4, 'normal', MUTED);
    d.text(fit(d, `${noLines.join(' \u00b7 ')} ${noLines.length === 1 ? 'is an area' : 'are areas'} on the board with no line on the project \u2014 actions counted, the rest needs a line adding.`, barW),
      barX, r1y + rowH1 - 2);
  }

  /* 3 — overdue & at risk (spans two columns) */
  const odX = M + colW + gap, odW = colW * 2 + gap;
  const odRule = panel(d, odX, r1y, odW, rowH1, String(first + 1), 'Late & at risk', 'The actions that are late — where help is needed');
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
    d.text(`+${data.lateMore} more late — see the board`, odX + 12, endY + 16);
  }

  /* 4 — next steps */
  const nsRule = panel(d, M, r2y, colW, rowH2, String(first + 2), 'Who is doing what', 'To do, waiting, and what came of the finished ones');
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
      /* DID IT WORK? The verdict first, in the colour a Win's would be, then
         the numbers it rests on — before and after, counted. */
      if (c.proof) {
        ny += 9;
        const col = c.proof.state === 'proven' ? OK : c.proof.state === 'worse' ? DANGER : c.proof.state === 'soon' ? MUTED : WARN;
        setFont(d, 7, 'bold', col);
        d.text(c.proof.word.toUpperCase(), M + 12, ny);
        const ww = d.getTextWidth(c.proof.word.toUpperCase());
        setFont(d, 7, 'normal', INK2);
        d.text(fit(d, c.proof.words, colW - 38 - ww), M + 12 + ww + 6, ny);
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
  const lwRule = panel(d, lwX, r2y, colW, rowH2, String(first + 3), 'Line walk',
    `${data.openSnags} open on the walk`);
  let sy = lwRule + 18;
  if (data.snags.length === 0) {
    setFont(d, 8, 'normal', MUTED);
    d.text('Nothing open on the walk.', lwX + 12, sy);
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
    d.setDrawColor('#eef3f3'); d.setLineWidth(0.4);
    d.line(lwX + 12, sy + 5, lwX + colW - 12, sy + 5);
    sy += 17;
  }

  /* 6 — what worked */
  const wwX = M + (colW + gap) * 2;
  const wwRule = panel(d, wwX, r2y, colW, rowH2, String(first + 4), 'What we tried', 'What worked, what didn\'t');
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
  d.text(fit(d, `${data.title} · client report · page ${pages} of ${pages} — actions, attention & movement`, CW * 0.8), M, H - M + 6);
  d.text(`Generated ${new Date(data.now).toLocaleString('en-GB',
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    W - M, H - M + 6, { align: 'right' });
}

/* ====================== WHERE EACH PART OF THE FILE LANDS ======================
 *
 * The screen's preview used to number its pages with a second copy of the page
 * arithmetic, and the two drifted: the preview said "installation, page 3 of
 * 4" while the file said page 4, because the preview never had the "where the
 * job is" sheet. Every fix to one copy was a fix the other did not get.
 *
 * So the preview asks the file. This draws the report — no pictures, which do
 * not change a single page break (see the photo row in planStrand) — and
 * records every string with the page it landed on. The preview looks up the
 * first page a panel's title appears on. One arithmetic, read twice. */
export interface FilePages {
  of: number; texts: { page: number; text: string }[];
  /** The board exactly as the file lays it out — sheets, scale, and every
   *  card's lines — so the screen draws the same board rather than a guess. */
  board?: BoardSheetDrawn[];
}

export function readPages(d: Doc, data: PaceReportData): FilePages {
  const texts: FilePages['texts'] = [];
  const real = d.text.bind(d);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow shim over jsPDF's overloaded text()
  (d as any).text = (t: unknown, ...rest: unknown[]) => {
    const page = d.getCurrentPageInfo().pageNumber;
    if (typeof t === 'string') texts.push({ page, text: t });
    else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') texts.push({ page, text: x });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ditto
    return (real as any)(t, ...rest);
  };
  const out: { board?: BoardSheetDrawn[] } = {};
  drawPaceReport(d, data, out);
  return { of: d.getNumberOfPages(), texts, board: out.board };
}

/** The first page a string matching `re` was drawn on. */
export const firstPageOf = (f: FilePages, re: RegExp): number | undefined =>
  f.texts.find(t => re.test(t.text))?.page;
