/* FIGURES WORKED FROM WHAT HAS BEEN ADDED UP (lib/workbook/derive, 22 November 2026 — docs/LUNA-ANALYSIS.md A3). Every expected figure
 * is worked by hand in the comment beside it, never by the module. */
import { describe, expect, it } from 'vitest';
import { DERIVE_HOW, DeriveError, deriveInto, derivedAt, derivedSaid, orderable, planDerive, readDerive, type Derive } from '../derive';
import type { Group } from '../query';
import { runTable, TableError, type Dataset } from '../../data/table';

const g = (key: string, ...values: (number | null)[]): Group => ({ key: [key], values: [...values], rows: 1, refs: [] });
const MEASURES = ['sum of Rejects', 'sum of Packs'];
/* three lines: rejects and packs */
const lines = (): Group[] => [g('Line 1', 30, 1000), g('Line 2', 50, 2000), g('Line 3', 20, 500)];
const work = (derive: Derive[], groups: Group[], totals: (number | string | null)[], measures = MEASURES) => {
  const plan = planDerive(derive, measures);
  deriveInto(plan, groups, totals, 'early');
  deriveInto(plan, groups, totals, 'late');
  return plan;
};

describe('a rate, a difference, a product — on each group and on the totals', () => {
  it('a rate is a ÷ b on each group; THE TOTAL’S RATE IS TOTAL ÷ TOTAL — never the groups’ rates added or averaged', () => {
    const groups = lines(), totals: (number | null)[] = [100, 3500];
    const plan = work([{ as: 'reject rate', op: 'ratio', a: 0, b: 1 }], groups, totals);
    /* 30/1000 · 50/2000 · 20/500 */
    expect(groups.map(x => x.values[2])).toEqual([0.03, 0.025, 0.04]);
    /* 100/3500 = 0.028571…; the groups' rates average 0.031667 and add to 0.095 — neither is the line's rate */
    expect(totals[2]).toBe(0.028571);
    expect(plan.names).toEqual(['reject rate']);
    expect(plan.derived).toEqual([{ as: 'reject rate', op: 'ratio', a: 'sum of Rejects', b: 'sum of Packs', fraction: true }]);
    expect(plan.notes[0]).toBe('“reject rate” is “sum of Rejects” ÷ “sum of Packs”, worked by the app on each group and on the totals — the total’s is total ÷ total, never the groups’ rates added or averaged.');
  });

  it('a difference and a product; a figure may be worked from an earlier one, by its name', () => {
    const groups = lines(), totals: (number | null)[] = [100, 3500];
    work([{ as: 'good', op: 'difference', a: 'sum of Packs', b: 'sum of Rejects' }, { as: 'yield', op: 'ratio', a: 'good', b: 1 }, { as: 'cost', op: 'product', a: 0, b: 0 }], groups, totals);
    /* 1000−30 · 2000−50 · 500−20; 970/1000 · 1950/2000 · 480/500; 30² · 50² · 20² */
    expect(groups.map(x => x.values.slice(2))).toEqual([[970, 0.97, 900], [1950, 0.975, 2500], [480, 0.96, 400]]);
    /* 3500−100; 3400/3500 = 0.971429; 100² */
    expect(totals.slice(2)).toEqual([3400, 0.971429, 10000]);
  });

  it('not recorded is never zero: nothing recorded behind a figure, or nothing to divide by, is not recorded', () => {
    const groups = [g('A', null, 100), g('B', 5, 0), g('C', 5, null)], totals: (number | null)[] = [10, 100];
    work([{ as: 'rate', op: 'ratio', a: 0, b: 1 }, { as: 'gap', op: 'difference', a: 1, b: 0 }], groups, totals);
    expect(groups.map(x => x.values.slice(2))).toEqual([[null, null], [null, -5], [null, null]]);
    expect(totals.slice(2)).toEqual([0.1, 90]);
  });
});

