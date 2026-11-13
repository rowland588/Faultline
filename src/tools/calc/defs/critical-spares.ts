/* CRITICAL SPARES — FC-066 (knowledge/specs/FC-066-critical-spares.md; maintenance.spares-poisson). */
import {
  pNoDemand,
  poissonStockLevel,
  sparesDemandMu,
  sparesDemandPerHour,
  stockOutRisk,
} from '../../../lib/ie/spares';
import { duration, fmt, gbp } from '../format';
import type { CalcDef, CalcMoney, Problem, Values } from '../types';

const num = (v: Values, id: string): number => v[id] as number;
const part = (v: Values): string => (typeof v.part === 'string' && v.part.trim() ? v.part.trim() : 'parts');
const SERVICE = ['90', '95', '97.5', '98', '99', '99.5'];

const def: CalcDef = {
  key: 'critical-spares',
  fc: 'FC-066',
  title: 'Critical spares',
  says: 'How many spares to hold so a stock-out over the lead time is rare enough',
  question: 'How many of this part should be on the shelf?',
  group: 'Reliability and maintenance',
  inputs: [
    { id: 'part', label: 'Part', kind: 'text', optional: true, help: 'Seal-jaw heater, knife, load cell — names the sentence only.' },
    { id: 'mtbf', label: 'MTBF of one part', unit: 'hours', kind: 'number', min: 0.000001, help: 'From a reliability study on the machine or the supplier’s figure — one failure every 1,100 hours on this part.' },
    { id: 'installed', label: 'How many are installed', unit: 'on the line', kind: 'number', min: 1, integer: true, help: 'Four heaters on the jaw, two knives in flow — every one that can fail and need replacing.' },
    { id: 'lead', label: 'Lead time to get another', unit: 'hours', kind: 'number', min: 0.000001, help: 'Order, ship, customs and fit — measured on the last deliveries, not the contract’s promise alone.' },
    { id: 'service', label: 'Chance of not running out over a lead time', unit: 'in 100', kind: 'choice', default: '95',
      chosen: 'Faultline’s starting point, 95 in 100 — a choice, not a rule. A part that stops the line deserves a higher level than a consumable.',
      options: SERVICE.map(s => ({ value: s, label: `${s}%`, help: `${fmt(100 - Number(s), 1)} lead times in 100 would run short at this stock` })) },
    { id: 'held', label: 'Stock held now', unit: 'parts', kind: 'number', min: 0, integer: true, optional: true, help: 'Optional — to read back the stock-out risk at what is on the shelf today.' },
    { id: 'unitCost', label: 'What one part costs', unit: '£', kind: 'number', min: 0, optional: true, money: true },
    { id: 'carrying', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true, help: 'Finance will have the business’s figure; 20% a year is a common all-in rate — never filled in by Faultline.' },
    { id: 'downtimeCost', label: 'What one stock-out costs', unit: '£ over the lead time', kind: 'number', min: 0, optional: true, money: true, help: 'The line stopped or one machine down for the whole lead time — packs and labour you put a figure on.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const mtbf = num(v, 'mtbf');
    if (mtbf !== undefined && mtbf < 24) {
      out.push({ say: 'MTBF under a day is unusual for a spare part — check the unit is hours and the figure is for one part, not the whole machine.' });
    }
    return out;
  },
  compute(v) {
    const name = part(v);
    const svcPct = Number(v.service);
    const svc = svcPct / 100;
    const rate = sparesDemandPerHour(num(v, 'mtbf'), num(v, 'installed'));
    const mu = sparesDemandMu(rate, num(v, 'lead'));
    const { stock, serviceAchieved } = poissonStockLevel(mu, svc);
    const sv = fmt(svcPct, 1);
    const ach = fmt(serviceAchieved * 100, 1);

    const sentence = mu < 0.05
      ? `Hold ${fmt(stock, 0)} ${name} — demand over ${duration(num(v, 'lead'))} is only ${fmt(mu, 2)} on average, so even ${sv}% service needs little stock.`
      : `Hold ${fmt(stock, 0)} ${name} — about ${fmt(mu, 1)} are expected over ${duration(num(v, 'lead'))}, and ${fmt(stock, 0)} gives ${ach}% of lead times with no stock-out (you asked for ${sv}%).`;

    const more: string[] = [];
    const held = v.held as number | undefined;
    if (held !== undefined) {
      const risk = stockOutRisk(mu, held);
      more.push(`With ${fmt(held, 0)} held now, about ${fmt(risk * 100, 1)}% of lead times would need more than that before the next delivery.`);
      if (held < stock) more.push(`That is below the ${fmt(stock, 0)} for ${sv}% — ${fmt(stock - held, 0)} more would reach the level you chose.`);
    }
    const noDemand = pNoDemand(mu);
    more.push(`With nothing held, ${fmt(noDemand * 100, 1)}% of lead times need no part; ${fmt((1 - noDemand) * 100, 1)}% need at least one.`);

    const unit = v.unitCost as number | undefined;
    const carry = v.carrying as number | undefined;
    const down = v.downtimeCost as number | undefined;
    const figures: [string, string][] = [];
    const parts: string[] = [];
    const missing: string[] = [];
    if (unit !== undefined && carry !== undefined) {
      const hold = stock * unit * carry / 100;
      figures.push(['Holding the stock for a year', gbp(hold)]);
      parts.push(`Holding ${fmt(stock, 0)} at ${gbp(unit)} each at ${fmt(carry, 1)}% a year costs about ${gbp(hold)} a year.`);
    } else {
      missing.push(`Give ${[unit === undefined ? 'what one part costs' : '', carry === undefined ? 'the cost of holding stock for a year' : ''].filter(Boolean).join(' and ')} to say what holding the stock costs.`);
    }
    if (down !== undefined) {
      const riskAtStock = stockOutRisk(mu, stock);
      figures.push(['Stock-out risk at this stock', fmt(riskAtStock * 100, 2) + '%']);
      figures.push(['Expected stock-out cost a year', gbp(riskAtStock * down * (8760 / num(v, 'lead')))]);
      parts.push(`At this stock, about ${fmt(riskAtStock * 100, 2)}% of lead times would still run short — if each costs ${gbp(down)}, that is roughly ${gbp(riskAtStock * down * (8760 / num(v, 'lead')))} a year at one lead time every ${duration(num(v, 'lead'))} (8760 h a year).`);
    } else {
      missing.push('Give what one stock-out costs over the lead time to price the risk in money.');
    }
    const money: CalcMoney = { ...(parts.length ? { text: parts.join(' '), figures } : {}), missing };

    return {
      verdict: `Hold ${fmt(stock, 0)}`,
      tone: 'n',
      sentence,
      more,
      tiles: [
        { k: 'Stock', v: fmt(stock, 0), of: `${name} for ${sv}% service`, n: stock, fmt: x => fmt(x, 0) },
        { k: 'Demand over lead time', v: fmt(mu, 2), of: `expected ${name}`, n: mu, fmt: x => fmt(x, 2) },
        { k: 'Service achieved', v: `${ach}%`, of: `at ${fmt(stock, 0)} held (asked ${sv}%)`, n: serviceAchieved * 100, better: 'higher', fmt: x => `${fmt(x, 1)}%` },
        held !== undefined
          ? { k: 'Risk now', v: `${fmt(stockOutRisk(mu, held) * 100, 1)}%`, of: `stock-out with ${fmt(held, 0)} held`, n: stockOutRisk(mu, held) * 100, better: 'lower', fmt: x => `${fmt(x, 1)}%` }
          : { k: 'Risk now', v: '—', of: 'give stock held now' },
        unit !== undefined && carry !== undefined
          ? { k: 'Holding it', v: gbp(stock * unit * carry / 100), of: 'a year at this stock', n: stock * unit * carry / 100, better: 'lower', fmt: gbp }
          : { k: 'Holding it', v: '—', of: 'give cost and carrying rate' },
      ],
      working: [
        { label: 'Failure rate', value: `λ = 1 ÷ ${fmt(num(v, 'mtbf'), 0)} h = ${fmt(rate, 6)} failures an hour per part`, note: 'one part' },
        { label: 'Demand over lead time', value: `${fmt(rate, 6)} × ${fmt(num(v, 'installed'), 0)} installed × ${fmt(num(v, 'lead'), 0)} h = ${fmt(mu, 3)}`, note: 'μ = λ·n·L (Poisson mean)' },
        { label: 'Service level', value: `${sv}% → smallest stock with P(X ≤ s) ≥ ${sv}%`, note: 'Poisson demand' },
        { label: 'Stock', value: `${fmt(stock, 0)} (P ≤ ${fmt(stock, 0)}) = ${ach}%`, note: 'actual service at this s' },
        { label: 'Stock-out risk at stock', value: `${fmt(stockOutRisk(mu, stock) * 100, 2)}%`, note: '1 − P(X ≤ s)' },
      ],
      caveats: [
        'Random failures only — a part wearing out on age (β > 1) should be changed on schedule; hold the schedule’s parts plus a little for random mode.',
        'λ from a handful of failures is uncertain — revisit the stock after each failure or use the upper bound of the MTBF interval from the reliability study.',
        'The lead time is the real one (order, ship, fit), not the supplier’s brochure.',
        'Several lines sharing one stores pool add their installed counts — this is one line’s parts only.',
      ],
      money,
      closing: `Hold ${fmt(stock, 0)} ${name} for ${sv}% over ${duration(num(v, 'lead'))} — μ is ${fmt(mu, 2)}. A part that stops the line pays for the stock the first time it avoids one lead time without it.`,
      see: [{ key: 'safety-stock', why: 'bell-shaped demand for materials that flow every day — not slow random spare parts' }],
    };
  },
  examples: [
    {
      name: 'Seal-jaw heater (cases-maintenance.py)',
      source: 'scripts/knowledge/cases-maintenance.py maintenance.spares-poisson',
      inputs: { part: 'seal-jaw heaters', mtbf: 1100, installed: 4, lead: 504, service: '95' },
      expect: {
        verdict: 'Hold 4',
        tone: 'n',
        sentence: 'Hold 4 seal-jaw heaters — about 1.8 are expected over 21 days, and 4 gives 96.1% of lead times with no stock-out (you asked for 95%).',
        tiles: { Stock: '4', 'Demand over lead time': '1.83', 'Service achieved': '96.1%' },
      },
    },
    {
      name: 'Critical part at 99% service',
      source: 'cases-maintenance.py — stock 6 at 99%',
      inputs: { part: 'seal-jaw heaters', mtbf: 1100, installed: 4, lead: 504, service: '99' },
      expect: {
        verdict: 'Hold 6',
        tone: 'n',
        sentence: 'Hold 6 seal-jaw heaters — about 1.8 are expected over 21 days, and 6 gives 99.7% of lead times with no stock-out (you asked for 99%).',
        tiles: { Stock: '6', 'Service achieved': '99.7%' },
      },
    },
    {
      name: 'Risk with nothing held',
      source: 'cases-maintenance.py — P(0) ≈ 16%',
      inputs: { part: 'heaters', mtbf: 1100, installed: 4, lead: 504, service: '95', held: 0 },
      expect: {
        verdict: 'Hold 4',
        tone: 'n',
        sentence: 'Hold 4 heaters — about 1.8 are expected over 21 days, and 4 gives 96.1% of lead times with no stock-out (you asked for 95%).',
        tiles: { 'Risk now': '84%' },
      },
    },
    {
      name: 'Holding cost at £180 and 20%',
      source: 'cases-maintenance.py — £144 a year for 4',
      inputs: { part: 'heaters', mtbf: 1100, installed: 4, lead: 504, service: '95', unitCost: 180, carrying: 20 },
      expect: {
        verdict: 'Hold 4',
        tone: 'n',
        sentence: 'Hold 4 heaters — about 1.8 are expected over 21 days, and 4 gives 96.1% of lead times with no stock-out (you asked for 95%).',
        tiles: { 'Holding it': '£144.00' },
        money: 'Holding 4 at £180.00 each at 20% a year costs about £144.00 a year.',
      },
    },
  ],
  refused: [
    { name: 'no MTBF', inputs: { installed: 4, lead: 504, service: '95' }, blocked: 'MTBF' },
    { name: 'zero installed', inputs: { mtbf: 1100, installed: 0, lead: 504, service: '95' }, blocked: 'at least 1' },
  ],
};

export default def;
