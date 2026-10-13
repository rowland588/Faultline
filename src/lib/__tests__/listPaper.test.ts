/* PAPER WHEREVER THERE IS A LIST — the readings, worked by hand
 * (lib/capacityPaper, lib/materialsReport; docs/AUDIT.md, bar 3).
 *
 * The line from lib/capacity's own tests, with the basketer's stops counted:
 *
 *   Bagger       70 bags a minute, on the plate                    =  70     bags/min
 *   Basketer     12 bags a basket, 5.5 a minute, timed, 94% running = 62.04  bags/min
 *   Carrier      a person, 2 baskets every 20 s = 6 baskets/min     =  72     bags/min
 *   Palletiser   40 baskets a pallet, 8 pallets an hour, plate      =  64     bags/min
 *
 * The basketer limits at 62.04, 3.96 short of 66; the palletiser is next.
 * Four people at £12.50 = £50 an hour over 3,722.4 bags an hour = 1.34p a bag.
 * Days: 480 min less 30 of breaks = 450 min × 62.04 = 27,918 bags. */
import { describe, it, expect } from 'vitest';
import { capacityPaper, capacityPapersSay, howWords, speedWords } from '../capacityPaper';
import { materialsReading, whenSaid } from '../materialsReport';
import type { Capacity, Station } from '../capacity';
import type { Material } from '../materials';
import type { TestItem } from '../testing';

const st = (o: Partial<Station> & { id: string; name: string; unit: string }): Station => ({ kind: 'machine', contains: 1, ratePer: 'min', ...o });
const LINE: Capacity = {
  targetPerMin: 66,
  stations: [
    st({ id: 'b', name: 'Bagger', unit: 'bags', rate: 70, source: 'plate' }),
    st({ id: 'k', name: 'Basketer', unit: 'baskets', contains: 12, rate: 5.5, runningPct: 94, source: 'timed' }),
    st({ id: 'c', name: 'Carrier', kind: 'people', unit: 'baskets', cycleSec: 20, perCycle: 2 }),
    st({ id: 'p', name: 'Palletiser', unit: 'pallets', contains: 40, rate: 8, ratePer: 'hour', source: 'plate' }),
  ],
};
const paper = (cap?: Capacity) => capacityPaper({
  product: 'Maris Piper 2kg', line: 'Line 7', printed: '13 October 2026', ...(cap ? { capacity: cap } : {}),
  shifts: [{ name: 'Days', min: 480, breakMin: 30 }], labour: { people: 4, peopleFrom: 'typed', rate: 12.5, rateFrom: 'typed' },
});

