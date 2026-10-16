/* AUDIT (16 Oct) — work sampling, lib/ie/sampling, against the reference:
 * p ± z√(p(1−p)/n), N = Z²p(1−p)/E², the share whose margin is widest. */
import { describe, it, expect } from 'vitest';
import { marginOf, tapsNeeded, shares, moreNeeded, samplingReading, samplingLine, samplingRows, samplingSays, Z95, TOO_FEW_TAPS, type Tap } from '../ie/sampling';
import { rng, wilson } from './audit-ie-ref';

const tap = (i: number, who: string, activity: string): Tap => ({ id: `t${i}`, at: i * 1000, who, activity });

describe('AUDIT sampling — the formulas', () => {
  it('N = 1.96² × 0.3 × 0.7 ÷ 0.05² = 322.7 → 323; p 0.5 → 385; p 0.3, E 0.09 → 100', () => {
    expect((Z95 ** 2 * 0.21) / 0.0025).toBeCloseTo(322.69, 1);
    expect(tapsNeeded(0.3, 0.05)).toBe(323);
    expect(tapsNeeded(0.5, 0.05)).toBe(385);
    expect(tapsNeeded(0.3, 0.09)).toBe(100);
    /* the Enough table's example: 30% ±9 points from 100 taps — 223 more for ±5 */
    expect(Math.round(marginOf(0.3, 100) * 100)).toBe(9);
    expect(tapsNeeded(0.3, 0.05) - 100).toBe(223);
  });
  it('the margin shrinks as 1 ÷ √n: four times the taps, half the margin', () => {
    const r = rng(9);
    for (let k = 0; k < 100; k++) {
      const p = r(), n = 10 + Math.floor(r() * 500);
      expect(marginOf(p, 4 * n)).toBeCloseTo(marginOf(p, n) / 2, 12);
      expect(marginOf(p, n)).toBeCloseTo(1.96 * Math.sqrt((p * (1 - p)) / n), 12);
    }
    expect(marginOf(0.5, 0)).toBe(0);
  });
  it('the reading’s example: p 0.61 from 190 → ±6.9 → ±7; for ±5 it needs 366, so 176 more (TOOLKIT §9 says 175)', () => {
    expect(marginOf(116 / 190, 190)).toBeCloseTo(0.0693, 3);
    expect(tapsNeeded(116 / 190, 0.05)).toBe(366);
    expect(tapsNeeded(116 / 190, 0.05) - 190).toBe(176);
  });
});

describe('AUDIT sampling — shares from random taps', () => {
  it('shares sum to 1 across every activity tapped; each margin is the Wald margin at that share', () => {
    const r = rng(13);
    const acts = ['working', 'walking', 'waiting', 'searching', 'away', 'cleaning'];
    for (let k = 0; k < 50; k++) {
      const n = 30 + Math.floor(r() * 300);
      const taps = Array.from({ length: n }, (_, i) => tap(i, 'Op 1', acts[Math.floor(r() * acts.length)]!));
      const list = shares(taps, acts.slice(0, 5), 'Op 1');
      expect(list.reduce((t, s) => t + s.share, 0)).toBeCloseTo(1, 9);
      for (const s of list) expect(s.margin).toBeCloseTo(1.96 * Math.sqrt((s.share * (1 - s.share)) / n), 12);
      /* moreNeeded uses the biggest share — which always has the widest margin */
      const widest = Math.max(...list.map(s => s.margin));
      const big = list.reduce((m, s) => (m.share >= s.share ? m : s));
      expect(big.margin).toBeCloseTo(widest, 12);
      expect(moreNeeded(list, n, 5)).toBe(Math.max(0, tapsNeeded(big.share, 0.05) - n));
    }
  });
  it('FINDING: a share of 100% (or 0%) from 30 taps carries a Wald margin of ±0 — Wilson puts the lower bound near 89%', () => {
    const taps = Array.from({ length: 30 }, (_, i) => tap(i, 'Op 1', 'working'));
    const list = shares(taps, undefined, 'Op 1');
    expect(list[0]).toMatchObject({ activity: 'working', share: 1, margin: 0 });
    expect(samplingReading({ taps, marginPts: 5 }, 'Op 1')).toBe('Op 1: working 100% (±0) — from 30 taps; within ±5 points');
    const w = wilson(1, 30);
    expect(w.lo).toBeCloseTo(0.886, 2);
    expect(w.hi).toBe(1);
    /* and a zero share: its margin is also 0, though the Wilson upper bound is 11% */
    expect(wilson(0, 30).hi).toBeCloseTo(0.114, 2);
  });
  it('FINDING (edge): an empty activities list and a person with no taps make samplingLine reduce an empty array', () => {
    const facts = { taps: [tap(1, 'A', 'working')], who: ['A', 'B'], activities: [] as string[] };
    let threw = false;
    try { samplingLine(facts); } catch { threw = true; }
    expect(threw).toBe(true);
  });
  it('under 30 taps no share is said as a figure — the threshold is a constant, not from the margin wanted', () => {
    expect(TOO_FEW_TAPS).toBe(30);
    const a = { who: ['Op 1'], activities: ['working', 'waiting'], marginPts: 5, from: 0, to: 1, prompts: [1, 2, 3] };
    const taps = Array.from({ length: 29 }, (_, i) => tap(i, 'Op 1', i % 3 ? 'working' : 'waiting'));
    expect(samplingSays(a, taps).verdict).toBe('Too early — 29 taps');
    const rows = samplingRows(a, taps)!;
    expect(rows.rows[0]!.cells.every(c => c.share === '—')).toBe(true);
    /* at 30, the figures appear with their margins — ±18 points at p 0.33 from 30 is said, not hidden */
    const thirty = [...taps, tap(99, 'Op 1', 'working')];
    expect(samplingRows(a, thirty)!.rows[0]!.cells[1]!.margin).toBe(`±${Math.round(marginOf(10 / 30, 30) * 100)}`);
  });
});
