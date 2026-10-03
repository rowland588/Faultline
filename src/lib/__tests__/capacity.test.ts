/* WHERE A LINE IS LIMITED, AS ARITHMETIC.
 *
 * The line every number here comes from is worked by hand, because a capacity
 * calculation that is not checked against paper looks exactly as convincing
 * wrong as right:
 *
 *   Bagger       70 bags a minute.
 *   Basketer     12 bags to a basket, 5.5 baskets a minute      = 66   bags/min
 *   Carrier      a person, 2 baskets every 20 s  = 6 baskets/min = 72   bags/min
 *   Palletiser   40 baskets to a pallet, 8 pallets an hour
 *                = 0.1333 pallets/min × 40 × 12 = 64 bags/min
 *
 * So the palletiser limits at 64, the basketer is next at 66, and fixing the
 * palletiser can give 2 more at the very most. */
import { describe, it, expect } from 'vitest';
import {
  analyse, blankStation, shortSays, capacityPlan, capacityReport, CAP_REPORT_ROWS, crossCheck, fmtN, isWaiting, lineIfRaised, perMinute, stopStats, suggestRunning,
  type Capacity, type Station,
} from '../capacity';
import type { Observation } from '../../types';

let n = 0;
const st = (o: Partial<Station> & { name: string; unit: string }): Station =>
  ({ id: `s${++n}`, kind: 'machine', contains: 1, ratePer: 'min', ...o });

const bagger = () => st({ name: 'Bagger', unit: 'bags', rate: 70 });
const basketer = (o: Partial<Station> = {}) => st({ name: 'Basketer', unit: 'baskets', contains: 12, rate: 5.5, ...o });
const carrier = (o: Partial<Station> = {}) => st({ name: 'Carrier', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 20, perCycle: 2, ...o });
const palletiser = (o: Partial<Station> = {}) => st({ name: 'Palletiser', unit: 'pallets', contains: 40, rate: 8, ratePer: 'hour', ...o });
const line = (o: Partial<Capacity> = {}, ...s: Station[]): Capacity => ({ stations: s, ...o });

describe('a speed, whichever way it is typed', () => {
  it('takes per minute, per second and per hour', () => {
    expect(perMinute(st({ name: 'a', unit: 'x', rate: 70 }))).toBe(70);
    expect(perMinute(st({ name: 'a', unit: 'x', rate: 2, ratePer: 'sec' }))).toBe(120);
    expect(perMinute(st({ name: 'a', unit: 'x', rate: 120, ratePer: 'hour' }))).toBe(2);
  });
  it('takes a cycle: this many every this many seconds', () => {
    expect(perMinute(carrier())).toBe(6);                                   // 2 every 20 s
    expect(perMinute(st({ name: 'a', unit: 'x', cycleSec: 90, perCycle: 1 }))).toBeCloseTo(0.6667, 4);
  });
  it('has no speed until it has one that can be used', () => {
    expect(perMinute(st({ name: 'a', unit: 'x' }))).toBeUndefined();
    expect(perMinute(st({ name: 'a', unit: 'x', rate: 0 }))).toBeUndefined();
    expect(perMinute(st({ name: 'a', unit: 'x', cycleSec: 20 }))).toBeUndefined();
  });
});

describe('the worked line', () => {
  const r = analyse(line({}, bagger(), basketer(), carrier(), palletiser()));

  it('puts every station in the line’s own unit — bags', () => {
    expect(r.unit).toBe('bags');
    expect(r.ok.map(x => x.factor)).toEqual([1, 12, 12, 480]);
    expect(r.ok.map(x => Math.round(x.running * 100) / 100)).toEqual([70, 66, 72, 64]);
  });

  it('shows the chain of units, so a wrong conversion can be seen', () => {
    expect(r.ok.map(x => x.chain)).toEqual(['', 'baskets · 12 bags each', 'baskets · 12 bags each', 'pallets · 480 bags each']);
  });

  it('names the palletiser as the limit, the basketer as next, and what fixing it can give', () => {
    expect(r.limit?.station.name).toBe('Palletiser');
    expect(r.next?.station.name).toBe('Basketer');
    expect(r.line).toBeCloseTo(64, 6);
    expect(r.liftAtMost).toBeCloseTo(2, 6);
  });

  it('says how loaded everything else is at the line’s pace', () => {
    expect(r.ok.map(x => Math.round(x.loadAtLine * 100))).toEqual([91, 97, 89, 100]);   // 64/70, 64/66, 64/72, 64/64
    expect(r.ok.map(x => Math.round(x.headroom * 10) / 10)).toEqual([6, 2, 8, 0]);
  });

  it('says it in one sentence', () => {
    expect(r.sentence).toBe('Palletiser limits the line at 64 bags/min. Basketer is next at 66, so fixing Palletiser lifts the line by 2 at most.');
  });
});

