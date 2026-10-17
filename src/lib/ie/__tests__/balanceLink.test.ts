/* THE LINE BALANCE AND LINE CAPACITY, LINKED (lib/ie/balanceLink) — and the
 * balance's own arithmetic for people counting different things, walking
 * and waiting. Every figure worked by hand in the comment beside it. */
import { describe, expect, it } from 'vitest';
import { balance, balanceSays, suggest } from '../balance';
import { agreedFor, atStation, balanceCost, balanceCostSays, capacityTaking, crewKept, stationsOf, studyBalance, taktFromTarget, targetOffer } from '../balanceLink';
import type { BalanceCrew, BalanceStep } from '../../study';
import type { Capacity, Station } from '../../capacity';

const typed = (id: string, who: string, sec: number, kind?: BalanceStep['kind']): BalanceStep => ({ id, order: Number(id.replace(/\D/g, '')) || 0, name: id, who, typedSec: sec, ...(kind ? { kind } : {}) });
const st = (id: string, name: string, kind: Station['kind'], unit: string, contains: number, extra: Partial<Station> = {}): Station => ({ id, name, kind, unit, contains, ...extra });
const line: Capacity = {
  targetPerMin: 20,
  stations: [
    st('s1', 'Bagger', 'machine', 'bags', 1, { rate: 30, source: 'plate' }),
    st('s2', 'Tray loader', 'people', 'trays', 8, { cycleSec: 30, perCycle: 1, source: 'timed' }),
    st('s3', 'Case packer', 'people', 'cases', 4),
  ],
};

describe('people counting different things — each against their own takt', () => {
  const crew: BalanceCrew[] = [{ id: 'c1', who: 'Op 1', stationId: 's2', station: 'Tray loader', per: 8, unit: 'trays' }];
  it('a person at the tray loader times a tray: their takt is the line’s × 8; the rest is put back into the line’s unit', () => {
    /* takt 3 s a bag. Op 1: 20 s a tray against 24 s (3 × 8) — 4 s to spare. Op 2: 2.5 s a bag against 3 s.
       Work a bag: 20 ÷ 8 + 2.5 = 5.0 s; fewest ⌈5 ÷ 3⌉ = 2; loads 2.5 and 2.5 — 100% balanced. */
    const f = balance([typed('e1', 'Op 1', 20), typed('e2', 'Op 2', 2.5)], { taktSec: 3, from: 'target' }, crew);
    const [a, b] = f.people;
    expect([a.takt, a.spare, a.per, a.unit, a.station]).toEqual([24, 4, 8, 'trays', 'Tray loader']);
    expect([b.takt, b.spare, b.per, b.unit]).toEqual([3, 0.5, 1, undefined]);
    expect([f.total, f.fewest, f.efficiency]).toEqual([5, 2, 1]);
  });
  it('over takt is said in their own piece: "carries 26.0 s a tray — over takt (24.0 s a tray) by 2.0 s"', () => {
    const f = balance([typed('e1', 'Op 1', 26), typed('e2', 'Op 2', 2.5)], { taktSec: 3, from: 'target' }, crew);
    expect(balanceSays(f).lines[0].text).toBe('Op 1 carries 26.0 s a tray — over takt (24.0 s a tray) by 2.0 s.');
    expect(f.constraint?.who).toBe('Op 1');               // 26 ÷ 8 = 3.25 s a bag, the heaviest load
  });
  it('no suggested balance across people counting different things — their elements do not pile', () => {
    expect(suggest(balance([typed('e1', 'Op 1', 20), typed('e2', 'Op 2', 2.5)], { taktSec: 3, from: 'target' }, crew))).toBeUndefined();
  });
  it('a takt typed here by hand is seconds a piece of what each does — no station’s unit is put through it', () => {
    const f = balance([typed('e1', 'Op 1', 12.9), typed('e2', 'Op 2', 8)], { taktSec: 12 }, crew);
    expect(f.people.map(p => [p.per, p.takt, p.unit, p.station])).toEqual([[1, 12, undefined, 'Tray loader'], [1, 12, undefined, undefined]]);
    expect(f.people[0].overBy).toBeCloseTo(0.9, 9);
  });
  it('without a station everyone counts the line’s unit, as before', () => {
    const f = balance([typed('e1', 'Op 1', 2), typed('e2', 'Op 2', 2.5)], { taktSec: 3 });
    expect(f.people.map(p => [p.per, p.takt])).toEqual([[1, 3], [1, 3]]);
    expect([f.total, f.fewest]).toEqual([4.5, 2]);
  });
});

