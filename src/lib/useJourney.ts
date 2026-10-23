/* THE JOURNEY, READ (lib/journey; docs/JOURNEY.md, J2) — from the inputs the
 * control room reads every project with (lib/useJobInputs), so a stage-gate
 * day here is the day The day tells; plus what the journey reads that the
 * control room does not: the project's own actions (its tool plans among
 * them), the register's problems taken for it (raised, due, closed), its
 * notes (the commentary on a day) and its studies. One read, kept fresh on
 * every change to the device's records. */
import { useEffect, useMemo, useState } from 'react';
import { listAllSnags, listPaceTodos, listStudies, listTestItems, listWorkspaces, loadPaceLines, onDataChange, type PaceLineRow, type PaceTodoRow } from '../db';
import type { Project } from '../types';
import type { ToolStudy } from './study';
import type { TestItem } from './testing';
import type { RegisterProblem } from './projectActions';
import type { JourneyInput } from './journey';
import { useJobInputs } from './useJobInputs';
import { isoDay, todayISO } from './weeks';

export interface JourneyRead {
  /** What lib/journey reads the range from. */
  input: JourneyInput;
  today: string;
  /** The project's first day — where "since the start" starts. */
  started: string;
  /** Its actions, for the tick list and the sheet. */
  steps: PaceTodoRow[];
  /** Its lines, for the action sheet's Line box. */
  lines: PaceLineRow[];
  studies: ToolStudy[];
}

export function useJourney(project: Project | undefined): JourneyRead | null {
  const list = useMemo(() => (project ? [project] : []), [project]);
  const inputs = useJobInputs(list);
  const [own, setOwn] = useState<{ steps: PaceTodoRow[]; register: RegisterProblem[]; notes: TestItem[]; studies: ToolStudy[]; lines: PaceLineRow[] } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!project) return;
    const load = () => void Promise.all([listPaceTodos(project.id), listAllSnags(), listWorkspaces(), listTestItems(project.id), listStudies(project.id), loadPaceLines(project.id)])
      .then(([steps, snags, ws, notes, studies, lines]) => {
        if (!alive) return;
        const name = new Map(ws.map(w => [w.id, w.name]));
        const register = snags.filter(s => s.projectId === project.id && !s.deletedAt).map((s): RegisterProblem => ({
          id: s.id, problem: s.problem, priority: s.priority, owner: s.owner, dueAt: s.dueAt, status: s.status, projectId: s.projectId,
          deletedAt: s.deletedAt, archivedAt: s.archivedAt, sent: s.sent, line: name.get(s.workspaceId), raisedAt: s.raisedAt, closedAt: s.closedAt,
        }));
        setOwn({ steps, register, notes, studies, lines });
      });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [project]);

  return useMemo(() => {
    if (!project || !inputs || !own) return null;
    const gate = inputs.gate.find(j => j.project.id === project.id);
    const paced = inputs.paced.find(j => j.project.id === project.id);
    const input: JourneyInput = {
      ...(gate ? { gate: { tests: gate.tests, items: gate.items, assets: gate.assets, materials: gate.materials, programs: gate.programs, studies: gate.studies ?? [] } } : {}),
      ...(paced ? { materials: paced.materials ?? [], programs: paced.programs ?? [] } : {}),
      steps: own.steps, register: own.register, notes: own.notes, studies: own.studies,
    };
    return { input, today: todayISO(), started: isoDay(project.createdAt), steps: own.steps, lines: own.lines, studies: own.studies };
  }, [project, inputs, own]);
}
