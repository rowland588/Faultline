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

describe('the Stevenson week (cases-capacity.py): design 120 a minute × 24 h × 7 d, effective 100 × 16 h × 5 d, actual 148,000', () => {
  it('12% of design and 31% of effective — the two ratios told apart', () => {
    /* 10,080 minutes at the plate; 6,080 of them out leaves 4,000 minutes × 120 = 480,000 */
    const t = threeNumbers({ ratePerMin: 120, plannedMin: 10_080, plannedLossMin: 6_080, actualPacks: 148_000 });
    expect([t.design, t.effective]).toEqual([1_209_600, 480_000]);
    expect(t.utilisation).toBeCloseTo(0.1224, 4);
    expect(t.efficiency).toBeCloseTo(0.3083, 4);
  });
});

describe('the mix in money (cases-capacity-three-mix.py)', () => {
  /* £0.12 × 300 = £36, £0.25 × 120 = £30, £0.60 × 40 = £24 a constraint minute; 3,000 minutes against 4,500 asked */
  const snack = { id: 's', name: 'Snack 250 g', marginPerPack: 0.12, perConstraintMin: 300, demandPerWeek: 300_000 };
  const std = { id: 'm', name: 'Standard 500 g', marginPerPack: 0.25, perConstraintMin: 120, demandPerWeek: 240_000 };
  const fam = { id: 'f', name: 'Family 1.5 kg', marginPerPack: 0.60, perConstraintMin: 40, demandPerWeek: 60_000 };
  it('the ranking reverses the margin a pack, and earns £96,000 against the habit’s £81,000', () => {
    const m = mix([fam, std, snack], 3000);
    expect(m.rows.map(r => r.product.name)).toEqual(['Snack 250 g', 'Standard 500 g', 'Family 1.5 kg']);
    expect(m.rows.map(r => r.perMin)).toEqual([36, 30, 24].map(x => expect.closeTo(x, 9)));
    expect(m.throughput).toBeCloseTo(96_000, 6);
    expect([m.rows[2].made, m.rows[2].unmade]).toEqual([0, 60_000]);
    expect(m.unmadeWorth).toBeCloseTo(36_000, 6);
    expect(m.habit?.firstName).toBe('Family 1.5 kg');
    expect(m.habit?.throughput).toBeCloseTo(81_000, 6);
    expect(m.habit?.ranking).toBeCloseTo(15_000, 6);
  });
  it('a minute lost costs the last product made’s £30; one gained earns the first left out’s £24', () => {
    const m = mix([fam, std, snack], 3000);
    expect(m.lostMinute).toBeCloseTo(30, 9);
    expect(m.extraMinute).toBeCloseTo(24, 9);
  });
  it('with room in the week neither is output: no lost minute, no extra, no habit gap when the orders agree', () => {
    const m = mix([std, snack], 3500);
    expect(m.lostMinute).toBeUndefined(); expect(m.extraMinute).toBeUndefined();
    expect(m.unmadeWorth).toBe(0);
    expect(m.habit?.ranking).toBe(0);
  });
  it('the 4-product case with 1,200 minutes: Tesco partly made (29,333 of 45,000), Baby 1kg not at all — £50,793', () => {
    const p = [
      { id: 'k', name: 'King Edward 2.5kg', marginPerPack: 0.55, perConstraintMin: 90, demandPerWeek: 30_000 },
      { id: 'm', name: 'Maris 2kg', marginPerPack: 0.42, perConstraintMin: 100, demandPerWeek: 60_000 },
      { id: 't', name: 'Tesco 1.25kg', marginPerPack: 0.31, perConstraintMin: 110, demandPerWeek: 45_000 },
      { id: 'b', name: 'Baby 1kg', marginPerPack: 0.20, perConstraintMin: 120, demandPerWeek: 24_000 },
    ];
    const m = mix(p, 1200);
    expect(m.rows.map(r => [r.product.name, r.made, r.unmade])).toEqual([['King Edward 2.5kg', 30_000, 0], ['Maris 2kg', 60_000, 0], ['Tesco 1.25kg', 29_333, 15_667], ['Baby 1kg', 0, 24_000]]);
    expect(m.throughput).toBeCloseTo(50_793.23, 2);
    expect(m.habit).toBeUndefined();   // here the margin a pack and the minute agree
  });
  it('Martin’s problem: $235 at 15 min = $15.67 a minute beats $300 at 30 min = $10.00', () => {
    const m = mix([{ id: 'a', name: 'B', marginPerPack: 300, perConstraintMin: 1 / 30, demandPerWeek: 1 }, { id: 'b', name: 'A', marginPerPack: 235, perConstraintMin: 1 / 15, demandPerWeek: 1 }], 100);
    expect(m.rows.map(r => r.product.name)).toEqual(['A', 'B']);
    expect(m.rows[0].perMin).toBeCloseTo(15.6667, 3);
    expect(m.rows[1].perMin).toBeCloseTo(10, 9);
  });
});
