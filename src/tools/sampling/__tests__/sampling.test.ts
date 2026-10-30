/* Work sampling's arithmetic, proved by docs/TOOLKIT.md §9's worked example. */
import { describe, it, expect } from 'vitest';
import { tapsNeeded, marginOf, shares, moreNeeded, schedulePrompts, nextPrompt, missedPrompts, dueRound, roundsDone, samplingReading, samplingLine, samplingEnough, samplingOffers, samplingRows, samplingCardLine, boneOfActivity, worstWords, takeNow, defaultShift, shiftStartWords, handOf, randomOf, momentsWords, type Tap } from '../sampling';

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

describe('the rounds of work sampling', () => {
  const prompts = [1_000_000, 2_000_000, 3_000_000];
  it('the round to answer is the latest prompt come, within its grace, with somebody untapped', () => {
    expect(dueRound(prompts, [], ['Op 1', 'Op 2'], 900_000)).toBeUndefined();
    expect(dueRound(prompts, [], ['Op 1', 'Op 2'], 2_100_000)).toEqual({ at: 2_000_000, no: 2, left: ['Op 1', 'Op 2'] });
    const one = [tap(1, 'Op 1', 'working', 2_000_000)];
    expect(dueRound(prompts, one, ['Op 1', 'Op 2'], 2_100_000)).toEqual({ at: 2_000_000, no: 2, left: ['Op 2'] });
    const both = [...one, tap(2, 'Op 2', 'waiting', 2_000_000)];
    expect(dueRound(prompts, both, ['Op 1', 'Op 2'], 2_100_000)).toBeUndefined();
    /* past its grace: no round is due until the next prompt comes */
    expect(dueRound(prompts, [], ['Op 1'], 2_000_000 + 11 * 60_000)).toBeUndefined();
  });
  it('a struck tap does not answer a round, and counts for nothing', () => {
    const struck = [{ ...tap(1, 'Op 1', 'working', 2_000_000), struck: true }];
    expect(dueRound(prompts, struck, ['Op 1'], 2_100_000)?.left).toEqual(['Op 1']);
    expect(shares(struck, ['working'], 'Op 1')[0]?.taps).toBe(0);
  });
  it('rounds done count the prompts every person was tapped at', () => {
    const t = [tap(1, 'Op 1', 'working', 1_000_000), tap(2, 'Op 2', 'walking', 1_000_000), tap(3, 'Op 1', 'working', 2_000_000)];
    expect(roundsDone(prompts, t, ['Op 1', 'Op 2'])).toBe(1);
    expect(roundsDone(prompts, t, [])).toBe(0);
  });
});

describe('where a work sampling goes — the fishbone, the line\'s card, paper', () => {
  const op1 = Array.from({ length: 20 }, (_, i) => tap(600 + i, 'Op 1', i % 4 ? 'working' : 'waiting'));
  const a = { who: ['Op 1', 'Op 2'], activities: ['working', 'walking', 'waiting', 'searching', 'away'], marginPts: 5, from: 0, to: 1, prompts: Array.from({ length: 40 }, (_, i) => i) };
  it('offers each share that is not the work, a tenth of the time or more, from enough taps — biggest first', () => {
    const o = samplingOffers(a, [...op2, ...op1]);
    /* Op 2: walking 34/190, waiting 27/190; searching 13/190 is under a tenth; Op 1 has 20 taps — too early */
    expect(o.map(x => [x.who, x.activity, x.n])).toEqual([['Op 2', 'walking', 190], ['Op 2', 'waiting', 190]]);
    expect(worstWords(o[0])).toBe('Op 2 is walking 18% of the time (±5 points, from 190 taps)');
    expect(samplingOffers(undefined, op2)).toEqual([]);
  });
  it('away is People; walking, searching, waiting and the floor\'s own words are Method', () => {
    expect(['away', 'Away — on break', 'waiting', 'searching', 'walking', 'fetching film'].map(boneOfActivity)).toEqual(['people', 'people', 'method', 'method', 'method', 'method']);
  });
  it('on paper: a row per person, each share with its margin; too few taps said, never a figure', () => {
    const t = samplingRows(a, [...op2, ...op1])!;
    expect(t.activities).toEqual(a.activities);
    expect(t.rows[1].cells.map(c => `${c.share}${c.margin ? ` ${c.margin}` : ''}`)).toEqual(['61% ±7', '18% ±5', '14% ±5', '7% ±4', '—']);
    expect([t.rows[0].enough, t.rows[0].early]).toEqual([false, 'too early — 20 taps, 30 needed']);
    expect(t.head).toBe('2 people watched at 40 random moments — 210 taps; each share with its margin at 95%, in points');
    expect(samplingRows(a, [])).toBeUndefined();
  });
  it('the line\'s card: the biggest share not the work, with its margin — or how far it has got', () => {
    expect(samplingCardLine(a, [...op2, ...op1])).toBe('Op 2 is walking 18% of the time (±5 points, from 190 taps)');
    expect(samplingCardLine(a, op1)).toBe('Too early — 20 taps of 2 people watched');
    expect(samplingCardLine(a, [])).toBe('2 people watched — no taps yet');
  });
});

