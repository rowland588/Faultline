import { describe, expect, it } from 'vitest';
import {
  ageReplacement, conditionalSays, failsWithin, fitWeibull, johnsonRanks, rankRegression, reliabilityAt, replaceSays, validAge, watchLives, weibullPlot, weibullSays, weibullTiles, WEIBULL_MIN, type Life,
} from '../weibull';

/* The independent numbers are scripts/knowledge/cases-w5.py's (SciPy: Nelder–Mead on the likelihood, brentq on the
   profile, scipy.stats.linregress, scipy.optimize.minimize_scalar on the age-replacement cost rate). */
const HEATERS = [310, 480, 560, 720, 790, 850, 940, 1010, 1100, 1250, 1380, 1620];
const failed = (xs: number[]): Life[] => xs.map(age => ({ age, failed: true }));
const running = (xs: number[]): Life[] => xs.map(age => ({ age, failed: false }));
const gbp = (n: number) => `£${n.toFixed(2)}`;

describe('Weibull (FC-060) — twelve heater failures', () => {
  const w = fitWeibull(failed(HEATERS));

  it('1 — maximum likelihood β and η, and the 90% interval on β', () => {
    expect(w.beta).toBeCloseTo(2.73793, 4);
    expect(w.eta).toBeCloseTo(1033.276, 1);
    expect(w.betaLo).toBeCloseTo(1.81257, 3);
    expect(w.betaHi).toBeCloseTo(3.86595, 3);
    expect(w.enough).toBe('rough');
  });

  it('2 — B10 with its likelihood-ratio interval, B50, the mean life, R(600)', () => {
    expect(w.b10).toBeCloseTo(454.21, 1);
    expect(w.b10Lo).toBeCloseTo(268.6, 0);
    expect(w.b10Hi).toBeCloseTo(632.0, 0);
    expect(w.b50).toBeCloseTo(903.8, 0);
    expect(w.meanLife).toBeCloseTo(919.3, 0);
    expect(reliabilityAt(w.beta as number, w.eta as number, 600)).toBeCloseTo(0.7979, 4);
  });

  it('3 — the chance a heater at 500 h fails by 700 h, and a new one within 200 h', () => {
    expect(failsWithin(w.beta as number, w.eta as number, 500, 200)).toBeCloseTo(0.1872, 4);
    expect(failsWithin(w.beta as number, w.eta as number, 0, 200)).toBeCloseTo(0.01109, 4);
    expect(conditionalSays('hours', w, 500, 200)).toContain('19% chance (about 1 in 5)');
  });

  it('4 — the plot’s line: rank regression β, η, r²', () => {
    expect(w.rr?.beta).toBeCloseTo(2.39227, 4);
    expect(w.rr?.eta).toBeCloseTo(1043.95, 1);
    expect(w.rr?.r2).toBeCloseTo(0.99654, 4);
  });

  it('5 — the age-replacement interval when a failure costs six times a planned change', () => {
    const rep = ageReplacement(w.beta as number, w.eta as number, 1, 6);
    expect(rep?.T).toBeCloseTo(471.74, 0);
    expect(rep?.rate).toBeCloseTo(0.0033914, 6);
    expect(rep?.runRate).toBeCloseTo(0.0065265, 6);
    expect(rep?.savingPct).toBeCloseTo(0.48037, 4);
  });

  it('reads as wearing out, beyond doubt; the sentence is one a person can read', () => {
    expect(w.says).toBe('wears');
    const t = weibullSays('hours', w).text;
    expect(t).toContain('This part wears out');
    expect(t).toContain('β 2.7, 90% sure 1.8–3.9');
    expect(t).toContain('first guess');
    expect(t).toContain('A tenth have failed by about 454 hours (90% sure 269–632)');
  });
});

