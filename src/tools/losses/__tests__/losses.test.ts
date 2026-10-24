/* A shift's losses by hand — proved on a worked example done on paper first
 * (docs/CAPACITY.md §5–6; docs/LEAN40.md's appendix for the 450 × 100):
 *
 *   Line 7, Shift 1, Sat 10 Oct 2026, 06:00–14:00 = 480 min.
 *   Breaks 30 min, and the line stops for them (no relief):
 *     planned production time = 480 − 30 = 450 min.
 *   The rate: Line capacity's critical machine — the slowest machine at
 *   running speed — is the Bagger, 100 bags a minute on its plate
 *   (the Checkweigher's plate says 132): "plate speed of the Bagger".
 *     expected = 450 × 100 = 45,000.   Good packs made 36,500; rejects 600.
 *     lost = (45,000 − 36,500) ÷ 100 = 85 min.
 *   Stops timed in Capture: Breakdown on the Bagger 32; Minor stops on the
 *   Checkweigher 12 + 8 = 20 → 52 of stops. One changeover, 18.
 *     rejects = 600 ÷ 100 = 6 min.   explained = 52 + 18 + 6 = 76.
 *     the rest — slow running and short stops — = 85 − 76 = 9 min,
 *     9 ÷ 85 = 10.6%: over a tenth, amber.
 *     run time = 450 − 52 − 18 = 380 min.
 *   The running speed timed while it ran: 99 in 60 s, 97 in 60 s, 147 in
 *   90 s → 343 in 3.5 min = 98 a minute. Told apart as Nakajima does: the
 *   36,500 + 600 = 37,100 packs run took 37,100 ÷ 98 = 378.57 min at that
 *   speed — the net operating time — and take 371 at the plate's 100:
 *     slow running = 378.57 − 371 = 7.57 min;
 *     short stops  = 380 − 378.57 = 1.43 min (7.57 + 1.43 = the 9).
 *     Neither over a tenth (8.9%, 1.7%). The split before this, 380 ×
 *     (100 − 98) ÷ 100 = 7.6, ran the line at 98 through its short stops.
 *   The pounds, in two parts:
 *     idle labour = 4 crew × £14.50 × 1.3 on-costs = £75.40 an hour;
 *       × 85 ÷ 60 = £106.82 → £107  (the Breakdown's 32 min: £40.21 → £40)
 *     lost contribution = 8,500 packs × £0.04 margin = £340
 *       (the Breakdown's 3,200 packs: £128); with price £0.42 less
 *       materials £0.34 = £0.08 a pack: 8,500 × £0.08 = £680.
 *
 *   AND WHEN A PERSON SETS THE PACE ("plate speed ... unless human"): the
 *   same line with Op 3 packing cases of 10 at a standard time of 6.25 s a
 *   case (the line balance) — 60 ÷ 6.25 = 9.6 cases × 10 = 96 bags a minute,
 *   slower than every machine (Bagger 100, Checkweigher 132). The rate is
 *   "the standard time of Op 3 (the line balance)", 96 a minute.
 *     expected = 450 × 96 = 43,200.   Good packs 34,560; rejects 576.
 *     lost = 8,640 ÷ 96 = 90 min.   rejects = 576 ÷ 96 = 6 min.
 *     explained = 52 + 18 + 6 = 76;  the rest = 90 − 76 = 14 min (15.6%).
 *     run time = 450 − 52 − 18 = 380 min.
 *   Op 3 timed at 466 in 300 s = 93.2 a minute; 34,560 + 576 = 35,136
 *   packs run, 35,136 ÷ 93.2 = 377.0 min at that speed, 35,136 ÷ 96 = 366:
 *     slow running = 377.0 − 366 = 11.0 min —
 *       on People, the person who paces it; over a tenth (12.2%), amber;
 *     short stops  = 380 − 377.0 = 3.0 min. */
import { describe, it, expect } from 'vitest';
import {
  lossFigures, lossSays, compareLosses, nextShift, lossLine, lossRows, barWords, barExpect, inWindow, isChangeover, dayWords, rateWords,
  stopsOfBar, shiftWords, firstCount, idealOf, rateOf, plannedOf, runningOf, contributionOf, findBar, moneyWords, paceWords, countedRate,
} from '../losses';
import { shiftWindow } from '../../../lib/shifts';
import type { Station } from '../../linebalance/capacity';
import type { LossCount, RunTiming } from '../../../lib/study';
import type { Observation } from '../../../types';

