/* YOUR FACTORY ON PAPER (lib/factoryReport) — every line in floor order, its
 * type, what is open on it (the late counted as the line's page counts them)
 * and the jobs on it. */
import { describe, it, expect } from 'vitest';
import type { Workspace } from '../../types';
import type { Snag } from '../../snag/types';
import { factoryReading } from '../factoryReport';

const ws = (id: string, o: Partial<Workspace> = {}): Workspace => ({
  id, name: id, color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, ...o,
});
const NOW = Date.UTC(2026, 9, 13, 12);
const snag = (id: string, workspaceId: string, o: Partial<Snag> = {}): Snag =>
  ({ id, workspaceId, problem: id, status: 'open', raisedAt: NOW - 1000, createdAt: NOW - 1000, updatedAt: NOW - 1000, media: [], ...o } as unknown as Snag);

describe('the factory, read for paper', () => {
  it('numbers the lines in the order given, counts what is open on each, and names the jobs', () => {
    const lines = [ws('Line 1', { lineType: 'Packing' }), ws('Line 2')];
    const snags = [
      snag('a', 'Line 1'), snag('b', 'Line 1', { dueAt: NOW - 3 * 86400000 }), snag('c', 'Line 1', { status: 'closed' }),
      snag('d', 'Line 1', { archivedAt: NOW }), snag('e', 'Line 2', { deletedAt: NOW }),
    ];
    const r = factoryReading(lines, snags, new Map([['Line 1', ['Line 1 performance']]]), '13 October 2026', NOW);
    expect(r.rows.map(x => [x.n, x.name, x.type, x.open, x.jobs.join()])).toEqual([[1, 'Line 1', 'Packing', 2, 'Line 1 performance'], [2, 'Line 2', undefined, 0, '']]);
    expect(r.rows[0].late).toBe(1);
    expect(r.says).toBe('2 lines · 1 Packing · 1 not typed yet');
    expect(r.problems).toBe('2 problems open · 1 late');
  });
  it('says so when nothing is open', () => {
    expect(factoryReading([ws('Line 1')], [], new Map(), 'today', NOW).problems).toBe('No problems open');
  });
});
