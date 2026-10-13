/* WHAT REACHES A STATION, AND WHETHER IT KEEPS UP (lib/capacity arrivals,
 * paceSays). Rowland, 13 October: "8 units in a tray ... a tray every 8
 * seconds. But it still comes up with very strange numbers" and "say 70 a
 * minute. How many go into a basket? 10. So one basket goes to a human every
 * X". Each case here is one of his, worked by hand. */
import { describe, expect, it } from 'vitest';
import { analyse, blankStation, fmtSec, oneOf, paceSays, type Station } from '../capacity';

const bagger: Station = { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' };
const person = (x: Partial<Station>): Station => ({ id: 'p', name: 'Tray packer', kind: 'people', unit: 'trays', contains: 8, ...x });

describe('what reaches a person, before they have a speed', () => {
  it('70 bags a minute, 8 to a tray: a tray every 6.9 s, 8.75 a minute', () => {
    const r = analyse({ stations: [bagger, person({})] });
    expect(r.arrivals.p.perMin).toBeCloseTo(8.75, 9);
    expect(r.arrivals.p.everySec).toBeCloseTo(60 / 8.75, 9);
    const say = paceSays(r, person({}));
    expect(say.arrive).toBe('A tray reaches them every 6.9 s — 8.8 a minute: Bagger does 70 bags a minute, 8 to a tray.');
    expect(say.verdict).toBe('Time how long one tray takes them.');
    expect(r.skipped.map(x => x.why)).toEqual(['it has no speed yet']);
  });
  it('70 a minute, 10 to a basket: a basket every 8.6 s, 7 a minute', () => {
    const p = person({ unit: 'baskets', contains: 10 });
    const r = analyse({ stations: [bagger, p] });
    expect(r.arrivals.p.everySec).toBeCloseTo(60 / 7, 9);
    expect(paceSays(r, p).arrive).toBe('A basket reaches them every 8.6 s — 7 a minute: Bagger does 70 bags a minute, 10 to a basket.');
  });
});

describe('a person timed: a tray every 8 seconds', () => {
  const p = person({ cycleSec: 8, perCycle: 1, source: 'timed' });
  const r = analyse({ stations: [bagger, p] });
  it('is 7.5 trays a minute — 60 bags a minute in the line\'s unit, the limit', () => {
    expect(r.limit?.station.id).toBe('p');
    expect(r.line).toBeCloseTo(60, 9);
  });
  it('says they are 1.1 s too slow, and that two people would keep up', () => {
    const say = paceSays(r, p);
    expect(say.short).toBe(true);
    expect(say.needed).toBe(2);
    expect(say.verdict).toBe('They take 8 s a tray — 1.1 s too slow: they hold the line back. It needs 2 people to keep up.');
  });
  it('two of them keep up, with the seconds to spare', () => {
    const two = { ...p, crew: 2 };
    const say = paceSays(analyse({ stations: [bagger, two] }), two);
    expect(say.short).toBe(false);
    expect(say.needed).toBeUndefined();
    expect(say.verdict).toBe('They take 8 s a tray each, 2 of them — they keep up, 2.9 s to spare a tray.');
  });
});

describe('a station after a slower one', () => {
  it('what reaches it is set by the slowest before, not the one next to it', () => {
    const basketer: Station = { id: 'k', name: 'Basketer', kind: 'machine', unit: 'baskets', contains: 12, rate: 5, ratePer: 'min', runningPct: 92 };
    const packer: Station = { id: 'q', name: 'Packer', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 15, perCycle: 1 };
    const r = analyse({ stations: [bagger, basketer, packer] });
    expect(r.arrivals.q.perMin).toBeCloseTo(4.6, 9);
    expect(r.arrivals.q.from.name).toBe('Basketer');
    expect(paceSays(r, packer).arrive).toBe('A basket reaches them every 13 s — 4.6 a minute: Basketer does 4.6 baskets a minute.');
  });
  it('a broken chain says nothing it cannot know', () => {
    const r = analyse({ stations: [bagger, person({ contains: 0 })] });
    expect(r.arrivals.p).toBeUndefined();
  });
});

describe('the words', () => {
  it('a unit said once', () => {
    expect([oneOf('baskets'), oneOf('boxes'), oneOf('trays'), oneOf('cases'), oneOf('pallets'), oneOf(''), oneOf('batteries')])
      .toEqual(['basket', 'box', 'tray', 'case', 'pallet', 'one', 'battery']);
    expect([fmtSec(6.857), fmtSec(12.9), fmtSec(8)]).toEqual(['6.9 s', '13 s', '8 s']);
  });
  it('a new station after the first asks how many of the one before make one — never takes one', () => {
    expect(blankStation('x', 'people', false).contains).toBe(0);
    expect(blankStation('y', 'machine', true).contains).toBe(1);
  });
});
