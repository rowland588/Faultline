/* THE TRIALS, AS CARDS — the client report's test cards, a card each, packed
 * into columns across the sheets (docs/STEADY.md, S4). */
import {
  INK, INK2, MUTED, LINE, BRAND, OK, WARN, DANGER, BLUE,
  san, setFont, fit, panel, wash, type Doc
} from '../reportKit';
import { strandWord, type Strand, type StrandFix } from '../strands';
import type { PaceReportData } from './data';

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

/* ======================= WHAT WE ARE PROVING, AS A STORY =====================
 *
 * Rowland, looking at the finished report: "when I look at the PDF I see just
 * loads of things on it. What we really should say is — this is the trial that
 * took place, these are the things that are connected to that trial, because
 * there can be multiple trials. We need to show the STORY, not just
 * information. This is a presentation to the client. It must be of high quality
 * and make complete sense to them."
 *
 * THE UNIT OF THIS REPORT WAS THE WRONG ONE. It was a TEST — one card each,
 * four labelled lines, laid out in a grid. Six of those side by side is six
 * islands, and the reader is left to work out that the third one is the
 * re-test of the first, after the fix in the second. Everything needed to say
 * so was in the data and none of it was drawn.
 *
 * So the unit is now a STRAND: one thing the job set out to prove, and every
 * attempt at it. A test that failed, the fix that came out of it, and the
 * re-test booked behind that are ONE story with three steps — not three
 * records. That is what "there can be multiple trials" means, and it is the
 * difference between a list and a presentation.
 *
 * A strand reads top to bottom the way the work happened:
 *
 *     SEAL INTEGRITY — FINEST RED 2KG                        NOT YET PROVED
 *     Ilapak flow wrapper · with Ilapak UK · 2 attempts
 *     To prove   0 leaks in 20 packs, tested off the running machine
 *       1  21 Sep   Ran   3 leaked in 20. Held 61 ppm while it ran.  DIDN'T PASS
 *                         turned up 3 things · 2 still to decide
 *       ·  24 Sep   Fix   Re-cut the jaw profile                     DONE
 *       2  28 Sep   Test  Booked
 *     Still owed   Re-cut the jaw profile · Ilapak UK · by 26 Sep
 *
 * GROUPED BY ID, NOT BY NAME. `follows` and `ledTo` carry the neighbours'
 * titles, which is enough to print a line about them and not enough to group
 * by: two re-tests of one thing share a title, and two machines running the
 * same program share one as well.
 */

type TrialRow = NonNullable<PaceReportData['trials']>['rows'][number];

/* ---------- A TEST'S CARD ----------
 *
 * Rowland: "the pdf is still messy on the first page." A client review of it
 * found why: two vocabularies of status word on every card, contradicting each
 * other; a STILL OWED block repeating the rows above it, the card's own name
 * included; six marks per row at 6 to 6.5pt; rows out of date order; a fix
 * card among the tests; and holes wherever a short card sat beside a long one.
 *
 * So a card answers three questions and nothing else, in this order:
 *
 *     Seal integrity — Finest Red 2kg                          [ FAILED ]
 *     Ilapak flow wrapper · with Ilapak UK
 *     Passes if: zero leaks in twenty packs, tested off the running machine.
 *     21 Sept   FAILED       3 of 20 leaked — jaw ran 4°C cold at the edge.
 *     Fix       DONE         Re-cut the jaw profile · Ilapak UK · 24 Sept
 *     ──────────────────────────────────────────────────────────────────────
 *     Next                   Re-test · Ilapak UK · by 29 Sept
 *
 * What it has to do, what happened, what happens next and who owes it. One
 * status word on the badge — the latest result — and nothing below 7.5pt.
 * Every debt in full is page 3's; this card says the one thing next.
 */

const C_PAD = 14;            // inside the card
export const C_GAP = 12;            // between cards
const C_LEAD = 11.5;         // one line of body text
const C_ROW_GAP = 3;
const C_COL1 = 46;           // the date, or "Fix", or "Next"
const C_COL2 = 60;           // the result word
const C_HEAD = 42;           // name, machine line, rule
const C_SHOT = 46;           // a picture's height; four across at most
const C_SHOTS = 4;

interface CardRow { c1: string; c2: string; tone: string; lines: string[]; bold: boolean; h: number }
interface StrandPlan {
  s: Strand; tone: string; meta: string; proves: string[];
  rows: CardRow[]; next?: CardRow; h: number;
}

