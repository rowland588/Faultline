import { matchesMethodTool } from './methodTools';
/* THE PROJECT REPORT'S DATA, READ ONCE (docs/METHODS.md §17) — what the page, the paper and the method page's Report ▾ all
 * build the report from: the project, what the team wrote, the studies it used (and the context their sentences and papers read),
 * what is owed, today. `loadMethodReport` reads it all; `useMethodReport` keeps it current as the data moves. */
import { useEffect, useState } from 'react';
import { getProject, getWorkspace, listAllSnags, listObservations, listPaceTodos, listStandards, listStudies, listTestItems, loadPaceLines, onDataChange } from '../../db';
import { methodByKey, methodOfProject, type ProjectMethod } from '../../lib/methods';
import { methodAnswerItems, methodAnswerValues } from '../../lib/methodSheet';
import { methodReportModel, type MethodReport } from '../../lib/methodReportModel';
import type { ToolStudy } from '../../lib/study';
import type { Standard } from '../../tools/linestandard/standard';
import type { StudyContext } from '../../lib/studyLinks';
import type { TestItem } from '../../lib/testing';
import type { Observation, Workspace } from '../../types';
import { niceDay, todayISO } from '../../lib/weeks';
import type { ReportPaperData } from '../../lib/report/methodReport';
import { loadCauses } from './shapes/a3Causes';
import { worksheetAnswers } from './worksheetActions';
import { methodProjectRows } from './projectActions';
import { METHOD_REPORT } from './report';
import { nameOf, readsOf } from './useDashboard';

export interface LoadedReport { answers: Record<string, string>; items: TestItem[]; projectName: string; method: ProjectMethod; report: MethodReport; paper: ReportPaperData; today: string }

export async function loadMethodStudyContext(studies: ToolStudy[], standards: Standard[]): Promise<StudyContext> {
  /* what the studies' sentences and papers read of their lines (as the line's combined report does) */
  const ids = [...new Set([...studies, ...standards].flatMap(s => !s.deletedAt && s.workspaceId ? [s.workspaceId] : []))];
  const [obs, ws] = await Promise.all([
    Promise.all(ids.map(id => listObservations(id))).then(x => x.flat() as Observation[]),
    Promise.all(ids.map(id => getWorkspace(id))).then(x => x.filter((w): w is Workspace => !!w)),
  ]);
  return { observations: obs, workspaces: ws, studies, standards };
}

export async function loadMethodReport(projectId: string): Promise<LoadedReport | null> {
  const project = await getProject(projectId);
  const method = project ? methodByKey(methodOfProject(project)) : undefined;
  if (!project || !method) return null;
  const [items, studies, standards, lines, steps, register, causes] = await Promise.all([listTestItems(projectId), listStudies(projectId), listStandards(projectId), loadPaceLines(projectId), listPaceTodos(projectId), listAllSnags(), method.key === 'a3' ? loadCauses(projectId) : []]);
  const answers = worksheetAnswers(method.key, methodAnswerValues(methodAnswerItems(items, projectId, method.key)), steps);
  const owed = methodProjectRows(items, steps);
  const ctx = await loadMethodStudyContext(studies, standards);
  const today = todayISO();
  const lineNames = lines.map(l => l.name?.trim()).filter((n): n is string => !!n);
  const report = methodReportModel({
    method, answers, studies, owed, today, readsOf, nameOf, matches: matchesMethodTool, ctx,
    project: { id: project.id, name: project.name, ...(project.lead ? { lead: project.lead } : {}) },
    causes, problems: register.filter(s => s.projectId === projectId && !s.archivedAt),
    line: lineNames.join(' · '),
    printed: niceDay(today, { year: true }),
  }, METHOD_REPORT[method.key]);
  return { answers, items, projectName: project.name, method, report, paper: { studies, standards, ctx }, today };
}

/** The report, current: re-read whenever the project's data moves. */
export function useMethodReport(projectId: string, retry: number): LoadedReport | null | undefined | Error {
  const [read, setRead] = useState<{ id: string; result: LoadedReport | null | Error }>();
  useEffect(() => {
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      try {
        const result = await loadMethodReport(projectId);
        if (request === generation) setRead({ id: projectId, result });
      } catch (error) {
        if (request === generation) setRead({ id: projectId, result: error instanceof Error ? error : new Error('Could not read project evidence.') });
      }
    };
    void load();
    const off = onDataChange(load);
    return () => { generation++; off(); };
  }, [projectId, retry]);
  return read?.id === projectId ? read.result : undefined;
}
