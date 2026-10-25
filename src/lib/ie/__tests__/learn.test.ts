/* The learning curve (FC-027) — every expected number is SciPy's, printed by scripts/knowledge/cases-w3c.py (the record's eight runs, ie.learning-curve). */
import { describe, it, expect } from 'vitest';
import { learningCurve } from '../learn';

const RUNS = [68, 58, 53, 49, 47, 45, 44, 43];
const FLAT = [68, 58, 53, 49, 47, 46, 46, 46, 46, 46, 46, 46];

describe('Wright’s unit-time curve on the record’s eight runs', () => {
  const l = learningCurve(RUNS, 0.95, 40)!;
  it('Tₙ = 67.686 · n^−0.22394: an 85.6% curve, R² 0.9976', () => {
    expect(l.b).toBeCloseTo(-0.22394274177010756, 9); expect(l.t1).toBeCloseTo(67.686437482216, 8); expect(l.rate).toBeCloseTo(0.8562222659473, 9); expect(l.r2).toBeCloseTo(0.9975881017107122, 9);
  });
  it('the rate with its 95% interval: 84.97% to 86.28%', () => {
    expect(l.rateLo).toBeCloseTo(0.849718858636472, 8); expect(l.rateHi).toBeCloseTo(0.8627754477290845, 8);
  });
  it('run 16 at 36.38 s, run 32 at 31.15 s; the 40 s standard is reached at run 11 (10.47 rounded up)', () => {
    expect(l.at(16)).toBeCloseTo(36.378746144469844, 8); expect(l.at(32)).toBeCloseTo(31.148292456139576, 8); expect(l.at(11)).toBeCloseTo(39.563009784503116, 8);
    expect(l.nStar).toBe(11); expect(l.far).toBe(false); expect(l.reached).toBeUndefined();
  });
  it('the first eight average 50.875 s — plan them there, not at the standard', () => { expect(l.cumAvg).toBe(50.875); });
  it('the time over the standard to run 11, summed: 88.77 s a unit', () => { expect(l.extra).toBeCloseTo(88.76810225811843, 8); });
  it('still falling: no plateau', () => { expect(l.plateau).toBeUndefined(); });
});

describe('a curve that flattens above the standard', () => {
  const l = learningCurve(FLAT, 0.95, 40)!;
  it('the last four runs do not fall: the slope is 0 (SciPy), the curve is flagged', () => { expect(l.plateau?.slope).toBeCloseTo(0, 12); expect(l.b).toBeCloseTo(-0.1552489828142594, 9); expect(l.r2).toBeCloseTo(0.8859537907843729, 9); });
  it('a standard already reached is the run it was reached at', () => {
    const r = learningCurve(RUNS, 0.95, 46)!; expect(r.reached).toBe(6);
  });
});

describe('what it will not do', () => {
  it('under six runs, a zero or negative time, no spread: nothing', () => {
    expect(learningCurve([68, 58, 53, 49, 47], 0.95, 40)).toBeUndefined(); expect(learningCurve([68, 58, 53, 0, 47, 45], 0.95)).toBeUndefined(); expect(learningCurve([50, 50, 50, 50, 50, 50], 0.95)).toBeUndefined();
  });
  it('a time that is not falling never reaches a standard below it; far beyond the runs timed is a guess', () => {
    expect(learningCurve([50, 51, 50, 52, 51, 53, 52, 54], 0.95, 40)?.nStar).toBeUndefined();
    const slow = learningCurve([100, 99, 98.5, 98, 97.8, 97.5, 97.2, 97], 0.95, 40)!;
    expect(slow.far).toBe(true); expect(slow.extra).toBeUndefined();
  });
  it('a standard above the first run’s time is already met', () => { expect(learningCurve(RUNS, 0.95, 80)?.reached).toBe(1); expect(learningCurve(RUNS, 0.95, 80)?.nStar).toBeUndefined(); });
});
