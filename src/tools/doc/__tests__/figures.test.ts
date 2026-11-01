/* THE DOCUMENTS' ARITHMETIC, AGAINST INDEPENDENT CASES — scripts/knowledge/cases-doc.py works every figure a second way (the standard library
 * only; Student's t from the published table; the Kano evaluation table as published guides print it). Nothing here is copied from the code's
 * own output. */
import { badPacks, excessMaterials, excessPacks, leadDays, ratioOf, verdictOf } from '../figures/isnot';
import { describe, expect, it } from 'vitest';
import { baselineInterval, gapOf, paybackWeeks, teamCost, worthOf } from '../figures/charter';
import { ANSWERS, KANO_TABLE, classOf, classify, coefficients, tallyOf, totalOf, type Answer } from '../figures/kano';
import { WEAK_CAUSE, elapsed, expectedWithout, heldValue, sortingCost } from '../figures/eightd';
import { brief, distinctList, sayN } from '../figures/words';
import { limitSaid, nextFor } from '../defs/voc-ctq';

describe('the charter (cases-doc.py C1, C2 — the record’s give-away worked case)', () => {
  it('the gap and its share of the baseline: 4.10 → 2.00 is 2.10, 51.2%', () => {
    const g = gapOf(4.1, 2);
    expect(g.gap).toBeCloseTo(2.1, 10);
    expect(g.share as number).toBeCloseTo(0.5122, 4);
    expect(g.direction).toBe('reduce');
    expect(gapOf(91.5, 94)).toMatchObject({ gap: 2.5, direction: 'raise' });
    expect(gapOf(5, 5).direction).toBe('hold');
    expect(gapOf(0, 3).share).toBeUndefined();
  });
  it('the baseline’s 95% interval: s 0.18 over ten readings is 3.971 to 4.229 (t 2.262157 on 9 df)', () => {
    const ci = baselineInterval(4.1, 0.18, 10);
    expect(ci?.lo).toBeCloseTo(3.9712, 3);
    expect(ci?.hi).toBeCloseTo(4.2288, 3);
    expect(baselineInterval(4.1, 0.18, 1)).toBeUndefined();
    expect(baselineInterval(4.1, -1, 10)).toBeUndefined();
  });
  it('the worth: 2.1 g × 12,480,000 packs × £0.0034 = £89,107.20 a year; £750 a week × 52 = £39,000; the tool’s figure leads when both are given', () => {
    const g = worthOf({ gap: 2.1, volume: 12_480_000, unitValue: 0.0034 });
    expect(g?.perYear).toBeCloseTo(89_107.2, 6);
    expect(g?.perWeek).toBeCloseTo(1713.6, 6);
    expect(g?.how).toBe('gap');
    const t = worthOf({ worthWeek: 750 });
    expect(t).toMatchObject({ perYear: 39_000, how: 'tool' });
    const both = worthOf({ worthWeek: 1000, gap: 2.1, volume: 12_480_000, unitValue: 0.0034 });
    expect(both?.how).toBe('tool');
    expect(both?.other?.perYear).toBeCloseTo(89_107.2, 6);
    expect(worthOf({ gap: 2.1 })).toBeUndefined();
  });
  it('the team’s time: 60 hours × £14.70 = £882.00, paid back in 0.5147 weeks of the gain; no wage, no cost', () => {
    const tc = teamCost([{ name: 'a', hours: 20 }, { name: 'b', hours: 30 }, { name: 'c', hours: 10 }, { name: 'd' }], 14.7);
    expect(tc).toMatchObject({ hours: 60, priced: 3, unpriced: 1 });
    expect(tc.cost).toBeCloseTo(882, 8);
    expect(paybackWeeks(882, 1713.6) as number).toBeCloseTo(0.5147, 4);
    expect(teamCost([{ name: 'a', hours: 5 }], undefined).cost).toBeUndefined();
    expect(paybackWeeks(10, 0)).toBeUndefined();
  });
});

