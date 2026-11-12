import { describe, it, expect } from 'vitest';
import { colleagueReply, COLLEAGUE_SYSTEM } from '../colleagueAssist';
import { growingReply } from '../../../colleague/colleagueAsk';
import { focusText } from '../../../colleague/conversation';

const read = (text: string) => colleagueReply([{ type: 'text', text }]);

describe('who is in the room', () => {
  it('the room line is taken off the reply and read as the people present, before or after the follow-ups', () => {
    const a = read('Hello Jason — good to have you with us.\n\nIn the room: Jason — COO of Branston\nSuggestions: Show me the worst line | What moved in June?');
    expect(a.reply).toBe('Hello Jason — good to have you with us.');
    expect(a.room).toEqual(['Jason — COO of Branston']);
    expect(a.suggestions).toEqual(['Show me the worst line', 'What moved in June?']);
    const b = read('Welcome both.\nSuggestions: Carry on\nIn the room: Jason — COO of Branston | Sarah — Finance director');
    expect(b.reply).toBe('Welcome both.');
    expect(b.room).toEqual(['Jason — COO of Branston', 'Sarah — Finance director']);
    expect(b.suggestions).toEqual(['Carry on']);
  });
  it('everyone gone is an empty room; no line is no change', () => {
    expect(read('Thanks Jason, see you next week.\nIn the room: nobody else').room).toEqual([]);
    expect(read('Line 7 lost the most.').room).toBeUndefined();
    expect(read('He is in the room: that much we know.\n\nAnd more words.\n\nAnd more.\n\nAnd a last line.').room).toBeUndefined();
  });
  it('the line being written is never shown on the screen', () => {
    expect(growingReply('Hello Jason.\n\nIn the ro')).toBe('Hello Jason.');
    expect(growingReply('Hello Jason.\n\nIn the room: Jason — COO')).toBe('Hello Jason.');
  });
  it('Luna is told who is there with every turn, and her rules say how to greet and that a guest changes no permission', () => {
    expect(focusText([], { room: ['Jason — COO of Branston'] })).toContain('In the room with them now: Jason — COO of Branston');
    expect(focusText([], {})).not.toContain('In the room');
    expect(COLLEAGUE_SYSTEM).toContain('PEOPLE IN THE ROOM');
    expect(COLLEAGUE_SYSTEM).toContain('A guest changes nothing about what may be seen or done');
  });
});
