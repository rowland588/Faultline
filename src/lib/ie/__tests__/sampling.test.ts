/* Work sampling's arithmetic, proved by docs/TOOLKIT.md §9's worked example. */
import { describe, it, expect } from 'vitest';
import { tapsNeeded, marginOf, shares, moreNeeded, schedulePrompts, nextPrompt, missedPrompts, samplingReading, samplingLine, samplingEnough, type Tap } from '../sampling';

const tap = (i: number, who: string, activity: string, at = i * 60_000): Tap => ({ id: `t${i}`, at, who, activity });
/** 190 taps for Op 2: 116 working, 34 walking, 27 waiting, 13 searching. */
const op2: Tap[] = [
  ...Array.from({ length: 116 }, (_, i) => tap(i, 'Op 2', 'working')),
  ...Array.from({ length: 34 }, (_, i) => tap(200 + i, 'Op 2', 'walking')),
  ...Array.from({ length: 27 }, (_, i) => tap(300 + i, 'Op 2', 'waiting')),
  ...Array.from({ length: 13 }, (_, i) => tap(400 + i, 'Op 2', 'searching')),
];

describe('work sampling (tool 9)', () => {
  it('p 0.30 within ±5 points needs 323 taps — the TOOLKIT proof', () => {
    expect(tapsNeeded(0.30, 0.05)).toBe(323);
  });
  it('a share of 61% from 190 taps carries about ±7 points', () => {
    expect(marginOf(0.61, 190)).toBeCloseTo(0.069, 3);
    expect(marginOf(0.5, 0)).toBe(0);
  });
  it('the shares of one person, in the activities\' order, with their margins', () => {
    const s = shares(op2, undefined, 'Op 2');
    expect(s.map(x => [x.activity, x.taps])).toEqual([['working', 116], ['walking', 34], ['waiting', 27], ['searching', 13], ['away', 0]]);
    expect(s[0]?.share).toBeCloseTo(0.6105, 3);
    expect(moreNeeded(s, 190, 5)).toBe(tapsNeeded(116 / 190, 0.05) - 190);
  });
  it('an activity tapped that the list does not name is still counted, after the list', () => {
    const s = shares([tap(1, 'A', 'working'), tap(2, 'A', 'cleaning')], ['working'], 'A');
    expect(s.map(x => x.activity)).toEqual(['working', 'cleaning']);
    expect(s[1]?.share).toBe(0.5);
  });
  it('the reading says the shares, the biggest with its margin, the taps and how many more', () => {
    const r = samplingReading({ taps: op2, marginPts: 5 }, 'Op 2');
    expect(r).toBe('Op 2: working 61% (±7), walking 18%, waiting 14%, searching 7% — from 190 taps; 176 more for ±5 points');
  });
  it('too few taps: it says so rather than a figure', () => {
    expect(samplingEnough(0)).toBe('none'); expect(samplingEnough(12)).toBe('early'); expect(samplingEnough(30)).toBe('enough');
    expect(samplingReading({ taps: op2.slice(0, 12) }, 'Op 2')).toBe('Op 2: too early — 12 taps so far, 30 needed before the shares are said');
    expect(samplingReading({ taps: [] }, 'Op 3')).toBe('Op 3: no taps yet');
  });
  it('the prompts fall inside the window, in order, the same for every device', () => {
    let i = 0; const seq = [0.9, 0.1, 0.5, 0.3];
    const rand = () => seq[i++ % seq.length] ?? 0.5;
    const p = schedulePrompts(1_000_000, 1_000_000 + 8 * 3_600_000, 4, rand);
    expect(p).toHaveLength(4);
    expect(p).toEqual([...p].sort((a, b) => a - b));
    expect(p.every(x => x >= 1_000_000 && x <= 1_000_000 + 8 * 3_600_000)).toBe(true);
    expect(schedulePrompts(5, 5, 3)).toEqual([]);
    expect(nextPrompt(p, p[1] ?? 0)).toBe(p[2]);
    expect(nextPrompt(p, (p[3] ?? 0) + 1)).toBeUndefined();
  });
  it('a prompt nobody answered for a person is missed once its grace has passed', () => {
    const prompts = [100_000, 2_000_000, 3_000_000];
    const taps = [tap(1, 'Op 1', 'working', 2_000_500)];
    expect(missedPrompts(prompts, taps, 'Op 1', 2_700_000)).toEqual([100_000]);
    expect(missedPrompts(prompts, taps, 'Op 1', 3_000_000 + 11 * 60_000)).toEqual([100_000, 3_000_000]);
  });
  it('the study\'s one line names the people, the taps and the worst margin', () => {
    expect(samplingLine({ taps: op2, who: ['Op 2'] })).toBe('1 person · 190 taps · the biggest share within ±7 points');
    expect(samplingLine({ who: ['Op 1', 'Op 2'] })).toBe('2 people watched · no taps yet');
  });
});