describe('more than one of something', () => {
  it('a crew multiplies a station: two carriers do twice the baskets', () => {
    const r = analyse(line({}, bagger(), basketer(), carrier({ crew: 2 }), palletiser()));
    expect(r.ok[2].running).toBeCloseTo(144, 6);
  });
  it('a fraction of a crew is allowed, but not none', () => {
    const r = analyse(line({}, bagger(), basketer({ crew: 0 })));
    expect(r.skipped[0].why).toMatch(/crew/);
  });
});

describe('stops are not speed', () => {
  it('counts stops once a running percentage is given, and says it is the stops', () => {
    const r = analyse(line({}, bagger(), basketer({ runningPct: 90 }), carrier(), palletiser()));
    // basketer 66 × 0.9 = 59.4 now limits; on speed alone the palletiser is still slowest
    expect(r.limit?.station.name).toBe('Basketer');
    expect(r.line).toBeCloseTo(59.4, 6);
    expect(r.limitAtRunning?.station.name).toBe('Palletiser');
    expect(r.sentence).toContain('On speed alone Palletiser is the slowest — it is Basketer’s stops that pull the line down.');
  });
  it('says what losing the limit’s stops would give, capped by the next', () => {
    const r = analyse(line({}, bagger(), basketer({ runningPct: 90 }), carrier(), palletiser()));
    // basketer back to 66, but the palletiser (64) would then limit: 64 − 59.4
    expect(r.liftNoStops).toBeCloseTo(4.6, 6);
  });
  it('with no running percentages, speed alone decides', () => {
    const r = analyse(line({}, bagger(), basketer(), palletiser()));
    expect(r.limit?.station.name).toBe('Palletiser');
    expect(r.limitAtRunning?.station.name).toBe('Palletiser');
  });
});

describe('rejects', () => {
  it('everything after a station that rejects sees less, so its capacity counts back to the start', () => {
    // basketer rejects 5% → carrier and palletiser only ever see 95%
    const r = analyse(line({}, bagger(), basketer({ goodPct: 95 }), carrier(), palletiser()));
    expect(r.ok[2].running).toBeCloseTo(72 / 0.95, 6);
    expect(r.ok[3].running).toBeCloseTo(64 / 0.95, 6);
    // the basketer itself still handles everything that arrives
    expect(r.ok[1].running).toBeCloseTo(66, 6);
    expect(r.limit?.station.name).toBe('Basketer');
    expect(r.line).toBeCloseTo(66, 6);
  });
  it('good product out of the end is the line pace after every station’s rejects', () => {
    const r = analyse(line({}, bagger(), basketer({ goodPct: 95 }), carrier({ goodPct: 98 }), palletiser()));
    expect(r.goodOut).toBeCloseTo((r.line as number) * 0.95 * 0.98, 6);
  });
});

describe('the target', () => {
  it('says how far short, and names the limit', () => {
    const r = analyse(line({ targetPerMin: 68 }, bagger(), basketer(), carrier(), palletiser()));
    expect(r.gap).toBeCloseTo(4, 6);
    expect(r.sentence).toContain('Palletiser limits the line at 64 bags/min, 4 short of the 68 target.');
  });
  it('says capacity is not the problem when the line is above target', () => {
    const r = analyse(line({ targetPerMin: 60 }, bagger(), basketer(), carrier(), palletiser()));
    expect(r.gap).toBeCloseTo(-4, 6);
    expect(r.sentence).toContain('above the 60 target');
    expect(r.sentence).toContain('Capacity is not what holds this line back');
  });
});

describe('what an improvement is worth', () => {
  const r = analyse(line({}, bagger(), basketer(), carrier(), palletiser()));
  it('raising the limit is capped by whatever limits next', () => {
    expect(lineIfRaised(r, 3, 80)).toBeCloseTo(66, 6);      // palletiser to 80 → basketer takes over at 66
    expect(lineIfRaised(r, 3, 65)).toBeCloseTo(65, 6);
  });
  it('raising something that is not the limit gives nothing', () => {
    expect(lineIfRaised(r, 0, 200)).toBeCloseTo(64, 6);
  });
});

