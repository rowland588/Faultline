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

import { listTestItems } from '../../db';
import { getProject } from '../../db/projects';
/** A method's answers, by field id (the same read the board makes). */
const answersOf = async (projectId: string, method: MethodKey): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const i of await listTestItems(projectId)) if (i.kind === 'note' && !i.deletedAt && i.testId.startsWith(`method:${method}:`)) out[i.testId.split(':').slice(2).join(':')] = i.what;
  return out;
};

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
  dmaic: [{ label: 'Charter', for: 'The charter and the five phase reviews, for the sponsor.', make: makeCharter }],
  a3: [{ label: 'A3 on one page', for: 'The whole story on one sheet, for the site meeting and the people who must agree it', make: makeA3 }],
  pdca: [{
    label: 'PDCA cycle record', for: 'Every cycle, Plan to Act, as written',
    make: async projectId => {
      const [{ savePdcaPdf }, { todayISO }, project, answers] = await Promise.all([import('../../lib/report/pdcaPaper'), import('../../lib/weeks'), getProject(projectId), answersOf(projectId, 'pdca')]);
      await savePdcaPdf({ project: project?.name ?? 'Project', printed: todayISO(), answers });
    },
  }],
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
