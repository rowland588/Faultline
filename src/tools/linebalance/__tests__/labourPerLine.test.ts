/* FC-034 part 3 — people and rate for each line (knowledge/specs/FC-034-labour-per-line.md §6, hand-worked):
 * 2a 3 × £14 = £42; 2b 2 × £12 = £24; after the merge 1 × £14 = £14 → 6 people, £80 an hour, blended £13.3333;
 * the lines send 40 + 30 = 70 a minute = 4,200 an hour → £80 ÷ 4,200 = £0.019048 a pack;
 * 2a alone £42 ÷ 2,400 = £0.0175; 2b £24 ÷ 1,800 = £0.013333. */
import { describe, expect, it } from 'vitest';
import { analyse, labourAfter, labourByLine, labourCost, labourInputs, labourPartsSays, oneMorePerson, rateAtStation, SHARED_PART, type Capacity, type Station } from '../capacity';

const m = (id: string, lane: string | undefined, rate: number, kind: 'machine' | 'people' = 'machine', crew = 1): Station =>
  ({ id, ...(lane ? { lane } : {}), kind, name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew }) as Station;

const base = (over: Partial<Capacity> = {}): Capacity => ({
  lanes: [{ id: 'a', name: '2a', labour: { people: 3, ratePerHour: 14 } }, { id: 'b', name: '2b', labour: { people: 2, ratePerHour: 12 } }],
  labourShared: { people: 1, ratePerHour: 14 },
  stations: [m('fa', 'a', 40), m('fb', 'b', 30), m('wrap', undefined, 100)],
  ...over,
} as Capacity);

describe('labour counted line by line', () => {
  it('the hand-worked case: 6 people, £80 an hour, blended £13.33, 1.9p a pack', () => {
    const cap = base();
    const li = labourInputs(cap, undefined);
    expect(li.people).toBe(6);
    expect(li.rate).toBeCloseTo(80 / 6, 9);
    expect(li.parts?.map(x => x.perHour)).toEqual([42, 24, 14]);
    const r = analyse(cap);
    const c = labourCost(r, li.people, li.rate)!;
    expect(c.perHour).toBeCloseTo(80, 9);
    expect(c.perPack).toBeCloseTo(80 / 4200, 9);
  });
  it('says each line on what it sends: 1.75p and 1.33p', () => {
    const cap = base();
    const says = labourPartsSays(labourInputs(cap, undefined), analyse(cap));
    expect(says[0]).toContain('3 people × £14.00 = £42.00 an hour, 1.75p a unit.');
    expect(says[1]).toContain('2 people × £12.00 = £24.00 an hour, 1.33p a unit.');
    expect(says[2]).toContain('After the lines merge: 1 person');
  });
  it('changing one line’s rate moves only that line’s subtotal', () => {
    const cap = base();
    const next = { ...cap, lanes: cap.lanes!.map(l => (l.id === 'b' ? { ...l, labour: { ...l.labour, ratePerHour: 20 } } : l)) };
    expect(labourInputs(next, undefined).parts?.map(x => x.perHour)).toEqual([42, 40, 14]);
  });
  it('people not typed are the people in the line’s own stations', () => {
    const cap = base({
      lanes: [{ id: 'a', name: '2a', labour: { ratePerHour: 14 } }, { id: 'b', name: '2b', labour: { ratePerHour: 12 } }],
      labourShared: { ratePerHour: 14 },
      stations: [m('pa', 'a', 40, 'people', 2), m('pb', 'b', 30, 'people', 1), m('wrap', undefined, 100, 'people', 1)],
    } as Partial<Capacity>);
    const li = labourInputs(cap, undefined);
    expect(li.parts?.map(x => [x.people, x.peopleFrom])).toEqual([[2, 'stations'], [1, 'stations'], [1, 'stations']]);
    expect(li.people).toBe(4);
  });
  it('the default rate stands in for a line without its own; no rate anywhere is named', () => {
    const cap = base({ labour: { ratePerHour: 10 }, lanes: [{ id: 'a', name: '2a', labour: { people: 3 } }, { id: 'b', name: '2b', labour: { people: 2, ratePerHour: 12 } }], labourShared: { people: 1 } } as Partial<Capacity>);
    expect(labourInputs(cap, undefined).parts?.map(x => [x.rate, x.rateFrom])).toEqual([[10, 'all'], [12, 'typed'], [10, 'all']]);
    const none = base({ lanes: [{ id: 'a', name: '2a', labour: { people: 3 } }, { id: 'b', name: '2b', labour: { people: 2 } }], labourShared: { people: 1 } } as Partial<Capacity>);
    const li = labourInputs(none, undefined);
    expect(li.rate).toBeUndefined();
    expect(li.noRate).toEqual(['2a', '2b', 'After the lines merge']);
  });
  it('the line’s own rate (wage × on-costs) is the last stand-in', () => {
    const cap = base({ lanes: [{ id: 'a', name: '2a', labour: { people: 1 } }, { id: 'b', name: '2b', labour: { people: 1 } }], labourShared: { people: 0 } } as Partial<Capacity>);
    expect(labourInputs(cap, undefined, { labourRatePerHour: 10, labourBurden: 1.2 }).parts?.[0]?.perHour).toBeCloseTo(12, 9);
    expect(labourInputs(cap, undefined, { labourRatePerHour: 10, labourBurden: 1.2 }).rate).toBeCloseTo(12, 9);
  });
  it('an old record reads exactly as before', () => {
    const old = base({ lanes: [{ id: 'a', name: '2a' }, { id: 'b', name: '2b' }], labourShared: undefined, labour: { people: 5, ratePerHour: 13 } } as Partial<Capacity>);
    expect(labourByLine(old)).toBe(false);
    const li = labourInputs(old, 9, { crew: 7 });
    expect(li).toEqual({ people: 5, peopleFrom: 'typed', rate: 13, rateFrom: 'typed' });
  });
  it('one more person is paid at their own line’s rate', () => {
    const cap = base({ stations: [m('fa', 'a', 40, 'people'), m('fb', 'b', 30, 'people'), m('wrap', undefined, 100)] } as Partial<Capacity>);
    const li = labourInputs(cap, undefined);
    const r = analyse(cap);
    const st = r.limit!.station;
    const more = oneMorePerson(cap, r, li.people, li.rate, rateAtStation(li, cap, st))!;
    expect(st.id).toBe('fb'); // 2b's 30 a minute holds the lines
    expect(rateAtStation(li, cap, st)).toBe(12);
    expect(more.then.perHour).toBeCloseTo(more.now.perHour + 12, 9);
  });
  it('a typed part follows its stations when a crew changes', () => {
    const cap = base({ stations: [m('fa', 'a', 40, 'people', 1), m('fb', 'b', 30), m('wrap', undefined, 100)] } as Partial<Capacity>);
    const after = labourAfter(cap, cap.stations.map(s => (s.id === 'fa' ? { ...s, crew: 2 } : s)));
    expect(after.lanes![0].labour!.people).toBe(4);
    expect(after.lanes![1].labour!.people).toBe(2);
    expect(after.labourShared!.people).toBe(1);
    expect(SHARED_PART).toBe('__shared__');
  });
  it('one chain with no lanes is never counted by line', () => {
    expect(labourByLine({ lanes: undefined, labourShared: undefined })).toBe(false);
  });
});
