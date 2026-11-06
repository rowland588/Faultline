/* THE PROCESS FLOW CHART — FC-003 (knowledge/specs/FC-003-process-flow-chart.md; knowledge/methods/lean/process-flow-chart.md).
 *
 * One thing's path — a tray from the oven to the despatch pallet, an ingredient from intake to weigh-up — every step as it happens on the
 * floor, classed by the five ASME symbols: operation, transport, inspection, delay, storage; each with its minutes and, for a transport, its
 * metres. The totals by class say how much of the path changes the product and how much is waiting or moving; the picture is the chart itself,
 * the symbols down the page (tools/flow/symbols). The money is the map's own: the people's minutes on the moves and checks (labour) and what
 * holding the product through its delays and storage costs (inventory carrying) — every input optional, a missing one named, nothing blocks.
 * The steps are typed in order, up to 24, each appearing once the one above is classed. */
import { FLOW_KINDS, FLOW_WORD, SYMBOL, flowFigures, flowMoney, type FlowKind, type FlowStep } from '../../flow/processFlow';
import { andList, fmt, gbp, pct, plural } from '../format';
import type { CalcDef, CalcMoney, CalcResult, Field, Inputs, Problem, Values } from '../types';

const SLOTS = 24;
const nn = (i: number): string => String(i + 1).padStart(2, '0');
const id = (i: number, part: 'what' | 'kind' | 'min' | 'm'): string => `s${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');

const slotFields = (i: number): Field[] => {
  const n = i + 1;
  const shown = (v: Values): boolean => i === 0 || !!v[id(i - 1, 'kind')];
  return [
    { id: id(i, 'what'), label: `Step ${n} — what happens`, kind: 'text', optional: true, showIf: shown,
      ...(i === 0 ? { help: 'In the floor’s words — “Tray off the oven”, “Waiting for the forklift”. Blank and it is called Step 1. Each step appears once the one above is classed.' } : {}) },
    { id: id(i, 'kind'), label: `Step ${n} is a`, kind: 'choice', showIf: shown, ...(i > 0 ? { optional: true } : {}),
      options: FLOW_KINDS.map(k => ({ value: k, label: FLOW_WORD[k].name, help: FLOW_WORD[k].means })),
      ...(i === 0 ? { help: 'Operation changes the product · Transport moves it · Inspection checks it · Delay holds it unplanned · Storage holds it by design.' } : {}) },
    { id: id(i, 'min'), label: `Step ${n} takes`, unit: 'minutes', kind: 'number', min: 0, optional: true, showIf: v => shown(v) && !!v[id(i, 'kind')],
      ...(i === 0 ? { help: 'Timed on the floor, or from the standard. A step left blank is counted but not timed — and said.' } : {}) },
    { id: id(i, 'm'), label: `Step ${n} moves it`, unit: 'metres', kind: 'number', min: 0, optional: true, showIf: v => v[id(i, 'kind')] === 'transport',
      ...(i === 0 ? { help: 'A transport’s distance, paced or off the layout. Only a transport has one.' } : {}) },
  ];
};

/** The steps the boxes describe, in order — every slot with a class. */
function stepsOf(v: Values): FlowStep[] {
  const out: FlowStep[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const kind = v[id(i, 'kind')];
    if (typeof kind !== 'string' || !(FLOW_KINDS as readonly string[]).includes(kind)) continue;
    const w = text(v, id(i, 'what'));
    out.push({ what: w || `Step ${i + 1}`, kind: kind as FlowKind, ...(num(v, id(i, 'min')) !== undefined ? { min: num(v, id(i, 'min')) as number } : {}), ...(kind === 'transport' && num(v, id(i, 'm')) !== undefined ? { m: num(v, id(i, 'm')) as number } : {}) });
  }
  return out;
}

/** A path as the boxes hold it, from rows of [what, kind, minutes, metres]. */
const path = (rows: [string, FlowKind, number?, number?][], more: Inputs = {}): Inputs => {
  const out: Inputs = {};
  rows.forEach(([what, kind, min, m], i) => { if (what) out[id(i, 'what')] = what; out[id(i, 'kind')] = kind; if (min !== undefined) out[id(i, 'min')] = min; if (m !== undefined) out[id(i, 'm')] = m; });
  return { ...out, ...more };
};
/** A path as the boxes hold it, from steps already classed — how a Line Talk flow diagram fills this calculator (tools/talk, FC-202 toolsets). */
export const inputsOfSteps = (steps: readonly FlowStep[], more: Inputs = {}): Inputs => path(steps.slice(0, SLOTS).map(s => [s.what, s.kind, s.min, s.kind === 'transport' ? s.m : undefined] as [string, FlowKind, number?, number?]), more);
/* the knowledge record's tray, oven to despatch pallet (scripts/knowledge/cases-kaizen.py F): 14 steps, 279.5 minutes, 140 metres */
const TRAY: [string, FlowKind, number?, number?][] = [
  ['Mix and portion', 'operation', 2], ['To the oven', 'transport', 1.5, 30], ['Waiting for the oven', 'delay', 12], ['Bake', 'operation', 3.5], ['Check the core', 'inspection', 1],
  ['To the chiller', 'transport', 2, 45], ['Chill', 'storage', 240], ['To the pack area', 'transport', 1, 20], ['Pack', 'operation', 4], ['Waiting for QA release', 'delay', 8],
  ['To the despatch bay', 'transport', 1.5, 25], ['Palletise', 'operation', 1.5], ['Weigh and label', 'inspection', 0.5], ['To the lorry', 'transport', 1, 20],
];
/* the same path questioned: the first delay and its check taken out, the two longest transports cut to 10 m (cases-kaizen.py F) */
const QUESTIONED: [string, FlowKind, number?, number?][] = [
  ['Mix and portion', 'operation', 2], ['To the oven', 'transport', 1.5, 30], ['Bake', 'operation', 3.5], ['To the chiller', 'transport', 2, 10], ['Chill', 'storage', 240],
  ['To the pack area', 'transport', 1, 20], ['Pack', 'operation', 4], ['Waiting for QA release', 'delay', 8], ['To the despatch bay', 'transport', 1.5, 10],
  ['Palletise', 'operation', 1.5], ['Weigh and label', 'inspection', 0.5], ['To the lorry', 'transport', 1, 20],
];
const MONEY_IN: Inputs = { perDay: 30, rate: 15, loadValue: 120, carry: 25 };

const stepWord = (n: number): string => plural(n, 'step');
const min1 = (n: number): string => `${fmt(n, 1)} min`;

const def: CalcDef = {
  key: 'process-flow',
  fc: 'FC-003',
  title: 'Process flow chart',
  says: 'One thing’s path, step by step: operation, transport, inspection, delay, storage — with its time and distance, and how much of it changes the product',
  question: 'How many steps change the product, how far does it travel and how long does it wait?',
  group: 'Flow and lead time',
  inputs: [
    ...Array.from({ length: SLOTS }, (_, i) => slotFields(i)).flat(),
    { id: 'perDay', label: 'How many times a day this path is followed', unit: 'a day', kind: 'number', min: 0.000001, optional: true, money: true,
      help: 'Trays, pallets or batches that go this way in a day — to say the moves and the waiting in money a day.' },
    { id: 'rate', label: 'What an hour of the person moving and checking costs', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs; one person to each transport and inspection.' },
    { id: 'loadValue', label: 'What one load is worth', unit: '£', kind: 'number', min: 0, optional: true, money: true,
      help: 'What the tray, pallet or batch has cost by the time it waits — materials and labour so far.' },
    { id: 'carry', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true,
      help: 'Finance will have the business’s figure; the industry quotes 15–35% a year — Faultline never fills it in.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const unt: string[] = [], far: string[] = [];
    for (let i = 0; i < SLOTS; i++) {
      const k = v[id(i, 'kind')];
      if (!k) continue;
      if (num(v, id(i, 'min')) === undefined) unt.push(`Step ${i + 1}`);
      if (k === 'transport' && num(v, id(i, 'm')) === undefined) far.push(`Step ${i + 1}`);
    }
    if (unt.length) out.push({ field: id(Number(unt[0].slice(5)) - 1, 'min'), say: `${andList(unt.slice(0, 4))}${unt.length > 4 ? ` and ${unt.length - 4} more` : ''} ${unt.length === 1 ? 'has' : 'have'} no time — counted, left out of the minutes.` });
    if (far.length) out.push({ field: id(Number(far[0].slice(5)) - 1, 'm'), say: `${andList(far.slice(0, 4))}${far.length > 4 ? ` and ${far.length - 4} more` : ''} ${far.length === 1 ? 'is a transport' : 'are transports'} with no distance — left out of the metres.` });
    return out;
  },
  compute(v): CalcResult {
    const steps = stepsOf(v);
    const f = flowFigures(steps);
    const c = f.count, m = f.minutes;
    const counts = `${c.operation} change${c.operation === 1 ? 's' : ''} the product, ${c.transport} move${c.transport === 1 ? 's' : ''} it, ${c.inspection} check${c.inspection === 1 ? 's' : ''} it, ${c.delay} ${c.delay === 1 ? 'delays' : 'delay'} it and ${c.storage} ${c.storage === 1 ? 'stores' : 'store'} it`;
    const time = f.total > 0
      ? ` It takes ${min1(f.total)}; ${pct(f.opsShare as number)} of that is operations and ${pct(f.waitShare as number)} is waiting (delays and storage)${m.storage > 0 && f.opsLessStorage !== undefined ? ` — leaving the ${fmt(m.storage, 1)} minutes of storage by design aside, operations are ${pct(f.opsLessStorage)} of the rest` : ''}.`
      : ' None of the steps is timed yet, so there is no share of the time to say.';
    const dist = c.transport > 0 ? ` It travels ${fmt(f.metres, 1)} m${f.noDistance ? ` (${f.noDistance} of ${c.transport} ${c.transport === 1 ? 'transport' : 'transports'} ${f.noDistance === 1 ? 'has' : 'have'} no distance yet)` : ''}.` : '';
    const sentence = `${stepWord(f.n)}: ${counts}.${time}${dist}`;

    const more: string[] = [];
    if (f.longestDelay || f.longestTransport) more.push([f.longestDelay ? `The longest delay is “${f.longestDelay.what}” — ${min1(f.longestDelay.min)}` : '', f.longestTransport ? `the longest transport is “${f.longestTransport.what}” — ${fmt(f.longestTransport.m, 1)} m` : ''].filter(Boolean).join('; ') + '.');
    more.push('Ask of every transport, inspection and delay: why is it there, where, when, who and how — then eliminate it, combine it, rearrange it or simplify it (FC-028). The chart is the record; the questioning is the improvement.');

    const mo = flowMoney(f, { ...(num(v, 'perDay') !== undefined ? { perDay: num(v, 'perDay') as number } : {}), ...(num(v, 'rate') !== undefined ? { rate: num(v, 'rate') as number } : {}), ...(num(v, 'loadValue') !== undefined ? { loadValue: num(v, 'loadValue') as number } : {}), ...(num(v, 'carry') !== undefined ? { carry: num(v, 'carry') as number } : {}) });
    const figures: [string, string][] = [];
    const parts: string[] = [];
    if (mo.labourPerDay !== undefined && mo.moveMinPerDay !== undefined) {
      parts.push(`${min1(m.transport + m.inspection)} of a person’s time on the moves and checks a load × ${fmt(num(v, 'perDay') as number, 1)} loads a day = ${fmt(mo.moveMinPerDay, 1)} min — ${gbp(mo.labourPerDay)} labour a day at ${gbp(num(v, 'rate') as number)} an hour.`);
      figures.push(['People’s minutes a day on moves and checks', `${fmt(mo.moveMinPerDay, 1)} min`], ['Labour a day', gbp(mo.labourPerDay)]);
    }
    if (mo.carryPerDay !== undefined && mo.carryPerLoad !== undefined) {
      parts.push(`Holding a load worth ${gbp(num(v, 'loadValue') as number)} through ${min1(m.delay + m.storage)} of delay and storage costs about ${gbp(mo.carryPerLoad)} at ${fmt(num(v, 'carry') as number, 1)}% a year — ${gbp(mo.carryPerDay)} a day${m.storage > 0 && m.delay > 0 ? `, ${gbp(mo.carryStoragePerDay as number)} of it the storage by design and ${gbp(mo.carryDelayPerDay as number)} the delays` : ''}.`);
      figures.push(['Holding a load through its waiting', gbp(mo.carryPerLoad)], ['Holding a day’s loads', gbp(mo.carryPerDay)]);
    }
    const money: CalcMoney = { ...(parts.length ? { text: parts.join(' ') } : {}), ...(figures.length ? { figures } : {}), missing: mo.missing };

    const working = [
      ...FLOW_KINDS.filter(k => c[k] > 0).map(k => ({ label: FLOW_WORD[k].name, value: `${stepWord(c[k])} · ${min1(m[k])}${k === 'transport' ? ` · ${fmt(f.metres, 1)} m` : ''}`, note: FLOW_WORD[k].means })),
      ...(f.total > 0 ? [
        { label: 'Share of the time in operations', value: `${fmt(m.operation, 1)} ÷ ${fmt(f.total, 1)} minutes = ${pct(f.opsShare as number)}`, note: 'the operations’ time ÷ every timed step’s' },
        { label: 'Share of the time waiting', value: `(${fmt(m.delay, 1)} delay + ${fmt(m.storage, 1)} storage) ÷ ${fmt(f.total, 1)} = ${pct(f.waitShare as number)}` },
        ...(m.storage > 0 && f.opsLessStorage !== undefined ? [{ label: 'Operations, storage by design aside', value: `${fmt(m.operation, 1)} ÷ (${fmt(f.total, 1)} − ${fmt(m.storage, 1)}) = ${pct(f.opsLessStorage)}`, note: 'a chill or a proving time is counted, not called waste' }] : []),
      ] : []),
      { label: 'ASME symbols', value: 'operation (circle) · transport (arrow) · inspection (square) · delay (D) · storage (triangle)', note: 'ASME Standard 101, 1947; ILO, Introduction to Work Study' },
    ];

    return {
      verdict: stepWord(f.n),
      tone: 'n',
      sentence,
      more,
      tiles: [
        { k: 'Steps', v: String(f.n), of: `${c.operation} change${c.operation === 1 ? 's' : ''} the product`, n: f.n, better: 'lower', counted: true },
        f.opsShare !== undefined ? { k: 'Time in operations', v: pct(f.opsShare), of: `of ${min1(f.total)}`, n: f.opsShare * 100, better: 'higher', fmt: x => `${fmt(x, 2)} points` } : { k: 'Time in operations', v: '—', of: 'time the steps' },
        f.waitShare !== undefined ? { k: 'Waiting', v: pct(f.waitShare), of: `${min1(m.delay + m.storage)} in delay and storage`, n: f.waitShare * 100, better: 'lower', fmt: x => `${fmt(x, 2)} points` } : { k: 'Waiting', v: '—', of: 'time the steps' },
        { k: 'Travelled', v: `${fmt(f.metres, 1)} m`, of: plural(c.transport, 'transport'), n: f.metres, better: 'lower', fmt: x => `${fmt(x, 1)} m` },
        mo.labourPerDay !== undefined ? { k: 'Labour a day', v: gbp(mo.labourPerDay), of: 'on moves and checks', n: mo.labourPerDay, better: 'lower', fmt: gbp } : { k: 'Labour a day', v: '—', of: 'give the figures in money' },
      ],
      working,
      caveats: [
        'One path of one thing only: work a person and a machine do together needs the person and machine chart (FC-025), and the whole stream with its information flows the value stream map (FC-001).',
        'A chart made from the written procedure records what should happen; the method records what does — follow the product on the floor, and time the steps that matter (FC-019).',
        'Storage by design — a chill, a proving time — is counted but not called waste; a delay — waiting for a forklift or for QA — is. Storage and inspection the law or the HACCP plan requires may be shortened, not removed.',
        'The money is a person’s minutes on the moves and checks and the cost of holding the product while it waits — not the cost of the operations, which are needed, and not the shelf life the waiting uses.',
      ],
      money,
      chart: {
        title: 'The path, step by step',
        caption: 'Each step down the page in the order it happens, with its symbol, its minutes and — for a transport — its metres. The symbols are told apart by shape and letter: operation (a circle, O), transport (an arrow, T), inspection (a square, I), delay (a D) and storage (a triangle, S).',
        head: ['What happens', 'Minutes', 'Metres'],
        rows: steps.map((s, i) => ({ n: i + 1, symbol: SYMBOL[s.kind], what: s.what, time: s.min === undefined ? '—' : fmt(s.min, 1), distance: s.kind === 'transport' ? (s.m === undefined ? '—' : fmt(s.m, 1)) : '' })),
      },
      closing: `${stepWord(f.n)}, ${c.operation} of them changing the product${f.opsShare !== undefined ? ` — ${pct(f.opsShare)} of the time` : ''}; ${c.transport + c.inspection + c.delay + c.storage} are moving, checking or waiting. Question each of those first.`,
    };
  },
  examples: [
    {
      name: 'a tray from the oven to the despatch pallet — 14 steps, with its money',
      source: 'knowledge/methods/lean/process-flow-chart.md, the worked case; scripts/knowledge/cases-kaizen.py F and F2 (30 loads a day, £15 an hour, a £120 load, 25% a year)',
      inputs: path(TRAY, MONEY_IN),
      expect: {
        verdict: '14 steps', tone: 'n',
        sentence: '14 steps: 4 change the product, 5 move it, 2 check it, 2 delay it and 1 stores it. It takes 279.5 min; 3.9% of that is operations and 93% is waiting (delays and storage) — leaving the 240 minutes of storage by design aside, operations are 27.8% of the rest. It travels 140 m.',
        tiles: { Steps: '14', 'Time in operations': '3.9%', Waiting: '93%', Travelled: '140 m', 'Labour a day': '£63.75' },
        money: '8.5 min of a person’s time on the moves and checks a load × 30 loads a day = 255 min — £63.75 labour a day at £15.00 an hour. Holding a load worth £120.00 through 260 min of delay and storage costs about £0.01 at 25% a year — £0.45 a day, £0.41 of it the storage by design and £0.03 the delays.',
      },
    },
    {
      name: 'the same path questioned — the first delay and its check out, two transports cut to 10 m',
      source: 'scripts/knowledge/cases-kaizen.py F (the proposed chart: 12 steps, 266.5 min, 90 m)',
      inputs: path(QUESTIONED),
      expect: {
        verdict: '12 steps', tone: 'n',
        sentence: '12 steps: 4 change the product, 5 move it, 1 checks it, 1 delays it and 1 stores it. It takes 266.5 min; 4.1% of that is operations and 93.1% is waiting (delays and storage) — leaving the 240 minutes of storage by design aside, operations are 41.5% of the rest. It travels 90 m.',
        tiles: { Steps: '12', 'Time in operations': '4.1%', Waiting: '93.1%', Travelled: '90 m', 'Labour a day': '—' },
      },
    },
    {
      name: 'a short path with a step not timed and a transport with no distance',
      source: 'hand-worked: 3 steps, 2 + 3 = 5 minutes timed, one operation of 2 minutes = 40%',
      inputs: path([['Weigh in', 'operation', 2], ['To the mixer', 'transport', 3], ['Wait for the lid', 'delay']]),
      expect: {
        verdict: '3 steps', tone: 'n',
        sentence: '3 steps: 1 changes the product, 1 moves it, 0 check it, 1 delays it and 0 store it. It takes 5 min; 40% of that is operations and 0% is waiting (delays and storage). It travels 0 m (1 of 1 transport has no distance yet).',
        tiles: { Steps: '3', 'Time in operations': '40%', Waiting: '0%', Travelled: '0 m' },
        warns: ['Step 3 has no time — counted, left out of the minutes.', 'Step 2 is a transport with no distance — left out of the metres.'],
      },
    },
  ],
  refused: [
    { name: 'a minus time', inputs: path([['Mix', 'operation', -2]]), blocked: '“Step 1 takes” must be at least 0' },
    { name: 'a minus distance', inputs: path([['To the oven', 'transport', 1.5, -5]]), blocked: '“Step 1 moves it” must be at least 0' },
  ],
  see: [{ key: 'littles-law', why: 'how long product waits in the hall, from what is counted in progress' }],
};

export default def;
