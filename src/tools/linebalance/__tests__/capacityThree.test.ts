/* CAPACITY'S THREE NUMBERS (FC-041), proved on cases worked by hand and by a second implementation
 * (scripts/knowledge/cases-capacity-three-mix.py): a bagger on its plate at 100 a minute running 95% of the time,
 * an 8-hour shift less 30 min of breaks, 3 changeovers of 42 min.
 *   design    100 × 480                  = 48,000
 *   breaks    100 × 30                   =  3,000
 *   changeovers 100 × 126                = 12,600
 *   stops     (100 − 95) × 324           =  1,620      → effective 30,780 = 48,000 − 17,220 (64%)
 *   counted 28,000: utilisation 58%, efficiency 91%, 2,780 short; at £0.40 = £1,112 */
import { describe, it, expect } from 'vitest';
import { analyse, type Capacity, type Station } from '../capacity';
import { designSpeed, threeCapacities, type CountedShift } from '../capacityThree';

const bagger = (o: Partial<Station> = {}): Station => ({ id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 100, ratePer: 'min', source: 'plate', runningPct: 95, ...o });
const cap = (...s: Station[]): Capacity => ({ stations: s });
const shifts = [{ name: 'Days', min: 480, breakMin: 30 }];
const co = { min: 42, perShift: 3, agreed: true };
const counted = (o: Partial<CountedShift> = {}): CountedShift => ({ shift: 'Days', day: 'Mon 27 Oct', windowMin: 480, plannedMin: 450, made: 28_000, ...o });

describe('the design speed', () => {
  it('is the plate speed of the station that sets the pace, said so', () => {
    const d = designSpeed(analyse(cap(bagger())));
    expect(d).toMatchObject({ perMin: 100, station: 'Bagger', how: 'plate', words: 'the plate speed of the Bagger' });
  });
  it('a machine not on its plate is used and said not to be', () => {
    const d = designSpeed(analyse(cap(bagger({ source: 'timed' }))));
    expect(d?.how).toBe('typed');
    expect(d?.words).toBe('the Bagger’s speed — typed or timed, not from its plate');
  });
  it('a person on their standard time, and a guess said as one', () => {
    const p = { name: 'Op 2', kind: 'people' as const, cycleSec: 6, perCycle: 1, allowancePct: 0 };
    expect(designSpeed(analyse(cap(bagger({ rate: 200 }), bagger({ id: 'p', ...p, source: 'standard' }))))?.how).toBe('standard-time');
    expect(designSpeed(analyse(cap(bagger({ rate: 200 }), bagger({ id: 'p', ...p, source: 'estimate' }))))?.words).toBe('Op 2’s speed — a guess, not a standard time');
  });
  it('is nothing while no station can be counted', () => {
    expect(designSpeed(analyse(cap(bagger({ rate: undefined }))))).toBeUndefined();
  });
});

describe('design, effective and where design went', () => {
  const t = threeCapacities(analyse(cap(bagger())), shifts, co, undefined, { targetPerMin: 100 });
  it('48,000 built to make; 3,000 + 12,600 + 1,620 = 17,220 gone; 30,780 really — 64%', () => {
    const x = t?.rows[0];
    expect(x).toMatchObject({ name: 'Days', min: 480, design: 48_000, effective: 30_780, breaks: 3_000, changeovers: 12_600 });
    expect(x?.pace).toBeCloseTo(1_620, 6);
    expect((x?.breaks ?? 0) + (x?.changeovers ?? 0) + (x?.pace ?? 0)).toBeCloseTo(48_000 - 30_780, 6);
    expect(x?.share).toBeCloseTo(30_780 / 48_000, 9);
  });
  it('the target asks 100 × 450 = 45,000 of its planned minutes — 146% of what it can really make', () => {
    expect(t?.rows[0]?.asks).toBe(45_000);
    expect(t?.rows[0]?.loading).toBeCloseTo(45_000 / 30_780, 9);
  });
  it('says it in the floor’s words', () => {
    expect(t?.sentence).toBe('At the plate speed of the Bagger — 100 bags a minute — a shift is built to make 48,000 bags. Breaks take 3,000, changeovers 12,600 and the line’s own stops and rejects 1,620: it can really make 30,780, 64% of that. The target asks 45,000 of its planned minutes — 146% of what it can really make.');
  });
  it('the paper’s one line says the same facts: alike shifts together, differing shifts each', () => {
    expect(t?.paper).toBe('built to make 48,000 a shift, can really make 30,780 (64%).');
    const u = threeCapacities(analyse(cap(bagger())), [{ name: 'Days', min: 480, breakMin: 30 }, { name: 'Short', min: 240, breakMin: 0 }], co);
    expect(u?.paper).toMatch(/^built to make → can really make: Days 48,000 → 30,780 · Short 24,000 → /);
    expect(threeCapacities(analyse(cap(bagger())), [{ name: 'Nights', min: 480 }], co)?.paper).toBe('built to make 48,000 a shift.');
  });
  it('with no changeover timed none comes off, said; with no target loading is not claimed', () => {
    const u = threeCapacities(analyse(cap(bagger())), shifts);
    /* 95 a minute × the 450 planned minutes = 42,750; 3,000 breaks + 2,250 stops = the 5,250 gone */
    expect(u?.rows[0]).toMatchObject({ design: 48_000, effective: 42_750, breaks: 3_000, changeovers: 0 });
    expect(u?.rows[0]?.pace).toBeCloseTo(2_250, 6);
    expect(u?.rows[0]?.loading).toBeUndefined();
    expect(u?.notes).toContain('No changeover is timed into this product yet, so none comes off what the line can really make.');
    expect(u?.notes).toContain('Give the line a target to say how loaded it is.');
  });
  it('a shift whose breaks are not said has its design only, and says what is missing', () => {
    const u = threeCapacities(analyse(cap(bagger())), [{ name: 'Nights', min: 480 }], co);
    expect(u?.rows[0]).toEqual({ name: 'Nights', min: 480, design: 48_000 });
    expect(u?.sentence).toBe('At the plate speed of the Bagger — 100 bags a minute — a shift of 480 min is built to make 48,000 bags. What it can really make needs the breaks said on the line’s settings.');
    expect(u?.notes[0]).toBe('Nights: the breaks are not said on the line’s settings, so only what it was built to make is worked out for it.');
  });
  it('shifts that differ are each said; none, several lines feeding one place, or nothing to count give nothing', () => {
    const u = threeCapacities(analyse(cap(bagger())), [{ name: 'Days', min: 480, breakMin: 30 }, { name: 'Short', min: 240, breakMin: 0 }], co);
    expect(u?.sentence).toContain('Days is built to make 48,000, really 30,780 (64%); Short is built to make 24,000, really');
    expect(threeCapacities(analyse(cap(bagger())), [], co)?.rows).toEqual([]);
    expect(threeCapacities(analyse(cap(bagger({ rate: undefined }))), shifts, co)).toBeUndefined();
  });
});

