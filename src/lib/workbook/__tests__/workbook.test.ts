/* A WORKBOOK READ, CHECKED AGAINST TOTALS IT DID NOT MAKE (docs/WORKBOOKS.md). The generator (scripts/workbook/make-workbook.mjs) writes a
 * downtime workbook as Excel writes one and keeps its own totals as it writes; the reader and the query engine must agree with every one —
 * and say what is wrong with the data (the header under a title, a line written two ways, words in a number column, formulas with no saved
 * value, errors, repeated rows, a hidden sheet and column), what it could not read (a pivot cache), and refuse a damaged file in words. */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, openSync, readSync, fstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkbook, type WorkbookProfile } from '../read';
import { runQuery, sourceRows, QueryError } from '../query';
import { MemoryStore } from '../store';
import { zipIndex, ZipError, type ByteSource } from '../zip';

const ROWS = 30_000;
const dir = mkdtempSync(join(tmpdir(), 'wb-'));
const file = join(dir, 'downtime.xlsx');
type Exp = { rows: number; header: number; above: string[]; minutesByReason: Record<string, number>; minutesByLine: Record<string, number>; minutesByMonth: Record<string, number>; rowsByShift: Record<string, number>; minutesTotal: number; minutesBlank: number; minutesText: number; formulas: number; formulasNoValue: number; errors: number; duplicates: number; packsLost: number; line3Variant: number; bagLine3Minutes: number; bagLine3Rows: number; firstBagLine3Row: number };
let exp: Exp;
const bytes = (b: Uint8Array): ByteSource => ({ size: b.length, read: async (s, e) => b.subarray(s, e) });
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.length); } }; };
let p: WorkbookProfile;
const store = new MemoryStore();
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6 * Math.max(1, Math.abs(b)));

beforeAll(async () => {
  execFileSync('node', ['scripts/workbook/make-workbook.mjs', file, String(ROWS)], { stdio: 'ignore' });
  exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8'));
  p = await readWorkbook(onDisk(file), store, { id: 't', name: 'downtime.xlsx' });
}, 120_000);

