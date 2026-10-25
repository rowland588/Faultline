/* Fitting a distribution (FC-114) and reading the tail from it (FC-096) — every expected number is SciPy's, printed by
 * scripts/knowledge/cases-w3c.py (scipy 1.17: norm/lognorm/weibull_min/expon .fit, anderson(..., method='interpolate'), ppf, cdf). */
import { describe, it, expect } from 'vitest';
import { candidateOf, cdf, fitAll, fitModel, goodness, probabilityPlot, quantileOf, tailOf, type Model } from '../fit';

const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38, 0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const STOPS = [18.4, 78.4, 15.1, 14.5, 23.6, 17.3, 42.7, 10.8, 66.7, 60.8, 1.0, 34.2, 10.2, 18.8, 27.2, 29.2, 30.0, 73.1, 18.8, 15.0, 42.7, 78.3, 72.0, 64.0, 7.4, 75.4, 41.2, 62.7, 26.7, 16.7, 53.1, 42.1, 51.7, 15.7, 11.9, 50.3, 3.5, 78.0, 12.0, 37.9];
const FILLS = [249.0, 248.4, 249.7, 250.5, 251.4, 250.1, 249.3, 249.1, 250.9, 252.0, 250.3, 248.5, 248.9, 251.9, 250.2, 247.9, 249.9, 248.6, 249.2, 249.4, 249.1, 250.7, 249.9, 249.3, 250.5, 251.0, 248.0, 249.7, 248.8, 249.8, 248.5, 250.0, 250.0, 249.6, 248.7, 249.5, 248.7, 248.4, 250.3, 248.7];
const m = (id: Parameters<typeof fitModel>[0], xs: number[]): Model => fitModel(id, xs) as Model;

describe('the four shapes, fitted — SciPy’s parameters, log-likelihoods and AIC', () => {
  it('residual oxygen (30)', () => {
    const n = m('normal', OXYGEN), l = m('lognormal', OXYGEN), w = m('weibull', OXYGEN), e = m('exponential', OXYGEN);
    expect(n.p.mu).toBeCloseTo(0.364, 9); expect(n.p.sigma).toBeCloseTo(0.2641002944, 8); expect(n.aic).toBeCloseTo(8.233684751, 6);
    expect(l.p.mu).toBeCloseTo(-1.1597551104, 8); expect(l.p.sigma).toBeCloseTo(0.4933810140, 8); expect(l.aic).toBeCloseTo(-23.85445453, 6);
    expect(w.p.beta).toBeCloseTo(1.6206006113, 7); expect(w.p.eta).toBeCloseTo(0.4118007432, 7); expect(w.ll).toBeCloseTo(6.0262311196, 6); expect(w.aic).toBeCloseTo(-8.052462239, 6); // the likelihood equation's root; scipy's .fit stops 1e-5 short of it
    expect(e.p.mean).toBeCloseTo(0.364, 9); expect(e.aic).toBeCloseTo(1.363915319, 6);
  });
  it('minutes between short stops (40): a Weibull wins on AIC', () => {
    const n = m('normal', STOPS), l = m('lognormal', STOPS), w = m('weibull', STOPS), e = m('exponential', STOPS);
    expect(n.aic).toBeCloseTo(371.45413, 4); expect(l.aic).toBeCloseTo(373.140958, 4); expect(e.aic).toBeCloseTo(369.18548, 4);
    expect(w.p.beta).toBeCloseTo(1.4851277544, 7); expect(w.p.eta).toBeCloseTo(39.9730392724, 6); expect(w.aic).toBeCloseTo(363.1774136701, 6);
  });
  it('fills that are bell-shaped: the Weibull’s shape runs to a few hundred, as SciPy’s does', () => {
    const w = m('weibull', FILLS);
    expect(w.p.beta).toBeCloseTo(236.0557328, 3); expect(w.p.eta).toBeCloseTo(250.1264263, 5);
  });
  it('a shape that cannot go below zero is refused a reading that is zero or less, and a set with no spread', () => {
    expect(fitModel('lognormal', [1, 2, 0, 3])).toEqual({ why: 'needs every reading above zero' });
    expect(fitModel('weibull', [1, 2, -1, 3])).toEqual({ why: 'needs every reading above zero' });
    expect(fitModel('normal', [5, 5, 5, 5])).toEqual({ why: 'every reading is the same' });
    expect(fitModel('weibull', [5, 5, 5, 5])).toMatchObject({ why: expect.stringContaining('could not be found') });
    expect(fitModel('normal', [1, 2])).toEqual({ why: 'needs at least three readings' });
  });
});