describe('walking and waiting — the combination table’s three', () => {
  it('waiting is not work: it leaves the people needed, and is said as time they could take work in', () => {
    /* takt 3. Op 1: 2 s work + 2 s waiting; Op 2: 2.5 s. Cycle total 6.5 (⌈2.17⌉ = 3 if waiting counted);
       the work in it 4.5 → ⌈1.5⌉ = 2 people. Balance 4.5 ÷ (2 × 4) = 56%. */
    const f = balance([typed('e1', 'Op 1', 2), typed('e2', 'Op 1', 2, 'wait'), typed('e3', 'Op 2', 2.5)], { taktSec: 3 });
    expect([f.people[0].work, f.people[0].wait, f.people[0].walk]).toEqual([4, 2, 0]);
    expect([f.total, f.fewest]).toEqual([6.5, 2]);
    expect(f.efficiency).toBeCloseTo(0.5625, 6);
    const said = balanceSays(f).lines;
    expect(said.find(l => l.tone === 'r')?.text).toBe('Op 1 carries 4.0 s — over takt by 1.0 s.');
    expect(said.find(l => /^Waiting/.test(l.text))).toEqual({ text: 'Waiting: Op 1 2.0 s a cycle — time they could take work in.', tone: 'a' });
  });
  it('walking stays in the work and is said as the layout’s to shorten', () => {
    const f = balance([typed('e1', 'Op 1', 2), typed('e2', 'Op 1', 0.8, 'walk')], { taktSec: 3 });
    expect([f.people[0].work, f.people[0].walk, f.fewest]).toEqual([2.8, 0.8, 1]);
    expect(balanceSays(f).lines).toEqual([{ text: 'Walking: Op 1 0.8 s a cycle — the layout’s to shorten.', tone: 'n' }]);
  });
  it('the suggestion leaves waiting out — it goes when the work moves', () => {
    const g = suggest(balance([typed('e1', 'Op 1', 2), typed('e2', 'Op 1', 2, 'wait'), typed('e3', 'Op 2', 2.5)], { taktSec: 3 }));
    expect(g?.map(x => x.ids)).toEqual([['e1'], ['e3']]);  // 2 + 2.5 > 3, so two people; the wait is nobody's
  });
});