const H = 3_600_000, MIN = 60_000;
const FROM = new Date(2026, 9, 10, 6, 0).getTime(), TO = FROM + 8 * H;
const count: LossCount = { shift: 'Shift 1', from: FROM, to: TO, breakMin: 30, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' };

let n = 0;
const stop = (o: Partial<Observation> & { at: number; mins: number }): Observation => {
  const { at, mins, ...rest } = o;
  return { id: `o${n++}`, workspaceId: 'w1', category: 'Breakdown', asset: 'Bagger', startedAt: at, endedAt: at + mins * MIN, durationMs: mins * MIN,
    timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at, ...rest };
};
/* 52 minutes of stops (32 on the bagger, 12 and 8 on the checkweigher), 18 of changeover — and one outside the window. */
const log = (): Observation[] => { n = 0; return [
  stop({ at: FROM + 1 * H, mins: 32, causeM: 'machine' }),
  stop({ at: FROM + 3 * H, mins: 12, category: 'Minor stop', subcategory: 'Misfeed', asset: 'Checkweigher' }),
  stop({ at: FROM + 5 * H, mins: 8, category: 'Minor stop', subcategory: 'Sensor trip', asset: 'Checkweigher' }),
  stop({ at: FROM + 6 * H, mins: 18, category: 'Changeover', subcategory: 'Size / format change' }),
  stop({ at: TO + 10 * MIN, mins: 40 }),
  stop({ at: FROM - 10 * MIN, mins: 40, workspaceId: 'w2' }),
]; };
const timed: RunTiming[] = [
  { id: 't1', at: FROM + 2 * H + 10 * MIN, by: 'Sam', packs: 99, sec: 60 },
  { id: 't2', at: FROM + 4 * H + 40 * MIN, by: 'Sam', packs: 97, sec: 60 },
  { id: 't3', at: FROM + 6 * H + 20 * MIN, by: 'Ana', packs: 147, sec: 90 },
  { id: 't4', at: FROM + 7 * H, by: 'Ana', packs: 20, sec: 60, struck: true },
];
const cost = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 };
const st = (o: Partial<Station> & Pick<Station, 'id' | 'name'>): Station => ({ kind: 'machine', unit: 'bags', contains: 1, ratePer: 'min', crew: 1, ...o });
const line7 = [
  st({ id: 'b', name: 'Bagger', rate: 100, source: 'plate' }),
  st({ id: 'c', name: 'Checkweigher', rate: 2.2, ratePer: 'sec', source: 'plate' }),
  st({ id: 'p', name: 'Packer', kind: 'people', unit: 'cases', contains: 10, cycleSec: 5, perCycle: 1, crew: 2, source: 'timed', allowancePct: 0 }),
];

