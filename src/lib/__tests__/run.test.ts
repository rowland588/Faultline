import { describe, expect, it } from 'vitest';
import {
  agreedWords, cleanRun, firstRunId, isRunTest, patchRuns, productFigures, productRuns, readRun, readRuns, runAgain, runLine,
  runShort, runsBoard, runsLine, runsOpen, runsSay, unplannedShorts, withDay, type ProductRun,
} from '../run';
import { needsVerdict, nextFrom, outcomeWord, type Test } from '../testing';
import { commissionNeeds, testCell } from '../commission';
import { trialCard, verdictLine } from '../trialCard';

const T = (p: Partial<Test>): Test => ({ id: 't', projectId: 'p', title: 'Performance run at the agreed rate', outcome: 'planned', sort: 1, createdAt: 0, updatedAt: 0, ...p });
const AGREED = { rate: 60, minutes: 60, rejectsMax: 1 };
const MET = { minutes: 60, packs: 3720, rejects: 14, speed: 64, stops: 3 };
const SHORT = { minutes: 60, packs: 3550, rejects: 42, speed: 62 };
const P = (id: string, product: string, day?: ProductRun['day'], agreed: ProductRun['agreed'] = AGREED): ProductRun =>
  ({ id, product, agreed, ...(day ? { day } : {}) });

describe('which tests are runs', () => {
  it('knows a run by its name, as a whole word', () => {
    expect(isRunTest(T({}))).toBe(true);
    expect(isRunTest(T({ title: 'Runs with product at the agreed speed' }))).toBe(true);
    expect(isRunTest(T({ title: 'Weight accuracy — 400g' }))).toBe(false);   // "accurate" is not "rate"
    expect(isRunTest(T({ title: 'Changeover in the agreed time' }))).toBe(false);
  });
  it('knows one by the numbers kept on it, whatever its name — or by its products', () => {
    expect(isRunTest(T({ title: 'Day one', run: { packs: 10 } }))).toBe(true);
    expect(isRunTest(T({ title: 'Day one', runs: [P('a', 'Finest Red 2kg')] }))).toBe(true);
  });
  it('never a fix or a stage', () => {
    expect(isRunTest(T({ kind: 'fix' }))).toBe(false);
    expect(isRunTest(T({ kind: 'install' }))).toBe(false);
  });
});

describe('the reading of one product', () => {
  const met = T({ runAgreed: AGREED, run: MET, product: 'Finest Red 2kg' });
  const short = T({ runAgreed: { rate: 60, minutes: 30, rejectsMax: 1 }, run: { minutes: 30, packs: 1710, rejects: 31, speed: 60 } });

  it('nets the good packs over the minutes run', () => {
    const r = readRun(met);
    expect(r.good).toBe(3706);
    expect(r.net).toBeCloseTo(61.77, 2);
    expect(r.rejectPct).toBeCloseTo(0.376, 3);
    expect(r.meets).toBe(true);
  });

  it('says what fell short, and by how much', () => {
    const p = readRuns(short).products[0];
    expect(p.state).toBe('short');
    expect(p.gap).toBe('net rate 4 ppm short, rejects 0.81% over');
  });

  it('the line every list prints', () => {
    expect(runLine(met)).toBe('Netted 61.8 ppm against 60 agreed · ran at 64 ppm · 14 rejects (0.38%) · 60 min · stood 3 min · Finest Red 2kg');
    expect(runLine(short, { product: false })).toBe('Netted 56 ppm against 60 agreed — 4 ppm short · ran at 60 ppm · 31 rejects (1.8%) · 30 min');
    expect(runShort(met)).toBe('61.8 of 60 ppm');
  });

  it('the figures: only a missed number is red, a met one green, the rest ink', () => {
    const f = productFigures(readRuns(short).products[0]);
    expect([f.netTone, f.rejectsTone, f.lengthTone]).toEqual(['short', 'short', 'met']);
    expect(productFigures(readRuns(met).products[0])).toMatchObject({ net: '61.8 ppm', rejects: '14 (0.38%)', length: '60 min, stood 3', speed: '64 ppm' });
  });

  it('cannot judge without a rate agreed and measured', () => {
    expect(readRun(T({ run: { minutes: 60, packs: 3600 } })).meets).toBeUndefined();
    expect(readRun(T({ runAgreed: { rate: 60 }, run: { packs: 3600 } })).meets).toBeUndefined();   // no minutes, no rate
  });

  it('is not judged until every agreed number can be — the rejects as well as the rate', () => {
    const half = readRuns(T({ runs: [P('a', 'Red', { minutes: 60, packs: 3720 })] })).products[0];
    expect(half.state).toBe('partial');
    expect(half.missing).toEqual(['rejects']);
    expect(half.r.meets).toBeUndefined();
  });

  it('nothing measured is nothing said', () => {
    expect(readRun(T({})).ran).toBe(false);
    expect(runLine(T({ runAgreed: { rate: 60 } }))).toBe('');
  });
});

