/* A shift's losses by hand — proved on docs/LEAN40.md's worked example:
 * 450 × 100 = 45,000; made 36,500 → 85 min lost; 52 of stops + 18 of
 * changeover + 6 of rejects explained; 9 not yet explained. */
import { describe, it, expect } from 'vitest';
import { lossFigures, lossSays, compareLosses, nextShift, lossLine, lossRows, barWords, barExpect, inWindow, isChangeover, dayWords, rateWords, stopsOfBar, shiftWords, firstCount } from '../losses';
import { shiftWindow } from '../../shifts';
import type { LossCount } from '../../study';
import type { Observation } from '../../../types';

const H = 3_600_000, MIN = 60_000;
/* Shift 1 on 10 October 2026, 06:00–14:00, 480 minutes less 30 of breaks. */
const FROM = new Date(2026, 9, 10, 6, 0).getTime(), TO = FROM + 8 * H;
const count: LossCount = { shift: 'Shift 1', from: FROM, to: TO, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'standard' };

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
const cost = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04 };

describe('a shift’s losses (tool 7)', () => {
  it('450 × 100 = 45,000; made 36,500 → 85 min lost; 52 + 18 + 6 explained; 9 not yet explained', () => {
    const f = lossFigures(count, log());
    expect(f.enough).toBe(true);
    expect([f.expected, f.shortPacks, f.lostMin]).toEqual([45_000, 8_500, 85]);
    expect([f.stopsMin, f.changeoverMin, f.rejectsMin, f.explainedMin, f.unexplainedMin]).toEqual([52, 18, 6, 76, 9]);
    expect(f.unexplainedShare).toBeCloseTo(9 / 85, 6);
    expect(f.byCause.map(b => [b.label, b.min, b.stops, b.asset, b.bone])).toEqual([['Breakdown', 32, 1, 'Bagger', 'machine'], ['Minor stop', 20, 2, 'Checkweigher', 'machine']]);
    expect(f.bars.map(b => b.key)).toEqual(['cause:Breakdown', 'cause:Minor stop', 'changeover', 'rejects', 'unexplained']);
    expect(f.logged).toBe(4);
  });
  it('says it plainly — and the unexplained part is amber over a tenth of the loss, never hidden', () => {
    const s = lossSays(lossFigures(count, log()), count, { product: 'Maris Piper 2kg' });
    expect(s.text).toBe('Shift 1 should have made 45,000 at 100 a minute; made 36,500 — 85 min lost: 52 min of stops · 18 min of changeovers · 6 min of rejects (600 packs) · 9 min not yet explained.');
    expect([s.tone, s.verdict]).toEqual(['a', '9 min not yet explained']);
    expect(s.lines.map(l => l.text)).toEqual([
      'Not yet explained is what nobody logged — stops missed, and running slow, which is not measured by hand.',
      'How known: 450 planned minutes from Shift 1\'s window (06:00–14:00) · the packs made and the rejects counted · the rate from the line standard for Maris Piper 2kg · 4 stops timed in Capture in the window.',
    ]);
  });
  it('pounds from the line’s cost model, whole; none said without one', () => {
    const f = lossFigures(count, log(), cost);
    /* 4 × 14.5 × 1.3 = 75.4 idle labour + 100 × 60 × 0.04 = 240 lost output: £315.40 an hour */
    expect(f.costPerHour).toBeCloseTo(315.4, 5);
    expect(f.bars.find(b => b.key === 'cause:Breakdown')?.pounds).toBeCloseTo(168.21, 1);
    expect(lossSays(f, count).text).toMatch(/85 min lost \(£447\): 52 min of stops · 18 min of changeovers · 6 min of rejects \(600 packs\) · 9 min not yet explained \(£47\)\.$/);
    expect(lossFigures(count, log()).bars.every(b => b.pounds === undefined)).toBe(true);
  });
  it('under a tenth the loss reads neutral; all explained says so', () => {
    const quiet = lossFigures({ ...count, made: 37_300 }, log());   // 77 min lost, 76 explained → 1 min
    const s = lossSays(quiet, count);
    expect([s.tone, s.verdict]).toEqual(['n', '77 min lost']);
    const all = lossSays(lossFigures({ ...count, made: 37_400 }, log()), count);   // 76 lost, 76 explained
    expect(all.text).toMatch(/· all of it explained\.$/);
  });
  it('stops that exceed the loss are said, not hidden — and not yet explained never goes below zero', () => {
    const f = lossFigures({ ...count, made: 40_000 }, log());   // 50 min lost against 76 explained
    expect([f.lostMin, f.unexplainedMin, f.excessMin]).toEqual([50, 0, 26]);
    const s = lossSays(f, count);
    expect(s.lines[0]).toEqual({ text: 'Stops logged exceed the loss by 26 min — check the counts.', tone: 'a' });
    expect(s.tone).toBe('a');
    expect(f.bars.some(b => b.kind === 'unexplained')).toBe(false);
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
    const f = lossFigures(count);
    expect([f.split, f.lostMin, f.unexplainedMin, f.bars.length]).toEqual([false, 85, undefined, 1]);   // the rejects alone
    expect(lossSays(f, count).text).toBe('Shift 1 should have made 45,000 at 100 a minute; made 36,500 — 85 min lost. Where it went is read from the line\'s stops in the window.');
  });
  it('no stops logged: the whole loss is not yet explained, and the empty log is said', () => {
    const f = lossFigures(count, []);
    expect([f.unexplainedMin, f.logged]).toEqual([79, 0]);
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
  it('a bar in its own words, and what a fix from it should change', () => {
    const f = lossFigures(count, log(), cost);
    const now = TO + 20 * H;   // the next day
    expect(barWords(f.bars[0], count, now)).toBe('Breakdown on the Bagger — 32 min of stops (1 stop) on Shift 1, yesterday (£168)');
    expect(barWords(f.bars[2], count, now)).toBe('Changeovers on the Bagger — 18 min (1) on Shift 1, yesterday (£95)');
    expect(barWords(f.bars[3], count, now)).toBe('Rejects — 600 packs, 6 min at the rate on Shift 1, yesterday (£32)');
    expect(barWords(f.bars[4], count, now)).toBe('9 min not yet explained on Shift 1, yesterday (£47) — stops not logged, or running slow');
    expect(barExpect(f.bars[0])).toBe('Breakdown on the Bagger: 32 min a shift — fewer on the next shift counted');
    expect(barExpect(f.bars[4])).toBe('Every stop logged on the next shift counted — the part not yet explained down');
  });
  it('before → after: lost minutes and the part not yet explained, the bar first; too early until counted', () => {
    const before = lossFigures(count, log());
    const after = lossFigures({ ...count, from: FROM + 86_400_000, to: TO + 86_400_000, made: 40_900, rejects: 300 },
      [stop({ at: FROM + 86_400_000 + H, mins: 10 }), stop({ at: FROM + 86_400_000 + 2 * H, mins: 18, category: 'Changeover' })]);
    expect([after.lostMin, after.unexplainedMin]).toEqual([41, 10]);
    const c = compareLosses(before, after, 'cause:Breakdown');
    expect(c).toEqual({ text: 'Breakdown on the Bagger: 32 min → 10 min; Lost 85 min → 41 min a shift; not yet explained 9 min → 10 min. The number moved; what moved it is the fix\'s to say.', tone: 'g' });
    expect(compareLosses(before, lossFigures({ ...count, made: undefined }, []))).toEqual({ text: 'Too early — the next shift is not counted yet.', tone: 'n' });
    expect(compareLosses(before, before).text).toMatch(/^Lost 85 min a shift, no change; not yet explained 9 min, no change\./);
    expect(compareLosses(before, lossFigures({ ...count, made: 30_000 }, log())).tone).toBe('r');
  });
  it('Prove it: the same shift, the window moved on to the day it is pressed, nothing counted yet', () => {
    const nx = nextShift(count, TO + 20 * H);    // 10:00 the next day
    expect([nx.from, nx.to, nx.shift, nx.plannedMin, nx.ratePerMin, nx.rateFrom, nx.made, nx.rejects]).toEqual([FROM + 86_400_000, TO + 86_400_000, 'Shift 1', 450, 100, 'standard', undefined, undefined]);
    expect(nextShift(count, FROM + 10 * MIN).from).toBe(FROM + 86_400_000);   // never the same shift twice
    expect(nextShift(count, TO + 3 * 86_400_000).from).toBe(FROM + 3 * 86_400_000);
  });
  it('one line for a card or a row', () => {
    const now = TO + 20 * H;
    expect(lossLine(lossFigures(count, log()), count, now)).toEqual({ text: 'Shift 1 yesterday: 85 min lost · 9 min not yet explained', abnormal: true });
    expect(lossLine(lossFigures({ ...count, made: 37_400 }, log()), count, now)).toEqual({ text: 'Shift 1 yesterday: 76 min lost · all explained', abnormal: false });
    expect(lossLine(lossFigures({ ...count, made: undefined }), count, now)).toEqual({ text: 'Shift 1 yesterday: not yet counted', abnormal: false });
    expect(lossLine(lossFigures(count), count, FROM + H).text).toBe('Shift 1 today: 85 min lost');
  });
  it('the waterfall as a table for paper', () => {
    const t = lossRows(lossFigures(count, log(), cost));
    expect(t?.head).toBe('450 planned minutes at 100 a minute — 45,000 expected, 36,500 made');
    expect(t?.rows.map(r => [r.cause, r.stops, r.minutes, r.pounds])).toEqual([
      ['Breakdown — Bagger', '1', '32 min', '£168'], ['Minor stop — Checkweigher', '2', '20 min', '£105'],
      ['Changeovers', '1', '18 min', '£95'], ['Rejects (600 packs)', '—', '6 min', '£32'], ['Not yet explained', '—', '9 min', '£47'],
    ]);
    expect(t?.rows[4].abnormal).toBe(true);
    expect(t?.total).toEqual({ minutes: '85 min', pounds: '£447' });
    expect(lossRows(lossFigures(undefined))).toBeUndefined();
  });
  it('a bar opens its own stops, in the order they happened; a window typed by hand names its hours', () => {
    const f = lossFigures(count, log());
    expect(stopsOfBar(log(), count, f.bars[1]).map(o => o.subcategory)).toEqual(['Misfeed', 'Sensor trip']);
    expect(stopsOfBar(log(), count, f.bars[2]).map(o => o.category)).toEqual(['Changeover']);
    expect(stopsOfBar(log(), count, f.bars[3])).toEqual([]);
    expect(shiftWords({ from: FROM, to: TO })).toBe('The 06:00–14:00 shift');
    expect(lossLine(f, { ...count, shift: undefined }, TO + 20 * H).text).toBe('The 06:00–14:00 shift yesterday: 85 min lost · 9 min not yet explained');
  });
  it('a new count starts from the shift that has just run, its window and the standard’s rate', () => {
    const shifts = [{ name: 'Shift 1', start: '06:00', end: '14:00' }, { name: 'Shift 2', start: '14:00', end: '22:00' }, { name: 'Nights', start: '22:00', end: '06:00' }];
    expect(firstCount(shifts, 100, FROM + 9 * H)).toEqual({ shift: 'Shift 1', from: FROM, to: TO, plannedMin: 480, ratePerMin: 100, rateFrom: 'standard' });
    expect(firstCount(shifts, 100, TO - 10 * 60_000).shift).toBe('Shift 1');   // counted in its last minutes
    const nights = firstCount(shifts, undefined, new Date(2026, 9, 11, 6, 30).getTime());
    expect([nights.shift, nights.from, nights.plannedMin, nights.ratePerMin]).toEqual(['Nights', new Date(2026, 9, 10, 22, 0).getTime(), 480, undefined]);
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
