/* FC-112 the response surface — the fit, the stationary point, the intervals and the region against the record's frozen 13-run case (knowledge/methods/stats/response-surface.md)
 * and scripts/knowledge/cases-t8-3.py (the same runs by plain Gauss–Jordan least squares), the design generators, the refusal outside the region, the words. */
import { describe, expect, it } from 'vitest';
import { bestInside, designPoints, eigenvalues, fitSurface, halfWidths, predict, rsmAnalyse, runCount, runPlan, setupProblem, stationary, terms, type Fit, type RsmOut } from '../rsm';
import def from '../../scored/defs/rsm';
import type { RsmSetup, ScoredRow } from '../../../lib/study';
import type { ScoredContext } from '../../scored/types';

const ex = def.examples[0], SETUP = ex.rsm as RsmSetup;
const ctx = (rsm: RsmSetup | undefined = SETUP): ScoredContext => ({ today: '2026-11-01', now: 0, studies: [], ...(rsm ? { rsm } : {}) });
const out = (rows: ScoredRow[] = ex.rows, c = ctx()): RsmOut => { const r = rsmAnalyse({ rows, ctx: c }); if ('problems' in r) throw new Error(r.problems.join(' ')); return r; };
const near = (a: number | undefined, b: number, d = 4) => expect(a).toBeCloseTo(b, d);
const xs = ex.rows.map(r => r.run?.x as number[]), ys = ex.rows.map(r => r.run?.y as number);
const fitOf = (): Fit => { const f = fitSurface(xs, ys, ['Filler speed', 'Product temperature']); if ('problem' in f) throw new Error(f.problem); return f; };

describe('the designs', () => {
  it('a rotatable central composite of two factors: 4 corners, 4 axial points at √2, and the centre; a face-centred one has its axial points at 1', () => {
    const p = designPoints(2, 'ccc'); expect(p.length).toBe(8); expect(Math.max(...p.flat())).toBeCloseTo(Math.SQRT2, 12);
    expect(designPoints(2, 'ccf').filter(x => x.some(v => v === 0)).length).toBe(4); expect(Math.max(...designPoints(3, 'ccf').flat())).toBe(1);
    near(Math.max(...designPoints(3, 'ccc').flat()), 2 ** (3 / 4), 12);
  });
  it('run counts: 2ᵏ + 2k + centre for a central composite (13, 19); 4·C(k,2) + centre for Box–Behnken (12 + centre for three factors)', () => {
    expect([runCount(2, 'ccc', 5), runCount(3, 'ccf', 5), runCount(3, 'bbd', 3)]).toEqual([13, 19, 15]);
    expect(designPoints(3, 'bbd').length).toBe(12); expect(designPoints(3, 'bbd').every(x => x.filter(v => v === 0).length === 1)).toBe(true);
  });
  it('rotatability proved as in the record: the scaled prediction variance round a circle of radius 1 is constant for α = (2ᵏ)^¼, not for α = 1', () => {
    const spread = (alpha: number) => {
      const pts = [[-1, -1], [-1, 1], [1, -1], [1, 1], [alpha, 0], [-alpha, 0], [0, alpha], [0, -alpha], ...Array.from({ length: 5 }, () => [0, 0])];
      const f = fitSurface(pts, pts.map((_, i) => i + (i % 3)), ['a', 'b']) as Fit;
      const v = Array.from({ length: 72 }, (_, i) => { const t = i * Math.PI / 36, x = [Math.cos(t), Math.sin(t)], tv = [1, ...x, ...x.map(a => a * a), x[0] * x[1]]; return pts.length * tv.reduce((s, a, i2) => s + a * f.minv[i2].reduce((q, m, j) => q + m * tv[j], 0), 0); });
      return Math.max(...v) - Math.min(...v);
    };
    expect(spread(Math.SQRT2)).toBeLessThan(1e-9); expect(spread(1)).toBeGreaterThan(0.1);
  });
  it('the plan is the design shuffled from the seed, centre runs among them, the same every time', () => {
    const a = runPlan(2, 'ccc', 5, 112), b = runPlan(2, 'ccc', 5, 112);
    expect(a).toEqual(b); expect(a.length).toBe(13); expect(a.filter(x => x.every(v => v === 0)).length).toBe(5); expect(runPlan(2, 'ccc', 5, 113)).not.toEqual(a);
  });
});