describe('a run is many products', () => {
  const three = T({ id: 'r', plannedFor: '2026-10-06', plannedTo: '2026-10-08', ranOn: '2026-10-06',
    runs: [P('a', 'Finest Red 2kg', MET), P('b', 'Jacks Piper 1.25kg', SHORT), P('c', 'Express White 500g', undefined, { rate: 70, minutes: 30, rejectsMax: 1 })] });

  it('an older test’s one run reads as the list’s first product — nothing recorded is lost', () => {
    const old = T({ id: 'x', runAgreed: AGREED, run: MET, product: 'Finest Red 2kg', ranOn: '2026-10-01' });
    expect(productRuns(old)).toEqual([{ id: firstRunId('x'), product: 'Finest Red 2kg', agreed: AGREED, day: MET, ranOn: '2026-10-01' }]);
    expect(productRuns(T({ runAgreed: AGREED, run: MET, runs: [] }))).toEqual([]);   // an emptied list stays empty
    expect(productRuns(T({ title: 'Rate trial' }))).toEqual([]);
  });

  it('judges each product from its own numbers, and counts them', () => {
    const rr = readRuns(three);
    expect(rr.products.map(p => p.state)).toEqual(['met', 'short', 'toRun']);
    expect(rr.products.map(p => p.word)).toEqual(['Passed', 'Didn’t pass', 'To run']);
    expect([rr.total, rr.met, rr.short, rr.toRun, rr.ran, rr.open]).toEqual([3, 1, 1, 1, 2, true]);
    expect(rr.verdict).toBe('planned');
    expect(runsSay(rr)).toBe('2 of 3 products run — 1 passed, 1 didn’t pass.');
    expect(runsBoard(three)).toEqual({ said: '1 of 3 products passed', short: '1 short' });
  });

  it('planned ahead, nothing run: says so', () => {
    const planned = T({ runs: [P('a', 'Red'), P('b', 'White'), P('c', 'Piper')] });
    expect(runsSay(readRuns(planned))).toBe('3 products planned — none run yet.');
    expect(runsBoard(planned).said).toBe('3 products planned');
  });

  it('a product that did not pass and is run again: the later row counts', () => {
    const again = T({ runs: runAgain(three.runs as ProductRun[], ['b'], () => 'b2') });
    expect(again.runs?.map(p => p.id)).toEqual(['a', 'b', 'b2', 'c']);
    expect(again.runs?.[2]).toEqual({ id: 'b2', product: 'Jacks Piper 1.25kg', agreed: AGREED });
    const rr = readRuns(again);
    expect(rr.products[1].rerun).toBe(true);
    expect(unplannedShorts(rr)).toEqual([]);
    expect([rr.total, rr.short]).toEqual([3, 0]);
  });

  it('a line for an earlier attempt names every product', () => {
    expect(runsLine(three)).toMatch(/^Finest Red 2kg: Netted 61.8 ppm against 60 agreed · .*; Jacks Piper 1.25kg: Netted 58.5 ppm against 60 agreed — 1.5 ppm short/);
  });
});

describe('it decides — the test’s verdict follows the numbers', () => {
  const plan = (runs: ProductRun[], extra: Partial<Test> = {}) => T({ runs, ...extra });
  const today = '2026-10-07';

  it('the first number stamps the day it ran, on the product and the test', () => {
    const cur = plan([P('a', 'Red')]);
    const a = withDay(cur.runs![0], 'minutes', 60, today);
    expect(a.ranOn).toBe(today);
    expect(patchRuns(cur, [a], today)).toMatchObject({ ranOn: today });
    expect(patchRuns(cur, [a], today).outcome).toBeUndefined();   // still going in: no verdict yet
  });

  it('every product met → passed, the moment the last number is in', () => {
    const cur = plan([P('a', 'Red', MET), P('b', 'White', { minutes: 60, packs: 3720 })], { ranOn: '2026-10-06' });
    expect(readRuns(cur).verdict).toBe('planned');
    const done = cur.runs!.map(p => (p.id === 'b' ? withDay(p, 'rejects', 10, today) : p));
    expect(patchRuns(cur, done, today)).toMatchObject({ outcome: 'passed' });
  });

  it('any product short → didn’t pass', () => {
    const cur = plan([P('a', 'Red', MET), P('b', 'White', { minutes: 60, packs: 3550 })], { ranOn: today });
    const done = cur.runs!.map(p => (p.id === 'b' ? withDay(p, 'rejects', 42, today) : p));
    expect(patchRuns(cur, done, today).outcome).toBe('failed');
  });

  it('a verdict given by hand stands until the numbers decide something new', () => {
    const cur = plan([P('a', 'Red', SHORT)], { outcome: 'passed', ranOn: today });   // overruled: passed
    const tweak = [withDay(cur.runs![0], 'speed', 63, today)];                     // the numbers still say short
    expect(patchRuns(cur, tweak, today).outcome).toBeUndefined();
  });

  it('planning another product puts a finished run back to under way', () => {
    const cur = plan([P('a', 'Red', MET)], { outcome: 'passed', ranOn: today });
    expect(patchRuns(cur, [...cur.runs!, P('b', 'White')], today).outcome).toBe('planned');
  });

  it('a product first measured on a later day stretches the days it ran', () => {
    const cur = plan([P('a', 'Red', MET), P('b', 'White')], { ranOn: '2026-10-05' });
    const next = cur.runs!.map(p => (p.id === 'b' ? withDay(p, 'minutes', 60, today) : p));
    expect(patchRuns(cur, next, today).ranTo).toBe(today);
  });

  it('under way is not owed a verdict — late once its day has gone, as any test', () => {
    const going = plan([P('a', 'Red', MET), P('b', 'White')], { ranOn: '2026-10-05', plannedFor: '2026-10-05', plannedTo: '2026-10-09' });
    expect(runsOpen(going)).toBe(true);
    expect(needsVerdict(going)).toBe(false);
    expect(testCell(going, today)).toEqual({ tone: 'w', word: 'under way' });
    expect(outcomeWord(going)).toBe('Under way');
    expect(outcomeWord(plan([P('a', 'Red'), P('b', 'White')]))).toBe('Planned');
    expect(testCell({ ...going, plannedTo: '2026-10-06' }, today).tone).toBe('r');
    /* A run whose products are all in but none judged (no rate agreed) is the person's to say. */
    expect(needsVerdict(plan([P('a', 'Red', MET, {})], { ranOn: today }))).toBe(true);
  });
});

