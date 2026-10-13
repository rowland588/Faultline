/* The bottleneck walk (docs/CAPACITY.md §3), on walks written out by hand.
 *
 * Bagger → Basketer → Packer → Palletiser, walked six times. The bagger and
 * the basketer are mostly BLOCKED (the bottleneck is after them), the
 * palletiser mostly STARVED (it is before it); the packer is never starved
 * or blocked — the arrows meet on the packer. */
import { describe, it, expect } from 'vitest';
import { walkVerdict } from '../walk';
import type { Tap } from '../../study';

let n = 0;
const walk = (at: number, states: Record<string, string>): Tap[] => Object.entries(states).map(([who, activity]) => ({ id: `t${++n}`, at, who, activity }));
const LINE = ['Bagger', 'Basketer', 'Packer', 'Palletiser'];
const six: Tap[] = [
  ...walk(1, { Bagger: 'blocked', Basketer: 'blocked', Packer: 'working', Palletiser: 'starved' }),
  ...walk(2, { Bagger: 'working', Basketer: 'blocked', Packer: 'working', Palletiser: 'starved' }),
  ...walk(3, { Bagger: 'blocked', Basketer: 'working', Packer: 'working', Palletiser: 'working' }),
  ...walk(4, { Bagger: 'blocked', Basketer: 'blocked', Packer: 'down', Palletiser: 'starved' }),
  ...walk(5, { Bagger: 'working', Basketer: 'blocked', Packer: 'working', Palletiser: 'starved' }),
  ...walk(6, { Bagger: 'blocked', Basketer: 'working', Packer: 'working', Palletiser: 'working' }),
];

describe('the bottleneck walk', () => {
  it('blocked points after, starved points before; the arrows meet on the packer', () => {
    const v = walkVerdict(LINE, six);
    expect(v.walks).toBe(6);
    expect(v.stations.map(s => s.points)).toEqual(['after', 'after', 'neither', 'before']);
    expect(v.bottleneck).toBe('Packer');
    expect(v.sentence).toBe('Walked 6 times: Packer was never starved or blocked, the stations before it were mostly blocked, the stations after it mostly starved — the bottleneck is Packer.');
  });
  it('against the sums: agreeing is the proof; disagreeing says what to check', () => {
    expect(walkVerdict(LINE, six, 'Packer').sentence).toMatch(/— the bottleneck is Packer, as the sums say\.$/);
    const d = walkVerdict(LINE, six, 'Basketer');
    expect(d.against).toBe('disagrees');
    expect(d.sentence).toMatch(/; the sums say Basketer — check the speeds typed, or stops not speed hold the line\.$/);
  });
  it('the arrows meeting between two stations is said, and to walk again', () => {
    const t: Tap[] = [1, 2, 3, 4, 5].flatMap(at => walk(at, { Bagger: 'blocked', Basketer: 'starved' }));
    const v = walkVerdict(['Bagger', 'Basketer'], t);
    expect(v.between).toEqual(['Bagger', 'Basketer']);
    expect(v.sentence).toBe('Walked 5 times: the bottleneck is between Bagger and Basketer — walk again to see which.');
  });
  it('too few walks: not said yet', () => {
    expect(walkVerdict(LINE, six.slice(0, 12)).sentence).toBe('Too early — 3 walks, 5 before the bottleneck is said.');
    expect(walkVerdict(LINE, []).sentence).toBe('Not walked yet.');
  });
  it('says only what the taps say of the stations either side — how many point to it, not "mostly" of them all', () => {
    /* the Bagger working throughout points neither way; the Basketer blocked points after; the Packer between the arrows */
    const t: Tap[] = [1, 2, 3, 4, 5].flatMap(at => walk(at, { Bagger: 'working', Basketer: 'blocked', Packer: 'working', Palletiser: at % 2 ? 'starved' : 'working' }));
    const v = walkVerdict(LINE, t);
    expect(v.stations.map(s => s.points)).toEqual(['neither', 'after', 'neither', 'before']);
    expect(v.bottleneck).toBe('Packer');
    expect(v.sentence).toBe('Walked 5 times: Packer was never starved or blocked, 1 of the 2 stations before it was mostly blocked, the stations after it mostly starved — the bottleneck is Packer.');
  });
  it('a struck tap counts for nothing, and a moment not every station was tapped at is not a walk', () => {
    const struck = six.map((t, i) => (i === 0 ? { ...t, struck: true } : t));
    expect(walkVerdict(LINE, struck).walks).toBe(5);
  });
});
