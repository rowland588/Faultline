/* A LINE'S 6M PROJECT, STARTED IN ONE TAP (Rowland, 30 October: a problem on a line with no 6M project
 * says "Start one to find its root cause" — and starting one is the tap, not a form).
 *
 * It is the project New project makes for a Performance (6M) card with that line picked — the same
 * createProject (model 'board') and the same line row (addPaceLine, naming its factory line) — named
 * the way New project suggests it ("<line> performance"). 6M stays a PROJECT (docs/FAULTLINE-FAULT-
 * MODEL.md; its actions, proof and report are the project's); only the door to it is one tap. */
import { addPaceLine } from '../db/pace';
import { lineKey } from './lines';
import type { Project } from '../types';
import type { PlanModel } from './planModel';

export interface SixmOnLine { id: string; name: string; lineId: string }

/** `create` is useProjects().create, so the projects list refreshes the way it does from New project. */
export async function startLineSixm(
  create: (name: string, lead?: string, model?: PlanModel) => Promise<Project>,
  line: { id: string; name: string },
): Promise<SixmOnLine> {
  const p = await create(`${line.name} performance`, undefined, 'board');
  const row = await addPaceLine({ projectId: p.id, key: lineKey(line.name), name: line.name, workspaceId: line.id, sort: 1 });
  return { id: p.id, name: p.name, lineId: row.id };
}
