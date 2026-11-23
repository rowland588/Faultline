/* ONE ENGINE FOR EVERY SOURCE — lookups and calcs on the app’s tables (docs/LUNA-ANALYSIS.md A4). Every figure by hand below.
 *
 * Downtime log (imported)          Stops timed (Line 1)
 *   day       line    minutes        day         line   minutes
 *   2026-09-14  L1      25          2026-09-14  L1        10
 *   2026-09-14  L1      15          2026-09-14  L1        20
 *   2026-09-15  L1      30          2026-09-15  L1         5
 *                                 = 35 timed
 *           = 70 logged            Joined by day+line: 25→35, 15→35, 30→5
 */
import { describe, it, expect } from 'vitest';
import { runTable, type Dataset } from '../table';
import { checkCalcStanding, fieldStanding, lookupMapOf } from '../lookup';
import { runQuery } from '../../workbook/query';
import { readTiny, type TinyCell } from '../../workbook/__tests__/tinyBook';

const LOG: Dataset = {
  id: 'import:log', name: 'Downtime log', kind: 'stops',
  fields: [{ name: 'day', type: 'date', means: 'day' }, { name: 'line', type: 'text', means: 'line' }, { name: 'minutes', type: 'number', means: 'logged minutes' }],
  rows: [['2026-09-14', 'Line 1', 25], ['2026-09-14', 'Line 1', 15], ['2026-09-15', 'Line 1', 30]],
  refs: ['log:1', 'log:2', 'log:3'],
  limits: [],
};
const STOPS: Dataset = {
  id: 'stops:w1', name: 'Line 1 — stops', kind: 'stops',
  fields: [{ name: 'day', type: 'date', means: 'day' }, { name: 'line', type: 'text', means: 'line' }, { name: 'minutes', type: 'number', means: 'timed minutes' }],
  rows: [['2026-09-14', 'Line 1', 10], ['2026-09-14', 'Line 1', 20], ['2026-09-15', 'Line 1', 5]],
  refs: ['stop:1', 'stop:2', 'stop:3'],
  limits: [],
};
const sides = new Map([['stops:w1', STOPS]]);

describe('the same question on both engines — downtime by day with timed minutes looked up', () => {
  const q = {
    groupBy: ['day'],
    measures: [{ op: 'sum' as const, column: 'minutes' }, { op: 'sum' as const, column: 'timed' }],
    lookups: [{ as: 'timed', source: 'stops:w1', match: ['day', 'line'], on: ['day', 'line'], take: { op: 'sum' as const, column: 'minutes' } }],
  };

  it('runTable: logged 70, timed brought 35+35+5 by day', () => {
    const r = runTable(LOG, q, sides);
    expect(r.groups.map(g => [g.key[0], ...g.values])).toEqual([
      ['2026-09-14', 40, 30],
      ['2026-09-15', 30, 5],
    ]);
    expect(r.totals).toEqual([70, 35]);
  });

  it('runQuery on a matching workbook, to the same figures', async () => {
    const log: TinyCell[][] = [['day', 'line', 'minutes'], ...LOG.rows.map(r => [r[0] as TinyCell, r[1] as TinyCell, r[2] as TinyCell])];
    const { p, store } = await readTiny({ Log: log });
    const r = await runQuery(store, p, { sheet: 'Log', ...q, lookups: [{ ...q.lookups![0], sheet: undefined, source: 'stops:w1' }] }, sides);
    expect(r.groups.map(g => [g.key[0], ...g.values])).toEqual([
      ['2026-09-14', 40, 30],
      ['2026-09-15', 30, 5],
    ]);
  });
});

describe('calcs and standing', () => {
  it('minutes × 2 on each row, then summed by line', () => {
    const base = { ...STOPS, rows: STOPS.rows.map(r => [...r]) };
    const r = runTable(base, { groupBy: ['line'], measures: [{ op: 'sum', column: 'double' }], calcs: [{ as: 'double', a: 'minutes', op: '*', b: 2 }] });
    expect(r.totals[0]).toBe(70);
  });

  it('adding system production minutes to floor stops is refused in words', () => {
    const extended: Dataset = {
      ...STOPS,
      fields: [...STOPS.fields, { name: 'packs short', type: 'number', means: 'system — units the MES said were short' }],
      rows: STOPS.rows.map(r => [...r, 10]),
      limits: STOPS.limits,
    };
    expect(fieldStanding(extended, extended.fields[2])).toBe('floor');
    expect(fieldStanding(extended, extended.fields[3])).toBe('system');
    const why = checkCalcStanding(extended, ['minutes', 'packs short']);
    expect(why).toMatch(/different standing/);
    expect(() => runTable(extended, { measures: [{ op: 'sum', column: 'x' }], calcs: [{ as: 'x', a: 'minutes', op: '+', b: 'packs short' }] })).toThrow(/different standing/);
  });

  it('lookup brings rows together by key — only one value per key', () => {
    const many: Dataset = { ...STOPS, rows: [...STOPS.rows, ['2026-09-14', 'Line 1', 99]] };
    const m = lookupMapOf(many, { as: 'x', match: 'day', on: 'day', take: { op: 'only', column: 'minutes' } });
    expect(m.many).toBe(1);
    expect(m.map.get('2026-09-14')).toBeNull();
  });
});