/* THE MODEL ON TOP OF THE ROWS, CHECKED AGAINST TOTALS IT DID NOT MAKE (14 November, docs/WORKBOOKS.md). scripts/workbook/make-kpi-workbook.mjs
 * writes a KPI workbook in the shape a packing site keeps (every name and figure made up): production rows with a flag its report
 * formulas hold to 0, a downtime log by week ending Saturday, a calendar that names each week, and a sheet of its own checks — and keeps
 * its own totals as it writes. The three things read from it: the rows the reports leave out, the workbook's own weeks, its own checks. */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, openSync, readSync, fstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkbook, type WorkbookProfile } from '../read';
import { runQuery, bucket } from '../query';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { figure, firstLook, tablesOf, type FirstLook } from '../firstLook';
import { weekEnd, weekKey, weekOf } from '../week';
import { figuresOf, dateIn } from '../checks';
import { lookPack, forPaper, type KeptLook } from '../lookPack';
import { sinceLast } from '../sinceLast';

const dir = mkdtempSync(join(tmpdir(), 'wbk-'));
const file = join(dir, 'Packing KPI.xlsx');
type Week = { name: string; days: number; rows: number; basisRows: number; op: number; opAll: number; packs: number; actual: number; earned: number };
type Exp = { rows: number; flagRows: number; opAll: number; opBasis: number; opFlagged: number; packsBasis: number; weeks: Record<string, Week>; opByLineBasis: Record<string, number>; opByMonthBasis: Record<string, number>; opByMonthAll: Record<string, number>;
  partWeek: string; latestWeek: string; weekBefore: string; averageBefore: number; averageOver: number; efficiency: number; dtRows: number; dtNoReasonRows: number; dtByWeek: Record<string, number>; toStandard: number; healthDowntime: number; weekNames: number; op4: number; lastDate: string };
let exp: Exp, p: WorkbookProfile, look: FirstLook, all: FirstLook;
const store = new MemoryStore();
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); } }; };
const H = 'Op var £';
const money = (v: number) => figure(v, H, 'outcome');
const run = (q: Parameters<typeof runQuery>[2]) => runQuery(store, p, q);
const part = (l: FirstLook, k: string) => l.parts.filter(x => x.part === k).map(x => x.text).join('\n');

beforeAll(async () => {
  execFileSync('node', ['scripts/workbook/make-kpi-workbook.mjs', file], { stdio: 'ignore' });
  exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8'));
  p = await readWorkbook(onDisk(file), store, { id: 'k', name: 'Packing KPI.xlsx' });
  look = (await firstLook(p, run, { now: 2 })) as FirstLook;
  all = (await firstLook(p, run, { everyRow: true, now: 1 })) as FirstLook;
}, 120_000);

