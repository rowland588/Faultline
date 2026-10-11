/* The changeover and its interval (docs/TOOLKIT.md, tool 6) — the toolkit's
 * proof: 450 − 300 = 150 free; 5 × 42 = 210 → 1.4 days; 5 × 27 = 135 → 0.9
 * days; 15 × 6 = 90 min a week. */
import { describe, it, expect } from 'vitest';
import { changeoverFigures, changeoverSays, changeoverSheet, carrySequence, compareChangeovers, countWord, intervalOf, intervalSays, mins, runMinOf, standardFrom, standardLine, stepFigure } from '../changeover';
import type { ChangeoverProduct, ChangeoverStep } from '../../study';

let n = 0;
const st = (name: string, min: number, side: ChangeoverStep['side'] = 'internal', source: ChangeoverStep['source'] = 'timed'): ChangeoverStep =>
  ({ id: `c${n}`, order: n++, name, sec: min * 60, side, source });

/* Finest Red 2kg → Express 1.25 kg: eight steps, 42 min, three external (15). */
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

describe('the changeover (tool 6)', () => {
  it('minutes now, internal and external, with the external work out, and what a week buys back', () => {
    const f = changeoverFigures(seq(), 6);
    expect([f.steps, f.known, f.untimed, f.carried, f.enough, f.source]).toEqual([8, 8, 0, 0, true, 'timed']);
    expect([f.nowSec, f.internalSec, f.externalSec, f.afterSec, f.weekSec]).toEqual([42 * 60, 27 * 60, 15 * 60, 27 * 60, 90 * 60]);
    expect(f.external.map(x => x.name)).toEqual(['Pre-stage the film reels', 'Fetch the next former from the store', 'Print the new labels']);
    expect(f.internal[0].name).toBe('Change the former tube');
  });
  it('says it as the ops lead would', () => {
    const s = changeoverSays(changeoverFigures(seq(), 6));
    expect(s.text).toBe('42 min now. With the 15 min of external work done while the line runs: 27 min — 90 min a week back, 6 changeovers.');
    expect([s.tone, s.verdict, s.lines]).toEqual(['a', '15 min external inside', []]);
    const noWeek = changeoverSays(changeoverFigures(seq()));
    expect(noWeek.text).toBe('42 min now. With the 15 min of external work done while the line runs: 27 min.');
  });
  it('against the agreed standard: over it is red, within it green; all internal is neutral', () => {
    const over = changeoverSays(changeoverFigures(seq(), 6), { minutes: 27 });
    expect([over.tone, over.verdict]).toEqual(['r', 'Over the standard']);
    expect(over.lines).toEqual([{ text: 'Over the 27 min standard by 15 min.', tone: 'r' }]);
    const internal = seq().filter(x => x.side === 'internal');
    const within = changeoverSays(changeoverFigures(internal), { minutes: 27 });
    expect([within.tone, within.verdict, within.text]).toEqual(['g', 'Within the standard', '27 min now, all of it with the line stopped — no external work found yet.']);
    expect(within.lines).toEqual([{ text: 'Within the 27 min standard.', tone: 'g' }]);
    expect(changeoverSays(changeoverFigures(internal)).tone).toBe('n');
  });
  it('enough: nothing said until a step has a time; an untimed step makes the minutes "at least"', () => {
    expect(changeoverSays(changeoverFigures([])).verdict).toBe('Not timed');
    const none = changeoverSays(changeoverFigures([{ id: 'x', order: 0, name: 'x', side: 'internal', source: 'typed' }]));
    expect([none.verdict, none.text]).toEqual(['Not timed', '1 step, none timed yet — Lap as each ends, or type the minutes.']);
    const f = changeoverFigures([...seq(), { id: 'u', order: 9, name: 'Sign off', side: 'internal', source: 'typed' }], 6);
    const s = changeoverSays(f);
    expect(f.untimed).toBe(1);
    expect(s.text).toMatch(/^At least 42 min now\./);
    expect(s.lines).toEqual([{ text: '1 step has no time yet — the minutes are at least this.', tone: 'n' }]);
  });
  it('the interval: 450 − 300 = 150 free; five products at 42 → every 1.4 days; at 27 → 0.9, daily; a daily interval needs 30 min', () => {
    const f = changeoverFigures(seq(), 6);
    const iv = intervalOf(f, products, 450);
    expect([iv.products, iv.known, iv.runMinPerDay, iv.freeMinPerDay, iv.ready]).toEqual([5, 5, 300, 150, true]);
    expect(iv.daysNow).toBeCloseTo(1.4, 6);
    expect(iv.daysAfter).toBeCloseTo(0.9, 6);
    expect(iv.dailyMin).toBe(30);
    expect(intervalSays(iv, f).text).toBe('Five products at 42 min run every 1.4 days; at 27 min, every 0.9 — daily.');
    /* at 45 min, LEAN40's own figures: 1.5 days, and 30 min for a daily interval */
    const f45 = changeoverFigures([...seq().filter(x => x.side === 'internal'), st('Change the coder message', 18)]);
    const iv45 = intervalOf(f45, products, 450);
    expect(iv45.daysNow).toBeCloseTo(1.5, 6);
    expect(intervalSays(iv45, f45).text).toBe('Five products at 45 min run every 1.5 days — a daily interval needs a changeover of 30 min or less.');
  });
  it('the interval needs every product\'s run time, the minutes a day, and two products at least — each said in grey', () => {
    const f = changeoverFigures(seq(), 6);
    expect(intervalSays(intervalOf(f, products.slice(0, 1), 450), f).text).toMatch(/^List the products run on this line/);
    const short = intervalOf(f, [...products.slice(0, 3), { id: 'p9', product: 'Rooster 2kg' }], 450);
    expect([short.known, short.missing, short.ready]).toEqual([3, ['Rooster 2kg'], false]);
    expect(intervalSays(short, f).text).toBe('3 of 4 products have a run time; the interval needs all — Rooster 2kg still to say.');
    expect(intervalSays(intervalOf(f, products), f).text).toBe('How many minutes the line runs a day — the interval needs it.');
    const full = intervalOf(f, products, 300);
    expect(full.ready).toBe(false);
    expect(intervalSays(full, f)).toEqual({ text: 'No time free for changeovers: 300 min of run in the 300 min the line has a day.', tone: 'r' });
    expect(intervalSays(intervalOf(changeoverFigures([]), products, 450), changeoverFigures([])).text).toMatch(/^Time or type the changeover first/);
  });
  it('a run time from demand and the rate, or typed; neither is nothing', () => {
    expect(runMinOf(products[0])).toEqual({ min: 120, how: 'rate' });
    expect(runMinOf(products[2])).toEqual({ min: 50, how: 'typed' });
    expect(runMinOf({ id: 'x', product: 'x', demandPerDay: 100 })).toBeUndefined();
  });
  it('before → after: the minutes and the week they buy back; nothing claimed while a step is carried', () => {
    const before = changeoverFigures(seq(), 6);
    const carried = changeoverFigures(carrySequence(seq()), 6);
    expect(carrySequence(seq()).every(x => x.source === 'carried' && x.at === undefined)).toBe(true);
    expect(compareChangeovers(before, carried)).toEqual({ text: '42 min → 42 min so far — 8 of 8 steps carried from before, not timed again yet.', tone: 'n' });
    const after = changeoverFigures(seq().filter(x => x.side === 'internal'), 6);
    expect(compareChangeovers(before, after)).toEqual({ text: '42 min → 27 min (−15 min); 90 min a week back at 6 changeovers. The number moved; what moved it is the fix\'s to say.', tone: 'g' });
    const worse = changeoverFigures([...seq(), st('Wait for the fitter', 12)], 6);
    expect(compareChangeovers(before, worse).tone).toBe('r');
    expect(compareChangeovers(before, worse).text).toMatch(/^42 min → 54 min \(\+12 min\)\. The number moved.* 15 min of external work is still done with the line stopped\.$/);
    expect(compareChangeovers(before, before).text).toBe('42 min → 42 min, no change. The number moved only within the half-minute.');
    expect(compareChangeovers(changeoverFigures([]), after).text).toMatch(/^Too early/);
  });
  it('a step\'s figure, for a fix\'s words', () => {
    expect(stepFigure(seq()[3])).toBe('external, 7 min');
    expect(stepFigure({ id: 'x', order: 0, name: 'x', side: 'internal', source: 'typed' })).toBe('internal, no time yet');
  });
  it('Set as the standard keeps the sequence, its minutes and where it came from; its line under the product', () => {
    const a = standardFrom(seq(), { id: 'a1', from: 'Finest Red 2kg', at: 5, by: 'Rowland', studyId: 's1' });
    expect([a.minutes, a.steps.length, a.steps[1], a.from, a.fromStudyId, a.by]).toEqual([42, 8, { name: 'Fetch the next former from the store', side: 'external', sec: 300 }, 'Finest Red 2kg', 's1', 'Rowland']);
    expect(standardLine(a, () => '11 Oct')).toBe('42 min · 8 steps, 3 external · from Finest Red 2kg · agreed 11 Oct');
  });
  it('on paper: a row per step, the totals, and the figures in words', () => {
    const sheet = changeoverSheet({ sequence: carrySequence(seq()).map((x, i) => (i === 0 ? { ...x, source: 'timed' as const } : x)), perWeek: 6, products, availableMinPerDay: 450 });
    expect(sheet.rows[0]).toEqual({ n: 1, name: 'Stop and clear the former', side: 'Internal', minutes: '4 min', how: 'timed' });
    expect(sheet.rows[1]).toEqual({ n: 2, name: 'Fetch the next former from the store', side: 'External', minutes: '5 min', how: 'carried from before' });
    expect(sheet.total).toEqual({ minutes: '42 min', internal: '27 min', external: '15 min' });
    expect(sheet.lines).toEqual([
      '42 min now. With the 15 min of external work done while the line runs: 27 min — 90 min a week back, 6 changeovers.',
      'Five products at 42 min run every 1.4 days; at 27 min, every 0.9 — daily.',
    ]);
    expect(changeoverSheet({ sequence: [] }).lines).toEqual([]);
  });
  it('minutes as the floor says them', () => {
    expect([mins(2520), mins(270), mins(30), mins(1650)]).toEqual(['42 min', '4.5 min', '30.0 s', '28 min']);
    expect([countWord(5), countWord(12), countWord(1)]).toEqual(['five', '12', 'one']);
  });
});
