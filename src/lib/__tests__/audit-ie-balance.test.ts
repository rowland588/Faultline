/* AUDIT (16 Oct) — the time study and the Yamazumi, lib/ie/balance, against
 * an independent reference: Student's t by numeric integration, cycles
 * needed, basic and standard time, takt, fewest, efficiency, the suggestion. */
import { describe, it, expect } from 'vitest';
import { element, balance, suggest, cyclesNeeded, t95, MIN_CYCLES, type BalanceFigures } from '../ie/balance';
import type { BalanceStep } from '../study';
import { tQuantile975, sd as refSd, mean as refMean, rng } from './audit-ie-ref';

const laps = (xs: number[]) => xs.map((sec, i) => ({ id: `l${i}`, sec, at: i }));
const typed = (ts: number[], who: (i: number) => string = () => 'Op 1'): BalanceStep[] => ts.map((t, i) => ({ id: `e${i}`, order: i, name: `E${i}`, who: who(i), typedSec: t }));

describe('AUDIT balance — Student’s t', () => {
  it('the table rows agree with the integrated t quantile to 3 dp (df 1 … 30, 40, 60, 120)', () => {
    for (const df of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 40, 60, 120]) {
      const want = tQuantile975(df);
      expect(Math.abs(t95(df) - want)).toBeLessThan(0.0006);
    }
    /* the three the audit was asked to confirm */
    expect(t95(4)).toBe(2.776); expect(t95(14)).toBe(2.145); expect(t95(29)).toBe(2.045);
    expect(tQuantile975(4)).toBeCloseTo(2.776, 3);
    expect(tQuantile975(14)).toBeCloseTo(2.145, 3);
    expect(tQuantile975(29)).toBeCloseTo(2.045, 3);
  });
  it('between rows the app takes the lower row’s (larger) t — never a t smaller than the true one, up to 120 df', () => {
    for (let df = 1; df <= 120; df++) {
      const t = t95(df), want = tQuantile975(df);
      expect(t).toBeGreaterThanOrEqual(want - 0.0006);   // never optimistic
    }
  });
  it('FINDING (trivial): past 120 df it takes the normal’s 1.96, under the true t (1.980 at 121 df, 1.962 at 1,000) — optimistic by under 1%', () => {
    expect(t95(121)).toBe(1.96);
    expect(tQuantile975(121)).toBeCloseTo(1.9796, 3);
    expect(t95(121)).toBeLessThan(tQuantile975(121));
  });
});