describe('the Kano evaluation table (cases-doc.py K1) — the published 5 × 5, every cell', () => {
  const PUBLISHED: Record<Answer, string> = { like: 'QAAAO', expect: 'RIIIM', neutral: 'RIIIM', livewith: 'RIIIM', dislike: 'RRRRQ' };
  it('has the published cells, and classes every pair by it', () => {
    for (const f of ANSWERS) for (const [i, d] of ANSWERS.entries()) expect(classOf(f.value, d.value), `${f.value} / ${d.value}`).toBe(PUBLISHED[f.value][i]);
    expect(KANO_TABLE.like.join('')).toBe('QAAAO');
  });
  it('the famous corners: like/dislike performance, expect/dislike must-be, neutral/neutral indifferent, like/neutral attractive, dislike/like reverse, like/like questionable', () => {
    expect(classOf('like', 'dislike')).toBe('O');
    expect(classOf('expect', 'dislike')).toBe('M');
    expect(classOf('neutral', 'neutral')).toBe('I');
    expect(classOf('like', 'neutral')).toBe('A');
    expect(classOf('dislike', 'like')).toBe('R');
    expect(classOf('like', 'like')).toBe('Q');
  });
  it('twelve people on one requirement: O 5 A 2 M 2 I 1 R 1 Q 1 → performance; better 70%, worse −70%', () => {
    const pairs = [
      ...Array(5).fill({ f: 'like', d: 'dislike' }), ...Array(2).fill({ f: 'like', d: 'neutral' }), ...Array(2).fill({ f: 'expect', d: 'dislike' }),
      { f: 'neutral', d: 'neutral' }, { f: 'like', d: 'like' }, { f: 'dislike', d: 'like' },
    ] as { f: Answer; d: Answer }[];
    const t = tallyOf(pairs);
    expect(t).toEqual({ A: 2, O: 5, M: 2, I: 1, R: 1, Q: 1 });
    expect(totalOf(t)).toBe(12);
    expect(classify(t)).toEqual({ cls: 'O', tied: [] });
    expect(coefficients(t)).toEqual({ better: 0.7, worse: -0.7 });
  });
  it('a hand tally adds to typed pairs; a must-be only: better 0, worse −100%; A 7 O 3 I 2: better 83.3%, worse −25%; a tie is a tie; nothing classable has no coefficients', () => {
    expect(coefficients(tallyOf([], { M: 12 }))).toEqual({ better: 0, worse: -1 });
    const c = coefficients(tallyOf([], { A: 7, O: 3, I: 2 }));
    expect(c?.better).toBeCloseTo(0.8333, 4);
    expect(c?.worse).toBe(-0.25);
    expect(classify(tallyOf([], { A: 6, M: 6 }))).toEqual({ tied: ['M', 'A'] });
    expect(classify(tallyOf([], { R: 3, Q: 2 }))).toEqual({ tied: [] });
    expect(coefficients(tallyOf([], { R: 3, Q: 2 }))).toBeUndefined();
    expect(tallyOf([{ f: 'like', d: 'dislike' }], { O: 1.4, A: -3 }).O).toBe(2);
    expect(tallyOf([], { A: -3 }).A).toBe(0);
  });
});

describe('the CTQ limit, said (cases-doc.py V1)', () => {
  it('between, at least, at most, yes — and nothing when the limit its kind needs is missing', () => {
    expect(limitSaid('between', 8, 15, 'N')).toBe('8 to 15 N');
    expect(limitSaid('atleast', 1.5, undefined, 'N/15 mm')).toBe('at least 1.5 N/15 mm');
    expect(limitSaid('atmost', undefined, 2, '%')).toBe('at most 2%');
    expect(limitSaid('yesno', undefined, undefined, '')).toBe('yes');
    expect(limitSaid('between', 8, undefined, 'N')).toBeUndefined();
    expect(limitSaid('between', 15, 8, 'N')).toBeUndefined();
    expect(limitSaid('atleast', undefined, 3, 'N')).toBeUndefined();
    expect(limitSaid(undefined, 1, 2, 'N')).toBeUndefined();
  });
  it('each CTQ goes where the record says: a must-be to a capability study and a control plan row, a delighter to a design decision', () => {
    expect(nextFor('must-be', 'atleast')).toContain('control plan row');
    expect(nextFor('attractive', 'yesno')).toContain('design decision');
    expect(nextFor('performance', 'yesno')).toContain('pass-or-fail');
    expect(nextFor(undefined, 'between')).toContain('Kano class');
  });
});

