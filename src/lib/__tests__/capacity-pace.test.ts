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

describe('what a pack costs in labour (Rowland, 13 October: "if I put two people there ... is my cost per pack higher or lower?")', () => {
  const tray = person({ cycleSec: 8, perCycle: 1, source: 'timed' });
  const cap = { stations: [bagger, tray] };
  const r = analyse(cap);
  it('8 people at £12.50 an hour, the line making 60 bags a minute: £100 an hour, 3,600 bags, 2.78p a bag', async () => {
    const { labourCost, fmtMoney } = await import('../capacity');
    const c = labourCost(r, 8, 12.5);
    expect(c?.perHour).toBe(100);
    expect(c?.packsPerHour).toBeCloseTo(3600, 9);
    expect(fmtMoney(c?.perPack ?? 0)).toBe('2.78p');
    expect(labourCost(r, undefined, 12.5)).toBeUndefined();
  });
  it('one more person at the tray packer: the bagger then limits at 4,200 an hour, 2.68p a bag — lower, they pay for themselves', async () => {
    const { oneMorePerson } = await import('../capacity');
    const m = oneMorePerson(cap, r, 8, 12.5);
    expect(m?.cheaper).toBe(true);
    expect(m?.then.packsPerHour).toBeCloseTo(4200, 9);
    expect(m?.sentence).toBe('One more person at Tray packer: the line makes 4,200 bags an hour instead of 3,600 (Bagger then limits) — £112.50 an hour, 2.68p a bag instead of 2.78p: 0.1p a bag lower — they pay for themselves.');
  });
  it('a person who adds no packs costs more a pack, and is said so', async () => {
    const { oneMorePerson } = await import('../capacity');
    /* the tray packer already keeps up: the bagger limits, a person there adds nothing */
    const two = { ...tray, crew: 2 };
    const r2 = analyse({ stations: [bagger, two] });
    expect(oneMorePerson({ stations: [bagger, two] }, r2, 8, 12.5)).toBeUndefined();   // the bottleneck is a machine
    const slow = { ...tray, cycleSec: 30 };
    const many = { ...slow, crew: 1 };
    const r3 = analyse({ stations: [bagger, many] });
    const m = oneMorePerson({ stations: [bagger, many] }, r3, 8, 12.5);
    expect(m?.cheaper).toBe(true);          // one person at 30 s is far short; a second doubles the line
    const fast = { ...tray, cycleSec: 6.9 };
    const r4 = analyse({ stations: [bagger, fast] });
    const m4 = oneMorePerson({ stations: [bagger, fast] }, r4, 8, 12.5);
    expect(m4?.cheaper).toBe(false);        // 6.9 s is nearly keeping up: a second person adds a few packs and a full wage
    expect(m4?.sentence).toMatch(/higher — the packs they add do not pay for them\.$/);
  });
  it('a what-if says its labour against the line as run', async () => {
    const { whatIfLabour } = await import('../capacity');
    const w = { stations: [bagger, { ...tray, crew: 2 }] };
    const x = whatIfLabour(cap, r, w, analyse(w), 8, 12.5);
    expect(x?.sentence).toBe('Labour: 1 person more, 2.68p a bag against 2.78p as run — 0.1p lower.');
  });
});
