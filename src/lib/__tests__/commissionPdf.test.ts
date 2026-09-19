/* HOW THE COMMISSIONING REPORT SPLITS ACROSS SHEETS.
 *
 * Pagination is where every bug in this file has lived, and they share a shape:
 * the page silently holds less than the code thinks, so rows fall off the bottom
 * and the report reads as complete. A status report that has quietly stopped
 * listing part of the job is worse than one that says it did not fit.
 *
 * Previously: the workstreams panel drew five of seven streams because the height
 * formula did not mirror the drawing, and "what is next" dropped its third
 * blocker because a height was two points short. Both were invisible in the PDF.
 *
 * commissionSheets is pure, so these are direct — no jsPDF, no rendering.
 */
import { describe, it, expect } from 'vitest';
import { commissionSheets, type CommissionReportRow } from '../commissionPdf';

const ROW_H = 13.5;
const STREAM_HEAD_H = 16;

/** n rows on one stream. */
const streamOf = (stream: string, n: number): CommissionReportRow[] =>
  Array.from({ length: n }, (_, i) => ({
    stream, title: `${stream} item ${i + 1}`, state: 'g',
  } as unknown as CommissionReportRow));

const flat = (sheets: CommissionReportRow[][]) => sheets.flat();
const titles = (sheets: CommissionReportRow[][]) => flat(sheets).map(r => r.title);

/** What a block of rows costs in points, mirroring the module's own arithmetic. */
const cost = (rows: CommissionReportRow[]) => {
  const streams = new Set(rows.map(r => r.stream));
  return rows.length * ROW_H + streams.size * STREAM_HEAD_H;
};

describe('every row reaches a sheet, exactly once, in order', () => {
  it('a job that fits stays on one sheet', () => {
    const rows = [...streamOf('Programs', 3), ...streamOf('Film', 2)];
    const sheets = commissionSheets(rows, 600, 700);
    expect(sheets).toHaveLength(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
  });

  it('nothing is lost or duplicated when it spills over several sheets', () => {
    // The invariant that matters most: the union of the sheets IS the input.
    const rows = ['Programs', 'Film', 'SAT', 'Utilities', 'Training', 'Spares', 'Handover']
      .flatMap(s => streamOf(s, 6));
    const sheets = commissionSheets(rows, 200, 300);
    expect(sheets.length).toBeGreaterThan(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
    expect(new Set(titles(sheets)).size).toBe(rows.length);
  });

  it('keeps a workstream whole rather than cutting it in half', () => {
    // A stream split across two sheets reads as two different streams to anybody
    // skimming, which is the whole reason the split is by block.
    const rows = [...streamOf('Programs', 5), ...streamOf('Film', 5), ...streamOf('SAT', 5)];
    const sheets = commissionSheets(rows, 150, 150);
    for (const sheet of sheets) {
      const streams = sheet.map(r => r.stream);
      // each stream present on a sheet must be contiguous AND complete there
      for (const s of new Set(streams)) {
        const onThis = streams.filter(x => x === s).length;
        const inAll = rows.filter(r => r.stream === s).length;
        expect(onThis, `${s} was cut across sheets`).toBe(inAll);
      }
    }
  });

  it('gives the first sheet the smaller budget, because the summary sits on it', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap(s => streamOf(s, 4));
    const tight = commissionSheets(rows, 100, 400);
    const even = commissionSheets(rows, 400, 400);
    expect(tight[0]!.length).toBeLessThan(even[0]!.length);
  });

  it('no sheet exceeds the budget it was given', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap(s => streamOf(s, 3));
    const first = 180, rest = 240;
    const sheets = commissionSheets(rows, first, rest);
    sheets.forEach((sheet, i) => {
      expect(cost(sheet), `sheet ${i + 1} overflows`).toBeLessThanOrEqual(i === 0 ? first : rest);
    });
  });

  it('an empty job returns one empty sheet, not zero sheets', () => {
    // The caller draws sheets[0] unconditionally; returning [] would throw.
    expect(commissionSheets([], 600, 700)).toEqual([[]]);
  });

  it('never emits an empty sheet in the middle', () => {
    const rows = ['A', 'B', 'C', 'D'].flatMap(s => streamOf(s, 8));
    const sheets = commissionSheets(rows, 120, 120);
    sheets.forEach((s, i) => expect(s.length, `sheet ${i + 1} is blank`).toBeGreaterThan(0));
  });

  it('breaks a workstream too big for one sheet, instead of overfilling it', () => {
    // THE BUG. Sixty items on one stream went onto a single sheet costing 826pt
    // against a 200pt budget. The drawing loop stops at the page bottom rather
    // than running off it, so the surplus was not drawn at all — forty-six items
    // absent from the report with nothing saying so.
    const rows = streamOf('Programs', 60);
    const first = 200, rest = 300;
    const sheets = commissionSheets(rows, first, rest);

    expect(sheets.length).toBeGreaterThan(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));     // nothing lost
    sheets.forEach((sheet, i) => {
      expect(cost(sheet), `sheet ${i + 1} holds more than it can draw`)
        .toBeLessThanOrEqual(i === 0 ? first : rest);
    });
  });

  it('breaks an oversized stream that follows a small one, without losing either', () => {
    const rows = [...streamOf('Film', 2), ...streamOf('Programs', 60)];
    const first = 200, rest = 300;
    const sheets = commissionSheets(rows, first, rest);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
    sheets.forEach((sheet, i) => {
      expect(cost(sheet), `sheet ${i + 1} overflows`).toBeLessThanOrEqual(i === 0 ? first : rest);
    });
  });

  it('terminates even on a budget too small for a single row', () => {
    // fitRows() floors at one. Without that floor this loops for ever emitting
    // empty sheets, which is a hung tab rather than a wrong report.
    const rows = streamOf('Programs', 5);
    const sheets = commissionSheets(rows, 1, 1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
    expect(sheets.length).toBe(5);
  });
});
