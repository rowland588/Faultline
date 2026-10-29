import { describe, expect, it } from 'vitest';
import { pNoDemand, poissonStockLevel, sparesDemandMu, sparesDemandPerHour, stockOutRisk } from '../spares';

/* scripts/knowledge/cases-maintenance.py — seal-jaw heater, MTBF 1,100 h, 4 installed, lead 504 h */
const MTBF = 1100;
const N = 4;
const L = 504;
const MU = 1.83;

describe('spares (FC-066)', () => {
  it('demand μ matches the independent case', () => {
    const rate = sparesDemandPerHour(MTBF, N);
    expect(rate * L).toBeCloseTo(MU, 2);
  });

  it('stock for 90% and 95% is 4 with service ≈ 0.961', () => {
    const mu = sparesDemandMu(sparesDemandPerHour(MTBF, N), L);
    for (const sl of [0.9, 0.95]) {
      const { stock, serviceAchieved } = poissonStockLevel(mu, sl);
      expect(stock).toBe(4);
      expect(serviceAchieved).toBeCloseTo(0.9612, 3);
    }
  });

  it('stock for 99% is 6', () => {
    const mu = sparesDemandMu(sparesDemandPerHour(MTBF, N), L);
    const { stock, serviceAchieved } = poissonStockLevel(mu, 0.99);
    expect(stock).toBe(6);
    expect(serviceAchieved).toBeCloseTo(0.9972, 3);
  });

  it('with zero held, P(no demand) ≈ 0.160', () => {
    const mu = sparesDemandMu(sparesDemandPerHour(MTBF, N), L);
    expect(pNoDemand(mu)).toBeCloseTo(0.16, 2);
    expect(stockOutRisk(mu, 0)).toBeCloseTo(1 - pNoDemand(mu), 4);
  });
});
