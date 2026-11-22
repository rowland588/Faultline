import { inProject } from '../db/projects';
import { customerKey } from './customers';
import { whyWithSources } from './actionSources';
import { isHolding } from './visits';
/* A PROJECT'S ACTIONS, READ (lib/projectActions; docs/PROJECTS.md, P3) —
 * from the one project reader (lib/projectRead, docs/STEADY.md S2): the owed
 * rows its Needs you is made of, the register's problems taken for it, its
 * own actions, and what was done, each on the day it was done. Nothing is
 * worked out twice: late here is late on the band, the rail, the Journey
 * and the control room. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listAllPaceTodos, listWorkspaces, onDataChange, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import { loadJobInputs, useJobInputs, type JobInputs } from './useJobInputs';
import { everyAction, independentActions, projectActions, todoActions, type DoneThing, type ProjectAction, type RegisterProblem } from './projectActions';
import { owedAndDone, registerRow, useProjectRead } from '../project/projectRead';
import { todayISO } from './weeks';
import { isAreaPlace, liveProductionLines } from './lines';
import { useClientScope, type ClientScope } from './activeClient';

export interface ProjectActionsRead { rows: ProjectAction[]; done: DoneThing[]; today: string; completed?:ProjectAction[] }

/** A PROJECT'S ACTIONS — the reader's owed rows and done things, so Needs you,
 *  Actions, the Journey and the control room count one thing. */
export function useProjectActions(project: Project | undefined): ProjectActionsRead | null {
  const read = useProjectRead(project);
  return useMemo(() => (read ? { rows: projectActions(read.owed, read.register, read.project.id, read.today), done: read.done, today: read.today,completed:todoActions(read.steps.filter(a=>a.state === 'done'),read.today,()=>undefined,true) } : null), [read]);
}

/** EVERY PROJECT'S ACTIONS AND EVERY LINE'S OWN PROBLEMS — the control room's
 *  Actions (docs/PROJECTS.md, P4): each project read by the same rule as its
 *  own Actions page (lib/projectRead owedAndDone), then the register's
 *  problems on a line with no project. */
export function useEveryAction(projects: Project[], keep?: (r: RegisterProblem) => boolean, keepTask?: (r:PaceTodoRow)=>boolean): ProjectActionsRead | null {
  const inputs = useJobInputs(projects);
  const [parts,setParts] = useState<Awaited<ReturnType<typeof loadActionParts>> | null>(null);
  const ids=projects.map(p=>p.id).join('|');
  useEffect(()=>{
    let alive=true;let request=0;
    const load=async()=>{const n=++request;const got=await loadActionParts(projects);if(alive && n===request)setParts(got);};
    void load();const off=onDataChange(()=>void load());return()=>{alive=false;off();};
    // eslint-disable-next-line react-hooks/exhaustive-deps -- project identity drives this read
  },[ids]);
  return useMemo(()=>{
    if(!inputs || !parts)return null;
    return everyActionOf(projects,inputs,keep ? parts.register.filter(keep) : parts.register,new Map([...parts.steps].map(([pid,rows])=>[pid,keepTask ? rows.filter(keepTask) : rows])),todayISO(),keepTask ? parts.independent.filter(keepTask) : parts.independent,parts.places);
  },[projects,inputs,parts,keep,keepTask]);
}

/** EVERY ACTION OF THE ACTIVE CLIENT (lib/activeClient, docs/CONSULTANT-WORKSPACE.md C1) — its projects' actions and its lines' own
 *  problems; everything when one client or none is named, or All clients is chosen. Null until the lines are read, so another client's
 *  rows never flash. With the scope, so a page can say whose each row is under All clients. */
export function useClientEveryAction(projects: Project[]): { read: ProjectActionsRead | null; cs: ClientScope } {
  const cs = useClientScope();
  const mine = useMemo(() => projects.filter(p => cs.project(p.id)), [projects, cs]);
  const keepTask=useMemo(()=>(a:PaceTodoRow)=>a.clientName && !a.workspaceId ? !cs.filtering || customerKey(a.clientName) === customerKey(cs.client) : cs.record(a),[cs]);
  const read = useEveryAction(mine, cs.record,keepTask);
  return { read: cs.ready ? read : null, cs };
}

/** Whose an action is, in words — its project's client, else its line's (lib/activeClient). */
export const actionClient = (cs: ClientScope, a: ProjectAction): string =>
  cs.whose({ projectId: a.project?.id ?? a.item?.jobId, workspaceId: a.workspaceId }) || a.clientName || '';

