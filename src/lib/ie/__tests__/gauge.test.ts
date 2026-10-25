/* The gauge studies (FC-119 Type 1, FC-120 bias, linearity, stability) — every expected number is NumPy's or SciPy's, printed by
 * scripts/knowledge/cases-w3c.py (the record's worked cases: knowledge/methods/msa/type1-gauge.md and bias-linearity-stability.md). */
import { describe, it, expect } from 'vitest';
import { leastCount, rangeStudy, stability, toleranceOf, type1 } from '../gauge';

const GOOD = [500.09, 500.14, 500.17, 500.04, 500.18, 500.14, 500.18, 500.14, 500.21, 500.04, 500.26, 500.22, 500.07, 500.17, 500.16, 499.98, 500.17, 500.07, 500.1, 500.07, 500.09, 500.13, 500.13, 500.0, 500.1, 500.01, 500.02, 500.09, 500.19, 500.17, 500.07, 500.06, 500.05, 500.13, 500.19, 500.12, 500.18, 500.15, 500.24, 499.96, 499.95, 500.1, 500.17, 500.09, 500.15, 500.03, 500.02, 500.06, 500.19, 500.18];
const WORN = [501.9, 501.7, 500.9, 501.6, 500.2, 498.9, 502.7, 501.4, 498.6, 499.7, 500.2, 501.3, 502.4, 501.2, 500.4, 501.4, 500.7, 501.1, 500.2, 499.6, 502.3, 500.5, 501.0, 500.2, 500.3, 500.5, 501.6, 502.2, 501.5, 500.3];
const READS: Record<number, number[]> = {
  0: [-0.22, -0.28, -0.02, -0.29, -0.36, -0.07, -0.05, -0.26, -0.22, 0.18], 20: [19.81, 19.87, 20.07, 20.02, 20.12, 20.03, 19.88, 19.94, 19.86, 20.03],
  40: [40.07, 39.86, 40.07, 39.91, 40.02, 39.96, 40.04, 39.7, 40.06, 39.84], 60: [60.23, 59.95, 60.03, 60.0, 60.12, 60.22, 60.12, 60.09, 60.11, 60.08],
  80: [80.18, 80.08, 80.15, 80.35, 80.3, 79.97, 80.14, 80.19, 80.11, 80.09] };
const DAILY = [60.09, 60.14, 60.08, 60.08, 60.14, 60.14, 60.12, 59.95, 60.03, 60.06, 60.16, 60.09, 60.05, 60.13, 60.12, 59.98, 60.14, 60.05, 60.41, 60.44, 60.29, 60.51, 60.29, 60.48, 60.45];