describe('the link: Line capacity’s stations, its target, and the people’s times', () => {
  it('the stations in flow order with the line’s units in one of each: 1, 8, 32', () => {
    expect(stationsOf(line).map(p => [p.name, p.per, p.unit, p.kind])).toEqual([
      ['Bagger', 1, 'bags', 'machine'], ['Tray loader', 8, 'trays', 'people'], ['Case packer', 32, 'cases', 'people']]);
    expect(stationsOf(undefined)).toEqual([]);
  });
  it('on several lines: each line’s own chain, and the shared station carrying on from the first line’s last unit', () => {
    const lanes: Capacity = { lanes: [{ id: 'A', name: 'Line A' }, { id: 'B', name: 'Line B' }], stations: [
      st('a1', 'Bagger A', 'machine', 'bags', 1, { lane: 'A' }), st('a2', 'Trays A', 'people', 'trays', 8, { lane: 'A' }),
      st('b1', 'Bagger B', 'machine', 'bags', 1, { lane: 'B' }),
      st('w', 'Wrapper', 'people', 'pallets', 36),
    ] };
    expect(stationsOf(lanes).map(p => [p.name, p.per, p.lane])).toEqual([
      ['Bagger A', 1, 'Line A'], ['Trays A', 8, 'Line A'], ['Bagger B', 1, 'Line B'], ['Wrapper', 288, undefined]]);  // 8 × 36
  });
  it('the takt follows the target: 20 a minute is 3 s each; none without a target', () => {
    expect(taktFromTarget(line)).toEqual({ taktSec: 3, perMin: 20, unit: 'bags' });
    expect(taktFromTarget({ stations: line.stations })).toBeUndefined();
  });
  it('what the balance holds to: a new one takes the target’s takt and follows it, its own allowance kept', () => {
    expect(agreedFor(undefined, line)).toEqual({ taktSec: 3, from: 'target' });
    expect(agreedFor({ taktSec: 5, from: 'target', allowance: 0.1 }, line)).toEqual({ taktSec: 3, from: 'target', allowance: 0.1 });
    expect(agreedFor(undefined, { stations: [] })).toBeUndefined();
  });
  it('a takt agreed by hand is kept — the target offered beside it, never put over it; a closed one as it closed', () => {
    expect(agreedFor({ taktSec: 12, allowance: 0.1 }, line)).toEqual({ taktSec: 12, allowance: 0.1 });
    expect(targetOffer({ taktSec: 12 }, line)).toEqual({ taktSec: 3, perMin: 20, unit: 'bags' });
    expect(targetOffer({ taktSec: 3 }, line)).toBeUndefined();                     // the same number: nothing to offer
    expect(targetOffer({ taktSec: 3, from: 'target' }, line)).toBeUndefined();
    expect(targetOffer({ taktSec: 12 }, { stations: [] })).toBeUndefined();
    expect(agreedFor({ taktSec: 5, from: 'target' }, line, true)).toEqual({ taktSec: 5, from: 'target' });
  });
  it('a person’s station kept up with the capacity; one whose station is gone is on no station again', () => {
    const kept = crewKept([{ id: 'c1', who: 'Op 1', stationId: 's3' }, { id: 'c2', who: 'Op 2', stationId: 'gone', per: 8, unit: 'trays' }, { id: 'c3', who: 'Op 3' }], line);
    expect(kept).toEqual([
      { id: 'c1', who: 'Op 1', stationId: 's3', station: 'Case packer', per: 32, unit: 'cases' },
      { id: 'c2', who: 'Op 2' }, { id: 'c3', who: 'Op 3' }]);
    expect(atStation(kept, 's3')).toEqual(['Op 1']);
  });
  it('a people station takes its person’s timed cycle — a standard time, said whose; a machine keeps its plate', () => {
    const crew: BalanceCrew[] = [{ id: 'c1', who: 'Op 1', stationId: 's2', per: 8, unit: 'trays' }, { id: 'c2', who: 'Bagger op', stationId: 's1' }];
    const f = balance([typed('e1', 'Op 1', 20), typed('e2', 'Op 1', 4.4), typed('e3', 'Bagger op', 5)], { taktSec: 3, from: 'target' }, crew);
    const next = capacityTaking(line, f, crew);
    expect(next?.stations[1]).toEqual({ id: 's2', name: 'Tray loader', kind: 'people', unit: 'trays', contains: 8, cycleSec: 24.4, perCycle: 1, source: 'standard', note: 'timed in the line balance — Op 1' });
    expect(next?.stations[0]).toBe(line.stations[0]);   // the bagger is a machine: its plate speed stands
    expect(next && capacityTaking(next, f, crew)).toBeUndefined();   // nothing more to change
  });
  it('two people at one station: the mean of their cycles, both named; one not timed yet — nothing is taken', () => {
    const crew: BalanceCrew[] = [{ id: 'c1', who: 'Op 1', stationId: 's3' }, { id: 'c2', who: 'Op 2', stationId: 's3' }];
    const f = balance([typed('e1', 'Op 1', 40), typed('e2', 'Op 2', 44)], { taktSec: 3 }, crew);
    expect(capacityTaking(line, f, crew)?.stations[2]).toMatchObject({ cycleSec: 42, note: 'timed in the line balance — Op 1 and Op 2' });
    const half = balance([typed('e1', 'Op 1', 40), { id: 'e2', order: 2, name: 'x', who: 'Op 2' }], { taktSec: 3 }, crew);
    expect(capacityTaking(line, half, crew)).toBeUndefined();
  });
  it('every reader takes the study the same way — its elements, its takt and where its people are', () => {
    const f = studyBalance({ facts: { steps: [typed('e1', 'Op 1', 20)], crew: [{ id: 'c', who: 'Op 1', per: 8, unit: 'trays' }] }, agreed: { balance: { taktSec: 3, from: 'target' } } });
    expect([f.people[0].takt, f.people[0].unit]).toEqual([24, 'trays']);
  });
});