describe('a chain that cannot be counted is said so, never guessed', () => {
  it('a station with no speed is left out and named', () => {
    const r = analyse(line({}, bagger(), basketer({ rate: undefined }), palletiser()));
    expect(r.ok.map(x => x.station.name)).toEqual(['Bagger', 'Palletiser']);
    expect(r.skipped[0]).toMatchObject({ index: 1 });
    expect(r.skipped[0].why).toBe('it has no speed yet');
    expect(r.sentence).toContain('1 station not counted yet');
  });
  it('a missing conversion breaks the chain: everything after it is held back', () => {
    const r = analyse(line({}, bagger(), basketer({ contains: 0 }), carrier(), palletiser()));
    expect(r.ok.map(x => x.station.name)).toEqual(['Bagger']);
    expect(r.skipped.map(x => x.station.name)).toEqual(['Basketer', 'Carrier', 'Palletiser']);
    expect(r.skipped[1].why).toMatch(/chain of units breaks at Basketer/);
  });
  it('nothing counted gives a sentence that says what to do', () => {
    expect(analyse(line({})).sentence).toMatch(/^Add the stations/);
    expect(analyse(line({}, st({ name: 'x', unit: 'a' }))).sentence).toMatch(/None of the stations can be counted/);
  });
  it('one station is not a comparison, and says so', () => {
    expect(analyse(line({}, bagger())).sentence).toBe('Only Bagger is counted so far, at 70 bags/min — add the other stations to see which one limits the line.');
  });
});

describe('level stations', () => {
  it('two stations within one percent are level, not a winner and a runner-up', () => {
    const sealer = st({ name: 'Sealer', unit: 'bags', rate: 70.4 });
    const r = analyse(line({}, bagger(), sealer));
    expect(r.sentence).toContain('Bagger and Sealer are level at 70 bags/min.');
    expect(r.sentence).not.toContain('lifts the line');
  });
  it('a clear gap is a winner and a runner-up', () => {
    const r = analyse(line({}, bagger(), st({ name: 'Sealer', unit: 'bags', rate: 80 })));
    expect(r.sentence).toContain('Bagger limits the line at 70 bags/min.');
  });
});

describe('hints on the conversions', () => {
  it('"1 basket = 1 bag" between two different words is probably a missing number', () => {
    const r = analyse(line({}, bagger(), basketer({ contains: 1 })));
    expect(r.notes[0]).toMatch(/Basketer: its baskets are counted one-for-one with the bags before/);
  });
  it('the same word twice with a conversion other than 1 is probably a slip', () => {
    const r = analyse(line({}, bagger(), st({ name: 'Wrapper', unit: 'bags', contains: 12, rate: 70 })));
    expect(r.notes[0]).toMatch(/counts in bags like the one before/);
  });
  it('a clean chain has no hints', () => {
    expect(analyse(line({}, bagger(), basketer(), carrier(), palletiser())).notes).toEqual([]);
  });
});

describe('numbers said the way a person says them', () => {
  it('no trailing zeros, sensible rounding', () => {
    expect(fmtN(64)).toBe('64');
    expect(fmtN(66.5)).toBe('66.5');
    expect(fmtN(59.4)).toBe('59.4');
    expect(fmtN(0.1333)).toBe('0.13');
    expect(fmtN(123.456)).toBe('123');
    expect(fmtN(4.6000001)).toBe('4.6');
  });
});

/* ------------------------- stops from the timed log ------------------------ */

const DAY = 86_400_000;
const obs = (o: Partial<Observation> & { asset: string; durationMs: number }): Observation => ({
  id: `o${++n}`, workspaceId: 'w', category: 'Breakdown', startedAt: 10 * DAY, timing: 'stopwatch', count: 1, media: [], createdAt: 1, updatedAt: 1, ...o,
});
const MIN = 60_000;

