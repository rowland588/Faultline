import { describe, it, expect } from 'vitest';
import { chartWorth } from '../autoChart';
import type { DataResult } from '../../lib/data/outputs';
import type { Used } from '../conversation';

const result = (id: string, n: number, time: boolean): DataResult => ({ id, title: 'OpVar by month', at: 1, source: { kind: 'workbook', id: 'w', name: 'W' }, query: time ? { time: { column: 'Date', by: 'month' } } : { groupBy: ['Line'] },
  result: { sheet: 'S', rowsScanned: 9, rowsMatched: 9, groups: Array.from({ length: n }, (_, i) => ({ key: [`k${i}`], values: [i * 10], rows: 1, refs: [] })), groupsTotal: n, totals: [0], measures: ['sum'], groupBy: [], skipped: [], notes: [] } });
const step = (name: string, resultId?: string, status: Used['status'] = 'done'): Used => ({ callId: name + (resultId ?? ''), name, title: name, kind: 'read', status, says: '', refs: resultId ? [{ kind: 'result', id: resultId, label: '', href: '' }] : [], at: 1 } as Used);
const map = (...rs: DataResult[]) => new Map(rs.map(r => [r.id, r]));

describe('the chart the app draws when Luna did not', () => {
  it('a series over time is drawn as a line, asked for or not', () => {
    expect(chartWorth('Show me B’s trend month by month', [step('query_workbook', 'R1')], map(result('R1', 9, true)))).toEqual({ resultId: 'R1', type: 'line' });
    expect(chartWorth('how did B do', [step('query_data', 'R1')], map(result('R1', 9, true)))).toEqual({ resultId: 'R1', type: 'line' });
  });
  it('a split is drawn only when a picture was asked for', () => {
    expect(chartWorth('graph it by line', [step('query_data', 'R2')], map(result('R2', 6, false)))).toEqual({ resultId: 'R2', type: 'column' });
    expect(chartWorth('which line is worst', [step('query_data', 'R2')], map(result('R2', 6, false)))).toBeNull();
  });
  it('never a second picture, never from fewer than three points, never from a step that failed', () => {
    expect(chartWorth('trend', [step('query_data', 'R1'), step('make_chart')], map(result('R1', 9, true)))).toBeNull();
    expect(chartWorth('trend', [step('query_data', 'R1')], map(result('R1', 2, true)))).toBeNull();
    expect(chartWorth('trend', [step('query_data', 'R1', 'failed')], map(result('R1', 9, true)))).toBeNull();
    expect(chartWorth('trend', [], map())).toBeNull();
  });
  it('the newest result of the turn is the one drawn', () => {
    expect(chartWorth('trend', [step('query_data', 'R1'), step('query_data', 'R3')], map(result('R1', 9, true), result('R3', 5, true)))?.resultId).toBe('R3');
  });
});
