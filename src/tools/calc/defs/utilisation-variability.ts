/* UTILISATION AND VARIABILITY — WHY QUEUES EXPLODE — FC-045 (knowledge/specs/FC-045-utilisation-variability.md;
 * knowledge/methods/capacity/kingman-vut.md).
 *
 * How long work waits before a busy station, and what cutting its variability or its load would buy: Kingman's VUT (1961),
 * as Hopp & Spearman give it — the wait is variability × utilisation × time, and the utilisation term u ÷ (1 − u) is a hyperbola,
 * not a line (lib/ie/queue). At 50% a unit waits one process time; at 85% nearly six; at 95% nineteen. The only ways to cut the
 * waiting are to cut variability, lower the load (more capacity) or accept the queue — the variability buffering law: inventory,
 * capacity or time, never whether but which. An approximation (exact for the M/M/1 queue), said so; the picture IS the answer
 * (wait against utilisation, the station marked on it). Money: the queue's holding (H) and the spare capacity's idle crew (L) side by
 * side — the buffer choice in money (knowledge/MONEY.md §4, FC-045); every money input optional. */
import { cvClass, effectiveFromStops, utilisation, waitingTime, type VutIn, type VutOut } from '../../../lib/ie/queue';
import { fmt, fixed, gbp, pct } from '../format';
import type { CalcDef, CalcMoney, CalcPicture, Problem, Values } from '../types';

const num = (v: Values, id: string): number => v[id] as number;
const name = (v: Values): string => (typeof v.what === 'string' && v.what.trim() ? v.what.trim() : 'station');
const min = (x: number): string => `${fmt(x, 1)} min`;

/** Process time and variability, from the cycles timed or from the machine's own stops. */
function ownOf(v: Values): { te: number; ce: number } | undefined {
  if (v.know === 'stops') return effectiveFromStops(num(v, 't0'), num(v, 'c0'), num(v, 'avail') / 100, num(v, 'mr'), num(v, 'cr'));
  return { te: num(v, 'te'), ce: num(v, 'ce') };
}
const inOf = (v: Values): VutIn | undefined => { const o = ownOf(v); return o ? { perHour: num(v, 'perHour'), te: o.te, machines: num(v, 'machines'), ca: num(v, 'ca'), ce: o.ce } : undefined; };

/** The next 1, 2 or 5 × a power of ten at or above x — a tidy top for the picture's axis. */
function niceMax(x: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(x, 1e-9)));
  return [1, 2, 5, 10].map(k => k * p).find(c => c >= x) as number;
}

