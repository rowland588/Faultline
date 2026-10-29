import type { ToolStudy } from '../study';
import { rows, text, type Row } from './blocks';
import { leanHead } from './lean';
import type { Block } from './flow';
import { studyScored } from '../../tools/scored/scored';

export function scoredPaperBlocks(s: ToolStudy): Block[] {
  const x = studyScored(s);
  if (!x?.result) return [text({ text: 'Nothing scored yet.' })];
  const r = x.result;
  const ranked = 'ok' in x.ranked ? x.ranked.ok : [];
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
