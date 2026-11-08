/* AI MODE'S COLLEAGUE AT THE GATEWAY — the request read off the wire, the conversation in the model's terms with its
 * rounds of calls, the server-side check of every call, the reply and its follow-ups, and the figures it was not given
 * (src/tools/colleague/colleagueAssist; docs/AI-MODE.md). */
import { describe, expect, it } from 'vitest';
import { CAPABILITY_SCHEMAS } from '../../../capabilities/schemas';
import {
  COLLEAGUE_LIMITS, COLLEAGUE_SYSTEM, checkCalls, colleagueMessages, colleagueReply, colleagueTools, nextCarry, readCarry,
  readColleagueAsk, resultBlocks, schemaError, unsureColleague, type CapabilitySchema, type ColleagueBlock,
} from '../colleagueAssist';

const SCHEMAS: CapabilitySchema[] = [
  { name: 'line_state', kind: 'read', description: 'A line as it stands.', input_schema: { type: 'object', additionalProperties: false, required: ['lineId'], properties: { lineId: { type: 'string', minLength: 1, maxLength: 80 } } } },
  { name: 'raise_problem', kind: 'write', description: 'Raise a problem.', input_schema: {
    type: 'object', additionalProperties: false, required: ['lineId', 'title', 'how'],
    properties: {
      lineId: { type: 'string' }, title: { type: 'string', maxLength: 20 },
      how: { type: 'string', enum: ['observed', 'reported'] },
      priority: { type: 'integer', minimum: 1, maximum: 3 },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    } } },
];

const turn = (role: 'person' | 'colleague', text: string, at = '10:00', photo?: string) => ({ role, text, at, ...(photo ? { photo } : {}) });
const toolUse = (id: string, name: string, input: unknown): ColleagueBlock => ({ type: 'tool_use', id, name, input });

