/* The day an action was done is the store's to keep: stamped on a real move to
 * done, cleared on a reopen, and never invented for a step that was already
 * done before the field existed. Asserted against the real store. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const step = (o: Record<string, unknown> = {}) =>
  ({ id: 's1', projectId: 'p', what: 'Replace the jaw', where: '', why: '', who: 'Dave', when: '', state: 'todo', createdAt: 1, updatedAt: 1, ...o }) as never;

describe('the day an action was done', () => {
  it('is stamped when the step moves to done, and cleared when it is reopened', async () => {
    const db = await import('../db');
    await db.putPaceTodo(step());
    expect((await db.listPaceTodos('p'))[0].doneOn).toBeUndefined();

    await db.putPaceTodo({ ...(await db.listPaceTodos('p'))[0], state: 'done' });
    const done = (await db.listPaceTodos('p'))[0];
    expect(done.doneOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await db.putPaceTodo({ ...done, state: 'todo' });
    expect((await db.listPaceTodos('p'))[0].doneOn).toBeUndefined();
  });

  it('keeps the day it came with when the step is edited again', async () => {
    const db = await import('../db');
    await db.putPaceTodo(step({ id: 'old', state: 'done', doneOn: '2026-09-01' }));
    await db.putPaceTodo({ ...(await db.listPaceTodos('p')).find(t => t.id === 'old')!, what: 'typo fixed' });
    expect((await db.listPaceTodos('p')).find(t => t.id === 'old')?.doneOn).toBe('2026-09-01');
  });
});
