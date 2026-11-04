/* STOPS ACROSS WORKSTATIONS — FC-241 (knowledge/specs/FC-241-workstation-stops.md).
 *
 * Many workstations in front of you at once (up to 30): each is named or numbered, each stopped time is added to its own total with one
 * press (the "Stopped" button on its minutes box times it), and each minute stopped is worth something — kilos, units, packs, trays, cases or
 * a word of your own — lost every minute (or every hour) the workstation is down. What was lost is minutes × the rate, worked per workstation,
 * summed, and ranked. The rate is the floor's own typed figure (its plate speed, its weigher's flow); nothing is read from a machine. Money
 * is optional: what a unit lost is worth, said as "if it cannot be made up". Stops and watched time are optional too; a missing one is named. */
import { andList, fmt, gbp, pct } from '../format';
import type { CalcDef, CalcMoney, CalcResult, Field, Inputs, Problem, Values } from '../types';

export const MAX_STATIONS = 30;
const nn = (i: number): string => String(i + 1).padStart(2, '0');
export const wid = (i: number, part: 'name' | 'min' | 'stops' | 'rate'): string => `w${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');

const UNITS: Record<string, string> = { kg: 'kg', units: 'units', packs: 'packs', trays: 'trays', cases: 'cases' };
const unitOf = (v: Values): string => (v.unit === 'other' ? text(v, 'other') || 'units' : UNITS[v.unit as string] ?? 'units');
const perMin = (v: Values): number => (v.per === 'hour' ? 60 : 1);
const nameOf = (v: Values, i: number): string => text(v, wid(i, 'name')) || `Workstation ${i + 1}`;
const count = (v: Values): number => Math.min(MAX_STATIONS, Math.max(0, Math.floor(num(v, 'n') ?? 0)));

const slotFields = (i: number): Field[] => {
  const k = i + 1;
  const shown = (v: Values): boolean => count(v) >= k;
  return [
    { id: wid(i, 'name'), label: `Workstation ${k} — its name`, kind: 'text', optional: true, showIf: shown,
      ...(i === 0 ? { help: 'Its name on the floor, or leave it and it is called Workstation 1.' } : {}) },
    { id: wid(i, 'min'), label: `Workstation ${k} — minutes stopped`, unit: 'minutes', kind: 'number', min: 0, optional: true, showIf: shown,
      timer: { stops: wid(i, 'stops') },
      ...(i === 0 ? { help: 'Press Stopped when it stops and Running again when it restarts: the time is added here, and one stop is counted. Or type the minutes. Blank means it has not stopped.' } : {}) },
    { id: wid(i, 'stops'), label: `Workstation ${k} — number of stops`, kind: 'number', min: 0, integer: true, optional: true, showIf: shown },
    { id: wid(i, 'rate'), label: `Workstation ${k} — lost for every minute stopped`, kind: 'number', min: 0, showIf: v => shown(v) && v.same === 'own',
      ...(i === 0 ? { help: 'In the unit chosen above, for the period chosen above.' } : {}) },
  ];
};

interface Row { i: number; name: string; min: number; stops: number; lost: number }

const rows = (v: Values): Row[] => {
  const out: Row[] = [];
  const same = num(v, 'rate') ?? 0;
  for (let i = 0; i < count(v); i++) {
    const r = v.same === 'own' ? num(v, wid(i, 'rate')) ?? 0 : same;
    const min = num(v, wid(i, 'min')) ?? 0;
    out.push({ i, name: nameOf(v, i), min, stops: num(v, wid(i, 'stops')) ?? 0, lost: min * r / perMin(v) });
  }
  return out;
};

/** A session as the boxes hold it, from rows of [name, minutes, stops, own rate]. */
const session = (r: [string, number?, number?, number?][], more: Inputs): Inputs => {
  const out: Inputs = { n: r.length };
  r.forEach(([name, min, stops, rate], i) => {
    if (name) out[wid(i, 'name')] = name;
    if (min !== undefined) out[wid(i, 'min')] = min;
    if (stops !== undefined) out[wid(i, 'stops')] = stops;
    if (rate !== undefined) out[wid(i, 'rate')] = rate;
  });
  return { ...out, ...more };
};

const def: CalcDef = {
  key: 'workstation-stops',
  fc: 'FC-241',
  title: 'Stops across workstations',
  says: 'Time every stop on up to 30 workstations and say what each minute cost — kilos, units or packs',
  question: 'Which workstation is losing the most, and how much has the stopped time cost in what it should have made?',
  group: 'Stops and losses',
  inputs: [
    { id: 'n', label: 'How many workstations', kind: 'number', min: 1, max: MAX_STATIONS, integer: true,
      help: 'Up to 30. The boxes for each appear below.' },
    { id: 'unit', label: 'What is lost', kind: 'choice', default: 'units',
      chosen: 'Units until you say otherwise — change it to the unit the floor counts in. Changing it only changes the word; the rate you give is in that unit.',
      options: [{ value: 'kg', label: 'Kilos' }, { value: 'units', label: 'Units' }, { value: 'packs', label: 'Packs' }, { value: 'trays', label: 'Trays' }, { value: 'cases', label: 'Cases' }, { value: 'other', label: 'Another' }] },
    { id: 'other', label: 'The unit’s name', kind: 'text', showIf: v => v.unit === 'other', optional: true, help: 'Pieces, litres, bags — it only names the sentence.' },
    { id: 'per', label: 'The rate is given', kind: 'choice', default: 'min',
      chosen: 'A minute until you say otherwise.',
      options: [{ value: 'min', label: 'Every minute' }, { value: 'hour', label: 'Every hour' }] },
    { id: 'same', label: 'The rate lost', kind: 'choice', default: 'same',
      chosen: 'The same for every workstation until you say each has its own.',
      options: [{ value: 'same', label: 'The same for all', help: 'one figure for every workstation' }, { value: 'own', label: 'Each its own', help: 'a figure under each workstation' }] },
    { id: 'rate', label: 'Lost while it is stopped', unit: 'as chosen above', kind: 'number', min: 0, showIf: v => v.same !== 'own',
      help: 'How much it would have made in that time: the line’s speed at that workstation, in the unit chosen — kilos a minute, units a minute.' },
    ...Array.from({ length: MAX_STATIONS }, (_, i) => slotFields(i)).flat(),
    { id: 'watched', label: 'Watched for', unit: 'minutes', kind: 'number', min: 0, optional: true,
      help: 'Optional: how long you watched the workstations in all. It gives the share of that time they were stopped.' },
    { id: 'unitCost', label: 'What one lost unit is worth', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true,
      help: 'Optional: its margin or its cost. Said as “if it cannot be made up” — a unit lost on a constraint is lost for good; elsewhere the line may catch up.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const rs = rows(v);
    if (rs.length && rs.every(r => r.min === 0)) out.push({ field: wid(0, 'min'), say: 'No workstation has stopped yet — press Stopped on one or type its minutes.' });
    for (const r of rs) if (r.stops > 0 && r.min === 0) out.push({ field: wid(r.i, 'min'), say: `${r.name} has ${r.stops} stop${r.stops === 1 ? '' : 's'} counted but no minutes.` });
    const w = num(v, 'watched');
    const total = rs.reduce((a, r) => a + r.min, 0);
    if (w !== undefined && w > 0 && rs.length && total > w * rs.length) out.push({ field: 'watched', say: 'The stopped minutes add up to more than every workstation could have been watched for — check the watched time.' });
    return out;
  },
  compute(v): CalcResult {
    const u = unitOf(v);
    const rs = rows(v);
    const stopped = rs.filter(r => r.min > 0);
    const minutes = rs.reduce((a, r) => a + r.min, 0);
    const stops = rs.reduce((a, r) => a + r.stops, 0);
    const lost = rs.reduce((a, r) => a + r.lost, 0);
    const ranked = [...stopped].sort((a, b) => b.lost - a.lost || b.min - a.min || a.i - b.i);
    const worst = ranked[0];
    const worstShare = worst && lost > 0 ? worst.lost / lost : undefined;
    const watched = num(v, 'watched');
    const share = watched && watched > 0 && rs.length ? minutes / (watched * rs.length) : undefined;
    const per = v.per === 'hour' ? 'hour' : 'minute';
    const rateWords = v.same === 'own' ? 'each at its own rate' : `at ${fmt(num(v, 'rate') ?? 0, 3)} ${u} every ${per}`;

    const sentence = lost > 0 && worst
      ? `${fmt(stopped.length, 0)} of ${fmt(rs.length, 0)} workstations stopped for ${fmt(minutes, 2)} minutes in all${stops ? ` (${fmt(stops, 0)} stop${stops === 1 ? '' : 's'})` : ''}, losing ${fmt(lost, 2)} ${u} ${rateWords}. ${worst.name} lost the most — ${fmt(worst.lost, 2)} ${u}${worstShare !== undefined ? `, ${pct(worstShare)} of it` : ''}.`
      : stopped.length === 0
        ? `None of ${fmt(rs.length, 0)} workstations has stopped yet.`
        : `${fmt(stopped.length, 0)} of ${fmt(rs.length, 0)} workstations stopped for ${fmt(minutes, 2)} minutes in all, but the rate lost is nothing, so nothing is lost.`;

    const more: string[] = [];
    if (ranked.length > 1) more.push(`In order of what was lost: ${andList(ranked.slice(0, 5).map(r => `${r.name} ${fmt(r.lost, 2)} ${u}`))}${ranked.length > 5 ? ` and ${ranked.length - 5} more` : ''}.`);
    const quiet = rs.filter(r => r.min === 0);
    if (quiet.length && stopped.length) more.push(`${quiet.length === 1 ? `${quiet[0].name} has` : `${fmt(quiet.length, 0)} workstations have`} not stopped.`);

    const cost = num(v, 'unitCost');
    const missing: string[] = [];
    let money: CalcMoney;
    if (cost !== undefined) {
      const m = lost * cost;
      money = {
        text: `${fmt(lost, 2)} ${u} lost at ${gbp(cost)} each is ${gbp(m)} if it cannot be made up.${worst ? ` ${worst.name} accounts for ${gbp(worst.lost * cost)}.` : ''}`,
        figures: [['Lost, if it cannot be made up', gbp(m)], ...(worst ? [[`${worst.name}`, gbp(worst.lost * cost)] as [string, string]] : [])],
        missing,
      };
    } else {
      missing.push('Give what one lost unit is worth (its margin or its cost) to say the stops in money.');
      money = { missing };
    }

    const verdict = lost > 0 ? `${fmt(lost, 1)} ${u} lost` : `${fmt(minutes, 1)} minutes stopped`;
    return {
      verdict,
      tone: lost > 0 ? 'a' : 'n',
      sentence,
      ...(more.length ? { more } : {}),
      tiles: [
        { k: 'Lost', v: fmt(lost, 2), of: u, n: lost, better: 'lower', fmt: x => `${fmt(x, 2)} ${u}` },
        { k: 'Stopped', v: fmt(minutes, 2), of: 'minutes in all', n: minutes, better: 'lower', fmt: x => `${fmt(x, 2)} minutes` },
        { k: 'Stops', v: stops ? fmt(stops, 0) : '—', of: stops ? 'counted' : 'none counted', ...(stops ? { n: stops, better: 'lower' as const, counted: true } : {}) },
        worst ? { k: 'Worst', v: worst.name, of: `${fmt(worst.lost, 2)} ${u}${worstShare !== undefined ? ` — ${pct(worstShare)}` : ''}` } : { k: 'Worst', v: '—', of: 'none has stopped' },
        share !== undefined ? { k: 'Stopped share', v: pct(share), of: `of ${fmt(watched as number, 1)} minutes × ${fmt(rs.length, 0)}`, n: share, better: 'lower', fmt: x => pct(x) } : { k: 'Stopped share', v: '—', of: 'give the watched time' },
      ],
      working: [
        { label: 'Each workstation', value: 'minutes stopped × the rate lost ÷ ' + (per === 'hour' ? '60' : '1'), note: 'summed over the workstations' },
        ...ranked.slice(0, 8).map(r => ({ label: r.name, value: `${fmt(r.min, 2)} min → ${fmt(r.lost, 3)} ${u}` + (r.stops ? ` · ${r.stops} stop${r.stops === 1 ? '' : 's'}` : '') })),
        ...(ranked.length > 8 ? [{ label: 'The rest', value: `${ranked.length - 8} more, in the totals` }] : []),
        { label: 'In all', value: `${fmt(minutes, 3)} min → ${fmt(lost, 3)} ${u}` },
        ...(share !== undefined ? [{ label: 'Stopped share', value: `${fmt(minutes, 2)} ÷ (${fmt(watched as number, 2)} × ${rs.length}) = ${pct(share, 2)}` }] : []),
      ],
      caveats: [
        'The loss is minutes stopped times the rate you gave. It is the output that was not made while a workstation was down, not a measure of what it could have made — give the rate the workstation really runs at.',
        'A workstation that is not the constraint may catch up, so “lost” is a ceiling there; on the constraint it is gone for good. The money line says so.',
        'It counts only what was timed. Stops nobody pressed for, and slow running, are not in it.',
        'Timing runs on this device only: a stop left running when the page is closed is picked up again on reopening, but is not shared with another device until it is stopped.',
      ],
      money,
      closing: lost > 0 && worst
        ? `${worst.name} is where the ${u} went — ${fmt(worst.lost, 2)} of ${fmt(lost, 2)}. Work the biggest stop there first; time it again after the fix and compare.`
        : 'Press Stopped on a workstation when it stops, and Running again when it restarts — the minutes and the loss are worked out as you go.',
    };
  },
  examples: [
    {
      name: 'Four workstations, one rate of 12 kg a minute, watched for 2 hours, with the money',
      source: 'by hand: 8.5 × 12 = 102; 22 × 12 = 264; 5.25 × 12 = 63; 429 kg; 35.75 min of 480 = 7.4%; 429 × 2.10 = £900.90',
      inputs: session([['Filler', 8.5, 3], ['Wrapper'], ['Sealer', 22, 2], ['Packer', 5.25, 1]], { unit: 'kg', same: 'same', per: 'min', rate: 12, watched: 120, unitCost: 2.1 }),
      expect: {
        verdict: '429 kg lost', tone: 'a',
        sentence: '3 of 4 workstations stopped for 35.75 minutes in all (6 stops), losing 429 kg at 12 kg every minute. Sealer lost the most — 264 kg, 61.5% of it.',
        tiles: { Lost: '429', Stopped: '35.75', Stops: '6', Worst: 'Sealer', 'Stopped share': '7.4%' },
        money: '429 kg lost at £2.10 each is £900.90 if it cannot be made up. Sealer accounts for £554.40.',
      },
    },
    {
      name: 'Each workstation its own rate, in units an hour: 15 min at 600 an hour and 6 min at 1,800',
      source: 'by hand: 15 × 600 ÷ 60 = 150; 6 × 1,800 ÷ 60 = 180; 330 units',
      inputs: session([['Bagger', 15, 2, 600], ['Labeller', 6, 1, 1800]], { unit: 'units', same: 'own', per: 'hour' }),
      expect: {
        verdict: '330 units lost', tone: 'a',
        sentence: '2 of 2 workstations stopped for 21 minutes in all (3 stops), losing 330 units each at its own rate. Labeller lost the most — 180 units, 54.5% of it.',
        tiles: { Lost: '330', Stopped: '21', Stops: '3', Worst: 'Labeller', 'Stopped share': '—' },
      },
    },
    {
      name: 'Nothing has stopped yet — said, not a zero dressed as a result',
      source: 'by hand: no minutes',
      inputs: session([['A'], ['B']], { unit: 'packs', same: 'same', per: 'min', rate: 90 }),
      expect: {
        verdict: '0 minutes stopped', tone: 'n',
        sentence: 'None of 2 workstations has stopped yet.',
        tiles: { Lost: '0', Stopped: '0', Stops: '—', Worst: '—', 'Stopped share': '—' },
        warns: ['No workstation has stopped yet'],
      },
    },
  ],
  refused: [
    { name: 'no workstations', inputs: { rate: 5 }, blocked: 'Give “How many workstations”' },
    { name: 'more than thirty', inputs: { n: 31, rate: 5 }, blocked: 'must be at most' },
    { name: 'no rate for the same-rate case', inputs: session([['A', 3]], { same: 'same' }), blocked: 'Give “Lost while it is stopped”' },
    { name: 'a workstation without its own rate when each has one', inputs: session([['A', 3]], { same: 'own' }), blocked: 'Give “Workstation 1 — lost for every minute stopped”' },
    { name: 'a negative time', inputs: session([['A', -2]], { same: 'same', rate: 5 }), blocked: 'must be at least' },
  ],
  see: [{ key: 'littles-law', why: 'what the stopped time does to the work waiting' }],
};

export default def;
