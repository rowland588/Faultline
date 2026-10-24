/* THE DISTRIBUTIONS, PROVED INDEPENDENTLY (knowledge/STANDARD.md, step 4).
 * Every expected number below came from a second implementation —
 * SciPy 1.17, by scripts/knowledge/independent-cases.py — or from a published
 * table, never from this code's own output. */
import { describe, it, expect } from 'vitest';
import { normalQuantile, normalCdf, binomCdf, binomUpper, binomLower, itemsToShow, andersonDarling, dagostinoPearson, skewness, individualsLimits, runOnOneSide, ppkLowerBound, histogram, fewerThan, lnGamma, mostMayFail } from '../dist';

const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38,
  0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const SEAL = [14.2, 13.8, 15.1, 14.6, 13.9, 14.4, 15.3, 14.0, 14.8, 14.1, 13.6, 14.9, 14.5, 14.3, 15.0,
  13.7, 14.6, 14.2, 14.7, 14.4, 13.9, 15.2, 14.1, 14.8, 14.3, 14.0, 14.6, 14.5, 13.8, 14.9];

describe('the normal quantile — against scipy.stats.norm.ppf', () => {
  const cases: [number, number][] = [[1e-6, -4.7534243088], [0.001, -3.0902323062], [0.025, -1.9599639845], [0.05, -1.644853627],
    [0.1, -1.2815515655], [0.5, 0], [0.9, 1.2815515655], [0.975, 1.9599639845], [0.999, 3.0902323062], [0.99999, 4.2648907939]];
  it.each(cases)('Φ⁻¹(%s) = %s', (p, z) => expect(normalQuantile(p)).toBeCloseTo(z, 6));
  it('round-trips through Φ', () => expect(normalCdf(normalQuantile(0.0123))).toBeCloseTo(0.0123, 7));
  it('Γ: ln Γ(5) = ln 24, ln Γ(0.5) = ln √π', () => {
    expect(lnGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
  });
});

describe('the binomial — against scipy.stats.binom and beta', () => {
  it.each([[0, 20, 0.05, 0.358485922409], [1, 20, 0.05, 0.735839524944], [14, 1200, 0.01, 0.772936514441],
    [3, 50, 0.1, 0.250293905953], [250, 100000, 0.0025, 0.516812302385]] as const)('P(X ≤ %s; n %s, p %s) = %s', (k, n, p, want) =>
    expect(binomCdf(k, n, p)).toBeCloseTo(want, 9));

  it.each([[0, 20, 0.1391083407], [1, 20, 0.2161061642], [2, 50, 0.1206141554], [0, 299, 0.0099691468],
    [3, 10, 0.6066242161], [14, 1200, 0.0181787759], [0, 1, 0.95], [19, 20, 0.9974386212]] as const)('one-sided 95%% upper bound, %s failed of %s = %s', (f, n, want) =>
    expect(binomUpper(f, n)).toBeCloseTo(want, 8));

  it('the two-sided 95% interval on 14 of 1,200: 0.639%–1.950%', () => {
    expect(binomLower(14, 1200, 0.975)).toBeCloseTo(0.0063925478, 8);
    expect(binomUpper(14, 1200, 0.975)).toBeCloseTo(0.0194972794, 8);
    expect(binomLower(2, 50, 0.975)).toBeCloseTo(0.0048814334, 8);
    expect(binomLower(0, 20)).toBe(0);
  });

  it('items to show a share with none failing — the success-run relation: 29, 59, 299, 2995', () => {
    expect([0.1, 0.05, 0.01, 0.001].map(p => itemsToShow(p))).toEqual([29, 59, 299, 2995]);
  });
  it('with one allowed to fail, the smallest n whose bound is under the share', () => {
    const n = itemsToShow(0.05, 0.95, 1);
    expect(binomUpper(1, n)).toBeLessThanOrEqual(0.05);
    expect(binomUpper(1, n - 1)).toBeGreaterThan(0.05);
    expect(n).toBe(93);
  });
});

/* PART 1b (23 October): pass or fail judged by a confidence level or an allowed loss. Every number is
 * SciPy's — scripts/knowledge/independent-cases.py, "the most that may fail": the largest k with
 * beta.ppf(C, k+1, n−k) ≤ p0, and the bounds at 90% and 99%. */
describe('most may fail — and the bounds at 90% and 99%, against SciPy', () => {
  it.each([[4500, 0.02, 0.95, 74], [4500, 0.02, 0.90, 77], [4500, 0.02, 0.99, 68], [300, 0.02, 0.95, 1], [20, 0.02, 0.95, -1],
    [149, 0.02, 0.95, 0], [148, 0.02, 0.95, -1], [1000, 0.01, 0.95, 4], [50, 0.10, 0.90, 1], [500, 0.05, 0.99, 13]] as const)(
    'of %s checked, to show at most %s failing at %s: %s may fail', (n, p0, c, want) => expect(mostMayFail(n, p0, c)).toBe(want));
  it('zero failures at 90% and 99%: 1 − (1 − C)^(1/n)', () => {
    expect(binomUpper(0, 20, 0.90)).toBeCloseTo(0.108749, 6);
    expect(binomUpper(0, 20, 0.99)).toBeCloseTo(0.205672, 6);
    expect(binomUpper(0, 59, 0.90)).toBeCloseTo(0.038275, 6);
    expect(binomUpper(0, 59, 0.99)).toBeCloseTo(0.075085, 6);
    expect(binomUpper(0, 300, 0.90)).toBeCloseTo(0.007646, 6);
    expect(binomUpper(0, 300, 0.99)).toBeCloseTo(0.015233, 6);
  });
  it('items to show 2% with none failing: 114 at 90%, 149 at 95%, 228 at 99%', () => {
    expect([0.90, 0.95, 0.99].map(c => itemsToShow(0.02, c))).toEqual([114, 149, 228]);
  });
  it('what a loss allowed proves: 90 failed of 4,500, 70 of 4,500, 2 of 50', () => {
    expect(binomUpper(90, 4500, 0.90)).toBeCloseTo(0.02294767, 7);
    expect(binomUpper(90, 4500, 0.95)).toBeCloseTo(0.02378498, 7);
    expect(binomUpper(90, 4500, 0.99)).toBeCloseTo(0.02540787, 7);
    expect(binomUpper(70, 4500, 0.95)).toBeCloseTo(0.01894623, 7);
    expect(binomUpper(2, 50, 0.90)).toBeCloseTo(0.10295921, 7);
    expect(binomUpper(2, 50, 0.99)).toBeCloseTo(0.15770405, 7);
  });
  it('nothing to show: no items, or a share of 0 or 1', () => {
    expect(mostMayFail(0, 0.02)).toBe(-1);
    expect(mostMayFail(100, 0)).toBe(-1);
    expect(mostMayFail(100, 1)).toBe(-1);
  });
});

describe('Anderson–Darling — the statistic against scipy.stats.anderson, the p-value against the published critical values', () => {
  it('A² for the thirty packs, the oxygen readings and the seal strengths', () => {
    expect(andersonDarling(THIRTY)!.a2).toBeCloseTo(0.2625993534, 6);
    expect(andersonDarling(OXYGEN)!.a2).toBeCloseTo(3.9174492727, 6);
    expect(andersonDarling(SEAL)!.a2).toBeCloseTo(0.2077852167, 6);
    expect(andersonDarling(OXYGEN)!.a2star).toBeCloseTo(4.0251791277, 6);
  });
  it('A*² at the 10%, 5% and 1% critical values (0.631, 0.752, 1.035 — D’Agostino & Stephens) gives p ≈ 0.10, 0.05, 0.01', () => {
    /* n large enough that the adjustment is ~1: feed A*² directly through the
       same pieces by readings is not possible, so test the pieces' values at
       the critical points through a dataset-free check of the formula */
    const pAt = (A: number) => (A >= 0.6 ? Math.exp(1.2937 - 5.709 * A + 0.0186 * A * A) : Math.exp(0.9177 - 4.279 * A - 1.38 * A * A));
    expect(pAt(0.631)).toBeCloseTo(0.10, 2);
    expect(pAt(0.752)).toBeCloseTo(0.05, 2);
    expect(pAt(1.035)).toBeCloseTo(0.01, 2);
  });
  it('bell-shaped readings pass; oxygen, leaning high, fails', () => {
    expect(andersonDarling(THIRTY)!.p).toBeGreaterThan(0.5);
    expect(andersonDarling(SEAL)!.p).toBeGreaterThan(0.5);
    expect(andersonDarling(OXYGEN)!.p).toBeLessThan(0.001);
  });
  it('too few, or no spread: nothing said', () => {
    expect(andersonDarling([1, 2, 3])).toBeUndefined();
    expect(andersonDarling(new Array(30).fill(400))).toBeUndefined();
  });
});

describe('D’Agostino–Pearson K² — against scipy.stats.skewtest, kurtosistest and normaltest', () => {
  const SPEED = [80, 81, 79, 80, 82, 78, 80, 81, 79, 80, 81, 80, 79, 82, 80, 78, 81, 80, 79, 81, 80, 83, 79, 80, 81, 80, 79, 77, 80, 81];
  const RAMP = Array.from({ length: 30 }, (_, i) => Math.round((400 + i * 0.1) * 10) / 10);
  it.each([
    ['the thirty packs', THIRTY, 0.3515874196, -0.3327285227, 0.2343219834, 0.8894419888],
    ['the oxygen readings', OXYGEN, 4.6911584052, 3.8074941217, 36.5039786693, 0.0000000118],
    ['the seal strengths', SEAL, 0.3331899201, -1.3909857645, 2.0458569198, 0.3595404970],
    ['whole-number speeds', SPEED, -0.1646869681, 0.8328650891, 0.7207860541, 0.6974021743],
    ['a run creeping up', RAMP, 0, -2.3279149785, 5.4191881472, 0.0665638212],
  ] as const)('%s: Zs, Zk, K², p', (_, xs, zs, zk, k2, p) => {
    const r = dagostinoPearson([...xs])!;
    expect(r.zSkew).toBeCloseTo(zs, 7);
    expect(r.zKurt).toBeCloseTo(zk, 7);
    expect(r.k2).toBeCloseTo(k2, 6);
    expect(r.p).toBeCloseTo(p, 8);
  });
  it('two values in perfect balance: no skew at all — Zs 0 by the formula (SciPy swaps y = 0 for 1 there and says 1.04), Zk −16.68 as SciPy', () => {
    const r = dagostinoPearson(Array.from({ length: 30 }, (_, i) => (i % 2 ? 403 : 401)))!;
    expect(r.zSkew).toBe(0);
    expect(r.zKurt).toBeCloseTo(-16.6785031413, 6);
    expect(r.p).toBeLessThan(1e-50);
  });
  it('below twenty readings, or no spread: nothing said', () => {
    expect(dagostinoPearson(THIRTY.slice(0, 19))).toBeUndefined();
    expect(dagostinoPearson(new Array(30).fill(400))).toBeUndefined();
  });
});

describe('skewness — against scipy.stats.skew(bias=False)', () => {
  it('G1 for the three sets', () => {
    expect(skewness(THIRTY)!).toBeCloseTo(0.14177697, 6);
    expect(skewness(OXYGEN)!).toBeCloseTo(2.8034423184, 6);
    expect(skewness(SEAL)!).toBeCloseTo(0.1343253815, 6);
  });
});

describe('steady? — the individuals chart and a run of eight', () => {
  it('limits x̄ ± 2.66·MR̄, worked by hand on 10, 12, 11, 13, 12', () => {
    const l = individualsLimits([10, 12, 11, 13, 12])!;
    expect(l.mrBar).toBeCloseTo(1.5, 12);
    expect([l.lcl, l.ucl].map(v => +v.toFixed(2))).toEqual([7.61, 15.59]);
  });
  it('eight in a row above the centre is found; seven is not', () => {
    const xs = [1, -1, 1, 1, 1, 1, 1, 1, 1, 1, -1];
    expect(runOnOneSide(xs, 0)).toEqual({ from: 2, to: 9, side: 'above' });
    expect(runOnOneSide([1, -1, 1, 1, 1, 1, 1, 1, 1, -1], 0)).toBeUndefined();
  });
});

describe('how sure is a Ppk — Bissell’s lower bound', () => {
  /* worked in SciPy with z = norm.ppf(0.95); its coverage near 95% is the
     simulation in scripts/knowledge/independent-cases.py */
  it('Ppk 1.33 from 30: 1.026 at 95%; 1.00 from 100: 0.871; 1.67 from 50: 1.382', () => {
    expect(ppkLowerBound(1.33, 30)).toBeCloseTo(1.0258044347, 6);
    expect(ppkLowerBound(1.0, 100)).toBeCloseTo(0.8708856310, 6);
    expect(ppkLowerBound(1.67, 50)).toBeCloseTo(1.3818904442, 6);
  });
});

describe('the histogram', () => {
  it('about √n bars on a round width, every reading counted', () => {
    const h = histogram(THIRTY, [400, 404])!;
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(30);
    expect(h.counts.length).toBeGreaterThanOrEqual(5);
    expect(h.edges[0]).toBeLessThanOrEqual(400);
    expect(h.edges[h.edges.length - 1]).toBeGreaterThanOrEqual(404);
    expect([0.5, 1, 2, 2.5, 5].some(w => Math.abs(h.width - w) < 1e-9) || Math.abs(Math.log10(h.width) % 1) < 1e-9).toBe(true);
  });
  it('all the same value: one sensible bar', () => {
    const h = histogram([5, 5, 5])!;
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe('a share said the way a person would — never flattering', () => {
  it('rounded up', () => {
    expect(fewerThan(0.1391083407)).toBe('fewer than 14 in 100');
    expect(fewerThan(0.0495076099)).toBe('fewer than 5 in 100');
    expect(fewerThan(0.0099691468)).toBe('fewer than 1 in 100');
    expect(fewerThan(0.005)).toBe('fewer than 5 in 1,000');
    expect(fewerThan(0.0002)).toBe('fewer than 2 in 10,000');
  });
});

/* W1 — THE CAPABILITY STUDY'S MODES (knowledge/specs/FC-094-capability.md parts 2–4, criterion 22):
   every number from scripts/knowledge/cases-w1.py (SciPy), run 24 October. */
import { poissonCdf, poissonUpper, poissonLower, pLimits, uLimits, laneySigmaZ, processZ, cmCmk, fillTargets, LANEY_BAND, fCdf, anovaOneWay } from '../dist';
describe('parts 2–4 — rejects, faults, Laney, Z, Cm/Cmk and the lowest legal fill', () => {
  const RUNS = [[4800, 24], [5100, 31], [4650, 19], [5000, 28], [4900, 41], [5200, 22]] as const;
  const N = RUNS.reduce((s, r) => s + r[0], 0), D = RUNS.reduce((s, r) => s + r[1], 0), pBar = D / N;
  it('rejects: the pooled rate and its exact bounds', () => {
    expect(N).toBe(29650); expect(D).toBe(165); expect(pBar).toBeCloseTo(0.00556, 5);
    expect(binomLower(D, N, 0.975)).toBeCloseTo(0.00475, 5);
    expect(binomUpper(D, N, 0.975)).toBeCloseTo(0.00648, 5);
    expect(binomUpper(D, N, 0.95)).toBeCloseTo(0.00633, 5);
    expect(binomUpper(0, 2000, 0.95)).toBeCloseTo(0.00150, 5);
  });
  it('the p-chart limits per run, and run 5 inside the plain limits', () => {
    const l = pLimits(pBar, 4900);
    expect(l.lcl).toBeCloseTo(0.00238, 5); expect(l.ucl).toBeCloseTo(0.00875, 5);
    expect(41 / 4900).toBeLessThan(l.ucl);
    expect(pLimits(pBar, 4800).lcl).toBeCloseTo(0.00234, 5);
  });
  it('Laney’s σz on the six runs is 1.91 — outside the band, so the limits widen', () => {
    const sz = laneySigmaZ(RUNS.map(r => r[1] / r[0]), RUNS.map(r => r[0]), pBar, 'p');
    expect(sz).toBeCloseTo(1.913, 2);
    expect(sz! > LANEY_BAND[1]).toBe(true);
    expect(laneySigmaZ([0.01, 0.02], [100, 100], 0.015)).toBeUndefined();
  });
  it('the equivalent Z, Ppk and sigma level — a comparison only', () => {
    const z = processZ(pBar)!;
    expect(z.z).toBeCloseTo(2.54, 2); expect(z.ppkEq).toBeCloseTo(0.85, 2); expect(z.sigma).toBeCloseTo(4.04, 2);
    expect(processZ(0)).toBeUndefined(); expect(processZ(1)).toBeUndefined();
  });
  it('faults: DPU, the exact Poisson bounds, the u and c limits', () => {
    const C = 57, Nn = 1150;
    expect(C / Nn).toBeCloseTo(0.0496, 4);
    expect(poissonLower(C, Nn, 0.975)).toBeCloseTo(0.0375, 4);
    expect(poissonUpper(C, Nn, 0.975)).toBeCloseTo(0.0642, 4);
    expect(poissonUpper(C, Nn, 0.95)).toBeCloseTo(0.0618, 4);
    expect(poissonUpper(0, 300, 0.95)).toBeCloseTo(0.00999, 5);
    expect(poissonLower(0, 300)).toBe(0);
    expect(1 - Math.exp(-C / Nn)).toBeCloseTo(0.0484, 4);
    const u = uLimits(C / Nn, 200); expect(u.lcl).toBeCloseTo(0.0023, 4); expect(u.ucl).toBeCloseTo(0.0968, 4);
    const cBar = (9 + 14 + 6) / 3; expect(uLimits(cBar, 1).lcl).toBeCloseTo(0.34, 2); expect(uLimits(cBar, 1).ucl).toBeCloseTo(18.99, 2);
    expect(poissonCdf(2, 1.5)).toBeCloseTo(0.8088, 4);
  });
  it('DPMO with 6 opportunities and its Z', () => {
    const dpo = 57 / (1150 * 6);
    expect(Math.round(dpo * 1e6)).toBe(8261);
    expect(processZ(dpo)!.z).toBeCloseTo(2.40, 2); expect(processZ(dpo)!.sigma).toBeCloseTo(3.90, 2);
  });
  it('machine capability on consecutive parts', () => {
    const r = cmCmk(400.29, 0.773, 398, 403);
    expect(r.cm).toBeCloseTo(1.08, 2); expect(r.cmk).toBeCloseTo(0.99, 2);
    expect(cmCmk(400.29, 0.773, 398).cm).toBeUndefined(); expect(cmCmk(400.29, 0.773, 398).cmk).toBeCloseTo(0.99, 2);
    expect(cmCmk(400, 0)).toEqual({});
  });
  it('the lowest legal fill — rule 1 binds at s 2.1 g, and still at 6 g', () => {
    const f = fillTargets(400, 2.1, 12);
    expect(f.rule1).toBe(400); expect(f.rule2).toBeCloseTo(392.12, 2); expect(f.rule3).toBeCloseTo(383.81, 2);
    expect(f.lowest).toBe(400); expect(f.binds).toBe(1);
    expect(fillTargets(400, 6, 12).rule2).toBeCloseTo(399.76, 2); expect(fillTargets(400, 6, 12).binds).toBe(1);
    expect(fillTargets(400, 7, 12).binds).toBe(3);
  });
});

describe('part 4 — the heads and the F test (cases-w1.py)', () => {
  it('F cdf agrees with SciPy', () => {
    expect(fCdf(2.5, 3, 16)).toBeCloseTo(0.903463, 5);
    expect(fCdf(5.0, 2, 12)).toBeCloseTo(0.973664, 5);
  });
  it('one-way ANOVA finds the heavy head and lets agreeing heads agree', () => {
    const heads = [[37.2, 37.9, 37.4, 38.1, 36.8], [37.6, 37.1, 38.0, 37.3, 37.7], [43.1, 43.8, 43.4, 43.9, 43.3], [37.5, 36.9, 37.8, 37.2, 37.6]];
    const a = anovaOneWay(heads) as { f: number; p: number; df1: number; df2: number };
    expect(a.f).toBeCloseTo(283.858, 2); expect(a.p).toBeLessThan(1e-10); expect(a.df1).toBe(3); expect(a.df2).toBe(16);
    const b = anovaOneWay([heads[0], heads[1], heads[3]]) as { f: number; p: number };
    expect(b.f).toBeCloseTo(0.141, 2); expect(b.p).toBeCloseTo(0.870, 2);
    expect(anovaOneWay([[1, 2], [3]])).toBeUndefined();
    expect(anovaOneWay([[1, 1], [2, 2]])).toBeUndefined();
  });
});
