/* LINE TALK'S ASSISTANT (lib/talkAssist; docs/LINE-TALK.md slice 2): a
 * request read and held to its limits, the conversation in the model's terms,
 * the answer kept only as its schema says, and every figure it was not given
 * said beside it — the same code the gateway runs. */
import { describe, expect, it } from 'vitest';
import { TALK_LIMITS, TALK_SCHEMA, TALK_SYSTEM, asksForDocument, checkTalkAnswer, docAsText, figuresIn, partialAnswer, readAsk, talkMessages, unsureFigures, type TalkAsk, type TalkAskTurn } from '../talkAssist';

const ASK: TalkAsk = {
  task: 'talk',
  context: 'PRODUCTION LINE: Line 7\nMachines in flow order: Bagger (Ishida) → Checkweigher\nOPEN PROBLEMS (1, in priority order):\n- Critical · Guard bent — Bagger · Open · 12 days · owner Dave · 3 days late',
  today: 'Wednesday 21 October 2026',
  turns: [
    { kind: 'said', at: '10:42', text: 'The bagger is running at about 62 a minute, film wandering left.' },
    { kind: 'photo', at: '10:43', text: '', photo: 'P1' },
    { kind: 'reply', at: '10:44', text: 'Noted the film wandering on the bagger.' },
    { kind: 'typed', at: '10:45', text: 'Write a line-walk report with the photo.' },
  ],
  images: [{ photo: 'P1', data: 'AAAA' }],
};

describe('a request', () => {
  it('is read as sent, every turn kept in order', () => {
    const r = readAsk(ASK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ask.turns.map(t => t.kind)).toEqual(['said', 'photo', 'reply', 'typed']);
  });

  it('is refused when there is nothing new to answer — the last turn is an answer', () => {
    expect(readAsk({ ...ASK, turns: ASK.turns.slice(0, 3) })).toEqual({ ok: false, why: 'Nothing new to answer — say, type or add a photo first.' });
  });

  it('takes a picture only as a small JPEG of one of the talk’s own photos', () => {
    expect(readAsk({ ...ASK, images: [{ photo: 'P2', data: 'AAAA' }] })).toMatchObject({ ok: false, why: /not one of this talk’s photos/ });
    expect(readAsk({ ...ASK, images: [{ photo: 'P1', data: 'not base64!' }] })).toMatchObject({ ok: false, why: /not a small JPEG/ });
    expect(readAsk({ ...ASK, images: [{ photo: 'P1', data: 'A'.repeat(Math.ceil(TALK_LIMITS.imageBytes / 0.75) + 8) }] })).toMatchObject({ ok: false });
    expect(readAsk({ ...ASK, images: Array.from({ length: TALK_LIMITS.images + 1 }, () => ({ photo: 'P1', data: 'AAAA' })) })).toMatchObject({ ok: false, why: /At most 10 pictures/ });
  });

  it('holds the words and the turns to their limits', () => {
    expect(readAsk({ ...ASK, turns: Array.from({ length: TALK_LIMITS.turns + 1 }, () => ASK.turns[0]) })).toMatchObject({ ok: false, why: /start a new Line Talk/ });
    const r = readAsk({ ...ASK, context: 'x'.repeat(TALK_LIMITS.contextChars + 50) });
    expect(r.ok && r.ask.context.length).toBe(TALK_LIMITS.contextChars);
    /* a turn of an unknown kind, or with no words, is dropped */
    const d = readAsk({ ...ASK, turns: [{ kind: 'shout', at: '1', text: 'x' }, { kind: 'typed', at: '1', text: '  ' }, ...ASK.turns] });
    expect(d.ok && d.ask.turns.length).toBe(4);
  });
});

