/* LINE TALK (lib/talk; docs/LINE-TALK.md): a talk's turns in order, the
 * words as they stand, what waits to be heard, what was said before a piece,
 * the talk in a line, and the files it names for the cloud. */
import { describe, expect, it } from 'vitest';
import { earlierOf, talkMediaKeys, talkName, talkSaid, talkText, toHear, turnsOf, wordsOf, type TalkTurn } from '../talk';
import { factsOf } from '../study';

const said = (id: string, at: number, heard?: string, extra: Partial<TalkTurn> = {}): TalkTurn =>
  ({ id, at, kind: 'said', media: { blobKey: `b-${id}`, mime: 'audio/webm', capturedAt: at, durationS: 42 }, ...(heard ? { heard } : { hearing: 'waiting' }), ...extra });
const TALK: TalkTurn[] = [
  said('s2', 2000, 'The tray sealer is dropping the odd tray at the infeed.'),
  { id: 'p1', at: 3000, kind: 'photo', media: { blobKey: 'b-p1', mime: 'image/jpeg', capturedAt: 3000 }, text: 'the infeed guide' },
  said('s1', 1000, 'Starting at the bagger, it is running at about sixty a minute.', { text: 'Starting at the bagger — running at about 62 a minute.' }),
  { id: 't1', at: 4000, kind: 'typed', text: 'Ask Dave about the belt.' },
  said('s3', 5000),
  said('s4', 6000, undefined, { hearing: 'failed', why: 'Voice is busy right now.' }),
  said('s5', 7000, 'Mistake.', { struck: true }),
];

describe('a talk', () => {
  it('in the order it happened, each turn’s words as they stand — a correction over what was heard', () => {
    const t = turnsOf({ turns: TALK });
    expect(t.map(x => x.id)).toEqual(['s1', 's2', 'p1', 't1', 's3', 's4', 's5']);
    expect(wordsOf(t[0])).toBe('Starting at the bagger — running at about 62 a minute.');
    expect(wordsOf(t[1])).toBe('The tray sealer is dropping the odd tray at the infeed.');
    expect(wordsOf(t[4])).toBe('');
  });

  it('what waits to be heard — not a failed one, not a struck one', () => {
    expect(toHear(TALK).map(x => x.id)).toEqual(['s3']);
  });

  it('as words, a photo where it was taken, a piece not heard said so, a struck one left out', () => {
    expect(talkText(turnsOf({ turns: TALK }))).toBe([
      'Starting at the bagger — running at about 62 a minute.',
      'The tray sealer is dropping the odd tray at the infeed.',
      '[photo: the infeed guide]',
      'Ask Dave about the belt.',
      '[a piece not heard yet]',
      '[a piece not heard yet]',
    ].join('\n'));
  });

  it('what was said before a piece — only before it, and its last part when long, cut at a word', () => {
    const t = turnsOf({ turns: TALK });
    expect(earlierOf(t, 3000)).toBe('Starting at the bagger — running at about 62 a minute.\nThe tray sealer is dropping the odd tray at the infeed.');
    expect(earlierOf(t, 1000)).toBe('');
    const long = earlierOf(t, 3000, 40);
    expect(long.startsWith('…')).toBe(true);
    expect(long.length).toBeLessThanOrEqual(41);
    expect(long.endsWith('the infeed.')).toBe(true);
  });

  it('in a line — pieces and minutes, photos, typed, and what waits or failed', () => {
    expect(talkSaid(TALK)).toBe('4 pieces said, 3 min · 1 photo · 1 typed — 1 waiting to be heard, 1 could not be heard.');
    expect(talkSaid([])).toBe('Nothing said yet.');
    expect(talkSaid([said('a', 1, 'Hello.', { media: { blobKey: 'x', mime: 'audio/webm', capturedAt: 1, durationS: 20 } })])).toBe('1 piece said, 20 s.');
  });

  it('a new talk is named for its line and day', () => {
    expect(talkName('Line 7', '2026-10-20')).toBe('Line 7 — 20 Oct');
    expect(talkName(undefined, '2026-10-20')).toBe('Line Talk — 20 Oct');
  });

  it('names every recording and photo for the cloud, a struck one’s too — kept for good', () => {
    expect(talkMediaKeys({ turns: TALK }).map(k => k.key).sort()).toEqual(['b-p1', 'b-s1', 'b-s2', 'b-s3', 'b-s4', 'b-s5']);
    expect(talkMediaKeys({})).toEqual([]);
  });

  it('its turns come off the wire as an id-keyed list, a malformed one dropped', () => {
    const f = factsOf({ turns: [TALK[0], { at: 5 }, 'x', TALK[3]] });
    expect(f.turns?.map(t => t.id)).toEqual(['s2', 't1']);
  });
});
