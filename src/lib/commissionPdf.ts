/* THE COMMISSIONING A3 — the sheet you send round.
 *
 * One job: somebody who was not in the room opens this and understands where
 * the line is, without a covering note. So it runs the same four questions the
 * screen does, in the same order, and it leads with the two numbers that decide
 * whether the handover happens — how ready, and how many acceptance checks have
 * actually passed.
 *
 * Page 1 is the answer. Page 2 onward is the evidence for it: every item, by
 * workstream, with its target beside its result so nobody has to take the
 * summary on trust. Splitting it that way means page 1 can be photographed and
 * sent on its own, which is what actually happens to a status sheet.
 *
 * Drawn from numbers, never from the DOM — same rule as the GM report. What is
 * on screen is a preview OF this, not the source of it.
 */
import {
  INK, INK2, MUTED, LINE, BRAND, OK, WARN, DANGER, BLUE,
  san, setFont, fit, panel, wash, type Doc,
} from './reportKit';

export interface CommissionReportRow {
  stream: string;
  kind: 'check' | 'supply' | 'task';
  title: string;
  /** The item's own one-liner — "4 of 12, 8 on order for 2026-09-24". */
  line: string;
  target?: string;
  result?: string;
  owner?: string;
  due?: string;
  note?: string;
  state: 'n' | 'w' | 'a' | 'r' | 'g';
  stateLabel: string;
  /** The very next move, decided on the last pass. */
  next?: string;
  /** Who decided it, and when — a next step with no name against it is a wish. */
  nextBy?: string;
  nextAt?: number;
  /** How many passes this item has had. Two or more means it has been retested,
   *  which is the single most useful thing a status sheet can say about it. */
  passes?: number;
  /** What it did the time BEFORE the current result, when there was one. */
  was?: string;
  /** Pictures of this item, already decoded to data URLs and measured. Resolved
   *  before the drawer runs, because jsPDF cannot wait for a blob and a report
   *  that renders its text now and its photographs later is a report with holes
   *  in it.
   *
   *  Photographs somebody took and stills off the line walk arrive in the same
   *  list, because on paper they do the same job — they are the thing itself.
   *  A walk still carries its snag's own words as `caption`, which is what makes
   *  it evidence rather than a picture of a machine. */
  shots?: { data: string; w: number; h: number; caption?: string }[];
}

export interface CommissionReportData {
  title: string;
  lead?: string;
  now: number;
  /** 0-1. */
  pct: number;
  done: number;
  total: number;
  headline: string;
  checks: { total: number; passed: number; failed: number; untested: number };
  streams: { name: string; done: number; total: number; pct: number; risk: number }[];
  /* ASSETS, when the line has any. A production line is made of machines and
     each is commissioned in its own right, so "the bagger is 70% and the
     palletiser has not started" is what a General Manager wants off the top of
     this sheet — a single project percentage cannot say it. Falls back to the
     workstreams when nothing names an asset, because a panel headed Assets
     with one row called "the line itself" is worse than no panel. */
  assets?: { name: string; done: number; total: number; pct: number; risk: number; isLine: boolean }[];
  /** Blocked and at-risk, worst first — the reason the sheet gets read. */
  attention: CommissionReportRow[];
  rows: CommissionReportRow[];
}

