/* WHICH GROUPS ARE SHOWN — a condition on a group's figure, and the top few WITHIN each group (22 November 2026 —
 * docs/LUNA-ANALYSIS.md, G4 slice A6; lib/workbook/groups). Every figure is worked by hand from the rows below.
 *
 *   line     reason   minutes            the line's whole
 *   Line 1   Jam        40
 *   Line 1   Jam        10    Jam 50
 *   Line 1   Film       20
 *   Line 1   Label      10
 *   Line 1   Glue        5
 *   Line 1   Belt        3               88
 *   Line 2   Film       30
 *   Line 2   Jam        12
 *   Line 2   Label       6               48
 *   Line 3   Belt        7
 *   Line 3   Glue        2                9
 *                                      = 145 over 11 rows
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { blocksSaid, isOthers, keepHaving, keptGroups, othersLabel, planHaving, readHaving, readTop, wholeBlocks } from '../groups';
import { runTable, TableError, type Dataset } from '../../data/table';
import { runQuery, type Group, type QueryResult } from '../query';
import type { WorkbookProfile } from '../read';
import type { MemoryStore } from '../store';
import { readTiny, type TinyCell } from './tinyBook';

const ROWS: [string, string, number][] = [
  ['Line 1', 'Jam', 40], ['Line 1', 'Jam', 10], ['Line 1', 'Film', 20], ['Line 1', 'Label', 10], ['Line 1', 'Glue', 5], ['Line 1', 'Belt', 3],
  ['Line 2', 'Film', 30], ['Line 2', 'Jam', 12], ['Line 2', 'Label', 6],
  ['Line 3', 'Belt', 7], ['Line 3', 'Glue', 2],
];
const D: Dataset = {
  id: 'stops:x', name: 'The stops', kind: 'stops',
  fields: [{ name: 'line', type: 'text', means: 'the line' }, { name: 'reason', type: 'text', means: 'what stopped it' }, { name: 'minutes', type: 'number', means: 'how long' }],
  rows: ROWS.map(r => [...r]), refs: ROWS.map((_r, i) => `stop:${i + 1}`), limits: [],
};
const rows = (r: QueryResult): (string | number | null)[][] => r.groups.map(g => [g.key.join(' · '), ...g.values]);

describe('the top few within each group — the app’s own tables', () => {
  it('“the top two reasons on each line”: every line is there, the rest of each brought together, each line adding back to its whole', () => {
    const r = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }], top: { n: 2 } });
    expect(rows(r)).toEqual([
      ['Line 1 · Jam', 50], ['Line 1 · Film', 20], ['Line 1 · (3 others)', 18],
      ['Line 2 · Film', 30], ['Line 2 · Jam', 12], ['Line 2 · (1 other)', 6],
      ['Line 3 · Belt', 7], ['Line 3 · Glue', 2],
    ]);
    expect(r.totals).toEqual([145]);
    expect(r.groupsTotal).toBe(8);
    expect(r.top).toBe(2);
    /* each line's groups add back to the line: 50 + 20 + 18 = 88, 30 + 12 + 6 = 48, 7 + 2 = 9 — and the lines to the whole */
    const by = new Map<string, number>();
    for (const g of r.groups) by.set(g.key[0], (by.get(g.key[0]) ?? 0) + (g.values[0] as number));
    expect([...by]).toEqual([['Line 1', 88], ['Line 2', 48], ['Line 3', 9]]);
    expect(r.notes.join(' ')).toMatch(/Within each “line” the 2 largest “reason” by “sum of minutes” are shown, and the rest of each are brought together as one “\(… others\)” group, worked from the rows/);
  });

  it('the others are worked from the ROWS, so an average, a highest, a count and a distinct count of them are exact', () => {
    const r = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }, { op: 'count' }, { op: 'avg', column: 'minutes' }, { op: 'max', column: 'minutes' }, { op: 'distinct', column: 'reason' }], top: { n: 2 } });
    /* Line 1's Jam: 40 and 10 — two stops, 25 a stop, the longest 40. Its others: Label 10, Glue 5, Belt 3 — three stops, 18 ÷ 3 = 6 a
       stop (never the average of the three groups' averages, which happens to be the same here; the longest 10; three reasons) */
    expect(rows(r)[0]).toEqual(['Line 1 · Jam', 50, 2, 25, 40, 1]);
    expect(rows(r)[2]).toEqual(['Line 1 · (3 others)', 18, 3, 6, 10, 3]);
    expect(rows(r)[5]).toEqual(['Line 2 · (1 other)', 6, 1, 6, 6, 1]);
  });

  it('a share of the whole and a rate are worked for the others too; a rank is of the groups asked for, and the others have none', () => {
    const r = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }, { op: 'count' }], derive: [{ as: 'share', op: 'share', a: 0 }, { as: 'minutes a stop', op: 'ratio', a: 0, b: 1 }, { as: 'rank', op: 'rank', a: 0 }], top: { n: 2 } });
    const at = (label: string) => r.groups.find(g => g.key.join(' · ') === label)?.values;
    expect(at('Line 1 · Jam')).toEqual([50, 2, 0.344828, 25, 1]);              /* 50 ÷ 145 */
    expect(at('Line 1 · (3 others)')).toEqual([18, 3, 0.124138, 6, null]);     /* 18 ÷ 145 */
    expect(r.totals).toEqual([145, 11, 1, 13.181818, null]);                   /* 145 ÷ 11 */
  });

  it('the smallest instead; the lines in the order of their names; and the cut is by whole lines, never part of one', () => {
    const small = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }], top: { n: 2 }, order: { by: 0, desc: false } });
    expect(rows(small)).toEqual([
      ['Line 3 · Glue', 2], ['Line 3 · Belt', 7],
      ['Line 2 · Label', 6], ['Line 2 · Jam', 12], ['Line 2 · (1 other)', 30],
      ['Line 1 · Belt', 3], ['Line 1 · Glue', 5], ['Line 1 · (3 others)', 80],
    ]);
    const named = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }], top: { n: 1 }, order: { by: 'group', desc: true } });
    expect(rows(named)).toEqual([['Line 3 · Belt', 7], ['Line 3 · (1 other)', 2], ['Line 2 · Film', 30], ['Line 2 · (2 others)', 18], ['Line 1 · Jam', 50], ['Line 1 · (4 others)', 38]]);
    /* limit counts the FIRST thing grouped by: two lines, each whole — six groups of the eight */
    const cut = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }], top: { n: 2 }, limit: 2 });
    expect(cut.groups).toHaveLength(6);
    expect(cut.groupsTotal).toBe(8);
    expect(cut.groups[cut.groups.length - 1]?.key).toEqual(['Line 2', '(1 other)']);
  });

  it('none has more than was asked for: every group is shown, and it says so', () => {
    const r = runTable(D, { groupBy: ['line', 'reason'], measures: [{ op: 'sum', column: 'minutes' }], top: { n: 5 } });
    expect(r.groups).toHaveLength(10);
    expect(r.groups.some(g => isOthers(g.key[1]))).toBe(false);
    expect(r.notes.join(' ')).toMatch(/none has more than 5, so every group is shown/);
  });

  it('what cannot be worked is refused in words', () => {
    const m = [{ op: 'sum' as const, column: 'minutes' }];
    expect(() => runTable(D, { groupBy: ['line'], measures: m, top: { n: 2 } })).toThrow(/top needs exactly two things grouped by — this question has 1/);
    expect(() => runTable(D, { groupBy: ['line', 'reason'], measures: m, top: { n: 0 } })).toThrow(TableError);
    expect(() => runTable(D, { groupBy: ['line', 'reason'], measures: m, top: { n: 2 }, having: [{ of: 0, op: 'gt', value: 5 }] })).toThrow(/top and having cannot be asked together/);
    expect(() => runTable(D, { groupBy: ['line', 'reason'], measures: m, top: { n: 2 }, derive: [{ as: 'running', op: 'running', a: 0 }] })).toThrow(/with top the groups are in blocks — ask it without top/);
  });
});