describe('Needs you', () => {
  const today = '2026-10-07';
  it('a product that didn’t pass with no re-run planned is named with its test', () => {
    const t = T({ id: 'r', ranOn: '2026-10-06', plannedFor: '2026-10-06', plannedTo: '2026-10-09',
      runs: [P('a', 'Finest Red 2kg', MET), P('b', 'Jacks Piper 1.25kg', SHORT), P('c', 'Express White 500g')] });
    const needs = commissionNeeds([t], [], today);
    expect(needs).toHaveLength(1);
    expect(needs[0]).toMatchObject({ kind: 'failed', word: '1 product didn’t pass — no re-run planned', shortProducts: ['Jacks Piper 1.25kg'] });
    expect(needs[0].why).toContain('Jacks Piper 1.25kg — net rate 1.5 ppm short');
    /* Run again: nothing owed but the run itself. */
    expect(commissionNeeds([{ ...t, runs: runAgain(t.runs!, ['b'], () => 'b2') }], [], today)).toEqual([]);
  });
  it('planned products whose day has gone are late', () => {
    const t = T({ id: 'r', plannedFor: '2026-10-01', runs: [P('a', 'Red'), P('b', 'White')] });
    expect(commissionNeeds([t], [], today).map(n => n.kind)).toEqual(['late']);
  });
});

describe('the card reads the list', () => {
  it('a row per product, the totals line, and the products named in the plan and the day', () => {
    const t = T({ ranOn: '2026-10-06', runs: [P('a', 'Finest Red 2kg', MET), P('b', 'Jacks Piper 1.25kg', SHORT), P('c', 'Express White 500g')] });
    const c = trialCard(t, [t], [], []);
    expect(c.run?.products.map(p => [p.product, p.word])).toEqual([['Finest Red 2kg', 'Passed'], ['Jacks Piper 1.25kg', 'Didn’t pass'], ['Express White 500g', 'To run']]);
    expect(c.run?.say).toBe('2 of 3 products run — 1 passed, 1 didn’t pass.');
    expect(c.plannedProduct).toBe('Finest Red 2kg · Jacks Piper 1.25kg · Express White 500g');
    expect(c.product).toBe('Finest Red 2kg · Jacks Piper 1.25kg');
    expect(verdictLine(c)).toBe('2 of 3 products run — 1 passed, 1 didn’t pass.');
  });
});

describe('what was agreed', () => {
  it('in words', () => {
    expect(agreedWords({ rate: 60, minutes: 60, rejectsMax: 1 })).toBe('60 ppm net for 60 min, rejects 1% at most');
    expect(agreedWords({ rate: 65 })).toBe('65 ppm net');
    expect(agreedWords({})).toBe('');
  });
  it('a re-test is judged on the same agreed numbers, its own day empty', () => {
    const next = nextFrom(T({ runAgreed: { rate: 60 }, run: { packs: 5 } }), () => 'n', 1);
    expect(next.runAgreed).toEqual({ rate: 60 });
    expect(next.run).toBeUndefined();
  });
  it('a re-test of many products runs again the ones that did not pass', () => {
    let k = 0;
    const next = nextFrom(T({ runs: [P('a', 'Red', MET), P('b', 'White', SHORT)] }), () => `n${++k}`, 1);
    expect(next.runs).toEqual([{ id: 'n2', product: 'White', agreed: AGREED }]);
  });
  it('blank boxes are dropped, so an emptied one clears', () => {
    expect(cleanRun({ rate: 60, minutes: undefined })).toEqual({ rate: 60 });
    expect(cleanRun({ rate: undefined })).toBeUndefined();
  });
});
