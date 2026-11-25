import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDB } from '../../../db/core';
import { deletePaceTodo, listPaceTodos, patchPaceTodo } from '../../../db/pace';
import { listTestItems, putTestItem } from '../../../db/testing';
import { actionRows, nextActionN } from '../../../lib/eightD';
import { answerScope, methodAnswerItems, methodAnswerValues } from '../../../lib/methodSheet';
import { a3Reading } from '../../../lib/methodInsights/a3';
import { cmWritten } from '../shapes/a3Model';
import { trackWorksheetAction, worksheetAnswers, type WorksheetMethod } from '../worksheetActions';

const projectId = 'project-worksheet';
async function draft(method: WorksheetMethod, field: string, value: string) {
  await putTestItem({ id: crypto.randomUUID(), projectId, testId: answerScope(method, field), kind: 'note', what: value, sort: 1, createdAt: 1, updatedAt: 1 });
}
async function read(method: WorksheetMethod) {
  return worksheetAnswers(method, methodAnswerValues(methodAnswerItems(await listTestItems(projectId), projectId, method)), await listPaceTodos(projectId));
}
beforeEach(async () => {
  const db = await getDB();
  for (const store of ['test_items', 'pace_todos', 'tombstones'] as const) await db.clear(store);
});

describe.each(['a3', 'eight-d'] as const)('%s tracked worksheet rows', method => {
  it('promotes once, keeps tracker edits after reload, and does not resurrect removed work', async () => {
    if (method === 'a3') await draft(method, 'counter', 'Fit seal | Sam | 2026-05-11 | Damaged clamp');
    else {
      await draft(method, 'act@1', 'Fit seal');
      await draft(method, 'actwho@1', 'Sam');
      await draft(method, 'actdue@1', '11 May 2026');
    }
    expect((await read(method))['tracked@1']).toBeUndefined();
    expect(await listPaceTodos(projectId)).toEqual([]);
    const [id, again] = await Promise.all([trackWorksheetAction(projectId, method, 1), trackWorksheetAction(projectId, method, 1)]);
    expect(again).toBe(id);
    const actions = await listPaceTodos(projectId);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ what: 'Fit seal', who: 'Sam', due: '2026-05-11', state: 'todo', sources: [{ kind: 'method', id: projectId, how: 'record' }] });
    expect(actions[0].sources?.[0].href).toContain('worksheetRow=1');
    await patchPaceTodo(id, { state: 'waiting', who: 'Priya' });
    expect((await read(method))['actstate@1']).toBe('waiting');
    await patchPaceTodo(id, { what: 'Fit new seal', state: 'done', outcome: 'Leak rate fell to 0.2%' });
    const answers = await read(method);
    expect(answers).toMatchObject({ 'actoutcome@1': 'Leak rate fell to 0.2%', 'actstate@1': 'done' });
    if (method === 'a3') {
      expect(cmWritten(answers)[0].cm).toMatchObject({ what: 'Fit new seal', who: 'Priya', cause: 'Damaged clamp' });
      expect(a3Reading(answers, '2026-11-25').cms[0]).toMatchObject({ state: 'Done', passed: false });
    } else expect(actionRows(answers)[0]).toMatchObject({ what: 'Fit new seal', who: 'Priya', done: true, outcome: 'Leak rate fell to 0.2%' });
    await deletePaceTodo(id);
    const removed = await read(method);
    expect(removed['actstate@1']).toBe('removed');
    expect(method === 'a3' ? cmWritten(removed) : actionRows(removed)).toEqual([]);
    if (method === 'eight-d') expect(nextActionN(removed)).toBe(2);
    await expect(trackWorksheetAction(projectId, method, 1)).rejects.toThrow('removed');
    expect(await listPaceTodos(projectId)).toEqual([]);
  });
  it('rejects an empty or placeholder draft without creating a tracker action', async () => {
    await draft(method, method === 'a3' ? 'counter' : 'act@1', 'New action');
    await expect(trackWorksheetAction(projectId, method, 1)).rejects.toThrow('Write what');
    expect(await listPaceTodos(projectId)).toEqual([]);
  });
});