describe('a condition on a group’s figure', () => {
  const m = [{ op: 'sum' as const, column: 'minutes' }];
  it('“which lines lost more than 40 minutes?” — two of the three; the totals still of every row, and the result says it shows fewer than there are', () => {
    const r = runTable(D, { groupBy: ['line'], measures: m, having: [{ of: 0, op: 'gt', value: 40 }] });
    expect(rows(r)).toEqual([['Line 1', 88], ['Line 2', 48]]);
    expect(r.totals).toEqual([145]);
    expect(r.groupsTotal).toBe(3);
    expect(r.notes.join(' ')).toContain('Only the groups with “sum of minutes” more than 40 are shown: 2 of 3. The totals are still of every matched row — the 1 not shown are in them.');
  });
  it('on a derived figure, by its name; between two figures; two conditions together', () => {
    const share = runTable(D, { groupBy: ['line'], measures: m, derive: [{ as: 'share', op: 'share', a: 0 }], having: [{ of: 'share', op: 'gte', value: 0.3 }] });
    expect(rows(share)).toEqual([['Line 1', 88, 0.606897], ['Line 2', 48, 0.331034]]);    /* 88 ÷ 145, 48 ÷ 145; Line 3 is 9 ÷ 145 = 6% */
    expect(rows(runTable(D, { groupBy: ['line'], measures: m, having: [{ of: 0, op: 'between', from: 5, to: 50 }] }))).toEqual([['Line 2', 48], ['Line 3', 9]]);
    const two = runTable(D, { groupBy: ['reason'], measures: [...m, { op: 'count' }], having: [{ of: 0, op: 'gte', value: 15 }, { of: 'rows', op: 'gte', value: 3 }] });
    /* Jam 62 over 3 stops; Film 50 over 2; Label 16 over 2; Glue 7; Belt 10 — only Jam has 15 minutes AND three stops */
    expect(rows(two)).toEqual([['Jam', 62, 3]]);
  });
  it('a running total is of the groups that are shown, in their order; a share is still of everything', () => {
    const r = runTable(D, { groupBy: ['line'], measures: m, derive: [{ as: 'running', op: 'running', a: 0 }, { as: 'share', op: 'share', a: 0 }], having: [{ of: 0, op: 'lt', value: 80 }] });
    expect(rows(r)).toEqual([['Line 2', 48, 48, 0.331034], ['Line 3', 9, 57, 0.062069]]);
  });
  it('refused in words when it names no figure of the question, or is not a condition', () => {
    expect(() => runTable(D, { groupBy: ['line'], measures: m, having: [{ of: 'packs', op: 'gt', value: 1 }] })).toThrow(/having: “packs” is not a figure of this question — it has 0 “sum of minutes”/);
    expect(() => runTable(D, { groupBy: ['line'], measures: m, having: [{ of: 3, op: 'gt', value: 1 }] })).toThrow(/is not a figure of this question/);
    expect(readHaving([{ of: 0, op: 'over', value: 1 }])).toMatch(/^having is up to three of/);
    expect(readHaving([{ of: 0, op: 'between', from: 1 }])).toMatch(/^having is up to three of/);
    expect(readHaving([{ of: 0, op: 'gt', value: 1 }, { of: 'share', op: 'between', from: 0.1, to: 0.5 }])).toEqual([{ of: 0, op: 'gt', value: 1 }, { of: 'share', op: 'between', from: 0.1, to: 0.5 }]);
    expect(readTop({ n: 3 })).toEqual({ n: 3 });
    expect(readTop({ n: 0 })).toMatch(/^top is \{ n \}/);
    expect(readTop(undefined)).toBeUndefined();
  });
});

