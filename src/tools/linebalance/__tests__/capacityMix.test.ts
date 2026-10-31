/* THE MIX ON A LINE (FC-042): the line's products read into lib/ie/mix and the money said — proved on the case of
 * scripts/knowledge/cases-capacity-three-mix.py: Snack £0.12 × 300 = £36, Standard £0.25 × 120 = £30, Family
 * £0.60 × 40 = £24 a constraint minute; 3,000 minutes against 4,500 asked; £96,000 against the habit's £81,000. */
import { describe, it, expect } from 'vitest';
import type { Capacity, Station } from '../capacity';
import { mixOfLine, type MixStandard } from '../capacityMix';

/* one machine on its plate, so the line makes exactly `rate` good a minute */
const product = (id: string, name: string, rate: number, o: Partial<Capacity> = {}): MixStandard => ({
  id, product: name,
  capacity: { stations: [{ id: `${id}-s`, name: 'Filler', kind: 'machine', unit: 'packs', contains: 1, rate, ratePer: 'min', source: 'plate' } as Station], ...o },
});
const snack = (o: Partial<Capacity> = {}) => product('s', 'Snack 250 g', 300, { demandPerWeek: 300_000, pricePerPack: 0.30, materialsPerPack: 0.18, ...o });
const std = (o: Partial<Capacity> = {}) => product('m', 'Standard 500 g', 120, { demandPerWeek: 240_000, pricePerPack: 0.55, materialsPerPack: 0.30, ...o });
const fam = (o: Partial<Capacity> = {}) => product('f', 'Family 1.5 kg', 40, { demandPerWeek: 60_000, pricePerPack: 1.20, materialsPerPack: 0.60, ...o });

describe('a line’s products ranked by what a constraint minute earns', () => {
  const l = mixOfLine([fam(), std(), snack()], { weekMinutes: 3000, constraint: 'Filler' });
  it('ranks Snack £36, Standard £30, Family £24 a minute — the reverse of the margin a pack', () => {
    expect(l?.mix.rows.map(r => [r.product.name, Math.round(r.perMin * 100) / 100])).toEqual([['Snack 250 g', 36], ['Standard 500 g', 30], ['Family 1.5 kg', 24]]);
    expect(l?.from).toEqual({ f: 'price', m: 'price', s: 'price' });
    expect(l?.sameMargin).toBe(false);
  });
  it('fills the 3,000 minutes in that order and says the rest unmade, by name', () => {
    expect(l?.sentence).toBe('Snack 250 g earns £36 a constraint minute, Standard 500 g £30, Family 1.5 kg £24 — Snack 250 g first. The week is full at 150% of it asked; 60,000 of Family 1.5 kg unmade.');
  });
  it('says the money: £96,000 against the habit’s £81,000, £36,000 unmade, a minute lost £30 and gained £24', () => {
    expect(l?.money).toEqual([
      'Run in that order the week earns £96,000 of throughput (price less materials).',
      'Run by margin a pack instead — Family 1.5 kg first — it would earn £81,000: the ranking earns £15,000 more.',
      '60,000 Family 1.5 kg unmade — worth £36,000 of throughput if the Filler had the minutes.',
      'A minute lost at the Filler costs £30.00 (a Standard 500 g minute); a minute gained earns £24.00 (Family 1.5 kg’s) — the figure that prices a stop, a changeover or a speed loss there.',
    ]);
    expect(l?.notes).toEqual([]);
  });
  it('with room in the week no minute is priced as lost', () => {
    const r = mixOfLine([std(), snack()], { weekMinutes: 4000, constraint: 'Filler' });
    expect(r?.money[r.money.length - 1]).toBe('The week has room (it fills at 75%): a minute lost at the Filler is not output lost yet.');
  });
});

describe('what is not given is named, never invented', () => {
  it('only the line’s margin a pack: every product carries the same, so the ranking is by speed alone — said', () => {
    const l = mixOfLine([snack({ pricePerPack: undefined, materialsPerPack: undefined }), std({ pricePerPack: undefined, materialsPerPack: undefined })], { weekMinutes: 3000, cost: { marginPerPack: 0.2 } });
    expect(l?.from).toEqual({ s: 'margin', m: 'margin' });
    expect(l?.sameMargin).toBe(true);
    expect(l?.mix.rows.map(r => r.product.name)).toEqual(['Snack 250 g', 'Standard 500 g']);
    expect(l?.notes).toContain('Every product carries the line’s margin a pack, so they are ranked by speed alone — give each its price and materials to rank on what it earns.');
  });
  it('the line’s materials stand in for a product’s own; its price is its own', () => {
    const l = mixOfLine([snack({ materialsPerPack: undefined })], { weekMinutes: 3000, cost: { materialsPerPack: 0.2 } });
    expect(l?.mix.rows[0]?.product.marginPerPack).toBeCloseTo(0.1, 9);
  });
  it('no margin or price at all: left out and asked for in words; no orders: left out and asked for', () => {
    const l = mixOfLine([snack({ pricePerPack: undefined, materialsPerPack: undefined }), std({ demandPerWeek: undefined })], { weekMinutes: 3000 });
    expect(l?.mix.rows).toEqual([]);
    expect(l?.left.map(x => `${x.product}: ${x.why}`)).toEqual(['Snack 250 g: no margin a pack yet', 'Standard 500 g: no orders for the week yet']);
    expect(l?.notes).toContain('Give the line a margin a pack (Set up the line), or each product its price and materials, to rank on what a minute earns.');
    expect(l?.notes).toContain('Type the week’s orders for the products left out (Will next week’s orders fit?).');
  });
  it('the week not known: said, and nothing made-up filled in', () => {
    const l = mixOfLine([snack(), std()], {});
    expect(l?.notes).toContain('The line’s week is not known — set how it runs (shifts and days) on its SMED, or its planned hours on a product’s Line capacity.');
    expect(l?.sentence).toBe('The constraint has no minutes in the week yet — say how long it runs to fill it; Snack 250 g would go first.');
    expect(l?.money).toEqual([]);
  });
  it('a product with no speed worked out is left out; no products with a Line capacity is nothing', () => {
    const l = mixOfLine([snack(), product('x', 'Odd', 0, { demandPerWeek: 1000, pricePerPack: 1, materialsPerPack: 0.5 })], { weekMinutes: 3000 });
    expect(l?.left).toEqual([{ product: 'Odd', why: 'no speed worked out in its Line capacity' }]);
    expect(mixOfLine([{ id: 'n', product: 'None' }], { weekMinutes: 3000 })).toBeUndefined();
  });
});