describe('1 · the rows the workbook’s own reports leave out', () => {
  it('the reader keeps the rules its report formulas sum under, by the column’s heading', () => {
    const rep = p.sheets.find(s => s.name === 'Report');
    expect(rep?.sumsFrom).toEqual([{ sheet: 'Production', formulas: 22 }]);
    expect(rep?.holds?.[0]).toEqual({ sheet: 'Production', column: 'Rework flag', op: 'eq', value: 0, formulas: 18 });
    /* a line named in a formula is held by a few formulas each — never half of them, so never the basis */
    expect(rep?.holds?.filter(h => h.column === 'Line').map(h => h.formulas)).toEqual([5, 5, 5, 5]);
  });
  it('the look is read on the reports’ basis, and says so with both totals', () => {
    expect(look.basis).toMatchObject({ rule: '“Rework flag” is 0', formulas: 18, of: 22, sheets: ['Report'], kept: exp.rows - exp.flagRows, out: exp.flagRows, applied: true });
    const said = part(look, 'basis');
    expect(said).toContain(`18 formulas on “Report” — of the 22 that add up “Production” under a condition — take only the rows where “Rework flag” is 0`);
    expect(said).toContain(`${(exp.rows - exp.flagRows).toLocaleString('en-GB')} of ${exp.rows.toLocaleString('en-GB')} rows`);
    expect(said).toContain(`The ${exp.flagRows} left out carry ${money(exp.opFlagged)} of “${H}”; with them it is ${money(exp.opAll)}`);
    expect(said).toContain('the file does not say');
    /* every figure after it is on that basis: the months, the lines */
    for (const [m, v] of Object.entries(exp.opByMonthBasis)) expect(look.months.find(x => x.key === m)?.values[0]).toBeCloseTo(v, 2);
    expect(look.snap.total).toBeCloseTo(exp.opBasis, 2);
    expect(look.snap.basis).toBe('“Rework flag” is 0');
    const lines = look.snap.splits.find(s => s.dim === 'Line')?.groups ?? [];
    for (const [l, v] of Object.entries(exp.opByLineBasis)) expect(lines.find(g => g.key === l)?.value).toBeCloseTo(v, 2);
    /* the flag that IS the basis is not said again as a flag */
    expect(part(look, 'flags')).not.toContain('Rework flag');
    expect(part(look, 'foot')).toContain('the rows its own reports take');
  });
  it('"read every row": they are in, and it says what they carry', () => {
    expect(all.basis?.applied).toBe(false);
    expect(part(all, 'basis')).toContain(`You asked for every row, so they are in: the ${exp.flagRows} rows the reports leave out carry ${money(exp.opFlagged)} of “${H}”; without them it is ${money(exp.opBasis)}`);
    expect(all.snap.total).toBeCloseTo(exp.opAll, 2);
    expect(all.snap.basis).toBeUndefined();
    for (const [m, v] of Object.entries(exp.opByMonthAll)) expect(all.months.find(x => x.key === m)?.values[0]).toBeCloseTo(v, 2);
    expect(part(all, 'flags')).toContain(`“Rework flag” marks ${exp.flagRows} rows`);
  });
  it('a look on every row is never compared with one on the reports’ basis', () => {
    const said = sinceLast({ ...all.snap, fileId: 'earlier' }, look.snap, money);
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('that time it was read on every row and this time on the rows where “Rework flag” is 0, so the two are not compared');
  });
  it('on paper the look asks nobody anything', () => {
    expect(forPaper(part(look, 'basis'))).not.toMatch(/Say “read every row”/);
    expect(forPaper(part(look, 'week'))).not.toMatch(/Say if your week/);
  });
});

describe('2 · the workbook’s own weeks', () => {
  it('found from the dates: every week column ends or starts where the business says, and the calendar names each week', () => {
    expect(p.week?.ends).toBe(6);
    expect(p.week?.from).toEqual(expect.arrayContaining([{ sheet: 'Downtime', column: 'Week ending', as: 'end' }, { sheet: 'Setup', column: 'Starts', as: 'start' }, { sheet: 'Setup', column: 'Ends', as: 'end' }]));
    expect(p.week?.namedBy).toEqual({ sheet: 'Setup', column: 'Week' });
    expect(Object.keys(p.week?.names ?? {})).toHaveLength(exp.weekNames);
    for (const [end, w] of Object.entries(exp.weeks)) expect(p.week?.names?.[end]).toBe(w.name);
    /* the production rows are booked every day of the week — their date is not a week column */
    expect(p.sheets.find(s => s.name === 'Production')?.columns.find(c => c.name === 'Date')?.weekdays?.every(n => n > 0)).toBe(true);
  });
  it('a week is the workbook’s own, not the calendar’s: Sunday to Saturday', () => {
    const sun = Date.UTC(2026, 5, 7), sat = Date.UTC(2026, 5, 6);
    expect(new Date(weekEnd(sun, 6)).toISOString().slice(0, 10)).toBe('2026-06-13');
    expect(new Date(weekEnd(sat, 6)).toISOString().slice(0, 10)).toBe('2026-06-06');
    expect(weekKey(sat, p.week as NonNullable<typeof p.week>)).toBe(`w/e 2026-06-06 (${exp.weeks['2026-06-06'].name})`);
    /* the calendar's week would put that Sunday with the Saturday before it */
    expect(bucket(sun, 'week')).toBe(bucket(sat, 'week'));
    expect(bucket(sun, 'week', p.week)).not.toBe(bucket(sat, 'week', p.week));
    expect(weekOf([])).toBeUndefined();
  });
  it('a question by week is grouped by the workbook’s weeks, each to the generator’s own total, and says so', async () => {
    const r = await run({ sheet: 'Production', time: { column: 'Date', by: 'week' }, measures: [{ op: 'sum', column: H }], order: { by: 'group' }, limit: 60 });
    expect(r.groups).toHaveLength(Object.keys(exp.weeks).length);
    for (const g of r.groups) { const end = /w\/e (\S+)/.exec(g.key[0])?.[1] as string; expect(g.values[0]).toBeCloseTo(exp.weeks[end].opAll, 2); expect(g.key[0]).toContain(exp.weeks[end].name); }
    expect(r.notes.join(' ')).toContain('Weeks are the workbook’s own — each ends on a Saturday (read from “Week ending” on “Downtime”');
  });
  it('the look says the latest WHOLE week by its own name, the week before, the average of the weeks before it, and the part week', () => {
    const L = exp.weeks[exp.latestWeek], B = exp.weeks[exp.weekBefore], P = exp.weeks[exp.partWeek];
    expect(look.week?.latest).toMatchObject({ days: 7, name: L.name });
    expect(look.week?.latest.value).toBeCloseTo(L.op, 2);
    expect(look.week?.before?.value).toBeCloseTo(B.op, 2);
    expect(look.week?.average).toBeCloseTo(exp.averageBefore, 2);
    expect(look.week?.over).toBe(exp.averageOver);
    expect(look.week?.part).toMatchObject({ days: P.days, name: P.name });
    const said = part(look, 'week');
    expect(said).toContain('The workbook’s own weeks end on a Saturday — read from “Week ending” on “Downtime”');
    expect(said).toContain('it names them itself (“Week” on “Setup”)');
    expect(said).toContain(`The latest whole week, to Saturday 6 June — “${L.name}”: “${H}” ${money(L.op)}, against ${money(B.op)} the week before and ${money(exp.averageBefore)} a week on average over the ${exp.averageOver} weeks before it.`);
    expect(said).toContain(`The week to Saturday 13 June is only ${P.days} days in: ${money(P.op)} so far.`);
    expect(look.suggestions).toContain(`Show “${H}” week by week`);
    /* on every row the week is every row's */
    expect(all.week?.latest.value).toBeCloseTo(L.opAll, 2);
  });
});