const strandTone = (st: Strand): string =>
  st.state === 'proved' ? OK : st.state === 'failed' ? DANGER
    : st.state === 'noVerdict' ? WARN : st.late ? DANGER : BLUE;

const runTone = (o: TrialRow['outcome']): string =>
  o === 'passed' ? OK : o === 'failed' ? DANGER : o === 'notRun' ? DANGER : WARN;

const FIX_TONE: Record<StrandFix['tone'], string> = {
  done: OK, failed: DANGER, waiting: WARN, late: DANGER, due: INK2,
};

/** Everything the card puts on the page, wrapped, and therefore its height.
 *  Measure and draw read this one list. */
export function planStrand(d: Doc, s: Strand, w: number): StrandPlan {
  const textW = w - 2 * C_PAD - C_COL1 - C_COL2;
  const wrap = (text: string, width: number, bold: boolean, max: number): string[] => {
    setFont(d, 8.5, bold ? 'bold' : 'normal', INK);
    const all = d.splitTextToSize(san(text), width) as string[];
    if (all.length <= max) return all.length ? all : [''];
    const cut = all.slice(0, max);
    cut[max - 1] = fit(d, `${cut[max - 1]} ${all[max] ?? ''}`, width);
    return cut;
  };
  const row = (c1: string, c2: string, tone: string, text: string, bold: boolean, max: number): CardRow => {
    const lines = wrap(text, textW, bold, max);
    return { c1, c2, tone, lines, bold, h: lines.length * C_LEAD + C_ROW_GAP };
  };

  setFont(d, 8.5, 'bold', INK);
  const labelW = d.getTextWidth('Passes if: ');
  const proves = wrap(s.provesIf || 'nothing agreed in advance', w - 2 * C_PAD - labelW, false, 2);

  /* A card is never taller than a sheet: the last four attempts in full, the
     earlier ones counted. Four is the most a client reads before asking why. */
  const MAX_RUNS = 4;
  const runs = s.runs.length > MAX_RUNS ? s.runs.slice(-MAX_RUNS) : s.runs;
  const earlier = s.runs.length - runs.length;
  const rows: CardRow[] = [
    ...(earlier ? [row('', '', MUTED, `${earlier} earlier attempt${earlier === 1 ? '' : 's'} — the app has them all`, false, 1)] : []),
    ...runs.map(r => row(r.when || '—', r.word, runTone(r.outcome), r.reason || '—', false, 2)),
    ...s.fixes.slice(0, 3).map(f => row('Fix', f.word, FIX_TONE[f.tone],
      [f.what, f.who || 'nobody yet', f.when].filter(Boolean).join(' · '), false, 2)),
  ];
  if (s.fixes.length > 3) rows.push(row('', '', MUTED, `+${s.fixes.length - 3} more fixes — see who owes what`, false, 1));

  const next = s.next
    ? row('Next', s.next.late ? 'LATE' : '', s.next.late ? DANGER : INK,
      [s.next.what, s.next.who || 'nobody yet', s.next.when].filter(Boolean).join(' · '), true, 2)
    : undefined;

  /* THE PICTURES, on the card. Rowland: "yes, add the photos." Four at most,
     a row's height, under the attempts — the guard on the shelf, the leak in
     the seal, on the page the client reads rather than on a card they have
     to ask for. */
  /* THE ROW IS KEPT FOR PICTURES THE RECORD HAS, not for the ones this
     device could decode. Sized off the decoded ones, a card was taller in the
     download than in the page count the preview reads — the pictures are
     fetched only when the file is built — and a clip with no poster made a
     card shorter on one phone than another. */
  const shots = s.shots.slice(0, C_SHOTS);
  const h = C_PAD + C_HEAD + proves.length * C_LEAD + 6
    + rows.reduce((a, r) => a + r.h, 0)
    + (shots.length || s.photos > 0 ? 4 + C_SHOT + 4 : 0)
    + (next ? 8 + next.h : 0) + C_PAD - 4;

  return {
    s, tone: strandTone(s), proves, rows, next, h,
    meta: [s.machine, s.withWhom && `with ${s.withWhom}`].filter(Boolean).join('  ·  '),
  };
}

