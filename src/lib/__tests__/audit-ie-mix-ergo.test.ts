/* AUDIT (16 Oct) — capacity's three numbers and the product mix (lib/ie/mix)
 * and the NIOSH lifting equation (lib/ie/ergo), against the published forms. */
import { describe, it, expect } from 'vitest';
import { threeNumbers, mix, type MixProduct } from '../ie/mix';
import { assessLift, hm, vm, dm, am, fm, cm, rwlFrom, liftBand, multipliers, type LiftHours } from '../ie/ergo';
import { rng } from './audit-ie-ref';

describe('AUDIT mix — the three numbers', () => {
  it('201,600 design, 175,000 effective, 148,000 actual → 73.4% and 84.6%', () => {
    expect(148_000 / 201_600).toBeCloseTo(0.7341, 4);
    expect(148_000 / 175_000).toBeCloseTo(0.8457, 4);
    const t = threeNumbers({ ratePerMin: 140, plannedMin: 1440, plannedLossMin: 190, actualPacks: 148_000, demandPacks: 161_000 });
    expect([t.design, t.effective]).toEqual([201_600, 175_000]);
    expect(t.utilisation).toBeCloseTo(0.7341, 4);
    expect(t.efficiency).toBeCloseTo(0.8457, 4);
    expect(t.loading).toBeCloseTo(0.92, 4);
    expect(t.sentence).not.toMatch(/NaN/);
  });
  it('planned losses over the shift: effective 0, no efficiency and no loading, words not Infinity', () => {
    const t = threeNumbers({ ratePerMin: 100, plannedMin: 450, plannedLossMin: 500, actualPacks: 1000, demandPacks: 2000 });
    expect(t.effective).toBe(0);
    expect(t.efficiency).toBeUndefined();
    expect(t.loading).toBeUndefined();
    expect(t.sentence).not.toMatch(/Infinity|NaN/);
  });
});

describe('AUDIT mix — the product mix', () => {
  const A: MixProduct = { id: 'a', name: 'A', marginPerPack: 0.4, perConstraintMin: 80, demandPerWeek: 96_000 };
  const B: MixProduct = { id: 'b', name: 'B', marginPerPack: 0.6, perConstraintMin: 40, demandPerWeek: 48_000 };
  it('£0.40 × 80 = £32 a constraint minute beats £0.60 × 40 = £24; minutes needed = demand ÷ speed', () => {
    const m = mix([B, A], 2400);
    expect(m.rows.map(r => [r.product.name, r.perMin, r.minutesNeeded])).toEqual([['A', 32, 1200], ['B', 24, 1200]]);
    expect(m.fill).toBe(1);
    expect(m.rows.every(r => r.unmade === 0)).toBe(true);
  });
  it('random mixes: given ≤ needed, Σ given ≤ week, ranked by £ a minute, what is unmade is demand − made', () => {
    const r = rng(77);
    for (let k = 0; k < 100; k++) {
      const ps: MixProduct[] = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => ({ id: `p${i}`, name: `P${i}`, marginPerPack: r(), perConstraintMin: 1 + Math.floor(r() * 150), demandPerWeek: Math.floor(r() * 50_000) }));
      const week = Math.floor(r() * 5000);
      const m = mix(ps, week);
      for (let i = 1; i < m.rows.length; i++) expect(m.rows[i - 1]!.perMin).toBeGreaterThanOrEqual(m.rows[i]!.perMin);
      for (const row of m.rows) { expect(row.minutesGiven).toBeLessThanOrEqual(row.minutesNeeded + 1e-9); expect(row.unmade).toBe(Math.max(0, row.product.demandPerWeek! - row.made)); }
      expect(m.rows.reduce((t, x) => t + x.minutesGiven, 0)).toBeLessThanOrEqual(week + 1e-9);
      expect(m.sentence).not.toMatch(/NaN|Infinity/);
    }
  });
  it('FIXED (UPGRADE-AUDIT M1): floor(minutesGiven × speed) lost a pack to floating point — a product given every minute it needs is made whole', () => {
    /* demand 3 at 47 a minute: 3 ÷ 47 × 47 = 2.9999999999999996 — the floor said 2 made, "1 of P unmade", with 99% of the week to spare */
    const m = mix([{ id: 'p', name: 'P', marginPerPack: 0.5, perConstraintMin: 47, demandPerWeek: 3 }], 2400);
    expect(m.fill).toBeLessThan(1);
    expect(m.rows[0]!.made).toBe(3);
    expect(m.rows[0]!.unmade).toBe(0);
    expect(m.sentence).toMatch(/everything is made\.$/);
    /* and at a realistic scale: scan demands 100…20,000 at speeds to a tenth */
    const hits: [number, number][] = [];
    for (let d = 100; d <= 20_000 && hits.length < 5; d += 7) for (const per of [0.7, 1.3, 2.9, 3.3, 11.1, 23.4, 47, 49, 66.6, 70.7, 93.1]) {
      const mm = mix([{ id: 'p', name: 'P', marginPerPack: 0.5, perConstraintMin: per, demandPerWeek: d }], 1e9);
      if (mm.rows[0]!.unmade > 0) { hits.push([d, per]); break; }
    }
    expect(hits).toEqual([]);
    /* and a week that is truly short says so on the row AND in the sentence */
    const mm = mix([{ id: 'p', name: 'P', marginPerPack: 0.5, perConstraintMin: 47, demandPerWeek: 100 }], 1);
    expect(mm.rows[0]!.unmade).toBe(53);
    expect(mm.sentence).toMatch(/53 of P unmade\.$/);
  });
});

