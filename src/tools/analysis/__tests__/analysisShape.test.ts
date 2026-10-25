/* Which shape fits (FC-114) — the sentences, tones, refusals and tables of the Analysis tool's shape question. The figures under them are SciPy's
 * (src/lib/ie/__tests__/fit.test.ts, scripts/knowledge/cases-w3c.py). */
import { describe, it, expect } from 'vitest';
import { analysisClosing, analysisFigures, analysisGrids, analysisPlot, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';

const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i}`, value, at: i }));
const OXYGEN = [0.21, 0.35, 0.18, 0.42, 0.27, 0.31, 0.95, 0.24, 0.19, 0.33, 0.29, 0.22, 1.41, 0.26, 0.38, 0.2, 0.25, 0.3, 0.23, 0.61, 0.28, 0.21, 0.34, 0.27, 0.19, 0.45, 0.24, 0.32, 0.22, 0.8];
const STOPS = [18.4, 78.4, 15.1, 14.5, 23.6, 17.3, 42.7, 10.8, 66.7, 60.8, 1.0, 34.2, 10.2, 18.8, 27.2, 29.2, 30.0, 73.1, 18.8, 15.0, 42.7, 78.3, 72.0, 64.0, 7.4, 75.4, 41.2, 62.7, 26.7, 16.7, 53.1, 42.1, 51.7, 15.7, 11.9, 50.3, 3.5, 78.0, 12.0, 37.9];
const FILLS = [249.0, 248.4, 249.7, 250.5, 251.4, 250.1, 249.3, 249.1, 250.9, 252.0, 250.3, 248.5, 248.9, 251.9, 250.2, 247.9, 249.9, 248.6, 249.2, 249.4, 249.1, 250.7, 249.9, 249.3, 250.5, 251.0, 248.0, 249.7, 248.8, 249.8, 248.5, 250.0, 250.0, 249.6, 248.7, 249.5, 248.7, 248.4, 250.3, 248.7];
const STOP: AgreedAnalysis = { kind: 'shape', name: 'Minutes between stops', unit: 'min', shape: { lower: 10 } };
const O2: AgreedAnalysis = { kind: 'shape', name: 'Residual oxygen', unit: '%', shape: { upper: 2 } };
const FILL: AgreedAnalysis = { kind: 'shape', name: 'Fill', unit: 'g', shape: { lower: 247, upper: 253 } };
const say = (a: AgreedAnalysis, r: StudyReading[]) => { const f = analysisFigures(a, r); return { f, s: analysisSays(f, a) }; };

describe('a shape found', () => {
  it('the stops: the Weibull leads, neutral, the other three said not to fit, the share beside the count', () => {
    const { s, f } = say(STOP, rs(STOPS));
    expect(s.verdict).toBe('Follows a Weibull'); expect(s.tone).toBe('n');
    expect(s.text).toBe('Minutes between stops: a Weibull fits (Anderson–Darling p = 0.15, the lowest AIC). The normal (p = 0.0038), the lognormal (p = 0.024) and the exponential (p = 0.023) do not. Under the Weibull, about 12 in 100 would be under 10 min; as counted, 3 of 40 are under 10 min (we can be 95% confident the true share is fewer than 19 in 100).');
    expect(s.more[0]).toBe('Weibull: shape β 1.49 (above 1: gaps that wear out — long ones more likely than short), scale η 39.97 min (63% of the set falls below it).');
    expect(s.more.join(' ')).toContain('Percentile Ppk 0.69');
    expect(f.kind === 'shape' && f.usualPpk).toBeCloseTo(0.3611, 3);
  });
  it('the fills: the normal fits and is kept — green; the lognormal fits about as well', () => {
    const { s } = say(FILL, rs(FILLS));
    expect(s.verdict).toBe('Bell-shaped'); expect(s.tone).toBe('g');
    expect(s.text).toContain('a normal fits (Anderson–Darling p = 0.53) — bell-shaped enough for the usual Ppk.');
    expect(s.more.join(' ')).toContain('The lognormal fits about as well (p = 0.55, AIC within 2 of the normal)');
  });
  it('the oxygen: none fits — amber, the nearest named, the tail read from the count', () => {
    const { s } = say(O2, rs(OXYGEN));
    expect(s.verdict).toBe('No shape fits'); expect(s.tone).toBe('a');
    expect(s.text).toBe('Residual oxygen: none of the 4 shapes tried fits these readings (the lognormal is nearest, p = 0.0006) — read the tail from the count, not from a model: as counted, 0 of 30 are over 2 % (we can be 95% confident the true share is fewer than 10 in 100).');
  });
  it('with no limit named, the page asks for one to show the count', () => {
    expect(say({ ...O2, shape: {} }, rs(OXYGEN)).s.text).toMatch(/\(name a limit to see the count\)\.$/);
    expect(say({ ...STOP, shape: {} }, rs(STOPS)).s.text).not.toMatch(/as counted/);
  });
});

describe('what stops a shape being fitted', () => {
  it('none, too few, no spread, an upper limit below the lower, no name', () => {
    expect(say(STOP, []).s).toMatchObject({ verdict: 'Not started' });
    expect(say(STOP, rs(STOPS.slice(0, 15))).s).toMatchObject({ verdict: 'Too few', text: '15 readings — a shape is fitted from 20; 30 or more is better and 50 tells a lognormal from a Weibull.' });
    expect(say(STOP, rs(Array(25).fill(5))).s).toMatchObject({ verdict: 'Nothing to fit' });
    expect(analysisProblem({ ...STOP, shape: { lower: 10, upper: 5 } })).toBe('The upper limit has to be above the lower.');
    expect(analysisProblem({ ...STOP, name: '' })).toBe('What is measured — a name, "Residual oxygen".');
    expect(analysisProblem(STOP)).toBe('');
  });
  it('a reading of zero or less: three shapes not tried, said; the normal alone is in the table', () => {
    const { f } = say(O2, rs([...OXYGEN.slice(0, 29), 0]));
    const checks = f.checks.map(c => c.say).join(' ');
    expect(checks).toContain('Not tried: the lognormal — needs every reading above zero.'); expect(checks).toContain('Not tried: the Weibull'); expect(checks).toContain('Not tried: the exponential');
    expect(analysisGrids(f, O2)[0].rows.map(r => r[0])).toEqual(['normal']);
  });
  it('a set that is not steady, readings stepped coarsely, a small set, are said', () => {
    expect(say(O2, rs(OXYGEN)).f.checks.map(c => c.say).join(' ')).toContain('Not steady — reading 13 is outside');
    const coarse = rs([5, 6, 5, 7, 6, 5, 6, 7, 5, 6, 6, 5, 7, 6, 5, 6, 6, 7, 5, 6, 6, 5, 6, 7, 6]);
    expect(say({ ...STOP, shape: {} }, coarse).f.checks.map(c => c.say).join(' ')).toMatch(/Coarse: the readings step by 1 min/);
    expect(say(STOP, rs(STOPS.slice(0, 25))).f.checks.map(c => c.say).join(' ')).toMatch(/Size: 25 readings — a shape is read from 30/);
    expect(say(STOP, rs(STOPS)).f.checks.map(c => c.say).join(' ')).toMatch(/Size: 40 readings — enough to tell a normal from a lognormal, rarely a lognormal from a Weibull/);
  });
});

describe('the table, the plot, the tiles', () => {
  it('a row a shape; the leader’s row marked; a shape rejected says so', () => {
    const f = analysisFigures(STOP, rs(STOPS)), g = analysisGrids(f, STOP)[0];
    expect(g.head).toEqual(['Shape', 'Fit', 'A–D p', 'AIC', 'Median', '99.865th', 'Beyond', 'Ppk']);
    expect(g.rows.map(r => [r[0], r[1], r[3]])).toEqual([['normal', 'rejected', '371.5'], ['lognormal', 'rejected', '373.1'], ['Weibull', 'leads', '363.2'], ['exponential', 'rejected', '369.2']]);
    expect(g.mark).toEqual([2]);
    expect(analysisGrids(analysisFigures(O2, rs(OXYGEN)), O2)[0].mark).toEqual([]);
  });
  it('the probability plot is the leader’s (or the nearest’s), on a line of equal values', () => {
    const p = analysisPlot(analysisFigures(STOP, rs(STOPS)), STOP);
    expect(p).toMatchObject({ kind: 'scatter', xName: 'Expected under the Weibull', equal: true }); expect(p?.kind === 'scatter' && p.pts.length).toBe(40);
    expect(analysisPlot(analysisFigures(O2, rs(OXYGEN)), O2)).toMatchObject({ xName: 'Expected under the lognormal' });
    expect(analysisPlot(analysisFigures(STOP, rs(STOPS.slice(0, 10))), STOP)).toBeUndefined();
  });
  it('the tiles and the closing line', () => {
    const f = analysisFigures(STOP, rs(STOPS)), s = analysisSays(f, STOP);
    expect(analysisTiles(f, STOP).map(t => [t.k, t.v])).toEqual([['Readings', '40'], ['Shape', 'Weibull'], ['Fit', '0.15'], ['99.865th point', '142.54 min'], ['Beyond the limit', '12 in 100']]);
    expect(analysisClosing(f, STOP, s).text).toBe('Follows a Weibull — Minutes between stops, 95% confidence.');
  });
  it('99% confidence widens the bound on the count', () => {
    const t95 = say(STOP, rs(STOPS)).s.text, t99 = say({ ...STOP, confidence: 0.99 }, rs(STOPS)).s.text;
    expect(t95).toContain('95% confident the true share is fewer than 19 in 100'); expect(t99).toMatch(/99% confident the true share is fewer than 2\d in 100/);
  });
});
