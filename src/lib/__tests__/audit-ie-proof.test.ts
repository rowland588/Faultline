/* AUDIT (16 Oct) — the before → after significance test: lib/proof's Welch
 * one-sided t (incomplete beta) against a Student-t CDF by numeric
 * integration; lib/measureProof's direction and verdict. */
import { describe, it, expect } from 'vitest';
import { welchOneSidedP, SIGNIFICANCE_P, defaultTargetN, studyTarget } from '../proof';
import { numberProof } from '../measureProof';
import { welchP, rng, gauss } from './audit-ie-ref';

describe('AUDIT proof — Welch’s t', () => {
  it('agrees with the integrated t distribution to 1e-6 on random normal samples (n 3 … 30 a side)', () => {
    const r = rng(2026);
    for (let k = 0; k < 60; k++) {
      const n1 = 3 + Math.floor(r() * 28), n2 = 3 + Math.floor(r() * 28);
      const before = Array.from({ length: n1 }, () => 100 + 15 * gauss(r));
      const after = Array.from({ length: n2 }, () => 100 - 10 * r() + 15 * gauss(r));
      const p = welchOneSidedP(before, after)!;
      expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1);
      expect(Math.abs(p - welchP(before, after))).toBeLessThan(1e-6);
      /* one-sided both ways sum to one */
      expect(p + welchOneSidedP(after, before)!).toBeCloseTo(1, 9);
    }
  });
  it('by hand: 10, 12, 11, 13, 12 → 8, 9, 8, 10, 9: means 11.6 and 8.8, s² 1.3 and 0.7; t = 2.8 ÷ √0.4 = 4.43, df 7.3 → p ≈ 0.0014', () => {
    const p = welchOneSidedP([10, 12, 11, 13, 12], [8, 9, 8, 10, 9])!;
    expect(p).toBeGreaterThan(0.001); expect(p).toBeLessThan(0.002);
    expect(p).toBeCloseTo(welchP([10, 12, 11, 13, 12], [8, 9, 8, 10, 9]), 7);
    expect(welchOneSidedP([1, 2], [1, 2, 3])).toBeNull();
    expect(welchOneSidedP([5, 5, 5], [4, 4, 4])).toBe(0);
    expect(welchOneSidedP([5, 5, 5], [6, 6, 6])).toBe(1);
  });
  it('the gate is one-sided p < 0.10 — a design choice, lenient on purpose; targetN 5 … 20 from the baseline, typed 3 … 50', () => {
    expect(SIGNIFICANCE_P).toBe(0.1);
    expect([defaultTargetN(2), defaultTargetN(12), defaultTargetN(40)]).toEqual([5, 12, 20]);
    expect([studyTarget('1', 7), studyTarget('99', 7), studyTarget('', 7), studyTarget('12', 7)]).toEqual([3, 50, 7, 12]);
  });
});

describe('AUDIT measureProof — direction decides the arithmetic and the tail', () => {
  it('up is good: delta = after − before, p tests after > before; down is good: the reverse; flat under 1.5%', () => {
    const before = [100, 102, 98, 101, 99], up = [110, 112, 108, 111, 109], down = [90, 92, 88, 91, 89];
    const pu = numberProof([...before, ...up], 5, 'up')!;
    expect(pu.delta).toBeCloseTo(10, 9); expect(pu.changePct).toBeCloseTo(10, 9);
    expect(pu.pValue).toBeCloseTo(welchP(up, before), 7);
    expect(pu.verdict).toBe('proven');
    const pd = numberProof([...before, ...down], 5, 'down')!;
    expect(pd.delta).toBeCloseTo(10, 9);
    expect(pd.pValue).toBeCloseTo(welchP(before, down), 7);
    expect(pd.verdict).toBe('proven');
    /* the wrong way round reads as worse, as loudly */
    expect(numberProof([...before, ...down], 5, 'up')!.verdict).toBe('worse');
    expect(numberProof([...before, ...up], 5, 'down')!.verdict).toBe('worse');
    expect(numberProof([100, 100, 100, 101, 101, 101], 3, 'up')!.verdict).toBe('flat');
    /* two a side: a figure but untestable → "better", never "proven" */
    const two = numberProof([100, 100, 120, 120], 2, 'up')!;
    expect(two.pValue).toBeNull(); expect(two.verdict).toBe('better');
    expect(numberProof([100, 120, 120], 1, 'up')).toBeNull();
    expect(numberProof([0, 0, 1, 1], 2, 'up')).toBeNull();     // no percentage against zero
  });
});
