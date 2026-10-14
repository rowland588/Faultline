/* PEOPLE, AS THE SCIENCE COUNTS THEM (docs/CAPACITY.md §1; Rowland, 14
 * October: "we need to bring in science when it comes to humans ... a human
 * having to keep up with machines ... research that science and build it
 * in"; and "I need to be able to determine the speed of the human doing
 * something" — he was dividing 70 a minute by hand to type pallets).
 *
 * Worked by hand, on his line:
 *   Bagger      70 units a minute, on the plate
 *   Wrapper     a person, baskets of 10, a basket every 6 s (typed as the
 *               pace to plan on — no allowance)
 *   Palletiser  a person, pallets of 36 baskets, TIMED PER BASKET: a basket
 *               every 6 s, the ILO's 9% rest added
 *
 *   1 pallet = 36 baskets = 360 units
 *   reaching the palletiser: 70 ÷ 10 = 7 baskets a minute — one every
 *     8.57 s; a full pallet every 360 ÷ 70 min = 308.6 s = 5 min 9 s
 *   their pace: 6 s × 1.09 = 6.54 s a basket = 9.17 baskets a minute =
 *     0.2548 pallets a minute — they keep up, 8.57 − 6.54 = 2.03 s to spare
 *   loaded to 7 ÷ 9.17 = 76% — under the 90% a person fed straight sustains
 *
 *   A packer fed straight by the bagger, a basket every 7.8 s + 9% = 8.50 s
 *   → 7.06 baskets a minute against 7: keeps up, loaded to 99% — a person
 *   cannot match a machine piece for piece: said, unless something can
 *   collect between them. */
import { describe, expect, it } from 'vitest';
import { REST_ALLOWANCE_PCT, allowanceOf, analyse, chainWords, cycleWords, everyWords, paceSays, perMinute, planPerMinute, rateAsTime, stationDetail, typedSpeedWords, type Station } from '../capacity';
import { speedWords } from '../capacityPaper';

const bagger: Station = { id: 'b', name: 'Bagger', kind: 'machine', unit: 'units', contains: 1, rate: 70, ratePer: 'min', source: 'plate' };
const wrapper: Station = { id: 'w', name: 'Wrapper', kind: 'people', unit: 'baskets', contains: 10, cycleSec: 6, perCycle: 1, source: 'timed', allowancePct: 0 };
const palletiser: Station = { id: 'p', name: 'Palletiser', kind: 'people', unit: 'pallets', contains: 36, cycleSec: 6, perCycle: 1, source: 'timed', speedIn: 'before' };
const line = [bagger, wrapper, palletiser];

describe('the rest allowance — the ILO’s constant 9% on a person’s time', () => {
  it('is 5% personal needs and 4% basic fatigue, on a person timed or typed', () => {
    expect(REST_ALLOWANCE_PCT).toBe(9);
    expect(allowanceOf(palletiser)).toBeCloseTo(0.09, 9);
    expect(allowanceOf({ ...palletiser, allowancePct: 14 })).toBeCloseTo(0.14, 9);
    expect(allowanceOf({ ...palletiser, allowancePct: 0 })).toBe(0);
  });
  it('is never on a machine, nor on a standard time from the time study (it carries its own)', () => {
    expect(allowanceOf(bagger)).toBe(0);
    expect(allowanceOf({ ...palletiser, source: 'standard' })).toBe(0);
  });
});

describe('a person timed per basket on a pallet', () => {
  it('reads the step before into its unit: 1 pallet = 36 baskets = 360 units', () => {
    expect(chainWords(line, 2)).toBe('1 pallet = 36 baskets = 360 units');
    expect(chainWords(line, 1)).toBe('1 basket = 10 units');
    expect(chainWords(line, 0)).toBeUndefined();
  });
  it('a basket every 6 s is 10 baskets, 0.278 pallets a minute; 6.54 s with the rest to plan on', () => {
    expect(perMinute(palletiser)).toBeCloseTo(10 / 36, 9);
    expect(planPerMinute(palletiser)).toBeCloseTo(10 / 36 / 1.09, 9);
  });
  it('says what reaches them per basket and per pallet, and whether they keep up, per basket', () => {
    const r = analyse({ stations: line });
    const say = paceSays(r, palletiser, 'baskets', wrapper);
    expect(say.arrive).toBe('A basket reaches them every 8.6 s — 7 a minute; a full pallet of 36 every 5 min 9 s: Bagger does 70 units a minute.');
    expect(say.verdict).toBe('They take 6 s a basket — 6.5 s with 9% rest — they keep up, 2 s to spare a basket.');
    expect(say.short).toBe(false);
    expect(say.paced).toBeUndefined();
  });
  it('the line is limited by the bagger, the palletiser loaded to 76% of their pace', () => {
    const r = analyse({ stations: line });
    expect(r.limit?.station.name).toBe('Bagger');
    const p = r.ok.find(x => x.station.id === 'p');
    expect(p?.running).toBeCloseTo((10 / 36 / 1.09) * 360, 6);
    expect(70 / (p?.running ?? 1)).toBeCloseTo(0.763, 3);
  });
  it('a basket every 9 s is too slow: 9.8 s with the rest, against one every 8.6 s', () => {
    const slow = { ...palletiser, cycleSec: 9 };
    const say = paceSays(analyse({ stations: [bagger, wrapper, slow] }), slow, 'baskets', wrapper);
    expect(say.verdict).toBe('They take 9 s a basket — 9.8 s with 9% rest — 1.2 s too slow: they hold the line back. It needs 2 people to keep up.');
    expect(say.needed).toBe(2);
  });
});

