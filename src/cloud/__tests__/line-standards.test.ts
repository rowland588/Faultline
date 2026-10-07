/* LINE TOOLS (LINE_TOOLS.sql) — a line standard on a line and on no job goes
   up with a null project and comes back with '' (the app's "on no job"), its
   line and its balance kept. Rowland, 7 October: "it's a tool, but can be
   attached." */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../mappers';
import type { Standard } from '../../lib/standard';

const s: Standard = {
  id: 'st1', projectId: '', workspaceId: '11111111-1111-1111-1111-111111111111', product: 'Maris Piper 2kg', marks: [],
  capacity: { targetPerMin: 60, stations: [{ id: 'a', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min' }] },
  sort: 1, createdAt: 1, updatedAt: 2,
};

describe('a line standard on a line, on no job', () => {
  it('goes up with no project, its line and its balance', () => {
    const row = MAPS.standards.toRow(s, 'owner');
    expect(row.project_id).toBeNull();
    expect(row.workspace_id).toBe(s.workspaceId);
    expect(row.capacity).toEqual(s.capacity);
  });
  it('comes back as it went', () => {
    const back = MAPS.standards.fromRow({ ...MAPS.standards.toRow(s, "owner") }) as unknown as Standard;
    expect(back.projectId).toBe('');
    expect(back.workspaceId).toBe(s.workspaceId);
    expect(back.capacity?.stations[0].name).toBe('Bagger');
  });
  it('attached to a job, says which', () => {
    expect(MAPS.standards.toRow({ ...s, projectId: 'job1' }, 'owner').project_id).toBe('job1');
  });
});
