/* THE LEAN PAGE, SLICE 2 (docs/LEAN-PAGE.md) — Line capacity's tiles and
 * the line balance's, read from their modules, worked by hand beside them.
 *
 *   Line capacity: Bagger 70 a minute, Wrapper 44 (the bottleneck), target 60.
 *     The line makes 44 — held by the Wrapper. The target is 60 ÷ 44 = 136%
 *     of what the Wrapper can do; 16 short = 27% of the target, 960 an hour.
 *     4 people × £15 = £60 an hour ÷ 2,640 bags = 2.27p a bag; at 60, 1.67p;
 *     0.61p a bag because of the Wrapper.
 *
 *   The line balance: takt 12 s → 5 a minute. Op 1 13 s (over by 1 s), Op 2 8,
 *     Op 3 7. The work needs ⌈28 ÷ 12⌉ = 3. Now 60 ÷ 13 = 4.62 a minute: 0.38
 *     lost a minute; labour 16.3p a bag as it runs, 15p at takt, 1.25p because
 *     of Op 1; 5.77p a minute paid for bags not made; 11.5p contribution. */
import { describe, expect, it } from 'vitest';
import type { Capacity } from '../../tools/linebalance/capacity';
import { capacityPaper } from '../../tools/linebalance/capacityPaper';
import { capacityLean } from '../../tools/linebalance/capacityLean';
import { balance } from '../ie/balance';
import { balanceCost } from '../ie/balanceLink';
import { balanceTiles } from '../ie/balanceLean';
import type { BalanceStep } from '../study';

const line = (targetPerMin?: number): Capacity => ({ ...(targetPerMin != null ? { targetPerMin } : {}), stations: [
  { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
  { id: 'w', name: 'Wrapper', kind: 'machine', unit: 'bags', contains: 1, rate: 44, ratePer: 'min', source: 'plate' },
] });
const paper = (cap: Capacity, people?: number) => capacityPaper({ product: 'Maris Piper 2kg', line: 'Line 7', printed: '17 October 2026', capacity: cap,
  labour: people != null ? { people, peopleFrom: 'typed', rate: 15, rateFrom: 'typed' } : {}, margin: 0.04 });

describe('Line capacity as the lean page', () => {
  it('short of its target: what it makes and who holds it, the target, how short, labour a bag because of the Wrapper, the people', () => {
    const p = capacityLean(paper(line(60), 4));
    expect(p.tiles.map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['The line makes', '44', 'bags a minute · held by Wrapper', undefined],
      ['Target', '60', 'bags a minute · 136% of what Wrapper can do', undefined],
      ['Against the target', '16 short', 'bags a minute · 27% of the target · 960 an hour', 'r'],
      ['Labour a bag', '2.27p', '1.67p at the target · 0.61p because of Wrapper', undefined],
      ['People', '4', 'typed on the capacity', undefined],
    ]);
    expect(p.verdict?.tone).toBe('r');
    expect(p.closing.tone).toBe('r');
    expect(p.closing.text).toMatch(/^Wrapper holds Maris Piper 2kg to 44 bags a minute, 16 short of 60 — 0\.61p a bag in labour because of it\. Each minute 26\.7p of labour is paid for bags not made, and 64p of contribution is lost\. The way to 60: \d steps?, worked out\.$/);
    expect(p.actions.length).toBeGreaterThan(0);
    expect(p.actions.every(a => a.state === 'To decide' && !a.who)).toBe(true);
  });
  it('a target met says so in green; with nobody said, labour asks for what it needs', () => {
    const p = capacityLean(paper(line(40)));
    expect(p.tiles[2]).toEqual({ k: 'Against the target', v: 'Meets it', of: '4 bags a minute to spare', tone: 'g' });
    expect(p.tiles[3]).toEqual({ k: 'Labour a bag', v: '—', of: 'say how many people are on the line and what one costs an hour' });
    expect(p.tiles[4].v).toBe('—');
    expect(p.actions).toEqual([]);
    /* met: lifted to the Bagger's 70 — £60 ÷ 4,200 = 1.43p; 2.27 − 1.43 = 0.84p a bag because of the Wrapper */
    const q = capacityLean(paper(line(40), 4));
    expect(q.closing).toEqual({ text: 'Maris Piper 2kg makes 44 bags a minute against 40 — Wrapper sets the pace with 4 to spare; lifted to 70, where Bagger would hold it, labour would be 1.43p a bag — 0.84p a bag because of Wrapper.', tone: 'g' });
  });
  it('no stations yet: every tile says what is missing', () => {
    expect(capacityLean(paper({ stations: [] })).tiles.map(t => t.v)).toEqual(['—', '—', '—', '—', '—']);
  });
});

describe('the line balance’s tiles', () => {
  const typed = (id: string, who: string, sec: number): BalanceStep => ({ id, order: Number(id.replace(/\D/g, '')), name: id, who, typedSec: sec });
  it('over takt: the people and what the work needs, the takt, the bottleneck person over it, labour a bag, what is lost a minute', () => {
    const a = { taktSec: 12, from: 'target' as const };
    const f = balance([typed('e1', 'Op 1', 13), typed('e2', 'Op 2', 8), typed('e3', 'Op 3', 7)], a);
    const tiles = balanceTiles(f, a, balanceCost(f, { ratePerHour: 15, contributionPerPack: 0.3 }), 'bags', 3);
    expect(tiles.map(t => [t.k, t.v, t.of, t.tone])).toEqual([
      ['People', '3', 'the work needs 3 at this takt · 3 on the map', undefined],
      ['Takt', '12.0 s', 'a bag · Line capacity’s target', undefined],
      ['The bottleneck', 'Op 1', '13.0 s of 12.0 s takt — over by 1.0 s', 'r'],
      ['Labour a bag', '16.3p', '15p at takt · 1.25p because of Op 1', undefined],
      ['Lost a minute', '0.38', 'bags · 5.77p of labour paid for them · 11.5p contribution', 'r'],
    ]);
  });
  it('no takt: it asks for one, and claims no bottleneck or cost', () => {
    const f = balance([typed('e1', 'Op 1', 13)], undefined);
    expect(balanceTiles(f, undefined, undefined).map(t => t.v)).toEqual(['1', '—', '—', '—', '—']);
  });
});
