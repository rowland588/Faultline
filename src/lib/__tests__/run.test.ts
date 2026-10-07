import { describe, expect, it } from 'vitest';
import { agreedWords, cleanRun, isRunTest, numbersSay, readRun, runLine, runShort, runTiles } from '../run';
import { nextFrom, type Test } from '../testing';

const T = (p: Partial<Test>): Test => ({ id: 't', projectId: 'p', title: 'Performance run at the agreed rate', outcome: 'planned', sort: 1, createdAt: 0, updatedAt: 0, ...p });

describe('which tests are runs', () => {
  it('knows a run by its name, as a whole word', () => {
    expect(isRunTest(T({}))).toBe(true);
    expect(isRunTest(T({ title: 'Runs with product at the agreed speed' }))).toBe(true);
    expect(isRunTest(T({ title: 'Weight accuracy — 400g' }))).toBe(false);   // "accurate" is not "rate"
    expect(isRunTest(T({ title: 'Changeover in the agreed time' }))).toBe(false);
  });
  it('knows one by the numbers kept on it, whatever its name', () => {
    expect(isRunTest(T({ title: 'Day one', run: { packs: 10 } }))).toBe(true);
  });
  it('never a fix or a stage', () => {
    expect(isRunTest(T({ kind: 'fix' }))).toBe(false);
    expect(isRunTest(T({ kind: 'install' }))).toBe(false);
  });
});

describe('the reading', () => {
  const met = T({ runAgreed: { rate: 60, minutes: 60, rejectsMax: 1 }, run: { minutes: 60, packs: 3720, rejects: 14, speed: 64, stops: 3 }, product: 'Finest Red 2kg' });
  const short = T({ runAgreed: { rate: 60, minutes: 30, rejectsMax: 1 }, run: { minutes: 30, packs: 1710, rejects: 31, speed: 60 } });

  it('nets the good packs over the minutes run', () => {
    const r = readRun(met);
    expect(r.good).toBe(3706);
    expect(r.net).toBeCloseTo(61.77, 2);
    expect(r.rejectPct).toBeCloseTo(0.376, 3);
    expect(r.meets).toBe(true);
  });

  it('says what fell short, and by how much', () => {
    const r = readRun(short);
    expect(r.meets).toBe(false);
    expect(numbersSay(r)).toBe('The numbers fall short — net rate 4 ppm short, rejects 0.81% over.');
  });

  it('the line every list prints', () => {
    expect(runLine(met)).toBe('Netted 61.8 ppm against 60 agreed · ran at 64 ppm · 14 rejects (0.38%) · 60 min · stood 3 min · Finest Red 2kg');
    expect(runLine(short, { product: false })).toBe('Netted 56 ppm against 60 agreed — 4 ppm short · ran at 60 ppm · 31 rejects (1.8%) · 30 min');
    expect(runShort(met)).toBe('61.8 of 60 ppm');
  });

  it('the tiles: only a missed number is red, a met one green, the rest ink', () => {
    expect(runTiles(readRun(short)).map(t => t.tone)).toEqual(['short', '', '', 'short', 'met']);
    expect(runTiles(readRun(met))[0]).toMatchObject({ label: 'Net rate', value: '61.8', unit: 'ppm', sub: '60 agreed' });
  });

  it('cannot judge without a rate agreed and measured', () => {
    expect(readRun(T({ run: { minutes: 60, packs: 3600 } })).meets).toBeUndefined();
    expect(readRun(T({ runAgreed: { rate: 60 }, run: { packs: 3600 } })).meets).toBeUndefined();   // no minutes, no rate
    expect(numbersSay(readRun(T({ run: { packs: 1 } })))).toBe('');
  });

  it('nothing measured is nothing said', () => {
    expect(readRun(T({})).ran).toBe(false);
    expect(runLine(T({ runAgreed: { rate: 60 } }))).toBe('');
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
  it('blank boxes are dropped, so an emptied one clears', () => {
    expect(cleanRun({ rate: 60, minutes: undefined })).toEqual({ rate: 60 });
    expect(cleanRun({ rate: undefined })).toBeUndefined();
  });
});