describe('the record’s 13-run case — the fit as the record and the second implementation print it', () => {
  const f = fitOf();
  it('coefficients 1.1074, 0.1081, −0.0707, 0.2284, 0.1324, 0.0415; standard errors 0.0253, 0.0200, 0.0200, 0.0214, 0.0214, 0.0283', () => {
    [1.1074, 0.1081, -0.0707, 0.2284, 0.1324, 0.0415].forEach((v, i) => near(f.b[i], v, 3));
    [0.0253, 0.0200, 0.0200, 0.0214, 0.0214, 0.0283].forEach((v, i) => near(f.coefs[i].se, v, 3));
    expect(f.coefs[5].p).toBeGreaterThan(0.1); expect(f.coefs[5].p).toBeLessThan(0.3); expect(f.coefs[3].p).toBeLessThan(0.01);
  });
  it('s 0.0565 on 7 df; R² 0.963, adjusted 0.936, predicted 0.875; F 36.2 (p 7×10⁻⁵)', () => {
    expect(f.df).toBe(7); near(f.s, 0.0565, 3); near(f.r2, 0.9628, 3); near(f.adj, 0.9362, 3); near(f.pred, 0.8746, 3); near(f.f, 36.19, 1);
    expect(f.pF).toBeGreaterThan(5e-5); expect(f.pF).toBeLessThan(9e-5);
  });
  it('lack of fit: SS 0.0073 on 3 df against pure error 0.0151 on 4 df, F 0.64, p 0.63', () => {
    near(f.lof?.ssLof, 0.0073, 4); near(f.lof?.ssPe, 0.0151, 4); expect([f.lof?.dfLof, f.lof?.dfPe]).toEqual([3, 4]); near(f.lof?.f, 0.642, 2); near(f.lof?.p, 0.63, 2);
  });
  it('the stationary point (−0.265, +0.308) = 56.0 a minute and 21.5 °C, 1.082 g; eigenvalues 0.128, 0.233 — a minimum; ±0.058 for the mean and ±0.146 for a run', () => {
    const st = stationary(f, 2); expect(st?.nature).toBe('minimum'); near(st?.x[0], -0.2647, 3); near(st?.x[1], 0.3084, 3); near(st?.y, 1.0822, 3);
    near(st?.eig[0], 0.1281, 3); near(st?.eig[1], 0.2327, 3); expect(st?.ridge).toBe(false);
    const hw = halfWidths(f, st?.x as number[]); near(hw.mean, 0.0585, 3); near(hw.run, 0.1459, 3);
    near(predict(f, st?.x as number[]), 1.0822, 3);
  });
  it('the page: the best setting is the stationary point, inside the region (0.41 of 1.41), predicted 1.08 g, the verdict and the sentence', () => {
    const o = out();
    expect(o.result.verdict).toBe(ex.expect.verdict); expect(o.best.stationary).toBe(true); expect(o.best.edge).toBe(false);
    expect(o.result.sentence).toContain('13 runs of 13 fitted to 6 terms. R² 0.963, adjusted 0.936, predicted 0.875; the whole model p < 0.0001.');
    expect(o.result.sentence).toContain('Lack of fit F 0.64, p 0.63 — no sign the quadratic is wrong.');
    expect(o.result.sentence).toContain('The best setting is the stationary point, Filler speed 56.03 a minute, Product temperature 21.54 °C — a minimum, 0.41 from the centre against 1.41 run, inside what was run; predicted 1.08 g.');
    expect(o.result.sentence).toContain('No confirmation run yet');
    expect(o.result.tone).toBe('a');
  });
});

