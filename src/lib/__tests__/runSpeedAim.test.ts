/* A PROGRAM'S TEST AIMS AT A SPEED (lib/run; Rowland, 25 October: "the machine needs to run at x speed … and the budget
 * net speed is x amount … they can be both the target … it's not short … a net rate to achieve doesn't exist").
 * Test 3 of his program: aiming 75 ppm for 60 min, set at 75, ran 60 min, 3,600 packs, 30 rejects.
 * By hand: good packs 3,600 − 30 = 3,570; net 3,570 ÷ 60 = 59.5 ppm; 75 − 59.5 = 15.5 ppm below the speed it ran at;
 * rejects 30 ÷ 3,600 = 0.8333…%. */
import { describe, expect, it } from 'vitest';
import { productRuns, readRun, readRuns, runLine, runShort, agreedWords } from '../run';
import { runWorth } from '../runMoney';
import type { Test } from '../testing';

const base = { id: 't3', projectId: 'p', title: 'Prove program PR-3', kind: 'test', outcome: 'planned', sort: 1, createdAt: 1, updatedAt: 1 } as Test;
const day = { speed: 75, minutes: 60, packs: 3600, rejects: 30 };
const prog = (runAgreed: Test['runAgreed']): Test => ({ ...base, programId: 'pr3', runAgreed, run: day });

describe('a program’s test aims at a speed', () => {
  it('ran at the speed aimed at for the minutes: met — the net is a fact, not a shortfall', () => {
    const t = prog({ rate: 75, minutes: 60 });
    const r = readRun({ run: t.run, runAgreed: productRuns(t)[0]?.agreed });
    expect(r.net).toBeCloseTo(59.5, 10);
    expect(r.belowSpeed).toBeCloseTo(15.5, 10);
    expect(r.rejectPct).toBeCloseTo(0.8333333, 5);
    expect(r.checks.map(c => [c.what, c.ok])).toEqual([['speed', true], ['length', true]]);
    expect(r.meets).toBe(true);
    const rr = readRuns(t);
    expect(rr.verdict).toBe('passed');
    expect(rr.products[0]?.gap).toBe('');
    expect(runLine({ run: t.run, runAgreed: productRuns(t)[0]?.agreed })).toBe('Netted 59.5 ppm · ran at 75 ppm · 15.5 ppm below the speed it ran at · 30 rejects (0.83%) · 60 min');
  });
  it('a net rate given as well is judged: 60 against 59.5 — 0.5 ppm short — and priced only then', () => {
    const t = prog({ rate: 75, minutes: 60, net: 60 });
    const rr = readRuns(t);
    expect(rr.verdict).toBe('failed');
    expect(rr.products[0]?.gap).toBe('net rate 0.5 ppm short');
    const w = runWorth(rr.products[0]!, { name: 'L', packsPerMin: 75, marginPerPack: 0.1, shifts: [] } as never);
    expect(w?.shortPpm).toBeCloseTo(0.5, 10);
    expect(w?.packs).toBeCloseTo(30, 10);
    /* and met at 59: */
    expect(readRuns(prog({ rate: 75, minutes: 60, net: 59 })).verdict).toBe('passed');
  });
  it('ran slower than the speed aimed at: that is the shortfall — 70 against 75, 5 ppm slower', () => {
    const t = { ...prog({ rate: 75, minutes: 60 }), run: { ...day, speed: 70 } };
    const rr = readRuns(t);
    expect(rr.verdict).toBe('failed');
    expect(rr.products[0]?.gap).toBe('speed it ran at 5 ppm slower');
  });
  it('the speed not typed yet: numbers going in, not judged — and the box it waits on is named', () => {
    const t = { ...prog({ rate: 75, minutes: 60 }), run: { minutes: 60, packs: 3600, rejects: 30 } };
    const p = readRuns(t).products[0]!;
    expect(p.state).toBe('partial');
    expect(p.missing).toEqual(['speed it ran at']);
  });
  it('the words: what was agreed, the square on the grid', () => {
    expect(agreedWords({ rate: 75, minutes: 60, of: 'speed' })).toBe('run at 75 ppm for 60 min');
    expect(agreedWords({ rate: 75, minutes: 60, net: 60, of: 'speed' })).toBe('run at 75 ppm for 60 min, net 60 ppm');
    expect(runShort({ run: day, runAgreed: { rate: 75, minutes: 60, of: 'speed' } })).toBe('59.5 ppm net');
    expect(runShort({ run: day, runAgreed: { rate: 75, minutes: 60, net: 60, of: 'speed' } })).toBe('59.5 of 60 ppm');
  });
  it('every other run still aims at a net rate, exactly as before', () => {
    const t = { ...base, runAgreed: { rate: 75, minutes: 60 }, run: day } as Test;
    const rr = readRuns(t);
    expect(rr.verdict).toBe('failed');
    expect(rr.products[0]?.gap).toBe('net rate 15.5 ppm short');
  });
});