describe('the pieces, by hand', () => {
  const g = (key: string[], ...values: (number | null)[]): Group => ({ key, values, rows: 1, refs: [] });
  it('a group with nothing recorded meets no condition', () => {
    const plan = planHaving([{ of: 0, op: 'lt', value: 100 }], ['sum of minutes']);
    expect(keepHaving(plan, [g(['a'], 5), g(['b'], null)]).kept.map(x => x.key[0])).toEqual(['a']);
    expect(keepHaving([], [g(['a'], 5)])).toEqual({ kept: [g(['a'], 5)], dropped: 0 });
  });
  it('the others are named by how many they are, and known again by that name', () => {
    expect(othersLabel(1)).toBe('(1 other)');
    expect(othersLabel(1234)).toBe('(1,234 others)');
    expect(isOthers('(3 others)') && isOthers('(1 other)') && isOthers('(1,234 others)')).toBe(true);
    expect(isOthers('Others') || isOthers('(blank)')).toBe(false);
  });
  it('said block by block — every line on one line with its top few — and a block is never started that there is no room for', () => {
    const list = [g(['Line 1', 'Jam'], 50), g(['Line 1', 'Film'], 20), g(['Line 1', '(3 others)'], 18), g(['Line 2', 'Film'], 30), g(['Line 2', 'Jam'], 12), g(['Line 3', 'Belt'], 7)];
    const say = (v: number | string | null) => String(v);
    expect(blocksSaid(list, say)).toEqual({ text: 'Line 1 — Jam: 50; Film: 20; (3 others): 18 | Line 2 — Film: 30; Jam: 12 | Line 3 — Belt: 7', shown: 6 });
    expect(blocksSaid(list, say, 45)).toEqual({ text: 'Line 1 — Jam: 50; Film: 20; (3 others): 18', shown: 3 });
  });
  it('a cut keeps whole blocks: at least the first, never part of one', () => {
    const six = [g(['Line 1', 'Jam'], 1), g(['Line 1', 'Film'], 1), g(['Line 1', '(3 others)'], 1), g(['Line 2', 'Film'], 1), g(['Line 2', 'Jam'], 1), g(['Line 3', 'Belt'], 1)];
    expect(keptGroups(six, 5, true).map(x => x.key.join(' · '))).toEqual(['Line 1 · Jam', 'Line 1 · Film', 'Line 1 · (3 others)', 'Line 2 · Film', 'Line 2 · Jam']);
    expect(keptGroups(six, 4, true)).toHaveLength(3);      /* Line 2 would be cut in two — it is left out whole */
    expect(keptGroups(six, 2, true)).toHaveLength(3);      /* the first block is kept whole, however long */
    expect(keptGroups(six, 4, false)).toHaveLength(4);     /* not asked with top: so many groups, as ever */
    expect(keptGroups(six, 9, true)).toHaveLength(6);
    expect(wholeBlocks([3, 3, 2], 8)).toBe(8);
    expect(wholeBlocks([3, 3, 2], 7)).toBe(6);
    expect(wholeBlocks([3, 3, 2], 2)).toBe(3);
    expect(wholeBlocks([], 5)).toBe(0);
  });
});

