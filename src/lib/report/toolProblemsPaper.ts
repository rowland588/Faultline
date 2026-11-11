/* THE PROBLEMS A TOOL RECORD HOLDS, ON ITS PAPER (docs/TOOL-PROBLEMS.md — Rowland, 11 November: "it also will be held inside the tool itself").
 *
 * Under any tool's own blocks, on the one tail every tool's paper already ends with (studiesPdf notesTail), only when it holds some: *Problems raised
 * here*, the whole record's first, then each part's under that part's name (a workstation's, a station's) — each problem's words, then its priority,
 * whose, by when and where it stands, a late one in red with its word. A closed one is kept, said Closed. The problems are read once before the paper
 * is poured (preloadToolProblems), so the tail itself is synchronous like the rest of the paper. */
import type { ToolStudy } from '../study';
import type { Snag } from '../../snag/types';
import { listAllSnags } from '../../db';
import { partOn, problemLine, problemStands, problemsOn } from '../../snag/toolLink';
import { partName } from '../toolPart';
import { DANGER, INK, INK2 } from '../reportKit';
import { SIZE, text } from './blocks';
import { leanHead } from './lean';
import type { Block } from './flow';

let held: Snag[] = [];

/** Read the problems before the paper is poured; a device that cannot read them prints none rather than failing the paper. */
export async function preloadToolProblems(): Promise<void> {
  held = await listAllSnags().catch(() => []);
}

/** For a test: the problems the tail reads. */
export const setHeldProblems = (list: Snag[]): void => { held = list; };

/** Everything a record's problems print, grouped by the part they are about — nothing when it holds none. */
export function problemsTail(s: ToolStudy, now = Date.now()): Block[] {
  const mine = problemsOn(held, s.id);
  if (!mine.length) return [];
  const open = mine.filter(p => p.status !== 'closed').length;
  const parts = [...new Set(mine.map(p => partOn(p, s.id)))].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : partName(s, a).localeCompare(partName(s, b))));
  const out: Block[] = [leanHead('Problems raised here', `${open} open${mine.length > open ? ` · ${mine.length - open} closed` : ''}`)];
  for (const part of parts) {
    if (part) out.push(text({ text: partName(s, part), size: SIZE.h2, style: 'bold', before: 4, after: 2 }));
    for (const p of mine.filter(x => partOn(x, s.id) === part)) {
      out.push(text({ text: p.problem.trim() || 'A problem with no words yet', size: SIZE.body, style: 'bold', colour: INK, indent: 10, bullet: '•', after: 1 }));
      out.push(text({ text: problemLine(p, now), size: SIZE.small, colour: problemStands(p, now).red ? DANGER : INK2, indent: 10 }));
    }
  }
  return out;
}
