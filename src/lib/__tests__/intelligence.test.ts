/* THE INTELLIGENCE LAYER (docs/upgrade-plan.md F1) — the edge cases the brief
 * names: zero data, one event, a constraint that moves mid-period, a loss on a
 * non-constraint machine, overlapping events. */
import { describe, expect, it } from 'vitest';
import type { Observation } from '../../types';
import type { Capacity, Station } from '../capacity';
import { changesThisWeek, confidenceOf, constraintTrend, honest, lineConstraint, lineRates, onConstraint, percentile, stopMinutes, weekStart, WEEK } from '../intelligence';

const MIN = 60_000;
const NOW = new Date('2026-10-15T12:00:00').getTime();   // a Thursday
const W0 = weekStart(NOW);
let n = 0;
const stop = (asset: string, category: string, at: number, min: number, o: Partial<Observation> = {}): Observation => ({
  id: `o${++n}`, workspaceId: 'ws', category, asset, startedAt: at, endedAt: at + min * MIN, durationMs: min * MIN, timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at, ...o,
});
const day = (w: number, d: number, h = 8) => W0 - w * WEEK + d * 86_400_000 + h * 3_600_000;

describe('confidence', () => {
  it('zero data is none, and says so', () => {
    const c = confidenceOf([]);
    expect(c.level).toBe('none');
    expect(honest([], c, String)).toBe('not known yet');
  });
  it('one event is thin', () => {
    expect(confidenceOf([NOW], 'stop').says).toBe('thin — 1 day, 1 stop');
  });
  it('three weeks and sixty events is solid; a thin figure is a range', () => {
    const at = Array.from({ length: 63 }, (_, i) => NOW - i * 8 * 3_600_000);
    expect(confidenceOf(at).level).toBe('solid');
    const thin = confidenceOf([NOW, NOW - 86_400_000]);
    expect(honest([40, 60, 80], thin, x => x.toFixed(0))).toBe('48–72');
  });
  it('the percentile interpolates', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.2)).toBeCloseTo(18);
    expect(percentile([7], 0.2)).toBe(7);
  });
});

describe('stops counted once', () => {
  it('overlapping stops on one machine count the time they cover together', () => {
    const a = stop('Basketer', 'Jam', day(0, 1), 20), b = stop('Basketer', 'Jam', day(0, 1) + 10 * MIN, 20);
    expect(stopMinutes([a, b])).toBeCloseTo(30);
  });
  it('two machines down at once both count', () => {
    expect(stopMinutes([stop('Basketer', 'Jam', day(0, 1), 20), stop('Bagger', 'Film', day(0, 1), 20)])).toBeCloseTo(40);
  });
  it('a typed stop runs from its start for its length; deleted and instant stops add nothing', () => {
    const typed = stop('Bagger', 'Film', day(0, 1), 15, { endedAt: undefined, timing: 'typed' });
    expect(stopMinutes([typed, stop('Bagger', 'x', day(0, 2), 9, { deletedAt: 1 }), stop('Bagger', 'y', day(0, 2), 0)])).toBeCloseTo(15);
  });
});

describe('what changed this week', () => {
  const usual = [1, 2, 3, 4].flatMap(w => [stop('Basketer', 'Misfeed', day(w, 1), 60), stop('Bagger', 'Film splice', day(w, 2), 40)]);
  it('a reason up by half again and 30 minutes is said; one within its usual is not', () => {
    const now = [stop('Basketer', 'Misfeed', day(0, 1), 70), stop('Basketer', 'Misfeed', day(0, 2), 70), stop('Bagger', 'Film splice', day(0, 2), 45)];
    const c = changesThisWeek([...usual, ...now], NOW);
    expect(c.map(x => [x.key, x.kind])).toEqual([['Misfeed', 'up']]);
    expect(c[0].says).toBe('Misfeed: 140 min this week, about 60 min a week before — up 80 min.');
    expect(c[0].ids).toHaveLength(2);
  });
  it('a reason never seen before, past 30 minutes, is new; by machine too', () => {
    const c = changesThisWeek([...usual, stop('Labeller', 'Label web break', day(0, 2), 45)], NOW, 'machine');
    expect(c.find(x => x.key === 'Labeller')?.kind).toBe('new');
  });
  it('with under two weeks before, nothing is said — too little to call a change', () => {
    expect(changesThisWeek([stop('Basketer', 'Misfeed', day(1, 1), 10), stop('Basketer', 'Misfeed', day(0, 1), 300)], NOW)).toEqual([]);
  });
  it('zero data: no changes', () => { expect(changesThisWeek([], NOW)).toEqual([]); });
});

