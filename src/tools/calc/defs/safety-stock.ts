/* SAFETY STOCK AND THE REORDER POINT — FC-183 (knowledge/specs/FC-183-safety-stock.md; knowledge/methods/planning/safety-stock.md).
 *
 * SS = z × √(L σd² + d̄² σL²), ROP = d̄ L + SS (Silver, Pyke & Thomas 2017; Factory Physics' variance of replenishment-time
 * demand — lib/ie/pull reorderPoint). The service level is a CHOICE, said so on the screen: what running out costs against
 * what holding more costs is the business's to weigh. Money: the safety stock's holding (H) beside the stock-outs it does not
 * prevent (S) — knowledge/MONEY.md §4, FC-183 — each from its own optional inputs. */
import { cyclesShort, reorderPoint, wholeUp } from '../../../lib/ie/pull';
import { duration, fmt, gbp } from '../format';
import type { CalcDef, CalcMoney, Problem, Values } from '../types';

const num = (v: Values, id: string): number => v[id] as number;
const thing = (v: Values): string => (typeof v.thing === 'string' && v.thing.trim() ? v.thing.trim() : 'units');
const SERVICE = ['90', '95', '97.5', '98', '99', '99.5'];

const def: CalcDef = {
  key: 'safety-stock',
  fc: 'FC-183',
  title: 'Safety stock and reorder point',
  says: 'How much to hold so a material rarely runs out, and when to reorder',
  question: 'How much must we hold not to run out, and when do we order?',
  group: 'Pull and stock',
  inputs: [
    { id: 'thing', label: 'What is it', kind: 'text', optional: true, help: 'Film reels, trays, labels — it only names the sentence.' },
    { id: 'mean', label: 'Used a day, on average', unit: 'units a day', kind: 'number', min: 0.000001, help: 'From the days the line ran, not the days in the week.' },
    { id: 'sdDay', label: 'How much a day’s use swings', unit: 'units a day', kind: 'number', min: 0, help: 'The standard deviation of the daily count over a few weeks — in a spreadsheet, STDEV of the days. 0 only if every day is the same.' },
    { id: 'lead', label: 'Days from order to delivery, on average', unit: 'days', kind: 'number', min: 0.000001, help: 'Measured from the orders placed, not read from the contract.' },
    { id: 'sdLead', label: 'How much the delivery time swings', unit: 'days', kind: 'number', min: 0, help: 'The standard deviation of the last deliveries’ days. 0 only if it always arrives on the day promised — few suppliers do.' },
    { id: 'service', label: 'Chance an order arrives before you run out', unit: 'in 100', kind: 'choice', default: '95',
      chosen: 'Faultline’s starting point, 95 in 100 — a choice, not a rule. The right level is what running out costs against what holding more costs, for this item.',
      options: SERVICE.map(s => ({ value: s, label: `${s}%`, help: `${fmt(100 - Number(s), 1)} orders in 100 run short` })) },
    { id: 'orderQty', label: 'Units in an order', unit: 'units', kind: 'number', min: 0.000001, optional: true, money: true, help: 'To count the orders a year, and so how often it would run short.' },
    { id: 'daysYear', label: 'Days a year the line runs', unit: 'days', kind: 'number', min: 1, max: 366, optional: true, money: true, help: 'Asked, never assumed — a line may run five, six or seven days.' },
    { id: 'unitCost', label: 'What one unit costs', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true },
    { id: 'carrying', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true, help: 'Finance will have the business’s figure; the industry quotes 15–35% a year — Faultline never fills it in.' },
    { id: 'shortCost', label: 'What running out costs, each time', unit: '£', kind: 'number', min: 0, optional: true, money: true, help: 'The line stopped, the rush freight, the packs not made — your figure for one stock-out.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const meanLead = num(v, 'mean') * num(v, 'lead');
    const sd = Math.sqrt(num(v, 'lead') * num(v, 'sdDay') ** 2 + num(v, 'mean') ** 2 * num(v, 'sdLead') ** 2);
    if (sd > 0 && meanLead < 2 * sd) out.push({ say: `The swing is more than half of what is used while the order comes, so the bell-shaped model this uses puts more than 2 lead times in 100 below nothing used — it is probably understating the stock. For slow or lumpy items count the days with nothing used and size it another way (Faultline’s rule of thumb: under twice).` });
    return out;
  },
  compute(v) {
    const t = thing(v);
    const svc = Number(v.service) / 100;
    const r = reorderPoint({ mean: num(v, 'mean'), sdDay: num(v, 'sdDay'), lead: num(v, 'lead'), sdLead: num(v, 'sdLead'), service: svc });
    const rop = wholeUp(r.reorder);
    const sv = fmt(Number(v.service), 1);
    const none = r.safety === 0;

    const sentence = none
      ? `Reorder when stock falls to ${fmt(rop, 0)} ${t} — all of it used while the order comes; with no variation in use or in delivery there is nothing to hold in safety.`
      : `Reorder when stock falls to ${fmt(rop, 0)} ${t}: ${fmt(r.meanLead, 1)} are used while the order comes, and ${fmt(r.safety, 1)} more are held so that about ${sv} orders in 100 arrive before it runs out.`;

    /* the bigger source of the spread, halved — the arithmetic of the formula, not a promise */
    const more: string[] = [];
    if (!none) {
      const shareSupplier = r.fromSupplier;
      const halfLead = reorderPoint({ mean: num(v, 'mean'), sdDay: num(v, 'sdDay'), lead: num(v, 'lead'), sdLead: num(v, 'sdLead') / 2, service: svc });
      const halfDay = reorderPoint({ mean: num(v, 'mean'), sdDay: num(v, 'sdDay') / 2, lead: num(v, 'lead'), sdLead: num(v, 'sdLead'), service: svc });
      if (shareSupplier >= 0.5) more.push(`${fmt(shareSupplier * 100, 0)}% of the spread you are covering comes from the delivery time varying; if it varied half as much the safety stock would be ${fmt(halfLead.safety, 1)} ${t}.`);
      else more.push(`${fmt((1 - shareSupplier) * 100, 0)}% of the spread you are covering comes from the daily use varying${shareSupplier === 0 ? '' : ' (the rest is the delivery time)'}; if it varied half as much the safety stock would be ${fmt(halfDay.safety, 1)} ${t}.`);
    }

    const unit = v.unitCost as number | undefined, rate = v.carrying as number | undefined, qty = v.orderQty as number | undefined, days = v.daysYear as number | undefined, shortC = v.shortCost as number | undefined;
    const figures: [string, string][] = [], parts: string[] = [], missing: string[] = [];
    if (unit !== undefined && rate !== undefined) {
      const hold = r.safety * unit * rate / 100;
      figures.push(['Holding the safety stock for a year', gbp(hold)]);
      parts.push(`Holding the ${fmt(r.safety, 1)} ${t} of safety stock costs about ${gbp(hold)} a year at ${gbp(unit)} each and ${fmt(rate, 1)}% a year.`);
    } else missing.push(`Give ${[unit === undefined ? 'what one unit costs' : '', rate === undefined ? 'the cost of holding stock for a year (finance will have it; the industry quotes 15–35%)' : ''].filter(Boolean).join(' and ')} to say what holding the safety stock costs.`);
    if (qty !== undefined && days !== undefined) {
      const c = cyclesShort(num(v, 'mean'), days, qty, svc);
      figures.push(['Orders a year', fmt(c.cycles, 1)], ['Of them running short at this level', fmt(c.short, 1)]);
      if (shortC !== undefined) {
        figures.push(['What running short costs a year', gbp(c.short * shortC)]);
        parts.push(`At ${sv}% about ${fmt(c.short, 1)} of ${fmt(c.cycles, 1)} orders a year run short, ${gbp(c.short * shortC)} a year at ${gbp(shortC)} each time.`);
      } else { parts.push(`At ${sv}% about ${fmt(c.short, 1)} of ${fmt(c.cycles, 1)} orders a year run short.`); missing.push('Give what running out costs, each time, to say what running short costs a year.'); }
    } else missing.push(`Give ${[qty === undefined ? 'the units in an order' : '', days === undefined ? 'the days a year the line runs' : ''].filter(Boolean).join(' and ')} to count the orders a year that run short.`);
    const money: CalcMoney = { ...(parts.length ? { text: parts.join(' '), figures } : {}), missing };

    return {
      verdict: `Reorder at ${fmt(rop, 0)}`,
      tone: 'n',
      sentence,
      ...(more.length ? { more } : {}),
      tiles: [
        { k: 'Reorder point', v: fmt(rop, 0), of: `${t} — order when stock falls to it`, n: rop, fmt: x => `${fmt(x, 0)} ${t}` },
        { k: 'Safety stock', v: fmt(r.safety, 1), of: `${t} held against the swings`, n: r.safety, better: 'lower', fmt: x => `${fmt(x, 1)} ${t}` },
        { k: 'Used while it comes', v: fmt(r.meanLead, 1), of: `${t}: ${fmt(num(v, 'mean'), 2)} a day × ${duration(num(v, 'lead') * 24)}`, n: r.meanLead, fmt: x => `${fmt(x, 1)} ${t}` },
        { k: 'Service', v: `${sv}%`, of: `of orders arrive in time (z ${fmt(r.z, 2)})`, n: Number(v.service), better: 'higher', fmt: x => `${fmt(x, 1)} points` },
        unit !== undefined && rate !== undefined
          ? { k: 'Holding it', v: gbp(r.safety * unit * rate / 100), of: 'a year, the safety stock', n: r.safety * unit * rate / 100, better: 'lower', fmt: gbp }
          : { k: 'Holding it', v: '—', of: 'give a cost and a holding rate' },
      ],
      working: [
        { label: 'Used while the order comes', value: `${fmt(num(v, 'mean'), 3)} × ${fmt(num(v, 'lead'), 3)} days = ${fmt(r.meanLead, 3)} ${t}`, note: 'd̄ × L' },
        { label: 'Swing from daily use', value: `${fmt(num(v, 'lead'), 3)} × ${fmt(num(v, 'sdDay'), 3)}² = ${fmt(num(v, 'lead') * num(v, 'sdDay') ** 2, 3)}`, note: 'L × σd²' },
        { label: 'Swing from the delivery time', value: `${fmt(num(v, 'mean'), 3)}² × ${fmt(num(v, 'sdLead'), 3)}² = ${fmt(num(v, 'mean') ** 2 * num(v, 'sdLead') ** 2, 3)}`, note: 'd̄² × σL²' },
        { label: 'Spread over the lead time', value: `√(${fmt(num(v, 'lead') * num(v, 'sdDay') ** 2, 3)} + ${fmt(num(v, 'mean') ** 2 * num(v, 'sdLead') ** 2, 3)}) = ${fmt(r.sdLead, 3)} ${t}`, note: 'the variance of replenishment-time demand' },
        { label: 'Safety factor z', value: `${sv}% → z = ${fmt(r.z, 4)}`, note: 'the bell-shaped model’s z for that chance' },
        { label: 'Safety stock', value: `${fmt(r.z, 4)} × ${fmt(r.sdLead, 3)} = ${fmt(r.safety, 2)} ${t}`, note: 'SS = z × √(L σd² + d̄² σL²)' },
        { label: 'Reorder point', value: `${fmt(r.meanLead, 3)} + ${fmt(r.safety, 2)} = ${fmt(r.reorder, 2)}, rounded up to ${fmt(rop, 0)}`, note: 'ROP = d̄ L + SS' },
      ],
      caveats: [
        'It assumes the use over the lead time is bell-shaped. For slow or lumpy items — some days nothing, some days a lot — it understates the stock needed.',
        'The same service level for every item ignores what running out costs; set it by the consequence — a film reel that stops the line is not a box of spare gloves.',
        'Daily use and delivery time are taken as independent, and the delivery time as measured on the orders placed — a contract’s promised days are not a measure.',
        'It is a reorder point for one item ordered when stock falls to it (continuous review); it says nothing of how big the order should be.',
      ],
      money,
      closing: none
        ? `Reorder at ${fmt(rop, 0)} ${t} and hold nothing extra — only while use and delivery never vary.`
        : `Reorder at ${fmt(rop, 0)} ${t}, ${fmt(r.safety, 1)} of it held as safety for ${sv} orders in 100. The swing sets the stock — steadier deliveries or steadier use come straight off it.`,
    };
  },
  examples: [
    {
      name: 'Film reels, a supplier whose delivery swings (the knowledge record’s worked case)',
      source: 'knowledge/methods/planning/safety-stock.md; Silver, Pyke & Thomas (2017); scripts/knowledge/cases-calc.py S1 (SciPy norm.ppf 0.98 = 2.05375)',
      inputs: { thing: 'reels', mean: 2.4, sdDay: 0.9, lead: 5, sdLead: 1.5, service: '98' },
      expect: {
        verdict: 'Reorder at 21', tone: 'n',
        sentence: 'Reorder when stock falls to 21 reels: 12 are used while the order comes, and 8.5 more are held so that about 98 orders in 100 arrive before it runs out.',
        tiles: { 'Reorder point': '21', 'Safety stock': '8.5', 'Used while it comes': '12', Service: '98%', 'Holding it': '—' },
      },
    },
    {
      name: 'A supplier who always arrives on the day, with the money given',
      source: 'by hand and SciPy: 1.64485 × 20 × √4 = 65.79; scripts/knowledge/cases-calc.py S2, S3',
      inputs: { mean: 100, sdDay: 20, lead: 4, sdLead: 0, service: '95', orderQty: 500, daysYear: 250, unitCost: 2.5, carrying: 20, shortCost: 800 },
      expect: {
        verdict: 'Reorder at 466', tone: 'n',
        sentence: 'Reorder when stock falls to 466 units: 400 are used while the order comes, and 65.8 more are held so that about 95 orders in 100 arrive before it runs out.',
        tiles: { 'Reorder point': '466', 'Safety stock': '65.8', 'Used while it comes': '400', Service: '95%', 'Holding it': '£32.90' },
        money: 'Holding the 65.8 units of safety stock costs about £32.90 a year at £2.50 each and 20% a year. At 95% about 2.5 of 50 orders a year run short, £2,000 a year at £800.00 each time.',
      },
    },
    {
      name: 'No variation at all: nothing to hold in safety',
      source: 'the formula at σ = 0: ROP = d̄ L',
      inputs: { mean: 10, sdDay: 0, lead: 3, sdLead: 0, service: '99' },
      expect: {
        verdict: 'Reorder at 30', tone: 'n',
        sentence: 'Reorder when stock falls to 30 units — all of it used while the order comes; with no variation in use or in delivery there is nothing to hold in safety.',
        tiles: { 'Reorder point': '30', 'Safety stock': '0', 'Used while it comes': '30', Service: '99%', 'Holding it': '—' },
      },
    },
    {
      name: 'Lumpy use: a swing larger than half of what is used while the order comes is warned',
      source: 'SciPy norm.ppf(0.95) × 3 = 4.93456; by hand 2 × 1 = 2 used, 2 < 2 × 3; scripts/knowledge/cases-calc.py S5',
      inputs: { mean: 2, sdDay: 3, lead: 1, sdLead: 0, service: '95' },
      expect: {
        verdict: 'Reorder at 7', tone: 'n',
        sentence: 'Reorder when stock falls to 7 units: 2 are used while the order comes, and 4.9 more are held so that about 95 orders in 100 arrive before it runs out.',
        tiles: { 'Reorder point': '7', 'Safety stock': '4.9', 'Used while it comes': '2', Service: '95%', 'Holding it': '—' },
        warns: ['more than 2 lead times in 100 below nothing used'],
      },
    },
  ],
  refused: [
    { name: 'a service level that is not offered', inputs: { mean: 10, sdDay: 1, lead: 3, sdLead: 0, service: '50' }, blocked: 'Choose “Chance an order arrives before you run out”' },
    { name: 'a negative swing', inputs: { mean: 10, sdDay: -1, lead: 3, sdLead: 0, service: '95' }, blocked: 'must be at least 0' },
    { name: 'no days to delivery', inputs: { mean: 10, sdDay: 1, sdLead: 0, service: '95' }, blocked: 'Give “Days from order to delivery, on average”' },
  ],
  see: [{ key: 'kanban', why: 'line-side replenishment of the same material, sized as a pull loop' }],
};

export default def;
