/* A PROJECT'S ACTIONS, READ (lib/projectActions; docs/PROJECTS.md, P3) —
 * from the one project reader (lib/projectRead, docs/STEADY.md S2): the owed
 * rows its Needs you is made of, the register's problems taken for it, its
 * own actions, and what was done, each on the day it was done. Nothing is
 * worked out twice: late here is late on the band, the rail, the Journey
 * and the control room. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listPaceTodos, listWorkspaces, onDataChange, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import { useJobInputs } from './useJobInputs';
import { everyAction, projectActions, type DoneThing, type ProjectAction, type RegisterProblem } from './projectActions';
import { owedAndDone, registerRow, useProjectRead } from './projectRead';
import { todayISO } from './weeks';
import { liveProductionLines } from './lines';

export interface ProjectActionsRead { rows: ProjectAction[]; done: DoneThing[]; today: string }

/** A PROJECT'S ACTIONS — the reader's owed rows and done things, so Needs you,
 *  Actions, the Journey and the control room count one thing. */
export function useProjectActions(project: Project | undefined): ProjectActionsRead | null {
  const read = useProjectRead(project);
  return useMemo(() => (read ? { rows: projectActions(read.owed, read.register, read.project.id, read.today), done: read.done, today: read.today } : null), [read]);
}

/** EVERY PROJECT'S ACTIONS AND EVERY LINE'S OWN PROBLEMS — the control room's
 *  Actions (docs/PROJECTS.md, P4): each project read by the same rule as its
 *  own Actions page (lib/projectRead owedAndDone), then the register's
 *  problems on a line with no project. */
export function useEveryAction(projects: Project[]): ProjectActionsRead | null {
  const inputs = useJobInputs(projects);
  const [register, setRegister] = useState<RegisterProblem[] | null>(null);
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
      setRegister(mine.map(s => registerRow(s, id => name.get(id))));
    });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(() => {
    if (!inputs || !register || !steps) return null;
    const today = todayISO();
    const each = projects.map(p => ({ id: p.id, name: p.name,
      ...owedAndDone(inputs.gate.find(j => j.project.id === p.id), inputs.paced.find(j => j.project.id === p.id), steps.get(p.id) ?? [], register.filter(r => r.projectId === p.id), today) }));
    return { rows: everyAction(each, register, today), done: each.flatMap(e => e.done), today };
  }, [projects, inputs, register, steps]);
}
