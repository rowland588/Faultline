/* CSV AND TSV — one sheet through the workbook reader (docs/LUNA-ANALYSIS.md A9). */
import { describe, it, expect } from 'vitest';
import { readWorkbook } from '../read';
import { runQuery } from '../query';
import { MemoryStore } from '../store';
import { parseTabular, tabularToXlsx } from '../csv';
import type { ByteSource } from '../zip';

const src = (text: string): ByteSource => {
  const b = new TextEncoder().encode(text);
  return { size: b.length, read: async (s, e) => b.subarray(s, e) };
};

describe('a comma- or tab-separated table', () => {
  it('parses and becomes the same shape as a one-sheet workbook', async () => {
    const text = 'Reason,Minutes\nJam,40\nJam,10\nFilm,20\n';
    const { rows } = parseTabular(text);
    expect(rows[0]).toEqual(['Reason', 'Minutes']);
    expect(rows.length).toBe(4);
    const xlsx = tabularToXlsx(rows, 'Downtime');
    expect(xlsx.length).toBeGreaterThan(100);
    const store = new MemoryStore();
    const p = await readWorkbook(src(text), store, { id: 'csv1', name: 'downtime.csv' });
    expect(p.status).toBe('ready');
    expect(p.sheets[0].name).toBe('downtime');
    const r = await runQuery(store, p, { sheet: 'downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(r.groups.map(g => [g.key[0], g.values[0]]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([['Film', 20], ['Jam', 50]]);
    expect(r.totals).toEqual([70]);
  });
});