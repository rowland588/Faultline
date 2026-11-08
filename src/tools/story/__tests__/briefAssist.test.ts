/* THE CLIENT'S BRIEF AT THE GATEWAY — its pages read off the wire, the brief asked of, and every ask kept only with
 * its exact words (src/tools/story/briefAssist; docs/STORY.md S6–S7). */
import { describe, expect, it } from 'vitest';
import { BRIEF_ASKS_SYSTEM, BRIEF_LIMITS, BRIEF_READ_SYSTEM, briefReadUser, checkAsks, checkBriefText, readBrief, readBriefPages, sameWords } from '../briefAssist';

const BRIEF = `Ashby Foods — Line 3 review

We need to understand why Line 3 misses its weekly plan by around 12%.  The
filler is believed to be the constraint but nobody has proved it.
Please also look at changeovers on the night shift, which run “far too long”.
We would like a costed plan by the end of January.`;

describe('the pages of a brief', () => {
  it('takes one to four small JPEGs and refuses anything else', () => {
    expect(readBriefPages({ pages: ['AAAA', 'BBBB'] })).toEqual({ ok: true, pages: ['AAAA', 'BBBB'] });
    expect(readBriefPages({ pages: [] })).toMatchObject({ ok: false });
    expect(readBriefPages({ pages: Array(BRIEF_LIMITS.pages + 1).fill('AAAA') })).toMatchObject({ ok: false, why: expect.stringMatching(/At most 4 pages/) });
    expect(readBriefPages({ pages: ['data:image/jpeg;base64,AAAA'] })).toMatchObject({ ok: false });
    expect(readBriefPages({ pages: ['A'.repeat(Math.ceil(BRIEF_LIMITS.pageBytes / 0.75) + 8)] })).toMatchObject({ ok: false });
  });

  it('sends each page marked with its number, in order', () => {
    const u = briefReadUser(['AAAA', 'BBBB']);
    expect(u.map(b => (b.type === 'text' ? b.text : 'img'))).toEqual(['Page 1 of 2:', 'img', 'Page 2 of 2:', 'img', 'Transcribe these pages exactly as written.']);
  });

  it('keeps the transcription as given, or nothing', () => {
    expect(checkBriefText({ text: '  Line 3 [unclear] plan  ' })).toBe('Line 3 [unclear] plan');
    expect(checkBriefText({ text: '' })).toBeNull();
    expect(checkBriefText(null)).toBeNull();
  });
});

describe('what the brief asks for', () => {
  it('needs a brief worth reading', () => {
    expect(readBrief({ brief: BRIEF })).toEqual({ ok: true, brief: BRIEF.trim() });
    expect(readBrief({ brief: 'short' })).toMatchObject({ ok: false });
    expect(readBrief({ brief: 'x'.repeat(BRIEF_LIMITS.brief + 1) })).toMatchObject({ ok: false });
  });

  it('keeps an ask only when its words are in the brief, spacing and quote marks aside', () => {
    const asks = checkAsks({ asks: [
      { text: 'Find out why Line 3 misses its weekly plan', from: 'We need to understand why Line 3 misses its weekly plan by around 12%. The filler' },
      { text: 'Prove whether the filler is the constraint', from: 'The filler is believed to be the constraint but nobody has proved it.' },
      { text: 'Shorten night-shift changeovers', from: 'changeovers on the night shift, which run "far too long"' },
      { text: 'Cut costs by 20%', from: 'We want costs down by 20%' },
      { text: 'Find out why Line 3 misses its weekly plan', from: 'Line 3 misses its weekly plan' },
      { text: '', from: 'a costed plan' },
      { text: 'Deliver a costed plan by the end of January', from: 'a costed plan by the end of January' },
      { text: 'Too short a quote', from: 'We' },
    ] }, BRIEF);
    expect(asks.map(a => a.text)).toEqual(['Find out why Line 3 misses its weekly plan', 'Prove whether the filler is the constraint', 'Shorten night-shift changeovers', 'Deliver a costed plan by the end of January']);
    expect(asks[0].from).toBe('We need to understand why Line 3 misses its weekly plan by around 12%. The filler');
  });

  it('keeps at most eight, and nothing from an answer of the wrong shape', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ text: `Ask ${i}`, from: 'Line 3 review' }));
    expect(checkAsks({ asks: many }, BRIEF)).toHaveLength(BRIEF_LIMITS.asks);
    expect(checkAsks({ asks: 'nope' }, BRIEF)).toEqual([]);
    expect(checkAsks(null, BRIEF)).toEqual([]);
  });

  it('compares text by its words, whatever its spacing, quotes and dashes', () => {
    expect(sameWords('  a\n  “b” —  c’s ')).toBe('a "b" - c\'s');
  });
});

describe('the instructions', () => {
  it('say exactly as written, and an exact quote', () => {
    expect(BRIEF_READ_SYSTEM).toMatch(/exactly as it is written/);
    expect(BRIEF_READ_SYSTEM).toMatch(/\[unclear\]/);
    expect(BRIEF_ASKS_SYSTEM).toMatch(/three to eight asks/i);
    expect(BRIEF_ASKS_SYSTEM).toMatch(/copied EXACTLY/);
  });
});
