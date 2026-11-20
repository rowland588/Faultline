/* FC-069 EVERY PRODUCT EVERY INTERVAL and FC-072 CLEANDOWNS BY SMED (knowledge/specs/FC-069-epei.md,
 * knowledge/specs/FC-072-cleandown.md). Every figure here is printed by scripts/knowledge/cases-smed-epei-cleandown.py
 * — plain arithmetic, never this module's own output.
 *
 * E1 the record's week (lean.heijunka-epei): 1 shift of 7.5 h, 5 days; 72,000 · 38,400 · 21,600 · 12,000 packs a week
 *    at 100 · 80 · 60 · 50 a minute = 144 + 96 + 72 + 48 = 360 min a day of 450; 90 free; changeovers into them 35, 35,
 *    50 (this SMED — 50 now, 40 separated, 30 converted) and 50 = 170 → 1.8889 days; 160 → 1.7778; 150 → 1.6667.
 * E2 the stock at 1.8889 days: 20,406.0 packs, £9,485.55 at 40p · 55p · 30p · 80p, £1,897.11 a year at 20%; converted
 *    (1.6667 days) 18,005.3 packs, £8,369.60 — £1,115.95 less; the crew's 90 min a day at £75.40 an hour £113.10.
 * C1 the record's allergen clean: kit 10 (external) · strip 15 · sink 15 · frame 30 (cleaning) · swab and wait 15
 *    (verification) · QA release 5 — 90 to release, the wait 70 to 85; 60 · 15 · 5 · 10; separated 80, converted 65. */
import { describe, it, expect } from 'vitest';
import {
  changeoverFigures, changeoverSheet, cleandownOf, cleandownSays, cleandownWords, cleanFlagOf, cleanMaterialsSays, demandOf, intervalFor, intervalOf, intervalRows,
  intervalSays, intervalStock, intervalStockSays, ladderOf, runMinOf, standardFrom,
} from '../changeover';
import { smedLean, releaseTile } from '../changeoverLean';
import type { ChangeoverProduct, ChangeoverStep, StudyFacts, ToolStudy } from '../../../lib/study';

const M = 60;
/* the SMED into Ginger snaps: 30 internal, 10 external, 10 internal — converted (prepare in advance) */
const smed = (planned = true): ChangeoverStep[] => [
  { id: 'a', order: 0, name: 'Change the depositor head', sec: 30 * M, side: 'internal', source: 'typed' },
  { id: 'b', order: 1, name: 'Fetch the next head', sec: 10 * M, side: 'external', source: 'typed' },
  { id: 'c', order: 2, name: 'Set the depositor', sec: 10 * M, side: 'internal', source: 'typed', ...(planned ? { plan: { kind: 'convert' as const, how: 'prepare' as const } } : {}) },
];
const week: ChangeoverProduct[] = [
  { id: 'A', product: 'Shortbread 200g', demandPerDay: 72000, demandPer: 'week', ratePerMin: 100, changeoverMin: 35, pieceCost: 0.40 },
  { id: 'B', product: 'Oat biscuits 300g', demandPerDay: 38400, demandPer: 'week', ratePerMin: 80, changeoverMin: 35, pieceCost: 0.55 },
  { id: 'C', product: 'Ginger snaps 250g', demandPerDay: 21600, demandPer: 'week', ratePerMin: 60, pieceCost: 0.30 },
  { id: 'D', product: 'Gluten-free 150g', demandPerDay: 12000, demandPer: 'week', ratePerMin: 50, changeoverMin: 50, pieceCost: 0.80 },
];
const running = { shiftsPerDay: 1, hoursPerShift: 7.5, breakMin: 0, daysPerWeek: 5 };
const facts = (o: Partial<StudyFacts> = {}): StudyFacts => ({ sequence: smed(), products: week, running, carryingRatePerYear: 20, ...o });
const line7 = { labourPerHour: 4 * 14.5 * 1.3, marginPerPack: 0.04 };

