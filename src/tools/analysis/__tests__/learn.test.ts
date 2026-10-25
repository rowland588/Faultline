/* THE LEARNING CURVE (FC-027, knowledge/specs/FC-027-learning-curve.md) — Wright's unit-time form fitted by ln T on ln n.
 * Every number is from scripts/knowledge/cases-time.py §8 and §8b (NumPy and SciPy), never from this code's own output. */
import { describe, it, expect } from 'vitest';
import { analysisClosing, analysisFigures, analysisPlot, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';
import type { LearnFigures } from '../learn';

const reading = (value: number, i: number, struck = false): StudyReading => ({ id: `r${i}`, at: i, value, ...(struck ? { struck: true } : {}) });
const readings = (xs: number[]) => xs.map((v, i) => reading(v, i));
const EIGHT = [68, 58, 53, 49, 47, 45, 44, 43];
const agreed = (learn?: AgreedAnalysis['learn']): AgreedAnalysis => ({ kind: 'learn', name: 'Pack a case', unit: 's', confidence: 0.95, ...(learn ? { learn } : {}) });
const fig = (a: AgreedAnalysis, xs: number[], rate?: number) => analysisFigures(a, readings(xs), rate ? { rate } : {}) as LearnFigures;

describe('the learning curve', () => {
  it('the record’s eight runs: T = 67.69 × n^−0.22394, rate 85.62%, R² 0.9976, 95% interval 84.97% to 86.28%', () => {
    const f = fig(agreed({ standard: 40 }), EIGHT);
    expect(f.kind).toBe('learn');
    expect(f.b).toBeCloseTo(-0.22394, 4);
    expect(f.t1).toBeCloseTo(67.6864, 3);
    expect(f.rate).toBeCloseTo(0.85622, 4);
    expect(f.r2).toBeCloseTo(0.99759, 4);
    expect(f.rateLo).toBeCloseTo(0.8497, 3);
    expect(f.rateHi).toBeCloseTo(0.8628, 3);
    expect(f.falling).toBe(true);
    expect(f.enough).toBe(true);
    expect(f.weak).toBe(false);
  });
  it('the standard of 40 s is reached at run 11, by the slope’s interval between run 10 and run 12; no run read has got there yet', () => {
    const f = fig(agreed({ standard: 40 }), EIGHT);
    expect([f.reach?.run, f.reach?.lo, f.reach?.hi, f.reach?.actual, f.reach?.already, f.reach?.far]).toEqual([11, 10, 12, undefined, false, false]);
  });
  it('the fitted time at run 16 and run 32 — 36.379 and 31.148 s — are projections, not readings', () => {
    const f = fig(agreed({ standard: 40 }), EIGHT);
    expect(f.ahead.map(a => [a.run, +a.t.toFixed(3)])).toEqual([[16, 36.379], [32, 31.148]]);
  });
  it('plan the first 11 runs at 48.03 s on average, not 40; the eight read averaged 50.875 s', () => {
    const f = fig(agreed({ standard: 40 }), EIGHT);
    expect(f.plan?.upto).toBe(11);
    expect(f.plan?.avg).toBeCloseTo(48.03, 2);
    expect(f.plan?.readAvg).toBeCloseTo(50.875, 6);
  });
  it('what learning costs: 88.77 s a unit above the standard to run 11; 1,200 units a reading at £15 an hour is 29.59 hours, £443.84', () => {
    const f = fig(agreed({ standard: 40, perRun: 1200 }), EIGHT, 15);
    expect(f.extra?.seconds).toBeCloseTo(88.768, 2);
    expect(f.extra?.pounds).toBeCloseTo(443.84, 1);
    const said = analysisSays(f, agreed({ standard: 40, perRun: 1200 }));
    expect(said.more.join(' ')).toMatch(/29\.6 hours of one person’s time/);
    expect(said.more.join(' ')).toMatch(/£444 at the line’s rate, over 11 runs of 1200 units/);
  });
  it('the money names the one input it lacks: a wage, the units a reading stands for, or times in seconds or minutes', () => {
    expect(fig(agreed({ standard: 40, perRun: 1200 }), EIGHT).extra?.missing).toBe('Give the line a wage to say the learning in money.');
    expect(fig(agreed({ standard: 40 }), EIGHT, 15).extra?.missing).toMatch(/how many units each reading stands for/);
    expect(fig({ ...agreed({ standard: 40, perRun: 10 }), unit: 'h' }, EIGHT, 15).extra?.missing).toMatch(/seconds or minutes — these are in h/);
  });
  it('an exact 80% curve gives 80% to the decimal', () => {
    const exact = [1, 2, 3, 4, 5, 6, 7, 8].map(n => 100 * n ** Math.log2(0.8));
    const f = fig(agreed({ standard: 50 }), exact);
    expect(f.rate).toBeCloseTo(0.8, 6);
    expect(f.r2).toBeCloseTo(1, 6);
  });
  it('a struck run keeps its place and counts for nothing: run 3 struck leaves runs 1, 2, 4 … on the curve', () => {
    const rs = EIGHT.map((v, i) => reading(i === 2 ? 99 : v, i, i === 2));
    const f = analysisFigures(agreed({ standard: 40 }), rs) as LearnFigures;
    expect(f.runs.map(r => r.run)).toEqual([1, 2, 4, 5, 6, 7, 8]);
    expect(f.n).toBe(7);
    expect(f.rate).toBeCloseTo(0.8562, 2);
  });
  it('fewer than five runs: too few, nothing fitted; five to seven: fitted, said weak', () => {
    const few = fig(agreed(), EIGHT.slice(0, 4));
    expect([few.enough, few.rate]).toEqual([false, undefined]);
    expect(analysisSays(few, agreed()).verdict).toBe('Too few');
    const five = fig(agreed(), EIGHT.slice(0, 5));
    expect([five.enough, five.weak]).toEqual([true, true]);
    expect(five.checks.map(c => c.what)).toContain('Size');
  });
  it('a time of nought, or every run the same, is refused in words', () => {
    expect(fig(agreed(), [68, 0, 53, 49, 47, 45]).refusal).toMatch(/must be above 0/);
    expect(fig(agreed(), [50, 50, 50, 50, 50, 50]).refusal).toMatch(/same time/);
  });
  it('a time that is not falling is not called learning: the interval for the rate reaches 100%', () => {
    const f = fig(agreed({ standard: 40 }), [50, 52, 49, 51, 50, 52, 51, 50]);
    expect(f.falling).toBe(false);
    const s = analysisSays(f, agreed({ standard: 40 }));
    expect(s.verdict).toBe('Not shown to be falling');
    expect(s.tone).toBe('a');
  });
  it('already at the standard on the first run; a standard far off is a guess', () => {
    expect(fig(agreed({ standard: 80 }), EIGHT).reach).toMatchObject({ run: 1, already: true });
    const far = fig(agreed({ standard: 20 }), EIGHT);
    expect(far.reach?.far).toBe(true);
    expect(far.checks.map(c => c.what)).toContain('Far');
  });
  it('the words, the tiles, the closing line and the picture say it from one place', () => {
    const a = agreed({ standard: 40 }), f = fig(a, EIGHT);
    const said = analysisSays(f, a);
    expect(said.verdict).toBe('Learning at 86%');
    expect(said.text).toBe('8 runs: each time the runs double, the time falls to 85.6% of itself — we can be 95% confident the rate is between 85.0% and 86.3% (the curve explains 99.8% of the change). The 40.0 s standard is reached at about run 11 (between run 10 and run 12 by the slope’s interval).');
    expect(analysisTiles(f, a).map(t => t.v)).toEqual(['8', '85.6%', '99.8%', 'run 11', '48.0 s']);
    expect(analysisClosing(f, a, said).text).toBe('Learning at 86% — Pack a case, the standard at about run 11.');
    const plot = analysisPlot(f, a);
    expect(plot?.kind === 'scatter' && plot.pts.length === 8 && plot.curve && plot.curve.length >= 11 && plot.ref?.y === 40).toBe(true);
  });
  it('what was agreed is checked: a standard or a units figure that is not above 0 is refused', () => {
    expect(analysisProblem({ kind: 'learn', name: 'x', learn: { standard: 0 } })).toMatch(/standard/);
    expect(analysisProblem({ kind: 'learn', name: 'x', learn: { perRun: -1 } })).toMatch(/units/);
    expect(analysisProblem({ kind: 'learn', name: 'x', learn: { standard: 40, perRun: 100 } })).toBe('');
  });
});
