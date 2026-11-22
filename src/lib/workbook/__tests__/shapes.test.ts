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
import { figure, firstLook, formLook, tablesOf, type FirstLook } from '../firstLook';
import { snapSays } from '../standing';
import { sheetLine, sheetSaid } from '../../../capabilities/workbook';

const dir = mkdtempSync(join(tmpdir(), 'wbs-'));
const NOW = Date.UTC(2026, 10, 14);
type Truth = { total: number; byLine?: Record<string, number>; also?: Record<string, number>; oneTab?: number };
interface Read { p: WorkbookProfile; store: MemoryStore; look: FirstLook | null; truth: Truth; run: (q: Parameters<typeof runQuery>[2]) => ReturnType<typeof runQuery> }
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); } }; };
const read: Record<string, Read> = {};
const NAMES = ['01-tidy-log', '02-months-across', '03-two-row-headings', '04-total-rows', '05-tab-per-week', '06-stacked-tables', '07-form', '08-text-numbers', '09-action-log',
  '10-headings-low', '11-side-by-side', '12-merged-down', '13-durations-as-time', '14-rates-only', '15-measurements', '16-stock-list', '17-report-on-log',
  '18-names-across', '19-three-row-headings', '20-form-two-pairs', '21-mixture', '22-repeated-headings', '23-units-row', '24-outline', '25-matrix-both-totals', '26-tab-per-line', '27-mixed-units', '28-audit', '29-some-undated'];
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
    /* the number itself is said with the figure */
    expect(said(r.look, 'figure')).toContain(`I have taken “Downtime (mins)” as the figure that matters: ${r.truth.total.toLocaleString('en-GB')} over 240 rows.`);
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
    expect(said(r.look, 'figure')).toContain(`“Duration” as the figure that matters: ${r.truth.total.toLocaleString('en-GB')} min over 240 rows`);
  });

  it('a sheet of rates is averaged and never added up', async () => {
    const r = of('14-rates-only');
    expect(r.look?.roles.headline).toMatchObject({ column: 'OEE %', kind: 'rate', agg: 'avg' });
    expect(Math.round((r.look?.snap.total as number) * 1000) / 10).toBe(r.truth.total);
    expect(said(r.look, 'figure')).toContain(`“OEE %” is a rate, so I have AVERAGED it over the rows and never added it: ${r.truth.total}% over 160 rows`);
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
    expect(said(r.look, 'figure')).toContain(`“Qty on hand” × “Unit cost £” on each row gives a value, and I have led with that: £${Math.round(r.truth.total).toLocaleString('en-GB')} over 80 rows`);
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

describe('what a real workbook taught (14 November): a report built on the rows is not data beside them', () => {
  it('a sheet whose own formulas add up the log is its report — never a table of its own, so nothing is counted twice', () => {
    const r = of('17-report-on-log');
    expect(tablesOf(r.p).map(t => t.sheet)).toEqual(['Log']);
    expect(r.p.sheets.find(s => s.name === 'Report')?.sumsFrom).toEqual([{ sheet: 'Log', formulas: 15 }]);
    expect(said(r.look, 'beside')).toBe('');
  });
  it("the report's Total row is left out of ITS rows, but its formulas are still the report's — the rule is read from all fifteen", () => {
    const r = of('17-report-on-log');
    expect(r.p.sheets.find(s => s.name === 'Report')).toMatchObject({ rows: 4, totals: { count: 1 } });
    expect(r.look?.basis).toMatchObject({ rule: '“Rework” is 0', formulas: r.truth.also?.formulas, of: r.truth.also?.formulas, kept: r.truth.also?.kept, applied: true });
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(said(r.look, 'basis')).toMatch(/15 formulas on “Report” — of the 15 that add up “Log” under a condition — take only the rows where “Rework” is 0/);
  });
  it('a weight times a standard time is not a value: only a COUNT of things times a price in MONEY is', () => {
    const r = of('16-stock-list');
    const stock = r.p.sheets[0];
    const renamed = { ...r.p, sheets: [{ ...stock, columns: stock.columns.map(c => (c.name === 'Unit cost £' ? { ...c, name: 'Std Hrs/unit' } : c.name === 'Qty on hand' ? { ...c, name: 'Pack Weight kg' } : c)) }] };
    const roles = tablesOf(renamed)[0];
    expect(roles.measures.some(m => m.calc)).toBe(false);
    expect(roles.notSummed).toContainEqual({ column: 'Std Hrs/unit', why: 'a figure for one, not a total' });
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
    expect((await by(r, 'Wk 15 to Wk 22', 'Week', { op: 'sum', column: 'Downtime (mins)' }))['Wk 15']).toBe(r.truth.oneTab);
    expect(said(r.look, 'what')).toMatch(/8 tabs — “Wk 15”, “Wk 16”, “Wk 17” … “Wk 22” — have the same headings.*ONE table of 224 rows, with the tab as a column \(“Week”\)/);
    /* a row still says which tab and cell it came from */
    const rows = await sourceRows(r.store, r.p, { sheet: 'Wk 15 to Wk 22', filters: [{ column: 'Week', op: 'eq', value: 'Wk 16' }], limit: 1 });
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

describe('the profile Luna is given says how each sheet was read, so her own questions go to the right table', () => {
  const line = (name: string, sheet: string) => sheetLine(of(name).p.sheets.find(s => s.name === sheet) as WorkbookProfile['sheets'][number]);
  it('a table the app made is the one to ask; the sheet as written is not', () => {
    expect(line('02-months-across', 'Output (as rows)')).toMatch(/MADE BY THE APP from “Output” \(a grid read as rows\) — ASK THIS ONE/);
    expect(line('02-months-across', 'Output')).toMatch(/its figures are read through “Output \(as rows\)”; ask that table, not this sheet/);
    expect(line('05-tab-per-week', 'Wk 15 to Wk 22')).toMatch(/MADE BY THE APP from “Wk 15”, “Wk 16”, “Wk 17” and 5 more \(tabs of the same layout read as one table\)/);
  });
  it('a table of its own on a sheet, a form, and total rows left out are each said', () => {
    expect(line('06-stacked-tables', 'Summary › LABOUR')).toMatch(/a table of its own on sheet “Summary”, its headings on row 18/);
    expect(line('07-form', 'Shift report')).toMatch(/a FORM — labels with their answers beside them, not a table/);
    expect(line('04-total-rows', 'Downtime')).toMatch(/5 rows of its own totals \(“Line 1 Total”, “Line 2 Total”\) left out, so nothing is counted twice/);
  });
  it('a column says how it was read: typed as words, a time as minutes, a percentage never added, a name filled down', () => {
    const full = (name: string) => sheetSaid(of(name).p.sheets[0], true);
    expect(full('08-text-numbers')).toMatch(/“Downtime \(mins\)” — .*typed as words with “min” — read as numbers/);
    expect(full('13-durations-as-time')).toMatch(/“Duration” — .*kept as a time — read as MINUTES/);
    expect(full('14-rates-only')).toMatch(/“OEE %” — .*a percentage, held as a fraction \(0\.85 = 85%\) — average it, never add it/);
    expect(full('12-merged-down')).toMatch(/“Line” — .*written once and left blank or merged down its rows — filled down \(236 cells\)/);
    expect(full('15-measurements')).toMatch(/“Sample” — .*only numbers the rows — never add it/);
  });
  it('round two: an outline, the headings said again, a row of units', () => {
    expect(line('24-outline', 'Pivot (as rows)')).toMatch(/MADE BY THE APP from “Pivot” \(an outline read by the rows under its group rows — the group rows carry their totals and are left out\) — ASK THIS ONE/);
    expect(line('24-outline', 'Pivot')).toMatch(/ask that table, not this sheet/);
    expect(line('22-repeated-headings', 'Downtime')).toMatch(/its headings said again 7 times down the sheet \(a printed report\) — passed over, one table/);
    expect(line('23-units-row', 'Downtime')).toMatch(/row 2 gives the units, taken into the headings/);
  });
});

/* ROUND TWO (14 November, evening): eleven harder workbooks — mixtures, and the shapes round one left unread — written and measured
 * BEFORE the reader was changed for them: 3 right, 1 partly, 6 wrong, 1 an honest "I cannot tell". Each is now held to its truth. */
describe('round two — never a wrong figure, on harder sheets', () => {
  it('the headings said again down the sheet, as a printed report repeats them, are passed over — one table, not eight', async () => {
    const r = of('22-repeated-headings');
    expect(r.p.sheets.length).toBe(1);
    expect(r.p.sheets[0]).toMatchObject({ rows: r.truth.also?.rows, headingsRepeated: 7 });
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(said(r.look, 'what')).toMatch(/the headings are said again 7 times down the sheet, as a printed report repeats them — passed over, so it is one table/);
    expect(said(r.look)).not.toMatch(/working copy/);
  });
  it('a row of units under the headings is taken into the headings, and is not a row', async () => {
    const r = of('23-units-row');
    expect(r.p.sheets[0]).toMatchObject({ rows: r.truth.also?.rows, unitsRow: 2 });
    expect(r.p.sheets[0].columns.map(c => c.name)).toEqual(['Date', 'Line', 'Reason', 'Downtime (mins)', 'Output (packs)', 'Cost (£)']);
    expect(r.look?.roles.headline?.column).toBe('Downtime (mins)');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(said(r.look, 'what')).toMatch(/row 2, straight under the headings, gives the units — taken into the headings, not read as a row/);
    expect(said(r.look, 'gaps')).not.toMatch(/no date/);
  });
  it('an outline pasted from a pivot table: the rows under each group are the table — the group rows are never added to them', async () => {
    const r = of('24-outline');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Pivot (as rows)', rows: 16, derived: { how: 'outline', from: ['Pivot'] } });
    expect(made?.columns.map(c => c.name)).toEqual(['Item', 'Stops', 'Minutes', 'Line']);
    expect(r.look?.roles.headline?.column).toBe('Minutes');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(r.look?.snap.total).not.toBe(r.truth.also?.doubled);
    expect(await by(r, 'Pivot (as rows)', 'Line', { op: 'sum', column: 'Minutes' })).toEqual(r.truth.byLine);
    expect((await by(r, 'Pivot (as rows)', 'Item', { op: 'sum', column: 'Minutes' })).Jam).toBe(r.truth.also?.jam);
    expect(said(r.look, 'what')).toMatch(/“Pivot” is an outline — 4 rows \(“Line 1”, “Line 2” …\) each carry the total of the rows under them\. I have read the 16 rows under them as the table, with the group as a column \(“Line”\), and left the 4 group rows out/);
  });
  it('an outline is claimed only when EVERY group adds up: one figure out, and the sheet is left as written', async () => {
    /* the same rows with nothing that sums: a plain small table is not made an outline of */
    const r = of('06-stacked-tables');
    expect(r.p.sheets.some(s => s.derived?.how === 'outline')).toBe(false);
    expect(of('16-stock-list').p.sheets.some(s => s.derived)).toBe(false);
  });
  it('quantities in mixed units are never added across them: said unit by unit, the rows counted for the rest', async () => {
    const r = of('27-mixed-units');
    expect(r.look?.roles.byUnit).toEqual({ unit: 'UoM', units: ['kg', 'packs', 'litres'], columns: ['Qty used'] });
    expect(r.look?.roles.measures).toEqual([]);
    expect(r.look?.roles.headline).toMatchObject({ kind: 'count' });
    const f = said(r.look, 'figure');
    expect(f).toMatch(/“Qty used” is counted in 3 different units \(“UoM”: kg, packs, litres\), so it is never added across them/);
    for (const [u, v] of [['kg', r.truth.total], ['packs', r.truth.also?.packs], ['litres', r.truth.also?.litres]] as [string, number][]) expect(f).toContain(`${v.toLocaleString('en-GB')} ${u}`);
    expect(said(r.look)).not.toContain((r.truth.also?.wrongIfAdded as number).toLocaleString('en-GB'));
  });
  it('a mixture of four shapes on one sheet — notes above, a name merged down, minutes typed with their unit, subtotals and a grand total', async () => {
    const r = of('21-mixture');
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Review', 'Line', { op: 'sum', column: 'Downtime (mins)' })).toEqual(r.truth.byLine);
    const w = said(r.look, 'what');
    expect(w).toMatch(/5 rows are the sheet’s own totals/);
    expect(w).toMatch(/“Downtime \(mins\)” is typed as words \(with “min”\)/);
    expect(w).toMatch(/“Line” is written once and left blank \(or merged\) down its rows/);
  });
});

describe('round two — the shapes round one left unread', () => {
  it('names across the top: a column a line is ONE figure by line, read as rows', async () => {
    const r = of('18-names-across');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Output (as rows)', rows: 12, derived: { how: 'unpivot' } });
    expect(made?.columns.map(c => c.name)).toEqual(['Month', 'Line', 'Packs made']);
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Output (as rows)', 'Line', { op: 'sum', column: 'Packs made' })).toEqual(r.truth.byLine);
    expect(said(r.look, 'what')).toMatch(/“Output” has a column for each line — “Line 1”, “Line 2”, “Line 3” … “Line 4” — across the top\. I have read it as rows/);
    const rows = await sourceRows(r.store, r.p, { sheet: 'Output (as rows)', filters: [{ column: 'Line', op: 'eq', value: 'Line 3' }], limit: 3 });
    expect(rows.rows.map(x => x.cells['Packs made'].ref)).toEqual(['Output!D4', 'Output!D5', 'Output!D6']);
  });
  it('three rows of headings: a column for EACH level of group', async () => {
    const r = of('19-three-row-headings');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Line 1 (as rows)', rows: 120 });
    expect(made?.columns.map(c => c.name)).toEqual(['Date', 'Group', 'Shift', 'Packs', 'Downtime (mins)']);
    const t = await r.run({ sheet: 'Line 1 (as rows)', measures: [{ op: 'sum', column: 'Downtime (mins)' }, { op: 'sum', column: 'Packs' }] });
    expect(t.totals).toEqual([r.truth.total, r.truth.also?.packs]);
    expect(await by(r, 'Line 1 (as rows)', 'Shift', { op: 'sum', column: 'Downtime (mins)' })).toEqual({ Days: r.truth.also?.days, Nights: r.truth.also?.nights });
    expect((await by(r, 'Line 1 (as rows)', 'Group', { op: 'sum', column: 'Packs' }))['Granola 500g']).toBe(r.truth.also?.granola);
    expect(said(r.look, 'what')).toMatch(/“Line 1” has three rows of headings — “Granola 500g”, “Muesli 750g” over “Days”, “Nights” over “Packs”, “Downtime \(mins\)”.*with “Group” and “Shift” columns of their own/);
  });
  it('a heading row of dates — a day a column — with a Total column AND a Total row: neither total is counted', async () => {
    const r = of('25-matrix-both-totals');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Daily (as rows)', rows: 56 });
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(r.look?.snap.total).not.toBe(r.truth.also?.quadrupled);
    expect(await by(r, 'Daily (as rows)', 'Line', { op: 'sum', column: r.look?.roles.headline?.column as string })).toEqual(r.truth.byLine);
    const w = said(r.look, 'what');
    expect(w).toMatch(/“Daily” is a grid — “Line” down the side, 14 dates across the top \(6 Apr 2026 to 19 Apr 2026\)/);
    expect(w).toMatch(/Its “Total” column is the grid’s own adding-up and is left out/);
    expect(w).toMatch(/1 row is the sheet’s own totals \(“Total”\)/);
    expect(made?.columns.find(c => c.name === 'Date')?.type).toBe('date');
  });
  it('a form in two pairs of columns is still a form: every pair an answer', async () => {
    const r = of('20-form-two-pairs');
    expect(r.p.sheets[0].form).toBe(true);
    expect(r.look).toBeNull();
    const f = await formLook(r.p, r.run) as string;
    expect(f).toMatch(/reads as a filled-in form, not a table — labels with their answers beside them, in pairs across each row\. 11 answers/);
    for (const a of ['Date: 6 April 2026', 'Shift: Nights', 'Line: Line 3', 'Team leader: B. Okoro', 'Packs made: 19,800', 'Target: 24,000', 'Downtime (mins): 132', 'Rejects: 410', 'Minutes: 55']) expect(f).toContain(a);
  });
  it('a table of four columns that only LOOKS like pairs is not taken for a form', () => {
    /* a stock list's rows are text, number, text … — but down a column the answers are of one kind */
    expect(of('16-stock-list').p.sheets[0].form).toBeUndefined();
    expect(of('09-action-log').p.sheets[0].form).toBeUndefined();
    expect(of('28-audit').p.sheets[0].form).toBeUndefined();
  });
  it('a tab a line: one table, the column named for what the tabs are', async () => {
    const r = of('26-tab-per-line');
    const made = r.p.sheets.find(s => s.derived);
    expect(made).toMatchObject({ name: 'Line 1 to Line 4', rows: 240, derived: { how: 'stack' } });
    expect(r.look?.snap.total).toBe(r.truth.total);
    expect(await by(r, 'Line 1 to Line 4', 'Line', { op: 'sum', column: 'Downtime (mins)' })).toEqual(r.truth.byLine);
    expect(said(r.look, 'what')).toMatch(/4 tabs — .* — have the same headings and names that run in a series: I have read them as ONE table of 240 rows, with the tab as a column \(“Line”\)/);
  });
  it('an audit of Pass and Fail is counted', async () => {
    const r = of('28-audit');
    expect(r.look?.roles.headline).toMatchObject({ kind: 'count' });
    expect(await by(r, 'Audit', 'Result', { op: 'count' })).toEqual({ Pass: 40 - r.truth.total, Fail: r.truth.total });
    expect(said(r.look, 'where')).toContain(`Fail ${r.truth.total}`);
  });
});

/* ROWS WITH NO DATE (22 November, the review of G3a). The total the look keeps was the months added up, and a monthly question leaves
 * out every row whose date cell is not a date — so the same file had two totals, and the headline Luna is told every turn said the
 * smaller one "over" all the rows. */
describe('rows with no date are in the figure and in no month', () => {
  it('the total kept is the figure over EVERY row read, with the rows it is over — the same as the look’s own figure sentence', () => {
    const r = of('29-some-undated');
    const t = r.truth as Truth & { also: { rows: number; undatedRows: number; undatedMins: number } };
    expect(r.look?.roles.date).toBe('Date');
    expect(r.look?.snap.total).toBe(t.total);
    expect(r.look?.snap.over).toBe(t.also.rows);
    expect(r.look?.snap.undated).toBe(t.also.undatedRows);
    /* the months hold only the dated rows — they do NOT add to the figure, and that is what is said */
    const months = (r.look?.snap.months ?? []).reduce((a, m) => a + (m.value ?? 0), 0);
    expect(months).toBe(t.total - t.also.undatedMins);
    expect(t.also.undatedMins).toBeGreaterThan(0);
    const fig = figure(t.total, 'Downtime (mins)', r.look?.roles.headline?.kind ?? 'lost');
    expect(said(r.look, 'figure')).toContain(`${fig} over ${t.also.rows} rows`);
    const line = snapSays(r.look?.snap) ?? '';
    expect(line.startsWith(`“Downtime (mins)” comes to ${fig} over ${t.also.rows} rows of “Downtime”; by month (${t.also.undatedRows} rows with no date are in no month): `)).toBe(true);
    /* its split by line adds to the figure said — one total, not two */
    const byLine = r.look?.snap.splits.find(x => x.dim === 'Line')?.groups ?? [];
    expect(byLine.reduce((a, g) => a + g.value, 0)).toBe(t.total);
    expect(Object.fromEntries(byLine.map(g => [g.key, g.value]))).toEqual(t.byLine);
  });

  it('a log with every date filled in says no such thing', () => {
    const r = of('01-tidy-log');
    expect(r.look?.snap.over).toBe(240);
    expect(r.look?.snap.undated).toBeUndefined();
    expect(snapSays(r.look?.snap)).not.toContain('no date');
  });
});
