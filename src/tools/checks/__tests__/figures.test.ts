/* EVERY DEFINITION'S WORKED EXAMPLES through the shared module — the numbers each was hand-worked to
 * (def.examples[].expect; cases-checks.py and the knowledge records) against what logFigures says — plus the scored
 * checklist and the hold against independent cases. A new definition is covered by adding its examples; nothing here
 * is edited. */
import { describe, expect, it } from 'vitest';
import cases from './cases.json';
import { LOG_DEFS } from '../registry';
import { exampleStudy, starterIndexOf } from '../example';
import { logFigures, scoredSeries, tagFigures } from '../figures';
import { shareOfMax, scoreOf, fallsInARow, repeatsOf, weakest, blankAnswers } from '../scoring';
import { holdFor, holdOf, rateFor } from '../hold';
import { failuresOf } from '../checks';
import { logClosing, logSays, logTiles } from '../says';
import { starterLog } from '../start';
import type { Snag } from '../../../snag/types';

const NOW = Date.UTC(2026, 9, 22, 12, 0);

describe.each(LOG_DEFS.map(d => [d.key, d] as const))('%s — its examples', (_k, def) => {
  it.each(def.examples.map(e => [e.name, e] as const))('%s', (_n, ex) => {
    const s = exampleStudy(def, ex, NOW);
    const rate = ex.ratePerMin ? rateFor({ packsPerMin: ex.ratePerMin, materialsPerPack: undefined as never }) : undefined;
    const f = logFigures({ s, def, now: NOW, ctx: { ...(rate ? { rate } : {}) } });
    expect(f).toBeDefined();
    if (!f) return;
    const e = ex.expect;
    /* the whole life of the example is the period: widen the window to the start */
    const wide = logFigures({ s, def, now: NOW, ctx: { ...(rate ? { rate } : {}) }, days: Math.ceil(ex.nowMin / 1440) + 1 });
    if (!wide) return;
    if (e.expected !== undefined) expect(wide.comp.expected).toBe(e.expected);
    if (e.onTime !== undefined) expect(wide.comp.onTime).toBe(e.onTime);
    if (e.missed !== undefined) expect(wide.comp.missed).toBe(e.missed);
    if (e.pct !== undefined && !def.scale && wide.comp.pct !== undefined) expect(wide.comp.pct).toBeCloseTo(e.pct, 1);
    if (e.failed !== undefined) expect(wide.failures.length).toBe(e.failed);
    if (e.packsHeld !== undefined) expect(wide.heldPacks).toBe(e.packsHeld);
    if (e.states) for (const [i, key] of Object.entries(e.states)) {
      const st = [...wide.round.now, ...wide.round.later, ...wide.round.events].find(x => starterIndexOf(ex, def, s, x.check.id) === Number(i));
      expect(st?.key, `check ${i}`).toBe(key);
    }
    const sc = wide.scored[0];
    if (sc && e.pct !== undefined && def.scale) {
      expect(sc.latest?.figures.pct).toBeCloseTo(e.pct, 6);
      if (e.weakest) expect(sc.weakest?.name).toBe(e.weakest);
      if (e.findings !== undefined) expect(sc.latest?.findings.length).toBe(e.findings);
      if (e.repeats !== undefined) expect(sc.latest?.repeats.length).toBe(e.repeats);
      if (e.falls !== undefined) expect(sc.falls).toBe(e.falls);
    }
    const v = wide.values[0];
    if (v && e.nearing) { expect(v.trend.nearing).toBe(e.nearing); expect(v.trend.headroomPct).toBeCloseTo(e.headroomPct ?? 0, 1); expect(v.trend.trend?.dir).toBe(e.going); }
    if (e.tags !== undefined) {
      const t = tagFigures(s, [], NOW);
      expect(t?.raised).toBe(e.tags);
      expect(t?.repeats.length).toBe(e.repeatTags ?? 0);
    }
    /* the words are made, and say nothing the figures do not */
    expect(logSays(wide, s, def).text.length).toBeGreaterThan(10);
    expect(logTiles(wide, def).length).toBeGreaterThanOrEqual(3);
    expect(logClosing(wide, s).text).toMatch(/\.$/);
  });
});

