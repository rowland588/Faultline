/* A SHIFT'S LOSSES ON PAPER — docs/TOOLKIT.md, tool 7 ("Paper: the pace
 * report's page"); docs/BUILD.md, E; docs/REPORTS.md §1.
 *
 * The waterfall on screen is read by its heights; on paper the same facts
 * are a table: what was planned and made in one line over it, then a row per
 * bar in the waterfall's order — cause · stops · minutes · £ — and the total
 * lost. The part not yet explained is the one row that may carry colour,
 * amber, and only when it is over a tenth of the loss (the same rule as the
 * screen); its words say what it is, so it survives a black-and-white print.
 * The £ column is drawn only when the line has a cost model. Rows break
 * between pages, never inside one, the header drawn again overleaf.
 *
 * The words are worked out in lib/ie/losses (lossRows); this only draws. */
import type { LossRow } from '../ie/losses';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

/** The house's amber — waiting on somebody, or not known yet. */
const AMBER = '#8a5f14';
const T = 8.5;
const LH = 11;

const cols = (w: number, money: boolean) => {
  const fixed = { stops: 46, minutes: 56, pounds: money ? 56 : 0 };
  const cause = Math.max(140, w - fixed.stops - fixed.minutes - fixed.pounds);
  return { cause, ...fixed };
};

function causeLines(f: Frame, r: LossRow, money: boolean): string[] {
  return wrap(f.doc, r.kind === 'unexplained' ? `${r.cause} — not logged: stops missed, or running slow` : r.cause, cols(f.w, money).cause - 8, T, r.kind === 'unexplained' ? 'bold' : 'normal');
}

/** The table, and the line over it that says what was planned and made. */
export function lossBlocks(t: { head: string; rows: LossRow[]; total: { minutes: string; pounds: string } }): Block[] {
  const money = t.rows.some(r => r.pounds) || !!t.total.pounds;
  const header: Row = {
    h: () => 14,
    draw: (f, y) => {
      const c = cols(f.w, money);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('CAUSE', f.x, y + 9);
      f.doc.text('STOPS', f.x + c.cause + c.stops - 4, y + 9, { align: 'right' });
      f.doc.text('MINUTES', f.x + c.cause + c.stops + c.minutes - 4, y + 9, { align: 'right' });
      if (money) f.doc.text('£', f.x + f.w, y + 9, { align: 'right' });
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 12.5, f.x + f.w, y + 12.5);
    },
  };
  const body: Row[] = t.rows.map(r => ({
    h: f => 5 + Math.max(1, causeLines(f, r, money).length) * LH + 2,
    draw: (f, y) => {
      const c = cols(f.w, money), ty = y + 5 + T * 0.92;
      const ink = r.abnormal ? AMBER : r.kind === 'unexplained' ? INK2 : INK;
      const lines = causeLines(f, r, money);
      font(f.doc, T, r.kind === 'unexplained' ? 'bold' : 'normal', ink);
      f.doc.text(lines, f.x, ty);
      font(f.doc, T, 'normal', r.abnormal ? AMBER : INK2);
      f.doc.text(r.stops, f.x + c.cause + c.stops - 4, ty, { align: 'right' });
      font(f.doc, T, 'bold', ink);
      f.doc.text(r.minutes, f.x + c.cause + c.stops + c.minutes - 4, ty, { align: 'right' });
      if (money) { font(f.doc, T, 'normal', r.abnormal ? AMBER : INK2); f.doc.text(r.pounds || '—', f.x + f.w, ty, { align: 'right' }); }
      const h = 5 + Math.max(1, lines.length) * LH + 2;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  const foot: Row = {
    h: () => 16,
    draw: (f, y) => {
      const c = cols(f.w, money), ty = y + 11;
      font(f.doc, T, 'bold', INK);
      f.doc.text('Lost', f.x, ty);
      f.doc.text(t.total.minutes, f.x + c.cause + c.stops + c.minutes - 4, ty, { align: 'right' });
      if (money && t.total.pounds) f.doc.text(t.total.pounds, f.x + f.w, ty, { align: 'right' });
    },
  };
  return [
    text({ text: t.head, size: SIZE.tiny + 1, colour: INK2, after: 3 }),
    ...(t.rows.length ? [rows({ header, rows: [...body, foot], after: 's' })] : []),
  ];
}
