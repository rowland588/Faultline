/* THE BLOCKS A REPORT IS MADE OF — docs/REPORTS.md §1.
 *
 * Each one measures itself with the real font at the frame's width, so a long
 * name wraps and its row grows, a long sentence takes the lines it needs, and
 * nothing is ever given a height it might not fit in. The type sizes, leading
 * and gaps are here once, so every report is one family. */
import type { jsPDF } from 'jspdf';
import { INK, LINE, MUTED, pdfFamily, san } from '../reportKit';
import type { Block, Density, Frame } from './flow';

/* ------------------------------- the tokens ------------------------------- */

/** Type sizes, pt. The floor: nothing a person reads is set below 7. */
export const SIZE = { eyebrow: 8.5, title: 22, h1: 15, h2: 10.5, body: 9.5, small: 8.5, label: 7.5, tiny: 7 } as const;
/** Line height for a size — tighter at the compact density, never cramped. */
export const lead = (size: number, d: Density): number => size * (d === 'compact' ? 1.17 : 1.3);
/** The three gaps. Compact closes them up; the type stays the same size. */
export const gap = (d: Density, k: 's' | 'm' | 'l'): number =>
  (d === 'compact' ? { s: 4, m: 8, l: 13 } : { s: 6, m: 12, l: 20 })[k];

export type Style = 'normal' | 'bold';

export function font(doc: jsPDF, size: number, style: Style = 'normal', colour = INK): void {
  doc.setFont(pdfFamily(), style); doc.setFontSize(size); doc.setTextColor(colour);
}

/** Text broken into lines that fit `w` at this size and weight. */
export function wrap(doc: jsPDF, text: string, w: number, size: number, style: Style = 'normal'): string[] {
  font(doc, size, style);
  const t = san(text);
  return t ? (doc.splitTextToSize(t, Math.max(10, w)) as string[]) : [];
}

/* -------------------------------- the blocks ------------------------------- */

/** A paragraph. Splits between its lines — never two lines alone either side. */
export function text(o: {
  text: string; size?: number; style?: Style; colour?: string; indent?: number; before?: number; after?: number;
  /** Drawn in the indent beside the first line — a bullet. */
  bullet?: string;
}): Block {
  const size = o.size ?? SIZE.body, indent = o.indent ?? 0;
  const linesOf = (f: Frame) => wrap(f.doc, o.text, f.w - indent, size, o.style);
  const make = (lines: string[] | null, first: boolean, last: boolean): Block => {
    const get = (f: Frame) => lines ?? linesOf(f);
    const pad = (f: Frame) => (first ? o.before ?? 0 : 0) + (last ? o.after ?? gap(f.density, 's') : 0);
    return {
      height: f => { const l = get(f); return l.length ? l.length * lead(size, f.density) + pad(f) : 0; },
      lead: f => Math.min(get(f).length, 2) * lead(size, f.density) + (first ? o.before ?? 0 : 0),
      draw: (f, y) => {
        const l = get(f), lh = lead(size, f.density), top = y + (first ? o.before ?? 0 : 0);
        font(f.doc, size, o.style, o.colour ?? INK);
        l.forEach((s, i) => f.doc.text(s, f.x + indent, top + size * 0.92 + i * lh));
        if (o.bullet && first) f.doc.text(o.bullet, f.x + Math.max(0, indent - 9), top + size * 0.92);
      },
      split: (f, room) => {
        const l = get(f), lh = lead(size, f.density);
        let k = Math.floor((room - (first ? o.before ?? 0 : 0)) / lh);
        if (l.length - k === 1) k--;          // never one line alone on the next page
        if (k < 2 || k >= l.length) return null;
        return [make(l.slice(0, k), first, false), make(l.slice(k), false, last)];
      },
    };
  };
  return make(null, true, true);
}

/** A section heading — title, the one-line answer under it, a rule. Never the
 *  last thing on a page. */
export function heading(title: string, says?: string, o: { size?: number } = {}): Block {
  const size = o.size ?? SIZE.h1;
  const parts = (f: Frame) => ({ t: wrap(f.doc, title, f.w, size, 'bold'), s: says ? wrap(f.doc, says, f.w, SIZE.body) : [] });
  const h = (f: Frame) => {
    const { t, s } = parts(f);
    return gap(f.density, 'm') + t.length * lead(size, f.density) + s.length * lead(SIZE.body, f.density) + gap(f.density, 's') + 1 + gap(f.density, 's');
  };
  return {
    keepWithNext: true,
    height: h,
    draw: (f, y) => {
      const { t, s } = parts(f);
      let yy = y + gap(f.density, 'm');
      font(f.doc, size, 'bold');
      t.forEach(line => { f.doc.text(line, f.x, yy + size * 0.92); yy += lead(size, f.density); });
      font(f.doc, SIZE.body, 'normal', MUTED);
      s.forEach(line => { f.doc.text(line, f.x, yy + SIZE.body * 0.92); yy += lead(SIZE.body, f.density); });
      yy += gap(f.density, 's');
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.8); f.doc.line(f.x, yy, f.x + f.w, yy);
    },
  };
}

/** A small capital label over what follows — "WHERE EACH MACHINE IS". */
export function label(t: string, colour = MUTED): Block {
  return { ...text({ text: t.toUpperCase(), size: SIZE.small, style: 'bold', colour, after: 4 }), keepWithNext: true };
}

export function space(k: 's' | 'm' | 'l'): Block {
  return { height: f => gap(f.density, k), draw: () => undefined };
}

/** One row of a table, a grid or a list: it measures and draws itself. */
export interface Row {
  h(f: Frame): number;
  draw(f: Frame, y: number): void;
}

/** Rows that break between rows, never inside one; the header is drawn again
 *  at the top of every page they continue onto; and a page never holds a
 *  single row of them on either side of a break when that can be helped. */
export function rows(o: { header?: Row; rows: Row[]; after?: 's' | 'm' | 'l' }): Block {
  const make = (list: Row[], last: boolean): Block => {
    const head = (f: Frame) => (o.header ? o.header.h(f) : 0);
    const after = (f: Frame) => (last ? gap(f.density, o.after ?? 'm') : 0);
    return {
      height: f => (list.length ? head(f) + list.reduce((s, r) => s + r.h(f), 0) + after(f) : 0),
      lead: f => head(f) + list.slice(0, list.length <= 3 ? list.length : 2).reduce((s, r) => s + r.h(f), 0),
      draw: (f, y) => {
        let yy = y;
        if (o.header) { o.header.draw(f, yy); yy += o.header.h(f); }
        for (const r of list) { r.draw(f, yy); yy += r.h(f); }
      },
      split: (f, room) => {
        let used = head(f), k = 0;
        while (k < list.length && used + list[k].h(f) <= room) { used += list[k].h(f); k++; }
        if (list.length - k === 1 && k > 2) k--;   // not one row alone overleaf
        if (k === 0 || k >= list.length) return null;
        if (k === 1 && list.length > 2) return null; // not one row alone here
        return [make(list.slice(0, k), false), make(list.slice(k), last)];
      },
    };
  };
  return make(o.rows, true);
}

/** Something drawn whole — a band, a row of boxes. Measured, never split. */
export function box(height: (f: Frame) => number, draw: (f: Frame, y: number) => void): Block {
  return { height, draw };
}

/** Pages of its own, between the flow's pages. */
export function pagesOf(insert: (f: Frame) => Promise<void> | void, o: { float?: boolean } = {}): Block {
  return { height: () => 0, draw: () => undefined, insert, float: o.float };
}