describe('Weibull — the parts still running count', () => {
  const lives = [...failed(HEATERS.slice(0, 8)), ...running([1500, 1500, 1500, 1500])];
  const w = fitWeibull(lives);
  it('6 — eight failures and four still running at 1,500 h: β 1.73, not the 3.71 of dropping them', () => {
    expect(w.beta).toBeCloseTo(1.72685, 3);
    expect(w.eta).toBeCloseTo(1309.349, 0);
    expect(w.betaLo).toBeCloseTo(0.9849, 3);
    expect(w.betaHi).toBeCloseTo(2.7125, 3);
    expect(fitWeibull(failed(HEATERS.slice(0, 8))).beta).toBeCloseTo(3.70722, 3);
    expect(w.failures).toBe(8);
    expect(w.running).toBe(4);
    /* the interval holds 1: not beyond doubt */
    expect(w.says).toBe('random');
    expect(w.leans).toBe('wears');
  });
  it('Johnson’s adjusted ranks and the rank regression with the suspensions', () => {
    const j = johnsonRanks(lives);
    expect(j.map(p => +p.adj.toFixed(4))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(j.map(p => +p.f.toFixed(4))).toEqual([0.0565, 0.1371, 0.2177, 0.2984, 0.379, 0.4597, 0.5403, 0.621]);
    const r = rankRegression(lives);
    expect(r?.beta).toBeCloseTo(2.35178, 4);
    expect(r?.eta).toBeCloseTo(1056.54, 1);
  });
  it('a suspension before a later failure raises the later ranks by more than one step', () => {
    const j = johnsonRanks([{ age: 100, failed: true }, { age: 150, failed: false }, { age: 200, failed: true }, { age: 300, failed: true }]);
    /* N = 4: adj1 = 1; the failure at 200 has reverse rank 2 → 1 + (5 − 1)/3 = 2.3333; at 300, reverse rank 1 → 2.3333 + (5 − 2.3333)/2 = 3.6667 */
    expect(j.map(p => +p.adj.toFixed(4))).toEqual([1, 2.3333, 3.6667]);
  });
});

describe('Weibull — the gaps of a study as lives, and the readings', () => {
  it('7 — eight gaps and a part still running at 120 h', () => {
    const w = fitWeibull([...failed([212, 305, 168, 410, 260, 350, 190, 280]), ...running([120])]);
    expect(w.beta).toBeCloseTo(3.88971, 3);
    expect(w.eta).toBeCloseTo(301.507, 1);
    expect(w.b10).toBeCloseTo(169.06, 1);
    expect(w.betaLo).toBeCloseTo(2.3766, 3);
    expect(w.betaHi).toBeCloseTo(5.8152, 3);
  });
  it('lives from the watch: the first gap only if the part was new; the tail is still running', () => {
    expect(watchLives([2, 5, 9], 12, false)).toEqual([{ age: 3, failed: true }, { age: 4, failed: true }, { age: 3, failed: false }]);
    expect(watchLives([2, 5, 9], 12, true)).toEqual([{ age: 2, failed: true }, { age: 3, failed: true }, { age: 4, failed: true }, { age: 3, failed: false }]);
    expect(watchLives([], 12, true)).toEqual([{ age: 12, failed: false }]);
    expect(watchLives([], 12, false)).toEqual([]);
    expect(watchLives([5, 5, 9], 9, true)).toEqual([{ age: 5, failed: true }, { age: 4, failed: true }]);
  });
  it('8 — random-looking ages: no wear that can be told; ages that fail young', () => {
    const r = fitWeibull(failed([20, 55, 90, 140, 210, 300, 420, 610]));
    expect(r.beta).toBeCloseTo(1.1656, 3);
    expect(r.betaLo).toBeCloseTo(0.6919, 3);
    expect(r.betaHi).toBeCloseTo(1.7815, 3);
    expect(r.says).toBe('random');
    expect(weibullSays('hours', r).text).toContain('Age makes no difference that can be told');
    const y = fitWeibull(failed([3, 8, 15, 40, 90, 260, 700, 1500]));
    expect(y.beta).toBeCloseTo(0.535, 3);
    expect(y.betaLo).toBeCloseTo(0.3223, 3);
    expect(y.betaHi).toBeCloseTo(0.8078, 3);
    expect(y.says).toBe('young');
  });
});

describe('Weibull — boundaries and refusals', () => {
  it('five failures are not fitted; six are', () => {
    const five = fitWeibull(failed(HEATERS.slice(0, WEIBULL_MIN - 1)));
    expect(five.beta).toBeUndefined();
    expect(weibullSays('hours', five).text).toContain('fitted from 6');
    expect(fitWeibull(failed(HEATERS.slice(0, WEIBULL_MIN))).beta).toBeDefined();
  });
  it('every failure the same age is not fitted, and says why', () => {
    const w = fitWeibull(failed([500, 500, 500, 500, 500, 500, 500]));
    expect(w.beta).toBeUndefined();
    expect(w.why).toBe('every failure is the same age');
  });
  it('an age that is not more than 0, or is not a number, is not a life', () => {
    expect(validAge(0)).toBe(false); expect(validAge(-3)).toBe(false); expect(validAge(NaN)).toBe(false); expect(validAge(1e8)).toBe(false); expect(validAge(0.5)).toBe(true);
    expect(fitWeibull([...failed(HEATERS), { age: 0, failed: true }, { age: NaN, failed: false }]).failures).toBe(12);
  });
  it('large ages do not overflow', () => {
    const w = fitWeibull(failed(HEATERS.map(x => x * 1e3)));
    expect(w.beta).toBeCloseTo(2.73793, 3);
    expect(w.eta).toBeCloseTo(1033.276e3, -1);
  });
  it('no replacement interval without wear, or when a failure costs no more than a change', () => {
    expect(ageReplacement(0.8, 1000, 1, 6)).toBeUndefined();
    expect(ageReplacement(2.7, 1000, 6, 6)).toBeUndefined();
    expect(ageReplacement(2.7, 1000, 6, 3)).toBeUndefined();
  });
  it('the interval’s words: costs missing named; random says a schedule buys nothing; with costs it says the saving', () => {
    const w = fitWeibull(failed(HEATERS));
    expect(replaceSays('hours', w, undefined, undefined, gbp).text).toContain('Give what a planned change costs and what a failure costs');
    expect(replaceSays('hours', w, 20, undefined, gbp).missing).toEqual(['what a failure costs (the part, the labour, the line’s lost time)']);
    const ok = replaceSays('hours', w, 20, 120, gbp, 7.5);
    expect(ok.text).toContain('Changing it at about 472 hours (a first guess)');
    expect(ok.text).toContain('48% less');
    expect(ok.text).toContain('a day of the line’s shifts (8 hours a day)');
    const r = fitWeibull(failed([20, 55, 90, 140, 210, 300, 420, 610]));
    expect(replaceSays('hours', r, 20, 120, gbp).text).toContain('buys nothing');
  });
  it('the tiles, and the plot’s axes for the page and the paper', () => {
    const w = fitWeibull(failed(HEATERS));
    const t = weibullTiles('hours', w, ageReplacement(w.beta as number, w.eta as number, 1, 6));
    expect(t.map(x => x.k)).toEqual(['Shape β', 'B10 life', 'Change at']);
    expect(t[1].v).toBe('454 hours');
    const p = weibullPlot(w);
    expect(p?.points.length).toBe(12);
    expect(p?.mle).toBeDefined();
    expect(p?.rr).toBeDefined();
    expect((p?.xTicks.length ?? 0) > 1).toBe(true);
    expect(weibullPlot(fitWeibull([]))).toBeUndefined();
  });
});
