/* MEDIAN, PERCENTILES AND SPREAD — exact or refused (docs/LUNA-ANALYSIS.md A7). Hand-sorted beside the code. */
import { describe, it, expect } from 'vitest';
import { exactPercentile, pushSpread, sampleStdev, SPREAD_CAP, spreadOf } from '../spread';
import { runTable, TableError, type Dataset } from '../../data/table';
import { runQuery } from '../query';
import { readTiny } from './tinyBook';

describe('spread over a sorted list — worked by hand', () => {
  const s = [1, 2, 3, 4, 5];
  it('median 3; p10 1.4; p25 2; p75 4; p90 4.6; stdev ≈ 1.581', () => {
    expect(exactPercentile(s, 0.5)).toBe(3);
    expect(exactPercentile(s, 0.1)).toBeCloseTo(1.4, 12);
    expect(exactPercentile(s, 0.25)).toBe(2);
    expect(exactPercentile(s, 0.75)).toBe(4);
    expect(exactPercentile(s, 0.9)).toBeCloseTo(4.6, 12);
    expect(sampleStdev(s)).toBeCloseTo(1.5811388300841898, 12);
    expect(spreadOf('median', s)).toBe(3);
    expect(spreadOf('stdev', s)).toBeCloseTo(1.5811388300841898, 12);
  });
  it('two values: median interpolated, stdev from both', () => {
    expect(spreadOf('median', [40, 10])).toBe(25);
    expect(spreadOf('stdev', [40, 10])).toBeCloseTo(21.213203435596427, 10);
  });
  it('refuses beyond the cap — never approximated', () => {
    const bag: number[] = [];
    for (let i = 0; i < SPREAD_CAP; i += 1) expect(pushSpread(bag, i)).not.toBe('over');
    expect(pushSpread(bag, SPREAD_CAP)).toBe('over');
  });
});

const ROWS: [string, number][] = [['Jam', 40], ['Jam', 10], ['Film', 20], ['Label', 10], ['Glue', 5], ['Belt', 3]];
const D: Dataset = {
  id: 'stops:x', name: 'Stops', kind: 'stops',
  fields: [{ name: 'reason', type: 'text', means: '' }, { name: 'minutes', type: 'number', means: '' }],
  rows: ROWS.map(r => [...r]), refs: ROWS.map((_r, i) => `r${i}`), limits: [],
};

describe('both engines — median and stdev per reason', () => {
  it('Jam: median 25, stdev ≈ 21.21; Film 20 and null stdev on one value', () => {
    const t = runTable(D, { groupBy: ['reason'], measures: [{ op: 'median', column: 'minutes' }, { op: 'stdev', column: 'minutes' }], order: { by: 'group' } });
    const jam = t.groups.find(g => g.key[0] === 'Jam')!;
    expect(jam.values[0]).toBe(25);
    expect(jam.values[1]).toBeCloseTo(21.213203435596427, 8);
    const film = t.groups.find(g => g.key[0] === 'Film')!;
    expect(film.values).toEqual([20, null]);
  });

  it('the workbook reader agrees on median of Minutes by Reason', async () => {
    const rows = [['Reason', 'Minutes'], ...ROWS.map(([r, m]) => [r, m])];
    const { p, store } = await readTiny({ Stops: rows });
    const sh = p.sheets.find(s => s.name === 'Stops')!;
    const [reason, mins] = sh.columns.map(c => c.name);
    const q = await runQuery(store, p, { sheet: 'Stops', groupBy: [reason], measures: [{ op: 'median', column: mins }, { op: 'p90', column: mins }], order: { by: 'group' } });
    const jam = q.groups.find(g => g.key[0] === 'Jam')!;
    expect(jam.values[0]).toBe(25);
    expect(jam.values[1]).toBeCloseTo(37, 8); /* p90 of [10, 40] = 10 + 30*0.9 = 37 */
    const t = runTable(D, { groupBy: ['reason'], measures: [{ op: 'median', column: 'minutes' }, { op: 'p90', column: 'minutes' }], order: { by: 'group' } });
    expect(t.groups.find(g => g.key[0] === 'Jam')!.values).toEqual(jam.values);
  });

  it('more than 10,000 values in one group is refused in words', () => {
    const big: Dataset = {
      ...D,
      rows: Array.from({ length: SPREAD_CAP + 1 }, (_, i) => ['one', i]),
      refs: Array.from({ length: SPREAD_CAP + 1 }, (_, i) => `x${i}`),
    };
    expect(() => runTable(big, { measures: [{ op: 'median', column: 'minutes' }] })).toThrow(TableError);
    expect(() => runTable(big, { measures: [{ op: 'median', column: 'minutes' }] })).toThrow(/10,000/);
  });
});