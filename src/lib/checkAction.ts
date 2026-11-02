/* A CAUSE'S CHECK IS AN ACTION ON THE BOARD (knowledge/specs/FC-148-why-tree.md, part A, criterion 3) — who, by when,
 * never a separate list. When a cause is saved with a check written, the board action for it is made (or updated in
 * place) and the cause keeps its id, so it is not made twice; when the cause is confirmed or ruled out the action is done.
 * The action points at no cause: a cause's own fixes are its countermeasures. */
import { listPaceTodos, putPaceTodo } from '../db';
import type { Cause } from './sixm';
import { checkActionRow } from './causeCheck';
import { uid } from './ids';

export async function withCheckAction(c: Cause, o: { projectId: string; lineId?: string; problemTitle: string }): Promise<Cause> {
  const written = !!(c.check?.what?.trim() || c.check?.who?.trim() || c.check?.by);
  if (!(c.tick && written) && !c.checkAction) return c;
  const id = c.checkAction ?? uid();
  const existing = (await listPaceTodos(o.projectId)).find(t => t.id === id);
  if (!existing && !(c.tick && written)) return c;
  const row = checkActionRow(c, { id, ...o, now: Date.now(), ...(existing ? { existing } : {}) });
  const decided = c.status !== 'suspected';
  await putPaceTodo(decided && row.state === 'todo' ? { ...row, state: 'done' } : row);
  return c.checkAction === id ? c : { ...c, checkAction: id };
}