function drawStrand(d: Doc, p: StrandPlan, x: number, y: number, w: number): void {
  d.setDrawColor(LINE); d.setLineWidth(0.7);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, p.h, 5, 5, 'FD');
  d.setFillColor(p.tone);
  d.roundedRect(x, y, 4, p.h, 2, 2, 'F');

  /* The latest result, top right — the one thing somebody looks for first. */
  const word = strandWord(p.s);
  setFont(d, 7.5, 'bold', p.tone);
  const pw = d.getTextWidth(word) + 16;
  d.setFillColor(...wash(p.tone, 0.14));
  d.roundedRect(x + w - C_PAD - pw, y + C_PAD - 3, pw, 16, 8, 8, 'F');
  d.text(word, x + w - C_PAD - pw / 2, y + C_PAD + 8, { align: 'center' });

  const lx = x + C_PAD;
  setFont(d, 11.5, 'bold', INK);
  d.text(fit(d, san(p.s.name), w - 2 * C_PAD - pw - 10), lx, y + C_PAD + 9);
  setFont(d, 7.5, 'normal', MUTED);
  d.text(fit(d, san(p.meta), w - 2 * C_PAD), lx, y + C_PAD + 22);
  d.setDrawColor(LINE); d.setLineWidth(0.5);
  d.line(lx, y + C_PAD + 29, x + w - C_PAD, y + C_PAD + 29);

  /* What it has to do. */
  let cy = y + C_PAD + C_HEAD;
  setFont(d, 8.5, 'bold', INK2);
  d.text('Passes if:', lx, cy);
  const labelW = d.getTextWidth('Passes if: ');
  setFont(d, 8.5, 'normal', p.s.provesIf ? INK2 : MUTED);
  p.proves.forEach((l, i) => d.text(l, lx + labelW, cy + i * C_LEAD));
  cy += p.proves.length * C_LEAD + 6;

  const drawRow = (r: CardRow) => {
    setFont(d, 7.5, 'bold', r.c1 === 'Fix' || r.c1 === 'Next' ? INK : MUTED);
    d.text(r.c1, lx, cy);
    if (r.c2) {
      setFont(d, 7.5, 'bold', r.tone);
      d.text(fit(d, r.c2, C_COL2 - 6), lx + C_COL1, cy);
    }
    setFont(d, 8.5, r.bold ? 'bold' : 'normal', r.c1 === 'Next' ? r.tone : INK);
    r.lines.forEach((l, i) => d.text(l, lx + C_COL1 + C_COL2, cy + i * C_LEAD));
    cy += r.h;
  };
  p.rows.forEach(drawRow);

  if (!p.s.shots.length && p.s.photos > 0) {
    setFont(d, 7.5, 'normal', MUTED);
    d.text(`${p.s.photos} picture${p.s.photos === 1 ? '' : 's'} in the app`, lx, cy + C_SHOT / 2);
    cy += 4 + C_SHOT + 4;
  } else if (p.s.shots.length) {
    let sx = lx;
    const top = cy - 4;
    for (const sh of p.s.shots.slice(0, C_SHOTS)) {
      const sw = Math.min(82, (sh.w / sh.h) * C_SHOT);
      if (sx + sw > x + w - C_PAD) break;
      try { d.addImage(sh.data, 'JPEG', sx, top, sw, C_SHOT); } catch { /* a bad frame must not cost the words */ }
      sx += sw + 5;
    }
    if (p.s.photos > p.s.shots.length || p.s.shots.length > C_SHOTS) {
      setFont(d, 7, 'normal', MUTED);
      d.text(`+${p.s.photos - Math.min(p.s.shots.length, C_SHOTS)} more in the app`, sx + 2, top + C_SHOT - 2);
    }
    cy += 4 + C_SHOT + 4;
  }

  /* The one thing next, under a hairline. */
  if (p.next) {
    cy += 2;
    d.setDrawColor(LINE); d.setLineWidth(0.5);
    d.line(lx, cy - 7, x + w - C_PAD, cy - 7);
    cy += 6;
    drawRow(p.next);
  }
}

/* ---------- WHERE THE CARDS FALL ----------
 *
 * Each column stacks on its own: a card goes into whichever column is shorter,
 * so a short card beside a long one leaves no hole — the old grid padded every
 * pair to the taller of the two. A card that fits in no column on this sheet
 * starts the next. Pure, drawing nothing, so the footer's "page 2 of 5" can be
 * right before anything is drawn. */