describe('the conversation in the model’s terms', () => {
  const m = talkMessages(ASK);
  it('the person’s turns as theirs, its own answers as its own, never two of one side together', () => {
    expect(m.map(x => x.role)).toEqual(['user', 'assistant', 'user']);
    expect(m[0].content[0]).toMatchObject({ type: 'text', text: '[10:42 · said] The bagger is running at about 62 a minute, film wandering left.' });
  });
  it('a photo by its label, its picture after it', () => {
    expect(m[0].content[1]).toMatchObject({ type: 'text', text: '[10:43 · photo P1]' });
    expect(m[0].content[2]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } });
    const without = talkMessages({ ...ASK, images: [] });
    expect(without[0].content[1]).toMatchObject({ text: '[10:43 · photo P1] (the picture is not sent this time)' });
  });
  it('Faultline’s records and today after the newest turn — the conversation before them cached', () => {
    const last = m[m.length - 1].content;
    expect(last[last.length - 2]).toMatchObject({ text: '[10:45 · typed] Write a line-walk report with the photo.', cache_control: { type: 'ephemeral' } });
    const end = last[last.length - 1];
    expect(end.type === 'text' && end.text).toMatch(/^FAULTLINE'S RECORDS — verified data[\s\S]*<records>\nPRODUCTION LINE: Line 7[\s\S]*<\/records>\n\nToday is Wednesday 21 October 2026\.\nCarry on the conversation: reply to the person's latest turns above\.$/);
    const bare = talkMessages({ ...ASK, context: '' });
    const bareLast = bare[bare.length - 1].content;
    expect(bareLast[bareLast.length - 1]).toMatchObject({ text: expect.stringMatching(/^No Faultline records go with this conversation/) });
  });
  it('is told to talk as a colleague does — its own words, a question back, building on the answer, no stock phrases (Rowland, 21 October: "we ask questions to each other in natural language, none scripted")', () => {
    expect(TALK_SYSTEM).toMatch(/HOW TO TALK — a conversation, never a form/);
    expect(TALK_SYSTEM).toMatch(/never a template/);
    expect(TALK_SYSTEM).toMatch(/Ask them questions back[\s\S]*usually one[\s\S]*When they answer, build on the answer/);
    expect(TALK_SYSTEM).toMatch(/No stock phrases/);
    expect(TALK_SYSTEM).not.toMatch(/acknowledge them in one or two sentences/);
  });
  it('is told the three kinds of knowledge, the figures rule and never to identify anyone', () => {
    expect(TALK_SYSTEM).toMatch(/Observations[\s\S]*Faultline's records[\s\S]*Your interpretation/);
    expect(TALK_SYSTEM).toMatch(/Never invent a measurement/);
    expect(TALK_SYSTEM).toMatch(/Never calculate/);
    expect(TALK_SYSTEM).toMatch(/Never identify a person/);
    expect(TALK_SYSTEM).toMatch(/You cannot create or change anything in Faultline/);
  });
  it('the answer’s shape is small and closed — every object’s fields required, nothing extra', () => {
    const objects: unknown[] = [];
    const walk = (o: unknown) => { if (o && typeof o === 'object') { if ((o as { type?: string }).type === 'object') objects.push(o); Object.values(o).forEach(walk); } };
    walk(TALK_SCHEMA);
    expect(objects.length).toBe(5);
    for (const o of objects as { additionalProperties: unknown; required: string[]; properties: object }[]) {
      expect(o.additionalProperties).toBe(false);
      expect(o.required.sort()).toEqual(Object.keys(o.properties).sort());
    }
    expect(JSON.stringify(TALK_SCHEMA).length).toBeLessThan(2000);
  });
});

describe('an answer, kept only as its schema says', () => {
  it('a reply alone', () => {
    expect(checkTalkAnswer({ reply: '  Noted.  ', document: null }, ['P1'])).toEqual({ reply: 'Noted.' });
  });
  it('a document — a picture not of this talk dropped, an unknown basis taken as an assessment, an empty point gone', () => {
    const a = checkTalkAnswer({ reply: 'Here it is.', document: { title: 'Walk', kind: 'line-walk', sections: [
      { heading: 'Seen', text: '', points: [{ text: 'Film wandering', basis: 'observed', owner: '', due: '' }, { text: 'Tension low?', basis: 'guess', owner: '', due: '' }, { text: ' ', basis: 'record', owner: '', due: '' }],
        photos: [{ photo: 'P1', caption: 'The film' }, { photo: 'P9', caption: 'not ours' }, { photo: 'P1', caption: 'twice' }] },
    ] } }, ['P1']);
    expect(a?.document?.sections[0].points.map(p => p.basis)).toEqual(['observed', 'interpretation']);
    expect(a?.document?.sections[0].photos).toEqual([{ photo: 'P1', caption: 'The film' }]);
  });
  it('nothing, when it cannot be read', () => {
    expect(checkTalkAnswer(null, [])).toBeNull();
    expect(checkTalkAnswer({ reply: '', document: null }, [])).toBeNull();
  });
  it('a document as words, for the next question', () => {
    expect(docAsText({ title: 'Walk', kind: 'punch-list', sections: [{ heading: 'To close', text: 'From the walk.', points: [{ text: 'Fix the guard', basis: 'observed', owner: 'Dave', due: 'Friday' }], photos: [{ photo: 'P1', caption: 'The guard' }] }] }))
      .toBe('[The document written: Punch list — Walk]\n## To close\nFrom the walk.\n- Fix the guard (Observed; owner Dave; due Friday)\n[P1: The guard]');
  });
});

