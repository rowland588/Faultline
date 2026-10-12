/* SMED — quick changeover (docs/TOOLKIT.md, tool 6).
 *
 * WORKED EXAMPLE 1 — the toolkit's interval: 450 − 300 = 150 free; 5 × 42 =
 * 210 → 1.4 days; 5 × 27 = 135 → 0.9 days; 15 × 6 = 90 min a week.
 *
 * WORKED EXAMPLE 2 — the ladder and what the changeovers cost, by hand:
 *   elements, in order (I internal, E external), minutes:
 *     A Change the former tube         I 10   streamline, quick-release clamps → 4
 *     E Fetch the next former          E  9
 *     B Heat the new sealing jaws      I  6   convert, prepare in advance (pre-heat)
 *     C Change the film reel           I  8   streamline, in parallel alongside A by the fitter → 5
 *     D Adjust the jaw pressure        I  5   eliminate, no adjustment (fixed stops)
 *     F First bags and check the seal  I  4   keep
 *   now          = 10 + 9 + 6 + 8 + 5 + 4                = 42 min
 *   separated    = 42 − 9 (E outside)                      = 33 min
 *   converted    = 33 − 6 (B prepared before the stop)     = 27 min
 *   streamlined  = column(A 4 | C 5 alongside) = 5, D gone, F 4 → 5 + 4 = 9 min
 *                  (labour 4 + 5 + 4 × 2 = 17 min: two people at once, F by two)
 *   SMED's target, single-digit minutes: 9 min — met, if the plan holds.
 *   How the line runs: 2 shifts × 8 h, each less 30 min of breaks the line
 *   stops for (7.5 h running — docs/CAPACITY.md §5), 7 days, 48 weeks; 3
 *   changeovers a shift; the Bagger's plate speed 100 packs a minute; idle
 *   labour £200 an hour; contribution £0.05 a pack (§6: two parts, never one).
 *     per shift   3 × 42  =   126 min
 *     per day     6 × 42  =   252 min
 *     per week   42 × 42  = 1,764 min = 29.4 h  → 1,764 × 100 = 176,400 packs;
 *                29.4 × £200 = £5,880 idle labour; 176,400 × £0.05 = £8,820 contribution
 *     running a week 2 × 7.5 × 7 = 105 h → 29.4 ÷ 105 = 28% of the running time
 *     per year   × 48     = 84,672 min = 1,411.2 h → 8,467,200 packs, £282,240
 *                idle labour, £423,360 contribution
 *   streamlined 9 min: 42 × 9 = 378 min = 6.3 h a week — 29.4 − 6.3 = 23.1 h back. */
import { describe, it, expect } from 'vitest';
import {
  arrange, availableOf, carrySequence, changeoverFigures, changeoverSays, changeoverSheet, changeoversOf, changeoversPer, checklistOf, coLanes, compareChangeovers,
  countWord, extrapolate, extrapolationSays, figuresOf, functionSays, functionShares, intervalOf, intervalSays, ladderOf, ladderSays, mins, planWords, actionWords,
  runMinOf, runningOf, span, standardFrom, standardLine, stepFigure, SMED_TARGET_SEC, runningWords, patternFromShifts, lineRateOf, rateFromWords, moneyOf, scaleRows, scaleSays,
} from '../changeover';
import type { ChangeoverProduct, ChangeoverStep } from '../../study';

let n = 0;
const st = (name: string, min: number, side: ChangeoverStep['side'] = 'internal', source: ChangeoverStep['source'] = 'timed'): ChangeoverStep =>
  ({ id: `c${n}`, order: n++, name, sec: min * 60, side, source });

