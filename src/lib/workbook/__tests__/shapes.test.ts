/* ANY WORKBOOK — THE SHAPES FACTORY WORKBOOKS COME IN, EACH HELD TO A TRUTH THE READER DID NOT MAKE (14 November, docs/WORKBOOKS.md).
 * scripts/workbook/make-shape-workbooks.mjs writes sixteen small workbooks (every name and figure made up), each a shape a site really
 * keeps, with the totals it was written from. For each: the right table is led with, the right figure, the right total — and the look
 * SAYS how the sheet was read, so a person can see the reading and put it right. Three rules are held throughout: never a wrong figure
 * (a total row counted twice, a rate added up, a price summed), a shape read as the table it is, and a workbook with nothing to add up
 * still answered (a register counted, a form said answer by answer). */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, openSync, readSync, fstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkbook, type WorkbookProfile } from '../read';
import { runQuery, sourceRows } from '../query';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { firstLook, formLook, tablesOf, type FirstLook } from '../firstLook';

const dir = mkdtempSync(join(tmpdir(), 'wbs-'));
const NOW = Date.UTC(2026, 10, 14);
type Truth = { total: number; byLine?: Record<string, number>; also?: Record<string, number>; oneTab?: number };
interface Read { p: WorkbookProfile; store: MemoryStore; look: FirstLook | null; truth: Truth; run: (q: Parameters<typeof runQuery>[2]) => ReturnType<typeof runQuery> }
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); } }; };
const read: Record<string, Read> = {};
const NAMES = ['01-tidy-log', '02-months-across', '03-two-row-headings', '04-total-rows', '05-tab-per-week', '06-stacked-tables', '07-form', '08-text-numbers', '09-action-log',
  '10-headings-low', '11-side-by-side', '12-merged-down', '13-durations-as-time', '14-rates-only', '15-measurements', '16-stock-list'];
const of = (name: string): Read => read[name];
const said = (l: FirstLook | null, part?: string): string => (l?.parts ?? []).filter(x => !part || x.part === part).map(x => x.text).join('\n');
const by = async (r: Read, sheet: string, column: string, measure: Parameters<typeof runQuery>[2]['measures'][number]): Promise<Record<string, number>> => {
  const out = await r.run({ sheet, groupBy: [column], measures: [measure], limit: 50 });
  return Object.fromEntries(out.groups.map(g => [g.key[0], Number(g.values[0])]));
};

beforeAll(async () => {
  execFileSync('node', ['scripts/workbook/make-shape-workbooks.mjs', dir], { stdio: 'ignore' });
  for (const name of NAMES) {
    const store = new MemoryStore();
    const p = await readWorkbook(onDisk(join(dir, `${name}.xlsx`)), store, { id: name, name: `${name}.xlsx` });
    const run = (q: Parameters<typeof runQuery>[2]) => runQuery(store, p, q);
    read[name] = { p, store, run, truth: JSON.parse(readFileSync(join(dir, `${name}.truth.json`), 'utf8')), look: (await firstLook(p, run, { now: NOW })) ?? null };
  }
}, 240_000);

describe('the shape she was built on', () => {
  it('a tidy log: the figure, its total and its split, as written', async () => {
    const r = of('01-tidy-log');
    expect(r.look?.roles.sheet).toBe('Downtime');
    expect(r.look?.roles.headline?.column).toBe('Downtime (mins)');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Downtime', 'Line', { op: 'sum', column: 'Downtime (mins)' })).toEqual(r.truth.byLine);
    /* nothing was re-read, so nothing is said about how */
    expect(said(r.look)).not.toMatch(/How I read/);
  });
});

