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
export const PAPERS: Partial<Record<MethodKey, readonly MethodPaper[]>> = {
  'eight-d': [{ label: '8D report', for: 'The customer: D0 to D8, is / is not side by side, each discipline’s state in words', make: async projectId => {
    const [{ getProject }, { listTestItems }, { saveEightDPdf }, { todayISO }] = await Promise.all([import('../../db/projects'), import('../../db/testing'), import('../../lib/report/eightDPaper'), import('../../lib/weeks')]);
    const [pr, items] = await Promise.all([getProject(projectId), listTestItems(projectId)]);
    const answers: Record<string, string> = {};
    for (const i of items) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith('method:eight-d:')) answers[i.testId.split(':').slice(2).join(':')] = i.what;
    await saveEightDPdf({ project: pr?.name ?? '8D', printed: todayISO(), answers });
  } }],
};
