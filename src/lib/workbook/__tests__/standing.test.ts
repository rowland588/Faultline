/* WHAT A FILE SAYS, IN A LINE (lib/workbook/standing, 21 November 2026 — docs/LUNA-AGENT.md G3).
 * Every expected line is written by hand from the snapshot's own numbers, never by the module. */
import { describe, expect, it } from 'vitest';
import { STANDING, snapSays } from '../standing';
import type { LookSnap } from '../sinceLast';

const base = { at: Date.UTC(2026, 10, 21, 9), name: 'Shift report September.xlsx', fileId: 'f1', headings: ['Date', 'Line', 'Shift', 'Variance £'] };

/** The marked shift report as its generator totals it (scripts/workbook/make-marked-workbook.mjs). */
const variance: LookSnap = {
  ...base, sheet: 'Shift report', rows: 270, headline: 'Variance £', total: -50368.5, kind: 'outcome',
  months: [
    { key: '2026-08', label: 'August 2026', days: 31, part: false, value: -35459.76 },
    { key: '2026-09', label: 'September 2026', days: 14, part: true, value: -14908.74 },
  ],
  splits: [
    /* kept lowest first, as the look asks for them */
    { dim: 'Line', groups: [{ key: 'Line 3', value: -26691.84 }, { key: 'Line 1', value: -15091.02 }, { key: 'Line 2', value: -8585.64 }] },
    { dim: 'Shift', groups: [{ key: 'Nights', value: -28216.86 }, { key: 'Days', value: -22151.64 }] },
  ],
};

