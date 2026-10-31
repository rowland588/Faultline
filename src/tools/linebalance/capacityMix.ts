/* WHICH PRODUCT FIRST WHEN THE LINE IS FULL — throughput per constraint minute, on the line's capacity panel
 * (FC-042 — knowledge/specs/FC-042-product-mix.md; knowledge/methods/capacity/throughput-accounting.md;
 * docs/CAPACITY.md §7).
 *
 * When the constraint cannot make everything asked, the mix is chosen by what each product earns per MINUTE OF THE
 * CONSTRAINT, not per pack: throughput a pack (price less the truly variable cost — materials and packaging, never
 * labour or overhead, Goldratt and Corbett) × packs a constraint minute, ranked, the week's minutes filled in that
 * order up to each product's orders; what does not fit is said unmade, by name and in money. The arithmetic is
 * `lib/ie/mix`; this reads a line's products into it — each product's Line capacity is its speed (the good packs a
 * minute the line makes of it, held at its constraint), its orders a week the panel's "Will next week's orders fit?",
 * its price and materials the two numbers typed on the panel — and says what the arithmetic found in money:
 *
 *   throughput    Σ packs made × throughput a pack, in the ranked order — and the same week in the order of margin a
 *                 pack, the habit, where the two part: what the ranking earns beyond it;
 *   unmade worth  the packs left unmade × their throughput a pack, "if the constraint had the minutes";
 *   a minute      lost at the constraint costs the £ a minute of the last product the week reaches; one gained earns
 *                 the first product left out's. While the week has room neither is output yet: said so, never
 *                 priced (a minute lost off the constraint, or with room to spare, costs only labour).
 *
 * Nothing is assumed: a product with no speed, orders or contribution is left out and said why; with only the line's
 * margin a pack each product carries the same, so the ranking is by speed alone and says so; the week's minutes are
 * the line's running pattern, else its planned hours — or not known, and said. The changeovers between products are
 * not taken off the week (the sequence's job, FC-070). Pure; no AI in any figure. */
import { mix, type Mix, type MixProduct } from '../../lib/ie/mix';
import { analyse, type Capacity } from './capacity';
import { contributionOf } from '../losses/losses';

const big = (n: number): string => Math.round(n).toLocaleString('en-GB');
/** £ with pence under a hundred (a constraint minute is £30.00), whole pounds above. */
const gbp = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;
const gbp0 = (n: number): string => `£${Math.round(n).toLocaleString('en-GB')}`;

export interface MixStandard { id: string; product: string; capacity?: Capacity }
export interface MixCost { marginPerPack?: number; materialsPerPack?: number }

export interface LineMix {
  mix: Mix;
  unit: string;
  /** Where each ranked product's throughput a pack came from. */
  from: Record<string, 'price' | 'margin'>;
  /** Products not in the ranking, and why (this module's reasons, then the arithmetic's). */
  left: { product: string; why: string }[];
  /** Every product carries the line’s margin a pack — the ranking is by speed alone. */
  sameMargin: boolean;
  /** The ranking, its week and what is unmade — the arithmetic's own sentence. */
  sentence: string;
  /** The money, in sentences, each only where its inputs are in. */
  money: string[];
  /** What is missing, and where to give it. */
  notes: string[];
}

/** Rank a line's products by throughput per constraint minute and fill the week. Undefined while no product has a
 *  Line capacity. */
export function mixOfLine(products: readonly MixStandard[], o: { weekMinutes?: number; cost?: MixCost; constraint?: string } = {}): LineMix | undefined {
  const withCap = products.filter(p => p.capacity?.stations.length);
  if (!withCap.length) return undefined;
  const unit = withCap[0].capacity?.stations[0]?.unit?.trim() || 'packs';
  const left: LineMix['left'] = [];
  const from: LineMix['from'] = {};
  const inputs: MixProduct[] = [];
  for (const p of withCap) {
    const cap = p.capacity as Capacity;
    const r = analyse(cap);
    const rate = r.goodOut ?? r.line;
    const name = p.product.trim() || 'A product';
    if (rate == null || !(rate > 0)) { left.push({ product: name, why: 'no speed worked out in its Line capacity' }); continue; }
    const c = contributionOf({
      ...(o.cost?.marginPerPack != null ? { marginPerPack: o.cost.marginPerPack } : {}),
      ...(cap.pricePerPack != null ? { pricePerPack: cap.pricePerPack } : {}),
      ...((cap.materialsPerPack ?? o.cost?.materialsPerPack) != null ? { materialsPerPack: (cap.materialsPerPack ?? o.cost?.materialsPerPack) as number } : {}),
    });
    if (c) from[p.id] = c.from;
    inputs.push({
      id: p.id, name, perConstraintMin: rate,
      ...(c ? { marginPerPack: c.perPack } : {}),
      ...(cap.demandPerWeek != null && cap.demandPerWeek >= 0 ? { demandPerWeek: cap.demandPerWeek } : {}),
    });
  }
  const week = o.weekMinutes != null && o.weekMinutes > 0 ? o.weekMinutes : 0;
  const m = mix(inputs, week);
  for (const s of m.skipped) left.push({ product: s.product.name, why: s.why === 'no demand a week yet' ? 'no orders for the week yet' : s.why });
  const sameMargin = m.rows.length > 1 && m.rows.every(r => from[r.product.id] === 'margin');
  const where = o.constraint?.trim() ? `the ${o.constraint.trim()}` : 'the constraint';

  const money: string[] = [];
  const notes: string[] = [];
  if (m.rows.length && week > 0) {
    money.push(`Run in that order the week earns ${gbp0(m.throughput)} of throughput (price less materials).`);
    if (m.habit) money.push(`Run by margin a pack instead — ${m.habit.firstName} first — it would earn ${gbp0(m.habit.throughput)}: the ranking earns ${gbp0(m.habit.ranking)} more.`);
    const unmade = m.rows.filter(r => r.unmade > 0);
    if (unmade.length) money.push(`${unmade.map(r => `${big(r.unmade)} ${r.product.name}`).join(' and ')} unmade — worth ${gbp0(m.unmadeWorth)} of throughput if ${where} had the minutes.`);
    if (m.lostMinute != null) {
      const last = [...m.rows].reverse().find(r => r.minutesGiven > 0);
      const out = m.rows.find(r => r.unmade > 0);
      money.push(`A minute lost at ${where} costs ${gbp(m.lostMinute)}${last ? ` (a ${last.product.name} minute)` : ''}; a minute gained earns ${gbp(m.extraMinute ?? 0)}${out ? ` (${out.product.name}’s)` : ''} — the figure that prices a stop, a changeover or a speed loss there.`);
    } else money.push(`The week has room (it fills at ${Math.round(m.fill * 100)}%): a minute lost at ${where} is not output lost yet.`);
  }
  if (sameMargin) notes.push('Every product carries the line’s margin a pack, so they are ranked by speed alone — give each its price and materials to rank on what it earns.');
  if (!(week > 0)) notes.push('The line’s week is not known — set how it runs (shifts and days) on its SMED, or its planned hours on a product’s Line capacity.');
  if (m.skipped.some(s => s.why === 'no margin a pack yet')) notes.push('Give the line a margin a pack (Set up the line), or each product its price and materials, to rank on what a minute earns.');
  if (m.skipped.some(s => s.why === 'no demand a week yet')) notes.push('Type the week’s orders for the products left out (Will next week’s orders fit?).');
  return { mix: m, unit, from, left, sameMargin, sentence: m.sentence, money, notes };
}
