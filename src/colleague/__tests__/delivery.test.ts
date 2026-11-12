/* HOW LUNA SAYS IT (colleague/delivery; docs/VOICE.md §Delivery) — the words as said, the phrases, each phrase's pace and pause, the voice. */
import { describe, expect, it } from 'vitest';
import { spokenForm, phrases, splitLong, deliveryOf, kindOf, voiceRank, MAX_PIECE } from '../delivery';

describe('spokenForm — the words as a person says them', () => {
  it('units after a figure, in full, singular for one', () => {
    expect(spokenForm('The bagger lost 42 min and ran at 58 ppm.')).toBe('The bagger lost 42 minutes and ran at 58 packs a minute.');
    expect(spokenForm('A stop of 1 min, then 9 s.')).toBe('A stop of 1 minute, then 9 seconds.');
    expect(spokenForm('Fill weight 400g at 180°C, 12% rejects.')).toBe('Fill weight 400 grams at 180 degrees, 12 percent rejects.');
  });
  it('never a decade, a time or a code taken for a unit', () => {
    expect(spokenForm('Since the 1990s, open 24/7.')).toBe('Since the 1990s, open 24/7.');
    expect(spokenForm('The BX-200 and PR-07 at 21:35.')).toBe('The BX-200 and PR-07 at 21:35.');
  });
  it('ranges, times, money and dates', () => {
    expect(spokenForm('Limits 178–182 °C.')).toBe('Limits 178 to 182 degrees.');
    expect(spokenForm('3 x 60 is 180.')).toBe('3 times 60 is 180.');
    expect(spokenForm('It costs £1,273 a week, 35p a pack, £1.2k in all.')).toBe('It costs 1,273 pounds a week, 35 pence a pack, 1.2 thousand pounds in all.');
    expect(spokenForm('Due 2026-11-05.')).toBe('Due 5th November 2026.');
  });
  it('the trade’s abbreviations as the trade says them, and the names', () => {
    expect(spokenForm('OEE and MTBF on the CCP.')).toBe('O E E and M T B F on the C C P.');
    expect(spokenForm('A SMED in HACCP terms, e.g. the 8D and A3.')).toBe('A smed in hassup terms, for example the eight D and A three.');
    expect(spokenForm('LUNAR keeps it; LUNA says it.')).toBe('Lunar keeps it. Luna says it.');
    expect(spokenForm('Line 2A, packs/min.')).toBe('Line 2 A, packs a minute.');
  });
  it('punctuation the engine reads badly turned into a speaker’s pauses', () => {
    expect(spokenForm('The film — the new supplier’s — jams (twice a shift).')).toBe('The film, the new supplier’s, jams, twice a shift.');
    expect(spokenForm('Film or bags; we time them.')).toBe('Film or bags. We time them.');
  });
});

describe('phrases — a sentence a piece, short ones joined, long ones broken', () => {
  it('one sentence a phrase', () => {
    expect(phrases('Line 7 has two problems open. The film is the one costing most. Shall I time it?')).toEqual(['Line 7 has two problems open.', 'The film is the one costing most.', 'Shall I time it?']);
  });
  it('a clipped sentence joined to the next, never a question', () => {
    expect(phrases('Got it. The stop is logged.')).toEqual(['Got it. The stop is logged.']);
    expect(phrases('Ready? The clock is running.')).toEqual(['Ready?', 'The clock is running.']);
  });
  it('a long sentence broken at a clause, no piece past the limit', () => {
    const long = 'The bagger stopped twelve times in the last four weeks for a total of forty eight minutes, but most of that time came from three long film jams on the night shift, which means the splice is the first thing to look at before anything else on the line.';
    const ps = splitLong(long);
    expect(ps.length).toBeGreaterThan(1);
    expect(ps.every(p => p.length <= MAX_PIECE)).toBe(true);
    expect(ps.join(' ').replace(/,/g, '')).toBe(long.replace(/,/g, ''));
  });
});

describe('deliveryOf — each phrase’s pace and pause, around the person’s setting', () => {
  it('a phrase of figures slower, a short acknowledgement quicker, small changes only', () => {
    const base = { rate: 1, kind: 'conversation' as const, last: false };
    expect(deliveryOf('It ran 3,600 packs in 60 minutes at 58 a minute.', base).rate).toBeLessThan(0.95);
    expect(deliveryOf('Got it, logged.', base).rate).toBeGreaterThan(1);
    expect(deliveryOf('The film is the one costing most.', base).rate).toBe(1);
  });
  it('a breath after each phrase — longer after a question, none after the last', () => {
    const base = { rate: 1, kind: 'conversation' as const };
    expect(deliveryOf('Shall I time it?', { ...base, last: false }).pauseAfterMs).toBeGreaterThan(deliveryOf('It is logged.', { ...base, last: false }).pauseAfterMs);
    expect(deliveryOf('It is logged.', { ...base, last: true }).pauseAfterMs).toBe(0);
    expect(deliveryOf('Shall I time it?', { ...base, last: false }).pitch).toBeGreaterThan(1);
  });
  it('a long reply is explaining — a touch slower', () => {
    expect(kindOf('One. Two. Three. Four. Five. Six.')).toBe('explaining');
    expect(kindOf('It is logged.')).toBe('conversation');
    expect(deliveryOf('The stop is logged on the line.', { rate: 1, kind: 'explaining', last: false }).rate).toBeLessThan(1);
  });
});

describe('voiceRank — the systems’ better voices first', () => {
  it('natural and neural, then enhanced, then Google’s, then the rest', () => {
    expect(voiceRank({ name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB' })).toBe(3);
    expect(voiceRank({ name: 'Serena (Enhanced)', lang: 'en-GB' })).toBe(2);
    expect(voiceRank({ name: 'Google UK English Female', lang: 'en-GB' })).toBe(1);
    expect(voiceRank({ name: 'Microsoft Hazel - English (United Kingdom)', lang: 'en-GB' })).toBe(0);
  });
});
