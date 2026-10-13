/* Capacity's three numbers and the product mix, proved by docs/TOOLKIT.md §10's worked examples. */
import { describe, it, expect } from 'vitest';
import { threeNumbers, mix } from '../mix';

describe('the three numbers (tool 10)', () => {
  it('148,000 made of 201,600 design and 175,000 effective → 73% and 85%', () => {
    /* 140 a minute × 1,440 planned minutes = 201,600; 190 planned minutes out → 175,000 */
    const t = threeNumbers({ ratePerMin: 140, plannedMin: 1440, plannedLossMin: 190, actualPacks: 148_000, demandPacks: 161_000 });
    expect(t.design).toBe(201_600);
    expect(t.effective).toBe(175_000);
    expect(t.utilisation).toBeCloseTo(148_000 / 201_600, 6);
    expect(t.efficiency).toBeCloseTo(148_000 / 175_000, 6);
    expect(t.loading).toBeCloseTo(0.92, 2);
    expect(t.sentence).toBe('Built to make 201,600 a shift; really 175,000 after 190 planned minutes out; made 148,000 — 73% of design, 85% of what it can really make; demand needs 92% of what it can really make.');
  });
  it('without a count there is no utilisation or efficiency, and the sentence stops at what it knows', () => {
    const t = threeNumbers({ ratePerMin: 100, plannedMin: 450 });
    expect(t.design).toBe(45_000); expect(t.effective).toBe(45_000);
    expect(t.actual).toBeUndefined(); expect(t.utilisation).toBeUndefined(); expect(t.loading).toBeUndefined();
    expect(t.sentence).toBe('Built to make 45,000 a shift; really 45,000 after 0 planned minutes out.');
  });
});

describe('the product mix (tool 10)', () => {
  const A = { id: 'a', name: 'A', marginPerPack: 0.40, perConstraintMin: 80, demandPerWeek: 96_000 };
  const B = { id: 'b', name: 'B', marginPerPack: 0.60, perConstraintMin: 40, demandPerWeek: 60_000 };
  it('£0.40 × 80 = £32 a constraint minute beats £0.60 × 40 = £24 — A first', () => {
    const m = mix([B, A], 2400);
    expect(m.rows.map(r => r.product.name)).toEqual(['A', 'B']);
    expect(m.rows[0]?.perMin).toBeCloseTo(32, 6);
    expect(m.rows[1]?.perMin).toBeCloseTo(24, 6);
  });
  it('the week is filled in that order; what is left is said unmade, by name', () => {
    /* A needs 1,200 minutes, B 1,500: 2,700 asked of a 2,400-minute week → B gets 1,200 minutes, 48,000 made, 12,000 unmade */
    const m = mix([A, B], 2400);
    expect(m.fill).toBeCloseTo(1.125, 6);
    expect(m.rows[0]?.made).toBe(96_000); expect(m.rows[0]?.unmade).toBe(0);
    expect(m.rows[1]?.minutesGiven).toBe(1200); expect(m.rows[1]?.made).toBe(48_000); expect(m.rows[1]?.unmade).toBe(12_000);
    expect(m.sentence).toBe('A earns £32 a constraint minute, B £24 — A first. The week is full at 113% of it asked; 12,000 of B unmade.');
  });
  it('a week with room makes everything', () => {
    const m = mix([A, B], 3000);
    expect(m.fill).toBeCloseTo(0.9, 6);
    expect(m.rows.every(r => r.unmade === 0)).toBe(true);
    expect(m.sentence).toBe('A earns £32 a constraint minute, B £24 — A first. The week fills at 90%; everything is made.');
  });
  it('a product without its margin, speed or demand is left out and said why', () => {
    const m = mix([A, { id: 'c', name: 'C', perConstraintMin: 50, demandPerWeek: 1000 }, { id: 'd', name: 'D', marginPerPack: 1 }], 2400);
    expect(m.rows.map(r => r.product.name)).toEqual(['A']);
    expect(m.skipped.map(s => `${s.product.name}: ${s.why}`)).toEqual(['C: no margin a pack yet', 'D: no speed on the constraint yet']);
    expect(mix([], 2400).sentence).toBe('No products yet.');
  });
  it('a week with no minutes on the constraint makes nothing, and says so — never "everything is made"', () => {
    const m = mix([A, B], 0);
    expect(m.rows.map(r => [r.product.name, r.made, r.unmade])).toEqual([['A', 0, 96_000], ['B', 0, 60_000]]);
    expect(m.sentence).toBe('The constraint has no minutes in the week yet — say how long it runs to fill it; A would go first.');
  });
  it('a product exactly filling the week: 1,200 minutes of A in a 1,200-minute week, 100%, all made', () => {
    const m = mix([A], 1200);
    expect([m.fill, m.rows[0]?.made, m.rows[0]?.unmade]).toEqual([1, 96_000, 0]);
    expect(m.sentence).toBe('A earns £32 a constraint minute — A first. The week fills at 100%; everything is made.');
  });
});

describe('the three numbers at their edges', () => {
  it('planned losses longer than the shift leave nothing effective: no efficiency or loading claimed', () => {
    const t = threeNumbers({ ratePerMin: 100, plannedMin: 450, plannedLossMin: 500, actualPacks: 1000, demandPacks: 2000 });
    expect([t.design, t.effective, t.utilisation, t.efficiency, t.loading]).toEqual([45_000, 0, 1000 / 45_000, undefined, undefined]);
  });
  it('nothing made is 0% of design, said — not left out', () => {
    const t = threeNumbers({ ratePerMin: 100, plannedMin: 450, actualPacks: 0 });
    expect([t.utilisation, t.efficiency]).toEqual([0, 0]);
    expect(t.sentence).toBe('Built to make 45,000 a shift; really 45,000 after 0 planned minutes out; made 0 — 0% of design, 0% of what it can really make.');
  });
});