describe('stops, own and waiting kept apart', () => {
  it('waiting and starved/blocked are not the station’s own fault', () => {
    expect(isWaiting({ category: 'Waiting' })).toBe(true);
    expect(isWaiting({ category: 'Minor stop', subcategory: 'Starved upstream' })).toBe(true);
    expect(isWaiting({ category: 'Minor stop', subcategory: 'Blocked downstream' })).toBe(true);
    expect(isWaiting({ category: 'Breakdown', subcategory: 'Mechanical' })).toBe(false);
  });

  const a = basketer(), b = palletiser();
  const log = [
    obs({ asset: 'Basketer', durationMs: 20 * MIN }),
    obs({ asset: 'basketer ', durationMs: 10 * MIN, count: 3 }),
    obs({ asset: 'Basketer', durationMs: 40 * MIN, category: 'Waiting', subcategory: 'Blocked downstream' }),
    obs({ asset: 'Palletiser', durationMs: 5 * MIN }),
    obs({ asset: 'Somewhere else', durationMs: 99 * MIN }),
    obs({ asset: 'Basketer', durationMs: 99 * MIN, startedAt: 50 * DAY }),     // outside the window
    obs({ asset: 'Basketer', durationMs: 0 }),                                  // a count, not a stop
  ];
  const stats = stopStats(log, [a, b], 0, 28 * DAY);

  it('totals each station’s minutes by name, ignoring case, space and other machines', () => {
    expect(stats[a.id]).toEqual({ ownMins: 30, waitMins: 40, events: 5 });
    expect(stats[b.id]).toEqual({ ownMins: 5, waitMins: 0, events: 1 });
  });
  it('matches on the machine name the stops were logged under, when it is not the station’s name', () => {
    const c = basketer({ asset: 'Somewhere else' });
    expect(stopStats(log, [c], 0, 28 * DAY)[c.id].ownMins).toBe(99);
  });
});

describe('a running percentage, suggested and never assumed', () => {
  it('is the share of planned time not lost to the station’s own stops', () => {
    // 40 h a week over 4 weeks = 9600 min; 480 min lost = 5%
    expect(suggestRunning(480, 40, 4)).toBe(95);
  });
  it('offers nothing without planned hours, without stops, or with a nonsense window', () => {
    expect(suggestRunning(480, undefined, 4)).toBeUndefined();
    expect(suggestRunning(0, 40, 4)).toBeUndefined();
    expect(suggestRunning(480, 40, 0)).toBeUndefined();
  });
  it('never goes below nothing', () => {
    expect(suggestRunning(99999, 1, 1)).toBe(0);
  });
});

describe('the cross-check: the real bottleneck is never the one waiting', () => {
  const stations = [bagger(), basketer({ runningPct: 90 }), carrier(), palletiser()];
  const r = analyse(line({}, ...stations));       // the sums say Basketer
  const [bag, bas, , pal] = stations;
  const mk = (rows: Record<string, [number, number]>) =>
    Object.fromEntries(stations.map(s => [s.id, { ownMins: rows[s.id]?.[0] ?? 0, waitMins: rows[s.id]?.[1] ?? 0, events: 1 }]));

  it('flags a limit that spends its time waiting while another hardly does', () => {
    const msg = crossCheck(r, mk({ [bag.id]: [10, 5], [bas.id]: [30, 120], [pal.id]: [60, 8] }));
    expect(msg).toMatch(/Basketer comes out as the limit, but it spent 120 min waiting/);
    expect(msg).toMatch(/worth checking Bagger’s speed/);
  });
  it('says nothing when the limit is the one that never waits', () => {
    expect(crossCheck(r, mk({ [bag.id]: [10, 90], [bas.id]: [30, 5], [pal.id]: [60, 80] }))).toBeUndefined();
  });
  it('says nothing without stops logged against at least two stations', () => {
    expect(crossCheck(r, mk({ [bas.id]: [30, 120] }))).toBeUndefined();
  });
  it('says nothing when the waiting is small', () => {
    expect(crossCheck(r, mk({ [bag.id]: [10, 0], [bas.id]: [30, 20], [pal.id]: [60, 0] }))).toBeUndefined();
  });
});

describe('a new station', () => {
  it('starts with the line’s own unit if it is first, and nothing guessed if not', () => {
    expect(blankStation('x', 'machine', true)).toMatchObject({ unit: 'units', contains: 1 });
    expect(blankStation('y', 'people', false)).toMatchObject({ unit: '', kind: 'people' });
  });
});

describe('the finding in a few words', () => {
  it('names the limit, the pace, and how far from target', () => {
    const r = analyse(line({ targetPerMin: 68 }, bagger(), basketer(), carrier(), palletiser()));
    expect(shortSays(r)).toBe('Palletiser limits at 64 bags/min · 4 short of 68');
  });
  it('says when the target is met', () => {
    expect(shortSays(analyse(line({ targetPerMin: 60 }, bagger(), basketer(), carrier(), palletiser())))).toBe('Palletiser limits at 64 bags/min · target 60 met');
  });
  it('says there is more to add when only one station is counted', () => {
    expect(shortSays(analyse(line({}, bagger())))).toBe('Bagger runs 70 bags/min — add the rest of the line');
  });
  it('says nothing when nothing can be counted', () => {
    expect(shortSays(analyse(line({})))).toBeUndefined();
  });
});

