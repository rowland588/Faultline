/* THE TEAM'S WEEKLY NUMBER, PROVED AND TRENDED (FC-201, FC-117; knowledge/specs/FC-117-weekly-number.md) — the independent cases of
 * scripts/knowledge/cases-kaizen.py section P (a second implementation: Welch's t with the incomplete-beta t distribution, checked
 * against the t table; Kendall's S, Sen's slope and the runs worked out by hand), never the code's own output. */
import { describe, expect, it } from 'vitest';
import { numberProof, numberTrend, numbersSays, proofSentence, TREND_FROM } from '../measureProof';
import type { Measure, Reading } from '../measures';

const BEFORE = [42, 41, 35, 47, 44], AFTER = [46, 49, 52, 53, 50];
const day = (i: number) => new Date(Date.UTC(2026, 8, 7 + 7 * i)).toISOString().slice(0, 10);
const m = (o: Partial<Measure> = {}): Measure => ({ id: 'm1', name: 'Rate', unit: 'ppm', direction: 'up', sort: 0, ...o });
const rd = (lineId: string, i: number, value: number, measureId = 'm1'): Reading => ({ id: `${lineId}${i}`, projectId: 'p', lineId, measureId, at: day(i), value, createdAt: i, updatedAt: i });

describe('the weekly number, proved at a change (FC-201)', () => {
  const p = numberProof([...BEFORE, ...AFTER], 5, 'up')!;
  it('Welch’s one-sided t on five weeks before and five after: t 3.5157, 6.66 df, p 0.005304, +19.6%', () => {
    expect(p.beforeN).toBe(5); expect(p.afterN).toBe(5);
    expect(p.beforeMean).toBeCloseTo(41.8, 9); expect(p.afterMean).toBeCloseTo(50, 9);
    expect(p.delta).toBeCloseTo(8.2, 9);
    expect(p.changePct).toBeCloseTo(19.6172, 3);
    expect(p.pValue).toBeCloseTo(0.005304, 5);
    expect(p.significant).toBe(true); expect(p.verdict).toBe('proven');
    expect(proofSentence(p, 'ppm')).toBe('41.8 → 50 ppm · +19.6% · 5 before · 5 after');
  });
  it('the same weeks for a measure that should fall are worse, and say so — the direction decides', () => {
    const q = numberProof([...BEFORE, ...AFTER], 5, 'down')!;
    expect(q.delta).toBeCloseTo(-8.2, 9); expect(q.pValue).toBeCloseTo(0.994696, 5); expect(q.verdict).toBe('worse');
  });
  it('fewer than two readings either side is not compared; under three is untestable, not failed', () => {
    expect(numberProof([42, 41, 35, 47], 3, 'up')).toBeNull();
    expect(numberProof([42, 41, 35, 47], 1, 'up')).toBeNull();
    const t = numberProof([42, 41, 46, 49], 2, 'up')!;               // two a side: compared, but a test needs three
    expect(t.pValue).toBeNull(); expect(t.significant).toBeNull(); expect(t.verdict).toBe('better');
    const u = numberProof([42, 41, 35, 46, 49], 3, 'up')!;           // three before, two after: still untestable
    expect(u.pValue).toBeNull(); expect(u.verdict).toBe('better');
  });
});

describe('the weekly number, trended (FC-117) — eight weeks 42 41 35 47 44 46 49 52', () => {
  const pts = [42, 41, 35, 47, 44, 46, 49, 52].map((value, i) => ({ at: day(i), value }));
  const t = numberTrend(pts, 'up', 'ppm')!;
  it('Kendall S 18, Sen 1.6333 a week, p 0.0354 (normal approximation), 4 runs about the median 45', () => {
    expect(t.n).toBe(8); expect(t.slope).toBeCloseTo(1.6333, 3); expect(t.p).toBeCloseTo(0.0354, 3); expect(t.runs?.runs).toBe(4);
    expect(t.text).toBe('Trend over 8 readings: rising about 1.6 ppm a week (Sen), Mann–Kendall p 0.04 — the right way for this measure. Runs about the median: 4 — too few readings for the runs to say a pattern.');
    expect(t.short).toBe('rising about 1.6 ppm a week — the right way');
    expect(numberTrend(pts, 'down', 'ppm')!.short).toBe('rising about 1.6 ppm a week — the wrong way');
  });
  it('under eight readings it says nothing', () => {
    expect(TREND_FROM).toBe(8);
    expect(numberTrend(pts.slice(0, 7), 'up')).toBeNull();
  });
  it('a flat series is “no steady trend”', () => {
    const flat = [2, 2.1, 2, 1.9, 2.1, 2, 2, 1.9, 2.1, 2].map((value, i) => ({ at: day(i), value }));
    expect(numberTrend(flat, 'down')!.short).toBe('no steady trend');
  });
});

describe('what a project’s number holds, in a line (the method page’s row)', () => {
  it('nothing set, nothing recorded, a few readings, and the trend from eight', () => {
    expect(numbersSays([], [])).toBe('No measure set yet — the project’s owner sets what the team’s number is on its Setup.');
    expect(numbersSays([m()], [])).toBe('Rate: no reading recorded yet.');
    expect(numbersSays([m()], [rd('L1', 0, 42)])).toBe('Rate: 1 reading, latest 42 ppm; a trend needs 8 readings of one line.');
    const eight = [42, 41, 35, 47, 44, 46, 49, 52].map((v, i) => rd('L1', i, v));
    expect(numbersSays([m()], eight)).toBe('Rate: 8 readings, latest 52 ppm; rising about 1.6 ppm a week — the right way.');
  });
  it('the lead measure, the line with most readings, a deleted reading not counted, other measures left alone', () => {
    const eight = [42, 41, 35, 47, 44, 46, 49, 52].map((v, i) => rd('L1', i, v));
    const other = [rd('L2', 0, 10), rd('L2', 1, 11), rd('L1', 2, 99, 'm2')];
    const gone = { ...rd('L1', 9, 1), deletedAt: 5 };
    expect(numbersSays([m({ sort: 1 }), m({ id: 'm2', name: 'Waste', unit: '%', direction: 'down', sort: 0 })], [...eight, ...other, gone])).toBe('Waste: 1 reading, latest 99 %; a trend needs 8 readings of one line.');
    expect(numbersSays([m()], [...eight, ...other, gone])).toBe('Rate: 10 readings on 2 lines, latest 52 ppm; rising about 1.6 ppm a week — the right way.');
  });
});