describe('what a file says, from the snapshot its first look left', () => {
  it('a figure added up: the total, each month (a part month said as part), each split biggest first', () => {
    expect(snapSays(variance)).toBe(
      '“Variance £” comes to −£50,368 over 270 rows of “Shift report”; '
      + 'by month: August 2026 −£35,460 · September 2026 (part, 14 days) −£14,909; '
      + 'by “Line”: Line 3 −£26,692 · Line 1 −£15,091 · Line 2 −£8,586; '
      + 'by “Shift”: Nights −£28,217 · Days −£22,152.');
  });

  it('a rate is AVERAGED, never called a total — and its groups are said highest first', () => {
    const s: LookSnap = {
      ...base, sheet: 'Shift log', rows: 480, headline: 'Score', total: 0.874, kind: 'rate', agg: 'avg',
      months: [{ key: '2026-03', label: 'March 2026', days: 31, part: false, value: 0.861 }, { key: '2026-04', label: 'April 2026', days: 30, part: false, value: 0.887 }],
      splits: [{ dim: 'Line', groups: [{ key: 'Line 3', value: 0.821 }, { key: 'Line 1', value: 0.88 }, { key: 'Line 2', value: 0.91 }] }],
    };
    expect(snapSays(s)).toBe('“Score” averages 87.4% over 480 rows of “Shift log”; by month: March 2026 86.1% · April 2026 88.7%; by “Line”: Line 2 91% · Line 1 88% · Line 3 82.1%.');
    expect(snapSays(s)).not.toMatch(/comes to|total/);
  });

  it('a register is COUNTED: its rows, and the count of each group', () => {
    const s: LookSnap = {
      ...base, sheet: 'Actions', rows: 214, headline: 'Rows', total: 214, kind: 'count', agg: 'count', months: [],
      splits: [{ dim: 'Status', groups: [{ key: 'Closed', value: 94 }, { key: 'Open', value: 120 }] }],
    };
    expect(snapSays(s)).toBe('214 rows of “Actions”; by “Status”: Open 120 · Closed 94.');
  });

  it('the rows its own reports leave out are said with it', () => {
    const s: LookSnap = { ...variance, rows: 240, basis: '“Recharge flag” is 0', splits: [] };
    expect(snapSays(s)).toBe('“Variance £” comes to −£50,368 over 240 rows of “Shift report”, on the rows where “Recharge flag” is 0; by month: August 2026 −£35,460 · September 2026 (part, 14 days) −£14,909.');
  });

  it('a snapshot taken before the kind was kept says its numbers as they stand, "overall" — never as a total it may not be', () => {
    const { kind: _k, ...old } = variance;
    expect(snapSays({ ...old, splits: [] })).toBe('“Variance £” is −£50,368 overall, over 270 rows of “Shift report”; by month: August 2026 −£35,460 · September 2026 (part, 14 days) −£14,909.');
    /* a fraction is said as the fraction it is held as — not guessed to be a percentage */
    const rate: LookSnap = { ...base, sheet: 'Shift log', rows: 480, headline: 'Score', total: 0.874, months: [], splits: [] };
    expect(snapSays(rate)).toBe('“Score” is 0.87 overall, over 480 rows of “Shift log”.');
  });

  it('only the latest months are said; the earlier ones are counted from the first', () => {
    const label = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
    const s: LookSnap = { ...variance, kind: 'volume', headline: 'Packs', total: 3600, splits: [], months: label.map((l, i) => ({ key: `2026-0${i + 1}`, label: `${l} 2026`, days: 30, part: false, value: (i + 1) * 100 })) };
    expect(snapSays(s)).toBe('“Packs” comes to 3,600 over 270 rows of “Shift report”; by month: March 2026 300 · April 2026 400 · May 2026 500 · June 2026 600 · July 2026 700 · August 2026 800 — and 2 earlier months from January 2026.');
  });

  it('a month with nothing recorded is not said as a zero', () => {
    const s: LookSnap = { ...variance, splits: [], months: [{ key: '2026-07', label: 'July 2026', days: 31, part: false, value: null }, variance.months[0]] };
    expect(snapSays(s)).toBe('“Variance £” comes to −£50,368 over 270 rows of “Shift report”; by month: August 2026 −£35,460.');
  });

  it('a wider split is said by its biggest, the rest counted — an average by its highest and its lowest', () => {
    const groups = [['Jam', 210], ['Film break', 120], ['No bags', 95], ['Label', 40], ['Guard', 22], ['Clean', 18], ['Other', 9], ['Trial', 6]].map(([key, value]) => ({ key: String(key), value: Number(value) }));
    const lost: LookSnap = { ...base, sheet: 'Stops', rows: 88, headline: 'Minutes', total: 520, kind: 'lost', months: [], splits: [{ dim: 'Reason', groups: [...groups].reverse() }] };
    expect(snapSays(lost)).toBe('“Minutes” comes to 520 over 88 rows of “Stops”; by “Reason” (8): Jam 210 · Film break 120 · No bags 95 · Label 40 · and 4 smaller.');
    const avg: LookSnap = { ...lost, headline: 'Fill weight', total: 501.2, kind: 'reading', agg: 'avg', splits: [{ dim: 'Head', groups: groups.map((_g, i) => ({ key: `Head ${i + 1}`, value: 500 + i })) }] };
    expect(snapSays(avg)).toBe('“Fill weight” averages 501.2 over 88 rows of “Stops”; by “Head” (8): highest Head 8 507 · Head 7 506 · Head 6 505; lowest Head 1 500.');
  });

  it('a split too wide to be a headline — a product code — is left to be asked for, and so is one the snapshot may have cut', () => {
    const wide = (n: number) => ({ dim: 'Product', groups: Array.from({ length: n }, (_, i) => ({ key: `P${i}`, value: i + 1 })) });
    expect(snapSays({ ...variance, splits: [wide(13)] })).not.toMatch(/Product/);
    expect(snapSays({ ...variance, splits: [wide(60)] })).not.toMatch(/Product/);
    /* …and the next split that IS a headline takes its place */
    expect(snapSays({ ...variance, splits: [wide(13), variance.splits[1]] })).toMatch(/by “Shift”: Nights −£28,217 · Days −£22,152\.$/);
    /* one group is no split */
    expect(snapSays({ ...variance, splits: [{ dim: 'Site', groups: [{ key: 'Lincoln', value: -50368.5 }] }] })).not.toMatch(/Site/);
  });

  it('what stands out is said first: the split whose groups sit furthest apart against the whole, whatever order the sheet holds them in', () => {
    /* Status: short −62,211.24 against OK +11,842.74 — 74,053.98 apart, 1.47 of the whole; Line 18,106.20 apart (0.36); Shift 6,065.22 (0.12) */
    const status = { dim: 'Status', groups: [{ key: 'Short', value: -62211.24 }, { key: 'OK', value: 11842.74 }] };
    const s: LookSnap = { ...variance, splits: [variance.splits[1], status, variance.splits[0]] };
    expect(snapSays(s)).toBe(
      '“Variance £” comes to −£50,368 over 270 rows of “Shift report”; '
      + 'by month: August 2026 −£35,460 · September 2026 (part, 14 days) −£14,909; '
      + 'by “Status”: Short −£62,211 · OK £11,843; '
      + 'by “Line”: Line 3 −£26,692 · Line 1 −£15,091 · Line 2 −£8,586; '
      + 'by “Shift”: Nights −£28,217 · Days −£22,152.');
  });

  it('at most three splits are said, and the line is never longer than its limit: the splits go from the last, then the earlier months', () => {
    /* Crew's two sit 9,632 apart (0.19 of the whole) — more than Shift's 0.12: Shift is the one left out */
    const four: LookSnap = { ...variance, splits: [...variance.splits, { dim: 'Crew', groups: [{ key: 'A', value: -30000 }, { key: 'B', value: -20368 }] }, { dim: 'Status', groups: [{ key: 'Short', value: -62211.24 }, { key: 'OK', value: 11842.74 }] }] };
    expect(snapSays(four)).toMatch(/by “Status”: .*; by “Line”: .*; by “Crew”: A −£30,000 · B −£20,368\.$/);
    expect(snapSays(four)).not.toMatch(/Shift”/);
    const long = (n: number) => 'A very long name of a packing line in the north hall of the Lincoln site, number ' + n;
    const big: LookSnap = { ...variance, splits: [{ dim: 'Line', groups: [1, 2, 3, 4, 5].map(n => ({ key: long(n), value: -n * 10000 })) }, variance.splits[1]] };
    const out = snapSays(big) as string;
    expect(out.length).toBeLessThanOrEqual(STANDING.chars);
    expect(out).toMatch(/^“Variance £” comes to −£50,368 over 270 rows of “Shift report”; by month: /);
    expect(out).not.toMatch(/by “Shift”/);
  });

  it('what is not a snapshot says nothing', () => {
    expect(snapSays(undefined)).toBeUndefined();
    expect(snapSays({} as LookSnap)).toBeUndefined();
    expect(snapSays({ ...variance, months: undefined } as unknown as LookSnap)).toBeUndefined();
  });
});