const st = (name: string, rate: number, x: Partial<Station> = {}): Station => ({ id: name, name, kind: 'machine', unit: 'bags', contains: 1, rate, ratePer: 'min', crew: 1, source: 'plate', ...x });
const cap = (stations: Station[]): Capacity => ({ stations });

describe('the constraint and the mirage', () => {
  const products = [
    { product: 'Maris Piper 2kg', capacity: cap([st('Bagger', 70), st('Basketer', 50), st('Palletiser', 90)]) },
    { product: 'Rooster 1kg', capacity: cap([st('Bagger', 70), st('Basketer', 55), st('Palletiser', 90)]) },
    { product: 'Tesco Express', capacity: cap([st('Bagger', 40), st('Basketer', 80)]) },
  ];
  it('the line’s constraint holds the most products; the others said', () => {
    const c = lineConstraint(products)!;
    expect(c.name).toBe('Basketer');
    expect(c.products).toEqual(['Maris Piper 2kg', 'Rooster 1kg']);
    expect(c.others).toEqual([{ name: 'Bagger', products: ['Tesco Express'] }]);
  });
  it('a loss on the constraint costs output; off it, the mirage — and where the prize is', () => {
    const c = lineConstraint(products);
    expect(onConstraint('basketer ', c).on).toBe(true);
    const off = onConstraint('Palletiser', c);
    expect(off.on).toBe(false);
    expect(off.says).toBe('Not the constraint — fixing it will not make more on its own: the line is held at the Basketer. The prize is there.');
    expect(onConstraint('Bagger', c).says).toMatch(/constraint on Tesco Express/);
  });
  it('no capacity worked out: not known, and said what to do', () => {
    expect(onConstraint('Bagger', lineConstraint([])).on).toBeUndefined();
  });
  it('a constraint that moves mid-period is said, against the one Line capacity names', () => {
    const obs = [5, 4, 3, 2, 1].flatMap(w => [stop('Basketer', 'Misfeed', day(w, 1), 90), stop('Bagger', 'Film', day(w, 2), 20)])
      .concat([stop('Bagger', 'Film', day(0, 1), 200), stop('Basketer', 'Misfeed', day(0, 2), 30)]);
    const t = constraintTrend(obs, NOW, 6, 'Basketer');
    expect(t.usual).toBe('Basketer');
    expect(t.moved).toBe(true);
    expect(t.says).toMatch(/^The losses moved: this week the Bagger lost the most \(200 min\); in 5 of 6 weeks it was the Basketer\.$/);
  });
});