describe('a shift’s losses (tool 7)', () => {
  it('the rate is the bottleneck’s ideal speed: the slowest station at running speed, in the line’s unit — here the Bagger’s plate', () => {
    expect(idealOf({ stations: line7 })).toEqual({ rate: 100, station: 'Bagger', how: 'plate', why: 'plate speed of the Bagger', anyIdeal: true });
    /* downstream, in its own unit: 8 cases a minute of 12 bags = 96 bags a minute, the slowest */
    const cased = [st({ id: 'b', name: 'Bagger', rate: 130, source: 'plate' }), st({ id: 'k', name: 'Case packer', unit: 'cases', contains: 12, rate: 8, source: 'plate' })];
    expect(idealOf({ stations: cased })).toMatchObject({ rate: 96, station: 'Case packer', how: 'plate' });
    expect(rateOf({ stations: line7 }, 90)).toEqual({ ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger', why: 'plate speed of the Bagger' });
  });
  it('a person slower than every machine sets the pace at their standard time — the time study’s, or their pace as timed; a guess is typed, and why', () => {
    const op3 = (source: Station['source'], allowancePct: number | null = 0) => [...line7.slice(0, 2), st({ id: 'o3', name: 'Op 3', kind: 'people', unit: 'cases', contains: 10, cycleSec: 6.25, perCycle: 1, source, ...(allowancePct != null ? { allowancePct } : {}) })];
    expect(idealOf({ stations: op3('standard') })).toEqual({ rate: 96, station: 'Op 3', how: 'standard', why: 'standard time of Op 3 (the line balance)', anyIdeal: true });
    expect(rateOf({ stations: op3('standard') }, 90)).toEqual({ ratePerMin: 96, rateFrom: 'standard-time', ratePerson: 'Op 3', why: 'standard time of Op 3 (the line balance)' });
    expect(rateOf({ stations: op3('timed') })).toEqual({ ratePerMin: 96, rateFrom: 'standard-time', ratePerson: 'Op 3', rateTimed: true, why: 'Op 3’s timed pace' });
    /* timed with the ILO's 9% rest on it (docs/CAPACITY.md §1): their rest is not a loss — 96 ÷ 1.09 */
    expect(rateOf({ stations: op3('timed', null) })?.ratePerMin).toBe(88.07); // to the hundredth
    /* a standard time carries its own allowances: none added again */
    expect(rateOf({ stations: op3('standard', null) }, 90)?.ratePerMin).toBeCloseTo(96, 9);
    expect(rateOf({ stations: op3('estimate') }, 90)).toEqual({ why: 'typed — Op 3 sets the pace and their speed is a guess — time them in the line balance' });
    expect([paceWords({ rateFrom: 'standard-time', ratePerson: 'Op 3' }), paceWords({ rateFrom: 'standard-time', ratePerson: 'Op 3', rateTimed: true })])
      .toEqual(['standard time of Op 3 (the line balance)', 'Op 3’s timed pace']);
  });
  it('no ideal speed on the pace-setter: typed and said why — the standard’s target only when no station on the line has one', () => {
    const guessed = line7.map(s => (s.id === 'b' ? { ...s, source: 'estimate' as const } : s));
    expect(rateOf({ stations: guessed }, 90)).toEqual({ why: 'typed — the Bagger sets the pace and its speed is a guess, not from its plate' });
    expect(rateOf({ stations: line7.map(s => ({ ...s, source: 'timed' as const })) }, 90)).toEqual({ why: 'typed — the Bagger sets the pace and its speed is timed, not from its plate' });
    const noIdeal = line7.map(s => ({ ...s, source: 'estimate' as const }));
    expect(rateOf({ stations: noIdeal }, 90)).toEqual({ ratePerMin: 90, rateFrom: 'standard', why: 'the line standard’s target — not a plate speed' });
    expect(rateOf(undefined, 90)).toMatchObject({ ratePerMin: 90, rateFrom: 'standard' });
    expect(rateOf(undefined)).toEqual({ why: 'typed — the line has no capacity sheet yet' });
  });
  it('Op 3 paces it: 450 × 96 = 43,200; 90 lost; 14 the rest; 35,136 ÷ 93.2 − 35,136 ÷ 96 = 11.0 slow running on People, 380 − 377.0 = 3.0 short stops', () => {
    const c: LossCount = { ...count, made: 34_560, rejects: 576, ratePerMin: 96, rateFrom: 'standard-time', rateMachine: undefined, ratePerson: 'Op 3' };
    const op3timed: RunTiming[] = [{ id: 'p1', at: FROM + 3 * H, by: 'Sam', packs: 466, sec: 300 }];
    const un = lossFigures(c, log());
    expect([un.expected, un.lostMin, un.rejectsMin, un.performanceMin, un.runMin]).toEqual([43_200, 90, 6, 14, 380]);
    const s0 = lossSays(un, c);
    expect([s0.verdict, s0.tone]).toEqual(['14 min slow running and short stops', 'a']);
    expect(s0.lines[0].text).toBe('Slow running and short stops is the rest: running below the standard-time pace, and stops too short to log — not yet told apart. Time the running speed while it runs to split them.');
    expect(s0.lines[1].text).toMatch(/· the rate is the standard time of Op 3 \(the line balance\) · /);
    const f = lossFigures(c, log(), undefined, op3timed);
    expect(f.netMin).toBeCloseTo(35_136 / 93.2, 6);            // 376.99
    expect(f.slowMin).toBeCloseTo(35_136 / 93.2 - 366, 6);     // 10.99
    expect(f.shortMin).toBeCloseTo(380 - 35_136 / 93.2, 6);    // 3.01
    expect(f.bars.slice(4).map(b => [b.key, b.bone, !!b.abnormal])).toEqual([['slow', 'people', true], ['short', 'machine', false]]);
    const s = lossSays(f, c);
    expect(s.verdict).toBe('11 min slow running');
    expect(s.lines[0].text).toBe('Running speed timed at 93.2 a minute over 1 timing (5 min): slow running = 35,136 packs run ÷ 93.2 − 35,136 ÷ 96 = 11 min; short stops = 380 min run − 35,136 ÷ 93.2 = 3 min.');
    expect(barWords(f.bars[4], c, TO + 20 * H)).toBe('Slow running — 11 min below the standard-time pace on Shift 1, yesterday');
    expect(barExpect(f.bars[4], c)).toBe('Slow running: 11 min a shift — the running speed nearer the standard-time pace on the next shift counted');
    const t = lossRows(f, c);
    expect(t?.head).toBe('450 planned minutes (480 min shift − 30 min of breaks) at 96 a minute, the standard time of Op 3 (the line balance) — 43,200 expected, 34,560 made');
    expect(t?.rows[4].cause).toBe('Slow running — timed at 93.2 a minute against the standard-time pace of 96 a minute');
    expect(lossRows(f, { ...c, rateTimed: true })?.head).toMatch(/at 96 a minute, Op 3’s timed pace — /);
    expect(firstCount([{ name: 'Shift 1', start: '06:00', end: '14:00', breakMin: 30 }], rateOf({ stations: [...line7.slice(0, 2), st({ id: 'o3', name: 'Op 3', kind: 'people', unit: 'cases', contains: 10, cycleSec: 6.25, perCycle: 1, source: 'standard' })] }), FROM + 9 * H))
      .toEqual({ shift: 'Shift 1', from: FROM, to: TO, plannedMin: 450, breakMin: 30, ratePerMin: 96, rateFrom: 'standard-time', ratePerson: 'Op 3' });
  });
  it('planned production time is the shift less its planned breaks, worked out — none off under relief; a day’s change keeps its reason', () => {
    expect(plannedOf(count)).toMatchObject({ windowMin: 480, breakMin: 30, workedOut: 450, changed: false, words: '480 min shift − 30 min of breaks = 450 planned' });
    expect(plannedOf({ ...count, relief: true, plannedMin: 480 }).words).toBe('480 min shift, relief covers the breaks = 480 planned');
    expect(plannedOf({ from: FROM, to: TO, plannedMin: 480 }).words).toBe('480 min window, no breaks set = 480 planned');
    expect(plannedOf({ ...count, plannedMin: 390, plannedWhy: 'stood an hour, no orders' }).words).toBe('480 min shift − 30 min of breaks = 450; 390 planned for the day — stood an hour, no orders');
  });
  it('450 × 100 = 45,000; made 36,500 → 85 min lost; 52 + 18 + 6 explained; 9 of slow running and short stops; 380 run', () => {
    const f = lossFigures(count, log());
    expect(f.enough).toBe(true);
    expect([f.expected, f.shortPacks, f.lostMin, f.runMin]).toEqual([45_000, 8_500, 85, 380]);
    expect([f.stopsMin, f.changeoverMin, f.rejectsMin, f.explainedMin, f.performanceMin]).toEqual([52, 18, 6, 76, 9]);
    expect(f.performanceShare).toBeCloseTo(9 / 85, 6);
    expect(f.byCause.map(b => [b.label, b.min, b.stops, b.asset, b.bone])).toEqual([['Breakdown', 32, 1, 'Bagger', 'machine'], ['Minor stop', 20, 2, 'Checkweigher', 'machine']]);
    expect(f.bars.map(b => [b.key, b.label, !!b.abnormal])).toEqual([['cause:Breakdown', 'Breakdown', false], ['cause:Minor stop', 'Minor stop', false], ['changeover', 'Changeovers', false], ['rejects', 'Rejects', false], ['performance', 'Slow running and short stops', true]]);
    expect(f.logged).toBe(4);
  });
  it('says it plainly — the rest named, amber over a tenth of the loss, and every number how known', () => {
    const s = lossSays(lossFigures(count, log()), count, { product: 'Maris Piper 2kg' });
    expect(s.text).toBe('Shift 1 should have made 45,000 at 100 a minute; made 36,500 — 85 min lost: 52 min of stops · 18 min of changeovers · 6 min of rejects (600 packs) · 9 min of slow running and short stops.');
    expect([s.tone, s.verdict]).toEqual(['a', '9 min slow running and short stops']);
    expect(s.lines.map(l => l.text)).toEqual([
      'Slow running and short stops is the rest: running below the plate speed, and stops too short to log — not yet told apart. Time the running speed while it runs to split them.',
      'How known: 480 min shift − 30 min of breaks = 450 planned · the packs made and the rejects counted · the rate is the plate speed of the Bagger · 4 stops timed in Capture in the window.',
    ]);
  });
  it('the running speed timed tells them apart, as Nakajima does: 37,100 ÷ 98 − 371 = 7.57 slow running, 380 − 378.57 = 1.43 short stops', () => {
    expect(runningOf(timed)).toEqual({ perMin: 98, n: 3, min: 3.5 });   // the struck one counts for nothing
    const f = lossFigures(count, log(), undefined, timed);
    expect(f.netMin).toBeCloseTo(37_100 / 98, 6);              // 378.57 — the net operating time
    expect(f.slowMin).toBeCloseTo(37_100 / 98 - 371, 6);       // 7.57
    expect(f.shortMin).toBeCloseTo(380 - 37_100 / 98, 6);      // 1.43
    expect((f.slowMin ?? 0) + (f.shortMin ?? 0)).toBeCloseTo(9, 9);
    expect(f.bars.slice(4).map(b => [b.key, b.label, b.bone, b.grade, !!b.abnormal])).toEqual([['slow', 'Slow running', 'machine', 'measured', false], ['short', 'Short stops', 'machine', 'none', false]]);
    const s = lossSays(f, count);
    expect(s.text).toBe('Shift 1 should have made 45,000 at 100 a minute; made 36,500 — 85 min lost: 52 min of stops · 18 min of changeovers · 6 min of rejects (600 packs) · 8 min of slow running · 1 min of short stops.');
    expect([s.tone, s.verdict]).toEqual(['n', '85 min lost']);
    expect(s.lines[0]).toEqual({ text: 'Running speed timed at 98 a minute over 3 timings (3.5 min): slow running = 37,100 packs run ÷ 98 − 37,100 ÷ 100 = 8 min; short stops = 380 min run − 37,100 ÷ 98 = 1 min.', tone: 'n' });
    /* timed at 97 the 37,100 packs would have taken 382.5 min — more than the 380 it ran: the slow running says 11.5 of the 9 left — capped, and said */
    const slower = lossFigures(count, log(), undefined, [{ id: 'x', at: FROM + H, packs: 97, sec: 60 }]);
    expect([slower.slowMin, slower.shortMin]).toEqual([9, 0]);
    expect(slower.slowRawMin).toBeCloseTo(37_100 / 97 - 371, 6);   // 11.47
    expect(lossSays(slower, count).lines[0]).toEqual({ text: 'Running speed timed at 97 a minute over 1 timing (1 min): slow running = 37,100 packs run ÷ 97 − 37,100 ÷ 100 = 11 min — more than the 9 min the count leaves; time it again, or check the counts.', tone: 'a' });
    /* a far slower running speed shows the old split's error plainly: 200 min run, 100 a minute plate, 15,000 packs
       run at 80 a minute timed — the net operating time 187.5 min: 12.5 min of short stops, 37.5 of slow running;
       200 × (100 − 80) ÷ 100 would have said 40 and 10 */
    const wide = lossFigures({ ...count, plannedMin: 200, made: 15_000, rejects: 0 }, [], undefined, [{ id: 'w', at: FROM + H, packs: 80, sec: 60 }]);
    expect([wide.runMin, wide.performanceMin, wide.netMin]).toEqual([200, 50, 187.5]);
    expect([wide.slowMin, wide.shortMin]).toEqual([37.5, 12.5]);
    /* a timing with no packs in it is not a running speed: not told apart */
    const none = lossFigures(count, log(), undefined, [{ id: 'z', at: FROM + H, packs: 0, sec: 60 }]);
    expect([none.slowMin, none.shortMin, none.netMin]).toEqual([undefined, undefined, undefined]);
    expect(lossSays(none, count).lines[0].text).toMatch(/^Slow running and short stops is the rest: .* not yet told apart\./);
    expect(slower.bars.find(b => b.key === 'slow')?.abnormal).toBe(true);
    /* at or above the plate there is no slow running — and above it is said */
    const fast = lossFigures(count, log(), undefined, [{ id: 'y', at: FROM + H, packs: 104, sec: 60 }]);
    expect([fast.slowMin, fast.shortMin, fast.abovePlate]).toEqual([0, 9, true]);
    expect(lossSays(fast, count).lines[0].text).toBe('Running speed timed at 104 a minute over 1 timing (1 min), above the plate speed of 100 a minute — no slow running; check the plate speed or the timing.');
  });
  it('the pounds in two parts — idle labour and lost contribution if it cannot be made up; none without a cost', () => {
    const f = lossFigures(count, log(), cost);
    expect(f.labourPerHour).toBeCloseTo(75.4, 6);
    expect([f.labour, f.contribution].map(x => Math.round((x ?? 0) * 100) / 100)).toEqual([106.82, 340]);
    const bd = f.bars.find(b => b.key === 'cause:Breakdown');
    expect([bd?.labour, bd?.contribution].map(x => Math.round((x ?? 0) * 100) / 100)).toEqual([40.21, 128]);
    const s = lossSays(f, count);
    expect(s.text).toMatch(/· 9 min of slow running and short stops\. £107 idle labour · £340 lost contribution if it cannot be made up\.$/);
    expect(s.lines[s.lines.length - 1].text).toMatch(/· idle labour £75\.40 an hour \(crew × wage × on-costs\) · contribution £0\.04 a pack \(the line’s margin\)\.$/);
    /* price less materials when the line has them */
    const priced = contributionOf({ ...cost, pricePerPack: 0.42, materialsPerPack: 0.34 });
    expect([priced?.perPack.toFixed(2), priced?.from]).toEqual(['0.08', 'price']);
    expect(Math.round(lossFigures(count, log(), { ...cost, pricePerPack: 0.42, materialsPerPack: 0.34 }).contribution ?? 0)).toBe(680);
    /* labour alone; nothing at all */
    expect(lossSays(lossFigures(count, log(), { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3 }), count).text).toMatch(/\. £107 idle labour\.$/);
    expect(lossFigures(count, log()).bars.every(b => b.labour === undefined && b.contribution === undefined)).toBe(true);
    expect(moneyWords()).toBe('');
  });
  it('under a tenth the loss reads neutral; nothing left over says so', () => {
    const quiet = lossFigures({ ...count, made: 37_300 }, log());   // 77 min lost, 76 explained → 1 min
    const s = lossSays(quiet, count);
    expect([s.tone, s.verdict]).toEqual(['n', '77 min lost']);
    const all = lossSays(lossFigures({ ...count, made: 37_400 }, log()), count);   // 76 lost, 76 explained
    expect(all.text).toMatch(/· no slow running or short stops left over\.$/);
  });
  it('stops that exceed the loss are said, not hidden — and the rest never goes below zero', () => {
    const f = lossFigures({ ...count, made: 40_000 }, log());   // 50 min lost against 76 explained
    expect([f.lostMin, f.performanceMin, f.excessMin]).toEqual([50, 0, 26]);
    const s = lossSays(f, count);
    expect(s.lines[0]).toEqual({ text: 'Stops logged exceed the loss by 26 min — check the counts.', tone: 'a' });
    expect(s.tone).toBe('a');
    expect(f.bars.some(b => b.kind === 'performance')).toBe(false);
  });
  it('made more than expected: nothing lost, and the rate or the count wants checking', () => {
    const f = lossFigures({ ...count, made: 45_500 }, log());
    expect([f.lostMin, f.overPacks]).toEqual([0, 500]);
    const s = lossSays(f, count);
    expect([s.verdict, s.tone, s.lines[0].text]).toEqual(['Nothing lost', 'a', 'Made 500 more than expected at 100 a minute — check the rate or the count.']);
  });
  it('enough: the planned minutes, the packs made and a rate — until then "not yet counted", and what is missing said', () => {
    const f = lossFigures({ shift: 'Shift 1', from: FROM, to: TO, made: 36_500 }, log());
    expect([f.enough, f.missing]).toEqual([false, ['the planned minutes', 'the rate a minute']]);
    expect(lossSays(f).verdict).toBe('Not yet counted');
    expect(lossFigures(undefined).enough).toBe(false);
    expect(lossFigures({ ...count, ratePerMin: 0 }).missing).toEqual(['the rate a minute']);
  });
  it('without the stops the loss is worked out and the split is not — and said so', () => {
    const f = lossFigures(count, undefined, cost);
    expect([f.split, f.lostMin, f.performanceMin, f.bars.length]).toEqual([false, 85, undefined, 1]);   // the rejects alone
    expect(lossSays(f, count).text).toBe('Shift 1 should have made 45,000 at 100 a minute; made 36,500 — 85 min lost. £107 idle labour · £340 lost contribution if it cannot be made up. Where it went is read from the line\'s stops in the window.');
  });
  it('no stops logged: the whole loss but the rejects is the rest, and the empty log is said', () => {
    const f = lossFigures(count, []);
    expect([f.performanceMin, f.logged, f.runMin]).toEqual([79, 0, 450]);
    expect(lossSays(f, count).lines.map(l => l.text)).toContain('No stops logged in the window — the Pareto is empty for this shift.');
  });
  it('the window: live stops that started inside it, on the line; a changeover is the changeover category', () => {
    expect(inWindow(log(), FROM, TO).length).toBe(4);
    expect(inWindow(log(), FROM - H, TO, 'w1').length).toBe(4);
    expect(inWindow(log(), FROM - H, TO).length).toBe(5);
    expect(isChangeover({ category: 'Changeover' })).toBe(true);
    expect(isChangeover({ category: 'change-over' })).toBe(true);
    expect(isChangeover({ category: 'Hygiene & cleaning' })).toBe(false);
  });
  it('a bar in its own words, the two parts of its pounds, and what a fix from it should change', () => {
    const f = lossFigures(count, log(), cost);
    const now = TO + 20 * H;   // the next day
    expect(barWords(f.bars[0], count, now)).toBe('Breakdown on the Bagger — 32 min of stops (1 stop) on Shift 1, yesterday (£40 idle labour · £128 lost contribution)');
    expect(barWords(f.bars[2], count, now)).toBe('Changeovers on the Bagger — 18 min (1) on Shift 1, yesterday (£23 idle labour · £72 lost contribution)');
    expect(barWords(f.bars[3], count, now)).toBe('Rejects — 600 packs, 6 min at the rate on Shift 1, yesterday (£8 idle labour · £24 lost contribution)');
    expect(barWords(f.bars[4], count, now)).toBe('9 min of slow running and short stops on Shift 1, yesterday (£11 idle labour · £36 lost contribution) — running below the plate speed, and stops too short to log');
    expect(barExpect(f.bars[0])).toBe('Breakdown on the Bagger: 32 min a shift — fewer on the next shift counted');
    expect(barExpect(f.bars[4])).toBe('Slow running and short stops: 9 min a shift — fewer on the next shift counted, the running speed timed to tell them apart');
    const split = lossFigures(count, log(), undefined, timed);
    expect(barWords(split.bars[4], count, now)).toBe('Slow running — 8 min below the plate speed on Shift 1, yesterday');
    expect(barWords(split.bars[5], count, now)).toBe('Short stops — 1 min of stops too short to log on Shift 1, yesterday');
    expect(barExpect(split.bars[4], count)).toBe('Slow running: 8 min a shift — the running speed nearer the plate speed on the next shift counted');
    /* a record raised from the part once called "not yet explained" names the rest */
    expect(findBar(f.bars, 'unexplained')?.key).toBe('performance');
  });
  it('before → after: the bar, the lost minutes and the slow running and short stops; too early until counted', () => {
    const before = lossFigures(count, log());
    const after = lossFigures({ ...count, from: FROM + 86_400_000, to: TO + 86_400_000, made: 40_900, rejects: 300 },
      [stop({ at: FROM + 86_400_000 + H, mins: 10 }), stop({ at: FROM + 86_400_000 + 2 * H, mins: 18, category: 'Changeover' })]);
    expect([after.lostMin, after.performanceMin]).toEqual([41, 10]);
    const c = compareLosses(before, after, 'cause:Breakdown');
    expect(c).toEqual({ text: 'Breakdown on the Bagger: 32 min → 10 min; Lost 85 min → 41 min a shift; slow running and short stops 9 min → 10 min. The number moved; what moved it is the fix\'s to say.', tone: 'g' });
    expect(compareLosses(before, after, 'unexplained').text).toBe('Slow running and short stops: 9 min → 10 min; Lost 85 min → 41 min a shift. The number moved; what moved it is the fix\'s to say.');
    expect(compareLosses(lossFigures(count, log(), undefined, timed), after, 'slow').text).toMatch(/^Slow running: 8 min → not timed; /);
    expect(compareLosses(before, lossFigures({ ...count, made: undefined }, []))).toEqual({ text: 'Too early — the next shift is not counted yet.', tone: 'n' });
    expect(compareLosses(before, before).text).toMatch(/^Lost 85 min a shift, no change; slow running and short stops 9 min, no change\./);
    expect(compareLosses(before, lossFigures({ ...count, made: 30_000 }, log())).tone).toBe('r');
  });
  it('Prove it: the same shift, the window moved on to the day it is pressed, the plate and the breaks carried, nothing counted yet', () => {
    const nx = nextShift(count, TO + 20 * H);    // 10:00 the next day
    expect([nx.from, nx.to, nx.shift, nx.plannedMin, nx.breakMin, nx.ratePerMin, nx.rateFrom, nx.rateMachine, nx.made, nx.rejects])
      .toEqual([FROM + 86_400_000, TO + 86_400_000, 'Shift 1', 450, 30, 100, 'plate', 'Bagger', undefined, undefined]);
    expect(nextShift(count, FROM + 10 * MIN).from).toBe(FROM + 86_400_000);   // never the same shift twice
    expect(nextShift(count, TO + 3 * 86_400_000).from).toBe(FROM + 3 * 86_400_000);
    expect(nextShift(count, FROM + 2 * 86_400_000 + H).from).toBe(FROM + 86_400_000);   // two days on, the day's shift still running: yesterday's
    /* a day's own change to the planned minutes does not carry: the next shift starts from the shift less its breaks */
    const odd = nextShift({ ...count, plannedMin: 390, plannedWhy: 'stood an hour' }, TO + 20 * H);
    expect([odd.plannedMin, odd.plannedWhy]).toEqual([450, undefined]);
  });
  it('one line for a card or a row', () => {
    const now = TO + 20 * H;
    expect(lossLine(lossFigures(count, log()), count, now)).toEqual({ text: 'Shift 1 yesterday: 85 min lost · 9 min slow running and short stops', abnormal: true });
    expect(lossLine(lossFigures(count, log(), undefined, timed), count, now)).toEqual({ text: 'Shift 1 yesterday: 85 min lost · 8 min slow running · 1 min short stops', abnormal: false });
    expect(lossLine(lossFigures({ ...count, made: 37_400 }, log()), count, now)).toEqual({ text: 'Shift 1 yesterday: 76 min lost · the stops explain it all', abnormal: false });
    expect(lossLine(lossFigures({ ...count, made: undefined }), count, now)).toEqual({ text: 'Shift 1 yesterday: not yet counted', abnormal: false });
    expect(lossLine(lossFigures(count), count, FROM + H).text).toBe('Shift 1 today: 85 min lost');
  });
  it('the waterfall as a table for paper — how the planned minutes and the rate are known, and two columns of pounds', () => {
    const t = lossRows(lossFigures(count, log(), cost), count);
    expect(t?.head).toBe('450 planned minutes (480 min shift − 30 min of breaks) at 100 a minute, the plate speed of the Bagger — 45,000 expected, 36,500 made');
    expect(t?.rows.map(r => [r.cause, r.stops, r.minutes, r.labour, r.contribution])).toEqual([
      ['Breakdown — Bagger', '1', '32 min', '£40', '£128'], ['Minor stop — Checkweigher', '2', '20 min', '£25', '£80'],
      ['Changeovers', '1', '18 min', '£23', '£72'], ['Rejects (600 packs)', '—', '6 min', '£8', '£24'],
      ['Slow running and short stops — the rest: below the plate speed, and stops too short to log; not yet told apart', '—', '9 min', '£11', '£36'],
    ]);
    expect(t?.rows[4].abnormal).toBe(true);
    /* each cause's share of the 85 lost — 32 ÷ 85 = 38%, 20 ÷ 85 = 24%, 18 ÷ 85 = 21%, 6 ÷ 85 = 7%, 9 ÷ 85 = 11% */
    expect(t?.rows.map(r => r.share)).toEqual(['38%', '24%', '21%', '7%', '11%']);
    expect(t?.total).toEqual({ minutes: '85 min', labour: '£107', contribution: '£340' });
    const split = lossRows(lossFigures(count, log(), undefined, timed), { ...count, rateFrom: 'standard', rateMachine: undefined });
    expect(split?.head).toBe('450 planned minutes (480 min shift − 30 min of breaks) at 100 a minute, the line standard’s target — not a plate speed — 45,000 expected, 36,500 made');
    expect(split?.rows.slice(4).map(r => [r.cause, r.minutes, r.labour])).toEqual([
      ['Slow running — timed at 98 a minute against the plate speed of 100 a minute', '8 min', ''], ['Short stops — the rest once the slow running is timed: stops too short to log', '1 min', ''],
    ]);
    expect(lossRows(lossFigures(undefined))).toBeUndefined();
  });
  it('a bar opens its own stops, in the order they happened; a window typed by hand names its hours', () => {
    const f = lossFigures(count, log());
    expect(stopsOfBar(log(), count, f.bars[1]).map(o => o.subcategory)).toEqual(['Misfeed', 'Sensor trip']);
    expect(stopsOfBar(log(), count, f.bars[2]).map(o => o.category)).toEqual(['Changeover']);
    expect(stopsOfBar(log(), count, f.bars[3])).toEqual([]);
    expect(shiftWords({ from: FROM, to: TO })).toBe('The 06:00–14:00 shift');
    expect(lossLine(f, { ...count, shift: undefined }, TO + 20 * H).text).toBe('The 06:00–14:00 shift yesterday: 85 min lost · 9 min slow running and short stops');
  });
  it('a new count starts from the shift that has just run: the shift less its breaks, and the plate speed', () => {
    const shifts = [{ name: 'Shift 1', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Shift 2', start: '14:00', end: '22:00', breakMin: 30, relief: true }, { name: 'Nights', start: '22:00', end: '06:00' }];
    const plate = rateOf({ stations: line7 });
    expect(firstCount(shifts, plate, FROM + 9 * H)).toEqual({ shift: 'Shift 1', from: FROM, to: TO, plannedMin: 450, breakMin: 30, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' });
    expect(firstCount(shifts, plate, TO - 10 * 60_000).shift).toBe('Shift 1');   // counted in its last minutes
    const two = firstCount(shifts, rateOf(undefined, 90), TO + 8 * H + 5 * MIN);   // relief covers Shift 2's breaks
    expect([two.shift, two.plannedMin, two.breakMin, two.relief, two.ratePerMin, two.rateFrom]).toEqual(['Shift 2', 480, 30, true, 90, 'standard']);
    const nights = firstCount(shifts, rateOf(undefined), new Date(2026, 9, 11, 6, 30).getTime());
    expect([nights.shift, nights.from, nights.plannedMin, nights.breakMin, nights.ratePerMin]).toEqual(['Nights', new Date(2026, 9, 10, 22, 0).getTime(), 480, undefined, undefined]);
    expect(firstCount([], undefined, FROM + 9 * H)).toEqual({ from: FROM, to: TO, plannedMin: 480 });
  });
  it('words: the day, the rate', () => {
    expect(dayWords(FROM, FROM + 3 * H)).toBe('today');
    expect(dayWords(FROM, FROM + 30 * H)).toBe('yesterday');
    expect(dayWords(FROM, FROM + 5 * 86_400_000)).toBe('Sat 10 Oct');
    expect([rateWords(100), rateWords(58.44)]).toEqual(['100 a minute', '58.4 a minute']);
  });
  it('a shift’s window on a day — nights run into the next day; no times, no window', () => {
    expect(shiftWindow({ start: '06:00', end: '14:00' }, '2026-10-10')).toEqual({ from: FROM, to: TO });
    const nights = shiftWindow({ start: '22:00', end: '06:00' }, '2026-10-10');
    expect(nights && (nights.to - nights.from) / H).toBe(8);
    expect(nights?.from).toBe(new Date(2026, 9, 10, 22, 0).getTime());
    expect(shiftWindow({ start: '', end: '' }, '2026-10-10')).toBeUndefined();
    expect(shiftWindow({ start: '06:00', end: '14:00' }, 'nonsense')).toBeUndefined();
  });
});

/* THE GAP COUNTED (flow audit #8): a shift's count is what the line made a
 * minute — good packs ÷ planned minutes — offered as a reading, said as
 * counted. 36,500 in 450 is 81.1 a minute; nothing until both are in. */
describe('countedRate — what the line made a minute, counted', () => {
  it('is the good packs over the planned minutes, on the shift’s day', () => {
    expect(countedRate(count)).toEqual({ perMin: 81.1, made: 36_500, plannedMin: 450, day: '2026-10-10',
      words: 'Shift 1, 10 Oct: 36,500 good packs in 450 planned min — 81.1 a minute' });
  });
  it('is nothing until the packs and the planned minutes are in', () => {
    expect(countedRate({ ...count, made: undefined })).toBeUndefined();
    expect(countedRate({ ...count, plannedMin: undefined })).toBeUndefined();
    expect(countedRate(undefined)).toBeUndefined();
  });
});