describe('a workbook read from the file, a part at a time', () => {
  it('its structure: three sheets (one hidden), the header found under the title, the defined name, the table, the pivot cache listed as not read', () => {
    expect(p.status).toBe('ready');
    expect(p.sheets.map(s => [s.name, s.state])).toEqual([['Downtime', 'visible'], ['Products', 'visible'], ['Lookups', 'hidden']]);
    const d = p.sheets[0];
    expect(d.headerRow).toBe(exp.header);
    expect(d.above).toEqual(exp.above);
    expect(d.rows).toBe(exp.rows);
    expect(d.columns.map(c => c.name)).toEqual(['Date', 'Shift', 'Line', 'Machine', 'Reason', 'Minutes', 'Stops', 'Packs lost', 'Note']);
    expect(d.columns.map(c => c.type)).toEqual(['date', 'text', 'text', 'text', 'text', 'number', 'number', 'number', 'text']);
    expect(d.hiddenColumns).toEqual(['I']);
    expect(d.columns.find(c => c.name === 'Note')!.hidden).toBe(true);
    expect(d.merged).toBe(1);
    expect(p.names).toEqual([{ name: 'ReasonList', ref: 'Lookups!$A$2:$A$9', hidden: false }]);
    expect(p.tables).toEqual([{ name: 'ProductRates', sheet: 'Products', ref: 'A1:C51', columns: ['Product', 'Machine', 'Rate per min'] }]);
    expect(p.notRead.map(n => n.what)).toContain('A pivot table’s cache');
    expect(p.notRead.find(n => n.what === 'A pivot table’s cache')!.detail).toMatch(/built from Downtime!A3:I30003/);
    /* found from the values: the machines the log and the products table share, and the log's reasons in the hidden list of reasons
       (its column has no header — matched by what it holds, the list naming each reason once) */
    expect(p.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ a: 'Downtime', b: 'Products', column: 'Machine', overlap: 1 }),
      expect.objectContaining({ a: 'Downtime', b: 'Lookups', column: 'Reason', bColumn: 'Column A', shared: 8, overlap: 1, key: 'Lookups' }),
    ]));
    expect(p.links).toHaveLength(2);
  });

  it('what is wrong with the data: blanks, words in the minutes, formulas with no saved value, errors, repeated rows, a line written two ways', () => {
    const d = p.sheets[0];
    const min = d.columns.find(c => c.name === 'Minutes')!;
    expect(min.counts.blank).toBe(exp.minutesBlank);
    expect(min.counts.text).toBe(exp.minutesText);
    expect(d.formulas).toBe(exp.formulas);
    expect(d.formulasNoValue).toBe(exp.formulasNoValue);
    expect(d.columns.find(c => c.name === 'Packs lost')!.formula).toMatch(/^F\d+\*60$/);
    expect(d.errors).toBe(exp.errors);
    expect(d.columns.find(c => c.name === 'Stops')!.errors).toEqual({ '#N/A': exp.errors });
    expect(d.duplicateRows).toBe(exp.duplicates);
    const line = d.columns.find(c => c.name === 'Line')!;
    expect(line.variants).toEqual([[['Line 3', expect.any(Number)], ['line 3 ', exp.line3Variant]]]);
  });

  it('a question over every row agrees with the generator: minutes by reason, by line, by month; rows by shift; the words it could not add named', async () => {
    const r = await runQuery(store, p, { sheet: 'Downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(r.rowsScanned).toBe(exp.rows);
    for (const g of r.groups) close(g.values[0] as number, exp.minutesByReason[g.key[0]]);
    expect(r.groups.map(g => g.key[0])).toEqual(Object.entries(exp.minutesByReason).sort((a, b) => b[1] - a[1]).map(x => x[0]));
    close(r.totals[0] as number, exp.minutesTotal);
    expect(r.skipped).toEqual([{ measure: 'sum of Minutes', count: exp.minutesText, refs: expect.arrayContaining([expect.stringMatching(/^Downtime!F\d+$/)]) }]);
    const byLine = await runQuery(store, p, { sheet: 'Downtime', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Minutes' }] });
    for (const g of byLine.groups) close(g.values[0] as number, exp.minutesByLine[g.key[0]]);
    const byMonth = await runQuery(store, p, { sheet: 'Downtime', time: { column: 'Date', by: 'month' }, measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(byMonth.groups.map(g => g.key[0])).toEqual(Object.keys(exp.minutesByMonth).sort());
    for (const g of byMonth.groups) close(g.values[0] as number, exp.minutesByMonth[g.key[0]]);
    const shifts = await runQuery(store, p, { sheet: 'Downtime', groupBy: ['Shift'], measures: [{ op: 'count' }] });
    for (const g of shifts.groups) expect(g.values[0]).toBe(exp.rowsByShift[g.key[0]]);
    const packs = await runQuery(store, p, { sheet: 'Downtime', measures: [{ op: 'sum', column: 'Packs lost' }] });
    close(packs.totals[0] as number, exp.packsLost);
    expect(packs.notes.join(' ')).toMatch(/worked out by formulas in the workbook .* the values used are the ones Excel saved; \d+ have no saved value/);
  });

  it('filters and the source rows behind a finding, each cell with its reference', async () => {
    const r = await runQuery(store, p, { sheet: 'Downtime', filters: [{ column: 'Reason', op: 'eq', value: 'bag presentation' }, { column: 'Line', op: 'eq', value: 'Line 3' }], measures: [{ op: 'sum', column: 'Minutes' }, { op: 'count' }] });
    close(r.totals[0] as number, exp.bagLine3Minutes);
    expect(r.notes.join(' ')).toMatch(/The filter on “Line” matched 2 spellings, taken together: “Line 3”, “line 3 ” — say if they are not the same thing/);
    const rows = await sourceRows(store, p, { sheet: 'Downtime', filters: [{ column: 'Reason', op: 'eq', value: 'Bag presentation' }, { column: 'Line', op: 'eq', value: 'Line 3' }, { column: 'Minutes', op: 'notblank' }], limit: 3 });
    expect(rows.rows[0].row).toBe(exp.firstBagLine3Row);
    expect(rows.rows[0].cells.Reason).toEqual({ value: 'Bag presentation', ref: `Downtime!E${exp.firstBagLine3Row}` });
    expect(rows.rows[0].cells.Date.value).toMatch(/^2026-\d\d-\d\d$/);
    const dated = await runQuery(store, p, { sheet: 'Downtime', filters: [{ column: 'Date', op: 'between', from: '2026-03-01', to: '2026-03-31' }], measures: [{ op: 'sum', column: 'Minutes' }] });
    close(dated.totals[0] as number, exp.minutesByMonth['2026-03']);
  });

  it('a question that cannot be answered is refused in words: no such sheet, no such column, words added up', async () => {
    await expect(runQuery(store, p, { sheet: 'Nope', measures: [{ op: 'count' }] })).rejects.toThrow(/No sheet “Nope” — the sheets are “Downtime”, “Products”, “Lookups”/);
    await expect(runQuery(store, p, { sheet: 'Downtime', groupBy: ['Crew'], measures: [{ op: 'count' }] })).rejects.toThrow(QueryError);
    await expect(runQuery(store, p, { sheet: 'Downtime', measures: [{ op: 'sum', column: 'Reason' }] })).rejects.toThrow(/holds text, not numbers — it cannot be added up/);
  });
});

describe('a damaged or wrong file is refused in words', () => {
  const whole = () => new Uint8Array(readFileSync(file));
  it('cut short (an interrupted copy) — the end of the file is missing', async () => {
    const b = whole();
    await expect(zipIndex(bytes(b.subarray(0, b.length - 200)))).rejects.toThrow(ZipError);
    await expect(readWorkbook(bytes(b.subarray(0, Math.floor(b.length / 2))), new MemoryStore(), { id: 'x', name: 'x' })).rejects.toThrow(/not a zip|cut short/);
  });
  it('not a workbook at all', async () => {
    await expect(readWorkbook(bytes(new TextEncoder().encode('Date,Minutes\n2026-01-01,4\n'.repeat(10))), new MemoryStore(), { id: 'x', name: 'x.csv' })).rejects.toThrow(/not a zip/);
  });
  it('stopped part way: the read is said partial, never complete', async () => {
    const signal = { stopped: false };
    const r = await readWorkbook(onDisk(file), new MemoryStore(), { id: 's', name: 's', signal, onProgress: x => { if (x.done > x.total * 0.3) signal.stopped = true; } });
    expect(r.status).toBe('partial');
    expect(r.sheets.some(s => !s.read)).toBe(true);
  });
  it('a ZIP64 directory (a workbook past 4 GB writes one) is read the same', async () => {
    const b = whole();
    const u32 = (x: Uint8Array, o: number) => (x[o] | (x[o + 1] << 8) | (x[o + 2] << 16)) + x[o + 3] * 0x1000000;
    let e = b.length - 22; while (u32(b, e) !== 0x06054b50) e -= 1;
    const entries = b[e + 10] | (b[e + 11] << 8), cdSize = u32(b, e + 12), cdOffset = u32(b, e + 16);
    const z = new Uint8Array(56 + 20 + 22); const dv = new DataView(z.buffer);
    dv.setUint32(0, 0x06064b50, true); dv.setBigUint64(4, 44n, true); dv.setBigUint64(24, BigInt(entries), true); dv.setBigUint64(32, BigInt(entries), true); dv.setBigUint64(40, BigInt(cdSize), true); dv.setBigUint64(48, BigInt(cdOffset), true);
    dv.setUint32(56, 0x07064b50, true); dv.setBigUint64(64, BigInt(e), true); dv.setUint32(72, 1, true);
    dv.setUint32(76, 0x06054b50, true); dv.setUint16(86, 0xffff, true); dv.setUint16(84, 0xffff, true); dv.setUint32(88, 0xffffffff, true); dv.setUint32(92, 0xffffffff, true);
    const z64 = new Uint8Array(e + z.length); z64.set(b.subarray(0, e)); z64.set(z, e);
    const a = await zipIndex(bytes(b)), c = await zipIndex(bytes(z64));
    expect(c).toEqual(a);
  });
});
