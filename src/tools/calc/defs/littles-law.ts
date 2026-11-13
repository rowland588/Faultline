/* WIP AND LEAD TIME — LITTLE'S LAW — FC-044 (knowledge/specs/FC-044-littles-law.md; knowledge/methods/capacity/littles-law.md).
 *
 * In a steady system the average work in progress is the throughput times the average time in the system (Little 1961).
 * Count what is in progress and know what flows out over the same window, and the lead time follows with no stopwatch on every
 * item; or the other two from any pair (lib/ie/pull littlesLaw). It is a law of averages over a period in which what went in
 * came out, so the page ASKS whether the pile grew or shrank and says so when it did. Money: the stock in progress as H —
 * what it stands at and what holding it costs (knowledge/MONEY.md §4, FC-044), both optional. Shelf life spent waiting is the
 * food-factory reading of the same sum. The wait's cause (Kingman's utilisation and variability, FC-045) is not here. */
import { littlesLaw, type LittleSolve } from '../../../lib/ie/pull';
import { duration, fmt, gbp, pct } from '../format';
import type { CalcDef, CalcMoney, Problem, Values } from '../types';

const num = (v: Values, id: string): number | undefined => v[id] as number | undefined;
const thing = (v: Values): string => (typeof v.thing === 'string' && v.thing.trim() ? v.thing.trim() : 'units');

