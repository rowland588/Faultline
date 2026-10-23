/* A PROJECT'S ACTIONS, READ (lib/projectActions; docs/PROJECTS.md, P3) —
 * from the inputs the control room reads every project with (lib/useJobInputs),
 * the owed rows its Needs you is made of (lib/portfolio criticalItems,
 * riskItems, jobItems; pacedOwed), the register's problems taken for it, and
 * what was done, each on the day it was done. Nothing is worked out twice:
 * late here is late on the band, the rail and the control room. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listPaceTodos, listWorkspaces, onDataChange, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import { useJobInputs } from './useJobInputs';
import { criticalItems, jobItems, pacedItems, pacedOwed, riskItems, type JobItem } from './portfolio';
import { isSettled, live } from './testing';
import { everyAction, projectActions, type DoneThing, type ProjectAction, type RegisterProblem } from './projectActions';
import type { JobInputs } from './useJobInputs';
import { todayISO } from './weeks';
import { liveProductionLines } from './lines';

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
  /* a stage-gate project's own actions — its plans to use its tools (docs/JOURNEY.md) — are owed too */
  const [steps, setSteps] = useState<PaceTodoRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!project) return;
    const load = () => void Promise.all([listAllSnags(), listWorkspaces(), listPaceTodos(project.id)]).then(([snags, ws, todos]) => {
      if (!alive) return;
      const name = new Map(ws.map(w => [w.id, w.name]));
      const mine = snags.filter(s => s.projectId === project.id && !s.deletedAt);
      setRegister(mine.map(s => ({ id: s.id, problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, status: s.status,
        projectId: s.projectId, deletedAt: s.deletedAt, archivedAt: s.archivedAt, sent: s.sent, line: name.get(s.workspaceId) })));
      setClosed(mine.filter(s => s.closedAt != null).map(s => ({ what: s.problem, on: isoOf(s.closedAt as number) })));
      setSteps(todos);
    });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [project]);

  return useMemo(() => {
    if (!project || !inputs || !register || !steps) return null;
    const today = todayISO();
    const { owed, done } = owedOf(inputs, project.id, today, steps);
    return { rows: projectActions(owed, register, project.id, today), done: [...closed, ...done], today };
  }, [project, inputs, register, closed, steps]);
}

/** What one project owes and what it has done, from the control room's inputs. A stage-gate
 *  project's board actions (`steps` — its tool plans, docs/JOURNEY.md) are owed as a 6M project's
 *  are; a 6M project's are already in its inputs. */
function owedOf(inputs: JobInputs, id: string, today: string, steps: readonly PaceTodoRow[] = []): { owed: JobItem[]; done: DoneThing[] } {
  const gate = inputs.gate.find(j => j.project.id === id);
  const paced = inputs.paced.find(j => j.project.id === id);
  const done: DoneThing[] = [];
  if (gate) {
    for (const t of live(gate.tests)) if (isSettled(t) && t.ranOn) done.push({ what: t.title, on: t.ranTo ?? t.ranOn });
    for (const i of live(gate.items)) if (i.kind === 'next' && i.doneAt != null) done.push({ what: i.what, on: isoOf(i.doneAt) });
    for (const s of steps) if (s.state === 'done' && s.doneOn) done.push({ what: s.what, on: s.doneOn });
    const own = pacedItems({ project: gate.project, steps: [...steps], lines: [], atTarget: 0, judged: 0 }, today);
    return { owed: [...criticalItems(gate), ...riskItems(gate), ...jobItems(gate, today), ...own], done };
  }
  if (paced) {
    for (const s of paced.steps) if (s.state === 'done' && s.doneOn) done.push({ what: s.what, on: s.doneOn });
    return { owed: pacedOwed(paced, today), done };
  }
  return { owed: [], done };
}

/** EVERY PROJECT'S ACTIONS AND EVERY LINE'S OWN PROBLEMS — the control room's
 *  Actions (docs/PROJECTS.md, P4): each project read as its own Actions page
 *  reads it, then the register's problems on a line with no project. */
export function useEveryAction(projects: Project[]): ProjectActionsRead | null {
  const inputs = useJobInputs(projects);
  const [register, setRegister] = useState<RegisterProblem[] | null>(null);
  const [closed, setClosed] = useState<DoneThing[]>([]);
  /* each project's own actions — a stage-gate project's tool plans among them (docs/JOURNEY.md) */
  const [steps, setSteps] = useState<Map<string, PaceTodoRow[]> | null>(null);
  const ids = projects.map(p => p.id).join('|');
  useEffect(() => {
    let alive = true;
    const load = () => void Promise.all([listAllSnags(), listWorkspaces(), Promise.all(projects.map(p => listPaceTodos(p.id)))]).then(async ([snags, ws, todos]) => {
      /* a line's own problems are the factory's lines' — never a project's walk nor the demo line (lib/lines) */
      const lines = new Set((await liveProductionLines(ws)).map(w => w.id));
      if (!alive) return;
      setSteps(new Map(projects.map((p, i) => [p.id, todos[i]])));
      const name = new Map(ws.map(w => [w.id, w.name]));
      const mine = snags.filter(s => !s.deletedAt && (s.projectId ? true : lines.has(s.workspaceId)));
      setRegister(mine.map(s => ({ id: s.id, problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, status: s.status,
        projectId: s.projectId, deletedAt: s.deletedAt, archivedAt: s.archivedAt, sent: s.sent, line: name.get(s.workspaceId) })));
      setClosed(mine.filter(s => s.closedAt != null).map(s => ({ what: s.problem, on: isoOf(s.closedAt as number) })));
    });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(() => {
    if (!inputs || !register || !steps) return null;
    const today = todayISO();
    const each = projects.map(p => ({ id: p.id, name: p.name, ...owedOf(inputs, p.id, today, steps.get(p.id) ?? []) }));
    return { rows: everyAction(each, register, today), done: [...closed, ...each.flatMap(e => e.done)], today };
  }, [projects, inputs, register, closed, steps]);
}
