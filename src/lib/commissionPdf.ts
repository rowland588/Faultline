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
function panelsHeight(data: CommissionReportData): number {
  const streams = PANEL_HEAD_H + 22 + streamRows(data.streams.length) * STREAM_ROW_H + 8;
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

  const sy = panel(d, M, py, lw, ph, '1', 'Workstreams', 'where each part has got to');
  const cols = data.streams.length > STREAMS_ONE_COL ? 2 : 1;
  const colGap = 14;
  const colW = (lw - 24 - (cols - 1) * colGap) / cols;
  const perCol = streamRows(data.streams.length);
  data.streams.forEach((s, i) => {
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
  const ny = panel(d, nx, py, rw, ph, '2', 'What is next',
    'blocked and at risk — worst first, before the list they hide in');
  let ay = ny + 20;
  const bottom = py + ph - 12;
  if (data.attention.length === 0) {
    setFont(d, 9, 'normal', MUTED);
    d.text('Nothing blocked and nothing at risk.', nx + 12, ay + 4);
  }
  for (const r of data.attention) {
    if (ay + 30 > bottom) break;
    const col = STATE_COLOUR[r.state];
    const [wr, wg, wb] = wash(col, 0.06);
    d.setFillColor(wr, wg, wb); d.setDrawColor(LINE); d.setLineWidth(0.4);
    d.roundedRect(nx + 12, ay - 9, rw - 24, 26, 3, 3, 'FD');
    d.setFillColor(col); d.rect(nx + 12, ay - 9, 2.5, 26, 'F');

    setFont(d, 9, 'bold', INK);
    d.text(fit(d, san(r.title), rw - 130), nx + 21, ay);
    setFont(d, 7, 'bold', col);
    d.text(r.stateLabel.toUpperCase(), nx + rw - 24, ay, { align: 'right' });
    setFont(d, 7.4, 'normal', MUTED);
    d.text(fit(d, san([r.stream, r.line, r.owner, r.due && `wanted ${r.due}`]
      .filter(Boolean).join(' · ')), rw - 40), nx + 21, ay + 9);
    ay += 30;
  }
  const shown = Math.max(0, Math.floor((bottom - (ny + 20)) / 30));
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

    setFont(d, 7.8, 'bold', INK);
    d.text(fit(d, san(r.title), cTitle - 18), xTitle + 9, ry);
    setFont(d, 7.2, 'bold', col);
    d.text(fit(d, san(r.line || r.stateLabel), cLine - 8), xLine, ry);
    setFont(d, 7.2, 'normal', INK2);
    d.text(fit(d, san(r.target ?? '—'), cTarget - 8), xTarget, ry);
    setFont(d, 7.2, r.state === 'r' ? 'bold' : 'normal', r.state === 'r' ? DANGER : INK2);
    d.text(fit(d, san(r.result ?? '—'), cResult - 8), xResult, ry);
    setFont(d, 7.2, 'normal', MUTED);
    d.text(fit(d, san([r.owner, r.due].filter(Boolean).join(' · ') || '—'), cWho - 6), xWho, ry);
    ry += ROW_H;
  }

  foot(d, data, page, pages, sheet > 1 ? `every item (${sheet})` : 'every item');
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
  const pages = sheets.length;   // the first sheet IS page 1

  const top = drawStatus(d, data);
  sheets.forEach((rows, i) => {
    if (i > 0) d.addPage('a3', 'landscape');
    drawDetail(d, data, rows, i + 1, pages, i + 1, i === 0 ? top : M);
  });
}
