/* TWO RESULTS JOINED BY THEIR KEYS (22 November 2026 — docs/LUNA-ANALYSIS.md A5), pure, on results written by hand. What the review
 * of that day found in the first cut of it is kept here: the second result is never turned round on a guess; a pair the person gave
 * still applies when it is; and the "(k others)" of a top are not a label. */
import { describe, it, expect } from 'vitest';
import { joinResults, joinSaid } from '../join';
import type { DataResult } from '../outputs';

const res = (title: string, groupBy: string[], groups: [string[], number][], extra: Partial<DataResult['result']> = {}): DataResult => ({
  id: title, title, at: 0, query: {}, source: { kind: 'dataset', id: 'x', name: 'X' },
  result: { sheet: 'X', rowsScanned: 0, rowsMatched: 0, groups: groups.map(([key, v]) => ({ key, values: [v], rows: 1, refs: [] })), groupsTotal: groups.length, totals: [groups.reduce((s, g) => s + g[1], 0)], measures: ['sum of minutes'], groupBy, skipped: [], notes: [], ...extra },
});
const joined = (a: DataResult, b: DataResult, rules: { a: string; b: string }[] = []) => {
  const j = joinResults(a, b, 0, 0, rules);
  if ('why' in j) throw new Error(j.why);
  return j;
};

describe('the keys of the second result, read in the first’s order', () => {
  it('by their NAMES when the second’s are the first’s in another order — said', () => {
    const j = joined(res('Before', ['category', 'machine'], [[['Jam', 'Bagger'], 10], [['Film', 'Wrapper'], 12]]), res('After', ['machine', 'category'], [[['Bagger', 'Jam'], 35], [['Wrapper', 'Film'], 10]]));
    expect(j.rows.map(r => [r.label, r.a, r.b])).toEqual([['Jam · Bagger', 10, 35], ['Film · Wrapper', 12, 10]]);
    expect(j.heads).toEqual(['“After” is grouped by the same things in another order (machine, category) — its labels are read in the order of “Before” (category, machine).']);
    expect(j.onlyA).toEqual([]); expect(j.onlyB).toEqual([]);
  });
  it('never turned round on a guess: two results already in the same order stay so, however their labels overlap', () => {
    /* from, to — a route there and a route back are different rows. Read as written, one label meets (A · B); turned round, two
       would — and both would be wrong */
    const a = res('Moves in', ['from', 'to'], [[['A', 'B'], 10], [['B', 'C'], 20]]);
    const b = res('Moves out', ['from', 'to'], [[['B', 'A'], 5], [['C', 'B'], 7], [['A', 'B'], 9]]);
    const j = joined(a, b);
    expect(j.rows.map(r => [r.label, r.a, r.b])).toEqual([['A · B', 10, 9]]);
    expect(j.onlyA.map(o => o.label)).toEqual(['B · C']);
    expect(j.onlyB.map(o => o.label)).toEqual(['B · A', 'C · B']);
    expect(j.heads).toEqual([]);
    /* …the same when the two name their keys differently: read as written it meets something, so it is not turned */
    expect(joined(a, { ...b, result: { ...b.result, groupBy: ['origin', 'destination'] } }).rows.map(r => r.label)).toEqual(['A · B']);
  });
  it('where the names differ and read as written NOTHING meets, the order that does is taken — and said', () => {
    const j = joined(res('Their log', ['Machine', 'Date'], [[['Bagger', '2026-11-02'], 10], [['Wrapper', '2026-11-03'], 4]]), res('Our stops', ['day', 'machine name'], [[['2026-11-02', 'Bagger'], 12], [['2026-11-03', 'Wrapper'], 6]]));
    expect(j.rows.map(r => [r.label, r.a, r.b])).toEqual([['Bagger · 2026-11-02', 10, 12], ['Wrapper · 2026-11-03', 4, 6]]);
    expect(j.heads[0]).toMatch(/“Our stops” is grouped by the same things in another order \(day, machine name\) — its labels are read in the order of “Their log” \(machine name, day\)/);
  });
  it('a pair the person gave still applies when the second is read in another order — written as the second shows it', () => {
    const j = joined(res('Before', ['category', 'machine'], [[['Jam', 'Bagger'], 10]]), res('After', ['machine', 'category'], [[['Bagger', 'Jamming'], 35]]), [{ a: 'Jam · Bagger', b: 'Bagger · Jamming' }]);
    expect(j.rows.map(r => [r.label, r.labelB, r.a, r.b, r.byRule])).toEqual([['Jam · Bagger', 'Jamming · Bagger', 10, 35, true]]);
    /* …and written the first's way round, too */
    expect(joined(res('Before', ['category', 'machine'], [[['Jam', 'Bagger'], 10]]), res('After', ['machine', 'category'], [[['Bagger', 'Jamming'], 35]]), [{ a: 'Jam · Bagger', b: 'Jamming · Bagger' }]).rows).toHaveLength(1);
  });
});

describe('what is not a label', () => {
  it('the “(k others)” of a result asked for its top few are left out — they say how many, not which — and the join says so', () => {
    const a = res('Week 1', ['line', 'reason'], [[['Line 1', 'Jam'], 50], [['Line 1', '(3 others)'], 18]], { top: 1 });
    const b = res('Week 2', ['line', 'reason'], [[['Line 1', 'Jam'], 40], [['Line 1', '(3 others)'], 9]], { top: 1 });
    const j = joined(a, b);
    expect(j.rows.map(r => [r.label, r.a, r.b])).toEqual([['Line 1 · Jam', 50, 40]]);
    expect(j.heads.join(' ')).toMatch(/The “\(… others\)” groups of a result asked for its top few are left out \(2\)/);
    expect(joinSaid(j, 'Week on week', a, b)).toMatch(/left out \(2\) — they say how many, not which/);
    /* a reason that really is called "(3 others)" in a result NOT asked with top is a label like any other */
    expect(joined({ ...a, result: { ...a.result, top: undefined } }, { ...b, result: { ...b.result, top: undefined } }).rows).toHaveLength(2);
  });
  it('a side that shows fewer groups than it has is said — a label only on the other side may be past its cut', () => {
    const j = joined(res('Shown', ['reason'], [[['Jam'], 1]], { groupsTotal: 9 }), res('Whole', ['reason'], [[['Jam'], 2], [['Film'], 3]]));
    expect(j.heads).toEqual(['“Shown” shows 1 of its 9 groups — a label only on the other side may be among the ones it does not show.']);
    expect(j.onlyB.map(o => o.label)).toEqual(['Film']);
  });
});