/* WORKED EXAMPLE 1: Finest Red 2kg → Express 1.25 kg — eight elements, 42 min, three external (15). */
const seq = (): ChangeoverStep[] => { n = 0; return [
  st('Stop and clear the former', 4),
  st('Fetch the next former from the store', 5, 'external'),
  st('Change the former tube', 10),
  st('Pre-stage the film reels', 7, 'external'),
  st('Change the film reel', 6),
  st('Set the jaw temperature', 3),
  st('Print the new labels', 3, 'external'),
  st('First bags and check the seal', 4),
]; };
const products: ChangeoverProduct[] = [
  { id: 'p1', product: 'Finest Red 2kg', demandPerDay: 7200, ratePerMin: 60 },      // 120 min
  { id: 'p2', product: 'Express 1.25 kg', demandPerDay: 3000, ratePerMin: 50 },     // 60 min
  { id: 'p3', product: 'Maris Piper 2kg', runMinPerDay: 50 },
  { id: 'p4', product: 'King Edward 2.5kg', runMinPerDay: 40 },
  { id: 'p5', product: 'Baby potatoes 1kg', runMinPerDay: 30 },
];

/* WORKED EXAMPLE 2 */
const M = 60;
const planned = (): ChangeoverStep[] => [
  { id: 'A', order: 0, name: 'Change the former tube', sec: 10 * M, side: 'internal', source: 'timed', crew: ['Op 1'], where: 'Former', fn: 'mount',
    plan: { kind: 'streamline', how: 'clamps', targetSec: 4 * M } },
  { id: 'E', order: 1, name: 'Fetch the next former', sec: 9 * M, side: 'external', source: 'timed', crew: ['Op 1'], where: 'Stores', fn: 'prepare' },
  { id: 'B', order: 2, name: 'Heat the new sealing jaws', sec: 6 * M, side: 'internal', source: 'timed', crew: ['Op 1'], where: 'Jaws', fn: 'adjust',
    plan: { kind: 'convert', how: 'prepare', note: 'pre-heat the spare jaws' } },
  { id: 'C', order: 3, name: 'Change the film reel', sec: 8 * M, side: 'internal', source: 'timed', crew: ['Op 1'], where: 'Film unit', fn: 'mount',
    plan: { kind: 'streamline', how: 'parallel', alongside: 'A', crew: ['Fitter'], targetSec: 5 * M } },
  { id: 'D', order: 4, name: 'Adjust the jaw pressure', sec: 5 * M, side: 'internal', source: 'timed', crew: ['Op 1'], where: 'Jaws', fn: 'adjust',
    plan: { kind: 'eliminate', how: 'no-adjust', note: 'fixed stops' } },
  { id: 'F', order: 5, name: 'First bags and check the seal', sec: 4 * M, side: 'internal', source: 'timed', crew: ['Op 1', 'Team leader'], where: 'Jaws', fn: 'trial' },
];
const running = { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 7, weeksPerYear: 48 };
const money = { labourPerHour: 200, marginPerPack: 0.05 };
const plate = { ratePerMin: 100, rateFrom: 'plate' as const, rateStation: 'Bagger' };

