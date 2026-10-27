import { describe, expect, it } from 'vitest';
import { attemptFromLine, itemDetail, runWords, statusWord, whenWords } from '../machinePlain';
import type { TestItem } from '../testing';

/* The machine report in plain words (28 October — "nobody can make a mistake when reading this"). */
describe('the machine report in plain words', () => {
  it('a run said in whole words', () => {
    expect(runWords('aiming 60 ppm for 60 min · net 52 ppm')).toBe('aimed for 60 packs a minute for 60 minutes, at least 52 good packs a minute');
    expect(runWords('set at 58 ppm · ran 1 min · 3,150 packs · 30 rejects · netted 52.5 ppm'))
      .toBe('machine set at 58 packs a minute · ran 1 minute · 3,150 packs · 30 rejects · 52.5 good packs a minute');
  });
  it('a status is one word, never a bare date', () => {
    expect(statusWord('test', 'ahead', '1 Nov')).toEqual({ word: 'BOOKED', tone: 'w' });
    expect(statusWord('step', 'ahead', '4 Nov')).toEqual({ word: 'DUE', tone: 'w' });
    expect(statusWord('test', 'failed', 'didn’t run 21 Oct')).toEqual({ word: 'DIDN’T RUN', tone: 'r' });
    expect(statusWord('test', 'failed', 'didn’t pass 25 Oct')).toEqual({ word: 'DIDN’T PASS', tone: 'r' });
    expect(statusWord('step', 'late', 'late — was 26 Oct')).toEqual({ word: 'LATE', tone: 'r' });
    expect(statusWord('problem', 'failed', 'x', { critical: true })).toEqual({ word: 'CRITICAL', tone: 'r' });
    expect(statusWord('step', 'none', 'no day set')).toEqual({ word: 'NO DAY SET', tone: 'n' });
  });
  it('when, said whole', () => {
    expect(whenWords('step', 'late', 'late — was 26 Oct')).toBe('was due 26 Oct');
    expect(whenWords('test', 'ahead', '1 Nov')).toBe('booked for 1 Nov');
    expect(whenWords('step', 'ahead', '4 Nov')).toBe('due 4 Nov');
    expect(whenWords('step', 'done', 'done 23 Oct')).toBe('23 Oct');
    expect(whenWords('fix', 'problem', 'Due tomorrow · 28 Oct')).toBe('due tomorrow · 28 Oct');
  });
  it('a program’s attempt, from the line the Programs report hands over', () => {
    expect(attemptFromLine('Test 1 · 26 Oct · set at 50 ppm · ran 60 min · 2,900 packs — passed: ran clean', 'g')).toEqual({
      label: 'Attempt 1 · 26 Oct', word: 'PASSED', tone: 'g', text: 'ran clean',
      more: 'It ran: machine set at 50 packs a minute · ran 60 minutes · 2,900 packs.',
    });
    expect(attemptFromLine('Test 2 — booked 30 Oct', 'w')).toEqual({ label: 'Attempt 2', word: 'BOOKED FOR 30 OCT', tone: 'w', text: '' });
  });
  it('what was written on it, labelled — "us" said as our own team', () => {
    const i = { id: 'i', projectId: 'P', testId: 't', kind: 'found', what: 'E-stop label peeling', owner: 'us', doneAt: 5,
      createdAt: Date.parse('2026-10-27T09:00:00Z'), updatedAt: 1 } as TestItem;
    expect(itemDetail(i)).toEqual({ label: 'Problem found · 27 Oct', word: 'DONE', tone: 'g', text: 'E-stop label peeling', more: 'Who has it: us — our own team' });
  });
});
