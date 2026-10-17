/* THE LEAN PAGE, SLICE 5c (docs/LEAN-PAGE.md) — the day's tiles and closing
 * line (lib/dayLean), its story's sections counted, the job's money last. */
import { describe, expect, it } from 'vitest';
import { dayClosing, dayTiles } from '../dayLean';
import type { Day, DaySection } from '../day';
import type { LeanTile } from '../lean';

const sec = (key: DaySection['key'], n: number): DaySection => ({ key, title: key, lines: [...Array(n)].map((_, i) => ({ text: `${key} ${i}`, tone: 'done' as const })) });
const day = (sections: DaySection[], o: Partial<Day> = {}): Day => ({ date: '2026-10-15', label: 'Thu 15 Oct', headline: '', sections, media: [], gates: [{ gate: 'install', label: 'Install', done: 4, problem: 0, late: 1, wrong: 0, total: 6 }], empty: false, ...o });
const slip: LeanTile = { k: 'The slip costs', v: '£25.2k', of: '8 days × £3.2k', tone: 'r' };

describe('the day’s tiles and closing line', () => {
  it('3 done, 2 late, 1 went wrong, 2 found with 1 critical open — the slip last and where it closes', () => {
    const d = day([sec('critical', 1), sec('done', 3), sec('wrong', 1), sec('found', 2), sec('late', 2)]);
    expect(dayTiles(d, slip).map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['Done', '3', 'Install: 4 of 6 steps by its end', undefined],
      ['Late', '2', 'past their day', 'r'],
      ['Went wrong', '1', 'didn’t pass, or did not happen', 'r'],
      ['Found', '2', 'written down · 1 critical open', 'r'],
      ['The slip costs', '£25.2k', '8 days × £3.2k', 'r'],
    ]);
    expect(dayClosing(d, slip)).toEqual({ text: 'Thu 15 Oct: 3 done — 1 went wrong, 2 late and 1 critical open; 2 things found. The slip costs £25.2k.', tone: 'r' });
  });
  it('a good day in green with no money tile on a 6M job; an empty day says so', () => {
    const d = day([sec('done', 2)], { gates: [] });
    expect(dayTiles(d).map(t => t.k)).toEqual(['Done', 'Late', 'Went wrong', 'Found']);
    expect(dayTiles(d)[0].of).toBe('that day');
    expect(dayClosing(d)).toEqual({ text: 'Thu 15 Oct: 2 done, nothing late.', tone: 'g' });
    expect(dayClosing(day([], { empty: true }))).toEqual({ text: 'Thu 15 Oct: nothing logged.', tone: 'n' });
  });
});
