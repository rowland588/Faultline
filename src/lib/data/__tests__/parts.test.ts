/* THE APP'S OWN RECORDS BY A PART OF THEIR DATES, THE SHIFT BY THE CLOCK, AND THE DAY IN THE PERSON'S OWN ZONE (22 November 2026 —
 * docs/LUNA-ANALYSIS.md, G4 slice A2). Run in a British clock on purpose: every case below is in British Summer Time, where the
 * old tables (which wrote a day as the UTC day) said a due date, and any stop in the first hour of the day, A DAY EARLY.
 *
 * The line: Days 06:00–14:00 · Lates 14:00–22:00 · Nights 22:00–06:00. Its stops, by the clock on the wall (July 2026 — the 1st is
 * a Wednesday: 1 January was a Thursday, and 1 July is the 182nd day):
 *
 *   began             minutes   day          hour   clock shift   shift day
 *   Wed 1 Jul 05:59     10      2026-07-01     5    Nights        2026-06-30   ← the night that began on Tuesday
 *   Wed 1 Jul 06:00     20      2026-07-01     6    Days          2026-07-01
 *   Wed 1 Jul 13:59      5      2026-07-01    13    Days          2026-07-01
 *   Wed 1 Jul 14:00      8      2026-07-01    14    Lates         2026-07-01
 *   Wed 1 Jul 22:00     30      2026-07-01    22    Nights        2026-07-01
 *   Thu 2 Jul 00:30     15      2026-07-02     0    Nights        2026-07-01   ← after midnight, still Wednesday's night
 *   Thu 2 Jul 06:10     12      2026-07-02     6    Days          2026-07-02
 *                     = 100
 */
import { describe, it, expect } from 'vitest';
import { missingFields, runTable, NOT_RECORDED, TableError } from '../table';
import { problemsDataset, stopsDataset } from '../datasets';
import { shiftAndDay, timedShifts } from '../../shifts';
import { isoDay } from '../../weeks';
import { downtimeTable } from '../../../capabilities/intel/pareto';
import type { Observation, Shift } from '../../../types';
import type { Snag } from '../../../snag/types';

process.env.TZ = 'Europe/London';
/* the clock really is British — an hour ahead of Greenwich in July, on it in January */
const british = new Date(2026, 6, 1).getTimezoneOffset() === -60 && new Date(2026, 0, 1).getTimezoneOffset() === 0;

const SHIFTS: Shift[] = [{ name: 'Days', start: '06:00', end: '14:00' }, { name: 'Lates', start: '14:00', end: '22:00' }, { name: 'Nights', start: '22:00', end: '06:00' }];
const wall = (d: number, h: number, m = 0): number => new Date(2026, 6, d, h, m).getTime();
const ob = (startedAt: number, mins: number, o: Partial<Observation> = {}): Observation => ({ id: `s${startedAt}`, workspaceId: 'L3', category: 'Jam', asset: 'Bagger', startedAt, durationMs: mins * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: startedAt, updatedAt: startedAt, ...o });
const OBS = [ob(wall(1, 5, 59), 10), ob(wall(1, 6, 0), 20), ob(wall(1, 13, 59), 5), ob(wall(1, 14, 0), 8), ob(wall(1, 22, 0), 30), ob(wall(2, 0, 30), 15), ob(wall(2, 6, 10), 12)];

