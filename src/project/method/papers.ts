/* A METHOD'S PAPERS (docs/METHODS.md §16) — what Report ▾ offers on the project's method page, made from the method's own answers by
 * the report engine (src/lib/report). One entry a method; each paper is named for what it is. Empty until a method has one. */
import { methodByKey, type MethodKey } from '../../lib/methods';
import { workInMethodSection } from './phaseWork';

export interface MethodPaper {
  /** What it is: "A3 on one page". */
  label: string;
  /** Who it is for, or what it holds. */
  for?: string;
  /** Make and download it for this project. */
  make: (projectId: string) => Promise<void>;
}

import { worksheetAnswers } from './worksheetActions';
import { getProject, listStudies, listTestItems, listPaceTodos, listStandards } from '../../db';
import { methodAnswerItems, methodAnswerValues } from '../../lib/methodSheet';
import { dmaicEvidence } from './dmaicEvidence';
/** DMAIC's Charter: the charter and the five phase reviews, with what the project's tools say (lib/report/charterPaper). */
async function makeCharter(projectId: string): Promise<void> {
  const [project, rows, studies, standards] = await Promise.all([getProject(projectId), listTestItems(projectId), listStudies(projectId), listStandards(projectId)]);
  const answers = methodAnswerValues(methodAnswerItems(rows, projectId, 'dmaic'));
  const { loadMethodStudyContext } = await import('./reportData');
  const ctx = await loadMethodStudyContext(studies, standards);
  const evidence = dmaicEvidence(projectId, rows, studies, ctx).map(r => ({ tool: `${r.phase} · ${r.label}`, says: r.value }));
  const { saveCharterPdf } = await import('../../lib/report/charterPaper');
  await saveCharterPdf({ project: project?.name ?? 'This project', printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), answers, evidence });
}

async function worksheetPaper(projectId: string, methodKey: 'a3' | 'eight-d') {
  const [project, rows, todos, studies] = await Promise.all([
    getProject(projectId), listTestItems(projectId), listPaceTodos(projectId), listStudies(projectId),
  ]);
  const method = methodByKey(methodKey)!;
  const answers = worksheetAnswers(methodKey, methodAnswerValues(methodAnswerItems(rows, projectId, methodKey)), todos);
  return { project, answers, method, studiesFor: (section: string) => workInMethodSection(method, section, rows, studies).studies };
}

const makeA3 = async (projectId: string): Promise<void> => {
  const [{ project, answers, studiesFor }, { a3Sheet, evidencePair }, { studyLine, studyTitle }, { saveA3Pdf }, { todayISO }, causes] = await Promise.all([
    worksheetPaper(projectId, 'a3'), import('./shapes/a3Model'), import('../../lib/studyLinks'), import('../../lib/report/a3Paper'), import('../../lib/weeks'),
    import('./shapes/a3Causes').then(m => m.loadCauses(projectId)),
  ]);
  const current = studiesFor('Current condition'), followup = studiesFor('Plan and follow-up');
  const pair = evidencePair(current, followup);
  const ev = (study: typeof pair.current, studies: typeof current) => study ? { title: studyTitle(study), says: studyLine(study, { studies }).text } : undefined;
  await saveA3Pdf({ project: project?.name ?? 'Project', printed: todayISO(), sheet: a3Sheet(answers, { current: ev(pair.current, current), followup: ev(pair.followup, followup), causes }) });
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
      const [{ loadMethodReport }, { saveKataPdf }, { writtenAtOf }] = await Promise.all([
        import('./reportData'), import('../../lib/report/kataPaper'), import('../../lib/kataBoard'),
      ]);
      const data = await loadMethodReport(projectId);
      if (!data || data.method.key !== 'kata') throw new Error('The Kata storyboard is unavailable.');
      await saveKataPdf({ project: data.projectName, printed: data.today, todayISO: data.today, answers: data.answers,
        writtenAt: writtenAtOf(data.items), findings: data.report.dash.findings });
    },
  }],
  dmaic: [{ label: 'Charter', for: 'The charter and the five phase reviews, for the sponsor.', make: makeCharter }],
  a3: [{ label: 'A3 on one page', for: 'The whole story on one sheet, for the site meeting and the people who must agree it', make: makeA3 }],
  pdca: [{
    label: 'PDCA cycle record', for: 'Every cycle, Plan to Act, as written',
    make: async projectId => {
      const [{ loadMethodReport }, { savePdcaPdf }] = await Promise.all([import('./reportData'), import('../../lib/report/pdcaPaper')]);
      const data = await loadMethodReport(projectId);
      if (!data || data.method.key !== 'pdca') throw new Error('The PDCA cycle record is unavailable.');
      await savePdcaPdf({ project: data.projectName, printed: data.today, answers: data.answers, findings: data.report.dash.findings });
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
    const [{ saveEightDPdf }, { todayISO }, { project, method, answers, studiesFor }, { studyTitle, studyLine }] = await Promise.all([
      import('../../lib/report/eightDPaper'), import('../../lib/weeks'), worksheetPaper(projectId, 'eight-d'), import('../../lib/studyLinks'),
    ]);
    const evidence = method.sections.flatMap(section => {
      const studies = studiesFor(section.name).filter(s => !['talk', 'story', 'brain', 'department', 'notebook'].includes(s.tool)).sort((a, b) => b.updatedAt - a.updatedAt);
      return studies.map(study => ({ section: section.name, title: studyTitle(study), finding: studyLine(study, { studies }).text }));
    });
    await saveEightDPdf({ project: project?.name ?? '8D', printed: todayISO(), answers, evidence });
  } }],
};
