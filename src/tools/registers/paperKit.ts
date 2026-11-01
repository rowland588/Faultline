/* The paper parts the register tools share (the report engine's blocks; docs/REPORTS.md): a table whose cells wrap inside
 * their columns, and the parts a study's paper is made of. Laid out by lib/report — nothing here keeps a y. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import { font, rows, wrap, type Row } from '../../lib/report/blocks';
import type { Block, Frame } from '../../lib/report/flow';
import { INK2, LINE, MUTED, DANGER } from '../../lib/reportKit';

/** What a register tool hands the study's paper (lib/studiesPdf): the eyebrow and verdict of the band, the tiles, the body between
 *  "What it says" and the action plan, and the closing line. */
export interface RegisterPaper {
  eyebrow: string;
  verdict: { text: string; tone: LeanTone };
  tiles: LeanTile[];
  closing: { text: string; tone: LeanTone };
  body: Block[];
}

/** A table: a row as tall as its longest cell; a row marked red is drawn in the danger colour. */
export function table(header: string[], body: string[][], shares: number[], red?: (i: number) => boolean): Block {
  const LH = 9.5;
  const cells = (f: Frame, row: string[], bold: boolean) => row.map((c, i) => wrap(f.doc, c, f.w * shares[i] - 8, 8, bold ? 'bold' : 'normal'));
  const make = (row: string[], bold: boolean, isRed: boolean): Row => ({
    h: f => Math.max(...cells(f, row, bold).map(l => l.length), 1) * LH + 5,
    draw: (fr, y) => {
      let x = fr.x;
      cells(fr, row, bold).forEach((ls, i) => {
        font(fr.doc, 8, bold ? 'bold' : 'normal', bold ? MUTED : isRed ? DANGER : INK2);
        ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH));
        x += fr.w * shares[i];
      });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4);
      const h = Math.max(...cells(fr, row, bold).map(l => l.length), 1) * LH + 3;
      fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ header: make(header, true, false), rows: body.map((b, i) => make(b, false, red?.(i) ?? false)), after: 'm' });
}
