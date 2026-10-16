/* AUDIT — the pounds and the shift: labour a pack, one more person, capacity
 * a shift with breaks and changeovers, the loss count's two parts, the
 * three numbers and the mix. Reference from docs/CAPACITY.md §2, §6, §7 and
 * docs/LEAN40.md's appendix (worked: £100/h over 409 bags/h = 24.4p;
 * 450 min − 126 = 324 × 100 = 32,400; 148,000 ÷ 201,600 = 73.4%;
 * £0.40 × 80 = £32 a constraint minute). */
import { describe, expect, it } from 'vitest';
import { analyse, labourCost, oneMorePerson, shiftCapacity, shiftsIn, lineSpeed, ownSpeed, type Capacity, type Station } from '../capacity';
import { burdenOf, labourPerHour, labourPerMs, ratedPerMin } from '../cost';
import { lostParts, neckOf, packsForMs, stopsTheLine } from '../lineLoss';
import { mix, threeNumbers } from '../ie/mix';

let n = 0;
const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'machine', unit, contains, ...speed, source: 'plate', ...x });
const p = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station => ({ id: `s${++n}`, name, kind: 'people', unit, contains, ...speed, source: 'timed', ...x });
let seed = 777;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

describe('AUDIT money — what a pack costs in labour', () => {
  it('8 people at £12.50 = £100 an hour; a line making 409 bags an hour costs 24.4p a bag', () => {
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 409, ratePer: 'hour' }), m('Packer', 'bags', 1, { rate: 1000, ratePer: 'hour' })] });
    const c = labourCost(r, 8, 12.5);
    expect(c?.perHour).toBe(100);
    expect(c?.packsPerHour).toBeCloseTo(409, 9);
    expect(c?.perPack).toBeCloseTo(100 / 409, 9);
    expect(Math.round((c?.perPack as number) * 1000) / 10).toBe(24.4);
  });
  it('the denominator is GOOD packs off the end — every station’s rejects off', () => {
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 60 }), m('Weigher', 'bags', 1, { rate: 100 }, { goodPct: 95 }), m('Packer', 'bags', 1, { rate: 100 }, { goodPct: 98 })] });
    const c = labourCost(r, 8, 12.5) as NonNullable<ReturnType<typeof labourCost>>;
    expect(c.packsPerHour).toBeCloseTo(60 * 0.95 * 0.98 * 60, 6);
    expect(c.perPack).toBeCloseTo(100 / (60 * 0.95 * 0.98 * 60), 9);
  });
  it('nothing until people, rate and a line are known', () => {
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 60 })] });
    expect(labourCost(r, 0, 12.5)).toBeUndefined();
    expect(labourCost(r, 8, 0)).toBeUndefined();
    expect(labourCost(analyse({ stations: [] }), 8, 12.5)).toBeUndefined();
  });
});

describe('AUDIT money — one more person at a people bottleneck', () => {
  const line = (packerSec: number, baggerRate = 70): Capacity => ({ stations: [m('Bagger', 'bags', 1, { rate: baggerRate }), p('Tray packer', 'trays', 8, { cycleSec: packerSec, perCycle: 1 }, { allowancePct: 0 })] });
  it('raises the line to what the next station allows, never past it; adds one rate an hour; compares the pack', () => {
    const cap = line(8);                                   // packer 7.5 trays = 60 bags/min; bagger 70 next
    const r = analyse(cap);
    const more = oneMorePerson(cap, r, 8, 12.5) as NonNullable<ReturnType<typeof oneMorePerson>>;
    expect(more.then.packsPerHour).toBeCloseTo(70 * 60, 9);          // capped by the bagger, not 2 × 60
    expect(more.then.people).toBe(9);
    expect(more.then.perHour).toBe(112.5);
    expect(more.then.perPack).toBeCloseTo(112.5 / 4200, 9);
    expect(more.now.perPack).toBeCloseTo(100 / 3600, 9);
    expect(more.cheaper).toBe(true);                                   // 2.68p < 2.78p
    expect(more.sentence).toContain('(Bagger then limits)');
  });
  it('cheaper iff the packs added outweigh the cost: (n+1)/n < line_after/line_before — 200 random lines', () => {
    for (let t = 0; t < 200; t++) {
      const sec = 4 + rand() * 30, bagger = 20 + rand() * 200, people = 1 + Math.floor(rand() * 12), rate = 10 + rand() * 20;
      const cap = line(sec, bagger);
      const r = analyse(cap);
      const more = oneMorePerson(cap, r, people, rate);
      if (r.limit?.station.kind !== 'people') { expect(more).toBeUndefined(); continue; }
      expect(more).toBeDefined();
      const before = r.line as number, after = more?.r.line as number;
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
      expect(after).toBeLessThanOrEqual(Math.min(bagger, 2 * before) + 1e-9);
      const cheaper = (people + 1) / people < after / before - 1e-12;
      expect(more?.cheaper).toBe(cheaper);
    }
  });
  it('never offered when the bottleneck is a machine', () => {
    const cap: Capacity = { stations: [m('Bagger', 'bags', 1, { rate: 50 }), p('Packer', 'trays', 8, { cycleSec: 5, perCycle: 1 })] };
    expect(oneMorePerson(cap, analyse(cap), 8, 12.5)).toBeUndefined();
  });
});

