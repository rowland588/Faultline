/* WHAT A CELL OF WORDS REALLY HOLDS (14 November, docs/WORKBOOKS.md — "Any workbook"). A hand-kept sheet types its numbers with their
 * units and its dates as words, and writes its own totals into its rows. These are read — never guessed: a code is not a number, a
 * product whose name starts with "Total" is not a total, a time of day is not time lost. */
import { describe, it, expect } from 'vitest';
import { textNumber, textDate, isTotalLabel, periodOf, isSummaryHeading, DURATION } from '../textCells';

describe('a number written as words', () => {
  it('is read with its unit', () => {
    expect(textNumber('45 min')).toEqual({ value: 45, unit: 'min', percent: false });
    expect(textNumber('1,250')).toEqual({ value: 1250, unit: '', percent: false });
    expect(textNumber('£108.00')).toEqual({ value: 108, unit: '£', percent: false });
    expect(textNumber('12.5 kg')).toMatchObject({ value: 12.5, unit: 'kg' });
    expect(textNumber('  7 ')).toMatchObject({ value: 7 });
  });
  it('a percentage is a fraction', () => {
    expect(textNumber('85%')).toEqual({ value: 0.85, unit: '%', percent: true });
  });
  it('a minus, written any of three ways, is a minus', () => {
    expect(textNumber('-12')?.value).toBe(-12);
    expect(textNumber('−£1,200.50')?.value).toBe(-1200.5);
    expect(textNumber('(350)')?.value).toBe(-350);
  });
  it('a code, a reference or a sentence is not a number', () => {
    expect(textNumber('0042')).toBeNull();
    expect(textNumber('RM-1000')).toBeNull();
    expect(textNumber('Line 2')).toBeNull();
    expect(textNumber('12/04/2026')).toBeNull();
    expect(textNumber('')).toBeNull();
    expect(textNumber('about 40 minutes, give or take')).toBeNull();
  });
});

describe('a date written as words', () => {
  const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
  it('is read day first, as a British sheet writes it', () => {
    expect(textDate('06/04/2026')).toBe(day(2026, 4, 6));
    expect(textDate('6.4.26')).toBe(day(2026, 4, 6));
    expect(textDate('2026-04-06')).toBe(day(2026, 4, 6));
    expect(textDate('12-Apr-26')).toBe(day(2026, 4, 12));
    expect(textDate('Mon 12 April 2026')).toBe(day(2026, 4, 12));
  });
  it('a day over 12 in second place says the month came first', () => {
    expect(textDate('04/25/2026')).toBe(day(2026, 4, 25));
  });
  it('a date that does not exist, or words that are not a date, is not one', () => {
    expect(textDate('31/02/2026')).toBeNull();
    expect(textDate('Line 12')).toBeNull();
    expect(textDate('45 min')).toBeNull();
  });
});

describe("a row that is the sheet's own adding-up", () => {
  it('is known by its label', () => {
    for (const t of ['Total', 'TOTAL:', 'Grand Total', 'Sub-total', 'Subtotal', 'Line 2 Total', 'Week 15 Totals', 'Overall total']) expect(isTotalLabel(t), t).toBe(true);
  });
  it('a thing whose name only starts with the word is not one', () => {
    for (const t of ['Total Care Ltd', 'Totally new film', 'Line 2', 'Totaliser fault', '']) expect(isTotalLabel(t), t).toBe(false);
  });
});

describe('the periods a grid is headed by', () => {
  it('a month, a date, a week, a quarter, a year, a day', () => {
    expect(periodOf('Apr-26')).toMatchObject({ kind: 'month', ms: Date.UTC(2026, 3, 1) });
    expect(periodOf('April 2026')).toMatchObject({ kind: 'month', ms: Date.UTC(2026, 3, 1) });
    expect(periodOf('Jun')).toMatchObject({ kind: 'month' });
    expect(periodOf('46118')).toMatchObject({ kind: 'date', label: '2026-04-06' });
    expect(periodOf('06/04/2026')).toMatchObject({ kind: 'date', ms: Date.UTC(2026, 3, 6) });
    expect(periodOf('Wk 15')).toMatchObject({ kind: 'week' });
    expect(periodOf('Q2 2026')).toMatchObject({ kind: 'quarter' });
    expect(periodOf('2026')).toMatchObject({ kind: 'year' });
    expect(periodOf('Tue')).toMatchObject({ kind: 'day' });
  });
  it('a heading that names a thing is not a period', () => {
    for (const t of ['Line', 'Packs', 'Marsh', 'Target', 'Reason', 'May contain nuts']) expect(periodOf(t), t).toBeNull();
  });
  it("a grid's own adding-up is told from its periods", () => {
    for (const t of ['Total', 'YTD', 'Average', 'Grand Total']) expect(isSummaryHeading(t), t).toBe(true);
    for (const t of ['Apr-26', 'Line 1', 'Totaliser']) expect(isSummaryHeading(t), t).toBe(false);
  });
});

describe('a heading that says its column is time lost', () => {
  it('names a duration, not a time of day', () => {
    for (const t of ['Duration', 'Downtime', 'Time lost', 'Stoppage', 'Mins', 'Delay', 'Hours']) expect(DURATION.test(t), t).toBe(true);
    for (const t of ['Start', 'Time', 'Finished at', 'Clock']) expect(DURATION.test(t), t).toBe(false);
  });
});