describe('a share is of the total over EVERY matched row', () => {
  it('each group’s part of the total — the total given, not the groups in hand added up', () => {
    /* the three lines shown add to 100, but 120 rejects matched (a fourth line was cut off, or rows had no date) */
    const groups = lines(), totals: (number | null)[] = [120, 4000];
    work([{ as: 'share of rejects', op: 'share', a: 0 }], groups, totals);
    /* 30/120 · 50/120 · 20/120 */
    expect(groups.map(x => x.values[2])).toEqual([0.25, 0.416667, 0.166667]);
    expect(totals[2]).toBe(1);
  });

  it('an average has no share, nor a running total — refused in words', () => {
    expect(() => planDerive([{ as: 's', op: 'share', a: 0 }], ['avg of Minutes'])).toThrow('“s”: a share is of something added up or counted — “avg of Minutes” is neither, so it has no total to be a share of.');
    expect(() => planDerive([{ as: 'r', op: 'running', a: 0 }], ['max of Minutes'])).toThrow(DeriveError);
    expect(() => planDerive([{ as: 'rs', op: 'running_share', a: 1 }], ['rows', 'distinct of Reason'])).toThrow(/a running share is of something added up or counted/);
    /* a count, the rows, and a difference of two things added up all have one */
    expect(planDerive([{ as: 's', op: 'share', a: 0 }, { as: 't', op: 'share', a: 1 }], ['rows', 'count of Reason']).names).toEqual(['s', 't']);
    expect(planDerive([{ as: 'good', op: 'difference', a: 1, b: 0 }, { as: 'share of good', op: 'share', a: 'good' }], MEASURES).names).toEqual(['good', 'share of good']);
    /* …but a rate has not */
    expect(() => planDerive([{ as: 'rate', op: 'ratio', a: 0, b: 1 }, { as: 'x', op: 'share', a: 'rate' }], MEASURES)).toThrow(/“rate” is neither/);
  });
});

describe('along the order asked: change, running, rank', () => {
  it('a change on the group before it, as it stands and as a share of it — the first has none', () => {
    const months = [g('2026-08', 100), g('2026-09', 120), g('2026-10', 90)], totals: (number | null)[] = [310];
    work([{ as: 'change', op: 'change', a: 0 }, { as: 'change %', op: 'pct_change', a: 0 }], months, totals, ['sum of Minutes']);
    /* 120−100 = 20 → 20/100; 90−120 = −30 → −30/120 */
    expect(months.map(x => x.values.slice(1))).toEqual([[null, null], [20, 0.2], [-30, -0.25]]);
    expect(totals.slice(1)).toEqual([null, null]);
  });

  it('a month with nothing recorded breaks the comparison on both sides — never compared with a zero', () => {
    const months = [g('2026-08', 100), g('2026-09', null), g('2026-10', 90)], totals: (number | null)[] = [190];
    work([{ as: 'change', op: 'change', a: 0 }], months, totals, ['sum of Minutes']);
    expect(months.map(x => x.values[1])).toEqual([null, null, null]);
  });

  it('a running total and its share — the Pareto’s 80% — in the order the groups are in', () => {
    const ordered = [g('Line 2', 50, 2000), g('Line 1', 30, 1000), g('Line 3', 20, 500)], totals: (number | null)[] = [100, 3500];
    work([{ as: 'running', op: 'running', a: 0 }, { as: 'running %', op: 'running_share', a: 0 }], ordered, totals);
    /* 50 · 50+30 · 80+20, of 100 */
    expect(ordered.map(x => x.values.slice(2))).toEqual([[50, 0.5], [80, 0.8], [100, 1]]);
    expect(totals.slice(2)).toEqual([100, 1]);
  });

  it('rank: 1 for the largest, equal figures the same rank, nothing recorded no rank', () => {
    const groups = [g('A', 30), g('B', 50), g('C', 30), g('D', null), g('E', 5)], totals: (number | null)[] = [115];
    work([{ as: 'rank', op: 'rank', a: 0 }], groups, totals, ['sum of Minutes']);
    expect(groups.map(x => x.values[1])).toEqual([2, 1, 2, null, 4]);
    expect(totals[1]).toBeNull();
  });

  it('the groups cannot be ordered by a figure worked from the order itself; by one that is not, they can', () => {
    const plan = planDerive([{ as: 'rate', op: 'ratio', a: 0, b: 1 }, { as: 'running', op: 'running', a: 0 }, { as: 'rate of running', op: 'ratio', a: 'running', b: 1 }], MEASURES);
    expect(orderable(plan, 0)).toBeUndefined();
    expect(orderable(plan, 2)).toBeUndefined();
    expect(orderable(plan, 3)).toBe('The groups cannot be ordered by “running” — it is worked from the order itself (running). Order by a measure, or by “group”.');
    /* …nor by a figure worked from one that is */
    expect(orderable(plan, 4)).toMatch(/cannot be ordered by “rate of running”/);
  });
});