describe('a scored checklist, against the 5S record’s worked case', () => {
  const five = cases.fiveS;
  const scale = { levels: [0, 1, 2, 3, 4].map(v => ({ v, word: String(v) })), findingBelow: 3 };
  const answers = Object.entries(five.scores).flatMap(([group, ls]) => (ls as (number | null)[]).map((level, i) => ({ id: `${group}.${i}`, group, level })));
  it('scores the share of the maximum, overall and by S: 52 of 80 = 65%; Sort 88%, Set in order 69%, Shine 44%, Standardise 69%, Sustain 56%', () => {
    const f = shareOfMax(answers, scale, 3);
    expect(f.points).toBe(five.points);
    expect(f.max).toBe(five.max);
    expect(f.pct).toBeCloseTo(five.pct, 9);
    for (const g of f.groups) expect(g.pct).toBeCloseTo(five.groups[g.name as keyof typeof five.groups].pct, 9);
    expect(weakest(f)?.name).toBe('Shine');
    expect(f.findings.length).toBe(cases.fiveSfindings.count);
  });
  it('leaves a question answered not applicable out of both sides: 46 of 72', () => {
    const na = Object.entries(cases.fiveSna.scores).flatMap(([group, ls]) => (ls as (number | null)[]).map((level, i) => ({ id: `${group}.${i}`, group, level })));
    const f = shareOfMax(na, scale, 3);
    expect(f.points).toBe(cases.fiveSna.points);
    expect(f.max).toBe(cases.fiveSna.max);
    expect(f.pct).toBeCloseTo(cases.fiveSna.pct, 9);
    expect(f.answered).toBe(18);
    expect(f.of).toBe(20);
  });
  it('scores nothing answered as no score, not zero', () => {
    expect(shareOfMax([{ id: 'a', level: null }], scale, 3).pct).toBeUndefined();
    expect(scoreOf({}, scale)).toBeUndefined();
  });
  it('counts the falls in a row back from the newest: 81, 78, 75, 72, 65 is four', () => {
    expect(fallsInARow([...five.prev, five.pct])).toBe(five.fallsInARow);
    expect(fallsInARow([60, 70, 65])).toBe(1);
    expect(fallsInARow([70])).toBe(0);
    expect(fallsInARow([])).toBe(0);
    expect(fallsInARow([70, 70])).toBe(0);
  });
  it('finds the repeats: below the line now and in the audit before (4 of the 9)', () => {
    const ans = (scores: Record<string, (number | null)[]>) => Object.entries(scores).flatMap(([group, ls]) => ls.map((level, i) => ({ id: `${group}.${i}`, name: 'q', group, level })));
    const rep = repeatsOf(ans(five.scores), ans(cases.fiveSrepeats.prev as Record<string, number[]>), scale, 3);
    expect(rep.length).toBe(cases.fiveSrepeats.count);
    expect(repeatsOf(ans(five.scores), undefined, scale)).toEqual([]);
  });
  it('a fresh audit starts with every question and no answer', () => {
    expect(blankAnswers({ items: [{ id: '1', name: 'q', group: 'Sort' }] })).toEqual([{ id: '1', name: 'q', group: 'Sort', level: null }]);
  });
  it('a series: the pass line, if agreed, judges the newest', () => {
    const def = LOG_DEFS.find(d => d.key === 'five-s')!;
    const ex = def.examples[0];
    const s = exampleStudy(def, ex, NOW);
    const sc = scoredSeries(s.agreed!.log!.checks[0], s, def)!;
    expect(sc.pcts).toEqual(cases.fiveSseries.pcts);
    expect(sc.falls).toBe(cases.fiveSseries.falls);
    expect(sc.falling).toBe(false);
  });
});