/* ------------------------------ the client report ------------------------------ */

describe('the report block', () => {
  const worked = line({ targetPerMin: 66 }, bagger(), basketer(), carrier(), palletiser());
  const lineRow = (name: string, capacity?: Capacity) => ({ name, owner: 'Rob', capacity });

  it('carries each counted line’s ladder, the same sentence as the screen, and one shared scale', () => {
    const rep = capacityReport([lineRow('Line 2A', worked)]);
    const l = rep?.lines[0];
    expect(l?.sentence).toBe(analyse(worked).sentence);
    expect(l?.rows.map(r => [r.name, Math.round(r.effective * 10) / 10, r.limit])).toEqual([
      ['Bagger', 70, false], ['Basketer', 66, false], ['Carrier', 72, false], ['Palletiser', 64, true],
    ]);
    expect(l?.top).toBeCloseTo(72 * 1.06, 6);
  });
  it('leaves out a line with nothing to say, so it costs no page', () => {
    expect(capacityReport([lineRow('A'), lineRow('B', line({}, bagger())), lineRow('C', line({}, bagger(), basketer({ rate: undefined })))])).toBeUndefined();
  });
  it('keeps the target on the scale even when every bar is shorter', () => {
    const l = capacityReport([lineRow('A', line({ targetPerMin: 100 }, bagger(), basketer()))])?.lines[0];
    expect(l?.top).toBeCloseTo(100 * 1.06, 6);
  });
  it('says how many stations it left off a very long line', () => {
    const many = Array.from({ length: 21 }, (_, i) => st({ name: `S${i}`, unit: 'bags', rate: 50 + i }));
    const l = capacityReport([lineRow('Long', line({}, ...many))])?.lines[0];
    expect(l?.rows).toHaveLength(CAP_REPORT_ROWS);
    expect(l?.more).toBe(3);
  });
  it('packs lines onto sheets without splitting one', () => {
    const four = line({}, bagger(), basketer(), carrier(), palletiser());      // costs 3 + 4 = 7 rows
    const rep = capacityReport([1, 2, 3, 4, 5].map(i => lineRow(`L${i}`, four)));
    expect(capacityPlan(rep as NonNullable<typeof rep>)).toEqual([[0, 1, 2], [3, 4]]);   // 7 × 3 = 21, a fourth would make 28 > 26
  });
});

/* ---- what arrives, what-ifs, make it so (3 October) ---- */
import { changedWords, compareSays, makeItSoWords, whatIfCapacity, type WhatIf } from '../capacity';

/* 70 bags a minute; 8 bags to a basket; 40 baskets to a pallet (320 bags).
   Basketer: 5.5 baskets/min = 44 bags/min — the limit. Palletiser: 20 pallets
   an hour = 0.33/min = 106.7 bags/min — plenty. */