describe('step 1 — never a wrong figure', () => {
  it("the sheet's own total rows are left out and said, so nothing is counted twice", async () => {
    const r = of('04-total-rows');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(r.p.sheets[0].rows).toBe(240);
    expect(r.p.sheets[0].totals?.count).toBe(5);
    expect(said(r.look, 'what')).toMatch(/5 rows are the sheet’s own totals \(“Line 1 Total”.*left out, so nothing is counted twice/);
    /* a total row is not a line of its own */
    expect(Object.keys(await by(r, 'Downtime', 'Line', { op: 'sum', column: 'Downtime (mins)' })).sort()).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
  });

  it('numbers and dates typed as words — "45 min", "21,450", "£108.00", "06/04/2026" — are read as what they are, and said', async () => {
    const r = of('08-text-numbers');
    expect(r.look?.roles.headline?.column).toBe('Downtime (mins)');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(r.look?.roles.date).toBe('Date');
    const cols = Object.fromEntries(r.p.sheets[0].columns.map(c => [c.name, c]));
    expect(cols['Downtime (mins)'].typed).toMatchObject({ as: 'number', unit: 'min', left: 0 });
    expect(cols['Cost £'].typed).toMatchObject({ as: 'number', unit: '£' });
    expect(cols.Date.typed).toMatchObject({ as: 'date' });
    expect(said(r.look, 'what')).toMatch(/“Downtime \(mins\)” is typed as words \(with “min”\) — read as numbers/);
    expect(said(r.look, 'what')).toMatch(/“Date” is typed as words — read as dates/);
  });

  it('a name written once and merged down its rows belongs to every row under it', async () => {
    const r = of('12-merged-down');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Downtime', 'Line', { op: 'sum', column: 'Downtime (mins)' })).toEqual(r.truth.byLine);
    expect(r.p.sheets[0].columns.find(c => c.name === 'Line')?.filledDown).toBe(236);
    expect(said(r.look, 'what')).toMatch(/“Line” is written once and left blank \(or merged\) down its rows — filled down, so every row carries it/);
  });

  it('a duration kept as a time (0:45) is minutes — and a heading with "ratio" inside "Duration" is not a rate', async () => {
    const r = of('13-durations-as-time');
    expect(r.look?.roles.headline?.column).toBe('Duration');
    expect(Math.round(r.look?.snap.total as number)).toBe(r.truth.total);
    expect(said(r.look, 'what')).toMatch(/“Duration” is kept as a time \(0:45\) — read as minutes/);
  });

  it('a sheet of rates is averaged and never added up', async () => {
    const r = of('14-rates-only');
    expect(r.look?.roles.headline).toMatchObject({ column: 'OEE %', kind: 'rate', agg: 'avg' });
    expect(Math.round((r.look?.snap.total as number) * 1000) / 10).toBe(r.truth.total);
    expect(said(r.look, 'figure')).toMatch(/“OEE %” is a rate, so I have AVERAGED it over the rows and never added it/);
    expect(said(r.look, 'figure')).toMatch(/Not added up: “Availability %” \(a rate\)/);
    expect(said(r.look, 'where')).toMatch(/Line 1 \d\d\.\d%/);
  });

  it('measurements against limits: an average and a spread, and how many rows are outside — never a sum', async () => {
    const r = of('15-measurements');
    expect(r.look?.roles.headline).toMatchObject({ column: 'Weight (g)', kind: 'reading', agg: 'avg' });
    expect(r.look?.roles.limits).toEqual({ lower: 'Lower limit', upper: 'Upper limit' });
    const f = said(r.look, 'figure');
    expect(f).toMatch(/“Weight \(g\)” is a measurement, not something to add up/);
    expect(f).toContain(`${r.truth.total} rows of 200 are outside`);
    expect(f).toMatch(/Not added up: “Sample” \(it only numbers the rows\), “Lower limit” \(a limit or a level\), “Upper limit”/);
  });

  it('a stock list: the value is quantity × unit cost on each row — never the sum of the prices', async () => {
    const r = of('16-stock-list');
    expect(r.look?.roles.headline?.calc).toMatchObject({ a: 'Qty on hand', b: 'Unit cost £' });
    expect(Math.round((r.look?.snap.total as number) * 100) / 100).toBe(r.truth.total);
    expect(said(r.look, 'figure')).toMatch(/“Qty on hand” × “Unit cost £” on each row gives a value/);
    expect(said(r.look, 'figure')).toMatch(/Not added up: .*“Unit cost £” \(a price for one\)/);
  });

  it('a small summary beside the log is not part of the log, and is said', async () => {
    const r = of('11-side-by-side');
    expect(r.look?.roles.headline?.column).toBe('Downtime (mins)');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(r.look?.roles.aside).toEqual(['Reason (2)', 'Minutes (all)']);
    expect(r.look?.roles.measures.map(m => m.column)).not.toContain('Minutes (all)');
    expect(said(r.look, 'what')).toMatch(/“Reason \(2\)”, “Minutes \(all\)” — to the right of a gap.*left out of it/);
  });
});

describe('step 2 — the shapes read as the tables they are', () => {
  it('months across the top: read as rows, a row a line a month, the figure named from the title', async () => {
    const r = of('02-months-across');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Output (as rows)', rows: 12, derived: { how: 'unpivot', from: ['Output'] } });
    expect(r.p.sheets.find(s => s.name === 'Output')?.readAs).toBe('Output (as rows)');
    expect(r.look?.roles.sheet).toBe('Output (as rows)');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Output (as rows)', 'Line', { op: 'sum', column: r.look?.roles.headline?.column as string })).toEqual(r.truth.byLine);
    expect(said(r.look, 'what')).toMatch(/“Output” is a grid — “Line” down the side, 3 months across the top \(Apr-26 to Jun-26\)\. I have read it as rows/);
    /* the months are dates, so the look can say month by month */
    expect(made?.columns.find(c => c.name === 'Month')?.type).toBe('date');
  });

  it('a row of the made table points back at the cell of the sheet it came from', async () => {
    const r = of('02-months-across');
    const figure = r.look?.roles.headline?.column as string;
    const rows = await sourceRows(r.store, r.p, { sheet: 'Output (as rows)', filters: [{ column: 'Line', op: 'eq', value: 'Line 2' }], limit: 5 });
    expect(rows.rows.length).toBe(3);
    /* the grid's headings are on row 3, Line 2 on row 5, its months in B, C and D */
    expect(rows.rows.map(x => x.cells[figure].ref)).toEqual(['Output!B5', 'Output!C5', 'Output!D5']);
  });

  it('two rows of headings: the top row a column of its own, the figures under it one each', async () => {
    const r = of('03-two-row-headings');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Line 1 (as rows)', rows: 80 });
    expect(made?.columns.map(c => c.name)).toEqual(['Date', 'Shift', 'Packs', 'Downtime (mins)']);
    const t = await r.run({ sheet: 'Line 1 (as rows)', measures: [{ op: 'sum', column: 'Packs' }, { op: 'sum', column: 'Downtime (mins)' }] });
    expect(t.totals).toEqual([r.truth.total, r.truth.also?.mins]);
    expect(said(r.look, 'what')).toMatch(/“Line 1” has two rows of headings — “Days”, “Nights” over “Packs”, “Downtime \(mins\)”.*with “Shift” a column of its own/);
  });

  it('a tab a week with the same headings is ONE table, the tab a column', async () => {
    const r = of('05-tab-per-week');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Wk 15 to Wk 22', rows: 224, derived: { how: 'stack' } });
    expect(r.look?.roles.sheet).toBe('Wk 15 to Wk 22');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect((await by(r, 'Wk 15 to Wk 22', 'Tab', { op: 'sum', column: 'Downtime (mins)' }))['Wk 15']).toBe(r.truth.oneTab);
    expect(said(r.look, 'what')).toMatch(/8 tabs — “Wk 15”, “Wk 16”, “Wk 17” … “Wk 22” — have the same headings.*ONE table of 224 rows, with the tab as a column/);
    /* a row still says which tab and cell it came from */
    const rows = await sourceRows(r.store, r.p, { sheet: 'Wk 15 to Wk 22', filters: [{ column: 'Tab', op: 'eq', value: 'Wk 16' }], limit: 1 });
    expect(rows.rows[0].cells.Date.ref).toBe('Wk 16!A2');
  });

  it('tables stacked on one sheet are each a table of their own, under their own headings', async () => {
    const r = of('06-stacked-tables');
    expect(r.p.sheets.map(s => s.name)).toEqual(['Summary', 'Summary › DOWNTIME BY REASON', 'Summary › LABOUR']);
    expect(r.p.sheets.map(s => [s.headerRow, s.rows])).toEqual([[4, 4], [11, 4], [18, 2]]);
    expect(r.look?.snap.total).toBe(r.truth.total);
    const mins = await r.run({ sheet: 'Summary › DOWNTIME BY REASON', measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(mins.totals[0]).toBe(r.truth.also?.mins);
    expect(said(r.look, 'what')).toMatch(/“Summary” holds 3 tables one under another.*“DOWNTIME BY REASON” from row 11, “LABOUR” from row 18/);
    expect(said(r.look, 'beside')).toMatch(/“Summary › DOWNTIME BY REASON” — 4 rows/);
  });

  it('headings a long way down, under a block of notes, are still found', () => {
    const r = of('10-headings-low');
    expect(r.p.sheets[0].headerRow).toBe(40);
    expect(r.p.sheets[0].rows).toBe(240);
    expect(r.look?.snap.total).toBe(r.truth.total);
  });
});

describe('step 3 — a workbook with nothing to add up is still answered', () => {
  it('a register of words is counted: its rows, what is past its date and not closed, and each thing it splits by', async () => {
    const r = of('09-action-log');
    expect(r.look?.roles.headline).toMatchObject({ kind: 'count', agg: 'count' });
    expect(r.look?.roles.register).toMatchObject({ due: 'Due', status: 'Status', closed: ['Closed'] });
    expect(r.look?.snap.total).toBe(r.truth.also?.rows);
    const f = said(r.look, 'figure');
    expect(f).toMatch(/has no figure to add up — it reads as a register, a row a thing — so I have counted its rows: 60 rows/);
    expect(f).toContain(`${r.truth.total} rows are past their “Due” date and not “Closed”, as of 14 November 2026`);
    expect(said(r.look, 'where')).toContain(`Overdue ${r.truth.also?.overdue}`);
    expect(await by(r, 'Actions', 'Owner', { op: 'count' })).toEqual({ 'A. Marsh': 20, 'B. Okoro': 20, 'C. Lund': 20 });
  });

  it('a filled-in form is said answer by answer — no table is made of it, and no total', async () => {
    const r = of('07-form');
    expect(r.p.sheets[0].form).toBe(true);
    expect(r.look).toBeNull();
    expect(tablesOf(r.p)).toEqual([]);
    const f = await formLook(r.p, r.run) as string;
    expect(f).toMatch(/“Shift report” reads as a filled-in form, not a table/);
    expect(f).toContain('Packs made: 21,450');
    expect(f).toContain('Target: 24,000');
    expect(f).toContain('Date: 6 April 2026');
    expect(f).toContain('Team leader: A. Marsh');
    expect(f).toMatch(/There is nothing to add up in one form/);
  });
});
