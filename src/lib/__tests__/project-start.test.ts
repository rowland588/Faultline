import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { allProjects, createProject, getProject } from '../../db/projects';
import { allPaceLines, loadPaceLines } from '../../db/pace';
import { createWorkspace, updateWorkspace } from '../../db/workspaces';
import { planModel } from '../planModel';

it('saves the chosen method, handover and distinct factory lines together', async () => {
  const first = await createWorkspace('East packing line A');
  const next = await createWorkspace('East packing line B');
  const p = await createProject('Install the infeed', '#000', undefined, undefined, 'commissioning', 'stage-gate', undefined,
    { lineIds: [next.id, first.id, next.id], handover: '2026-12-03' });
  expect(await getProject(p.id)).toMatchObject({ method: 'stage-gate', expectedAt: '2026-12-03', plannedAt: '2026-12-03' });
  expect((await loadPaceLines(p.id)).map(line => line.workspaceId)).toEqual([next.id, first.id]);
});

it('leaves no partial project or line when a selected line vanished or belongs to another customer', async () => {
  const a = await createWorkspace('Packing');
  const b = await createWorkspace('Packing');
  await updateWorkspace({ ...a, clientName: 'East' });
  await updateWorkspace({ ...b, clientName: 'West' });
  const previous = [await allProjects(), await allPaceLines()];
  const start = (lineIds: string[]) => createProject('Seals', '#000', undefined, undefined, 'board', 'a3', undefined, { lineIds });
  await expect(start([a.id, b.id])).rejects.toThrow(/same customer/);
  await expect(start([a.id, 'missing'])).rejects.toThrow(/no longer available/);
  expect([await allProjects(), await allPaceLines()]).toEqual(previous);
});

it('rolls back the queued project write if a line cannot be written', async () => {
  const line = await createWorkspace('Tray packing');
  const previous = await allProjects();
  const add = IDBObjectStore.prototype.add;
  const writes = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, ...args) {
    if (this.name === 'pace_ppm') throw new Error('The line could not be written');
    return add.apply(this, args);
  });
  try {
    await expect(createProject('Tray recovery', '#000', undefined, undefined, 'board', 'pdca', undefined,
      { lineIds: [line.id] })).rejects.toThrow(/line could not be written/);
    expect(await allProjects()).toEqual(previous);
  } finally { writes.mockRestore(); }
});

it('keeps the chosen methodology when an older setup screen changed its backing flags', () => {
  expect(planModel({ method: 'a3', commissioning: true })).toBe('board');
  expect(planModel({ method: 'dmaic', leverTree: true })).toBe('board');
  expect(planModel({ method: 'stage-gate' })).toBe('commissioning');
  expect(planModel({ leverTree: true })).toBe('tree');
});
