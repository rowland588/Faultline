/* A PROGRAM'S JOURNEY (lib/programJourney; Rowland, 14 October: "I only run
 * for 30 minutes, so we decide to run a retest ... we run at 45 minutes and
 * we achieve another amount of speed ... successful at 50 packs per minute.
 * Great. Now let's do a retest at 55"). PR-04 tested four times: 30 minutes
 * at 50, short of the hour; 60 minutes at 50, passed; 60 at 55, didn't
 * pass; a fourth booked. */
import { describe, expect, it } from 'vitest';
import { attemptsOf, nettedOf, programJourney } from '../programJourney';
import { programAfterTest, type Program } from '../programs';
import { latestAttempts, type Test } from '../testing';

const t0 = 1_700_000_000_000;
const test = (id: string, o: Partial<Test> = {}): Test => ({ id, projectId: 'j', title: 'Prove program PR-04', kind: 'test', outcome: 'planned', programId: 'p4', sort: 1, createdAt: t0, updatedAt: t0, ...o } as Test);
const p: Program = { id: 'p4', projectId: 'j', what: 'PR-04 Finest Red', state: 'onMachine', sort: 1, createdAt: t0, updatedAt: t0 };

const t1 = test('t1', { outcome: 'failed', ranOn: '2026-10-10', runAgreed: { rate: 50, minutes: 60 }, run: { speed: 50, minutes: 30, packs: 1500, rejects: 20 }, result: 'Only half the hour — stopped for the film' });
const t2 = test('t2', { fromTestId: 't1', createdAt: t0 + 1, outcome: 'passed', ranOn: '2026-10-12', runAgreed: { rate: 50, minutes: 60 }, run: { speed: 50, minutes: 60, packs: 3010, rejects: 10 } });
const t3 = test('t3', { fromTestId: 't2', createdAt: t0 + 2, outcome: 'failed', ranOn: '2026-10-13', runAgreed: { rate: 55, minutes: 60 }, run: { speed: 55, minutes: 45 }, result: 'Seal temp low above 52' });
const t4 = test('t4', { fromTestId: 't3', createdAt: t0 + 3, plannedFor: '2026-10-16', runAgreed: { rate: 55, minutes: 60 } });

describe('a program’s journey', () => {
  it('its tests in the order they followed each other, whatever order they are stored in', () => {
    expect(attemptsOf(p, [t3, t1, t4, t2]).map(t => t.id)).toEqual(['t1', 't2', 't3', 't4']);
  });
  it('each attempt says when, what it aimed at, what it did and how it went', () => {
    const j = programJourney(p, [t1, t2, t3, t4], '2026-10-14');
    expect(j.attempts.map(a => a.text)).toEqual([
      'Test 1 · 10 Oct · aiming 50 ppm for 60 min · set at 50 ppm · ran 30 min · 1,500 packs · 20 rejects · netted 49.3 ppm — didn’t pass: Only half the hour — stopped for the film',
      'Test 2 · 12 Oct · aiming 50 ppm for 60 min · set at 50 ppm · ran 60 min · 3,010 packs · 10 rejects · netted 50 ppm — passed',
      'Test 3 · 13 Oct · aiming 55 ppm for 60 min · set at 55 ppm · ran 45 min — didn’t pass: Seal temp low above 52',
      'Test 4 · aiming 55 ppm for 60 min — booked 16 Oct',
    ]);
    expect(j.attempts.map(a => a.result.tone)).toEqual(['r', 'g', 'r', 'w']);
  });
  it('the fastest pass and the count', () => {
    const j = programJourney(p, [t1, t2, t3, t4], '2026-10-14');
    expect(j.best).toBe('Passed at 50 ppm for 60 min on 12 Oct (test 2)');
    expect(j.says).toBe('4 tests · 1 passed · 2 didn’t pass · 1 to run');
  });
  it('netted is good packs over the minutes run', () => {
    expect(nettedOf(t1)).toBeCloseTo(1480 / 30);
    expect(nettedOf(t3)).toBeUndefined();
  });
  it('a later attempt at a higher speed that does not pass leaves the earlier pass standing', () => {
    const proved = programAfterTest(p, t2, '2026-10-12') as Program;
    expect(proved.provedOn).toBe('2026-10-12');
    expect(programAfterTest(proved, t3, '2026-10-13')).toBeUndefined();
  });
  it('as the tests stand now, the pass at 50 stands — the 55 that did not pass is a step in its journey', () => {
    expect(latestAttempts([t1, t2, t3]).map(t => t.id)).toEqual(['t2']);
    /* still to run at 55: that is where it is */
    expect(latestAttempts([t1, t2, t3, t4]).map(t => t.id)).toEqual(['t4']);
    /* with no pass before it, a test that did not pass stands as it is */
    expect(latestAttempts([t1]).map(t => t.id)).toEqual(['t1']);
  });
  it('no tests, no journey', () => {
    expect(programJourney(p, [], '2026-10-14')).toEqual({ attempts: [] });
  });
});
