import { describe, it, expect } from 'vitest';
import { titleOf, remoteWins, needsPush } from '../sync';

describe('the loser of a last-write-wins merge is told by name', () => {
  it('titleOf finds the word a person knows the row by, whatever the kind', () => {
    expect(titleOf({ what: '  Second operator on the infeed ' })).toBe('Second operator on the infeed');
    expect(titleOf({ title: 'Trial the trays' })).toBe('Trial the trays');
    expect(titleOf({ name: 'Line 2A' })).toBe('Line 2A');
    expect(titleOf({ problem: 'Film breaks at the splice' })).toBe('Film breaks at the splice');
    expect(titleOf({ id: 'x' })).toBe('an item');
    expect(titleOf({ what: 'a'.repeat(100) })).toHaveLength(80);
  });
  it('an unpushed local edit that a newer remote replaces is the case that is reported', () => {
    const sent = { 'pace_todos:1': 100 } as Record<string, number>;
    // local edited after its last accepted push (clock 100 → 150), never pushed; remote is newer (200)
    expect(needsPush(sent, 'pace_todos', '1', 150)).toBe(true);
    expect(remoteWins(150, 200, false)).toBe(true);
    // our own echo: pushed at 150 and the cloud holds 150 — nothing replaced
    expect(needsPush({ 'pace_todos:1': 150 }, 'pace_todos', '1', 150)).toBe(false);
  });
});
