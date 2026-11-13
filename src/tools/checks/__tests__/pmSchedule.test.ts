/* The maintenance schedule (tools/checks/pmSchedule): a PM list as the paper a business is handed. */
import { describe, expect, it } from 'vitest';
import type { LogCheck, ToolStudy } from '../../../lib/study';
import { pmSchedule } from '../pmSchedule';

const task = (name: string, every: number, unit: 'hour' | 'shift' | 'day' | 'week', oem?: string, page?: number, more: Partial<LogCheck> = {}): LogCheck => ({
  id: name, name, when: { every, unit }, kind: 'passfail', ...(oem ? { src: { doc: 'VFB-240 manual', page: page ?? 1, oem, quote: name } } : {}), ...more,
} as LogCheck);
const study = (checks: LogCheck[]): ToolStudy => ({ id: 's', tool: 'log', name: 'Bagger — PM from the manual', machine: 'Bagger', agreed: { log: { key: 'planned-maintenance', checks } }, facts: {} } as unknown as ToolStudy);

describe('the maintenance schedule', () => {
  const m = pmSchedule(study([
    task('Replace the pull belts', 365, 'day', 'Annually', 9), task('Lubricate the jaw carriage linear bearings', 500, 'hour', 'Every 500 operating hours', 9),
    task('Clean the sealing jaws', 1, 'day', 'Daily', 9), task('Drain the air filter bowl', 1, 'day', 'every day', 9),
    task('Check the knife', 1, 'week', 'Weekly', 9), task('Clean the vacuum filter', 30, 'day', 'Monthly', 10), task('Taken off', 1, 'day', 'Daily', 9, { removed: true }),
  ]), { line: 'Line 2', customer: 'Cellox' });
  it('puts every task under its interval, shortest first, numbered through', () => {
    expect(m.groups.map(g => [g.heading, g.rows.map(r => r.n)])).toEqual([
      ['Every day', [1, 2]], ['Weekly', [3]], ['Every 500 operating hours', [4]], ['Monthly', [5]], ['Annually', [6]],
    ]);
    expect(m.sentence).toBe('6 maintenance tasks for Bagger: 2 every day · 1 weekly · 1 every 500 operating hours · 1 monthly · 1 annually.');
  });
  it('a group is headed in the manual’s own words only where every task under it says the same', () => {
    expect(m.groups[0].rows.map(r => r.says)).toEqual(['Daily', 'every day']);
  });
  it('prints the manual’s page, and no column for what nobody typed', () => {
    expect(m.groups[4].rows[0]).toMatchObject({ task: 'Replace the pull belts', says: 'Annually', page: 'p.9', who: '', hours: '' });
    expect([m.showPage, m.showWho, m.showHours, m.showWhere]).toEqual([true, false, false, false]);
    expect(m.sources).toEqual(['VFB-240 manual — 6 tasks']);
  });
  it('says what it rests on: the manual’s tasks, operating hours, no time supplied, how a month is counted', () => {
    const all = m.notes.join(' ');
    expect(all).toMatch(/All 6 tasks are as the manufacturer’s manual states them/);
    expect(all).toMatch(/running hours that count/);
    expect(all).toMatch(/no time for a task, and none has been estimated/);
    expect(all).toMatch(/A month is counted as 30 days/);
  });
  it('a list typed by hand: the interval in words, no page column, who and time where typed', () => {
    const h = pmSchedule(study([task('Grease the chain', 2, 'week', undefined, undefined, { who: 'Fitter', stdHours: 1.5, where: 'Infeed' })]), {});
    expect(h.groups).toEqual([{ heading: 'Every 2 weeks', rows: [{ n: 1, task: 'Grease the chain', where: 'Infeed', says: 'every 2 weeks', page: '', who: 'Fitter', hours: '1.5 h' }] }]);
    expect([h.showPage, h.showWho, h.showHours, h.showWhere]).toEqual([false, true, true, true]);
    expect(h.sources).toEqual([]);
    expect(h.notes.join(' ')).not.toMatch(/manufacturer/);
  });
  it('tasks at one interval the manual words two ways are headed plainly — a year, not 365 days', () => {
    const y = pmSchedule(study([task('Replace the pull belts', 365, 'day', 'Annually', 9), task('Replace them in any case', 365, 'day', 'every 12 months', 9)]), {});
    expect(y.groups.map(g => g.heading)).toEqual(['Every year']);
  });
  it('an empty list says so', () => { expect(pmSchedule(study([]), {}).sentence).toBe('No task is on this list yet.'); });
});
