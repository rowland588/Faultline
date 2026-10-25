/* KANBAN SIZING — FC-009 (knowledge/specs/FC-009-kanban.md; knowledge/methods/lean/kanban-supermarket.md).
 *
 * How many containers belong in a pull loop, and how much the shelf holds at most: Monden's
 * N = D × L × (1 + α) ÷ C, rounded up (lib/ie/pull kanbanLoop). The safety factor α is a CHOICE and is said to be one
 * on the screen; the loop's stock before any safety is Little's law (D × L). Money: the stock a full shelf holds,
 * and what holding it costs a year (knowledge/MONEY.md §4, FC-009: the kanban's stock as H) — both optional. */
import { kanbanLoop } from '../../../lib/ie/pull';
import { duration, fmt, gbp } from '../format';
import type { CalcDef, CalcMoney, Problem, Values } from '../types';

const num = (v: Values, id: string): number => v[id] as number;
const thing = (v: Values): string => (typeof v.thing === 'string' && v.thing.trim() ? v.thing.trim() : 'units');

const def: CalcDef = {
  key: 'kanban',
  fc: 'FC-009',
  title: 'Kanban sizing',
  says: 'How many containers a pull loop needs, and the most its shelf holds',
  question: 'How many containers belong in this loop, and when does the line call for more?',
  group: 'Pull and stock',
  inputs: [
    { id: 'thing', label: 'What is in the container', kind: 'text', optional: true, help: 'Trays, reels, cases — it only names the sentence.' },
    { id: 'usage', label: 'How many are used', unit: 'units', kind: 'number', min: 0.000001, help: 'Counted over a whole shift or a day, not a quiet hour: 1,500 trays.' },
    { id: 'usageHours', label: 'Over how many hours', unit: 'hours', kind: 'number', min: 0.000001, help: 'The hours that count covers — a 7.5-hour shift.' },
    { id: 'leadMin', label: 'Time to refill a container', unit: 'minutes', kind: 'number', min: 0.000001, help: 'From the card freed to the container back on the shelf — the wait to be collected, the queue upstream, the changeover, the run and the move. Not the run alone.' },
    { id: 'container', label: 'Units in one container', unit: 'units', kind: 'number', min: 1, integer: true, help: '60 trays to a crate.' },
    { id: 'safety', label: 'Safety factor', unit: '%', kind: 'number', min: 0, max: 200, default: 15,
      chosen: 'Faultline’s starting point, inside the 10–20% Monden calls usual — a choice, not a rule. Raise it where demand or the refill is unsteady; Safety stock works the margin out from the spread.',
      help: 'The extra the loop carries against a late refill or a busy hour.' },
    { id: 'unitCost', label: 'What one unit costs', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true, help: 'Its purchase or made cost — to say the stock in money.' },
    { id: 'carrying', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true,
      help: 'Capital, storage, service and risk. Finance will have the business’s figure; the industry quotes 15–35% a year — Faultline never fills it in.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    if (num(v, 'safety') > 20) out.push({ field: 'safety', say: `A safety factor of ${fmt(num(v, 'safety'), 1)}% is above the 10–20% usually used. A loop that needs more is telling you demand or the refill is not steady — level it first, or size the margin from the spread (Safety stock).` });
    return out;
  },
  compute(v) {
    const t = thing(v);
    const L = num(v, 'leadMin') / 60, C = num(v, 'container'), alpha = num(v, 'safety') / 100;
    const k = kanbanLoop({ qty: num(v, 'usage'), hours: num(v, 'usageHours'), leadHours: L, alpha, container: C });
    const kb = `${fmt(k.kanbans, 0)} kanban${k.kanbans === 1 ? '' : 's'}`;
    const halved = k.inLoop / 2;

    const unit = v.unitCost as number | undefined, rate = v.carrying as number | undefined;
    const missing: string[] = [];
    let money: CalcMoney;
    if (unit !== undefined) {
      const held = k.supermarket * unit, margin = k.above * unit;
      const figures: [string, string][] = [['A full shelf holds', gbp(held)], ['Of which the safety margin and the rounding up', gbp(margin)]];
      let text = `A full shelf is ${gbp(held)} of ${t} at ${gbp(unit)} each — tied up because a refill takes ${duration(L)} and the loop carries a ${fmt(num(v, 'safety'), 1)}% margin${margin > 0 ? `, ${gbp(margin)} of it the margin and the rounding up` : ''}.`;
      if (rate !== undefined) { const year = held * rate / 100; figures.push([`Holding it for a year at ${fmt(rate, 1)}%`, gbp(year)]); text += ` Holding it costs about ${gbp(year)} a year at ${fmt(rate, 1)}%.`; }
      else missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding the shelf costs a year.');
      money = { text, figures, missing };
    } else {
      missing.push('Give what one unit costs to say the stock in money.');
      if (rate === undefined) missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding it costs a year.');
      money = { missing };
    }

    return {
      verdict: kb,
      tone: 'n',
      sentence: `${kb} of ${fmt(C, 0)} ${t} — a supermarket of at most ${fmt(k.supermarket, 0)} ${t}. The loop carries ${fmt(k.inLoop, 1)} ${t} before safety because a refill takes ${duration(L)}; halve that and it carries ${fmt(halved, 1)}.`,
      more: [`Send a card back as each container empties — it is the call for more. A full shelf covers ${duration(k.coverHours)} of use at ${fmt(k.perHour, 1)} ${t} an hour.`],
      tiles: [
        { k: 'Kanbans', v: fmt(k.kanbans, 0), of: `containers of ${fmt(C, 0)} ${t}`, n: k.kanbans, counted: true, fmt: x => `${fmt(x, 0)} kanban${x === 1 ? '' : 's'}` },
        { k: 'Most on the shelf', v: fmt(k.supermarket, 0), of: `${t} — ${fmt(k.kanbans, 0)} × ${fmt(C, 0)}`, n: k.supermarket, better: 'lower', fmt: x => `${fmt(x, 0)} ${t}` },
        { k: 'Held before safety', v: fmt(k.inLoop, 1), of: `${t}: ${fmt(k.perHour, 1)} an hour × ${duration(L)}`, n: k.inLoop, better: 'lower', fmt: x => `${fmt(x, 1)} ${t}` },
        { k: 'Cover', v: duration(k.coverHours), of: 'of use on a full shelf', n: k.coverHours, fmt: x => duration(x) },
        unit !== undefined
          ? { k: 'Stock held', v: gbp(k.supermarket * unit), of: `at ${gbp(unit)} a unit, shelf full`, n: k.supermarket * unit, better: 'lower', fmt: gbp }
          : { k: 'Stock held', v: '—', of: 'give what one unit costs' },
      ],
      working: [
        { label: 'Used an hour', value: `${fmt(num(v, 'usage'), 2)} ÷ ${fmt(num(v, 'usageHours'), 2)} = ${fmt(k.perHour, 2)} ${t}`, note: 'D' },
        { label: 'Used while a container is refilled', value: `${fmt(k.perHour, 2)} × ${duration(L)} = ${fmt(k.inLoop, 2)} ${t}`, note: 'D × L — Little’s law: the loop’s stock before any safety' },
        { label: 'With the safety factor', value: `${fmt(k.inLoop, 2)} × (1 + ${fmt(num(v, 'safety'), 1)}%) = ${fmt(k.inLoop * (1 + alpha), 2)} ${t}`, note: 'D × L × (1 + α)' },
        { label: 'Containers', value: `${fmt(k.inLoop * (1 + alpha), 2)} ÷ ${fmt(C, 0)} = ${fmt(k.raw, 2)}, rounded up to ${fmt(k.kanbans, 0)}`, note: 'N = D × L × (1 + α) ÷ C — Monden' },
        { label: 'The most the shelf holds', value: `${fmt(k.kanbans, 0)} × ${fmt(C, 0)} = ${fmt(k.supermarket, 0)} ${t}`, note: `${fmt(k.above, 1)} ${t} above what the refill needs — the margin and the rounding up` },
        { label: 'Cover', value: `${fmt(k.supermarket, 0)} ÷ ${fmt(k.perHour, 2)} = ${duration(k.coverHours)}` },
      ],
      caveats: [
        'It assumes demand is steady. With big swings the loop starves or overflows — level the demand first, or size the safety margin from the spread (Safety stock).',
        'The refill time must be the whole wait — to be collected, the queue upstream, the changeover, the run and the move. Taken as the run alone it undersizes the loop.',
        'Product with a short life cannot sit on a shelf past it: the life, not this sum, sets the most it may hold.',
        'More kanbans each time there is a shortage hides the cause. If it keeps running short, find why (a long changeover, a lost card) before adding containers.',
      ],
      money,
      closing: `Run the loop at ${kb} of ${fmt(C, 0)} ${t}; each emptied container sends its card back. The refill time is what sets the stock — ${duration(L)} now, and every cut to it comes off the shelf.`,
    };
  },
  examples: [
    {
      name: 'Trays to a packing line (Monden’s formula, the knowledge record’s worked case)',
      source: 'knowledge/methods/lean/kanban-supermarket.md worked case; scripts/knowledge/cases-calc.py K1',
      inputs: { thing: 'trays', usage: 1500, usageHours: 7.5, leadMin: 120, container: 60, safety: 15, unitCost: 0.85, carrying: 25 },
      expect: {
        verdict: '8 kanbans', tone: 'n',
        sentence: '8 kanbans of 60 trays — a supermarket of at most 480 trays. The loop carries 400 trays before safety because a refill takes 2 hours; halve that and it carries 200.',
        tiles: { Kanbans: '8', 'Most on the shelf': '480', 'Held before safety': '400', Cover: '2.4 hours', 'Stock held': '£408.00' },
        money: 'A full shelf is £408.00 of trays at £0.85 each — tied up because a refill takes 2 hours and the loop carries a 15% margin, £68.00 of it the margin and the rounding up. Holding it costs about £102.00 a year at 25%.',
      },
    },
    {
      name: 'Two-bin labels, no money given',
      source: 'Monden’s formula by hand: 3,000 × 0.75 × 1.2 ÷ 500 = 5.4 → 6; scripts/knowledge/cases-calc.py K2',
      inputs: { thing: 'rolls', usage: 3000, usageHours: 1, leadMin: 45, container: 500, safety: 20 },
      expect: {
        verdict: '6 kanbans', tone: 'n',
        sentence: '6 kanbans of 500 rolls — a supermarket of at most 3,000 rolls. The loop carries 2,250 rolls before safety because a refill takes 45 minutes; halve that and it carries 1,125.',
        tiles: { Kanbans: '6', 'Most on the shelf': '3,000', 'Held before safety': '2,250', Cover: '1 hour', 'Stock held': '—' },
      },
    },
    {
      name: 'A whole number is not rounded up (360 ÷ 60 is exactly 6)',
      source: 'by hand: 100 × 3 × 1.2 ÷ 60 = 6; scripts/knowledge/cases-calc.py K3',
      inputs: { usage: 100, usageHours: 1, leadMin: 180, container: 60, safety: 20 },
      expect: {
        verdict: '6 kanbans', tone: 'n',
        sentence: '6 kanbans of 60 units — a supermarket of at most 360 units. The loop carries 300 units before safety because a refill takes 3 hours; halve that and it carries 150.',
        tiles: { Kanbans: '6', 'Most on the shelf': '360', 'Held before safety': '300', Cover: '3.6 hours', 'Stock held': '—' },
      },
    },
    {
      name: 'A safety factor above the usual 10–20% is allowed, and warned',
      source: 'by hand: 400 × 1.3 ÷ 60 = 8.67 → 9; scripts/knowledge/cases-calc.py K4',
      inputs: { thing: 'trays', usage: 1500, usageHours: 7.5, leadMin: 120, container: 60, safety: 30 },
      expect: {
        verdict: '9 kanbans', tone: 'n',
        sentence: '9 kanbans of 60 trays — a supermarket of at most 540 trays. The loop carries 400 trays before safety because a refill takes 2 hours; halve that and it carries 200.',
        tiles: { Kanbans: '9', 'Most on the shelf': '540', 'Held before safety': '400', Cover: '2.7 hours', 'Stock held': '—' },
        warns: ['safety factor of 30% is above the 10–20% usually used'],
      },
    },
  ],
  refused: [
    { name: 'a container of nothing', inputs: { usage: 1500, usageHours: 7.5, leadMin: 120, container: 0, safety: 15 }, blocked: 'must be at least 1' },
    { name: 'no refill time given', inputs: { usage: 1500, usageHours: 7.5, container: 60, safety: 15 }, blocked: 'Give “Time to refill a container”' },
    { name: 'half a container', inputs: { usage: 1500, usageHours: 7.5, leadMin: 120, container: 2.5, safety: 15 }, blocked: 'must be a whole number' },
  ],
  see: [{ key: 'safety-stock', why: 'size the safety margin from the spread instead of choosing it' }, { key: 'littles-law', why: 'the loop’s stock and the time product waits in it' }],
};

export default def;