describe('AUDIT money — capacity a shift', () => {
  const r100 = () => analyse({ stations: [m('Bagger', 'bags', 1, { rate: 100 }), m('Packer', 'bags', 1, { rate: 150 })] });
  it('the doc: 8 h less 30 min is 450; 3 × 42 take 126; 324 × 100 = 32,400 — 45,000 if it never changed over', () => {
    const c = shiftCapacity(r100(), [{ name: 'Days', min: 480, breakMin: 30 }], { min: 42, perShift: 3, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    const row = c.rows[0];
    expect(row.planned).toBe(450); expect(row.changeoverMin).toBe(126); expect(row.making).toBe(324);
    expect(row.made).toBeCloseTo(32400, 9); expect(row.without).toBeCloseTo(45000, 9);
    expect(c.sentence).toBe('A shift of 8 h, less 30 min of breaks the line stops for, is 450 min; 3 changeovers of 42 min (the standard) take 126 min — 324 min making. At Bagger’s 100 bags a minute that is 32,400 bags a shift — 45,000 if it never changed over.');
    expect(c.short).toBe('32,400 bags a shift — 126 of 450 min changing over');
  });
  it('the rate is good off the end: packers keeping 95% → 30,780, said; a weigher rejecting BEFORE the Bagger changes nothing it makes', () => {
    const r = analyse({ stations: [m('Weigher', 'bags', 1, { rate: 200 }, { goodPct: 98 }), m('Bagger', 'bags', 1, { rate: 100 }), m('Packer', 'bags', 1, { rate: 150 }, { goodPct: 95 })] });
    expect(ownSpeed(r.limit!)).toBe(100);
    const c = shiftCapacity(r, [{ name: 'Days', min: 480, breakMin: 30 }], { min: 42, perShift: 3, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(c.rows[0].made).toBeCloseTo(324 * 95, 6);
    expect(c.sentence).toContain('At Bagger’s 100 bags a minute (95 good off the end of the line) that is 30,780 bags a shift');
  });
  it('a break not said, a changeover not counted, no changeover timed: left out and said so', () => {
    const noBreak = shiftCapacity(r100(), [{ name: 'Days', min: 480 }], { min: 42, perShift: 3, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(noBreak.rows[0].planned).toBeUndefined(); expect(noBreak.rows[0].made).toBeUndefined(); expect(noBreak.day).toBeUndefined();
    expect(noBreak.sentence).toContain('Days: the breaks are not said on the line’s settings, so no capacity is worked out for it.');
    const noCount = shiftCapacity(r100(), [{ name: 'Days', min: 480, breakMin: 30 }], { min: 42, agreed: false }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(noCount.rows[0].made).toBeCloseTo(45000, 9); expect(noCount.rows[0].changeoverMin).toBeUndefined();
    expect(noCount.sentence).toContain('how many a shift is not said on the SMED — none comes off until it is');
    const none = shiftCapacity(r100(), [{ name: 'Days', min: 480, breakMin: 30 }]) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(none.rows[0].made).toBeCloseTo(45000, 9);
    expect(none.sentence).toContain('No changeover is timed into this product yet');
    expect(none.short).toBe('45,000 bags a shift, changeovers not counted');
  });
  it('totals reconcile: Σ made = Σ (shift − breaks − changeovers) × good rate, three shifts that differ, overnight included', () => {
    const shifts = shiftsIn([{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Lates', start: '14:00', end: '22:00', breakMin: 45 }, { name: 'Nights', start: '22:00', end: '06:00', relief: true }]);
    expect(shifts.map(s => [s.min, s.breakMin])).toEqual([[480, 30], [480, 45], [480, 0]]);
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 100 }), m('Packer', 'bags', 1, { rate: 150 }, { goodPct: 95 })] });
    const c = shiftCapacity(r, shifts, { min: 24, perShift: 2, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    const expected = [450 - 48, 435 - 48, 480 - 48].map(mk => mk * 95);
    expect(c.rows.map(x => x.made)).toEqual(expected.map(v => expect.closeTo(v, 6)));
    expect(c.day?.made).toBeCloseTo(expected.reduce((a, b) => a + b, 0), 6);
    expect(c.day?.changeoverMin).toBe(144);
    expect(c.day?.without).toBeCloseTo((450 + 435 + 480) * 95, 6);
  });
  it('changeovers never exceed the planned minutes; a changeover never also comes off a station’s running share', () => {
    const c = shiftCapacity(r100(), [{ name: 'Short', min: 60, breakMin: 10 }], { min: 42, perShift: 3, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(c.rows[0].changeoverMin).toBe(50); expect(c.rows[0].making).toBe(0); expect(c.rows[0].made).toBe(0);
    /* the rate is the bottleneck's effective (its running % in it); the changeover comes off time — the two never overlap */
    const r = analyse({ stations: [m('Bagger', 'bags', 1, { rate: 100 }, { runningPct: 90 }), m('Packer', 'bags', 1, { rate: 150 })] });
    const d = shiftCapacity(r, [{ name: 'Days', min: 480, breakMin: 30 }], { min: 42, perShift: 3, agreed: true }) as NonNullable<ReturnType<typeof shiftCapacity>>;
    expect(d.rows[0].made).toBeCloseTo(324 * 90, 6);
  });
});

describe('AUDIT money — the loss count’s two parts (lib/lineLoss, lib/cost)', () => {
  const w = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100 };
  it('£/h of idle labour = crew × wage × on-costs; the on-costs default to 1, never 0', () => {
    expect(labourPerHour(w)).toBeCloseTo(4 * 14.5 * 1.3, 9);
    expect(labourPerHour({ ...w, labourBurden: undefined })).toBeCloseTo(58, 9);
    expect(burdenOf({ labourBurden: 0 })).toBe(1);
    expect(labourPerMs(w)).toBeCloseTo(75.4 / 3_600_000, 15);
    expect(labourPerHour({ crew: 0, labourRatePerHour: 14.5 })).toBe(0);
    expect(ratedPerMin({ packsPerMin: 0 })).toBeUndefined();
  });
  it('a stop on the bottleneck, the whole line or no machine costs packs; a stop elsewhere costs labour only', () => {
    const neck = { names: ['Bagger'] };
    const rows = [{ durationMs: 10 * 60_000, asset: 'Bagger' }, { durationMs: 5 * 60_000, asset: 'Palletiser' }, { durationMs: 3 * 60_000, asset: '' }];
    const parts = lostParts(rows, w, neck);
    expect(parts.labour).toBeCloseTo((18 / 60) * 75.4, 9);
    expect(parts.packs).toBeCloseTo(13 * 100, 9);
    expect(parts.neckKnown).toBe(true);
    expect(stopsTheLine({ asset: 'palletiser' }, neck)).toBe(false);
    expect(stopsTheLine({ asset: 'BAGGER ' }, neck)).toBe(true);
    /* the bottleneck unknown: every stop counted, said so */
    const all = lostParts(rows, w, undefined);
    expect(all.packs).toBeCloseTo(18 * 100, 9); expect(all.neckKnown).toBe(false);
    /* no rate: no packs; no crew: no labour */
    expect(lostParts(rows, { ...w, packsPerMin: undefined }, neck).packs).toBeUndefined();
    expect(lostParts(rows, { ...w, crew: undefined }, neck).labour).toBeUndefined();
    /* a span's packs: at the share of the time that stopped the line */
    expect(packsForMs(60 * 60_000, rows, w, neck)).toBeCloseTo(60 * (13 / 18) * 100, 6);
  });
  it('the bottleneck the loss count names is the product’s Line capacity limit once stops count', () => {
    const cap: Capacity = { stations: [m('Bagger', 'bags', 1, { rate: 100 }), m('Palletiser', 'bags', 1, { rate: 120 }, { runningPct: 80 })] };
    const necks = neckOf([{ workspaceId: 'w1', capacity: cap }], 'w1');
    expect(necks?.names).toEqual(['Palletiser']);
    /* QUESTION C-q2: the loss count's RATE is the line's typed packsPerMin; Line capacity's own rate (lineSpeed) is the slowest on SPEED alone — the Bagger */
    expect(lineSpeed(cap)?.station).toBe('Bagger');
    expect(lineSpeed(cap)?.perMin).toBe(100);
  });
  it('lineSpeed: a plate machine or a timed/standard person; nothing for a guess or a timed machine', () => {
    expect(lineSpeed({ stations: [m('B', 'bags', 1, { rate: 100 }), m('T', 'bags', 1, { rate: 90 }, { source: 'timed' })] })).toBeUndefined();
    expect(lineSpeed({ stations: [m('B', 'bags', 1, { rate: 100 }), p('P', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: 'estimate' })] })).toBeUndefined();
    const t = lineSpeed({ stations: [m('B', 'bags', 1, { rate: 100 }), p('P', 'trays', 8, { cycleSec: 8, perCycle: 1 }, { source: 'timed' })] });
    expect(t?.from).toBe('person'); expect(t?.perMin).toBeCloseTo((60 / 8 / 1.09) * 8, 9);
    /* a weigher rejecting before it never adds to it */
    expect(lineSpeed({ stations: [m('W', 'bags', 1, { rate: 200 }, { goodPct: 98 }), m('B', 'bags', 1, { rate: 100 })] })?.perMin).toBe(100);
  });
});

describe('AUDIT money — the three numbers and the mix (lib/ie/mix)', () => {
  it('design 201,600, effective 175,000, actual 148,000: utilisation 73.4%, efficiency 84.6%; loading = demand ÷ effective', () => {
    const t = threeNumbers({ ratePerMin: 201600 / 2400, plannedMin: 2400, plannedLossMin: 2400 - 175000 / 84, actualPacks: 148000, demandPacks: 161000 });
    expect(t.design).toBeCloseTo(201600, 6);
    expect(t.effective).toBeCloseTo(175000, 6);
    expect(t.utilisation).toBeCloseTo(0.734, 3);
    expect(t.efficiency).toBeCloseTo(0.846, 3);
    expect(t.loading).toBeCloseTo(161000 / 175000, 9);
    expect(t.sentence).toContain('73% of design, 85% of what it can really make');
    const over = threeNumbers({ ratePerMin: 100, plannedMin: 400, plannedLossMin: 500 });
    expect(over.effective).toBe(0); expect(over.utilisation).toBeUndefined(); expect(over.loading).toBeUndefined();
  });
  it('A earns £0.40 × 80 = £32 a constraint minute, B £0.60 × 40 = £24 — A first; the week filled in that order', () => {
    const r = mix([{ id: 'b', name: 'B', marginPerPack: 0.6, demandPerWeek: 48000, perConstraintMin: 40 }, { id: 'a', name: 'A', marginPerPack: 0.4, demandPerWeek: 96000, perConstraintMin: 80 }], 2000);
    expect(r.rows.map(x => [x.product.name, x.perMin])).toEqual([['A', 32], ['B', 24]]);
    expect(r.rows[0].minutesNeeded).toBe(1200); expect(r.rows[1].minutesNeeded).toBe(1200);
    expect(r.rows[0].minutesGiven).toBe(1200); expect(r.rows[1].minutesGiven).toBe(800);
    expect(r.rows[0].made).toBe(96000); expect(r.rows[0].unmade).toBe(0);
    expect(r.rows[1].made).toBe(32000); expect(r.rows[1].unmade).toBe(16000);
    expect(r.fill).toBeCloseTo(1.2, 9);
    expect(r.sentence).toBe('A earns £32 a constraint minute, B £24 — A first. The week is full at 120% of it asked; 16,000 of B unmade.');
  });
  it('BUG C-b4: a product given its whole demand’s minutes can still show 1 unmade — floor on a float (15 ÷ 11 × 11 = 14.999…)', () => {
    const r = mix([{ id: 'a', name: 'A', marginPerPack: 0.4, demandPerWeek: 15, perConstraintMin: 11 }], 2000);
    expect(r.fill).toBeLessThan(1);
    expect(r.sentence).toContain('everything is made');
    /* the reference: minutesGiven = minutesNeeded, so made = demand, unmade 0 */
    expect(r.rows[0].made).toBe(15);
    expect(r.rows[0].unmade).toBe(0);
  });
  it('no minutes on the constraint: nothing is made, said; a product short of a figure is skipped by name', () => {
    const r = mix([{ id: 'a', name: 'A', marginPerPack: 0.4, demandPerWeek: 100, perConstraintMin: 80 }, { id: 'b', name: 'B', marginPerPack: 0.4, demandPerWeek: 100 }], 0);
    expect(r.rows[0].made).toBe(0); expect(r.rows[0].unmade).toBe(100);
    expect(r.sentence).toMatch(/^The constraint has no minutes in the week yet/);
    expect(r.skipped[0].why).toBe('no speed on the constraint yet');
  });
});
