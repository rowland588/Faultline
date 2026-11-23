import { describe, it, expect } from 'vitest';
import { pairsFromResult } from '../fromResult';
import type { QueryResult as QR } from '../../workbook/query';

const R: QR = {
  sheet: 'x',
  measures: ['sum of minutes', 'median of minutes'],
  groupBy: ['line'],
  rowsScanned: 11,
  rowsMatched: 11,
  groupsTotal: 3,
  totals: [145, null],
  groups: [
    { key: ['Line 1'], values: [88, 15], rows: 6, refs: [] },
    { key: ['Line 2'], values: [48, 12], rows: 3, refs: [] },
    { key: ['Line 3'], values: [9, 4.5], rows: 2, refs: [] },
  ],
  skipped: [],
  notes: [],
};

describe('pairs from a kept result', () => {
  it('reads x and y by position — three pairs', () => {
    const b = pairsFromResult(R, 0, 1);
    expect('why' in b).toBe(false);
    if ('why' in b) return;
    expect(b.pairs).toEqual([{ x: 88, y: 15 }, { x: 48, y: 12 }, { x: 9, y: 4.5 }]);
    expect(b.grain).toContain('line');
    expect(b.xName).toBe('sum of minutes');
  });
  it('refuses a total with no groups, and bad positions', () => {
    expect(pairsFromResult({ ...R, groups: [] }, 0, 1)).toEqual({ why: expect.stringMatching(/one total/) });
    expect(pairsFromResult(R, 9, 0)).toEqual({ why: expect.stringMatching(/no figure at position 9/) });
  });
});