describe('SMED — record and separate (tool 6)', () => {
  it('minutes now, internal and external, with the external work out, and what a week buys back', () => {
    const f = changeoverFigures(seq(), 6);
    expect([f.steps, f.known, f.untimed, f.carried, f.enough, f.source]).toEqual([8, 8, 0, 0, true, 'timed']);
    expect([f.nowSec, f.internalSec, f.externalSec, f.afterSec, f.weekSec, f.labourSec]).toEqual([42 * 60, 27 * 60, 15 * 60, 27 * 60, 90 * 60, 42 * 60]);
    expect(f.external.map(x => x.name)).toEqual(['Pre-stage the film reels', 'Fetch the next former from the store', 'Print the new labels']);
    expect(f.internal[0].name).toBe('Change the former tube');
  });
  it('says it as the ops lead would', () => {
    const s = changeoverSays(changeoverFigures(seq(), 6));
    expect(s.text).toBe('42 min now. With the 15 min of external work done while the line runs: 27 min — 90 min a week back, 6 changeovers.');
    expect([s.tone, s.verdict, s.lines]).toEqual(['a', '15 min external inside', []]);
    expect(changeoverSays(changeoverFigures(seq())).text).toBe('42 min now. With the 15 min of external work done while the line runs: 27 min.');
  });
  it('against the agreed standard: over it is red, within it green; all internal is neutral', () => {
    const over = changeoverSays(changeoverFigures(seq(), 6), { minutes: 27 });
    expect([over.tone, over.verdict]).toEqual(['r', 'Over the standard']);
    expect(over.lines).toEqual([{ text: 'Over the 27 min standard by 15 min.', tone: 'r' }]);
    const internal = seq().filter(x => x.side === 'internal');
    const within = changeoverSays(changeoverFigures(internal), { minutes: 27 });
    expect([within.tone, within.verdict, within.text]).toEqual(['g', 'Within the standard', '27 min now, all of it with the line stopped — no external work found yet.']);
    expect(changeoverSays(changeoverFigures(internal)).tone).toBe('n');
  });
  it('enough: nothing said until an element has a time; an untimed one makes the minutes "at least"', () => {
    expect(changeoverSays(changeoverFigures([])).text).toMatch(/^Record the changeover element by element — from the last good piece/);
    const none = changeoverSays(changeoverFigures([{ id: 'x', order: 0, name: 'x', side: 'internal', source: 'typed' }]));
    expect([none.verdict, none.text]).toEqual(['Not timed', '1 element, none timed yet — Lap as each ends, or type the minutes.']);
    const s = changeoverSays(changeoverFigures([...seq(), { id: 'u', order: 9, name: 'Sign off', side: 'internal', source: 'typed' }], 6));
    expect(s.text).toMatch(/^At least 42 min now\./);
    expect(s.lines).toEqual([{ text: '1 element has no time yet — the minutes are at least this.', tone: 'n' }]);
  });
});

describe('SMED — convert, streamline, the ladder (worked example 2)', () => {
  it('now 42 → separated 33 → converted 27 → streamlined 9, the labour 17 with two at once', () => {
    const l = ladderOf(planned());
    expect([l.now.elapsedSec, l.separated.elapsedSec, l.converted.elapsedSec, l.streamlined.elapsedSec].map(x => x / M)).toEqual([42, 33, 27, 9]);
    expect([l.streamlined.labourSec / M, l.converts, l.streamlines, l.planned, l.last]).toEqual([17, 1, 3, true, 'streamlined']);
    expect(ladderSays(l)).toEqual({ text: '42 min now → 33 min separated → 27 min converted → 9 min streamlined (17 min of work, some in parallel), planned — proved when it is timed again. Single-digit minutes — SMED\'s target.', tone: 'g' });
    expect(SMED_TARGET_SEC).toBe(540);
  });
  it('without the plan: the ladder stops at separated and says what is still to find', () => {
    const l = ladderOf(planned().map(({ plan: _p, ...x }) => { void _p; return x; }));
    expect([l.planned, l.last, l.separated.elapsedSec / M]).toEqual([false, 'separated', 33]);
    expect(ladderSays(l).text).toBe('42 min now → 33 min separated. SMED\'s target is single-digit minutes: 24 min still to find.');
  });
  it('the grid: elements alongside share a column — elapsed is the longest in each, the labour all of them', () => {
    const now = arrange(planned(), 'now');
    expect(now.cols.length).toBe(6);
    const plan = arrange(planned(), 'streamlined');
    expect(plan.cols.map(c => [c.ids, c.sec / M])).toEqual([[['A', 'C'], 5], [['F'], 4]]);
    expect(coLanes(plan, 'who')).toEqual(['Op 1', 'Fitter', 'Team leader']);
    expect(coLanes(now, 'where')).toEqual(['Former', 'Stores', 'Jaws', 'Film unit']);
    /* as timed with two at once: the reel alongside the tube — 42 → 34 elapsed, the labour by the people on each */
    const together = planned().map(x => (x.id === 'C' ? { ...x, alongside: 'A' } : x));
    expect([arrange(together, 'now').elapsedSec / M, arrange(together, 'now').labourSec / M]).toEqual([34, 46]);
    expect(changeoverFigures(together).nowSec / M).toBe(34);
    /* an id that is not there leaves the element on its own */
    expect(arrange([...planned(), { id: 'G', order: 6, name: 'g', sec: 60, side: 'internal', source: 'typed', alongside: 'nowhere' }], 'now').cols.length).toBe(7);
  });
  it('Shingo\'s four functions: setting, adjusting and trial runs against the whole', () => {
    expect(functionShares(planned()).by).toEqual({ prepare: 9 * M, mount: 18 * M, adjust: 11 * M, trial: 4 * M });
    expect(functionSays(planned())).toBe('Setting, adjusting and trial runs: 15 min of 42 min — 36%; they are typically half a changeover, and the first to eliminate.');
    expect(functionSays(seq())).toBe('8 elements not given a function yet.');
  });
  it('the plan in words, and the SMED action a fix or countermeasure carries', () => {
    const [A, E, B, C, D, F] = planned();
    const name = (id: string) => planned().find(x => x.id === id)?.name;
    expect(planWords(A)).toBe('Streamline — quick-release clamps: 10 min → 4 min');
    expect(planWords({ ...A, plan: { kind: 'streamline', how: 'clamps', note: 'quick-release collar', targetSec: 4 * M } })).toBe('Streamline — quick-release clamps: quick-release collar; 10 min → 4 min');
    expect(planWords(C, name)).toBe('Streamline — in parallel, alongside Change the former tube (Fitter): 8 min → 5 min');
    expect(planWords(B)).toBe('Convert to external — prepare in advance: pre-heat the spare jaws');
    expect(planWords(D)).toBe('Eliminate — no adjustment: fixed stops');
    expect([planWords(E), planWords(F)]).toEqual(['Done before the line stops', '']);
    expect(actionWords(B)).toBe('convert to external (prepare in advance), 6 min');
    expect(actionWords(A)).toBe('streamline (quick-release clamps), 10 min → 4 min');
    expect(actionWords(D)).toBe('eliminate (no adjustment), 5 min');
    expect(actionWords(E)).toBe('do it while the line runs (external), 9 min');
    expect(actionWords(F)).toBe('internal, 4 min');
  });
});