describe('FC-069 — every product every interval, on the record\'s week (E1)', () => {
  it('a week\'s demand is divided by the line\'s own days a week — never a guessed five or seven', () => {
    expect(demandOf(week[0], 5)).toBe(14400);
    expect(demandOf(week[0], 7)).toBeCloseTo(72000 / 7, 9);
    expect(demandOf(week[0])).toBeUndefined();
    expect(runMinOf(week[0], 5)).toEqual({ min: 144, how: 'rate' });
    expect(runMinOf({ id: 'x', product: 'x', demandPerDay: 7200, ratePerMin: 60 })).toEqual({ min: 120, how: 'rate' });
  });
  it('free 90, one cycle 170 min — every 1.9 days; separated 160 → 1.8; as planned 150 → 1.7', () => {
    const f = changeoverFigures(smed());
    const iv = intervalFor(f, facts());
    expect([iv.ready, iv.runMinPerDay, iv.freeMinPerDay, iv.own, iv.taken]).toEqual([true, 360, 90, 3, 1]);
    expect([iv.cycleNowMin, iv.cycleAfterMin, iv.cyclePlanMin]).toEqual([170, 160, 150]);
    expect(iv.daysNow).toBeCloseTo(1.8889, 4);
    expect(iv.daysAfter).toBeCloseTo(1.7778, 4);
    expect(iv.daysPlan).toBeCloseTo(1.6667, 4);
    expect(intervalSays(iv, f).text).toBe('Four products — 170 min of changeovers a cycle, 1 at this changeover\'s 50 min — run every 1.9 days; separated, 160 min a cycle, every 1.8; as planned, 150 min a cycle, every 1.7 — a daily interval needs one cycle\'s changeovers in 90 min or less.');
  });
  it('the record\'s halving: every changeover cut by half halves the interval — 85 ÷ 90 = 0.94 days, daily', () => {
    const half = week.map(p => ({ ...p, changeoverMin: (p.changeoverMin ?? 50) / 2 }));
    const f = changeoverFigures(smed(false));
    const iv = intervalOf(f, half, 450, { daysPerWeek: 5 });
    expect(iv.daysNow).toBeCloseTo(0.9444, 4);
    expect(intervalSays(iv, f).text).toMatch(/run every 0\.9 days — daily\.$/);
  });
  it('a week\'s demand with no days a week: the interval names the days, no figure', () => {
    const f = changeoverFigures(smed());
    const iv = intervalFor(f, facts({ running: { shiftsPerDay: 1, hoursPerShift: 7.5, breakMin: 0 } }));
    expect(iv.ready).toBe(false);
    expect(intervalSays(iv, f).text).toBe('0 of 4 products have a run time; the interval needs all — Shortbread 200g, Oat biscuits 300g, Ginger snaps 250g, Gluten-free 150g still to say. A week\'s demand (Shortbread 200g, Oat biscuits 300g, Ginger snaps 250g, Gluten-free 150g) is divided by the days the line runs — say how the line runs.');
  });
});

