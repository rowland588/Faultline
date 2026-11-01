/* A METHOD'S PAPERS (docs/METHODS.md §16) — what Report ▾ offers on the project's method page, made from the method's own answers by
 * the report engine (src/lib/report). One entry a method; each paper is named for what it is. Empty until a method has one. */
import type { MethodKey } from '../../lib/methods';
import { listTestItems } from '../../db';
import { getProject } from '../../db/projects';

export interface MethodPaper {
  /** What it is: "A3 on one page". */
  label: string;
  /** Who it is for, or what it holds. */
  for?: string;
  /** Make and download it for this project. */
  make: (projectId: string) => Promise<void>;
}
/** A method's answers, by field id (the same read the board makes). */
const answersOf = async (projectId: string, method: MethodKey): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const i of await listTestItems(projectId)) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith(`method:${method}:`)) out[i.testId.split(':').slice(2).join(':')] = i.what;
  return out;
};
export const PAPERS: Partial<Record<MethodKey, readonly MethodPaper[]>> = {
  pdca: [{
    label: 'PDCA cycle record', for: 'Every cycle, Plan to Act, as written',
    make: async projectId => {
      const [{ savePdcaPdf }, { todayISO }, project, answers] = await Promise.all([import('../../lib/report/pdcaPaper'), import('../../lib/weeks'), getProject(projectId), answersOf(projectId, 'pdca')]);
      await savePdcaPdf({ project: project?.name ?? 'Project', printed: todayISO(), answers });
    },
  }],
};
