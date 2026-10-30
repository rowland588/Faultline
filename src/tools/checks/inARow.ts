/* A LOG JUDGED BY A COUNT, NOT THE CLOCK (30 October, a program's criterion — docs/PROGRAM-GOAL.md).
 *
 * "Up to date" is a standing: it turns to "overdue" by the clock alone, so a program signed off on it would read
 * "didn't pass" next morning with nothing done wrong. A program wants a fact that stays a fact: **the latest N results of
 * every check on the list passed** — N typed on the log (AgreedLog.inARow), judged by the log's own `verdictOf` (a value
 * inside its limits, a score at its pass mark, a count at its target, a pass).
 *
 *   passed      every check that is on the list has at least N results, and its latest N are all good
 *   didn't pass the latest result of some check is bad — a failure stands until it is checked again and passes
 *   not yet     a check has fewer than N results, or its latest N are not all good yet (the streak is building), or a
 *               result cannot be judged (nothing agreed to judge it against — 'info'), or the list is empty
 *
 * Struck results do not count; a check taken off the list (`removed`) is not asked. Nothing here reads the time. */
import type { LogCheck, LogResult, ToolStudy } from '../../lib/study';
import { logOf, resultsOf, verdictOf } from './checks';
import { defOf } from './registry';

export interface InARow {
  word: 'passed' | 'failed' | 'notYet';
  text: string;
  verdict: string;
  /** Each check's streak: the good results at its end, and whether its latest is bad. */
  checks: { check: LogCheck; streak: number; results: number; latestBad: boolean; judged: boolean }[];
}

/** The streak a check stands on: its good results in a row at the end, stopping at a bad one. */
export function streakOf(c: LogCheck, results: readonly LogResult[], def?: Parameters<typeof verdictOf>[2]): { streak: number; results: number; latestBad: boolean; judged: boolean } {
  const mine = resultsOf(results, c.id);
  let streak = 0;
  for (let i = mine.length - 1; i >= 0; i--) { if (verdictOf(c, mine[i], def) === 'good') streak++; else break; }
  const last = mine[mine.length - 1];
  const latest = last ? verdictOf(c, last, def) : undefined;
  return { streak, results: mine.length, latestBad: latest === 'bad', judged: mine.every(r => verdictOf(c, r, def) !== 'info') };
}

/** The log against its count — undefined when no count is typed (a log is then figures: what is due, what was missed). */
export function inARow(s: Pick<ToolStudy, 'agreed' | 'facts'>): InARow | undefined {
  const n = s.agreed?.log?.inARow;
  if (!s.agreed?.log || !(n !== undefined && Number.isInteger(n) && n >= 1)) return undefined;
  const log = logOf(s), def = defOf(log.key);
  const asked = log.checks.filter(c => !c.removed);
  const rows = asked.map(c => ({ check: c, ...streakOf(c, s.facts.results ?? [], def) }));
  const rep = (x: number) => (x === 1 ? 'the latest result' : `the latest ${x} results`);
  if (!rows.length) return { word: 'notYet', verdict: 'No checks yet', text: 'Nothing is on the list to check yet.', checks: rows };
  const bad = rows.filter(r => r.latestBad);
  if (bad.length) {
    return { word: 'failed', verdict: `${bad.length} check${bad.length === 1 ? '' : 's'} failed`, checks: rows,
      text: `${bad.map(r => r.check.name).join(', ')} failed on ${bad.length === 1 ? 'its' : 'their'} latest — ${rep(n)} of every check must pass; a failure stands until it is checked again and passes.` };
  }
  const short = rows.filter(r => r.streak < n);
  if (short.length) {
    const unjudged = short.filter(r => !r.judged);
    return { word: 'notYet', verdict: `Not yet — ${Math.min(...rows.map(r => r.streak))} of ${n} in a row`, checks: rows,
      text: `${rep(n)} of every check must pass: ${short.map(r => `${r.check.name} ${r.streak} of ${n}`).join(', ')}.${unjudged.length ? ` ${unjudged.map(r => r.check.name).join(', ')} ${unjudged.length === 1 ? 'has' : 'have'} a result nothing is agreed to judge it by.` : ''}` };
  }
  return { word: 'passed', verdict: `${n} in a row passed`, checks: rows,
    text: `${rep(n)} of every one of the ${rows.length} check${rows.length === 1 ? '' : 's'} passed.` };
}
