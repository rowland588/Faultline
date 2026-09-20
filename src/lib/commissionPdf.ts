/* THE HANDOVER SHEET — the A3 you send round, and hand over at sign-off.
 *
 * One job: somebody who was not on the line opens this and knows whether it can
 * be accepted, and if not, exactly what is stopping it. So page 1 answers that
 * question in the first two inches and the rest of the sheet is the evidence for
 * the answer — never the other way round.
 *
 * THIS IS NOT A STATUS REPORT. The first version of this file was: a readiness
 * percentage as the hero, workstreams down the side, quarterly progress. A
 * percentage is the easiest thing in the world to nod at, and a handover is not
 * a percentage — it is a yes or a no with a list attached. So the hero is the
 * VERDICT, the panel beside it is what stands in the way in the order it will be
 * said out loud, and the number is demoted to a bar underneath.
 *
 * EVERY WORD ON PAGE 1 COMES OUT OF readiness(). Nothing here re-derives a
 * verdict, re-counts a check or re-decides what blocks sign-off: the screen and
 * this sheet read the same function, so they cannot disagree in front of an OEM.
 * That is the whole reason the builder is separate from the drawer.
 *
 * Drawn from numbers, never from the DOM — same rule as the GM report. What is
 * on screen is a preview OF this, not the source of it.
 */
import {
  INK, INK2, MUTED, LINE, BRAND, OK, WARN, DANGER, BLUE,
  san, setFont, fit, panel, wash, type Doc,
} from './reportKit';
import type { CommissionKind, Counts, ReadyState } from './commissioning';

/** One picture, decoded and measured before the drawer ever runs.
 *
 *  Photographs somebody took and stills off the line walk arrive as the same
 *  thing, because on paper they do the same job — they are the thing itself. A
 *  walk still carries its snag's own words as `caption`, which is what makes it
 *  evidence rather than a picture of a machine. */
export interface Shot { data: string; w: number; h: number; caption?: string }

/** One record, flattened to what the sheet prints. Built by
 *  buildCommissionReport — nothing assembles one of these by hand. */
export interface HandoverRow {
  /** The machine this sits on. The sheet is grouped by it and the grouping is
   *  never broken mid-asset, because a machine split across two headings reads
   *  as two machines. */
  asset: string;
  kind: CommissionKind;
  /** 'Program' · 'Material' · 'Check' · 'Defect A' · 'Task'. The severity is part
   *  of the word, because "Defect" on its own says nothing about whether it
   *  stops the handover. */
  kindLabel: string;
  title: string;
  /** WHAT WAS AGREED, before the machine shipped: the rate, the quantity, the
   *  acceptance criterion, the grade. The left half of every argument. */
  agreed: string;
  /** WHAT ACTUALLY HAPPENED: the best witnessed run, what is on site, the test
   *  result, when the defect was closed. The right half. Printing them side by
   *  side is the entire point of the sheet — a result with nothing to measure it
   *  against is a number, and an agreed figure with no result is a hope. */
  evidence: string;
  who?: string;
  due?: string;
  state: ReadyState;
  /** The domain word, not the colour: 'Proven', 'Below rate', 'No program'. */
  stateLabel: string;
  /** Whether this row is one of the things stopping sign-off. Marked on the row
   *  as well as listed on page 1, so the detail sheet can be read on its own. */
  blocking?: boolean;
  /** How many runs a program has had. Two or more means it has been retested,
   *  which is the single most useful thing this sheet can say about it. */
  passes?: number;
  /** What it did the time BEFORE the current best, when there was one. */
  was?: string;
  /** Pictures of this item, already decoded to data URLs and measured. Resolved
   *  before the drawer runs, because jsPDF cannot wait for a blob and a report
   *  that renders its text now and its photographs later is a report with holes
   *  in it. */
  shots?: Shot[];
}

/** One machine's own verdict. A line is accepted one machine at a time and
 *  "the bagger is proven, the palletiser has not started" is the sentence a
 *  single project percentage cannot say. */
export interface HandoverAsset {
  name: string;
  canSignOff: boolean;
  blockers: number;
  /** 0–1. */
  pct: number;
  /** True for the line's own work rather than a machine on it. */
  isLine: boolean;
}

