import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaceTodoRow } from '../../db/rows';
import { onProjectActionLine, selectedActionLine } from '../projectActionLine';
import { actionSourcesOfTags, actionSourcesToTags, actionSourcesOfJSON, actionSourcesToJSON, matchesActionSource, type ActionSource } from '../actionSources';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const action: PaceTodoRow = {
  id: 'a', projectId: 'p', workspaceId: 'factory-line', what: 'Rework guide', why: 'Guide slips', who: 'Sam', where: 'Infeed',
  when: '', state: 'todo', createdAt: 1, updatedAt: 1,
};
const source: ActionSource = {
  kind: 'method', id: 'p', part: 'pdca:Check', href: '/project/p/method?phase=Check&finding=result', label: 'PDCA · Check · Measured effect',
  how: 'record', excerpt: 'Three stops after the change.',
};

describe('a tracked action from a method phase', () => {
  it('validates line membership for old records and rechecks the link when a scoped action is saved', async () => {
    const db = await import('../../db');
    const local = await db.addPaceLine({ projectId: 'p', key: 'East', name: 'East', sort: 0, workspaceId: 'east' });
    const foreign = await db.addPaceLine({ projectId: 'q', key: 'East', name: 'East', sort: 0, workspaceId: 'elsewhere' });
    const scope = selectedActionLine('p', 'east', [foreign, local])!;
    expect(selectedActionLine('p', 'elsewhere', [foreign, local])).toBeUndefined();
    expect(onProjectActionLine({ lineId: local.id }, scope)).toBe(true);
    expect(onProjectActionLine({ workspaceId: 'east' }, scope)).toBe(true);
    expect(onProjectActionLine({ lineId: local.id, workspaceId: 'elsewhere' }, scope)).toBe(false);
    expect(onProjectActionLine({}, scope)).toBe(false);
    const scoped = { ...action, lineId: local.id, workspaceId: 'east' };
    await db.putPaceTodo(scoped, true);
    await expect(db.putPaceTodo({ ...scoped, id: 'foreign', lineId: foreign.id }, true)).rejects.toThrow(/linked/);
    await db.deletePaceLine(local.id);
    await expect(db.putPaceTodo({ ...scoped, id: 'removed' }, true)).rejects.toThrow(/linked/);
    expect((await db.listAllPaceTodos()).map(a => a.id)).toEqual([scoped.id]);
  });

  it('keeps a round-trippable source that returns to the phase and saved finding', () => {
    expect(actionSourcesOfTags(actionSourcesToTags([source])).sources).toEqual([source]);
  });

  it('keeps two findings in one phase distinct in the action list and on older clients', () => {
    const second = { ...source, href: '/project/p/method?phase=Check&finding=followup', label: 'Follow-up' };
    const wire = actionSourcesToJSON([source, second]);
    expect(wire).toHaveLength(2);
    expect(wire[0].part).not.toBe(wire[1].part);
    expect(actionSourcesOfJSON(wire)).toEqual([source, second]);
    expect(matchesActionSource(second, source)).toBe(false);
    expect(matchesActionSource(second, { ...source, href: '/project/p/method?phase=Check' })).toBe(true);
  });

  it('resolves a legacy factory location only against its own unambiguous project line', async () => {
    const db = await import('../../db');
    const addLine = (projectId: string, key: string) => db.addPaceLine({ projectId, key, name: key, sort: 0, workspaceId: 'factory-line' });
    const own = await addLine('p', 'own');
    const other = await addLine('q', 'other');
    await db.putPaceTodo(action);
    expect((await db.listPaceTodos('p', own.id)).map(t => t.id)).toEqual(['a']);
    expect(await db.listPaceTodos('q', other.id)).toEqual([]);
    expect((await db.listAllPaceTodos())[0].lineId).toBe(own.id);
    await addLine('p', 'second');
    expect(await db.listPaceTodos('p', own.id)).toEqual([]);
    expect((await db.listAllPaceTodos())[0].lineId).toBeUndefined();
  });

  it('keeps later edits and proof through completion and reopen without recreating a deleted record', async () => {
    const db = await import('../../db');
    const { actionEdits } = await import('../actions');
    await db.putPaceTodo({ ...action, sources: [source] });
    const [original] = await db.listPaceTodos('p');
    const media = { id: 'later', kind: 'photo', blobKey: 'test', mime: 'image/jpeg', capturedAt: 2 } as const;
    await db.patchPaceTodo('a', { who: 'Lee', notes: 'Follow-up checked on shift', media: [media] });
    const draft = { ...original, state: 'done' as const, outcome: 'Guide held for 3 shifts' };
    await db.patchPaceTodo('a', current => actionEdits(original, draft, current));
    const [done] = await db.listPaceTodos('p');
    expect(done).toMatchObject({ state: 'done', who: 'Lee', notes: 'Follow-up checked on shift', media: [media], sources: [source] });
    expect(done.doneOn).toBeTruthy();
    await db.patchPaceTodo('a', current => actionEdits(done, { ...done, state: 'todo' }, current));
    const [reopened] = await db.listPaceTodos('p');
    expect(reopened).toMatchObject({ state: 'todo', outcome: draft.outcome, sources: [source], media: [media] });
    expect(reopened.doneOn).toBeUndefined();
    await db.deletePaceTodo('a');
    expect(await db.patchPaceTodo('a', { who: 'Stale editor' })).toBe(false);
    expect(await db.listPaceTodos('p')).toEqual([]);
  });
});
