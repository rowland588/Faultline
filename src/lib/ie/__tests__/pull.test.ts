/* PULL, STOCK, FLOW AND THE OC CURVE — proved against worked cases that are not the code's own output:
 * the textbook figures (Monden's kanban formula as knowledge/methods/lean/kanban-supermarket.md works it;
 * Factory Physics' film-reel safety stock; Little's 1,800 trays at 600 an hour) and SciPy 1.17 (binom, hypergeom,
 * norm.ppf) — every literal below is printed by scripts/knowledge/cases-calc.py. */
import { describe, expect, it } from 'vitest';
import { cyclesShort, kanbanLoop, littlesLaw, reorderPoint, wholeUp } from '../pull';
import { GRID, accepts, badIn, curve, hyperCdf, niceTop, shareAt } from '../oc';

describe('kanbanLoop — N = D × L × (1 + α) ÷ C, rounded up (Monden)', () => {
  it('K1 the textbook trays: 1,500 in 7.5 h, 2 h to refill, 15%, 60 a crate → 8 kanbans, at most 480, 400 in the loop before safety', () => {
    const k = kanbanLoop({ qty: 1500, hours: 7.5, leadHours: 2, alpha: 0.15, container: 60 });
    expect(k.perHour).toBe(200);
    expect(k.inLoop).toBe(400);
    expect(k.raw).toBeCloseTo(7.6667, 3);
    expect(k.kanbans).toBe(8);
    expect(k.supermarket).toBe(480);
    expect(k.coverHours).toBe(2.4);
    expect(k.above).toBe(80);
  });
  it('K1b halving the lead time halves what the loop holds before safety, and the kanbans (3.83 → 4)', () => {
    const k = kanbanLoop({ qty: 1500, hours: 7.5, leadHours: 1, alpha: 0.15, container: 60 });
    expect(k.inLoop).toBe(200); expect(k.kanbans).toBe(4); expect(k.supermarket).toBe(240);
  });
  it('K2 two-bin labels: 5.4 rolls rounds up to 6', () => {
    const k = kanbanLoop({ qty: 3000, hours: 1, leadHours: 0.75, alpha: 0.2, container: 500 });
    expect(k.raw).toBeCloseTo(5.4, 9); expect(k.kanbans).toBe(6); expect(k.supermarket).toBe(3000); expect(k.inLoop).toBe(2250);
  });
  it('K3 an exact whole number is not rounded up by floating-point dust (360 ÷ 60 is 6)', () => {
    expect(kanbanLoop({ qty: 100, hours: 1, leadHours: 3, alpha: 0.2, container: 60 }).kanbans).toBe(6);
    expect(wholeUp(6.000000000000001)).toBe(6);
    expect(wholeUp(6.0001)).toBe(7);
  });
  it('is never fewer than one kanban, however little is used', () => {
    expect(kanbanLoop({ qty: 1, hours: 100, leadHours: 0.1, alpha: 0, container: 500 }).kanbans).toBe(1);
  });
});

