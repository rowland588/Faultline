/* What a problem costs the line while it is open — the independent cases of
 * knowledge/specs/FC-154-problem-cost.md §6 (worked by hand and in
 * scripts/knowledge/independent-cases.py), never the code's own output. */
import { describe, it, expect } from 'vitest';
import { problemCost, registerCost } from '../problemCost';

const line7 = { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04 };
const neck = { names: ['Bagger'] };

describe('what a problem costs the line (FC-154)', () => {
  it('1 — 20 min a day at the bottleneck: £25 labour, 2,000 packs, £80 contribution', () => {
    const c = problemCost({ minutesPerDay: 20 }, 'Bagger', line7, neck);
    expect(c?.labour).toBeCloseTo(25.1333, 3);
    expect(c?.packs).toBe(2000);
    expect(c?.contribution).toBeCloseTo(80, 6);
    expect(c?.stopsLine).toBe(true);
    expect(c?.words).toBe('20 min a day at Bagger, the bottleneck: £25 labour · 2,000 packs lost · £80 contribution a day.');
    expect(c?.short).toBe('£25 labour · 2,000 packs lost · £80 contribution a day');
  });
  it('2 — at a machine that is not the bottleneck: labour only, the line runs round it', () => {
    const c = problemCost({ minutesPerDay: 20 }, 'Former', line7, neck);
    expect(c?.packs).toBeUndefined();
    expect(c?.contribution).toBeUndefined();
    expect(c?.words).toBe('20 min a day at Former — not the bottleneck, so the line runs round it: £25 labour a day.');
  });
  it('3 — the bottleneck not known: counted as stopping the line, and said so', () => {
    const c = problemCost({ minutesPerDay: 20 }, 'Former', line7, undefined);
    expect(c?.packs).toBe(2000);
    expect(c?.neckKnown).toBe(false);
    expect(c?.words).toBe('20 min a day at Former (counted as stopping the line — the bottleneck is not known until the line’s capacity is counted): £25 labour · 2,000 packs lost · £80 contribution a day.');
  });
  it('4 — no machine named: on the line, stopping it', () => {
    const c = problemCost({ minutesPerDay: 7.5 }, undefined, line7, neck);
    expect(c?.stopsLine).toBe(true);
    expect(c?.labour).toBeCloseTo(9.425, 3);
    expect(c?.packs).toBe(750);
    expect(c?.words).toBe('7.5 min a day on the line: £9 labour · 750 packs lost · £30 contribution a day.');
  });
  it('5 — no wage on the line: the wage asked, nothing in money', () => {
    const c = problemCost({ minutesPerDay: 20 }, 'Bagger', { crew: 4 }, neck);
    expect(c?.missing).toEqual(['wage', 'speed']);
    expect(c?.words).toBe('20 min a day at Bagger, the bottleneck — give the line a wage (Set up the line) to say it in money.');
    expect(c?.short).toBe('20 min a day — give the line a wage');
  });
  it('6 — a wage but no speed: the labour said, the speed asked; a speed but no margin: the packs said, the margin asked', () => {
    const a = problemCost({ minutesPerDay: 20 }, 'Bagger', { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3 }, neck);
    expect(a?.words).toBe('20 min a day at Bagger, the bottleneck: £25 labour a day; give the line a speed to say the packs lost.');
    const b = problemCost({ minutesPerDay: 20 }, 'Bagger', { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100 }, neck);
    expect(b?.words).toBe('20 min a day at Bagger, the bottleneck: £25 labour · 2,000 packs lost a day; give the line a margin a pack to say the contribution lost.');
  });
  it('7 — no minutes typed: nothing, and nothing invented', () => {
    expect(problemCost({}, 'Bagger', line7, neck)).toBeUndefined();
    expect(problemCost({ minutesPerDay: 0 }, 'Bagger', line7, neck)).toBeUndefined();
  });
  it('8 — the register’s sum: the open ones that say their minutes, the rest counted as not saying', () => {
    const a = problemCost({ minutesPerDay: 20 }, 'Bagger', line7, neck), b = problemCost({ minutesPerDay: 10 }, 'Former', line7, neck);
    const r = registerCost([{ status: 'open', cost: a }, { status: 'in_progress', cost: b }, { status: 'open' }, { status: 'closed', cost: a }]);
    expect(r.open).toBe(3); expect(r.said).toBe(2);
    expect(r.labour).toBeCloseTo(25.1333 + 12.5667, 3);
    expect(r.contribution).toBeCloseTo(80, 6);
    expect(r.words).toBe('The 2 open problems that say their minutes cost the line £38 labour and £80 contribution a day (2,000 packs not made) — 1 more say no minutes yet.');
    expect(registerCost([{ status: 'open' }]).words).toBe('');
    const noWage = registerCost([{ status: 'open', cost: problemCost({ minutesPerDay: 20 }, 'Bagger', { crew: 4 }, neck) }]);
    expect(noWage.words).toBe('1 open problem says its minutes a day; give the line a wage (Set up the line) to say them in money.');
  });
  /* part 2 — the rejects it causes at the line's materials a pack; the product it holds as money tied up */
  const priced = { ...line7, materialsPerPack: 0.12 };
  it('9 — 300 rejects a day at 12p: £36 materials a day; with no minutes that is the whole sentence', () => {
    const c = problemCost({ rejectsPerDay: 300 }, 'Bagger', priced, neck);
    expect(c?.minutes).toBeUndefined(); expect(c?.labour).toBeUndefined();
    expect(c?.materials).toBeCloseTo(36, 6);
    expect(c?.words).toBe('300 rejects a day: £36 materials.');
    expect(c?.short).toBe('£36 materials a day');
  });
  it('10 — 1,200 packs on hold: £144 tied up, said as tied up and not lost', () => {
    const c = problemCost({ heldPacks: 1200 }, undefined, priced, neck);
    expect(c?.tiedUp).toBeCloseTo(144, 6);
    expect(c?.words).toBe('1,200 packs on hold: £144 tied up (not lost unless they go out of life).');
    expect(c?.short).toBe('£144 tied up');
  });
  it('11 — minutes, rejects and held together: case 1’s sentence, then the rejects, then the hold', () => {
    const c = problemCost({ minutesPerDay: 20, rejectsPerDay: 300, heldPacks: 1200 }, 'Bagger', priced, neck);
    expect(c?.words).toBe('20 min a day at Bagger, the bottleneck: £25 labour · 2,000 packs lost · £80 contribution a day; 300 rejects a day: £36 materials; 1,200 packs on hold: £144 tied up (not lost unless they go out of life).');
    expect(c?.short).toBe('£25 labour · 2,000 packs lost · £80 contribution a day · £36 materials a day · £144 tied up');
  });
  it('12 — no materials on the line: the pack’s materials asked once, the minutes’ part unchanged beside it', () => {
    const c = problemCost({ minutesPerDay: 20, rejectsPerDay: 300, heldPacks: 1200 }, 'Bagger', line7, neck);
    expect(c?.materials).toBeUndefined(); expect(c?.tiedUp).toBeUndefined(); expect(c?.missing).toEqual(['materials']);
    expect(c?.words).toBe('20 min a day at Bagger, the bottleneck: £25 labour · 2,000 packs lost · £80 contribution a day; 300 rejects a day and 1,200 packs on hold — give the line a pack’s materials (Set up the line) to say them in money.');
    expect(c?.short).toBe('£25 labour · 2,000 packs lost · £80 contribution a day · give the line a pack’s materials');
    expect(problemCost({ rejectsPerDay: 300 }, 'Bagger', line7, neck)?.words).toBe('300 rejects a day — give the line a pack’s materials (Set up the line) to say them in money.');
    expect(problemCost({ rejectsPerDay: 0, heldPacks: 0 }, 'Bagger', priced, neck)).toBeUndefined();
  });
  it('13 — the register: materials a day and product held summed over the open ones, the closing line saying all three', () => {
    const a = problemCost({ minutesPerDay: 20, rejectsPerDay: 300, heldPacks: 1200 }, 'Bagger', priced, neck);
    const b = problemCost({ rejectsPerDay: 300 }, 'Former', priced, neck);
    const r = registerCost([{ status: 'open', cost: a }, { status: 'open', cost: b }, { status: 'closed', cost: b }, { status: 'open' }]);
    expect(r.materials).toBeCloseTo(72, 6); expect(r.tiedUp).toBeCloseTo(144, 6);
    expect(r.labour).toBeCloseTo(25.1333, 3);
    expect(r.words).toBe('The 1 open problem that says its minutes cost the line £25 labour and £80 contribution a day (2,000 packs not made); 2 say their rejects: £72 materials a day; 1 holds £144 of product — 1 more say no cost yet.');
    const unpriced = registerCost([{ status: 'open', cost: problemCost({ rejectsPerDay: 300 }, 'Former', line7, neck) }]);
    expect(unpriced.words).toBe('1 open problem says its rejects or product held; give the line a pack’s materials (Set up the line) to price them.');
  });
});
