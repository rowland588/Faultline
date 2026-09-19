/* THE REPORT KIT — the primitives every printed sheet in this app is drawn with.
 *
 * Pulled out of the GM report the moment a SECOND report needed them. They are
 * not Pace-specific and never were: a palette, a panel, a table, a text fitter
 * and the two jsPDF workarounds that cost real time to find (WinAnsi has no
 * arrows; setFillColor has no alpha). Copying them would have meant the
 * commissioning sheet drifting a shade of green away from the GM report within
 * a month, and both of them re-learning the same two traps separately.
 *
 * Everything here draws; nothing here decides what to draw.
 */
import type { jsPDF } from 'jspdf';

export type Doc = jsPDF;

/* ---------- the app's palette, as the report uses it ---------- */
export const INK = '#0c1f26', INK2 = '#35505a', MUTED = '#6b8892', LINE = '#dbe8e6';
export const ACCENT = '#0a6d5b', BRAND = '#0b7d68', SURF2 = '#e9f2f0';
export const OK = '#2e9e5b', WARN = '#b8721a', DANGER = '#cc4436', BLUE = '#1c6fb8';
/** The validated chart pair — actual vs target (target is also dashed, so the
 *  two never rely on colour alone). */
export const ACTUAL = '#1c6fb8', TARGET = '#b8721a';

/** jsPDF's built-in fonts are WinAnsi-encoded, which has no arrows and no
 *  general Unicode: an impact typed as "44 → 49 ppm" came out as "44 !' 49 ppm"
 *  and mis-measured its own pill. Map the characters people actually type onto
 *  ones the encoding has. (·, —, ’, “ ” and … are all in WinAnsi, so they stay.) */
export function san(t: string): string {
  return t
    /* EVERY STRING ENTERING THE PDF LOSES ITS LINE BREAKS HERE.
     *
     * The workbook's Action cells are not one line — they are a running log,
     * several dated updates typed into one cell with alt-enter between them.
     * jsPDF's splitTextToSize breaks on those newlines FIRST and does not
     * re-wrap what it finds, so a two-line cell drew its second line straight
     * over the row beneath: on the overdue table it printed "08" through the
     * next action's title and shunted the "+2 more" line under a sentence.
     *
     * Collapsing here rather than at each call site is the point: this is the
     * one door every string comes through, and the board page had to learn this
     * separately once already. */
    /* Whitespace to single spaces FIRST, so a line break becomes a word gap
       rather than vanishing and welding two sentences together. */
    .replace(/\s+/g, ' ')
    .replace(/[\u2192\u27A1\u2794]/g, '->')
    .replace(/[\u2190]/g, '<-')
    .replace(/[\u2713\u2714]/g, 'v')
    .replace(/[\u2022]/g, '·')
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    /* Then drop everything the encoding cannot draw — INCLUDING the C0 and C1
       control characters, which this used to keep. The old range started at
       \u0000, so a NUL, a BEL or an ESC out of an Excel cell went straight into
       the PDF. That is not a wrong word on the page: a control character inside
       a text object corrupts the stream, and the damage shows up as a file that
       will not open at all. Excel cells really do carry them, out of CSV
       imports and copy-paste. */
    .replace(/[^\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g, '')
    /* Collapse again at the end, because dropping a character leaves the spaces
       that were around it: "rate 😀 ok" came out as "rate  ok". */
    .replace(/\s+/g, ' ')
    .trim();
}

export const setFont = (d: Doc, size: number, weight: 'normal' | 'bold', colour: string) => {
  d.setFont('helvetica', weight);
  d.setFontSize(size);
  d.setTextColor(colour);
};


export function fit(d: Doc, text: string, maxW: number): string {
  if (d.getTextWidth(text) <= maxW) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (d.getTextWidth(text.slice(0, mid) + '…') <= maxW) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}


/** A bordered section panel with the numbered head the on-screen report uses. */
export function panel(d: Doc, x: number, y: number, w: number, h: number, n: string, title: string, sowhat: string): number {
  d.setDrawColor(LINE); d.setLineWidth(0.8);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 6, 6, 'FD');

  const cy = y + 18;
  d.setFillColor('#141b26');
  d.circle(x + 22, cy, 8, 'F');
  setFont(d, 8, 'bold', '#ffffff');
  d.text(n, x + 22, cy + 2.8, { align: 'center' });

  setFont(d, 11.5, 'bold', '#141b26');
  d.text(title, x + 36, cy + 3.5);
  setFont(d, 8, 'normal', MUTED);
  d.text(sowhat, x + w - 14, cy + 3, { align: 'right' });

  const ruleY = y + 30;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x + 12, ruleY, x + w - 12, ruleY);
  return ruleY;                    // content starts below this
}


/* ---------- a simple table ---------- */
export function table(
  d: Doc, x: number, y: number, w: number,
  cols: { head: string; width: number; align?: 'left' | 'right'; }[],
  rows: { text: string; colour?: string; bold?: boolean }[][],
  maxY: number,
): number {
  const xs: number[] = [];
  let cx = x;
  for (const c of cols) { xs.push(cx); cx += c.width * w; }

  setFont(d, 6.5, 'bold', MUTED);
  cols.forEach((c, i) => {
    const tx = c.align === 'right' ? xs[i] + c.width * w - 6 : xs[i];
    d.text(c.head.toUpperCase(), tx, y, { align: c.align === 'right' ? 'right' : 'left' });
  });
  let cy = y + 5;
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, cy, x + w, cy);

  for (const row of rows) {
    if (cy + 16 > maxY) break;                    // never spill past the panel
    cy += 13;
    row.forEach((cell, i) => {
      const c = cols[i];
      setFont(d, 8, cell.bold ? 'bold' : 'normal', cell.colour ?? INK);
      const tx = c.align === 'right' ? xs[i] + c.width * w - 6 : xs[i];
      d.text(fit(d, cell.text, c.width * w - 10), tx, cy, { align: c.align === 'right' ? 'right' : 'left' });
    });
    d.setDrawColor('#eef3f8'); d.setLineWidth(0.4);
    d.line(x, cy + 4, x + w, cy + 4);
  }
  return cy;
}


/** A pale wash of a colour, mixed toward white as a REAL rgb.
 *
 *  jsPDF has no alpha in setFillColor: an eight-digit hex like '#1f8a4c14' is
 *  not read as "green at 8%", it falls through to black — which is how the
 *  first version of this page came out with every box filled solid black and
 *  dark text on top of it. Mixing here means the colour that goes in is the
 *  colour that comes out. */
export function wash(hex: string, amount: number): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(255 - (255 - c) * amount);
  return [m(r), m(g), m(b)];
}