describe('what the bottleneck costs — a pack and a minute', () => {
  it('over takt: the packs lost, labour a pack now and at takt, paid for packs not made, the others waiting, contribution lost', () => {
    /* takt 12 s → 5 packs a minute. Op 1 13 s (constraint), Op 2 8 s, Op 3 7 s. Now 60 ÷ 13 = 4.615 a minute; lost 0.385.
       3 people at £15 an hour = £0.75 a minute. A pack: 0.75 ÷ 4.615 = 16.25p now, 0.75 ÷ 5 = 15p at takt.
       Paid for packs not made: 0.75 × (1 − 4.615 ÷ 5) = £0.0577. Waiting: (1 − 8/13 + 1 − 7/13) × 0.25 = 0.2115.
       Contribution 30p a pack × 0.385 = £0.1154. */
    const f = balance([typed('e1', 'Op 1', 13), typed('e2', 'Op 2', 8), typed('e3', 'Op 3', 7)], { taktSec: 12 });
    const k = balanceCost(f, { ratePerHour: 15, contributionPerPack: 0.3 });
    expect(k?.constraint).toBe('Op 1');
    expect(k?.packsNow).toBeCloseTo(4.6154, 4);
    expect(k?.lost).toBeCloseTo(0.3846, 4);
    expect(k?.perPackNow).toBeCloseTo(0.1625, 4);
    expect(k?.perPackAtTakt).toBeCloseTo(0.15, 6);
    expect(k?.paidNotMade).toBeCloseTo(0.0577, 4);
    expect(k?.waiting).toBeCloseTo(0.2115, 4);
    expect(k?.contributionLost).toBeCloseTo(0.1154, 4);
    expect(balanceCostSays(k as NonNullable<typeof k>, 'bags').lines).toEqual([
      'Op 1 holds the line to 4.62 bags a minute against the 5 takt asks — 0.38 bags a minute lost.',
      'Labour: 3 people at £15.00 an hour — 16.3p a bag as it runs, 15p at takt: 1.25p a bag more because of Op 1.',
      'Each minute 5.77p of labour is paid for bags not made, and 21.2p for the others’ time waiting on Op 1; 11.5p of contribution lost.',
    ]);
  });
  it('within takt: nothing lost to the people — what the spare time costs, said instead', () => {
    /* takt 12; 10, 8, 6 s → spare shares 1/6, 1/3, 1/2 → 1 person-minute a minute × £0.25 = 25p */
    const f = balance([typed('e1', 'Op 1', 10), typed('e2', 'Op 2', 8), typed('e3', 'Op 3', 6)], { taktSec: 12 });
    const k = balanceCost(f, { ratePerHour: 15 });
    expect([k?.lost, k?.constraint, k?.paidNotMade]).toEqual([0, undefined, 0]);
    expect(k?.spare).toBeCloseTo(0.25, 6);
    expect(balanceCostSays(k as NonNullable<typeof k>).lines).toEqual([
      'The people keep up with takt: labour 15p a pack (3 people at £15.00 an hour).',
      'Each minute 25p of their time is paid with no work in it — the balance’s spare, to be taken up or taken out.',
    ]);
  });
  it('nothing claimed without the rate, the takt, or every element timed; a tray person put back into packs', () => {
    const f = balance([typed('e1', 'Op 1', 13)], { taktSec: 12 });
    expect(balanceCost(f, {})).toBeUndefined();
    expect(balanceCost(balance([typed('e1', 'Op 1', 13)], undefined), { ratePerHour: 15 })).toBeUndefined();
    expect(balanceCost(balance([typed('e1', 'Op 1', 13), { id: 'e2', order: 2, name: 'x', who: 'Op 2' }], { taktSec: 12 }), { ratePerHour: 15 })).toBeUndefined();
    /* Op 1 at the tray loader: 104 s a tray of 8 = 13 s a pack — the same constraint as above */
    const trays = balance([typed('e1', 'Op 1', 104)], { taktSec: 12, from: 'target' }, [{ id: 'c', who: 'Op 1', per: 8, unit: 'trays' }]);
    expect(balanceCost(trays, { ratePerHour: 15 })?.packsNow).toBeCloseTo(4.6154, 4);
  });
});
