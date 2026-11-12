/* THE FIRST LOOK, CHECKED AGAINST TOTALS IT DID NOT MAKE (docs/WORKBOOKS.md). scripts/workbook/make-hourly-workbook.mjs writes an hour-by-hour
 * labour workbook in the shape a packing site keeps (every name and figure made up) and keeps its own totals as it writes; the first look
 * must find the table, the roles and every figure it says from the rows alone. */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, openSync, readSync, fstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkbook, type WorkbookProfile } from '../read';
import { runQuery } from '../query';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { figure, firstLook, rolesOf, type FirstLook } from '../firstLook';

const dir = mkdtempSync(join(tmpdir(), 'wbf-'));
const file = join(dir, 'Packing labour hour by hour.xlsx');
type Exp = { rows: number; pl: number; plByMonth: Record<string, number>; plByLine: Record<string, number>; plByLineMonth: Record<string, number>; daysByMonth: Record<string, number>; dt: number; dtBlank: number; dtBlankRows: number };
let exp: Exp, p: WorkbookProfile, look: FirstLook, asked = 0;
const store = new MemoryStore();
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); } }; };
const P = 'Direct P&L £ (fav +)';
const money = (v: number) => figure(v, P, 'outcome');

beforeAll(async () => {
  execFileSync('node', ['scripts/workbook/make-hourly-workbook.mjs', file], { stdio: 'ignore' });
  exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8'));
  p = await readWorkbook(onDisk(file), store, { id: 'h', name: 'Packing labour hour by hour.xlsx' });
  look = (await firstLook(p, q => { asked += 1; return runQuery(store, p, q); })) as FirstLook;
}, 120_000);

describe('the first look at a workbook, worked in code', () => {
  it('finds the table worth analysing and what its columns are — from their own headings', () => {
    const r = rolesOf(p);
    expect(r?.sheet).toBe('Hourly archive');
    expect(r?.rows).toBe(exp.rows);
    expect(r?.date).toBe('Date');
    expect(r?.headline).toEqual({ column: P, kind: 'outcome' });
    expect(r?.measures.map(m => m.column)).toEqual(expect.arrayContaining([P, 'Unplanned DT (mins)', 'Direct labour cost £', 'Earned labour value £', 'Tonnes']));
    expect(r?.measures.map(m => m.column)).not.toContain('Efficiency %');
    expect(r?.measures.map(m => m.column)).not.toContain('Hour');
    expect(r?.dims).toEqual(expect.arrayContaining(['Line', 'Product', 'Shift', 'Downtime reason']));
    expect(r?.reason).toEqual({ dim: 'Downtime reason', lost: 'Unplanned DT (mins)' });
  });
  it('the months with their days — a month with far fewer days is PART of a month and compared a day', () => {
    expect(look.months.map(m => [m.key, m.days, m.part])).toEqual([['2026-07', 5, true], ['2026-08', 31, false], ['2026-09', 30, false], ['2026-10', 31, false], ['2026-11', 9, true]]);
    const hi = look.roles.measures.slice(0, 4).findIndex(m => m.column === P);
    for (const m of look.months) expect(m.values[hi]).toBeCloseTo(exp.plByMonth[m.key], 1);
    const said = look.says.join('\n');
    expect(said).toContain(`November is only 9 days in, so it is compared a day: ${money(exp.plByMonth['2026-11'] / 9)} a day so far, against ${money(exp.plByMonth['2026-10'] / 31)} a day in October.`);
    expect(said).toContain('July (part — 5 days)');
  });
  it('where the figure sits: the worst and the best line, as the generator\'s own totals rank them', () => {
    const line = look.splits.find(s => s.dim === 'Line');
    const asc = Object.entries(exp.plByLine).sort((a, b) => a[1] - b[1]);
    expect(line?.worst.map(w => w.key)).toEqual(asc.filter(x => x[1] < 0).map(x => x[0]));
    expect(look.splits.map(s => s.dim)).not.toContain('Shift');
    expect(line?.worst[0].value).toBeCloseTo(asc[0][1], 1);
    expect(line?.best?.key).toBe(asc[asc.length - 1][0]);
    expect(look.says.join('\n')).toContain(`By “Line” (6): losing ${asc[0][0]} ${money(asc[0][1])}, ${asc[1][0]} ${money(asc[1][1])}; best ${asc[asc.length - 1][0]} ${money(asc[asc.length - 1][1])}.`);
  });
  it('what moved between the last two whole months — September to October, the biggest mover Line 2', () => {
    expect(look.moved?.before.key).toBe('2026-09');
    expect(look.moved?.after.key).toBe('2026-10');
    expect(look.moved?.change.change).toBeCloseTo(exp.plByMonth['2026-10'] - exp.plByMonth['2026-09'], 1);
    expect(look.moved?.change.best?.field).toBe('Line');
    expect(look.moved?.change.best?.movers[0].key).toBe('Line 2');
    expect(look.moved?.change.best?.movers[0].change).toBeCloseTo(exp.plByLineMonth['Line 2|2026-10'] - exp.plByLineMonth['Line 2|2026-09'], 1);
  });
  it('the gaps said: the downtime with no reason, in minutes and as a share', () => {
    const g = look.gaps.join('\n');
    expect(g).toContain(`${exp.dtBlank.toLocaleString('en-GB')} of “Unplanned DT (mins)” (${Math.round((exp.dtBlank / exp.dt) * 100)}% of ${exp.dt.toLocaleString('en-GB')}) has no “Downtime reason” given, on ${exp.dtBlankRows.toLocaleString('en-GB')} rows`);
  });
  it('says which figure it took and that no AI was asked; offers the next questions in the columns\' own words; a dozen sums at most', () => {
    expect(look.says[1]).toBe(`I have taken “${P}” as the figure that matters — it reads as a result, where below zero is a loss. Say if it is another.`);
    expect(look.says[look.says.length - 1]).toContain('no AI was asked');
    expect(look.suggestions[0]).toBe(`Why did “${P}” move from September to October?`);
    expect(look.suggestions).toContain('Rank “Unplanned DT (mins)” by “Downtime reason”');
    expect(['Line', 'Product']).toContain(look.splits[0].dim);
    expect(look.suggestions).toContain(`Chart “${P}” by “${look.splits[0].dim}”`);
    expect(asked).toBeLessThanOrEqual(14);
  });
  it('a workbook with no figure to split says nothing rather than guess', async () => {
    const none = { ...p, sheets: p.sheets.filter(s => s.name === 'Orders').map(s => ({ ...s, columns: s.columns.filter(c => c.type === 'text') })) };
    expect(rolesOf(none)).toBeUndefined();
    expect(await firstLook(none, q => runQuery(store, p, q))).toBeUndefined();
  });
});