describe('what cannot be worked is refused in words', () => {
  it('a name that is taken, a figure that is not there, a rate from one figure, too many', () => {
    expect(() => planDerive([{ as: 'Sum of Rejects', op: 'rank', a: 0 }], MEASURES)).toThrow('“Sum of Rejects” is already the name of a figure in this question — give the derived figure another name.');
    expect(() => planDerive([{ as: 'x', op: 'ratio', a: 0, b: 7 }], MEASURES)).toThrow('“x”: its b (7) is not a figure of this question — it has 0 “sum of Rejects”, 1 “sum of Packs”.');
    expect(() => planDerive([{ as: 'x', op: 'ratio', a: 'sum of Scrap', b: 1 }], MEASURES)).toThrow(/its a \(“sum of Scrap”\) is not a figure of this question/);
    expect(() => planDerive([{ as: 'x', op: 'ratio', a: 0 }], MEASURES)).toThrow('“x”: a ratio is worked from two figures — a and b.');
    /* a figure may only be worked from one before it */
    expect(() => planDerive([{ as: 'x', op: 'ratio', a: 'y', b: 1 }, { as: 'y', op: 'rank', a: 0 }], MEASURES)).toThrow(/its a \(“y”\) is not a figure/);
    expect(() => planDerive(Array.from({ length: 5 }, (_, i) => ({ as: `d${i}`, op: 'rank' as const, a: 0 })), MEASURES)).toThrow(/^At most 4 derived figures a question\./);
    expect(() => planDerive([{ as: ' ', op: 'rank', a: 0 }], MEASURES)).toThrow(/needs a name/);
  });

  it('as it arrives from outside: read defensively, refused with how to ask', () => {
    expect(readDerive(undefined)).toEqual([]);
    expect(readDerive([{ as: 'rate', op: 'ratio', a: 0, b: 'sum of Packs', extra: 1 }])).toEqual([{ as: 'rate', op: 'ratio', a: 0, b: 'sum of Packs' }]);
    for (const bad of ['x', [{ as: 'x', op: 'divide', a: 0 }], [{ op: 'rank', a: 0 }], [{ as: 'x', op: 'rank', a: -1 }], [{ as: 'x', op: 'rank', a: 1.5 }], [{ as: 'x', op: 'ratio', a: 0, b: {} }], Array.from({ length: 5 }, () => ({ as: 'x', op: 'rank', a: 0 }))]) expect(readDerive(bad)).toBe(DERIVE_HOW);
  });

  it('nothing asked is nothing worked', () => {
    const groups = lines(), totals: (number | null)[] = [100, 3500];
    const plan = work([], groups, totals);
    expect(plan.names).toEqual([]);
    expect(groups[0].values).toEqual([30, 1000]);
  });
});

describe('how a derived figure is said', () => {
  const r = { measures: [...MEASURES, 'rate', 'share', 'rank', 'gap'], derived: [{ as: 'rate', op: 'ratio' as const, a: 'x', b: 'y', fraction: true as const }, { as: 'share', op: 'share' as const, a: 'x', fraction: true as const }, { as: 'rank', op: 'rank' as const, a: 'x' }, { as: 'gap', op: 'difference' as const, a: 'x', b: 'y' }] };
  it('a share and a change as a percentage; a rate with enough figures to quote; a measure and a difference as they always were', () => {
    expect(derivedAt(r, 1)).toBeUndefined();
    expect(derivedSaid(0.028571, derivedAt(r, 2))).toBe('0.02857');
    expect(derivedSaid(85.2345, derivedAt(r, 2))).toBeUndefined();          /* a rate of 85 a minute is said as any figure is */
    expect(derivedSaid(0.416667, derivedAt(r, 3))).toBe('41.7%');
    expect(derivedSaid(-0.25, { as: 'c', op: 'pct_change', a: 'x', fraction: true })).toBe('-25%');
    expect(derivedSaid(1, derivedAt(r, 3))).toBe('100%');
    expect(derivedSaid(3, derivedAt(r, 4))).toBe('3');
    expect(derivedSaid(970, derivedAt(r, 5))).toBeUndefined();
    expect(derivedSaid(null, derivedAt(r, 3))).toBeUndefined();
    expect(derivedAt({ measures: MEASURES }, 1)).toBeUndefined();
  });
});

