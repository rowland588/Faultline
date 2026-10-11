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
});
