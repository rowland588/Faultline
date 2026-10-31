/* FC-199 — the independent cases are knowledge/specs/FC-199-gemba-walk.md §6, worked in a second implementation
   (scripts/knowledge/cases-sixsigma-visual.py, "Gemba freshness"); the figures here are those literals. */
import { describe, expect, it } from 'vitest';
import type { Snag } from '../../../snag/types';
import { freshness } from '../../../lib/gemba';
import {
  foundOf, foundSays, looksOf, lookingAt, lookingFact, lookingSays, machinesSays, projectSays, rhythmSays, stalestFirst,
  type LookSources,
} from '../looking';

const DAY = 86_400_000, H = 3_600_000, REF = 1_800_000_000_000;
const obs = (ago: number, asset = 'Whole line') => ({ startedAt: REF - ago, asset });
const seg = (ago: number) => ({ createdAt: REF - ago });
const snag = (ago: number, o: Partial<Snag> = {}): Snag => ({
  id: `s${ago}`, workspaceId: 'w', problem: 'p', status: 'open', raisedAt: REF - ago, updatedAt: REF, media: [], ...o,
});
const src = (o: Partial<LookSources> = {}): LookSources => ({ obs: [], segments: [], assets: [], snags: [], ...o });

const A = src({ obs: [obs(2 * DAY + 3 * H)] });
const B = src({ segments: [seg(9 * DAY + 5 * H)], snags: [snag(12 * DAY, { targetAsset: 'Wrapper' })] });
const C = src({ snags: [snag(16 * DAY + H, { targetAsset: 'Wrapper' })], obs: [obs(40 * DAY, 'Sealer')] });
const D = src();
const MACH = ['Sealer', 'Wrapper', 'Cartoner'];

describe('worked cases', () => {
  it('A — a stop 2 days ago is fresh', () => {
    const l = lookingAt(A, MACH, REF);
    expect(l.days).toBe(2); expect(l.level).toBe('fresh'); expect(l.last?.kind).toBe('stop');
    expect(lookingSays('Line 1', l)).toBe('Line 1 looked at 2 days ago — a stop timed.');
  });
  it('B — a clip 9 days ago is fading, looked at on 2 of 14 days', () => {
    const l = lookingAt(B, MACH, REF);
    expect(l.days).toBe(9); expect(l.level).toBe('fading'); expect(l.rhythm).toBe(2);
    expect(lookingSays('Line 2', l)).toBe('Line 2 last looked at 9 days ago (a filmed walk) — fading, go and see.');
    expect(rhythmSays(l)).toBe('Looked at on 2 of the last 14 days.');
  });
  it('C — 16 days is stale; machines: Cartoner never, Sealer 40, Wrapper 16', () => {
    const l = lookingAt(C, MACH, REF);
    expect(l.days).toBe(16); expect(l.level).toBe('stale'); expect(l.rhythm).toBe(0);
    expect(l.machines.map(m => [m.name, m.days, m.level])).toEqual([['Cartoner', null, 'stale'], ['Sealer', 40, 'stale'], ['Wrapper', 16, 'stale']]);
    expect(lookingSays('Line 3', l)).toBe('Line 3 not looked at for 16 days (a problem raised) — stale, go and see.');
    expect(machinesSays(l)).toBe('Not looked at lately: Cartoner (never), Sealer 40 days, Wrapper 16 days.');
  });
  it('D — nothing recorded is stale, never a date invented', () => {
    const l = lookingAt(D, MACH, REF);
    expect(l.days).toBeNull(); expect(l.level).toBe('stale'); expect(l.last).toBeUndefined();
    expect(lookingSays('Line 4', l)).toBe('Line 4: nothing recorded of anyone looking at it — stale, go and see.');
    expect(rhythmSays(l)).toBeUndefined();
    expect(lookingFact(l)).toBe('nothing recorded — stale');
  });
  it('the fact for paper', () => {
    expect(lookingFact(lookingAt(B, [], REF))).toBe('9 days ago — fading');
    expect(lookingFact(lookingAt(A, [], REF))).toBe('2 days ago');
    expect(lookingFact(lookingAt(src({ obs: [obs(H)] }), [], REF))).toBe('today');
  });
});

describe('boundaries', () => {
  it('6, 7, 8, 14, 15 days → fresh, fresh, fading, fading, stale', () => {
    const lv = (d: number) => lookingAt(src({ obs: [obs(d * DAY + H)] }), [], REF).level;
    expect([6, 7, 8, 14, 15].map(lv)).toEqual(['fresh', 'fresh', 'fading', 'fading', 'stale']);
  });
  it('a day is a whole 24 hours: 7 days 23 h is still 7', () => {
    expect(lookingAt(src({ obs: [obs(7 * DAY + 23 * H)] }), [], REF).days).toBe(7);
  });
  it('a time in the future reads as today', () => {
    expect(lookingAt(src({ obs: [{ startedAt: REF + 5 * DAY, asset: 'x' }] }), [], REF).days).toBe(0);
  });
});

