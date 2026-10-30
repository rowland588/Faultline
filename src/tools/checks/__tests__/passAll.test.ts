/* PASS ALL DUE — which checks one tap may pass, over EVERY definition's starter list (none special-cased), and the
 * words said before it. The states are the module's own (checkState) at a moment when every check is due. */
import { describe, expect, it } from 'vitest';
import { LOG_DEFS } from '../registry';
import { starterLog } from '../start';
import { roundOf, HOUR, MIN } from '../checks';
import { passAllLabel, passAllOffered, passAllPlan, passAllResults, passAllWords } from '../passAll';
import type { LogCheck, LogResult } from '../../../lib/study';

const chk = (id: string, over: Partial<LogCheck> = {}): LogCheck => ({ id, name: `Check ${id}`, when: { every: 60, unit: 'min' }, kind: 'passfail', ...over });
const NOW = 10 * HOUR;
/** Nothing done since the start: every timed check is overdue. */
const roundWith = (checks: LogCheck[], results: LogResult[] = []) => roundOf({ key: 'x', checks, since: 0 }, results, NOW).now;

describe('which checks Pass all due may pass', () => {
  it('passes the pass-or-fail checks that are due or overdue, and only those', () => {
    const plan = passAllPlan(roundWith([chk('a'), chk('b'), chk('c')]));
    expect(plan.pass.map(s => s.check.id)).toEqual(['a', 'b', 'c']);
    expect(plan.ask).toEqual([]);
    expect(plan.failed).toEqual([]);
  });
  it('a check with a reading, a count or an audit is asked for, never passed by it', () => {
    const plan = passAllPlan(roundWith([chk('a'), chk('v', { kind: 'value', lo: 1, hi: 2 }), chk('n', { kind: 'count' }), chk('s', { kind: 'scored', items: [] })]));
    expect(plan.pass.map(s => s.check.id)).toEqual(['a']);
    expect(plan.ask.map(s => s.check.id).sort()).toEqual(['n', 's', 'v']);
  });
  it('a check that failed is re-checked on its own card; one only due soon is not due', () => {
    const failed: LogResult = { id: 'r1', checkId: 'f', at: NOW - 5 * MIN, outcome: 'fail' };
    const done: LogResult = { id: 'r2', checkId: 'soon', at: NOW - 50 * MIN, outcome: 'pass' };
    const plan = passAllPlan(roundWith([chk('a'), chk('f'), chk('soon'), chk('b')], [failed, done]));
    expect(plan.pass.map(s => s.check.id)).toEqual(['a', 'b']);
    expect(plan.failed.map(s => s.check.id)).toEqual(['f']);
    expect(plan.pass.concat(plan.ask).some(s => s.check.id === 'soon')).toBe(false);
  });
  it('a check taken off the list is never passed', () => {
    const plan = passAllPlan(roundWith([chk('a'), chk('b'), chk('gone', { removed: true })]));
    expect(plan.pass.map(s => s.check.id)).toEqual(['a', 'b']);
  });
  it('is offered for two or more, said with their number', () => {
    expect(passAllOffered(passAllPlan(roundWith([chk('a')])))).toBe(false);
    const two = passAllPlan(roundWith([chk('a'), chk('b')]));
    expect(passAllOffered(two)).toBe(true);
    expect(passAllLabel(two)).toBe('Pass all due · 2');
  });
});

describe('what it says before it is done', () => {
  it('names how many, and what it will not pass and why', () => {
    const plan = passAllPlan(roundWith([chk('a'), chk('b'), chk('v', { kind: 'value', name: 'Seal temperature' })]));
    const w = passAllWords(plan);
    expect(w.head).toBe('Mark 2 checks as passed now?');
    expect(w.asks).toBe('1 check needs a reading, a count or an audit and is not passed by this: Seal temperature.');
    expect(w.failed).toBeUndefined();
  });
  it('one result for each check passed, all at one moment, each a pass', () => {
    const plan = passAllPlan(roundWith([chk('a'), chk('b')]));
    const rs = passAllResults(plan, 'Sam', 777);
    expect(rs.map(r => [r.checkId, r.outcome, r.at, r.by])).toEqual([['a', 'pass', 777, 'Sam'], ['b', 'pass', 777, 'Sam']]);
    expect(new Set(rs.map(r => r.id)).size).toBe(2);
  });
});

describe.each(LOG_DEFS.map(d => [d.key, d] as const))('%s — the same rule on its starter list', (_k, def) => {
  it('passes only pass-or-fail checks, and never more than are due', () => {
    const log = starterLog(def, { since: 0 });
    const round = roundOf(log, [], 40 * HOUR, def);
    const plan = passAllPlan(round.now);
    expect(plan.pass.every(s => s.check.kind === 'passfail' && (s.key === 'due' || s.key === 'overdue'))).toBe(true);
    expect(plan.ask.every(s => s.check.kind !== 'passfail')).toBe(true);
    const timedPassFail = log.checks.filter(c => c.kind === 'passfail' && 'every' in c.when).length;
    expect(plan.pass.length).toBeLessThanOrEqual(timedPassFail);
  });
});
