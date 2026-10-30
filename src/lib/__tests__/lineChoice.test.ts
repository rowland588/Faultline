/* PICKING A LINE, OR MAKING ONE WHERE YOU PICK — the rule the three New sheets share. */
import { describe, expect, it } from 'vitest';
import { existingLine, guessLineName, lineChosen, NEW_LINE, noLineWords } from '../lineChoice';
import type { Workspace } from '../../types';

describe('the line chosen', () => {
  it('an existing line is chosen by its id; none is not', () => {
    expect(lineChosen({ value: 'w1', newName: '' })).toBe(true);
    expect(lineChosen({ value: '', newName: 'Line 1' })).toBe(false);
  });
  it('a new line is chosen only once it has a name', () => {
    expect(lineChosen({ value: NEW_LINE, newName: '' })).toBe(false);
    expect(lineChosen({ value: NEW_LINE, newName: '   ' })).toBe(false);
    expect(lineChosen({ value: NEW_LINE, newName: 'Line 4' })).toBe(true);
  });
  it('a new line is not yet a line to read machines or products from', () => {
    expect(existingLine(NEW_LINE)).toBe('');
    expect(existingLine('w1')).toBe('w1');
  });
});

describe('what is said when the factory has no line', () => {
  it('invites the person who may add one, and tells the one who may not whose it is', () => {
    expect(noLineWords('A count', true)).toBe('A count belongs to a line — add yours here.');
    expect(noLineWords('A log', false)).toContain('the factory’s owner sets them up under Factory');
  });
  it('guesses the first name as Line 1 and the next after the last', () => {
    expect(guessLineName([])).toBe('Line 1');
    expect(guessLineName([{ id: 'a', name: 'Line 2A', floorOrder: 0 } as Workspace])).toBe('Line 2B');
  });
});
