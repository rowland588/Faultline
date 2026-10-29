import { describe, expect, it } from 'vitest';
import { CD_WORKED_MATRIX, cdLossTotal, cdMatrixTotal, cdPareto, cdProjectFigures, cdWork } from '../costDeployment';

describe('FC-057 cost deployment', () => {
  it('worked case £10,100', () => {
    expect(cdMatrixTotal(CD_WORKED_MATRIX)).toBe(10_100);
    expect(cdPareto(CD_WORKED_MATRIX)[0].loss).toBe('breakdowns');
  });
  it('SMED 60% → £1,140/week', () => {
    expect(cdProjectFigures(cdLossTotal(CD_WORKED_MATRIX, 'changeover'), { loss: 'changeover', recoveryShare: 60, cost: 28_000 }).weekly).toBeCloseTo(1140, 0);
  });
  it('empty matrix refused', () => expect('problems' in cdWork({ matrix: {} })).toBe(true));
});
