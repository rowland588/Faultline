/* A PROJECT'S ACTIONS, READ (lib/projectActions; docs/PROJECTS.md, P3) —
 * from the inputs the control room reads every project with (lib/useJobInputs),
 * the owed rows its Needs you is made of (lib/portfolio criticalItems,
 * riskItems, jobItems; pacedOwed), the register's problems taken for it, and
 * what was done, each on the day it was done. Nothing is worked out twice:
 * late here is late on the band, the rail and the control room. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listWorkspaces, onDataChange } from '../db';
import type { Project } from '../types';
import { useJobInputs } from './useJobInputs';
import { criticalItems, jobItems, pacedOwed, riskItems, type JobItem } from './portfolio';
import { isSettled, live } from './testing';
import { projectActions, type DoneThing, type ProjectAction, type RegisterProblem } from './projectActions';
import { todayISO } from './weeks';

const isoOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface ProjectActionsRead { rows: ProjectAction[]; done: DoneThing[]; today: string }

export function useProjectActions(project: Project | undefined): ProjectActionsRead | null {
  const list = useMemo(() => (project ? [project] : []), [project]);
  const inputs = useJobInputs(list);
  const [register, setRegister] = useState<RegisterProblem[] | null>(null);
  const [closed, setClosed] = useState<DoneThing[]>([]);
  useEffect(() => {
    let alive = true;
    if (!project) return;
    const load = () => void Promise.all([listAllSnags(), listWorkspaces()]).then(([snags, ws]) => {
      if (!alive) return;
      const name = new Map(ws.map(w => [w.id, w.name]));
      const mine = snags.filter(s => s.projectId === project.id && !s.deletedAt);
      setRegister(mine.map(s => ({ id: s.id, problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, status: s.status,
        projectId: s.projectId, deletedAt: s.deletedAt, archivedAt: s.archivedAt, sent: s.sent, line: name.get(s.workspaceId) })));
      setClosed(mine.filter(s => s.closedAt != null).map(s => ({ what: s.problem, on: isoOf(s.closedAt as number) })));
    });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [project]);

  return useMemo(() => {
    if (!project || !inputs || !register) return null;
    const today = todayISO();
    const gate = inputs.gate.find(j => j.project.id === project.id);
    const paced = inputs.paced.find(j => j.project.id === project.id);
    let owed: JobItem[] = [];
    const done: DoneThing[] = [...closed];
    if (gate) {
      owed = [...criticalItems(gate), ...riskItems(gate), ...jobItems(gate, today)];
      for (const t of live(gate.tests)) if (isSettled(t) && t.ranOn) done.push({ what: t.title, on: t.ranTo ?? t.ranOn });
      for (const i of live(gate.items)) if (i.kind === 'next' && i.doneAt != null) done.push({ what: i.what, on: isoOf(i.doneAt) });
    } else if (paced) {
      owed = pacedOwed(paced, today);
      for (const s of paced.steps) if (s.state === 'done' && s.doneOn) done.push({ what: s.what, on: s.doneOn });
    }
    return { rows: projectActions(owed, register, project.id, today), done, today };
  }, [project, inputs, register, closed]);
}
