import { describe, expect, it } from 'vitest';
import { WORK_WORD, aheadOfBest, draftOf, draftProblem, speedOf, statusFrom, statusFromRow, statusParts, statusSays, statusTally } from '../programStatus';

describe('a program’s status section', () => {
  it('reads a speed typed: a positive number or nothing', () => {
    expect(speedOf('75')).toBe(75);
    expect(speedOf(' 62.5 ')).toBe(62.5);
    expect(speedOf('1,200')).toBe(1200);
    for (const bad of ['', 'abc', '0', '-5', '1e9']) expect(speedOf(bad)).toBeUndefined();
  });
  it('refuses a speed that is typed and is not a number, in words', () => {
    expect(draftProblem({ work: 'doing', bestSpeed: 'abc', runAt: '', caveats: '' })).toMatch(/Best speed is a number above nothing/);
    expect(draftProblem({ work: 'doing', bestSpeed: '', runAt: '-3', caveats: '' })).toMatch(/production can run at/);
    expect(draftProblem({ work: 'doing', bestSpeed: '75', runAt: '70', caveats: '' })).toBeUndefined();
  });
  it('keeps only what is said — nothing said is no record', () => {
    expect(statusFrom({ work: 'notStarted', bestSpeed: '', runAt: '', caveats: '  ' }, 1)).toBeUndefined();
    const s = statusFrom({ work: 'doing', bestSpeed: '75', runAt: '70', caveats: ' only 2 kg film ' }, 5, 'Rowland');
    expect(s).toEqual({ work: 'doing', bestSpeed: 75, runAt: 70, caveats: 'only 2 kg film', at: 5, by: 'Rowland' });
    expect(statusFrom({ work: 'done', bestSpeed: '', runAt: '', caveats: '' }, 2)).toEqual({ work: 'done', at: 2 });
    expect(draftOf(s)).toEqual({ work: 'doing', bestSpeed: '75', runAt: '70', caveats: 'only 2 kg film' });
  });
  it('says it as one line, only what is said', () => {
    const s = statusFrom({ work: 'doing', bestSpeed: '75', runAt: '70', caveats: 'film tension each reel' }, 1);
    expect(statusParts(s)).toEqual(['Doing', 'Best speed 75 ppm', 'Production can run at 70 ppm', 'Caveats: film tension each reel']);
    expect(statusSays(s)).toBe('Doing · Best speed 75 ppm · Production can run at 70 ppm · Caveats: film tension each reel');
    expect(statusSays(statusFrom({ work: 'onHold', bestSpeed: '', runAt: '', caveats: '' }, 1))).toBe('On hold');
    expect(statusSays(undefined)).toBe('');
    expect(WORK_WORD.notStarted).toBe('Not started');
  });
  it('says production is asked to run faster than the best run, and never refuses it', () => {
    expect(aheadOfBest(statusFrom({ work: 'doing', bestSpeed: '75', runAt: '80', caveats: '' }, 1))).toBe(true);
    expect(aheadOfBest(statusFrom({ work: 'doing', bestSpeed: '75', runAt: '75', caveats: '' }, 1))).toBe(false);
    expect(aheadOfBest(statusFrom({ work: 'doing', bestSpeed: '', runAt: '80', caveats: '' }, 1))).toBe(false);
  });
  it('is read from the cloud only in the shape this build knows', () => {
    expect(statusFromRow(null)).toEqual({});
    expect(statusFromRow({ work: 'flying' })).toEqual({});
    expect(statusFromRow({ work: 'done', bestSpeed: 60, runAt: -1, caveats: '  ', at: 9 })).toEqual({ status: { work: 'done', bestSpeed: 60, at: 9 } });
  });
  it('tallies what people said together', () => {
    const d = { work: 'doing', at: 1 } as const, dn = { work: 'done', at: 1 } as const;
    expect(statusTally([{}, { status: d }, { status: dn }, { status: dn }])).toBe('3 of 4 programs with a status — 1 doing · 2 done');
    expect(statusTally([{}, {}])).toBe('');
  });
});
