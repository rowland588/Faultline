/* A PROJECT'S ACTIONS, READ (lib/projectActions; docs/PROJECTS.md, P3) —
 * from the one project reader (lib/projectRead, docs/STEADY.md S2): the owed
 * rows its Needs you is made of, the register's problems taken for it, its
 * own actions, and what was done, each on the day it was done. Nothing is
 * worked out twice: late here is late on the band, the rail, the Journey
 * and the control room. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listPaceTodos, listWorkspaces, onDataChange, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import { loadJobInputs, useJobInputs, type JobInputs } from './useJobInputs';
import { everyAction, projectActions, type DoneThing, type ProjectAction, type RegisterProblem } from './projectActions';
import { owedAndDone, registerRow, useProjectRead } from '../project/projectRead';
import { todayISO } from './weeks';
import { liveProductionLines } from './lines';
import { useClientScope, type ClientScope } from './activeClient';

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
export function useEveryAction(projects: Project[], keep?: (r: RegisterProblem) => boolean): ProjectActionsRead | null {
  const inputs = useJobInputs(projects);
  const [register, setRegister] = useState<RegisterProblem[] | null>(null);
  /* each project's own actions — a stage-gate project's tool plans among them (docs/JOURNEY.md) */
  const [steps, setSteps] = useState<Map<string, PaceTodoRow[]> | null>(null);
  const ids = projects.map(p => p.id).join('|');
  useEffect(() => {
    let alive = true;
    const load = () => void loadActionParts(projects).then(got => {
      if (!alive) return;
      setSteps(got.steps);
      setRegister(got.register);
    });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(() => {
    if (!inputs || !register || !steps) return null;
    return everyActionOf(projects, inputs, keep ? register.filter(keep) : register, steps, todayISO());
  }, [projects, inputs, register, steps, keep]);
}

/** EVERY ACTION OF THE ACTIVE CLIENT (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1) — its projects' actions and its lines' own
 *  problems; everything when one client or none is named, or All clients is chosen. Null until the lines are read, so another client's
 *  rows never flash. With the scope, so a page can say whose each row is under All clients. */
export function useClientEveryAction(projects: Project[]): { read: ProjectActionsRead | null; cs: ClientScope } {
  const cs = useClientScope();
  const mine = useMemo(() => projects.filter(p => cs.project(p.id)), [projects, cs]);
  const read = useEveryAction(mine, cs.record);
  return { read: cs.ready ? read : null, cs };
}

/** Whose an action is, in words — its project's client, else its line's (lib/activeClient). */
export const actionClient = (cs: ClientScope, a: ProjectAction): string =>
  cs.whose({ projectId: a.project?.id ?? a.item?.jobId, workspaceId: a.workspaceId });

/** What every project's actions are read from besides its method's records: each project's own actions, and the register's problems —
 *  a line's own problems the factory's lines' only, never a project's walk nor the demo line (lib/lines). */
export async function loadActionParts(projects: readonly Project[]): Promise<{ steps: Map<string, PaceTodoRow[]>; register: RegisterProblem[] }> {
  const [snags, ws, todos] = await Promise.all([listAllSnags(), listWorkspaces(), Promise.all(projects.map(p => listPaceTodos(p.id)))]);
  const lines = new Set((await liveProductionLines(ws)).map(w => w.id));
  const name = new Map(ws.map(w => [w.id, w.name]));
  const mine = snags.filter(s => !s.deletedAt && (s.projectId ? true : lines.has(s.workspaceId)));
  return { steps: new Map(projects.map((p, i) => [p.id, todos[i]])), register: mine.map(s => registerRow(s, id => name.get(id))) };
}

/** Every project's actions and every line's own problems, from what was read — the one rule the hook and AI Mode share. */
export function everyActionOf(projects: readonly Project[], inputs: JobInputs, register: readonly RegisterProblem[], steps: ReadonlyMap<string, PaceTodoRow[]>, today: string): ProjectActionsRead {
  const each = projects.map(p => ({ id: p.id, name: p.name,
    ...owedAndDone(inputs.gate.find(j => j.project.id === p.id), inputs.paced.find(j => j.project.id === p.id), steps.get(p.id) ?? [], register.filter(r => r.projectId === p.id), today) }));
  return { rows: everyAction(each, register, today), done: each.flatMap(e => e.done), today };
}

/** The control room's Actions, read once (no hook) — what AI Mode's overdue_actions says (src/capabilities). */
export async function loadEveryAction(projects: readonly Project[], today: string = todayISO()): Promise<ProjectActionsRead> {
  const [inputs, parts] = await Promise.all([loadJobInputs(projects), loadActionParts(projects)]);
  return everyActionOf(projects, inputs, parts.register, parts.steps, today);
}
