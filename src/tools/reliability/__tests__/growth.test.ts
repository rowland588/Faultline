import { describe, expect, it } from 'vitest';
import { GROWTH_MIN, growth, growthRows, growthSays, growthTile } from '../growth';

/* The independent numbers are scripts/knowledge/cases-w5.py's (SciPy/NumPy), the record's own fourteen failures. */
const REC = [12, 35, 61, 102, 148, 230, 310, 420, 560, 720, 980, 1250, 1600, 1900];

describe('Crow–AMSAA growth (FC-061)', () => {
  const g = growth(REC, 2000, 400);

  it('1 — β, λ, the unbiased β, the MTBFs and the growth rate are the independent ones', () => {
    expect(g.n).toBe(14);
    expect(g.beta).toBeCloseTo(0.50777, 4);
    expect(g.lambda).toBeCloseTo(0.295091, 4);
    expect(g.betaUnbiased).toBeCloseTo(0.4715, 4);
    expect(g.cumMtbfH).toBeCloseTo(142.857, 2);
    expect(g.instMtbfH).toBeCloseTo(281.341, 2);
    expect(g.growthRate).toBeCloseTo(0.49223, 4);
  });

  it('2 — the exact 90% interval on β, and improving beyond doubt', () => {
    expect(g.betaLo).toBeCloseTo(0.30698, 3);
    expect(g.betaHi).toBeCloseTo(0.74964, 3);
    expect(g.says).toBe('improving');
    expect(g.sure).toBe(true);
  });

  it('3 — the running time to reach 400 h, as an if; 281 h is already there', () => {
    expect(g.toTargetH).toBeCloseTo(4088.0, 0);
    expect(g.moreH).toBeCloseTo(2088.0, 0);
    expect(growth(REC, 2000, 281).reached).toBe(true);
    expect(growth(REC, 2000, 281).moreH).toBeUndefined();
  });

  it('4 — a steady-looking machine: the interval holds 1, so no sign yet, leaning worse', () => {
    const s = growth([30, 61, 88, 121, 150, 181, 212, 240, 272, 300], 310);
    expect(s.n).toBe(10);
    expect(s.beta).toBeCloseTo(1.21587, 4);
    expect(s.betaLo).toBeCloseTo(0.6597, 3);
    expect(s.betaHi).toBeCloseTo(1.9095, 3);
    expect(s.says).toBe('steady');
    expect(s.leans).toBe('worse');
    expect(s.sure).toBe(false);
  });

  it('5 — failures bunching late: getting worse, beyond doubt', () => {
    const w = growth([150, 400, 560, 700, 800, 880, 940, 980, 1010, 1040], 1050);
    expect(w.beta).toBeCloseTo(2.16371, 4);
    expect(w.betaLo).toBeCloseTo(1.1739, 3);
    expect(w.betaHi).toBeCloseTo(3.3982, 3);
    expect(w.says).toBe('worse');
    expect(w.sure).toBe(true);
  });

  it('6 — seven failures are not fitted, eight are (rough), twenty are not rough', () => {
    expect(growth(REC.slice(0, 7), 2000).beta).toBeUndefined();
    expect(growth(REC.slice(0, 7), 2000).enough).toBe('few');
    const eight = growth(REC.slice(0, GROWTH_MIN), 2000);
    expect(eight.beta).toBeDefined();
    expect(eight.enough).toBe('rough');
    const twenty = growth(Array.from({ length: 20 }, (_, i) => 20 + i * 50), 1100);
    expect(twenty.enough).toBe('enough');
  });

  it('a failure at the very start is not read; none, no time', () => {
    expect(growth([0, ...REC], 2000).n).toBe(14);
    expect(growth([], 100).enough).toBe('none');
    expect(growth(REC, 0).beta).toBeUndefined();
  });

  it('a projection that is too far is not given', () => {
    const far = growth(REC, 2000, 5000);
    expect(far.far).toBe(true);
    expect(far.moreH).toBeUndefined();
  });

  it('says it in words, with the "if", and not run what was not run', () => {
    const t = growthSays('failure', g).text;
    expect(t).toContain('It is getting better');
    expect(t).toContain('β 0.51, 90% sure 0.31–0.75');
    expect(t).toContain('about 281 h');
    expect(t).toContain('143 h averaged since the start');
    expect(t).toContain('if the fixing keeps pace');
    expect(growthSays('failure', growth(REC.slice(0, 5), 2000)).text).toContain('fitted from 8');
    expect(growthSays('failure', growth([30, 61, 88, 121, 150, 181, 212, 240, 272, 300], 310)).text).toContain('No sign yet of getting better or worse, though it leans worse');
  });

  it('the tile and the table', () => {
    expect(growthTile('failure', g).v).toBe('281 h');
    expect(growthTile('failure', g).tone).toBe('g');
    expect(growthRows(g).map(r => r[0])).toContain('MTBF now');
    expect(growthRows(growth([], 10))).toEqual([]);
  });

  it('the fitted curve ends at the number of failures the model expects', () => {
    const last = g.curve[g.curve.length - 1];
    expect(last.h).toBeCloseTo(2000, 6);
    expect(last.n).toBeCloseTo(14, 6);
  });
});
