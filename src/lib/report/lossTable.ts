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
import { minWords, packs, type LossFigures, type LossRow } from '../ie/losses';
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
  const fixed = { stops: 40, minutes: 50, share: 38, labour: money.labour ? 58 : 0, contribution: money.contribution ? 72 : 0 };
  const cause = Math.max(130, w - fixed.stops - fixed.minutes - fixed.share - fixed.labour - fixed.contribution);
  return { cause, ...fixed };
};
type Money = { labour: boolean; contribution: boolean };
const rest = (r: LossRow) => r.kind === 'performance' || r.kind === 'slow' || r.kind === 'short';

function causeLines(f: Frame, r: LossRow, money: Money): string[] {
  return wrap(f.doc, r.cause, cols(f.w, money).cause - 8, T, rest(r) ? 'bold' : 'normal');
}

/** The table, and the line over it that says what was planned and made. */
/** `head: false` — the lean page, whose band and tiles already say the planned
 *  minutes, the rate, what was expected and what was made (said once). */
export function lossBlocks(t: { head: string; rows: LossRow[]; total: { minutes: string; labour: string; contribution: string } }, o: { head?: boolean } = {}): Block[] {
  const money: Money = { labour: t.rows.some(r => r.labour) || !!t.total.labour, contribution: t.rows.some(r => r.contribution) || !!t.total.contribution };
  /* x of each column's right edge */
  const edges = (f: Frame) => {
    const c = cols(f.w, money);
    const stops = f.x + c.cause + c.stops - 4, minutes = stops + c.minutes, share = minutes + c.share;
    const labour = share + c.labour, contribution = f.x + f.w;
    return { stops, minutes, share, labour, contribution };
  };
  const header: Row = {
    h: () => 22,
    draw: (f, y) => {
      const e = edges(f);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('CAUSE', f.x, y + 17);
      f.doc.text('STOPS', e.stops, y + 17, { align: 'right' });
      f.doc.text('MINUTES', e.minutes, y + 17, { align: 'right' });
      f.doc.text('SHARE', e.share, y + 17, { align: 'right' });
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
      if (r.share) f.doc.text(r.share, e.share, ty, { align: 'right' });
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
    ...(o.head === false ? [] : [text({ text: t.head, size: SIZE.tiny + 1, colour: INK2, after: 3 })]),
    /* the total lost always — "Lost 0 min" on a shift that made its rate is a fact too */
    rows({ header, rows: [...body, foot], after: 's' }),
    /* the contribution's honesty, under the table it qualifies */
    ...(money.contribution ? [text({ text: 'Lost contribution is the packs not made at the rate × the contribution a pack — lost only if it cannot be made up.', size: SIZE.tiny, colour: MUTED, after: 8 })] : []),
  ];
}

/** THE WATERFALL ON PAPER — drawn as the screen draws it (screens/LossesScreen
 *  Waterfall): a row per bar, planned at the top, each loss stepping down from
 *  where the one before left off, made at the foot; the minutes on the right.
 *  What nobody logged hatched grey; the rest amber only over a tenth of the
 *  loss; nothing green. */
export function lossFallBlock(f: LossFigures): Block | undefined {
  if (!f.enough) return undefined;
  const RH = 14;
  const n = f.bars.length + 2;
  return {
    height: () => n * RH + 8,
    draw: (fr, y) => {
      const d = fr.doc;
      const planned = f.plannedMin ?? 0, rate = f.rate ?? 1;
      const madeMin = Math.min(planned, (f.made ?? 0) / rate);
      const top = Math.max(planned, 1);
      const RL = Math.min(118, fr.w * 0.36), RR = 44;
      const x = (v: number) => fr.x + RL + (Math.max(0, v) / top) * (fr.w - RL - RR);
      const label = (t: string, yy: number, colour = INK2, bold = false) => { font(d, 7.8, bold ? 'bold' : 'normal', colour); d.text(wrap(d, t, RL - 6, 7.8, bold ? 'bold' : 'normal')[0] ?? '', fr.x, yy); };
      const value = (t: string, yy: number, colour = INK) => { font(d, 7.8, 'bold', colour); d.text(t, fr.x + fr.w, yy, { align: 'right' }); };
      const frame = (from: number, to: number, yy: number) => { d.setFillColor('#edf1f1'); d.setDrawColor('#c7d1d2'); d.setLineWidth(0.5); d.rect(x(from), yy, Math.max(0.8, x(to) - x(from)), RH - 7, 'FD'); };
      label('Planned', y + RH / 2 + 3, INK, true); frame(0, planned, y + 3.5); value(minWords(planned), y + RH / 2 + 3);
      let level = planned;
      f.bars.forEach((b, i) => {
        const from = level, to = Math.max(0, level - b.min);
        level = to;
        const yy = y + (i + 1) * RH;
        const hatch = b.kind === 'performance' || b.kind === 'short';
        const amber = !!b.abnormal;
        label(b.label === 'Slow running and short stops' ? 'Slow + short stops' : b.label, yy + RH / 2 + 3, amber ? AMBER : INK2, amber);
        d.setDrawColor('#78858a'); d.setLineWidth(0.4); d.setLineDashPattern([1.5, 1.5], 0);
        d.line(x(from), yy - RH + 3.5, x(from), yy + 3.5); d.setLineDashPattern([], 0);
        const bx = x(to), bw = Math.max(1.2, x(from) - x(to)), by = yy + 3.5, bh = RH - 7;
        if (hatch) {
          d.setFillColor('#eef1f5'); d.setDrawColor('#a7afbd'); d.setLineWidth(0.5); d.rect(bx, by, bw, bh, 'FD');
          d.setLineWidth(0.4);
          /* hatched: lines at 45°, each clipped to the bar */
          for (let k = 3; k < bw + bh; k += 3) {
            let x1 = bx + k, y1 = by + bh, x2 = bx + k - bh, y2 = by;
            if (x1 > bx + bw) { y1 -= x1 - (bx + bw); x1 = bx + bw; }
            if (x2 < bx) { y2 += bx - x2; x2 = bx; }
            if (y1 > y2) d.line(x1, y1, x2, y2);
          }
        } else { d.setFillColor(amber ? AMBER : '#3c474c'); d.rect(bx, by, bw, bh, 'F'); }
        value(minWords(b.min), yy + RH / 2 + 3, amber ? AMBER : INK);
      });
      const yy = y + (n - 1) * RH;
      label(`Made · ${packs(f.made ?? 0)}`, yy + RH / 2 + 3, INK, true); frame(0, madeMin, yy + 3.5); value(minWords(madeMin), yy + RH / 2 + 3);
    },
  };
}
