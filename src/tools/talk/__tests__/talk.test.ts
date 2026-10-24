/* LINE TALK (lib/talk; docs/LINE-TALK.md): a talk's turns in order, the
 * words as they stand, a piece the phone did not write down, the talk in a
 * line, and the files it names for the cloud. */
import { describe, expect, it } from 'vitest';
import { askTurnsOf, notWritten, pendingReply, photoLabels, photosToSend, talkMediaKeys, talkName, talkSaid, turnsOf, unanswered, wordsOf, type TalkTurn } from '../talk';
import { factsOf } from '../../../lib/study';

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

  it('a piece the phone did not write down — one recorded before it wrote the words, or one it could not — until the words are typed over it; not a struck one', () => {
    expect(TALK.filter(notWritten).map(x => x.id)).toEqual(['s3', 's4']);
    expect(notWritten({ ...TALK[5], text: 'Typed over it.' })).toBe(false);
  });

  it('in a line — pieces and minutes, photos, typed, and what is not written down', () => {
    expect(talkSaid(TALK)).toBe('4 pieces said, 3 min · 1 photo · 1 typed — 2 not written down.');
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

/* SLICE 2 — asking Line Talk (lib/talkAssist): its answers are turns of the talk */
const reply = (id: string, at: number, extra: Partial<TalkTurn> = {}): TalkTurn => ({ id, at, kind: 'reply', who: 'Line Talk', text: 'Noted.', ...extra });
const ASKED: TalkTurn[] = [
  ...TALK,
  reply('r1', 4500),
  { id: 'p2', at: 7500, kind: 'photo', media: { blobKey: 'b-p2', mime: 'image/jpeg', capturedAt: 7500 } },
  { id: 't2', at: 8000, kind: 'typed', text: 'Write the walk report.' },
];

describe('asking Line Talk', () => {
  it('labels the photos P1, P2 … in the order taken, a struck one’s too — a label never moves', () => {
    const t = turnsOf({ turns: [...ASKED, { id: 'p0', at: 2500, kind: 'photo', struck: true, media: { blobKey: 'x', mime: 'image/jpeg', capturedAt: 2500 } }] });
    expect([...photoLabels(t).entries()]).toEqual([['p0', 'P1'], ['p1', 'P2'], ['p2', 'P3']]);
  });

  it('what the next answer is to: the person’s turns since the last answer, not struck', () => {
    const t = turnsOf({ turns: ASKED });
    expect(unanswered(t).map(x => x.id)).toEqual(['s3', 's4', 'p2', 't2']);
    /* an answer that failed answers nothing — its question is still waiting */
    const failed = turnsOf({ turns: [...ASKED, reply('r2', 9000, { answering: 'failed', why: 'busy' })] });
    expect(unanswered(failed).map(x => x.id)).toEqual(['s3', 's4', 'p2', 't2']);
    expect(pendingReply(failed)?.id).toBe('r2');
    expect(pendingReply(t)).toBeUndefined();
  });

  it('the conversation as it is sent: words as they stand, photos by label, its own answers with any document as words, a struck turn and an unfinished answer left out', () => {
    const doc = { title: 'Walk', kind: 'line-walk' as const, sections: [{ heading: 'Seen', text: '', points: [{ text: 'Film wandering', basis: 'observed' as const, owner: '', due: '' }], photos: [{ photo: 'P1', caption: 'The guide' }] }] };
    const t = turnsOf({ turns: [...ASKED.map(x => (x.id === 'r1' ? { ...x, doc } : x)), reply('r2', 9000, { answering: 'waiting' })] });
    const sent = askTurnsOf(t);
    expect(sent.map(x => `${x.kind}${x.photo ? ` ${x.photo}` : ''}`)).toEqual(['said', 'said', 'photo P1', 'typed', 'reply', 'said', 'said', 'photo P2', 'typed']);
    expect(sent[0].text).toBe('Starting at the bagger — running at about 62 a minute.');
    expect(sent[0].at).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/);
    expect(sent[1].at).toMatch(/^\d{2}:\d{2}$/);
    expect(sent[4].text).toBe('Noted.\n\n[The document written: Line-walk report — Walk]\n## Seen\n- Film wandering (Observed)\n[P1: The guide]');
    expect(sent[5].text).toBe('(a piece not written down)');
    expect(sent[6].text).toBe('(a piece not written down)');
  });

  it('sends the pictures of the newest photos only, as many as the gateway takes', () => {
    expect(photosToSend(turnsOf({ turns: ASKED }), 1).map(t => t.id)).toEqual(['p2']);
    expect(photosToSend(turnsOf({ turns: ASKED }), 10).map(t => t.id)).toEqual(['p1', 'p2']);
  });

  it('the talk in a line counts its answers and documents', () => {
    const doc = { title: 'Walk', kind: 'line-walk' as const, sections: [] };
    const t = [...ASKED, reply('r2', 9000, { doc })];
    expect(talkSaid(t)).toBe('4 pieces said, 3 min · 2 photos · 2 typed · 2 answers · 1 document — 2 not written down.');
  });
});