/* THROUGH AN ENGINE: the app's own records as a table (lib/data/table) — every group worked BEFORE the cut */
describe('asked of a table: worked on every group, then cut', () => {
  const d: Dataset = {
    id: 'tests:L', name: 'Line trials', kind: 'tests', limits: [],
    fields: [{ name: 'Line', type: 'text', means: '' }, { name: 'Day', type: 'date', means: '' }, { name: 'Rejects', type: 'number', means: '' }, { name: 'Packs', type: 'number', means: '' }],
    rows: [['Line 1', '2026-09-03', 10, 400], ['Line 1', '2026-10-03', 20, 600], ['Line 2', '2026-09-04', 50, 2000], ['Line 3', '2026-09-05', 20, 500], ['Line 3', '2026-10-06', null, 400]],
    refs: ['t1', 't2', 't3', 't4', 't5'],
  };
  const base = { sheet: '', measures: [{ op: 'sum' as const, column: 'Rejects' }, { op: 'sum' as const, column: 'Packs' }] };

  it('the reject rate by line, its share and its rank — in ONE question, the total’s rate from the totals', () => {
    const r = runTable(d, { ...base, groupBy: ['Line'], derive: [{ as: 'reject rate', op: 'ratio', a: 0, b: 1 }, { as: 'share of rejects', op: 'share', a: 0 }, { as: 'rank', op: 'rank', a: 0 }] });
    expect(r.measures).toEqual(['sum of Rejects', 'sum of Packs', 'reject rate', 'share of rejects', 'rank']);
    /* by rejects, biggest first: Line 2 50/2000 · Line 1 30/1000 · Line 3 20/900 (its October packs count; its October rejects are not recorded) */
    expect(r.groups.map(x => [x.key[0], ...x.values])).toEqual([['Line 2', 50, 2000, 0.025, 0.5, 1], ['Line 1', 30, 1000, 0.03, 0.3, 2], ['Line 3', 20, 900, 0.022222, 0.2, 3]]);
    /* 100/3900 = 0.025641 */
    expect(r.totals).toEqual([100, 3900, 0.025641, 1, null]);
    expect(r.derived?.map(x => x.as)).toEqual(['reject rate', 'share of rejects', 'rank']);
    expect(r.notes).toContain('“share of rejects” is each group’s “sum of Rejects” as a share of the total over EVERY matched row — not only the groups shown.');
  });

  it('cut to the biggest one: its share is still of every row, and its running share says how far it gets', () => {
    const r = runTable(d, { ...base, groupBy: ['Line'], limit: 1, derive: [{ as: 'share', op: 'share', a: 0 }, { as: 'running %', op: 'running_share', a: 0 }] });
    expect(r.groupsTotal).toBe(3);
    expect(r.groups.map(x => [x.key[0], ...x.values])).toEqual([['Line 2', 50, 2000, 0.5, 0.5]]);
  });

  it('ordered by the rate itself, worst first', () => {
    const r = runTable(d, { ...base, groupBy: ['Line'], derive: [{ as: 'reject rate', op: 'ratio', a: 0, b: 1 }], order: { by: 2, desc: true } });
    expect(r.groups.map(x => x.key[0])).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });

  it('month on month: the change and its share of the month before, in date order', () => {
    const r = runTable(d, { ...base, time: { column: 'Day', by: 'month' }, derive: [{ as: 'change', op: 'change', a: 0 }, { as: 'change %', op: 'pct_change', a: 0 }, { as: 'rate', op: 'ratio', a: 0, b: 1 }] });
    /* September 10+50+20 = 80 rejects on 2,900 packs; October 20 on 1,000: −60, −60/80 */
    expect(r.groups.map(x => [x.key[0], ...x.values])).toEqual([['2026-09', 80, 2900, null, null, 0.027586], ['2026-10', 20, 1000, -60, -0.75, 0.02]]);
  });

  it('what cannot be worked is refused as the table refuses anything', () => {
    expect(() => runTable(d, { ...base, groupBy: ['Line'], derive: [{ as: 'x', op: 'ratio', a: 0, b: 9 }] })).toThrow(TableError);
    expect(() => runTable(d, { ...base, groupBy: ['Line'], derive: [{ as: 'run', op: 'running', a: 0 }], order: { by: 2 } })).toThrow(/cannot be ordered by “run”/);
  });
});
