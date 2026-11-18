import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
let db: typeof import('../../db/workspaces');
beforeEach(async () => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); db = await import('../../db/workspaces'); }, 30_000);

describe('setup changes against the current line record', () => {
  it('removes a legacy machine and restores its position without overwriting concurrent setup edits',async()=>{
    const {removeLineMachine}=await import('../../db/lineRecords');
    const {machinesOnLine}=await import('../lineRecords');
    const line=await db.createWorkspace('Packing B');
    await db.patchWorkspaceRecord(line.id,{assets:['Whole line','Mistyped machine','Wrapper'],crew:4});
    const undo=await removeLineMachine(line.id,' mistyped MACHINE ');
    await db.patchWorkspaceRecord(line.id,current=>({assets:[...current.assets,'New conveyor'],crew:6}));
    expect(machinesOnLine((await db.getWorkspace(line.id))!,[],[]).map(m=>m.name)).toEqual(['Wrapper','New conveyor']);
    await undo();await undo();
    expect(await db.getWorkspace(line.id)).toMatchObject({assets:['Whole line','Mistyped machine','Wrapper','New conveyor'],crew:6});
  });
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