export function packColumns(heights: number[], cols: number, frontRoom: number, sheetRoom: number):
  { at: { sheet: number; col: number; y: number }[]; sheets: number; front: number; used: number[] } {
  const at: { sheet: number; col: number; y: number }[] = [];
  /* EVERY SHEET STAYS OPEN. A card that did not fit used to close the sheet,
     and every card after it went behind — so a job with 28 tests printed a
     front page that stopped a third of the way down and three more sheets
     each half white, because one tall card in the wrong place ended each of
     them. A card goes on the FIRST sheet with a column that has room for it,
     in the shortest such column; late-first order still leads, and the holes
     get the cards that fit them. */
  const sheets: number[][] = [Array<number>(cols).fill(0)];
  for (const h of heights) {
    let placed = false;
    for (let s = 0; s < sheets.length && !placed; s++) {
      const used = sheets[s];
      const room = s === 0 ? frontRoom : sheetRoom;
      let col = -1;
      used.forEach((u, c) => {
        if ((u === 0 || u + h <= room) && (col < 0 || u < used[col])) col = c;
      });
      if (col >= 0) { at.push({ sheet: s, col, y: used[col] }); used[col] += h + C_GAP; placed = true; }
    }
    if (!placed) {
      sheets.push(Array<number>(cols).fill(0));
      const s = sheets.length - 1;
      at.push({ sheet: s, col: 0, y: 0 });
      sheets[s][0] = h + C_GAP;
    }
  }
  /* How far down each sheet the cards reach — so whatever comes next in the
     report can ride on the last sheet's tail rather than open a new one. */
  const used = sheets.map(u => Math.max(0, Math.max(...u) - C_GAP));
  return { at, sheets: sheets.length, front: used[0], used };
}

/** One column when there are few enough that the width is better spent on the
 *  story than on a second card beside it. */
export const columnsFor = (n: number): number => (n <= 3 ? 1 : 2);

export interface Split {
  plans: StrandPlan[]; strands: Strand[]; cols: number; cw: number;
  layout: ReturnType<typeof packColumns>; panelH: number;
}

/** Draw the cards that landed on `sheet`. */
function drawSheetCards(d: Doc, split: Split, sheet: number, x: number, y: number): void {
  split.plans.forEach((p, i) => {
    const at = split.layout.at[i];
    if (at.sheet !== sheet) return;
    drawStrand(d, p, x + at.col * (split.cw + C_GAP), y + at.y, split.cw);
  });
}

/** The cards on the front page. Returns how many did NOT fit. */
export function trialsPanel(d: Doc, data: PaceReportData, M: number, top0: number, CW: number, panelH: number,
  split: Split): number {
  const t = data.trials;
  /* No summary line in the heading: the tiles above say the same thing, and
     said it in different words. */
  const top = panel(d, M, top0, CW, panelH, '1', 'What we are proving', '');

  if (!t || split.strands.length === 0) {
    setFont(d, 8.5, 'normal', MUTED);
    d.text('No test has been planned on this project yet.', M + 14, top + 22);
    return 0;
  }
  drawSheetCards(d, split, 0, M + 14, top + 14);
  return split.layout.at.filter(a => a.sheet > 0).length;
}

/** The rest of them, a sheet each until there are none left. */
export function trialsSheet(d: Doc, data: PaceReportData, sheet: number, sheets: number,
  page: number, pages: number, split: Split, tail = 'what we are proving'): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const idx = split.layout.at.map((a, i) => (a.sheet === sheet ? i : -1)).filter(i => i >= 0);

  setFont(d, 8, 'bold', BRAND);
  d.text('WHAT WE ARE PROVING — CONTINUED', M, M + 8);
  setFont(d, 18, 'bold', INK);
  d.text(fit(d, `${data.title}`, CW * 0.7), M, M + 30);
  setFont(d, 8.5, 'normal', INK2);
  d.text(`${(idx[0] ?? 0) + 1} to ${(idx[idx.length - 1] ?? 0) + 1} of ${split.strands.length}${sheets > 1 ? ` · sheet ${sheet} of ${sheets}` : ''}`, M, M + 44);
  d.setDrawColor(INK); d.setLineWidth(1.2);
  d.line(M, M + 52, W - M, M + 52);

  drawSheetCards(d, split, sheet, M, M + 66);

  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — ${tail}`, CW * 0.8), M, H - M + 6);
}
