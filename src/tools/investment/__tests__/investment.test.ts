/* FC-191 — payback, NPV, IRR and the return a year, against scripts/knowledge/cases-calc.py I1–I5 (SciPy brentq and the cash-flow
 * polynomial's roots agree; the record cost.investment-appraisal's £179,400 and £75,700 reproduced) — never against themselves. */
import { describe, expect, it } from 'vitest';
import { annuity, costUp, figures, fromHours, fromShare, halved, irr, npv } from '../investment';

describe('I1: the record’s SMED kit — £28,000, 60% of a £1,900 loss, 48 weeks, 5 years, 10%', () => {
  const c = { cost: 28000, weekly: fromShare(1900, 60), weeks: 48, life: 5, rate: 0.1 };
  const f = figures(c);
  it('saves £1,140 a week and £54,720 a year', () => { expect(f.weekly).toBeCloseTo(1140, 9); expect(f.annual).toBeCloseTo(54720, 9); });
  it('pays back in 24.56 running weeks, 0.51 of a year of running', () => {
    expect(f.paybackWeeks).toBeCloseTo(24.5614, 3);
    expect((f.paybackWeeks as number) / 48).toBeCloseTo(0.5117, 3);
    expect(f.paybackOfLife).toBeCloseTo(24.5614 / 240, 4);
  });
  it('NPV £179,431.85 (the record: £179,400) and IRR 194.5% (the record: 195%), return a year 195.4%', () => {
    expect(f.npv).toBeCloseTo(179431.85, 1);
    expect(f.irr).toBeCloseTo(1.945471, 4);
    expect(f.returnYear).toBeCloseTo(1.954286, 5);
  });
  it('halved: 49.12 weeks and NPV £75,715.93 (the record: £75,700)', () => {
    const h = halved(c);
    expect(h.paybackWeeks).toBeCloseTo(49.123, 2);
    expect(h.npv).toBeCloseTo(75715.93, 1);
  });
  it('cost up a quarter: 30.70 weeks and NPV £172,431.85', () => {
    const u = costUp(c);
    expect(u.paybackWeeks).toBeCloseTo(30.702, 2);
    expect(u.npv).toBeCloseTo(172431.85, 1);
  });
});

describe('I2: the splice table — £4,800 saving £310 a week, 48 weeks, 3 years, 10%', () => {
  const f = figures({ cost: 4800, weekly: 310, weeks: 48, life: 3, rate: 0.1 });
  it('15.48 weeks, NPV £32,204.36, IRR 305.3%, return 310%', () => {
    expect(f.paybackWeeks).toBeCloseTo(15.4839, 3);
    expect(f.npv).toBeCloseTo(32204.36, 1);
    expect(f.irr).toBeCloseTo(3.053454, 4);
    expect(f.returnYear).toBeCloseTo(3.1, 9);
  });
});

describe('I3: a spend that does not pay — £30,000 for £200 a week over 3 years at 10%', () => {
  const f = figures({ cost: 30000, weekly: 200, weeks: 48, life: 3, rate: 0.1 });
  it('payback 150 weeks is longer than the 144 running weeks of life; NPV −£6,126.22; IRR below zero', () => {
    expect(f.paybackWeeks).toBeCloseTo(150, 9);
    expect(f.paybackOfLife).toBeCloseTo(150 / 144, 9);
    expect(f.npv).toBeCloseTo(-6126.22, 1);
    expect(f.irr).toBeCloseTo(-0.020137, 4);
  });
});

describe('I4–I5 and the edges', () => {
  it('6 hours a week at £14.70 is £88.20', () => { expect(fromHours(6, 14.7)).toBeCloseTo(88.2, 9); });
  it('at 0% the NPV is the saving × years less the cost (annuity limit)', () => {
    expect(annuity(0, 7)).toBe(7);
    expect(npv(500, 0, 2, 1000)).toBe(0);
    expect(figures({ cost: 1000, weekly: 10, weeks: 50, life: 2, rate: 0 }).npv).toBeCloseTo(0, 9);
  });
  it('says only what the inputs allow: no cost → no payback, NPV or IRR; no rate → no NPV but an IRR; no life → neither', () => {
    expect(figures({ weekly: 100 })).toEqual({ weekly: 100 });
    const a = figures({ cost: 1000, weekly: 100, weeks: 48, life: 3 });
    expect(a.paybackWeeks).toBe(10);
    expect(a.npv).toBeUndefined();
    expect(a.irr).toBeDefined();
    const b = figures({ cost: 1000, weekly: 100, weeks: 48, rate: 0.1 });
    expect(b.npv).toBeUndefined();
    expect(b.irr).toBeUndefined();
    expect(figures({ cost: 1000, weekly: 100, life: 3, rate: 0.1 }).npv).toBeUndefined();
  });
  it('finds no IRR for a saving that cannot be found a root for, and never throws', () => {
    expect(irr(0, 3, 1000)).toBeUndefined();
    expect(irr(100, 0, 1000)).toBeUndefined();
    expect(irr(1e12, 3, 1)).toBeUndefined();
  });
  it('a one-year life is a one-year annuity', () => { expect(annuity(0.1, 1)).toBeCloseTo(1 / 1.1, 12); });
});
