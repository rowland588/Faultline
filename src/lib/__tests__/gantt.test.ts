import { describe, expect, it } from 'vitest';
import { gantt, ganttHref, WEEKS_AFTER } from '../gantt';
import type { PlanMark } from '../standing';

const TODAY = '2026-10-02'; // a Friday
const m = (over: Partial<PlanMark> & Pick<PlanMark, 'at'>): PlanMark => ({ kind: 'install', label: 'A step', tone: 'booked', ...over });

describe('the Gantt calendar', () => {
  const g = gantt([
    m({ id: 't1', at: '2026-10-05', until: '2026-10-09', label: 'Wrapper — Positioned' }),
    m({ id: 't2', at: '2026-10-12', label: 'Wrapper — Dry run' }),
    m({ id: 't3', kind: 'setup', at: '2026-10-19', until: '2026-10-21', label: 'Wrapper — Programs loaded' }),
  ], { today: TODAY, expectedAt: '2026-10-30' });

  it('starts on a Monday and ends on a Sunday, with room either side', () => {
    expect(g.from).toBe('2026-09-28');           // the Monday before today, less three days
    expect(new Date(`${g.to}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(g.to >= '2026-11-03').toBe(true);      // past handover, plus a few days
    expect(g.dayList[0]).toMatchObject({ iso: '2026-09-28', day: 28, dow: 0, weekend: false });
    expect(g.dayList.filter(d => d.weekend).length).toBe((g.days / 7) * 2);
  });

  it('puts a bar on the days it means, both ends included', () => {
    const r = g.groups[0].rows[0];
    expect(r).toMatchObject({ id: 't1', from: '2026-10-05', to: '2026-10-09', start: 7, span: 5, when: '5–9 Oct' });
    expect(g.groups[0].rows[1]).toMatchObject({ start: 14, span: 1, when: '12 Oct' });
  });

  it('groups by gate, in the order the job runs', () => {
    expect(g.groups.map(x => x.label)).toEqual(['Install', 'Set up']);
  });

  it('marks today and the handover on the calendar', () => {
    expect(g.today).toBe(4);
    expect(g.expected).toMatchObject({ at: 32, when: '30 Oct' });
    expect(g.agreed).toBeUndefined();
  });

  it('labels the months across the top, a band per month', () => {
    expect(g.months[0]).toMatchObject({ label: 'Sep', start: 0, span: 3 });
    expect(g.months[1]).toMatchObject({ label: 'Oct', start: 3, span: 31 });
    expect(g.weeks[0]).toMatchObject({ label: '28 Sep', start: 0 });
  });

  it('shows the agreed date only when it differs from the expected one', () => {
    const moved = gantt([m({ at: '2026-10-05' })], { today: TODAY, expectedAt: '2026-10-30', plannedAt: '2026-10-23' });
    expect(moved.agreed).toMatchObject({ when: '23 Oct' });
  });

  it('is at least a month wide, and reads in weeks once it is long', () => {
    expect(gantt([], { today: TODAY }).days).toBeGreaterThanOrEqual(28);
    expect(g.scale).toBe('day');
    const long = gantt([m({ at: '2026-10-05' }), m({ at: '2027-03-01' })], { today: TODAY });
    expect(long.days).toBeGreaterThan(WEEKS_AFTER);
    expect(long.scale).toBe('week');
    expect(long.months.some(x => x.label === 'Jan 27')).toBe(true);
  });

  it('opens the record a row was drawn from', () => {
    expect(ganttHref('p', { id: 't1', kind: 'install' })).toBe('/project/p/install?open=t1');
    expect(ganttHref('p', { kind: 'material' })).toBe('/project/p/materials');
    expect(ganttHref('p', { kind: 'test' })).toBeUndefined();
  });
});
