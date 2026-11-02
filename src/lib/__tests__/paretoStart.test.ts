/* WHERE TO START ON THE PARETO (knowledge/specs/FC-148-why-tree.md Part C) — the mark, worked by hand.
 * A Wrapper limits a line at 100 packs a minute; a pack contributes 5p. Of the vital few, "Jams" lost 300 min but only 60 of
 * them on the Wrapper (60 x 100 = 6,000 packs = £300); "Film break" lost 200 min, all on it (200 x 100 = 20,000 packs = £1,000). */
import { describe, expect, it } from 'vitest';
import type { Observation } from '../../types';
import type { Standard } from '../../tools/linestandard/standard';
import type { Capacity, Station } from '../../tools/linebalance/capacity';
import { startHere, startLineOf, type StartLine } from '../paretoStart';

const line = (x: Partial<StartLine> = {}): StartLine => ({
  name: 'Line 7', constraint: 'Wrapper', ratePerMin: 100, perPack: 0.05,
  bars: [{ category: 'Jams', mins: 300, onMin: 60 }, { category: 'Film break', mins: 200, onMin: 200 }], ...x,
});
const VITAL = ['Jams', 'Film break'];

describe('the mark: the vital-few bar that costs the line most at its constraint', () => {
  it('a smaller bar wholly at the constraint beats a larger one mostly off it', () => {
    const r = startHere(VITAL, [line()]);
    expect(r.mark?.category).toBe('Film break');
    expect(r.mark?.onMin).toBeCloseTo(200);
    expect(r.mark?.packs).toBeCloseTo(20_000);
    expect(r.mark?.pounds).toBeCloseTo(1000);
    expect(r.next).toEqual(['Jams']);
    expect(r.says).toBe('Start here: Film break — 200 min at the Wrapper, about 20,000 packs and £1,000 of contribution in the last four weeks. A minute lost there is a minute of the line.');
  });
  it('the other bar priced the same way: 60 min x 100 x 5p = £300', () => {
    const r = startHere(['Jams'], [line({ bars: [{ category: 'Jams', mins: 300, onMin: 60 }] })]);
    expect(r.mark?.pounds).toBeCloseTo(300);
    expect(r.mark?.packs).toBeCloseTo(6000);
  });
  it('a tie in pounds goes to the minutes at the constraint, then to the higher rank', () => {
    const tie = line({ bars: [{ category: 'A', mins: 100, onMin: 50 }, { category: 'B', mins: 100, onMin: 50 }] });
    expect(startHere(['A', 'B'], [tie]).mark?.category).toBe('A');
  });
  it('minutes on the constraint are added across lines, each priced on its own line', () => {
    const l7 = line({ name: 'Line 7', bars: [{ category: 'Jams', mins: 100, onMin: 100 }] });
    const l8 = line({ name: 'Line 8', ratePerMin: 50, perPack: 0.1, bars: [{ category: 'Jams', mins: 100, onMin: 100 }] });
    const r = startHere(['Jams'], [l7, l8]);
    expect(r.mark?.packs).toBeCloseTo(100 * 100 + 100 * 50);
    expect(r.mark?.pounds).toBeCloseTo(100 * 100 * 0.05 + 100 * 50 * 0.1);
  });
});