describe('FC-069 — the stock the interval needs and its money (E2)', () => {
  it('the common cycle: a run makes d × T, peaks at d × T × (1 − run ÷ day), averages half the peak', () => {
    const iv = intervalFor(changeoverFigures(smed()), facts());
    const st = intervalStock(iv, iv.daysNow as number, 20);
    expect(st?.rows.map(r => +r.lot.toFixed(1))).toEqual([27200, 14506.7, 8160, 4533.3]);
    expect(st?.rows.map(r => +r.avg.toFixed(1))).toEqual([9248, 5706, 3427.2, 2024.9]);
    expect(st?.avg).toBeCloseTo(20406.0, 0);
    expect(st?.tied).toBeCloseTo(9485.55, 1);
    expect(st?.carry).toBeCloseTo(1897.11, 1);
    const conv = intervalStock(iv, iv.daysPlan as number, 20);
    expect(conv?.avg).toBeCloseTo(18005.3, 0);
    expect(conv?.tied).toBeCloseTo(8369.60, 1);
  });
  it('in words: tied up, carried, as planned and how much less; the crew\'s 90 min a day at Line 7\'s £75.40 an hour', () => {
    const iv = intervalFor(changeoverFigures(smed()), facts());
    expect(intervalStockSays(iv, line7, 20).text).toBe('At every 1.9 days a run of each product makes its demand until the next: 20,406 packs on average — £9,486 tied up, £1,897 a year to carry at 20%; as planned, every 1.7 days, 18,005 packs — £8,370, £1,116 less, if the products run that often. The changeovers take the 90 min a day the demand leaves free at any of these intervals — £113 of the crew\'s time a day; a shorter changeover is banked as less stock when the products run more often, or as time when they do not.');
  });
  it('a product with no cost a pack is named and no £ total said; no carrying rate — tied up, not carried; no crew — asked for', () => {
    const iv = intervalFor(changeoverFigures(smed()), facts({ products: week.map(p => (p.id === 'C' ? { ...p, pieceCost: undefined } : p)) }));
    const t = intervalStockSays(iv, undefined, 20).text;
    expect(t).toMatch(/^At every 1\.9 days a run of each product makes its demand until the next: 20,406 packs on average; as planned, every 1\.7 days, 18,005 packs, if the products run that often\. Give Ginger snaps 250g a cost a pack to say the stock in money\./);
    expect(t).not.toMatch(/£/);
    expect(t).toMatch(/Give the line its crew and wage to say the crew's time in money\.$/);
    const noRate = intervalStockSays(intervalFor(changeoverFigures(smed()), facts()), line7).text;
    expect(noRate).toMatch(/£9,486 tied up; as planned, .*\. Give a carrying rate a year to say what holding it costs\./);
    expect(noRate).not.toMatch(/a year to carry/);
  });
  it('a product with minutes typed and no demand: the stock is not said, the product named', () => {
    const products = [...week.slice(0, 3), { id: 'D', product: 'Gluten-free 150g', runMinPerDay: 48, changeoverMin: 50 }];
    const iv = intervalFor(changeoverFigures(smed()), facts({ products }));
    expect(iv.daysNow).toBeCloseTo(1.8889, 4);
    expect(intervalStockSays(iv, line7, 20).text).toMatch(/^The stock the interval needs is read from each product's demand — Gluten-free 150g has only minutes typed\./);
  });
  it('the products\' table: run, changeover into it (this one\'s said), a run, the stock, tied up', () => {
    const iv = intervalFor(changeoverFigures(smed()), facts());
    expect(intervalRows(iv, 20)).toEqual([
      { product: 'Shortbread 200g', run: '144 min a day', into: '35 min', lot: '27,200', avg: '9,248', tied: '£3,699' },
      { product: 'Oat biscuits 300g', run: '96 min a day', into: '35 min', lot: '14,507', avg: '5,706', tied: '£3,138' },
      { product: 'Ginger snaps 250g', run: '72 min a day', into: '50 min — this changeover', lot: '8,160', avg: '3,427', tied: '£1,028' },
      { product: 'Gluten-free 150g', run: '48 min a day', into: '50 min', lot: '4,533', avg: '2,025', tied: '£1,620' },
    ]);
  });
  it('on paper: the sheet carries the interval, the stock and the products\' rows', () => {
    const sheet = changeoverSheet(facts(), undefined, new Map(), line7);
    expect(sheet.lines).toContain(intervalSays(intervalFor(changeoverFigures(smed()), facts()), changeoverFigures(smed())).text);
    expect(sheet.lines.some(l => l.startsWith('At every 1.9 days a run of each product'))).toBe(true);
    expect(sheet.products?.length).toBe(4);
  });
});

describe('FC-069 — the toolkit\'s interval and older records read as before (E3)', () => {
  const tk = (): ChangeoverStep[] => [
    { id: '1', order: 0, name: 'Internal', sec: 27 * M, side: 'internal', source: 'typed' },
    { id: '2', order: 1, name: 'External', sec: 15 * M, side: 'external', source: 'typed' },
  ];
  const five: ChangeoverProduct[] = [
    { id: 'p1', product: 'Finest Red 2kg', demandPerDay: 7200, ratePerMin: 60 }, { id: 'p2', product: 'Express 1.25 kg', demandPerDay: 3000, ratePerMin: 50 },
    { id: 'p3', product: 'Maris Piper 2kg', runMinPerDay: 50 }, { id: 'p4', product: 'King Edward 2.5kg', runMinPerDay: 40 }, { id: 'p5', product: 'Baby potatoes 1kg', runMinPerDay: 30 },
  ];
  it('450 − 300 = 150 free; 5 × 42 → 1.4; 5 × 27 → 0.9, daily — the sentence unchanged; a plan adds its rung', () => {
    const f = changeoverFigures(tk());
    const iv = intervalFor(f, { sequence: tk(), products: five, availableMinPerDay: 450 });
    expect(intervalSays(iv, f).text).toBe('Five products at 42 min run every 1.4 days; at 27 min, every 0.9 — daily.');
    const planned = tk().map(x => (x.id === '1' ? { ...x, plan: { kind: 'streamline' as const, how: 'clamps' as const, targetSec: 9 * M } } : x));
    const f2 = changeoverFigures(planned);
    expect(intervalSays(intervalFor(f2, { sequence: planned, products: five, availableMinPerDay: 450 }), f2).text).toBe('Five products at 42 min run every 1.4 days; at 27 min, every 0.9 — daily; at 9 min as planned, every 0.3.');
    /* a product's stock needs its demand: three typed minutes — said */
    expect(intervalStockSays(iv).text).toMatch(/^The stock the interval needs is read from each product's demand — Maris Piper 2kg, King Edward 2.5kg and Baby potatoes 1kg have only minutes typed\./);
  });
});

/* ======================================================================== FC-072 */
const clean = (o: { wash?: Partial<ChangeoverStep>; swab?: Partial<ChangeoverStep>; sink?: Partial<ChangeoverStep>; release?: Partial<ChangeoverStep>; runUp?: boolean } = {}): ChangeoverStep[] => [
  { id: 'k', order: 0, name: 'Fetch the cleaning kit and chemicals', sec: 10 * M, side: 'external', source: 'typed', fn: 'prepare' },
  { id: 's', order: 1, name: 'Strip the depositor\'s removable parts', sec: 15 * M, side: 'internal', source: 'typed', part: 'clean' },
  { id: 'p', order: 2, name: 'Clean the removable parts at the sink', sec: 15 * M, side: 'internal', source: 'typed', part: 'clean', ...o.sink },
  { id: 'w', order: 3, name: 'Wet clean the frame and conveyors', sec: 30 * M, side: 'internal', source: 'typed', part: 'clean', ...o.wash },
  { id: 'v', order: 4, name: 'Swab three sites and wait for the result', sec: 15 * M, side: 'internal', source: 'typed', part: 'verify', ...o.swab },
  { id: 'r', order: 5, name: 'QA release signed', sec: 5 * M, side: 'internal', source: 'typed', part: 'release', ...o.release },
  ...(o.runUp ? [{ id: 'u', order: 6, name: 'First good packs at rate', sec: 4 * M, side: 'internal' as const, source: 'typed' as const }] : []),
];
const nut = { kind: 'wet' as const, allergen: true, allergenName: 'nut', materials: 45 };

describe('FC-072 — a cleandown by SMED, on the record\'s allergen clean (C1)', () => {
  it('90 min to release; the wait from 70 to 85; 60 · 15 · 5 · 10; separated 80; converted (the parts off the line) 65', () => {
    const c = cleandownOf(clean(), nut);
    expect([c.toRelease.now, c.toRelease.separated].map(x => (x ?? 0) / M)).toEqual([90, 80]);
    expect(c.waits).toEqual([{ id: 'v', name: 'Swab three sites and wait for the result', fromSec: 70 * M, toSec: 85 * M, sec: 15 * M }]);
    expect(c.split).toEqual({ clean: 60 * M, verify: 15 * M, release: 5 * M, other: 10 * M });
    expect(c.afterReleaseSec).toBe(0);
    const conv = cleandownOf(clean({ sink: { plan: { kind: 'convert', how: 'prepare', note: 'a spare set cleaned off the line' } } }), nut);
    expect((conv.toRelease.converted ?? 0) / M).toBe(65);
    expect(conv.flags).toEqual([]);
  });
  it('in words: the time to release, the wait, the release the plan reaches, the chemicals and water', () => {
    const seq = clean({ sink: { plan: { kind: 'convert', how: 'prepare' } } });
    expect(cleandownSays({ sequence: seq, cleandown: nut, changeovers: { count: 2, per: 'week' }, running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 } })).toEqual([
      { text: 'A wet clean, allergen (nut): 90 min to release — 60 min cleaning, 15 min on the verification, 5 min on the release and 10 min of other work.', tone: 'n' },
      { text: 'The verification — Swab three sites and wait for the result — holds the line 15 min, from 70 to 85 min into the stop; work that does not need its result can be done alongside it.', tone: 'n' },
      { text: 'As planned, release at 65 min — 25 min sooner, the clean and its verification as they are.', tone: 'n' },
      { text: 'Chemicals and water: £45 a clean — £90 a week at 2 cleans a week.', tone: 'n' },
    ]);
    expect(cleandownWords({ kind: 'dry' })).toBe('A dry clean');
  });
  it('a run-up after the release is said; an allergen clean with no verification marked is told to mark it; no release — asked', () => {
    expect(cleandownSays({ sequence: clean({ runUp: true }), cleandown: nut })[0].text).toMatch(/90 min to release — .*; then 4 min to the first good pack\.$/);
    const noVerify = clean({ swab: { part: undefined } });
    expect(cleandownSays({ sequence: noVerify, cleandown: nut }).map(x => x.text)).toContain('An allergen clean is released on its verification — mark the swabs and the wait for their result.');
    expect(cleandownSays({ sequence: clean({ release: { part: undefined } }), cleandown: { kind: 'dry' } })[0].text).toBe('A dry clean: mark the element that releases the line to say the time to release.');
    expect(cleanMaterialsSays({ cleandown: { kind: 'dry' } })).toBe('Give what one clean uses in chemicals and water to say it in money.');
    expect(cleandownSays({ sequence: clean() })).toEqual([]);
  });
  it('a plan that would change the clean is said in amber; converting the cleaning off the line and a quicker release are not', () => {
    const wash = { kind: 'streamline' as const, how: 'parallel' as const, targetSec: 20 * M };
    const said = cleandownSays({ sequence: clean({ wash: { plan: wash } }), cleandown: nut });
    expect(said.filter(x => x.tone === 'a').map(x => x.text)).toEqual(['Wet clean the frame and conveyors is part of the clean — a plan that shortens it changes the cleaning method validated for the allergen, which is validated again before it is used. SMED shortens what is around the clean, not the clean itself.']);
    expect(said.some(x => /as they are/.test(x.text))).toBe(false);
    const st = (part: ChangeoverStep['part'], plan: ChangeoverStep['plan']): ChangeoverStep => ({ id: 'x', order: 0, name: 'X', sec: 10 * M, side: 'internal', source: 'typed', part, plan });
    expect(cleanFlagOf(st('clean', { kind: 'eliminate' }))).toMatch(/^X is part of the clean — a plan that removes it changes the cleaning method, which/);
    expect(cleanFlagOf(st('clean', { kind: 'convert', how: 'prepare' }))).toBeUndefined();
    expect(cleanFlagOf(st('clean', { kind: 'streamline', how: 'parallel' }))).toBeUndefined();
    expect(cleanFlagOf(st('verify', { kind: 'convert', how: 'prepare' }))).toMatch(/^X is the verification — the line is released on its result/);
    expect(cleanFlagOf(st('verify', { kind: 'streamline', how: 'no-adjust', targetSec: 5 * M }))).toMatch(/is the verification/);
    expect(cleanFlagOf(st('release', { kind: 'eliminate' }))).toMatch(/^X is the release — the line runs again only once it is signed/);
    expect(cleanFlagOf(st('release', { kind: 'streamline', how: 'parallel', targetSec: 2 * M }))).toBeUndefined();
    expect(cleanFlagOf(st(undefined, { kind: 'eliminate' }))).toBeUndefined();
  });
  it('the tile, the band\'s fact, the paper\'s part under the name and the standard keeping each part', () => {
    const seq = clean({ sink: { plan: { kind: 'convert', how: 'prepare' } } });
    expect(releaseTile(cleandownOf(seq, nut), ladderOf(seq))).toEqual({ k: 'To release', v: '90 min', of: '15 min on the verification · 65 min as planned' });
    const s: ToolStudy = { id: 's1', tool: 'changeover', name: 'Nut cookie → Plain cookie', facts: { sequence: seq, cleandown: nut }, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0 };
    const f = changeoverFigures(seq), l = ladderOf(seq);
    const page = smedLean({ s, f, l, said: { text: '', tone: 'n', verdict: '', lines: [] }, cost: { text: '' } });
    expect(page.tiles.map(t => t.k)).toContain('To release');
    expect(page.facts).toContainEqual(['The clean', 'A wet clean, allergen (nut)']);
    const sheet = changeoverSheet({ sequence: seq, cleandown: nut });
    expect(sheet.rows.map(r => r.part)).toEqual([undefined, 'Cleaning', 'Cleaning', 'Cleaning', 'Verification', 'Release']);
    expect(sheet.lines).toContain('As planned, release at 65 min — 25 min sooner, the clean and its verification as they are.');
    expect(standardFrom(seq, { id: 'a', at: 0, studyId: 's1' }).steps.map(x => x.part)).toEqual([undefined, 'clean', 'clean', 'clean', 'verify', 'release']);
  });
  it('a product change reads exactly as before: no tile, no fact, no part, no line', () => {
    const seq = clean();
    const s: ToolStudy = { id: 's2', tool: 'changeover', name: 'x', facts: { sequence: seq }, uses: [], startedAt: 0, createdAt: 0, updatedAt: 0 };
    const page = smedLean({ s, f: changeoverFigures(seq), l: ladderOf(seq), said: { text: '', tone: 'n', verdict: '', lines: [] }, cost: { text: '' } });
    expect(page.tiles.length).toBe(5);
    expect(page.facts.some(([k]) => k === 'The clean')).toBe(false);
    expect(changeoverSheet({ sequence: seq }).rows.every(r => r.part === undefined)).toBe(true);
  });
});
