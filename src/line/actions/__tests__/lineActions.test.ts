import { describe, expect, it } from 'vitest';
import { DAY, barOf, ganttSpan, trackerRows, trackerSays, trackerSummary } from '../lineActions';
import type { Snag } from '../../../snag/types';

const T = new Date(2026, 10, 7).getTime();   // Saturday 7 November 2026, local midnight
const snag = (id: string, o: Partial<Snag>): Snag => ({ id, workspaceId: 'L7', problem: `Problem ${id}`, status: 'open', raisedAt: T - 10 * DAY, updatedAt: T, ...o } as Snag);
const S = [
  snag('a', { owner: 'Sam', dueAt: T - 3 * DAY, priority: 'high' }),            // late 3 days
  snag('b', { owner: 'Jo', dueAt: T + 2 * DAY }),                               // due soon
  snag('c', { dueAt: T + 20 * DAY, status: 'in_progress' }),                    // doing, nobody on it
  snag('d', { owner: 'Kim' }),                                                  // no day
  snag('e', { status: 'closed', closedAt: T - 2 * DAY, dueAt: T - 1 * DAY }),   // done lately
  snag('f', { status: 'closed', closedAt: T - 60 * DAY }),                      // done long ago
  snag('g', { workspaceId: 'L2', owner: 'X' }),                                 // another line
  snag('h', { deletedAt: T }),                                                  // deleted
];

describe('a line’s action tracker — the line’s problems, automatically', () => {
  it('takes every live problem on the line, late first, then by due day, nothing from another line', () => {
    const r = trackerRows(S, 'L7', T + 9 * 3_600_000);
    expect(r.map(x => x.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(r[0]).toMatchObject({ state: 'late', lateBy: 3, owner: 'Sam' });
    expect(r[1].state).toBe('soon');
    expect(r[2].state).toBe('doing');
    expect(r[3].state).toBe('nodate');
  });
  it('shows the done ones of the last 30 days when asked, never the old ones', () => {
    const r = trackerRows(S, 'L7', T, { withDone: true });
    expect(r.map(x => x.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(r[4]).toMatchObject({ state: 'done', closed: T - 2 * DAY });
  });
  it('counts and says it in one sentence', () => {
    const r = trackerRows(S, 'L7', T, { withDone: true });
    expect(trackerSummary(r)).toEqual({ open: 4, late: 1, soon: 1, noOwner: 1, noDate: 1, done: 1, held: 0, clash: 0 });
    expect(trackerSays(r, 'Line 7')).toBe('4 actions open on Line 7, 1 late (Sam), 1 due within a week. 1 with nobody on it and 1 with no day.');
    expect(trackerSays([], 'Line 7')).toBe('Nothing open on Line 7. Raise a problem on the line and it is on this tracker at once.');
  });
  it('draws the Gantt from the same rows: a bar from raised to due, a point where there is no day', () => {
    const r = trackerRows(S, 'L7', T);
    const span = ganttSpan(r, T);
    expect(new Date(span.from).getDay()).toBe(1);   // a Monday
    expect(span.to).toBeGreaterThanOrEqual(T + 28 * DAY);
    const a = barOf(r[0], span);
    expect(a.point).toBe(false);
    expect(a.left).toBeCloseTo((T - 10 * DAY - span.from) / (span.to - span.from));
    expect(a.width).toBeCloseTo(8 * DAY / (span.to - span.from));   // raised day to the due day, both included
    expect(barOf(r[3], span).point).toBe(true);
  });
});
