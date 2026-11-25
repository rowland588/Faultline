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

import { worksheetAnswers } from './worksheetActions';
import { getProject, listStudies, listTestItems, listPaceTodos } from '../../db';
import { methodAnswerItems, methodAnswerValues } from '../../lib/methodSheet';
import { insertionsOf } from './shapes/dmaicModel';
/** DMAIC's Charter: the charter and the five phase reviews, with what the project's tools say (lib/report/charterPaper). */
async function makeCharter(projectId: string): Promise<void> {
  const [project, rows, studies] = await Promise.all([getProject(projectId), listTestItems(projectId), listStudies(projectId)]);
  const answers = methodAnswerValues(methodAnswerItems(rows, projectId, 'dmaic'));
  const evidence = insertionsOf(studies).filter(i => i.says).map(i => ({ tool: `${i.toolName} — ${i.question}`, says: `${i.name}: ${i.says}` }));
  const { saveCharterPdf } = await import('../../lib/report/charterPaper');
  await saveCharterPdf({ project: project?.name ?? 'This project', printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), answers, evidence });
}

/** The A3: the project's answers and the latest studies it already holds, read the way the board reads them, laid on one A3. */
const makeA3 = async (projectId: string): Promise<void> => {
  const [{ getProject, listStudies }, { a3Sheet, evidencePair }, { studyLine, studyTitle }, { saveA3Pdf }, { todayISO }] = await Promise.all([
    import('../../db'), import('./shapes/a3Model'), import('../../lib/studyLinks'), import('../../lib/report/a3Paper'), import('../../lib/weeks'),
  ]);
  const [project, answers, studies] = await Promise.all([getProject(projectId), answersOf(projectId, 'a3'), listStudies(projectId)]);
  const pair = evidencePair(studies);
  const ev = (s: (typeof studies)[number] | undefined) => (s ? { title: studyTitle(s), says: studyLine(s, { studies }).text } : undefined);
  const cur = ev(pair.current), fol = ev(pair.followup);
  const { loadCauses } = await import('./shapes/a3Causes');
  const causes = await loadCauses(projectId);
  await saveA3Pdf({ project: project?.name ?? 'Project', printed: todayISO(), sheet: a3Sheet(answers, { ...(cur ? { current: cur } : {}), ...(fol ? { followup: fol } : {}), causes }) });
};

/** A method's answers, by field id (the same read the board makes). */
const answersOf = async (projectId: string, method: MethodKey): Promise<Record<string, string>> => {
  const [items, steps] = await Promise.all([listTestItems(projectId), method === 'a3' || method === 'eight-d' ? listPaceTodos(projectId) : []]);
  return worksheetAnswers(method, methodAnswerValues(methodAnswerItems(items, projectId, method)), steps);
};

export const PAPERS: Partial<Record<MethodKey, readonly MethodPaper[]>> = {
  kata: [{
    label: 'Kata storyboard', for: 'The learner’s board: challenge, conditions, obstacles, every experiment and the five coaching questions.',
    make: async projectId => {
      const [{ getProject, listTestItems }, { saveKataPdf }, { todayISO }, { writtenAtOf }] = await Promise.all([import('../../db'), import('../../lib/report/kataPaper'), import('../../lib/weeks'), import('../../lib/kataBoard')]);
      const [project, items] = await Promise.all([getProject(projectId), listTestItems(projectId)]);
      const answers = methodAnswerValues(methodAnswerItems(items, projectId, 'kata'));
      const today = todayISO();
      await saveKataPdf({ project: project?.name ?? 'Project', printed: today, answers, todayISO: today, writtenAt: writtenAtOf(items) });
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
      const [{ getProject, listTestItems }, { loadTocRecords }, { tocPaperIn, saveTocPdf }, { todayISO }] = await Promise.all([
        import('../../db'), import('./shapes/toc'), import('./shapes/tocPaper'), import('../../lib/weeks')]);
      const [project, items, rec] = await Promise.all([getProject(projectId), listTestItems(projectId), loadTocRecords(projectId)]);
      const answers = methodAnswerValues(methodAnswerItems(items, projectId, 'toc'));
      await saveTocPdf(tocPaperIn(project?.name ?? 'Project', todayISO(), answers, rec));
    },
  }],
  'kaizen-event': [{
    label: 'Kaizen event report', for: 'the charter, the week day by day and the 30-day check',
    make: async projectId => {
      const [{ saveKaizenPdf }, { todayISO }, p, answers] = await Promise.all([import('../../lib/report/kaizenPaper'), import('../../lib/weeks'), getProject(projectId), answersOf(projectId, 'kaizen-event')]);
      const today = todayISO();
      await saveKaizenPdf({ project: p?.name ?? 'Project', printed: today, today, answers });
    },
  }],
  'eight-d': [{ label: '8D report', for: 'The customer: D0 to D8, is / is not side by side, each discipline’s state in words', make: async projectId => {
    const [{ saveEightDPdf }, { todayISO }, pr, answers] = await Promise.all([import('../../lib/report/eightDPaper'), import('../../lib/weeks'), getProject(projectId), answersOf(projectId, 'eight-d')]);
    await saveEightDPdf({ project: pr?.name ?? '8D', printed: todayISO(), answers });
  } }],
};
