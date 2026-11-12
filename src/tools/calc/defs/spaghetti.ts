/* THE SPAGHETTI DIAGRAM — FC-004 (knowledge/specs/FC-004-spaghetti-diagram.md; knowledge/methods/lean/spaghetti.md).
 *
 * One person's (or one load's) round: the places in the order walked, each leg a line on the layout drawn to scale, the metres of a round, the rounds a shift, the
 * distance and the minutes of walking a shift at a stated pace, which trips make most of it, and the walking in money (labour). A leg's length is the metres walked (typed:
 * paced, a wheel, a tape) or, when both places have a position on the layout, the straight line between them — said to be that. Nothing reads a person's movement. The places
 * are typed in order, up to 20, each appearing once the one above is named. */
import { PACE, walkFigures, walkMoney, windowOf, type PaceKind, type Place } from '../../spaghetti/spaghetti';
import { andList, fmt, gbp, pct, plural } from '../format';
import type { CalcDef, CalcMoney, CalcPicture, CalcResult, Field, Inputs, Problem, Values } from '../types';

const SLOTS = 20;
const nn = (i: number): string => String(i + 1).padStart(2, '0');
const id = (i: number, part: 'name' | 'x' | 'y' | 'm' | 'trip'): string => `p${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');

const slotFields = (i: number): Field[] => {
  const n = i + 1;
  const shown = (v: Values): boolean => i === 0 || !!text(v, id(i - 1, 'name'));
  const named = (v: Values): boolean => shown(v) && !!text(v, id(i, 'name'));
  return [
    { id: id(i, 'name'), label: n === 1 ? 'Place 1 — where the round starts' : `Place ${n}`, kind: 'text', ...(i > 1 ? { optional: true } : {}), showIf: shown,
      ...(i === 0 ? { help: 'The first place — “Packing line”. The round is the places in the order walked, back to the line included. Each place appears once the one above is named.' } : {}) },
    { id: id(i, 'x'), label: `Place ${n}: metres east`, unit: 'm', kind: 'number', min: 0, max: 5000, optional: true, showIf: named,
      ...(i === 0 ? { help: 'Optional: where it is on the layout, measured from one corner of the plan — east, then north. Give both for every place to draw the path to scale.' } : {}) },
    { id: id(i, 'y'), label: `Place ${n}: metres north`, unit: 'm', kind: 'number', min: 0, max: 5000, optional: true, showIf: named },
    ...(i > 0 ? [
      { id: id(i, 'm'), label: `Walked from place ${n - 1} to place ${n}`, unit: 'm', kind: 'number' as const, min: 0, optional: true, showIf: named, ...(i === 1 ? { help: 'The metres actually walked — paced, or with a wheel or tape. Left empty, the straight line between the two places’ positions is used, and said to be that.' } : {}) },
      { id: id(i, 'trip'), label: `What the walk to place ${n} is for`, kind: 'text' as const, optional: true, showIf: named, ...(i === 1 ? { help: 'Optional: “Fetch film”. Legs with the same words are one trip, so the trips can be ranked.' } : {}) },
    ] : []),
  ];
};

const placesOf = (v: Values): Place[] => {
  const out: Place[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const name = text(v, id(i, 'name'));
    if (!name) break;
    out.push({ name, ...(num(v, id(i, 'x')) !== undefined ? { x: num(v, id(i, 'x')) as number } : {}), ...(num(v, id(i, 'y')) !== undefined ? { y: num(v, id(i, 'y')) as number } : {}), ...(num(v, id(i, 'm')) !== undefined ? { m: num(v, id(i, 'm')) as number } : {}), ...(text(v, id(i, 'trip')) ? { trip: text(v, id(i, 'trip')) } : {}) });
  }
  return out;
};
/** A round as the boxes hold it, from rows of [name, walked metres, trip, east, north]. */
const round = (rows: [string, number?, string?, number?, number?][], more: Inputs = {}): Inputs => {
  const out: Inputs = {};
  rows.forEach(([name, m, trip, x, y], i) => { out[id(i, 'name')] = name; if (m !== undefined) out[id(i, 'm')] = m; if (trip) out[id(i, 'trip')] = trip; if (x !== undefined) out[id(i, 'x')] = x; if (y !== undefined) out[id(i, 'y')] = y; });
  return { ...out, ...more };
};
/* the knowledge record's packer: to the film store and back (42 m each way), the case store and back (28), the scale and back (9) — scripts/knowledge/cases-kaizen.py S */
const PACKER: [string, number?, string?][] = [['Packing line'], ['Film store', 42, 'Fetch film'], ['Packing line', 42, 'Fetch film'], ['Case store', 28, 'Fetch cases'], ['Packing line', 28, 'Fetch cases'], ['Scale', 9, 'Weigh'], ['Packing line', 9, 'Weigh']];
/* film staged at the line, 6 m each way */
const STAGED: [string, number?, string?][] = [['Packing line'], ['Film trolley', 6, 'Fetch film'], ['Packing line', 6, 'Fetch film'], ['Case store', 28, 'Fetch cases'], ['Packing line', 28, 'Fetch cases'], ['Scale', 9, 'Weigh'], ['Packing line', 9, 'Weigh']];
const SHIFT: Inputs = { rounds: 36, pace: 'loaded', shiftMin: 480, rate: 25, shiftsWeek: 5 };
/* a layout: the line at (30, 0), the film store at (0, 0), the scale at (30, 16) */
const LAYOUT: [string, number?, string?, number?, number?][] = [['Packing line', undefined, undefined, 30, 0], ['Film store', undefined, 'Fetch film', 0, 0], ['Packing line', undefined, 'Fetch film', 30, 0], ['Scale', undefined, 'Weigh', 30, 16], ['Packing line', undefined, 'Weigh', 30, 0]];

const metres = (m: number): string => (m >= 1000 ? `${fmt(m / 1000, 1)} km` : `${fmt(m, 0)} m`);
const mins = (m: number): string => `${fmt(m, 0)} min`;
const tick = (span: number): number => [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(s => span / s <= 6) ?? 5000;

const def: CalcDef = {
  key: 'spaghetti',
  fc: 'FC-004',
  title: 'Spaghetti diagram',
  says: 'A person’s round drawn on the layout to scale, with the metres, the minutes of walking a shift and the trips that make most of it',
  question: 'How far does this person walk a shift, and which trips could go?',
  group: 'Flow and lead time',
  inputs: [
    { id: 'who', label: 'Whose round', kind: 'text', optional: true, help: 'The packer, the weigh-up operator, a trolley — it only names the sentence.' },
    ...Array.from({ length: SLOTS }, (_, i) => slotFields(i)).flat(),
    { id: 'rounds', label: 'How many times this round is walked in a shift', unit: 'rounds', kind: 'number', min: 0.001,
      help: 'From the rate and what one round fetches — packs a shift ÷ packs a round — or counted over a timed hour and scaled. One lap of the places above is one round.' },
    { id: 'pace', label: 'Walking pace', kind: 'choice', default: 'loaded',
      chosen: 'LUNAR’s starting point from the knowledge record, not a measurement: about 1.3 m/s when loaded or in a crowded hall (1.2–1.3 is nearer); about 1.6 m/s unloaded at a standard pace (MTM-1’s walking element, 5.3 TMU a foot). The pace moves the minutes by about a quarter — time one on your floor to be sure.',
      options: [
        { value: 'loaded', label: 'Loaded or crowded', help: 'about 1.3 m/s' },
        { value: 'unloaded', label: 'Unloaded', help: 'about 1.6 m/s' },
        { value: 'timed', label: 'Timed on the floor', help: 'type the pace' },
      ] },
    { id: 'paceMs', label: 'The pace timed', unit: 'm/s', kind: 'number', min: 0.1, max: 4, showIf: v => v.pace === 'timed', help: 'Metres walked ÷ seconds, over a stretch walked at the pace the work is done at.' },
    { id: 'shiftMin', label: 'Minutes in the shift', unit: 'min', kind: 'number', min: 1, optional: true, help: 'Optional: the shift less its breaks, to say what share of it is walking.' },
    { id: 'rate', label: 'What an hour of the person walking costs', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs — the walking is the person’s time, labour.' },
    { id: 'shiftsWeek', label: 'Shifts a week this person works the round', unit: 'shifts', kind: 'number', min: 0, optional: true, money: true, help: 'To say the walking in money a week.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const places = placesOf(v);
    if (places.length < 2) { out.push({ field: id(Math.min(places.length, SLOTS - 1), 'name'), say: 'A walk needs at least two places — one leg between them. Name the next place.', block: true }); return out; }
    const f = walkFigures(places, { rounds: 1, ms: 1 });
    if (f.missing.length === f.legs.length) out.push({ field: id(1, 'm'), say: 'No leg has a length yet — type the metres walked, or give both places’ positions on the layout.', block: true });
    else if (f.missing.length) out.push({ field: id(f.missing[0], 'm'), say: `${andList(f.missing.slice(0, 4).map(n => `Leg ${n} (to ${places[n].name})`))}${f.missing.length > 4 ? ` and ${f.missing.length - 4} more` : ''} ${f.missing.length === 1 ? 'has' : 'have'} no length — left out of the sums.` });
    if (f.straight.length) out.push({ field: id(f.straight[0], 'm'), say: `${f.straight.length === f.legs.length ? 'Every leg is' : `Leg${f.straight.length === 1 ? '' : 's'} ${andList(f.straight.slice(0, 6).map(String))}${f.straight.length > 6 ? ' and more' : ''} ${f.straight.length === 1 ? 'is' : 'are'}`} a straight line between positions — a person goes round a guard or a bench: type the metres walked where it is further.` });
    return out;
  },
  compute(v): CalcResult {
    const places = placesOf(v);
    const pk = v.pace as PaceKind;
    const ms = pk === 'timed' ? (num(v, 'paceMs') as number) : PACE[pk].ms;
    const paceWord = pk === 'timed' ? 'timed on the floor' : PACE[pk].label.replace(/^unloaded, at a standard pace$/, 'unloaded');
    const rounds = num(v, 'rounds') as number;
    const f = walkFigures(places, { rounds, ms, ...(num(v, 'shiftMin') !== undefined ? { shiftMin: num(v, 'shiftMin') as number } : {}) });
    const who = text(v, 'who');

    const sentence = `One round${who ? ` of ${who}’s` : ''} is ${fmt(f.round, 1)} m over ${plural(f.legs.length, 'leg')}; ${fmt(rounds, rounds % 1 ? 1 : 0)} ${rounds === 1 ? 'round' : 'rounds'} a shift is ${metres(f.shiftM)} — ${mins(f.minutes)} of walking at ${fmt(ms, 1)} m/s (${paceWord})${f.shareOfShift !== undefined ? `, ${pct(f.shareOfShift)} of the ${fmt(num(v, 'shiftMin') as number, 0)}-minute shift` : ''}.`;
    const other = pk === 'timed' ? undefined : pk === 'loaded' ? PACE.unloaded : PACE.loaded;
    const more: string[] = [];
    if (f.trips.length && (f.trips.length > 1 || f.legs.length > 1)) more.push(`The trips, by distance: ${f.trips.slice(0, 5).map(t => `${t.name} ${fmt(t.m, 1)} m (${pct(t.share, 0)})`).join(' · ')}${f.trips.length > 5 ? ` and ${f.trips.length - 5} more` : ''} of a round.`);
    if (f.longest) more.push(`The longest is “${f.longest.name}”. Ask of each trip: could what is fetched come to the person — staged at the line — or could the trip be shared, shortened or taken out? Walking is not all waste: the question is whether the material could come to the person.`);
    if (other) more.push(`The pace assumed matters: at ${fmt(other.ms, 1)} m/s (${other.label}) the same walk is ${mins(f.minutesAt(other.ms))} a shift.`);

    const placed = places.filter(p => p.x !== undefined && p.y !== undefined);
    let picture: CalcPicture | undefined;
    if (placed.length >= 2) {
      const w = windowOf(placed as { x: number; y: number }[]);
      const st = tick(Math.max(w.x1 - w.x0, w.y1 - w.y0));
      const ticks = (a: number, b: number): number[] => { const o: number[] = []; for (let t = Math.ceil(a / st) * st; t <= b + 1e-9; t += st) o.push(t); return o; };
      const lines: CalcPicture['lines'] = [];
      for (let i = 1; i < places.length; i++) {
        const a = places[i - 1], b = places[i];
        if (a.x !== undefined && a.y !== undefined && b.x !== undefined && b.y !== undefined) lines.push({ points: [[a.x, a.y], [b.x, b.y]], mark: 'ink' });
      }
      const seen = new Set<string>();
      const dots = placed.filter(p => { const k = p.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).map(p => ({ x: p.x as number, y: p.y as number, label: p.name }));
      picture = {
        aspect: (w.x1 - w.x0) / (w.y1 - w.y0),
        title: 'The round on the layout, to scale',
        caption: 'Each leg is a line between the two places it joins, drawn to one scale across and up (metres from the layout’s corner), so the tangle is the real distance. Legs that lie on top of each other are walked more than once.',
        x: { label: 'Metres east of the corner', min: w.x0, max: w.x1, ticks: ticks(w.x0, w.x1), fmt: x => fmt(x, 0) },
        y: { label: 'Metres north', min: w.y0, max: w.y1, ticks: ticks(w.y0, w.y1), fmt: y => fmt(y, 0) },
        lines, verticals: [], horizontals: [], dots,
      };
    } else more.push('Give each place its position on the layout (metres east and north of one corner) to draw the round to scale.');

    const mo = walkMoney(f.minutes, { ...(num(v, 'rate') !== undefined ? { rate: num(v, 'rate') as number } : {}), ...(num(v, 'shiftsWeek') !== undefined ? { shiftsPerWeek: num(v, 'shiftsWeek') as number } : {}) });
    const money: CalcMoney = mo.perShift !== undefined
      ? { text: `${fmt(f.minutes, 1)} min of walking a shift at ${gbp(num(v, 'rate') as number)} an hour is ${gbp(mo.perShift)} a shift${mo.perWeek !== undefined ? ` — ${gbp(mo.perWeek)} over ${fmt(num(v, 'shiftsWeek') as number, 0)} shifts a week` : ''}.`, figures: [['Walking a shift', `${fmt(f.minutes, 1)} min`], ['Labour a shift', gbp(mo.perShift)], ...(mo.perWeek !== undefined ? [['Labour a week', gbp(mo.perWeek)] as [string, string]] : [])], missing: mo.missing }
      : { missing: mo.missing };

    return {
      verdict: `${metres(f.shiftM)} a shift`,
      tone: 'n',
      sentence,
      more,
      tiles: [
        { k: 'A round', v: `${fmt(f.round, 1)} m`, of: plural(f.legs.length, 'leg'), n: f.round, better: 'lower', fmt: x => `${fmt(x, 1)} m` },
        { k: 'Walked a shift', v: metres(f.shiftM), of: `${fmt(rounds, rounds % 1 ? 1 : 0)} ${rounds === 1 ? 'round' : 'rounds'}`, n: f.shiftM, better: 'lower', fmt: x => metres(x) },
        { k: 'Walking a shift', v: mins(f.minutes), of: `at ${fmt(ms, 1)} m/s`, n: f.minutes, better: 'lower', fmt: x => mins(x) },
        f.shareOfShift !== undefined ? { k: 'Share of the shift', v: pct(f.shareOfShift), of: `of ${fmt(num(v, 'shiftMin') as number, 0)} min`, n: f.shareOfShift * 100, better: 'lower', fmt: x => `${fmt(x, 1)} points` } : { k: 'Share of the shift', v: '—', of: 'give the shift’s minutes' },
        mo.perShift !== undefined ? { k: 'Labour a shift', v: gbp(mo.perShift), of: 'on the walking', n: mo.perShift, better: 'lower', fmt: gbp } : { k: 'Labour a shift', v: '—', of: 'give the figures in money' },
      ],
      working: [
        ...f.legs.map(l => ({ label: `Leg ${l.n}: ${l.from} → ${l.to}`, value: l.m === undefined ? 'no length yet' : `${fmt(l.m, 1)} m`, note: l.source === 'walked' ? 'walked, typed' : l.source === 'straight' ? 'a straight line between the positions' : 'neither typed nor given by positions' })),
        { label: 'A round', value: `Σ the legs = ${fmt(f.round, 1)} m` },
        { label: 'A shift', value: `${fmt(f.round, 1)} m × ${fmt(rounds, rounds % 1 ? 1 : 0)} rounds = ${fmt(f.shiftM, 0)} m` },
        { label: 'Time walking', value: `${fmt(f.shiftM, 0)} m ÷ ${fmt(ms, 2)} m/s ÷ 60 = ${fmt(f.minutes, 2)} min`, note: pk === 'timed' ? 'the pace timed on the floor' : PACE[pk].source },
      ],
      caveats: [
        'One person’s one round may not be typical: follow several rounds and several people, and say the range.',
        'Distance paced on the floor is good to about ±10%; a scale drawing is better. A straight line between two positions is a floor, not the way walked.',
        'The pace assumed changes the minutes by about a quarter — it is said every time and can be timed on the floor.',
        'Walking is not all waste: some trips carry needed material. Nothing here reads where a person went — every place and every metre is typed from what was seen.',
      ],
      money,
      ...(picture ? { picture } : {}),
      closing: `${who ? `${who[0].toUpperCase()}${who.slice(1)} walks` : 'The round is'} ${metres(f.shiftM)} a shift — ${mins(f.minutes)}${f.longest ? `, ${pct(f.longest.share, 0)} of every round in “${f.longest.name}”` : ''}. Ask whether what is fetched could come to the person.`,
    };
  },
  examples: [
    {
      name: 'a packer’s round — the film store, the case store and the scale, 36 rounds a shift, with its money',
      source: 'knowledge/methods/lean/spaghetti.md, the worked shift; scripts/knowledge/cases-kaizen.py S and S2 (£25 an hour, a 480-minute shift, five shifts a week)',
      inputs: round(PACKER, { who: 'the packer', ...SHIFT }),
      expect: {
        verdict: '5.7 km a shift', tone: 'n',
        sentence: 'One round of the packer’s is 158 m over 6 legs; 36 rounds a shift is 5.7 km — 73 min of walking at 1.3 m/s (loaded or in a crowded hall), 15.2% of the 480-minute shift.',
        tiles: { 'A round': '158 m', 'Walked a shift': '5.7 km', 'Walking a shift': '73 min', 'Share of the shift': '15.2%', 'Labour a shift': '£30.38' },
        money: '72.9 min of walking a shift at £25.00 an hour is £30.38 a shift — £151.92 over 5 shifts a week.',
      },
    },
    {
      name: 'the same round with the film staged at the line — 6 m each way',
      source: 'scripts/knowledge/cases-kaizen.py S (86 m a round, 3,096 m a shift, 39.7 minutes — 33.2 saved, £13.85 a shift)',
      inputs: round(STAGED, { who: 'the packer', ...SHIFT }),
      expect: {
        verdict: '3.1 km a shift', tone: 'n',
        sentence: 'One round of the packer’s is 86 m over 6 legs; 36 rounds a shift is 3.1 km — 40 min of walking at 1.3 m/s (loaded or in a crowded hall), 8.3% of the 480-minute shift.',
        tiles: { 'A round': '86 m', 'Walked a shift': '3.1 km', 'Walking a shift': '40 min', 'Share of the shift': '8.3%', 'Labour a shift': '£16.54' },
        money: '39.7 min of walking a shift at £25.00 an hour is £16.54 a shift — £82.69 over 5 shifts a week.',
      },
    },
    {
      name: 'a round drawn from positions on the layout — straight lines, a pace timed at 1.5 m/s',
      source: 'scripts/knowledge/cases-kaizen.py S (legs 30, 30, 16, 16 m = 92 m; 10 rounds = 920 m; 920 ÷ 1.5 ÷ 60 = 10.2 min)',
      inputs: round(LAYOUT, { rounds: 10, pace: 'timed', paceMs: 1.5 }),
      expect: {
        verdict: '920 m a shift', tone: 'n',
        sentence: 'One round is 92 m over 4 legs; 10 rounds a shift is 920 m — 10 min of walking at 1.5 m/s (timed on the floor).',
        tiles: { 'A round': '92 m', 'Walked a shift': '920 m', 'Walking a shift': '10 min', 'Share of the shift': '—', 'Labour a shift': '—' },
        warns: ['Every leg is a straight line between positions'],
      },
    },
  ],
  refused: [
    { name: 'one place only', inputs: round([['Packing line']], { rounds: 36 }), blocked: 'A walk needs at least two places' },
    { name: 'no rounds', inputs: round(PACKER, { rounds: 0 }), blocked: '“How many times this round is walked in a shift” must be at least 0.001' },
    { name: 'no leg has a length', inputs: round([['Packing line'], ['Film store'], ['Packing line']], { rounds: 36 }), blocked: 'No leg has a length yet' },
  ],
  see: [{ key: 'process-flow', why: 'the product’s own path, step by step, with its moves and its waits' }],
};

export default def;