describe('the same asked of a workbook', () => {
  const at = (d: number, h: number): TinyCell => ({ at: Date.UTC(2026, 8, d, h) });
  let p: WorkbookProfile, store: MemoryStore;
  beforeAll(async () => {
    ({ p, store } = await readTiny({ Stops: [['Start', 'Line', 'Reason', 'Minutes'], ...ROWS.map(([line, reason, min], i): TinyCell[] => [at(14 + (i % 3), 6 + i), line, reason, min])] }));
  });
  it('the top two reasons on each line, to the same figures — and the keys in the same order as the app’s own tables', async () => {
    const r = await runQuery(store, p, { sheet: 'Stops', groupBy: ['Line', 'Reason'], measures: [{ op: 'sum', column: 'Minutes' }, { op: 'count' }, { op: 'avg', column: 'Minutes' }], top: { n: 2 } });
    expect(rows(r)).toEqual([
      ['Line 1 · Jam', 50, 2, 25], ['Line 1 · Film', 20, 1, 20], ['Line 1 · (3 others)', 18, 3, 6],
      ['Line 2 · Film', 30, 1, 30], ['Line 2 · Jam', 12, 1, 12], ['Line 2 · (1 other)', 6, 1, 6],
      ['Line 3 · Belt', 7, 1, 7], ['Line 3 · Glue', 2, 1, 2],
    ]);
    expect(r.totals).toEqual([145, 11, 13.181818]);
    expect(r.top).toBe(2);
    const had = await runQuery(store, p, { sheet: 'Stops', groupBy: ['Line'], measures: [{ op: 'sum', column: 'Minutes' }], having: [{ of: 0, op: 'gt', value: 40 }] });
    expect(rows(had)).toEqual([['Line 1', 88], ['Line 2', 48]]);
    expect(had.groupsTotal).toBe(3);
    /* a field and a time bucket: the time is the LAST key in both engines (22 November) */
    const w = await runQuery(store, p, { sheet: 'Stops', groupBy: ['Line'], time: { column: 'Start', by: 'month' }, measures: [{ op: 'sum', column: 'Minutes' }] });
    const t = runTable({ ...D, fields: [...D.fields, { name: 'day', type: 'date', means: 'the day' }], rows: ROWS.map(r => [...r, '2026-09-14']) }, { groupBy: ['line'], time: { column: 'day', by: 'month' }, measures: [{ op: 'sum', column: 'minutes' }] });
    expect(rows(w)).toEqual([['Line 1 · 2026-09', 88], ['Line 2 · 2026-09', 48], ['Line 3 · 2026-09', 9]]);
    expect(rows(t)).toEqual(rows(w));
    expect(t.groupBy).toEqual(['line', 'day by month']);
    expect(w.groupBy).toEqual(['Line', 'Start by month']);
  });
});