describe('what the line can make', () => {
  const count = (id: string, d: number, made: number, plannedMin = 450, ratePerMin = 60) => ({ id, count: { from: day(1, d, 6), to: day(1, d, 14), plannedMin, made, ratePerMin } });
  it('none counted: nothing claimed', () => {
    const r = lineRates([]);
    expect(r.demonstrated).toBeUndefined();
    expect(r.says).toMatch(/^No shift counted yet/);
  });
  it('one shift: its rate, said too few to plan on', () => {
    const r = lineRates([count('a', 1, 22_500)]);
    expect(r.demonstrated).toBeCloseTo(50);
    expect(r.plannable).toBeUndefined();
    expect(r.confidence.level).toBe('thin');
  });
  it('five shifts or more: demonstrated the median, plannable what four in five beat, against the ideal', () => {
    const r = lineRates([count('a', 0, 18_000), count('b', 1, 20_250), count('c', 2, 22_500), count('d', 3, 24_750), count('e', 4, 27_000)], 'bags');
    expect(r.theoretical).toBe(60);
    expect(r.demonstrated).toBeCloseTo(50);
    expect(r.plannable).toBeCloseTo(44);
    expect(r.ofIdeal).toBeCloseTo(50 / 60);
    expect(r.says).toBe('The line proved 50 bags/min on a typical shift (83% of the 60 bags/min ideal); plan on 44 bags/min — four shifts in five beat it.');
  });
});

import { leversOf, periodWaterfall } from '../intelligence';
import type { LossFigures } from '../ie/losses';

describe('recovery levers — the mirage kept', () => {
  const figs = (bars: Partial<LossFigures['bars'][number]>[]): LossFigures => ({ enough: true, missing: [], plannedMin: 450, rate: 60, made: 21_000, rejects: 0, split: true, logged: 0, stopsN: 0, stopsMin: 0, byCause: [], changeoverMin: 0, changeoverN: 0,
    bars: bars.map(b => ({ key: `cause:${b.label}`, kind: 'cause', label: 'x', min: 0, bone: 'Machine', grade: 'measured', ...b })) } as unknown as LossFigures);
  const constraint = { name: 'Basketer', products: ['A'], others: [] };
  const fall = periodWaterfall([
    { id: 's1', figures: figs([{ label: 'Misfeed', min: 40, asset: 'Basketer', contribution: 120 }, { label: 'Film splice', min: 30, asset: 'Bagger', contribution: 90 }]) },
    { id: 's2', figures: figs([{ label: 'Misfeed', min: 20, asset: 'Basketer', contribution: 60 }, { label: 'Film splice', min: 30, asset: 'Bagger', contribution: 90 }]) },
  ], constraint);
  it('the period sums its shifts, each band knowing the constraint', () => {
    expect(fall.bands.map(b => [b.label, b.min, b.onConstraint])).toEqual([['Misfeed', 60, true], ['Film splice', 60, false]]);
  });
  it('on the constraint: minutes back become packs at the ideal speed, and pounds', () => {
    const l = leversOf(fall, 60, { 'cause:Misfeed': 50 }, 10, 'bags');
    const m = l.rows.find(r => r.label === 'Misfeed')!;
    expect(m.back).toBeCloseTo(15);
    expect(m.packs).toBeCloseTo(900);
    expect(m.pounds).toBeCloseTo(45);
    expect(l.perWeek?.packs).toBeCloseTo(9000);
  });
  it('off the constraint: minutes back, not one more pack — and said so', () => {
    const l = leversOf(fall, 60, { 'cause:Film splice': 100 }, 10, 'bags');
    const f = l.rows.find(r => r.label === 'Film splice')!;
    expect(f.packs).toBe(0);
    expect(f.pounds).toBe(0);
    expect(l.says).toMatch(/^Every loss chosen is off the constraint — 30 min a shift back and not one more bag\. The prize is at the constraint\.$/);
  });
  it('no running days known: a shift only, never a guessed week', () => {
    const l = leversOf(fall, 60, { 'cause:Misfeed': 100 }, undefined);
    expect(l.perWeek).toBeUndefined();
    expect(l.says).toMatch(/a week once the line’s running days are known/);
  });
});

import { loadVsDemand, parseDemand } from '../intelligence';