describe('nothing is estimated: a missing input draws no mark and is named', () => {
  it('no constraint', () => {
    const r = startHere(VITAL, [line({ constraint: undefined })]);
    expect(r.mark).toBeUndefined();
    expect(r.missing).toEqual(['Line 7: its constraint — build its Line capacity']);
    expect(r.says).toContain('Start here is not marked');
    expect(r.next).toEqual(VITAL);
  });
  it('no margin', () => {
    const r = startHere(VITAL, [line({ perPack: undefined })]);
    expect(r.mark).toBeUndefined();
    expect(r.missing).toEqual(['Line 7: what a pack contributes — give its margin or price on Set up the line']);
  });
  it('no rate in packs says why', () => {
    const r = startHere(VITAL, [line({ ratePerMin: undefined, rateNote: 'its Line capacity counts in trays, not packs' })]);
    expect(r.missing[0]).toBe('Line 7: its rate in packs a minute (its Line capacity counts in trays, not packs)');
  });
  it('one of two lines lacking an input: no mark, that line named, the other not', () => {
    const r = startHere(VITAL, [line(), line({ name: 'Line 8', perPack: undefined })]);
    expect(r.mark).toBeUndefined();
    expect(r.missing).toEqual(['Line 8: what a pack contributes — give its margin or price on Set up the line']);
  });
  it('a line with no stops among the vital few is not asked for anything', () => {
    const quiet = line({ name: 'Line 9', constraint: undefined, bars: [{ category: 'Jams', mins: 0, onMin: 0 }] });
    expect(startHere(VITAL, [line(), quiet]).mark?.category).toBe('Film break');
  });
  it('no vital bar on the constraint says so and marks none', () => {
    const r = startHere(VITAL, [line({ bars: [{ category: 'Jams', mins: 300, onMin: 0 }, { category: 'Film break', mins: 200, onMin: 0 }] })]);
    expect(r.mark).toBeUndefined();
    expect(r.says).toBe('None of the vital few sits on the constraint (Wrapper) — fixing them will not make the line more. The prize is at the constraint’s own stops.');
  });
  it('nothing timed: nothing said', () => {
    expect(startHere([], [])).toEqual({ next: [], missing: [], says: '' });
  });
});

/* ---- reading a line from its records ------------------------------------------------------------------------------- */
const MIN = 60_000, FROM = 1_000_000_000_000, TO = FROM + 28 * 86_400_000;
const st = (name: string, rate: number, unit = 'packs'): Station => ({ id: name, name, kind: 'machine', unit, contains: 1, rate, ratePer: 'min', crew: 1, source: 'plate' });
const std = (stations: Station[]): Standard => ({ id: 's1', product: 'Maris', workspaceId: 'ws', capacity: { stations } as Capacity } as unknown as Standard);
let n = 0;
const stop = (asset: string, category: string, at: number, min: number): Observation => ({
  id: `o${++n}`, workspaceId: 'ws', category, asset, startedAt: at, endedAt: at + min * MIN, durationMs: min * MIN, timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at,
});

describe('a line read from its Line capacity, its cost model and its stops', () => {
  const standards = [std([st('Bagger', 120), st('Wrapper', 100)])];
  const obs = [stop('Wrapper', 'Film break', FROM + 1000, 120), stop('Wrapper', 'Film break', FROM + 10_000_000, 80), stop('Bagger', 'Jams', FROM + 20_000_000, 300), stop('Wrapper', 'Jams', FROM + 30_000_000, 60)];
  it('finds the constraint, its rate in packs, the pack contribution and the minutes on it', () => {
    const l = startLineOf('Line 7', { marginPerPack: 0.05 }, standards, obs, VITAL, FROM, TO);
    expect(l.constraint).toBe('Wrapper');
    expect(l.ratePerMin).toBeCloseTo(100);
    expect(l.perPack).toBeCloseTo(0.05);
    expect(l.bars).toEqual([{ category: 'Jams', mins: 360, onMin: 60 }, { category: 'Film break', mins: 200, onMin: 200 }]);
    expect(startHere(VITAL, [l]).mark?.category).toBe('Film break');
  });
  it('stops outside the window and deleted stops are not read', () => {
    const l = startLineOf('Line 7', { marginPerPack: 0.05 }, standards, [...obs, stop('Wrapper', 'Film break', TO + 5, 500), { ...stop('Wrapper', 'Film break', FROM + 5, 500), deletedAt: 1 }], VITAL, FROM, TO);
    expect(l.bars[1]).toEqual({ category: 'Film break', mins: 200, onMin: 200 });
  });
  it('a line that counts in trays has no rate in packs, and says so', () => {
    const l = startLineOf('Line 7', { marginPerPack: 0.05 }, [std([st('Bagger', 120, 'trays'), st('Wrapper', 100, 'trays')])], obs, VITAL, FROM, TO);
    expect(l.ratePerMin).toBeUndefined();
    expect(l.rateNote).toBe('its Line capacity counts in trays, not packs');
  });
  it('no margin, no price: no contribution', () => {
    expect(startLineOf('Line 7', {}, standards, obs, VITAL, FROM, TO).perPack).toBeUndefined();
  });
  it('no Line capacity: no constraint', () => {
    expect(startLineOf('Line 7', { marginPerPack: 0.05 }, [], obs, VITAL, FROM, TO).constraint).toBeUndefined();
  });
});