describe('reorderPoint — SS = z √(L σd² + d̄² σL²), ROP = d̄ L + SS (Silver, Pyke & Thomas; Factory Physics)', () => {
  it('S1 the film reels: 2.4 a day (σ 0.9), 5 days (σ 1.5), 98% → σ over the lead time 4.12, safety 8.47, reorder 20.47', () => {
    const r = reorderPoint({ mean: 2.4, sdDay: 0.9, lead: 5, sdLead: 1.5, service: 0.98 });
    expect(r.z).toBeCloseTo(2.05375, 4);
    expect(r.meanLead).toBeCloseTo(12, 9);
    expect(r.sdLead).toBeCloseTo(4.1243, 3);
    expect(r.safety).toBeCloseTo(8.4704, 3);
    expect(r.reorder).toBeCloseTo(20.4704, 3);
    expect(r.fromSupplier).toBeCloseTo(12.96 / 17.01, 6);
  });
  it('S2 a supplier who always arrives on the day (σL 0): 100 a day (σ 20), 4 days, 95% → 65.79 safety, reorder 465.79', () => {
    const r = reorderPoint({ mean: 100, sdDay: 20, lead: 4, sdLead: 0, service: 0.95 });
    expect(r.z).toBeCloseTo(1.644854, 5); expect(r.sdLead).toBeCloseTo(40, 9); expect(r.safety).toBeCloseTo(65.794, 2); expect(r.reorder).toBeCloseTo(465.794, 2);
    expect(r.fromSupplier).toBe(0);
  });
  it('S3 the stock-outs a year: 100 a day for 250 days in orders of 500 is 50 orders; 5% short is 2.5 a year', () => {
    const c = cyclesShort(100, 250, 500, 0.95);
    expect(c.cycles).toBe(50); expect(c.short).toBeCloseTo(2.5, 9);
  });
  it('S4 z at the service levels the page offers (SciPy norm.ppf)', () => {
    const z = (s: number) => reorderPoint({ mean: 1, sdDay: 1, lead: 1, sdLead: 0, service: s }).z;
    [[0.9, 1.28155157], [0.95, 1.64485363], [0.975, 1.95996398], [0.98, 2.05374891], [0.99, 2.32634787], [0.995, 2.5758293], [0.999, 3.09023231]].forEach(([s, want]) => expect(z(s)).toBeCloseTo(want, 5));
  });
  it('no spread at all means no safety stock, and the reorder point is the demand over the lead time', () => {
    const r = reorderPoint({ mean: 10, sdDay: 0, lead: 3, sdLead: 0, service: 0.99 });
    expect(r.safety).toBe(0); expect(r.reorder).toBe(30); expect(r.fromSupplier).toBe(0);
  });
});

describe("littlesLaw — WIP = throughput × lead time (Little 1961)", () => {
  it('L1 1,800 trays at 600 an hour: 3 hours', () => { expect(littlesLaw('leadTime', { wip: 1800, perHour: 600 })?.leadHours).toBe(3); });
  it('L2 250 an hour kept 4 hours needs 1,000 in progress', () => { expect(littlesLaw('wip', { perHour: 250, leadHours: 4 })?.wip).toBe(1000); });
  it('L3 480 held 2.4 hours is 200 an hour', () => { expect(littlesLaw('throughput', { wip: 480, leadHours: 2.4 })?.perHour).toBeCloseTo(200, 9); });
  it('L6 halve the WIP at the same throughput and the lead time halves', () => { expect(littlesLaw('leadTime', { wip: 900, perHour: 600 })?.leadHours).toBe(1.5); });
  it('says nothing without the two it needs, or with a throughput of nothing', () => {
    expect(littlesLaw('leadTime', { wip: 1800 })).toBeUndefined();
    expect(littlesLaw('leadTime', { wip: 1800, perHour: 0 })).toBeUndefined();
    expect(littlesLaw('throughput', { wip: 480, leadHours: 0 })).toBeUndefined();
    expect(littlesLaw('wip', { perHour: 250 })).toBeUndefined();
  });
});

