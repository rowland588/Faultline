/* Is the gauge fit (FC-119, FC-120) — the sentences, tones, refusals and money of the Analysis tool's gauge question. The figures under them are
 * proved against NumPy/SciPy in src/lib/ie/__tests__/gauge.test.ts (scripts/knowledge/cases-w3c.py). */
import { describe, it, expect } from 'vitest';
import { analysisClosing, analysisFigures, analysisGrids, analysisPicture, analysisPlot, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';

const rs = (vs: number[], w?: number): StudyReading[] => vs.map((value, i) => ({ id: `r${i}${w ?? ''}`, value, at: i, ...(w !== undefined ? { with: w } : {}) }));
const GOOD = [500.09, 500.14, 500.17, 500.04, 500.18, 500.14, 500.18, 500.14, 500.21, 500.04, 500.26, 500.22, 500.07, 500.17, 500.16, 499.98, 500.17, 500.07, 500.1, 500.07, 500.09, 500.13, 500.13, 500.0, 500.1, 500.01, 500.02, 500.09, 500.19, 500.17, 500.07, 500.06, 500.05, 500.13, 500.19, 500.12, 500.18, 500.15, 500.24, 499.96, 499.95, 500.1, 500.17, 500.09, 500.15, 500.03, 500.02, 500.06, 500.19, 500.18];
const WORN = [501.9, 501.7, 500.9, 501.6, 500.2, 498.9, 502.7, 501.4, 498.6, 499.7, 500.2, 501.3, 502.4, 501.2, 500.4, 501.4, 500.7, 501.1, 500.2, 499.6, 502.3, 500.5, 501.0, 500.2, 500.3, 500.5, 501.6, 502.2, 501.5, 500.3];
const READS: Record<number, number[]> = {
  0: [-0.22, -0.28, -0.02, -0.29, -0.36, -0.07, -0.05, -0.26, -0.22, 0.18], 20: [19.81, 19.87, 20.07, 20.02, 20.12, 20.03, 19.88, 19.94, 19.86, 20.03],
  40: [40.07, 39.86, 40.07, 39.91, 40.02, 39.96, 40.04, 39.7, 40.06, 39.84], 60: [60.23, 59.95, 60.03, 60.0, 60.12, 60.22, 60.12, 60.09, 60.11, 60.08],
  80: [80.18, 80.08, 80.15, 80.35, 80.3, 79.97, 80.14, 80.19, 80.11, 80.09] };
const DAILY = [60.09, 60.14, 60.08, 60.08, 60.14, 60.14, 60.12, 59.95, 60.03, 60.06, 60.16, 60.09, 60.05, 60.13, 60.12, 59.98, 60.14, 60.05, 60.41, 60.44, 60.29, 60.51, 60.29, 60.48, 60.45];
const T1: AgreedAnalysis = { kind: 'gauge', name: 'Bench scale', unit: 'g', gauge: { mode: 'repeat', reference: 500, lower: 495, upper: 505 } };
const RANGE: AgreedAnalysis = { kind: 'gauge', name: 'Probe', unit: '°C', gauge: { mode: 'range', limit: 75 } };
const rangeReads = (refs = [0, 20, 40, 60, 80]): StudyReading[] => refs.flatMap(r => rs(READS[r], r));
const say = (a: AgreedAnalysis, r: StudyReading[]) => { const f = analysisFigures(a, r); return { f, s: analysisSays(f, a) }; };

describe('the Type 1 study', () => {
  it('fit: green, Cg and Cgk against the need, the share of the tolerance, a real bias that is small', () => {
    const { s } = say(T1, rs(GOOD));
    expect(s.verdict).toBe('Fit'); expect(s.tone).toBe('g');
    expect(s.text).toBe('Bench scale: Cg 4.54 and Cgk 4.03 against 1.33 — fit for a 10 g tolerance: its spread (6s = 0.441 g) uses 4.4% of it. It reads 0.112 g high (we can be 95% confident between 0.0915 and 0.133 g) — a real bias, small against the tolerance; correct it at the next calibration.');
  });
  it('not fit: red, the spread uses more than the slice it may', () => {
    const { s } = say(T1, rs(WORN));
    expect(s.verdict).toBe('Not fit'); expect(s.tone).toBe('r');
    expect(s.text).toBe('Bench scale is not fit for a 10 g tolerance: its spread (6s = 5.96 g) uses 59.6% of it, more than the 20% it may — Cg 0.34 and Cgk 0.04 against 1.33. Repair or replace it before any study that depends on it.');
  });
  it('biased: Cg passes, Cgk does not — amber', () => {
    const { s } = say(T1, rs(GOOD.map(x => Math.round((x + 0.9) * 100) / 100)));
    expect(s.verdict).toBe('Biased — correct it'); expect(s.tone).toBe('a');
    expect(s.text).toMatch(/^Bench scale repeats well \(Cg 4\.54\) but reads 1\.01 g high: the bias takes Cgk to −0\.06, under 1\.33/);
  });
  it('the slice and the need agreed otherwise move the indices (30% and 1.0: Cg = 0.3 × 10 ÷ (6 × 0.07342) = 6.81)', () => {
    const { s } = say({ ...T1, gauge: { ...T1.gauge!, slice: 0.3, need: 1 } }, rs(GOOD));
    expect(s.text).toMatch(/Cg 6\.81 and Cgk 6\.30 against 1 — fit/);
  });
  it('too few, none, no spread and the refusals', () => {
    expect(say(T1, []).s).toMatchObject({ verdict: 'Not started', tone: 'n' });
    expect(say(T1, rs(GOOD.slice(0, 6))).s).toMatchObject({ verdict: 'Too few', text: '6 readings — a Type 1 study is read from 10; 25 to 50 is usual.' });
    expect(say(T1, rs([500, 500, 500, 500, 500, 500, 500, 500, 500, 500])).s.verdict).toBe('Nothing to test');
    expect(say({ ...T1, gauge: { mode: 'repeat', lower: 495, upper: 505 } }, rs(GOOD)).s.text).toBe('The reference’s true value — the number on its certificate.');
    expect(analysisProblem({ ...T1, gauge: { mode: 'repeat', reference: 500 } })).toBe('What it judges — a lower and an upper limit, so the tolerance can be worked out.');
    expect(analysisProblem({ ...T1, gauge: { mode: 'repeat', reference: 500, lower: 495 } })).toBe('One limit needs the target it is measured from — the tolerance is twice the distance between them.');
    expect(analysisProblem({ ...T1, gauge: { mode: 'repeat', reference: 500, lower: 505, upper: 495 } })).toBe('The upper limit has to be above the lower.');
    expect(analysisProblem({ ...T1, gauge: { ...T1.gauge!, slice: 1.5 } })).toMatch(/above 0% and up to 100%/);
    expect(analysisProblem({ ...T1, name: ' ' })).toBe('Which gauge — a name, "Bench scale".');
    expect(analysisProblem({ ...T1, gauge: { ...T1.gauge!, baseline: 3 }  })).toBe('');   // the baseline only matters for a drift
    expect(analysisProblem({ ...RANGE, gauge: { mode: 'drift', baseline: 3 } })).toMatch(/at least 8 first checks/);
  });
  it('one limit and the target: twice the distance is the tolerance', () => {
    const { f } = say({ ...T1, gauge: { mode: 'repeat', reference: 500, upper: 505, target: 500 } }, rs(GOOD));
    expect(f.kind === 'gauge' && f.T).toBe(10);
  });
  it('a coarse step is said; fine is said too; the order check only from 30', () => {
    const coarse = rs([500, 501, 500, 500, 501, 500, 500, 501, 500, 500, 501, 500]);
    const { f } = say({ ...T1, gauge: { ...T1.gauge!, upper: 505, lower: 497 } }, coarse);
    expect(f.checks.map(c => c.say).join(' ')).toMatch(/Least count: 1 g \(the smallest step the readings show\) is 12.5% of the tolerance — too coarse \(over 5\.0%\)/);
    expect(say(T1, rs(GOOD.slice(0, 20))).f.checks.some(c => c.what === 'Order')).toBe(false);
  });
  it('the picture: three lanes on a zero line; the tiles and the closing line', () => {
    const f = analysisFigures(T1, rs(GOOD)), s = analysisSays(f, T1);
    const lanes = analysisPicture(f, T1);
    expect(lanes.map(l => l.label)).toEqual(['Each reading', 'Its 6s', 'May use 20%']); expect(lanes.every(l => l.zero)).toBe(true);
    expect(analysisTiles(f, T1).map(t => t.k)).toEqual(['Readings', 'Bias', 'Cg', 'Cgk', 'Uses of tolerance', 'In money']);
    expect(analysisClosing(f, T1, s).text).toBe('Fit — Bench scale, 95% confidence.');
  });
});

describe('the money of a bias (knowledge/MONEY.md FC-119/120)', () => {
  const MONEY = { ...T1, gauge: { ...T1.gauge!, packsPerShift: 3000, shiftsPerWeek: 10, costPerKg: 2.4 } };
  const LOW = GOOD.map(x => Math.round((x - 0.4) * 100) / 100);
  it('a scale that reads low gives away: kilos a shift, pounds a shift and a week, with the because', () => {
    const { s } = say(MONEY, rs(LOW));
    expect(s.more.join(' ')).toContain('In money: Bench scale reads 0.288 g low, so packs set by it run that much heavier than they read — 0.86 kg of product a shift (3,000 packs), £2 a shift, £21 a week at £2.40 a kilo — because of the bias.');
  });
  it('a missing input is named and nothing blocks', () => {
    expect(say({ ...MONEY, gauge: { ...MONEY.gauge!, costPerKg: undefined } }, rs(LOW)).s.more.join(' ')).toMatch(/give-away: 0\.86 kg a shift of 3,000 packs — give £ a kg to say it in money\./);
    expect(say({ ...MONEY, gauge: { ...MONEY.gauge!, packsPerShift: undefined } }, rs(LOW)).s.more.join(' ')).toMatch(/give the packs a shift to say it in money\./);
    expect(say({ ...MONEY, gauge: { ...MONEY.gauge!, packsPerShift: undefined } }, rs(LOW)).s.verdict).toBe('Fit');
  });
  it('a scale that reads high is short weight — never priced', () => {
    const { s, f } = say(MONEY, rs(GOOD));
    expect(s.more.join(' ')).toContain('short weight, which is not a saving and is not priced here');
    expect(s.more.join(' ')).not.toMatch(/£\d/);
    expect(f.kind === 'gauge' && f.money?.dir).toBe('high');
  });
  it('a probe, or a bias not shown: no money at all', () => {
    const probe = say({ ...T1, name: 'Probe', unit: '°C', gauge: { ...T1.gauge!, reference: 75, lower: 70, upper: 80 } }, rs([75.1, 75.2, 75.0, 75.1, 75.3, 75.1, 75.2, 75.0, 75.1, 75.2, 75.1, 75.3]));
    expect(probe.s.more.join(' ')).not.toMatch(/In money/);
    const none = say(MONEY, rs([500.01, 499.99, 500.02, 499.98, 500.0, 500.01, 499.99, 500.0, 500.02, 499.98]));
    expect(none.s.more.join(' ')).not.toMatch(/In money/);
  });
});

describe('bias and linearity', () => {
  it('five references: the bias changes with the size — amber, one offset will not fix it, the true value at 75', () => {
    const { s } = say(RANGE, rangeReads());
    expect(s.verdict).toBe('The bias changes with size'); expect(s.tone).toBe('a');
    expect(s.text).toBe('Probe reads 0.159 °C low at 0 and 0.156 °C high at 80 — the bias changes with the size (0.00381 °C more for every extra 1 °C of the reference; we can be 95% confident between 0.00194 and 0.00568, p = 0.0074): one offset will not fix it. At 75 °C, the limit that matters, the line gives +0.135 °C: a reading of 75 means product at 74.865 °C.');
  });
  it('three references: a bias seen, no line yet; reads true when nothing is shown', () => {
    expect(say(RANGE, rangeReads([0, 20, 40])).s).toMatchObject({ verdict: 'Bias shown, no line yet', tone: 'a' });
    const flat = [1, 2, 5, 10].flatMap(r => rs([0.02, -0.03, 0.01, -0.02, 0.03, -0.01, 0.0, 0.02, -0.02, 0.01].map(e => +(r + e).toFixed(2)), r));
    expect(say({ ...RANGE, gauge: { mode: 'range' } }, flat).s).toMatchObject({ verdict: 'Reads true', tone: 'g' });
  });
  it('a constant offset: real at every reference, no slope — one offset fixes it', () => {
    const c = [0, 25, 50, 75, 100].flatMap(r => rs([0.31, 0.29, 0.30, 0.32, 0.28, 0.30].map(e => +(r + e).toFixed(2)), r));
    expect(say({ ...RANGE, gauge: { mode: 'range' } }, c).s).toMatchObject({ verdict: 'One offset fixes it', tone: 'a' });
  });
  it('a limit outside the references is not read off the line; a reference of two readings is left out, said', () => {
    const f = analysisFigures({ ...RANGE, gauge: { mode: 'range', limit: 120 } }, rangeReads());
    expect(f.checks.map(c => c.say).join(' ')).toContain('Limit: 120 °C is outside the references measured (0–80)');
    expect(analysisSays(f, RANGE).text).not.toContain('the line gives');
    const g = analysisFigures(RANGE, [...rangeReads(), ...rs([100.2, 100.1], 100)]);
    expect(g.checks.map(c => c.say).join(' ')).toContain('Too few: 100 (2) has fewer than 5 readings, so it is left out until there are more.');
  });
  it('the table of references and the scatter', () => {
    const f = analysisFigures(RANGE, rangeReads()), grid = analysisGrids(f, RANGE)[0];
    expect(grid.head).toEqual(['Reference', 'Readings', 'Mean', 'Bias', 't', 'p', 'Real?']);
    expect(grid.rows.map(r => r[3])).toEqual(['−0.159', '−0.037', '−0.047', '+0.095', '+0.156']); expect(grid.rows.map(r => r[6])).toEqual(['real', 'not shown', 'not shown', 'real', 'real']);
    const plot = analysisPlot(f, RANGE);
    expect(plot).toMatchObject({ kind: 'scatter', xName: 'Reference', yName: 'Bias' }); expect(plot?.kind === 'scatter' && plot.pts.length).toBe(50);
    expect(plot?.kind === 'scatter' && plot.band?.length).toBe(25);
  });
  it('none typed, and a reading with no reference is not a range reading', () => {
    expect(say(RANGE, []).s.verdict).toBe('Not started');
    expect(say(RANGE, rs(GOOD)).s.verdict).toBe('Not started');
  });
});

describe('stability', () => {
  const DRIFT: AgreedAnalysis = { kind: 'gauge', name: 'Check weight', unit: 'g', gauge: { mode: 'drift', reference: 60, baseline: 18 } };
  it('drifted from check 19 — red, with the limits from the first 18, the first signal and the trend', () => {
    const { s } = say(DRIFT, rs(DAILY));
    expect(s.verdict).toBe('Drifted from check 19'); expect(s.tone).toBe('r');
    expect(s.text).toBe('Check weight drifted up: the first 18 checks put the limits at 59.905 to 60.268 g (centre 60.086 g, +0.0861 g against the reference). From check 19 it signals — 7 checks are beyond the upper limit. Product measured since check 18 is worth reviewing.');
    expect(s.more.join(' ')).toContain('Kendall’s τ 0.38, p = 0.0087; Sen’s slope +0.0124 g a check (rising).');
  });
  it('steady: green; too few: neutral', () => {
    expect(say(DRIFT, rs(DAILY.slice(0, 18))).s).toMatchObject({ verdict: 'Steady', tone: 'g' });
    expect(say(DRIFT, rs(DAILY.slice(0, 7))).s).toMatchObject({ verdict: 'Too few', text: '7 checks — at least 8 are needed to draw limits (20 usual).' });
  });
  it('limits from a baseline that was not steady are said', () => {
    const bad = rs([60.1, 60.12, 60.08, 60.1, 60.11, 60.09, 60.1, 60.12, 60.5, 60.51, 60.52, 60.5, 60.51, 60.52, 60.5, 60.51, 60.5, 60.52, 60.51, 60.5]);
    const f = analysisFigures({ ...DRIFT, gauge: { mode: 'drift', reference: 60, baseline: 8 } }, bad);
    expect(f.checks.some(c => c.what === 'Size')).toBe(false);
    const g = analysisFigures({ ...DRIFT, gauge: { mode: 'drift', reference: 60, baseline: 12 } }, bad);
    expect(g.checks.map(c => c.say).join(' ')).toMatch(/Baseline: the first 12 checks signal at check/);
  });
  it('the chart: the checks, the centre, the limits as a band', () => {
    const plot = analysisPlot(analysisFigures(DRIFT, rs(DAILY)), DRIFT);
    expect(plot).toMatchObject({ kind: 'scatter', xName: 'Check' });
    expect(plot?.kind === 'scatter' && plot.pts.length).toBe(25); expect(plot?.kind === 'scatter' && plot.line).toEqual([[1, expect.closeTo(60.0861111, 5)], [25, expect.closeTo(60.0861111, 5)]]);
    expect(plot?.kind === 'scatter' && plot.band?.[0]).toMatchObject({ lo: expect.closeTo(59.9046052, 5), hi: expect.closeTo(60.2676170, 5) });
  });
});