/** One cell on the band across the top of page 1.
 *
 *  It used to be a stage on a programme, drawn as beads on a thread. There are no
 *  stages any more, and the band now carries what the job is actually judged on:
 *  the date it was agreed for, the date it is now expected, and every material
 *  changeover with the price of it. A reader should see the shape of the job —
 *  and what is about to stop counting — before any of its detail. */
export interface ReportBand {
  label: string;
  value: string;
  /** The consequence, when there is one: '+8 days', '6 results stop counting'. */
  note?: string;
  state: 'good' | 'warn' | 'bad' | 'plain';
}

export interface HandoverReport {
  title: string;
  lead?: string;
  now: number;
  /** The dates and the changeovers. Empty when neither has been set — the sheet
   *  then prints about the claims alone. */
  band: ReportBand[];
  /** The verdict, straight off readiness(). Never recomputed here. */
  canSignOff: boolean;
  /** Worst first, in the words somebody would use in the meeting. */
  blockers: { what: string; asset?: string }[];
  /** One line summarising what the blockers are made of. */
  headline: string;
  /** Every count on the sheet. */
  counts: Counts;
  /** How far through, 0–1, and how many results were got on a withdrawn spec.
   *  Both come straight off standing() — this file never recomputes a verdict. */
  pct: number;
  stale: number;
  assets: HandoverAsset[];
  rows: HandoverRow[];
}

