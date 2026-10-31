import type { ToolStudy } from '../study';
import { font, rows, text, wrap, type Row } from './blocks';
import { INK2, LINE, MUTED } from '../reportKit';
import { leanHead } from './lean';
import type { Block, Frame } from './flow';
import { studyScored } from '../../tools/scored/scored';
import type { ScoredTable } from '../../tools/scored/types';

/** The matrix: cells wrap inside their columns, a row as tall as its longest cell, the foot (counts, score, rank) in bold. */
function matrixTable(t: ScoredTable): Block {
  const LH = 9.5;
  const cells = (f: Frame, row: string[], bold: boolean) => row.map((c, i) => wrap(f.doc, c, f.w * t.shares[i] - 6, 8, bold ? 'bold' : 'normal'));
  const make = (row: string[], bold: boolean, rule: boolean): Row => ({
    h: f => Math.max(...cells(f, row, bold).map(l => l.length), 1) * LH + 5,
    draw: (fr, y) => {
      let x = fr.x;
      cells(fr, row, bold).forEach((ls, i) => {
        font(fr.doc, 8, bold ? 'bold' : 'normal', bold && rule ? MUTED : INK2);
        ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH));
        x += fr.w * t.shares[i];
      });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4);
      const h = Math.max(...cells(fr, row, bold).map(l => l.length), 1) * LH + 3;
      fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ header: make(t.head, true, true), rows: [...t.rows.map(r => make(r, false, false)), ...t.foot.map(r => make(r, true, false))], after: 'm' });
}

export function scoredPaperBlocks(s: ToolStudy): Block[] {
  const x = studyScored(s);
  if (!x?.result) return [text({ text: 'Nothing scored yet.' })];
  const r = x.result;
  if (x.def.matrix && x.table) {
    /* the band, the tiles, "What it says" and the closing line are the study page's own (studiesPdf); this is the matrix between them */
    return [
      leanHead('The matrix — each option against the datum', '+ better · S same · − worse than the datum'),
      matrixTable(x.table),
      ...(r.also ? [leanHead(r.also.title), ...r.also.lines.map(l => text({ text: `· ${l}`, size: 9 }))] : []),
      leanHead('What this does not say'),
      ...[...r.caveats, ...x.def.limits].map(c => text({ text: `· ${c}`, size: 9 })),
    ];
  }
  const ranked = x.ranked && 'ok' in x.ranked ? x.ranked.ok : [];
  const tableRows: Row[] = [{
    h: () => 14,
    draw: (fr, y) => {
      fr.doc.setFont('helvetica', 'bold');
      fr.doc.text('Machine', fr.x, y + 10);
      fr.doc.text('Score', fr.x + fr.w * 0.55, y + 10);
      fr.doc.text('Class', fr.x + fr.w * 0.75, y + 10);
    },
  }];
  for (const row of ranked) {
    tableRows.push({
      h: () => 12,
      draw: (fr, y) => {
        fr.doc.setFont('helvetica', 'normal');
        fr.doc.text(row.name, fr.x, y + 9);
        fr.doc.text(String(row.score), fr.x + fr.w * 0.55, y + 9);
        fr.doc.text(row.class, fr.x + fr.w * 0.75, y + 9);
      },
    });
  }
  return [
    leanHead(r.verdict, r.sentence.slice(0, 80)),
    ...r.tiles.map(t => text({ text: `${t.k}: ${t.v} — ${t.of ?? ''}` })),
    text({ text: r.sentence }),
    rows({ rows: tableRows }),
    text({ text: 'What this does not say' }),
    ...r.caveats.map(c => text({ text: `· ${c}` })),
    text({ text: r.closing }),
  ];
}
