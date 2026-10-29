import { describe, expect, it } from 'vitest';
import { plannedShare, summarizeMaintenance } from '../maintenanceMeasures';

describe('FC-067 maintenance measures', () => {
  it('planned share 52%', () => expect(plannedShare(210, 190)).toBeCloseTo(0.525, 2));
  it('tiles', () => {
    const r = summarizeMaintenance({ reactiveHours: 190, plannedHours: 210, machines: [], pm: {
      now: 0, period: { from: 0, to: 1 }, before: { from: 0, to: 0 }, round: { now: [], later: [], events: [], off: [] },
      comp: { expected: 48, onTime: 39, pct: 81, missed: 4 }, compBefore: { expected: 0, onTime: 0, pct: 0, missed: 0 },
      failures: [], failedNow: 0, overdue: 4, due: 0, heldMissing: false, scored: [], values: [], results: 0, struck: 0, problems: { open: 0, raised: 0 }, backlogHours: 10, backlogJobs: 4,
    } });
    expect(r.tiles.find(t => t.k === 'Planned share')?.v).toBe('53%');
  });
});