describe('a confirmation run, the region and the refusals', () => {
  it('a confirmation inside the prediction interval confirms (green); outside it does not (red, "do not adopt")', () => {
    const ok = out(ex.rows, ctx({ ...SETUP, confirm: 1.1 })); expect(ok.result.verdict).toBe('Confirmed'); expect(ok.result.tone).toBe('g'); expect(ok.result.sentence).toContain('inside the prediction interval 0.936 to 1.23 g — the model holds');
    const bad = out(ex.rows, ctx({ ...SETUP, confirm: 1.4 })); expect(bad.result.verdict).toBe('Not confirmed'); expect(bad.result.tone).toBe('r'); expect(bad.result.sentence).toContain('do not adopt the setting');
  });
  it('a minimum outside what was run is not quoted: the best on the edge of the region, "move the box and run again" (second implementation: edge (1.386, 0.283))', () => {
    const f = (x: number[]) => 1 - 1.18 * x[0] - 0.213 * x[1] + 0.2 * x[0] ** 2 + 0.15 * x[1] ** 2;
    const rows = ex.rows.map(r => ({ ...r, run: { x: r.run?.x as number[], y: f(r.run?.x as number[]) } }));
    const o = out(rows);
    expect(o.best.stationary).toBe(false); expect(o.best.edge).toBe(true); expect(Math.hypot(o.station?.x[0] as number, o.station?.x[1] as number)).toBeCloseTo(3.034, 2);
    near(o.best.x[0], 1.386, 1); near(o.best.x[1], 0.283, 1); near(Math.hypot(...o.best.x), Math.SQRT2, 2);
    expect(o.result.sentence).toContain('beyond the 1.41 that was run, so it is not quoted'); expect(o.result.sentence).toContain('the best setting is beyond what you tried — move the box and run again');
    expect(o.result.verdict).toBe('Beyond the runs'); expect(o.result.tiles.find(t => t.k === 'Best inside')?.of).toContain('Filler speed');
  });
  it('a surface with a maximum when the smallest is wanted: the stationary point is the wrong kind, the best inside is on the edge', () => {
    const rows = ex.rows.map(r => ({ ...r, run: { x: r.run?.x as number[], y: 5 - (r.run?.x as number[]).reduce((s, v) => s + v * v, 0) + 0.01 * ((r.run?.x as number[])[0]) } }));
    const o = out(rows); expect(o.station?.nature).toBe('maximum'); expect(o.best.edge).toBe(true); expect(o.result.sentence).toContain('is a maximum, not the minimum wanted');
    near(Math.hypot(...o.best.x), Math.SQRT2, 1);
  });
  it('a significant lack of fit says so in red and does not trust the setting', () => {
    const rows = ex.rows.map((r, i) => ({ ...r, run: { x: r.run?.x as number[], y: (r.run?.y as number) + (i < 8 ? [0, 0.4, 0, -0.4, 0.3, 0, -0.3, 0][i] : 0) } }));
    const o = out(rows, ctx()); if (o.fit.lof && o.fit.lof.p < 0.05) { expect(o.result.verdict).toBe('Does not fit'); expect(o.result.tone).toBe('r'); expect(o.result.sentence).toContain('do not trust the best setting'); }
    else expect(o.fit.lof?.p).toBeGreaterThan(0.05);
  });
  it('too few responses, no sheet and an unfit setup are said in words', () => {
    const few = ex.rows.map((r, i) => (i < 5 ? r : { ...r, run: { x: r.run?.x as number[] } }));
    expect(rsmAnalyse({ rows: few, ctx: ctx() })).toEqual({ problems: [expect.stringContaining('5 of 13 runs have a response')] });
    expect(rsmAnalyse({ rows: [], ctx: ctx() })).toEqual({ problems: [expect.stringContaining('Make the run sheet')] });
    expect(setupProblem({ ...SETUP, factors: [SETUP.factors[0]] })).toContain('two or three');
    expect(setupProblem({ ...SETUP, design: 'bbd' })).toContain('Box–Behnken needs 3 factors');
    expect(setupProblem({ ...SETUP, factors: [SETUP.factors[0], { ...SETUP.factors[1], high: 10, low: 20 }] })).toContain('the high above the low');
  });
  it('the money: the runs’ materials when given, the missing input named when not', () => {
    expect(out().result.money?.[0]).toContain('Give the packs a run uses and the materials a pack');
    expect(out(ex.rows, ctx({ ...SETUP, packsPerRun: 200, materialsPerPack: 0.4 })).result.money?.[0]).toContain('The 13 runs cost about £1,040 in materials (13 × 200 packs × £0.40 a pack)');
  });
  it('eigenvalues of a small symmetric matrix as the closed form gives them; terms are 6 for two factors and 10 for three', () => {
    const e = eigenvalues([[0.2284, 0.02075], [0.02075, 0.1324]]); near(e[0], 0.1281, 3); near(e[1], 0.2327, 3); expect([terms(2), terms(3)]).toEqual([6, 10]);
    expect(bestInside(fitOf(), 2, Math.SQRT2, 'min').y).toBeLessThanOrEqual(1.0822 + 1e-6);
  });
});