describe('SMED — what the changeovers cost, extrapolated (worked example 2)', () => {
  it('the running pattern is asked, never assumed; shifts may differ', () => {
    expect(runningOf({}).missing).toEqual(['the shifts a day', 'the hours a shift', 'the days a week']);
    expect(runningOf({ shiftsPerDay: 2, hoursPerShift: 8 }).missing).toEqual(['the planned breaks a shift the line stops for', 'the days a week']);
    /* a shift runs for its length less the breaks the line stops for */
    expect(runningOf(running).run).toEqual({ shifts: 2, minutesPerShift: [450, 450], shiftMinutes: [480, 480], breakMinutes: [30, 30], minutesPerDay: 900, daysPerWeek: 7, minutesPerWeek: 6300, weeksPerYear: 48 });
    /* relief covers the breaks: 0 is an answer, and the shift runs whole */
    expect(runningOf({ shiftHours: [8, 8, 6], breakMin: 0, daysPerWeek: 5 }).run?.minutesPerDay).toBe(22 * 60);
    expect(runningOf({ shiftHours: [8, 8, 6], shiftBreaks: [30, 30, 20], daysPerWeek: 6 }).run?.minutesPerShift).toEqual([450, 450, 340]);
    expect(runningOf({ shiftsPerDay: 1, hoursPerShift: 1, breakMin: 60, daysPerWeek: 5 }).missing).toEqual(['breaks shorter than the shift']);
    const r = runningOf(running).run;
    if (!r) throw new Error('no run');
    expect(runningWords(r)).toBe('2 shifts of 8 h, less 30 min of breaks the line stops for — 7.5 h running each; 7 days a week; 48 weeks a year');
    expect(runningWords(runningOf({ shiftHours: [8, 6], breakMin: 0, daysPerWeek: 6 }).run as NonNullable<typeof r>)).toBe('2 shifts — 8 h, the line running through its breaks; 6 h, the line running through its breaks; 6 days a week');
  });
  it('the line\'s own shifts give the pattern\'s shifts and hours — the breaks are still asked', () => {
    expect(patternFromShifts([{ start: '06:00', end: '14:00' }, { start: '14:00', end: '22:00' }, { start: '22:00', end: '06:00' }, { start: '', end: '' }]))
      .toEqual({ shiftsPerDay: 3, shiftHours: [8, 8, 8] });
    expect(patternFromShifts([{ start: '', end: '' }])).toBeUndefined();
  });
  it('the speed is the critical machine\'s plate speed — unless people set the pace; else said as not a plate speed', () => {
    const st = (id: string, name: string, kind: 'machine' | 'people', rate: number, source: 'plate' | 'timed' | 'standard' | 'estimate') => ({ id, name, kind, unit: 'bags', contains: 1, rate, ratePer: 'min' as const, source });
    /* the Bagger is the slowest on running speed, off its plate */
    expect(lineRateOf({ stations: [st('w', 'Weigher', 'machine', 140, 'plate'), st('b', 'Bagger', 'machine', 100, 'plate'), st('p', 'Packers', 'people', 120, 'timed')] }))
      .toEqual({ ratePerMin: 100, from: 'plate', station: 'Bagger' });
    /* people are slowest and were timed: they set the pace */
    expect(lineRateOf({ stations: [st('b', 'Bagger', 'machine', 100, 'plate'), st('p', 'Packers', 'people', 80, 'timed')] })).toEqual({ ratePerMin: 80, from: 'person', station: 'Packers' });
    /* or carry a standard time from the time study (Line capacity) — the same: people set the pace */
    expect(lineRateOf({ stations: [st('b', 'Bagger', 'machine', 100, 'plate'), st('p', 'Packers', 'people', 75, 'standard')] })).toEqual({ ratePerMin: 75, from: 'person', station: 'Packers' });
    /* the slowest is a guess: not a plate speed — the standard's target, then the line's setting */
    expect(lineRateOf({ targetPerMin: 90, stations: [st('b', 'Bagger', 'machine', 70, 'estimate')] })).toEqual({ ratePerMin: 90, from: 'standard' });
    expect(lineRateOf(undefined, { packsPerMin: 85 })).toEqual({ ratePerMin: 85, from: 'line' });
    expect(lineRateOf(undefined)).toBeUndefined();
    expect([rateFromWords('plate', 'Bagger'), rateFromWords('person', 'Packers'), rateFromWords('standard'), rateFromWords('typed')])
      .toEqual(['the Bagger\'s plate speed', 'Packers\'s timed pace — people set it', 'the standard\'s target — not a plate speed', 'typed']);
  });
  it('the pounds in two parts: idle labour, and contribution only where the line has a margin', () => {
    expect(moneyOf({ crew: 4, labourRatePerHour: 12.5, labourBurden: 1.3, marginPerPack: 0.05 })).toEqual({ labourPerHour: 65, marginPerPack: 0.05 });
    expect(moneyOf({ crew: 4, labourRatePerHour: 12.5 })).toEqual({ labourPerHour: 50 });
    expect(moneyOf({})).toBeUndefined();
  });
  it('changeovers a shift, a day or a week — each worked out from whichever is known', () => {
    const run = runningOf(running).run;
    expect(changeoversPer({ count: 3, per: 'shift' }, run)).toEqual({ shift: 3, day: 6, week: 42 });
    expect(changeoversPer({ count: 6, per: 'day' }, run)).toEqual({ shift: 3, day: 6, week: 42 });
    expect(changeoversPer({ count: 42, per: 'week' }, run)).toEqual({ shift: 3, day: 6, week: 42 });
    expect(changeoversOf({ perWeek: 6 })).toEqual({ week: 6 });
    expect(figuresOf({ sequence: seq(), running, changeovers: { count: 3, per: 'shift' } }).perWeek).toBe(42);
  });
  it('per shift → day → week → year: minutes stopped, packs not made, pounds', () => {
    const run = runningOf(running).run;
    if (!run) throw new Error('no run');
    const c = extrapolate(42 * M, { shift: 3, day: 6, week: 42 }, run, 100, money);
    expect([c.shift.sec / M, c.day.sec / M, c.week.sec / M]).toEqual([126, 252, 1764]);
    expect([c.week.sec / 3600, c.week.packs, c.week.labour]).toEqual([29.4, 176_400, 5_880]);
    expect(c.week.contribution).toBeCloseTo(8_820, 6);
    expect(c.year?.sec).toBe(84_672 * M);
    expect([c.year?.packs, c.year?.labour]).toEqual([8_467_200, 282_240]);
    expect(c.year?.contribution).toBeCloseTo(423_360, 4);
    expect(c.shareOfRunning).toBeCloseTo(0.28, 6);
    /* row by row, as the page's table draws it */
    expect(scaleRows(c)).toEqual([
      { per: 'A shift', stopped: '2.1 h', packs: '12,600', labour: '£420', contribution: '£630' },
      { per: 'A day', stopped: '4.2 h', packs: '25,200', labour: '£840', contribution: '£1,260' },
      { per: 'A week', stopped: '29.4 h', packs: '176,400', labour: '£5,880', contribution: '£8,820' },
      { per: 'A year', stopped: '1,411.2 h', packs: '8,467,200', labour: '£282,240', contribution: '£423,360' },
    ]);
    expect(scaleSays(extrapolate(42 * M, { shift: 3, day: 6, week: 42 }, run))).toBe('A shift: 2.1 h stopped; a day: 4.2 h.');
    /* no speed: no packs, so no contribution — the labour alone */
    expect(extrapolate(42 * M, { shift: 3, day: 6, week: 42 }, run, undefined, money).week).toEqual({ sec: 1764 * M, labour: 5_880 });
  });
  it('says it on the same scale for the plan: 29.4 h a week stopped, 6.3 h streamlined — 23.1 h back', () => {
    const l = ladderOf(planned());
    const f = { running, changeovers: { count: 3, per: 'shift' as const }, ...plate };
    expect(extrapolationSays(l, f, money).text).toBe('Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h a week stopped (28% of the running time) — 176,400 packs at 100 a minute, the Bagger\'s plate speed; £5,880 of idle labour, and £8,820 of contribution if the packs cannot be made up. Over 48 weeks a year: 1,411.2 h — 8,467,200 packs; £282,240 of idle labour, and £423,360 of contribution if the packs cannot be made up. Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds.');
    /* the standard's target: packs, said as not a plate speed; no cost settings, no pounds */
    expect(extrapolationSays(l, { running: { ...running, weeksPerYear: undefined }, changeovers: f.changeovers, ratePerMin: 90, rateFrom: 'standard' }).text).toBe('Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h a week stopped (28% of the running time) — 158,760 packs at 90 a minute, the standard\'s target — not a plate speed. Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds.');
    /* no speed and no cost: the time alone — packs and pounds are simply not said */
    expect(extrapolationSays(l, { running: { ...running, weeksPerYear: undefined }, changeovers: f.changeovers }).text).toBe('Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h a week stopped (28% of the running time). Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds.');
    /* seven days a week, a day's count, no plan: separated is the second sentence */
    expect(extrapolationSays(ladderOf(seq()), { running, changeovers: { count: 6, per: 'day' } }).text).toMatch(/^Now 42 min × 6 a day × 7 days = 29\.4 h a week stopped .* Separated to 27 min: 18\.9 h a week — 10\.5 h back\.$/);
    expect(extrapolationSays(l, {}).text).toBe('What the changeovers cost needs how the line runs — the shifts a day, the hours a shift, the days a week, how many changeovers a shift, a day or a week.');
  });
  it('spans as the floor says them', () => {
    expect([span(90 * M), span(1764 * M), span(45 * M), mins(2520), mins(270), mins(30), mins(1650)]).toEqual(['90 min', '29.4 h', '45 min', '42 min', '4.5 min', '30.0 s', '28 min']);
    expect([countWord(5), countWord(12), countWord(1)]).toEqual(['five', '12', 'one']);
  });
});

