/* A SHIFT'S LOSSES ON PAPER — docs/TOOLKIT.md, tool 7 ("Paper: the pace
 * report's page"); docs/BUILD.md, E; docs/REPORTS.md §1.
 *
 * The waterfall on screen is read by its heights; on paper the same facts
 * are a table: what was planned and made in one line over it, then a row per
 * bar in the waterfall's order — cause · stops · minutes · idle labour · lost
 * contribution — and the total lost. The rest (slow running and short stops,
 * or either once told apart) is the one kind of row that may carry colour,
 * amber, and only when it is over a tenth of the loss (the same rule as the
 * screen); its words say what it is, so it survives a black-and-white print.
 * The pounds are two columns, never one blended figure (docs/CAPACITY.md
 * §6), each drawn only when the line has that cost. Rows break between
 * pages, never inside one, the header drawn again overleaf.
 *
 * The words are worked out in lib/ie/losses (lossRows); this only draws. */
import type { LossRow } from '../ie/losses';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block, Frame } from './flow';

/** The house's amber — waiting on somebody, or not known yet. */
const AMBER = '#b45309';
const T = 8.5;
const LH = 11;

/* the columns: the cause takes what is left; the pounds, two of them, only
   when the line has a cost — idle labour, and lost contribution */
const cols = (w: number, money: { labour: boolean; contribution: boolean }) => {
  const fixed = { stops: 40, minutes: 50, labour: money.labour ? 58 : 0, contribution: money.contribution ? 72 : 0 };
  const cause = Math.max(130, w - fixed.stops - fixed.minutes - fixed.labour - fixed.contribution);
  return { cause, ...fixed };
};
type Money = { labour: boolean; contribution: boolean };
const rest = (r: LossRow) => r.kind === 'performance' || r.kind === 'slow' || r.kind === 'short';

function causeLines(f: Frame, r: LossRow, money: Money): string[] {
  return wrap(f.doc, r.cause, cols(f.w, money).cause - 8, T, rest(r) ? 'bold' : 'normal');
}

/** The table, and the line over it that says what was planned and made. */
export function lossBlocks(t: { head: string; rows: LossRow[]; total: { minutes: string; labour: string; contribution: string } }): Block[] {
  const money: Money = { labour: t.rows.some(r => r.labour) || !!t.total.labour, contribution: t.rows.some(r => r.contribution) || !!t.total.contribution };
  /* x of each column's right edge */
  const edges = (f: Frame) => {
    const c = cols(f.w, money);
    const stops = f.x + c.cause + c.stops - 4, minutes = stops + c.minutes;
    const labour = minutes + c.labour, contribution = f.x + f.w;
    return { stops, minutes, labour, contribution };
  };
  const header: Row = {
    h: () => 22,
    draw: (f, y) => {
      const e = edges(f);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('CAUSE', f.x, y + 17);
      f.doc.text('STOPS', e.stops, y + 17, { align: 'right' });
      f.doc.text('MINUTES', e.minutes, y + 17, { align: 'right' });
      if (money.labour) f.doc.text(['IDLE', 'LABOUR'], e.labour, y + 9, { align: 'right' });
      if (money.contribution) f.doc.text(['LOST', 'CONTRIBUTION'], e.contribution, y + 9, { align: 'right' });
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 20.5, f.x + f.w, y + 20.5);
    },
  };
  const body: Row[] = t.rows.map(r => ({
    h: f => 5 + Math.max(1, causeLines(f, r, money).length) * LH + 2,
    draw: (f, y) => {
      const e = edges(f), ty = y + 5 + T * 0.92;
      const ink = r.abnormal ? AMBER : rest(r) ? INK2 : INK;
      const lines = causeLines(f, r, money);
      font(f.doc, T, rest(r) ? 'bold' : 'normal', ink);
      f.doc.text(lines, f.x, ty);
      font(f.doc, T, 'normal', r.abnormal ? AMBER : INK2);
      f.doc.text(r.stops, e.stops, ty, { align: 'right' });
      font(f.doc, T, 'bold', ink);
      f.doc.text(r.minutes, e.minutes, ty, { align: 'right' });
      font(f.doc, T, 'normal', r.abnormal ? AMBER : INK2);
      if (money.labour) f.doc.text(r.labour || '—', e.labour, ty, { align: 'right' });
      if (money.contribution) f.doc.text(r.contribution || '—', e.contribution, ty, { align: 'right' });
      const h = 5 + Math.max(1, lines.length) * LH + 2;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  const foot: Row = {
    h: () => 16,
    draw: (f, y) => {
      const e = edges(f), ty = y + 11;
      font(f.doc, T, 'bold', INK);
      f.doc.text('Lost', f.x, ty);
      f.doc.text(t.total.minutes, e.minutes, ty, { align: 'right' });
      if (money.labour && t.total.labour) f.doc.text(t.total.labour, e.labour, ty, { align: 'right' });
      if (money.contribution && t.total.contribution) f.doc.text(t.total.contribution, e.contribution, ty, { align: 'right' });
    },
  };
  return [
    text({ text: t.head, size: SIZE.tiny + 1, colour: INK2, after: 3 }),
    /* the total lost always — "Lost 0 min" on a shift that made its rate is a fact too */
    rows({ header, rows: [...body, foot], after: 's' }),
    /* the contribution's honesty, under the table it qualifies */
    ...(money.contribution ? [text({ text: 'Lost contribution is the packs not made at the rate × the contribution a pack — lost only if it cannot be made up.', size: SIZE.tiny, colour: MUTED, after: 8 })] : []),
  ];
}