/** What every project's actions are read from besides its method's records: each project's own actions, and the register's problems —
 *  a line's own problems the factory's lines' only, never a project's walk nor the demo line (lib/lines). */
export async function loadActionParts(projects: readonly Project[]): Promise<{ steps: Map<string, PaceTodoRow[]>; register: RegisterProblem[]; independent:PaceTodoRow[]; places:Map<string,string> }> {
  const [snags, ws, todos] = await Promise.all([listAllSnags(), listWorkspaces(), listAllPaceTodos()]);
  /* the factory's lines, and the areas' own places (lib/areaPlace) — a problem held in Dispatch itself is owed like a line's */
  const lines = new Set([...(await liveProductionLines(ws)).map(w => w.id), ...ws.filter(w => !w.archived && (isAreaPlace(w) || isHolding(w))).map(w => w.id)]);
  const name = new Map(ws.map(w => [w.id, w.name]));
  const mine = snags.filter(s => !s.deletedAt && (s.projectId ? true : lines.has(s.workspaceId)));
  return { steps: new Map(projects.map(p => [p.id, todos.filter(inProject(p.id))])), register: mine.map(s => registerRow(s, id => name.get(id))), independent:todos.filter(a=>a.standalone && !a.projectId), places:name };
}

/** Every project's actions and every line's own problems, from what was read — the one rule the hook and AI Mode share. */
export function everyActionOf(projects: readonly Project[], inputs: JobInputs, register: readonly RegisterProblem[], steps: ReadonlyMap<string, PaceTodoRow[]>, today: string, independent:readonly PaceTodoRow[] = [], places:ReadonlyMap<string,string> = new Map()): ProjectActionsRead {
  const each = projects.map(p => ({ id: p.id, name: p.name,
    ...owedAndDone(inputs.gate.find(j => j.project.id === p.id), inputs.paced.find(j => j.project.id === p.id), steps.get(p.id) ?? [], register.filter(r => r.projectId === p.id), today) }));
  const byId=new Map([...steps.values()].flat().map(a=>[a.id,a]));
  const rows=everyAction(each,register,today).map(a=>{
    const task=a.item?.kind === 'action' && a.item.id ? byId.get(a.item.id) : undefined;
    return task ? {...a,todoId:task.id,why:whyWithSources(a.why,task.sources),...(task.workspaceId ? {workspaceId:task.workspaceId,where:[places.get(task.workspaceId),task.where].filter(Boolean).join(' · ')} : {})} : a;
  });
  const completed=[...independentActions(independent.filter(a=>a.state === 'done'),today,id=>places.get(id),true),...projects.flatMap(p=>todoActions((steps.get(p.id) ?? []).filter(a=>a.state === 'done'),today,id=>places.get(id),true).map(a=>({...a,project:{id:p.id,name:p.name}})))];
  return {completed,rows:[...rows,...independentActions(independent,today,id=>places.get(id))],done:[...each.flatMap(e=>e.done),...independent.filter(a=>a.state === 'done' && a.doneOn).map(a=>({what:a.what,on:a.doneOn as string}))],today};
}

/** EVERY ACTION OF THE ACTIVE CLIENT, READ ONCE (no hook; 22 November) — exactly what useClientEveryAction gives a page: the client's
 *  projects, the register's problems that are its, its own tasks. What Luna's overdue_actions says with no place named, and what she
 *  is told stands now (colleague/picture) — the Actions page's rows and the Today page's briefing, never a second reading. */
export async function loadClientEveryAction(cs: ClientScope, projects: readonly Project[], today: string = todayISO()): Promise<ProjectActionsRead & { register: RegisterProblem[] }> {
  const mine = projects.filter(p => cs.project(p.id));
  const keepTask = (a: PaceTodoRow): boolean => (a.clientName && !a.workspaceId ? !cs.filtering || customerKey(a.clientName) === customerKey(cs.client) : cs.record(a));
  const [inputs, parts] = await Promise.all([loadJobInputs(mine), loadActionParts(mine)]);
  const register = parts.register.filter(cs.record);
  return { ...everyActionOf(mine, inputs, register, new Map([...parts.steps].map(([pid, rows]) => [pid, rows.filter(keepTask)])), today, parts.independent.filter(keepTask), parts.places), register };
}

/** The control room's Actions, read once (no hook) — what AI Mode's overdue_actions says (src/capabilities). */
export async function loadEveryAction(projects: readonly Project[], today: string = todayISO()): Promise<ProjectActionsRead> {
  const [inputs, parts] = await Promise.all([loadJobInputs(projects), loadActionParts(projects)]);
  return everyActionOf(projects, inputs, parts.register, parts.steps, today, parts.independent,parts.places);
}
