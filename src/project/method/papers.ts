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
  'kaizen-event': [{
    label: 'Kaizen event report', for: 'the charter, the week day by day and the 30-day check',
    make: async projectId => {
      const [{ getProject, listTestItems }, { saveKaizenPdf }, { todayISO }] = await Promise.all([import('../../db'), import('../../lib/report/kaizenPaper'), import('../../lib/weeks')]);
      const p = await getProject(projectId);
      const answers: Record<string, string> = {};
      for (const i of await listTestItems(projectId)) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith('method:kaizen-event:')) answers[i.testId.split(':').slice(2).join(':')] = i.what;
      const today = todayISO();
      await saveKaizenPdf({ project: p?.name ?? 'Project', printed: today, today, answers });
    },
  }],
};