describe('Anderson–Darling: A², and the p', () => {
  it('oxygen: every shape rejected; the statistics are SciPy’s', () => {
    const f = fitAll(OXYGEN);
    expect(candidateOf(f, 'normal')!.ad!.a2).toBeCloseTo(3.917449273, 6);
    expect(candidateOf(f, 'lognormal')!.ad!.a2).toBeCloseTo(1.500385770, 6);
    expect(candidateOf(f, 'weibull')!.ad!.a2).toBeCloseTo(2.755715, 5);
    expect(candidateOf(f, 'exponential')!.ad!.a2).toBeCloseTo(4.608590246, 6);
    expect(candidateOf(f, 'lognormal')!.ad!.p).toBeCloseTo(0.000573729, 6);
    expect(f.candidates.every(c => c.rejected)).toBe(true);
    expect(f.leads).toBeUndefined(); expect(f.closest).toBe('lognormal');
    expect(candidateOf(f, 'weibull')!.ad).toMatchObject({ p: 0.01, edge: 'below' });
  });
  it('stops: the Weibull fits (p interpolated as SciPy does: 0.1462), the other three are rejected', () => {
    const f = fitAll(STOPS);
    expect(candidateOf(f, 'weibull')!.ad!.a2).toBeCloseTo(0.5683796336, 6);
    expect(candidateOf(f, 'weibull')!.ad!.p).toBeCloseTo(0.14615857566, 2);   // SciPy rounds the table's critical values to 3 places
    expect(candidateOf(f, 'lognormal')!.ad!.p).toBeCloseTo(0.02448144, 3);
    expect(candidateOf(f, 'exponential')!.ad!.p).toBeCloseTo(0.0229986, 2);
    expect(candidateOf(f, 'normal')!.ad!.p).toBeCloseTo(0.0038238, 6);
    expect(f.candidates.filter(c => c.rejected).map(c => c.model.id)).toEqual(['normal', 'lognormal', 'exponential']);
    expect(f.leads).toBe('weibull'); expect(f.alsoFit).toEqual([]);
  });
  it('fills: the normal fits and is kept; the lognormal fits about as well and is said to', () => {
    const f = fitAll(FILLS);
    expect(candidateOf(f, 'normal')!.ad!.p).toBeCloseTo(0.5348427, 6);
    expect(candidateOf(f, 'lognormal')!.ad!.p).toBeCloseTo(0.5482899, 6);
    expect(f.leads).toBe('normal'); expect(f.alsoFit).toEqual(['lognormal']);
    expect(f.candidates.filter(c => c.rejected).map(c => c.model.id)).toEqual(['weibull', 'exponential']);
  });
  it('too few readings for the test: none is made', () => {
    expect(goodness(m('normal', [1, 2, 3, 4, 5, 6, 7.5]), [1, 2, 3, 4, 5, 6, 7.5])).toBeUndefined();
  });
});

describe('the tail: percentiles, the share beyond a limit and the percentile index', () => {
  it('oxygen at most 2%: the 99.865th percentile by the normal and by the lognormal (the record’s 1.16 and 1.34, here 1.38 by the unbiased spread)', () => {
    const n = tailOf(m('normal', OXYGEN), undefined, 2), l = tailOf(m('lognormal', OXYGEN), undefined, 2), w = tailOf(m('weibull', OXYGEN), undefined, 2), e = tailOf(m('exponential', OXYGEN), undefined, 2);
    expect(n.p99865).toBeCloseTo(1.1562948, 5); expect(n.p00135).toBeCloseTo(-0.4282948, 5);
    expect(l.p99865).toBeCloseTo(1.3776465, 5); expect(l.p50).toBeCloseTo(0.31356296, 6); expect(l.p00135).toBeCloseTo(0.07136935, 6);
    expect(w.p99865).toBeCloseTo(1.3203875514, 6); expect(e.p99865).toBeCloseTo(2.4051848, 5);
    expect(l.above).toBeCloseTo(8.649e-5, 7); expect(w.above).toBeCloseTo(2.37495e-6, 9); expect(e.above).toBeCloseTo(0.0041093, 6);
    expect(n.ppk).toBeCloseTo(2.0648880, 5); expect(l.ppk).toBeCloseTo(1.5848728, 5); expect(w.ppk).toBeCloseTo(1.6851354821, 6); expect(e.ppk).toBeCloseTo(0.8117907, 4);
    expect(l.side).toBe('high'); expect(l.below).toBeUndefined();
  });
  it('stops at least 10 minutes: the share short, and the lower index', () => {
    const w = tailOf(m('weibull', STOPS), 10, undefined), n = tailOf(m('normal', STOPS), 10, undefined);
    expect(w.below).toBeCloseTo(0.1199105715, 7); expect(w.ppk).toBeCloseTo(0.6901356002, 6); expect(w.side).toBe('low');
    expect(n.below).toBeCloseTo(0.1393618, 6); expect(n.ppk).toBeCloseTo(0.3610665, 5);
    expect(tailOf(m('lognormal', STOPS), 10).below).toBeCloseTo(0.1457422, 6);
  });
  it('fills between 247 and 253: both sides, the smaller index is Ppk', () => {
    const t = tailOf(m('normal', FILLS), 247, 253);
    expect(t.below).toBeCloseTo(0.0047403, 6); expect(t.above).toBeCloseTo(0.0003765, 6); expect(t.out).toBeCloseTo(0.0051168, 6);
    expect(t.ppl).toBeCloseTo(0.8647455, 5); expect(t.ppu).toBeCloseTo(1.1231752, 5); expect(t.ppk).toBeCloseTo(0.8647455, 5); expect(t.side).toBe('low');
  });
  it('cdf and quantile are inverses', () => {
    for (const id of ['normal', 'lognormal', 'weibull', 'exponential'] as const) for (const p of [0.01, 0.3, 0.5, 0.9, 0.9987]) {
      const mod = m(id, STOPS); expect(cdf(mod, quantileOf(mod, p))).toBeCloseTo(p, 6);
    }
  });
});

describe('the probability plot', () => {
  it('each sorted reading against the shape’s quantile at (i − 0.5) ÷ n', () => {
    const pts = probabilityPlot(m('lognormal', OXYGEN), OXYGEN);
    expect(pts).toHaveLength(30);
    expect(pts[0][0]).toBeCloseTo(0.10973, 4); expect(pts[1][0]).toBeCloseTo(0.13928, 4); expect(pts[2][0]).toBeCloseTo(0.15848, 4); expect(pts[29][0]).toBeCloseTo(0.896, 3);
    expect(pts[0][1]).toBe(0.18); expect(pts[29][1]).toBe(1.41);
    expect(probabilityPlot(m('normal', FILLS), FILLS)[0][0]).toBeCloseTo(247.35496, 4);
    expect(probabilityPlot(m('weibull', STOPS), STOPS)[39][0]).toBeCloseTo(108.1021634, 4);
  });
});