describe('AUDIT balance — cycles needed and the standard time', () => {
  it('the worked numbers: 15 (t = 2), 17 from 15 laps, 16 from 30; laps 10,11,9,10,10 → 16 where t = 2 says 8', () => {
    expect(((2 * 0.04) / 0.021) ** 2).toBeCloseTo(14.51, 2);
    expect(cyclesNeeded(0.42, 0.04)).toBe(15);
    expect(((2.145 * 0.04) / 0.021) ** 2).toBeCloseTo(16.69, 2);
    expect(cyclesNeeded(0.42, 0.04, 15)).toBe(17);
    expect(cyclesNeeded(0.42, 0.04, 30)).toBe(16);
    const s = refSd([10, 11, 9, 10, 10]);
    expect(s).toBeCloseTo(Math.SQRT1_2, 9);
    expect(((2.776 * s) / 0.5) ** 2).toBeCloseTo(15.41, 2);
    expect(cyclesNeeded(10, s, 5)).toBe(16);
    expect(cyclesNeeded(10, s)).toBe(8);
  });
  it('n = ⌈(t·s ÷ 0.05·x̄)²⌉ exactly, t at n − 1 df; monotone in s; never below the floor of five on an element', () => {
    const r = rng(7);
    for (let k = 0; k < 200; k++) {
      const m = 1 + r() * 100, s = r() * m * 0.3, n = 2 + Math.floor(r() * 40);
      const want = Math.ceil(((t95(n - 1) * s) / (0.05 * m)) ** 2 - 1e-9);
      expect(cyclesNeeded(m, s, n)).toBe(want);
      expect(cyclesNeeded(m, s * 1.5, n)).toBeGreaterThanOrEqual(cyclesNeeded(m, s, n));
    }
    expect(cyclesNeeded(10, 0, 5) === 0).toBe(true);   // Math.ceil(0 − 1e-9) is −0: harmless, String(−0) is "0"
    expect(Object.is(cyclesNeeded(10, 0, 5), -0)).toBe(true);
    expect(cyclesNeeded(0, 1, 5)).toBe(0);
    const e = element({ id: 'e', order: 0, name: 'x', who: 'Op 1', laps: laps([10, 10, 10, 10]) });
    expect(e.needed).toBe(MIN_CYCLES);
  });
  it('basic = observed × rating ÷ 100; standard = basic × (1 + allowance): 0.42 × 1.10 × 1.14 = 0.527', () => {
    expect(0.42 * 1.1 * 1.14).toBeCloseTo(0.52668, 5);
    const r = rng(11);
    for (let k = 0; k < 100; k++) {
      const xs = Array.from({ length: 3 + Math.floor(r() * 10) }, () => 5 + r() * 60);
      const rating = [75, 90, 100, 110, 125][Math.floor(r() * 5)]!, allow = Math.round(r() * 30) / 100;
      const e = element({ id: 'e', order: 0, name: 'x', who: 'Op 1', rating, laps: laps(xs) }, allow);
      const m = refMean(xs);
      expect(e.observed).toBeCloseTo(m, 9);
      expect(e.basic).toBeCloseTo((m * rating) / 100, 9);
      expect(e.standard).toBeCloseTo(((m * rating) / 100) * (1 + allow), 9);
      /* additive allowances, not compounded: 12% + 2% = ×1.14, not ×1.12×1.02 */
      expect(e.standard).not.toBeCloseTo(((m * rating) / 100) * 1.12 * 1.02, 12);
    }
  });
});

describe('AUDIT balance — the Yamazumi’s figures', () => {
  it('54 s at 12 s: fewest 5, efficiency 0.90; the delay (0.10) and smoothness (√10 = 3.16) are NOT among the figures', () => {
    const f = balance(typed([12, 11, 11, 10, 10], i => `Op ${i + 1}`), { taktSec: 12 });
    expect(f.fewest).toBe(5);
    expect(f.efficiency).toBeCloseTo(0.9, 9);
    const smooth = Math.sqrt(f.people.reduce((t, p) => t + (12 - p.work) ** 2, 0));
    expect(smooth).toBeCloseTo(Math.sqrt(10), 9);
    expect('delay' in f).toBe(false);
    expect('smoothness' in f).toBe(false);
  });
  it('random balances: fewest = ⌈Σ ÷ takt⌉; efficiency = Σ ÷ (people × longest) ≤ 1; the constraint is the longest stack', () => {
    const r = rng(3);
    for (let k = 0; k < 100; k++) {
      const n = 2 + Math.floor(r() * 12), people = 1 + Math.floor(r() * 5), takt = 5 + r() * 30;
      const steps = typed(Array.from({ length: n }, () => 1 + r() * 15), i => `Op ${(i % people) + 1}`);
      const f = balance(steps, { taktSec: takt });
      const total = steps.reduce((t, s) => t + (s.typedSec ?? 0), 0);
      expect(f.total).toBeCloseTo(total, 9);
      expect(f.fewest).toBe(Math.ceil(total / takt - 1e-9));
      const longest = Math.max(...f.people.map(p => p.work));
      expect(f.efficiency).toBeCloseTo(total / (f.people.length * longest), 9);
      expect(f.efficiency!).toBeLessThanOrEqual(1 + 1e-12);
      expect(f.constraint?.work).toBeCloseTo(longest, 9);
      for (const p of f.people) { expect(p.overBy).toBeCloseTo(Math.max(0, p.work - takt), 9); expect(p.spare).toBeCloseTo(Math.max(0, takt - p.work), 9); }
    }
  });
});