describe('Type 1: a bench scale on a 500.0 g reference, tolerance 10 g (the record’s case)', () => {
  const t = type1(GOOD, 500, 10)!;
  it('mean, spread, bias and its interval', () => {
    expect(t.n).toBe(50); expect(t.mean).toBeCloseTo(500.1124, 9); expect(t.s).toBeCloseTo(0.0734168973, 9); expect(t.bias).toBeCloseTo(0.1124, 9);
    expect(t.biasLo).toBeCloseTo(0.0915351486, 7); expect(t.biasHi).toBeCloseTo(0.1332648514, 7);
  });
  it('Cg 4.54 and Cgk 4.03; 6s uses 4.4% of the tolerance', () => {
    expect(t.cg).toBeCloseTo(4.5402808532, 6); expect(t.cgk).toBeCloseTo(4.0299532853, 6); expect(t.share6s).toBeCloseTo(0.0440501384, 8);
  });
  it('the bias is real (t 10.83, p 1.4e-14) but small against the tolerance — the scale is fit', () => {
    expect(t.t).toBeCloseTo(10.8256825166, 6); expect(t.p).toBeCloseTo(1.354e-14, 3 + 14); expect(t.real).toBe(true); expect(t.verdict).toBe('fit');
  });
  it('the readings step by 0.01 g: 0.1% of the tolerance, well under 5%', () => {
    expect(t.step).toBeCloseTo(0.01, 9); expect(t.stepShare).toBeCloseTo(0.001, 9); expect(t.stepOk).toBe(true);
  });
  it('a worn scale: Cg 0.34, Cgk 0.04, 6s uses 60% of the tolerance — not fit', () => {
    const w = type1(WORN, 500, 10)!;
    expect(w.mean).toBeCloseTo(500.8833333, 6); expect(w.s).toBeCloseTo(0.9934555969, 8); expect(w.cg).toBeCloseTo(0.3355291715, 7); expect(w.cgk).toBeCloseTo(0.0391450700, 7);
    expect(w.share6s).toBeCloseTo(0.5960733582, 8); expect(w.p).toBeCloseTo(3.6396068e-5, 9); expect(w.verdict).toBe('notFit');
  });
  it('repeats well but reads off: Cg passes, Cgk does not — “biased”', () => {
    const b = type1(GOOD.map(x => x + 0.9), 500, 10)!;   // bias 1.0124 g against a half-slice of 1.0 g
    expect(b.cg).toBeCloseTo(4.5402808532, 6); expect(b.cgk).toBeLessThan(1.33 * 0 + 1.33 * 0 + b.cg!); expect(b.verdict).toBe('biased');
    expect(b.cgk).toBeCloseTo((1 - 1.0124) / (3 * 0.0734168973), 4);
  });
  it('the slice and the need are the agreed ones', () => {
    const w = type1(GOOD, 500, 10, { slice: 0.3, need: 1.0 })!;
    expect(w.cg).toBeCloseTo(0.3 * 10 / (6 * 0.0734168973), 6); expect(w.cgk).toBeCloseTo((1.5 - 0.1124) / (3 * 0.0734168973), 6);
  });
  it('every reading the same: no spread, no index', () => {
    const z = type1([500, 500, 500, 500], 500, 10)!; expect(z.cg).toBeUndefined(); expect(z.verdict).toBe('noSpread'); expect(z.real).toBe(false);
    expect(type1([500.1, 500.1, 500.1], 500, 10)!.real).toBe(true);
  });
  it('too few or no tolerance: nothing', () => {
    expect(type1([1, 2], 1, 10)).toBeUndefined(); expect(type1(GOOD, 500, 0)).toBeUndefined();
  });
});

describe('the tolerance of what the gauge judges', () => {
  it('both limits: the difference; one limit and a target: twice the distance; one limit alone: none', () => {
    expect(toleranceOf(495, 505)).toEqual({ T: 10, how: 'both' });
    expect(toleranceOf(undefined, 2.0, 0.5)).toEqual({ T: 3, how: 'one' });
    expect(toleranceOf(400, undefined, 405)).toEqual({ T: 10, how: 'one' });
    expect(toleranceOf(undefined, 2.0)).toBeUndefined(); expect(toleranceOf(505, 495)).toBeUndefined();
  });
  it('the least count', () => {
    expect(leastCount([1.2, 1.5, 1.3])).toBeCloseTo(0.1, 9); expect(leastCount([5, 5])).toBeUndefined(); expect(leastCount([0, 10, 20])).toBe(10);
  });
});