describe('the request read off the wire', () => {
  it('keeps the turns, pictures and threads, and refuses what it cannot answer', () => {
    const r = readColleagueAsk({ task: 'colleague', turns: [turn('person', 'Line 3 is down again'), { role: 'robot', text: 'x' }, turn('colleague', 'Since when?'), turn('person', '', '10:02', 'P1')], images: [{ photo: 'P1', data: 'AAAA' }], focus: 'Current: Line 3 lost output', today: 'Sunday 8 November 2026', conversationId: 'c-1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ask.turns).toHaveLength(3);
    expect(r.ask.images).toEqual([{ photo: 'P1', data: 'AAAA' }]);
    expect(r.ask.conversationId).toBe('c-1');
    expect(readColleagueAsk({ turns: [turn('person', 'hi'), turn('colleague', 'hello')] })).toMatchObject({ ok: false, why: expect.stringMatching(/Nothing new/) });
    expect(readColleagueAsk({ turns: [turn('person', 'hi', '1', 'P1')], images: [{ photo: 'P2', data: 'AAAA' }] })).toMatchObject({ ok: false });
    expect(readColleagueAsk({ turns: [turn('person', 'hi')], images: [{ photo: 'P1', data: 'not base64!' }] })).toMatchObject({ ok: false });
    expect(readColleagueAsk({ turns: Array.from({ length: COLLEAGUE_LIMITS.turns + 1 }, () => turn('person', 'x')) })).toMatchObject({ ok: false });
  });

  it('reads pending back only as the gateway handed it out', () => {
    const content = [{ type: 'text', text: 'Let me look.' }, toolUse('tu1', 'line_state', { lineId: 'L3' })];
    const carry = nextCarry({ task: 'colleague', turns: [], images: [], focus: '', today: '' }, content, []);
    const ok = readColleagueAsk({ turns: [turn('person', 'How is Line 3?')], pending: { assistant: carry, results: [{ id: 'tu1', ok: true, says: 'Line 3 has 4 open problems.' }] } });
    expect(ok.ok).toBe(true);
    /* a bare array of blocks is one round */
    expect(readColleagueAsk({ turns: [turn('person', 'x')], pending: { assistant: content, results: [] } }).ok).toBe(true);
    /* a block of a kind the API never gives, a message with no call, or something far too big */
    expect(readColleagueAsk({ turns: [turn('person', 'x')], pending: { assistant: [{ type: 'image', source: {} }], results: [] } })).toMatchObject({ ok: false });
    expect(readColleagueAsk({ turns: [turn('person', 'x')], pending: { assistant: [{ type: 'text', text: 'hi' }], results: [] } })).toMatchObject({ ok: false });
    expect(readColleagueAsk({ turns: [turn('person', 'x')], pending: { assistant: [{ type: 'text', text: 'y'.repeat(70_000) }, toolUse('a', 'find', {})], results: [] } })).toMatchObject({ ok: false });
    expect(readCarry({ v: 1, rounds: Array.from({ length: COLLEAGUE_LIMITS.rounds }, () => ({ content, results: [] })), content, refused: [] })).toBeNull();
  });
});

describe('the conversation in the model’s terms', () => {
  it('puts the turns in order, the threads and today after the newest, cached up to it', () => {
    const r = readColleagueAsk({ turns: [turn('colleague', 'Morning.'), turn('person', 'Filler keeps stopping', '10:01'), turn('person', 'photo', '10:02', 'P1')], images: [{ photo: 'P1', data: 'AAAA' }], focus: 'Current: the filler', today: 'Sunday 8 November 2026' });
    if (!r.ok) throw new Error(r.why);
    const m = colleagueMessages(r.ask);
    expect(m.map(x => x.role)).toEqual(['user', 'assistant', 'user']);
    const last = m[2].content;
    expect(last.some(b => b.type === 'image')).toBe(true);
    const marked = last.filter(b => 'cache_control' in b && b.cache_control);
    expect(marked).toHaveLength(1);
    expect(JSON.stringify(last[last.length - 1])).toMatch(/Current: the filler[\s\S]*Sunday 8 November 2026/);
  });

  it('answers every call of every round, the refused ones as errors the model reads', () => {
    const round1 = [toolUse('a', 'line_state', { lineId: 'L3' })];
    const round2 = [{ type: 'thinking', thinking: '', signature: 'sig' }, toolUse('b', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed' }), toolUse('c', 'delete_everything', {})] as ColleagueBlock[];
    const base = { task: 'colleague' as const, turns: [turn('person', 'Raise it')], images: [], focus: '', today: '' };
    const carry1 = nextCarry(base, round1, []);
    const ask2 = { ...base, pending: { carry: carry1, results: [{ id: 'a', ok: true, says: 'Line 3: 2 open problems.' }] } };
    const carry2 = nextCarry(ask2, round2, [{ id: 'c', name: 'delete_everything', why: 'not a capability' }]);
    const ask3 = { ...base, pending: { carry: carry2, results: [{ id: 'b', ok: false, says: 'Declined.', declined: true }] } };
    const m = colleagueMessages(ask3);
    expect(m.map(x => x.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
    expect(m[3].content).toBe(round2);
    const results = m[4].content as { type: string; tool_use_id: string; content: string; is_error?: boolean }[];
    expect(results.map(r => r.tool_use_id)).toEqual(['b', 'c']);
    expect(results[0]).not.toHaveProperty('is_error');
    expect(results[0].content).toMatch(/declined/);
    expect(results[1]).toMatchObject({ is_error: true, content: expect.stringMatching(/Refused by Faultline's gateway: not a capability/) });
    expect(m[2].content).toEqual([expect.objectContaining({ tool_use_id: 'a', content: 'Line 3: 2 open problems.' })]);
    /* the newest round's results are where the cache ends */
    expect('cache_control' in results[1]).toBe(true);
    /* a call with nothing sent back is answered "not run" */
    expect(resultBlocks([toolUse('z', 'find', {})], [], [])).toEqual([{ type: 'tool_result', tool_use_id: 'z', content: 'This was not run.', is_error: true }]);
  });

  it('gives the tools with the cache marked on the last', () => {
    const t = colleagueTools(SCHEMAS);
    expect(t.map(x => x.name)).toEqual(['line_state', 'raise_problem']);
    expect(t[0]).not.toHaveProperty('cache_control');
    expect(t[1]).toHaveProperty('cache_control', { type: 'ephemeral' });
    expect(t[1]).not.toHaveProperty('kind');
  });
});

describe('the gateway’s check of every call', () => {
  it('passes a capability with its input as its schema asks', () => {
    const r = checkCalls([{ type: 'text', text: 'x' }, toolUse('1', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', priority: 2, tags: ['filler'] })], SCHEMAS);
    expect(r.refused).toEqual([]);
    expect(r.calls).toEqual([{ id: '1', name: 'raise_problem', input: { lineId: 'L3', title: 'Jams', how: 'observed', priority: 2, tags: ['filler'] }, kind: 'write' }]);
  });

  it('refuses a name that is not a capability, and every input that does not fit', () => {
    const bad = [
      toolUse('1', 'delete_line', { lineId: 'L3' }),
      toolUse('2', 'raise_problem', { lineId: 'L3', title: 'Jams' }),
      toolUse('3', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'verified' }),
      toolUse('4', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', extra: 1 }),
      toolUse('5', 'raise_problem', { lineId: 'L3', title: 'J'.repeat(21), how: 'observed' }),
      toolUse('6', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', priority: 2.5 }),
      toolUse('7', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', priority: 4 }),
      toolUse('8', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', tags: ['a', 'b', 'c'] }),
      toolUse('9', 'raise_problem', { lineId: 'L3', title: 'Jams', how: 'observed', tags: [1] }),
      toolUse('10', 'line_state', { lineId: '' }),
      toolUse('11', 'line_state', 'L3'),
    ];
    const r = checkCalls(bad, SCHEMAS);
    expect(r.calls).toEqual([]);
    expect(r.refused.map(x => x.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    expect(r.refused[0].why).toMatch(/not one of Faultline's capabilities/);
    expect(r.refused[1].why).toMatch(/input\.how is missing/);
    expect(r.refused[2].why).toMatch(/one of "observed", "reported"/);
    expect(r.refused[3].why).toMatch(/input\.extra is not one of its fields/);
  });

  it('takes no more than a round’s worth of calls', () => {
    const many = Array.from({ length: COLLEAGUE_LIMITS.callsPerRound + 2 }, (_, i) => toolUse(`c${i}`, 'line_state', { lineId: `L${i}` }));
    const r = checkCalls(many, SCHEMAS);
    expect(r.calls).toHaveLength(COLLEAGUE_LIMITS.callsPerRound);
    expect(r.refused).toHaveLength(2);
  });

  it('checks the subset of JSON schema the capabilities use', () => {
    expect(schemaError({ type: ['string', 'null'] }, null)).toBeNull();
    expect(schemaError({ anyOf: [{ type: 'string' }, { type: 'number' }] }, true)).toMatch(/none of the shapes/);
    expect(schemaError({ type: 'string', pattern: '^L\\d+$' }, 'X1')).toMatch(/not in the form/);
    expect(schemaError({ type: 'number', exclusiveMinimum: 0 }, 0)).toMatch(/above 0/);
    expect(schemaError({ type: 'object', additionalProperties: { type: 'number' } }, { a: 'x' })).toMatch(/input\.a should be number/);
    expect(schemaError({ type: 'number' }, Number.NaN)).toMatch(/should be number/);
  });

  it('every real capability’s schema is one the check can read, and it holds its own required fields', () => {
    for (const s of CAPABILITY_SCHEMAS) {
      const schema = s.input_schema as { type?: string; required?: string[] };
      expect(schema.type, s.name).toBe('object');
      if (schema.required?.length) expect(schemaError(s.input_schema, {}), s.name).toMatch(/is missing/);
    }
    expect(checkCalls([toolUse('x', 'not_a_capability', {})], CAPABILITY_SCHEMAS).refused).toHaveLength(1);
  });
});

describe('the reply and its follow-ups', () => {
  it('takes the one line of suggestions off the end', () => {
    const r = colleagueReply([{ type: 'text', text: 'Before we call the filler the constraint — is the wrapper starving it?\n\nSuggestions: Show me Line 3 | "Park this" | Show me Line 3 | What would you time first?' }]);
    expect(r.reply).toBe('Before we call the filler the constraint — is the wrapper starving it?');
    expect(r.suggestions).toEqual(['Show me Line 3', 'Park this', 'What would you time first?']);
  });

  it('reads a bold heading with bullets under it, and leaves a reply with none whole', () => {
    expect(colleagueReply([{ type: 'text', text: 'Fair point.\n**Suggestions:**\n- Open the line\n- Park it\n' }])).toEqual({ reply: 'Fair point.', suggestions: ['Open the line', 'Park it'] });
    expect(colleagueReply([{ type: 'text', text: 'Three things:\n- one\n- two' }])).toEqual({ reply: 'Three things:\n- one\n- two', suggestions: [] });
    expect(colleagueReply([{ type: 'text', text: 'My suggestions: look at the infeed.' }]).suggestions).toEqual([]);
    expect(colleagueReply([{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'One.' }, toolUse('a', 'find', {}), { type: 'text', text: 'Two.' }]).reply).toBe('One.\n\nTwo.');
  });

  it('caps the suggestions at three short ones', () => {
    const r = colleagueReply([{ type: 'text', text: `Ok.\nSuggestions: a | b | ${'c'.repeat(200)} | d | e` }]);
    expect(r.suggestions).toEqual(['a', 'b', 'd']);
  });
});

describe('figures it was not given', () => {
  it('passes figures from the person, the threads and a capability’s result, and returns the rest', () => {
    const content = [toolUse('a', 'run_calculator', { key: 'oee' })];
    const base = { task: 'colleague' as const, turns: [turn('person', 'We lost 1,200 packs on Line 3', '10:42')], images: [], focus: 'Current: Line 3 (48 ppm target)', today: '8 November 2026' };
    const ask = { ...base, pending: { carry: nextCarry(base, content, []), results: [{ id: 'a', ok: true, says: 'Lost £360 a shift.', data: { packsPerMinute: 52.5 } }] } };
    expect(unsureColleague('You lost 1200 packs — £360 a shift, at 52.5 a minute against 48. That is 17% down on Line 3, about 900 an hour.', ask)).toEqual(['17', '900']);
  });
});

describe('the instructions', () => {
  it('hold the rules that keep AI Mode honest', () => {
    for (const rule of [/never invent, estimate or calculate a figure/i, /never delete anything and never mark anything verified/i, /ONE useful question/, /set_focus/, /park_focus/, /observed.*reported.*measured.*calculated.*hypothesised.*verified.*unknown/s, /Suggestions: /, /British English/, /accumulation before it/]) expect(COLLEAGUE_SYSTEM).toMatch(rule);
  });
});
