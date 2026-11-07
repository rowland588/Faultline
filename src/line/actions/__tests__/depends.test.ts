import { describe, expect, it } from 'vitest';
import type { Snag } from '../../../snag/types';
import { afterOfTags, afterToTags, depSays, holdsUp, setLink, waitsFor, wouldLoop } from '../depends';
import { trackerRows, trackerSays } from '../lineActions';

const DAY = 86_400_000;
const T0 = new Date(2026, 10, 9).getTime(); // a Monday, local midnight
const mk = (id: string, o: Partial<Snag> = {}): Snag => ({ id, workspaceId: 'L7', problem: id.toUpperCase(), status: 'open', raisedAt: T0 - 5 * DAY, updatedAt: T0, ...o } as Snag);

describe('what waits for what on a line', () => {
  const base = () => [
    mk('a', { dueAt: T0 + 2 * DAY }),
    mk('b', { dueAt: T0 + 6 * DAY, after: ['a'] }),
    mk('c', { dueAt: T0 + 9 * DAY, after: ['b'] }),
    mk('x', { workspaceId: 'L8' }),
  ];

  it('reads one link both ways — waits for, holds up', () => {
    const s = base();
    expect(waitsFor(s, 'b').map(k => k.id)).toEqual(['a']);
    expect(holdsUp(s, 'a').map(k => k.id)).toEqual(['b']);
    expect(holdsUp(s, 'c')).toEqual([]);
  });

  it('refuses a loop, itself and another line; makes and takes off a link', () => {
    const s = base();
    expect(wouldLoop(s, 'a', 'c')).toBe(true); // c waits for b waits for a
    expect(setLink(s, 'a', 'c', true)).toEqual({ refused: expect.stringMatching(/circle/) });
    expect(setLink(s, 'a', 'a', true)).toEqual({ refused: 'An action cannot wait for itself.' });
    expect(setLink(s, 'a', 'x', true)).toEqual({ refused: 'An action can only wait for another on the same line.' });
    expect(setLink(s, 'c', 'a', true)).toEqual({ id: 'c', after: ['b', 'a'] });
    expect(setLink(s, 'b', 'a', false)).toEqual({ id: 'b', after: undefined });
    expect(setLink(s, 'b', 'a', true)).toEqual({ id: 'b', after: ['a'] }); // already linked: unchanged
  });

  it('says a clash in words, never moves a day', () => {
    const s = base();
    expect(depSays(s, 'b', T0)).toEqual({ waiting: [s[0]] });
    s[1] = { ...s[1], dueAt: T0 + DAY }; // b due before a can be done
    expect(depSays(s, 'b', T0).clash).toBe('Due 10 Nov, but it waits for “A”, due 11 Nov.');
    s[0] = { ...s[0], dueAt: T0 - DAY };
    expect(depSays(s, 'b', T0).clash).toBe('It waits for “A”, already late.');
    s[0] = { ...s[0], dueAt: undefined };
    expect(depSays(s, 'b', T0).clash).toBe('It waits for “A”, which has no day yet.');
    s[0] = { ...s[0], status: 'closed' };
    expect(depSays(s, 'b', T0)).toEqual({ waiting: [] }); // done: nothing waited on
  });

  it('forgets a deleted action it waited for', () => {
    const s = base(); s[0] = { ...s[0], deletedAt: T0 };
    expect(waitsFor(s, 'b')).toEqual([]);
  });

  it('rides in the cloud row as after:<id> beside the waste tag', () => {
    expect(afterToTags(['a', 'b'])).toEqual(['after:a', 'after:b']);
    expect(afterOfTags(['obs1', 'waste:waiting', 'after:a', 'after:b'])).toEqual({ after: ['a', 'b'] });
    expect(afterOfTags(['obs1'])).toEqual({});
  });

  it('the tracker carries the links and says them', () => {
    const s = base(); s[1] = { ...s[1], dueAt: T0 + DAY };
    const rows = trackerRows(s, 'L7', T0);
    const b = rows.find(r => r.id === 'b')!;
    expect(b.after).toEqual(['a']);
    expect(b.waiting).toBe(1);
    expect(b.clash).toMatch(/waits for “A”/);
    expect(trackerSays(rows, 'Line 7')).toMatch(/2 waiting on another action; 1 cannot keep its day for what it waits for\.$/);
  });
});