const STATE_COLOUR: Record<CommissionReportRow['state'], string> = {
  n: MUTED, w: BLUE, a: WARN, r: DANGER, g: OK,
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* HOW MUCH FITS, AND WHY PAGE 1 IS DIFFERENT.
 *
 * The detail starts on page 1, underneath the status, rather than on a sheet of
 * its own. The first cut of this report gave the status a whole A3 and the
 * result was two thirds of a sheet of white paper — which on a status report is
 * not restraint, it is a page that failed to say anything with the room it had.
 * So page 1 carries the answer AND as much of the evidence as fits, and only
 * what is left over starts a second sheet.
 *
 * That means two capacities, not one. Both are worked from the geometry below
 * and both are used by the count and by the drawing, so the page numbers cannot
 * disagree with the pages — the fault that once stamped a four-page GM report
 * "page 2 of 3". */
const ROW_H = 13.5;
const STREAM_HEAD_H = 16;

/* The workstream list goes two-up past this many. A commissioning job with
   seven workstreams is normal, and a single column of seven made the status
   panels 250pt tall — which pushed the detail onto a second sheet that was
   then nine tenths white paper. Two short columns say the same thing in half
   the height and leave the evidence where it belongs, under the summary. */
const STREAMS_ONE_COL = 5;
const STREAM_ROW_H = 22;
const PANEL_HEAD_H = 30;

/** How the detail splits: whole workstreams, never half of one, because a
 *  stream cut in two reads as two different streams to anybody skimming. A
 *  stream longer than a whole sheet is the one exception — it has to break. */
export function commissionSheets(
  rows: CommissionReportRow[], first: number, rest: number,
): CommissionReportRow[][] {
  const out: CommissionReportRow[][] = [];
  let cur: CommissionReportRow[] = [];
  let cap = first;
  let i = 0;
  const cost = (block: CommissionReportRow[]) => block.length * ROW_H + STREAM_HEAD_H;
  let used = 0;
  while (i < rows.length) {
    const stream = rows[i].stream;
    const block: CommissionReportRow[] = [];
    while (i < rows.length && rows[i].stream === stream) { block.push(rows[i]); i++; }
    if (cur.length && used + cost(block) > cap) {
      out.push(cur); cur = []; used = 0; cap = rest;
    }
    cur.push(...block);
    used += cost(block);
  }
  if (cur.length) out.push(cur);
  return out.length ? out : [[]];
}

/** How many rows down the workstream list runs, once it has gone two-up. */
const streamRows = (n: number): number =>
  n <= STREAMS_ONE_COL ? n : Math.ceil(n / 2);

/** How tall the two panels need to be to hold what goes in them.
 *
 *  This mirrors the drawing below EXACTLY, and that is the whole point: the
 *  first cut guessed at it, guessed low, and the workstreams panel quietly drew
 *  five of seven streams — a status report that had silently stopped listing
 *  two parts of the job. Any panel that can truncate must either be sized to
 *  its contents or say out loud that it did not fit. This one is sized. */
/** Whichever list panel 1 is drawing — assets when the job has them. */
const panelRows = (data: CommissionReportData) =>
  data.assets?.length ? data.assets : data.streams;

function panelsHeight(data: CommissionReportData): number {
  const streams = PANEL_HEAD_H + 22 + streamRows(panelRows(data).length) * STREAM_ROW_H + 8;
  /* +16 rather than +10: the drawing stops when the NEXT card would not clear
     the panel floor, so the height has to hold the last card plus that check.
     Two points short of it and the panel dropped a blocker it had room for and
     announced "+1 more" underneath the gap. */
  const attention = PANEL_HEAD_H + 20 + Math.max(1, data.attention.length) * 30 + 16;
  return Math.min(330, Math.max(126, Math.max(streams, attention)));
}

/* ---------- page 1: where we are, then as much of the evidence as fits ------- */
function drawStatus(d: Doc, data: CommissionReportData): number {
  const W = d.internal.pageSize.getWidth();
  const M = 26, CW = W - 2 * M;

  /* masthead */
  setFont(d, 8.5, 'bold', BRAND);
  d.text('COMMISSIONING · READINESS', M, M + 10);
  setFont(d, 26, 'bold', INK);
  d.text(fit(d, san(data.title), CW * 0.62), M, M + 38);
  setFont(d, 9, 'normal', MUTED);
  d.text(`Status as at ${fmtDate(data.now)}`, W - M, M + 14, { align: 'right' });
  if (data.lead) {
    setFont(d, 9, 'bold', INK2);
    d.text(san(data.lead), W - M, M + 28, { align: 'right' });
    setFont(d, 8, 'normal', MUTED);
    d.text('Commissioning lead', W - M, M + 39, { align: 'right' });
  }
  d.setDrawColor(BRAND); d.setLineWidth(1.6);
  d.line(M, M + 50, W - M, M + 50);

  /* THE NUMBER, and the sentence that stops it being nodded at. A readiness
     percentage on its own is the easiest thing in the world to agree with. */
  const topY = M + 66, topH = 96;
  d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
  d.roundedRect(M, topY, CW, topH, 6, 6, 'FD');
  d.setFillColor(BRAND); d.rect(M, topY + 1, 4, topH - 2, 'F');

  const pct = Math.round(data.pct * 100);
  setFont(d, 54, 'bold', BRAND);
  d.text(String(pct), M + 26, topY + 58);
  const pw = d.getTextWidth(String(pct));
  setFont(d, 20, 'bold', BRAND);
  d.text('%', M + 26 + pw + 3, topY + 58);
  setFont(d, 8.5, 'bold', MUTED);
  d.text('READY', M + 26, topY + 76);

  const bx = M + 150, bw = CW - 150 - 26;
  setFont(d, 14, 'bold', INK);
  d.text(fit(d, san(data.headline), bw), bx, topY + 30);

  /* the bar */
  const barY = topY + 42;
  const [lr, lg, lb] = wash(MUTED, 0.22);
  d.setFillColor(lr, lg, lb);
  d.roundedRect(bx, barY, bw, 9, 4.5, 4.5, 'F');
  if (pct > 0) {
    d.setFillColor(BRAND);
    d.roundedRect(bx, barY, Math.max(6, (bw * pct) / 100), 9, 4.5, 4.5, 'F');
  }

  /* ACCEPTANCE, counted off the checks only — the film and the training are how
     you get there, they are not the test the line is signed off against. */
  const c = data.checks;
  if (c.total > 0) {
    setFont(d, 9.5, 'bold', INK2);
    d.text('ACCEPTANCE', bx, topY + 70);
    const ax = bx + d.getTextWidth('ACCEPTANCE') + 10;
    setFont(d, 9.5, 'bold', OK);
    d.text(`${c.passed} of ${c.total} checks passed`, ax, topY + 70);
    let cx = ax + d.getTextWidth(`${c.passed} of ${c.total} checks passed`);
    if (c.failed > 0) {
      setFont(d, 9.5, 'bold', DANGER);
      d.text(`  ·  ${c.failed} failed`, cx, topY + 70);
      cx += d.getTextWidth(`  ·  ${c.failed} failed`);
    }
    if (c.untested > 0) {
      setFont(d, 9.5, 'normal', MUTED);
      d.text(`  ·  ${c.untested} still to run`, cx, topY + 70);
    }
  }

  /* the two panels: workstreams on the left, what is next on the right */
  const py = topY + topH + 14;
  const ph = panelsHeight(data);
  const gap = 14;
  const lw = CW * 0.38, rw = CW - lw - gap;

  const rows1 = panelRows(data);
  const byAsset = !!data.assets?.length;
  const sy = panel(d, M, py, lw, ph, '1',
    byAsset ? 'Assets' : 'Workstreams',
    byAsset ? 'each machine on the line, and the line’s own work' : 'where each part has got to');
  const cols = rows1.length > STREAMS_ONE_COL ? 2 : 1;
  const colGap = 14;
  const colW = (lw - 24 - (cols - 1) * colGap) / cols;
  const perCol = streamRows(rows1.length);
  rows1.forEach((s, i) => {
    const col = Math.floor(i / perCol);
    const sx = M + 12 + col * (colW + colGap);
    const ry = sy + 22 + (i % perCol) * STREAM_ROW_H;
    setFont(d, cols === 1 ? 9.5 : 8.4, 'bold', INK);
    // The count is drawn first and the name fitted to what is LEFT, so a long
    // workstream name shortens itself rather than running through the numbers.
    setFont(d, cols === 1 ? 8 : 7.2, 'normal', MUTED);
    const tail = `${s.done} of ${s.total}${s.risk > 0 ? ` · ${s.risk} need attention` : ''}`;
    const tw = d.getTextWidth(tail);
    d.text(tail, sx + colW, ry, { align: 'right' });
    setFont(d, cols === 1 ? 9.5 : 8.4, 'bold', INK);
    d.text(fit(d, san(s.name).toUpperCase(), colW - tw - 10), sx, ry);
    // the bar reads before the numbers do, which is the point of having one
    const y2 = ry + 5;
    const [ar, ag, ab] = wash(MUTED, 0.2);
    d.setFillColor(ar, ag, ab); d.roundedRect(sx, y2, colW, 4.5, 2.2, 2.2, 'F');
    if (s.pct > 0) {
      d.setFillColor(s.risk > 0 ? WARN : BRAND);
      d.roundedRect(sx, y2, Math.max(3, colW * s.pct), 4.5, 2.2, 2.2, 'F');
    }
  });

  const nx = M + lw + gap;
  /* WHAT IS NEXT — DECIDED FIRST, THEN UNDECIDED.
   *
   * The panel used to list whatever was red or amber, which reads as a list of
   * complaints. A commissioning run ENDS in a decision, so the decided moves go
   * first, each with the name of whoever took it: "OEM to re-align the former
   * roller" is a different object from "400g tray is blocked", and a status
   * sheet that cannot tell them apart makes the reader do the sorting.
   *
   * What is left underneath is the honest part — things in trouble that nobody
   * has yet decided anything about. Those are the ones to ask about in the room. */
  const decided = data.attention.filter(r => r.next?.trim());
  const undecided = data.attention.filter(r => !r.next?.trim());
  const ny = panel(d, nx, py, rw, ph, '2', 'What is next',
    decided.length > 0
      ? 'decided on the last run, then anything still without a decision'
      : 'blocked and at risk — worst first, before the list they hide in');
  let ay = ny + 20;
  const bottom = py + ph - 12;
  if (data.attention.length === 0) {
    setFont(d, 9, 'normal', MUTED);
    d.text('Nothing blocked and nothing at risk.', nx + 12, ay + 4);
  }

  let shown = 0;
  for (const r of [...decided, ...undecided]) {
    if (ay + 30 > bottom) break;
    const isDecided = !!r.next?.trim();
    const col = STATE_COLOUR[r.state];
    // A decision is drawn in the brand colour and a bare problem in its own
    // state colour, so the two are told apart before either is read.
    const edge = isDecided ? BRAND : col;
    const [wr, wg, wb] = wash(edge, 0.06);
    d.setFillColor(wr, wg, wb); d.setDrawColor(LINE); d.setLineWidth(0.4);
    d.roundedRect(nx + 12, ay - 9, rw - 24, 26, 3, 3, 'FD');
    d.setFillColor(edge); d.rect(nx + 12, ay - 9, 2.5, 26, 'F');

    setFont(d, 9, 'bold', INK);
    d.text(fit(d, san(isDecided ? r.next! : r.title), rw - 130), nx + 21, ay);
    setFont(d, 7, 'bold', isDecided ? BRAND : col);
    d.text(isDecided ? 'DECIDED' : r.stateLabel.toUpperCase(), nx + rw - 24, ay, { align: 'right' });

    setFont(d, 7.4, 'normal', MUTED);
    const tail = isDecided
      // The decision names the item it came out of, so it can be traced back.
      ? [r.title, r.stream, r.nextBy,
         r.nextAt ? new Date(r.nextAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '']
          .filter(Boolean).join(' · ')
      : [r.stream, r.line, r.owner, r.due && `wanted ${r.due}`].filter(Boolean).join(' · ');
    d.text(fit(d, san(tail), rw - 40), nx + 21, ay + 9);
    ay += 30;
    shown++;
  }
  if (data.attention.length > shown) {
    setFont(d, 7.4, 'bold', MUTED);
    d.text(`+${data.attention.length - shown} more, in the list below`, nx + 12, bottom + 4);
  }

  return py + ph + 16;
}

function foot(d: Doc, data: CommissionReportData, page: number, pages: number, what: string): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${san(data.title)} · commissioning readiness · page ${page} of ${pages} — ${what}`, (W - 56) * 0.8),
    26, H - 26 + 6);
  d.text(`${data.done} of ${data.total} complete · generated ${fmtDate(data.now)}`,
    W - 26, H - 26 + 6, { align: 'right' });
}

/* ---------- the detail sheets ---------- */
function drawDetail(
  d: Doc, data: CommissionReportData, rows: CommissionReportRow[],
  page: number, pages: number, sheet: number, top: number,
): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const y0 = panel(d, M, top, CW, H - M - 14 - top, '3',
    'Every item' + (sheet > 1 ? ' (continued)' : ''),
    'target beside result, so the summary can be checked rather than taken on trust');

  const x = M + 12, w = CW - 24;
  /* Column geometry as fractions, so a long OEM part number cannot push the
     owner off the edge of the sheet. */
  const cTitle = w * 0.30, cLine = w * 0.17, cTarget = w * 0.20, cResult = w * 0.19, cWho = w * 0.14;
  const xTitle = x, xLine = x + cTitle, xTarget = xLine + cLine,
        xResult = xTarget + cTarget, xWho = xResult + cResult;

  let ry = y0 + 20;
  setFont(d, 6.4, 'bold', MUTED);
  d.text('ITEM', xTitle, ry);
  d.text('STATE', xLine, ry);
  d.text('TARGET', xTarget, ry);
  d.text('RESULT', xResult, ry);
  d.text('WHO · WANTED BY', xWho, ry);
  d.setDrawColor(LINE); d.setLineWidth(0.8);
  d.line(x, ry + 4, x + w, ry + 4);
  ry += 15;

  const bottom = H - M - 14 - 22;
  let stream = '';
  for (const r of rows) {
    if (ry + ROW_H + 3 > bottom) break;
    if (r.stream !== stream) {
      stream = r.stream;
      if (ry + STREAM_HEAD_H + ROW_H > bottom) break;
      ry += 4;
      setFont(d, 8.5, 'bold', INK);
      d.text(san(stream).toUpperCase(), xTitle, ry);
      d.setDrawColor(LINE); d.setLineWidth(0.5);
      d.line(x, ry + 3.5, x + w, ry + 3.5);
      ry += STREAM_HEAD_H - 4;
    }
    const col = STATE_COLOUR[r.state];
    if (r.state === 'r' || r.state === 'a') {
      const [br, bg, bb] = wash(col, 0.05);
      d.setFillColor(br, bg, bb);
      d.rect(x, ry - 8, w, 15, 'F');
    }
    d.setFillColor(col); d.circle(xTitle + 2.5, ry - 2.5, 2.2, 'F');

    /* THE PICTURE MARKER IS DRAWN, NOT TYPED.
     *
     * It started life as "▣" appended to the title — which is outside WinAnsi,
     * so jsPDF rendered it as "%£" and threw the letter spacing of the whole
     * run out with it: "C r i t i c a l  s p a r e s  k i t  %£". san() would
     * have caught it, but the marker was concatenated AFTER san ran. A drawn
     * rectangle cannot be mis-encoded by anything. */
    const pics = r.shots?.length ?? 0;
    setFont(d, 7.8, 'bold', INK);
    const titleW = cTitle - 18 - (pics > 0 ? 16 : 0) - ((r.passes ?? 0) > 1 ? 14 : 0);
    const shown = fit(d, san(r.title), titleW);
    d.text(shown, xTitle + 9, ry);
    /* MEASURE THE TITLE WHILE THE TITLE'S FONT IS STILL ACTIVE.
     *
     * getTextWidth reports against whatever font is set right now, so measuring
     * after switching to the 6pt marker font returned the title's width at 6pt
     * — about three quarters of the truth — and the retest marker printed
     * inside the words: "250g tray - run at rx2ate". Both markers now hang off
     * this one measurement, taken before anything else changes the font. */
    const titleEnd = xTitle + 9 + d.getTextWidth(shown);
    if ((r.passes ?? 0) > 1) {
      setFont(d, 6, 'bold', BRAND);
      d.text(`x${r.passes}`, titleEnd + (pics > 0 ? 18 : 5), ry);
    }
    if (pics > 0) {
      const mx = titleEnd + 5;
      d.setFillColor(MUTED);
      d.roundedRect(mx, ry - 5.4, 6, 6, 1, 1, 'F');
      d.setFillColor('#ffffff');
      d.rect(mx + 1.6, ry - 3.8, 2.8, 2.8, 'F');
      if (pics > 1) {
        setFont(d, 6, 'bold', MUTED);
        d.text(String(pics), mx + 8, ry);
      }
    }
    setFont(d, 7.2, 'bold', col);
    d.text(fit(d, san(r.line || r.stateLabel), cLine - 8), xLine, ry);
    setFont(d, 7.2, 'normal', INK2);
    d.text(fit(d, san(r.target ?? '—'), cTarget - 8), xTarget, ry);
    /* RESULT, AND WHAT IT DID BEFORE. A retested item is the only place on this
       sheet that can show movement, and "76 ppm clean (was 61 ppm)" is an
       argument where "76 ppm clean" is a number. It costs no extra row: the
       earlier reading is drawn in the space the current one leaves. */
    setFont(d, 7.2, r.state === 'r' ? 'bold' : 'normal', r.state === 'r' ? DANGER : INK2);
    const nowTxt = fit(d, san(r.result ?? '—'), cResult - 8);
    d.text(nowTxt, xResult, ry);
    if (r.was) {
      const usedW = d.getTextWidth(nowTxt);
      const room = cResult - 12 - usedW;
      if (room > 34) {
        setFont(d, 6.4, 'normal', MUTED);
        d.text(fit(d, san(`was ${r.was}`), room), xResult + usedW + 5, ry);
      }
    }
    setFont(d, 7.2, 'normal', MUTED);
    d.text(fit(d, san([r.owner, r.due].filter(Boolean).join(' · ') || '—'), cWho - 6), xWho, ry);
    ry += ROW_H;
  }

  foot(d, data, page, pages, sheet > 1 ? `every item (${sheet})` : 'every item');
}

/* ---------- the evidence sheet ----------
 * Pictures get their own page rather than thumbnails wedged into a 13pt table
 * row, because a photograph too small to show the crease in the film is not
 * evidence, it is decoration. Captioned with the item and its state so the
 * picture and the claim it settles are never separated.
 *
 * Only items that HAVE pictures appear, and the sheet only exists when at least
 * one does — an empty "Evidence" page is worse than no page. */
/** Columns chosen by how many pictures there are, not fixed.
 *
 *  Four columns is right for a dozen photographs and wrong for three — it makes
 *  each one a stamp on an otherwise empty A3, which is the same failure the
 *  status page had before the detail moved up under it. Few pictures means big
 *  pictures; that is the entire reason they are on paper at all. */
const shotCols = (n: number): number => (n <= 2 ? 2 : n <= 6 ? 3 : 4);

function drawEvidence(
  d: Doc, data: CommissionReportData,
  shots: { row: CommissionReportRow; shot: NonNullable<CommissionReportRow['shots']>[number] }[],
  page: number, pages: number,
): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const y0 = panel(d, M, M, CW, H - 2 * M - 14, '4', 'Pictures',
    'the thing itself — captioned with the item it settles');

  const gap = 14;
  const SHOT_COLS = shotCols(shots.length);
  const cellW = (CW - 24 - gap * (SHOT_COLS - 1)) / SHOT_COLS;
  const capH = 26;
  const cellH = cellW * 0.68 + capH;
  const bottom = H - M - 14 - 16;

  shots.forEach((s, n) => {
    const col = n % SHOT_COLS, row = Math.floor(n / SHOT_COLS);
    const x = M + 12 + col * (cellW + gap);
    const y = y0 + 18 + row * (cellH + gap);
    if (y + cellH > bottom) return;

    const boxH = cellW * 0.68;
    // Letterboxed inside its box, never stretched: a squashed photograph of a
    // machine is the kind of detail that makes a reader distrust the numbers.
    const k = Math.min(cellW / s.shot.w, boxH / s.shot.h);
    const iw = s.shot.w * k, ih = s.shot.h * k;
    const [gr, gg, gb] = wash(MUTED, 0.12);
    d.setFillColor(gr, gg, gb);
    d.roundedRect(x, y, cellW, boxH, 3, 3, 'F');
    try {
      d.addImage(s.shot.data, 'JPEG', x + (cellW - iw) / 2, y + (boxH - ih) / 2, iw, ih);
    } catch { /* a picture that will not decode must not take the sheet with it */ }

    const col2 = STATE_COLOUR[s.row.state];
    setFont(d, 7.4, 'bold', INK);
    d.text(fit(d, san(s.row.title), cellW), x, y + boxH + 11);
    /* A walk still says what the snag says; a photograph says which item it is
       against. Both then name the workstream, so a picture lifted off the page
       still knows where it came from. */
    setFont(d, 6.6, 'bold', col2);
    d.text(fit(d, san(s.shot.caption
      ? `${s.shot.caption} — ${s.row.stream}`
      : `${s.row.stream} · ${s.row.stateLabel}`), cellW), x, y + boxH + 20);
  });

  const fits = Math.max(0, Math.floor((bottom - (y0 + 18)) / (cellH + gap))) * SHOT_COLS;
  if (shots.length > fits) {
    setFont(d, 7, 'bold', MUTED);
    d.text(`+${shots.length - fits} more pictures in the app`, M + 12, bottom + 8);
  }

  foot(d, data, page, pages, 'pictures');
}

export function drawCommissionReport(d: Doc, data: CommissionReportData): void {
  const H = d.internal.pageSize.getHeight();
  const M = 26;
  /* Both capacities from the same geometry the drawing uses. The status band is
     a fixed height, so what page 1 has left for detail is simply what is under
     it — and page 2 onward has the whole sheet. */
  const detailTop = M + 66 + 96 + 14 + panelsHeight(data) + 16;
  const roomFor = (top: number) => (H - M - 14 - 22) - (top + 30 + 20);
  const first = roomFor(detailTop);
  const rest = roomFor(M);

  const sheets = commissionSheets(data.rows, first, rest);
  const shots = data.rows.flatMap(row => (row.shots ?? []).map(shot => ({ row, shot })));
  const pages = sheets.length + (shots.length > 0 ? 1 : 0);

  const top = drawStatus(d, data);
  sheets.forEach((rows, i) => {
    if (i > 0) d.addPage('a3', 'landscape');
    drawDetail(d, data, rows, i + 1, pages, i + 1, i === 0 ? top : M);
  });
  if (shots.length > 0) {
    d.addPage('a3', 'landscape');
    drawEvidence(d, data, shots, pages, pages);
  }
}
