/* F1 fast conversational path — classifier in code (docs/LUNA-ROOM.md §2). */
import { describe, expect, it } from 'vitest';
import { CHAT_FAST_NOTE, colleagueFastChat, colleagueMessages, fastChatKind, readColleagueAsk } from '../colleagueAssist';

const person = (text: string) => ({ role: 'person' as const, text, at: '10:00' });
const colleague = (text: string) => ({ role: 'colleague' as const, text, at: '10:01' });
const ask = (text: string, extra: Record<string, unknown> = {}) => {
  const r = readColleagueAsk({ turns: [person(text)], focus: '', today: 'Monday', ...extra });
  if (!r.ok) throw new Error(r.why);
  return r.ask;
};

describe('colleagueFastChat', () => {
  it('matches greetings, thanks, small talk and meta — not work', () => {
    expect(fastChatKind('Hello')).toBe('hello');
    expect(fastChatKind('Thanks')).toBe('thanks');
    expect(fastChatKind('How are you?')).toBe('small');
    expect(fastChatKind('Who are you')).toBe('meta');
    expect(colleagueFastChat(ask('Hello'))).toBe(true);
    expect(colleagueFastChat(ask('Hi Luna'))).toBe(true);
    expect(colleagueFastChat(ask('Good morning'))).toBe(true);
    expect(colleagueFastChat(ask('Thanks'))).toBe(true);
    expect(colleagueFastChat(ask('How are you?'))).toBe(true);
    expect(colleagueFastChat(ask('Who are you'))).toBe(true);
    expect(colleagueFastChat(ask('What can you do'))).toBe(true);
    expect(colleagueFastChat(ask('What is open on line 7'))).toBe(false);
    expect(colleagueFastChat(ask('Show me downtime'))).toBe(false);
    expect(colleagueFastChat(ask('42 packs short'))).toBe(false);
    expect(fastChatKind('show me top losses')).toBeNull();
    expect(fastChatKind('what happened last week compared to the week before')).toBeNull();
    expect(fastChatKind('top losses')).toBeNull();
    expect(fastChatKind("Hello, I'm Sarah")).toBe('hello');
  });

  it('refuses when a round is pending, a photo is sent, or the turn is not from the person', () => {
    const base = readColleagueAsk({ turns: [colleague('Hi'), person('Hello')], pending: { assistant: { v: 1, rounds: [], content: [{ type: 'tool_use', id: 'a', name: 'find', input: {} }], refused: [] }, results: [] } });
    if (!base.ok) throw new Error(base.why);
    expect(colleagueFastChat(base.ask)).toBe(false);
    const pic = readColleagueAsk({ turns: [{ role: 'person', text: '', at: '10:00', photo: 'P1' }], images: [{ photo: 'P1', data: 'AAAA' }], focus: '', today: 'Monday' });
    if (!pic.ok) throw new Error(pic.why);
    expect(colleagueFastChat(pic.ask)).toBe(false);
  });

  it('adds CHAT_FAST_NOTE to the prompt for typed fast chat, not when spoken', () => {
    const fast = colleagueMessages(ask('Hello'), {}, { fastChat: true });
    const spoken = colleagueMessages({ ...ask('Hello'), spoken: true }, {}, { fastChat: true });
    const slow = colleagueMessages(ask('What is open on line 7'), {}, { fastChat: false });
    const tail = (m: ReturnType<typeof colleagueMessages>) => JSON.stringify(m[m.length - 1]?.content);
    expect(tail(fast)).toContain(CHAT_FAST_NOTE.slice(0, 40));
    expect(tail(spoken)).not.toContain('FAST CHAT');
    expect(tail(slow)).not.toContain('FAST CHAT');
  });
});