describe('3 · the workbook’s own checks, each tested against the rows', () => {
  const line = (label: string) => look.checks?.lines.find(l => l.label === label);
  it('the sheet is read as a list of lines — labels with their answers, a form and not a table (14 November), so its first line is a line too', () => {
    expect(look.checks?.sheet).toBe('Health');
    expect(p.sheets.find(s => s.name === 'Health')).toMatchObject({ form: true, headerRow: 0 });
    expect(tablesOf(p).map(t => t.sheet)).not.toContain('Health');
    expect(line('Last production entry')).toMatchObject({ verdict: 'agrees', with: 'the latest “Date” on “Production”' });
    /* two tables end on different days: each date is matched with its own table */
    expect(line('Last downtime week entered')).toMatchObject({ verdict: 'agrees', with: 'the latest “Week ending” on “Downtime”' });
  });
  it('not fine by its own word; fine; counts that agree with the rows', () => {
    expect(line('Production data status')).toMatchObject({ verdict: 'bad', value: 'STALE - chase the entries' });
    expect(line('Report window valid')).toMatchObject({ verdict: 'fine' });
    expect(line('Production rows')).toMatchObject({ verdict: 'agrees', with: 'the rows of “Production”', mine: exp.rows });
    expect(line('Downtime rows')).toMatchObject({ verdict: 'agrees', mine: exp.dtRows });
    expect(line('Runs marked re-work')).toMatchObject({ verdict: 'agrees', with: 'the rows “Rework flag” marks on “Production”', mine: exp.flagRows });
    expect(line('Downtime rows without a reason')).toMatchObject({ verdict: 'agrees', with: 'the rows of “Downtime” with no reason given', mine: exp.dtNoReasonRows });
  });
  it('the week’s figures: a sum on the reports’ basis, a ratio, two halves that add up, one the rows cannot give', () => {
    const L = exp.weeks[exp.latestWeek];
    expect(line('Packs')).toMatchObject({ verdict: 'agrees', with: '“Packs” on “Production” over the week to 6 June, on the reports’ basis', mine: L.packs });
    expect(line('Efficiency')).toMatchObject({ verdict: 'ratio', value: `${exp.efficiency.toFixed(2)}%`, with: '“Earned hours” ÷ “Actual hours” over the week to 6 June, on the reports’ basis' });
    expect(line('Rate + Crewing')).toMatchObject({ verdict: 'agrees', with: `“${H}” on “Production” over the week to 6 June, on the reports’ basis` });
    expect(line('Rate')).toBeUndefined();
    expect(line('£ against plan')).toMatchObject({ verdict: 'cannot', value: expect.stringMatching(/^−£[\d,]+\.\d\d$/) });
    expect(line('Indirect')?.verdict).toBe('cannot');
  });
  it('figures side by side take their names from the label; a note after a number is not part of it; a zero share is only noted', () => {
    expect(line('Since the start')).toMatchObject({ verdict: 'agrees', with: `“${H}” on “Production” over everything, on the reports’ basis` });
    expect(line('Since the start')?.mine).toBeCloseTo(exp.opBasis, 2);
    expect(line('Last 4 weeks')).toMatchObject({ verdict: 'agrees', with: `“${H}” on “Production” over the four weeks to 6 June, on the reports’ basis` });
    expect(line('Last 4 weeks')?.mine).toBeCloseTo(exp.op4, 2);
    expect(line('This week')?.verdict).toBe('agrees');
    expect(line('Capacity used — production')).toMatchObject({ verdict: 'noted', value: '0.0%' });
    expect(figuresOf('A / B', ['1,200.50 · 3,400 (checked)']).map(f => [f.name, f.value])).toEqual([['A', 1200.5], ['B', 3400]]);
    expect(figuresOf('Rows', ['808']).map(f => [f.name, f.value])).toEqual([['', 808]]);
    expect(figuresOf('Status', ['STALE - chase the entries'])).toEqual([]);
    expect(dateIn('Wed 10-Jun-2026')).toBe(Date.UTC(2026, 5, 10));
  });
  it('close is said with both figures, never as agreeing', () => {
    expect(line('Downtime cost this week')).toMatchObject({ verdict: 'close', with: '“Cost £” on “Downtime” over the week to 6 June' });
    expect(line('Downtime cost this week')?.mine).toBeCloseTo(exp.dtByWeek[exp.latestWeek], 2);
    const said = part(look, 'checks');
    expect(said).toContain('“Health” reads as the workbook’s own checks');
    expect(said).toContain('By its own word, not fine: “Production data status” — “STALE - chase the entries”.');
    expect(said).toMatch(/Close, not equal: “Downtime cost this week” £[\d,.]+ against £[\d,.]+ \(“Cost £” on “Downtime” over the week to 6 June\)/);
    expect(said).toMatch(/2 figures I cannot make from the rows as they stand: “£ against plan” −£[\d,.]+; “Indirect” −£1,840\.37 — the workbook works them by its own formulas/);
    expect(said).toContain('Agreeing means the rows add up to what the workbook’s own check says — not that either is right.');
  });
  it('what the workbook says is on purpose answers the warning about that sheet’s error cells', () => {
    expect(look.checks?.intended).toEqual([{ sheet: 'Trend', words: 'Trend rows still to come show #N/A Intentional - they keep the chart from drawing zeros' }]);
    const gaps = part(look, 'gaps');
    expect(gaps).toContain('“Trend” shows 30 error cells — the workbook’s own checks (“Health”) say that is intended');
    expect(gaps).not.toContain('may be wrong or out of date');
  });
});

