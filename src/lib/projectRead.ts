/* ONE READER PER PROJECT (docs/STEADY.md, rule 1 — S2).
 *
 * Rowland, 23 October: "everything inside it is connected and in sync as we
 * use tools, reports, the project." So a project is read in one place: the
 * records its own method reads (lib/useJobInputs — the control room's read,
 * a stage gate's tests, items and machines, a 6M project's lines and board),
 * plus what every kind has — its own actions, the register's problems taken
 * for it, its notes, its studies, its lines. From that one read: everything
 * it owes and what it has done (the Actions page, Needs you, the control
 * room's row), the journey's input (the Journey page, its paper, the week
 * line on the reports). Every page reads from here, so no two can read a
 * project two ways. The pure parts are tested; the hook only loads. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listPaceTodos, listStudies, listTestItems, listWorkspaces, loadPaceLines, onDataChange, type PaceLineRow, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import type { ToolStudy } from './study';
import type { TestItem } from './testing';
import { isSettled, live } from './testing';
import { criticalItems, jobItems, pacedItems, pacedOwed, riskItems, type JobInput, type JobItem, type PacedInput } from './portfolio';
import type { DoneThing, RegisterProblem } from './projectActions';
import { journeyOf, rangeOf, weekLine, type JourneyInput, type WeekLine } from './journey';
import { useJobInputs, type JobInputs } from './useJobInputs';
import { isoDay, todayISO } from './weeks';
import { kindOf, type ProjectKind } from './projectKind';
import type { Snag } from '../snag/types';

/** What every kind of project has besides its method's records. */
export interface OwnRecords {
  steps: PaceTodoRow[];
  register: RegisterProblem[];
  notes: TestItem[];
  studies: ToolStudy[];
  lines: PaceLineRow[];
}

export interface ProjectRead extends OwnRecords {
  project: Project;
  kind: ProjectKind;
  gate?: JobInput;
  paced?: PacedInput;
  today: string;
  /** The project's first day. */
  started: string;
  /** Everything it owes — the rows Needs you, Actions and the control room count. */
  owed: JobItem[];
  /** What was done, a day each. */
  done: DoneThing[];
  /** What the journey reads (lib/journey). */
  journey: JourneyInput;
  /** This week and next, in one line. */
  week: WeekLine;
}

/** A register problem as the readers take it (snag/types Snag). */
export const registerRow = (s: Snag, lineName: (wsId: string) => string | undefined): RegisterProblem => ({
  id: s.id, problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, status: s.status, projectId: s.projectId,
  deletedAt: s.deletedAt, archivedAt: s.archivedAt, sent: s.sent, line: lineName(s.workspaceId), raisedAt: s.raisedAt, closedAt: s.closedAt,
});

/** EVERYTHING A PROJECT OWES AND HAS DONE, from its method's records and its own actions — one rule
 *  for every reader. A stage gate owes its critical problems and high risks, its plan's rows and its
 *  own actions; a 6M or tree project owes its board, what it waits on and the checks that keep a gain. */
export function owedAndDone(gate: JobInput | undefined, paced: PacedInput | undefined, steps: readonly PaceTodoRow[], register: readonly RegisterProblem[], today: string): { owed: JobItem[]; done: DoneThing[] } {
  const done: DoneThing[] = register.filter(s => s.closedAt != null).map(s => ({ what: s.problem, on: isoDay(s.closedAt as number) }));
  if (gate) {
    for (const t of live(gate.tests)) if (isSettled(t) && t.ranOn) done.push({ what: t.title, on: t.ranTo ?? t.ranOn });
    for (const i of live(gate.items)) if (i.kind === 'next' && i.doneAt != null) done.push({ what: i.what, on: isoDay(i.doneAt) });
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

/** What the journey reads of a project — a stage gate's day through its gate, a 6M's materials, programs and studies by the day's own rules. */
export function journeyInputOf(gate: JobInput | undefined, paced: PacedInput | undefined, own: OwnRecords): JourneyInput {
  return {
    ...(gate ? { gate: { tests: gate.tests, items: gate.items, assets: gate.assets, materials: gate.materials, programs: gate.programs, studies: gate.studies ?? [] } } : {}),
    ...(paced ? { materials: paced.materials ?? [], programs: paced.programs ?? [] } : {}),
    steps: own.steps, register: own.register, notes: own.notes, studies: own.studies,
  };
}

/** The whole read, from the method's records and the project's own. */
export function projectRead(project: Project, inputs: JobInputs, own: OwnRecords, today: string = todayISO()): ProjectRead {
  const gate = inputs.gate.find(j => j.project.id === project.id);
  const paced = inputs.paced.find(j => j.project.id === project.id);
  const started = isoDay(project.createdAt);
  const journey = journeyInputOf(gate, paced, own);
  return {
    project, kind: kindOf(project), ...(gate ? { gate } : {}), ...(paced ? { paced } : {}), ...own, today, started,
    ...owedAndDone(gate, paced, own.steps, own.register, today),
    journey, week: weekLine(journey, today, started),
  };
}

/** A project's own records, read from the device. */
export async function loadOwnRecords(projectId: string): Promise<OwnRecords> {
  const [steps, snags, ws, notes, studies, lines] = await Promise.all([listPaceTodos(projectId), listAllSnags(), listWorkspaces(), listTestItems(projectId), listStudies(projectId), loadPaceLines(projectId)]);
  const name = new Map(ws.map(w => [w.id, w.name]));
  return { steps, register: snags.filter(s => s.projectId === projectId && !s.deletedAt).map(s => registerRow(s, id => name.get(id))), notes, studies, lines };
}

/** THE ONE HOOK — the project read whole, kept fresh on every change to the device's records. */
export function useProjectRead(project: Project | undefined): ProjectRead | null {
  const list = useMemo(() => (project ? [project] : []), [project]);
  const inputs = useJobInputs(list);
  const [own, setOwn] = useState<OwnRecords | null>(null);
  useEffect(() => {
    let alive = true;
    if (!project) return;
    const load = () => void loadOwnRecords(project.id).then(o => { if (alive) setOwn(o); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [project]);
  return useMemo(() => (project && inputs && own ? projectRead(project, inputs, own) : null), [project, inputs, own]);
}

/** The same day the journey's ranges are cut on — exported for the pages that need it beside the read. */
export const thisWeekAndNext = (read: ProjectRead) => journeyOf(read.journey, rangeOf('thisAndNext', read.today, read.started), read.today);