/* WHAT THE REVIEW OF 22 NOVEMBER FOUND IN THIS SLICE BEFORE IT SHIPPED, each kept as a test. */
describe('found by the review, and put right', () => {
  const m = [{ op: 'sum' as const, column: 'minutes' }];
  it('“the reasons that make up 80% of it” — a condition on a figure worked ALONG THE ORDER is looked at after that figure is worked (it kept no group at all)', () => {
    /* by reason, biggest first: Jam 62, Film 50, Label 16, Belt 10, Glue 7 — running 62, 112, 128, 138, 145 of 145 */
    const r = runTable(D, { groupBy: ['reason'], measures: m, derive: [{ as: 'cum', op: 'running_share', a: 0 }], having: [{ of: 'cum', op: 'lte', value: 0.8 }] });
    expect(rows(r)).toEqual([['Jam', 62, 0.427586], ['Film', 50, 0.772414]]);
    expect(r.groupsTotal).toBe(5);
    expect(r.only).toBe('“cum” at most 0.8');
    expect(r.notes.join(' ')).toContain('Only the groups with “cum” at most 0.8 are shown: 2 of 5.');
    /* with a condition on a total as well: the reasons of 10 minutes or more first, the running share then of those */
    const both = runTable(D, { groupBy: ['reason'], measures: m, derive: [{ as: 'cum', op: 'running', a: 0 }], having: [{ of: 0, op: 'gte', value: 10 }, { of: 'cum', op: 'lt', value: 130 }] });
    expect(rows(both)).toEqual([['Jam', 62, 62], ['Film', 50, 112], ['Label', 16, 128]]);
  });
  it('a figure that is a DATE is not a number: no condition on it, and no top by it — refused in words; and the app’s own tables say the first of a date as a day', () => {
    const dated: Dataset = { ...D, fields: [...D.fields, { name: 'day', type: 'date', means: 'the day' }], rows: ROWS.map((r, i) => [...r, `2026-09-${String(10 + i).padStart(2, '0')}`]) };
    const first = runTable(dated, { groupBy: ['line'], measures: [{ op: 'min', column: 'day' }, { op: 'max', column: 'day' }], order: { by: 'group' } });
    expect(rows(first)).toEqual([['Line 1', '2026-09-10', '2026-09-15'], ['Line 2', '2026-09-16', '2026-09-18'], ['Line 3', '2026-09-19', '2026-09-20']]);
    expect(() => runTable(dated, { groupBy: ['line'], measures: [{ op: 'min', column: 'day' }], having: [{ of: 0, op: 'gt', value: 1 }] })).toThrow(/having: “min of day” is a date, not a number/);
    expect(() => runTable(dated, { groupBy: ['line', 'reason'], measures: [{ op: 'max', column: 'day' }], top: { n: 1 } })).toThrow(/top takes the largest by a number — “max of day” is a date/);
    /* …with a number to order by, the same top is answered */
    expect(runTable(dated, { groupBy: ['line', 'reason'], measures: [{ op: 'max', column: 'day' }, ...m], top: { n: 1 }, order: { by: 1 } }).groups[0].key).toEqual(['Line 1', 'Jam']);
  });
  it('a figure worked FROM a rank has nothing to say of the others either', () => {
    const r = runTable(D, { groupBy: ['line', 'reason'], measures: m, derive: [{ as: 'rank', op: 'rank', a: 0 }, { as: 'twice the rank', op: 'product', a: 'rank', b: 'rank' }], top: { n: 2 } });
    expect(r.groups.find(g => g.key.join(' · ') === 'Line 1 · Jam')?.values).toEqual([50, 1, 1]);
    expect(r.groups.find(g => g.key.join(' · ') === 'Line 1 · (3 others)')?.values).toEqual([18, null, null]);
  });
  it('a lookup or a row sum asked of one of the app’s own tables is refused in words — never a crash', () => {
    expect(() => runTable(D, { groupBy: ['line'], measures: m, calcs: [{ as: 'x', a: 'minutes', op: '*', b: 2 }] })).toThrow(/is one of the app’s own tables — a lookup and a sum worked on each row are asked of a workbook’s sheets/);
  });
});