describe('the pack is asked on the same basis, and draws the weeks', () => {
  it('every chart of the pack leaves out what the reports leave out; the lead figure week by week', async () => {
    const k: KeptLook = { workbookId: 'k', name: p.name, at: 2, sheet: look.roles.sheet, headline: look.roles.headline as KeptLook['headline'], date: look.roles.date, dims: look.splitDims, parts: look.parts, total: look.snap.total, rows: look.snap.rows, basis: look.basis?.filters, weekly: true };
    let n = 0;
    const pack = await lookPack(k, run, { kind: 'workbook', id: 'k', name: p.name, sheet: k.sheet }, { id: pre => `${pre}${n += 1}`, now: 3 });
    const months = pack.results.find(r => r.title === `${H} by month`);
    for (const g of months?.result.groups ?? []) expect(g.values[0]).toBeCloseTo(exp.opByMonthBasis[g.key[0]], 2);
    const weeks = pack.results.find(r => r.title === `${H} week by week`);
    expect(weeks?.result.groups.map(g => /w\/e (\S+)/.exec(g.key[0])?.[1])).toEqual(Object.keys(exp.weeks).sort());
    for (const g of weeks?.result.groups ?? []) expect(g.values[0]).toBeCloseTo(exp.weeks[/w\/e (\S+)/.exec(g.key[0])?.[1] as string].op, 2);
    const heads = pack.report.sections.map(s => s.heading);
    expect(heads).toEqual(expect.arrayContaining(['Week by week', 'The latest week', 'The workbook’s own checks']));
    expect(pack.report.sections.find(s => s.heading === 'What this workbook holds')?.text).toContain('take only the rows where “Rework flag” is 0');
    expect(pack.report.sections.some(s => s.unbacked?.length)).toBe(false);
  });
});
