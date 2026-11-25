import { getDB, signalWrite } from '../../db/core';
import { actionProjectLine } from '../../db/pace';
import type { PaceTodoRow } from '../../db/rows';
import { DISCIPLINES, dayOf } from '../../lib/eightD';
import { answerScope, fieldsOf, methodAnswerItems, methodAnswerValues } from '../../lib/methodSheet';
import type { MethodKey } from '../../lib/methods';
import { todayISO } from '../../lib/weeks';
import { cmField, joinCm, parseCm } from './shapes/a3Model';

export type WorksheetMethod = 'a3' | 'eight-d';
export const isActionWorksheet = (method: MethodKey): method is WorksheetMethod => method === 'a3' || method === 'eight-d';
const titleField = (method: WorksheetMethod, n: number) => method === 'a3' ? cmField(n) : `act@${n}`;

/** Once tracked, the worksheet reads the action itself. The saved reference survives a deletion. */
export function worksheetAnswers(method: MethodKey, answers: Record<string, string>, todos: readonly PaceTodoRow[]): Record<string, string> {
  if (!isActionWorksheet(method)) return answers;
  const out = { ...answers };
  const byId = new Map(todos.map(todo => [todo.id, todo]));
  for (const [field, id] of Object.entries(answers)) {
    const match = /^tracked@(\d+)$/.exec(field);
    if (!match || !id) continue;
    const n = Number(match[1]);
    const todo = byId.get(id);
    const when = todo?.due || todo?.when || '';
    out[`actstate@${n}`] = todo?.state ?? 'removed';
    out[`actoutcome@${n}`] = todo?.outcome ?? '';
    if (method === 'a3') {
      out[cmField(n)] = todo ? joinCm({ what: todo.what, who: todo.who, when, cause: todo.why }) : '';
    } else {
      out[`act@${n}`] = todo?.what ?? '';
      out[`actwho@${n}`] = todo?.who ?? '';
      out[`actdue@${n}`] = when;
      out[`actdone@${n}`] = todo?.state === 'done' ? 'yes' : '';
    }
  }
  return out;
}

/** Stable UUIDs let two offline devices commit the same numbered row to one cloud action. */
async function worksheetIds(projectId: string, method: WorksheetMethod, n: number) {
  const key = JSON.stringify(['faultline/worksheet-action/v1', projectId, method, n]);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)));
  const uuid = (part: Uint8Array) => {
    part[6] = (part[6] & 15) | 128;
    part[8] = (part[8] & 63) | 128;
    const hex = Array.from(part, v => v.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  };
  return { actionId: uuid(bytes.subarray(0, 16)), markerId: uuid(bytes.subarray(16)) };
}

/** The first commitment saves a tracker row and its worksheet reference together. Repeated clicks only reopen it. */
export async function trackWorksheetAction(projectId: string, method: WorksheetMethod, n: number): Promise<string> {
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('Choose a saved worksheet row.');
  const { actionId, markerId } = await worksheetIds(projectId, method, n);
  const db = await getDB();
  // Luna can write the A3's first countermeasure through the method-answer capability.
  const luna = method === 'a3' && n === 1
    ? await Promise.all([import('../../colleague/lunaAnswers'), db.getAll('studies')]).then(([module, studies]) =>
      module.lunaAnswersOf(studies, projectId, fieldsOf('a3', 'Countermeasures')).get('counter')) : undefined;
  const tx = db.transaction(['test_items', 'pace_todos', 'projects', 'pace_ppm'], 'readwrite');
  const notes = tx.objectStore('test_items'), actions = tx.objectStore('pace_todos');
  const [rows, project, lines] = await Promise.all([
    notes.index('by_project').getAll(projectId), tx.objectStore('projects').get(projectId), tx.objectStore('pace_ppm').getAll(),
  ]);
  const answers = methodAnswerValues(methodAnswerItems(rows, projectId, method));
  const marker = `tracked@${n}`;
  const tracked = answers[marker];
  const prior = await actions.get(tracked || actionId);
  if (tracked) {
    if (!prior || prior.projectId !== projectId) throw new Error('This action was removed from the project.');
    return tracked;
  }
  const field = titleField(method, n);
  const draft = method === 'a3' ? parseCm(answers[field]) : {
    what: answers[field]?.trim() ?? '', who: answers[`actwho@${n}`]?.trim() ?? '',
    when: answers[`actdue@${n}`]?.trim() ?? '', cause: '',
  };
  if (!draft.what || draft.what === 'New action') throw new Error('Write what needs to be done first.');
  const t = Date.now();
  if (!prior) {
    const section = method === 'a3' ? 'Countermeasures' : DISCIPLINES[6].section;
    const query = new URLSearchParams({ phase: section, worksheetRow: String(n) });
    const workspaceIds = [...new Set([...(project?.workspaceIds ?? []), ...lines.filter(l => l.projectId === projectId && !l.deletedAt).map(l => l.workspaceId)].filter((id): id is string => !!id))];
    const workspaceId = workspaceIds.length === 1 ? workspaceIds[0] : undefined;
    const due = dayOf(draft.when, todayISO());
    await actions.add({
      id: actionId, projectId, workspaceId, lineId: actionProjectLine(projectId, workspaceId, lines),
      what: draft.what, who: draft.who, why: draft.cause, where: '', when: due ? '' : draft.when, ...(due ? { due } : {}),
      state: method === 'eight-d' && answers[`actdone@${n}`] === 'yes' ? 'done' : 'todo',
      sources: [{ kind: 'method', id: projectId, part: `${method}:${method === 'a3' ? 'counter' : 'act'}@${n}`,
        href: `/project/${encodeURIComponent(projectId)}/method?${query}`,
        label: method === 'a3' ? `A3 · Countermeasure ${n}` : `8D · Corrective action ${n}`,
        how: luna && !luna.kept && luna.text === answers[field]?.trim() ? 'ai' : 'record' }],
      createdAt: t, updatedAt: t,
    });
  }
  await notes.put({ id: markerId, projectId, testId: answerScope(method, marker), kind: 'note', what: actionId, sort: t, createdAt: t, updatedAt: t });
  await tx.done;
  signalWrite();
  return actionId;
}