const def: CalcDef = {
  key: 'littles-law',
  fc: 'FC-044',
  title: 'WIP and lead time',
  says: 'How long product waits in the hall — from what is counted in progress and what flows out',
  question: 'How long does product sit between going in and coming out, and what would halving the WIP do?',
  group: 'Flow and lead time',
  inputs: [
    { id: 'solve', label: 'What do you want to know', kind: 'choice', default: 'leadTime',
      options: [
        { value: 'leadTime', label: 'How long it waits (the lead time)', help: 'from the work in progress counted and the flow out' },
        { value: 'wip', label: 'How much is in progress', help: 'from the flow out and the time each spends' },
        { value: 'throughput', label: 'How fast it flows', help: 'from the work in progress and the time each spends' },
      ] },
    { id: 'thing', label: 'What is counted', kind: 'text', optional: true, help: 'Trays, cases, packs — it only names the sentence.' },
    { id: 'wip', label: 'Counted in progress', unit: 'units', kind: 'number', min: 0.000001, showIf: v => v.solve !== 'wip', help: 'Everything between the point it goes in and the point it comes out: in the chiller, on the racks, on the belt. If you counted several times, type the average.' },
    { id: 'perHour', label: 'Flowing out', unit: 'units an hour', kind: 'number', min: 0.000001, showIf: v => v.solve !== 'throughput', help: 'What came OUT, counted over the same window the WIP was — not the rated speed.' },
    { id: 'leadHours', label: 'Time each spends in progress', unit: 'hours', kind: 'number', min: 0.000001, showIf: v => v.solve === 'wip' || v.solve === 'throughput', help: 'From going in to coming out, on average.' },
    { id: 'steady', label: 'Over the period, the pile', kind: 'choice', default: 'steady',
      chosen: 'Assumed steady until you say otherwise — change it if the pile grew or shrank.',
      options: [{ value: 'steady', label: 'Stayed about the same' }, { value: 'grew', label: 'Grew' }, { value: 'shrank', label: 'Shrank' }] },
    { id: 'life', label: 'Shelf life', unit: 'hours', kind: 'number', min: 0.000001, optional: true, help: 'Optional: the time the product keeps once made, to say how much of it is spent waiting.' },
    { id: 'unitCost', label: 'What one unit has cost by now', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'materialsPerPack', where: 'a pack’s materials on its set-up', words: 'the line’s materials for a pack — a floor under what a pack in progress has cost' }, help: 'Its materials and labour so far, to say the stock in money.' },
    { id: 'carrying', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true, help: 'Finance will have the business’s figure; the industry quotes 15–35% a year — Faultline never fills it in.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    if (v.steady !== 'steady') out.push({ field: 'steady', say: `Little’s law holds for averages over a period in which what went in came out. The pile ${v.steady === 'grew' ? 'grew' : 'shrank'}, so this is rough: count again over a longer window, or take the average pile.` });
    return out;
  },
  compute(v) {
    const t = thing(v);
    const solve = v.solve as LittleSolve;
    const r = littlesLaw(solve, { ...(num(v, 'wip') !== undefined ? { wip: num(v, 'wip') as number } : {}), ...(num(v, 'perHour') !== undefined ? { perHour: num(v, 'perHour') as number } : {}), ...(num(v, 'leadHours') !== undefined ? { leadHours: num(v, 'leadHours') as number } : {}) });
    if (!r) throw new Error('littlesLaw needs two figures');
    const rough = v.steady !== 'steady';

    const sentence = solve === 'leadTime'
      ? `${fmt(r.wip, 1)} ${t} in progress at ${fmt(r.perHour, 1)} an hour is ${duration(r.leadHours)} of lead time — each one spends that long, on average, between going in and coming out.`
      : solve === 'wip'
        ? `${t[0].toUpperCase()}${t.slice(1)} flowing at ${fmt(r.perHour, 1)} an hour and kept ${duration(r.leadHours)} means about ${fmt(r.wip, 1)} in progress at any moment.`
        : `${fmt(r.wip, 1)} ${t} in progress that each spend ${duration(r.leadHours)} means ${fmt(r.perHour, 1)} an hour are flowing through.`;
    const more: string[] = [
      solve === 'leadTime' ? `Halve the work in progress and, at the same flow, the lead time halves to ${duration(r.leadHours / 2)}.`
        : solve === 'wip' ? `Halve the time each spends and, at the same flow, the work in progress halves to ${fmt(r.wip / 2, 1)}.`
          : `Halve the time each spends and, with the same ${t} in progress, ${fmt(r.perHour * 2, 1)} an hour would flow.`,
      ...(rough ? [`Read it as rough: the pile ${v.steady === 'grew' ? 'grew' : 'shrank'} over the period.`] : []),
    ];

    const life = num(v, 'life');
    const lifeShare = life !== undefined ? r.leadHours / life : undefined;
    const unit = num(v, 'unitCost'), rate = num(v, 'carrying');
    const missing: string[] = [];
    let money: CalcMoney;
    if (unit !== undefined) {
      const held = r.wip * unit;
      const figures: [string, string][] = [['Stands at', gbp(held)]];
      let text = `The ${fmt(r.wip, 1)} ${t} in progress stand at ${gbp(held)} (at ${gbp(unit)} each) — money tied up because each spends ${duration(r.leadHours)} in progress.`;
      if (rate !== undefined) { const year = held * rate / 100; figures.push([`Holding it for a year at ${fmt(rate, 1)}%`, gbp(year)]); text += ` Holding it costs about ${gbp(year)} a year at ${fmt(rate, 1)}%.`; }
      else missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding it costs a year.');
      money = { text, figures, missing };
    } else {
      missing.push('Give what one unit has cost by now to say the stock in progress in money.');
      if (rate === undefined) missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding it costs a year.');
      money = { missing };
    }

    const verdict = solve === 'leadTime' ? `${duration(r.leadHours)} lead time` : solve === 'wip' ? `${fmt(r.wip, 0)} in progress` : `${fmt(r.perHour, 1)} an hour`;
    return {
      verdict,
      tone: lifeShare !== undefined && lifeShare >= 1 ? 'r' : rough ? 'a' : 'n',
      sentence: lifeShare !== undefined && solve === 'leadTime' ? `${sentence} That is ${pct(lifeShare)} of its shelf life${lifeShare >= 1 ? ' — longer than it keeps' : ' spent waiting'}.` : sentence,
      more,
      tiles: [
        { k: 'Lead time', v: duration(r.leadHours), of: solve === 'leadTime' ? `${fmt(r.wip, 1)} ÷ ${fmt(r.perHour, 1)} an hour` : 'each spends in progress', n: r.leadHours, better: 'lower', fmt: duration },
        { k: 'In progress', v: fmt(r.wip, 1), of: `${t}${solve === 'wip' ? ` — ${fmt(r.perHour, 1)} an hour × ${duration(r.leadHours)}` : ''}`, n: r.wip, better: 'lower', fmt: x => `${fmt(x, 1)} ${t}` },
        { k: 'Flow', v: fmt(r.perHour, 1), of: `${t} an hour out${solve === 'throughput' ? ` — ${fmt(r.wip, 1)} ÷ ${duration(r.leadHours)}` : ''}`, n: r.perHour, better: 'higher', fmt: x => `${fmt(x, 1)} an hour` },
        lifeShare !== undefined
          ? { k: 'Shelf life used', v: pct(lifeShare), of: `waiting, of ${duration(life as number)}`, n: lifeShare, better: 'lower', fmt: x => pct(x), ...(lifeShare >= 1 ? { tone: 'r' as const } : {}) }
          : { k: 'Shelf life used', v: '—', of: 'give the shelf life' },
        unit !== undefined
          ? { k: 'Stock held', v: gbp(r.wip * unit), of: `in progress, at ${gbp(unit)} each`, n: r.wip * unit, better: 'lower', fmt: gbp }
          : { k: 'Stock held', v: '—', of: 'give what a unit has cost' },
      ],
      working: [
        { label: 'The law', value: 'work in progress = flow × time in progress', note: 'L = λW — Little, 1961' },
        ...(solve === 'leadTime' ? [{ label: 'Lead time', value: `${fmt(r.wip, 3)} ÷ ${fmt(r.perHour, 3)} = ${fmt(r.leadHours, 3)} hours`, note: 'W = L ÷ λ' }]
          : solve === 'wip' ? [{ label: 'In progress', value: `${fmt(r.perHour, 3)} × ${fmt(r.leadHours, 3)} = ${fmt(r.wip, 3)} ${t}`, note: 'L = λ × W' }]
            : [{ label: 'Flow', value: `${fmt(r.wip, 3)} ÷ ${fmt(r.leadHours, 3)} = ${fmt(r.perHour, 3)} an hour`, note: 'λ = L ÷ W' }]),
        ...(lifeShare !== undefined ? [{ label: 'Of the shelf life', value: `${fmt(r.leadHours, 2)} ÷ ${fmt(life as number, 2)} = ${pct(lifeShare, 2)}` }] : []),
      ],
      caveats: [
        'It holds for averages in a steady system. A pile that is growing or shrinking has to be taken at its average over a longer window, or the answer is rough.',
        'The flow must be what came OUT over the same window the WIP was counted in, in the same unit — not the rated speed and not what went in.',
        'It says how long product waits, not why, and not whether the WIP is too much or too little. The why is the queue at a busy station.',
        'Counted in one place it is that place’s lead time; over a whole line it is the line’s — count the boundary you mean.',
      ],
      money,
      closing: solve === 'leadTime'
        ? `${fmt(r.wip, 1)} ${t} in progress is ${duration(r.leadHours)} of waiting at ${fmt(r.perHour, 1)} an hour${lifeShare !== undefined ? `, ${pct(lifeShare)} of the shelf life` : ''}. Every cut to the WIP comes straight off the lead time.`
        : `Little’s law ties ${fmt(r.wip, 1)} ${t} in progress, ${fmt(r.perHour, 1)} an hour and ${duration(r.leadHours)} together — change one and the others move.`,
    };
  },
  examples: [
    {
      name: 'Trays in a chiller (the knowledge record’s reading), with the money given',
      source: 'knowledge/methods/capacity/littles-law.md: 1,800 trays at 600 an hour is 3 hours; scripts/knowledge/cases-calc.py L1, L4, L5',
      inputs: { solve: 'leadTime', thing: 'trays', wip: 1800, perHour: 600, steady: 'steady', life: 48, unitCost: 0.85, carrying: 25 },
      expect: {
        verdict: '3 hours lead time', tone: 'n',
        sentence: '1,800 trays in progress at 600 an hour is 3 hours of lead time — each one spends that long, on average, between going in and coming out. That is 6.3% of its shelf life spent waiting.',
        tiles: { 'Lead time': '3 hours', 'In progress': '1,800', Flow: '600', 'Shelf life used': '6.3%', 'Stock held': '£1,530' },
        money: 'The 1,800 trays in progress stand at £1,530 (at £0.85 each) — money tied up because each spends 3 hours in progress. Holding it costs about £382.50 a year at 25%.',
      },
    },
    {
      name: 'The WIP a flow needs: 250 an hour kept 4 hours',
      source: 'L = λW by hand; scripts/knowledge/cases-calc.py L2',
      inputs: { solve: 'wip', thing: 'cases', perHour: 250, leadHours: 4, steady: 'steady' },
      expect: {
        verdict: '1,000 in progress', tone: 'n',
        sentence: 'Cases flowing at 250 an hour and kept 4 hours means about 1,000 in progress at any moment.',
        tiles: { 'Lead time': '4 hours', 'In progress': '1,000', Flow: '250', 'Shelf life used': '—', 'Stock held': '—' },
      },
    },
    {
      name: 'The flow that fits 480 in progress for 2.4 hours — and a pile that grew, said as rough',
      source: 'L = λW by hand: 480 ÷ 2.4 = 200; scripts/knowledge/cases-calc.py L3',
      inputs: { solve: 'throughput', wip: 480, leadHours: 2.4, steady: 'grew' },
      expect: {
        verdict: '200 an hour', tone: 'a',
        sentence: '480 units in progress that each spend 2.4 hours means 200 an hour are flowing through.',
        tiles: { 'Lead time': '2.4 hours', 'In progress': '480', Flow: '200', 'Shelf life used': '—', 'Stock held': '—' },
        warns: ['The pile grew, so this is rough'],
      },
    },
    {
      name: 'A wait longer than the product keeps is red',
      source: 'by hand: 60 h in a 48 h life',
      inputs: { solve: 'leadTime', thing: 'trays', wip: 3600, perHour: 60, steady: 'steady', life: 48 },
      expect: {
        verdict: '2.5 days lead time', tone: 'r',
        sentence: '3,600 trays in progress at 60 an hour is 2.5 days of lead time — each one spends that long, on average, between going in and coming out. That is 125% of its shelf life — longer than it keeps.',
        tiles: { 'Lead time': '2.5 days', 'In progress': '3,600', Flow: '60', 'Shelf life used': '125%', 'Stock held': '—' },
      },
    },
  ],
  refused: [
    { name: 'nothing counted in progress', inputs: { solve: 'leadTime', wip: 0, perHour: 600, steady: 'steady' }, blocked: 'must be at least' },
    { name: 'no flow out', inputs: { solve: 'leadTime', wip: 1800, steady: 'steady' }, blocked: 'Give “Flowing out”' },
    { name: 'the time each spends missing when it is the WIP asked for', inputs: { solve: 'wip', perHour: 250, steady: 'steady' }, blocked: 'Give “Time each spends in progress”' },
    { name: 'a pile that did something not offered', inputs: { solve: 'leadTime', wip: 1800, perHour: 600, steady: 'doubled' }, blocked: 'Choose “Over the period, the pile”' },
  ],
  see: [{ key: 'kanban', why: 'size a pull loop to hold only what the refill needs' }],
};

export default def;