const def: CalcDef = {
  key: 'utilisation-variability',
  fc: 'FC-045',
  title: 'Utilisation and variability',
  says: 'Why running a busy station harder makes the wait longer, not shorter — and what less variability or less load buys',
  question: 'How long will work wait before this station, and what does cutting its variability — or its load — buy?',
  group: 'Flow and lead time',
  inputs: [
    { id: 'what', label: 'The station', kind: 'text', optional: true, help: 'What the work waits for — the spiral freezer, the wrapper, the metal detector. It only names the sentence.' },
    { id: 'machines', label: 'Identical machines side by side', unit: 'machines', kind: 'number', min: 1, integer: true, default: 1, chosen: 'One machine unless you say there are more.', help: 'Two wrappers taking from one queue are 2. Machines that do different work are separate stations.' },
    { id: 'perHour', label: 'Work arriving', unit: 'units an hour', kind: 'number', min: 0.000001, help: 'What actually reaches it, counted over a few hours — not the rated speed of what feeds it.' },
    { id: 'know', label: 'How its own time is known', kind: 'choice', default: 'timed', chosen: 'Timed cycles unless you say it runs a fixed cycle and stops.',
      options: [{ value: 'timed', label: 'I timed its cycles', help: 'its effective time and how much it varies' }, { value: 'stops', label: 'It runs a fixed cycle but stops', help: 'its cycle, its stops and how long they last' }] },
    { id: 'te', label: 'One unit takes', unit: 'minutes', kind: 'number', min: 0.000001, showIf: v => v.know !== 'stops', help: 'Its effective time at one machine — with its stops and slow running counted in, not the plate’s cycle. Nameplate speed understates how busy it is.' },
    { id: 'ce', label: 'How much that time varies (c)', kind: 'number', min: 0, showIf: v => v.know !== 'stops', help: 'The standard deviation of the timed cycles ÷ their mean. 0 is a fixed cycle; 1 is as variable as random; under 0.75 is low, over 1.33 high. Tens of timed cycles are needed, not a handful.' },
    { id: 't0', label: 'Its cycle when it is running', unit: 'minutes', kind: 'number', min: 0.000001, showIf: v => v.know === 'stops', help: 'The time for one unit while the machine is running, with no stop in it.' },
    { id: 'c0', label: 'How much that cycle varies (c)', kind: 'number', min: 0, showIf: v => v.know === 'stops', help: '0 for a machine that runs a fixed cycle; the standard deviation ÷ the mean of timed cycles if it does not.' },
    { id: 'avail', label: 'Up and running', unit: '% of the time', kind: 'number', min: 1, max: 100, showIf: v => v.know === 'stops', help: '100 less the share of the time its own stops take — from the loss count or the reliability study.' },
    { id: 'mr', label: 'An average stop lasts', unit: 'minutes', kind: 'number', min: 0, showIf: v => v.know === 'stops', help: 'The mean repair time of its stops. Long, rare stops make far more variability than short, frequent ones of the same total.' },
    { id: 'cr', label: 'How much stops vary in length (c)', kind: 'number', min: 0, showIf: v => v.know === 'stops', help: '1 if stops are random in length; more if a few are very long; 0 if every stop lasts the same.' },
    { id: 'ca', label: 'How much the arrivals vary (c)', kind: 'number', min: 0, help: 'From the gaps between units arriving: their standard deviation ÷ mean. A conveyor fed by one steady machine arrives like that machine’s own variability; batches arriving together are high.' },
    { id: 'unitCost', label: 'What one waiting unit has cost by now', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'materialsPerPack', where: 'a pack’s materials on its set-up', words: 'the line’s materials for a pack — a floor under what a waiting pack has cost' }, help: 'Its materials and labour so far, to say the queue in money.' },
    { id: 'carrying', label: 'Cost of holding stock for a year', unit: '% a year', kind: 'number', min: 0, max: 100, optional: true, money: true, help: 'Finance will have the business’s figure; the industry quotes 15–35% a year — LUNAR never fills it in.' },
    { id: 'people', label: 'People at the station', unit: 'people', kind: 'number', min: 0, optional: true, money: true, help: 'Who stand at it while it waits for work — to say the spare capacity in money.' },
    { id: 'wage', label: 'What one person costs', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'the line’s crew and wage', words: 'the line’s wage with on-costs' }, help: 'Wage with the on-costs.' },
  ],
  check(v): Problem[] {
    const x = inOf(v);
    if (!x) return [{ say: 'The figures cannot be used as they stand — check the availability, the cycle and the stops.', block: true }];
    const u = utilisation(x.perHour, x.te, x.machines);
    if (!(u < 1)) return [{ field: 'perHour', say: `${fmt(x.perHour, 1)} units an hour at ${fmt(x.te, 2)} minutes each asks ${x.machines === 1 ? 'the station' : `${x.machines} machines`} for ${pct(u, 0)} of their time — more than they have. There is no steady queue, only a pile that grows: cut the arrivals or add capacity, and the wait can be worked out below 100%.`, block: true }];
    return [];
  },
  compute(v) {
    const x = inOf(v) as VutIn;
    const w = waitingTime(x) as VutOut;
    const m = x.machines, st = name(v);
    const at = (extra: Partial<VutIn>) => (waitingTime({ ...x, ...extra }) as VutOut).wait;
    const unitWord = 'units';
    const ceClass = cvClass(x.ce), caClass = cvClass(x.ca);
    const sentence = `At ${pct(w.u, 0)} utilisation a unit waits about ${fmt(w.waitInTe, 1)} process times before the ${st} — ${fmt(w.wait, 1)} minutes — and by Little’s law about ${fmt(w.queue, 1)} ${unitWord} stand in front of it. Its own time is ${ceClass} in variability (c ${fixed(x.ce, 2)}) and the arrivals ${caClass} (c ${fixed(x.ca, 2)}).`;

    const capacity = (m * 60) / x.te;
    const more: string[] = [];
    if (w.u > 0.85) {
      const need = x.perHour / 0.85, extra = need / capacity - 1;
      more.push(`At 85% utilisation — it would need to be able to do ${fmt(need, 1)} an hour, ${pct(extra, 0)} more than the ${fmt(capacity, 1)} it does — the wait would fall to ${min(at({ perHour: capacity * 0.85 }))}.`);
    } else {
      more.push(`Loaded to 95% — ${fmt(capacity * 0.95, 1)} an hour — the same station would make a unit wait ${min(at({ perHour: capacity * 0.95 }))}: the wait is a curve, not a line, and the last few per cent of load cost the most.`);
    }
    const halfCe = at({ ce: x.ce / 2 }), halfBoth = at({ ce: x.ce / 2, ca: x.ca / 2 });
    more.push(`Halving the station’s own variability (c ${fixed(x.ce, 2)} → ${fixed(x.ce / 2, 2)}) would cut the wait to ${min(halfCe)}; halving the arrivals’ as well, to ${min(halfBoth)}.`);
    if (w.cd != null) more.push(`A station this busy passes its variability on: what leaves it is ${cvClass(w.cd)} (c ${fixed(w.cd, 2)}), and that is the next station’s arrivals.`);
    more.push(`The line is buffering this station with inventory and time today — ${fmt(w.queue, 1)} ${unitWord} waiting, ${min(w.wait)} each. The only other buffer is capacity: spare time at the station.`);

    /* the picture: wait against utilisation for this station's variability, the station on it */
    const curve = (maxY: number): [number, number][] => {
      const pts: [number, number][] = [];
      for (let k = 30; k <= 99; k++) {
        const u = k / 100, y = (waitingTime({ ...x, perHour: (u * m * 60) / x.te }) as VutOut).wait;
        if (y > maxY) break;
        pts.push([u, y]);
      }
      return pts;
    };
    const top = niceMax(Math.max(w.wait * 1.4, at({ perHour: capacity * 0.9 })));
    const picture: CalcPicture = {
      title: `Wait against utilisation — ${fmt(w.waitInTe, 1)} process times at ${pct(w.u, 0)}`,
      caption: 'Up: how long a unit waits before the station. Across: how busy the station is. The curve bends up sharply near 100% — the last few per cent of load buy a little output and a great deal of waiting; lower variability lowers the whole curve.',
      x: { label: 'Utilisation', min: 0.3, max: 1, ticks: [0.3, 0.5, 0.7, 0.9], fmt: z => pct(z, 0) },
      y: { label: 'Wait in the queue (minutes)', min: 0, max: top, ticks: [0, top / 4, top / 2, (3 * top) / 4, top], fmt: z => fmt(z, top < 5 ? 1 : 0) },
      lines: [{ points: curve(top), mark: 'brand' }],
      verticals: [],
      horizontals: [],
      dots: [{ x: Math.min(0.99, w.u), y: w.wait, label: `${st}: ${min(w.wait)}` }],
    };

    const unit = v.unitCost as number | undefined, rate = v.carrying as number | undefined, people = v.people as number | undefined, wage = v.wage as number | undefined;
    const missing: string[] = [];
    const figures: [string, string][] = [];
    const parts: string[] = [];
    if (unit !== undefined) {
      const stock = w.queue * unit;
      figures.push(['The queue stands at', gbp(stock)]);
      let t = `The ${fmt(w.queue, 1)} ${unitWord} waiting stand at ${gbp(stock)} (at ${gbp(unit)} each) — money tied up in the wait`;
      if (rate !== undefined) { const year = stock * rate / 100; figures.push([`Holding it for a year at ${fmt(rate, 1)}%`, gbp(year)]); t += `; holding it costs about ${gbp(year)} a year at ${fmt(rate, 1)}%`; }
      else missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding the queue costs a year.');
      parts.push(`${t}.`);
    } else {
      missing.push('Give what one waiting unit has cost by now to say the queue in money.');
      if (rate === undefined) missing.push('Give the cost of holding stock for a year (finance will have it; the industry quotes 15–35%) to say what holding the queue costs a year.');
    }
    if (people !== undefined && wage !== undefined) {
      const idle = (1 - w.u) * people * wage, idle85 = 0.15 * people * wage;
      figures.push([`Spare capacity today (${pct(1 - w.u, 0)} of the time)`, `${gbp(idle)} an hour`]);
      parts.push(w.u > 0.85
        ? `The spare capacity — ${pct(1 - w.u, 0)} of the time — is ${gbp(idle)} an hour of the crew standing (${fmt(people, 0)} ${people === 1 ? 'person' : 'people'} at ${gbp(wage)}); at 85% to cut the wait to ${min(at({ perHour: capacity * 0.85 }))}, 15% would stand: ${gbp(idle85)} an hour.`
        : `The spare capacity — ${pct(1 - w.u, 0)} of the time — is ${gbp(idle)} an hour of the crew standing (${fmt(people, 0)} ${people === 1 ? 'person' : 'people'} at ${gbp(wage)}).`);
    } else missing.push('Give the people at the station and what one costs an hour to say the spare capacity in money.');
    const money: CalcMoney = parts.length ? { text: parts.join(' '), figures, missing } : { missing };

    const stops = v.know === 'stops';
    const working = [
      { label: 'Utilisation', value: `${fmt(x.perHour, 3)} an hour × ${fmt(x.te, 4)} min ÷ 60${m > 1 ? ` ÷ ${m} machines` : ''} = ${fixed(w.u, 4)}`, note: 'u = arrivals × process time ÷ machines' },
      ...(stops ? [{ label: 'Effective time', value: `t_e = ${fmt(num(v, 't0'), 4)} ÷ ${fixed(num(v, 'avail') / 100, 3)} = ${fmt(x.te, 4)} min; c_e² = ${fixed(num(v, 'c0') ** 2, 3)} + (1 + ${fixed(num(v, 'cr') ** 2, 3)}) × ${fixed(num(v, 'avail') / 100, 3)} × ${fixed(1 - num(v, 'avail') / 100, 3)} × ${fmt(num(v, 'mr'), 3)} ÷ ${fmt(num(v, 't0'), 3)} = ${fixed(x.ce ** 2, 4)}`, note: 'Hopp & Spearman: a machine’s own stops make its variability' }] : []),
      { label: 'Variability', value: `(${fixed(x.ca, 3)}² + ${fixed(x.ce, 3)}²) ÷ 2 = ${fixed(w.v, 4)}`, note: 'V = (c_a² + c_e²) ÷ 2' },
      { label: 'Utilisation term', value: m === 1 ? `${fixed(w.u, 4)} ÷ (1 − ${fixed(w.u, 4)}) = ${fixed(w.ut, 4)}` : `${fixed(w.u, 4)}^(√(2(${m}+1)) − 1) ÷ (${m} × (1 − ${fixed(w.u, 4)})) = ${fixed(w.ut, 4)}`, note: m === 1 ? 'U = u ÷ (1 − u)' : 'Sakasegawa’s form for several machines' },
      { label: 'The wait', value: `${fixed(w.v, 4)} × ${fixed(w.ut, 4)} × ${fmt(x.te, 4)} min = ${fmt(w.wait, 3)} min`, note: 'CT_q ≈ V × U × t_e — Kingman 1961' },
      { label: 'Waiting in front of it', value: `${fmt(x.perHour / 60, 4)} a minute × ${fmt(w.wait, 3)} min = ${fmt(w.queue, 2)} ${unitWord}`, note: 'Little’s law' },
    ];

    return {
      verdict: `${min(w.wait)} waiting`,
      tone: 'n',
      sentence,
      more,
      tiles: [
        { k: 'Utilisation', v: pct(w.u, 0), of: `${fmt(x.perHour, 1)} an hour × ${fmt(x.te, 2)} min${m > 1 ? ` ÷ ${m} machines` : ''}`, n: w.u, fmt: z => pct(z, 0) },
        { k: 'Wait in the queue', v: min(w.wait), of: `${fmt(w.waitInTe, 1)} process times`, n: w.wait, better: 'lower', fmt: min },
        { k: 'Time through', v: min(w.through), of: 'the wait and the process time', n: w.through, better: 'lower', fmt: min },
        { k: 'Waiting in front of it', v: fmt(w.queue, 1), of: `${unitWord}, by Little’s law`, n: w.queue, better: 'lower', fmt: z => `${fmt(z, 1)} ${unitWord}` },
        { k: 'Variability', v: ceClass, of: `its own c ${fixed(x.ce, 2)} · the arrivals’ c ${fixed(x.ca, 2)}` },
        unit !== undefined ? { k: 'Queue held', v: gbp(w.queue * unit), of: `in front of it, at ${gbp(unit)} each`, n: w.queue * unit, better: 'lower', fmt: gbp } : { k: 'Queue held', v: '—', of: 'give what a unit has cost' },
      ],
      working,
      caveats: [
        'An approximation for a steady state, exact only for the simplest queue (random arrivals, random times, one machine). It is within about 10% of the truth below 90% utilisation and understates the wait above it — a guide, not a forecast.',
        'Utilisation must be below 100%. A station asked for more than it can do has no steady queue, only a growing pile.',
        'Nameplate speed understates utilisation: the process time must be the effective one, with the stops and slow running in. The variabilities need tens of timed cycles or arrivals, not a handful.',
        'One station is not a line: each station’s departures feed the next. For a whole line with real stop patterns and buffers a simulation is the tool (FC-047, not built).',
        'Cutting variability at a station that is not the bottleneck shortens that station’s queue — not the line’s output.',
      ],
      money,
      picture,
      closing: `${pct(w.u, 0)} busy, ${fmt(w.waitInTe, 1)} process times of waiting (${min(w.wait)}) and ${fmt(w.queue, 1)} ${unitWord} in front of the ${st}. The wait is variability × utilisation × time: less of either, or more capacity, is what shortens it.`,
    };
  },
  examples: [
    {
      name: 'The wrapper on the record’s reading: 92% busy, a high-variability machine, with the money given',
      source: 'knowledge/methods/capacity/kingman-vut.md reading; scripts/knowledge/cases-toc.py E1 — te 0.6 min, u 0.92, c_a 0.9, c_e 1.5: CTq 10.557 min = 17.6 process times, 16.19 queued; 85% → 5.202 min; halving c_e → 4.735 min',
      inputs: { what: 'wrapper', machines: 1, perHour: 92, know: 'timed', te: 0.6, ce: 1.5, ca: 0.9, unitCost: 0.85, carrying: 25, people: 3, wage: 14 },
      expect: {
        verdict: '10.6 min waiting', tone: 'n',
        sentence: 'At 92% utilisation a unit waits about 17.6 process times before the wrapper — 10.6 minutes — and by Little’s law about 16.2 units stand in front of it. Its own time is high in variability (c 1.50) and the arrivals moderate (c 0.90).',
        tiles: { Utilisation: '92%', 'Wait in the queue': '10.6 min', 'Time through': '11.2 min', 'Waiting in front of it': '16.2', Variability: 'high', 'Queue held': '£13.76' },
        money: 'The 16.2 units waiting stand at £13.76 (at £0.85 each) — money tied up in the wait; holding it costs about £3.44 a year at 25%. The spare capacity — 8% of the time — is £3.36 an hour of the crew standing (3 people at £14.00); at 85% to cut the wait to 5.2 min, 15% would stand: £6.30 an hour.',
      },
    },
    {
      name: 'The simplest queue, where Kingman is exact: random arrivals and times at 85%',
      source: 'M/M/1: Wq = ρ ÷ (1 − ρ) × te = 5.667 × 2 = 11.333 min exactly; scripts/knowledge/cases-toc.py E2',
      inputs: { machines: 1, perHour: 25.5, know: 'timed', te: 2, ce: 1, ca: 1 },
      expect: {
        verdict: '11.3 min waiting', tone: 'n',
        sentence: 'At 85% utilisation a unit waits about 5.7 process times before the station — 11.3 minutes — and by Little’s law about 4.8 units stand in front of it. Its own time is moderate in variability (c 1.00) and the arrivals moderate (c 1.00).',
        tiles: { Utilisation: '85%', 'Wait in the queue': '11.3 min', 'Time through': '13.3 min', 'Waiting in front of it': '4.8', Variability: 'moderate', 'Queue held': '—' },
      },
    },
    {
      name: 'Two machines taking from one queue (Sakasegawa), at 85%',
      source: 'Sakasegawa’s form 5.2675 min against the exact Erlang C wait 5.2072 min (1.2% off); scripts/knowledge/cases-toc.py E3',
      inputs: { what: 'wrappers', machines: 2, perHour: 51, know: 'timed', te: 2, ce: 1, ca: 1 },
      expect: {
        verdict: '5.3 min waiting', tone: 'n',
        sentence: 'At 85% utilisation a unit waits about 2.6 process times before the wrappers — 5.3 minutes — and by Little’s law about 4.5 units stand in front of it. Its own time is moderate in variability (c 1.00) and the arrivals moderate (c 1.00).',
        tiles: { Utilisation: '85%', 'Wait in the queue': '5.3 min', 'Time through': '7.3 min', 'Waiting in front of it': '4.5', Variability: 'moderate', 'Queue held': '—' },
      },
    },
    {
      name: 'A machine on a fixed cycle that stops: its variability is made by the stops',
      source: 'Hopp & Spearman effective process time: t0 0.5, A 90%, m_r 10 min, c_r 1, c_0 0.2 → t_e 0.5556, c_e² 3.64; wait 5.1556 min at 86.4 an hour; scripts/knowledge/cases-toc.py E4',
      inputs: { what: 'depositor', machines: 1, perHour: 86.4, know: 'stops', t0: 0.5, c0: 0.2, avail: 90, mr: 10, cr: 1, ca: 1 },
      expect: {
        verdict: '5.2 min waiting', tone: 'n',
        sentence: 'At 80% utilisation a unit waits about 9.3 process times before the depositor — 5.2 minutes — and by Little’s law about 7.4 units stand in front of it. Its own time is high in variability (c 1.91) and the arrivals moderate (c 1.00).',
        tiles: { Utilisation: '80%', 'Wait in the queue': '5.2 min', 'Time through': '5.7 min', 'Waiting in front of it': '7.4', Variability: 'high', 'Queue held': '—' },
      },
    },
  ],
  refused: [
    { name: 'a station asked for more than it can do', inputs: { machines: 1, perHour: 120, know: 'timed', te: 0.6, ce: 1, ca: 1 }, blocked: 'more than they have' },
    { name: 'asked for exactly all of its time', inputs: { machines: 1, perHour: 100, know: 'timed', te: 0.6, ce: 1, ca: 1 }, blocked: 'There is no steady queue' },
    { name: 'no arrivals given', inputs: { machines: 1, know: 'timed', te: 0.6, ce: 1, ca: 1 }, blocked: 'Give “Work arriving”' },
    { name: 'no machines', inputs: { machines: 0, perHour: 50, know: 'timed', te: 0.6, ce: 1, ca: 1 }, blocked: 'must be at least' },
    { name: 'availability above 100%', inputs: { machines: 1, perHour: 50, know: 'stops', t0: 0.5, c0: 0.2, avail: 120, mr: 10, cr: 1, ca: 1 }, blocked: 'must be at most' },
    { name: 'the arrivals’ variability left out', inputs: { machines: 1, perHour: 50, know: 'timed', te: 0.6, ce: 1 }, blocked: 'Give “How much the arrivals vary (c)”' },
  ],
  see: [{ key: 'littles-law', why: 'tie the queue to the lead time it makes' }, { key: 'kanban', why: 'size a pull loop to hold only what the refill needs' }],
};

export default def;