const chain: Station[] = [
  { id: 'a', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min' },
  { id: 'b', name: 'Basketer', kind: 'machine', unit: 'baskets', contains: 8, rate: 5.5, ratePer: 'min' },
  { id: 'c', name: 'Palletiser', kind: 'machine', unit: 'pallets', contains: 40, rate: 20, ratePer: 'hour' },
];

describe('what arrives at each station, in its own unit', () => {
  const r = analyse({ stations: chain });
  it('70 bags a minute and 8 to a basket is 8.75 baskets a minute arriving', () => {
    const b = r.ok[1];
    expect(b.arrives).toBeCloseTo(8.75, 5);
    expect(b.does).toBeCloseTo(5.5, 5);
    expect(b.feed).toBe('8.8 baskets a minute arrive · it does 5.5 — holds the line back');
  });
  it('the front of the line has nothing arriving and says what it does', () => {
    expect(r.ok[0].arrives).toBeUndefined();
    expect(r.ok[0].feed).toBe('the front of the line · it does 70 bags a minute');
  });
  it('downstream of the limit, what arrives is what the limit lets through', () => {
    // 5.5 baskets/min reach the palletiser; 40 to a pallet → 0.1375 pallets/min arrive; it does 0.33
    const p = r.ok[2];
    expect(p.arrives).toBeCloseTo(0.1375, 5);
    expect(p.does).toBeCloseTo(20 / 60, 5);
    expect(p.feed).toBe('0.14 pallets a minute arrive · it does 0.33 — keeps up, 0.2 to spare');
  });
  it('a station that keeps up says what it has to spare', () => {
    const fast = analyse({ stations: [chain[0], { ...chain[1], rate: 12 }] });
    expect(fast.ok[1].feed).toBe('8.8 baskets a minute arrive · it does 12 — keeps up, 3.3 to spare');
  });
  it('rejects before a station thin what arrives', () => {
    const rej = analyse({ stations: [{ ...chain[0], goodPct: 90 }, chain[1]] });
    expect(rej.ok[1].arrives).toBeCloseTo((70 * 0.9) / 8, 5);
  });
});

describe('a what-if beside the line', () => {
  const asRun = { targetPerMin: 60, stations: chain };
  const base = analyse(asRun);
  it('says what changed, by station, in words', () => {
    const w: Station[] = [chain[0], { ...chain[1], name: 'New basketer', rate: 9 }, { ...chain[2], contains: 48 }];
    expect(changedWords(chain, w)).toEqual([
      'Basketer → New basketer: 5.5 baskets a minute → 9 baskets a minute',
      'Palletiser: 48 to a pallet instead of 40',
    ]);
    expect(changedWords(chain, [...chain, { id: 'd', name: 'Checker', kind: 'people', unit: 'pallets', contains: 1, rate: 2, ratePer: 'min' }])).toEqual(['+ Checker (2 pallets a minute)']);
    expect(changedWords(chain, chain.slice(0, 2))).toEqual(['− Palletiser']);
  });
  it('compares: the limit moves and the number says by how much', () => {
    const w: WhatIf = { id: 'w', name: 'New basketer', createdAt: 0, stations: [chain[0], { ...chain[1], rate: 9 }, chain[2]] };
    const says = compareSays(base, analyse(whatIfCapacity(asRun, w)), w.name);
    expect(says).toBe('With New basketer, the line would do 70 bags/min instead of 44 (+26). Basketer no longer limits it; Bagger does. That meets the 60 target.');
  });
  it('a what-if that changes nothing says so', () => {
    const w: WhatIf = { id: 'w', name: 'Faster palletiser', createdAt: 0, stations: [chain[0], chain[1], { ...chain[2], rate: 60 }] };
    expect(compareSays(base, analyse(whatIfCapacity(asRun, w)), w.name)).toBe('Faster palletiser changes nothing the line can do: still 44 bags/min, limited by Basketer.');
  });
  it('a what-if can be worse, and says so', () => {
    const w: WhatIf = { id: 'w', name: 'Smaller baskets', createdAt: 0, stations: [chain[0], { ...chain[1], contains: 6 }, chain[2]] };
    expect(compareSays(base, analyse(whatIfCapacity(asRun, w)), w.name)).toBe('With Smaller baskets, the line would do 33 bags/min — 11 less than now. Basketer would limit it. Still 27 short of the 60 target.');
  });
  it('the report carries each what-if and its sentence beside the line', () => {
    const w: WhatIf = { id: 'w', name: 'New basketer', createdAt: 0, stations: [chain[0], { ...chain[1], rate: 9 }, chain[2]], action: { id: 'a1', raisedAt: 1 } };
    const rep = capacityReport([{ name: 'Line 2A', capacity: { ...asRun, whatIfs: [w] } }]);
    expect(rep?.lines[0].whatIfs).toEqual([{ name: 'New basketer', says: expect.stringMatching(/^With New basketer/), onBoard: true }]);
    expect(rep?.lines[0].rows[1].feed).toBe('8.8 baskets a minute arrive · it does 5.5 — holds the line back');
  });
  it('make it so carries the prediction onto the board as the why', () => {
    const w: WhatIf = { id: 'w', name: 'New basketer', createdAt: 0, stations: chain };
    const a = makeItSoWords('Line 2A', w, ['Basketer: 5.5 → 9 baskets a minute'], 'With New basketer, the line would do 70 bags/min instead of 44 (+26).');
    expect(a.what).toBe('Make it so on Line 2A: New basketer');
    expect(a.where).toBe('Basketer: 5.5 → 9 baskets a minute');
    expect(a.why).toMatch(/^Predicted on the line balance — With New basketer/);
  });
});
