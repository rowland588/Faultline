import { describe, expect, it } from 'vitest';
import { helloLead, helloSaid } from '../hello';
import { colleagueFastChat, fastChatKind, readColleagueAsk } from '../../tools/colleague/colleagueAssist';

const person = (text: string) => ({ role: 'person' as const, text, at: '10:00' });
const ask = (text: string) => {
  const r = readColleagueAsk({ turns: [person(text)], focus: 'Secret customer figures', today: 'Monday' });
  if (!r.ok) throw new Error(r.why);
  return r.ask;
};

describe('helloSaid — first words in the app, no gateway', () => {
  it('a hello, hi or good morning is answered at once — name when known, never a figure', () => {
    expect(helloSaid('Hello Luna', { hour: 10, name: 'Rowland' })).toBe('Morning, Rowland. What are we on?');
    expect(helloSaid('Hi', { hour: 15 })).toBe('Hello. What are we on?');
    expect(helloSaid('Good evening', { hour: 10, name: 'Rowland' })).toBe('Evening, Rowland. What are we on?');
    expect(helloSaid('Thanks', { hour: 10, name: 'Rowland' })).toBe('Anytime.');
    expect(helloSaid('Bye', { hour: 10 })).toBe('See you.');
    expect(helloSaid('Hello Luna', { hour: 10 })).not.toMatch(/\d/);
  });
  it('small talk and who-are-you are answered in the app — never a figure or a look-up', () => {
    expect(helloSaid('How are you?', { hour: 10, name: 'Rowland' })).toMatch(/All good here/);
    expect(helloSaid('Who are you', { hour: 10 })).toMatch(/Luna/);
    expect(helloSaid('What can you do', { hour: 10 })).toMatch(/Ask in plain words/);
    expect(helloSaid('What do you make of this weather', { hour: 10 })).toMatch(/can't see the weather/i);
    expect(helloSaid('What is open on line 7', { hour: 10, name: 'Rowland' })).toBeNull();
    expect(helloSaid('42 packs short', { hour: 10 })).toBeNull();
    expect(helloSaid('Make me a training document for lockout tagout', { hour: 10, name: 'Rowland' })).toBeNull();
    expect(helloSaid('the document I just uploaded — turn it into an SOP', { hour: 10 })).toBeNull();
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
    expect(colleagueFastChat(ask('Hello Luna'))).toBe(true);
    expect(colleagueFastChat(ask('What is open on line 7'))).toBe(false);
    expect(fastChatKind('Make me a training document for lockout tagout')).toBeNull();
    expect(fastChatKind('the document I just uploaded — turn it into an SOP')).toBeNull();
    expect(colleagueFastChat(ask('Make this an SOP'))).toBe(false);
  });
});
