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
  kata: [{
    label: 'Kata storyboard', for: 'The learner’s board: challenge, conditions, obstacles, every experiment and the five coaching questions.',
    make: async projectId => {
      const [{ getProject, listTestItems }, { answerOf }, { saveKataPdf }, { todayISO }] = await Promise.all([import('../../db'), import('../../lib/methodSheet'), import('../../lib/report/kataPaper'), import('../../lib/weeks')]);
      const [project, items] = await Promise.all([getProject(projectId), listTestItems(projectId)]);
      const answers: Record<string, string> = {};
      for (const i of items) { const a = i.kind === 'note' && !i.deletedAt ? answerOf(i.testId) : undefined; if (a?.method === 'kata') answers[a.field] = i.what; }
      const today = todayISO();
      await saveKataPdf({ project: project?.name ?? 'Project', printed: today, answers, todayISO: today });
    },
  }],
};
