import { matchesMethodTool } from './methodTools';
/* The dashboard model for a project, read the way the page and the paper both need it (lib/methodDashboard). */
import { useEffect, useState } from 'react';
import { listStudies, listTestItems, listPaceTodos, onDataChange } from '../../db';
import type { ProjectMethod } from '../../lib/methods';
import { methodDashboard, type DashIn, type Dashboard, type DashOwed } from '../../lib/methodDashboard';
import type { ToolStudy } from '../../lib/study';
import type { StudyContext } from '../../lib/studyLinks';
import { todayISO } from '../../lib/weeks';
import { methodProjectRows } from './projectActions';
import { howTool, openable } from './methodTools';

export const readsOf = (id: string): ToolStudy['tool'] | undefined => {
  const t = openable(howTool(id));
  return t?.reads && t.reads !== 'standard' && t.reads !== 'video' ? (t.reads as ToolStudy['tool']) : undefined;
};
export const nameOf = (id: string): string | undefined => { const h = howTool(id); return h.how === 'unknown' ? undefined : h.entry.name; };

export function dashboardOf(method: ProjectMethod, answers: Record<string, string>, studies: readonly ToolStudy[], owed: readonly DashOwed[], ctx?: StudyContext): Dashboard {
  const in_: DashIn = { method, answers, studies, owed, today: todayISO(), readsOf, nameOf, matches: matchesMethodTool, ...(ctx ? { ctx } : {}) };
  return methodDashboard(in_);
}

/** The project's studies and its own actions, kept up to date as the data moves. */
export function useProjectEvidence(projectId: string): { studies: ToolStudy[]; owed: DashOwed[] } | null {
  const [got, setGot] = useState<{ id: string; studies: ToolStudy[]; owed: DashOwed[] } | null>(null);
  useEffect(() => {
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      const [studies, items, actions] = await Promise.all([listStudies(projectId), listTestItems(projectId), listPaceTodos(projectId)]);
      if (request === generation) setGot({ id: projectId, studies, owed: methodProjectRows(items, actions) });
    };
    void load();
    const off = onDataChange(load);
    return () => { generation++; off(); };
  }, [projectId]);
  return got?.id === projectId ? got : null;
}
