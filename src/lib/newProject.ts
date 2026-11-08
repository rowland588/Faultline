/* STARTING A PROJECT — what New project does once the name, the method and the lines are given, lifted out of
 * screens/ProjectsScreen (8 November) so AI Mode's start_project (src/capabilities) starts one the very same way: the plan model
 * follows from the method (the stage gate is the commissioning list, every other method a board), and the lines picked from the
 * factory become the project's lines, each naming its factory line — never a second line of the same name. */
import { addPaceLine } from '../db';
import type { Workspace } from '../types';
import type { MethodKey } from './methods';
import type { PlanModel } from './planModel';
import { lineKey } from './lines';

export const modelOfMethod = (method: MethodKey): PlanModel => (method === 'stage-gate' ? 'commissioning' : 'board');

/** The lines picked from the factory, made the project's lines in the order given. */
export async function putProjectOnLines(projectId: string, picked: readonly Pick<Workspace, 'id' | 'name'>[]): Promise<void> {
  for (const [i, w] of picked.entries()) await addPaceLine({ projectId, key: lineKey(w.name), name: w.name, workspaceId: w.id, sort: i + 1 });
}
