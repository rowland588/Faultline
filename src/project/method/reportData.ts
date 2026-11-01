/* THE PROJECT REPORT'S DATA, READ ONCE (docs/METHODS.md §17) — what the page, the paper and the method page's Report ▾ all
 * build the report from: the project, what the team wrote, the studies it used (and the context their sentences and papers read),
 * what is owed, today. `loadMethodReport` reads it all; `useMethodReport` keeps it current as the data moves. */
import { useEffect, useState } from 'react';
import { getProject, getWorkspace, listObservations, listStandards, listStudies, listTestItems, loadPaceLines, onDataChange } from '../../db';
import { methodByKey, methodOfProject, type ProjectMethod } from '../../lib/methods';
import { answerOf } from '../../lib/methodSheet';
import { methodReportModel, type MethodReport, type ReportOwed } from '../../lib/methodReportModel';
import type { StudyContext } from '../../lib/studyLinks';
import type { Observation, Workspace } from '../../types';
import { niceDay, todayISO } from '../../lib/weeks';
import type { ReportPaperData } from '../../lib/report/methodReport';
import { METHOD_REPORT } from './report';
import { nameOf, readsOf } from './useDashboard';

export interface LoadedReport { projectName: string; method: ProjectMethod; report: MethodReport; paper: ReportPaperData; today: string }

export async function loadMethodReport(projectId: string): Promise<LoadedReport | null> {
  const project = await getProject(projectId);
  const method = project ? methodByKey(methodOfProject(project)) : undefined;
  if (!project || !method) return null;
  const [items, studies, standards, lines] = await Promise.all([listTestItems(projectId), listStudies(projectId), listStandards(projectId), loadPaceLines(projectId)]);
  const answers: Record<string, string> = {};
  for (const i of items) { const a = i.kind === 'note' && !i.deletedAt ? answerOf(i.testId) : undefined; if (a?.method === method.key) answers[a.field] = i.what; }
  const owed: ReportOwed[] = items.filter(i => !i.deletedAt).map(i => ({ kind: i.kind, what: i.what, ...(i.owner ? { owner: i.owner } : {}), ...(i.due ? { due: i.due } : {}), doneAt: i.doneAt ?? null, testId: i.testId }));
  /* what the studies' sentences and papers read of their lines (as the line's combined report does) */
  const ids = [...new Set(studies.filter(s => !s.deletedAt && s.workspaceId).map(s => s.workspaceId as string))];
  const [obs, ws] = await Promise.all([
    Promise.all(ids.map(id => listObservations(id))).then(x => x.flat() as Observation[]),
    Promise.all(ids.map(id => getWorkspace(id))).then(x => x.filter((w): w is Workspace => !!w)),
  ]);
  const ctx: StudyContext = { observations: obs, workspaces: ws, studies, standards };
  const today = todayISO();
  const lineNames = lines.map(l => l.name?.trim()).filter((n): n is string => !!n);
  const report = methodReportModel({
    method, answers, studies, owed, today, readsOf, nameOf, ctx,
    project: { name: project.name, ...(project.lead ? { lead: project.lead } : {}) },
    line: lineNames.join(' · '),
    printed: niceDay(today, { year: true }),
  }, METHOD_REPORT[method.key]);
  return { projectName: project.name, method, report, paper: { studies, standards, ctx }, today };
}

/** The report, current: re-read whenever the project's data moves. */
export function useMethodReport(projectId: string): LoadedReport | null | undefined {
  const [got, setGot] = useState<LoadedReport | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    const load = () => void loadMethodReport(projectId).then(r => { if (live) setGot(r); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return got;
}