describe('the same, asked of a workbook: a date is not a number', () => {
  const at = (d: number, h: number): TinyCell => ({ at: Date.UTC(2026, 8, d, h) });
  it('top by the first of a date column is refused in words; a condition on a running share is answered', async () => {
    const { p, store } = await readTiny({ Stops: [['Start', 'Line', 'Reason', 'Minutes'], ...ROWS.map(([line, reason, min], i): TinyCell[] => [at(10 + i, 6), line, reason, min])] });
    await expect(runQuery(store, p, { sheet: 'Stops', groupBy: ['Line', 'Reason'], measures: [{ op: 'min', column: 'Start' }], top: { n: 1 } })).rejects.toThrow(/top takes the largest by a number — “min of Start” is a date/);
    await expect(runQuery(store, p, { sheet: 'Stops', groupBy: ['Line'], measures: [{ op: 'max', column: 'Start' }], having: [{ of: 0, op: 'gt', value: 1 }] })).rejects.toThrow(/having: “max of Start” is a date, not a number/);
    const r = await runQuery(store, p, { sheet: 'Stops', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }], derive: [{ as: 'cum', op: 'running_share', a: 0 }], having: [{ of: 'cum', op: 'lte', value: 0.8 }] });
    expect(rows(r)).toEqual([['Jam', 62, 0.427586], ['Film', 50, 0.772414]]);
    expect(r.only).toBe('“cum” at most 0.8');
  });
});