describe('load against demand', () => {
  it('fits: hours needed at the plannable share of each speed, against the week the line runs', () => {
    const r = loadVsDemand([{ product: 'A', demand: 60_000, ratePerMin: 100 }, { product: 'B', demand: 24_000, ratePerMin: 50 }], 0.8, 40 * 60, 0.05, 'bags');
    expect(r.neededH).toBeCloseTo(60_000 / 80 / 60 + 24_000 / 40 / 60);
    expect(r.headroomH).toBeCloseTo(40 - 22.5);
    expect(r.says).toMatch(/^It fits: the orders need 22\.5 h of the 40 h/);
  });
  it('over: hours over, packs short and the contribution at risk', () => {
    const r = loadVsDemand([{ product: 'A', demand: 300_000, ratePerMin: 100 }], 0.8, 40 * 60, 0.05, 'bags');
    expect(r.headroomH).toBeCloseTo(40 - 62.5);
    expect(r.headroomPacks).toBeCloseTo(-22.5 * 4800);
    expect(r.atRisk).toBeCloseTo(22.5 * 4800 * 0.05);
    expect(r.says).toMatch(/^It does not fit/);
  });
  it('the week not known: the hours needed, and where to say how the line runs', () => {
    expect(loadVsDemand([{ product: 'A', demand: 1000, ratePerMin: 10 }], undefined, undefined).says).toMatch(/hours the line has are not known/);
  });
  it('a pasted sheet matched to the products by name', () => {
    expect(parseDemand('Maris Piper 2kg, 12,000\nunknown,5\n  tesco express 1.25 kg\t4000', ['Maris Piper 2kg', 'Tesco Express 1.25 kg']))
      .toEqual([{ product: 'Maris Piper 2kg', demand: 12000 }, { product: 'Tesco Express 1.25 kg', demand: 4000 }]);
  });
});

import { askLine, type LineFacts } from '../intelligence';

describe('ask — answered from the functions, no AI', () => {
  const facts = (headroomH?: number): LineFacts => ({
    line: 'Line 3', unit: 'bags',
    rates: { shifts: [], plannable: 50, demonstrated: 55, theoretical: 70, confidence: confidenceOf([NOW], 'shift'), says: 'The line proved 55 bags/min.' },
    fall: { shifts: 6, plannedMin: 2700, goodMin: 2200, lostMin: 500, labour: 0, contribution: 0, hasMoney: false, says: '6 shifts counted.',
      bands: [{ key: 'cause:Film', kind: 'cause', label: 'Film splice', min: 220, stops: 30, asset: 'Bagger', countIds: [], onConstraint: false, says: 'Not the constraint — …' }] },
    constraint: { name: 'Basketer', products: ['A'], others: [] }, trend: { weeks: [], moved: false, says: '' }, changes: [],
    load: { rows: [], neededH: 30, ...(headroomH != null ? { headroomH } : {}), says: 'It fits.' }, unitsPer: { pallets: 360 },
  });
  it('can it take 40 more pallets on Thursday — pallets turned into bags, hours at the plannable rate, against the headroom', () => {
    const a = askLine('Can Line 3 take another 40 pallets on Thursday?', facts(10));
    expect(a.matched).toBe(true);
    expect(a.text).toMatch(/^Yes — 40 pallets take about 4\.8 h; next week has 10 h spare/);
    expect(a.used[0]).toBe('40 pallets = 14,400 bags');
  });
  it('no — and what it would take', () => {
    expect(askLine('could we fit 100 more pallets', facts(2)).text).toMatch(/^No — 100 pallets take about 12 h; next week has 2 h spare\. It would need 10 h more/);
  });
  it('the biggest loss carries the mirage when it is off the constraint', () => {
    expect(askLine('what is the biggest loss?', facts()).text).toMatch(/^Film splice on the Bagger: 220 min over 6 counted shifts\. But it is not the constraint/);
  });
  it('a unit the line does not count in is said, not guessed', () => {
    expect(askLine('can it take 5 more cases', facts(10)).text).toMatch(/doesn’t count in cases/);
  });
  it('anything else is handed on', () => { expect(askLine('who is on nights?', facts()).matched).toBe(false); });
});
