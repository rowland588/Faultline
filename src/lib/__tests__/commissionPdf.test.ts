/* HOW THE HANDOVER SHEET SPLITS ACROSS PAGES.
 *
 * Pagination is where every bug in this file has lived, and they share a shape:
 * the page silently holds less than the code thinks, so rows fall off the bottom
 * and the sheet reads as complete. A handover sheet that has quietly stopped
 * listing part of a machine is worse than one that says it did not fit.
 *
 * Previously: the left-hand panel drew five of seven rows because the height
 * formula did not mirror the drawing, and the blocker panel dropped its third
 * card because a height was two points short. Both were invisible in the PDF.
 *
 * commissionSheets is pure, so these are direct — no jsPDF, no rendering.
 */
import { describe, it, expect } from 'vitest';
import { commissionSheets, type HandoverRow } from '../commissionPdf';

const ROW_H = 13.5;
const GROUP_HEAD_H = 16;

/** n rows on one machine. TYPED, with no cast: the cast is what let an earlier
 *  fixture through with entirely the wrong shape, and the harness then
 *  manufactured its own bugs. */
const assetOf = (asset: string, n: number): HandoverRow[] =>
  Array.from({ length: n }, (_, i): HandoverRow => ({
    asset,
    kind: 'check',
    kindLabel: 'Acceptance',
    title: `${asset} item ${i + 1}`,
    agreed: 'no metal above 2.0mm passes',
    evidence: 'Met the criterion · 14 Sep · witnessed by A. Shaw',
    state: 'g',
    stateLabel: 'Passed',
  }));

const flat = (sheets: HandoverRow[][]) => sheets.flat();
const titles = (sheets: HandoverRow[][]) => flat(sheets).map(r => r.title);

/** What a block of rows costs in points, mirroring the module's own arithmetic. */
const cost = (rows: HandoverRow[]) => {
  const assets = new Set(rows.map(r => r.asset));
  return rows.length * ROW_H + assets.size * GROUP_HEAD_H;
};

describe('every row reaches a sheet, exactly once, in order', () => {
  it('a job that fits stays on one sheet', () => {
    const rows = [...assetOf('Programs', 3), ...assetOf('Film', 2)];
    const sheets = commissionSheets(rows, 600, 700);
    expect(sheets).toHaveLength(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
  });

  it('nothing is lost or duplicated when it spills over several sheets', () => {
    // The invariant that matters most: the union of the sheets IS the input.
    const rows = ['Programs', 'Film', 'SAT', 'Utilities', 'Training', 'Spares', 'Handover']
      .flatMap(s => assetOf(s, 6));
    const sheets = commissionSheets(rows, 200, 300);
    expect(sheets.length).toBeGreaterThan(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
    expect(new Set(titles(sheets)).size).toBe(rows.length);
  });

  it('keeps a machine whole rather than cutting it in half', () => {
    // A machine split across two sheets reads as two different machines to
    // anybody skimming, which is the whole reason the split is by block.
    const rows = [...assetOf('Programs', 5), ...assetOf('Film', 5), ...assetOf('SAT', 5)];
    const sheets = commissionSheets(rows, 150, 150);
    for (const sheet of sheets) {
      const assets = sheet.map(r => r.asset);
      // each machine on a sheet must be contiguous AND complete there
      for (const s of new Set(assets)) {
        const onThis = assets.filter(x => x === s).length;
        const inAll = rows.filter(r => r.asset === s).length;
        expect(onThis, `${s} was cut across sheets`).toBe(inAll);
      }
    }
  });

  it('gives the first sheet the smaller budget, because the verdict sits on it', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap(s => assetOf(s, 4));
    const tight = commissionSheets(rows, 100, 400);
    const even = commissionSheets(rows, 400, 400);
    expect(tight[0]!.length).toBeLessThan(even[0]!.length);
  });

  it('no sheet exceeds the budget it was given', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap(s => assetOf(s, 3));
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
    const rows = ['A', 'B', 'C', 'D'].flatMap(s => assetOf(s, 8));
    const sheets = commissionSheets(rows, 120, 120);
    sheets.forEach((s, i) => expect(s.length, `sheet ${i + 1} is blank`).toBeGreaterThan(0));
  });

  it('breaks a machine too big for one sheet, instead of overfilling it', () => {
    // THE BUG. Sixty items on one machine went onto a single sheet costing 826pt
    // against a 200pt budget. The drawing loop stops at the page bottom rather
    // than running off it, so the surplus was not drawn at all — forty-six items
    // absent from the report with nothing saying so.
    const rows = assetOf('Programs', 60);
    const first = 200, rest = 300;
    const sheets = commissionSheets(rows, first, rest);

    expect(sheets.length).toBeGreaterThan(1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));     // nothing lost
    sheets.forEach((sheet, i) => {
      expect(cost(sheet), `sheet ${i + 1} holds more than it can draw`)
        .toBeLessThanOrEqual(i === 0 ? first : rest);
    });
  });

  it('breaks an oversized machine that follows a small one, without losing either', () => {
    const rows = [...assetOf('Film', 2), ...assetOf('Programs', 60)];
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
    const rows = assetOf('Programs', 5);
    const sheets = commissionSheets(rows, 1, 1);
    expect(titles(sheets)).toEqual(rows.map(r => r.title));
    expect(sheets.length).toBe(5);
  });
});
