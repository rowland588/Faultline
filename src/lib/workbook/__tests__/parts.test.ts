/* A PART OF A DATE AS A COLUMN OF THE QUESTION (22 November 2026 — docs/LUNA-ANALYSIS.md, G4 slice A2; lib/workbook/parts).
 * Every figure here is worked by hand from the rows written below — the engine is checked against sums it did not make.
 *
 * The workbook: a downtime log whose stops have a START TIME, and a sheet of what was made each DAY.
 *
 *   Stops  Start              Line    Reason  Minutes        weekday    hour  quarter
 *          14 Sep 2026 06:10  Line 1  Jam        10          Monday       6   2026-Q3
 *          14 Sep 2026 13:45  Line 1  Film       20          Monday      13   2026-Q3
 *          15 Sep 2026 06:30  Line 1  Jam         5          Tuesday      6   2026-Q3
 *          15 Sep 2026 22:15  Line 2  Jam        30          Tuesday     22   2026-Q3
 *          16 Sep 2026 00:30  Line 2  Film       15          Wednesday    0   2026-Q3
 *          21 Sep 2026 06:05  Line 1  Jam        40          Monday       6   2026-Q3
 *           1 Oct 2026 14:20  Line 2  Jam         8          Thursday    14   2026-Q4
 *          (no start)         Line 2  Jam         7          —            —   —
 *                                              = 135
 *   Made   14 Sep Line 1 1,000 · 15 Sep Line 1 900 · 15 Sep Line 2 800 · 16 Sep Line 2 700 · 21 Sep Line 1 600
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { PART_KINDS, WEEK_ORDER, cmpGroupKeys, hasTime, partType, partValue, readParts } from '../parts';
import { runQuery, QueryError, type QueryResult } from '../query';
import type { WorkbookProfile } from '../read';
import type { MemoryStore } from '../store';
import { readTiny, type TinyCell } from './tinyBook';

const at = (y: number, m: number, d: number, h = 0, min = 0): number => Date.UTC(y, m - 1, d, h, min);
const T = (y: number, m: number, d: number, h = 0, min = 0): TinyCell => ({ at: at(y, m, d, h, min) });

const STOPS: TinyCell[][] = [
  ['Start', 'Line', 'Reason', 'Minutes'],
  [T(2026, 9, 14, 6, 10), 'Line 1', 'Jam', 10],
  [T(2026, 9, 14, 13, 45), 'Line 1', 'Film', 20],
  [T(2026, 9, 15, 6, 30), 'Line 1', 'Jam', 5],
  [T(2026, 9, 15, 22, 15), 'Line 2', 'Jam', 30],
  [T(2026, 9, 16, 0, 30), 'Line 2', 'Film', 15],
  [T(2026, 9, 21, 6, 5), 'Line 1', 'Jam', 40],
  [T(2026, 10, 1, 14, 20), 'Line 2', 'Jam', 8],
  [null, 'Line 2', 'Jam', 7],
];
const MADE: TinyCell[][] = [
  ['Date', 'Line', 'Packs'],
  [T(2026, 9, 14), 'Line 1', 1000],
  [T(2026, 9, 15), 'Line 1', 900],
  [T(2026, 9, 15), 'Line 2', 800],
  [T(2026, 9, 16), 'Line 2', 700],
  [T(2026, 9, 21), 'Line 1', 600],
];

describe('a part of a moment, worked by hand', () => {
  const m = at(2026, 9, 14, 13, 45);   /* a Monday — 1 January 2026 was a Thursday, and 14 September is its 257th day */
  it('each part is what it says', () => {
    expect(partValue(m, 'day')).toBe(at(2026, 9, 14));
    expect(partValue(m, 'week')).toBe('2026-W38');
    expect(partValue(m, 'month')).toBe('2026-09');
    expect(partValue(m, 'quarter')).toBe('2026-Q3');
    expect(partValue(m, 'year')).toBe(2026);
    expect(partValue(m, 'hour')).toBe(13);
    expect(partValue(m, 'weekday')).toBe('Monday');
    expect(partValue(at(2026, 9, 20, 23, 59), 'weekday')).toBe('Sunday');
  });
  it('a quarter turns over with its months, and a year with its last day', () => {
    expect(partValue(at(2026, 3, 31, 23, 59), 'quarter')).toBe('2026-Q1');
    expect(partValue(at(2026, 4, 1), 'quarter')).toBe('2026-Q2');
    expect(partValue(at(2026, 12, 31), 'quarter')).toBe('2026-Q4');
    expect(partValue(at(2027, 1, 1), 'quarter')).toBe('2027-Q1');
  });
  it('a day is a date, a year and an hour are numbers, the rest are words; a day at its own midnight holds no time', () => {
    expect(PART_KINDS.map(partType)).toEqual(['date', 'text', 'text', 'text', 'number', 'number', 'text']);
    expect(hasTime(at(2026, 9, 14))).toBe(false);
    expect(hasTime(m)).toBe(true);
  });
  it('the days of the week are put in the order of the week — and a group that is no weekday after the seven', () => {
    const keys = [['Wednesday'], ['(blank)'], ['Monday'], ['Sunday'], ['Friday'], ['Tuesday']];
    expect([...keys].sort((a, b) => cmpGroupKeys(a, b)).map(k => k[0])).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Sunday', '(blank)']);
    expect(WEEK_ORDER[0]).toBe('Monday');
    /* with another key before it: by that key, then by the week */
    expect([['Line 2', 'Monday'], ['Line 1', 'Tuesday'], ['Line 1', 'Monday']].sort((a, b) => cmpGroupKeys(a, b))).toEqual([['Line 1', 'Monday'], ['Line 1', 'Tuesday'], ['Line 2', 'Monday']]);
    /* where no key is a weekday the order is what it always was: the keys joined, numbers by their size */
    expect([['Line 10'], ['Line 2'], ['Line 1']].sort((a, b) => cmpGroupKeys(a, b)).map(k => k[0])).toEqual(['Line 1', 'Line 2', 'Line 10']);
  });
  it('what was asked for is checked, and refused in words when it is not a part', () => {
    expect(readParts(undefined)).toEqual([]);
    expect(readParts([{ as: ' day of week ', column: 'Start', part: 'weekday' }])).toEqual([{ as: 'day of week', column: 'Start', part: 'weekday' }]);
    expect(readParts([{ as: 'x', column: 'Start', part: 'fortnight' }])).toMatch(/day, week, month, quarter, year, hour or weekday/);
    expect(readParts([{ column: 'Start', part: 'hour' }])).toMatch(/as, column, part/);
    expect(readParts(new Array(5).fill({ as: 'a', column: 'b', part: 'day' }))).toMatch(/up to four/);
  });
});