describe('Line capacity on paper (lib/capacityPaper)', () => {
  it('says where the line is: what limits it and by how much, short in red', () => {
    const p = paper(LINE);
    expect(p.headline).toBe('Basketer limits at 62 bags/min · 4 short of 66');
    expect(p.short).toBe(true);
    expect(p.target).toBe('66 bags a minute');
    expect(p.v?.text).toMatch(/^Basketer is the bottleneck at 62 bags a minute\. Set the V's margin/);
  });
  it('the capacity sheet: a row a station, the bottleneck marked, what the target needs of each', () => {
    const p = paper(LINE);
    expect(p.rows.map(r => r.name)).toEqual(['Bagger', 'Basketer', 'Carrier', 'Palletiser']);
    const [bag, bsk, car, pal] = p.rows;
    expect(bsk).toMatchObject({ limit: true, ofNeck: 'the bottleneck', perMin: '62', perHour: '3722', stops: '6%', needs: '106%', over: true, notPlate: true, how: 'timed — not its plate speed' });
    expect(bag).toMatchObject({ ofNeck: '113%', needs: '94%', over: false, unit: 'bags — the line’s unit', speed: '70 bags a minute', how: 'on the plate' });
    expect(car).toMatchObject({ unit: 'baskets · 12 bags each · 1 person', speed: '2 baskets every 20 s', how: 'not timed yet', notPlate: false });
    expect(pal).toMatchObject({ unit: 'pallets · 480 bags each', speed: '8 pallets an hour', perMin: '64' });
  });
  it('a shift and a pack: the shift less its breaks at the bottleneck; the cost a bag, and why one more person is no answer', () => {
    const p = paper(LINE);
    expect(p.shift?.rows[0]).toMatchObject({ name: 'Days', time: '480 min', breaks: '30 min', changeovers: 'none timed', making: '450 min', made: '27,918' });
    expect(p.labour?.says).toBe('1.34p a bag — 4 people × £12.50 = £50.00 an hour; the line makes 3,722 bags an hour (62 a minute). (people: typed on the capacity; rate: typed on the capacity)');
    expect(p.labour?.more).toBe('The bottleneck is a machine — Basketer: another person there adds an hour’s cost and no bags.');
  });
  it('what we are doing about it: each what-if against the line as run', () => {
    const cap: Capacity = { ...LINE, whatIfs: [{ id: 'w', name: 'Faster basketer', createdAt: 1, stations: LINE.stations.map(s => (s.id === 'k' ? { ...s, rate: 8 } : s)), action: { id: 'a', raisedAt: 1 } }] };
    const w = paper(cap).whatIfs[0];
    expect(w.onBoard).toBe(true);
    expect(w.says).toBe('With Faster basketer, the line would do 64 bags/min instead of 62 (+2). Basketer no longer limits it; Palletiser does. Still 2 short of the 66 target.');
    expect(w.changed).toEqual(['Basketer: 8 baskets a minute instead of 5.5']);
  });
  it('a product with nothing written says so, and prints no empty sections', () => {
    const p = paper({ stations: [] });
    expect(p.headline).toMatch(/^No stations yet/);
    expect(p.rows).toEqual([]);
    expect(p.shift).toBeUndefined();
    expect(p.labour).toBeUndefined();
  });
  it('what is wrong to check: a station not counted, said why', () => {
    const p = paper({ stations: [...LINE.stations, st({ id: 't', name: 'Trailer bay', unit: 'trailers', contains: 0, rate: 2, ratePer: 'hour' })] });
    expect(p.check).toContain('Trailer bay is not counted: it does not say how many pallets make one trailer.');
  });
  it('every product shown, in a sentence', () => {
    expect(capacityPapersSay([paper(LINE), paper({ stations: [] })])).toBe('2 products on 1 line — 1 short of its target, 1 with no stations yet.');
  });
  it('stations written down and none counted: their speeds still to fill in, each said and why', () => {
    const none = paper({ stations: [st({ id: 'a', name: 'Bagger', unit: 'bags' }), st({ id: 'b', name: 'Boxer', unit: 'cases' })] });
    expect(none.rows).toEqual([]);
    expect(none.check.filter(c => /^(Bagger|Boxer) is not counted: /.test(c))).toHaveLength(2);
    expect(capacityPapersSay([paper(LINE), none, paper({ stations: [] })])).toBe('3 products on 1 line — 1 short of its target, 1 with no stations yet, 1 with its speeds still to fill in.');
  });
  it('a speed and how it is known, as the sheet says them', () => {
    expect(speedWords(st({ id: 'x', name: 'Op', unit: 'trays', cycleSec: 8, perCycle: 1 }))).toBe('a tray every 8 s');
    expect(howWords(st({ id: 'x', name: 'Coder', unit: 'bags', rate: 1, source: 'estimate' }))).toEqual({ text: 'a guess — not its plate speed', notPlate: true });
  });
});

describe('What we are waiting on, on paper (lib/materialsReport)', () => {
  const TODAY = '2026-10-13';
  const m = (id: string, what: string, o: Partial<Material> = {}): Material => ({ id, projectId: 'p', what, sort: 0, createdAt: 1, updatedAt: 1, ...o });
  const list = [
    m('a', 'Perforated film', { due: '2026-10-10', from: 'Sealed Air', howMuch: '10 reels' }),
    m('b', 'Jaw heater', { due: '2026-10-14' }),
    m('c', 'Changeover kit', { due: '2026-10-17' }),
    m('d', 'Labels'),
    m('e', 'Trial reel', { here: true, inOn: '2026-10-04' }),
    m('f', 'Spare jaw', { here: true }),
  ];
  it('says how far off each is, as the list does', () => {
    expect(list.map(x => whenSaid(x, TODAY))).toEqual(['3 days late', 'tomorrow', 'in 4 days', 'no date', 'in on 4 Oct', 'in stock']);
  });
  it('tells it in order: how many are here, the late, the coming, the undated, the in', () => {
    const move: TestItem = { id: 'i', projectId: 'p', testId: 'material:a', kind: 'found', what: 'Supplier short of film', movedFrom: '2026-10-03', movedTo: '2026-10-10', sort: 1, createdAt: 1, updatedAt: 1 };
    const r = materialsReading({ job: 'Line 7 pace', printed: '13 Oct 2026', materials: list, lineName: () => undefined, tests: [], items: [move], today: TODAY });
    expect(r.headline).toBe('2 of 6 here');
    expect(r.says).toBe('1 late. 2 still coming, the next due 14 Oct. 1 with no date agreed.');
    expect(r.late).toEqual([{ what: 'Perforated film', facts: '10 reels · from Sealed Air', due: '10 Oct', when: '3 days late', state: 'late', moved: 'moved 3 Oct → 10 Oct: Supplier short of film' }]);
    expect(r.coming.map(x => x.what)).toEqual(['Jaw heater', 'Changeover kit']);
    expect(r.undated.map(x => x.what)).toEqual(['Labels']);
    expect(r.here).toEqual(['Spare jaw', 'Trial reel (in on 4 Oct)']);   // the list's order
  });
});
