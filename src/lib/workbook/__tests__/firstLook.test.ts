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
import { figure, firstLook, noLook, rolesOf, tablesOf, type FirstLook } from '../firstLook';

const dir = mkdtempSync(join(tmpdir(), 'wbf-'));
const file = join(dir, 'Packing labour hour by hour.xlsx');
type Exp = { fin: number; finRows: number; plRows: number; plByShift: Record<string, number>; wrongRows: number; wrongPl: number; plNoSku: number; plBySku: Record<string, number>; logRows: number; logMinutes: number; logByLine: Record<string, number>; rows: number; pl: number; plByMonth: Record<string, number>; plByLine: Record<string, number>; plByLineMonth: Record<string, number>; daysByMonth: Record<string, number>; dt: number; dtBlank: number; dtBlankRows: number };
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
    expect(r?.measures.map(m => m.column)).not.toContain('Wrong line flag');
    expect(r?.flags).toEqual(['Wrong line flag']);
    expect(r?.dims.map(d => d.column)).toEqual(expect.arrayContaining(['Line', 'Product', 'Shift', 'SKU', 'Downtime reason']));
    /* a code is said by the description another sheet lists it under — found from the values, never from the names */
    expect(r?.dims.find(d => d.column === 'SKU')).toMatchObject({ said: 'Description', lookup: { sheet: 'Product master', match: 'SKU', on: 'SKU', take: 'Description' } });
    expect(r?.dims.find(d => d.column === 'Line')?.lookup).toBeUndefined();
    expect(tablesOf(p).map(t => t.sheet)).toEqual(expect.arrayContaining(['Hourly archive', 'Downtime log']));
    expect(r?.reason).toEqual({ dim: 'Downtime reason', lost: 'Unplanned DT (mins)' });
  });
  it('the months with their days — a month with far fewer days is PART of a month and compared a day', () => {
    expect(look.months.map(m => [m.key, m.days, m.part])).toEqual([['2026-07', 5, true], ['2026-08', 31, false], ['2026-09', 30, false], ['2026-10', 31, false], ['2026-11', 9, true]]);
    const hi = look.roles.measures.slice(0, 4).findIndex(m => m.column === P);
    for (const m of look.months) expect(m.values[hi]).toBeCloseTo(exp.plByMonth[m.key], 1);
    const said = look.says.join('\n');
    expect(said).toContain(`November is only 9 days in, so it is compared a day: ${money(exp.plByMonth['2026-11'] / 9)} a day so far, against ${money(exp.plByMonth['2026-10'] / 31)} a day in October.`);
    expect(said).toContain('July (part — from the 27th, 5 days)');
    expect(said).toContain('November (part — to the 9th, 9 days)');
  });
  it('where the figure sits: the worst and the best line, as the generator\'s own totals rank them', () => {
    const line = look.splits.find(s => s.dim === 'Line');
    const asc = Object.entries(exp.plByLine).sort((a, b) => a[1] - b[1]);
    expect(line?.worst.map(w => w.key)).toEqual(asc.filter(x => x[1] < 0).map(x => x[0]));
    expect(look.splits.map(s => s.dim)).not.toContain('Shift');
    expect(line?.worst[0].value).toBeCloseTo(asc[0][1], 1);
    expect(line?.best?.key).toBe(asc[asc.length - 1][0]);
    expect(look.says.join('\n')).toContain(`By “Line” (6): losing most ${asc[0][0]} ${money(asc[0][1])}, ${asc[1][0]} ${money(asc[1][1])}; best ${asc[asc.length - 1][0]} ${money(asc[asc.length - 1][1])}.`);
  });
  it('what moved between the last two whole months — September to October, the biggest mover Line 2', () => {
    expect(look.moved?.before.key).toBe('2026-09');
    expect(look.moved?.after.key).toBe('2026-10');
    expect(look.moved?.change.change).toBeCloseTo(exp.plByMonth['2026-10'] - exp.plByMonth['2026-09'], 1);
    expect(look.moved?.change.best?.field).toBe('Line');
    expect(look.moved?.change.best?.movers[0].key).toBe('Line 2');
    expect(look.moved?.change.best?.movers[0].change).toBeCloseTo(exp.plByLineMonth['Line 2|2026-10'] - exp.plByLineMonth['Line 2|2026-09'], 1);
  });
  it('a code said by its description; what sits on rows with no code said as a gap and left out of the ranking', () => {
    const said = look.says.join('\n');
    const worst = Object.entries(exp.plBySku).sort((a, b) => a[1] - b[1])[0];
    expect(said).toContain('By “Description” (from “Product master”, by “SKU”) (6): losing most Red 2kg tray — retail pack ');
    expect(said).toContain(money(worst[1]));
    expect(look.gaps.join('\n')).toContain(`${money(exp.plNoSku)} of “${P}” sits on rows where “SKU” is not said (blank, or 0)`);
    expect(look.splits.find(s => s.dim === 'Description')?.notSaid).toBeCloseTo(exp.plNoSku, 1);
  });
  it('a flag is counted, never added up: the rows it marks and what of the figure sits on them', () => {
    expect(look.says.join('\n')).toContain(`“Wrong line flag” marks ${exp.wrongRows.toLocaleString('en-GB')} rows of ${exp.rows.toLocaleString('en-GB')} (${Math.round((exp.wrongRows / exp.rows) * 100)}%), carrying ${money(exp.wrongPl)} of “${P}”.`);
  });
  it('the table beside it gets its own line, and time lost with every reason "Unclassified" is said plainly', () => {
    const said = look.says.join('\n');
    const top = Object.entries(exp.logByLine).sort((a, b) => b[1] - a[1]);
    expect(said).toContain(`“Downtime log” — ${exp.logRows} rows: “Minutes” ${exp.logMinutes.toLocaleString('en-GB')}`);
    expect(said).toContain(`Most by “Line”: ${top[0][0]} ${top[0][1].toLocaleString('en-GB')}`);
    expect(look.gaps.join('\n')).toContain(`None of the ${exp.logMinutes.toLocaleString('en-GB')} of “Minutes” on “Downtime log” has a reason: every row’s “Reason” is “Unclassified”.`);
  });
  it('the gaps said: the downtime with no reason, in minutes and as a share', () => {
    const g = look.gaps.join('\n');
    expect(g).toContain(`${exp.dtBlank.toLocaleString('en-GB')} of “Unplanned DT (mins)” on “Hourly archive” (${Math.round((exp.dtBlank / exp.dt) * 100)}% of ${exp.dt.toLocaleString('en-GB')}) has no reason — “Downtime reason” is blank on ${exp.dtBlankRows.toLocaleString('en-GB')} rows`);
    expect(g).not.toContain('where “Downtime reason” is not said');
  });
  it('says which figure it took and that no AI was asked; offers the next questions in the columns\' own words; a dozen sums at most', () => {
    expect(look.says.join('\n')).toContain(`I have led with “${P}” — it is filled on the most rows. Which one does the business manage by?`);
    expect(look.says[look.says.length - 1]).toContain('no AI was asked');
    expect(look.suggestions[0]).toBe(`Why did “${P}” move from September to October?`);
    expect(look.suggestions).toContain('Rank “Unplanned DT (mins)” by “Downtime reason”');
    expect(['Line', 'Product', 'Description']).toContain(look.splits[0].dim);
    expect(look.suggestions).toContain(`Chart “${P}” by “${look.splits[0].dim}”`);
    expect(asked).toBeLessThanOrEqual(22);
  });
  it('several columns read as a result: each said with its total and its rows, the lead the one filled on most rows — never the first by name', () => {
    expect(look.roles.headline?.column).toBe(P);
    expect(look.chosen).toBe('most rows');
    const fin = look.candidates.find(c => c.column === 'Fin var £'), pl = look.candidates.find(c => c.column === P);
    expect(fin?.total).toBeCloseTo(exp.fin, 1);
    expect(fin?.rows).toBe(exp.finRows);
    expect(fin?.onlyWhere).toBe('Wrong line flag');
    expect(pl?.total).toBeCloseTo(exp.pl, 1);
    expect(pl?.rows).toBe(exp.plRows);
    expect(look.says.join('\n')).toContain(`2 columns read as a result: “${P}” ${money(exp.pl)} (filled on ${exp.plRows.toLocaleString('en-GB')} rows); “Fin var £” ${figure(exp.fin, 'Fin var £', 'outcome')} (filled on ${exp.finRows.toLocaleString('en-GB')} rows — only where “Wrong line flag” is 1).`);
  });
  it('what the person has said the business manages by leads, and the question is not asked again', async () => {
    const l = (await firstLook(p, q => runQuery(store, p, q), { told: ['we manage by Fin var £'] })) as FirstLook;
    expect(l.roles.headline?.column).toBe('Fin var £');
    expect(l.chosen).toBe('told');
    expect(l.says.join('\n')).toContain('I have led with “Fin var £” — your notebook says that is the one.');
    expect(l.says.join('\n')).not.toContain('Which one does the business manage by?');
  });
  it('a data sheet with error cells in a quarter of its rows is still the table; rates and a report grid are not figures or tables', () => {
    const s = p.sheets.find(x => x.name === 'Hourly archive');
    expect(s?.errors ?? 0).toBeGreaterThan((s?.rows ?? 0) * 0.2);
    expect(rolesOf(p)?.measures.map(m => m.column)).not.toContain('Cost per tonne £');
    expect(tablesOf(p).map(t => t.sheet)).not.toContain('Board report');
    expect(look.says[0]).toContain('has 5 sheets');
  });
  it('a small grouping that does not stand out is still said — the shifts, each with its figure', () => {
    expect(look.says.join('\n')).toContain(`By “Shift” (2): Days ${money(exp.plByShift.Days)}, Lates ${money(exp.plByShift.Lates)} — none stands out.`);
  });
  it('a workbook read with no table to lead with is never met with silence', () => {
    const none = { ...p, sheets: p.sheets.filter(s => s.name === 'Orders').map(s => ({ ...s, columns: s.columns.filter(c => c.type === 'text') })) };
    expect(noLook(none)).toContain('I cannot tell by myself which sheet holds the figures');
    expect(noLook(none)).toContain('“Orders”');
    expect(noLook(none)).toContain('Tell me which sheet to start with');
  });
  it('a workbook with no figure to split says nothing rather than guess', async () => {
    const none = { ...p, sheets: p.sheets.filter(s => s.name === 'Orders').map(s => ({ ...s, columns: s.columns.filter(c => c.type === 'text') })) };
    expect(rolesOf(none)).toBeUndefined();
    expect(await firstLook(none, q => runQuery(store, p, q))).toBeUndefined();
  });
});