describe('the counted shift against them', () => {
  const t = threeCapacities(analyse(cap(bagger())), shifts, co, counted(), { contribution: 0.4, targetPerMin: 100 });
  it('28,000 made: 58% of design, 91% of effective, 2,780 short — worth £1,112', () => {
    const c = t?.counted;
    expect(c?.design).toBe(48_000);
    expect(c?.effective).toBeCloseTo(30_780, 6);
    expect(c?.utilisation).toBeCloseTo(28_000 / 48_000, 9);
    expect(c?.efficiency).toBeCloseTo(28_000 / 30_780, 9);
    expect(c?.short).toBeCloseTo(2_780, 6);
    expect(c?.worth).toBeCloseTo(1_112, 6);
    expect(c?.loading).toBeCloseTo(45_000 / 30_780, 9);
  });
  it('the two ratios are told apart in words, and the shortfall is priced "if it cannot be made up"', () => {
    expect(t?.countSays).toBe('Counted — Days, Mon 27 Oct: 28,000 good bags made. Of the 48,000 the shift was built to make that is 58% — how much of the asset was used; of the 30,780 it could really make that is 91% — how well the planned time ran.');
    expect(t?.money).toBe('2,780 bags short of what it could really make — worth £1,112 of contribution if it cannot be made up. The loss count says where they went.');
  });
  it('without a contribution the shortfall is still said, and what to give is named — never an invented figure', () => {
    const u = threeCapacities(analyse(cap(bagger())), shifts, co, counted());
    expect(u?.counted?.worth).toBeUndefined();
    expect(u?.money).toBe('2,780 bags short of what it could really make. Give the line a margin a pack (Set up the line) to say that in money.');
  });
  it('the paper’s paragraph for the counted shift: both ratios, the shortfall and its worth', () => {
    expect(t?.paper).toBe('counted Days, Mon 27 Oct: 28,000 made — 58% of 48,000 built to make, 91% of 30,780 it can really make; 2,780 short, £1,112.');
    const u = threeCapacities(analyse(cap(bagger())), shifts, co, counted({ windowMin: 360, plannedMin: 330, made: 20_000 }));
    expect(u?.paper).toBe('counted Days, Mon 27 Oct: 20,000 made — 56% of 36,000 built to make, 103% of 19,380 it can really make; 620 above the sheet.');
  });
  it('a shorter count is set through the same sheet: 360-min window, 330 planned, 20,000 made is 56% of 36,000 and 103% of 19,380 — above the plan, not priced', () => {
    const u = threeCapacities(analyse(cap(bagger())), shifts, co, counted({ windowMin: 360, plannedMin: 330, made: 20_000 }), { contribution: 0.4 });
    expect(u?.counted).toMatchObject({ design: 36_000 });
    expect(u?.counted?.effective).toBeCloseTo(19_380, 6);
    expect(u?.counted?.utilisation).toBeCloseTo(20_000 / 36_000, 9);
    expect(u?.counted?.efficiency).toBeCloseTo(20_000 / 19_380, 9);
    expect(u?.counted?.worth).toBeUndefined();
    expect(u?.money).toBe('620 bags above what the sheet says it can really make — the sheet may be too careful: check its stops and speeds.');
  });
  it('nothing made is 0%, said; planned minutes longer than the window is refused', () => {
    expect(threeCapacities(analyse(cap(bagger())), shifts, co, counted({ made: 0 }))?.counted?.utilisation).toBe(0);
    const bad = threeCapacities(analyse(cap(bagger())), shifts, co, counted({ plannedMin: 500 }));
    expect(bad?.counted).toBeUndefined();
    expect(bad?.notes).toContain('The last count’s planned minutes are longer than its window, so it is not set against the three numbers.');
  });
  it('no count yet: says so', () => {
    expect(threeCapacities(analyse(cap(bagger())), shifts, co)?.notes).toContain('No shift has been counted yet — count one in the loss count to set what it made against these.');
  });
});
