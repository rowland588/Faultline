/* THE TRIAL CARD — one day on the line, whole, on a page you can send.
 *
 * Rowland: "A client report usually consists of an overview — what's happened
 * today. Is this possibly like a trial card? Another PDF report that I can send
 * out to show all the finite detail, because there's a lot of detail that you
 * pick up. And then what happens is, we take out the fundamentals, the things
 * that are important, and present that on the client report."
 *
 * That is the split, and it is the right one. TWO DOCUMENTS, TWO ROOMS:
 *
 *   THE TRIAL CARD   one trial, everything. Sent to the people who were there,
 *                    or should have been: the OEM, the engineers, the shift.
 *                    It has to stand on its own with nobody to explain it.
 *   THE CLIENT REPORT    the whole job, and out of each trial only the four lines a
 *                    client acts on — the expectation, what happened against it,
 *                    what it turned up, and what happens next.
 *
 * A4 LANDSCAPE, not A3. The client report is A3 because it is read on a table with
 * people standing round it. This is read on a phone in a car park and forwarded
 * from there, and A3 on a phone is a document nobody opens twice.
 *
 * IT PAGINATES RATHER THAN TRUNCATES. A day that turned up twenty observations
 * is exactly the day somebody needs all twenty of; "+14 more than fit this
 * sheet" on the document whose entire job is the detail would be absurd.
 */
import {
  ACCENT, BLUE, BRAND, DANGER, INK, INK2, LINE, MUTED, OK, WARN,
  SHELL_MUTED, drawMark, fit, nameFont, san, setFont, wash, type Doc,
} from './reportKit';
import { verdictLine, type TrialCard } from './trialCard';
import type { Shot } from './testReport';
import { foundWords, wordsOf } from './testing';
import { niceDay, todayISO } from './weeks';

const M = 30;                       // the margin, A4 landscape
const nice = (iso?: string): string => niceDay(iso, { year: true });

/** "5 Jan" or "5 – 9 Jan". A window prints as a window on the page the client
 *  reads, because "planned for 5 Jan" on a job booked for that whole week is
 *  the sort of small wrongness that gets argued about in a meeting. */
const span = (from?: string, to?: string): string => {
  if (!from) return '';
  if (!to || to <= from) return nice(from);
  return `${nice(from)} \u2013 ${nice(to)}`;
};

/* Planned is still ahead — indigo. It was the brand blue, which the colour
   rules keep for what you press, never a state. */
const toneOf = (o: TrialCard['outcome']): string =>
  o === 'passed' ? OK : o === 'failed' ? DANGER : o === 'notRun' ? WARN : BLUE;

export interface TrialCardMeta {
  project: string;
  /** Who it is from, printed under the mark. */
  lead?: string;
  builtAt: number;
  /** The pictures, already decoded — the card is drawn synchronously and the
   *  pictures come off the device's store, so the screen fetches them first.
   *  The test's own first, then the ones on what was found. */
  shots?: Shot[];
}

/* ---------- the pieces ---------- */

/** The band across the top of every page. Carries the trial's name on page one
 *  and a continuation line after that, because a second sheet that does not say
 *  what it belongs to gets separated from the first one within a day. */
/* THE BAND GROWS WITH THE TITLE. A long title ended "…" at a fixed width —
   on the sheet whose whole job is the detail (docs/REPORTS.md: nothing is cut). */
function titleLines(d: Doc, c: TrialCard, W: number): { title: string[]; line: string[] } {
  setFont(d, 16, 'bold', '#ffffff');
  const title = d.splitTextToSize(san(c.title), W - 2 * M - 150) as string[];
  const machine = [c.machine, c.withWhom && `with ${c.withWhom}`, nice(c.ranOn ?? c.plannedFor)].filter(Boolean).join('  ·  ');
  setFont(d, 8.5, 'normal', SHELL_MUTED);
  const line = d.splitTextToSize(san(machine), W - 2 * M - 150) as string[];
  return { title, line };
}

