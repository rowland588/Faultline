/* FC-045 utilisation and variability — Kingman's VUT proved on cases that are not its own output
 * (scripts/knowledge/cases-toc.py: the closed M/M/1 form, Erlang C for two machines, a Lindley-recursion simulation of G/G/1):
 *   M/M/1 is exact: u = 0.5, 0.85, 0.95 at te = 2 min wait 2, 11.333, 38 minutes (u ÷ (1 − u) = 1, 5.667, 19 process times);
 *   two machines at 85% (te 2): Sakasegawa 5.2675 min against Erlang C's exact 5.2072 — 1.2% off;
 *   G/G/1 against 400,000 simulated jobs: u 0.85 c 0.9 & 1.5 → Kingman 17.340 vs 17.604 simulated (−1.5%); u 0.92 → −6.0%;
 *   the wrapper (te 0.6, u 92%, c_a 0.9, c_e 1.5): wait 10.557 min = 17.6 process times, 16.19 units queued, c_d 1.4244;
 *   with stops in: t0 0.5, A 90%, m_r 10, c_r 1, c0 0.2 → t_e 0.5556, c_e² 3.64. */
import { describe, expect, it } from 'vitest';
import { cvClass, effectiveFromStops, utilisation, waitingTime } from '../queue';

const r = (n: number | undefined, d = 4) => Math.round((n ?? 0) * 10 ** d) / 10 ** d;
const at = (u: number, te: number, ca: number, ce: number, m = 1) => waitingTime({ perHour: (u * m * 60) / te, te, machines: m, ca, ce });

describe('Kingman for one machine', () => {
  it('is exact for the M/M/1 queue: u ÷ (1 − u) process times', () => {
    expect(r(at(0.5, 2, 1, 1)?.wait)).toBe(2);
    expect(r(at(0.85, 2, 1, 1)?.wait)).toBe(11.3333);
    expect(r(at(0.95, 2, 1, 1)?.wait)).toBe(38);
    expect([r(at(0.5, 2, 1, 1)?.waitInTe, 3), r(at(0.85, 2, 1, 1)?.waitInTe, 3), r(at(0.95, 2, 1, 1)?.waitInTe, 3)]).toEqual([1, 5.667, 19]);
  });
  it('the wrapper: variability × utilisation × time, the queue by Little’s law, what it passes on', () => {
    const w = waitingTime({ perHour: 92, te: 0.6, machines: 1, ca: 0.9, ce: 1.5 });
    expect(r(w?.u, 4)).toBe(0.92);
    expect([r(w?.v, 4), r(w?.ut, 4)]).toEqual([1.53, 11.5]);
    expect([r(w?.wait), r(w?.through), r(w?.waitInTe, 2)]).toEqual([10.557, 11.157, 17.6]);
    expect(r(w?.queue, 2)).toBe(16.19);
    expect(r(w?.cd, 4)).toBe(1.4244);
  });
  it('lower utilisation and lower variability, as the cases say: 85% → 5.202 min; halving c_e → 4.735 min', () => {
    expect(r(at(0.85, 0.6, 0.9, 1.5)?.wait, 3)).toBe(5.202);
    expect(r(waitingTime({ perHour: 92, te: 0.6, machines: 1, ca: 0.9, ce: 0.75 })?.wait, 3)).toBe(4.735);
  });
  it('against a simulation of G/G/1: within a few per cent below 90%, understating above it', () => {
    const sims: [number, number, number, number][] = [[0.85, 1, 1, 11.585], [0.85, 0.9, 1.5, 17.604], [0.7, 1, 0.5, 2.89], [0.92, 0.9, 1.5, 37.43]];
    for (const [u, ca, ce, sim] of sims) {
      const k = at(u, 2, ca, ce)?.wait as number;
      expect(Math.abs(k - sim) / sim, `u ${u}`).toBeLessThan(0.07);
      if (u > 0.9) expect(k).toBeLessThan(sim);
    }
  });
});

describe('Sakasegawa for several machines', () => {
  it('two machines at 85%: 5.2675 min — within 1.2% of the exact Erlang C wait, 5.2072', () => {
    const w = at(0.85, 2, 1, 1, 2);
    expect(r(w?.wait)).toBe(5.2675);
    expect(Math.abs((w?.wait as number) - 5.2072) / 5.2072).toBeLessThan(0.013);
    expect(w?.cd).toBeUndefined();
  });
  it('one machine of the one is the same as m = 1', () => {
    expect(r(at(0.7, 2, 1.2, 0.8, 1)?.wait)).toBe(r(((1.2 ** 2 + 0.8 ** 2) / 2) * (0.7 / 0.3) * 2));
  });
});

describe('effective process time with stops in', () => {
  it('t_e = t0 ÷ A and c_e² = c0² + (1 + c_r²) A (1 − A) m_r ÷ t0', () => {
    const e = effectiveFromStops(0.5, 0.2, 0.9, 10, 1);
    expect(r(e?.te)).toBe(0.5556);
    expect(r((e?.ce ?? 0) ** 2, 4)).toBe(3.64);
    expect(r(e?.ce, 4)).toBe(1.9079);
  });
  it('long infrequent stops make far more variability than the same minutes in short frequent ones', () => {
    const long = effectiveFromStops(0.5, 0.2, 0.9, 10, 1) as { ce: number };
    const short = effectiveFromStops(0.5, 0.2, 0.9, 1, 1) as { ce: number };
    expect(long.ce).toBeGreaterThan(2 * short.ce);
  });
  it('no stops: the machine’s own cycle and variability', () => {
    const e = effectiveFromStops(0.5, 0.2, 1, 10, 1);
    expect([e?.te, e?.ce]).toEqual([0.5, 0.2]);
  });
});

describe('what it refuses and the classes', () => {
  it('a station asked for all of its time or more has no steady queue', () => {
    expect(waitingTime({ perHour: 120, te: 0.6, machines: 1, ca: 1, ce: 1 })).toBeUndefined();
    expect(waitingTime({ perHour: 100, te: 0.6, machines: 1, ca: 1, ce: 1 })).toBeUndefined();   // u = 1 exactly
    expect(r(utilisation(120, 0.6, 2))).toBe(0.6);
  });
  it('a figure that cannot be used gives nothing', () => {
    expect(waitingTime({ perHour: 0, te: 0.6, machines: 1, ca: 1, ce: 1 })).toBeUndefined();
    expect(waitingTime({ perHour: 50, te: 0.6, machines: 0, ca: 1, ce: 1 })).toBeUndefined();
    expect(waitingTime({ perHour: 50, te: 0.6, machines: 1, ca: -1, ce: 1 })).toBeUndefined();
    expect(effectiveFromStops(0.5, 0.2, 0, 10, 1)).toBeUndefined();
    expect(effectiveFromStops(0.5, 0.2, 1.2, 10, 1)).toBeUndefined();
  });
  it('the textbook’s classes: low under 0.75, moderate to 1.33, high above', () => {
    expect([0, 0.74, 0.75, 1, 1.33, 1.34, 2].map(cvClass)).toEqual(['low', 'low', 'moderate', 'moderate', 'moderate', 'high', 'high']);
  });
});