describe('what a failure holds, in packs and pounds', () => {
  const def = LOG_DEFS.find(d => d.key === 'metal-detection')!;
  const ex = def.examples[0];
  const s = exampleStudy(def, ex, NOW);
  const log = s.agreed!.log!;
  const f = failuresOf(log.checks[2], log, s.facts.results, def)[0];
  it('types win: packs counted on the failure replace the rate × the window', () => {
    const h = holdOf({ ...f, result: { ...f.result, made: 5400 } }, { rate: { perMin: 110, from: 'rated', unit: 'packs' } }, def);
    expect(h.packs).toBe(5400);
    expect(h.packsFrom).toBe('typed');
    expect(h.words).toContain('counted on the failure');
  });
  it('else the rate × the window: Line capacity’s first, the line’s rated speed after (110 × 60 = 6,600)', () => {
    expect(holdOf(f, { rate: rateFor({ packsPerMin: 90 }, { perMin: 110, unit: 'bags' }) }, def)).toMatchObject({ packs: cases.hold.packs, packsFrom: 'capacity', unit: 'bags' });
    expect(holdOf(f, { rate: rateFor({ packsPerMin: 110 }) }, def)).toMatchObject({ packs: cases.hold.packs, packsFrom: 'rated' });
  });
  it('with neither, says which input is missing and where to give it — and invents nothing', () => {
    const h = holdOf(f, {}, def);
    expect(h.packs).toBeUndefined();
    expect(h.missing).toMatch(/rated speed/);
    expect(h.words).toContain('1 h since the last good check');
  });
  it('prices the packs at the line’s materials a pack as the register does (lib/problemCost), and names the materials as missing otherwise', () => {
    const priced = holdOf(f, { rate: rateFor({ packsPerMin: 110 }), line: { name: 'Line 7', materialsPerPack: 0.2 } }, def);
    expect(priced.tiedUp).toBeCloseTo(1320, 6);
    expect(priced.words).toContain('£1.3k tied up');
    const unpriced = holdOf(f, { rate: rateFor({ packsPerMin: 110 }), line: { name: 'Line 7' } }, def);
    expect(unpriced.tiedUp).toBeUndefined();
    expect(unpriced.missing).toMatch(/materials a pack/);
  });
  it('a re-test that fails again holds nothing more', () => {
    const again = failuresOf(log.checks[2], log, [...s.facts.results!, { id: 'r99', checkId: log.checks[2].id, at: f.result.at + 15 * 60_000, outcome: 'fail' }], def)[1];
    expect(holdOf(again, { rate: rateFor({ packsPerMin: 110 }) }, def)).toMatchObject({ packs: 0, words: expect.stringContaining('nothing more') });
  });
  it('a check that does not hold product says so and counts no packs (a 5S audit)', () => {
    const five = LOG_DEFS.find(d => d.key === 'five-s')!;
    const check = { ...starterLog(five, { since: 0 }).checks[0], kind: 'passfail' as const, holds: false };
    const [fa] = failuresOf(check, { since: 0 }, [{ id: 'r', checkId: check.id, at: 60 * 60_000, outcome: 'fail' }]);
    expect(holdOf(fa, { rate: rateFor({ packsPerMin: 110 }) }, five).holds).toBe(false);
  });
  it('the seam for the product-on-hold record gives the facts and decides nothing', () => {
    const facts = holdFor({ ...s, facts: { ...s.facts, results: s.facts.results!.map(r => (r.outcome === 'fail' ? { ...r, problemId: 'p1' } : r)) } }, f.result.id, { rate: rateFor({ packsPerMin: 110 }), line: { name: 'Line 7', materialsPerPack: 0.2 } }, def)!;
    expect(facts).toMatchObject({ studyId: 'ex', line: 'ws', machine: 'Metal detector', windowMin: 60, packs: 6600, holds: true, problemId: 'p1', check: { name: 'Stainless steel test piece' } });
    expect(facts.failedAt - (facts.goodAt ?? 0)).toBe(60 * 60_000);
    expect(facts.reason).toContain('Stainless steel test piece failed at Metal detector');
    expect(holdFor(s, 'nope', {}, def)).toBeUndefined();
    expect(holdFor(s, s.facts.results![0].id, {}, def)).toBeUndefined();
  });
});

describe('tags and the problems a log has raised', () => {
  it('counts a tag open until its problem is closed, flags the old, and finds the place tagged again', () => {
    const def = LOG_DEFS.find(d => d.key === 'cilt')!;
    const s = exampleStudy(def, def.examples[0], NOW);
    const day = 86_400_000;
    const tagged = { ...s, facts: { ...s.facts, tags: [
      { id: 't1', checkId: s.agreed!.log!.checks[0].id, at: NOW - 20 * day, colour: 'red' as const, what: 'a', problemId: 'p1' },
      { id: 't2', checkId: s.agreed!.log!.checks[0].id, at: NOW - 3 * day, colour: 'white' as const, what: 'b', problemId: 'p2' },
      { id: 't3', checkId: s.agreed!.log!.checks[0].id, at: NOW - 40 * day, colour: 'white' as const, what: 'c', problemId: 'p3' },
    ] } };
    const snags = [{ id: 'p1', status: 'open' }, { id: 'p2', status: 'closed' }, { id: 'p3', status: 'closed' }] as Snag[];
    const t = tagFigures(tagged, snags, NOW)!;
    expect(t).toMatchObject({ raised: 3, open: 1, closed: 2, over7: 1, over14: 1 });
    expect(t.repeats).toEqual([{ checkId: s.agreed!.log!.checks[0].id, name: s.agreed!.log!.checks[0].name, n: 2 }]);
  });
});
