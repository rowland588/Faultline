/* WALK ON THIS MAP — a spaghetti diagram started from a product's Line standard (FC-004 part 3, knowledge/specs/FC-004-spaghetti-board.md
 * scope 6). The standard's people, its rectangles (as areas) and its icons are copied onto a new board with a note of where they came
 * from; the standard itself is not touched. Its picture, if it has one, is not carried — the board is plain, and says so. */
import { putStudy } from '../../db';
import { now, uid } from '../../lib/ids';
import type { ToolStudy } from '../../lib/study';
import { studyHref } from '../../lib/studyLinks';
import { nav } from '../../state/useRoute';
import { boardOf, type Standard } from '../linestandard/standard';
import { startInputs } from '../calc/calc';
import { calcByKey } from '../calc/registry';
import { fromStandardMarks, writeBoard } from './board';

export async function walkOnMap(s: Standard): Promise<void> {
  const def = calcByKey('spaghetti-walkers');
  if (!def) return;
  const { marks } = fromStandardMarks(s.marks);
  const t = now();
  const study: ToolStudy = {
    id: uid(), tool: 'calc', name: `Walks on ${s.product}`,
    ...(s.workspaceId ? { workspaceId: s.workspaceId } : {}), ...(s.projectId ? { projectId: s.projectId } : {}),
    agreed: { calc: { key: def.key, inputs: { ...startInputs(def), board: writeBoard({ shape: boardOf(s), marks, walks: [], from: { standard: s.id, product: s.product } }) } } },
    facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t,
  };
  await putStudy(study);
  nav(studyHref(study));
}
