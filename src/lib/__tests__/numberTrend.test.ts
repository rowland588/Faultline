/* A number's trend — the runs about the median, Mann–Kendall and Sen's slope (FC-117, FC-201; scripts/knowledge/cases-w2.py). */
import { describe, it, expect } from 'vitest';
import { numberTrend } from '../measureProof';

describe('a number’s trend', () => {
  const rr = [2.1, 2.3, 1.9, 2.4, 2.2, 2.6, 2.5, 2.8, 2.7, 3.0, 2.9, 3.2];
  const at = (i: number) => new Date(Date.UTC(2026, 0, 5 + 7 * i)).toISOString().slice(0, 10);
  const pts = rr.map((value, i) => ({ at: at(i), value }));
  it('twelve weekly reject rates rising 0.1 a week — the wrong way for a measure that should fall', () => {
    const t = numberTrend(pts, 'down', '%')!;
    expect(t.n).toBe(12); expect(t.rising).toBe(true); expect(t.slope).toBeCloseTo(0.1, 3); expect(t.tau).toBeCloseTo(0.788, 2); expect(t.p).toBeLessThan(0.001);
    expect(t.tone).toBe('r'); expect(t.per).toBe('a week');
    expect(t.text).toBe('Trend over 12 readings: rising about 0.1 % a week (Sen), Mann–Kendall p < 0.001 — the wrong way for this measure. Runs about the median: 4 — no pattern (fewer than 4 would be).');
    expect(numberTrend(pts, 'up', '%')!.tone).toBe('g');
  });
  it('a flat series says no steady trend; under eight says nothing', () => {
    const flat = [2, 2.1, 2, 1.9, 2.1, 2, 2, 1.9, 2.1, 2].map((value, i) => ({ at: at(i), value }));
    const t = numberTrend(flat, 'down', '%')!;
    expect(t.text).toMatch(/^Trend over 10 readings: no steady trend found \(Mann–Kendall p 0\.\d+\)\./);
    expect(['n', 'a']).toContain(t.tone);
    expect(numberTrend(pts.slice(0, 7), 'down')).toBeNull();
  });
  it('a step is a shift by the runs even with a flat slope inside each half', () => {
    const step = [1, 1.01, 1, 1.02, 1, 1.01, 1, 1.02, 3, 3.01, 3, 3.02, 3, 3.01, 3, 3.02].map((value, i) => ({ at: at(i), value }));
    expect(numberTrend(step, 'up')!.runs).toMatchObject({ runs: 2, signal: true });
  });
});