describe('the OC curve — Pa(p) = P(X ≤ c) (SciPy binom and hypergeom)', () => {
  const p125 = { n: 125, c: 3 };
  it('O1 125/3 at 0.5, 1, 2, 3, 5, 8 and 10% bad (SciPy to 8 places)', () => {
    [[0.005, 0.99625167], [0.01, 0.96255094], [0.02, 0.7586698], [0.03, 0.48140505], [0.05, 0.1237847], [0.08, 0.00831188], [0.1, 0.00104197]]
      .forEach(([p, want]) => expect(accepts(p125, p)).toBeCloseTo(want, 7));
  });
  it('O1 where it accepts 95 in 100 (1.10% bad) and only 10 in 100 (5.27% bad) — brentq on SciPy’s cdf', () => {
    expect(shareAt(p125, 0.95)).toBeCloseTo(0.0110029, 6);
    expect(shareAt(p125, 0.1)).toBeCloseTo(0.05266319, 6);
  });
  it('O2 50/1: 0.9106 at 1% and a limiting quality of 7.56%', () => {
    expect(accepts({ n: 50, c: 1 }, 0.01)).toBeCloseTo(0.9106, 3);
    expect(shareAt({ n: 50, c: 1 }, 0.1)).toBeCloseTo(0.0755806, 6);
  });
  it('O3 110/3 meets both points: 0.97496 at 1%, 0.09803 at 6%', () => {
    expect(accepts({ n: 110, c: 3 }, 0.01)).toBeCloseTo(0.97496185, 6);
    expect(accepts({ n: 110, c: 3 }, 0.06)).toBeCloseTo(0.09803038, 6);
  });
  it('O4 the looser 89/2 often quoted: 0.0919 at 6%, so 6.0% producer’s risk', () => {
    expect(accepts({ n: 89, c: 2 }, 0.06)).toBeCloseTo(0.09186935, 6);
    expect(1 - accepts({ n: 89, c: 2 }, 0.01)).toBeCloseTo(0.0603, 3);
  });
  it('O5 a lot of 200 with 5% bad (10 units): hypergeometric 0.23682 where the binomial says 0.2794', () => {
    expect(hyperCdf(1, 200, 10, 50)).toBeCloseTo(0.23682281, 7);
    expect(accepts({ n: 50, c: 1, lot: 200 }, 0.05)).toBeCloseTo(0.23682281, 7);
    expect(accepts({ n: 50, c: 1 }, 0.05)).toBeCloseTo(0.2794, 3);
  });
  it('O6 the whole-unit trap: 1% of 200 is 2 bad units; a plan allowing 2 never rejects such a lot', () => {
    expect(badIn(200, 0.01)).toBe(2);
    expect(accepts({ n: 76, c: 2, lot: 200 }, 0.01)).toBe(1);
  });
  it('O7 a lot of 500: 5 bad units (1%) accepted 0.96566, 30 bad (6%) 0.09733 by 83/2; the first count of bad units that brings Pa to 10% is 30', () => {
    const p = { n: 83, c: 2, lot: 500 };
    expect(accepts(p, 0.01)).toBeCloseTo(0.96566153, 7);
    expect(accepts(p, 0.06)).toBeCloseTo(0.09733116, 7);
    expect(shareAt(p, 0.95)).toBeCloseTo(6 / 500, 9);
    expect(shareAt(p, 0.1)).toBeCloseTo(30 / 500, 9);
  });
  it('O8 a plan of 45 with none allowed: 0.0994 at 5% bad; a lot at 1% is turned away 36 times in 100', () => {
    expect(accepts({ n: 45, c: 0 }, 0.05)).toBeCloseTo(0.0994, 3);
    expect(1 - accepts({ n: 45, c: 0 }, 0.01)).toBeCloseTo(0.3638, 3);
    expect(shareAt({ n: 45, c: 0 }, 0.1)).toBeCloseTo(0.04988149, 6);
  });
  it('Pa starts at 1 for a lot with nothing bad and falls as the share rises', () => {
    const c = curve(p125, 0.1, 50);
    expect(c[0]).toEqual([0, 1]);
    for (let i = 1; i < c.length; i++) expect(c[i][1]).toBeLessThanOrEqual(c[i - 1][1] + 1e-12);
    expect(c.length).toBe(51); expect(c[50][0]).toBeCloseTo(0.1, 12);
  });
  it('a plan that allows as many bad as it takes accepts every lot', () => {
    expect(accepts({ n: 5, c: 5 }, 0.9)).toBe(1);
    expect(accepts({ n: 5, c: 9 }, 0.9)).toBe(1);
  });
  it('taking the whole lot decides it by the bad units in it (n = N)', () => {
    expect(accepts({ n: 100, c: 2, lot: 100 }, 0.02)).toBe(1);   // 2 bad, 2 allowed
    expect(accepts({ n: 100, c: 2, lot: 100 }, 0.03)).toBe(0);   // 3 bad, 2 allowed
  });
  it('the grid the page prints and the axis tops', () => {
    expect(GRID).toEqual([0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1]);
    expect(niceTop(0.0527 * 1.6)).toBe(0.1);
    expect(niceTop(0.011)).toBe(0.02);
    expect(niceTop(2)).toBe(1);
  });
});
