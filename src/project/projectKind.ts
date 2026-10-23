/* ONE ANSWER PER PROJECT KIND (docs/STEADY.md, rule 4 — S2).
 *
 * Rowland, 23 October: "pick your project type — and there we have the full
 * ecosystem." Three kinds of change (CLAUDE.md, The three methods): a stage
 * gate (`commissioning` on the record, never shown under that name), a 6M
 * project (the `board` model) and a lever tree. Each says here, once, what
 * it is called, what its own work is (the rows its band counts as "still to
 * do"), where its papers are and where its report page is — so a page asks
 * the kind rather than branching on the model, and a fourth kind is one
 * more entry. Pure: nothing stored, nothing read. */
import type { Project } from '../types';
import { planModel, type PlanModel } from '../lib/planModel';

export type ProjectKind = 'stagegate' | 'sixm' | 'tree';

/** Which kind a project is — the one ask. */
export const kindOf = (p: Pick<Project, 'leverTree' | 'commissioning'>): ProjectKind => {
  const m: PlanModel = planModel(p);
  return m === 'commissioning' ? 'stagegate' : m === 'board' ? 'sixm' : 'tree';
};

/** A paper the kind has — where it is made (an address the Report ▾ opens with ?save=1). */
export interface KindPaper {
  key: string;
  label: string;
  /** Who it is for, or what it holds, in a line. */
  for: string;
  /** Its page, as nav() takes it. */
  to: (projectId: string) => string;
}

export interface KindFacts {
  kind: ProjectKind;
  /** Its word on screen — "Stage gate", "6M", "Lever tree". */
  label: string;
  /** What the band's "still to do" counts — the kind's own work, in words. */
  ownWork: string;
  /** Its report page (the status report first on it). */
  reportTo: (projectId: string) => string;
  /** Its papers, in the order the Report ▾ offers them. */
  papers: KindPaper[];
}

const journey: KindPaper = {
  key: 'journey', label: 'Journey report — this week and next',
  for: 'To whoever we report to — what we did, day by day, what is next, your commentary, the tools we are using; any other range from the Journey',
  to: id => `/project/${id}/journey`,
};

export const KINDS: Record<ProjectKind, KindFacts> = {
  stagegate: {
    kind: 'stagegate', label: 'Stage gate',
    ownWork: 'the install steps, tests, fixes and hand-over items on the plan, the materials and programs waited on',
    reportTo: id => `/project/${id}/report`,
    papers: [
      { key: 'status', label: 'Status report — 1 page', for: 'For the client — where it is, why it is not where it should be, what is being done', to: id => `/project/${id}/report` },
      { key: 'client', label: 'Client report — every detail', for: 'The full report: the gates, the plan, the fixes, who owes what', to: id => `/project/${id}/report?doc=full` },
      journey,
    ],
  },
  sixm: {
    kind: 'sixm', label: '6M',
    ownWork: 'the countermeasures on the board',
    reportTo: id => `/pace-report?project=${id}`,
    papers: [
      { key: 'status', label: 'Status report — 1 page', for: 'For the client — where the lines are, why, what is being done, who by when', to: id => `/pace-report?project=${id}` },
      { key: 'client', label: 'Client report — every detail', for: 'The gap, where the loss is, each problem beside its fishbone', to: id => `/pace-report?project=${id}&doc=full` },
      journey,
    ],
  },
  tree: {
    kind: 'tree', label: 'Lever tree',
    ownWork: 'the actions on the board',
    reportTo: id => `/pace-report?project=${id}`,
    papers: [
      { key: 'client', label: 'Client report — A3', for: 'The outcome and what has to be true for it, the numbers, the board, the walk', to: id => `/pace-report?project=${id}` },
      journey,
    ],
  },
};

/** The facts of a project's kind. */
export const kindFacts = (p: Pick<Project, 'leverTree' | 'commissioning'>): KindFacts => KINDS[kindOf(p)];