describe('SMED — the interval reads the running pattern', () => {
  it('worked example 1: 450 − 300 = 150 free; five products at 42 → every 1.4 days; at 27 → 0.9, daily; a daily interval needs 30 min', () => {
    const f = changeoverFigures(seq(), 6);
    const iv = intervalOf(f, products, 450);
    expect([iv.products, iv.known, iv.runMinPerDay, iv.freeMinPerDay, iv.ready]).toEqual([5, 5, 300, 150, true]);
    expect(iv.daysNow).toBeCloseTo(1.4, 6);
    expect(iv.daysAfter).toBeCloseTo(0.9, 6);
    expect(iv.dailyMin).toBe(30);
    expect(intervalSays(iv, f).text).toBe('Five products at 42 min run every 1.4 days; at 27 min, every 0.9 — daily.');
    const f45 = changeoverFigures([...seq().filter(x => x.side === 'internal'), st('Change the coder message', 18)]);
    expect(intervalOf(f45, products, 450).daysNow).toBeCloseTo(1.5, 6);
  });
  it('the minutes a day come from the shifts less their breaks — 8 h less 30 min on one shift is 450 — or an older record\'s typed minutes', () => {
    expect(availableOf({ running: { shiftsPerDay: 1, hoursPerShift: 8, breakMin: 30, daysPerWeek: 7 } })).toEqual({ min: 450, from: 'running' });
    expect(availableOf({ running: { shiftsPerDay: 1, hoursPerShift: 8, daysPerWeek: 7 } })).toBeUndefined();
    expect(availableOf({ availableMinPerDay: 450 })).toEqual({ min: 450, from: 'typed' });
    expect(availableOf({})).toBeUndefined();
  });
  it('needs every product\'s run time, the line\'s day, and two products at least — each said in grey', () => {
    const f = changeoverFigures(seq(), 6);
    expect(intervalSays(intervalOf(f, products.slice(0, 1), 450), f).text).toMatch(/^List the products run on this line/);
    expect(intervalSays(intervalOf(f, [...products.slice(0, 3), { id: 'p9', product: 'Rooster 2kg' }], 450), f).text).toBe('3 of 4 products have a run time; the interval needs all — Rooster 2kg still to say.');
    expect(intervalSays(intervalOf(f, products), f).text).toBe('How the line runs — its shifts and their hours — the interval needs it.');
    expect(intervalSays(intervalOf(f, products, 300), f)).toEqual({ text: 'No time free for changeovers: 300 min of run in the 300 min the line has a day.', tone: 'r' });
    expect(runMinOf(products[0])).toEqual({ min: 120, how: 'rate' });
    expect(runMinOf({ id: 'x', product: 'x', demandPerDay: 100 })).toBeUndefined();
  });
});

