/* STOPS ACROSS WORKSTATIONS — FC-241 (knowledge/specs/FC-241-workstation-stops.md).
 *
 * Many workstations in front of you at once (up to 30): each is named or numbered, each stopped time is added to its own total with one
 * press (the "Stopped" button on its minutes box times it), and each minute stopped is worth something — kilos, units, packs, trays, cases or
 * a word of your own — lost every minute (or every hour) the workstation is down. What was lost is minutes × the rate, worked per workstation,
 * summed, and ranked. The rate is the floor's own typed figure (its plate speed, its weigher's flow); nothing is read from a machine. Money
 * is optional: what a unit lost is worth, said as "if it cannot be made up". Stops and watched time are optional too; a missing one is named. */
import { niceScale } from '../../../lib/niceScale';
import { andList, duration, fmt, gbp, pct } from '../format';
import { project, stopsForPrecision } from '../stopsProjection';
import { clusterTest, parseLog, parseSpans } from '../stopsCluster';
import type { CalcBars, CalcDef, CalcMoney, CalcPicture, CalcResult, Field, Inputs, Problem, Values } from '../types';

export const MAX_STATIONS = 30;
const nn = (i: number): string => String(i + 1).padStart(2, '0');
/** A workstation's id for its pictures, videos and links: w01 … w30 (the list's `target`). */
export const wtarget = (i: number): string => `w${nn(i)}`;
export const wid = (i: number, part: 'name' | 'min' | 'stops' | 'rate'): string => `w${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');

const UNITS: Record<string, string> = { kg: 'kg', units: 'units', packs: 'packs', trays: 'trays', cases: 'cases' };
const unitOf = (v: Values): string => (v.unit === 'other' ? text(v, 'other') || 'units' : UNITS[v.unit as string] ?? 'units');
const perMin = (v: Values): number => (v.per === 'hour' ? 60 : 1);
const nameOf = (v: Values, i: number): string => text(v, wid(i, 'name')) || `Workstation ${i + 1}`;
const HORIZONS = [1, 2, 3, 4, 5, 8, 10, 11, 12, 24];
/** The hours the sample is carried forward over: a chip, the hours a week the line runs, or hours typed. */
const horizonHours = (v: Values): number | undefined => {
  const h = (v.horizon as string | undefined) ?? '8';
  const typed = num(v, 'customH');
  const n = typed !== undefined && typed > 0 ? typed : h === 'week' ? num(v, 'weekH') : h === 'custom' ? undefined : Number(h);
  return n !== undefined && n > 0 ? n : undefined;
};
const horizonSaid = (v: Values, h: number): string => (v.horizon === 'week' ? `a week (${fmt(h, 1)} hours)` : `${fmt(h, 1)} hour${h === 1 ? '' : 's'}`);
const confOf = (v: Values): number => Number((v.conf as string | undefined) ?? '95') / 100;
const count = (v: Values): number => Math.min(MAX_STATIONS, Math.max(0, Math.floor(num(v, 'n') ?? 0)));

const slotFields = (i: number): Field[] => {
  const k = i + 1;
  const shown = (v: Values): boolean => count(v) >= k;
  return [
    { id: wid(i, 'name'), label: `Workstation ${k} — its name`, kind: 'text', optional: true, showIf: shown, grid: i },
    { id: wid(i, 'min'), label: `Workstation ${k} — minutes stopped`, unit: 'min', kind: 'number', min: 0, optional: true, showIf: shown, grid: i,
      timer: { stops: wid(i, 'stops'), log: 'stoplog' } },
    { id: wid(i, 'stops'), label: `Workstation ${k} — number of stops`, unit: 'stops', kind: 'number', min: 0, integer: true, optional: true, showIf: shown, grid: i },
    { id: wid(i, 'rate'), label: `Workstation ${k} — lost for every minute stopped`, kind: 'number', min: 0, showIf: v => shown(v) && v.same === 'own', grid: i,
      dynamic: v => ({ unit: `${unitOf(v)} ${v.per === 'hour' ? 'an hour' : 'a minute'}` }) },
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
  answerTab: 'Results',
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
    { id: 'rate', label: 'How much is lost in every minute a workstation is stopped', unit: 'as chosen above', kind: 'number', min: 0, showIf: v => v.same !== 'own',
      dynamic: v => ({ label: `How many ${unitOf(v)} are lost in every ${v.per === 'hour' ? 'hour' : 'minute'} a workstation is stopped`, unit: `${unitOf(v)} ${v.per === 'hour' ? 'an hour' : 'a minute'}` }),
      help: 'What it would have made in that time — the speed of the workstation in the unit chosen. Without it the minutes stay minutes and no loss is worked out.' },
    ...Array.from({ length: MAX_STATIONS }, (_, i) => slotFields(i)).flat(),
    { id: 'watched', label: 'Time you have watched all of them', unit: 'minutes', kind: 'number', min: 0, optional: true, place: 'below', timer: { start: 'Start watching', stop: 'Pause watching', log: 'watchlog' },
      help: 'This is the sample. The longer you watch, the surer the carried-forward figure is. Press Start watching while you press the Stopped buttons, Pause when you leave: come back later, press it again, and the time adds on. Or type the minutes.' },
    { id: 'horizon', label: 'What would it be if it carries on for', kind: 'choice', default: '8', place: 'below',
      chosen: 'A shift of 8 hours until you pick another. The sample is carried forward in proportion to the time watched.',
      options: [...HORIZONS.map(h => ({ value: String(h), label: `${h} ${h === 1 ? 'hour' : 'hours'}` })), { value: 'week', label: 'A week' }] },
    { id: 'weekH', label: 'Hours the line runs in a week', unit: 'hours', kind: 'number', min: 0.000001, optional: true, place: 'below', showIf: v => v.horizon === 'week',
      help: 'Asked, never assumed: the days it runs × the hours a day.' },
    { id: 'customH', label: 'Or type any number of hours', unit: 'hours', kind: 'number', min: 0.000001, optional: true, place: 'below',
      help: 'Any number — 6, 36, 2000. When a number is here it is used instead of the button picked above; empty it to go back to the button.' },
    { id: 'conf', label: 'How sure to be', kind: 'choice', default: '95', place: 'below', compact: true,
      chosen: '95% until you pick another: the range is one we are that confident the true figure falls in.',
      options: [{ value: '90', label: '90%' }, { value: '95', label: '95%' }, { value: '99', label: '99%' }] },
    { id: 'stoplog', label: 'When each stop began', kind: 'text', optional: true, hidden: true },
    { id: 'watchlog', label: 'The stretches watched', kind: 'text', optional: true, hidden: true },
    { id: 'unitCost', label: 'What one lost unit is worth', unit: '£ a unit', kind: 'number', min: 0, optional: true, money: true,
      help: 'Optional: its margin or its cost. Said as “if it cannot be made up” — a unit lost on a constraint is lost for good; elsewhere the line may catch up.' },
  ],
  tileName: (v, i) => nameOf(v, i),
  tileTarget: wtarget,
  tileSays(v, i): string {
    const r = rows(v)[i];
    if (!r || r.min === 0) return 'not stopped';
    return `${fmt(r.min, 2)} min${r.stops ? ` · ${r.stops} stop${r.stops === 1 ? '' : 's'}` : ''} · ${fmt(r.lost, 2)} ${unitOf(v)} lost`;
  },
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
    /* part 6 — how often against how much (Rowland, 10 November: "I might capture a long loss, however, the frequency was twice … it's the
       frequency of the stops that matters as well"): the most frequent and the biggest loser, each stop's average length, said from the counts */
    const counted = stopped.filter(r => r.stops > 0);
    const often = [...counted].sort((a, b) => b.stops - a.stops || b.lost - a.lost || a.i - b.i)[0];
    const avg = (r: Row): number => r.min / r.stops;
    if (often && worst && worst.stops > 0) {
      if (often.i === worst.i) more.push(`${worst.name} both stopped most often (${fmt(worst.stops, 0)} stop${worst.stops === 1 ? '' : 's'}, ${fmt(avg(worst), 2)} min each on average) and lost the most.`);
      else {
        const pattern = avg(often) < avg(worst) / 2 ? ` ${often.name} stops often but briefly; ${worst.name}'s loss comes from fewer, longer stops — the two need different fixes (the frequent ones a cause that keeps coming back, the long ones how fast it is put right).` : '';
        more.push(`By how often: ${often.name} stopped most — ${fmt(often.stops, 0)} times, ${fmt(avg(often), 2)} min a stop on average, ${fmt(often.lost, 2)} ${u} lost. By how much: ${worst.name} lost the most from ${fmt(worst.stops, 0)} stop${worst.stops === 1 ? '' : 's'}, ${fmt(avg(worst), 2)} min a stop.${pattern}`);
      }
    }
    if (stopped.some(r => r.stops === 0)) more.push(`${andList(stopped.filter(r => r.stops === 0).map(r => r.name))} ${stopped.filter(r => r.stops === 0).length === 1 ? 'has' : 'have'} minutes typed but no stops counted, so how often cannot be said there.`);
    const quiet = rs.filter(r => r.min === 0);
    if (quiet.length && stopped.length) more.push(`${quiet.length === 1 ? `${quiet[0].name} has` : `${fmt(quiet.length, 0)} workstations have`} not stopped.`);

    /* part 2 — the sample carried forward, and how sure that is (spec Part 2) */
    const conf = confOf(v), H = horizonHours(v);
    const stopsMissing = rs.some(r => r.min > 0 && r.stops === 0);
    const cluster = watched && watched > 0 ? clusterTest(parseLog(v.stoplog), parseSpans(v.watchlog)) : undefined;
    const proj = watched && watched > 0 && H ? project({ watchedMin: watched, horizonMin: H * 60, stops, minutes, lost, conf, stopsMissing, ...(cluster?.clustered && cluster.phi ? { phi: cluster.phi } : {}) }) : undefined;
    const cpct = `${fmt(conf * 100, 0)}%`;
    if (share !== undefined) more.push(`They were stopped for ${pct(share)} of the ${duration((watched as number) / 60)} watched (${fmt(minutes, 2)} minutes of ${fmt((watched as number) * rs.length, 0)} workstation-minutes).`);
    if (!watched || watched <= 0) more.push('Give the time you have watched — type it, or press Start watching and Pause — to carry this forward and say how sure it is.');
    else if (!H) more.push(v.horizon === 'week' ? 'Give the hours the line runs in a week to carry the sample over a week.' : 'Give the hours to carry the sample forward over.');
    else if (proj && stops === 0 && minutes === 0 && proj.none) {
      more.push(`No stop has been seen in the ${duration(watched / 60)} watched. At ${cpct} confidence the rate could still be as high as ${fmt(proj.none.perHour, 2)} an hour (${fmt(proj.none.overHorizon, 1)} stops over ${horizonSaid(v, H as number)}); ${fmt(proj.none.ruleOutHours, 1)} hours of watching with none would rule out one an hour. A quiet watch speaks only for the time it was watched — stops come in bursts as well as singly.`);
    }
    else if (proj && !proj.range) more.push(`Carried on for ${horizonSaid(v, H as number)}: about ${fmt(proj.lost, 1)} ${u} lost — but no range can be given because ${proj.noRange}.`);
    else if (proj && proj.range && proj.need && proj.firm) {
      more.push(`Carried on for ${horizonSaid(v, H as number)}: about ${fmt(proj.lost, 1)} ${u} lost — between ${fmt(proj.range.lo, 1)} and ${fmt(proj.range.hi, 1)} ${u} at ${cpct} confidence — from ${fmt(stops, 0)} stop${stops === 1 ? '' : 's'} in ${duration(watched / 60)} of watching.`);
      const fair = stopsForPrecision(0.5, conf), firm = stopsForPrecision(0.25, conf);
      more.push(`How confidence grows: at ${cpct} it takes ${fmt(fair, 0)} stops to be Fair (within ±50%) and ${fmt(firm, 0)} to be Firm (within ±25%). You have ${fmt(stops, 0)}. A lower “how sure” needs fewer stops${cpct === '99%' ? `; at 95% Firm needs ${fmt(stopsForPrecision(0.25, 0.95), 0)}` : ''}.`);
      more.push(`The rate seen is ${fmt(proj.rate.perHour, 2)} stops an hour (${fmt(proj.rate.lo, 2)} to ${fmt(proj.rate.hi, 2)} at ${cpct}) from ${fmt(stops, 0)} in ${duration(watched / 60)}. Stops are random even when the rate is right: one stretch of ${horizonSaid(v, H as number)} could see ${fmt(proj.predict.lo, 0)} to ${fmt(proj.predict.hi, 0)} of them${proj.predict.loss ? ` — about ${fmt(proj.predict.loss.lo, 1)} to ${fmt(proj.predict.loss.hi, 1)} ${u}` : ''} (a prediction for one stretch, wider than the range on the average).`);
      more.push(`Confidence: ${proj.firm}. The range runs from ${fmt(proj.count.lo / stops, 2)}× to ${fmt(proj.count.hi / stops, 2)}× of what the sample says, because so few stops cannot pin the rate down. Its width rests on the ${fmt(stops, 0)} stop${stops === 1 ? '' : 's'} counted — more minutes with no more stops only lower the rate; they do not tighten the range. ${proj.need.watchMore > 0 ? `About ${fmt(proj.need.stops, 0)} stops — roughly ${duration(proj.need.watchMore / 60)} more watching at this rate — would bring it within ±25%.` : 'Enough stops are in for it to be within ±25%.'}`);
      if (cluster?.clustered && cluster.counts && cluster.phi != null && cluster.p != null) more.push(`The stops came in bursts, not evenly: in ${fmt(cluster.bins as number, 0)} equal parts of the watching they fell ${cluster.counts.join(' · ')} — ${fmt(cluster.phi, 1)} times the spread an even run would show (p ${fmt(cluster.p, 3)}). The range is widened ×${fmt(proj.widened ?? 1, 2)} to allow for it, and a short watch can miss a burst altogether.`);
      else if (cluster?.why) more.push(`Whether they come in bursts cannot be told yet: ${cluster.why}. The range assumes they arrive independently.`);
      else if (cluster?.counts && cluster.p != null) more.push(`No sign of bursts: in ${fmt(cluster.bins as number, 0)} equal parts of the watching they fell ${cluster.counts.join(' · ')} (p ${fmt(cluster.p, 2)}), as independent stops would. That says little with so few stops.`);
    }

    const cost = num(v, 'unitCost');
    const missing: string[] = [];
    let money: CalcMoney;
    if (cost !== undefined) {
      const m = lost * cost;
      money = {
        text: `${fmt(lost, 2)} ${u} lost at ${gbp(cost)} each is ${gbp(m)} if it cannot be made up.${worst ? ` ${worst.name} accounts for ${gbp(worst.lost * cost)}.` : ''}`,
        figures: [['Lost, if it cannot be made up', gbp(m)], ...(worst ? [[`${worst.name}`, gbp(worst.lost * cost)] as [string, string]] : []),
          ...(proj && H ? [[`If it carries on for ${horizonSaid(v, H)}`, `${gbp(proj.lost * cost)}${proj.range ? ` (${gbp(proj.range.lo * cost)} to ${gbp(proj.range.hi * cost)})` : ''}`] as [string, string]] : [])],
        missing,
      };
    } else {
      missing.push('Give what one lost unit is worth (its margin or its cost) to say the stops in money.');
      money = { missing };
    }

    /* part 6 — a bar a workstation, ranked by what it lost, its stops beside it: what each costs, never one running total */
    const unitCost = num(v, 'unitCost');
    const bars: CalcBars | undefined = ranked.length ? {
      title: 'What each workstation lost, and how often it stopped',
      caption: `Ranked by what was lost. The second bar is how many times it stopped${often ? ` — ${often.name} the most often` : ''}. A long bar of stops with a short loss is many brief stops; the other way round, a few long ones.`,
      a: `${u} lost`, ...(counted.length ? { b: 'stops' } : {}),
      rows: ranked.map(r => ({ label: r.name, a: r.lost, aText: `${fmt(r.lost, 2)} ${u}${unitCost !== undefined ? ` · ${gbp(r.lost * unitCost)}` : ''}`, ...(counted.length ? { b: r.stops, bText: r.stops ? `${fmt(r.stops, 0)} stop${r.stops === 1 ? '' : 's'} · ${fmt(avg(r), 2)} min each` : 'none counted' } : {}), note: `${fmt(r.min, 2)} min stopped` })),
    } : undefined;

    let picture: CalcPicture | undefined;
    if (!proj && watched && watched > 0 && lost > 0 && !H) {
      /* a week (or hours) picked with no hours given: the chart stays, over the time watched, and asks for the hours — never vanishes */
      const wh = watched / 60;
      const ys = niceScale(0, lost, 4), xs = niceScale(0, wh, 4);
      picture = {
        title: `${u[0].toUpperCase()}${u.slice(1)} lost so far`,
        caption: v.horizon === 'week' ? 'Type the hours the line runs in a week (the box under A week) to carry this forward over a week — until then the chart shows the time watched.' : 'Give the hours to carry this forward over — until then the chart shows the time watched.',
        x: { label: 'hours from the start of watching', min: 0, max: Math.max(xs.max, wh), ticks: xs.ticks, fmt: t => fmt(t, 1) },
        y: { label: `${u} lost`, min: 0, max: ys.max, ticks: ys.ticks, fmt: t => fmt(t, 0) },
        lines: [{ points: [[0, 0], [wh, lost]], mark: 'brand' }],
        verticals: [], horizontals: [],
        dots: [{ x: wh, y: lost, label: `watched: ${fmt(lost, 1)} ${u}` }],
      };
    }
    if (proj && H && watched) {
      const wh = watched / 60, xmax = Math.max(H, wh);
      const at = (x: number, f: number): number => lost * (x / wh) * f;
      const top = at(xmax, proj.range ? proj.count.hi / Math.max(stops, 1) : 1);
      const ys = niceScale(0, top, 4), xs = niceScale(0, xmax, 5);
      const ends = (f: number): [number, number][] => [[0, 0], [xmax, at(xmax, f)]];
      picture = {
        title: `${u[0].toUpperCase()}${u.slice(1)} lost if it carries on`,
        caption: `The solid line is what the ${duration(wh)} watched says, carried forward. ${proj.range ? `The dashed lines are the range we are ${cpct} confident of — ${proj.firm?.toLowerCase()} for this many stops; the more stops are watched, the closer they sit.` : `No range can be drawn yet: ${proj.noRange}.`}`,
        x: { label: 'hours from the start of watching', min: 0, max: Math.max(xs.max, xmax), ticks: xs.ticks.filter(t => t <= Math.max(xs.max, xmax)), fmt: t => fmt(t, 1) },
        y: { label: `${u} lost`, min: 0, max: ys.max, ticks: ys.ticks, fmt: t => fmt(t, 0) },
        lines: [
          { points: ends(1), mark: 'brand' },
          ...(proj.range ? [{ points: ends(proj.count.hi / stops), mark: 'muted' as const, dash: true }, { points: ends(proj.count.lo / stops), mark: 'muted' as const, dash: true }] : []),
        ],
        verticals: [],
        horizontals: [],
        dots: [{ x: wh, y: lost, label: `watched: ${fmt(lost, 1)} ${u}` }, ...(H !== wh ? [{ x: H, y: proj.lost, label: `${fmt(proj.lost, 0)} ${u}` }] : [])],
      };
    }

    const verdict = lost > 0 ? `${fmt(lost, 1)} ${u} lost` : `${fmt(minutes, 1)} minutes stopped`;
    return {
      verdict,
      tone: lost > 0 ? 'a' : 'n',
      sentence,
      ...(more.length ? { more } : {}),
      ...(picture ? { picture } : {}),
      ...(bars ? { bars } : {}),
      tiles: [
        { k: 'Lost', v: fmt(lost, 2), of: u, n: lost, better: 'lower', fmt: x => `${fmt(x, 2)} ${u}` },
        { k: 'Stopped', v: fmt(minutes, 2), of: 'minutes in all', n: minutes, better: 'lower', fmt: x => `${fmt(x, 2)} minutes` },
        { k: 'Stops', v: stops ? fmt(stops, 0) : '—', of: stops ? 'counted' : 'none counted', ...(stops ? { n: stops, better: 'lower' as const, counted: true } : {}) },
        worst ? { k: 'Worst', v: worst.name, of: `${fmt(worst.lost, 2)} ${u}${worstShare !== undefined ? ` — ${pct(worstShare)}` : ''}` } : { k: 'Worst', v: '—', of: 'none has stopped' },
        proj && H ? { k: 'If it goes on', v: fmt(proj.lost, 1), of: `${u} in ${horizonSaid(v, H)}`, n: proj.lost, better: 'lower', fmt: x => `${fmt(x, 1)} ${u}` } : { k: 'If it goes on', v: '—', of: watched ? (v.horizon === 'week' ? 'give the hours a week' : 'give the hours') : 'give the time watched' },
        proj?.range && proj.firm ? { k: 'Confidence', v: proj.firm, of: `${cpct} range ${fmt(proj.range.lo, 1)} to ${fmt(proj.range.hi, 1)}`, ...(proj.firm === 'Rough' ? { tone: 'a' as const } : {}) } : { k: 'Confidence', v: '—', of: proj ? 'no range yet' : 'give the time watched' },
      ],
      working: [
        { label: 'Each workstation', value: 'minutes stopped × the rate lost ÷ ' + (per === 'hour' ? '60' : '1'), note: 'summed over the workstations' },
        ...ranked.slice(0, 8).map(r => ({ label: r.name, value: `${fmt(r.min, 2)} min → ${fmt(r.lost, 3)} ${u}` + (r.stops ? ` · ${r.stops} stop${r.stops === 1 ? '' : 's'}` : '') })),
        ...(ranked.length > 8 ? [{ label: 'The rest', value: `${ranked.length - 8} more, in the totals` }] : []),
        { label: 'In all', value: `${fmt(minutes, 3)} min → ${fmt(lost, 3)} ${u}` },
        ...(proj && H ? [
          { label: 'Carried forward', value: `${fmt(H * 60, 0)} min ÷ ${fmt(watched as number, 2)} min = × ${fmt(proj.factor, 3)}`, note: `${fmt(lost, 2)} ${u} → ${fmt(proj.lost, 2)} ${u}` },
          ...(proj.range ? [
            { label: `Stops seen, ${cpct} range (exact Poisson)`, value: `${fmt(stops, 0)} → ${fmt(proj.count.lo, 3)} to ${fmt(proj.count.hi, 3)}`, note: 'Garwood interval; scaled onto the loss' },
            { label: 'Stops for ±25%', value: `${fmt(proj.need?.stops ?? 0, 0)} stops`, note: '⌈(z ÷ 0.25)²⌉' },
          ] : []),
        ] : []),
        ...(share !== undefined ? [{ label: 'Stopped share', value: `${fmt(minutes, 2)} ÷ (${fmt(watched as number, 2)} × ${rs.length}) = ${pct(share, 2)}` }] : []),
      ],
      caveats: [
        'The loss is minutes stopped times the rate you gave. It is the output that was not made while a workstation was down, not a measure of what it could have made — give the rate the workstation really runs at.',
        'A workstation that is not the constraint may catch up, so “lost” is a ceiling there; on the constraint it is gone for good. The money line says so.',
        'It counts only what was timed. Stops nobody pressed for, and slow running, are not in it.',
        'Carrying the sample forward assumes the time watched is typical of the time it is carried over — the same product, shift and crew. A calm morning does not describe a changeover afternoon.',
        'The range is the uncertainty in how many stops there will be, taking stops as random at a steady rate. The spread of stop lengths and of the rate lost is not in it, so it is narrower than the whole truth; stops that come in bunches make it wider still. The longer the watch, the better.',
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
        tiles: { Lost: '429', Stopped: '35.75', Stops: '6', Worst: 'Sealer', 'If it goes on': '1,716', Confidence: 'Rough' },
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
        tiles: { Lost: '330', Stopped: '21', Stops: '3', Worst: 'Labeller', 'If it goes on': '—', Confidence: '—' },
      },
    },
    {
      name: 'Nothing has stopped yet — said, not a zero dressed as a result',
      source: 'by hand: no minutes',
      inputs: session([['A'], ['B']], { unit: 'packs', same: 'same', per: 'min', rate: 90 }),
      expect: {
        verdict: '0 minutes stopped', tone: 'n',
        sentence: 'None of 2 workstations has stopped yet.',
        tiles: { Lost: '0', Stopped: '0', Stops: '—', Worst: '—', 'If it goes on': '—', Confidence: '—' },
        warns: ['No workstation has stopped yet'],
      },
    },
    {
      name: 'The same case carried forward one hour at 90% confidence — Garwood 2.613 to 11.842 on 6 stops',
      source: 'SciPy chi-square (scripts/knowledge/cases-stops-extrapolation.py): 214.5 kg, 93.4 to 423.4',
      inputs: session([['Filler', 8.5, 3], ['Wrapper'], ['Sealer', 22, 2], ['Packer', 5.25, 1]], { unit: 'kg', same: 'same', per: 'min', rate: 12, watched: 120, horizon: '1', conf: '90' }),
      expect: {
        verdict: '429 kg lost', tone: 'a',
        sentence: '3 of 4 workstations stopped for 35.75 minutes in all (6 stops), losing 429 kg at 12 kg every minute. Sealer lost the most — 264 kg, 61.5% of it.',
        tiles: { 'If it goes on': '214.5', Confidence: 'Rough' },
      },
    },
  ],
  refused: [
    { name: 'no workstations', inputs: { rate: 5 }, blocked: 'Give “How many workstations”' },
    { name: 'more than thirty', inputs: { n: 31, rate: 5 }, blocked: 'must be at most' },
    { name: 'no rate for the same-rate case', inputs: session([['A', 3]], { same: 'same' }), blocked: 'Give “How much is lost in every minute a workstation is stopped”' },
    { name: 'a workstation without its own rate when each has one', inputs: session([['A', 3]], { same: 'own' }), blocked: 'Give “Workstation 1 — lost for every minute stopped”' },
    { name: 'a negative time', inputs: session([['A', -2]], { same: 'same', rate: 5 }), blocked: 'must be at least' },
  ],
  see: [{ key: 'littles-law', why: 'what the stopped time does to the work waiting' }],
};

export default def;
