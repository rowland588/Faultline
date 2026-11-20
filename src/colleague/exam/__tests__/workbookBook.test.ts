/* The workbook exam's file (docs/CONNECTED-LUNA.md X4): the truth the exam marks Luna against is worked by the generator row by row —
 * here the app's own reader (lib/workbook, the code the worker runs) reads the same bytes, and every figure the exam asks for is the
 * same, so a wrong mark is Luna's and never the generator's. Also: the site's Total row is left out, the efficiency is a percentage. */
import { describe, expect, it } from 'vitest';
import { directBackend } from '../../../lib/workbook/client';
import { firstLook } from '../../../lib/workbook/firstLook';
import { BOOK_SHEET, examWorkbook, examWorkbookFile } from '../workbookBook';

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

describe('the workbook exam’s file', () => {
  it('is the same every time, and its truth is what its rows add up to', () => {
    const a = examWorkbook(), b = examWorkbook();
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
    expect(a.truth.rows).toBe(a.rows.length);
    expect(a.truth.first).toBe('2026-08-03');
    expect(a.truth.last).toBe('2026-10-15');
    expect(a.truth.daysByMonth).toEqual({ August: 21, September: 22, October: 11 });
    expect(Object.values(a.truth.packsByMonth).reduce((s, x) => s + x, 0)).toBe(a.truth.packs);
    expect(Object.values(a.truth.downByReason).reduce((s, x) => s + x, 0) + a.truth.noReason).toBe(a.truth.down);
    expect(a.truth.noReason).toBeGreaterThan(0);
    expect(a.truth.effByShift.Days).toBeGreaterThan(a.truth.effByShift.Nights);
  });

  it('read by the app’s own reader gives every figure the exam asks for', async () => {
    const { file, truth } = examWorkbookFile();
    const wb = await directBackend();
    const p = await wb.read('exam', file.name, file);
    expect(p.status).toBe('ready');
    const log = p.sheets.find(s => s.name === BOOK_SHEET);
    expect(log?.rows).toBe(truth.rows);                       // the Total row is not a row of data
    expect(log?.columns.find(c => c.name === 'Efficiency')?.percent).toBe(true);
    const q = (x: Omit<Parameters<typeof wb.query>[1], 'sheet'>) => wb.query('exam', { sheet: BOOK_SHEET, ...x });
    expect((await q({ measures: [{ op: 'sum', column: 'Packs' }] })).totals[0]).toBe(truth.packs);
    const byMonth = await q({ time: { column: 'Date', by: 'month' }, measures: [{ op: 'sum', column: 'Packs' }] });
    expect(byMonth.groups.map(g => g.values[0])).toEqual([truth.packsByMonth.August, truth.packsByMonth.September, truth.packsByMonth.October]);
    const sep = await q({ filters: [{ column: 'Date', op: 'between', from: '2026-09-01', to: '2026-09-30' }], groupBy: ['Line'], measures: [{ op: 'sum', column: 'Packs' }], order: { by: 0, desc: true } });
    expect(sep.groups[0].key[0]).toBe(truth.bestLineSeptember.line);
    expect(sep.groups[0].values[0]).toBe(truth.bestLineSeptember.packs);
    const reasons = await q({ filters: [{ column: 'Downtime reason', op: 'notblank' }], groupBy: ['Downtime reason'], measures: [{ op: 'sum', column: 'Downtime (min)' }], order: { by: 0, desc: true } });
    expect(reasons.groups[0].key[0]).toBe(truth.topReason.reason);
    expect(reasons.groups[0].values[0]).toBe(truth.topReason.minutes);
    expect((await q({ filters: [{ column: 'Downtime reason', op: 'blank' }], measures: [{ op: 'sum', column: 'Downtime (min)' }] })).totals[0]).toBe(truth.noReason);
    const eff = await q({ groupBy: ['Shift'], measures: [{ op: 'avg', column: 'Efficiency' }] });
    for (const g of eff.groups) expect(close(Number(g.values[0]), truth.effByShift[g.key[0]])).toBe(true);
    const byLine = await q({ groupBy: ['Line'], measures: [{ op: 'sum', column: 'Downtime (min)' }] });
    for (const g of byLine.groups) expect(g.values[0]).toBe(truth.downByLine[g.key[0]]);
    expect((await q({ measures: [{ op: 'sum', column: 'Downtime (min)' }] })).totals[0]).toBe(truth.down);
  });

  it('its first look reads it as a manager would (20 November — the dry run found the reader wrong on three columns)', async () => {
    const { file, truth } = examWorkbookFile();
    const wb = await directBackend();
    const p = await wb.read('exam2', file.name, file);
    /* "500g bag" is a product's name, never 500 of anything */
    expect(p.sheets.find(s => s.name === BOOK_SHEET)?.columns.find(c => c.name === 'Product')?.type).toBe('text');
    const look = await firstLook(p, qq => wb.query('exam2', qq));
    const says = look?.says.join('\n') ?? '';
    expect(says).not.toMatch(/“Product” is typed as words|Product” as the figure/);
    /* "Downtime (min)" is minutes lost — never a limit; and Packs is what was made — never a measurement against it */
    expect(says).not.toMatch(/Downtime \(min\)” \(a limit or a level\)|“Packs” \(a measurement\)/);
    /* it leads with the time lost, averages the efficiency, says October is part of a month and the minutes with no reason */
    expect(says).toContain(`“Downtime (min)” as the figure that matters: ${truth.down.toLocaleString('en-GB')}`);
    expect(says).toContain('“Efficiency” (a rate)');
    expect(says).toMatch(/October \(part — to the 15th, 11 days\)/);
    expect(says).toContain(`${truth.noReason} of “Downtime (min)”`);
  });
});
