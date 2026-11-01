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
/** The A3: the project's answers and the latest studies it already holds, read the way the board reads them, laid on one A3. */
const makeA3 = async (projectId: string): Promise<void> => {
  const [{ getProject, listStudies, listTestItems }, { a3Sheet, evidencePair }, { studyLine, studyTitle }, { saveA3Pdf }, { todayISO }] = await Promise.all([
    import('../../db'), import('./shapes/a3Model'), import('../../lib/studyLinks'), import('../../lib/report/a3Paper'), import('../../lib/weeks'),
  ]);
  const [project, items, studies] = await Promise.all([getProject(projectId), listTestItems(projectId), listStudies(projectId)]);
  const answers: Record<string, string> = {};
  for (const i of items) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith('method:a3:')) answers[i.testId.split(':').slice(2).join(':')] = i.what;
  const pair = evidencePair(studies);
  const ev = (s: (typeof studies)[number] | undefined) => (s ? { title: studyTitle(s), says: studyLine(s, { studies }).text } : undefined);
  const cur = ev(pair.current), fol = ev(pair.followup);
  await saveA3Pdf({ project: project?.name ?? 'Project', printed: todayISO(), sheet: a3Sheet(answers, { ...(cur ? { current: cur } : {}), ...(fol ? { followup: fol } : {}) }) });
};

export const PAPERS: Partial<Record<MethodKey, readonly MethodPaper[]>> = {
  a3: [{ label: 'A3 on one page', for: 'The whole story on one sheet, for the site meeting and the people who must agree it', make: makeA3 }],
};
