import { describe, expect, it } from 'vitest';
import type { Workspace } from '../../../types';
import type { Snag } from '../../../snag/types';
import { areaBundle, partName } from '../areaBundle';

const line = (id: string, o: Partial<Workspace> = {}): Workspace => ({ id, name: id, createdAt: 0, updatedAt: 0, siteName: 'Hull', areaName: 'Packing', ...o } as Workspace);
const snag = (id: string, ws: string, o: Partial<Snag> = {}): Snag => ({ id, workspaceId: ws, problem: `problem ${id}`, status: 'open', raisedAt: 0, updatedAt: 0, media: [], ...o } as Snag);
const empty = { machines: [], programs: [], jobLines: [], standards: [], studies: [], today: '2026-11-09', ref: Date.parse('2026-11-09T12:00:00Z') };

describe('the area report — each line once, read as its line report reads it', () => {
  const a = line('2a', { floorOrder: 1 }), b = line('2b', { floorOrder: 2 });
  const dual = line('2a 2b', { floorOrder: 3, madeOf: ['2a', '2b'] });
  const other = line('Line 9', { floorOrder: 4, areaName: 'Despatch' });
  const lines = [a, b, dual, other];
  const snags = [snag('s1', '2a', { priority: 'critical' }), snag('s2', 'Line 9'), snag('s3', '2a 2b', { dueAt: Date.parse('2026-11-01') })];

  it('a dual line of the area is its lines and then both together, its lines not printed again on their own', () => {
    const r = areaBundle({ site: 'Hull', area: 'Packing' }, { ...empty, lines, snags, projectsOn: () => [] });
    expect(r.lines.map(w => w.id)).toEqual(['2a', '2b', '2a 2b']);
    expect(r.bundles).toHaveLength(1);
    expect(r.parts.map(p => p.line.id)).toEqual(['2a', '2b', '2a 2b']);
    expect(partName(r.bundles[0], r.parts[2])).toBe('2a 2b — both lines together');
  });

  it('what needs doing is every line\'s own, the late first, naming its line — nothing of another area', () => {
    const r = areaBundle({ site: 'Hull', area: 'Packing' }, { ...empty, lines, snags, projectsOn: id => (id === '2a' ? [{ id: 'p', name: 'Pace' }] : []) });
    expect(r.actions.map(x => [x.line, x.what])).toEqual([['2a', 'problem s1'], ['2a 2b', 'problem s3']]);
    expect(r.actions.every(x => x.to.startsWith('/snags?line='))).toBe(true);
    expect(r.facts.map(f => [f.name, f.open])).toEqual([['2a', 1], ['2b', 0], ['2a 2b', 1]]);
    expect(r.projects).toEqual([{ id: 'p', name: 'Pace', lines: ['2a'] }]);
  });

  it('a dual line whose lines are in another area keeps only its own work here', () => {
    const r = areaBundle({ site: 'Hull', area: 'Packing' }, { ...empty, lines: [line('2a', { areaName: 'Elsewhere' }), b, dual], snags: [], projectsOn: () => [] });
    expect(r.parts.map(p => p.line.id)).toEqual(['2b', '2a 2b']);
  });
});