describe('a figure it was not given', () => {
  it('is said beside the answer; one said, in the records, a turn’s time or today is not', () => {
    const a = { reply: 'You said 62 a minute; the guard is 3 days late; at 10:42 the film wandered — it may be 15 mm out. P1 shows it. Dated 21 October 2026.' };
    expect(unsureFigures(a, ASK)).toEqual(['15']);
  });
  it('reads a figure the one way however it is written, and finds one in a document too', () => {
    expect(figuresIn('1,200 packs, 12.50 £, 07:30, P3')).toEqual(['1200', '12.5', '7', '30']);
    const withDoc = { reply: 'Done.', document: { title: 'Walk', kind: 'line-walk' as const, sections: [{ heading: 'Seen', text: 'Running at 62.', points: [{ text: 'About 1,400 bags lost', basis: 'interpretation' as const, owner: '', due: '' }], photos: [] }] } };
    expect(unsureFigures(withDoc, ASK)).toEqual(['1,400']);
  });
  it('an earlier answer is not a source — a figure it made up stays unsure', () => {
    const ask = { ...ASK, turns: [...ASK.turns.slice(0, 2), { kind: 'reply' as const, at: '10:44', text: 'The film is 15 mm out.' }, ASK.turns[3]] };
    expect(unsureFigures({ reply: 'As I said, 15 mm.' }, ask)).toEqual(['15']);
  });
});

describe('a conversation, kept quick', () => {
  const T = (kind: TalkAskTurn['kind'], text: string): TalkAskTurn => ({ kind, at: '10:00', text });
  it('a document asked for in the latest turns — or a change to the one just written — is written with care; anything else is the conversation', () => {
    expect(asksForDocument([T('said', 'The bagger film is wandering.')])).toBe(false);
    expect(asksForDocument([T('said', 'Is that the same as yesterday?')])).toBe(false);
    expect(asksForDocument([T('typed', 'Write a line-walk report from this talk.')])).toBe(true);
    expect(asksForDocument([T('said', 'can you write it up for my manager')])).toBe(true);
    expect(asksForDocument([T('typed', 'Make a punch list for the OEM')])).toBe(true);
    /* an earlier request already answered is not asked again */
    expect(asksForDocument([T('typed', 'Write a summary.'), T('reply', 'Here it is.\n\n[The document written: Summary — Line 7]'), T('said', 'Thanks. The sealer is fine now.')])).toBe(false);
    expect(asksForDocument([T('typed', 'Write a summary.'), T('reply', 'Here it is.\n\n[The document written: Summary — Line 7]'), T('said', 'Add the guard on the infeed to it.')])).toBe(true);
    expect(asksForDocument([T('typed', 'Is it fixed?'), T('reply', 'Not yet.'), T('said', 'Add that to your list of things to check.')])).toBe(false);
  });
  it('an answer as it is written: the reply so far, a document being written ahead of it, a document\'s own words never passed for the reply', () => {
    const whole = JSON.stringify({ document: null, reply: 'Is the film tension set the same as the "Line 6" bagger?\nWorth a look.' });
    for (let n = 0; n <= whole.length; n++) {
      const p = partialAnswer(whole.slice(0, n));
      expect(p.document).toBe(false);
      expect('Is the film tension set the same as the "Line 6" bagger?\nWorth a look.'.startsWith(p.reply)).toBe(true);
    }
    expect(partialAnswer(whole)).toEqual({ reply: 'Is the film tension set the same as the "Line 6" bagger?\nWorth a look.', document: false });
    expect(partialAnswer('{"document":null,"reply":"Has it been')).toEqual({ reply: 'Has it been', document: false });
    expect(partialAnswer('{"document":null,"reply":"tab\\')).toEqual({ reply: 'tab', document: false });
    expect(partialAnswer('{"document":null,"reply":"caf\\u00e9 and \\u00')).toEqual({ reply: 'café and ', document: false });
    const doc = '{"document":{"title":"Line 7","kind":"summary","sections":[{"heading":"\\"reply\\":\\"no","text":"reply","points":[],"photos":[]}]},"reply":"Here is the summary.';
    for (let n = 0; n < doc.indexOf('"reply":"Here'); n++) expect(partialAnswer(doc.slice(0, n)).reply).toBe('');
    expect(partialAnswer(doc.slice(0, 20))).toEqual({ reply: '', document: true });
    expect(partialAnswer(doc)).toEqual({ reply: 'Here is the summary.', document: true });
    expect(partialAnswer('')).toEqual({ reply: '', document: false });
  });
});
