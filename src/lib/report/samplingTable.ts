/* A WORK SAMPLING ON PAPER — docs/TOOLKIT.md Part 4 §9 ("the pace report's
 * page and the Evidence appendix"); docs/BUILD.md, H1.
 *
 * On screen the shares are bars, each with its margin; on paper the same
 * facts are a table: a row per person watched — their taps, then each
 * activity's share with the margin it carries at 95%, in points. A person
 * with too few taps says so across the row, never a figure. Neutral
 * throughout: the shares are the facts, and what is too much waiting is the
 * team's to say on its fishbone (lib/ie/sampling samplingSays). Rows break
 * between pages, never inside one, the header drawn again overleaf.
 *
 * The words are worked out in lib/ie/sampling (samplingRows); this only draws. */
import type { SamplingRow } from '../../tools/sampling/sampling';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

const T = 8.5;
const LH = 11;

const cols = (w: number, k: number) => {
  const who = Math.min(150, Math.max(90, w * 0.22)), taps = 36;
  return { who, taps, each: (w - who - taps) / Math.max(1, k) };
};

export function samplingBlocks(t: { head: string; activities: string[]; rows: SamplingRow[] }): Block[] {
  const k = t.activities.length;
  const whoLines = (f: Frame, r: SamplingRow) => wrap(f.doc, r.who, cols(f.w, k).who - 8, T, 'bold');
  const header: Row = {
    h: f => 8 + Math.max(...t.activities.map(a => wrap(f.doc, a.toUpperCase(), cols(f.w, k).each - 4, SIZE.tiny, 'bold').length)) * 9 + 6,
    draw: (f, y) => {
      const c = cols(f.w, k);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('PERSON', f.x, y + 13);
      f.doc.text('TAPS', f.x + c.who + c.taps - 4, y + 13, { align: 'right' });
      let hMax = 1;
      t.activities.forEach((a, i) => {
        const ls = wrap(f.doc, a.toUpperCase(), c.each - 4, SIZE.tiny, 'bold');
        hMax = Math.max(hMax, ls.length);
        f.doc.text(ls, f.x + c.who + c.taps + (i + 1) * c.each - 4, y + 13, { align: 'right' });
      });
      const h = 8 + hMax * 9 + 6;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + h - 1.5, f.x + f.w, y + h - 1.5);
    },
  };
  const body: Row[] = t.rows.map(r => ({
    h: f => 5 + Math.max(1, whoLines(f, r).length) * LH + 2,
    draw: (f, y) => {
      const c = cols(f.w, k), ty = y + 5 + T * 0.92, lines = whoLines(f, r);
      font(f.doc, T, 'bold', INK);
      f.doc.text(lines, f.x, ty);
      font(f.doc, T, 'normal', INK2);
      f.doc.text(String(r.n), f.x + c.who + c.taps - 4, ty, { align: 'right' });
      if (r.early) {
        font(f.doc, T, 'normal', MUTED);
        f.doc.text(r.early, f.x + c.who + c.taps + 8, ty);
      } else {
        r.cells.forEach((cell, i) => {
          const right = f.x + c.who + c.taps + (i + 1) * c.each - 4;
          /* the share in ink, its margin beside it, quieter */
          if (cell.margin) {
            const m = ` ${cell.margin}`;
            font(f.doc, T - 1, 'normal', MUTED);
            const mw = f.doc.getTextWidth(m);
            font(f.doc, T, 'bold', INK); f.doc.text(cell.share, right - mw, ty, { align: 'right' });
            font(f.doc, T - 1, 'normal', MUTED); f.doc.text(m, right, ty, { align: 'right' });
          } else { font(f.doc, T, 'normal', MUTED); f.doc.text(cell.share, right, ty, { align: 'right' }); }
        });
      }
      const h = 5 + Math.max(1, lines.length) * LH + 2;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  return [
    text({ text: t.head, size: SIZE.tiny + 1, colour: INK2, after: 3 }),
    rows({ header, rows: body, after: 's' }),
  ];
}