const STATE_COLOUR: Record<ReadyState, string> = {
  n: MUTED, w: BLUE, a: WARN, r: DANGER, g: OK,
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* HOW MUCH FITS, AND WHY PAGE 1 IS DIFFERENT.
 *
 * The detail starts on page 1, underneath the verdict, rather than on a sheet of
 * its own. The first cut of this report gave the verdict a whole A3 and the
 * result was two thirds of a sheet of white paper — which on a handover sheet is
 * not restraint, it is a page that failed to say anything with the room it had.
 * So page 1 carries the answer AND as much of the evidence as fits, and only
 * what is left over starts a second sheet.
 *
 * That means two capacities, not one. Both are worked from the geometry below
 * and both are used by the count and by the drawing, so the page numbers cannot
 * disagree with the pages — the fault that once stamped a four-page GM report
 * "page 2 of 3". */
const ROW_H = 13.5;
const GROUP_HEAD_H = 16;

/* The asset list goes two-up past this many. A line of seven machines is
   ordinary, and a single column of seven made the panels 250pt tall — which
   pushed the detail onto a second sheet that was then nine tenths white paper.
   Two short columns say the same thing in half the height. */
const ASSETS_ONE_COL = 5;
const ASSET_ROW_H = 22;
const PANEL_HEAD_H = 30;

/** How the detail splits: whole assets, never half of one, because a machine cut
 *  in two reads as two different machines to anybody skimming. A machine with
 *  more items than fit on a whole sheet is the one exception — it has to break.
 *
 *  THAT EXCEPTION USED TO BE A COMMENT AND NOT CODE. An oversized block was
 *  pushed onto the sheet whole, so sixty items on one machine produced a single
 *  sheet costing 826pt against a 200pt budget. The drawing loop stops at the
 *  page bottom rather than running off it, so the surplus was not drawn badly —
 *  it was not drawn at all, and nothing on the page said forty-six items were
 *  missing. A handover sheet that has quietly stopped listing most of a machine
 *  is worse than one that runs to three sheets. */
export function commissionSheets(
  rows: HandoverRow[], first: number, rest: number,
): HandoverRow[][] {
  const out: HandoverRow[][] = [];
  let cur: HandoverRow[] = [];
  let cap = first;
  let i = 0;
  const cost = (block: HandoverRow[]) => block.length * ROW_H + GROUP_HEAD_H;
  /** The most rows of one asset a sheet of this budget can actually draw. At
   *  least one, always: a budget too small for a single row would otherwise
   *  loop for ever emitting empty sheets. */
  const fitRows = (budget: number) => Math.max(1, Math.floor((budget - GROUP_HEAD_H) / ROW_H));
  let used = 0;

  while (i < rows.length) {
    const asset = rows[i].asset;
    const block: HandoverRow[] = [];
    while (i < rows.length && rows[i].asset === asset) { block.push(rows[i]); i++; }

    if (cur.length && used + cost(block) > cap) {
      out.push(cur); cur = []; used = 0; cap = rest;
    }

    // Still too big for a sheet of its own? Then it is the documented exception.
    // Break it into sheet-sized pieces; each piece redraws the asset heading,
    // because the drawing resets its heading tracker per sheet.
    if (cost(block) > cap) {
      let at = 0;
      while (at < block.length) {
        const room = cur.length ? cap - used : cap;
        const take = Math.min(fitRows(room), block.length - at);
        if (take <= 0) { out.push(cur); cur = []; used = 0; cap = rest; continue; }
        const piece = block.slice(at, at + take);
        cur.push(...piece);
        used += cost(piece);
        at += take;
        if (at < block.length) { out.push(cur); cur = []; used = 0; cap = rest; }
      }
      continue;
    }

    cur.push(...block);
    used += cost(block);
  }
  if (cur.length) out.push(cur);
  return out.length ? out : [[]];
}

/** How many rows down the asset list runs, once it has gone two-up. */
const assetRows = (n: number): number =>
  n <= ASSETS_ONE_COL ? n : Math.ceil(n / 2);

/** How tall the two panels need to be to hold what goes in them.
 *
 *  This mirrors the drawing below EXACTLY, and that is the whole point: the
 *  first cut guessed at it, guessed low, and the list panel quietly drew five of
 *  seven rows — a sheet that had silently stopped listing two parts of the job.
 *  Any panel that can truncate must either be sized to its contents or say out
 *  loud that it did not fit. This one is sized. */
function panelsHeight(data: HandoverReport): number {
  const assets = PANEL_HEAD_H + 22 + assetRows(Math.max(1, data.assets.length)) * ASSET_ROW_H + 8;
  /* +16 rather than +10: the drawing stops when the NEXT card would not clear
     the panel floor, so the height has to hold the last card plus that check.
     Two points short of it and the panel dropped a blocker it had room for and
     announced "+1 more" underneath the gap. */
  const blockers = PANEL_HEAD_H + 20 + Math.max(1, data.blockers.length) * 26 + 16;
  return Math.min(330, Math.max(126, Math.max(assets, blockers)));
}

/* ---------- page 1: the verdict, then as much of the evidence as fits ------- */
function drawVerdict(d: Doc, data: HandoverReport): number {
  const W = d.internal.pageSize.getWidth();
  const M = 26, CW = W - 2 * M;
  const r = data.counts;

  /* masthead */
  setFont(d, 8.5, 'bold', BRAND);
  d.text('COMMISSIONING · SIGN-OFF', M, M + 10);
  setFont(d, 26, 'bold', INK);
  d.text(fit(d, san(data.title), CW * 0.62), M, M + 38);
  setFont(d, 9, 'normal', MUTED);
  d.text(`Handover status as at ${fmtDate(data.now)}`, W - M, M + 14, { align: 'right' });
  if (data.lead) {
    setFont(d, 9, 'bold', INK2);
    d.text(san(data.lead), W - M, M + 28, { align: 'right' });
    setFont(d, 8, 'normal', MUTED);
    d.text('Commissioning lead', W - M, M + 39, { align: 'right' });
  }
  d.setDrawColor(BRAND); d.setLineWidth(1.6);
  d.line(M, M + 50, W - M, M + 50);

  /* THE VERDICT BAND.
   *
   * The left third is a stamp: READY, or the number of things in the way. It is
   * the only thing on the sheet set in 40pt, because it is the only thing on the
   * sheet that decides anything. The right two thirds say what that is made of,
   * and only then comes the percentage — demoted on purpose. */
  const topY = M + 66, topH = 96;
  const verdict = data.canSignOff ? OK : DANGER;
  d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
  d.roundedRect(M, topY, CW, topH, 6, 6, 'FD');
  d.setFillColor(verdict); d.rect(M, topY + 1, 4, topH - 2, 'F');

  const stampW = 168;
  if (data.canSignOff) {
    setFont(d, 34, 'bold', OK);
    d.text('READY', M + 26, topY + 50);
    setFont(d, 8.5, 'bold', MUTED);
    d.text('FOR SIGN-OFF', M + 26, topY + 68);
  } else {
    const n = data.blockers.length;
    setFont(d, 44, 'bold', DANGER);
    d.text(String(n), M + 26, topY + 54);
    const nw = d.getTextWidth(String(n));
    setFont(d, 13, 'bold', DANGER);
    d.text(n === 1 ? 'thing' : 'things', M + 26 + nw + 6, topY + 54);
    setFont(d, 8.5, 'bold', MUTED);
    d.text('IN THE WAY OF SIGN-OFF', M + 26, topY + 72);
  }
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(M + stampW, topY + 16, M + stampW, topY + topH - 16);

  const bx = M + stampW + 22, bw = CW - stampW - 22 - 26;
  setFont(d, 13, 'bold', INK);
  d.text(fit(d, san(data.headline), bw), bx, topY + 28);

  /* The bar, and the words that stop it being read as the answer. */
  const pct = Math.round(data.pct * 100);
  const barY = topY + 42;
  const barW = bw - 74;
  const [lr, lg, lb] = wash(MUTED, 0.22);
  d.setFillColor(lr, lg, lb);
  d.roundedRect(bx, barY, barW, 9, 4.5, 4.5, 'F');
  if (pct > 0) {
    d.setFillColor(data.canSignOff ? OK : BRAND);
    d.roundedRect(bx, barY, Math.max(6, (barW * pct) / 100), 9, 4.5, 4.5, 'F');
  }
  setFont(d, 9, 'bold', INK2);
  d.text(`${pct}% done`, bx + barW + 8, barY + 8);

  /* WHAT IS PROVEN, COUNTED PER KIND. Four numbers, each the answer to a
     question somebody actually asks: are the programs proven, is the material
     here, has it passed, what is still open. */
  const cy = topY + 72;
  const parts: [string, string, string][] = [
    ['PROGRAMS', `${r.programs.proven} of ${r.programs.total} proven`,
      r.programs.missing > 0 ? `${r.programs.missing} not written`
        : r.programs.stale > 0 ? `${r.programs.stale} need re-proving`
          : r.programs.below > 0 ? `${r.programs.below} short of rate` : ''],
    ['MATERIAL', `${r.materials.have} of ${r.materials.total} in`,
      r.materials.short + r.materials.late > 0 ? `${r.materials.short + r.materials.late} not landed` : ''],
    ['ACCEPTANCE', `${r.checks.pass} of ${r.checks.total} passed`,
      r.checks.fail > 0 ? `${r.checks.fail} failed` : r.checks.notRun > 0 ? `${r.checks.notRun} to run` : ''],
    ['PUNCH LIST', `${r.punch.openA}A · ${r.punch.openB}B · ${r.punch.openC}C open`,
      r.punch.closed > 0 ? `${r.punch.closed} closed` : ''],
  ];
  const colW = bw / parts.length;
  parts.forEach(([head, value, tail], i) => {
    const x = bx + i * colW;
    setFont(d, 6.6, 'bold', MUTED);
    d.text(head, x, cy);
    setFont(d, 9.2, 'bold', INK);
    d.text(fit(d, value, colW - 8), x, cy + 12);
    if (tail) {
      setFont(d, 7.2, 'bold', WARN);
      d.text(fit(d, tail, colW - 8), x, cy + 22);
    }
  });

  /* the two panels: the machines on the left, what stops sign-off on the right */
  /* THE PROGRAMME BAND. Where the job has got to, in time, across the sheet —
     the one thing the earlier version of this report could not say at all. A
     reader should see the shape of the job before any of its detail. */
  let py = topY + topH + 14;
  if (data.band.length) {
    const bh = 54;
    d.setDrawColor(LINE); d.setLineWidth(0.8); d.setFillColor('#ffffff');
    d.roundedRect(M, py, CW, bh, 6, 6, 'FD');
    const inner = CW - 28;
    const step = inner / data.band.length;
    data.band.forEach((c, i) => {
      const x = M + 14 + i * step;
      const colour = c.state === 'good' ? OK : c.state === 'warn' ? WARN : c.state === 'bad' ? DANGER : MUTED;
      // a rule between cells rather than a thread between beads: these are not
      // stages in a sequence and drawing them as one said they were
      if (i > 0) {
        d.setDrawColor(LINE); d.setLineWidth(0.8);
        d.line(x - 7, py + 10, x - 7, py + bh - 10);
      }
      setFont(d, 6.8, 'bold', MUTED);
      d.text(fit(d, san(c.label.toUpperCase()), step - 10), x, py + 17);
      setFont(d, 10.5, 'bold', c.state === 'plain' ? INK : colour);
      d.text(fit(d, san(c.value), step - 10), x, py + 33);
      if (c.note) {
        setFont(d, 7, 'bold', c.state === 'plain' ? MUTED : colour);
        d.text(fit(d, san(c.note), step - 10), x, py + 45);
      }
    });
    py += bh + 12;
  }

  const ph = panelsHeight(data);
  const gap = 14;
  const lw = CW * 0.34, rw = CW - lw - gap;

  const sy = panel(d, M, py, lw, ph, '1', 'Machine by machine',
    'each accepted in its own right');
  const cols = data.assets.length > ASSETS_ONE_COL ? 2 : 1;
  const colGap = 14;
  const aw = (lw - 24 - (cols - 1) * colGap) / cols;
  const perCol = assetRows(data.assets.length);
  if (data.assets.length === 0) {
    setFont(d, 9, 'normal', MUTED);
    d.text('Nothing recorded against any machine yet.', M + 12, sy + 22);
  }
  data.assets.forEach((a, i) => {
    const col = Math.floor(i / perCol);
    const ax = M + 12 + col * (aw + colGap);
    const ry = sy + 22 + (i % perCol) * ASSET_ROW_H;
    // The verdict is drawn first and the name fitted to what is LEFT, so a long
    // machine name shortens itself rather than running through the words.
    setFont(d, cols === 1 ? 8 : 7.2, 'bold', a.canSignOff ? OK : DANGER);
    const tail = a.canSignOff ? 'ready' : `${a.blockers} open`;
    const tw = d.getTextWidth(tail);
    d.text(tail, ax + aw, ry, { align: 'right' });
    setFont(d, cols === 1 ? 9.5 : 8.4, 'bold', a.isLine ? INK2 : INK);
    d.text(fit(d, san(a.name).toUpperCase(), aw - tw - 10), ax, ry);
    // the bar reads before the words do, which is the point of having one
    const y2 = ry + 5;
    const [br, bg, bb] = wash(MUTED, 0.2);
    d.setFillColor(br, bg, bb); d.roundedRect(ax, y2, aw, 4.5, 2.2, 2.2, 'F');
    if (a.pct > 0) {
      d.setFillColor(a.canSignOff ? OK : a.blockers > 0 ? WARN : BRAND);
      d.roundedRect(ax, y2, Math.max(3, aw * a.pct), 4.5, 2.2, 2.2, 'F');
    }
  });

  /* WHAT STANDS IN THE WAY — worst first, and in that order for a reason.
   *
   * This list is read from the top in a meeting and whatever is at the bottom
   * does not get said, so the order is the judgement: an open A defect outranks
   * a failed test, which outranks a program nobody has written, which outranks
   * one short of rate, then material, then what is merely untested. It is the
   * same order the screen shows, off the same function, because a sheet that
   * ranked them differently would start an argument about the sheet. */
  const nx = M + lw + gap;
  const ny = panel(d, nx, py, rw, ph, '2',
    data.canSignOff ? 'Nothing stands in the way' : 'What stands in the way',
    'worst first — the order it will be said in the room');
  let ay = ny + 20;
  const bottom = py + ph - 12;
  if (data.blockers.length === 0) {
    setFont(d, 9.5, 'bold', OK);
    d.text('Every program proven, every check passed, nothing open that blocks acceptance.', nx + 12, ay + 4);
    setFont(d, 8, 'normal', MUTED);
    d.text('This line can be signed off.', nx + 12, ay + 18);
  }

  let shown = 0;
  for (const b of data.blockers) {
    if (ay + 26 > bottom) break;
    const [wr, wg, wb] = wash(DANGER, 0.05);
    d.setFillColor(wr, wg, wb); d.setDrawColor(LINE); d.setLineWidth(0.4);
    d.roundedRect(nx + 12, ay - 9, rw - 24, 22, 3, 3, 'FD');
    d.setFillColor(DANGER); d.rect(nx + 12, ay - 9, 2.5, 22, 'F');
    setFont(d, 7.6, 'bold', MUTED);
    d.text(String(shown + 1), nx + 20, ay + 1);
    setFont(d, 9, 'bold', INK);
    const nw = rw - 24 - 20 - (b.asset ? 120 : 10);
    d.text(fit(d, san(b.what), nw), nx + 30, ay + 1);
    if (b.asset) {
      setFont(d, 7.4, 'bold', MUTED);
      d.text(fit(d, san(b.asset).toUpperCase(), 112), nx + rw - 24, ay + 1, { align: 'right' });
    }
    ay += 26;
    shown++;
  }
  if (data.blockers.length > shown) {
    setFont(d, 7.4, 'bold', MUTED);
    d.text(`+${data.blockers.length - shown} more, all listed below`, nx + 12, bottom + 4);
  }

  return py + ph + 16;
}

function foot(d: Doc, data: HandoverReport, page: number, pages: number, what: string): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${san(data.title)} · commissioning sign-off · page ${page} of ${pages} — ${what}`, (W - 56) * 0.8),
    26, H - 26 + 6);
  d.text(
    (data.canSignOff ? 'Ready for sign-off' : `${data.blockers.length} in the way`) +
    ` · ${Math.round(data.pct * 100)}% complete · generated ${fmtDate(data.now)}`,
    W - 26, H - 26 + 6, { align: 'right' },
  );
}

/* ---------- the detail sheets ---------- */
function drawDetail(
  d: Doc, data: HandoverReport, rows: HandoverRow[],
  page: number, pages: number, sheet: number, top: number,
): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const y0 = panel(d, M, top, CW, H - M - 14 - top, '3',
    'Every obligation' + (sheet > 1 ? ' (continued)' : ''),
    'what was agreed beside what was achieved, so the verdict can be checked rather than taken on trust');

  const x = M + 12, w = CW - 24;
  /* Column geometry as fractions, so a long OEM part number cannot push the
     owner off the edge of the sheet. */
  const cTitle = w * 0.27, cKind = w * 0.09, cAgreed = w * 0.16,
        cEvidence = w * 0.23, cState = w * 0.11, cWho = w * 0.14;
  const xTitle = x, xKind = xTitle + cTitle, xAgreed = xKind + cKind,
        xEvidence = xAgreed + cAgreed, xState = xEvidence + cEvidence, xWho = xState + cState;

  let ry = y0 + 20;
  setFont(d, 6.4, 'bold', MUTED);
  d.text('ITEM', xTitle, ry);
  d.text('WHAT', xKind, ry);
  d.text('AGREED', xAgreed, ry);
  d.text('EVIDENCE', xEvidence, ry);
  d.text('WHERE IT STANDS', xState, ry);
  d.text('WHO · WANTED BY', xWho, ry);
  d.setDrawColor(LINE); d.setLineWidth(0.8);
  d.line(x, ry + 4, x + w, ry + 4);
  ry += 15;

  const bottom = H - M - 14 - 22;
  let asset = '';
  for (const r of rows) {
    if (ry + ROW_H + 3 > bottom) break;
    if (r.asset !== asset) {
      asset = r.asset;
      if (ry + GROUP_HEAD_H + ROW_H > bottom) break;
      ry += 4;
      setFont(d, 8.5, 'bold', INK);
      d.text(san(asset).toUpperCase(), xTitle, ry);
      d.setDrawColor(LINE); d.setLineWidth(0.5);
      d.line(x, ry + 3.5, x + w, ry + 3.5);
      ry += GROUP_HEAD_H - 4;
    }
    const col = STATE_COLOUR[r.state];
    // A row that is stopping sign-off is washed, so the detail sheet can be read
    // on its own without cross-referencing page 1.
    if (r.blocking) {
      const [br, bg, bb] = wash(DANGER, 0.05);
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
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, san(r.kindLabel), cKind - 6), xKind, ry);
    setFont(d, 7.2, 'normal', INK2);
    d.text(fit(d, san(r.agreed || '—'), cAgreed - 8), xAgreed, ry);
    /* EVIDENCE, AND WHAT IT DID BEFORE. A retested program is the only place on
       this sheet that can show movement, and "76 ppm (was 61 ppm)" is an
       argument where "76 ppm" is a number. It costs no extra row: the earlier
       reading is drawn in the space the current one leaves. */
    setFont(d, 7.2, r.state === 'r' ? 'bold' : 'normal', r.state === 'r' ? DANGER : INK2);
    const nowTxt = fit(d, san(r.evidence || '—'), cEvidence - 8);
    d.text(nowTxt, xEvidence, ry);
    if (r.was) {
      const usedW = d.getTextWidth(nowTxt);
      const room = cEvidence - 12 - usedW;
      if (room > 34) {
        setFont(d, 6.4, 'normal', MUTED);
        d.text(fit(d, san(`was ${r.was}`), room), xEvidence + usedW + 5, ry);
      }
    }
    setFont(d, 7.2, 'bold', col);
    d.text(fit(d, san(r.stateLabel), cState - 8), xState, ry);
    setFont(d, 7.2, 'normal', MUTED);
    d.text(fit(d, san([r.who, r.due].filter(Boolean).join(' · ') || '—'), cWho - 6), xWho, ry);
    ry += ROW_H;
  }

  foot(d, data, page, pages, sheet > 1 ? `every obligation (${sheet})` : 'every obligation');
}

/* ---------- the evidence sheet ----------
 * Pictures get their own page rather than thumbnails wedged into a 13pt table
 * row, because a photograph too small to show the crease in the film is not
 * evidence, it is decoration. Captioned with the item and where it stands so the
 * picture and the claim it settles are never separated.
 *
 * Only items that HAVE pictures appear, and the sheet only exists when at least
 * one does — an empty "Evidence" page is worse than no page. */
/** Columns chosen by how many pictures there are, not fixed.
 *
 *  Four columns is right for a dozen photographs and wrong for three — it makes
 *  each one a stamp on an otherwise empty A3, which is the same failure the
 *  verdict page had before the detail moved up under it. Few pictures means big
 *  pictures; that is the entire reason they are on paper at all. */
const shotCols = (n: number): number => (n <= 2 ? 2 : n <= 6 ? 3 : 4);

function drawEvidence(
  d: Doc, data: HandoverReport,
  shots: { row: HandoverRow; shot: Shot }[],
  page: number, pages: number,
): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const y0 = panel(d, M, M, CW, H - 2 * M - 14, '4', 'Pictures',
    'the thing itself — captioned with the obligation it settles');

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
       against. Both then name the machine, so a picture lifted off the page
       still knows where it came from. */
    setFont(d, 6.6, 'bold', col2);
    d.text(fit(d, san(s.shot.caption
      ? `${s.shot.caption} — ${s.row.asset}`
      : `${s.row.asset} · ${s.row.stateLabel}`), cellW), x, y + boxH + 20);
  });

  const fits = Math.max(0, Math.floor((bottom - (y0 + 18)) / (cellH + gap))) * SHOT_COLS;
  if (shots.length > fits) {
    setFont(d, 7, 'bold', MUTED);
    d.text(`+${shots.length - fits} more pictures in the app`, M + 12, bottom + 8);
  }

  foot(d, data, page, pages, 'pictures');
}

export function drawCommissionReport(d: Doc, data: HandoverReport): void {
  const H = d.internal.pageSize.getHeight();
  const M = 26;
  /* Both capacities from the same geometry the drawing uses. The verdict band is
     a fixed height, so what page 1 has left for detail is simply what is under
     it — and page 2 onward has the whole sheet. */
  const detailTop = M + 66 + 96 + 14 + (data.band.length ? 54 + 12 : 0) + panelsHeight(data) + 16;
  const roomFor = (top: number) => (H - M - 14 - 22) - (top + 30 + 20);
  const first = roomFor(detailTop);
  const rest = roomFor(M);

  const sheets = commissionSheets(data.rows, first, rest);
  const shots = data.rows.flatMap(row => (row.shots ?? []).map(shot => ({ row, shot })));
  const pages = sheets.length + (shots.length > 0 ? 1 : 0);

  const top = drawVerdict(d, data);
  sheets.forEach((rows, i) => {
    if (i > 0) d.addPage('a3', 'landscape');
    drawDetail(d, data, rows, i + 1, pages, i + 1, i === 0 ? top : M);
  });
  if (shots.length > 0) {
    d.addPage('a3', 'landscape');
    drawEvidence(d, data, shots, pages, pages);
  }
}
