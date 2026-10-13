/* A STOP PUT RIGHT (lib/stopEdit). The audit's bar 2: a stop timed on
 * Capture could be deleted, never changed. Changed, it keeps saying how it is
 * known: minutes typed over are typed, not timed. */
import { describe, expect, it } from 'vitest';
import { changedStop, minutesOf } from '../stopEdit';
import type { Observation } from '../../types';

const o: Observation = {
  id: 'o', workspaceId: 'w', category: 'Breakdown', subcategory: 'Jam', asset: 'Bagger', shift: 'Days',
  startedAt: 1_000_000, endedAt: 1_000_000 + 245_000, durationMs: 245_000, timing: 'stopwatch', count: 1, media: [], createdAt: 1, updatedAt: 1,
};
const keep = { asset: 'Bagger', category: 'Breakdown', subcategory: 'Jam', note: '' };

describe('a stop changed where it is listed', () => {
  it('nothing changed: nothing to write', () => {
    expect(changedStop(o, keep)).toBeNull();
  });
  it('the machine and the reason changed: still what the stopwatch timed', () => {
    const n = changedStop(o, { ...keep, asset: 'Checkweigher', category: 'Material', subcategory: '' })!;
    expect(n.asset).toBe('Checkweigher');
    expect(n.category).toBe('Material');
    expect(n.subcategory).toBeUndefined();
    expect(n.timing).toBe('stopwatch');
    expect(n.durationMs).toBe(245_000);
    expect(n.endedAt).toBe(o.endedAt);
  });
  it('minutes typed over: typed, and its end moves with its length', () => {
    const n = changedStop(o, { ...keep, minutes: 12 })!;
    expect(n.durationMs).toBe(720_000);
    expect(n.timing).toBe('typed');
    expect(n.endedAt).toBe(o.startedAt + 720_000);
  });
  it('minutes cleared to 0: a stop counted, not timed', () => {
    const n = changedStop(o, { ...keep, minutes: 0 })!;
    expect(n.durationMs).toBe(0);
    expect(n.timing).toBe('instant');
  });
  it('a note and a cause family added, then taken off', () => {
    const n = changedStop(o, { ...keep, note: ' jaw guard ', causeM: 'machine' })!;
    expect(n.note).toBe('jaw guard');
    expect(n.causeM).toBe('machine');
    const back = changedStop(n, { ...keep, note: '' })!;
    expect(back.note).toBeUndefined();
    expect(back.causeM).toBeUndefined();
  });
  it('refused: no machine, no reason, minutes not a number of at least 0', () => {
    expect(changedStop(o, { ...keep, asset: ' ' })).toBeNull();
    expect(changedStop(o, { ...keep, category: '' })).toBeNull();
    expect(changedStop(o, { ...keep, minutes: Number('four') })).toBeNull();
    expect(changedStop(o, { ...keep, minutes: -1 })).toBeNull();
  });
  it('the box opens with its minutes to a tenth', () => {
    expect(minutesOf(245_000)).toBe('4.1');
    expect(minutesOf(240_000)).toBe('4');
  });
});
