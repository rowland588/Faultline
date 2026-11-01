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
  toc: [{
    label: 'Constraint review', for: 'the five focusing steps, read from the line’s own numbers',
    make: async projectId => {
      const [{ getProject, listTestItems }, { loadTocRecords }, { tocPaperIn, saveTocPdf }, { isMethodAnswer }, { todayISO }] = await Promise.all([
        import('../../db'), import('./shapes/toc'), import('./shapes/tocPaper'), import('../../lib/methodSheet'), import('../../lib/weeks')]);
      const [project, items, rec] = await Promise.all([getProject(projectId), listTestItems(projectId), loadTocRecords(projectId)]);
      const answers: Record<string, string> = {};
      for (const i of items) if (i.kind === 'note' && !i.deletedAt && isMethodAnswer(i.testId) && i.testId.startsWith('method:toc:')) answers[i.testId.split(':').slice(2).join(':')] = i.what;
      await saveTocPdf(tocPaperIn(project?.name ?? 'Project', todayISO(), answers, rec));
    },
  }],
};