/* Ranked positional weight on a CHAIN: every element's weight is its own time
 * plus all after it, so the RPW order is the chain order — the app's in-order
 * first-fit is RPW there. */
function rpwChain(ts: number[], takt: number): number[][] {
  const stacks: number[][] = [];
  for (const t of ts) {
    const cur = stacks[stacks.length - 1];
    if (cur && cur.reduce((a, b) => a + b, 0) + t <= takt + 1e-9) cur.push(t); else stacks.push([t]);
  }
  return stacks;
}

describe('AUDIT balance — the suggestion', () => {
  it('never a stack over takt unless one element alone exceeds it; stacks ≥ fewest; equals RPW on a chain', () => {
    const r = rng(5);
    for (let k = 0; k < 300; k++) {
      const n = 1 + Math.floor(r() * 14), takt = 6 + r() * 20;
      const ts = Array.from({ length: n }, () => 0.5 + r() * (r() < 0.1 ? 30 : 10));
      const f = balance(typed(ts), { taktSec: takt });
      const g = suggest(f)!;
      expect(g).toBeDefined();
      for (const st of g) {
        if (st.work > takt + 1e-9) { expect(st.ids.length).toBe(1); expect(st.work).toBeGreaterThan(takt); }
      }
      /* ⌈Σ ÷ takt⌉ is a floor on people only when no element alone is longer than takt */
      if (ts.every(t => t <= takt)) expect(g.length).toBeGreaterThanOrEqual(f.fewest!);
      expect(g.map(s => s.work)).toEqual(rpwChain(ts, takt).map(s => s.reduce((a, b) => a + b, 0)));
      expect(g.flatMap(s => s.ids)).toEqual(ts.map((_, i) => `e${i}`));   // order kept
    }
  });
  it('FINDING: BalanceStep has no precedence field (`after`), so RPW on a precedence SET cannot be run — Helgeson & Birnie’s set is placed in list order only', () => {
    /* Six elements: A 6, B 4, C 5, D 3, E 2, F 5; A→B, A→C, B→D, C→D, D→E, D→F. takt 10.
       RPW weights: A 6+4+5+3+2+5 = 25; B 4+3+2+5 = 14; C 5+3+2+5 = 15; D 10; E 2; F 5.
       RPW order: A, C, B, D, F, E → stacks at takt 10: [A(6)+B? no: A(6), then C(5) → 11 > 10 → new] — RPW fills
       A=6 (B 4 fits: 10) | C 5 + D 3 + E 2 = 10 | F 5 → 3 people, 25 ÷ 30 = 83%.
       In list order A B C D E F the app gets A+B 10 | C+D+E 10 | F 5 — the same here only because the list
       happens to be a valid topological order; a list in the order F E D C B A (as typed) would be filled
       as F+E+D 10 | C+B 9 | A 6 — ignoring that A must come first. */
    const steps: BalanceStep[] = [['A', 6], ['B', 4], ['C', 5], ['D', 3], ['E', 2], ['F', 5]].map(([n, t], i) => ({ id: String(n), order: i, name: String(n), who: 'Op 1', typedSec: t as number }));
    const f = balance(steps, { taktSec: 10 });
    expect(suggest(f)?.map(s => s.ids.join(''))).toEqual(['AB', 'CDE', 'F']);
    expect('after' in steps[0]!).toBe(false);
    const reversed = balance([...steps].reverse().map((s, i) => ({ ...s, order: i })), { taktSec: 10 });
    expect(suggest(reversed)?.map(s => s.ids.join(''))).toEqual(['FED', 'CB', 'A']);
  });
  it('an element longer than takt stands alone and is the only one over', () => {
    const f: BalanceFigures = balance(typed([3, 14, 4, 5]), { taktSec: 12 });
    expect(suggest(f)?.map(s => s.work)).toEqual([3, 14, 9]);
  });
});
