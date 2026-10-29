import { describe, expect, it } from 'vitest';
import {
  combineStandard,
  guardLower,
  testUncertaintyRatio,
  uFromCertificate,
  uRepeatability,
  uResolution,
  uncertaintyBudget,
} from '../uncertainty';

/* Independent literals from scripts/knowledge/cases-msa.py (msa.measurement-uncertainty). */
describe('uncertaintyBudget (FC-123)', () => {
  it('matches the bench scale single-reading case', () => {
    expect(uResolution(0.01)).toBeCloseTo(0.002886751, 6);
    expect(uRepeatability(0.08, 1)).toBeCloseTo(0.08, 6);
    expect(uFromCertificate(0.05, 2)).toBeCloseTo(0.025, 6);
    const r = uncertaintyBudget({
      resolution: 0.01,
      repeatability: 0.08,
      n: 1,
      certU: 0.05,
      certK: 2,
      k: 2,
    });
    expect(r.uc).toBeCloseTo(0.084, 3);
    expect(r.U).toBeCloseTo(0.17, 2);
    expect(r.dominant).toBe('Repeatability');
    expect(r.dominantSharePct).toBeGreaterThan(90);
  });

  it('matches the mean of ten readings', () => {
    const r = uncertaintyBudget({
      resolution: 0.01,
      repeatability: 0.08,
      n: 10,
      certU: 0.05,
      certK: 2,
      k: 2,
    });
    expect(r.U).toBeCloseTo(0.071, 2);
  });

  it('guard and TUR match the knowledge case', () => {
    const U = 0.17;
    expect(guardLower(400, U)).toBeCloseTo(400.17, 2);
    expect(testUncertaintyRatio(10, U)).toBeCloseTo(29.41, 0);
  });

  it('combineStandard sums squares', () => {
    expect(combineStandard([3, 4])).toBe(5);
  });
});