describe('take a sample now, and the shift a study starts on (30 October)', () => {
  const hm = (h: number, m = 0) => new Date(2026, 9, 30, h, m).getTime();
  const a = { who: ['Op 1'], activities: ['working', 'waiting'], marginPts: 5, from: hm(6), to: hm(14), prompts: [hm(7), hm(9)] };

  it('adds this instant to the moments, in order, marked as taken by hand — the random ones as drawn', () => {
    const b = takeNow(a, hm(8, 5) + 400);
    expect(b.prompts).toEqual([hm(7), hm(8, 5), hm(9)]);
    expect(b.extra).toEqual([hm(8, 5)]);
    expect(handOf(b)).toBe(1);
    expect(randomOf(b)).toBe(2);
    expect(momentsWords(b)).toBe('2 moments and 1 taken by hand');
    expect(momentsWords(a)).toBe('2 moments');
  });
  it('the moment it makes is the round due at once, answered by a tap a person like any other', () => {
    const b = takeNow(a, hm(8, 5));
    expect(dueRound(b.prompts, [], b.who, hm(8, 5))).toEqual({ at: hm(8, 5), no: 2, left: ['Op 1'] });
  });
  it('is not made twice at the same second', () => {
    const b = takeNow(a, hm(8, 5));
    expect(takeNow(b, hm(8, 5) + 300)).toBe(b);
  });

  const shifts = [{ name: 'Early', start: '06:00', end: '14:00' }, { name: 'Late', start: '14:00', end: '22:00' }, { name: 'Nights', start: '22:00', end: '06:00' }];
  it('starts on the shift running now, from now to its end', () => {
    const d = defaultShift(shifts, hm(9, 12));
    expect(d.source).toBe('running');
    expect(d.shift?.name).toBe('Early');
    expect(d.from).toBe(hm(9, 15));   // the next five minutes
    expect(d.to).toBe(hm(14));
  });
  it('a shift with under half an hour left is not the one — the next today is', () => {
    const d = defaultShift(shifts, hm(13, 50));
    expect(d).toMatchObject({ source: 'next', from: hm(14), to: hm(22) });
    expect(d.shift?.name).toBe('Late');
  });
  it('an overnight shift running past midnight ends tomorrow morning', () => {
    const d = defaultShift(shifts, hm(23, 0));
    expect(d.shift?.name).toBe('Nights');
    expect(d.from).toBe(hm(23, 0));
    expect(d.to).toBe(new Date(2026, 9, 31, 6, 0).getTime());
  });
  it('with no shift set on the line, the next whole hour for eight hours', () => {
    const d = defaultShift([], hm(9, 12));
    expect(d).toEqual({ from: hm(10), to: hm(18), source: 'hour' });
    expect(shiftStartWords(d, 'Line 7')).toBe('Line 7 has no shift set, so it starts at the next whole hour for eight hours. Change it to the shift you are watching.');
  });
  it('a shift that starts later today is offered when none is running', () => {
    const d = defaultShift([{ name: 'Late', start: '14:00', end: '22:00' }], hm(9, 12));
    expect(d).toMatchObject({ source: 'next', from: hm(14), to: hm(22) });
    expect(shiftStartWords(d, 'Line 7')).toContain('Line 7’s Late (14:00–22:00), the next on the line today');
  });
  it('a shift with no times is ignored', () => {
    expect(defaultShift([{ name: 'Days', start: '', end: '' }], hm(9, 0)).source).toBe('hour');
  });
});