/* NIOSH Table 5, as published (Applications Manual, 1994), transcribed here
 * independently: rows by lifts a minute; ≤1 h, ≤2 h, ≤8 h; V < 75 · V ≥ 75. */
const NIOSH_FM: Record<number, [[number, number], [number, number], [number, number]]> = {
  0.2: [[1.00, 1.00], [0.95, 0.95], [0.85, 0.85]], 0.5: [[0.97, 0.97], [0.92, 0.92], [0.81, 0.81]], 1: [[0.94, 0.94], [0.88, 0.88], [0.75, 0.75]],
  2: [[0.91, 0.91], [0.84, 0.84], [0.65, 0.65]], 3: [[0.88, 0.88], [0.79, 0.79], [0.55, 0.55]], 4: [[0.84, 0.84], [0.72, 0.72], [0.45, 0.45]],
  5: [[0.80, 0.80], [0.60, 0.60], [0.35, 0.35]], 6: [[0.75, 0.75], [0.50, 0.50], [0.27, 0.27]], 7: [[0.70, 0.70], [0.42, 0.42], [0.22, 0.22]],
  8: [[0.60, 0.60], [0.35, 0.35], [0.18, 0.18]], 9: [[0.52, 0.52], [0.30, 0.30], [0.00, 0.15]], 10: [[0.45, 0.45], [0.26, 0.26], [0.00, 0.13]],
  11: [[0.41, 0.41], [0.00, 0.23], [0.00, 0.00]], 12: [[0.37, 0.37], [0.00, 0.21], [0.00, 0.00]], 13: [[0.00, 0.34], [0.00, 0.00], [0.00, 0.00]],
  14: [[0.00, 0.31], [0.00, 0.00], [0.00, 0.00]], 15: [[0.00, 0.28], [0.00, 0.00], [0.00, 0.00]],
};

