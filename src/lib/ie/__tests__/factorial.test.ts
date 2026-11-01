/* FC-111 two-level factorials — every figure was printed by NumPy/SciPy (scripts/knowledge/cases-m6-analysis.py), and the first two cases are
 * the worked examples of Montgomery, Design and Analysis of Experiments, ch. 6 (the 2⁴ filtration-rate experiment; the 2³ plasma etch with two replicates). */
import { describe, expect, it } from 'vitest';
import { analyseFactorial, bestCorner, cornerIndex, cornerOf, factorsOfMask, modelMasks, modelR2, planRuns, predictCoded, shuffled, simpleEffect } from '../factorial';

const near = (v: number | undefined, want: number, tol = 1e-3): void => { expect(v).toBeDefined(); expect(Math.abs((v as number) - want)).toBeLessThan(tol); };
const FILTER = [45, 71, 48, 65, 68, 60, 80, 65, 43, 100, 45, 104, 75, 86, 70, 96].map(v => [v]);
const ETCH = [[550, 604], [669, 650], [633, 601], [642, 635], [1037, 1052], [749, 868], [1075, 1063], [729, 860]];
const BAGGER = [10.2, 13.1, 11.0, 15.8, 10.6, 13.4, 11.5, 16.4].map(v => [v]);
const effectOf = (res: ReturnType<typeof analyseFactorial>, mask: number) => res?.terms[mask - 1];

