/* Capability across products and over time (FC-101): a row each product, a column each month, every cell
 * what the study's own module says of it — and nothing when there is nothing to compare. */
import { describe, it, expect } from 'vitest';
import { overTime, overTimeSays, cellFigure } from '../overTime';
import { sample } from '../sample';
import type { AgreedReadings, ToolStudy } from '../../../lib/study';

const BASE = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81];
const AGREED: AgreedReadings = { kind: 'limits', unit: 'a minute', lower: 75, count: 30 };
const at = (y: number, m: number, d = 10) => new Date(y, m, d, 10).getTime();
const study = (id: string, product: string, startedAt: number, shift: number, over: Partial<ToolStudy> = {}): ToolStudy => ({
  id, tool: 'capability', name: `Study ${id}`, product, agreed: { readings: AGREED }, uses: [], startedAt, createdAt: startedAt, updatedAt: startedAt,
  facts: { readings: BASE.map((v, i) => ({ id: `${id}-${i}`, value: v + shift, at: startedAt + i })) }, ...over,
} as ToolStudy);

describe('capability over time', () => {
  it('needs two studies that say something', () => {
    expect(overTime([])).toBeUndefined();
    expect(overTime([study('a', 'X', at(2026, 8), 0)])).toBeUndefined();
    expect(overTime([study('a', 'X', at(2026, 8), 0), study('b', 'X', at(2026, 9), 0, { deletedAt: 1 })])).toBeUndefined();
    expect(overTime([study('a', 'X', at(2026, 8), 0), study('b', 'X', at(2026, 9), 0, { tool: 'changeover' })])).toBeUndefined();
  });
  it('a column each month, in order, and a row each product by name', () => {
    const t = overTime([study('c', 'Beta', at(2026, 9), 0), study('a', 'Alpha', at(2026, 8), 0), study('b', 'Alpha', at(2026, 9), -4)])!;
    expect(t.months.map(m => m.key)).toEqual(['2026-09', '2026-10']);
    expect(t.rows.map(r => r.who)).toEqual(['Alpha', 'Beta']);
    expect(Object.keys(t.rows[1].cells)).toEqual(['2026-10']);
  });
  it('each cell is the study’s own Ppk, and a slower month is lower', () => {
    const t = overTime([study('a', 'Alpha', at(2026, 8), 0), study('b', 'Alpha', at(2026, 9), -4)])!;
    const own = (shift: number) => `Ppk ${sample(AGREED, BASE.map((v, i) => ({ id: `r${i}`, value: v + shift, at: i }))).ppk!.toFixed(2)}`;
    const [sep, oct] = [t.rows[0].cells['2026-09'], t.rows[0].cells['2026-10']];
    expect([sep.text, oct.text]).toEqual([own(0), own(-4)]);
    expect(Number(oct.text.slice(4))).toBeLessThan(Number(sep.text.slice(4)));
    expect(t.rows[0].latest.text).toBe(oct.text);
  });
  it('a month with two studies shows the later and counts both', () => {
    const t = overTime([study('a', 'Alpha', at(2026, 8, 2), 0), study('b', 'Alpha', at(2026, 8, 20), -4), study('c', 'Alpha', at(2026, 9), 0)])!;
    const cell = t.rows[0].cells['2026-09'];
    expect([cell.studies, cell.id]).toEqual([2, 'b']);
  });
  it('a row is the product, else the machine, else the name', () => {
    const t = overTime([study('a', '', at(2026, 8), 0, { machine: 'Wrapper 2' }), study('b', '', at(2026, 9), 0, { name: 'Weights' })])!;
    expect(t.rows.map(r => r.who)).toEqual(['Weights', 'Wrapper 2']);
  });
  it('says which are not capable now, or that none is', () => {
    const bad = overTime([study('a', 'Alpha', at(2026, 8), 0), study('b', 'Alpha', at(2026, 9), -4)])!;
    expect(overTimeSays(bad)).toBe('1 product or machine over 2 months — Alpha is not capable in the latest study.');
    const good = overTime([study('a', 'Alpha', at(2026, 8), 0), study('b', 'Beta', at(2026, 9), 0)])!;
    expect(overTimeSays(good)).toBe('2 products and machines over 2 months — none is failing in the latest study.');
  });
  it('a study with no readings says nothing', () => {
    expect(cellFigure(study('a', 'X', at(2026, 8), 0, { facts: { readings: [] } } as Partial<ToolStudy>))).toBeUndefined();
  });
});