/* a machine that cannot keep a British clock skips these — but the build's own machine must (GitHub Actions fails here, never skips) */
describe.skipIf(!british && !process.env.GITHUB_ACTIONS)('in a British summer', () => {
  it('the clock is British', () => { expect(british).toBe(true); });

  const stops = stopsDataset({ id: 'L3', name: 'Line 3', shifts: SHIFTS }, OBS);
  const col = (name: string) => { const i = stops.fields.findIndex(f => f.name === name); return stops.rows.map(r => r[i]); };
  const by = (r: ReturnType<typeof runTable>) => r.groups.map(g => [g.key.join(' · '), g.values[0]]);

  it('a stop is filed on the day and hour of the clock on the wall — 00:30 on the 2nd is the 2nd, hour 0, though it is still the 1st in Greenwich', () => {
    expect(new Date(wall(2, 0, 30)).toISOString()).toBe('2026-07-01T23:30:00.000Z');
    expect(col('day')).toEqual(['2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-02', '2026-07-02']);
    expect(col('hour')).toEqual([5, 6, 13, 14, 22, 0, 6]);
  });

  it('the shift by the clock: each stop in the shift whose hours it began in, a night that wraps midnight kept whole', () => {
    expect(stops.fields.map(f => f.name).slice(-2)).toEqual(['clock shift', 'shift day']);
    expect(col('clock shift')).toEqual(['Nights', 'Days', 'Days', 'Lates', 'Nights', 'Nights', 'Days']);
    expect(col('shift day')).toEqual(['2026-06-30', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-02']);
    expect(shiftAndDay(SHIFTS, wall(2, 0, 30))).toEqual({ name: 'Nights', day: '2026-07-01' });
    expect(shiftAndDay(SHIFTS, wall(1, 22, 0))).toEqual({ name: 'Nights', day: '2026-07-01' });
    expect(shiftAndDay(SHIFTS, wall(1, 5, 59))).toEqual({ name: 'Nights', day: '2026-06-30' });
  });

  it('“downtime by shift” is a figure — Days 37, Lates 8, Nights 55 of the 100 minutes — and by shift and its day no night is split in two', () => {
    const r = runTable(stops, { groupBy: ['clock shift'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group' } });
    expect(by(r)).toEqual([['Days', 37], ['Lates', 8], ['Nights', 55]]);
    expect(r.totals).toEqual([100]);
    const d = runTable(stops, { groupBy: ['shift day', 'clock shift'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group' } });
    expect(by(d)).toEqual([['2026-06-30 · Nights', 10], ['2026-07-01 · Days', 25], ['2026-07-01 · Lates', 8], ['2026-07-01 · Nights', 45], ['2026-07-02 · Days', 12]]);
    /* by the calendar day the same minutes fall differently: Wednesday's night is split across two days */
    expect(by(runTable(stops, { groupBy: ['day'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group' } }))).toEqual([['2026-07-01', 73], ['2026-07-02', 27]]);
  });

  it('it is said as worked out, never as what a person said; and a line with no shift times is told it cannot be said', () => {
    expect(stops.limits.join(' ')).toMatch(/“clock shift” and “shift day” are WORKED OUT, not what a person said: .*Days 06:00–14:00 · Lates 14:00–22:00 · Nights 22:00–06:00/);
    expect(stops.limits.join(' ')).toMatch(/No stop on this line has a shift said on it/);
    expect(stops.fields.find(f => f.name === 'clock shift')?.calc).toMatch(/when the stop began, against the line’s own shift times/);
    const bare = stopsDataset({ id: 'L3', name: 'Line 3' }, OBS);
    expect(bare.fields.some(f => f.name === 'clock shift')).toBe(false);
    expect(bare.limits.join(' ')).toMatch(/No stop on this line has its shift recorded, and the line has no shift times set .* downtime by shift cannot be said from the stops/);
    expect(missingFields(bare, { groupBy: ['clock shift'], measures: [{ op: 'count' }] })).toEqual(['clock shift']);
    /* a shift with no hours, or the same hour twice, owns no window of the clock */
    expect(timedShifts([{ name: 'A', start: '', end: '' }, { name: 'B', start: '06:00', end: '06:00' }, ...SHIFTS]).map(s => s.name)).toEqual(['Days', 'Lates', 'Nights']);
    expect(stopsDataset({ id: 'L3', name: 'Line 3', shifts: [{ name: 'A', start: '', end: '' }] }, OBS).fields.some(f => f.name === 'clock shift')).toBe(false);
  });

  it('a stop that began in no shift’s hours has no clock shift — not recorded, in a group of its own — and keeps its own day', () => {
    const d = stopsDataset({ id: 'L3', name: 'Line 3', shifts: [SHIFTS[0]] }, OBS);
    const r = runTable(d, { groupBy: ['clock shift'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group' } });
    expect(by(r)).toEqual([[NOT_RECORDED, 63], ['Days', 37]]);
    const i = d.fields.findIndex(f => f.name === 'shift day');
    expect(d.rows.map(row => row[i])).toEqual(['2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-02', '2026-07-02']);
  });

  it('“are Wednesdays worse?” — a part of the day as a field of the question: its weekday, in the order of the week; its month and quarter', () => {
    const wd = (column: string) => by(runTable(stops, { parts: [{ as: 'weekday', column, part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group' } }));
    expect(wd('day')).toEqual([['Wednesday', 73], ['Thursday', 27]]);
    expect(wd('shift day')).toEqual([['Tuesday', 10], ['Wednesday', 78], ['Thursday', 12]]);
    const r = runTable(stops, { parts: [{ as: 'month', column: 'day', part: 'month' }, { as: 'quarter', column: 'day', part: 'quarter' }], groupBy: ['quarter', 'month'], measures: [{ op: 'sum', column: 'minutes' }] });
    expect(by(r)).toEqual([['2026-Q3 · 2026-07', 100]]);
    expect(r.groupBy).toEqual(['quarter', 'month']);
    /* filtered on like any field */
    expect(runTable(stops, { parts: [{ as: 'weekday', column: 'day', part: 'weekday' }], filters: [{ column: 'weekday', op: 'eq', value: 'thursday' }], measures: [{ op: 'sum', column: 'minutes' }] }).totals).toEqual([27]);
    /* a name the question makes is the question's own — never "a field the source does not hold" */
    expect(missingFields(stops, { parts: [{ as: 'weekday', column: 'day', part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'count' }] })).toEqual([]);
    expect(missingFields(stops, { parts: [{ as: 'weekday', column: 'when', part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'count' }] })).toEqual(['when']);
  });

  it('what cannot be worked is refused in words: an hour from days (the table holds “hour” itself), a part of words, a name taken', () => {
    const ask = (as: string, column: string, part: 'hour' | 'month') => () => runTable(stops, { parts: [{ as, column, part }], groupBy: [as], measures: [{ op: 'count' }] });
    expect(ask('h', 'day', 'hour')).toThrow(/“day” holds days with no time of day — an hour cannot be taken from it; this source holds “hour” itself/);
    expect(ask('m', 'line', 'month')).toThrow(/“line” is text, not a date — a month cannot be taken from it/);
    expect(ask('hour', 'day', 'month')).toThrow(/“hour” is already a field — give the month another name/);
    expect(ask('m', 'day', 'hour')).toThrow(TableError);
  });

  it('the groups in the order asked for — newest first when that is what was asked', () => {
    const r = runTable(stops, { time: { column: 'day', by: 'day' }, measures: [{ op: 'sum', column: 'minutes' }], order: { by: 'group', desc: true } });
    expect(by(r)).toEqual([['2026-07-02', 27], ['2026-07-01', 73]]);
  });

  it('a file brought in keeps the day ITS clock said: a cell at 23:30 on the 3rd is the 3rd, and a day written as a day is that day', () => {
    /* a workbook's cell arrives as a Date holding the sheet's own clock as if it were Greenwich's */
    const t = downtimeTable([['Reason', 'Minutes', 'Date'], ['Jam', 5, new Date(Date.UTC(2026, 6, 3, 23, 30))], ['Film', 7, '2026-07-03'], ['Label', 2, new Date(Date.UTC(2026, 0, 15, 0, 10))]]);
    expect(t?.rows.map(r => (r.at === undefined ? null : isoDay(r.at)))).toEqual(['2026-07-03', '2026-07-03', '2026-01-15']);
    expect(new Date(t?.rows[0].at ?? 0).getHours()).toBe(23);
  });

  it('a problem’s days are the days on its page: due on the 10th is the 10th (kept as local midnight — the 9th in Greenwich)', () => {
    const due = new Date(2026, 6, 10).getTime();
    expect(new Date(due).toISOString().slice(0, 10)).toBe('2026-07-09');
    const snag = { id: 'p1', workspaceId: 'L3', problem: 'Bags not opening', status: 'open', raisedAt: wall(1, 0, 20), dueAt: due, createdAt: 0, updatedAt: 0 } as unknown as Snag;
    const d = problemsDataset({ id: 'L3', name: 'Line 3' }, [snag], [{ id: 'L3', name: 'Line 3' }], wall(3, 12));
    const at = (name: string) => d.rows[0][d.fields.findIndex(f => f.name === name)];
    expect(at('due')).toBe('2026-07-10');
    expect(at('raised')).toBe('2026-07-01');
  });
});
