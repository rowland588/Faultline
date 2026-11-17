import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
let db: typeof import('../../db/workspaces');
beforeEach(async () => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); db = await import('../../db/workspaces'); }, 30_000);

describe('setup changes against the current line record', () => {
  it('preserves concurrent shift subfields and independent cost inputs', async () => {
    const line = await db.createWorkspace('Packing 2A');
    await db.patchWorkspaceRecord(line.id, { shifts: [{ name: 'Days', start: '', end: '' }] });
    await Promise.all([
      db.patchWorkspaceRecord(line.id, current => ({ shifts: current.shifts?.map(s => ({ ...s, start: '06:00' })) })),
      db.patchWorkspaceRecord(line.id, current => ({ shifts: current.shifts?.map(s => ({ ...s, end: '14:00', breakMin: 30 })) })),
      db.patchWorkspaceRecord(line.id, { crew: 6, labourRatePerHour: 18.5 }),
      db.patchWorkspaceRecord(line.id, { clientName: 'Acme', siteName: 'Hull', areaName: 'Packing hall' }),
    ]);
    const saved = await db.getWorkspace(line.id);
    expect(saved?.shifts).toEqual([{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }]);
    expect(saved).toMatchObject({ name: 'Packing 2A', crew: 6, labourRatePerHour: 18.5, clientName: 'Acme', siteName: 'Hull', areaName: 'Packing hall' });
  });
});