describe('the design', () => {
  it('standard order: the first factor changes fastest, and a corner’s index reads back', () => {
    expect([0, 1, 2, 3].map(i => cornerOf(2, i))).toEqual([[-1, -1], [1, -1], [-1, 1], [1, 1]]);
    expect(cornerOf(3, 5)).toEqual([1, -1, 1]); expect(cornerIndex([1, -1, 1])).toBe(5); expect(cornerIndex([1, 0, 1])).toBeUndefined();
    expect(factorsOfMask(5, 3)).toEqual([0, 2]);
  });
  it('shuffles from a stored seed, the same every time, as the second implementation does (mulberry32 + Fisher–Yates)', () => {
    expect(shuffled(8, 12345)).toEqual([3, 0, 1, 5, 4, 6, 2, 7]);
    expect(shuffled(16, 20260401)).toEqual([11, 4, 5, 9, 8, 10, 1, 14, 0, 15, 6, 13, 3, 2, 12, 7]);
    expect(shuffled(16, 20260401)).toEqual(shuffled(16, 20260401));
    expect([...shuffled(32, 7)].sort((a, b) => a - b)).toEqual(Array.from({ length: 32 }, (_, i) => i));
  });
  it('plans every corner r times and the centre runs, numbered in the order to make them', () => {
    const plan = planRuns(3, 2, 2, 99);
    expect(plan).toHaveLength(18); expect(plan.map(p => p.no)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(plan.filter(p => p.centre)).toHaveLength(2); expect(plan.filter(p => !p.centre && p.std === 5)).toHaveLength(2);
    expect(plan.filter(p => p.centre).every(p => p.levels.every(v => v === 0))).toBe(true);
    expect(planRuns(3, 2, 2, 99)).toEqual(plan); expect(planRuns(3, 2, 2, 100)).not.toEqual(plan);
  });
});

describe('Montgomery’s 2⁴ filtration-rate experiment (one run a corner) — the effects and Lenth’s margin', () => {
  const res = analyseFactorial(4, FILTER, 0.95);
  it('effects as the textbook and NumPy give them (A 21.625, C 9.875, D 14.625, AC −18.125, AD 16.625)', () => {
    near(effectOf(res, 1)?.effect, 21.625); near(effectOf(res, 2)?.effect, 3.125); near(effectOf(res, 4)?.effect, 9.875); near(effectOf(res, 8)?.effect, 14.625);
    near(effectOf(res, 5)?.effect, -18.125); near(effectOf(res, 9)?.effect, 16.625); near(effectOf(res, 15)?.effect, 1.375); near(effectOf(res, 3)?.effect, 0.125);
    near(effectOf(res, 1)?.ss, 1870.5625); near(effectOf(res, 5)?.ss, 1314.0625); near(effectOf(res, 9)?.ss, 1105.5625);
  });
  it('one run a corner: Lenth’s PSE 2.625, ME 6.7478, SME 13.699 at 95% (SciPy t quantiles at 5 degrees of freedom)', () => {
    expect(res?.mode).toBe('lenth'); near(res?.lenth?.s0, 3.9375); near(res?.lenth?.pse, 2.625); near(res?.lenth?.df, 5, 1e-12);
    near(res?.lenth?.me, 6.7478, 1e-3); near(res?.lenth?.sme, 13.699, 1e-3);
    near(analyseFactorial(4, FILTER, 0.9)?.lenth?.me, 5.2895, 1e-3); near(analyseFactorial(4, FILTER, 0.99)?.lenth?.me, 10.5844, 1e-3); near(analyseFactorial(4, FILTER, 0.99)?.lenth?.sme, 19.665, 1e-3);
  });
  it('the real effects are A, C, D, AC and AD — the textbook’s own finding — and the fitted model is those five', () => {
    const real = res?.terms.filter(t => t.real).map(t => t.mask); expect(real).toEqual([1, 4, 5, 8, 9]);
    expect(res?.terms.filter(t => t.firm).map(t => t.mask)).toEqual([1, 5, 8, 9]); // beyond the simultaneous margin 13.699: A, AC, D, AD (C, at 9.875, is real but not firm)
    expect(modelMasks(res!)).toEqual([1, 4, 5, 8, 9]); // AC needs A and C, AD needs A and D — all already real
  });
});

describe('Montgomery’s 2³ plasma etch (two replicates) — the analysis of variance', () => {
  const res = analyseFactorial(3, ETCH, 0.95);
  it('SSE 18,020.5 on 8 df, MSE 2,252.5625, SE of an effect 23.7306; effects and sums of squares as the textbook prints them', () => {
    expect(res?.mode).toBe('anova'); near(res?.anova?.sse, 18020.5, 1e-6); expect(res?.anova?.dfe).toBe(8); near(res?.anova?.mse, 2252.5625, 1e-6); near(res?.anova?.se, 23.7306, 1e-3);
    near(effectOf(res, 1)?.effect, -101.625); near(effectOf(res, 4)?.effect, 306.125); near(effectOf(res, 5)?.effect, -153.625); near(effectOf(res, 3)?.effect, -24.875);
    near(effectOf(res, 1)?.ss, 41310.5625, 1e-4); near(effectOf(res, 4)?.ss, 374850.0625, 1e-4); near(effectOf(res, 5)?.ss, 94402.5625, 1e-4); near(effectOf(res, 2)?.ss, 217.5625, 1e-4); near(effectOf(res, 7)?.ss, 126.5625, 1e-4);
    near(res?.sst, 531420.9375, 1e-3); near(res?.grand, 776.0625, 1e-6);
  });
  it('t, p and the 95% interval of each effect as SciPy prints them; A, C and AC are real, B, AB, BC and ABC are not', () => {
    near(effectOf(res, 1)?.p, 0.00267861, 1e-7); near(effectOf(res, 4)?.p, 1.23326e-6, 1e-9); near(effectOf(res, 5)?.p, 0.000193396, 1e-8); near(effectOf(res, 3)?.p, 0.325168, 1e-5); near(effectOf(res, 2)?.p, 0.763911, 1e-5);
    near(effectOf(res, 1)?.lo, -156.3478, 1e-3); near(effectOf(res, 1)?.hi, -46.9022, 1e-3); near(effectOf(res, 4)?.t, 12.9, 1e-3);
    expect(res?.terms.filter(t => t.real).map(t => t.mask)).toEqual([1, 4, 5]);
  });
  it('the fitted model A, C, AC: predictions by corner, R² 0.96075, the best corner and its ±54.72 half-width', () => {
    const masks = modelMasks(res!); expect(masks).toEqual([1, 4, 5]);
    const want = [597, 649, 597, 649, 1056.75, 801.5, 1056.75, 801.5];
    want.forEach((w, i) => near(predictCoded(res!, masks, cornerOf(3, i)), w, 1e-6));
    near(modelR2(res!, masks), 0.96075, 1e-5);
    const best = bestCorner(res!, masks, 'higher', 0.95);
    near(best.predicted, 1056.75, 1e-6); expect(best.levels).toEqual([-1, 0, 1]); // A low, B either, C high
    near(best.half, 54.7228, 1e-3);
    expect(bestCorner(res!, masks, 'lower', 0.95).levels).toEqual([-1, 0, -1]); expect(bestCorner(res!, masks, 'lower', 0.95).predicted).toBeCloseTo(597, 6);
  });
  it('an interaction read as two numbers: A at C low +52.00, at C high −255.25', () => {
    near(simpleEffect(res!, 0, 2, -1), 52, 1e-9); near(simpleEffect(res!, 0, 2, 1), -255.25, 1e-9);
  });
});

describe('the record’s bagger 2³ (one run a corner) and the hierarchy of the fitted model', () => {
  const res = analyseFactorial(3, BAGGER, 0.95);
  it('effects 3.85 1.85 0.45 1.00 0.00 0.10 0.05, PSE 0.15, ME 0.5646 at 95% (0.3982 at 90%, 1.1768 at 99%)', () => {
    [3.85, 1.85, 1.0, 0.45, 0, 0.1, 0.05].forEach((w, i) => near(res?.terms[i].effect, w, 1e-9));   // masks 1…7: T, D, TD, P, TP, DP, TDP
    near(res?.lenth?.pse, 0.15, 1e-9); near(res?.lenth?.df, 7 / 3, 1e-12); near(res?.lenth?.me, 0.5646, 1e-3);
    near(analyseFactorial(3, BAGGER, 0.9)?.lenth?.me, 0.3982, 1e-3); near(analyseFactorial(3, BAGGER, 0.99)?.lenth?.me, 1.1768, 1e-3); near(res?.lenth?.sme, 1.3512, 1e-3);
  });
  it('real: temperature, dwell and their interaction (3, 1, 2) — pressure is not; the model’s prediction at T+ D+ P− is 16.10 (the run itself read 15.8)', () => {
    expect(res?.terms.filter(t => t.real).map(t => t.mask)).toEqual([1, 2, 3]);
    near(predictCoded(res!, modelMasks(res!), [1, 1, -1]), 16.1, 1e-9);
    near(simpleEffect(res!, 0, 1, -1), 2.85, 1e-9); near(simpleEffect(res!, 0, 1, 1), 4.85, 1e-9);
    const best = bestCorner(res!, modelMasks(res!), 'higher', 0.95); expect(best.levels).toEqual([1, 1, 0]); expect(best.half).toBeUndefined(); // no error estimate with one run a corner
  });
  it('an interaction that is real brings its main effects into the model even when they are not real on their own', () => {
    const y = [10, 10, 10, 20, 10, 10, 10, 20].map(v => [v, v]);   // 2³: only the AB corner pair differs… A and B alone also move
    const r = analyseFactorial(3, y.map((c, i) => [c[0] + (i === 3 ? 0.1 : 0), c[1] - (i === 3 ? 0.1 : 0)]), 0.95)!;
    const masks = modelMasks(r); for (const m of masks) for (let s = m; s > 0; s = (s - 1) & m) expect(masks).toContain(s);
  });
});

describe('centre points and curvature (Montgomery §6.8 form; SciPy’s F)', () => {
  it('four corners and five centre runs: SS_curv 0.002722, pure error 0.1720 on 4 df, F 0.0633, p 0.8137', () => {
    const res = analyseFactorial(2, [[39.3], [40.9], [40.0], [41.5]], 0.95, [40.3, 40.5, 40.7, 40.2, 40.6]);
    near(res?.curvature?.meanF, 40.425, 1e-9); near(res?.curvature?.meanC, 40.46, 1e-9); near(res?.curvature?.ss, 0.002722, 1e-6); near(res?.curvature?.mspe, 0.043, 1e-9);
    near(res?.curvature?.f, 0.0633, 1e-3); near(res?.curvature?.p, 0.813741, 1e-4); expect(res?.curvature?.df).toBe(4);
  });
  it('one centre run is a mean with no error: curvature has no test', () => {
    const c = analyseFactorial(2, [[39.3], [40.9], [40.0], [41.5]], 0.95, [40.3])?.curvature; expect(c?.df).toBe(0); expect(Number.isNaN(c?.p)).toBe(true);
  });
});

describe('a food 2² with two replicates (seal strength) and the refusals', () => {
  it('A 3.8, B 2.0, AB 1.1; MSE 0.08 on 4 df; t 19, 10, 5.5; p 4.52e-5, 5.62e-4, 5.33e-3', () => {
    const res = analyseFactorial(2, [[10.1, 10.5], [13.2, 12.8], [11.4, 11.0], [15.9, 16.3]], 0.95);
    near(res?.anova?.mse, 0.08, 1e-9); near(effectOf(res, 1)?.effect, 3.8, 1e-9); near(effectOf(res, 2)?.effect, 2.0, 1e-9); near(effectOf(res, 3)?.effect, 1.1, 1e-9);
    near(effectOf(res, 1)?.p, 4.52021e-5, 1e-8); near(effectOf(res, 2)?.p, 0.000562004, 1e-8); near(effectOf(res, 3)?.p, 0.00532813, 1e-7);
  });
  it('refuses corners with different numbers of readings, the wrong number of corners, fewer than two factors, a non-number', () => {
    expect(analyseFactorial(2, [[1, 2], [3], [4, 5], [6, 7]], 0.95)).toBeUndefined();
    expect(analyseFactorial(2, [[1], [2], [3]], 0.95)).toBeUndefined();
    expect(analyseFactorial(1, [[1], [2]], 0.95)).toBeUndefined();
    expect(analyseFactorial(2, [[1], [2], [3], [NaN]], 0.95)).toBeUndefined();
  });
  it('replicates that are all the same leave no error: a term is real if it moves at all', () => {
    const res = analyseFactorial(2, [[1, 1], [2, 2], [1, 1], [2, 2]], 0.95)!;
    expect(res.anova?.mse).toBe(0); expect(res.terms.map(t => t.real)).toEqual([true, false, false]);
  });
});