describe('the 8D (cases-doc.py E1)', () => {
  it('elapsed days from D0 (1 Oct): 1, 9, 12, 19, 26, 62', () => {
    expect(['2026-10-02', '2026-10-10', '2026-10-13', '2026-10-20', '2026-10-27', '2026-12-02'].map(d => elapsed('2026-10-01', d))).toEqual([1, 9, 12, 19, 26, 62]);
  });
  it('14 pallets × 1,200 × £0.42 = £7,056 tied up; 24 h × £14.70 = £352.80; 90 a week × 6 weeks = 540', () => {
    expect(heldValue(14 * 1200, 0.42)).toBeCloseTo(7056, 8);
    expect(sortingCost(24, 14.7)).toBeCloseTo(352.8, 8);
    expect(expectedWithout(90, 6)).toBe(540);
  });
  it('a root cause of “operator error” is the signature of a closed complaint; a system cause is not', () => {
    for (const w of ['Operator error', 'human error at the table', 'careless handling', 'lack of attention']) expect(WEAK_CAUSE.test(w), w).toBe(true);
    for (const w of ['The new jaw’s heater reads 12 °C low', 'No heater check at jaw change', 'The terror of the machine']) expect(WEAK_CAUSE.test(w), w).toBe(false);
  });
});

describe('the words', () => {
  it('say a figure with its unit, a list without repeats, a long box briefly', () => {
    expect(sayN(4.1, 'g a pack')).toBe('4.1 g a pack');
    expect(sayN(91.5, '% of intake')).toBe('91.5% of intake');
    expect(sayN(3, '')).toBe('3');
    expect(distinctList('a, b; A', undefined, ' c ')).toEqual(['a', 'b', 'c']);
    expect(brief('First sentence. Second one.')).toBe('First sentence');
    expect(brief('x'.repeat(200), 20).endsWith('…')).toBe(true);
  });
});

describe('is / is not (cases-doc.py I1 — the record’s leaking-seals case)', () => {
  it('3.2% against 0.3% is 10.667 times; 6,000 packs a shift make 192 against 18 bad, 174 more; at 42p that is £73.08', () => {
    expect(ratioOf(3.2, 0.3)).toBeCloseTo(10.6667, 4);
    expect(badPacks(6000, 3.2)).toBeCloseTo(192, 9);
    expect(badPacks(6000, 0.3)).toBeCloseTo(18, 9);
    expect(excessPacks(6000, 3.2, 0.3)).toBeCloseTo(174, 9);
    expect(excessMaterials(174, 0.42)).toBeCloseTo(73.08, 9);
    expect(ratioOf(3, 0)).toBeUndefined();
  });
  it('a change is the lead by the days before the problem began: 13 Oct jaw +0, 2 Oct film +11, 15 Oct rota −2 (after it began)', () => {
    expect(leadDays('2026-10-13', '2026-10-13')).toBe(0);
    expect(leadDays('2026-10-13', '2026-10-02')).toBe(11);
    expect(leadDays('2026-10-13', '2026-10-15')).toBe(-2);
  });
  it('a cause is ruled out by one “cannot”, fits with none, and is untested with nothing said', () => {
    expect(verdictOf(['yes', 'yes', 'yes', 'yes'])).toMatchObject({ kind: 'fits', assumptions: 0, cannot: 0 });
    expect(verdictOf(['yes', 'no', 'yes', 'assume'])).toMatchObject({ kind: 'ruled-out', cannot: 1, assumptions: 1 });
    expect(verdictOf(['assume', 'assume', 'assume', 'assume'])).toMatchObject({ kind: 'assumes', assumptions: 4 });
    expect(verdictOf(['', '', '', ''])).toMatchObject({ kind: 'untested', tested: 0 });
  });
});
