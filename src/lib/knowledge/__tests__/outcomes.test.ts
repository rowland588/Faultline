/* DID THE FIX WORK, AND DID IT LAST? (docs/LUNAR-KNOWLEDGE.md §4) — on hand-worked cases.
 * The line has a Film stop on the Wrapper every day, so every day is a watched day. Jam on the Bagger: 14 in the 28 days before the fix
 * (every other day) and 2 in the 28 after. Under "no change" the after stops are binomial(16, 28/56 = 0.5); two-sided
 * P = 2 · (C(16,0)+C(16,1)+C(16,2)) / 2^16 = 2 · 137 / 65536 = 0.004181 (scipy.stats.binomtest(2, 16, 0.5).pvalue = 0.00418). */
import { describe, it, expect } from 'vitest';
import { outcomeOf, outcomeVersions, type Fix } from '../outcomes';
import { currentOf, versionsOf } from '../model';
import type { Observation } from '../../../types';

const DAY = 86_400_000;
const FIX = Date.UTC(2026, 8, 1, 12);
let n = 0;
const stop = (at: number, asset: string, category: string, min = 5): Observation => ({
  id: `o${++n}`, workspaceId: 'L1', category, asset, startedAt: at, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: 0, updatedAt: 0,
});
const days = (from: number, to: number, every = 1) => Array.from({ length: Math.ceil((to - from) / every) }, (_, i) => from + i * every);
/** Film on the Wrapper every day from 28 days before the fix to `until` days after: every day watched. */
const watched = (until: number) => days(-28, until).map(d => stop(FIX + d * DAY + 3_600_000, 'Wrapper', 'Film'));
const jams = (ds: number[]) => ds.map(d => stop(FIX + d * DAY + 7_200_000, 'Bagger', 'Jam'));
const fix: Fix = { id: 'p1', kind: 'problem', lineId: 'L1', title: 'Bags jamming at the Bagger', at: FIX, machine: 'Bagger', reason: 'Jam', saidWhenClosed: 'Guide replaced', by: 'Dave' };
const before14 = jams(days(-28, 0, 2));

describe('did it work', () => {
  it('14 before and 2 after on 28 watched days each: improved, p = 0.004', () => {
    const o = outcomeOf(fix, [...watched(28), ...before14, ...jams([3, 17])], FIX + 28 * DAY);
    expect(o.before).toEqual({ stops: 14, watchedDays: 28, perDay: 0.5, minPerStop: 5 });
    expect(o.after).toEqual({ stops: 2, watchedDays: 28, perDay: 0.07, minPerStop: 5 });
    expect(o.p).toBeCloseTo(0.004, 3);
    expect(o.verdict).toBe('improved');
    expect(o.says).toBe('Closed 1 Sept 2026: Bags jamming at the Bagger — closed as “Guide replaced” (Dave, reported). Jam on the Bagger: before, 14 stops on 28 watched days (0.5 a day, 5 min each); after, 2 stops on 28 watched days (0.07 a day, 5 min each) — fewer stops; unlikely to be chance (p = 0.004).');
  });
  it('a day nobody timed is not a day with no stops: the same 2 stops on 4 watched days is too early to say', () => {
    const o = outcomeOf(fix, [...watched(4), ...before14, ...jams([1, 3])], FIX + 10 * DAY);
    expect(o.after?.watchedDays).toBe(4);
    expect(o.verdict).toBe('too-early');
  });
  it('as many after as before: no clear change — it may not have worked', () => {
    const o = outcomeOf(fix, [...watched(28), ...before14, ...jams(days(0, 28, 2))], FIX + 28 * DAY);
    expect(o.verdict).toBe('no-clear-change');
    expect(o.says).toMatch(/no clear change — it may not have worked, or not yet/);
  });
  it('no machine named: nothing to measure it by, said', () => {
    const o = outcomeOf({ ...fix, machine: undefined }, watched(28), FIX + 28 * DAY);
    expect(o.verdict).toBe('no-measure');
    expect(o.says).toMatch(/names no machine/);
  });
  it('a measured outcome from its own study is kept in its own words, as measured', () => {
    const o = outcomeOf({ ...fix, measured: { verdict: 'improved', says: 'Its own before → after: 48 → 30 min.', source: 'its before → after study', refs: ['s1', 's2'] } }, [], FIX + DAY);
    expect(o.known).toBe('measured');
    expect(o.says).toMatch(/48 → 30 min/);
  });
});

describe('did it last — eight weeks on', () => {
  const at = FIX + 70 * DAY;
  const base = [...watched(70), ...before14, ...jams([3, 17])];
  it('1 in the latest 4 weeks: held', () => expect(outcomeOf(fix, [...base, ...jams([60])], at).verdict).toBe('held'));
  it('15 in the latest 4 weeks: came back — what was said when it was closed is kept, the stops say otherwise', () => {
    const o = outcomeOf(fix, [...base, ...jams(days(42, 70, 1).slice(0, 15))], at);
    expect(o.verdict).toBe('came-back');
    expect(o.says).toMatch(/closed as “Guide replaced” \(Dave, reported\)/);
    expect(o.says).toMatch(/back where it was before; it came back/);
  });
  it('12 in the latest 4 weeks: lower than before but not clearly — not clearly holding', () => expect(outcomeOf(fix, [...base, ...jams(days(42, 70, 1).slice(0, 12))], at).verdict).toBe('not-holding'));
});

describe('outcomes in the ledger — each verdict a version, the ones before kept', () => {
  it('too early, then improved, then came back: three versions, each naming the one before; the same verdict again adds nothing', () => {
    const line = { id: 'L1', client: 'Branston' };
    const early = outcomeOf(fix, [...watched(4), ...before14], FIX + 5 * DAY);
    const v1 = outcomeVersions(line, [early], [], FIX + 5 * DAY);
    const ok = outcomeOf(fix, [...watched(28), ...before14, ...jams([3, 17])], FIX + 28 * DAY);
    const v2 = outcomeVersions(line, [ok], v1, FIX + 28 * DAY);
    expect(outcomeVersions(line, [ok], [...v1, ...v2], FIX + 29 * DAY)).toEqual([]);
    const back = outcomeOf(fix, [...watched(70), ...before14, ...jams([3, 17]), ...jams(days(42, 70, 1).slice(0, 15))], FIX + 70 * DAY);
    const v3 = outcomeVersions(line, [back], [...v1, ...v2], FIX + 70 * DAY);
    const all = [...v1, ...v2, ...v3];
    expect(versionsOf(all, 'outcome:fix:p1').map(v => (v.body as { verdict: string }).verdict)).toEqual(['too-early', 'improved', 'came-back']);
    expect(v2[0].supersedes).toBe(v1[0].id);
    expect(v3[0].supersedes).toBe(v2[0].id);
    expect(currentOf(all, 'outcome:fix:p1')!.kind).toBe('outcome');
    expect(v3[0].known).toBe('counted');
  });
  it('a fix raised from a finding is linked to it — neutral: whether the fix worked is not evidence about the finding', () => {
    const o = outcomeOf({ ...fix, fromFinding: 'k-f1' }, [...watched(28), ...before14, ...jams([3, 17])], FIX + 28 * DAY);
    const [e] = outcomeVersions({ id: 'L1' }, [o], [], FIX + 28 * DAY);
    expect(e.about).toBe('k-f1');
    expect(e.stance).toBe('neutral');
  });
});
