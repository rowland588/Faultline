/* CAPACITY'S THREE NUMBERS, AND THE PRODUCT MIX — docs/TOOLKIT.md Part 4 §10;
 * docs/BUILD.md, H2.
 *
 * Three numbers for a station or a line: what it was built to make (design —
 * the plate), what it can really make once the planned losses of a shift are
 * taken out (effective), and what it made (actual — a shift's count, by hand).
 * Utilisation = actual ÷ design; efficiency = actual ÷ effective; loading =
 * demand ÷ effective — "demand needs 92% of what the line can really make".
 * Proved by: 148,000 ÷ 201,600 = 73%, ÷ 175,000 = 85%.
 *
 * The mix: when the constraint cannot make everything asked, which product
 * first? The one that earns most per constraint minute — margin a pack × packs
 * a minute on the constraint. Ranked, the week is filled in that order up to
 * each demand; what is left is said as unmade, by name. Proved by:
 * £0.40 × 80 = £32 a minute, £0.60 × 40 = £24 — A first.
 *
 * The practice: design, effective and actual capacity, utilisation and
 * efficiency as Stevenson's Operations Management defines them; throughput
 * (price less truly variable cost) per constraint minute as Goldratt's
 * throughput accounting ranks products (ACCA's worked problems).
 *
 * Nothing here reads a sensor. The rate is the plate or a timed speed, the
 * planned losses are typed once on the standard, the count is a person's. */
import { fmtGBP } from '../cost';

export interface ThreeNumbersIn {
  /** Packs a minute at running speed — the plate, or timed. */
  ratePerMin: number;
  /** The shift's planned minutes. */
  plannedMin: number;
  /** Planned losses a shift — breaks not covered, cleaning, the start-up. */
  plannedLossMin?: number;
  /** Packs made this shift, counted. */
  actualPacks?: number;
  /** Packs wanted this shift. */
  demandPacks?: number;
}

export interface ThreeNumbers {
  design: number;
  effective: number;
  actual?: number;
  /** Fractions; absent when the figure they need is absent. */
  utilisation?: number;
  efficiency?: number;
  loading?: number;
  sentence: string;
}

const pct = (f: number): string => `${Math.round(f * 100)}%`;
const n0 = (n: number): string => Math.round(n).toLocaleString('en-GB');

export function threeNumbers(i: ThreeNumbersIn): ThreeNumbers {
  const design = i.ratePerMin * i.plannedMin;
  const effective = i.ratePerMin * Math.max(0, i.plannedMin - (i.plannedLossMin ?? 0));
  const out: ThreeNumbers = { design, effective, sentence: '' };
  if (i.actualPacks != null) {
    out.actual = i.actualPacks;
    if (design > 0) out.utilisation = i.actualPacks / design;
    if (effective > 0) out.efficiency = i.actualPacks / effective;
  }
  if (i.demandPacks != null && effective > 0) out.loading = i.demandPacks / effective;
  const bits = [`Built to make ${n0(design)} a shift`, `really ${n0(effective)} after ${n0(i.plannedLossMin ?? 0)} planned minutes out`];
  if (out.actual != null) bits.push(`made ${n0(out.actual)} — ${pct(out.utilisation ?? 0)} of design, ${pct(out.efficiency ?? 0)} of what it can really make`);
  if (out.loading != null) bits.push(`demand needs ${pct(out.loading)} of what it can really make`);
  out.sentence = bits.join('; ') + '.';
  return out;
}

export interface MixProduct {
  id: string;
  name: string;
  /** Price less materials, a pack. */
  marginPerPack?: number;
  /** Packs wanted a week. */
  demandPerWeek?: number;
  /** Packs a minute the constraint makes of this product. */
  perConstraintMin?: number;
}

export interface MixRow {
  product: MixProduct;
  /** £ earned a constraint minute. */
  perMin: number;
  /** Minutes of the constraint its whole demand needs. */
  minutesNeeded: number;
  /** Of the week, in this order. */
  minutesGiven: number;
  made: number;
  unmade: number;
  /** £ the packs made earn (throughput: price less materials, a pack × packs). */
  throughput: number;
  /** £ the packs left unmade would have earned — had the constraint the minutes. */
  unmadeWorth: number;
}

export interface Mix {
  /** Ranked, the best earner first. */
  rows: MixRow[];
  /** Products left out, and why. */
  skipped: { product: MixProduct; why: string }[];
  /** The share of the week all the demand would need; over 1 means something goes unmade. */
  fill: number;
  /** The week's minutes the constraint has. */
  weekMinutes: number;
  /** £ the week earns in this order (Σ packs made × margin a pack), and what the unmade packs are worth. */
  throughput: number;
  unmadeWorth: number;
  /** What a minute LOST at the constraint costs: the £ a minute of the last product the week reaches. Absent
   *  while the week has room — a minute lost then is not output lost yet (Goldratt: only the constraint's
   *  minute is the line's). */
  lostMinute?: number;
  /** What a minute GAINED would earn: the £ a minute of the first product left unmade. Absent when nothing is. */
  extraMinute?: number;
  /** The same week filled in the order of margin a pack — the habit — and what the ranking earns beyond it. */
  habit?: { throughput: number; firstName: string; ranking: number };
  sentence: string;
}