describe('what counts as a look', () => {
  it('a board action, a deleted observation and a deleted snag are not looks', () => {
    const boardAction = snag(DAY, { targetCategory: 'Minor stop', caseId: 'c', media: undefined });
    const l = looksOf(src({
      obs: [{ ...obs(DAY), deletedAt: REF }], snags: [boardAction, snag(2 * DAY, { deletedAt: REF })],
    }));
    expect(l).toEqual([]);
  });
  it('a quick snag and a snag pinned on a frame are looks; the frame names the machine', () => {
    const l = looksOf(src({
      assets: [{ id: 'a1', createdAt: REF - 5 * DAY, name: 'Sealer' }],
      snags: [snag(3 * DAY), snag(4 * DAY, { assetId: 'a1', media: undefined })],
    }));
    expect(l.map(x => [x.kind, x.machine])).toEqual([['problem', undefined], ['problem', 'Sealer'], ['frame', 'Sealer']]);
  });
  it('a filmed clip names no machine; "Whole line" is never a machine', () => {
    const l = looksOf(src({ segments: [seg(DAY)], obs: [obs(DAY, 'Whole line')] }));
    expect(l.every(x => x.machine === undefined)).toBe(true);
    expect(lookingAt(src(), ['Whole line', 'Sealer'], REF).machines.map(m => m.name)).toEqual(['Sealer']);
  });
});

describe('machines', () => {
  it('compared as the app compares names, listed once', () => {
    const l = lookingAt(src({ obs: [obs(2 * DAY, 'sealer ')] }), ['Sealer', 'SEALER', 'Wrapper'], REF);
    expect(l.machines.map(m => [m.name, m.days])).toEqual([['Wrapper', null], ['Sealer', 2]]);
    expect(machinesSays(l)).toBe('Not looked at lately: Wrapper (never).');
  });
  it('says nothing when every machine is fresh, and "and n more" past three', () => {
    expect(machinesSays(lookingAt(src({ obs: [obs(DAY, 'Sealer')] }), ['Sealer'], REF))).toBeUndefined();
    expect(machinesSays(lookingAt(src(), ['a', 'b', 'c', 'd', 'e'], REF))).toBe('Not looked at lately: a (never), b (never), c (never) and 2 more.');
  });
});

describe('rhythm', () => {
  it('a day counts once however many looks it had', () => {
    expect(lookingAt(src({ obs: [obs(2 * DAY), obs(2 * DAY + H), obs(3 * DAY)] }), [], REF).rhythm).toBe(2);
  });
  it('a look 14 days ago is outside the 14', () => {
    expect(lookingAt(src({ obs: [obs(14 * DAY + H), obs(13 * DAY + H)] }), [], REF).rhythm).toBe(1);
  });
});

describe('found', () => {
  const snags = [snag(3 * DAY, { status: 'closed' }), snag(10 * DAY), snag(16 * DAY + H), snag(30 * DAY, { status: 'closed' }), snag(40 * DAY, { archivedAt: REF }),
    snag(2 * DAY, { targetCategory: 'x', caseId: 'c', media: undefined })];
  it('raised in 28 days, closed of those, open now, the oldest open', () => {
    const f = foundOf(snags, REF);
    expect(f).toEqual({ raised: 3, closed: 1, open: 2, oldestOpen: 16 });
    expect(foundSays(f)).toBe('Last 4 weeks: 3 problems raised on looks, 1 closed, 2 still open; the oldest open 16 days.');
  });
  it('nothing raised', () => {
    expect(foundSays(foundOf([], REF))).toBe('No problem raised on a look in the last 4 weeks.');
  });
  it('an old problem still open is said even when none was raised lately', () => {
    expect(foundSays(foundOf([snag(40 * DAY)], REF))).toBe('No problem raised on a look in the last 4 weeks; the oldest open 40 days.');
  });
});

describe('the factory and the project', () => {
  const lines = [['Line 1', A], ['Line 2', B], ['Line 3', C], ['Line 4', D]].map(([name, s]) => ({ id: name as string, name: name as string, looking: lookingAt(s as LookSources, [], REF) }));
  it('stalest first: never, then the most days', () => {
    expect(stalestFirst(lines).map(x => x.name)).toEqual(['Line 4', 'Line 3', 'Line 2', 'Line 1']);
  });
  it('a project says its stalest line and how many others are not fresh', () => {
    expect(projectSays(lines.slice(0, 3))).toBe('Line 3 not looked at for 16 days (a problem raised) — stale, go and see. 1 other line not fresh.');
    expect(projectSays([])).toBeUndefined();
  });
});

describe('one rule', () => {
  it('the older strip (lib/gemba freshness) gives the same level and days for the same looks', () => {
    const o = [{ startedAt: REF - 9 * DAY - 5 * H }] as never;
    const old = freshness(o, [], REF);
    const now = lookingAt(src({ obs: [obs(9 * DAY + 5 * H)] }), [], REF);
    expect([old.level, old.daysSinceObs]).toEqual([now.level, now.days]);
  });
});
