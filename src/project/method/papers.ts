/* A METHOD'S PAPERS (docs/METHODS.md §16) — what Report ▾ offers on the project's method page, made from the method's own answers by
 * the report engine (src/lib/report). One entry a method; each paper is named for what it is. Empty until a method has one. */
import type { MethodKey } from '../../lib/methods';

export interface MethodPaper {
  /** What it is: "A3 on one page". */
  label: string;
  /** Who it is for, or what it holds. */
  for?: string;
  /** Make and download it for this project. */
  make: (projectId: string) => Promise<void>;
}
import { getProject, listStudies, listTestItems } from '../../db';
import { answerOf } from '../../lib/methodSheet';
import { insertionsOf } from './shapes/dmaicModel';

/** DMAIC's Charter: the charter and the five phase reviews, with what the project's tools say (lib/report/charterPaper). */
async function makeCharter(projectId: string): Promise<void> {
  const [project, rows, studies] = await Promise.all([getProject(projectId), listTestItems(projectId), listStudies(projectId)]);
  const answers: Record<string, string> = {};
  for (const i of rows) { if (i.kind !== 'note' || i.deletedAt) continue; const a = answerOf(i.testId); if (a?.method === 'dmaic') answers[a.field] = i.what; }
  const evidence = insertionsOf(studies).filter(i => i.says).map(i => ({ tool: `${i.toolName} — ${i.question}`, says: `${i.name}: ${i.says}` }));
  const { saveCharterPdf } = await import('../../lib/report/charterPaper');
  await saveCharterPdf({ project: project?.name ?? 'This project', printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), answers, evidence });
}

export const PAPERS: Partial<Record<MethodKey, readonly MethodPaper[]>> = {
  dmaic: [{ label: 'Charter', for: 'The charter and the five phase reviews, for the sponsor.', make: makeCharter }],
};