/** Fill the constraint's minutes down a list of rows in the order given: each is given the minutes it needs while
 *  any are left, and made whole only when it had them all. */
function fillWeek(rows: MixRow[], weekMinutes: number): void {
  let left = Math.max(0, weekMinutes);
  for (const r of rows) {
    r.minutesGiven = Math.min(left, r.minutesNeeded);
    left -= r.minutesGiven;
    /* A product given every minute it needs is made whole: 15 ÷ 11 × 11 is
       14.999… in floating point, and the floor said "1 unmade" of a demand
       the week had room for (docs/UPGRADE-AUDIT.md M1). */
    const demand = r.product.demandPerWeek ?? 0;
    r.made = r.minutesGiven >= r.minutesNeeded - 1e-9 ? demand : Math.min(demand, Math.floor(r.minutesGiven * (r.product.perConstraintMin ?? 0) + 1e-9));
    r.unmade = Math.max(0, demand - r.made);
    r.throughput = r.made * (r.product.marginPerPack ?? 0);
    r.unmadeWorth = r.unmade * (r.product.marginPerPack ?? 0);
  }
}

/** Rank by £ a constraint minute and fill the constraint's week in that order. */
export function mix(products: MixProduct[], weekMinutes: number): Mix {
  const skipped: Mix['skipped'] = [];
  const rows: MixRow[] = [];
  for (const p of products) {
    if (p.marginPerPack == null) { skipped.push({ product: p, why: 'no margin a pack yet' }); continue; }
    if (!p.perConstraintMin) { skipped.push({ product: p, why: 'no speed on the constraint yet' }); continue; }
    if (p.demandPerWeek == null) { skipped.push({ product: p, why: 'no demand a week yet' }); continue; }
    rows.push({ product: p, perMin: p.marginPerPack * p.perConstraintMin, minutesNeeded: p.demandPerWeek / p.perConstraintMin, minutesGiven: 0, made: 0, unmade: 0, throughput: 0, unmadeWorth: 0 });
  }
  rows.sort((a, b) => b.perMin - a.perMin);
  fillWeek(rows, weekMinutes);
  const needed = rows.reduce((s, r) => s + r.minutesNeeded, 0);
  const fill = weekMinutes > 0 ? needed / weekMinutes : 0;
  const unmade = rows.filter(r => r.unmade > 0);
  const throughput = rows.reduce((n, r) => n + r.throughput, 0);
  const unmadeWorth = rows.reduce((n, r) => n + r.unmadeWorth, 0);
  /* a minute lost costs what the last product made earns a minute — only while the week is full (something unmade);
     a minute gained earns what the first product left out would */
  const lastMade = [...rows].reverse().find(r => r.minutesGiven > 0);
  const firstOut = rows.find(r => r.unmade > 0);
  const lostMinute = weekMinutes > 0 && unmade.length && lastMade ? lastMade.perMin : undefined;
  const extraMinute = weekMinutes > 0 && firstOut ? firstOut.perMin : undefined;
  /* the habit: the same minutes given in the order of margin a pack, biggest first — where it parts from the ranking
     the ranking earns the difference */
  let habit: Mix['habit'];
  if (rows.length > 1 && weekMinutes > 0) {
    const byPack = rows.map(r => ({ ...r })).sort((a, b) => (b.product.marginPerPack ?? 0) - (a.product.marginPerPack ?? 0));
    fillWeek(byPack, weekMinutes);
    const h = byPack.reduce((n, r) => n + r.throughput, 0);
    if (byPack.map(r => r.product.id).join() !== rows.map(r => r.product.id).join()) habit = { throughput: h, firstName: byPack[0].product.name, ranking: throughput - h };
  }
  let sentence: string;
  if (!rows.length) sentence = skipped.length ? `No product has its margin, speed and demand yet (${skipped.length} to fill in).` : 'No products yet.';
  /* No minutes on the constraint: nothing is made — it said "fills at 0%;
     everything is made" (audit, 13 October). */
  else if (!(weekMinutes > 0)) sentence = `The constraint has no minutes in the week yet — say how long it runs to fill it; ${rows[0].product.name} would go first.`;
  else {
    const rank = rows.map((r, i) => `${r.product.name} ${i === 0 ? 'earns ' : ''}${fmtGBP(r.perMin)}${i === 0 ? ' a constraint minute' : ''}`).join(', ');
    const first = rows[0];
    /* the sentence reads the rows, so it never says "everything is made"
       beside a row that says unmade */
    const week = unmade.length
      ? `The week is full at ${pct(fill)} of it asked; ${unmade.map(r => `${n0(r.unmade)} of ${r.product.name}`).join(' and ')} unmade.`
      : `The week fills at ${pct(fill)}; everything is made.`;
    sentence = `${rank} — ${first ? first.product.name : ''} first. ${week}`;
  }
  return { rows, skipped, fill, weekMinutes, throughput, unmadeWorth, ...(lostMinute != null ? { lostMinute } : {}), ...(extraMinute != null ? { extraMinute } : {}), ...(habit ? { habit } : {}), sentence };
}
