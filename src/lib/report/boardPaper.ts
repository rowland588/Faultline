import type { ToolStudy } from '../study';
import { text } from './blocks';
import { leanHead } from './lean';
import type { Block } from './flow';
import { studyBoard } from '../../tools/board/board';

export function boardPaperBlocks(s: ToolStudy, siblings: ToolStudy[], now: number): Block[] {
  const x = studyBoard(s, siblings, now);
  if (!x?.result) return [text({ text: 'Nothing to show yet — open on a line with PM and reliability records.' })];
  const r = x.result;
  return [
    leanHead(r.verdict, r.sentence.slice(0, 80)),
    ...r.tiles.map(t => text({ text: `${t.k}: ${t.v} — ${t.of ?? ''}` })),
    text({ text: r.sentence }),
    text({ text: 'What this does not say' }),
    ...r.caveats.map(c => text({ text: `· ${c}` })),
    text({ text: r.closing }),
  ];
}