describe('SMED — prove it, standardise, paper', () => {
  it('before → after: the minutes, the week back, and the plan it was held against; nothing claimed while carried', () => {
    const before = changeoverFigures(planned(), 42);
    const carried = changeoverFigures(carrySequence(planned()), 42);
    expect(carrySequence(planned()).every(x => x.source === 'carried' && x.at === undefined && x.plan === undefined)).toBe(true);
    expect(compareChangeovers(before, carried)).toEqual({ text: '42 min → 42 min so far — 6 of 6 elements carried from before, not timed again yet.', tone: 'n' });
    /* timed again: the jaws pre-heated (B gone), the clamps fitted (A 5 min), the rest as before */
    const again = planned().filter(x => x.id !== 'B').map(({ plan: _p, ...x }) => { void _p; return x.id === 'A' ? { ...x, sec: 5 * M } : x; });
    expect(compareChangeovers(before, changeoverFigures(again, 42), ladderOf(planned())))
      .toEqual({ text: '42 min → 31 min (−11 min); 7.7 h a week back at 42 changeovers. The number moved; what moved it is the fix\'s to say. 9 min of external work is still done with the line stopped. The plan was 9 min streamlined — 22 min still to go.', tone: 'g' });
    expect(compareChangeovers(before, before).text).toBe('42 min → 42 min, no change. The number moved only within the half-minute.');
    expect(compareChangeovers(changeoverFigures([]), before).text).toMatch(/^Too early/);
  });
  it('Set as the standard: the stop with the external work outside, the plan\'s minutes, the checklist', () => {
    const a = standardFrom(planned(), { id: 'a1', from: 'Finest Red 2kg', at: 5, by: 'Rowland', studyId: 's1' });
    expect([a.minutes, a.targetMinutes, a.steps.length, a.from, a.fromStudyId]).toEqual([33, 9, 6, 'Finest Red 2kg', 's1']);
    expect(a.steps[1]).toEqual({ name: 'Fetch the next former', side: 'external', sec: 540, fn: 'prepare', crew: ['Op 1'], when: 'before' });
    expect(a.checklist).toEqual({ before: ['Fetch the next former', 'Heat the new sealing jaws'], stopped: ['Change the former tube — 4 min', 'Change the film reel — 5 min', 'First bags and check the seal'], after: [] });
    expect(standardLine(a, () => '12 Oct')).toBe('33 min stopped · 6 elements, 1 external · plan 9 min · from Finest Red 2kg · agreed 12 Oct');
    /* an external element after the last internal one is done after the line runs again */
    expect(checklistOf([...seq(), st('Clean down the old film off-cuts', 3, 'external')]).after).toEqual(['Clean down the old film off-cuts']);
  });
  it('on paper: the grid as a table — who, where, I/E, the plan, the time, the elapsed — and the figures in words', () => {
    const sheet = changeoverSheet({ sequence: planned(), running, changeovers: { count: 3, per: 'shift' }, ...plate }, undefined, new Map([['B', 'Heat the new sealing jaws — convert to external (prepare in advance), 6 min']]), money);
    expect(sheet.rows[0]).toEqual({ n: 1, name: 'Change the former tube', who: 'Op 1', where: 'Former', side: 'I', plan: 'Streamline — quick-release clamps: 10 min → 4 min', minutes: '10 min', elapsed: '10 min', how: 'timed' });
    expect(sheet.rows[2]).toMatchObject({ side: 'I', elapsed: '25 min', branch: 'Heat the new sealing jaws — convert to external (prepare in advance), 6 min' });
    expect(sheet.rows[5]).toMatchObject({ who: 'Op 1, Team leader', elapsed: '42 min' });
    expect(sheet.total).toEqual({ minutes: '42 min', labour: '46 min', internal: '33 min', external: '9 min' });
    expect(sheet.lines).toEqual([
      '42 min now. With the 9 min of external work done while the line runs: 33 min — 6.3 h a week back, 42 changeovers.',
      '42 min now → 33 min separated → 27 min converted → 9 min streamlined (17 min of work, some in parallel), planned — proved when it is timed again. Single-digit minutes — SMED\'s target.',
      'Setting, adjusting and trial runs: 15 min of 42 min — 36%; they are typically half a changeover, and the first to eliminate.',
      'Now 42 min × 3 a shift × 2 shifts × 7 days = 29.4 h a week stopped (28% of the running time) — 176,400 packs at 100 a minute, the Bagger\'s plate speed; £5,880 of idle labour, and £8,820 of contribution if the packs cannot be made up. Over 48 weeks a year: 1,411.2 h — 8,467,200 packs; £282,240 of idle labour, and £423,360 of contribution if the packs cannot be made up. Streamlined to 9 min: 6.3 h a week — 23.1 h back, if the plan holds.',
      'A shift: 2.1 h stopped — 12,600 packs, £420 of idle labour, £630 of contribution; a day: 4.2 h — 25,200 packs, £840 of idle labour, £1,260 of contribution.',
      'List the products run on this line, each with what the customer takes a day, to read how often each can run.',
    ]);
    expect(changeoverSheet({ sequence: [] }).lines).toEqual([]);
    expect(stepFigure(seq()[3])).toBe('external, 7 min');
  });
});
