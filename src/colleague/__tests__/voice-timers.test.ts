/* AI MODE out loud and on a timer: the words as spoken, the voice chosen, a timer read back however it was kept. */
import { describe, expect, it } from 'vitest';
import { pickVoice, speakable } from '../voice';
import { leftSaid, readTimer, readTimers } from '../timers';

describe('voice', () => {
  it('speaks the words, not the marks', () => {
    expect(speakable('**Line 3** has:\n- 4 open\n- 2 late')).toBe('Line 3 has:. 4 open. 2 late');
  });
  it('prefers a British voice, then any English', () => {
    expect(pickVoice([{ lang: 'fr-FR', name: 'a', default: true }, { lang: 'en-US', name: 'b', default: false }, { lang: 'en-GB', name: 'c', default: false }])).toBe(2);
    expect(pickVoice([{ lang: 'de-DE', name: 'a', default: true }, { lang: 'en-US', name: 'b', default: false }])).toBe(1);
    expect(pickVoice([{ lang: 'de-DE', name: 'a', default: true }])).toBe(-1);
    /* Luna's voice is a woman's — a laptop listing Microsoft George first (10 November) */
    expect(pickVoice([{ lang: 'en-GB', name: 'Microsoft George - English (United Kingdom)', default: false }, { lang: 'en-GB', name: 'Microsoft Hazel - English (United Kingdom)', default: false }])).toBe(1);
    expect(pickVoice([{ lang: 'en-GB', name: 'Google UK English Male', default: false }, { lang: 'en-GB', name: 'Google UK English Female', default: false }])).toBe(1);
    expect(pickVoice([{ lang: 'en-GB', name: 'Daniel', default: false }, { lang: 'en-US', name: 'Samantha', default: false }])).toBe(1);
    expect(pickVoice([{ lang: 'en-GB', name: 'Microsoft George', default: false }, { lang: 'en-US', name: 'Microsoft Guy', default: true }])).toBe(0);
  });
});

describe('timers', () => {
  it('reads an end, or a start and minutes', () => {
    expect(readTimer({ id: 'a', label: 'Wrapper', endsAt: 1000 })).toEqual({ id: 'a', label: 'Wrapper', endsAt: 1000 });
    expect(readTimer({ id: 'b', label: '', startedAt: 0, minutes: 2 })).toEqual({ id: 'b', label: 'A timer', endsAt: 120000 });
    expect(readTimer({ label: 'x' })).toBeUndefined();
    expect(readTimers('[{"id":"b","label":"b","endsAt":5},{"id":"a","label":"a","endsAt":2},7]').map(t => t.id)).toEqual(['a', 'b']);
    expect(readTimers('not json')).toEqual([]);
  });
  it('says the time left', () => {
    expect(leftSaid(245_000)).toBe('4:05');
    expect(leftSaid(3_720_000)).toBe('1:02:00');
    expect(leftSaid(-5)).toBe('0:00');
  });
});