describe('AUDIT ergo — the NIOSH lifting equation', () => {
  it('the CCOHS example: 23 × 0.83 × 0.78 × 0.85 × 1 × 1 × 0.90 = 11.4; LI 13 ÷ 11.4 = 1.14', () => {
    expect(rwlFrom({ hm: 0.83, vm: 0.78, dm: 0.85, am: 1, fm: 1, cm: 0.9 })).toBeCloseTo(11.39, 2);
    const r = assessLift({ loadKg: 13, hCm: 30, vCm: 0, dCm: 150, aDeg: 0, liftsPerMin: 0.2, hours: 1, coupling: 'poor' });
    expect(r.m.hm).toBeCloseTo(0.8333, 4); expect(r.m.vm).toBeCloseTo(0.775, 9); expect(r.m.dm).toBeCloseTo(0.85, 9);
    expect(r.rwl).toBeCloseTo(11.39, 1);
    expect(r.li).toBeCloseTo(1.14, 2);
    expect(r.band).toBe('increased');
  });
  it('the four formula multipliers over their ranges, with the equation’s cut-offs', () => {
    const r = rng(99);
    for (let k = 0; k < 200; k++) {
      const h = r() * 80, v = r() * 200, d = r() * 200, a = r() * 160;
      expect(hm(h)).toBeCloseTo(h <= 25 ? 1 : h > 63 ? 0 : 25 / h, 12);
      expect(vm(v)).toBeCloseTo(v > 175 ? 0 : 1 - 0.003 * Math.abs(v - 75), 12);
      expect(dm(d)).toBeCloseTo(d <= 25 ? 1 : d > 175 ? 0 : 0.82 + 4.5 / d, 12);
      expect(am(a)).toBeCloseTo(a > 135 ? 0 : 1 - 0.0032 * a, 12);
    }
    expect(vm(75)).toBe(1); expect(vm(0)).toBeCloseTo(0.775, 9); expect(dm(175)).toBeCloseTo(0.8457, 4); expect(am(135)).toBeCloseTo(0.568, 9);
  });
  it('Table 5 (frequency) row by row and column by column; between rows the next row up; under 0.2 is 0.2; over 15 is 0', () => {
    for (const [f, cols] of Object.entries(NIOSH_FM)) {
      const freq = Number(f);
      ([1, 2, 8] as LiftHours[]).forEach((h, ci) => { expect(fm(freq, h, 50)).toBe(cols[ci]![0]); expect(fm(freq, h, 75)).toBe(cols[ci]![1]); });
    }
    expect(fm(0.1, 8, 50)).toBe(0.85);
    expect(fm(2.5, 8, 50)).toBe(0.55);   // between 2 and 3 → the row of 3 (the more careful)
    expect(fm(16, 1, 100)).toBe(0);
  });
  it('Table 7 (coupling): good 1; fair 0.95 below 75 cm, 1.00 at or above; poor 0.90', () => {
    expect([cm('good', 50), cm('good', 100), cm('fair', 50), cm('fair', 75), cm('poor', 50), cm('poor', 100)]).toEqual([1, 1, 0.95, 1, 0.9, 0.9]);
  });
  it('RWL = 23 × the six; LI = load ÷ RWL; bands ≤ 1 nominal, ≤ 3 increased, > 3 high; outside when a multiplier is 0', () => {
    const r = rng(5);
    for (let k = 0; k < 100; k++) {
      const l = { loadKg: 1 + r() * 30, hCm: 20 + r() * 50, vCm: r() * 180, dCm: r() * 180, aDeg: r() * 140, liftsPerMin: r() * 16, hours: ([1, 2, 8] as LiftHours[])[Math.floor(r() * 3)]!, coupling: (['good', 'fair', 'poor'] as const)[Math.floor(r() * 3)]! };
      const m = multipliers(l), res = assessLift(l);
      const rwl = 23 * m.hm * m.vm * m.dm * m.am * m.fm * m.cm;
      expect(res.rwl).toBeCloseTo(rwl, 12);
      if (rwl > 0) { expect(res.li).toBeCloseTo(l.loadKg / rwl, 12); expect(res.band).toBe(res.li <= 1 ? 'nominal' : res.li <= 3 ? 'increased' : 'high'); }
      else { expect(res.li).toBe(Infinity); expect(res.band).toBe('outside'); expect(res.sentence).not.toMatch(/Infinity|NaN/); }
    }
    expect(liftBand(1)).toBe('nominal'); expect(liftBand(3)).toBe('increased');
  });
});