describe('a person fed straight by a machine, nothing collecting between', () => {
  const packer: Station = { id: 'k', name: 'Packer', kind: 'people', unit: 'baskets', contains: 10, cycleSec: 7.8, perCycle: 1, source: 'timed' };
  it('keeps up on paper at 99% — said: a person cannot match a machine piece for piece', () => {
    const say = paceSays(analyse({ stations: [bagger, packer] }), packer, 'units', bagger);
    expect(say.short).toBe(false);
    expect(say.paced).toBe('Fed straight by Bagger with nothing collecting between — loaded to 99% of their pace. A person can’t match a machine piece for piece: plan them at 80–90%, or let some collect before them.');
  });
  it('with somewhere for baskets to collect before them, not said', () => {
    const b = { ...bagger, bufferAfter: 50 };
    expect(paceSays(analyse({ stations: [b, packer] }), packer, 'units', b).paced).toBeUndefined();
  });
  it('fed by another person, said of a person', () => {
    const lead: Station = { id: 'l', name: 'Loader', kind: 'people', unit: 'units', contains: 1, rate: 70, ratePer: 'min', source: 'timed', allowancePct: 0 };
    expect(paceSays(analyse({ stations: [lead, packer] }), packer, 'units', lead).paced).toMatch(/can’t match another person piece for piece/);
  });
});

describe('on paper, the time as typed and the rest beside it', () => {
  it('the sheet’s speed, in the unit it was timed in', () => {
    expect(speedWords(palletiser, 'baskets')).toBe('a basket every 6 s');
    expect(stationDetail(palletiser, 'baskets')).toMatch(/^a basket every 6 s \+ 9% rest · 1 person/);
  });
});

/* A RATE THAT READS LIKE A TIME (Rowland, 14 October: "counts in pallets,
 * each pallet holds 36 baskets ... 5 ... it says 5 pallets a minute ... it
 * isn't ... it takes 5 minutes to do one pallet"). Worked by hand:
 *   what reaches the palletiser: 70 ÷ 360 = 0.194 pallets a minute
 *   "5 pallets a minute" = 1,800 units a minute — 25.7 times that
 *   read as one every 5 minutes: 0.2 a minute — beside 0.194: asked
 *   one every 5 min + 9% = 5 min 27 s, against one every 5 min 9 s: 18 s short */
describe('a rate that reads like a time', () => {
  const typed: Station = { id: 'p', name: 'Palletiser', kind: 'people', unit: 'pallets', contains: 36, rate: 5, ratePer: 'min', source: 'timed' };
  it('"5 pallets a minute" on a palletiser fed a pallet every 5 min 9 s: asked whether it is one every 5 minutes', () => {
    const q = rateAsTime(analyse({ stations: [bagger, wrapper, typed] }), typed, 'baskets');
    expect(q).toEqual({
      says: '5 pallets a minute is 1,800 units a minute — 26 times what reaches them.',
      ask: 'One pallet every 5 minutes?',
      cycleSec: 300, cycleIn: 'min', every: 'a pallet every 5 min',
    });
  });
  it('made so: a pallet every 5 min, kept in seconds, said in minutes — and short once their rest is in it', () => {
    const made: Station = { ...typed, rate: undefined, ratePer: undefined, perCycle: 1, cycleSec: 300, cycleIn: 'min' };
    expect(perMinute(made)).toBeCloseTo(0.2, 9);
    expect(typedSpeedWords(made)).toBe('a pallet every 5 min');
    expect(stationDetail(made)).toMatch(/^a pallet every 5 min \+ 9% rest · 1 person/);
    const r = analyse({ stations: [bagger, wrapper, made] });
    expect(rateAsTime(r, made, 'baskets')).toBeUndefined();
    expect(paceSays(r, made, 'baskets', wrapper).verdict).toBe('They take 5 min a pallet — 5 min 27 s with 9% rest — 18 s too slow: they hold the line back. It needs 2 people to keep up.');
  });
  it('never asked of a rate near what reaches it, an hour’s rate, or the front of the line', () => {
    const near = { ...typed, rate: 0.25 };
    expect(rateAsTime(analyse({ stations: [bagger, wrapper, near] }), near, 'baskets')).toBeUndefined();
    const hourly = { ...typed, rate: 5, ratePer: 'hour' as const };
    expect(rateAsTime(analyse({ stations: [bagger, wrapper, hourly] }), hourly, 'baskets')).toBeUndefined();
    expect(rateAsTime(analyse({ stations: [bagger] }), bagger)).toBeUndefined();
  });
  it('a rate many times what reaches it but nothing like it read as a time: not asked — it is just fast', () => {
    const fast = { ...typed, rate: 40 };     // one every 40 minutes would be 0.025 a minute — not 0.194
    expect(rateAsTime(analyse({ stations: [bagger, wrapper, fast] }), fast, 'baskets')).toBeUndefined();
  });
});

describe('a typed time as a person says it', () => {
  it('seconds under a minute and a half, minutes beyond', () => {
    expect([everyWords(6), everyWords(12.5), everyWords(75), everyWords(300), everyWords(100)]).toEqual(['6 s', '12.5 s', '75 s', '5 min', '1 min 40 s']);
    expect(cycleWords(1, 300, 'pallets')).toBe('a pallet every 5 min');
    expect(cycleWords(2, 20, 'baskets')).toBe('2 baskets every 20 s');
  });
});