describe('a workbook asked by a part of its dates', () => {
  let p: WorkbookProfile, store: MemoryStore;
  beforeAll(async () => { ({ p, store } = await readTiny({ Stops: STOPS, Made: MADE })); });
  const groups = (r: QueryResult): [string, number | string | null][] => r.groups.map(g => [g.key.join(' · '), g.values[0]]);

  it('the log is read as it was written: a date column with times of day, eight rows', () => {
    const s = p.sheets.find(x => x.name === 'Stops');
    expect(s?.columns.map(c => [c.name, c.type])).toEqual([['Start', 'date'], ['Line', 'text'], ['Reason', 'text'], ['Minutes', 'number']]);
    expect(s?.rows).toBe(8);
  });

  it('“are Mondays worse?” — minutes by the day of the week, in the order of the week, the row with no start in a group of its own', async () => {
    const r = await runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'weekday', column: 'Start', part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'sum', column: 'Minutes' }], order: { by: 'group' } });
    expect(groups(r)).toEqual([['Monday', 70], ['Tuesday', 35], ['Wednesday', 15], ['Thursday', 8], ['(blank)', 7]]);
    expect(r.totals).toEqual([135]);
    expect(r.groupBy).toEqual(['weekday']);
    expect(r.notes.join(' ')).toMatch(/“weekday” is the day of the week of “Start”, worked by the app on each row/);
    expect(r.notes.join(' ')).toMatch(/1 rows of “Stops” have no date in “Start” — they have no “weekday”/);
    /* biggest first is still the default — and it is the same figures */
    const big = await runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'weekday', column: 'Start', part: 'weekday' }], groupBy: ['weekday'], measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(groups(big)[0]).toEqual(['Monday', 70]);
  });

  it('“which hour?” — stops counted by the hour they began', async () => {
    const r = await runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'hour', column: 'Start', part: 'hour' }], groupBy: ['hour'], measures: [{ op: 'count' }], order: { by: 'group' } });
    expect(groups(r)).toEqual([['(blank)', 1], ['0', 1], ['6', 3], ['13', 1], ['14', 1], ['22', 1]]);
  });

  it('by quarter, by month, by ISO week and by day — each row in one group, the groups adding back to the whole', async () => {
    const by = async (part: 'quarter' | 'month' | 'week' | 'day') => groups(await runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'when', column: 'Start', part }], groupBy: ['when'], measures: [{ op: 'sum', column: 'Minutes' }], order: { by: 'group' } }));
    expect(await by('quarter')).toEqual([['(blank)', 7], ['2026-Q3', 120], ['2026-Q4', 8]]);
    expect(await by('month')).toEqual([['(blank)', 7], ['2026-09', 120], ['2026-10', 8]]);
    expect(await by('week')).toEqual([['(blank)', 7], ['2026-W38', 80], ['2026-W39', 40], ['2026-W40', 8]]);
    expect(await by('day')).toEqual([['(blank)', 7], ['2026-09-14', 30], ['2026-09-15', 35], ['2026-09-16', 15], ['2026-09-21', 40], ['2026-10-01', 8]]);
  });

  it('a part is filtered on like any column — the Mondays; the hours of the day shift; one quarter', async () => {
    const q = (filters: NonNullable<Parameters<typeof runQuery>[2]['filters']>, part: 'weekday' | 'hour' | 'quarter') => runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'when', column: 'Start', part }], filters, measures: [{ op: 'sum', column: 'Minutes' }, { op: 'count' }] });
    expect((await q([{ column: 'when', op: 'eq', value: 'monday' }], 'weekday')).totals).toEqual([70, 3]);
    const two = await q([{ column: 'when', op: 'in', values: ['Tuesday', 'Wednesday'] }], 'weekday');
    expect(two.totals).toEqual([50, 3]);
    /* two values asked for are two things — never noted as "2 spellings … say if they are not the same thing" */
    expect(two.notes.join(' ')).not.toMatch(/spellings/);
    expect((await q([{ column: 'when', op: 'between', from: 6, to: 13 }], 'hour')).totals).toEqual([75, 4]);
    expect((await q([{ column: 'when', op: 'eq', value: '2026-Q4' }], 'quarter')).totals).toEqual([8, 1]);
  });

  it('two parts in one question — the line’s minutes by weekday and hour', async () => {
    const r = await runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'weekday', column: 'Start', part: 'weekday' }, { as: 'hour', column: 'Start', part: 'hour' }], filters: [{ column: 'Line', op: 'eq', value: 'Line 1' }], groupBy: ['weekday', 'hour'], measures: [{ op: 'sum', column: 'Minutes' }], order: { by: 'group' } });
    expect(groups(r)).toEqual([['Monday · 6', 50], ['Monday · 13', 20], ['Tuesday · 6', 5]]);
  });

  it('a stop is tied to what was made on ITS DAY: the log holds a start time, the other sheet a day — matched by the day of the start and the line', async () => {
    const r = await runQuery(store, p, {
      sheet: 'Stops', parts: [{ as: 'stop day', column: 'Start', part: 'day' }],
      lookups: [{ as: 'Packs that day', sheet: 'Made', match: ['stop day', 'Line'], on: ['Date', 'Line'], take: { op: 'only', column: 'Packs' } }],
      groupBy: ['Packs that day'], measures: [{ op: 'sum', column: 'Minutes' }], order: { by: 'group' },
    });
    /* 14 Sep Line 1 → 1,000 (10 + 20 min) · 15 Sep Line 1 → 900 (5) · 15 Sep Line 2 → 800 (30) · 16 Sep Line 2 → 700 (15) ·
       21 Sep Line 1 → 600 (40); 1 Oct has no day on Made (8 min, blank), and the stop with no start has no key (7 min, blank) */
    expect(groups(r)).toEqual([['(blank)', 15], ['600', 40], ['700', 15], ['800', 30], ['900', 5], ['1000', 30]]);
    expect(r.notes.join(' ')).toMatch(/1 rows had a value not found for “Packs that day” \(e\.g\. “2026-10-01 · Line 2”\)/);
  });

  it('and the other way round: each day’s stop minutes brought onto what was made, the LOG’s start read by its day', async () => {
    const r = await runQuery(store, p, {
      sheet: 'Made',
      lookups: [{ as: 'Stop minutes', sheet: 'Stops', parts: [{ as: 'stop day', column: 'Start', part: 'day' }], match: ['Date', 'Line'], on: ['stop day', 'Line'], take: { op: 'sum', column: 'Minutes' } }],
      groupBy: ['Date', 'Line'], measures: [{ op: 'sum', column: 'Stop minutes' }, { op: 'sum', column: 'Packs' }], order: { by: 'group' },
    });
    expect(r.groups.map(g => [g.key.join(' · '), g.values[0], g.values[1]])).toEqual([
      ['2026-09-14 · Line 1', 30, 1000], ['2026-09-15 · Line 1', 5, 900], ['2026-09-15 · Line 2', 30, 800], ['2026-09-16 · Line 2', 15, 700], ['2026-09-21 · Line 1', 40, 600],
    ]);
    /* 120 of the log's 135 minutes: the 8 on 1 October have no row on Made, the 7 with no start have no day — and none is counted twice */
    expect(r.totals).toEqual([120, 4000]);
    expect(r.notes.join(' ')).toMatch(/the sum of “Minutes” on “Stops” for each “the day of Start” \+ “Line”/);
  });

  it('an hour is never said of days: refused in words where every date is at midnight', async () => {
    await expect(runQuery(store, p, { sheet: 'Made', parts: [{ as: 'hour', column: 'Date', part: 'hour' }], groupBy: ['hour'], measures: [{ op: 'sum', column: 'Packs' }] }))
      .rejects.toThrow(/“Date” on “Made” holds days with no time of day — every one of its 5 dates is at midnight — so an hour cannot be taken from it/);
    /* (the same in a lookup's own parts) */
    await expect(runQuery(store, p, { sheet: 'Stops', parts: [{ as: 'h', column: 'Start', part: 'hour' }], lookups: [{ as: 'x', sheet: 'Made', parts: [{ as: 'made hour', column: 'Date', part: 'hour' }], match: ['h'], on: ['made hour'], take: { op: 'sum', column: 'Packs' } }], measures: [{ op: 'sum', column: 'x' }] }))
      .rejects.toThrow(/cannot be taken — every one of its dates is at midnight/);
  });

  it('what cannot be worked is refused before a row is read: not a date, a name already a column, too many', async () => {
    const ask = (parts: NonNullable<Parameters<typeof runQuery>[2]['parts']>) => runQuery(store, p, { sheet: 'Stops', parts, measures: [{ op: 'count' }] });
    await expect(ask([{ as: 'x', column: 'Line', part: 'month' }])).rejects.toThrow(/“Line” holds text, not dates — a month cannot be taken from it/);
    await expect(ask([{ as: 'Line', column: 'Start', part: 'month' }])).rejects.toThrow(/“Line” is already a column — give the month another name/);
    await expect(ask([{ as: 'x', column: 'Nothing', part: 'month' }])).rejects.toThrow(QueryError);
    await expect(ask(new Array(5).fill(0).map((_x, i) => ({ as: `p${i}`, column: 'Start', part: 'month' as const })))).rejects.toThrow(/At most 4 parts/);
  });

  it('a question with no parts is answered exactly as it was', async () => {
    const r = await runQuery(store, p, { sheet: 'Stops', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(groups(r)).toEqual([['Line 1', 75], ['Line 2', 60]]);
    const t = await runQuery(store, p, { sheet: 'Stops', time: { column: 'Start', by: 'month' }, measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(groups(t)).toEqual([['2026-09', 120], ['2026-10', 8]]);
    expect(t.notes.join(' ')).toMatch(/1 matching rows have no date in “Start” and are left out of the months/);
  });
});