function head(d: Doc, c: TrialCard, meta: TrialCardMeta, page: number): number {
  const W = d.internal.pageSize.getWidth();
  const tl = titleLines(d, c, W);
  const bandH = page === 1 ? 74 + (tl.title.length - 1) * 19 + (tl.line.length - 1) * 11 : 44;
  d.setFillColor(INK);
  d.rect(0, 0, W, bandH, 'F');

  /* The band's small type in the shell's muted blues (a green left over from
     an older palette), and the Faultline mark top right in the band — the
     corner stamp other documents carry would sit on the dark. "Built" moves
     beside the project, where it reads as part of the line it belongs to. */
  setFont(d, 7, 'bold', SHELL_MUTED);
  const kicker = `${wordsOf(c).one.toUpperCase()} CARD`;
  d.text(kicker, M, 20);
  // Placed after the kicker, not at a fixed 58pt: "INSTALL STEP CARD" ran into the project name.
  const after = M + d.getTextWidth(kicker) + 14;
  setFont(d, 7, 'normal', SHELL_MUTED);
  const built = `Built ${new Date(meta.builtAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  d.text(fit(d, san(`${meta.project}  ·  ${built}`), W / 2), after, 20);

  nameFont(d, 8, '#ffffff');
  const brand = 'Faultline', bw = d.getTextWidth(brand);
  d.text(brand, W - M, 20, { align: 'right' });
  drawMark(d, W - M - bw - 15, 11.5, 11);

  if (page === 1) {
    setFont(d, 16, 'bold', '#ffffff');
    d.text(tl.title, M, 44, { lineHeightFactor: 19 / 16 });
    const lineY = 60 + (tl.title.length - 1) * 19;
    setFont(d, 8.5, 'normal', SHELL_MUTED);
    d.text(tl.line, M, lineY, { lineHeightFactor: 11 / 8.5 });

    /* The verdict, as a pill, top right — the one thing somebody looks for
       before they read a word of it. */
    const word = c.outcomeWord.toUpperCase();
    setFont(d, 9, 'bold', '#ffffff');
    const tw = d.getTextWidth(word);
    d.setFillColor(toneOf(c.outcome));
    d.roundedRect(W - M - tw - 26, 34, tw + 26, 22, 11, 11, 'F');
    d.text(word, W - M - 13, 48.5, { align: 'right' });
    return bandH;
  }

  setFont(d, 9, 'bold', '#ffffff');
  d.text(fit(d, `${san(c.title)} — continued`, W - 2 * M), M, 32);
  return 44;
}

function foot(d: Doc, page: number, pages: number, meta: TrialCardMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 6.5, 'normal', MUTED);
  d.text(san(meta.lead ? `${meta.project} · ${meta.lead}` : meta.project), M, H - 14);
  d.text(`${page} of ${pages}`, W - M, H - 14, { align: 'right' });
}

/** The lines a field will put on the page. Height and drawing both come off
 *  this, so the box cannot be sized by one arithmetic and filled by another. */
function fieldLines(d: Doc, w: number, text: string, size: number, empty: string): string[] {
  setFont(d, size, 'normal', INK);
  /* No cap. It stopped at six lines — "Passes if" ended mid-sentence on the
     card a client signs against. The boxes grow instead (drawTrialCard). */
  return d.splitTextToSize(san(text).trim() || empty, w) as string[];
}

/** How tall a field will be, without drawing it. */
const fieldHeight = (d: Doc, w: number, text: string, opts: { size?: number; empty?: string } = {}): number => {
  const size = opts.size ?? 9.5;
  return 12 + fieldLines(d, w, text, size, opts.empty ?? '—').length * (size + 2.5);
};

/** A labelled block of prose. Returns the y it finished at, so the caller can
 *  stack them without arithmetic of its own. */
function field(d: Doc, x: number, y: number, w: number, label: string, text: string, opts: {
  colour?: string; size?: number; empty?: string;
} = {}): number {
  setFont(d, 6.5, 'bold', MUTED);
  d.text(label.toUpperCase(), x, y);
  const body = san(text).trim();
  const size = opts.size ?? 9.5;
  const lines = fieldLines(d, w, text, size, opts.empty ?? '—');
  setFont(d, size, 'normal', body ? (opts.colour ?? INK) : MUTED);
  lines.forEach((l, i) => d.text(l, x, y + 12 + i * (size + 2.5)));
  return y + 12 + lines.length * (size + 2.5);
}

/** A bordered box with a heading — the card's own section frame. */
function box(d: Doc, x: number, y: number, w: number, h: number, n: string, title: string, sub?: string): number {
  d.setDrawColor(LINE); d.setLineWidth(0.7);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 5, 5, 'FD');

  d.setFillColor(INK);
  d.circle(x + 17, y + 15, 7, 'F');
  setFont(d, 7, 'bold', '#ffffff');
  d.text(n, x + 17, y + 17.5, { align: 'center' });

  setFont(d, 10, 'bold', INK);
  const shown = fit(d, title, w - 34 - 12);
  d.text(shown, x + 29, y + 18.5);
  if (sub) {
    const end = x + 29 + d.getTextWidth(shown) + 10;
    const room = (x + w - 12) - end;
    if (room > 40) {
      setFont(d, 7.5, 'normal', MUTED);
      d.text(fit(d, sub, room), x + w - 12, y + 18, { align: 'right' });
    }
  }
  d.setDrawColor(LINE); d.setLineWidth(0.5);
  d.line(x + 10, y + 25, x + w - 10, y + 25);
  return y + 25;
}

/* ---------- the pages ---------- */

/** THE LOOP, on one strip: what this followed, and what came out of it. The
 *  thing that was missing — "not any sort of loop, to show the structure". */
function loopStrip(d: Doc, c: TrialCard, x: number, y: number, w: number): number {
  if (!c.follows && c.ledTo.length === 0) return y;
  const bits: string[] = [];
  if (c.follows) bits.push(`follows "${san(c.follows)}"`);
  if (c.ledTo.length) bits.push(`led to ${c.ledTo.map(t => `"${san(t)}"`).join(', ')}`);
  // Wraps and grows: every record it led to is named, not the first few and "…".
  setFont(d, 8.5, 'normal', INK2);
  const lines = d.splitTextToSize(bits.join('   ·   '), w - 24) as string[];
  const h = 16 + lines.length * 11;
  d.setFillColor(...wash(BRAND, 0.07));
  d.roundedRect(x, y, w, h, 5, 5, 'F');
  setFont(d, 6.5, 'bold', ACCENT);
  d.text('WHERE THIS SITS', x + 12, y + 11);
  setFont(d, 8.5, 'normal', INK2);
  d.text(lines, x + 12, y + 21, { lineHeightFactor: 11 / 8.5 });
  return y + h + 10;
}

/* ---------- how tall a block WANTS to be ----------
 *
 * "I think we could be a bit smarter with size, but I'm unsure."
 *
 * The first version gave every box the rest of the page, so a trial with three
 * observations printed a full sheet of white under them and pushed what we do
 * next onto a page of its own. Both blocks now measure themselves first and
 * take only the room they need, which is also why they usually share one page:
 * a one-page card gets read on a phone, a two-page one gets scrolled past.
 *
 * splitTextToSize is pure, so measuring costs nothing and cannot disagree with
 * the drawing — both ask the same question of the same document. */

/* NOTHING ON THIS CARD IS CUT SHORT.
 *
 * Both of these used to cap at three lines and two, while the row they measured
 * was as tall as the FULL wrap — so a long observation got the room for four
 * lines, had three of them drawn, and ended mid-sentence with no ellipsis to
 * say so. Two wrongs at once: white where the fourth line should have been, and
 * a sentence that looked finished and was not.
 *
 * The cap is gone rather than the ellipsis added, because of what this document
 * is: the client report prints the fundamentals and may fairly shorten them,
 * this one prints everything and paginates. "…" on the sheet whose entire job
 * is the detail would be absurd. */
/** A finding's row: its wrapped words, and a second line when it was filmed.
 *  "1 filmed" is drawn 24pt down the row, so a one-line observation with a
 *  photo needs 30pt — at 18 the count printed through the rule and into the
 *  row below it on the client's copy. One arithmetic for measuring and
 *  drawing, so the table cannot be sized by one and filled by another. */
export const findingRowHeight = (lines: number, photos: number): number =>
  Math.max(photos ? 30 : 18, 8 + lines * 11);

/* EVERY CELL WRAPS, AND THE ROW IS AS TALL AS ITS TALLEST. "Whose", "what it
   became" and "where it came from" were cut to their column with "…"; one
   function lays a row out for both measuring and drawing. */
const FIND_COLS = [0.5, 0.17, 0.33];
function findingCells(d: Doc, f: TrialCard['findings'][number], w: number) {
  const lines = (t: string, col: number, size: number, style: 'normal' | 'bold' = 'normal') => {
    setFont(d, size, style, INK); return d.splitTextToSize(t, FIND_COLS[col] * w - 10) as string[];
  };
  const became = f.action ? san(f.action) : f.decision ? f.decision.charAt(0).toUpperCase() + f.decision.slice(1) : '—';
  const what = lines(san(f.what), 0, 8.5), owner = lines(san(f.owner ?? '—'), 1, 8), act = lines(became, 2, 8, f.action ? 'normal' : 'bold');
  const ownerH = owner.length * 11 + (f.photos ? 11 : 0);
  return { what, owner, act, h: Math.max(findingRowHeight(what.length, f.photos), 8 + ownerH, 8 + act.length * 11) };
}

const NEXT_COLS = [0.5, 0.15, 0.15, 0.2];
function nextCells(d: Doc, n: TrialCard['next'][number], w: number) {
  setFont(d, 8.5, n.done ? 'normal' : 'bold', INK);
  const what = d.splitTextToSize(san(n.what), NEXT_COLS[0] * w - 10) as string[];
  setFont(d, 8, 'normal', INK);
  const owner = d.splitTextToSize(san(n.owner ?? 'nobody yet'), NEXT_COLS[1] * w - 10) as string[];
  const fromWord = (n.becameTest ? 'became the next test' : n.fromFinding ? 'an observation' : 'agreed on the day') + (n.done ? ' · done' : '');
  setFont(d, 7.5, 'normal', INK);
  const from = d.splitTextToSize(fromWord, NEXT_COLS[3] * w - 10) as string[];
  return { what, owner, from, h: Math.max(17, 6 + Math.max(what.length, owner.length, from.length) * 11) };
}

function findingHeights(d: Doc, c: TrialCard, w: number): number[] {
  return c.findings.map(f => findingCells(d, f, w).h);
}

function nextHeights(d: Doc, c: TrialCard, w: number): number[] {
  return c.next.map(n => nextCells(d, n, w).h);
}

/** Head, rule, rows and a little air. `rows` is the heights of what will go in. */
const blockHeight = (rows: number[], empty: boolean): number =>
  /* Empty, a box is its heading and one quiet line — no table head to make
     room for. Sized as if it had one, it missed the page by a few points and
     took a sheet of its own to say "nothing agreed yet". */
  empty ? 25 + 32 : 25 + 15 + rows.reduce((a, b) => a + b, 0) + 12;

/** What we found: one row per observation, with what somebody decided about it.
 *  Returns how many it drew, so the caller knows whether to start a new page. */
function findingsTable(d: Doc, c: TrialCard, x: number, y: number, w: number, maxY: number, from: number): number {
  /* Three columns. A decision of "not a problem" had its own 8% column and
     printed as "not a probl…" against WHOSE; it is what the finding became, so
     it is said there. */
  const cols = FIND_COLS;
  const at = (i: number) => x + cols.slice(0, i).reduce((a, b) => a + b, 0) * w;
  /* "THE ACTION IT BECAME" outlived the noun. An observation becomes a FIX —
     its own record with its own card — so the column says what it became. */
  /* No DECIDED column heading: an observation is a note now, and the word
     survives only on the few decided before fixes moved to their own screen. */
  const HEADS = ['WHAT WE SAW', 'WHOSE', 'WHAT IT BECAME'];

  setFont(d, 6.5, 'bold', MUTED);
  HEADS.forEach((h, i) => d.text(h, at(i), y + 11));
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, y + 15, x + w, y + 15);

  let cy = y + 15, drawn = 0;
  for (let i = from; i < c.findings.length; i++) {
    const f = c.findings[i];
    /* Measure before committing: a long observation wraps, and a row that would
       run off the bottom belongs on the next sheet whole, not half. */
    const cell = findingCells(d, f, w);
    const rowH = cell.h;
    if (cy + rowH > maxY) break;

    if (drawn % 2 === 1) { d.setFillColor('#faf9f5'); d.rect(x - 4, cy + 2, w + 8, rowH, 'F'); }

    setFont(d, 8.5, 'normal', INK);
    cell.what.forEach((l, k) => d.text(l, at(0), cy + 13 + k * 11));

    setFont(d, 8, 'normal', INK2);
    cell.owner.forEach((l, k) => d.text(l, at(1), cy + 13 + k * 11));

    /* What it became: the fix if there is one, else the decision in its own
       tone ('not a problem' muted, an undecided one amber), else a dash. */
    const tone = f.action ? INK2 : !f.decision ? MUTED
      : f.decision === 'a fix' ? BLUE_DECIDED : f.decision === 'not a problem' ? MUTED : WARN;
    setFont(d, 8, f.action || !f.decision ? 'normal' : 'bold', tone);
    cell.act.forEach((l, k) => d.text(l, at(2), cy + 13 + k * 11));

    if (f.photos) {
      setFont(d, 6.5, 'normal', MUTED);
      d.text(`${f.photos} filmed`, at(1), cy + 13 + cell.owner.length * 11);
    }

    cy += rowH;
    d.setDrawColor('#efede6'); d.setLineWidth(0.4);
    d.line(x, cy + 1, x + w, cy + 1);
    drawn++;
  }
  return drawn;
}

/* The decided-blue is the app's "planned/in progress" slate. Named here so the
   table reads without a colour lookup in the middle of it. */
const BLUE_DECIDED = '#4f46b8';

function nextTable(d: Doc, c: TrialCard, x: number, y: number, w: number, maxY: number): number {
  const cols = NEXT_COLS;
  const at = (i: number) => x + cols.slice(0, i).reduce((a, b) => a + b, 0) * w;
  ['WHAT WE DO NEXT', 'WHOSE', 'BY WHEN', 'WHERE IT CAME FROM']
    .forEach((h, i) => { setFont(d, 6.5, 'bold', MUTED); d.text(h, at(i), y + 11); });
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, y + 15, x + w, y + 15);

  let cy = y + 15, drawn = 0;
  for (const n of c.next) {
    const cell = nextCells(d, n, w);
    const rowH = cell.h;
    if (cy + rowH > maxY) break;

    setFont(d, 8.5, n.done ? 'normal' : 'bold', n.done ? MUTED : INK);
    cell.what.forEach((l, k) => d.text(l, at(0), cy + 13 + k * 11));
    setFont(d, 8, 'normal', n.owner ? INK2 : DANGER);
    cell.owner.forEach((l, k) => d.text(l, at(1), cy + 13 + k * 11));
    /* A next step past its day says so, in red, on the document that goes to
       the people who owe it. It printed in plain ink two days late. */
    const gone = !!n.due && !n.done && n.due < todayISO();
    setFont(d, 8, gone ? 'bold' : 'normal', gone ? DANGER : n.due ? INK2 : MUTED);
    d.text(n.due ? (gone ? `WAS ${nice(n.due)}` : nice(n.due)) : '—', at(2), cy + 13);

    setFont(d, 7.5, 'normal', MUTED);
    cell.from.forEach((l, k) => d.text(l, at(3), cy + 13 + k * 11));

    cy += rowH;
    d.setDrawColor('#efede6'); d.setLineWidth(0.4);
    d.line(x, cy + 1, x + w, cy + 1);
    drawn++;
  }
  return drawn;
}

/** The plan above the day, each full width — for words too long to sit side
 *  by side. Returns the y below them; starts a page between them if the day
 *  would not fit under the plan. */
function stackedBoxes(d: Doc, c: TrialCard, x: number, y: number, w: number, bottom: number, newPage: () => number): number {
  const fw = w - 28, words = wordsOf(c);
  const one = (yy: number, n: string, title: string, fields: [string, string, { size?: number; empty?: string }][], dated: [string, string]) => {
    const h = 25 + 12 + fields.reduce((a, [, t, o]) => a + fieldHeight(d, fw, t, o) + 8, 0) + 20;
    if (yy + h > bottom) yy = newPage();
    let fy = box(d, x, yy, w, h, n, title) + 12;
    for (const [label, t, o] of fields) fy = field(d, x + 14, fy, fw, label, t, o) + 8;
    setFont(d, 7.5, 'normal', dated[1]);
    d.text(dated[0], x + 14, yy + h - 10);
    return yy + h + 12;
  };
  let yy = one(y, '1', words.plan, [
    [words.expectation, c.passesIf ?? '', { empty: words.noPlan }],
    ...(c.kind === 'test' ? [['Product we planned to run', c.plannedProduct ?? '', { size: 8.5 }] as [string, string, { size: number }]] : []),
  ], [`Planned for ${span(c.plannedFor, c.plannedTo) || '—'}`, MUTED]);
  yy = one(yy, '2', c.kind === 'test' ? 'What actually happened' : words.day, [
    [words.happened, c.outcome === 'planned' && !c.result && !c.ranOn ? '' : verdictLine(c), { empty: 'Nothing written down yet' }],
    ...(c.kind === 'test' ? [['Product we ran', c.product ?? '', { size: 8.5 }] as [string, string, { size: number }]] : []),
  ], [c.ranOn ? `Ran ${span(c.ranOn, c.ranTo)}` : 'Not run yet', c.ranOn ? MUTED : WARN]);
  return yy;
}

/* ---------- the whole card ---------- */

export function drawTrialCard(d: Doc, c: TrialCard, meta: TrialCardMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const CW = W - 2 * M;
  const bottom = H - 30;

  /* ========================= PAGE 1 — THE DAY ========================= */
  let y = head(d, c, meta, 1) + 16;

  /* The plan and the day, side by side, because the whole point of keeping them
     as two records is that somebody can see the gap between them. */
  const half = (CW - 14) / 2;
  const planTop = y;

  /* THE WORDS COME FROM lib/testing, not from here. A fix is the same record
     wearing a different vocabulary, and the screen takes its labels from the
     same table — so the page a client reads and the page they are sent cannot
     call the same field two different things. */
  const w = wordsOf(c);

  /* THE TWO BOXES TAKE THE ROOM THEIR WORDS NEED, not a flat 128pt.
     Rowland: "expand and make the pdf dynamic — it will grow, make use of the
     space better." At 128 a one-line expectation printed a hand's width of
     white above the date, and a four-line one would have run out through the
     bottom of the frame. They are still the SAME height as each other, because
     the whole reason the plan and the day are two boxes is that somebody reads
     them across, and two frames at different heights stop being a pair. */
  /* SIDE BY SIDE WHEN THEY FIT, STACKED WHEN THEY DO NOT. With nothing cut,
     a long expectation and a long result could run two half-width boxes off
     the sheet; full width, the same words take half the lines. */
  const sideBySide = (() => {
    const hw = half - 28;
    const need = (fw2: number) => 25 + 12 + Math.max(
      fieldHeight(d, fw2, c.passesIf ?? '', { empty: wordsOf(c).noPlan }) + (c.kind === 'test' ? 8 + fieldHeight(d, fw2, c.plannedProduct ?? '', { size: 8.5 }) : 0),
      fieldHeight(d, fw2, c.result ?? '', { empty: 'Nothing written down yet' }) + (c.kind === 'test' ? 8 + fieldHeight(d, fw2, c.product ?? '', { size: 8.5 }) : 0)) + 26;
    return planTop + need(hw) <= bottom - 80;
  })();
  if (!sideBySide) {
    y = stackedBoxes(d, c, M, planTop, CW, bottom, () => { d.addPage(); return head(d, c, meta, 2) + 14; });
  }
  const fw = half - 28;
  const planNeeds = 12 + fieldHeight(d, fw, c.passesIf ?? '',
    { empty: wordsOf(c).noPlan })
    + (c.kind === 'test' ? 8 + fieldHeight(d, fw, c.plannedProduct ?? '', { size: 8.5 }) : 0);
  const dayNeeds = 12 + fieldHeight(d, fw, c.result ?? '', { empty: 'Nothing written down yet' })
    + (c.kind === 'test' ? 8 + fieldHeight(d, fw, c.product ?? '', { size: 8.5 }) : 0);
  /* 25 is the box's own head and rule; 26 is the dated line that sits under
     everything, and the air around it. */
  const boxH = 25 + Math.max(planNeeds, dayNeeds) + 26;
  const dateY = planTop + boxH - 12;

  if (sideBySide) {
  let by = box(d, M, y, half, boxH, '1', w.plan) + 12;
  by = field(d, M + 14, by, fw, w.expectation, c.passesIf ?? '',
    { empty: wordsOf(c).noPlan }) + 8;
  if (c.kind === 'test') {
    field(d, M + 14, by, fw, 'Product we planned to run', c.plannedProduct ?? '', { size: 8.5 });
  }
  setFont(d, 7.5, 'normal', MUTED);
  d.text(`Planned for ${span(c.plannedFor, c.plannedTo) || '—'}`, M + 14, dateY);

  let dy = box(d, M + half + 14, y, half, boxH, '2', c.kind === 'test' ? 'What actually happened' : wordsOf(c).day) + 12;
  /* The same line the card SCREEN shows — the result, and "no verdict
     yet" after it when that is the case — not the raw result field. */
  dy = field(d, M + half + 28, dy, fw, w.happened, c.outcome === 'planned' && !c.result && !c.ranOn ? '' : verdictLine(c), { empty: 'Nothing written down yet' }) + 8;
  if (c.kind === 'test') {
    field(d, M + half + 28, dy, fw, 'Product we ran', c.product ?? '', { size: 8.5 });
  }
  setFont(d, 7.5, 'normal', c.ranOn ? MUTED : WARN);
  d.text(c.ranOn ? `Ran ${span(c.ranOn, c.ranTo)}` : 'Not run yet', M + half + 28, dateY);

  y = planTop + boxH + 12;
  }
  y = loopStrip(d, c, M, y, CW);

  /* ==================== WHAT WE FOUND, AND WHAT WE DO NEXT ==================
   *
   * Both boxes take only the room they need. When they both fit under the plan
   * they share this page, which is the common case and the one worth
   * optimising: a one-page card gets read on a phone; a two-page one gets
   * scrolled past. */
  // Not a sliver of a box at the foot of a sheet: what we found starts the next one.
  if (bottom - y < 90) { d.addPage(); y = head(d, c, meta, 2) + 14; }
  const fH = findingHeights(d, c, CW - 28);
  const nH = nextHeights(d, c, CW - 28);
  const room = bottom - y;

  const foundSub = foundWords(c.found);
  const nextSub = c.next.length
    ? `${c.openNext} still to do of ${c.next.length}`
    : 'nothing agreed yet';

  const wantFound = blockHeight(fH, c.findings.length === 0);
  const wantNext = blockHeight(nH, c.next.length === 0);

  /* Found gets what it wants, but never so much that What we do next is pushed
     off a page it would otherwise have fitted on. */
  const bothFit = wantFound + 12 + wantNext <= room;
  const foundH = bothFit ? wantFound : Math.min(wantFound, room);

  const fTop = box(d, M, y, CW, foundH, '3', wordsOf(c).found, foundSub);
  let drawn = 0;
  if (c.findings.length === 0) {
    setFont(d, 8.5, 'normal', MUTED);
    d.text(`Nothing was written down on this ${wordsOf(c).one.toLowerCase()}.`, M + 14, fTop + 20);
  } else {
    drawn = findingsTable(d, c, M + 14, fTop, CW - 28, y + foundH - 10, 0);
  }

  // The page the found box is on — the second sheet when the boxes above were stacked onto it.
  const startPage = d.getNumberOfPages();
  let page = startPage;
  let from = drawn;

  /* Every observation that did not fit, on sheets of its own. jsPDF cannot
     measure a page without drawing it, so each sheet is drawn for real and the
     count it returns moves the cursor. The `more === 0` guard is not defensive
     dressing: without it, an observation too tall for even an empty page would
     loop for ever. */
  while (from < c.findings.length) {
    d.addPage();
    page++;
    const top = head(d, c, meta, page) + 14;
    const h = bottom - top;
    const fT = box(d, M, top, CW, h, '3', wordsOf(c).found,
      `continued · from ${from + 1} of ${c.findings.length}`);
    const more = findingsTable(d, c, M + 14, fT, CW - 28, top + h - 10, from);
    if (more === 0) break;
    from += more;
  }

  /* WHAT WE DO NEXT. Under the observations when there is room for all of it,
     otherwise a sheet of its own — it is the part somebody acts on and prints,
     and half of it at the foot of a page is how it stops being read. */
  let ny: number;
  let nRoom: number;
  if (bothFit && page === startPage) {
    ny = y + foundH + 12;
    nRoom = wantNext;
  } else {
    d.addPage();
    page++;
    ny = head(d, c, meta, page) + 14;
    nRoom = Math.min(wantNext, bottom - ny);
  }

  const nTop = box(d, M, ny, CW, nRoom, '4', 'What we do next', nextSub);
  if (c.next.length === 0) {
    setFont(d, 8.5, 'normal', MUTED);
    d.text(`Nothing has been agreed out of this ${wordsOf(c).one.toLowerCase()} yet.`, M + 14, nTop + 20);
  } else {
    nextTable(d, c, M + 14, nTop, CW - 28, ny + nRoom - 10);
  }

  /* THE PICTURES. Rowland: "the power of the evidence is not available in
     fixes and in the tests." A fix card that says "fixed" is a claim; the
     photo of the guard on the shelf is the proof, and it was in the app and
     never on the page. Six at most, the height of a row, under what we do
     next when it fits and on a sheet of its own when it does not. */
  const shots = meta.shots ?? [];
  if (shots.length) {
    let py = ny + nRoom + 12;
    /* A row's height when the page has it; a shorter row when the page has
       most of it — a strip of pictures the height of a thumb still shows
       the guard on the shelf, and a sheet of its own for them does not. */
    const left = bottom - py - 25 - 24;
    const SHOT_H = left >= 92 ? 92 : left >= 56 ? left : 92;
    /* The row first, then its height: under each picture, what is marked on
       it (ui/Evidence), by the numbers drawn on it — never cut. */
    const row: { s: Shot; x: number; w: number; marks: string[][] }[] = [];
    let sx = M + 14;
    for (const s of shots) {
      const sw = Math.min(150, (s.w / s.h) * SHOT_H);
      if (sx + sw > M + CW - 14) break;
      setFont(d, 7, 'normal', INK2);
      row.push({ s, x: sx, w: sw, marks: (s.marks ?? []).map(m => d.splitTextToSize(san(m), Math.max(40, sw - 10)) as string[]) });
      sx += sw + 8;
    }
    const marksH = Math.max(0, ...row.map(r => r.marks.reduce((n, l) => n + l.length, 0) * 8.5));
    const want = 25 + 12 + SHOT_H + (marksH ? 6 + marksH : 0) + 12;
    if (py + want > bottom) {
      d.addPage();
      page++;
      py = head(d, c, meta, page) + 14;
    }
    const pTop = box(d, M, py, CW, want, '5', wordsOf(c).pictures,
      `${c.photos} on the ${wordsOf(c).one.toLowerCase()}${shots.length < c.photos ? ` · the first ${shots.length}` : ''}`);
    for (const r of row) {
      try { d.addImage(r.s.data, 'JPEG', r.x, pTop + 12, r.w, SHOT_H); } catch { /* a bad frame must not cost the words */ }
      let my = pTop + 12 + SHOT_H + 12;
      r.marks.forEach((lines, i) => {
        setFont(d, 7, 'bold', DANGER); d.text(String(i + 1), r.x, my);
        setFont(d, 7, 'normal', INK2); d.text(lines, r.x + 9, my);
        my += lines.length * 8.5;
      });
    }
  }

  /* Page numbers last: "1 of 3" cannot be written until the third page exists. */
  const total = d.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    d.setPage(p);
    foot(d, p, total, meta);
  }
}
