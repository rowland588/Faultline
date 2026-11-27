import { describe, expect, it } from 'vitest';
import { helloLead, helloSaid } from '../hello';
import { COLLEAGUE_SYSTEM, colleagueFastChat, fastChatKind, readColleagueAsk } from '../../tools/colleague/colleagueAssist';

const person = (text: string) => ({ role: 'person' as const, text, at: '10:00' });
const ask = (text: string) => {
  const r = readColleagueAsk({ turns: [person(text)], focus: 'Secret customer figures', today: 'Monday' });
  if (!r.ok) throw new Error(r.why);
  return r.ask;
};

describe('helloSaid — first words in the app, no gateway', () => {
  it('a hello, hi or good morning is answered at once — name when known, never a figure', () => {
    expect(helloSaid('Hello Luna', { hour: 10, name: 'Rowland' })).toBe("Morning, Rowland — good to see you. I'm Luna.");
    expect(helloSaid('Hi', { hour: 15 })).toBe("Hello — good to meet you. I'm Luna.");
    expect(helloSaid('Good evening', { hour: 10, name: 'Rowland' })).toBe("Evening, Rowland — good to see you. I'm Luna.");
    expect(helloSaid('Thanks', { hour: 10, name: 'Rowland' })).toBe('Anytime.');
    expect(helloSaid('Bye', { hour: 10 })).toBe('See you.');
    expect(helloSaid('Hello Luna', { hour: 10 })).not.toMatch(/\d/);
  });
  it('small talk is answered in the app — who she is is Luna, not a classifier', () => {
    expect(helloSaid('How are you?', { hour: 10, name: 'Rowland' })).toMatch(/All good here/);
    expect(helloSaid('Who are you', { hour: 10 })).toBeNull();
    expect(helloSaid('What can you do', { hour: 10 })).toBeNull();
    expect(helloSaid('Luna, tell me what you are', { hour: 10 })).toBeNull();
    expect(helloSaid('tell me what you are', { hour: 10 })).toBeNull();
    expect(helloSaid('Can you just tell me what you do?', { hour: 10 })).toBeNull();
    expect(COLLEAGUE_SYSTEM).toMatch(/personal assistant and companion/i);
    expect(COLLEAGUE_SYSTEM).toMatch(/linked to this customer's data/);
    expect(COLLEAGUE_SYSTEM).toMatch(/compare weeks/);
    expect(COLLEAGUE_SYSTEM).toMatch(/top losses/);
    expect(COLLEAGUE_SYSTEM).toMatch(/SOP or work instruction/);
    expect(COLLEAGUE_SYSTEM).toMatch(/Artifacts/);
    expect(COLLEAGUE_SYSTEM).toMatch(/cannot invent a figure/);
    expect(COLLEAGUE_SYSTEM).toMatch(/answer in your own words/);
    expect(helloSaid('What do you make of this weather', { hour: 10 })).toMatch(/can't see the weather/i);
    expect(helloSaid('What is open on line 7', { hour: 10, name: 'Rowland' })).toBeNull();
    expect(helloSaid('42 packs short', { hour: 10 })).toBeNull();
    expect(helloSaid('Make me a training document for lockout tagout', { hour: 10, name: 'Rowland' })).toBeNull();
    expect(helloSaid('the document I just uploaded — turn it into an SOP', { hour: 10 })).toBeNull();
    expect(helloSaid('show me top losses', { hour: 10, name: 'Rowland' })).toBeNull();
    expect(helloSaid('what happened last week compared to the week before', { hour: 10 })).toBeNull();
  });
  it('the hour only fills in when they did not already say morning, afternoon or evening', () => {
    expect(helloLead('Hello', 9)).toBe('Morning');
    expect(helloLead('Hello', 14)).toBe('Hello');
    expect(helloLead('Hello', 20)).toBe('Evening');
    expect(helloLead('Good morning', 20)).toBe('Morning');
  });
  it('the same classifier the gateway uses — a hello is fast chat, a line question is not', () => {
    expect(fastChatKind('Hello Luna')).toBe('hello');
    expect(fastChatKind('Thanks')).toBe('thanks');
    expect(fastChatKind('How are you?')).toBe('small');
    expect(fastChatKind('Luna, tell me what you are')).toBeNull();
    expect(fastChatKind('tell me what you are')).toBeNull();
    expect(fastChatKind('What can you do')).toBeNull();
    expect(colleagueFastChat(ask('Hello Luna'))).toBe(true);
    expect(colleagueFastChat(ask('Luna, tell me what you are'))).toBe(false);
    expect(colleagueFastChat(ask('What is open on line 7'))).toBe(false);
    expect(fastChatKind('Make me a training document for lockout tagout')).toBeNull();
    expect(fastChatKind('the document I just uploaded — turn it into an SOP')).toBeNull();
    expect(colleagueFastChat(ask('Make this an SOP'))).toBe(false);
    expect(fastChatKind('show me top losses')).toBeNull();
    expect(fastChatKind('what happened last week compared to the week before')).toBeNull();
    expect(colleagueFastChat(ask('top losses'))).toBe(false);
  });
});