describe('bias and linearity: a probe at five references (the record’s case, NumPy’s line)', () => {
  const rs = Object.entries(READS).flatMap(([r, v]) => v.map(value => ({ ref: Number(r), value })));
  const f = rangeStudy(rs, 0.95, 75);
  it('the bias at each reference, and which are real (t beyond 2.26)', () => {
    expect(f.refs.map(r => +r.bias.toFixed(3))).toEqual([-0.159, -0.037, -0.047, 0.095, 0.156]);
    expect(f.refs.map(r => r.real)).toEqual([true, false, false, true, true]);
    expect(f.refs[0].t).toBeCloseTo(-3.0543681486, 6); expect(f.refs[0].p).toBeCloseTo(0.0136957910, 7); expect(f.refs[4].t).toBeCloseTo(4.5192612772, 6); expect(f.refs[4].p).toBeCloseTo(0.0014483281, 7);
    expect(f.refs[0].s).toBeCloseTo(0.1646174015, 8);
  });
  it('the line of bias on reference: −0.1508 + 0.00381 × reference, slope p 0.0074, 95% 0.00194 to 0.00568', () => {
    const l = f.line!;
    expect(l.intercept).toBeCloseTo(-0.1508, 9); expect(l.slope).toBeCloseTo(0.00381, 9); expect(l.pR).toBeCloseTo(0.0074452146, 7); expect(l.r2).toBeCloseTo(0.9334032073, 8);
    expect(l.slopeLo).toBeCloseTo(0.0019401040, 7); expect(l.slopeHi).toBeCloseTo(0.0056798960, 7);
    expect(f.sloped).toBe(true); expect(f.constant).toBe(false); expect(f.anyReal).toBe(true);
  });
  it('at a 75 °C limit the line gives +0.135 °C: a reading of 75.0 means product at 74.87', () => {
    expect(f.at!.bias).toBeCloseTo(0.13495, 9); expect(f.at!.trueValue).toBeCloseTo(74.86505, 9); expect(f.at!.inside).toBe(true);
  });
  it('the worst bias is the one at 0 °C (−0.159, against +0.156 at 80)', () => { expect(f.worst!.ref).toBe(0); });
  it('beyond the references the line is not read as a guess is: inside false', () => { expect(rangeStudy(rs, 0.95, 120).at!.inside).toBe(false); });
  it('a constant bias: real at every reference, no slope — one offset fixes it', () => {
    const c = rangeStudy([0, 25, 50, 75, 100].flatMap((ref, i) => [0.31, 0.29, 0.30, 0.32, 0.28, 0.30].map((e, k) => ({ ref, value: ref + e + (i % 2 ? 0.001 * k : -0.001 * k) }))));
    expect(c.anyReal).toBe(true); expect(c.sloped).toBe(false); expect(c.constant).toBe(true);
  });
  it('a reference with fewer than five readings is left out, said; under four references no line', () => {
    const g = rangeStudy([...rs.filter(r => r.ref !== 40), { ref: 40, value: 40.1 }, { ref: 40, value: 40.0 }]);
    expect(g.left).toEqual([{ ref: 40, n: 2 }]); expect(g.refs).toHaveLength(4); expect(g.line).toBeDefined();
    expect(rangeStudy(rs.filter(r => r.ref < 60)).line).toBeUndefined();
  });
});

describe('stability: 25 daily checks of the 60 °C reference, limits from the first 18 (NumPy: 59.9046 to 60.2676)', () => {
  const s = stability(DAILY, 18, 60)!;
  it('the limits', () => {
    expect(s.centre).toBeCloseTo(60.0861111, 6); expect(s.mrBar).toBeCloseTo(0.0682352941, 8); expect(s.lcl).toBeCloseTo(59.9046052, 6); expect(s.ucl).toBeCloseTo(60.2676170, 6); expect(s.bias).toBeCloseTo(0.0861111, 6);
  });
  it('days 19 to 25 are beyond; the first signal after the baseline is day 19; the baseline itself was steady', () => {
    expect(s.signals.filter(x => x.rule === 'beyond').map(x => x.points[0])).toEqual([19, 20, 21, 22, 23, 24, 25]);
    expect(s.first).toBe(19); expect(s.inBaseline).toBeUndefined();
  });
  it('a rising trend over the 25: Kendall’s τ 0.384 (SciPy p 0.0081; 0.0087 with the continuity correction), Sen’s slope 0.0124 a check', () => { expect(s.trend!.tau).toBeCloseTo(0.3837681, 6); expect(s.trend!.p).toBeCloseTo(0.0086506, 4); expect(s.trend!.slope).toBeCloseTo(0.012426470588, 9); });
  it('steady all the way: no signal', () => {
    const t = stability(DAILY.slice(0, 18), 18, 60)!; expect(t.first).toBeUndefined();
  });
  it('limits from a baseline that was not steady say so', () => {
    expect(stability(DAILY, 25, 60)!.first).toBeUndefined();
  });
  it('under eight readings: none', () => { expect(stability(DAILY.slice(0, 7))).toBeUndefined(); });
});
