/* THE LEAN PAGE, SLICE 5 (docs/LEAN-PAGE.md) — the control room's tiles and
 * closing line (lib/roomLean), read from the board's own reading, the money
 * the stage gate's own (a slip's days × a day of the job's lines not making). */
import { describe, expect, it } from 'vitest';
import { roomClosing, roomMoney, roomTiles, type Room } from '../roomLean';
import type { LinesDay } from '../lineLoss';

const job = (id: string, name: string, o: Partial<Room['jobs'][number]> = {}): Room['jobs'][number] => ({ id, name, ...o });
const totals = { jobs: 3, handedOver: 1, late: 11, lineLate: 1, critical: 1, week: 28 };
const behind = { word: 'Behind target', tone: 'behind' as const, reason: '' };
const room: Room = {
  jobs: [
    job('a', 'Line 2 commissioning', { slipDays: 8, onTarget: behind }),
    job('b', 'Line 2B to 60 ppm', { slipDays: 3, onTarget: behind }),
    job('c', 'Line 7 pace', { method: 'board', slipDays: 4 }),
    job('d', 'Line 9 commissioning', { handedOver: true, slipDays: 5 }),
  ],
  totals,
};
const day = (margin?: number, missing: string[] = []): LinesDay => ({ lines: ['Line 2'], priced: margin != null ? ['Line 2'] : [], missing, ...(margin != null ? { margin } : {}) });

describe('what the slips cost', () => {
  it('each running job past its handover × a day of its lines, added up; a handed-over job is not money at risk', () => {
    const m = roomMoney(room.jobs, new Map([['a', day(3200)], ['b', day(1000)], ['d', day(5000)]]));
    expect(m).toEqual({ slipping: [{ name: 'Line 2 commissioning', days: 8, cost: 25600 }, { name: 'Line 2B to 60 ppm', days: 3, cost: 3000 }], cost: 28600, days: 11, missing: [] });
  });
  it('a job whose lines say nothing is named with what to give; undefined while the lines are read', () => {
    const m = roomMoney(room.jobs, new Map([['a', day(3200)], ['b', day(undefined, ['Line 2B: its speed'])]]));
    expect(m?.cost).toBe(25600);
    expect(m?.missing).toEqual(['Line 2B: its speed']);
    expect(roomMoney(room.jobs, undefined)).toBeUndefined();
    expect(roomMoney([job('x', 'Job X', { slipDays: 2 })], new Map())?.missing).toEqual(['Job X: its line']);
  });
  it('a job past its expected handover is late every day since, re-forecast or not (walkthrough, 25 October: Line 2 A, 16 days over, read "£0 — on its agreed handover")', () => {
    const over = job('p', 'Line 2 A', { daysToGo: -16, onTarget: behind });
    expect(roomMoney([over], new Map([['p', day(1000)]]))).toEqual({ slipping: [{ name: 'Line 2 A', days: 16, cost: 16000 }], cost: 16000, days: 16, missing: [] });
    // moved 3 days and then 2 days past even that: 5 days late
    expect(roomMoney([job('q', 'Q', { slipDays: 3, daysToGo: -2 })], new Map([['q', day(100)]]))?.days).toBe(5);
    // brought forward 10 days, then 4 past the new day: still 6 inside the agreed one
    expect(roomMoney([job('s', 'S', { slipDays: -10, daysToGo: -4 })], new Map([['s', day(100)]]))?.slipping).toEqual([]);
    // still ahead of its day and never moved: nothing slipping
    expect(roomMoney([job('r', 'R', { daysToGo: 4 })], new Map([['r', day(100)]]))?.slipping).toEqual([]);
    // its line not priced: named, never £0 in green
    const one: Room = { jobs: [over], totals: { ...totals, jobs: 1, handedOver: 0 } };
    expect(roomTiles(one, roomMoney([over], new Map()))[4]).toEqual({ k: 'The slips cost', v: '—', of: 'give Line 2 A: its line on the Factory’s Lines page' });
  });
});

describe('the control room’s tiles', () => {
  it('jobs (and behind), late (and a line’s own), critical, this week, the money — no "outstanding"', () => {
    const m = roomMoney(room.jobs, new Map([['a', day(3200)], ['b', day(undefined, ['Line 2B: its speed'])]]));
    expect(roomTiles(room, m).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Projects running', '3', '2 behind target · 1 handed over', undefined],
      ['Late', '11', 'owed past its day — 1 a line’s own', 'r'],
      ['Critical', '1', 'open — stopping a line or a project', 'r'],
      ['This week', '28', 'late or due in the next 7 days', undefined],
      ['The slips cost', '£25.6k', '8 days late on 1 project × a day of their lines not making, in margin · Line 2B not priced yet', 'r'],
    ]);
  });
  it('no critical: no tile (a zero is not said on the band); nothing slipping: £0 in green; none priced: what to give; no stage-gate job: no money tile', () => {
    expect(roomTiles({ jobs: [job('c', 'Line 7 pace', { method: 'board' })], totals: { ...totals, jobs: 1, handedOver: 0, critical: 0 } }, roomMoney([], new Map())).map(x => x.k)).toEqual(['Projects running', 'Late', 'This week']);
    const quiet: Room = { jobs: [job('e', 'Line 8 commissioning', { slipDays: 0 })], totals: { ...totals, jobs: 1, handedOver: 0, late: 0, lineLate: 0, critical: 0 } };
    const t = roomTiles(quiet, roomMoney(quiet.jobs, new Map()));
    expect(t.map(x => x.k)).toEqual(['Projects running', 'Late', 'This week', 'The slips cost']);
    expect(t[3]).toEqual({ k: 'The slips cost', v: '£0', of: 'every stage-gate project on its agreed handover', tone: 'g' });
    expect(roomTiles(room, roomMoney(room.jobs, new Map()))[4]).toEqual({ k: 'The slips cost', v: '—', of: 'give Line 2 commissioning: its line and Line 2B to 60 ppm: its line on the Factory’s Lines page' });
    expect(roomTiles(room, undefined)[4].v).toBe('…');
  });
});

describe('the control room’s closing line', () => {
  it('how many are behind, the furthest named, what is late and critical, and what the slips cost', () => {
    const m = roomMoney(room.jobs, new Map([['a', day(3200)], ['b', day(1000)]]));
    expect(roomClosing(room, m)).toEqual({ text: '2 of 3 projects behind target — Line 2 commissioning furthest, 8 days past its agreed handover; 11 late and 1 critical; the slips cost £28.6k of margin.', tone: 'r' });
  });
  it('all on target and nothing late, in green; every job handed over', () => {
    const ok: Room = { jobs: [job('c', 'Line 7 pace'), job('e', 'Line 8')], totals: { ...totals, jobs: 2, handedOver: 0, late: 0, lineLate: 0, critical: 0 } };
    expect(roomClosing(ok, roomMoney(ok.jobs, new Map()))).toEqual({ text: 'All 2 projects are on target.', tone: 'g' });
    const done: Room = { jobs: [job('d', 'Line 9', { handedOver: true })], totals: { ...totals, jobs: 0, handedOver: 1, late: 0, lineLate: 0, critical: 0 } };
    expect(roomClosing(done, undefined)).toEqual({ text: 'Every project handed over (1).', tone: 'n' });
  });
});
